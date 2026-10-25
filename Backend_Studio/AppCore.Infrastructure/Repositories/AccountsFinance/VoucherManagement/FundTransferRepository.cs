//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.AccountsFinance.VoucherManagement;
using AppCore.Application.Platform.Accounting;

using AppCore.Domain.Common;
using AppCore.Domain.Entities.AccountsFinance.VoucherManagement;
using AppCore.Domain.Platform.Accounting;

using AppCore.Infrastructure.CodeMaster;
using AppCore.Infrastructure.Persistence;

using SystemConfigurationsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.AccountsFinance.VoucherManagement;


//===============================================================
// Fund Transfer Repository
//
// Money between our own Cash / Bank / MFS accounts (same or
// another branch), posted at once (no Payment Desk; cheques do
// not wait for clearing) :
//   From (CREDIT, entered first) → To (DEBIT)
//   n From : 1 To   or   1 From : n To
//   switch 0023 "Multi Mode Fund Transfer" OFF : one From, one To
//
// Draft    : Create / Update / Delete / Restore. The number is
//            taken on the first save (FT-<branch>-<FY>-<MM>-n).
// Approve  : Draft → Approved (locked)
// Return   : Approved → Draft
// Post     : Approved → Posted
//              Dr To accounts
//              Dr Bank Charges / MFS Charges (charges the
//                 company pays)
//              Cr From accounts (amount + charge)
// Cancel   : Posted → Cancelled, reversing entries.
//===============================================================

