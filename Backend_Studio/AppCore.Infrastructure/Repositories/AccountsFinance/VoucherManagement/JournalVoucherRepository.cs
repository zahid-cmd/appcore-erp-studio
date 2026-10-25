//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.AccountsFinance.VoucherManagement;
using AppCore.Application.Platform.Accounting;
using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.AutoAccounts.DTOs;

using AppCore.Domain.Common;
using AppCore.Domain.Entities.AccountsFinance.VoucherManagement;
using AppCore.Domain.Platform.Accounting;

using AppCore.Infrastructure.CodeMaster;
using AppCore.Infrastructure.Persistence;

using CustomerProfilesEntity =
    AppCore.Domain.Entities.Settings.ClientSettings.CustomerProfiles;

using SupplierProfilesEntity =
    AppCore.Domain.Entities.Settings.ClientSettings.SupplierProfiles;

using SystemConfigurationsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.AccountsFinance.VoucherManagement;


//===============================================================
// Journal Voucher Repository
//
// Groups (switch 0045 "Multi Group Journal Voucher"; OFF = one
// group per voucher). In each group :
//   n Debits : 1 Credit   or   1 Debit : n Credits
//   debits first, debit = credit
// Rows : Supplier / Customer / General Ledger, per row. Cash /
// bank / MFS / POS / EMI ledgers are not allowed (RV / PV / FT).
//
// Draft    : Create / Update / Delete / Restore. The number is
//            taken on the first save (JV-<branch>-<FY>-<MM>-n).
// Approve  : Draft → Approved (locked)
// Return   : Approved → Draft
// Post     : Approved → Posted (one balanced group per GroupNo;
//            each supplier / customer row carries its party)
// Cancel   : Posted → Cancelled, reversing entries.
//===============================================================

