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
// Receipt Voucher Repository
//
// One receipt mode per voucher (every debit row uses it).
// One group per voucher :
//   Debits  (Receipt Mode)    : Cash / Bank / Check / MFS / POS / EMI
//   Credits (Account Details) : Customer / Supplier / General Ledger
//   n Debits : 1 Credit   or   1 Debit : n Credits
//
// Draft    : Create / Update / Delete / Restore. The number is
//            taken on the first save (RV-<branch>-<FY>-<MM>-n).
// Approve  : Draft → Approved (locked)
// Return   : Approved → Draft
// Post     : Approved → Posted
//              Dr money account   (amount + charge the customer
//                                  bears)
//              Cr recovery income (charges the customer bears)
//              Cr the credit rows (up to the non-check total)
//            Check rows post nothing : CheckStatus = Pending for
//            Check Reconciliation (RRV later).
// Cancel   : Posted → Cancelled, reversing entries.
//===============================================================

public class ReceiptVoucherRepository : IReceiptVoucherRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string ModuleName =
        "Accounts Finance";

    private const string EntityName =
        "ReceiptVoucher";

    private const string DateFormat =
        "yyyy-MM-dd";

    // Settings › System Configuration switches (read by code)
    //   0001 Multi Mode Receipt Voucher : several receipt modes
    //   0003 Post Receipt Voucher On Approval : Approve also posts
    private const string MultiModeSwitch =
        "CFG-MOD-004-0001";

    private const string PostOnApprovalSwitch =
        "CFG-MOD-004-0003";

    //   0033 Receipt Voucher : Max Lines (Value = most debit +
    //        credit rows; OFF = no limit)
    private const string MaxLinesSwitch =
        "CFG-MOD-004-0033";

    private const string CheckMode =
        "Check";

    // Charge recovery income (charge borne by the customer),
    // looked up by CODE
    private const string MfsRecoveryLedger =
        "GLR-011-001-001-00001";

    private const string PosRecoveryLedger =
        "GLR-011-001-001-00002";

    private const string EmiRecoveryLedger =
        "GLR-011-001-001-00003";

    // Credit side ledger types
    private static readonly string[] CreditLedgerTypes =
    {
        "Customer",
        "Supplier",
        "General Ledger"
    };

    // Receipt mode → ledger type of its account
    private static readonly Dictionary<string, string> ModeLedgerTypes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["Cash"] = "Cash",
            ["Bank"] = "Bank",
            ["Check"] = "Bank",
            ["MFS"] = "MFS",
            ["POS"] = "POS",
            ["EMI"] = "EMI"
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

    public ReceiptVoucherRepository(
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

    private sealed class RvInput
    {
        public DateOnly VoucherDate { get; set; }

        public VoucherPeriodDto Period { get; set; } = new();

        public string LedgerType { get; set; } = string.Empty;

        public string PartyName { get; set; } = string.Empty;

        public string Narration { get; set; } = string.Empty;

        public decimal TotalAmount { get; set; }

        public decimal CustomerCharges { get; set; }

        // Credits
        public List<ReceiptVoucherLines> Lines { get; set; } = new();

        // Debits
        public List<ReceiptVoucherPayments> Payments { get; set; } = new();
    }


    //===========================================================
    // Get All (list : header + receipt modes)
    //===========================================================

    public async Task<List<ReceiptVoucherDto>>
        GetAllAsync()
    {
        List<ReceiptVoucher> rows =
            await _context
                .Set<ReceiptVoucher>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.VoucherDate)
                .ThenByDescending(x => x.VoucherNo)
                .ToListAsync();

        List<long> ids =
            rows.Select(x => x.ReceiptVoucherId).ToList();

        var modes =
            await _context
                .Set<ReceiptVoucherPayments>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.ReceiptVoucherId))
                .Select(x => new { x.ReceiptVoucherId, x.Mode, x.LineNo })
                .ToListAsync();

        Dictionary<long, string> modeText =
            modes
                .GroupBy(x => x.ReceiptVoucherId)
                .ToDictionary
                (
                    g => g.Key,
                    g => string.Join(
                        ", ",
                        g.OrderBy(x => x.LineNo)
                         .Select(x => x.Mode)
                         .Distinct())
                );

        return rows
            .Select
            (
                x =>
                {
                    ReceiptVoucherDto dto =
                        ToDto(x);

                    dto.ReceiptModes =
                        modeText.TryGetValue(x.ReceiptVoucherId, out string? text)
                            ? text
                            : string.Empty;

                    return dto;
                }
            )
            .ToList();
    }


    //===========================================================
    // Get Defaults (Add form) : next voucher number
    //
    // Sequence = the higher of
    //   • VoucherSequences.LastNumber (numbers already taken)
    //   • the highest RV number saved for the same branch / FY /
    //     month (deleted drafts included)
    // + 1, formatted by CodeGenerator.GenerateVoucherNo.
    // Nothing is reserved.
    //===========================================================

    public async Task<ReceiptVoucherDefaultsDto>
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
            return new ReceiptVoucherDefaultsDto
            {
                BranchId = branchId,
                Message = ex.Message
            };
        }

        string prefix =
            CodeGenerator.GenerateVoucherNoPrefix(
                VoucherTypes.Receipt,
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
                        x.Prefix == VoucherTypes.Receipt
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
                .Set<ReceiptVoucher>()
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
            return new ReceiptVoucherDefaultsDto
            {
                BranchId = period.BranchId,
                BranchName = period.BranchName,
                FinancialYearId = period.FinancialYearId,
                FinancialYearName = period.FinancialYearName,
                FinancialYearCode = period.FinancialYearCode,
                PeriodMonth = period.PeriodMonth,
                Message = $"RV numbers for {period.FinancialYearCode}-{period.PeriodMonth:D2} are exhausted (99999)."
            };
        }

        return new ReceiptVoucherDefaultsDto
        {
            VoucherNo =
                CodeGenerator.GenerateVoucherNo(
                    VoucherTypes.Receipt,
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
    // Get By Id (header + debits + credits)
    //===========================================================

    public async Task<ReceiptVoucherDto?>
        GetByIdAsync
        (
            long id
        )
    {
        ReceiptVoucher? row =
            await _context
                .Set<ReceiptVoucher>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ReceiptVoucherId == id
                        &&
                        !x.IsDeleted
                );

        if (row == null)
        {
            return null;
        }

        ReceiptVoucherDto dto =
            ToDto(row);

        dto.Credits =
            await _context
                .Set<ReceiptVoucherLines>()
                .AsNoTracking()
                .Where(x => x.ReceiptVoucherId == id)
                .OrderBy(x => x.LineNo)
                .Select
                (
                    x =>
                        new ReceiptVoucherCreditDto
                        {
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

        List<ReceiptVoucherPayments> payments =
            await _context
                .Set<ReceiptVoucherPayments>()
                .AsNoTracking()
                .Where(x => x.ReceiptVoucherId == id)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        dto.Debits =
            payments
                .Select
                (
                    x =>
                        new ReceiptVoucherDebitDto
                        {
                            Mode = x.Mode,
                            LedgerType = x.LedgerType,
                            SubGroupCode = x.SubGroupCode,
                            SubGroupName = x.SubGroupName,
                            LedgerCode = x.LedgerCode,
                            LedgerName = x.LedgerName,
                            AccountId = x.AccountId,
                            Amount = x.Amount,
                            ShortNotes = x.ShortNotes,
                            ChargePercent = x.ChargePercent,
                            ChargeAmount = x.ChargeAmount,
                            ChargeBorneBy = x.ChargeBorneBy,
                            CardSetupId = x.CardSetupId,
                            CardName = x.CardName,
                            TransactionRef = x.TransactionRef,
                            TenureMonths = x.TenureMonths,
                            InterestPercent = x.InterestPercent,
                            InterestAmount = x.InterestAmount,
                            TotalCharged = x.TotalCharged,
                            CheckNo = x.CheckNo,
                            CheckDate = x.CheckDate?.ToString(DateFormat, CultureInfo.InvariantCulture) ?? string.Empty,
                            CheckBank = x.CheckBank,
                            CheckStatus = x.CheckStatus,
                            ClearedVoucherNo = x.ClearedVoucherNo
                        }
                )
                .ToList();

        dto.ReceiptModes =
            string.Join(
                ", ",
                payments.Select(x => x.Mode).Distinct());

        return dto;
    }


    private static ReceiptVoucherDto ToDto
    (
        ReceiptVoucher x
    )
    {
        return new ReceiptVoucherDto
        {
            ReceiptVoucherId = x.ReceiptVoucherId,
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
            CustomerCharges = x.CustomerCharges,
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
    //===========================================================

    private async Task<RvInput>
        NormalizeAsync
        (
            CreateReceiptVoucherDto dto
        )
    {
        RvInput input =
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

        //=======================================================
        // One group : n debits : 1 credit or 1 debit : n credits
        //=======================================================

        List<ReceiptVoucherDebitDto> debits =
            dto.Debits ?? new List<ReceiptVoucherDebitDto>();

        List<ReceiptVoucherCreditDto> credits =
            dto.Credits ?? new List<ReceiptVoucherCreditDto>();

        if (debits.Count == 0)
        {
            throw new InvalidOperationException(
                "Add at least one Receipt Mode (debit) row.");
        }

        if (credits.Count == 0)
        {
            throw new InvalidOperationException(
                "Add at least one Account Details (credit) row.");
        }

        // One receipt mode per voucher, unless the switch
        // "Multi Mode Receipt Voucher" is ON
        if (debits
                .Select(x => (x.Mode ?? string.Empty).Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Count() > 1
            && !await IsSwitchOnAsync(MultiModeSwitch, false))
        {
            throw new InvalidOperationException(
                "One receipt mode per voucher : every Receipt Mode row must use the same mode.");
        }

        // Setting "Receipt Voucher : Max Lines"
        int maxLines =
            await SwitchNumberAsync(MaxLinesSwitch);

        if (maxLines > 0 && debits.Count + credits.Count > maxLines)
        {
            throw new InvalidOperationException(
                $"Maximum {maxLines} lines per voucher; this voucher has {debits.Count + credits.Count}.");
        }

        if (debits.Count > 1 && credits.Count > 1)
        {
            throw new InvalidOperationException(
                "One group per voucher : several debits need a single credit, or a single debit can have several credits.");
        }

        //=======================================================
        // Ledger type of the credit side (one per voucher)
        //=======================================================

        List<string> types =
            credits
                .Select(x => (x.LedgerType ?? string.Empty).Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

        if (types.Count != 1)
        {
            throw new InvalidOperationException(
                "Every Account Details row must have the same Ledger Type.");
        }

        input.LedgerType =
            CreditLedgerTypes.FirstOrDefault
            (
                x =>
                    string.Equals(x, types[0], StringComparison.OrdinalIgnoreCase)
            )
            ??
            throw new InvalidOperationException(
                "Ledger Type must be Customer, Supplier or General Ledger.");

        //=======================================================
        // Ledgers used by both sides
        //=======================================================

        List<string> creditCodes =
            credits
                .Select(x => (x.LedgerCode ?? string.Empty).Trim())
                .Where(x => x.Length > 0)
                .ToList();

        Dictionary<string, VoucherLedgerDto> ledgers =
            await _ledgerRepository.GetByCodesAsync(
                creditCodes.Concat(
                    debits.Select(x => x.LedgerCode ?? string.Empty)));

        //=======================================================
        // Party ledgers (customers / suppliers) of the credits
        //=======================================================

        // Codes as sent + upper case (ledger codes are stored
        // upper case; no function on the column keeps the index)
        List<string> upperCodes =
            creditCodes
                .Concat(creditCodes.Select(x => x.ToUpperInvariant()))
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

        //=======================================================
        // Credits (Account Details)
        //=======================================================

        // General Ledger rows may not use the auto-created
        // inventory / financial ledgers
        HashSet<string> autoLedgerCodes =
            new(StringComparer.OrdinalIgnoreCase);

        if (input.LedgerType == "General Ledger")
        {
            AutoAccountCodesDto auto =
                await _autoAccounts.GetCodesAsync();

            autoLedgerCodes.UnionWith(
                auto.InventoryLedgerCodes
                    .Concat(auto.FinancialLedgerCodes)
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Select(x => x.Trim()));
        }

        int lineNo = 0;

        foreach (ReceiptVoucherCreditDto credit in credits)
        {
            lineNo++;

            string code =
                (credit.LedgerCode ?? string.Empty).Trim();

            string key =
                code.ToUpperInvariant();

            if (!ledgers.TryGetValue(code, out VoucherLedgerDto? ledger))
            {
                throw new InvalidOperationException(
                    $"Credit {lineNo} : ledger '{code}' was not found.");
            }

            if (!ledger.IsActive)
            {
                throw new InvalidOperationException(
                    $"Credit {lineNo} : ledger '{ledger.LedgerCode} - {ledger.LedgerName}' is inactive.");
            }

            if (ledger.IsMoneyLedger)
            {
                throw new InvalidOperationException(
                    $"Credit {lineNo} : a cash / bank / MFS / POS / EMI ledger cannot be credited here. Use Fund Transfer.");
            }

            string partyCode =
                string.Empty;

            string ledgerName =
                ledger.LedgerName;

            switch (input.LedgerType)
            {
                case "Customer":

                    if (!customerByLedger.TryGetValue(key, out var customer))
                    {
                        throw new InvalidOperationException(
                            $"Credit {lineNo} : '{ledger.LedgerName}' is not a customer ledger.");
                    }

                    partyCode = customer.Code;

                    ledgerName = customer.Name;

                    break;

                case "Supplier":

                    if (!supplierByLedger.TryGetValue(key, out var supplier))
                    {
                        throw new InvalidOperationException(
                            $"Credit {lineNo} : '{ledger.LedgerName}' is not a supplier ledger.");
                    }

                    partyCode = supplier.Code;

                    ledgerName = supplier.Name;

                    break;

                default:

                    if (customerByLedger.ContainsKey(key) || supplierByLedger.ContainsKey(key))
                    {
                        throw new InvalidOperationException(
                            $"Credit {lineNo} : '{ledger.LedgerName}' belongs to a customer / supplier. Choose that Ledger Type.");
                    }

                    if (autoLedgerCodes.Contains(ledger.LedgerCode.Trim()))
                    {
                        throw new InvalidOperationException(
                            $"Credit {lineNo} : '{ledger.LedgerName}' is an auto-generated ledger and is posted only by its own module.");
                    }

                    break;
            }

            if (!(credit.Amount > 0) || !IsMoney(credit.Amount))
            {
                throw new InvalidOperationException(
                    $"Credit {lineNo} : amount must be more than 0 with at most 2 decimals.");
            }

            input.Lines.Add(
                new ReceiptVoucherLines
                {
                    LineNo = lineNo,
                    LedgerType = input.LedgerType,
                    SubGroupCode = Limit(ledger.SubGroupCode, 40),
                    SubGroupName = Limit(ledger.SubGroupName, 200),
                    LedgerCode = ledger.LedgerCode,
                    LedgerName = Limit(ledgerName, 250),
                    PartyCode = Limit(partyCode, 40),
                    Amount = credit.Amount,
                    ShortNotes = Limit(credit.ShortNotes, 250)
                });
        }

        //=======================================================
        // Debits (Receipt Mode)
        //=======================================================

        string branchKey =
            input.Period.BranchName.Trim().ToUpperInvariant();

        int debitNo = 0;

        foreach (ReceiptVoucherDebitDto debit in debits)
        {
            debitNo++;

            string mode =
                ModeLedgerTypes.Keys.FirstOrDefault
                (
                    x =>
                        string.Equals(
                            x,
                            (debit.Mode ?? string.Empty).Trim(),
                            StringComparison.OrdinalIgnoreCase)
                )
                ??
                throw new InvalidOperationException(
                    $"Debit {debitNo} : unknown receipt mode '{debit.Mode}'.");

            string ledgerType =
                ModeLedgerTypes[mode];

            string code =
                (debit.LedgerCode ?? string.Empty).Trim();

            if (!ledgers.TryGetValue(code, out VoucherLedgerDto? account))
            {
                throw new InvalidOperationException(
                    $"Debit {debitNo} : account '{code}' was not found.");
            }

            if (!string.Equals(account.LedgerType, ledgerType, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    $"Debit {debitNo} : '{account.LedgerName}' is not a {ledgerType} account.");
            }

            if (!account.IsActive || !account.CollectionAccount)
            {
                throw new InvalidOperationException(
                    $"Debit {debitNo} : '{account.LedgerName}' is inactive or not a collection account.");
            }

            string accountBranch =
                (account.Branch ?? string.Empty).Trim().ToUpperInvariant();

            bool branchOk =
                account.LedgerType == "Cash"
                    ? accountBranch == branchKey
                    : !account.BranchExclusive || accountBranch == branchKey;

            if (!branchOk)
            {
                throw new InvalidOperationException(
                    $"Debit {debitNo} : '{account.LedgerName}' belongs to another branch.");
            }

            if (!(debit.Amount > 0) || !IsMoney(debit.Amount))
            {
                throw new InvalidOperationException(
                    $"Debit {debitNo} : amount must be more than 0 with at most 2 decimals.");
            }

            ReceiptVoucherPayments row =
                new()
                {
                    LineNo = debitNo,
                    Mode = mode,
                    LedgerType = account.LedgerType,
                    SubGroupCode = Limit(account.SubGroupCode, 40),
                    SubGroupName = Limit(account.SubGroupName, 200),
                    LedgerCode = account.LedgerCode,
                    LedgerName = Limit(account.LedgerName, 250),
                    AccountId = account.AccountId,
                    Amount = debit.Amount,
                    ShortNotes = Limit(debit.ShortNotes, 250),
                    ChargeBorneBy = string.Empty,
                    CardName = string.Empty,
                    TransactionRef = string.Empty,
                    CheckNo = string.Empty,
                    CheckBank = string.Empty,
                    CheckStatus = string.Empty,
                    ClearedVoucherNo = string.Empty
                };

            //===================================================
            // Step 2 details
            //===================================================

            string label =
                $"Debit {debitNo} ({mode})";

            switch (mode)
            {
                case "Check":

                    row.CheckNo = Limit(debit.CheckNo, 50);

                    if (row.CheckNo.Length == 0)
                    {
                        throw new InvalidOperationException(
                            $"{label} : Check No is required.");
                    }

                    row.CheckDate =
                        ParseDate(debit.CheckDate, $"{label} : Check Date");

                    row.CheckBank = Limit(debit.CheckBank, 200);

                    if (row.CheckBank.Length == 0)
                    {
                        throw new InvalidOperationException(
                            $"{label} : Issuing Bank is required.");
                    }

                    break;

                case "MFS":

                    row.TransactionRef = Limit(debit.TransactionRef, 100);

                    if (row.TransactionRef.Length == 0)
                    {
                        throw new InvalidOperationException(
                            $"{label} : Transaction ID is required.");
                    }

                    ApplyCharge(row, debit, label);

                    break;

                case "POS":

                    RequireCard(row, debit, label);

                    row.TransactionRef = Limit(debit.TransactionRef, 100);

                    ApplyCharge(row, debit, label);

                    break;

                case "EMI":

                    RequireCard(row, debit, label);

                    if (!(debit.TenureMonths > 0) || debit.TenureMonths > 120)
                    {
                        throw new InvalidOperationException(
                            $"{label} : tenure must be 1 to 120 months.");
                    }

                    if (debit.InterestPercent < 0 || debit.InterestPercent > 100
                        || debit.InterestAmount < 0 || debit.TotalCharged < 0)
                    {
                        throw new InvalidOperationException(
                            $"{label} : interest % must be 0 to 100 and amounts cannot be negative.");
                    }

                    row.TenureMonths = debit.TenureMonths;

                    row.InterestPercent = decimal.Round(debit.InterestPercent, 2);

                    row.InterestAmount = decimal.Round(debit.InterestAmount, 2);

                    row.TotalCharged = decimal.Round(debit.TotalCharged, 2);

                    ApplyCharge(row, debit, label);

                    break;
            }

            input.Payments.Add(row);
        }

        //=======================================================
        // Balance : debits = credits
        //=======================================================

        decimal totalDebit =
            input.Payments.Sum(x => x.Amount);

        decimal totalCredit =
            input.Lines.Sum(x => x.Amount);

        if (totalDebit != totalCredit)
        {
            throw new InvalidOperationException(
                $"Debit ({totalDebit:N2}) and credit ({totalCredit:N2}) must be equal.");
        }

        input.TotalAmount =
            totalDebit;

        input.CustomerCharges =
            input.Payments
                .Where(x => x.ChargeBorneBy == "Customer")
                .Sum(x => x.ChargeAmount);

        input.PartyName =
            Limit(
                input.Lines.Count == 1
                    ? input.Lines[0].LedgerName
                    : $"{input.Lines[0].LedgerName} + {input.Lines.Count - 1} more",
                250);

        return input;
    }


    //===========================================================
    // Card (POS / EMI)
    //===========================================================

    private static void RequireCard
    (
        ReceiptVoucherPayments row,
        ReceiptVoucherDebitDto debit,
        string label
    )
    {
        if (!(debit.CardSetupId > 0))
        {
            throw new InvalidOperationException(
                $"{label} : Card is required.");
        }

        row.CardSetupId = debit.CardSetupId;

        row.CardName = Limit(debit.CardName, 200);
    }


    //===========================================================
    // Charge (MFS / POS / EMI)
    //===========================================================

    private static void ApplyCharge
    (
        ReceiptVoucherPayments row,
        ReceiptVoucherDebitDto debit,
        string label
    )
    {
        decimal percent =
            debit.ChargePercent;

        decimal amount =
            debit.ChargeAmount;

        if (percent < 0 || percent > 100)
        {
            throw new InvalidOperationException(
                $"{label} : charge % must be between 0 and 100.");
        }

        if (amount < 0 || !IsMoney(amount) || amount > row.Amount)
        {
            throw new InvalidOperationException(
                $"{label} : charge amount must be between 0 and the amount.");
        }

        row.ChargePercent = decimal.Round(percent, 2);

        row.ChargeAmount = amount;

        row.ChargeBorneBy =
            amount > 0
                ? (string.Equals(debit.ChargeBorneBy, "Customer", StringComparison.OrdinalIgnoreCase)
                    ? "Customer"
                    : "Company")
                : string.Empty;
    }


    //===========================================================
    // Apply header values
    //===========================================================

    private static void ApplyHeader
    (
        ReceiptVoucher entity,
        RvInput input
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
        entity.CustomerCharges = input.CustomerCharges;
    }

    private async Task ReplaceDetailsAsync
    (
        long voucherId,
        RvInput input
    )
    {
        List<ReceiptVoucherLines> oldLines =
            await _context
                .Set<ReceiptVoucherLines>()
                .Where(x => x.ReceiptVoucherId == voucherId)
                .ToListAsync();

        List<ReceiptVoucherPayments> oldPayments =
            await _context
                .Set<ReceiptVoucherPayments>()
                .Where(x => x.ReceiptVoucherId == voucherId)
                .ToListAsync();

        _context.Set<ReceiptVoucherLines>().RemoveRange(oldLines);

        _context.Set<ReceiptVoucherPayments>().RemoveRange(oldPayments);

        foreach (ReceiptVoucherLines line in input.Lines)
        {
            line.ReceiptVoucherId = voucherId;
        }

        foreach (ReceiptVoucherPayments payment in input.Payments)
        {
            payment.ReceiptVoucherId = voucherId;
        }

        _context.Set<ReceiptVoucherLines>().AddRange(input.Lines);

        _context.Set<ReceiptVoucherPayments>().AddRange(input.Payments);
    }


    //===========================================================
    // History
    //===========================================================

    private void AddHistory
    (
        ReceiptVoucher entity,
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
                EntityId = entity.ReceiptVoucherId,
                ActivityType = activityType,
                ActivityTitle = $"Receipt Voucher {verb}",
                ActivityDescription =
                    $"Receipt Voucher {entity.VoucherNo} ({entity.PartyName}, {entity.TotalAmount:N2}) {verb.ToLowerInvariant()}.{(string.IsNullOrWhiteSpace(extra) ? string.Empty : " " + extra)}",
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
    // and Update, or Cancel and Check Reconciliation) never
    // act on the same voucher at the same time, and the status
    // read here is the committed one.
    //===========================================================

    private async Task<ReceiptVoucher>
        LoadAsync
        (
            long id
        )
    {
        await _context.Database.ExecuteSqlInterpolatedAsync(
            $@"SELECT 1 FROM ""ReceiptVoucher"" WHERE ""ReceiptVoucherId"" = {id} FOR UPDATE");

        ReceiptVoucher? entity =
            await _context
                .Set<ReceiptVoucher>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ReceiptVoucherId == id
                        &&
                        !x.IsDeleted
                );

        return entity
            ??
            throw new KeyNotFoundException(
                "Receipt Voucher not found.");
    }

    private static void RequireStatus
    (
        ReceiptVoucher entity,
        string status,
        string action
    )
    {
        if (!string.Equals(entity.Status, status, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                $"Receipt Voucher {entity.VoucherNo} is {entity.Status}; only a {status} voucher can be {action}.");
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

    public async Task<ReceiptVoucherSavedDto>
        CreateAsync
        (
            CreateReceiptVoucherDto dto,
            long userId
        )
    {
        RvInput input =
            await NormalizeAsync(dto);

        ReceiptVoucher entity =
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
                        VoucherTypes.Receipt,
                        input.Period.BranchId,
                        input.VoucherDate);

                entity.VoucherNo =
                    number.VoucherNo;

                _context.Set<ReceiptVoucher>().Add(entity);

                await _context.SaveChangesAsync();

                await ReplaceDetailsAsync(
                    entity.ReceiptVoucherId,
                    input);

                AddHistory(entity, "Create", "Created", userId, entity.CreatedDate);

                await _context.SaveChangesAsync();
            });

        return new ReceiptVoucherSavedDto
        {
            ReceiptVoucherId = entity.ReceiptVoucherId,
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
            UpdateReceiptVoucherDto dto,
            long userId
        )
    {
        RvInput input =
            await NormalizeAsync(dto);

        await InTransactionAsync(
            async () =>
            {
                ReceiptVoucher entity =
                    await LoadAsync(dto.ReceiptVoucherId);

                RequireStatus(entity, VoucherStatuses.Draft, "edited");

                string expectedStart =
                    $"{VoucherTypes.Receipt}-{input.Period.BranchDigits}-{input.Period.FinancialYearCode}-{input.Period.PeriodMonth:D2}-";

                if (!entity.VoucherNo.StartsWith(expectedStart, StringComparison.Ordinal))
                {
                    VoucherNumberDto number =
                        await _numberService.NextAsync(
                            VoucherTypes.Receipt,
                            input.Period.BranchId,
                            input.VoucherDate);

                    entity.VoucherNo =
                        number.VoucherNo;
                }

                ApplyHeader(entity, input);

                entity.ModifiedBy = userId;

                entity.ModifiedDate = DateTime.UtcNow;

                await ReplaceDetailsAsync(
                    entity.ReceiptVoucherId,
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
                ReceiptVoucher entity =
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
        ReceiptVoucher? entity =
            await _context
                .Set<ReceiptVoucher>()
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
                ReceiptVoucher entity =
                    await LoadAsync(id);

                RequireStatus(entity, VoucherStatuses.Draft, "approved");

                DateTime now =
                    DateTime.UtcNow;

                entity.Status = VoucherStatuses.Approved;

                entity.ApprovedBy = userId;

                entity.ApprovedDate = now;

                AddHistory(entity, "Approve", "Approved", userId, now);

                // Switch "Post Receipt Voucher On Approval" : post in
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
                ReceiptVoucher entity =
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
                ReceiptVoucher entity =
                    await LoadAsync(id);

                RequireStatus(entity, VoucherStatuses.Approved, "posted");

                await PostCoreAsync(entity, userId);

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Post core (Approved → Posted; the caller saves and holds
    // the transaction). Used by Post and by Approve when the
    // switch "Post Receipt Voucher On Approval" is ON.
    //===========================================================

    private async Task
        PostCoreAsync
        (
            ReceiptVoucher entity,
            long userId
        )
    {
        long id =
            entity.ReceiptVoucherId;

        List<ReceiptVoucherLines> lines =
            await _context
                .Set<ReceiptVoucherLines>()
                .AsNoTracking()
                .Where(x => x.ReceiptVoucherId == id)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        List<ReceiptVoucherPayments> payments =
            await _context
                .Set<ReceiptVoucherPayments>()
                .Where(x => x.ReceiptVoucherId == id)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        List<VoucherPostingLine> posting =
            BuildPostingLines(entity, lines, payments);

        // All-check receipt : nothing to post until the
        // checks clear (RRV)
        if (posting.Count > 0)
        {
            await _postingService.PostAsync(
                new VoucherPostingRequest
                {
                    VoucherType = VoucherTypes.Receipt,
                    VoucherId = entity.ReceiptVoucherId,
                    VoucherNo = entity.VoucherNo,
                    VoucherDate = entity.VoucherDate,
                    BranchId = entity.BranchId,
                    PartyType = entity.LedgerType,
                    PartyCode = lines.Count == 1 ? lines[0].PartyCode : string.Empty,
                    ReferenceNo = string.Empty,
                    Narration = string.IsNullOrWhiteSpace(entity.Narration)
                        ? $"Received from {entity.PartyName}"
                        : entity.Narration,
                    Lines = posting
                },
                userId);
        }

        foreach (ReceiptVoucherPayments check in payments.Where(x => x.Mode == CheckMode))
        {
            check.CheckStatus = "Pending";
        }

        DateTime now =
            DateTime.UtcNow;

        entity.Status = VoucherStatuses.Posted;

        entity.PostedBy = userId;

        entity.PostedDate = now;

        AddHistory(entity, "Post", "Posted", userId, now);
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
    // Build posting lines
    //
    // Dr each non-check debit : amount (+ the charge when the
    //    customer bears it)
    // Cr charge recovery income (charges the customer bears)
    // Cr the credit rows in order, up to the non-check total
    //    (the check part is credited later by the RRV)
    //===========================================================

    private static List<VoucherPostingLine> BuildPostingLines
    (
        ReceiptVoucher entity,
        List<ReceiptVoucherLines> lines,
        List<ReceiptVoucherPayments> payments
    )
    {
        List<VoucherPostingLine> result =
            new();

        List<ReceiptVoucherPayments> received =
            payments
                .Where(x => x.Mode != CheckMode)
                .ToList();

        //=======================================================
        // Debits : money accounts
        //=======================================================

        foreach (ReceiptVoucherPayments payment in received)
        {
            decimal customerCharge =
                payment.ChargeBorneBy == "Customer"
                    ? payment.ChargeAmount
                    : 0;

            string reference =
                string.IsNullOrWhiteSpace(payment.TransactionRef)
                    ? string.Empty
                    : $" ({payment.TransactionRef})";

            result.Add(
                new VoucherPostingLine
                {
                    GroupNo = 1,
                    LedgerCode = payment.LedgerCode,
                    Debit = payment.Amount + customerCharge,
                    Credit = 0,
                    Narration = string.IsNullOrWhiteSpace(payment.ShortNotes)
                        ? $"{payment.Mode} received from {entity.PartyName}{reference}"
                        : payment.ShortNotes
                });
        }

        //=======================================================
        // Credits : charge recovery (customer bears)
        //=======================================================

        foreach (IGrouping<string, ReceiptVoucherPayments> group in received
                     .Where(x => x.ChargeBorneBy == "Customer" && x.ChargeAmount > 0)
                     .GroupBy(x => x.Mode))
        {
            string ledger =
                group.Key switch
                {
                    "MFS" => MfsRecoveryLedger,
                    "POS" => PosRecoveryLedger,
                    "EMI" => EmiRecoveryLedger,
                    _ => throw new InvalidOperationException(
                        $"No charge recovery ledger for {group.Key}.")
                };

            result.Add(
                new VoucherPostingLine
                {
                    GroupNo = 1,
                    LedgerCode = ledger,
                    Debit = 0,
                    Credit = group.Sum(x => x.ChargeAmount),
                    Narration = $"{group.Key} charges recovered from {entity.PartyName}"
                });
        }

        //=======================================================
        // Credits : the credit rows, up to what was received now
        //=======================================================

        decimal remaining =
            received.Sum(x => x.Amount);

        foreach (ReceiptVoucherLines line in lines)
        {
            if (remaining <= 0)
            {
                break;
            }

            decimal take =
                Math.Min(line.Amount, remaining);

            result.Add(
                new VoucherPostingLine
                {
                    GroupNo = 1,
                    LedgerCode = line.LedgerCode,
                    Debit = 0,
                    Credit = take,
                    Narration = string.IsNullOrWhiteSpace(line.ShortNotes)
                        ? $"Received from {line.LedgerName}"
                        : line.ShortNotes,

                    // Each customer / supplier keeps its own code
                    // (a 1 debit : n customers receipt)
                    PartyType = string.IsNullOrWhiteSpace(line.PartyCode)
                        ? string.Empty
                        : line.LedgerType,

                    PartyCode = line.PartyCode
                });

            remaining -= take;
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
            CancelReceiptVoucherDto dto,
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
                ? DateOnly.FromDateTime(DateTime.Today)
                : ParseDate(dto!.CancelDate, "Cancel date");

        await InTransactionAsync(
            async () =>
            {
                ReceiptVoucher entity =
                    await LoadAsync(id);

                RequireStatus(entity, VoucherStatuses.Posted, "cancelled");

                if (cancelDate < entity.VoucherDate)
                {
                    throw new InvalidOperationException(
                        $"Cancel date cannot be before the voucher date ({entity.VoucherDate:dd-MM-yyyy}).");
                }

                // Open financial year for the cancel date (throws
                // when there is none), also for all-check vouchers
                // that reverse nothing
                await _numberService.ResolvePeriodAsync(
                    entity.BranchId,
                    cancelDate);

                List<ReceiptVoucherPayments> payments =
                    await _context
                        .Set<ReceiptVoucherPayments>()
                        .Where(x => x.ReceiptVoucherId == id)
                        .ToListAsync();

                if (payments.Any(x => x.Mode == CheckMode && x.CheckStatus == "Cleared"))
                {
                    throw new InvalidOperationException(
                        $"Receipt Voucher {entity.VoucherNo} has a cleared check. Reverse the check clearing first.");
                }

                if (await _postingService.IsPostedAsync(entity.VoucherNo))
                {
                    await _postingService.ReverseAsync(
                        entity.VoucherNo,
                        cancelDate,
                        reason,
                        userId);
                }

                foreach (ReceiptVoucherPayments check in payments.Where(x => x.Mode == CheckMode))
                {
                    check.CheckStatus = "Cancelled";
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
            .Set<ReceiptVoucher>()
            .AnyAsync
            (
                x =>
                    x.ReceiptVoucherId == id
                    &&
                    !x.IsDeleted
            );
    }
}