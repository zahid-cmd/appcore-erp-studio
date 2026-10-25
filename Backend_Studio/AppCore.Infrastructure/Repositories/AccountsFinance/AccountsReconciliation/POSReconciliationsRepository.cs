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

using PosAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.POSAccounts;

using SystemConfigurationsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.AccountsFinance.AccountsReconciliation;


//===============================================================
// POS Reconciliations Repository
//
// Source : Receipt Voucher payment rows, Mode POS (card), of
// POSTED vouchers. The RV posted Dr POS account (amount + the
// charge the customer paid) / Cr recovery / Cr the party lines.
//
// The POS account is a transit ledger linked (by BankAccountCode)
// to a bank account. One batch = ONE LINKED BANK ACCOUNT : every
// POS account linked to it settles together.
//
//   Pending → Settle (RRV, printed as Receipt Voucher)
//               Dr linked Bank        net   = gross - charges
//               Dr POS Charges        charges (default : the
//                                     charge saved on the RV at
//                                     the sale)
//               Cr POS account        gross
//           → or Reject (RRV, printed as Journal Voucher)
//               Dr customer (the RV party lines)  amount
//               Dr POS Charges Recovery   charge the customer paid
//               Cr POS account        gross
//
// Undo reverses the WHOLE voucher; its transactions go back to
// Pending. One voucher per bank account + branch per save; one
// journal group per transaction.
//
// Auto Settlement (switch 0054, nightly) : Pending card receipts
// due by the run date (receipt date + Value working days, Friday
// and Saturday skipped) : one RRV per linked bank account +
// branch, dated the run date, posted as "System (Auto
// Settlement)".
//===============================================================

