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

using BankAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.BankAccounts;

using SystemConfigurationsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.AccountsFinance.VoucherManagement;


//===============================================================
// Payment Voucher Repository
//
// One payment mode per voucher unless switch 0010 is ON.
// One group per voucher :
//   Debits  (Pay To, entered first) : Supplier / Customer / GL
//   Credits (Payment Mode)          : Cash / Bank / Check / MFS
//   n Debits : 1 Credit   or   1 Debit : n Credits
//
// Draft    : Create / Update / Delete / Restore. The number is
//            taken on the first save (PV-<branch>-<FY>-<MM>-n).
// Approve  : Draft → Approved (locked)
// Return   : Approved → Draft
// Post     : Approved → Posted
//              Dr the pay-to rows (up to the non-check total)
//              Dr MFS Charges expense (charges the company bears)
//              Cr money account (amount + charge the company
//                                bears)
//            Check rows post nothing : CheckStatus = Pending for
//            Check Reconciliation (RRP later).
// Cancel   : Posted → Cancelled, reversing entries.
//===============================================================

public class PaymentVoucherRepository : IPaymentVoucherRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string ModuleName =
        "Accounts Finance";

    private const string EntityName =
        "PaymentVoucher";

    private const string DateFormat =
        "yyyy-MM-dd";

    // Settings › System Configuration switches (read by code)
    //   0010 Multi Mode Payment Voucher : several payment modes
    //   0012 Post Payment Voucher On Approval : Approve also posts
    private const string MultiModeSwitch =
        "CFG-MOD-004-0010";

    private const string PostOnApprovalSwitch =
        "CFG-MOD-004-0012";

    //   0034 Payment Voucher : Max Lines (Value = most debit +
    //        credit rows; OFF = no limit)
    private const string MaxLinesSwitch =
        "CFG-MOD-004-0034";

    // Voucher date window (Value = most days back / ahead)
    private const string BackDatedSwitch =
        "CFG-MOD-004-0039";

    private const string PostDatedSwitch =
        "CFG-MOD-004-0040";

    private const string CheckMode =
        "Check";

    // Charge expense (charge borne by the company), looked up by
    // CODE
    private const string MfsChargeLedger =
        "GLR-004-001-001-00003";

    // Pay To (debit side) ledger types
    private static readonly string[] PayToLedgerTypes =
    {
        "Supplier",
        "Customer",
        "General Ledger"
    };

    // Payment mode → ledger type of its account
    private static readonly Dictionary<string, string> ModeLedgerTypes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["Cash"] = "Cash",
            ["Bank"] = "Bank",
            ["Check"] = "Bank",
            ["MFS"] = "MFS"
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

    public PaymentVoucherRepository(
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

    private sealed class PvInput
    {
        public DateOnly VoucherDate { get; set; }

        public VoucherPeriodDto Period { get; set; } = new();

        public string LedgerType { get; set; } = string.Empty;

        public string PartyName { get; set; } = string.Empty;

        public string Narration { get; set; } = string.Empty;

        public decimal TotalAmount { get; set; }

        public decimal CompanyCharges { get; set; }

        // Debits (Pay To)
        public List<PaymentVoucherLines> Lines { get; set; } = new();

        // Credits (Payment Mode)
        public List<PaymentVoucherPayments> Payments { get; set; } = new();
    }


    //===========================================================
    // Get All (list : header + payment modes)
    //===========================================================

    public async Task<List<PaymentVoucherDto>>
        GetAllAsync()
    {
        List<PaymentVoucher> rows =
            await _context
                .Set<PaymentVoucher>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.VoucherDate)
                .ThenByDescending(x => x.VoucherNo)
                .ToListAsync();

        List<long> ids =
            rows.Select(x => x.PaymentVoucherId).ToList();

        var modes =
            await _context
                .Set<PaymentVoucherPayments>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.PaymentVoucherId))
                .Select(x => new { x.PaymentVoucherId, x.Mode, x.LineNo })
                .ToListAsync();

        Dictionary<long, string> modeText =
            modes
                .GroupBy(x => x.PaymentVoucherId)
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
                    PaymentVoucherDto dto =
                        ToDto(x);

                    dto.PaymentModes =
                        modeText.TryGetValue(x.PaymentVoucherId, out string? text)
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
    //   • the highest PV number saved for the same branch / FY /
    //     month (deleted drafts included)
    // + 1, formatted by CodeGenerator.GenerateVoucherNo.
    // Nothing is reserved.
    //===========================================================

    public async Task<PaymentVoucherDefaultsDto>
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
            return new PaymentVoucherDefaultsDto
            {
                BranchId = branchId,
                Message = ex.Message
            };
        }

        string prefix =
            CodeGenerator.GenerateVoucherNoPrefix(
                VoucherTypes.Payment,
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
                        x.Prefix == VoucherTypes.Payment
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
                .Set<PaymentVoucher>()
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
            return new PaymentVoucherDefaultsDto
            {
                BranchId = period.BranchId,
                BranchName = period.BranchName,
                FinancialYearId = period.FinancialYearId,
                FinancialYearName = period.FinancialYearName,
                FinancialYearCode = period.FinancialYearCode,
                PeriodMonth = period.PeriodMonth,
                Message = $"PV numbers for {period.FinancialYearCode}-{period.PeriodMonth:D2} are exhausted (99999)."
            };
        }

        return new PaymentVoucherDefaultsDto
        {
            VoucherNo =
                CodeGenerator.GenerateVoucherNo(
                    VoucherTypes.Payment,
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

    public async Task<PaymentVoucherDto?>
        GetByIdAsync
        (
            long id
        )
    {
        PaymentVoucher? row =
            await _context
                .Set<PaymentVoucher>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.PaymentVoucherId == id
                        &&
                        !x.IsDeleted
                );

        if (row == null)
        {
            return null;
        }

        PaymentVoucherDto dto =
            ToDto(row);

        dto.Debits =
            await _context
                .Set<PaymentVoucherLines>()
                .AsNoTracking()
                .Where(x => x.PaymentVoucherId == id)
                .OrderBy(x => x.LineNo)
                .Select
                (
                    x =>
                        new PaymentVoucherDebitDto
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

        List<PaymentVoucherPayments> payments =
            await _context
                .Set<PaymentVoucherPayments>()
                .AsNoTracking()
                .Where(x => x.PaymentVoucherId == id)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        dto.Credits =
            payments
                .Select
                (
                    x =>
                        new PaymentVoucherCreditDto
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
                            TransactionRef = x.TransactionRef,
                            PayeeName = x.PayeeName,
                            PayeeAccount = x.PayeeAccount,
                            CheckNo = x.CheckNo,
                            CheckDate = x.CheckDate?.ToString(DateFormat, CultureInfo.InvariantCulture) ?? string.Empty,
                            CheckBank = x.CheckBank,
                            CheckStatus = x.CheckStatus,
                            ClearedVoucherNo = x.ClearedVoucherNo
                        }
                )
                .ToList();

        dto.PaymentModes =
            string.Join(
                ", ",
                payments.Select(x => x.Mode).Distinct());

        return dto;
    }


    private static PaymentVoucherDto ToDto
    (
        PaymentVoucher x
    )
    {
        return new PaymentVoucherDto
        {
            PaymentVoucherId = x.PaymentVoucherId,
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
            CompanyCharges = x.CompanyCharges,
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

    private async Task<PvInput>
        NormalizeAsync
        (
            CreatePaymentVoucherDto dto
        )
    {
        PvInput input =
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

        //=======================================================
        // One group : n debits : 1 credit or 1 debit : n credits
        //   Debits  = Pay To rows
        //   Credits = Payment Mode rows
        //=======================================================

        List<PaymentVoucherDebitDto> parties =
            dto.Debits ?? new List<PaymentVoucherDebitDto>();

        List<PaymentVoucherCreditDto> money =
            dto.Credits ?? new List<PaymentVoucherCreditDto>();

        if (parties.Count == 0)
        {
            throw new InvalidOperationException(
                "Add at least one Pay To (debit) row.");
        }

        if (money.Count == 0)
        {
            throw new InvalidOperationException(
                "Add at least one Payment Mode (credit) row.");
        }

        // One payment mode per voucher, unless the switch
        // "Multi Mode Payment Voucher" is ON
        if (money
                .Select(x => (x.Mode ?? string.Empty).Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Count() > 1
            && !await IsSwitchOnAsync(MultiModeSwitch, false))
        {
            throw new InvalidOperationException(
                "One payment mode per voucher : every Payment Mode row must use the same mode.");
        }

        // Setting "Payment Voucher : Max Lines"
        int maxLines =
            await SwitchNumberAsync(MaxLinesSwitch);

        if (maxLines > 0 && parties.Count + money.Count > maxLines)
        {
            throw new InvalidOperationException(
                $"Maximum {maxLines} lines per voucher; this voucher has {parties.Count + money.Count}.");
        }

        if (parties.Count > 1 && money.Count > 1)
        {
            throw new InvalidOperationException(
                "One group per voucher : several debits need a single credit, or a single debit can have several credits.");
        }

        //=======================================================
        // Ledger type of the pay-to side (one per voucher)
        //=======================================================

        List<string> types =
            parties
                .Select(x => (x.LedgerType ?? string.Empty).Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

        if (types.Count != 1)
        {
            throw new InvalidOperationException(
                "Every Pay To row must have the same Ledger Type.");
        }

        input.LedgerType =
            PayToLedgerTypes.FirstOrDefault
            (
                x =>
                    string.Equals(x, types[0], StringComparison.OrdinalIgnoreCase)
            )
            ??
            throw new InvalidOperationException(
                "Ledger Type must be Supplier, Customer or General Ledger.");

        //=======================================================
        // Ledgers used by both sides
        //=======================================================

        List<string> partyCodes =
            parties
                .Select(x => (x.LedgerCode ?? string.Empty).Trim())
                .Where(x => x.Length > 0)
                .ToList();

        Dictionary<string, VoucherLedgerDto> ledgers =
            await _ledgerRepository.GetByCodesAsync(
                partyCodes.Concat(
                    money.Select(x => x.LedgerCode ?? string.Empty)));

        //=======================================================
        // Party ledgers (customers / suppliers) of the pay-to rows
        //=======================================================

        // Codes as sent + upper case (ledger codes are stored
        // upper case; no function on the column keeps the index)
        List<string> upperCodes =
            partyCodes
                .Concat(partyCodes.Select(x => x.ToUpperInvariant()))
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
        // Debits (Pay To)
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

        foreach (PaymentVoucherDebitDto party in parties)
        {
            lineNo++;

            string code =
                (party.LedgerCode ?? string.Empty).Trim();

            string key =
                code.ToUpperInvariant();

            if (!ledgers.TryGetValue(code, out VoucherLedgerDto? ledger))
            {
                throw new InvalidOperationException(
                    $"Debit {lineNo} : ledger '{code}' was not found.");
            }

            if (!ledger.IsActive)
            {
                throw new InvalidOperationException(
                    $"Debit {lineNo} : ledger '{ledger.LedgerCode} - {ledger.LedgerName}' is inactive.");
            }

            if (ledger.IsMoneyLedger)
            {
                throw new InvalidOperationException(
                    $"Debit {lineNo} : a cash / bank / MFS / POS / EMI ledger cannot be paid here. Use Fund Transfer.");
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
                            $"Debit {lineNo} : '{ledger.LedgerName}' is not a customer ledger.");
                    }

                    partyCode = customer.Code;

                    ledgerName = customer.Name;

                    break;

                case "Supplier":

                    if (!supplierByLedger.TryGetValue(key, out var supplier))
                    {
                        throw new InvalidOperationException(
                            $"Debit {lineNo} : '{ledger.LedgerName}' is not a supplier ledger.");
                    }

                    partyCode = supplier.Code;

                    ledgerName = supplier.Name;

                    break;

                default:

                    if (customerByLedger.ContainsKey(key) || supplierByLedger.ContainsKey(key))
                    {
                        throw new InvalidOperationException(
                            $"Debit {lineNo} : '{ledger.LedgerName}' belongs to a customer / supplier. Choose that Ledger Type.");
                    }

                    if (autoLedgerCodes.Contains(ledger.LedgerCode.Trim()))
                    {
                        throw new InvalidOperationException(
                            $"Debit {lineNo} : '{ledger.LedgerName}' is an auto-generated ledger and is posted only by its own module.");
                    }

                    break;
            }

            if (!(party.Amount > 0) || !IsMoney(party.Amount))
            {
                throw new InvalidOperationException(
                    $"Debit {lineNo} : amount must be more than 0 with at most 2 decimals.");
            }

            input.Lines.Add(
                new PaymentVoucherLines
                {
                    LineNo = lineNo,
                    LedgerType = input.LedgerType,
                    SubGroupCode = Limit(ledger.SubGroupCode, 40),
                    SubGroupName = Limit(ledger.SubGroupName, 200),
                    LedgerCode = ledger.LedgerCode,
                    LedgerName = Limit(ledgerName, 250),
                    PartyCode = Limit(partyCode, 40),
                    Amount = party.Amount,
                    ShortNotes = Limit(party.ShortNotes, 250)
                });
        }

        //=======================================================
        // Credits (Payment Mode)
        //=======================================================

        string branchKey =
            input.Period.BranchName.Trim().ToUpperInvariant();

        // Check rows : "drawn on" = the bank (and its branch) of
        // our bank account, not the account name
        Dictionary<long, string> checkBanks =
            await CheckBanksAsync(money, ledgers);

        int creditNo = 0;

        foreach (PaymentVoucherCreditDto pay in money)
        {
            creditNo++;

            string mode =
                ModeLedgerTypes.Keys.FirstOrDefault
                (
                    x =>
                        string.Equals(
                            x,
                            (pay.Mode ?? string.Empty).Trim(),
                            StringComparison.OrdinalIgnoreCase)
                )
                ??
                throw new InvalidOperationException(
                    $"Credit {creditNo} : unknown payment mode '{pay.Mode}'.");

            string ledgerType =
                ModeLedgerTypes[mode];

            string code =
                (pay.LedgerCode ?? string.Empty).Trim();

            if (!ledgers.TryGetValue(code, out VoucherLedgerDto? account))
            {
                throw new InvalidOperationException(
                    $"Credit {creditNo} : account '{code}' was not found.");
            }

            if (!string.Equals(account.LedgerType, ledgerType, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    $"Credit {creditNo} : '{account.LedgerName}' is not a {ledgerType} account.");
            }

            if (!account.IsActive || !account.PaymentAccount)
            {
                throw new InvalidOperationException(
                    $"Credit {creditNo} : '{account.LedgerName}' is inactive or not a payment account.");
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
                    $"Credit {creditNo} : '{account.LedgerName}' belongs to another branch.");
            }

            if (!(pay.Amount > 0) || !IsMoney(pay.Amount))
            {
                throw new InvalidOperationException(
                    $"Credit {creditNo} : amount must be more than 0 with at most 2 decimals.");
            }

            PaymentVoucherPayments row =
                new()
                {
                    LineNo = creditNo,
                    Mode = mode,
                    LedgerType = account.LedgerType,
                    SubGroupCode = Limit(account.SubGroupCode, 40),
                    SubGroupName = Limit(account.SubGroupName, 200),
                    LedgerCode = account.LedgerCode,
                    LedgerName = Limit(account.LedgerName, 250),
                    AccountId = account.AccountId,
                    Amount = pay.Amount,
                    ShortNotes = Limit(pay.ShortNotes, 250),
                    ChargeBorneBy = string.Empty,
                    TransactionRef = string.Empty,
                    PayeeName = string.Empty,
                    PayeeAccount = string.Empty,
                    CheckNo = string.Empty,
                    CheckBank = string.Empty,
                    CheckStatus = string.Empty,
                    ClearedVoucherNo = string.Empty
                };

            //===================================================
            // Step 2 details
            //===================================================

            string label =
                $"Credit {creditNo} ({mode})";

            switch (mode)
            {
                case "Bank":

                    // Bank transfer : optional bank reference
                    row.TransactionRef = Limit(pay.TransactionRef, 100);

                    break;

                case "Check":

                    row.CheckNo = Limit(pay.CheckNo, 50);

                    if (row.CheckNo.Length == 0)
                    {
                        throw new InvalidOperationException(
                            $"{label} : Check No is required.");
                    }

                    row.CheckDate =
                        ParseDate(pay.CheckDate, $"{label} : Check Date");

                    // Drawn on our own bank : bank name (+ branch);
                    // the account name when the bank is not set
                    row.CheckBank =
                        Limit(
                            checkBanks.TryGetValue(account.AccountId, out string? bank)
                                ? bank
                                : account.LedgerName,
                            200);

                    row.PayeeName = Limit(pay.PayeeName, 200);

                    break;

                case "MFS":

                    row.TransactionRef = Limit(pay.TransactionRef, 100);

                    if (row.TransactionRef.Length == 0)
                    {
                        throw new InvalidOperationException(
                            $"{label} : Transaction ID is required.");
                    }

                    row.PayeeAccount = Limit(pay.PayeeAccount, 100);

                    ApplyCharge(row, pay, label);

                    break;
            }

            input.Payments.Add(row);
        }

        //=======================================================
        // Balance : debits = credits
        //=======================================================

        decimal totalDebit =
            input.Lines.Sum(x => x.Amount);

        decimal totalCredit =
            input.Payments.Sum(x => x.Amount);

        if (totalDebit != totalCredit)
        {
            throw new InvalidOperationException(
                $"Debit ({totalDebit:N2}) and credit ({totalCredit:N2}) must be equal.");
        }

        input.TotalAmount =
            totalDebit;

        input.CompanyCharges =
            input.Payments
                .Where(x => x.ChargeBorneBy == "Company")
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
    // Bank of the Check rows (BankAccounts : Bank, Bank Branch)
    //   AccountId of a Bank ledger = BankAccountId
    //===========================================================

    private async Task<Dictionary<long, string>>
        CheckBanksAsync
        (
            List<PaymentVoucherCreditDto> money,
            Dictionary<string, VoucherLedgerDto> ledgers
        )
    {
        List<long> ids =
            money
                .Where(x => string.Equals((x.Mode ?? string.Empty).Trim(), CheckMode, StringComparison.OrdinalIgnoreCase))
                .Select(x => ledgers.TryGetValue((x.LedgerCode ?? string.Empty).Trim(), out VoucherLedgerDto? ledger) ? ledger : null)
                .Where(x => x != null && string.Equals(x.LedgerType, "Bank", StringComparison.OrdinalIgnoreCase))
                .Select(x => x!.AccountId)
                .Distinct()
                .ToList();

        if (ids.Count == 0)
        {
            return new Dictionary<long, string>();
        }

        var banks =
            await _context
                .Set<BankAccountsEntity>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.BankAccountId))
                .Select(x => new { x.BankAccountId, x.Bank, x.BankBranchName })
                .ToListAsync();

        return banks
            .Where(x => !string.IsNullOrWhiteSpace(x.Bank))
            .ToDictionary
            (
                x => x.BankAccountId,
                x => string.IsNullOrWhiteSpace(x.BankBranchName)
                    ? x.Bank.Trim()
                    : $"{x.Bank.Trim()}, {x.BankBranchName.Trim()}"
            );
    }


    //===========================================================
    // Charge (MFS)
    //===========================================================

    private static void ApplyCharge
    (
        PaymentVoucherPayments row,
        PaymentVoucherCreditDto pay,
        string label
    )
    {
        decimal percent =
            pay.ChargePercent;

        decimal amount =
            pay.ChargeAmount;

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

        // Charge amount and % must agree (the page keeps them in
        // step; % is rounded to 2 decimals, so allow that much)
        decimal expected =
            row.Amount * percent / 100m;

        decimal tolerance =
            0.01m + row.Amount * 0.00005m;

        if (Math.Abs(amount - expected) > tolerance)
        {
            throw new InvalidOperationException(
                $"{label} : charge amount {amount:N2} does not match {percent:0.##}% of {row.Amount:N2}.");
        }

        row.ChargePercent = decimal.Round(percent, 2);

        row.ChargeAmount = amount;

        // Company : posted on top (Dr MFS Charges, Cr the account);
        // Payee : taken out of the transfer, nothing more to post
        row.ChargeBorneBy =
            amount > 0
                ? (string.Equals(pay.ChargeBorneBy, "Payee", StringComparison.OrdinalIgnoreCase)
                    ? "Payee"
                    : "Company")
                : string.Empty;
    }


    //===========================================================
    // Apply header values
    //===========================================================

    private static void ApplyHeader
    (
        PaymentVoucher entity,
        PvInput input
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
        entity.CompanyCharges = input.CompanyCharges;
    }

    private async Task ReplaceDetailsAsync
    (
        long voucherId,
        PvInput input
    )
    {
        List<PaymentVoucherLines> oldLines =
            await _context
                .Set<PaymentVoucherLines>()
                .Where(x => x.PaymentVoucherId == voucherId)
                .ToListAsync();

        List<PaymentVoucherPayments> oldPayments =
            await _context
                .Set<PaymentVoucherPayments>()
                .Where(x => x.PaymentVoucherId == voucherId)
                .ToListAsync();

        _context.Set<PaymentVoucherLines>().RemoveRange(oldLines);

        _context.Set<PaymentVoucherPayments>().RemoveRange(oldPayments);

        foreach (PaymentVoucherLines line in input.Lines)
        {
            line.PaymentVoucherId = voucherId;
        }

        foreach (PaymentVoucherPayments payment in input.Payments)
        {
            payment.PaymentVoucherId = voucherId;
        }

        _context.Set<PaymentVoucherLines>().AddRange(input.Lines);

        _context.Set<PaymentVoucherPayments>().AddRange(input.Payments);
    }


    //===========================================================
    // History
    //===========================================================

    private void AddHistory
    (
        PaymentVoucher entity,
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
                EntityId = entity.PaymentVoucherId,
                ActivityType = activityType,
                ActivityTitle = $"Payment Voucher {verb}",
                ActivityDescription =
                    $"Payment Voucher {entity.VoucherNo} ({entity.PartyName}, {entity.TotalAmount:N2}) {verb.ToLowerInvariant()}.{(string.IsNullOrWhiteSpace(extra) ? string.Empty : " " + extra)}",
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

    private async Task<PaymentVoucher>
        LoadAsync
        (
            long id
        )
    {
        await _context.Database.ExecuteSqlInterpolatedAsync(
            $@"SELECT 1 FROM ""PaymentVoucher"" WHERE ""PaymentVoucherId"" = {id} FOR UPDATE");

        PaymentVoucher? entity =
            await _context
                .Set<PaymentVoucher>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.PaymentVoucherId == id
                        &&
                        !x.IsDeleted
                );

        return entity
            ??
            throw new KeyNotFoundException(
                "Payment Voucher not found.");
    }

    private static void RequireStatus
    (
        PaymentVoucher entity,
        string status,
        string action
    )
    {
        if (!string.Equals(entity.Status, status, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                $"Payment Voucher {entity.VoucherNo} is {entity.Status}; only a {status} voucher can be {action}.");
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

    public async Task<PaymentVoucherSavedDto>
        CreateAsync
        (
            CreatePaymentVoucherDto dto,
            long userId
        )
    {
        PvInput input =
            await NormalizeAsync(dto);

        await EnsureDateAllowedAsync(
            input.VoucherDate,
            null);

        PaymentVoucher entity =
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
                        VoucherTypes.Payment,
                        input.Period.BranchId,
                        input.VoucherDate);

                entity.VoucherNo =
                    number.VoucherNo;

                _context.Set<PaymentVoucher>().Add(entity);

                await _context.SaveChangesAsync();

                await ReplaceDetailsAsync(
                    entity.PaymentVoucherId,
                    input);

                AddHistory(entity, "Create", "Created", userId, entity.CreatedDate);

                await _context.SaveChangesAsync();
            });

        return new PaymentVoucherSavedDto
        {
            PaymentVoucherId = entity.PaymentVoucherId,
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
            UpdatePaymentVoucherDto dto,
            long userId
        )
    {
        PvInput input =
            await NormalizeAsync(dto);

        await InTransactionAsync(
            async () =>
            {
                PaymentVoucher entity =
                    await LoadAsync(dto.PaymentVoucherId);

                RequireStatus(entity, VoucherStatuses.Draft, "edited");

                // An older draft keeps its saved date
                await EnsureDateAllowedAsync(
                    input.VoucherDate,
                    entity.VoucherDate);

                string expectedStart =
                    $"{VoucherTypes.Payment}-{input.Period.BranchDigits}-{input.Period.FinancialYearCode}-{input.Period.PeriodMonth:D2}-";

                if (!entity.VoucherNo.StartsWith(expectedStart, StringComparison.Ordinal))
                {
                    VoucherNumberDto number =
                        await _numberService.NextAsync(
                            VoucherTypes.Payment,
                            input.Period.BranchId,
                            input.VoucherDate);

                    entity.VoucherNo =
                        number.VoucherNo;
                }

                ApplyHeader(entity, input);

                entity.ModifiedBy = userId;

                entity.ModifiedDate = DateTime.UtcNow;

                await ReplaceDetailsAsync(
                    entity.PaymentVoucherId,
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
                PaymentVoucher entity =
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
        PaymentVoucher? entity =
            await _context
                .Set<PaymentVoucher>()
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
                PaymentVoucher entity =
                    await LoadAsync(id);

                RequireStatus(entity, VoucherStatuses.Draft, "approved");

                DateTime now =
                    DateTime.UtcNow;

                entity.Status = VoucherStatuses.Approved;

                entity.ApprovedBy = userId;

                entity.ApprovedDate = now;

                AddHistory(entity, "Approve", "Approved", userId, now);

                // Post in the same transaction (all or nothing) when
                //   - switch "Post Payment Voucher On Approval" is ON, or
                //   - every payment line is a check : posting would
                //     write nothing (the check part posts at Check
                //     Reconciliation), so the voucher goes straight to
                //     Posted and its checks to reconciliation
                if (await IsCheckOnlyAsync(entity.PaymentVoucherId)
                    || await IsSwitchOnAsync(PostOnApprovalSwitch, false))
                {
                    await PostCoreAsync(entity, userId);
                }

                await _context.SaveChangesAsync();
            });
    }


    // Every payment line is a check (none = false)
    private async Task<bool>
        IsCheckOnlyAsync
        (
            long id
        )
    {
        List<string> modes =
            await _context
                .Set<PaymentVoucherPayments>()
                .AsNoTracking()
                .Where(x => x.PaymentVoucherId == id)
                .Select(x => x.Mode)
                .ToListAsync();

        return modes.Count > 0
            && modes.All(mode => string.Equals((mode ?? string.Empty).Trim(), CheckMode, StringComparison.OrdinalIgnoreCase));
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
                PaymentVoucher entity =
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
                PaymentVoucher entity =
                    await LoadAsync(id);

                RequireStatus(entity, VoucherStatuses.Approved, "posted");

                await PostCoreAsync(entity, userId);

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Post core (Approved → Posted; the caller saves and holds
    // the transaction). Used by Post and by Approve when the
    // switch "Post Payment Voucher On Approval" is ON.
    //===========================================================

    private async Task
        PostCoreAsync
        (
            PaymentVoucher entity,
            long userId
        )
    {
        long id =
            entity.PaymentVoucherId;

        List<PaymentVoucherLines> lines =
            await _context
                .Set<PaymentVoucherLines>()
                .AsNoTracking()
                .Where(x => x.PaymentVoucherId == id)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        List<PaymentVoucherPayments> payments =
            await _context
                .Set<PaymentVoucherPayments>()
                .Where(x => x.PaymentVoucherId == id)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        List<VoucherPostingLine> posting =
            BuildPostingLines(entity, lines, payments);

        // All-check payment : nothing to post until the
        // checks clear (RRP)
        if (posting.Count > 0)
        {
            await _postingService.PostAsync(
                new VoucherPostingRequest
                {
                    VoucherType = VoucherTypes.Payment,
                    VoucherId = entity.PaymentVoucherId,
                    VoucherNo = entity.VoucherNo,
                    VoucherDate = entity.VoucherDate,
                    BranchId = entity.BranchId,
                    // Each pay-to line carries its own party; money and
                    // charge lines have none (keeps party statements
                    // clean)
                    PartyType = string.Empty,
                    PartyCode = string.Empty,
                    ReferenceNo = string.Empty,
                    Narration = string.IsNullOrWhiteSpace(entity.Narration)
                        ? $"Paid to {entity.PartyName}"
                        : entity.Narration,
                    Lines = posting
                },
                userId);
        }

        foreach (PaymentVoucherPayments check in payments.Where(x => x.Mode == CheckMode))
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
    // Back Dated / Post Dated Entry (settings 0039 / 0040)
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
    // Build posting lines
    //
    // Dr the pay-to rows in order, up to the non-check total
    //    (the check part is debited later by the RRP)
    // Dr MFS Charges expense (charges the company bears)
    // Cr each non-check payment row : amount (+ the charge when
    //    the company bears it)
    //===========================================================

    private static List<VoucherPostingLine> BuildPostingLines
    (
        PaymentVoucher entity,
        List<PaymentVoucherLines> lines,
        List<PaymentVoucherPayments> payments
    )
    {
        List<VoucherPostingLine> result =
            new();

        List<PaymentVoucherPayments> paid =
            payments
                .Where(x => x.Mode != CheckMode)
                .ToList();

        //=======================================================
        // Debits : the pay-to rows, up to what is paid now
        //=======================================================

        decimal remaining =
            paid.Sum(x => x.Amount);

        foreach (PaymentVoucherLines line in lines)
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
                    Debit = take,
                    Credit = 0,
                    Narration = string.IsNullOrWhiteSpace(line.ShortNotes)
                        ? $"Paid to {line.LedgerName}"
                        : line.ShortNotes,

                    // Each supplier / customer keeps its own code
                    PartyType = string.IsNullOrWhiteSpace(line.PartyCode)
                        ? string.Empty
                        : line.LedgerType,

                    PartyCode = line.PartyCode
                });

            remaining -= take;
        }

        //=======================================================
        // Debits : charge expense (company bears)
        //=======================================================

        foreach (IGrouping<string, PaymentVoucherPayments> group in paid
                     .Where(x => x.ChargeBorneBy == "Company" && x.ChargeAmount > 0)
                     .GroupBy(x => x.Mode))
        {
            string ledger =
                group.Key switch
                {
                    "MFS" => MfsChargeLedger,
                    _ => throw new InvalidOperationException(
                        $"No charge expense ledger for {group.Key}.")
                };

            result.Add(
                new VoucherPostingLine
                {
                    GroupNo = 1,
                    LedgerCode = ledger,
                    Debit = group.Sum(x => x.ChargeAmount),
                    Credit = 0,
                    Narration = $"{group.Key} charges on payment to {entity.PartyName}"
                });
        }

        //=======================================================
        // Credits : money accounts
        //=======================================================

        foreach (PaymentVoucherPayments payment in paid)
        {
            decimal companyCharge =
                payment.ChargeBorneBy == "Company"
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
                    Debit = 0,
                    Credit = payment.Amount + companyCharge,
                    Narration = string.IsNullOrWhiteSpace(payment.ShortNotes)
                        ? $"{payment.Mode} paid to {entity.PartyName}{reference}"
                        : payment.ShortNotes
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
            CancelPaymentVoucherDto dto,
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
                PaymentVoucher entity =
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

                List<PaymentVoucherPayments> payments =
                    await _context
                        .Set<PaymentVoucherPayments>()
                        .Where(x => x.PaymentVoucherId == id)
                        .ToListAsync();

                if (payments.Any(x => x.Mode == CheckMode && x.CheckStatus == "Cleared"))
                {
                    throw new InvalidOperationException(
                        $"Payment Voucher {entity.VoucherNo} has a cleared check. Reverse the check clearing first.");
                }

                if (await _postingService.IsPostedAsync(entity.VoucherNo))
                {
                    await _postingService.ReverseAsync(
                        entity.VoucherNo,
                        cancelDate,
                        reason,
                        userId);
                }

                foreach (PaymentVoucherPayments check in payments.Where(x => x.Mode == CheckMode))
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
            .Set<PaymentVoucher>()
            .AnyAsync
            (
                x =>
                    x.PaymentVoucherId == id
                    &&
                    !x.IsDeleted
            );
    }
}