public class FundTransferRepository : IFundTransferRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string ModuleName =
        "Accounts Finance";

    private const string EntityName =
        "FundTransfer";

    private const string DateFormat =
        "yyyy-MM-dd";

    // Settings › System Configuration switches (read by code)
    //   0023 Multi Mode Fund Transfer : several From / To rows
    private const string MultiModeSwitch =
        "CFG-MOD-004-0023";

    //   0024 Post Fund Transfer On Approval : Approve also posts
    private const string PostOnApprovalSwitch =
        "CFG-MOD-004-0024";

    //   0036 Fund Transfer : Max Lines (Value = most rows; OFF =
    //        no limit)
    private const string MaxLinesSwitch =
        "CFG-MOD-004-0036";

    // Voucher date window (Value = most days back / ahead)
    private const string BackDatedSwitch =
        "CFG-MOD-004-0043";

    private const string PostDatedSwitch =
        "CFG-MOD-004-0044";

    private const string FromSide =
        "From";

    private const string ToSide =
        "To";

    private const string BankTransferMethod =
        "Bank Transfer";

    private const string ChequeMethod =
        "Cheque";

    // Account types a row may use
    private static readonly string[] AccountTypes =
    {
        "Cash",
        "Bank",
        "MFS"
    };

    // Charge expense (charge the company pays), looked up by CODE
    private static readonly Dictionary<string, string> ChargeLedgers =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["Bank"] = "GLR-004-001-001-00001",
            ["MFS"] = "GLR-004-001-001-00003"
        };


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;

    private readonly IVoucherNumberService _numberService;

    private readonly IVoucherLedgerRepository _ledgerRepository;

    private readonly IVoucherPostingService _postingService;


    //===========================================================
    // Constructor
    //===========================================================

    public FundTransferRepository(
        AppDbContext context,
        IVoucherNumberService numberService,
        IVoucherLedgerRepository ledgerRepository,
        IVoucherPostingService postingService)
    {
        _context = context;

        _numberService = numberService;

        _ledgerRepository = ledgerRepository;

        _postingService = postingService;
    }


    //===========================================================
    // Normalized Input
    //===========================================================

    private sealed class FtInput
    {
        public DateOnly VoucherDate { get; set; }

        public VoucherPeriodDto Period { get; set; } = new();

        public string TransferType { get; set; } = string.Empty;

        public string PartyName { get; set; } = string.Empty;

        public string Narration { get; set; } = string.Empty;

        public decimal TotalAmount { get; set; }

        public decimal Charges { get; set; }

        // From rows first, then To rows
        public List<FundTransferLines> Lines { get; set; } = new();
    }


    //===========================================================
    // Get All (list : header only)
    //===========================================================

    public async Task<List<FundTransferDto>>
        GetAllAsync()
    {
        List<FundTransfer> rows =
            await _context
                .Set<FundTransfer>()
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
    //   • the highest FT number saved for the same branch / FY /
    //     month (deleted drafts included)
    // + 1, formatted by CodeGenerator.GenerateVoucherNo.
    // Nothing is reserved.
    //===========================================================

    public async Task<FundTransferDefaultsDto>
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
            return new FundTransferDefaultsDto
            {
                BranchId = branchId,
                Message = ex.Message
            };
        }

        string prefix =
            CodeGenerator.GenerateVoucherNoPrefix(
                VoucherTypes.FundTransfer,
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
                        x.Prefix == VoucherTypes.FundTransfer
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
                .Set<FundTransfer>()
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
            return new FundTransferDefaultsDto
            {
                BranchId = period.BranchId,
                BranchName = period.BranchName,
                FinancialYearId = period.FinancialYearId,
                FinancialYearName = period.FinancialYearName,
                FinancialYearCode = period.FinancialYearCode,
                PeriodMonth = period.PeriodMonth,
                Message = $"FT numbers for {period.FinancialYearCode}-{period.PeriodMonth:D2} are exhausted (99999)."
            };
        }

        return new FundTransferDefaultsDto
        {
            VoucherNo =
                CodeGenerator.GenerateVoucherNo(
                    VoucherTypes.FundTransfer,
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

    public async Task<FundTransferDto?>
        GetByIdAsync
        (
            long id
        )
    {
        FundTransfer? row =
            await _context
                .Set<FundTransfer>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.FundTransferId == id
                        &&
                        !x.IsDeleted
                );

        if (row == null)
        {
            return null;
        }

        FundTransferDto dto =
            ToDto(row);

        List<FundTransferLines> lines =
            await _context
                .Set<FundTransferLines>()
                .AsNoTracking()
                .Where(x => x.FundTransferId == id)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        dto.Lines =
            lines
                .Select
                (
                    x =>
                        new FundTransferLineDto
                        {
                            Side = x.Side,
                            AccountType = x.AccountType,
                            SubGroupCode = x.SubGroupCode,
                            SubGroupName = x.SubGroupName,
                            LedgerCode = x.LedgerCode,
                            LedgerName = x.LedgerName,
                            AccountId = x.AccountId,
                            AccountBranch = x.AccountBranch,
                            Amount = x.Amount,
                            ShortNotes = x.ShortNotes,
                            Method = x.Method,
                            Reference = x.Reference,
                            CheckNo = x.CheckNo,
                            CheckDate = x.CheckDate?.ToString(DateFormat, CultureInfo.InvariantCulture) ?? string.Empty,
                            ChargeAmount = x.ChargeAmount
                        }
                )
                .ToList();

        return dto;
    }


    private static FundTransferDto ToDto
    (
        FundTransfer x
    )
    {
        return new FundTransferDto
        {
            FundTransferId = x.FundTransferId,
            VoucherNo = x.VoucherNo,
            VoucherDate = x.VoucherDate.ToString(DateFormat, CultureInfo.InvariantCulture),
            BranchId = x.BranchId,
            BranchCode = x.BranchCode,
            BranchName = x.BranchName,
            FinancialYearId = x.FinancialYearId,
            TransferType = x.TransferType,
            PartyName = x.PartyName,
            Narration = x.Narration,
            TotalAmount = x.TotalAmount,
            Charges = x.Charges,
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
    // From rows (credit) first, then To rows (debit); line numbers
    // run in that order.
    //===========================================================

    private async Task<FtInput>
        NormalizeAsync
        (
            CreateFundTransferDto dto
        )
    {
        FtInput input =
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

        List<FundTransferLineDto> rows =
            dto.Lines ?? new List<FundTransferLineDto>();

        List<FundTransferLineDto> froms =
            rows.Where(x => IsSide(x.Side, FromSide)).ToList();

        List<FundTransferLineDto> tos =
            rows.Where(x => IsSide(x.Side, ToSide)).ToList();

        if (froms.Count + tos.Count != rows.Count)
        {
            throw new InvalidOperationException(
                "Every row must be a Transfer From or a Transfer To row.");
        }

        if (froms.Count == 0 || tos.Count == 0)
        {
            throw new InvalidOperationException(
                "Add at least one Transfer From and one Transfer To row.");
        }

        if (froms.Count > 1 && tos.Count > 1)
        {
            throw new InvalidOperationException(
                "Several From accounts need a single To account, or a single From account can go to several To accounts.");
        }

        // Switch "Multi Mode Fund Transfer" OFF : one From, one To
        if ((froms.Count > 1 || tos.Count > 1) && !await IsSwitchOnAsync(MultiModeSwitch, false))
        {
            throw new InvalidOperationException(
                "One From and one To account per transfer (Multi Mode Fund Transfer is OFF).");
        }

        // Setting "Fund Transfer : Max Lines"
        int maxLines =
            await SwitchNumberAsync(MaxLinesSwitch);

        if (maxLines > 0 && rows.Count > maxLines)
        {
            throw new InvalidOperationException(
                $"Maximum {maxLines} lines per transfer; this transfer has {rows.Count}.");
        }

        //=======================================================
        // Accounts
        //=======================================================

        Dictionary<string, VoucherLedgerDto> ledgers =
            await _ledgerRepository.GetByCodesAsync(
                rows
                    .Select(x => (x.LedgerCode ?? string.Empty).Trim())
                    .Where(x => x.Length > 0)
                    .Distinct());

        string branchKey =
            input.Period.BranchName.Trim().ToUpperInvariant();

        HashSet<string> fromCodes =
            new(StringComparer.OrdinalIgnoreCase);

        HashSet<string> toCodes =
            new(StringComparer.OrdinalIgnoreCase);

        int lineNo = 0;

        foreach (FundTransferLineDto row in froms.Concat(tos))
        {
            lineNo++;

            bool isFrom =
                IsSide(row.Side, FromSide);

            string side =
                isFrom ? FromSide : ToSide;

            string label =
                $"Line {lineNo} ({(isFrom ? "Transfer From" : "Transfer To")})";

            string accountType =
                AccountTypes.FirstOrDefault
                (
                    x =>
                        string.Equals(x, (row.AccountType ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase)
                )
                ??
                throw new InvalidOperationException(
                    $"{label} : Account Type must be Cash, Bank or MFS.");

            string code =
                (row.LedgerCode ?? string.Empty).Trim();

            if (!ledgers.TryGetValue(code, out VoucherLedgerDto? account))
            {
                throw new InvalidOperationException(
                    $"{label} : account '{code}' was not found.");
            }

            if (!string.Equals(account.LedgerType, accountType, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    $"{label} : '{account.LedgerName}' is not a {accountType} account.");
            }

            if (!account.IsActive)
            {
                throw new InvalidOperationException(
                    $"{label} : '{account.LedgerName}' is inactive.");
            }

            // From : our branch's cash; bank / MFS shared or of our
            // branch. To : any branch.
            if (isFrom)
            {
                string accountBranch =
                    (account.Branch ?? string.Empty).Trim().ToUpperInvariant();

                bool branchOk =
                    accountType == "Cash"
                        ? accountBranch == branchKey
                        : !account.BranchExclusive || accountBranch == branchKey;

                if (!branchOk)
                {
                    throw new InvalidOperationException(
                        $"{label} : '{account.LedgerName}' belongs to another branch.");
                }
            }

            HashSet<string> sameSide =
                isFrom ? fromCodes : toCodes;

            if (!sameSide.Add(account.LedgerCode))
            {
                throw new InvalidOperationException(
                    $"{label} : '{account.LedgerName}' is used twice.");
            }

            if (!(row.Amount > 0) || !IsMoney(row.Amount))
            {
                throw new InvalidOperationException(
                    $"{label} : amount must be more than 0 with at most 2 decimals.");
            }

            FundTransferLines line =
                new()
                {
                    LineNo = lineNo,
                    Side = side,
                    AccountType = accountType,
                    SubGroupCode = Limit(account.SubGroupCode, 40),
                    SubGroupName = Limit(account.SubGroupName, 200),
                    LedgerCode = account.LedgerCode,
                    LedgerName = Limit(account.LedgerName, 250),
                    AccountId = account.AccountId,
                    AccountBranch = Limit(account.Branch, 200),
                    Amount = row.Amount,
                    ShortNotes = Limit(row.ShortNotes, 250),
                    Method = string.Empty,
                    Reference = string.Empty,
                    CheckNo = string.Empty,
                    ChargeAmount = 0
                };

            if (isFrom)
            {
                ApplyMethod(line, row, label);
            }

            input.Lines.Add(line);
        }

        //=======================================================
        // Same account on both sides
        //=======================================================

        string? both =
            fromCodes.FirstOrDefault(x => toCodes.Contains(x));

        if (both != null)
        {
            throw new InvalidOperationException(
                $"'{input.Lines.First(x => x.LedgerCode == both).LedgerName}' cannot be both Transfer From and Transfer To.");
        }

        //=======================================================
        // Balance : From = To
        //=======================================================

        decimal totalFrom =
            input.Lines.Where(x => x.Side == FromSide).Sum(x => x.Amount);

        decimal totalTo =
            input.Lines.Where(x => x.Side == ToSide).Sum(x => x.Amount);

        if (totalFrom != totalTo)
        {
            throw new InvalidOperationException(
                $"Transfer From ({totalFrom:N2}) and Transfer To ({totalTo:N2}) must be equal.");
        }

        //=======================================================
        // Summary
        //=======================================================

        input.TotalAmount =
            totalTo;

        input.Charges =
            input.Lines.Sum(x => x.ChargeAmount);

        List<FundTransferLines> fromLines =
            input.Lines.Where(x => x.Side == FromSide).ToList();

        List<FundTransferLines> toLines =
            input.Lines.Where(x => x.Side == ToSide).ToList();

        input.TransferType =
            Limit(
                $"{string.Join(" / ", fromLines.Select(x => x.AccountType).Distinct())} to {string.Join(" / ", toLines.Select(x => x.AccountType).Distinct())}",
                60);

        string fromText =
            fromLines.Count == 1
                ? fromLines[0].LedgerName
                : $"{fromLines[0].LedgerName} + {fromLines.Count - 1} more";

        string toText =
            toLines.Count == 1
                ? toLines[0].LedgerName
                : $"{toLines[0].LedgerName} + {toLines.Count - 1} more";

        input.PartyName =
            Limit($"{fromText} to {toText}", 250);

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

    //===========================================================
    // From row : method, reference / cheque, charge
    //   Cash : Cash (no details, no charge)
    //   Bank : Bank Transfer (reference optional) or Cheque (no.
    //          and date required); optional charge
    //   MFS  : MFS (transaction id required); optional charge
    //===========================================================

    private static void ApplyMethod
    (
        FundTransferLines line,
        FundTransferLineDto row,
        string label
    )
    {
        string method =
            (row.Method ?? string.Empty).Trim();

        switch (line.AccountType)
        {
            case "Cash":

                line.Method = "Cash";

                break;

            case "Bank":

                if (string.Equals(method, ChequeMethod, StringComparison.OrdinalIgnoreCase))
                {
                    line.Method = ChequeMethod;

                    line.CheckNo = Limit(row.CheckNo, 50);

                    if (line.CheckNo.Length == 0)
                    {
                        throw new InvalidOperationException(
                            $"{label} : Cheque No is required.");
                    }

                    line.CheckDate =
                        ParseDate(row.CheckDate, $"{label} : Cheque Date");
                }
                else
                {
                    line.Method = BankTransferMethod;

                    line.Reference = Limit(row.Reference, 100);
                }

                break;

            case "MFS":

                line.Method = "MFS";

                line.Reference = Limit(row.Reference, 100);

                if (line.Reference.Length == 0)
                {
                    throw new InvalidOperationException(
                        $"{label} : Transaction ID is required.");
                }

                break;
        }

        // Charge the company pays on top (Bank / MFS only)
        decimal charge =
            line.AccountType == "Cash"
                ? 0
                : row.ChargeAmount;

        if (charge < 0 || !IsMoney(charge) || charge > line.Amount)
        {
            throw new InvalidOperationException(
                $"{label} : charge must be between 0 and the amount, with at most 2 decimals.");
        }

        line.ChargeAmount = charge;
    }


    //===========================================================
    // Apply header values
    //===========================================================

    private static void ApplyHeader
    (
        FundTransfer entity,
        FtInput input
    )
    {
        entity.VoucherDate = input.VoucherDate;
        entity.BranchId = input.Period.BranchId;
        entity.BranchCode = input.Period.BranchCode;
        entity.BranchName = input.Period.BranchName;
        entity.FinancialYearId = input.Period.FinancialYearId;
        entity.TransferType = input.TransferType;
        entity.PartyName = input.PartyName;
        entity.Narration = input.Narration;
        entity.TotalAmount = input.TotalAmount;
        entity.Charges = input.Charges;
    }

    private async Task ReplaceDetailsAsync
    (
        long voucherId,
        FtInput input
    )
    {
        List<FundTransferLines> oldLines =
            await _context
                .Set<FundTransferLines>()
                .Where(x => x.FundTransferId == voucherId)
                .ToListAsync();

        _context.Set<FundTransferLines>().RemoveRange(oldLines);

        foreach (FundTransferLines line in input.Lines)
        {
            line.FundTransferId = voucherId;
        }

        _context.Set<FundTransferLines>().AddRange(input.Lines);
    }


    //===========================================================
    // History
    //===========================================================

    private void AddHistory
    (
        FundTransfer entity,
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
                EntityId = entity.FundTransferId,
                ActivityType = activityType,
                ActivityTitle = $"Fund Transfer {verb}",
                ActivityDescription =
                    $"Fund Transfer {entity.VoucherNo} ({entity.PartyName}, {entity.TotalAmount:N2}) {verb.ToLowerInvariant()}.{(string.IsNullOrWhiteSpace(extra) ? string.Empty : " " + extra)}",
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

    private async Task<FundTransfer>
        LoadAsync
        (
            long id
        )
    {
        await _context.Database.ExecuteSqlInterpolatedAsync(
            $@"SELECT 1 FROM ""FundTransfer"" WHERE ""FundTransferId"" = {id} FOR UPDATE");

        FundTransfer? entity =
            await _context
                .Set<FundTransfer>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.FundTransferId == id
                        &&
                        !x.IsDeleted
                );

        return entity
            ??
            throw new KeyNotFoundException(
                "Fund Transfer not found.");
    }

    private static void RequireStatus
    (
        FundTransfer entity,
        string status,
        string action
    )
    {
        if (!string.Equals(entity.Status, status, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                $"Fund Transfer {entity.VoucherNo} is {entity.Status}; only a {status} voucher can be {action}.");
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

    public async Task<FundTransferSavedDto>
        CreateAsync
        (
            CreateFundTransferDto dto,
            long userId
        )
    {
        FtInput input =
            await NormalizeAsync(dto);

        await EnsureDateAllowedAsync(
            input.VoucherDate,
            null);

        FundTransfer entity =
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
                        VoucherTypes.FundTransfer,
                        input.Period.BranchId,
                        input.VoucherDate);

                entity.VoucherNo =
                    number.VoucherNo;

                _context.Set<FundTransfer>().Add(entity);

                await _context.SaveChangesAsync();

                await ReplaceDetailsAsync(
                    entity.FundTransferId,
                    input);

                AddHistory(entity, "Create", "Created", userId, entity.CreatedDate);

                await _context.SaveChangesAsync();
            });

        return new FundTransferSavedDto
        {
            FundTransferId = entity.FundTransferId,
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
            UpdateFundTransferDto dto,
            long userId
        )
    {
        FtInput input =
            await NormalizeAsync(dto);

        await InTransactionAsync(
            async () =>
            {
                FundTransfer entity =
                    await LoadAsync(dto.FundTransferId);

                RequireStatus(entity, VoucherStatuses.Draft, "edited");

                // An older draft keeps its saved date
                await EnsureDateAllowedAsync(
                    input.VoucherDate,
                    entity.VoucherDate);

                string expectedStart =
                    $"{VoucherTypes.FundTransfer}-{input.Period.BranchDigits}-{input.Period.FinancialYearCode}-{input.Period.PeriodMonth:D2}-";

                if (!entity.VoucherNo.StartsWith(expectedStart, StringComparison.Ordinal))
                {
                    VoucherNumberDto number =
                        await _numberService.NextAsync(
                            VoucherTypes.FundTransfer,
                            input.Period.BranchId,
                            input.VoucherDate);

                    entity.VoucherNo =
                        number.VoucherNo;
                }

                ApplyHeader(entity, input);

                entity.ModifiedBy = userId;

                entity.ModifiedDate = DateTime.UtcNow;

                await ReplaceDetailsAsync(
                    entity.FundTransferId,
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
                FundTransfer entity =
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
        FundTransfer? entity =
            await _context
                .Set<FundTransfer>()
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
                FundTransfer entity =
                    await LoadAsync(id);

                RequireStatus(entity, VoucherStatuses.Draft, "approved");

                DateTime now =
                    DateTime.UtcNow;

                entity.Status = VoucherStatuses.Approved;

                entity.ApprovedBy = userId;

                entity.ApprovedDate = now;

                AddHistory(entity, "Approve", "Approved", userId, now);

                // Switch "Post Fund Transfer On Approval" : post in
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
                FundTransfer entity =
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
                FundTransfer entity =
                    await LoadAsync(id);

                RequireStatus(entity, VoucherStatuses.Approved, "posted");

                await PostCoreAsync(entity, userId);

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Post core (Approved → Posted; the caller saves and holds
    // the transaction). Used by Post and by Approve when the
    // switch "Post Fund Transfer On Approval" is ON.
    //===========================================================

    private async Task
        PostCoreAsync
        (
            FundTransfer entity,
            long userId
        )
    {
        long id =
            entity.FundTransferId;

        List<FundTransferLines> lines =
            await _context
                .Set<FundTransferLines>()
                .AsNoTracking()
                .Where(x => x.FundTransferId == id)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        await _postingService.PostAsync(
            new VoucherPostingRequest
            {
                VoucherType = VoucherTypes.FundTransfer,
                VoucherId = entity.FundTransferId,
                VoucherNo = entity.VoucherNo,
                VoucherDate = entity.VoucherDate,
                BranchId = entity.BranchId,
                // Own accounts only : no party
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
    // Back Dated / Post Dated Entry (settings 0043 / 0044)
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
    // Build posting lines (one group)
    //   Dr each To account
    //   Dr Bank Charges / MFS Charges (charges the company pays)
    //   Cr each From account : amount + its charge
    //===========================================================

    private static List<VoucherPostingLine> BuildPostingLines
    (
        List<FundTransferLines> lines
    )
    {
        List<VoucherPostingLine> result =
            new();

        List<FundTransferLines> froms =
            lines.Where(x => x.Side == FromSide).ToList();

        List<FundTransferLines> tos =
            lines.Where(x => x.Side == ToSide).ToList();

        string fromText =
            string.Join(", ", froms.Select(x => x.LedgerName));

        string toText =
            string.Join(", ", tos.Select(x => x.LedgerName));

        foreach (FundTransferLines line in tos)
        {
            result.Add(
                new VoucherPostingLine
                {
                    GroupNo = 1,
                    LedgerCode = line.LedgerCode,
                    Debit = line.Amount,
                    Credit = 0,
                    Narration = string.IsNullOrWhiteSpace(line.ShortNotes)
                        ? $"Transfer from {fromText}"
                        : line.ShortNotes
                });
        }

        foreach (IGrouping<string, FundTransferLines> group in froms
                     .Where(x => x.ChargeAmount > 0)
                     .GroupBy(x => x.AccountType))
        {
            string ledger =
                ChargeLedgers.TryGetValue(group.Key, out string? code)
                    ? code
                    : throw new InvalidOperationException(
                        $"No charge expense ledger for {group.Key}.");

            result.Add(
                new VoucherPostingLine
                {
                    GroupNo = 1,
                    LedgerCode = ledger,
                    Debit = group.Sum(x => x.ChargeAmount),
                    Credit = 0,
                    Narration = $"{group.Key} charges on transfer to {toText}"
                });
        }

        foreach (FundTransferLines line in froms)
        {
            string reference =
                line.Method == ChequeMethod
                    ? $" (Cheque {line.CheckNo})"
                    : string.IsNullOrWhiteSpace(line.Reference)
                        ? string.Empty
                        : $" ({line.Reference})";

            result.Add(
                new VoucherPostingLine
                {
                    GroupNo = 1,
                    LedgerCode = line.LedgerCode,
                    Debit = 0,
                    Credit = line.Amount + line.ChargeAmount,
                    Narration = string.IsNullOrWhiteSpace(line.ShortNotes)
                        ? $"Transfer to {toText}{reference}"
                        : line.ShortNotes
                });
        }

        return result;
    }


    //===========================================================
    // Cancel (Posted → Cancelled)
    //===========================================================

    public async Task
        CancelAsync
        (
            long id,
            CancelFundTransferDto dto,
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
                FundTransfer entity =
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
            .Set<FundTransfer>()
            .AnyAsync
            (
                x =>
                    x.FundTransferId == id
                    &&
                    !x.IsDeleted
            );
    }
}