public class PosReconciliationsRepository : IPosReconciliationsRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string ModuleName =
        "Accounts Finance";

    private const string EntityName =
        "PosReconciliations";

    private const string DateFormat =
        "yyyy-MM-dd";

    private const string PosMode =
        "POS";

    private const string CheckMode =
        "Check";

    private const string SourceType =
        "RV";

    // Statuses
    private const string Pending = "Pending";

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
    //   0054 Auto Settlement : nightly settlement; Value = working
    //        days after the receipt date (0 = same day; empty = 1)
    private const string AutoSettlementSwitch =
        "CFG-MOD-004-0054";

    //   0055 Edit Charges : the charges may be changed per
    //        transaction
    private const string EditChargesSwitch =
        "CFG-MOD-004-0055";

    // Ledgers (looked up by CODE)
    //   POS Charges (expense)
    private const string PosChargesLedger =
        "GLR-004-001-001-00004";

    //   POS Charges Recovery (income; the RV credited it)
    private const string PosRecoveryLedger =
        "GLR-011-001-001-00002";

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

    public PosReconciliationsRepository(
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

    // A card transaction with its (locked) Receipt Voucher
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

        // POS account (ledger)
        public string AccountCode { get; set; } = string.Empty;

        public string AccountName { get; set; } = string.Empty;

        public string CardName { get; set; } = string.Empty;

        public string TransactionRef { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public decimal CustomerCharge { get; set; }

        public decimal SaleChargePercent { get; set; }

        public decimal SaleChargeAmount { get; set; }

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

        public PosReconciliations State { get; set; } = new();

        public decimal Fee { get; set; }

        // The system charge; Fee differs = edited (FeeReason required)
        public decimal StandardFee { get; set; }

        public string FeeReason { get; set; } = string.Empty;

        public string Notes { get; set; } = string.Empty;
    }


    //===========================================================
    // Get All (every POS line of a posted Receipt Voucher)
    //===========================================================

    public async Task<List<PosReconciliationDto>>
        GetAllAsync()
    {
        var rows =
            await (
                from p in _context.Set<ReceiptVoucherPayments>().AsNoTracking()
                join v in _context.Set<ReceiptVoucher>().AsNoTracking()
                    on p.ReceiptVoucherId equals v.ReceiptVoucherId
                where p.Mode == PosMode
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
                    p.CardName,
                    p.TransactionRef,
                    p.Amount,
                    p.ChargePercent,
                    p.ChargeAmount,
                    p.ChargeBorneBy
                })
            .ToListAsync();

        Dictionary<long, PosReconciliations> states =
            await _context
                .Set<PosReconciliations>()
                .AsNoTracking()
                .Where(x => x.SourceVoucherType == SourceType)
                .ToDictionaryAsync(x => x.SourcePaymentId);

        // POS account → its linked bank (code + name) now
        Dictionary<string, (string Code, string Name)> links =
            await AccountBanksAsync();

        bool autoOn =
            await IsSwitchOnAsync(AutoSettlementSwitch, false);

        int autoDays =
            await AutoDaysAsync();

        List<PosReconciliationDto> result =
            new();

        foreach (var x in rows)
        {
            PosReconciliations? state =
                states.GetValueOrDefault(x.PaymentId);

            decimal customerCharge =
                IsCustomerCharge(x.ChargeBorneBy)
                    ? x.ChargeAmount
                    : 0;

            decimal gross =
                x.Amount + customerCharge;

            string status =
                state?.Status ?? Pending;

            PosReconciliationDto dto =
                new()
                {
                    PaymentId = x.PaymentId,
                    PosReconciliationId = state?.PosReconciliationId ?? 0,
                    SourceVoucherType = SourceType,
                    SourceVoucherId = x.VoucherId,
                    SourceVoucherNo = x.VoucherNo,
                    ReceiptDate = Text(x.VoucherDate),
                    BranchId = x.BranchId,
                    BranchName = x.BranchName,
                    PartyName = x.PartyName,
                    AccountCode = x.LedgerCode ?? string.Empty,
                    AccountName = x.LedgerName ?? string.Empty,
                    CardName = x.CardName ?? string.Empty,
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
            else
            {
                // The bank it settles into now; the charge saved on
                // the RV
                (string code, string name) =
                    links.GetValueOrDefault(dto.AccountCode);

                dto.BankLedgerCode = code ?? string.Empty;
                dto.BankLedgerName = name ?? string.Empty;

                if (status == Pending)
                {
                    dto.FeePercent = x.ChargePercent;
                    dto.Fee = x.ChargeAmount;
                    dto.StandardFee = x.ChargeAmount;
                    dto.NetAmount = gross - x.ChargeAmount;

                    if (autoOn && !dto.SkipAuto)
                    {
                        dto.DueDate = Text(DueDate(x.VoucherDate, autoDays));
                    }
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

    public async Task<List<PosReconciliationHistoryDto>>
        GetHistoryAsync
        (
            long paymentId
        )
    {
        long? stateId =
            await _context
                .Set<PosReconciliations>()
                .AsNoTracking()
                .Where(x => x.SourceVoucherType == SourceType && x.SourcePaymentId == paymentId)
                .Select(x => (long?)x.PosReconciliationId)
                .FirstOrDefaultAsync();

        if (stateId == null)
        {
            return new List<PosReconciliationHistoryDto>();
        }

        List<PosReconciliationHistory> rows =
            await _context
                .Set<PosReconciliationHistory>()
                .AsNoTracking()
                .Where(x => x.PosReconciliationId == stateId.Value)
                .OrderByDescending(x => x.PerformedDate)
                .ThenByDescending(x => x.PosReconciliationHistoryId)
                .ToListAsync();

        return rows
            .Select(
                x =>
                    new PosReconciliationHistoryDto
                    {
                        Id = x.PosReconciliationHistoryId,
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
    // POS Settlement Center : next RRV preview (nothing reserved)
    //===========================================================

    public async Task<PosCenterDefaultsDto>
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
            return new PosCenterDefaultsDto
            {
                BranchId = branchId,
                Message = ex.Message
            };
        }

        PosCenterDefaultsDto result =
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
    // Settlement banks : every bank account POS accounts are
    // linked to (by code), with those POS accounts
    //===========================================================

    public async Task<List<PosBankDto>>
        GetBanksAsync()
    {
        List<PosAccountsEntity> accounts =
            await _context
                .Set<PosAccountsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderBy(x => x.POSAccountName)
                .ToListAsync();

        Dictionary<string, string> codes =
            await BankCodesAsync(accounts.Select(x => x.LinkedBankAccount));

        Dictionary<string, VoucherLedgerDto> banks =
            await _ledgerRepository.GetByCodesAsync(
                codes.Values.Where(x => x.Length > 0).Distinct());

        List<PosBankDto> result =
            new();

        foreach (IGrouping<string, PosAccountsEntity> group in accounts
                     .GroupBy(x => codes.GetValueOrDefault((x.LinkedBankAccount ?? string.Empty).Trim()) ?? string.Empty))
        {
            // A POS account without a linked bank cannot be settled
            if (group.Key.Length == 0)
            {
                continue;
            }

            VoucherLedgerDto? bank =
                banks.GetValueOrDefault(group.Key);

            result.Add(
                new PosBankDto
                {
                    BankLedgerCode = bank?.LedgerCode ?? group.Key,
                    BankLedgerName = bank?.LedgerName ?? group.Key,
                    BankMessage = BankProblem(group.Key, bank),
                    Accounts = group
                        .Select(
                            x =>
                                new PosBankAccountDto
                                {
                                    AccountCode = x.POSAccountCode,
                                    AccountName = x.POSAccountName,
                                    TerminalNumber = x.TerminalNumber ?? string.Empty,
                                    IsActive = x.Status
                                })
                        .ToList()
                });
        }

        return result
            .OrderBy(x => x.BankLedgerName)
            .ToList();
    }

    // Why a bank account cannot take a settlement ('' = it can)
    private static string BankProblem
    (
        string bankCode,
        VoucherLedgerDto? bank
    )
    {
        if (bankCode.Length == 0)
        {
            return "No linked bank account (POS Accounts).";
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

    public async Task<PosReconciliationVoucherDto?>
        GetVoucherAsync
        (
            long id
        )
    {
        PosReconciliationVouchers? row =
            await _context
                .Set<PosReconciliationVouchers>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.PosReconciliationVoucherId == id);

        if (row == null)
        {
            return null;
        }

        List<PosReconciliationVoucherLines> lines =
            await _context
                .Set<PosReconciliationVoucherLines>()
                .AsNoTracking()
                .Where(x => x.PosReconciliationVoucherId == row.PosReconciliationVoucherId)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        // The transactions this voucher was posted for (from the
        // history, so a reversed voucher still knows them)
        var posted =
            await _context
                .Set<PosReconciliationHistory>()
                .AsNoTracking()
                .Where(x => x.VoucherNo == row.VoucherNo
                            && (x.Action == "Settle" || x.Action == "Reject"))
                .OrderBy(x => x.PosReconciliationHistoryId)
                .Select(x => new { x.PosReconciliationId, x.Fee, x.StandardFee, x.FeeEdited, x.FeeReason })
                .ToListAsync();

        // The last action of each transaction in this voucher
        var lastPosted =
            posted
                .GroupBy(x => x.PosReconciliationId)
                .ToDictionary(g => g.Key, g => g.Last());

        List<long> stateIds =
            posted.Select(x => x.PosReconciliationId).Distinct().ToList();

        List<PosReconciliations> states =
            await _context
                .Set<PosReconciliations>()
                .AsNoTracking()
                .Where(x => stateIds.Contains(x.PosReconciliationId))
                .OrderBy(x => x.SourceVoucherNo)
                .ThenBy(x => x.SourcePaymentId)
                .ToListAsync();

        return new PosReconciliationVoucherDto
        {
            Id = row.PosReconciliationVoucherId,
            VoucherNo = row.VoucherNo,
            VoucherType = row.VoucherType,
            Purpose = row.Purpose,
            VoucherDate = Text(row.VoucherDate),
            BranchId = row.BranchId,
            BranchName = row.BranchName,
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
                        new PosReconciliationSourceDto
                        {
                            PaymentId = x.SourcePaymentId,
                            TransactionRef = x.TransactionRef,
                            CardName = x.CardName,
                            AccountCode = x.AccountCode,
                            AccountName = x.AccountName,
                            SourceVoucherType = x.SourceVoucherType,
                            SourceVoucherId = x.SourceVoucherId,
                            SourceVoucherNo = x.SourceVoucherNo,
                            ReceiptDate = Text(x.ReceiptDate),
                            PartyName = x.PartyName,
                            GrossAmount = x.GrossAmount,
                            Fee = lastPosted.GetValueOrDefault(x.PosReconciliationId)?.Fee ?? 0,
                            StandardFee = lastPosted.GetValueOrDefault(x.PosReconciliationId)?.StandardFee ?? 0,
                            FeeEdited = lastPosted.GetValueOrDefault(x.PosReconciliationId)?.FeeEdited ?? false,
                            FeeReason = lastPosted.GetValueOrDefault(x.PosReconciliationId)?.FeeReason ?? string.Empty
                        })
                .ToList(),
            Lines = lines
                .Select(
                    x =>
                        new PosReconciliationVoucherLineDto
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

    public async Task<List<PosAutoSettlementRunDto>>
        GetAutoRunsAsync
        (
            int days
        )
    {
        DateOnly from =
            BusinessToday().AddDays(-Math.Clamp(days, 1, 366));

        return await _context
            .Set<PosAutoSettlementRuns>()
            .AsNoTracking()
            .Where(x => x.RunDate >= from)
            .OrderByDescending(x => x.RunDate)
            .ThenByDescending(x => x.PosAutoSettlementRunId)
            .Select(
                x =>
                    new PosAutoSettlementRunDto
                    {
                        Id = x.PosAutoSettlementRunId,
                        RunDate = x.RunDate.ToString(DateFormat, CultureInfo.InvariantCulture),
                        BankLedgerCode = x.BankLedgerCode,
                        BankLedgerName = x.BankLedgerName,
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
    // Settle (Pending → Settled)
    //
    // One linked bank account per save; one RRV per branch.
    //===========================================================

    public async Task<PosActionResultDto>
        SettleAsync
        (
            PosSettleDto dto,
            long userId
        )
    {
        List<PosSettleItemDto> items =
            (dto?.Items ?? new List<PosSettleItemDto>())
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

        string bankCode =
            (dto!.BankLedgerCode ?? string.Empty).Trim();

        if (bankCode.Length == 0)
        {
            throw new InvalidOperationException(
                "Select the bank account to settle into.");
        }

        DateOnly date =
            ParseDate(dto.SettlementDate, "Settlement date");

        string userNarration =
            Limit(dto.Narration, 500);

        if (userNarration.Length == 0)
        {
            throw new InvalidOperationException(
                "The detail narration is required.");
        }

        bool editFee =
            await IsSwitchOnAsync(EditChargesSwitch, false);

        PosActionResultDto result =
            new();

        await InTransactionAsync(
            async () =>
            {
                DateTime now =
                    DateTime.UtcNow;

                await LockSourcesAsync(items.Select(x => x.PaymentId));

                Dictionary<string, (string Code, string Name)> links =
                    await AccountBanksAsync();

                List<WorkItem> work =
                    new();

                foreach (PosSettleItemDto item in items)
                {
                    SourceLine source =
                        await LoadSourceAsync(item.PaymentId);

                    RequireBank(source, bankCode, links);

                    PosReconciliations state =
                        await StateAsync(source, userId, now);

                    RequireStatus(state, "settled", Pending);

                    await EnsureDateAsync(date, source, $"{TxnLabel(source)} : settlement date");

                    decimal standardFee =
                        source.SaleChargeAmount;

                    decimal fee =
                        editFee && item.Fee.HasValue
                            ? item.Fee.Value
                            : standardFee;

                    if (fee < 0 || !IsMoney(fee) || fee > source.Gross)
                    {
                        throw new InvalidOperationException(
                            $"{TxnLabel(source)} : the charges must be 0 to {source.Gross:N2} with at most 2 decimals.");
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

                (VoucherLedgerDto bank, VoucherLedgerDto? charges, Dictionary<string, VoucherLedgerDto> accounts) =
                    await SettlementLedgersAsync(bankCode, work.Select(x => x.Source.AccountCode));

                if (work.Any(x => x.Fee > 0) && charges == null)
                {
                    throw new InvalidOperationException(
                        $"POS Charges ledger ({PosChargesLedger}) was not found.");
                }

                foreach (IGrouping<long, WorkItem> batch in work
                             .GroupBy(x => x.Source.BranchId)
                             .OrderBy(x => x.Key))
                {
                    PosReconciliationVouchers voucher =
                        await PostSettlementAsync(
                            batch.ToList(),
                            bank,
                            charges,
                            accounts,
                            date,
                            userNarration,
                            false,
                            userId,
                            "System",
                            now);

                    result.VoucherNos.Add(voucher.VoucherNo);
                    result.VoucherIds.Add(voucher.PosReconciliationVoucherId);
                }

                await _context.SaveChangesAsync();

                result.TransactionCount = items.Count;
                result.Message =
                    $"{items.Count} card transaction(s) settled into {bank.LedgerName} : {string.Join(", ", result.VoucherNos)}.";
            });

        return result;
    }

    // The bank (checked), POS Charges, and the POS account ledgers
    private async Task<(VoucherLedgerDto Bank, VoucherLedgerDto? Charges, Dictionary<string, VoucherLedgerDto> Accounts)>
        SettlementLedgersAsync
        (
            string bankCode,
            IEnumerable<string> accountCodes
        )
    {
        List<string> accounts =
            accountCodes.Distinct().ToList();

        Dictionary<string, VoucherLedgerDto> ledgers =
            await _ledgerRepository.GetByCodesAsync(
                accounts
                    .Append(bankCode)
                    .Append(PosChargesLedger)
                    .Distinct());

        VoucherLedgerDto? bank =
            ledgers.GetValueOrDefault(bankCode);

        string problem =
            BankProblem(bankCode, bank);

        if (problem.Length > 0)
        {
            throw new InvalidOperationException(problem);
        }

        Dictionary<string, VoucherLedgerDto> accountLedgers =
            new();

        foreach (string code in accounts)
        {
            accountLedgers[code] =
                Need(ledgers, code, "POS account ledger");
        }

        return (bank!, ledgers.GetValueOrDefault(PosChargesLedger), accountLedgers);
    }

    //===========================================================
    // Saves + posts one settlement RRV (one group per
    // transaction) and moves its transactions to Settled
    //
    //   Dr linked Bank   net
    //   Dr POS Charges   charges
    //   Cr POS account   gross
    //===========================================================

    private async Task<PosReconciliationVouchers>
        PostSettlementAsync
        (
            List<WorkItem> items,
            VoucherLedgerDto bank,
            VoucherLedgerDto? charges,
            Dictionary<string, VoucherLedgerDto> accounts,
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

        List<PosReconciliationVoucherLines> lines =
            new();

        int group = 0;

        foreach (WorkItem item in items)
        {
            group++;

            SourceLine source =
                item.Source;

            VoucherLedgerDto account =
                accounts[source.AccountCode];

            decimal net =
                source.Gross - item.Fee;

            string text =
                string.IsNullOrWhiteSpace(item.Notes)
                    ? $"Card {RefText(source)} of {source.PartyName} settled ({source.VoucherNo})"
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
                        $"Card charges on {RefText(source)}", true));
            }

            lines.Add(
                Line(group, source.TransactionRef, account.LedgerCode, account.LedgerName, account.SubGroupName,
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
                    + $"{items.Count} card transaction(s) settled into {bank.LedgerName} ({sourceText})",
                    500);

        PosReconciliationVouchers voucher =
            new()
            {
                VoucherNo = number.VoucherNo,
                VoucherType = VoucherTypes.ReceiptReconciliation,
                Purpose = SettlementPurpose,
                VoucherDate = date,
                BranchId = branchId,
                BranchName = Limit(items[0].Source.BranchName, 200),
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
            PosReconciliations state =
                item.State;

            state.Status = Settled;
            state.SettledDate = date;
            state.SettlementVoucherId = voucher.PosReconciliationVoucherId;
            state.SettlementVoucherNo = voucher.VoucherNo;
            state.BankLedgerCode = bank.LedgerCode;
            state.BankLedgerName = Limit(bank.LedgerName, 250);
            // % of the amount, as the Receipt Voucher saves it
            state.FeePercent =
                item.Fee == state.SaleChargeAmount || state.Amount == 0
                    ? state.SaleChargePercent
                    : decimal.Round(item.Fee * 100 / state.Amount, 4);
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

            AddActivity(state.PosReconciliationId, "Settle",
                isAuto ? "POS Auto Settled" : "POS Settled",
                $"Card {RefText(item.Source)} of {state.PartyName} ({state.GrossAmount:N2}, {state.AccountName}) settled in {voucher.VoucherNo} into {bank.LedgerName}, charges {item.Fee:N2}.{EditedText(state)}",
                userId, userName, now);
        }

        return voucher;
    }


    //===========================================================
    // Reject (Pending → Rejected)
    //
    // One RRV (Journal) per branch; the bank account is only the
    // batch filter (nothing is posted to it).
    //   Dr customer line(s)         amount
    //   Dr POS Charges Recovery     charge the customer paid
    //   Cr POS account              gross
    //===========================================================

    public async Task<PosActionResultDto>
        RejectAsync
        (
            PosRejectDto dto,
            long userId
        )
    {
        List<PosRejectItemDto> items =
            (dto?.Items ?? new List<PosRejectItemDto>())
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

        // Optional for a reject (nothing is posted to the bank); kept
        // on the voucher when given
        string bankCode =
            (dto!.BankLedgerCode ?? string.Empty).Trim();

        string reason =
            RequireReason(dto.Reason, "reject");

        DateOnly date =
            ParseDate(dto.RejectDate, "Reject date");

        PosActionResultDto result =
            new();

        await InTransactionAsync(
            async () =>
            {
                DateTime now =
                    DateTime.UtcNow;

                await LockSourcesAsync(items.Select(x => x.PaymentId));

                List<WorkItem> work =
                    new();

                foreach (PosRejectItemDto item in items)
                {
                    SourceLine source =
                        await LoadSourceAsync(item.PaymentId);

                    PosReconciliations state =
                        await StateAsync(source, userId, now);

                    RequireStatus(state, "rejected", Pending);

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
                        work.Select(x => x.Source.AccountCode)
                            .Append(PosRecoveryLedger)
                            .Concat(bankCode.Length > 0 ? new[] { bankCode } : Array.Empty<string>())
                            .Distinct());

                VoucherLedgerDto? recovery =
                    ledgers.GetValueOrDefault(PosRecoveryLedger);

                if (work.Any(x => x.Source.CustomerCharge > 0) && recovery == null)
                {
                    throw new InvalidOperationException(
                        $"POS Charges Recovery ledger ({PosRecoveryLedger}) was not found.");
                }

                string bankName =
                    bankCode.Length > 0
                        ? ledgers.GetValueOrDefault(bankCode)?.LedgerName ?? bankCode
                        : string.Empty;

                foreach (IGrouping<long, WorkItem> batch in work
                             .GroupBy(x => x.Source.BranchId)
                             .OrderBy(x => x.Key))
                {
                    List<WorkItem> rows =
                        batch.ToList();

                    VoucherNumberDto number =
                        await _numberService.NextAsync(VoucherTypes.ReceiptReconciliation, batch.Key, date);

                    List<PosReconciliationVoucherLines> lines =
                        new();

                    int group = 0;

                    foreach (WorkItem row in rows)
                    {
                        group++;

                        SourceLine source =
                            row.Source;

                        VoucherLedgerDto account =
                            Need(ledgers, source.AccountCode, "POS account ledger");

                        string text =
                            string.IsNullOrWhiteSpace(row.Notes)
                                ? $"Card {RefText(source)} rejected ({source.VoucherNo})"
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
                                    $"Card charge recovery reversed on {RefText(source)}", true));
                        }

                        lines.Add(
                            Line(group, source.TransactionRef, account.LedgerCode, account.LedgerName, account.SubGroupName,
                                string.Empty, string.Empty, 0, source.Gross, text, false));
                    }

                    decimal amount =
                        rows.Sum(x => x.Source.Gross);

                    PosReconciliationVouchers voucher =
                        new()
                        {
                            VoucherNo = number.VoucherNo,
                            VoucherType = VoucherTypes.ReceiptReconciliation,
                            Purpose = RejectPurpose,
                            VoucherDate = date,
                            BranchId = batch.Key,
                            BranchName = Limit(rows[0].Source.BranchName, 200),
                            BankLedgerCode = bankCode,
                            BankLedgerName = Limit(bankName, 250),
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
                        PosReconciliations state =
                            row.State;

                        state.Status = Rejected;
                        state.RejectDate = date;
                        state.RejectReason = reason;
                        state.RejectVoucherId = voucher.PosReconciliationVoucherId;
                        state.RejectVoucherNo = voucher.VoucherNo;
                        state.ShortNotes = row.Notes;
                        Touch(state, userId, now);

                        AddHistory(state, "Reject", date, userId, now,
                            ledgerCode: row.Source.AccountCode,
                            ledgerName: row.Source.AccountName,
                            voucherNo: voucher.VoucherNo,
                            reason: reason);

                        AddActivity(state.PosReconciliationId, "Reject", "POS Rejected",
                            $"Card {RefText(row.Source)} of {state.PartyName} ({state.GrossAmount:N2}) rejected in {voucher.VoucherNo}. Reason : {reason}",
                            userId, "System", now);
                    }

                    result.VoucherNos.Add(voucher.VoucherNo);
                    result.VoucherIds.Add(voucher.PosReconciliationVoucherId);
                }

                await _context.SaveChangesAsync();

                result.TransactionCount = items.Count;
                result.Message =
                    $"{items.Count} card transaction(s) rejected : {string.Join(", ", result.VoucherNos)}.";
            });

        return result;
    }


    //===========================================================
    // Undo : Settled → Pending (the whole RRV) or
    //        Rejected → Pending (its RRV)
    //===========================================================

    public async Task<PosActionResultDto>
        UndoAsync
        (
            PosUndoDto dto,
            long userId
        )
    {
        string reason =
            RequireReason(dto?.Reason, "undo");

        DateOnly date =
            OptionalDate(dto?.UndoDate, "Undo date");

        long paymentId =
            dto!.PaymentId;

        PosActionResultDto result =
            new();

        await InTransactionAsync(
            async () =>
            {
                DateTime now =
                    DateTime.UtcNow;

                var picked =
                    await _context
                        .Set<PosReconciliations>()
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
                            .Set<PosReconciliations>()
                            .AsNoTracking()
                            .Where(x => x.SettlementVoucherId == voucherId && x.Status == Settled)
                            .OrderBy(x => x.SourcePaymentId)
                            .Select(x => x.SourcePaymentId)
                            .ToListAsync()
                        : await _context
                            .Set<PosReconciliations>()
                            .AsNoTracking()
                            .Where(x => x.RejectVoucherId == voucherId && x.Status == Rejected)
                            .OrderBy(x => x.SourcePaymentId)
                            .Select(x => x.SourcePaymentId)
                            .ToListAsync();

                await LockSourcesAsync(paymentIds.Append(paymentId));

                PosReconciliationVouchers voucher =
                    await LoadVoucherAsync(voucherId);

                List<PosReconciliations> states =
                    await _context
                        .Set<PosReconciliations>()
                        .Where(x => x.SourceVoucherType == SourceType && paymentIds.Contains(x.SourcePaymentId))
                        .ToListAsync();

                PosReconciliations? pickedState =
                    states.FirstOrDefault(x => x.SourcePaymentId == paymentId);

                long? stillIn =
                    settled
                        ? pickedState?.SettlementVoucherId
                        : pickedState?.RejectVoucherId;

                if (pickedState == null || stillIn != voucher.PosReconciliationVoucherId)
                {
                    throw new InvalidOperationException(
                        "The transaction changed while undoing; refresh and try again.");
                }

                await ReverseVoucherAsync(voucher, date, reason, userId, now);

                foreach (PosReconciliations state in states.OrderBy(x => x.SourcePaymentId))
                {
                    if (settled)
                    {
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
                        state.RejectDate = null;
                        state.RejectReason = string.Empty;
                        state.RejectVoucherId = null;
                        state.RejectVoucherNo = string.Empty;
                    }

                    state.Status = Pending;
                    state.ShortNotes = string.Empty;
                    Touch(state, userId, now);

                    string action =
                        settled ? "Undo Settle" : "Undo Reject";

                    AddHistory(state, action, date, userId, now,
                        voucherNo: voucher.VoucherNo,
                        reason: reason);

                    AddActivity(state.PosReconciliationId, action,
                        settled ? "POS Settlement Reversed" : "POS Reject Reversed",
                        $"Card {(string.IsNullOrWhiteSpace(state.TransactionRef) ? state.SourceVoucherNo : "**** " + state.TransactionRef)} back to Pending; {voucher.VoucherNo} reversed. Reason : {reason}",
                        userId, "System", now);
                }

                await _context.SaveChangesAsync();

                result.VoucherNos.Add(voucher.VoucherNo);
                result.VoucherIds.Add(voucher.PosReconciliationVoucherId);
                result.TransactionCount = states.Count;
                result.Message =
                    $"{voucher.VoucherNo} reversed; {states.Count} transaction(s) back to Pending.";
            });

        return result;
    }


    //===========================================================
    // Auto Settlement (nightly; switch 0054)
    //
    // Run dates : from the day after the last Completed date up
    // to today (today only from 23:59 Bangladesh time); the first
    // run ever starts at the last due date; never more than 31
    // days back. Switch OFF : the date is marked Completed with
    // nothing done (so turning it ON later does not back-date
    // vouchers).
    //===========================================================

    public async Task<PosAutoSettlementResultDto>
        RunAutoSettlementAsync
        (
            CancellationToken cancellationToken
        )
    {
        PosAutoSettlementResultDto result =
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
                .Set<PosAutoSettlementRuns>()
                .AsNoTracking()
                .Where(x => x.Outcome == RunCompleted)
                .Select(x => (DateOnly?)x.RunDate)
                .MaxAsync(cancellationToken);

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
            $"POS Auto Settlement {string.Join(", ", result.RunDates)} : {result.Settled} voucher(s), {result.Skipped} skipped, {result.Failed} failed.";

        return result;
    }

    // One run date : every linked bank account + branch with card
    // receipts due
    private async Task RunDateAsync
    (
        DateOnly date,
        int days,
        PosAutoSettlementResultDto result,
        CancellationToken cancellationToken
    )
    {
        bool done =
            await _context
                .Set<PosAutoSettlementRuns>()
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
                where p.Mode == PosMode
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

        Dictionary<long, PosReconciliations> states =
            await _context
                .Set<PosReconciliations>()
                .AsNoTracking()
                .Where(x => x.SourceVoucherType == SourceType)
                .ToDictionaryAsync(x => x.SourcePaymentId, cancellationToken);

        Dictionary<string, (string Code, string Name)> links =
            await AccountBanksAsync();

        var due =
            rows
                .Where(
                    x =>
                    {
                        PosReconciliations? state =
                            states.GetValueOrDefault(x.PaymentId);

                        return (state == null || (state.Status == Pending && !state.SkipAuto))
                               && DueDate(x.VoucherDate, days) <= date;
                    })
                .GroupBy(
                    x =>
                        new
                        {
                            BankCode = links.GetValueOrDefault(x.LedgerCode ?? string.Empty).Code ?? string.Empty,
                            x.BranchId
                        })
                .OrderBy(x => x.Key.BankCode)
                .ThenBy(x => x.Key.BranchId)
                .ToList();

        foreach (var batch in due)
        {
            cancellationToken.ThrowIfCancellationRequested();

            List<long> paymentIds =
                batch.Select(x => x.PaymentId).OrderBy(x => x).ToList();

            string bankCode =
                batch.Key.BankCode;

            string bankName =
                links.Values.FirstOrDefault(x => x.Code == bankCode).Name ?? bankCode;

            // No linked bank : nothing to settle into; left Pending
            // without a log row every night (the list shows it)
            if (bankCode.Length == 0)
            {
                continue;
            }

            // Things that only a person can fix : skipped, logged
            string skip =
                string.Empty;

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
                await LogRunAsync(date, bankCode, bankName, batch.Key.BranchId,
                    RunSkipped, null, string.Empty, paymentIds.Count, 0,
                    $"{skip} (still Pending : tried again on the next run date)");

                result.Skipped++;

                continue;
            }

            try
            {
                PosReconciliationVouchers? voucher =
                    null;

                await InTransactionAsync(
                    async () =>
                    {
                        DateTime now =
                            DateTime.UtcNow;

                        await LockSourcesAsync(paymentIds);

                        List<WorkItem> work =
                            new();

                        foreach (long paymentId in paymentIds)
                        {
                            SourceLine source =
                                await LoadSourceAsync(paymentId, requirePosted: false);

                            // Changed since the list was read : leave it
                            if (source.VoucherStatus != VoucherStatuses.Posted
                                || (links.GetValueOrDefault(source.AccountCode).Code ?? string.Empty) != bankCode)
                            {
                                continue;
                            }

                            PosReconciliations state =
                                await StateAsync(source, SystemUserId, now);

                            if (state.Status != Pending || state.SkipAuto)
                            {
                                continue;
                            }

                            work.Add(
                                new WorkItem
                                {
                                    Source = source,
                                    State = state,
                                    Fee = source.SaleChargeAmount,
                                    StandardFee = source.SaleChargeAmount,
                                    Notes = string.Empty
                                });
                        }

                        if (work.Count == 0)
                        {
                            return;
                        }

                        (VoucherLedgerDto bank, VoucherLedgerDto? charges, Dictionary<string, VoucherLedgerDto> accounts) =
                            await SettlementLedgersAsync(bankCode, work.Select(x => x.Source.AccountCode));

                        if (work.Any(x => x.Fee > 0) && charges == null)
                        {
                            throw new InvalidOperationException(
                                $"POS Charges ledger ({PosChargesLedger}) was not found.");
                        }

                        voucher =
                            await PostSettlementAsync(
                                work,
                                bank,
                                charges,
                                accounts,
                                date,
                                string.Empty,
                                true,
                                SystemUserId,
                                SystemUserName,
                                now);

                        AddRunRow(date, bankCode, bank.LedgerName, batch.Key.BranchId,
                            RunSettled, voucher.PosReconciliationVoucherId, voucher.VoucherNo,
                            work.Count, voucher.Amount, $"Settled into {bank.LedgerName}.");

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

                await LogRunAsync(date, bankCode, bankName, batch.Key.BranchId,
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

        await MarkCompletedAsync(date, $"{due.Count} bank / branch batch(es) checked.");
    }

    private async Task MarkCompletedAsync
    (
        DateOnly date,
        string message
    )
    {
        bool exists =
            await _context
                .Set<PosAutoSettlementRuns>()
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
        string bankCode,
        string bankName,
        long branchId,
        string outcome,
        long? voucherId,
        string voucherNo,
        int count,
        decimal amount,
        string message
    )
    {
        AddRunRow(date, bankCode, bankName, branchId, outcome, voucherId, voucherNo, count, amount, message);

        await _context.SaveChangesAsync();
    }

    private void AddRunRow
    (
        DateOnly date,
        string bankCode,
        string bankName,
        long branchId,
        string outcome,
        long? voucherId,
        string voucherNo,
        int count,
        decimal amount,
        string message
    )
    {
        _context.Set<PosAutoSettlementRuns>().Add(
            new PosAutoSettlementRuns
            {
                RunDate = date,
                BankLedgerCode = Limit(bankCode, 40),
                BankLedgerName = Limit(bankName, 250),
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
            PosReconciliationVouchers voucher,
            List<PosReconciliationVoucherLines> lines,
            long userId
        )
    {
        _context.Set<PosReconciliationVouchers>().Add(voucher);

        await _context.SaveChangesAsync();

        int lineNo = 0;

        foreach (PosReconciliationVoucherLines line in lines)
        {
            line.PosReconciliationVoucherId = voucher.PosReconciliationVoucherId;
            line.LineNo = ++lineNo;
        }

        _context.Set<PosReconciliationVoucherLines>().AddRange(lines);

        await _postingService.PostAsync(
            new VoucherPostingRequest
            {
                VoucherType = voucher.VoucherType,
                VoucherId = voucher.PosReconciliationVoucherId,
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

    private static PosReconciliationVoucherLines Line
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
        return new PosReconciliationVoucherLines
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
    // Load a card transaction with its Receipt Voucher (locked)
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
                "Card transaction not found.");

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
                $"Receipt Voucher {voucher.VoucherNo} is {voucher.Status}; only card receipts of a posted voucher can be reconciled.");
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

        if (payment.Mode != PosMode)
        {
            throw new InvalidOperationException(
                "This payment row is not a card (POS) receipt.");
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
            AccountCode = payment.LedgerCode ?? string.Empty,
            AccountName = payment.LedgerName ?? string.Empty,
            CardName = payment.CardName ?? string.Empty,
            TransactionRef = payment.TransactionRef ?? string.Empty,
            Amount = payment.Amount,
            CustomerCharge = IsCustomerCharge(payment.ChargeBorneBy) ? payment.ChargeAmount : 0,
            SaleChargePercent = payment.ChargePercent,
            SaleChargeAmount = payment.ChargeAmount,
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

    private async Task<PosReconciliations>
        StateAsync
        (
            SourceLine source,
            long userId,
            DateTime now
        )
    {
        PosReconciliations? state =
            await _context
                .Set<PosReconciliations>()
                .FirstOrDefaultAsync(
                    x => x.SourceVoucherType == SourceType
                         && x.SourcePaymentId == source.PaymentId);

        if (state != null)
        {
            return state;
        }

        state =
            new PosReconciliations
            {
                SourceVoucherType = SourceType,
                SourceVoucherId = source.VoucherId,
                SourceVoucherNo = source.VoucherNo,
                SourcePaymentId = source.PaymentId,
                ReceiptDate = source.VoucherDate,
                BranchId = source.BranchId,
                BranchName = Limit(source.BranchName, 200),
                PartyName = Limit(source.PartyName, 250),
                AccountCode = source.AccountCode,
                AccountName = Limit(source.AccountName, 250),
                CardName = Limit(source.CardName, 150),
                TransactionRef = Limit(source.TransactionRef, 100),
                Amount = source.Amount,
                CustomerCharge = source.CustomerCharge,
                GrossAmount = source.Gross,
                SaleChargePercent = source.SaleChargePercent,
                SaleChargeAmount = source.SaleChargeAmount,
                Status = Pending,
                CreatedBy = userId,
                CreatedDate = now
            };

        _context.Set<PosReconciliations>().Add(state);

        // The id is needed by the history rows
        await _context.SaveChangesAsync();

        return state;
    }

    private static void Touch
    (
        PosReconciliations state,
        long userId,
        DateTime now
    )
    {
        state.ModifiedBy = userId;
        state.ModifiedDate = now;
    }

    private static void RequireStatus
    (
        PosReconciliations state,
        string action,
        string status
    )
    {
        if (!string.Equals(state.Status, status, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                $"Card {(string.IsNullOrWhiteSpace(state.TransactionRef) ? state.SourceVoucherNo : "**** " + state.TransactionRef)} is {state.Status}; only a {status} transaction can be {action}.");
        }
    }

    // The transaction's POS account must settle into the batch's
    // bank account
    private static void RequireBank
    (
        SourceLine source,
        string bankCode,
        Dictionary<string, (string Code, string Name)> links
    )
    {
        (string code, string name) =
            links.GetValueOrDefault(source.AccountCode);

        if (!SameText(code, bankCode))
        {
            throw new InvalidOperationException(
                string.IsNullOrWhiteSpace(code)
                    ? $"{TxnLabel(source)} : POS account {source.AccountName} has no linked bank account."
                    : $"{TxnLabel(source)} : POS account {source.AccountName} settles into {name}, not the selected bank account.");
        }
    }


    //===========================================================
    // POS accounts → linked bank
    //===========================================================

    // POS account code → the code + name of its linked bank account
    private async Task<Dictionary<string, (string Code, string Name)>>
        AccountBanksAsync()
    {
        // Deleted POS accounts too : their receipts still settle
        // into the bank they were linked to
        var accounts =
            await _context
                .Set<PosAccountsEntity>()
                .AsNoTracking()
                .OrderBy(x => x.IsDeleted)
                .Select(x => new { x.POSAccountCode, x.LinkedBankAccount })
                .ToListAsync();

        Dictionary<string, string> codes =
            await BankCodesAsync(accounts.Select(x => x.LinkedBankAccount));

        Dictionary<string, VoucherLedgerDto> banks =
            await _ledgerRepository.GetByCodesAsync(
                codes.Values.Where(x => x.Length > 0).Distinct());

        Dictionary<string, (string Code, string Name)> result =
            new();

        foreach (var account in accounts)
        {
            // A live account wins over a deleted one with the same
            // code (live rows come first)
            if (result.ContainsKey(account.POSAccountCode))
            {
                continue;
            }

            string code =
                codes.GetValueOrDefault((account.LinkedBankAccount ?? string.Empty).Trim()) ?? string.Empty;

            result[account.POSAccountCode] =
                (code, banks.GetValueOrDefault(code)?.LedgerName ?? code);
        }

        return result;
    }

    // LinkedBankAccount holds the BankAccountCode. A POS account
    // saved before the switch to codes may still hold the bank's
    // Display Name : it is turned into the code here (POSAccounts_
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

    private static bool IsCustomerCharge
    (
        string? borneBy
    )
    {
        // Exactly as the Receipt Voucher posting reads it
        return borneBy == "Customer";
    }

    private static string RefText
    (
        SourceLine source
    )
    {
        return string.IsNullOrWhiteSpace(source.TransactionRef)
            ? source.VoucherNo
            : $"**** {source.TransactionRef}";
    }

    private static string TxnLabel
    (
        SourceLine source
    )
    {
        return string.IsNullOrWhiteSpace(source.TransactionRef)
            ? $"Card receipt of {source.VoucherNo}"
            : $"Card **** {source.TransactionRef}";
    }


    //===========================================================
    // Voucher : load (locked) and reverse
    //===========================================================

    private async Task<PosReconciliationVouchers>
        LoadVoucherAsync
        (
            long? id
        )
    {
        if (id == null)
        {
            throw new KeyNotFoundException(
                "POS reconciliation voucher not found.");
        }

        await _context.Database.ExecuteSqlInterpolatedAsync(
            $@"SELECT 1 FROM ""PosReconciliationVouchers"" WHERE ""PosReconciliationVoucherId"" = {id.Value} FOR UPDATE");

        return await _context
                   .Set<PosReconciliationVouchers>()
                   .FirstOrDefaultAsync(x => x.PosReconciliationVoucherId == id.Value)
               ??
               throw new KeyNotFoundException(
                   "POS reconciliation voucher not found.");
    }

    private async Task
        ReverseVoucherAsync
        (
            PosReconciliationVouchers voucher,
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
        PosReconciliations state
    )
    {
        return state.FeeEdited
            ? $" Charges changed from {state.StandardFee:N2} to {state.Fee:N2} · Reason: {state.FeeReason}."
            : string.Empty;
    }

    private void AddHistory
    (
        PosReconciliations state,
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
        _context.Set<PosReconciliationHistory>().Add(
            new PosReconciliationHistory
            {
                PosReconciliationId = state.PosReconciliationId,
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

    // Switch 0054 Value : working days after the receipt date
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