public class JournalVoucherRepository : IJournalVoucherRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string ModuleName =
        "Accounts Finance";

    private const string EntityName =
        "JournalVoucher";

    private const string DateFormat =
        "yyyy-MM-dd";

    // Settings › System Configuration switches (read by code)
    //   0019 Post Journal Voucher On Approval : Approve also posts
    private const string PostOnApprovalSwitch =
        "CFG-MOD-004-0019";

    //   0035 Journal Voucher : Max Lines (Value = most debit +
    //        credit rows; OFF = no limit)
    private const string MaxLinesSwitch =
        "CFG-MOD-004-0035";

    // Voucher date window (Value = most days back / ahead)
    private const string BackDatedSwitch =
        "CFG-MOD-004-0041";

    private const string PostDatedSwitch =
        "CFG-MOD-004-0042";

    //   0045 Multi Group Journal Voucher (missing = ON)
    private const string MultiGroupSwitch =
        "CFG-MOD-004-0045";

    private const string DebitSide =
        "Debit";

    private const string CreditSide =
        "Credit";

    // Ledger types a row may use
    private static readonly string[] RowLedgerTypes =
    {
        "Supplier",
        "Customer",
        "General Ledger"
    };


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;

    private readonly IVoucherNumberService _numberService;

    private readonly IVoucherLedgerRepository _ledgerRepository;

    private readonly IVoucherPostingService _postingService;

    // Auto-created inventory / financial ledgers (posted only by
    // their own modules)
    private readonly IAutoAccountsRepository _autoAccounts;


    //===========================================================
    // Constructor
    //===========================================================

    public JournalVoucherRepository(
        AppDbContext context,
        IVoucherNumberService numberService,
        IVoucherLedgerRepository ledgerRepository,
        IVoucherPostingService postingService,
        IAutoAccountsRepository autoAccounts)
    {
        _context = context;

        _autoAccounts = autoAccounts;

        _numberService = numberService;

        _ledgerRepository = ledgerRepository;

        _postingService = postingService;
    }


    //===========================================================
    // Normalized Input
    //===========================================================

    private sealed class JvInput
    {
        public DateOnly VoucherDate { get; set; }

        public VoucherPeriodDto Period { get; set; } = new();

        public string LedgerType { get; set; } = string.Empty;

        public string PartyName { get; set; } = string.Empty;

        public string Narration { get; set; } = string.Empty;

        public decimal TotalAmount { get; set; }

        public int GroupCount { get; set; }

        // Debits and credits, group by group (debits first)
        public List<JournalVoucherLines> Lines { get; set; } = new();
    }


    //===========================================================
    // Get All (list : header only)
    //===========================================================

    public async Task<List<JournalVoucherDto>>
        GetAllAsync()
    {
        List<JournalVoucher> rows =
            await _context
                .Set<JournalVoucher>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.VoucherDate)
                .ThenByDescending(x => x.VoucherNo)
                .ToListAsync();

        return rows
            .Select(ToDto)
            .ToList();
    }


    //===========================================================
    // Get Defaults (Add form) : next voucher number
    //
    // Sequence = the higher of
    //   • VoucherSequences.LastNumber (numbers already taken)
    //   • the highest JV number saved for the same branch / FY /
    //     month (deleted drafts included)
    // + 1, formatted by CodeGenerator.GenerateVoucherNo.
    // Nothing is reserved.
    //===========================================================

    public async Task<JournalVoucherDefaultsDto>
        GetDefaultsAsync
        (
            long branchId,
            DateOnly voucherDate
        )
    {
        VoucherPeriodDto period;

        try
        {
            period =
                await _numberService.ResolvePeriodAsync(
                    branchId,
                    voucherDate);
        }
        catch (InvalidOperationException ex)
        {
            return new JournalVoucherDefaultsDto
            {
                BranchId = branchId,
                Message = ex.Message
            };
        }

        string prefix =
            CodeGenerator.GenerateVoucherNoPrefix(
                VoucherTypes.Journal,
                period.BranchDigits,
                period.FinancialYearCode,
                period.PeriodMonth);

        int taken =
            await _context
                .Set<VoucherSequences>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.Prefix == VoucherTypes.Journal
                        &&
                        x.BranchDigits == period.BranchDigits
                        &&
                        x.FinancialYearCode == period.FinancialYearCode
                        &&
                        x.PeriodMonth == period.PeriodMonth
                )
                .Select(x => x.LastNumber)
                .FirstOrDefaultAsync();

        List<string> saved =
            await _context
                .Set<JournalVoucher>()
                .AsNoTracking()
                .Where(x => x.VoucherNo.StartsWith(prefix))
                .Select(x => x.VoucherNo)
                .ToListAsync();

        int highest =
            saved
                .Select(x => CodeGenerator.ParseVoucherSequence(x))
                .DefaultIfEmpty(0)
                .Max();

        int next =
            Math.Max(taken, highest) + 1;

        if (next > 99999)
        {
            return new JournalVoucherDefaultsDto
            {
                BranchId = period.BranchId,
                BranchName = period.BranchName,
                FinancialYearId = period.FinancialYearId,
                FinancialYearName = period.FinancialYearName,
                FinancialYearCode = period.FinancialYearCode,
                PeriodMonth = period.PeriodMonth,
                Message = $"JV numbers for {period.FinancialYearCode}-{period.PeriodMonth:D2} are exhausted (99999)."
            };
        }

        return new JournalVoucherDefaultsDto
        {
            VoucherNo =
                CodeGenerator.GenerateVoucherNo(
                    VoucherTypes.Journal,
                    period.BranchDigits,
                    period.FinancialYearCode,
                    period.PeriodMonth,
                    next),
            BranchId = period.BranchId,
            BranchName = period.BranchName,
            FinancialYearId = period.FinancialYearId,
            FinancialYearName = period.FinancialYearName,
            FinancialYearCode = period.FinancialYearCode,
            PeriodMonth = period.PeriodMonth
        };
    }


    //===========================================================
    // Get By Id (header + lines)
    //===========================================================

    public async Task<JournalVoucherDto?>
        GetByIdAsync
        (
            long id
        )
    {
        JournalVoucher? row =
            await _context
                .Set<JournalVoucher>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.JournalVoucherId == id
                        &&
                        !x.IsDeleted
                );

        if (row == null)
        {
            return null;
        }

        JournalVoucherDto dto =
            ToDto(row);

        dto.Lines =
            await _context
                .Set<JournalVoucherLines>()
                .AsNoTracking()
                .Where(x => x.JournalVoucherId == id)
                .OrderBy(x => x.LineNo)
                .Select
                (
                    x =>
                        new JournalVoucherLineDto
                        {
                            Side = x.Side,
                            GroupNo = x.GroupNo,
                            LedgerType = x.LedgerType,
                            SubGroupCode = x.SubGroupCode,
                            SubGroupName = x.SubGroupName,
                            LedgerCode = x.LedgerCode,
                            LedgerName = x.LedgerName,
                            PartyCode = x.PartyCode,
                            Amount = x.Amount,
                            ShortNotes = x.ShortNotes
                        }
                )
                .ToListAsync();

        return dto;
    }


    private static JournalVoucherDto ToDto
    (
        JournalVoucher x
    )
    {
        return new JournalVoucherDto
        {
            JournalVoucherId = x.JournalVoucherId,
            VoucherNo = x.VoucherNo,
            VoucherDate = x.VoucherDate.ToString(DateFormat, CultureInfo.InvariantCulture),
            BranchId = x.BranchId,
            BranchCode = x.BranchCode,
            BranchName = x.BranchName,
            FinancialYearId = x.FinancialYearId,
            LedgerType = x.LedgerType,
            PartyName = x.PartyName,
            Narration = x.Narration,
            TotalAmount = x.TotalAmount,
            GroupCount = x.GroupCount,
            Status = x.Status,
            CancelReason = x.CancelReason,
            CancelDate = x.CancelDate?.ToString(DateFormat, CultureInfo.InvariantCulture) ?? string.Empty,
            ApprovedDate = x.ApprovedDate,
            PostedDate = x.PostedDate,
            CancelledDate = x.CancelledDate,
            CreatedDate = x.CreatedDate,
            ModifiedDate = x.ModifiedDate
        };
    }


    //===========================================================
    // Parse a yyyy-MM-dd date
    //===========================================================

    private static DateOnly ParseDate
    (
        string? text,
        string label
    )
    {
        if (DateOnly.TryParseExact(
                (text ?? string.Empty).Trim(),
                DateFormat,
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out DateOnly date))
        {
            return date;
        }

        throw new InvalidOperationException(
            $"{label} is required (yyyy-MM-dd).");
    }

    private static string Limit
    (
        string? value,
        int maxLength
    )
    {
        string text =
            (value ?? string.Empty).Trim();

        return text.Length <= maxLength
            ? text
            : text.Substring(0, maxLength);
    }

    private static bool IsMoney
    (
        decimal value
    )
    {
        return decimal.Round(value, 2) == value;
    }


    //===========================================================
    // Normalize & Validate (Create / Update)
    //
    // Rows arrive group by group. Groups are renumbered 1, 2, …
    // in the order they arrive; inside a group the debits come
    // first, then the credits. Line numbers run across the
    // voucher.
    //===========================================================

    private async Task<JvInput>
        NormalizeAsync
        (
            CreateJournalVoucherDto dto
        )
    {
        JvInput input =
            new();

        //=======================================================
        // Date / branch / open financial year
        //=======================================================

        input.VoucherDate =
            ParseDate(dto.VoucherDate, "Voucher date");

        input.Period =
            await _numberService.ResolvePeriodAsync(
                dto.BranchId,
                input.VoucherDate);

        input.Narration =
            Limit(dto.Narration, 500);

        // Detail Narration is required on every voucher
        if (input.Narration.Length == 0)
        {
            throw new InvalidOperationException(
                "Detail Narration is required.");
        }

        List<JournalVoucherLineDto> rows =
            dto.Lines ?? new List<JournalVoucherLineDto>();

        if (rows.Count == 0)
        {
            throw new InvalidOperationException(
                "Add at least one debit and one credit.");
        }

        // Setting "Journal Voucher : Max Lines"
        int maxLines =
            await SwitchNumberAsync(MaxLinesSwitch);

        if (maxLines > 0 && rows.Count > maxLines)
        {
            throw new InvalidOperationException(
                $"Maximum {maxLines} lines per voucher; this voucher has {rows.Count}.");
        }

        //=======================================================
        // Groups (in arrival order of their GroupNo)
        //=======================================================

        List<IGrouping<int, JournalVoucherLineDto>> groups =
            rows
                .GroupBy(x => x.GroupNo)
                .OrderBy(g => rows.FindIndex(x => x.GroupNo == g.Key))
                .ToList();

        if (groups.Count > 1 && !await IsSwitchOnAsync(MultiGroupSwitch, true))
        {
            throw new InvalidOperationException(
                "One group per Journal Voucher : several groups are turned off (System Configuration 0045).");
        }

        //=======================================================
        // Ledgers and parties
        //=======================================================

        List<string> codes =
            rows
                .Select(x => (x.LedgerCode ?? string.Empty).Trim())
                .Where(x => x.Length > 0)
                .Distinct()
                .ToList();

        Dictionary<string, VoucherLedgerDto> ledgers =
            await _ledgerRepository.GetByCodesAsync(codes);

        // Codes as sent + upper case (ledger codes are stored
        // upper case; no function on the column keeps the index)
        List<string> upperCodes =
            codes
                .Concat(codes.Select(x => x.ToUpperInvariant()))
                .Distinct()
                .ToList();

        var customers =
            await _context
                .Set<CustomerProfilesEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        upperCodes.Contains(x.ReceivableLedgerCode)
                )
                .Select
                (
                    x =>
                        new
                        {
                            Code = x.CustomerCode,
                            Name = x.DisplayName == null || x.DisplayName == ""
                                ? x.CustomerName
                                : x.DisplayName,
                            Ledger = x.ReceivableLedgerCode
                        }
                )
                .ToListAsync();

        var suppliers =
            await _context
                .Set<SupplierProfilesEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        upperCodes.Contains(x.PayableLedgerCode)
                )
                .Select
                (
                    x =>
                        new
                        {
                            Code = x.SupplierCode,
                            Name = x.DisplayName == null || x.DisplayName == ""
                                ? x.SupplierName
                                : x.DisplayName,
                            Ledger = x.PayableLedgerCode
                        }
                )
                .ToListAsync();

        // Ledger code (UPPER) → (party code, party name)
        Dictionary<string, (string Code, string Name)> customerByLedger =
            customers
                .GroupBy(x => x.Ledger.Trim().ToUpperInvariant())
                .ToDictionary(g => g.Key, g => (g.First().Code, g.First().Name));

        Dictionary<string, (string Code, string Name)> supplierByLedger =
            suppliers
                .GroupBy(x => x.Ledger.Trim().ToUpperInvariant())
                .ToDictionary(g => g.Key, g => (g.First().Code, g.First().Name));

        // General Ledger rows may not use the auto-created
        // inventory / financial ledgers
        HashSet<string> autoLedgerCodes =
            new(StringComparer.OrdinalIgnoreCase);

        if (rows.Any(x => string.Equals((x.LedgerType ?? string.Empty).Trim(), "General Ledger", StringComparison.OrdinalIgnoreCase)))
        {
            AutoAccountCodesDto auto =
                await _autoAccounts.GetCodesAsync();

            autoLedgerCodes.UnionWith(
                auto.InventoryLedgerCodes
                    .Concat(auto.FinancialLedgerCodes)
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Select(x => x.Trim()));
        }

        //=======================================================
        // Rows, group by group
        //=======================================================

        int lineNo = 0;

        int groupNo = 0;

        foreach (IGrouping<int, JournalVoucherLineDto> group in groups)
        {
            groupNo++;

            string groupLabel =
                $"Group {groupNo}";

            List<JournalVoucherLineDto> debits =
                group.Where(x => IsSide(x.Side, DebitSide)).ToList();

            List<JournalVoucherLineDto> credits =
                group.Where(x => IsSide(x.Side, CreditSide)).ToList();

            if (debits.Count + credits.Count != group.Count())
            {
                throw new InvalidOperationException(
                    $"{groupLabel} : every row must be a Debit or a Credit.");
            }

            if (debits.Count == 0 || credits.Count == 0)
            {
                throw new InvalidOperationException(
                    $"{groupLabel} : needs at least one debit and one credit.");
            }

            if (debits.Count > 1 && credits.Count > 1)
            {
                throw new InvalidOperationException(
                    $"{groupLabel} : several debits need a single credit, or a single debit can have several credits.");
            }

            // Debits first, then credits
            foreach (JournalVoucherLineDto row in debits.Concat(credits))
            {
                lineNo++;

                input.Lines.Add(
                    BuildLine(
                        row,
                        lineNo,
                        groupNo,
                        IsSide(row.Side, DebitSide) ? DebitSide : CreditSide,
                        ledgers,
                        customerByLedger,
                        supplierByLedger,
                        autoLedgerCodes));
            }

            decimal groupDebit =
                input.Lines
                    .Where(x => x.GroupNo == groupNo && x.Side == DebitSide)
                    .Sum(x => x.Amount);

            decimal groupCredit =
                input.Lines
                    .Where(x => x.GroupNo == groupNo && x.Side == CreditSide)
                    .Sum(x => x.Amount);

            if (groupDebit != groupCredit)
            {
                throw new InvalidOperationException(
                    $"{groupLabel} : debit ({groupDebit:N2}) and credit ({groupCredit:N2}) must be equal.");
            }
        }

        //=======================================================
        // Summary
        //=======================================================

        input.GroupCount =
            groupNo;

        input.TotalAmount =
            input.Lines
                .Where(x => x.Side == DebitSide)
                .Sum(x => x.Amount);

        List<string> types =
            input.Lines
                .Select(x => x.LedgerType)
                .Distinct()
                .ToList();

        input.LedgerType =
            types.Count == 1
                ? types[0]
                : "Mixed";

        List<JournalVoucherLines> debitRows =
            input.Lines
                .Where(x => x.Side == DebitSide)
                .ToList();

        input.PartyName =
            Limit(
                input.Lines.Count == 2
                    ? $"{input.Lines[0].LedgerName} / {input.Lines[1].LedgerName}"
                    : $"{debitRows[0].LedgerName} + {input.Lines.Count - 1} more",
                250);

        return input;
    }

    private static bool IsSide
    (
        string? side,
        string expected
    )
    {
        return string.Equals(
            (side ?? string.Empty).Trim(),
            expected,
            StringComparison.OrdinalIgnoreCase);
    }

    // One checked row
    private static JournalVoucherLines BuildLine
    (
        JournalVoucherLineDto row,
        int lineNo,
        int groupNo,
        string side,
        Dictionary<string, VoucherLedgerDto> ledgers,
        Dictionary<string, (string Code, string Name)> customerByLedger,
        Dictionary<string, (string Code, string Name)> supplierByLedger,
        HashSet<string> autoLedgerCodes
    )
    {
        string label =
            $"Line {lineNo} ({side})";

        string ledgerType =
            RowLedgerTypes.FirstOrDefault
            (
                x =>
                    string.Equals(x, (row.LedgerType ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase)
            )
            ??
            throw new InvalidOperationException(
                $"{label} : Ledger Type must be Supplier, Customer or General Ledger.");

        string code =
            (row.LedgerCode ?? string.Empty).Trim();

        string key =
            code.ToUpperInvariant();

        if (!ledgers.TryGetValue(code, out VoucherLedgerDto? ledger))
        {
            throw new InvalidOperationException(
                $"{label} : ledger '{code}' was not found.");
        }

        if (!ledger.IsActive)
        {
            throw new InvalidOperationException(
                $"{label} : ledger '{ledger.LedgerCode} - {ledger.LedgerName}' is inactive.");
        }

        if (ledger.IsMoneyLedger)
        {
            throw new InvalidOperationException(
                $"{label} : a cash / bank / MFS / POS / EMI ledger cannot be used in a Journal Voucher. Use Receipt, Payment or Fund Transfer.");
        }

        string partyCode =
            string.Empty;

        string ledgerName =
            ledger.LedgerName;

        switch (ledgerType)
        {
            case "Customer":

                if (!customerByLedger.TryGetValue(key, out var customer))
                {
                    throw new InvalidOperationException(
                        $"{label} : '{ledger.LedgerName}' is not a customer ledger.");
                }

                partyCode = customer.Code;

                ledgerName = customer.Name;

                break;

            case "Supplier":

                if (!supplierByLedger.TryGetValue(key, out var supplier))
                {
                    throw new InvalidOperationException(
                        $"{label} : '{ledger.LedgerName}' is not a supplier ledger.");
                }

                partyCode = supplier.Code;

                ledgerName = supplier.Name;

                break;

            default:

                if (customerByLedger.ContainsKey(key) || supplierByLedger.ContainsKey(key))
                {
                    throw new InvalidOperationException(
                        $"{label} : '{ledger.LedgerName}' belongs to a customer / supplier. Choose that Ledger Type.");
                }

                if (autoLedgerCodes.Contains(ledger.LedgerCode.Trim()))
                {
                    throw new InvalidOperationException(
                        $"{label} : '{ledger.LedgerName}' is an auto-generated ledger and is posted only by its own module.");
                }

                break;
        }

        if (!(row.Amount > 0) || !IsMoney(row.Amount))
        {
            throw new InvalidOperationException(
                $"{label} : amount must be more than 0 with at most 2 decimals.");
        }

        return new JournalVoucherLines
        {
            LineNo = lineNo,
            GroupNo = groupNo,
            Side = side,
            LedgerType = ledgerType,
            SubGroupCode = Limit(ledger.SubGroupCode, 40),
            SubGroupName = Limit(ledger.SubGroupName, 200),
            LedgerCode = ledger.LedgerCode,
            LedgerName = Limit(ledgerName, 250),
            PartyCode = Limit(partyCode, 40),
            Amount = row.Amount,
            ShortNotes = Limit(row.ShortNotes, 250)
        };
    }


    //===========================================================
    // Apply header values
    //===========================================================

    private static void ApplyHeader
    (
        JournalVoucher entity,
        JvInput input
    )
    {
        entity.VoucherDate = input.VoucherDate;
        entity.BranchId = input.Period.BranchId;
        entity.BranchCode = input.Period.BranchCode;
        entity.BranchName = input.Period.BranchName;
        entity.FinancialYearId = input.Period.FinancialYearId;
        entity.LedgerType = input.LedgerType;
        entity.PartyName = input.PartyName;
        entity.Narration = input.Narration;
        entity.TotalAmount = input.TotalAmount;
        entity.GroupCount = input.GroupCount;
    }

    private async Task ReplaceDetailsAsync
    (
        long voucherId,
        JvInput input
    )
    {
        List<JournalVoucherLines> oldLines =
            await _context
                .Set<JournalVoucherLines>()
                .Where(x => x.JournalVoucherId == voucherId)
                .ToListAsync();

        _context.Set<JournalVoucherLines>().RemoveRange(oldLines);

        foreach (JournalVoucherLines line in input.Lines)
        {
            line.JournalVoucherId = voucherId;
        }

        _context.Set<JournalVoucherLines>().AddRange(input.Lines);
    }


    //===========================================================
    // History
    //===========================================================

    private void AddHistory
    (
        JournalVoucher entity,
        string activityType,
        string verb,
        long userId,
        DateTime now,
        string extra = ""
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = ModuleName,
                EntityName = EntityName,
                EntityId = entity.JournalVoucherId,
                ActivityType = activityType,
                ActivityTitle = $"Journal Voucher {verb}",
                ActivityDescription =
                    $"Journal Voucher {entity.VoucherNo} ({entity.PartyName}, {entity.TotalAmount:N2}) {verb.ToLowerInvariant()}.{(string.IsNullOrWhiteSpace(extra) ? string.Empty : " " + extra)}",
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = now
            });
    }


    //===========================================================
    // Load a live voucher for change
    //
    // Called inside the transaction : the header row is locked
    // (SELECT ... FOR UPDATE) first, so two requests (e.g. Post
    // and Update, or Cancel and Approve) never
    // act on the same voucher at the same time, and the status
    // read here is the committed one.
    //===========================================================

    private async Task<JournalVoucher>
        LoadAsync
        (
            long id
        )
    {
        await _context.Database.ExecuteSqlInterpolatedAsync(
            $@"SELECT 1 FROM ""JournalVoucher"" WHERE ""JournalVoucherId"" = {id} FOR UPDATE");

        JournalVoucher? entity =
            await _context
                .Set<JournalVoucher>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.JournalVoucherId == id
                        &&
                        !x.IsDeleted
                );

        return entity
            ??
            throw new KeyNotFoundException(
                "Journal Voucher not found.");
    }

    private static void RequireStatus
    (
        JournalVoucher entity,
        string status,
        string action
    )
    {
        if (!string.Equals(entity.Status, status, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                $"Journal Voucher {entity.VoucherNo} is {entity.Status}; only a {status} voucher can be {action}.");
        }
    }


    //===========================================================
    // Run in one transaction
    //===========================================================

    private async Task InTransactionAsync
    (
        Func<Task> work
    )
    {
        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            await work();

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
    }


    //===========================================================
    // Create (Draft)
    //===========================================================

    public async Task<JournalVoucherSavedDto>
        CreateAsync
        (
            CreateJournalVoucherDto dto,
            long userId
        )
    {
        JvInput input =
            await NormalizeAsync(dto);

        await EnsureDateAllowedAsync(
            input.VoucherDate,
            null);

        JournalVoucher entity =
            new()
            {
                Status = VoucherStatuses.Draft,
                CancelReason = string.Empty,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        ApplyHeader(entity, input);

        await InTransactionAsync(
            async () =>
            {
                VoucherNumberDto number =
                    await _numberService.NextAsync(
                        VoucherTypes.Journal,
                        input.Period.BranchId,
                        input.VoucherDate);

                entity.VoucherNo =
                    number.VoucherNo;

                _context.Set<JournalVoucher>().Add(entity);

                await _context.SaveChangesAsync();

                await ReplaceDetailsAsync(
                    entity.JournalVoucherId,
                    input);

                AddHistory(entity, "Create", "Created", userId, entity.CreatedDate);

                await _context.SaveChangesAsync();
            });

        return new JournalVoucherSavedDto
        {
            JournalVoucherId = entity.JournalVoucherId,
            VoucherNo = entity.VoucherNo
        };
    }


    //===========================================================
    // Update (Draft)
    //
    // A new number is taken when the branch, financial year or
    // month changes (the old number is left as a gap).
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateJournalVoucherDto dto,
            long userId
        )
    {
        JvInput input =
            await NormalizeAsync(dto);

        await InTransactionAsync(
            async () =>
            {
                JournalVoucher entity =
                    await LoadAsync(dto.JournalVoucherId);

                RequireStatus(entity, VoucherStatuses.Draft, "edited");

                // An older draft keeps its saved date
                await EnsureDateAllowedAsync(
                    input.VoucherDate,
                    entity.VoucherDate);

                string expectedStart =
                    $"{VoucherTypes.Journal}-{input.Period.BranchDigits}-{input.Period.FinancialYearCode}-{input.Period.PeriodMonth:D2}-";

                if (!entity.VoucherNo.StartsWith(expectedStart, StringComparison.Ordinal))
                {
                    VoucherNumberDto number =
                        await _numberService.NextAsync(
                            VoucherTypes.Journal,
                            input.Period.BranchId,
                            input.VoucherDate);

                    entity.VoucherNo =
                        number.VoucherNo;
                }

                ApplyHeader(entity, input);

                entity.ModifiedBy = userId;

                entity.ModifiedDate = DateTime.UtcNow;

                await ReplaceDetailsAsync(
                    entity.JournalVoucherId,
                    input);

                AddHistory(entity, "Update", "Updated", userId, entity.ModifiedDate.Value);

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Delete (Draft only, soft)
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        await InTransactionAsync(
            async () =>
            {
                JournalVoucher entity =
                    await LoadAsync(id);

                RequireStatus(entity, VoucherStatuses.Draft, "deleted");

                DateTime now =
                    DateTime.UtcNow;

                entity.IsDeleted = true;

                entity.DeletedBy = userId;

                entity.DeletedDate = now;

                AddHistory(entity, "Delete", "Deleted", userId, now);

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Restore (most recently deleted draft)
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        JournalVoucher? entity =
            await _context
                .Set<JournalVoucher>()
                .Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        DateTime now =
            DateTime.UtcNow;

        entity.IsDeleted = false;

        entity.DeletedBy = null;

        entity.DeletedDate = null;

        entity.ModifiedBy = userId;

        entity.ModifiedDate = now;

        AddHistory(entity, "Restore", "Restored", userId, now);

        await _context.SaveChangesAsync();

        return true;
    }


    //===========================================================
    // Approve (Draft → Approved)
    //===========================================================

    public async Task
        ApproveAsync
        (
            long id,
            long userId
        )
    {
        await InTransactionAsync(
            async () =>
            {
                JournalVoucher entity =
                    await LoadAsync(id);

                RequireStatus(entity, VoucherStatuses.Draft, "approved");

                DateTime now =
                    DateTime.UtcNow;

                entity.Status = VoucherStatuses.Approved;

                entity.ApprovedBy = userId;

                entity.ApprovedDate = now;

                AddHistory(entity, "Approve", "Approved", userId, now);

                // Switch "Post Journal Voucher On Approval" : post in
                // the same transaction (all or nothing)
                if (await IsSwitchOnAsync(PostOnApprovalSwitch, false))
                {
                    await PostCoreAsync(entity, userId);
                }

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Return to Draft (Approved → Draft)
    //===========================================================

    public async Task
        ReturnToDraftAsync
        (
            long id,
            long userId
        )
    {
        await InTransactionAsync(
            async () =>
            {
                JournalVoucher entity =
                    await LoadAsync(id);

                RequireStatus(entity, VoucherStatuses.Approved, "returned to draft");

                DateTime now =
                    DateTime.UtcNow;

                entity.Status = VoucherStatuses.Draft;

                entity.ApprovedBy = null;

                entity.ApprovedDate = null;

                entity.ModifiedBy = userId;

                entity.ModifiedDate = now;

                AddHistory(entity, "ReturnToDraft", "Returned To Draft", userId, now);

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Post (Approved → Posted)
    //===========================================================

    public async Task
        PostAsync
        (
            long id,
            long userId
        )
    {
        await InTransactionAsync(
            async () =>
            {
                JournalVoucher entity =
                    await LoadAsync(id);

                RequireStatus(entity, VoucherStatuses.Approved, "posted");

                await PostCoreAsync(entity, userId);

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Post core (Approved → Posted; the caller saves and holds
    // the transaction). Used by Post and by Approve when the
    // switch "Post Journal Voucher On Approval" is ON.
    //===========================================================

    private async Task
        PostCoreAsync
        (
            JournalVoucher entity,
            long userId
        )
    {
        long id =
            entity.JournalVoucherId;

        List<JournalVoucherLines> lines =
            await _context
                .Set<JournalVoucherLines>()
                .AsNoTracking()
                .Where(x => x.JournalVoucherId == id)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        await _postingService.PostAsync(
            new VoucherPostingRequest
            {
                VoucherType = VoucherTypes.Journal,
                VoucherId = entity.JournalVoucherId,
                VoucherNo = entity.VoucherNo,
                VoucherDate = entity.VoucherDate,
                BranchId = entity.BranchId,
                // Each supplier / customer row carries its own
                // party; GL rows have none
                PartyType = string.Empty,
                PartyCode = string.Empty,
                ReferenceNo = string.Empty,
                Narration = entity.Narration,
                Lines = BuildPostingLines(lines)
            },
            userId);

        DateTime now =
            DateTime.UtcNow;

        entity.Status = VoucherStatuses.Posted;

        entity.PostedBy = userId;

        entity.PostedDate = now;

        AddHistory(entity, "Post", "Posted", userId, now);
    }


    //===========================================================
    // Business date (Bangladesh time, whatever the server clock)
    //===========================================================

    private static readonly TimeZoneInfo BusinessZone =
        FindBusinessZone();

    private static TimeZoneInfo FindBusinessZone()
    {
        foreach (string id in new[] { "Asia/Dhaka", "Bangladesh Standard Time" })
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(id);
            }
            catch (TimeZoneNotFoundException)
            {
            }
            catch (InvalidTimeZoneException)
            {
            }
        }

        return TimeZoneInfo.Local;
    }

    private static DateOnly BusinessToday()
    {
        return DateOnly.FromDateTime(
            TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow,
                BusinessZone));
    }


    //===========================================================
    // Back Dated / Post Dated Entry (settings 0041 / 0042)
    //
    //   ON  : earlier / later dates allowed; Value = most days
    //         back / ahead (empty = no limit)
    //   OFF : nothing before / after today
    // An unchanged date of an existing draft is not checked.
    //===========================================================

    private async Task
        EnsureDateAllowedAsync
        (
            DateOnly date,
            DateOnly? savedDate
        )
    {
        if (savedDate.HasValue && savedDate.Value == date)
        {
            return;
        }

        DateOnly today =
            BusinessToday();

        (bool backOn, int backDays) =
            await SwitchStateAsync(BackDatedSwitch);

        (bool postOn, int postDays) =
            await SwitchStateAsync(PostDatedSwitch);

        if (date < today)
        {
            if (!backOn)
            {
                throw new InvalidOperationException(
                    "Back dated entry is not allowed : the voucher date cannot be before today.");
            }

            if (backDays > 0 && date < today.AddDays(-backDays))
            {
                throw new InvalidOperationException(
                    $"Back dated entry is allowed up to {today.AddDays(-backDays):dd-MMM-yyyy} only.");
            }
        }

        if (date > today)
        {
            if (!postOn)
            {
                throw new InvalidOperationException(
                    "Post dated entry is not allowed : the voucher date cannot be after today.");
            }

            if (postDays > 0 && date > today.AddDays(postDays))
            {
                throw new InvalidOperationException(
                    $"Post dated entry is allowed up to {today.AddDays(postDays):dd-MMM-yyyy} only.");
            }
        }
    }

    // On / off (missing = ON) and the whole-number Value (0 = none)
    private async Task<(bool IsOn, int Number)>
        SwitchStateAsync
        (
            string code
        )
    {
        var row =
            await _context
                .Set<SystemConfigurationsEntity>()
                .AsNoTracking()
                .Where(x => x.ConfigurationCode == code && !x.IsDeleted)
                .Select(x => new { x.IsEnabled, x.Value })
                .FirstOrDefaultAsync();

        if (row == null)
        {
            return (true, 0);
        }

        int number =
            int.TryParse((row.Value ?? string.Empty).Trim(), out int parsed) && parsed > 0
                ? parsed
                : 0;

        return (row.IsEnabled, number);
    }


    //===========================================================
    // System Configuration switch (by code; fallback when the
    // switch does not exist)
    //===========================================================

    private async Task<bool>
        IsSwitchOnAsync
        (
            string code,
            bool fallback
        )
    {
        bool? value =
            await _context
                .Set<SystemConfigurationsEntity>()
                .AsNoTracking()
                .Where(x => x.ConfigurationCode == code && !x.IsDeleted)
                .Select(x => (bool?)x.IsEnabled)
                .FirstOrDefaultAsync();

        return value ?? fallback;
    }

    // Whole-number setting : the Value when the switch is ON and
    // the Value is a positive whole number, otherwise 0
    private async Task<int>
        SwitchNumberAsync
        (
            string code
        )
    {
        var row =
            await _context
                .Set<SystemConfigurationsEntity>()
                .AsNoTracking()
                .Where(x => x.ConfigurationCode == code && !x.IsDeleted)
                .Select(x => new { x.IsEnabled, x.Value })
                .FirstOrDefaultAsync();

        if (row == null || !row.IsEnabled)
        {
            return 0;
        }

        return int.TryParse((row.Value ?? string.Empty).Trim(), out int number) && number > 0
            ? number
            : 0;
    }


    //===========================================================
    // Build posting lines : one per row, in its own group
    //===========================================================

    private static List<VoucherPostingLine> BuildPostingLines
    (
        List<JournalVoucherLines> lines
    )
    {
        return lines
            .Select
            (
                line =>
                    new VoucherPostingLine
                    {
                        GroupNo = line.GroupNo,
                        LedgerCode = line.LedgerCode,
                        Debit = line.Side == DebitSide ? line.Amount : 0,
                        Credit = line.Side == CreditSide ? line.Amount : 0,
                        Narration = string.IsNullOrWhiteSpace(line.ShortNotes)
                            ? $"Journal : {line.LedgerName}"
                            : line.ShortNotes,

                        // Each supplier / customer keeps its own code
                        PartyType = string.IsNullOrWhiteSpace(line.PartyCode)
                            ? string.Empty
                            : line.LedgerType,

                        PartyCode = line.PartyCode
                    }
            )
            .ToList();
    }


    //===========================================================
    // Cancel (Posted → Cancelled)
    //===========================================================

    public async Task
        CancelAsync
        (
            long id,
            CancelJournalVoucherDto dto,
            long userId
        )
    {
        string reason =
            Limit(dto?.Reason, 500);

        if (string.IsNullOrWhiteSpace(reason))
        {
            throw new InvalidOperationException(
                "A reason is required to cancel a posted voucher.");
        }

        DateOnly cancelDate =
            string.IsNullOrWhiteSpace(dto?.CancelDate)
                ? BusinessToday()
                : ParseDate(dto!.CancelDate, "Cancel date");

        await InTransactionAsync(
            async () =>
            {
                JournalVoucher entity =
                    await LoadAsync(id);

                RequireStatus(entity, VoucherStatuses.Posted, "cancelled");

                if (cancelDate < entity.VoucherDate)
                {
                    throw new InvalidOperationException(
                        $"Cancel date cannot be before the voucher date ({entity.VoucherDate:dd-MM-yyyy}).");
                }

                // Open financial year for the cancel date (throws
                // when there is none)
                await _numberService.ResolvePeriodAsync(
                    entity.BranchId,
                    cancelDate);

                if (await _postingService.IsPostedAsync(entity.VoucherNo))
                {
                    await _postingService.ReverseAsync(
                        entity.VoucherNo,
                        cancelDate,
                        reason,
                        userId);
                }

                DateTime now =
                    DateTime.UtcNow;

                entity.Status = VoucherStatuses.Cancelled;

                entity.CancelledBy = userId;

                entity.CancelledDate = now;

                entity.CancelDate = cancelDate;

                entity.CancelReason = reason;

                AddHistory(entity, "Cancel", "Cancelled", userId, now, $"Reason : {reason}");

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Exists
    //===========================================================

    public async Task<bool>
        ExistsAsync
        (
            long id
        )
    {
        return await _context
            .Set<JournalVoucher>()
            .AnyAsync
            (
                x =>
                    x.JournalVoucherId == id
                    &&
                    !x.IsDeleted
            );
    }
}