//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.AccountsFinance.AccountsReconciliation;
using AppCore.Application.Platform.Accounting;

using AppCore.Domain.Common;
using AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation;
using AppCore.Domain.Entities.AccountsFinance.VoucherManagement;
using AppCore.Domain.Platform.Accounting;

using AppCore.Infrastructure.Persistence;

using BankAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.BankAccounts;

using MfsAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.MFSAccounts;

using SystemConfigurationsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.AccountsFinance.AccountsReconciliation;


//===============================================================
// MFS Reconciliations Repository
//
// Source : Receipt Voucher payment rows, Mode MFS, of POSTED
// vouchers. The RV posted Dr wallet (amount + the charge the
// customer paid) / Cr recovery / Cr the party lines.
//
// Merchant wallet (a transit ledger)
//   Pending → Settle (RRV, printed as Receipt Voucher)
//               Dr linked Bank        net   = gross - fee
//               Dr MFS Charges        fee   (wallet's MFS
//                                            Charges % of gross)
//               Cr MFS wallet         gross
//           → or Reject (RRV, printed as Journal Voucher)
// Personal wallet : Direct (the money landed at once); only
//   Reject (a wrong entry)
//               Dr customer (the RV party lines of this
//                  transaction)       amount
//               Dr MFS Charges Recovery  charge the customer paid
//               Cr MFS wallet         gross
//
// Undo Settle reverses the WHOLE RRV (every transaction in it
// goes back to Pending); Undo Reject reverses its RRV (back to
// Pending / Direct).
//
// One voucher per wallet + branch per save; one journal group
// per transaction. The linked bank is the wallet's
// LinkedBankAccount = BankAccountCode (= its ledger code).
//
// Auto Settlement (switch 0051, nightly) : Pending merchant
// transactions due by the run date (receipt date + Value working
// days, Friday and Saturday skipped) : one RRV per wallet +
// branch, dated the run date, fee from the %, posted as
// "System (Auto Settlement)".
//===============================================================

public class MfsReconciliationsRepository : IMfsReconciliationsRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string ModuleName =
        "Accounts Finance";

    private const string EntityName =
        "MfsReconciliations";

    private const string DateFormat =
        "yyyy-MM-dd";

    private const string MfsMode =
        "MFS";

    private const string CheckMode =
        "Check";

    private const string SourceType =
        "RV";

    // Wallet types (MFS Accounts › Account Type)
    private const string Merchant = "Merchant";

    private const string Personal = "Personal";

    // Statuses
    private const string Pending = "Pending";

    private const string Direct = "Direct";

    private const string Settled = "Settled";

    private const string Rejected = "Rejected";

    // Voucher purpose / status
    private const string SettlementPurpose = "Settlement";

    private const string RejectPurpose = "Reject";

    private const string Reversed = "Reversed";

    // Run log outcomes
    private const string RunSettled = "Settled";

    private const string RunSkipped = "Skipped";

    private const string RunFailed = "Failed";

    private const string RunCompleted = "Completed";

    // Settings › System Configuration (read by code)
    //   0051 Auto Settlement : nightly settlement; Value = working
    //        days after the receipt date (0 = same day; empty = 1)
    private const string AutoSettlementSwitch =
        "CFG-MOD-004-0051";

    //   0052 Edit Charges : the fee may be changed per transaction
    private const string EditChargesSwitch =
        "CFG-MOD-004-0052";

    // Ledgers (looked up by CODE)
    //   MFS Charges (expense)
    private const string MfsChargesLedger =
        "GLR-004-001-001-00003";

    //   MFS Charges Recovery (income; the RV credited it)
    private const string MfsRecoveryLedger =
        "GLR-011-001-001-00001";

    // The nightly job posts as
    private const long SystemUserId = 1;

    private const string SystemUserName =
        "System (Auto Settlement)";

    // Catch-up never goes further back than this
    private const int MaxCatchUpDays = 31;


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

    public MfsReconciliationsRepository(
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
    // Working types
    //===========================================================

    // A party line's share of one transaction
    private sealed class PartySlice
    {
        public string LedgerType { get; set; } = string.Empty;

        public string LedgerCode { get; set; } = string.Empty;

        public string LedgerName { get; set; } = string.Empty;

        public string SubGroupName { get; set; } = string.Empty;

        public string PartyCode { get; set; } = string.Empty;

        public decimal Amount { get; set; }
    }

    // An MFS transaction with its (locked) Receipt Voucher
    private sealed class SourceLine
    {
        public long VoucherId { get; set; }

        public string VoucherNo { get; set; } = string.Empty;

        public DateOnly VoucherDate { get; set; }

        public string VoucherStatus { get; set; } = string.Empty;

        public long BranchId { get; set; }

        public string BranchName { get; set; } = string.Empty;

        public string PartyName { get; set; } = string.Empty;

        public long PaymentId { get; set; }

        public string WalletCode { get; set; } = string.Empty;

        public string WalletName { get; set; } = string.Empty;

        public string TransactionRef { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public decimal CustomerCharge { get; set; }

        public decimal Gross => Amount + CustomerCharge;

        public List<PartySlice> Parties { get; set; } = new();

        // Why the party lines could not be split ('' = fine);
        // only a Reject needs them
        public string PartiesError { get; set; } = string.Empty;
    }

    // One transaction in a settlement / reject
    private sealed class WorkItem
    {
        public SourceLine Source { get; set; } = new();

        public MfsReconciliations State { get; set; } = new();

        public decimal Fee { get; set; }

        // The system charge; Fee differs = edited (FeeReason required)
        public decimal StandardFee { get; set; }

        public string FeeReason { get; set; } = string.Empty;

        public string Notes { get; set; } = string.Empty;
    }


    //===========================================================
    // Get All (every MFS line of a posted Receipt Voucher)
    //===========================================================

    public async Task<List<MfsReconciliationDto>>
        GetAllAsync()
    {
        var rows =
            await (
                from p in _context.Set<ReceiptVoucherPayments>().AsNoTracking()
                join v in _context.Set<ReceiptVoucher>().AsNoTracking()
                    on p.ReceiptVoucherId equals v.ReceiptVoucherId
                where p.Mode == MfsMode
                      && v.Status == VoucherStatuses.Posted
                      && !v.IsDeleted
                select new
                {
                    PaymentId = p.ReceiptVoucherPaymentId,
                    VoucherId = v.ReceiptVoucherId,
                    v.VoucherNo,
                    v.VoucherDate,
                    v.BranchId,
                    v.BranchName,
                    v.PartyName,
                    p.LedgerCode,
                    p.LedgerName,
                    p.TransactionRef,
                    p.Amount,
                    p.ChargeAmount,
                    p.ChargeBorneBy,
                    p.ShortNotes
                })
            .ToListAsync();

        Dictionary<long, MfsReconciliations> states =
            await _context
                .Set<MfsReconciliations>()
                .AsNoTracking()
                .Where(x => x.SourceVoucherType == SourceType)
                .ToDictionaryAsync(x => x.SourcePaymentId);

        Dictionary<string, MfsAccountsEntity> wallets =
            await WalletsByCodeAsync();

        Dictionary<string, string> bankCodes =
            await BankCodesAsync(wallets.Values.Select(x => x.LinkedBankAccount));

        bool autoOn =
            await IsSwitchOnAsync(AutoSettlementSwitch, false);

        int autoDays =
            await AutoDaysAsync();

        List<MfsReconciliationDto> result =
            new();

        foreach (var x in rows)
        {
            MfsReconciliations? state =
                states.GetValueOrDefault(x.PaymentId);

            MfsAccountsEntity? wallet =
                wallets.GetValueOrDefault(x.LedgerCode ?? string.Empty);

            string walletType =
                state?.WalletType
                ?? WalletTypeOf(wallet);

            decimal customerCharge =
                IsCustomerCharge(x.ChargeBorneBy)
                    ? x.ChargeAmount
                    : 0;

            decimal gross =
                x.Amount + customerCharge;

            string status =
                state?.Status
                ?? (walletType == Merchant ? Pending : Direct);

            MfsReconciliationDto dto =
                new()
                {
                    PaymentId = x.PaymentId,
                    MfsReconciliationId = state?.MfsReconciliationId ?? 0,
                    SourceVoucherType = SourceType,
                    SourceVoucherId = x.VoucherId,
                    SourceVoucherNo = x.VoucherNo,
                    ReceiptDate = Text(x.VoucherDate),
                    BranchId = x.BranchId,
                    BranchName = x.BranchName,
                    PartyName = x.PartyName,
                    WalletCode = x.LedgerCode ?? string.Empty,
                    WalletName = x.LedgerName ?? string.Empty,
                    WalletType = walletType,
                    TransactionRef = x.TransactionRef ?? string.Empty,
                    Amount = x.Amount,
                    CustomerCharge = customerCharge,
                    ChargeBorneBy = x.ChargeBorneBy ?? string.Empty,
                    GrossAmount = gross,
                    Status = status,
                    IsAuto = state?.IsAuto ?? false,
                    SkipAuto = state?.SkipAuto ?? false,
                    ShortNotes = state?.ShortNotes ?? string.Empty
                };

            if (status == Settled && state != null)
            {
                dto.FeePercent = state.FeePercent;
                dto.Fee = state.Fee;
                dto.StandardFee = state.StandardFee;
                dto.FeeEdited = state.FeeEdited;
                dto.FeeReason = state.FeeReason;
                dto.NetAmount = state.NetAmount;
                dto.BankLedgerCode = state.BankLedgerCode;
                dto.BankLedgerName = state.BankLedgerName;
                dto.SettledDate = Text(state.SettledDate);
                dto.SettlementVoucherId = state.SettlementVoucherId;
                dto.SettlementVoucherNo = state.SettlementVoucherNo;
            }
            else if (status == Pending)
            {
                // What a settlement would take now
                decimal percent =
                    wallet?.MFSCharges ?? 0;

                dto.FeePercent = percent;
                dto.Fee = FeeOf(gross, percent);
                dto.StandardFee = dto.Fee;
                dto.NetAmount = gross - dto.Fee;
                dto.BankLedgerCode =
                    bankCodes.GetValueOrDefault((wallet?.LinkedBankAccount ?? string.Empty).Trim())
                    ?? string.Empty;

                if (autoOn && !dto.SkipAuto)
                {
                    dto.DueDate = Text(DueDate(x.VoucherDate, autoDays));
                }
            }

            if (status == Rejected && state != null)
            {
                dto.RejectDate = Text(state.RejectDate);
                dto.RejectReason = state.RejectReason;
                dto.RejectVoucherId = state.RejectVoucherId;
                dto.RejectVoucherNo = state.RejectVoucherNo;
            }

            result.Add(dto);
        }

        // Oldest receipt first (the queue to work through)
        return result
            .OrderBy(x => x.ReceiptDate)
            .ThenBy(x => x.SourceVoucherNo)
            .ThenBy(x => x.PaymentId)
            .ToList();
    }


    //===========================================================
    // History of one transaction
    //===========================================================

    public async Task<List<MfsReconciliationHistoryDto>>
        GetHistoryAsync
        (
            long paymentId
        )
    {
        long? stateId =
            await _context
                .Set<MfsReconciliations>()
                .AsNoTracking()
                .Where(x => x.SourceVoucherType == SourceType && x.SourcePaymentId == paymentId)
                .Select(x => (long?)x.MfsReconciliationId)
                .FirstOrDefaultAsync();

        if (stateId == null)
        {
            return new List<MfsReconciliationHistoryDto>();
        }

        List<MfsReconciliationHistory> rows =
            await _context
                .Set<MfsReconciliationHistory>()
                .AsNoTracking()
                .Where(x => x.MfsReconciliationId == stateId.Value)
                .OrderByDescending(x => x.PerformedDate)
                .ThenByDescending(x => x.MfsReconciliationHistoryId)
                .ToListAsync();

        return rows
            .Select(
                x =>
                    new MfsReconciliationHistoryDto
                    {
                        Id = x.MfsReconciliationHistoryId,
                        Action = x.Action,
                        ActionDate = Text(x.ActionDate),
                        Status = x.Status,
                        LedgerName = x.LedgerName,
                        VoucherNo = x.VoucherNo,
                        Fee = x.Fee,
                        StandardFee = x.StandardFee,
                        FeeEdited = x.FeeEdited,
                        FeeReason = x.FeeReason,
                        Reason = x.Reason,
                        IsAuto = x.IsAuto,
                        PerformedBy = x.PerformedBy,
                        PerformedDate = x.PerformedDate
                    })
            .ToList();
    }


    //===========================================================
    // MFS Settlement Center : next RRV preview (nothing reserved)
    //===========================================================

    public async Task<MfsCenterDefaultsDto>
        GetDefaultsAsync
        (
            long branchId,
            DateOnly date
        )
    {
        VoucherPeriodDto period;

        try
        {
            period =
                await _numberService.ResolvePeriodAsync(branchId, date);
        }
        catch (InvalidOperationException ex)
        {
            return new MfsCenterDefaultsDto
            {
                BranchId = branchId,
                Message = ex.Message
            };
        }

        MfsCenterDefaultsDto result =
            new()
            {
                BranchId = period.BranchId,
                BranchName = period.BranchName,
                FinancialYearName = period.FinancialYearName
            };

        try
        {
            result.VoucherNo =
                (await _numberService.PeekAsync(VoucherTypes.ReceiptReconciliation, branchId, date)).VoucherNo;
        }
        catch (InvalidOperationException ex)
        {
            result.Message = ex.Message;
        }

        return result;
    }


    //===========================================================
    // Wallets (every MFS account) with the linked bank by CODE
    //===========================================================

    public async Task<List<MfsWalletDto>>
        GetWalletsAsync()
    {
        List<MfsAccountsEntity> wallets =
            await _context
                .Set<MfsAccountsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderBy(x => x.DisplayName)
                .ToListAsync();

        Dictionary<string, string> codes =
            await BankCodesAsync(wallets.Select(x => x.LinkedBankAccount));

        Dictionary<string, VoucherLedgerDto> banks =
            await _ledgerRepository.GetByCodesAsync(
                codes.Values.Distinct());

        List<MfsWalletDto> result =
            new();

        foreach (MfsAccountsEntity wallet in wallets)
        {
            string type =
                WalletTypeOf(wallet);

            string linked =
                (wallet.LinkedBankAccount ?? string.Empty).Trim();

            string bankCode =
                linked.Length > 0
                    ? codes[linked]
                    : string.Empty;

            VoucherLedgerDto? bank =
                bankCode.Length > 0
                    ? banks.GetValueOrDefault(bankCode)
                    : null;

            string problem =
                BankProblem(type, bankCode, bank);

            if (problem.Length == 0 && !wallet.Status)
            {
                problem = "MFS account is inactive.";
            }

            result.Add(
                new MfsWalletDto
                {
                    WalletCode = wallet.MFSAccountCode,
                    WalletName = wallet.DisplayName,
                    AccountType = type,
                    FeePercent = wallet.MFSCharges,
                    Branch = wallet.Branch ?? string.Empty,
                    BranchExclusive = wallet.BranchExclusive,
                    IsActive = wallet.Status,
                    BankLedgerCode = bank?.LedgerCode ?? bankCode,
                    BankLedgerName = bank?.LedgerName ?? string.Empty,
                    BankMessage = problem
                });
        }

        return result;
    }

    // Why a wallet cannot be settled ('' = it can)
    private static string BankProblem
    (
        string walletType,
        string bankCode,
        VoucherLedgerDto? bank
    )
    {
        if (walletType != Merchant)
        {
            return "Personal wallet : nothing to settle.";
        }

        if (bankCode.Length == 0)
        {
            return "No linked bank account (MFS Accounts).";
        }

        if (bank == null)
        {
            return $"Linked bank account {bankCode} was not found.";
        }

        if (!string.Equals(bank.LedgerType, "Bank", StringComparison.OrdinalIgnoreCase))
        {
            return $"Linked account {bankCode} is not a bank account.";
        }

        if (!bank.IsActive)
        {
            return $"Linked bank account {bank.LedgerName} is inactive.";
        }

        return string.Empty;
    }


    //===========================================================
    // Print : settlement / reject voucher
    //===========================================================

    public async Task<MfsReconciliationVoucherDto?>
        GetVoucherAsync
        (
            long id
        )
    {
        MfsReconciliationVouchers? row =
            await _context
                .Set<MfsReconciliationVouchers>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.MfsReconciliationVoucherId == id);

        if (row == null)
        {
            return null;
        }

        List<MfsReconciliationVoucherLines> lines =
            await _context
                .Set<MfsReconciliationVoucherLines>()
                .AsNoTracking()
                .Where(x => x.MfsReconciliationVoucherId == row.MfsReconciliationVoucherId)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        // The transactions this voucher was posted for (from the
        // history, so a reversed voucher still knows them)
        var posted =
            await _context
                .Set<MfsReconciliationHistory>()
                .AsNoTracking()
                .Where(x => x.VoucherNo == row.VoucherNo
                            && (x.Action == "Settle" || x.Action == "Reject"))
                .OrderBy(x => x.MfsReconciliationHistoryId)
                .Select(x => new { x.MfsReconciliationId, x.Fee, x.StandardFee, x.FeeEdited, x.FeeReason })
                .ToListAsync();

        // The last action of each transaction in this voucher
        var lastPosted =
            posted
                .GroupBy(x => x.MfsReconciliationId)
                .ToDictionary(g => g.Key, g => g.Last());

        List<long> stateIds =
            posted.Select(x => x.MfsReconciliationId).Distinct().ToList();

        List<MfsReconciliations> states =
            await _context
                .Set<MfsReconciliations>()
                .AsNoTracking()
                .Where(x => stateIds.Contains(x.MfsReconciliationId))
                .OrderBy(x => x.SourceVoucherNo)
                .ThenBy(x => x.SourcePaymentId)
                .ToListAsync();

        return new MfsReconciliationVoucherDto
        {
            Id = row.MfsReconciliationVoucherId,
            VoucherNo = row.VoucherNo,
            VoucherType = row.VoucherType,
            Purpose = row.Purpose,
            VoucherDate = Text(row.VoucherDate),
            BranchId = row.BranchId,
            BranchName = row.BranchName,
            WalletCode = row.WalletCode,
            WalletName = row.WalletName,
            BankLedgerCode = row.BankLedgerCode,
            BankLedgerName = row.BankLedgerName,
            TransactionCount = row.TransactionCount,
            Amount = row.Amount,
            Charges = row.Charges,
            NetAmount = row.NetAmount,
            Narration = row.Narration,
            IsAuto = row.IsAuto,
            Status = row.Status,
            ReversedDate = Text(row.ReversedDate),
            ReverseReason = row.ReverseReason,
            Sources = states
                .Select(
                    x =>
                        new MfsReconciliationSourceDto
                        {
                            PaymentId = x.SourcePaymentId,
                            TransactionRef = x.TransactionRef,
                            SourceVoucherType = x.SourceVoucherType,
                            SourceVoucherId = x.SourceVoucherId,
                            SourceVoucherNo = x.SourceVoucherNo,
                            ReceiptDate = Text(x.ReceiptDate),
                            PartyName = x.PartyName,
                            GrossAmount = x.GrossAmount,
                            Fee = lastPosted.GetValueOrDefault(x.MfsReconciliationId)?.Fee ?? 0,
                            StandardFee = lastPosted.GetValueOrDefault(x.MfsReconciliationId)?.StandardFee ?? 0,
                            FeeEdited = lastPosted.GetValueOrDefault(x.MfsReconciliationId)?.FeeEdited ?? false,
                            FeeReason = lastPosted.GetValueOrDefault(x.MfsReconciliationId)?.FeeReason ?? string.Empty
                        })
                .ToList(),
            Lines = lines
                .Select(
                    x =>
                        new MfsReconciliationVoucherLineDto
                        {
                            LineNo = x.LineNo,
                            GroupNo = x.GroupNo,
                            TransactionRef = x.TransactionRef,
                            LedgerCode = x.LedgerCode,
                            LedgerName = x.LedgerName,
                            SubGroupName = x.SubGroupName,
                            PartyCode = x.PartyCode,
                            Debit = x.Debit,
                            Credit = x.Credit,
                            Narration = x.Narration,
                            IsCharge = x.IsCharge
                        })
                .ToList()
        };
    }


    //===========================================================
    // Auto Settlement log
    //===========================================================

    public async Task<List<MfsAutoSettlementRunDto>>
        GetAutoRunsAsync
        (
            int days
        )
    {
        DateOnly from =
            BusinessToday().AddDays(-Math.Clamp(days, 1, 366));

        return await _context
            .Set<MfsAutoSettlementRuns>()
            .AsNoTracking()
            .Where(x => x.RunDate >= from)
            .OrderByDescending(x => x.RunDate)
            .ThenByDescending(x => x.MfsAutoSettlementRunId)
            .Select(
                x =>
                    new MfsAutoSettlementRunDto
                    {
                        Id = x.MfsAutoSettlementRunId,
                        RunDate = x.RunDate.ToString(DateFormat, CultureInfo.InvariantCulture),
                        WalletCode = x.WalletCode,
                        WalletName = x.WalletName,
                        BranchId = x.BranchId,
                        Outcome = x.Outcome,
                        VoucherId = x.VoucherId,
                        VoucherNo = x.VoucherNo,
                        TransactionCount = x.TransactionCount,
                        Amount = x.Amount,
                        Message = x.Message,
                        CreatedDate = x.CreatedDate
                    })
            .ToListAsync();
    }


    //===========================================================
    // Settle (merchant Pending → Settled)
    //
    // One wallet per save; one RRV per branch.
    //===========================================================

    public async Task<MfsActionResultDto>
        SettleAsync
        (
            MfsSettleDto dto,
            long userId
        )
    {
        List<MfsSettleItemDto> items =
            (dto?.Items ?? new List<MfsSettleItemDto>())
                .OrderBy(x => x.PaymentId)
                .ToList();

        if (items.Count == 0)
        {
            throw new InvalidOperationException(
                "Select at least one transaction to settle.");
        }

        if (items.Select(x => x.PaymentId).Distinct().Count() != items.Count)
        {
            throw new InvalidOperationException(
                "A transaction is in the list twice.");
        }

        string walletCode =
            (dto!.WalletCode ?? string.Empty).Trim();

        if (walletCode.Length == 0)
        {
            throw new InvalidOperationException(
                "Select the MFS wallet.");
        }

        DateOnly date =
            ParseDate(dto.SettlementDate, "Settlement date");

        // Required on a manual settlement (the nightly job writes
        // its own)
        string userNarration =
            Limit(dto.Narration, 500);

        if (userNarration.Length == 0)
        {
            throw new InvalidOperationException(
                "The detail narration is required.");
        }

        bool editFee =
            await IsSwitchOnAsync(EditChargesSwitch, false);

        MfsActionResultDto result =
            new();

        await InTransactionAsync(
            async () =>
            {
                DateTime now =
                    DateTime.UtcNow;

                MfsAccountsEntity wallet =
                    await LoadWalletAsync(walletCode);

                if (WalletTypeOf(wallet) != Merchant)
                {
                    throw new InvalidOperationException(
                        $"{wallet.DisplayName} is a Personal wallet; its receipts land at once and are not settled.");
                }

                if (!wallet.Status)
                {
                    throw new InvalidOperationException(
                        $"{wallet.DisplayName} is inactive (MFS Accounts).");
                }

                (VoucherLedgerDto walletLedger, VoucherLedgerDto bank, VoucherLedgerDto? charges) =
                    await SettlementLedgersAsync(wallet);

                await LockSourcesAsync(items.Select(x => x.PaymentId));

                List<WorkItem> work =
                    new();

                foreach (MfsSettleItemDto item in items)
                {
                    SourceLine source =
                        await LoadSourceAsync(item.PaymentId);

                    RequireWallet(source, walletCode);

                    MfsReconciliations state =
                        await StateAsync(source, wallet, userId, now);

                    RequireStatus(state, "settled", Pending);

                    await EnsureDateAsync(date, source, $"{TxnLabel(source)} : settlement date");

                    decimal standardFee =
                        FeeOf(source.Gross, wallet.MFSCharges);

                    decimal fee =
                        editFee && item.Fee.HasValue
                            ? item.Fee.Value
                            : standardFee;

                    if (fee < 0 || !IsMoney(fee) || fee > source.Gross)
                    {
                        throw new InvalidOperationException(
                            $"{TxnLabel(source)} : the fee must be 0 to {source.Gross:N2} with at most 2 decimals.");
                    }

                    // Charge audit : a changed charge needs its reason
                    string feeReason =
                        fee == standardFee
                            ? string.Empty
                            : Limit(item.FeeReason, 250);

                    if (fee != standardFee && feeReason.Length == 0)
                    {
                        throw new InvalidOperationException(
                            $"{TxnLabel(source)} : charges changed from {standardFee:N2} to {fee:N2} : the reason is required.");
                    }

                    work.Add(
                        new WorkItem
                        {
                            Source = source,
                            State = state,
                            Fee = fee,
                            StandardFee = standardFee,
                            FeeReason = feeReason,
                            Notes = Limit(item.ShortNotes, 250)
                        });
                }

                if (work.Any(x => x.Fee > 0) && charges == null)
                {
                    throw new InvalidOperationException(
                        $"MFS Charges ledger ({MfsChargesLedger}) was not found.");
                }

                foreach (IGrouping<long, WorkItem> batch in work
                             .GroupBy(x => x.Source.BranchId)
                             .OrderBy(x => x.Key))
                {
                    MfsReconciliationVouchers voucher =
                        await PostSettlementAsync(
                            batch.ToList(),
                            wallet,
                            walletLedger,
                            bank,
                            charges,
                            date,
                            userNarration,
                            false,
                            userId,
                            "System",
                            now);

                    result.VoucherNos.Add(voucher.VoucherNo);
                    result.VoucherIds.Add(voucher.MfsReconciliationVoucherId);
                }

                await _context.SaveChangesAsync();

                result.TransactionCount = items.Count;
                result.Message =
                    $"{items.Count} MFS transaction(s) settled into {bank.LedgerName} : {string.Join(", ", result.VoucherNos)}.";
            });

        return result;
    }

    // Wallet ledger, its linked bank (by code), MFS Charges
    private async Task<(VoucherLedgerDto Wallet, VoucherLedgerDto Bank, VoucherLedgerDto? Charges)>
        SettlementLedgersAsync
        (
            MfsAccountsEntity wallet
        )
    {
        string bankCode =
            await BankCodeAsync(wallet);

        Dictionary<string, VoucherLedgerDto> ledgers =
            await _ledgerRepository.GetByCodesAsync(
                new[] { wallet.MFSAccountCode, MfsChargesLedger }
                    .Concat(bankCode.Length > 0 ? new[] { bankCode } : Array.Empty<string>())
                    .Distinct());

        VoucherLedgerDto? bank =
            bankCode.Length > 0
                ? ledgers.GetValueOrDefault(bankCode)
                : null;

        string problem =
            BankProblem(Merchant, bankCode, bank);

        if (problem.Length > 0)
        {
            throw new InvalidOperationException(
                $"{wallet.DisplayName} : {problem}");
        }

        VoucherLedgerDto walletLedger =
            Need(ledgers, wallet.MFSAccountCode, "MFS wallet ledger");

        if (!walletLedger.IsActive)
        {
            throw new InvalidOperationException(
                $"'{walletLedger.LedgerName}' is inactive.");
        }

        return (walletLedger, bank!, ledgers.GetValueOrDefault(MfsChargesLedger));
    }

    //===========================================================
    // Saves + posts one settlement RRV (one group per
    // transaction) and moves its transactions to Settled
    //
    //   Dr linked Bank   net
    //   Dr MFS Charges   fee
    //   Cr MFS wallet    gross
    //===========================================================

    private async Task<MfsReconciliationVouchers>
        PostSettlementAsync
        (
            List<WorkItem> items,
            MfsAccountsEntity wallet,
            VoucherLedgerDto walletLedger,
            VoucherLedgerDto bank,
            VoucherLedgerDto? charges,
            DateOnly date,
            string userNarration,
            bool isAuto,
            long userId,
            string userName,
            DateTime now
        )
    {
        long branchId =
            items[0].Source.BranchId;

        VoucherNumberDto number =
            await _numberService.NextAsync(VoucherTypes.ReceiptReconciliation, branchId, date);

        List<MfsReconciliationVoucherLines> lines =
            new();

        int group = 0;

        foreach (WorkItem item in items)
        {
            group++;

            SourceLine source =
                item.Source;

            decimal net =
                source.Gross - item.Fee;

            string text =
                string.IsNullOrWhiteSpace(item.Notes)
                    ? $"MFS {RefText(source)} of {source.PartyName} settled ({source.VoucherNo})"
                    : item.Notes;

            if (net > 0)
            {
                lines.Add(
                    Line(group, source.TransactionRef, bank.LedgerCode, bank.LedgerName, bank.SubGroupName,
                        string.Empty, string.Empty, net, 0, text, false));
            }

            if (item.Fee > 0)
            {
                lines.Add(
                    Line(group, source.TransactionRef, charges!.LedgerCode, charges.LedgerName, charges.SubGroupName,
                        string.Empty, string.Empty, item.Fee, 0,
                        $"MFS charge on {RefText(source)}", true));
            }

            lines.Add(
                Line(group, source.TransactionRef, walletLedger.LedgerCode, walletLedger.LedgerName, walletLedger.SubGroupName,
                    string.Empty, string.Empty, 0, source.Gross, text, false));
        }

        decimal amount =
            items.Sum(x => x.Source.Gross);

        decimal fees =
            items.Sum(x => x.Fee);

        string sourceText =
            string.Join(", ", items.Select(x => x.Source.VoucherNo).Distinct());

        string narration =
            userNarration.Length > 0
                ? userNarration
                : Limit(
                    (isAuto ? "Auto settlement : " : string.Empty)
                    + $"{items.Count} MFS transaction(s) of {walletLedger.LedgerName} settled into {bank.LedgerName} ({sourceText})",
                    500);

        MfsReconciliationVouchers voucher =
            new()
            {
                VoucherNo = number.VoucherNo,
                VoucherType = VoucherTypes.ReceiptReconciliation,
                Purpose = SettlementPurpose,
                VoucherDate = date,
                BranchId = branchId,
                BranchName = Limit(items[0].Source.BranchName, 200),
                WalletCode = walletLedger.LedgerCode,
                WalletName = Limit(walletLedger.LedgerName, 250),
                BankLedgerCode = bank.LedgerCode,
                BankLedgerName = Limit(bank.LedgerName, 250),
                TransactionCount = items.Count,
                Amount = amount,
                Charges = fees,
                NetAmount = amount - fees,
                Narration = narration,
                IsAuto = isAuto,
                Status = VoucherStatuses.Posted,
                ReverseReason = string.Empty,
                CreatedBy = userId,
                CreatedDate = now
            };

        await SaveVoucherAsync(voucher, lines, userId);

        foreach (WorkItem item in items)
        {
            MfsReconciliations state =
                item.State;

            decimal walletFee =
                FeeOf(state.GrossAmount, wallet.MFSCharges);

            state.Status = Settled;
            state.SettledDate = date;
            state.SettlementVoucherId = voucher.MfsReconciliationVoucherId;
            state.SettlementVoucherNo = voucher.VoucherNo;
            state.BankLedgerCode = bank.LedgerCode;
            state.BankLedgerName = Limit(bank.LedgerName, 250);
            state.FeePercent =
                item.Fee == walletFee || state.GrossAmount == 0
                    ? wallet.MFSCharges
                    : decimal.Round(item.Fee * 100 / state.GrossAmount, 4);
            state.Fee = item.Fee;
            state.StandardFee = item.StandardFee;
            state.FeeEdited = item.Fee != item.StandardFee;
            state.FeeReason = state.FeeEdited ? item.FeeReason : string.Empty;
            state.NetAmount = state.GrossAmount - item.Fee;
            state.IsAuto = isAuto;
            state.SkipAuto = false;
            state.ShortNotes = item.Notes;
            Touch(state, userId, now);

            AddHistory(state, "Settle", date, userId, now,
                ledgerCode: bank.LedgerCode,
                ledgerName: bank.LedgerName,
                voucherNo: voucher.VoucherNo,
                fee: item.Fee,
                standardFee: item.StandardFee,
                feeEdited: state.FeeEdited,
                feeReason: state.FeeReason,
                reason: item.Notes,
                isAuto: isAuto);

            AddActivity(state.MfsReconciliationId, "Settle",
                isAuto ? "MFS Auto Settled" : "MFS Settled",
                $"MFS {RefText(item.Source)} of {state.PartyName} ({state.GrossAmount:N2}) settled in {voucher.VoucherNo} into {bank.LedgerName}, fee {item.Fee:N2}.{EditedText(state)}",
                userId, userName, now);
        }

        return voucher;
    }


    //===========================================================
    // Reject (merchant Pending / personal Direct → Rejected)
    //
    // One wallet per save; one RRV (Journal) per branch.
    //   Dr customer line(s)        amount
    //   Dr MFS Charges Recovery    charge the customer paid
    //   Cr MFS wallet              gross
    //===========================================================

    public async Task<MfsActionResultDto>
        RejectAsync
        (
            MfsRejectDto dto,
            long userId
        )
    {
        List<MfsRejectItemDto> items =
            (dto?.Items ?? new List<MfsRejectItemDto>())
                .OrderBy(x => x.PaymentId)
                .ToList();

        if (items.Count == 0)
        {
            throw new InvalidOperationException(
                "Select at least one transaction to reject.");
        }

        if (items.Select(x => x.PaymentId).Distinct().Count() != items.Count)
        {
            throw new InvalidOperationException(
                "A transaction is in the list twice.");
        }

        string walletCode =
            (dto!.WalletCode ?? string.Empty).Trim();

        if (walletCode.Length == 0)
        {
            throw new InvalidOperationException(
                "Select the MFS wallet.");
        }

        string reason =
            RequireReason(dto.Reason, "reject");

        DateOnly date =
            ParseDate(dto.RejectDate, "Reject date");

        MfsActionResultDto result =
            new();

        await InTransactionAsync(
            async () =>
            {
                DateTime now =
                    DateTime.UtcNow;

                MfsAccountsEntity wallet =
                    await LoadWalletAsync(walletCode);

                await LockSourcesAsync(items.Select(x => x.PaymentId));

                List<WorkItem> work =
                    new();

                foreach (MfsRejectItemDto item in items)
                {
                    SourceLine source =
                        await LoadSourceAsync(item.PaymentId);

                    RequireWallet(source, walletCode);

                    MfsReconciliations state =
                        await StateAsync(source, wallet, userId, now);

                    if (state.Status != Pending && state.Status != Direct)
                    {
                        throw new InvalidOperationException(
                            $"{TxnLabel(source)} is {state.Status}; only a Pending or Direct transaction can be rejected.");
                    }

                    await EnsureDateAsync(date, source, $"{TxnLabel(source)} : reject date");

                    if (source.PartiesError.Length > 0
                        || source.Parties.Sum(x => x.Amount) != source.Amount)
                    {
                        throw new InvalidOperationException(
                            $"{TxnLabel(source)} : {(source.PartiesError.Length > 0 ? source.PartiesError : "the voucher's party lines do not match the receipt")} ({source.VoucherNo}).");
                    }

                    work.Add(
                        new WorkItem
                        {
                            Source = source,
                            State = state,
                            Fee = 0,
                            Notes = Limit(item.ShortNotes, 250)
                        });
                }

                Dictionary<string, VoucherLedgerDto> ledgers =
                    await _ledgerRepository.GetByCodesAsync(
                        new[] { walletCode, MfsRecoveryLedger }.Distinct());

                VoucherLedgerDto walletLedger =
                    Need(ledgers, walletCode, "MFS wallet ledger");

                VoucherLedgerDto? recovery =
                    ledgers.GetValueOrDefault(MfsRecoveryLedger);

                if (work.Any(x => x.Source.CustomerCharge > 0) && recovery == null)
                {
                    throw new InvalidOperationException(
                        $"MFS Charges Recovery ledger ({MfsRecoveryLedger}) was not found.");
                }

                foreach (IGrouping<long, WorkItem> batch in work
                             .GroupBy(x => x.Source.BranchId)
                             .OrderBy(x => x.Key))
                {
                    List<WorkItem> rows =
                        batch.ToList();

                    VoucherNumberDto number =
                        await _numberService.NextAsync(VoucherTypes.ReceiptReconciliation, batch.Key, date);

                    List<MfsReconciliationVoucherLines> lines =
                        new();

                    int group = 0;

                    foreach (WorkItem row in rows)
                    {
                        group++;

                        SourceLine source =
                            row.Source;

                        string text =
                            string.IsNullOrWhiteSpace(row.Notes)
                                ? $"MFS {RefText(source)} rejected ({source.VoucherNo})"
                                : row.Notes;

                        foreach (PartySlice party in source.Parties)
                        {
                            lines.Add(
                                Line(group, source.TransactionRef, party.LedgerCode, party.LedgerName, party.SubGroupName,
                                    party.PartyCode, PartyTypeOf(party), party.Amount, 0, text, false));
                        }

                        if (source.CustomerCharge > 0)
                        {
                            lines.Add(
                                Line(group, source.TransactionRef, recovery!.LedgerCode, recovery.LedgerName, recovery.SubGroupName,
                                    string.Empty, string.Empty, source.CustomerCharge, 0,
                                    $"MFS charge recovery reversed on {RefText(source)}", true));
                        }

                        lines.Add(
                            Line(group, source.TransactionRef, walletLedger.LedgerCode, walletLedger.LedgerName, walletLedger.SubGroupName,
                                string.Empty, string.Empty, 0, source.Gross, text, false));
                    }

                    decimal amount =
                        rows.Sum(x => x.Source.Gross);

                    MfsReconciliationVouchers voucher =
                        new()
                        {
                            VoucherNo = number.VoucherNo,
                            VoucherType = VoucherTypes.ReceiptReconciliation,
                            Purpose = RejectPurpose,
                            VoucherDate = date,
                            BranchId = batch.Key,
                            BranchName = Limit(rows[0].Source.BranchName, 200),
                            WalletCode = walletLedger.LedgerCode,
                            WalletName = Limit(walletLedger.LedgerName, 250),
                            BankLedgerCode = string.Empty,
                            BankLedgerName = string.Empty,
                            TransactionCount = rows.Count,
                            Amount = amount,
                            Charges = 0,
                            NetAmount = 0,
                            Narration = reason,
                            IsAuto = false,
                            Status = VoucherStatuses.Posted,
                            ReverseReason = string.Empty,
                            CreatedBy = userId,
                            CreatedDate = now
                        };

                    await SaveVoucherAsync(voucher, lines, userId);

                    foreach (WorkItem row in rows)
                    {
                        MfsReconciliations state =
                            row.State;

                        state.Status = Rejected;
                        state.RejectDate = date;
                        state.RejectReason = reason;
                        state.RejectVoucherId = voucher.MfsReconciliationVoucherId;
                        state.RejectVoucherNo = voucher.VoucherNo;
                        state.ShortNotes = row.Notes;
                        Touch(state, userId, now);

                        AddHistory(state, "Reject", date, userId, now,
                            ledgerCode: walletLedger.LedgerCode,
                            ledgerName: walletLedger.LedgerName,
                            voucherNo: voucher.VoucherNo,
                            reason: reason);

                        AddActivity(state.MfsReconciliationId, "Reject", "MFS Rejected",
                            $"MFS {RefText(row.Source)} of {state.PartyName} ({state.GrossAmount:N2}) rejected in {voucher.VoucherNo}. Reason : {reason}",
                            userId, "System", now);
                    }

                    result.VoucherNos.Add(voucher.VoucherNo);
                    result.VoucherIds.Add(voucher.MfsReconciliationVoucherId);
                }

                await _context.SaveChangesAsync();

                result.TransactionCount = items.Count;
                result.Message =
                    $"{items.Count} MFS transaction(s) rejected : {string.Join(", ", result.VoucherNos)}.";
            });

        return result;
    }


    //===========================================================
    // Undo : Settled → Pending (the whole RRV) or
    //        Rejected → Pending / Direct (its RRV)
    //===========================================================

    public async Task<MfsActionResultDto>
        UndoAsync
        (
            MfsUndoDto dto,
            long userId
        )
    {
        string reason =
            RequireReason(dto?.Reason, "undo");

        DateOnly date =
            OptionalDate(dto?.UndoDate, "Undo date");

        long paymentId =
            dto!.PaymentId;

        MfsActionResultDto result =
            new();

        await InTransactionAsync(
            async () =>
            {
                DateTime now =
                    DateTime.UtcNow;

                var picked =
                    await _context
                        .Set<MfsReconciliations>()
                        .AsNoTracking()
                        .Where(x => x.SourceVoucherType == SourceType && x.SourcePaymentId == paymentId)
                        .Select(x => new { x.Status, x.SettlementVoucherId, x.RejectVoucherId })
                        .FirstOrDefaultAsync();

                bool settled =
                    picked?.Status == Settled;

                if (picked == null || (!settled && picked.Status != Rejected))
                {
                    throw new InvalidOperationException(
                        "This transaction is not settled or rejected; nothing to undo.");
                }

                long? voucherId =
                    settled
                        ? picked.SettlementVoucherId
                        : picked.RejectVoucherId;

                // Every transaction in the same voucher
                List<long> paymentIds =
                    settled
                        ? await _context
                            .Set<MfsReconciliations>()
                            .AsNoTracking()
                            .Where(x => x.SettlementVoucherId == voucherId && x.Status == Settled)
                            .OrderBy(x => x.SourcePaymentId)
                            .Select(x => x.SourcePaymentId)
                            .ToListAsync()
                        : await _context
                            .Set<MfsReconciliations>()
                            .AsNoTracking()
                            .Where(x => x.RejectVoucherId == voucherId && x.Status == Rejected)
                            .OrderBy(x => x.SourcePaymentId)
                            .Select(x => x.SourcePaymentId)
                            .ToListAsync();

                await LockSourcesAsync(paymentIds.Append(paymentId));

                MfsReconciliationVouchers voucher =
                    await LoadVoucherAsync(voucherId);

                List<MfsReconciliations> states =
                    await _context
                        .Set<MfsReconciliations>()
                        .Where(x => x.SourceVoucherType == SourceType && paymentIds.Contains(x.SourcePaymentId))
                        .ToListAsync();

                MfsReconciliations? pickedState =
                    states.FirstOrDefault(x => x.SourcePaymentId == paymentId);

                long? stillIn =
                    settled
                        ? pickedState?.SettlementVoucherId
                        : pickedState?.RejectVoucherId;

                if (pickedState == null || stillIn != voucher.MfsReconciliationVoucherId)
                {
                    throw new InvalidOperationException(
                        "The transaction changed while undoing; refresh and try again.");
                }

                await ReverseVoucherAsync(voucher, date, reason, userId, now);

                foreach (MfsReconciliations state in states.OrderBy(x => x.SourcePaymentId))
                {
                    string back;

                    if (settled)
                    {
                        back = Pending;

                        state.Status = Pending;
                        state.SettledDate = null;
                        state.SettlementVoucherId = null;
                        state.SettlementVoucherNo = string.Empty;
                        state.BankLedgerCode = string.Empty;
                        state.BankLedgerName = string.Empty;
                        state.FeePercent = 0;
                        state.Fee = 0;
                        state.StandardFee = 0;
                        state.FeeEdited = false;
                        state.FeeReason = string.Empty;
                        state.NetAmount = 0;

                        // An undone auto settlement is left to the
                        // user (the job would only settle it again)
                        state.SkipAuto = state.SkipAuto || state.IsAuto;
                        state.IsAuto = false;
                    }
                    else
                    {
                        back =
                            state.WalletType == Merchant
                                ? Pending
                                : Direct;

                        state.Status = back;
                        state.RejectDate = null;
                        state.RejectReason = string.Empty;
                        state.RejectVoucherId = null;
                        state.RejectVoucherNo = string.Empty;
                    }

                    state.ShortNotes = string.Empty;
                    Touch(state, userId, now);

                    string action =
                        settled ? "Undo Settle" : "Undo Reject";

                    AddHistory(state, action, date, userId, now,
                        voucherNo: voucher.VoucherNo,
                        reason: reason);

                    AddActivity(state.MfsReconciliationId, action,
                        settled ? "MFS Settlement Reversed" : "MFS Reject Reversed",
                        $"MFS {(string.IsNullOrWhiteSpace(state.TransactionRef) ? state.SourceVoucherNo : state.TransactionRef)} back to {back}; {voucher.VoucherNo} reversed. Reason : {reason}",
                        userId, "System", now);
                }

                await _context.SaveChangesAsync();

                result.VoucherNos.Add(voucher.VoucherNo);
                result.VoucherIds.Add(voucher.MfsReconciliationVoucherId);
                result.TransactionCount = states.Count;
                result.Message =
                    $"{voucher.VoucherNo} reversed; {states.Count} transaction(s) back.";
            });

        return result;
    }


    //===========================================================
    // Auto Settlement (nightly; switch 0051)
    //
    // Run dates : from the day after the last Completed date up
    // to today (today only from 23:59 Bangladesh time); the first
    // run ever starts today; never more than 31 days back.
    // Switch OFF : the date is marked Completed with nothing done
    // (so turning it ON later does not back-date vouchers).
    //===========================================================

    public async Task<MfsAutoSettlementResultDto>
        RunAutoSettlementAsync
        (
            CancellationToken cancellationToken
        )
    {
        MfsAutoSettlementResultDto result =
            new();

        DateTime local =
            BusinessNow();

        DateOnly today =
            DateOnly.FromDateTime(local);

        DateOnly target =
            local.TimeOfDay >= new TimeSpan(23, 59, 0)
                ? today
                : today.AddDays(-1);

        DateOnly? last =
            await _context
                .Set<MfsAutoSettlementRuns>()
                .AsNoTracking()
                .Where(x => x.Outcome == RunCompleted)
                .Select(x => (DateOnly?)x.RunDate)
                .MaxAsync(cancellationToken);

        // First run ever : the last date that is due (a run made
        // while the switch is OFF already marks that date)
        DateOnly start =
            last.HasValue
                ? last.Value.AddDays(1)
                : target;

        if (start < target.AddDays(-MaxCatchUpDays))
        {
            start = target.AddDays(-MaxCatchUpDays);
        }

        if (start > target)
        {
            result.Message = "Nothing to run yet.";

            return result;
        }

        if (!await IsSwitchOnAsync(AutoSettlementSwitch, false))
        {
            await MarkCompletedAsync(target, "Auto Settlement is OFF.");

            result.Message = "Auto Settlement is OFF.";

            return result;
        }

        int days =
            await AutoDaysAsync();

        for (DateOnly date = start; date <= target; date = date.AddDays(1))
        {
            cancellationToken.ThrowIfCancellationRequested();

            await RunDateAsync(date, days, result, cancellationToken);

            result.RunDates.Add(Text(date));
        }

        result.Message =
            $"Auto Settlement {string.Join(", ", result.RunDates)} : {result.Settled} voucher(s), {result.Skipped} skipped, {result.Failed} failed.";

        return result;
    }

    // One run date : every wallet + branch with transactions due
    private async Task RunDateAsync
    (
        DateOnly date,
        int days,
        MfsAutoSettlementResultDto result,
        CancellationToken cancellationToken
    )
    {
        bool done =
            await _context
                .Set<MfsAutoSettlementRuns>()
                .AsNoTracking()
                .AnyAsync(x => x.RunDate == date && x.Outcome == RunCompleted, cancellationToken);

        if (done)
        {
            return;
        }

        // Banks are closed on Friday / Saturday : nothing settles
        // (what fell due waits for the next working day)
        if (!IsWorkingDay(date))
        {
            await MarkCompletedAsync(date, "Weekend : no settlement.");

            return;
        }

        var rows =
            await (
                from p in _context.Set<ReceiptVoucherPayments>().AsNoTracking()
                join v in _context.Set<ReceiptVoucher>().AsNoTracking()
                    on p.ReceiptVoucherId equals v.ReceiptVoucherId
                where p.Mode == MfsMode
                      && v.Status == VoucherStatuses.Posted
                      && !v.IsDeleted
                      && v.VoucherDate <= date
                select new
                {
                    PaymentId = p.ReceiptVoucherPaymentId,
                    v.VoucherDate,
                    v.BranchId,
                    p.LedgerCode
                })
            .ToListAsync(cancellationToken);

        Dictionary<long, MfsReconciliations> states =
            await _context
                .Set<MfsReconciliations>()
                .AsNoTracking()
                .Where(x => x.SourceVoucherType == SourceType)
                .ToDictionaryAsync(x => x.SourcePaymentId, cancellationToken);

        Dictionary<string, MfsAccountsEntity> wallets =
            await WalletsByCodeAsync();

        var due =
            rows
                .Where(
                    x =>
                    {
                        MfsReconciliations? state =
                            states.GetValueOrDefault(x.PaymentId);

                        string type =
                            state?.WalletType
                            ?? WalletTypeOf(wallets.GetValueOrDefault(x.LedgerCode ?? string.Empty));

                        return type == Merchant
                               && (state == null || (state.Status == Pending && !state.SkipAuto))
                               && DueDate(x.VoucherDate, days) <= date;
                    })
                .GroupBy(x => new { WalletCode = x.LedgerCode ?? string.Empty, x.BranchId })
                .OrderBy(x => x.Key.WalletCode)
                .ThenBy(x => x.Key.BranchId)
                .ToList();

        foreach (var batch in due)
        {
            cancellationToken.ThrowIfCancellationRequested();

            List<long> paymentIds =
                batch.Select(x => x.PaymentId).OrderBy(x => x).ToList();

            MfsAccountsEntity? wallet =
                wallets.GetValueOrDefault(batch.Key.WalletCode);

            string walletName =
                wallet?.DisplayName ?? batch.Key.WalletCode;

            // Things that only a person can fix : skipped, logged
            string skip =
                wallet == null
                    ? "MFS account not found."
                    : !wallet.Status
                        ? "MFS account is inactive."
                        : string.Empty;

            if (skip.Length == 0)
            {
                try
                {
                    await _numberService.ResolvePeriodAsync(batch.Key.BranchId, date);
                }
                catch (InvalidOperationException ex)
                {
                    skip = ex.Message;
                }
            }

            if (skip.Length > 0)
            {
                await LogRunAsync(date, batch.Key.WalletCode, walletName, batch.Key.BranchId,
                    RunSkipped, null, string.Empty, paymentIds.Count, 0,
                    $"{skip} (still Pending : tried again on the next run date)");

                result.Skipped++;

                continue;
            }

            try
            {
                MfsReconciliationVouchers? voucher =
                    null;

                int count = 0;

                await InTransactionAsync(
                    async () =>
                    {
                        DateTime now =
                            DateTime.UtcNow;

                        (VoucherLedgerDto walletLedger, VoucherLedgerDto bank, VoucherLedgerDto? charges) =
                            await SettlementLedgersAsync(wallet!);

                        await LockSourcesAsync(paymentIds);

                        List<WorkItem> work =
                            new();

                        foreach (long paymentId in paymentIds)
                        {
                            SourceLine source =
                                await LoadSourceAsync(paymentId, requirePosted: false);

                            // Changed since the list was read : leave it
                            if (source.VoucherStatus != VoucherStatuses.Posted
                                || !SameText(source.WalletCode, batch.Key.WalletCode))
                            {
                                continue;
                            }

                            MfsReconciliations state =
                                await StateAsync(source, wallet!, SystemUserId, now);

                            if (state.Status != Pending || state.SkipAuto || state.WalletType != Merchant)
                            {
                                continue;
                            }

                            work.Add(
                                new WorkItem
                                {
                                    Source = source,
                                    State = state,
                                    Fee = FeeOf(source.Gross, wallet!.MFSCharges),
                                    StandardFee = FeeOf(source.Gross, wallet!.MFSCharges),
                                    Notes = string.Empty
                                });
                        }

                        if (work.Count == 0)
                        {
                            return;
                        }

                        if (work.Any(x => x.Fee > 0) && charges == null)
                        {
                            throw new InvalidOperationException(
                                $"MFS Charges ledger ({MfsChargesLedger}) was not found.");
                        }

                        voucher =
                            await PostSettlementAsync(
                                work,
                                wallet!,
                                walletLedger,
                                bank,
                                charges,
                                date,
                                string.Empty,
                                true,
                                SystemUserId,
                                SystemUserName,
                                now);

                        count = work.Count;

                        AddRunRow(date, batch.Key.WalletCode, walletName, batch.Key.BranchId,
                            RunSettled, voucher.MfsReconciliationVoucherId, voucher.VoucherNo,
                            count, voucher.Amount, $"Settled into {bank.LedgerName}.");

                        await _context.SaveChangesAsync();
                    });

                if (voucher != null)
                {
                    result.Settled++;
                    result.VoucherNos.Add(voucher.VoucherNo);
                }
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                // The transaction rolled back : forget what it
                // tracked, then log why
                _context.ChangeTracker.Clear();

                bool isRule =
                    ex is InvalidOperationException or KeyNotFoundException;

                await LogRunAsync(date, batch.Key.WalletCode, walletName, batch.Key.BranchId,
                    isRule ? RunSkipped : RunFailed, null, string.Empty, paymentIds.Count, 0,
                    $"{ex.Message} (still Pending : tried again on the next run date)");

                if (isRule)
                {
                    result.Skipped++;
                }
                else
                {
                    result.Failed++;
                }
            }
        }

        await MarkCompletedAsync(date, $"{due.Count} wallet / branch batch(es) checked.");
    }

    private async Task MarkCompletedAsync
    (
        DateOnly date,
        string message
    )
    {
        bool exists =
            await _context
                .Set<MfsAutoSettlementRuns>()
                .AsNoTracking()
                .AnyAsync(x => x.RunDate == date && x.Outcome == RunCompleted);

        if (exists)
        {
            return;
        }

        try
        {
            await LogRunAsync(date, string.Empty, string.Empty, 0, RunCompleted, null, string.Empty, 0, 0, message);
        }
        catch (DbUpdateException)
        {
            // Another server marked it first
            _context.ChangeTracker.Clear();
        }
    }

    private async Task LogRunAsync
    (
        DateOnly date,
        string walletCode,
        string walletName,
        long branchId,
        string outcome,
        long? voucherId,
        string voucherNo,
        int count,
        decimal amount,
        string message
    )
    {
        AddRunRow(date, walletCode, walletName, branchId, outcome, voucherId, voucherNo, count, amount, message);

        await _context.SaveChangesAsync();
    }

    private void AddRunRow
    (
        DateOnly date,
        string walletCode,
        string walletName,
        long branchId,
        string outcome,
        long? voucherId,
        string voucherNo,
        int count,
        decimal amount,
        string message
    )
    {
        _context.Set<MfsAutoSettlementRuns>().Add(
            new MfsAutoSettlementRuns
            {
                RunDate = date,
                WalletCode = Limit(walletCode, 40),
                WalletName = Limit(walletName, 250),
                BranchId = branchId,
                Outcome = outcome,
                VoucherId = voucherId,
                VoucherNo = voucherNo ?? string.Empty,
                TransactionCount = count,
                Amount = amount,
                Message = Limit(message, 500),
                CreatedDate = DateTime.UtcNow
            });
    }


    //===========================================================
    // Due date : receipt date + n working days (Friday and
    // Saturday are not working days; holidays not counted yet)
    //===========================================================

    public static DateOnly DueDate
    (
        DateOnly receiptDate,
        int workingDays
    )
    {
        DateOnly date =
            receiptDate;

        int counted = 0;

        while (counted < workingDays)
        {
            date = date.AddDays(1);

            if (IsWorkingDay(date))
            {
                counted++;
            }
        }

        return date;
    }

    private static bool IsWorkingDay
    (
        DateOnly date
    )
    {
        return date.DayOfWeek != DayOfWeek.Friday
               && date.DayOfWeek != DayOfWeek.Saturday;
    }


    //===========================================================
    // Saves the voucher + lines and posts them
    //===========================================================

    private async Task
        SaveVoucherAsync
        (
            MfsReconciliationVouchers voucher,
            List<MfsReconciliationVoucherLines> lines,
            long userId
        )
    {
        _context.Set<MfsReconciliationVouchers>().Add(voucher);

        await _context.SaveChangesAsync();

        int lineNo = 0;

        foreach (MfsReconciliationVoucherLines line in lines)
        {
            line.MfsReconciliationVoucherId = voucher.MfsReconciliationVoucherId;
            line.LineNo = ++lineNo;
        }

        _context.Set<MfsReconciliationVoucherLines>().AddRange(lines);

        await _postingService.PostAsync(
            new VoucherPostingRequest
            {
                VoucherType = voucher.VoucherType,
                VoucherId = voucher.MfsReconciliationVoucherId,
                VoucherNo = voucher.VoucherNo,
                VoucherDate = voucher.VoucherDate,
                BranchId = voucher.BranchId,
                // Each customer / supplier line carries its party
                PartyType = string.Empty,
                PartyCode = string.Empty,
                ReferenceNo = string.Empty,
                Narration = voucher.Narration,
                Lines = lines
                    .Select(
                        x =>
                            new VoucherPostingLine
                            {
                                GroupNo = x.GroupNo,
                                LedgerCode = x.LedgerCode,
                                Debit = x.Debit,
                                Credit = x.Credit,
                                Narration = x.Narration,
                                PartyType = x.PartyType,
                                PartyCode = x.PartyCode
                            })
                    .ToList()
            },
            userId);
    }

    private static MfsReconciliationVoucherLines Line
    (
        int group,
        string transactionRef,
        string ledgerCode,
        string ledgerName,
        string subGroupName,
        string partyCode,
        string partyType,
        decimal debit,
        decimal credit,
        string narration,
        bool isCharge
    )
    {
        return new MfsReconciliationVoucherLines
        {
            GroupNo = group,
            TransactionRef = Limit(transactionRef, 100),
            LedgerCode = ledgerCode,
            LedgerName = Limit(ledgerName, 250),
            SubGroupName = Limit(subGroupName, 200),
            PartyCode = Limit(partyCode, 40),
            PartyType = Limit(partyType, 20),
            Debit = debit,
            Credit = credit,
            Narration = Limit(narration, 500),
            IsCharge = isCharge
        };
    }

    private static string PartyTypeOf
    (
        PartySlice party
    )
    {
        return string.IsNullOrWhiteSpace(party.PartyCode)
            ? string.Empty
            : party.LedgerType;
    }


    //===========================================================
    // Lock the Receipt Vouchers of several transactions, lowest
    // voucher id first (the same order everywhere, so two
    // requests never wait on each other)
    //===========================================================

    private async Task
        LockSourcesAsync
        (
            IEnumerable<long> paymentIds
        )
    {
        List<long> ids =
            paymentIds.Distinct().ToList();

        List<long> voucherIds =
            await _context
                .Set<ReceiptVoucherPayments>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.ReceiptVoucherPaymentId))
                .Select(x => x.ReceiptVoucherId)
                .Distinct()
                .ToListAsync();

        foreach (long voucherId in voucherIds.OrderBy(x => x))
        {
            await _context.Database.ExecuteSqlInterpolatedAsync(
                $@"SELECT 1 FROM ""ReceiptVoucher"" WHERE ""ReceiptVoucherId"" = {voucherId} FOR UPDATE");
        }
    }


    //===========================================================
    // Load an MFS transaction with its Receipt Voucher (locked)
    //===========================================================

    private async Task<SourceLine>
        LoadSourceAsync
        (
            long paymentId,
            bool requirePosted = true
        )
    {
        long voucherId =
            await _context
                .Set<ReceiptVoucherPayments>()
                .AsNoTracking()
                .Where(x => x.ReceiptVoucherPaymentId == paymentId)
                .Select(x => (long?)x.ReceiptVoucherId)
                .FirstOrDefaultAsync()
            ??
            throw new KeyNotFoundException(
                "MFS transaction not found.");

        await _context.Database.ExecuteSqlInterpolatedAsync(
            $@"SELECT 1 FROM ""ReceiptVoucher"" WHERE ""ReceiptVoucherId"" = {voucherId} FOR UPDATE");

        ReceiptVoucher voucher =
            await _context
                .Set<ReceiptVoucher>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ReceiptVoucherId == voucherId && !x.IsDeleted)
            ??
            throw new KeyNotFoundException(
                "Receipt Voucher not found.");

        if (requirePosted && voucher.Status != VoucherStatuses.Posted)
        {
            throw new InvalidOperationException(
                $"Receipt Voucher {voucher.VoucherNo} is {voucher.Status}; only MFS receipts of a posted voucher can be reconciled.");
        }

        List<ReceiptVoucherPayments> payments =
            await _context
                .Set<ReceiptVoucherPayments>()
                .AsNoTracking()
                .Where(x => x.ReceiptVoucherId == voucherId)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        List<ReceiptVoucherLines> lines =
            await _context
                .Set<ReceiptVoucherLines>()
                .AsNoTracking()
                .Where(x => x.ReceiptVoucherId == voucherId)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        ReceiptVoucherPayments payment =
            payments.First(x => x.ReceiptVoucherPaymentId == paymentId);

        if (payment.Mode != MfsMode)
        {
            throw new InvalidOperationException(
                "This payment row is not an MFS receipt.");
        }

        Dictionary<long, List<PartySlice>> allocation =
            new();

        string partiesError =
            string.Empty;

        try
        {
            allocation =
                AllocateReceived(
                    lines
                        .Select(
                            x =>
                                new PartySlice
                                {
                                    LedgerType = x.LedgerType,
                                    LedgerCode = x.LedgerCode,
                                    LedgerName = x.LedgerName,
                                    SubGroupName = x.SubGroupName,
                                    PartyCode = x.PartyCode,
                                    Amount = x.Amount
                                })
                        .ToList(),
                    payments
                        .Select(x => (x.ReceiptVoucherPaymentId, x.Mode == CheckMode, x.Amount))
                        .ToList());
        }
        catch (InvalidOperationException ex)
        {
            partiesError = ex.Message;
        }

        return new SourceLine
        {
            VoucherId = voucher.ReceiptVoucherId,
            VoucherNo = voucher.VoucherNo,
            VoucherDate = voucher.VoucherDate,
            VoucherStatus = voucher.Status,
            BranchId = voucher.BranchId,
            BranchName = voucher.BranchName,
            PartyName = voucher.PartyName,
            PaymentId = payment.ReceiptVoucherPaymentId,
            WalletCode = payment.LedgerCode ?? string.Empty,
            WalletName = payment.LedgerName ?? string.Empty,
            TransactionRef = payment.TransactionRef ?? string.Empty,
            Amount = payment.Amount,
            CustomerCharge = IsCustomerCharge(payment.ChargeBorneBy) ? payment.ChargeAmount : 0,
            Parties = allocation.GetValueOrDefault(paymentId) ?? new List<PartySlice>(),
            PartiesError = partiesError
        };
    }


    //===========================================================
    // Allocate the party lines to the money received now
    //
    // The RV credited its party lines in order up to the
    // non-check total (Cash / Bank / MFS / POS / EMI rows in line
    // order). Each non-check row takes the next part of the lines;
    // that part is what a Reject debits back.
    //===========================================================

    private static Dictionary<long, List<PartySlice>> AllocateReceived
    (
        List<PartySlice> lines,
        List<(long Id, bool IsCheck, decimal Amount)> payments
    )
    {
        decimal[] left =
            lines.Select(x => x.Amount).ToArray();

        int index = 0;

        Dictionary<long, List<PartySlice>> result =
            new();

        foreach ((long id, bool isCheck, decimal amount) in payments)
        {
            if (isCheck)
            {
                continue;
            }

            List<PartySlice> slices =
                new();

            decimal need =
                amount;

            while (need > 0)
            {
                while (index < left.Length && left[index] <= 0)
                {
                    index++;
                }

                if (index >= left.Length)
                {
                    throw new InvalidOperationException(
                        "The voucher's party lines do not cover its receipts.");
                }

                decimal take =
                    Math.Min(left[index], need);

                PartySlice line =
                    lines[index];

                PartySlice? same =
                    slices.FirstOrDefault(x => x.LedgerCode == line.LedgerCode && x.PartyCode == line.PartyCode);

                if (same != null)
                {
                    same.Amount += take;
                }
                else
                {
                    slices.Add(
                        new PartySlice
                        {
                            LedgerType = line.LedgerType,
                            LedgerCode = line.LedgerCode,
                            LedgerName = line.LedgerName,
                            SubGroupName = line.SubGroupName,
                            PartyCode = line.PartyCode,
                            Amount = take
                        });
                }

                left[index] -= take;
                need -= take;
            }

            result[id] = slices;
        }

        return result;
    }


    //===========================================================
    // State row of a transaction (created on the first action)
    //===========================================================

    private async Task<MfsReconciliations>
        StateAsync
        (
            SourceLine source,
            MfsAccountsEntity wallet,
            long userId,
            DateTime now
        )
    {
        MfsReconciliations? state =
            await _context
                .Set<MfsReconciliations>()
                .FirstOrDefaultAsync(
                    x => x.SourceVoucherType == SourceType
                         && x.SourcePaymentId == source.PaymentId);

        if (state != null)
        {
            return state;
        }

        string type =
            WalletTypeOf(wallet);

        state =
            new MfsReconciliations
            {
                SourceVoucherType = SourceType,
                SourceVoucherId = source.VoucherId,
                SourceVoucherNo = source.VoucherNo,
                SourcePaymentId = source.PaymentId,
                ReceiptDate = source.VoucherDate,
                BranchId = source.BranchId,
                BranchName = Limit(source.BranchName, 200),
                PartyName = Limit(source.PartyName, 250),
                WalletCode = source.WalletCode,
                WalletName = Limit(source.WalletName, 250),
                WalletType = type,
                TransactionRef = Limit(source.TransactionRef, 100),
                Amount = source.Amount,
                CustomerCharge = source.CustomerCharge,
                GrossAmount = source.Gross,
                Status = type == Merchant ? Pending : Direct,
                CreatedBy = userId,
                CreatedDate = now
            };

        _context.Set<MfsReconciliations>().Add(state);

        // The id is needed by the history rows
        await _context.SaveChangesAsync();

        return state;
    }

    private static void Touch
    (
        MfsReconciliations state,
        long userId,
        DateTime now
    )
    {
        state.ModifiedBy = userId;
        state.ModifiedDate = now;
    }

    private static void RequireStatus
    (
        MfsReconciliations state,
        string action,
        string status
    )
    {
        if (!string.Equals(state.Status, status, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                $"MFS {(string.IsNullOrWhiteSpace(state.TransactionRef) ? state.SourceVoucherNo : state.TransactionRef)} is {state.Status}; only a {status} transaction can be {action}.");
        }
    }

    private static void RequireWallet
    (
        SourceLine source,
        string walletCode
    )
    {
        if (!SameText(source.WalletCode, walletCode))
        {
            throw new InvalidOperationException(
                $"{TxnLabel(source)} was received in {source.WalletName}, not in the selected wallet.");
        }
    }


    //===========================================================
    // Wallets
    //===========================================================

    private async Task<MfsAccountsEntity>
        LoadWalletAsync
        (
            string walletCode
        )
    {
        MfsAccountsEntity wallet =
            await _context
                .Set<MfsAccountsEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.MFSAccountCode == walletCode && !x.IsDeleted)
            ??
            throw new KeyNotFoundException(
                $"MFS account {walletCode} not found.");

        return wallet;
    }

    // LinkedBankAccount holds the BankAccountCode. A wallet saved
    // before the switch to codes may still hold the bank's Display
    // Name : it is turned into the code here (MFSAccounts_
    // LinkedBankByCode.sql converts the saved rows for good).
    private async Task<Dictionary<string, string>>
        BankCodesAsync
        (
            IEnumerable<string?> linked
        )
    {
        List<string> values =
            linked
                .Select(x => (x ?? string.Empty).Trim())
                .Where(x => x.Length > 0)
                .Distinct()
                .ToList();

        var banks =
            await _context
                .Set<BankAccountsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted
                            && (values.Contains(x.BankAccountCode) || values.Contains(x.DisplayName)))
                .Select(x => new { x.BankAccountCode, x.DisplayName })
                .ToListAsync();

        Dictionary<string, string> result =
            new();

        foreach (string value in values)
        {
            string? code =
                banks.FirstOrDefault(x => x.BankAccountCode == value)?.BankAccountCode
                ?? banks.FirstOrDefault(x => x.DisplayName == value)?.BankAccountCode;

            result[value] = code ?? value;
        }

        return result;
    }

    private async Task<string>
        BankCodeAsync
        (
            MfsAccountsEntity wallet
        )
    {
        string linked =
            (wallet.LinkedBankAccount ?? string.Empty).Trim();

        return linked.Length == 0
            ? string.Empty
            : (await BankCodesAsync(new[] { linked }))[linked];
    }

    private async Task<Dictionary<string, MfsAccountsEntity>>
        WalletsByCodeAsync()
    {
        List<MfsAccountsEntity> wallets =
            await _context
                .Set<MfsAccountsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .ToListAsync();

        return wallets
            .GroupBy(x => x.MFSAccountCode)
            .ToDictionary(x => x.Key, x => x.First());
    }

    // Unknown / blank type counts as Personal (never auto-settled)
    private static string WalletTypeOf
    (
        MfsAccountsEntity? wallet
    )
    {
        return string.Equals((wallet?.AccountType ?? string.Empty).Trim(), Merchant, StringComparison.OrdinalIgnoreCase)
            ? Merchant
            : Personal;
    }

    private static bool IsCustomerCharge
    (
        string? borneBy
    )
    {
        // Exactly as the Receipt Voucher posting reads it
        return borneBy == "Customer";
    }

    // Wallet % of the gross, 2 decimals
    private static decimal FeeOf
    (
        decimal gross,
        decimal percent
    )
    {
        return percent <= 0
            ? 0
            : decimal.Round(gross * percent / 100m, 2, MidpointRounding.AwayFromZero);
    }

    private static string RefText
    (
        SourceLine source
    )
    {
        return string.IsNullOrWhiteSpace(source.TransactionRef)
            ? source.VoucherNo
            : $"Txn {source.TransactionRef}";
    }

    private static string TxnLabel
    (
        SourceLine source
    )
    {
        return string.IsNullOrWhiteSpace(source.TransactionRef)
            ? $"MFS receipt of {source.VoucherNo}"
            : $"MFS Txn {source.TransactionRef}";
    }


    //===========================================================
    // Voucher : load (locked) and reverse
    //===========================================================

    private async Task<MfsReconciliationVouchers>
        LoadVoucherAsync
        (
            long? id
        )
    {
        if (id == null)
        {
            throw new KeyNotFoundException(
                "MFS reconciliation voucher not found.");
        }

        await _context.Database.ExecuteSqlInterpolatedAsync(
            $@"SELECT 1 FROM ""MfsReconciliationVouchers"" WHERE ""MfsReconciliationVoucherId"" = {id.Value} FOR UPDATE");

        return await _context
                   .Set<MfsReconciliationVouchers>()
                   .FirstOrDefaultAsync(x => x.MfsReconciliationVoucherId == id.Value)
               ??
               throw new KeyNotFoundException(
                   "MFS reconciliation voucher not found.");
    }

    private async Task
        ReverseVoucherAsync
        (
            MfsReconciliationVouchers voucher,
            DateOnly date,
            string reason,
            long userId,
            DateTime now
        )
    {
        if (voucher.Status != VoucherStatuses.Posted)
        {
            throw new InvalidOperationException(
                $"{voucher.VoucherNo} is {voucher.Status}.");
        }

        if (date < voucher.VoucherDate)
        {
            throw new InvalidOperationException(
                $"Undo date cannot be before {voucher.VoucherNo}'s date ({voucher.VoucherDate:dd-MM-yyyy}).");
        }

        if (date > BusinessToday())
        {
            throw new InvalidOperationException(
                "Undo date cannot be after today.");
        }

        // Open financial year for the reversal date
        await _numberService.ResolvePeriodAsync(voucher.BranchId, date);

        if (await _postingService.IsPostedAsync(voucher.VoucherNo))
        {
            await _postingService.ReverseAsync(
                voucher.VoucherNo,
                date,
                reason,
                userId);
        }

        voucher.Status = Reversed;
        voucher.ReversedDate = date;
        voucher.ReverseReason = reason;
        voucher.ModifiedBy = userId;
        voucher.ModifiedDate = now;
    }


    //===========================================================
    // Dates : not after today; not before the receipt date; open
    // financial year
    //===========================================================

    private async Task EnsureDateAsync
    (
        DateOnly date,
        SourceLine source,
        string label
    )
    {
        if (date > BusinessToday())
        {
            throw new InvalidOperationException(
                $"{label} cannot be after today.");
        }

        if (date < source.VoucherDate)
        {
            throw new InvalidOperationException(
                $"{label} cannot be before the receipt date ({source.VoucherDate:dd-MM-yyyy}, {source.VoucherNo}).");
        }

        // Open financial year (throws when none)
        await _numberService.ResolvePeriodAsync(source.BranchId, date);
    }

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

    public static DateTime BusinessNow()
    {
        return TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.UtcNow,
            BusinessZone);
    }

    private static DateOnly BusinessToday()
    {
        return DateOnly.FromDateTime(BusinessNow());
    }


    //===========================================================
    // History / activity
    //===========================================================

    // Charge audit text for the activity : '' when not edited
    private static string EditedText
    (
        MfsReconciliations state
    )
    {
        return state.FeeEdited
            ? $" Charges changed from {state.StandardFee:N2} to {state.Fee:N2} · Reason: {state.FeeReason}."
            : string.Empty;
    }

    private void AddHistory
    (
        MfsReconciliations state,
        string action,
        DateOnly actionDate,
        long userId,
        DateTime now,
        string ledgerCode = "",
        string ledgerName = "",
        string voucherNo = "",
        decimal fee = 0,
        decimal standardFee = 0,
        bool feeEdited = false,
        string feeReason = "",
        string reason = "",
        bool isAuto = false
    )
    {
        _context.Set<MfsReconciliationHistory>().Add(
            new MfsReconciliationHistory
            {
                MfsReconciliationId = state.MfsReconciliationId,
                Action = action,
                ActionDate = actionDate,
                Status = state.Status,
                LedgerCode = ledgerCode ?? string.Empty,
                LedgerName = Limit(ledgerName, 250),
                VoucherNo = voucherNo ?? string.Empty,
                Fee = fee,
                StandardFee = standardFee,
                FeeEdited = feeEdited,
                FeeReason = Limit(feeReason, 250),
                Reason = Limit(reason, 500),
                IsAuto = isAuto,
                PerformedBy = userId,
                PerformedDate = now
            });
    }

    private void AddActivity
    (
        long entityId,
        string activityType,
        string title,
        string description,
        long userId,
        string userName,
        DateTime now
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = ModuleName,
                EntityName = EntityName,
                EntityId = entityId,
                ActivityType = activityType,
                ActivityTitle = title,
                ActivityDescription = description,
                PerformedBy = userId,
                PerformedByName = userName,
                PerformedDate = now
            });
    }


    //===========================================================
    // Helpers
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

    // Switch 0051 Value : working days after the receipt date
    // (0 = the same day; empty / not a number = 1; at most 60)
    private async Task<int>
        AutoDaysAsync()
    {
        string? value =
            await _context
                .Set<SystemConfigurationsEntity>()
                .AsNoTracking()
                .Where(x => x.ConfigurationCode == AutoSettlementSwitch && !x.IsDeleted)
                .Select(x => x.Value)
                .FirstOrDefaultAsync();

        return int.TryParse((value ?? string.Empty).Trim(), out int number) && number >= 0
            ? Math.Min(number, 60)
            : 1;
    }

    private static VoucherLedgerDto Need
    (
        Dictionary<string, VoucherLedgerDto> ledgers,
        string code,
        string label
    )
    {
        return ledgers.TryGetValue(code ?? string.Empty, out VoucherLedgerDto? ledger)
            ? ledger
            : throw new InvalidOperationException(
                $"{label} ({code}) was not found.");
    }

    private static string RequireReason
    (
        string? reason,
        string action
    )
    {
        string text =
            Limit(reason, 500);

        if (text.Length == 0)
        {
            throw new InvalidOperationException(
                $"A reason is required to {action}.");
        }

        return text;
    }

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

    // Empty = today
    private static DateOnly OptionalDate
    (
        string? text,
        string label
    )
    {
        return string.IsNullOrWhiteSpace(text)
            ? BusinessToday()
            : ParseDate(text, label);
    }

    private static string Text
    (
        DateOnly? date
    )
    {
        return date?.ToString(DateFormat, CultureInfo.InvariantCulture) ?? string.Empty;
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

    private static bool SameText
    (
        string? a,
        string? b
    )
    {
        return string.Equals(
            (a ?? string.Empty).Trim(),
            (b ?? string.Empty).Trim(),
            StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsMoney
    (
        decimal value
    )
    {
        return decimal.Round(value, 2) == value;
    }
}