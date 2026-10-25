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

using SystemConfigurationsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.AccountsFinance.AccountsReconciliation;


//===============================================================
// Check Reconciliations Repository
//
// Received checks (Receipt Voucher, Mode Check)
//   Pending → Deposit (Deposit Slip DS-…, nothing posted)
//           → Clear   (RRV : Dr bank / Cr customer;
//                      optional charge Dr Bank Charges / Cr bank)
//           → or Dishonour (optional RRV : fee Dr Bank Charges /
//                      Cr bank; recovery Dr customer / Cr Cheque
//                      Dishonour Charges Recovery)
//             → Re-present (back to Pending, deposit again)
//
// Issued checks (Payment Voucher, Mode Check)
//   Pending → Clear (RRP : Dr supplier / payee / Cr bank;
//                    optional charge Dr Bank Charges / Cr bank)
//           → or Void (nothing posted)
//
// Undo : Deposit, Clear (reverses the WHOLE RRV / RRP : every
//        check in it goes back), Dishonour (reverses its RRV),
//        Void.
//
// One clearing voucher per bank account per batch; one journal
// group per check. Switch 0047 "Multi Check Deposit / Clearing"
// OFF : one check per deposit / clearing / dishonour.
//
// The source voucher posted only its non-check part; the check
// part belongs to the voucher's party lines in order after the
// non-check total, so each check is credited / debited to the
// same customer / supplier lines it stands for.
//===============================================================

public class CheckReconciliationsRepository : ICheckReconciliationsRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string ModuleName =
        "Accounts Finance";

    private const string EntityName =
        "CheckReconciliations";

    private const string DateFormat =
        "yyyy-MM-dd";

    private const string Received =
        "Received";

    private const string Issued =
        "Issued";

    private const string CheckMode =
        "Check";

    // Statuses
    private const string Pending = "Pending";

    private const string Deposited = "Deposited";

    private const string Cleared = "Cleared";

    private const string Dishonoured = "Dishonoured";

    private const string Voided = "Void";

    // Clearing voucher purpose / status
    private const string ClearingPurpose = "Clearing";

    private const string DishonourPurpose = "Dishonour";

    private const string Reversed = "Reversed";

    // Settings › System Configuration (read by code)
    //   0047 Multi Check Deposit / Clearing : several checks per
    //        deposit / clearing / dishonour (OFF = one check)
    private const string MultiCheckSwitch =
        "CFG-MOD-004-0047";

    //   0049 One Voucher Per Batch : ON = one RRV / RRP per bank
    //        account for the whole batch; OFF = one per source
    //        voucher (RV / PV)
    private const string OneVoucherPerBatchSwitch =
        "CFG-MOD-004-0049";

    //   0050 Dishonour Recovery : ON = a dishonour may recover
    //        charges from the payer; OFF = bank fee only
    private const string DishonourRecoverySwitch =
        "CFG-MOD-004-0050";

    // Ledgers (looked up by CODE)
    //   Bank Charges (expense)
    private const string BankChargesLedger =
        "GLR-004-001-001-00001";

    //   Cheque Dishonour Charges Recovery (income)
    private const string DishonourRecoveryLedger =
        "GLR-011-001-001-00004";

    // Deposit slip prefix (not a posted voucher)
    private const string SlipPrefix =
        "DS";


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

    public CheckReconciliationsRepository(
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

    // A party line's share of one check
    public sealed class PartySlice
    {
        public string LedgerType { get; set; } = string.Empty;

        public string LedgerCode { get; set; } = string.Empty;

        public string LedgerName { get; set; } = string.Empty;

        public string SubGroupName { get; set; } = string.Empty;

        public string PartyCode { get; set; } = string.Empty;

        public decimal Amount { get; set; }
    }

    // A check with its (locked) source voucher
    private sealed class SourceCheck
    {
        public string Direction { get; set; } = string.Empty;

        public string VoucherType { get; set; } = string.Empty;

        public long VoucherId { get; set; }

        public string VoucherNo { get; set; } = string.Empty;

        public DateOnly VoucherDate { get; set; }

        public long BranchId { get; set; }

        public string BranchName { get; set; } = string.Empty;

        public string PartyName { get; set; } = string.Empty;

        public long PaymentId { get; set; }

        public string CheckNo { get; set; } = string.Empty;

        public DateOnly? CheckDate { get; set; }

        public string CheckBank { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public string AccountLedgerCode { get; set; } = string.Empty;

        public string AccountLedgerName { get; set; } = string.Empty;

        public List<PartySlice> Parties { get; set; } = new();

        // Keeps the voucher's payment row in step
        public Action<string, string, DateOnly?> Sync { get; set; } =
            (_, _, _) => { };
    }


    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<CheckReconciliationDto>>
        GetAllAsync
        (
            string? direction
        )
    {
        string wanted =
            (direction ?? string.Empty).Trim();

        bool wantReceived =
            wanted.Length == 0 || wanted.Equals(Received, StringComparison.OrdinalIgnoreCase);

        bool wantIssued =
            wanted.Length == 0 || wanted.Equals(Issued, StringComparison.OrdinalIgnoreCase);

        List<CheckReconciliationDto> result =
            new();

        if (wantReceived)
        {
            var rows =
                await (
                    from p in _context.Set<ReceiptVoucherPayments>().AsNoTracking()
                    join v in _context.Set<ReceiptVoucher>().AsNoTracking()
                        on p.ReceiptVoucherId equals v.ReceiptVoucherId
                    where p.Mode == CheckMode
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
                        p.CheckNo,
                        p.CheckDate,
                        p.CheckBank,
                        p.Amount,
                        p.LedgerCode,
                        p.LedgerName
                    })
                .ToListAsync();

            Dictionary<long, CheckReconciliations> states =
                await StatesAsync(Received);

            result.AddRange(
                rows.Select(
                    x =>
                        ToDto(
                            states.GetValueOrDefault(x.PaymentId),
                            Received,
                            VoucherTypes.Receipt,
                            x.PaymentId,
                            x.VoucherId,
                            x.VoucherNo,
                            x.VoucherDate,
                            x.BranchId,
                            x.BranchName,
                            x.PartyName,
                            x.CheckNo,
                            x.CheckDate,
                            x.CheckBank,
                            x.Amount,
                            x.LedgerCode,
                            x.LedgerName)));
        }

        if (wantIssued)
        {
            var rows =
                await (
                    from p in _context.Set<PaymentVoucherPayments>().AsNoTracking()
                    join v in _context.Set<PaymentVoucher>().AsNoTracking()
                        on p.PaymentVoucherId equals v.PaymentVoucherId
                    where p.Mode == CheckMode
                          && v.Status == VoucherStatuses.Posted
                          && !v.IsDeleted
                    select new
                    {
                        PaymentId = p.PaymentVoucherPaymentId,
                        VoucherId = v.PaymentVoucherId,
                        v.VoucherNo,
                        v.VoucherDate,
                        v.BranchId,
                        v.BranchName,
                        v.PartyName,
                        p.PayeeName,
                        p.CheckNo,
                        p.CheckDate,
                        p.CheckBank,
                        p.Amount,
                        p.LedgerCode,
                        p.LedgerName
                    })
                .ToListAsync();

            Dictionary<long, CheckReconciliations> states =
                await StatesAsync(Issued);

            result.AddRange(
                rows.Select(
                    x =>
                        ToDto(
                            states.GetValueOrDefault(x.PaymentId),
                            Issued,
                            VoucherTypes.Payment,
                            x.PaymentId,
                            x.VoucherId,
                            x.VoucherNo,
                            x.VoucherDate,
                            x.BranchId,
                            x.BranchName,
                            string.IsNullOrWhiteSpace(x.PayeeName) ? x.PartyName : x.PayeeName,
                            x.CheckNo,
                            x.CheckDate,
                            x.CheckBank,
                            x.Amount,
                            x.LedgerCode,
                            x.LedgerName)));
        }

        // Oldest check first (the queue to work through)
        return result
            .OrderBy(x => x.CheckDate)
            .ThenBy(x => x.SourceVoucherNo)
            .ThenBy(x => x.PaymentId)
            .ToList();
    }

    private async Task<Dictionary<long, CheckReconciliations>>
        StatesAsync
        (
            string direction
        )
    {
        return await _context
            .Set<CheckReconciliations>()
            .AsNoTracking()
            .Where(x => x.Direction == direction)
            .ToDictionaryAsync(x => x.SourcePaymentId);
    }

    private static CheckReconciliationDto ToDto
    (
        CheckReconciliations? state,
        string direction,
        string voucherType,
        long paymentId,
        long voucherId,
        string voucherNo,
        DateOnly voucherDate,
        long branchId,
        string branchName,
        string partyName,
        string checkNo,
        DateOnly? checkDate,
        string checkBank,
        decimal amount,
        string ledgerCode,
        string ledgerName
    )
    {
        return new CheckReconciliationDto
        {
            Direction = direction,
            PaymentId = paymentId,
            CheckReconciliationId = state?.CheckReconciliationId ?? 0,
            SourceVoucherType = voucherType,
            SourceVoucherId = voucherId,
            SourceVoucherNo = voucherNo,
            VoucherDate = Text(voucherDate),
            BranchId = branchId,
            BranchName = branchName,
            CheckNo = checkNo,
            CheckDate = Text(checkDate),
            CheckBank = checkBank,
            PartyName = partyName,
            Amount = amount,
            AccountLedgerCode = ledgerCode,
            AccountLedgerName = ledgerName,
            Status = state?.Status ?? Pending,
            DepositDate = Text(state?.DepositDate),
            DepositSlipId = state?.DepositSlipId,
            DepositSlipNo = state?.DepositSlipNo ?? string.Empty,
            DepositLedgerCode = state?.DepositLedgerCode ?? string.Empty,
            DepositLedgerName = state?.DepositLedgerName ?? string.Empty,
            ClearedDate = Text(state?.ClearedDate),
            ClearingVoucherId = state?.ClearingVoucherId,
            ClearingVoucherNo = state?.ClearingVoucherNo ?? string.Empty,
            ClearingCharge = state?.ClearingCharge ?? 0,
            DishonourDate = Text(state?.DishonourDate),
            DishonourReason = state?.DishonourReason ?? string.Empty,
            DishonourFee = state?.DishonourFee ?? 0,
            DishonourRecovery = state?.DishonourRecovery ?? 0,
            DishonourVoucherId = state?.DishonourVoucherId,
            DishonourVoucherNo = state?.DishonourVoucherNo ?? string.Empty,
            DishonourCount = state?.DishonourCount ?? 0,
            VoidDate = Text(state?.VoidDate),
            VoidReason = state?.VoidReason ?? string.Empty
        };
    }


    //===========================================================
    // History of one check
    //===========================================================

    public async Task<List<CheckReconciliationHistoryDto>>
        GetCheckHistoryAsync
        (
            string direction,
            long paymentId
        )
    {
        string dir =
            ParseDirection(direction);

        long? stateId =
            await _context
                .Set<CheckReconciliations>()
                .AsNoTracking()
                .Where(x => x.Direction == dir && x.SourcePaymentId == paymentId)
                .Select(x => (long?)x.CheckReconciliationId)
                .FirstOrDefaultAsync();

        if (stateId == null)
        {
            return new List<CheckReconciliationHistoryDto>();
        }

        List<CheckReconciliationHistory> rows =
            await _context
                .Set<CheckReconciliationHistory>()
                .AsNoTracking()
                .Where(x => x.CheckReconciliationId == stateId.Value)
                .OrderByDescending(x => x.PerformedDate)
                .ThenByDescending(x => x.CheckReconciliationHistoryId)
                .ToListAsync();

        return rows
            .Select(
                x =>
                    new CheckReconciliationHistoryDto
                    {
                        Id = x.CheckReconciliationHistoryId,
                        Action = x.Action,
                        ActionDate = Text(x.ActionDate),
                        Status = x.Status,
                        LedgerName = x.LedgerName,
                        VoucherNo = x.VoucherNo,
                        DepositSlipNo = x.DepositSlipNo,
                        Charge = x.Charge,
                        Recovery = x.Recovery,
                        Reason = x.Reason,
                        PerformedBy = x.PerformedBy,
                        PerformedDate = x.PerformedDate
                    })
            .ToList();
    }


    //===========================================================
    // Check Clearing Center : next number preview
    //
    // Deposit : the next Deposit Slip DS-<branch>-<FY>-<MM>-n
    // Clear / Dishonour : the next RRV (received) / RRP (issued)
    // Nothing is reserved; Save takes the real number.
    //===========================================================

    public async Task<CheckCenterDefaultsDto>
        GetDefaultsAsync
        (
            string direction,
            string mode,
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
            return new CheckCenterDefaultsDto
            {
                BranchId = branchId,
                Message = ex.Message
            };
        }

        CheckCenterDefaultsDto result =
            new()
            {
                BranchId = period.BranchId,
                BranchName = period.BranchName,
                FinancialYearName = period.FinancialYearName
            };

        if (string.Equals((mode ?? string.Empty).Trim(), "deposit", StringComparison.OrdinalIgnoreCase))
        {
            string prefix =
                $"{SlipPrefix}-{period.BranchDigits}-{period.FinancialYearCode}-{period.PeriodMonth:D2}-";

            List<string> taken =
                await _context
                    .Set<CheckDepositSlips>()
                    .AsNoTracking()
                    .Where(x => x.SlipNo.StartsWith(prefix))
                    .Select(x => x.SlipNo)
                    .ToListAsync();

            int next =
                taken
                    .Select(x => int.TryParse(x.Substring(prefix.Length), out int n) ? n : 0)
                    .DefaultIfEmpty(0)
                    .Max() + 1;

            result.VoucherNo =
                next > 99999
                    ? string.Empty
                    : $"{prefix}{next:D5}";

            return result;
        }

        string voucherType =
            ParseDirection(direction) == Received
                ? VoucherTypes.ReceiptReconciliation
                : VoucherTypes.PaymentReconciliation;

        try
        {
            result.VoucherNo =
                (await _numberService.PeekAsync(voucherType, branchId, date)).VoucherNo;
        }
        catch (InvalidOperationException ex)
        {
            result.Message = ex.Message;
        }

        return result;
    }


    //===========================================================
    // Deposit accounts : Bank, Collection Account, active, shared
    // or of the branch
    //===========================================================

    public async Task<List<CheckBankAccountDto>>
        GetDepositAccountsAsync
        (
            long branchId
        )
    {
        string branchName =
            await BranchNameAsync(branchId);

        List<VoucherLedgerDto> ledgers =
            await _ledgerRepository.GetAllAsync(true);

        return ledgers
            .Where(x => IsDepositAccount(x, branchName))
            .OrderBy(x => x.LedgerName)
            .Select(
                x =>
                    new CheckBankAccountDto
                    {
                        LedgerCode = x.LedgerCode,
                        LedgerName = x.LedgerName,
                        SubGroupName = x.SubGroupName,
                        Branch = x.Branch
                    })
            .ToList();
    }

    private static bool IsDepositAccount
    (
        VoucherLedgerDto ledger,
        string branchName
    )
    {
        return string.Equals(ledger.LedgerType, "Bank", StringComparison.OrdinalIgnoreCase)
               && ledger.IsActive
               && ledger.CollectionAccount
               && (!ledger.BranchExclusive || SameText(ledger.Branch, branchName));
    }

    // Branch name from the vouchers that hold its checks, else
    // from the open financial year of today
    private async Task<string>
        BranchNameAsync
        (
            long branchId
        )
    {
        string? name =
            await _context
                .Set<ReceiptVoucher>()
                .AsNoTracking()
                .Where(x => x.BranchId == branchId)
                .Select(x => x.BranchName)
                .FirstOrDefaultAsync();

        if (!string.IsNullOrWhiteSpace(name))
        {
            return name;
        }

        try
        {
            return (await _numberService.ResolvePeriodAsync(branchId, BusinessToday())).BranchName;
        }
        catch (InvalidOperationException)
        {
            return string.Empty;
        }
    }


    //===========================================================
    // Print : clearing / dishonour voucher
    //===========================================================

    public async Task<CheckClearingVoucherDto?>
        GetVoucherAsync
        (
            long id
        )
    {
        CheckReconciliationVouchers? row =
            await _context
                .Set<CheckReconciliationVouchers>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.CheckReconciliationVoucherId == id);

        if (row == null)
        {
            return null;
        }

        List<CheckReconciliationVoucherLines> lines =
            await _context
                .Set<CheckReconciliationVoucherLines>()
                .AsNoTracking()
                .Where(x => x.CheckReconciliationVoucherId == row.CheckReconciliationVoucherId)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        // The checks this voucher was posted for (from the history,
        // so a reversed voucher still knows them)
        List<long> stateIds =
            await _context
                .Set<CheckReconciliationHistory>()
                .AsNoTracking()
                .Where(x => x.VoucherNo == row.VoucherNo
                            && (x.Action == "Clear" || x.Action == "Dishonour"))
                .Select(x => x.CheckReconciliationId)
                .Distinct()
                .ToListAsync();

        List<CheckClearingSourceDto> sources =
            await _context
                .Set<CheckReconciliations>()
                .AsNoTracking()
                .Where(x => stateIds.Contains(x.CheckReconciliationId))
                .OrderBy(x => x.CheckNo)
                .Select(
                    x =>
                        new CheckClearingSourceDto
                        {
                            CheckNo = x.CheckNo,
                            SourceVoucherType = x.SourceVoucherType,
                            SourceVoucherNo = x.SourceVoucherNo,
                            PartyName = x.PartyName
                        })
                .ToListAsync();

        return new CheckClearingVoucherDto
        {
            Id = row.CheckReconciliationVoucherId,
            Sources = sources,
            VoucherNo = row.VoucherNo,
            VoucherType = row.VoucherType,
            Purpose = row.Purpose,
            VoucherDate = Text(row.VoucherDate),
            BranchId = row.BranchId,
            BranchName = row.BranchName,
            BankLedgerCode = row.BankLedgerCode,
            BankLedgerName = row.BankLedgerName,
            CheckCount = row.CheckCount,
            Amount = row.Amount,
            Charges = row.Charges,
            Recovery = row.Recovery,
            Narration = row.Narration,
            Status = row.Status,
            ReversedDate = Text(row.ReversedDate),
            ReverseReason = row.ReverseReason,
            Lines = lines
                .Select(
                    x =>
                        new CheckClearingVoucherLineDto
                        {
                            LineNo = x.LineNo,
                            GroupNo = x.GroupNo,
                            CheckNo = x.CheckNo,
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
    // Print : deposit slip
    //===========================================================

    public async Task<CheckDepositSlipDto?>
        GetDepositSlipAsync
        (
            long id
        )
    {
        CheckDepositSlips? slip =
            await _context
                .Set<CheckDepositSlips>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.CheckDepositSlipId == id);

        if (slip == null)
        {
            return null;
        }

        // Checks deposited with this slip (from the history, so a
        // dishonoured check that was re-presented later stays on
        // its first slip); an undone deposit drops off
        List<CheckReconciliationHistory> moves =
            await _context
                .Set<CheckReconciliationHistory>()
                .AsNoTracking()
                .Where(x => x.DepositSlipNo == slip.SlipNo
                            && (x.Action == "Deposit" || x.Action == "Undo Deposit"))
                .OrderBy(x => x.CheckReconciliationHistoryId)
                .ToListAsync();

        HashSet<long> onSlip =
            new();

        foreach (CheckReconciliationHistory move in moves)
        {
            if (move.Action == "Deposit")
            {
                onSlip.Add(move.CheckReconciliationId);
            }
            else
            {
                onSlip.Remove(move.CheckReconciliationId);
            }
        }

        List<CheckReconciliations> checks =
            await _context
                .Set<CheckReconciliations>()
                .AsNoTracking()
                .Where(x => onSlip.Contains(x.CheckReconciliationId))
                .OrderBy(x => x.CheckDate)
                .ThenBy(x => x.CheckNo)
                .ToListAsync();

        return new CheckDepositSlipDto
        {
            Id = slip.CheckDepositSlipId,
            SlipNo = slip.SlipNo,
            SlipDate = Text(slip.SlipDate),
            BranchId = slip.BranchId,
            BranchName = slip.BranchName,
            BankLedgerCode = slip.BankLedgerCode,
            BankLedgerName = slip.BankLedgerName,
            CheckCount = slip.CheckCount,
            TotalAmount = slip.TotalAmount,
            Checks = checks
                .Select(
                    x =>
                        new CheckDepositSlipLineDto
                        {
                            CheckNo = x.CheckNo,
                            CheckDate = Text(x.CheckDate),
                            CheckBank = x.CheckBank,
                            PartyName = x.PartyName,
                            SourceVoucherNo = x.SourceVoucherNo,
                            Amount = x.Amount,
                            // Re-presented later : this slip's
                            // outcome was the dishonour
                            Status = x.DepositSlipId == slip.CheckDepositSlipId
                                ? x.Status
                                : Dishonoured
                        })
                .ToList()
        };
    }


    //===========================================================
    // Deposit (received : Pending → Deposited)
    //===========================================================

    public async Task<CheckActionResultDto>
        DepositAsync
        (
            CheckDepositDto dto,
            long userId
        )
    {
        List<long> ids =
            (dto?.PaymentIds ?? new List<long>())
                .Distinct()
                .OrderBy(x => x)
                .ToList();

        if (ids.Count == 0)
        {
            throw new InvalidOperationException(
                "Select at least one check to deposit.");
        }

        DateOnly date =
            ParseDate(dto!.DepositDate, "Deposit date");

        string bankCode =
            (dto.BankLedgerCode ?? string.Empty).Trim();

        if (bankCode.Length == 0)
        {
            throw new InvalidOperationException(
                "Choose the bank account to deposit into.");
        }

        if (ids.Count > 1 && !await IsSwitchOnAsync(MultiCheckSwitch, true))
        {
            throw new InvalidOperationException(
                "One check at a time (Multi Check Deposit / Clearing is OFF).");
        }

        CheckActionResultDto result =
            new();

        await InTransactionAsync(
            async () =>
            {
                await LockSourcesAsync(Received, ids);

                List<SourceCheck> sources =
                    new();

                foreach (long id in ids)
                {
                    sources.Add(await LoadSourceAsync(Received, id));
                }

                if (sources.Select(x => x.BranchId).Distinct().Count() > 1)
                {
                    throw new InvalidOperationException(
                        "Deposit the checks of one branch at a time (one Deposit Slip per branch).");
                }

                SourceCheck first =
                    sources[0];

                Dictionary<string, VoucherLedgerDto> ledgers =
                    await _ledgerRepository.GetByCodesAsync(new[] { bankCode });

                if (!ledgers.TryGetValue(bankCode, out VoucherLedgerDto? bank))
                {
                    throw new InvalidOperationException(
                        $"Bank account '{bankCode}' was not found.");
                }

                if (!IsDepositAccount(bank, first.BranchName))
                {
                    throw new InvalidOperationException(
                        $"'{bank.LedgerName}' is not an active collection bank account of {first.BranchName}.");
                }

                VoucherPeriodDto period =
                    await _numberService.ResolvePeriodAsync(first.BranchId, date);

                DateTime now =
                    DateTime.UtcNow;

                List<CheckReconciliations> states =
                    new();

                foreach (SourceCheck source in sources)
                {
                    CheckReconciliations state =
                        await StateAsync(source, userId, now);

                    RequireStatus(state, "deposited", Pending);

                    await EnsureDateAsync(date, source, "Deposit date");

                    states.Add(state);
                }

                //===================================================
                // Slip number : DS-<branch>-<FY>-<MM>-<seq>
                //===================================================

                string prefix =
                    $"{SlipPrefix}-{period.BranchDigits}-{period.FinancialYearCode}-{period.PeriodMonth:D2}-";

                // One number at a time per branch / month
                await _context.Database.ExecuteSqlInterpolatedAsync(
                    $"SELECT pg_advisory_xact_lock(hashtext({prefix}))");

                List<string> taken =
                    await _context
                        .Set<CheckDepositSlips>()
                        .AsNoTracking()
                        .Where(x => x.SlipNo.StartsWith(prefix))
                        .Select(x => x.SlipNo)
                        .ToListAsync();

                int next =
                    taken
                        .Select(x => int.TryParse(x.Substring(prefix.Length), out int n) ? n : 0)
                        .DefaultIfEmpty(0)
                        .Max() + 1;

                if (next > 99999)
                {
                    throw new InvalidOperationException(
                        $"Deposit slip numbers for {period.FinancialYearCode}-{period.PeriodMonth:D2} are exhausted (99999).");
                }

                CheckDepositSlips slip =
                    new()
                    {
                        SlipNo = $"{prefix}{next:D5}",
                        SlipDate = date,
                        BranchId = first.BranchId,
                        BranchName = Limit(first.BranchName, 200),
                        BankLedgerCode = bank.LedgerCode,
                        BankLedgerName = Limit(bank.LedgerName, 250),
                        CheckCount = states.Count,
                        TotalAmount = states.Sum(x => x.Amount),
                        CreatedBy = userId,
                        CreatedDate = now
                    };

                _context.Set<CheckDepositSlips>().Add(slip);

                await _context.SaveChangesAsync();

                for (int i = 0; i < states.Count; i++)
                {
                    CheckReconciliations state =
                        states[i];

                    state.Status = Deposited;
                    state.DepositDate = date;
                    state.DepositSlipId = slip.CheckDepositSlipId;
                    state.DepositSlipNo = slip.SlipNo;
                    state.DepositLedgerCode = bank.LedgerCode;
                    state.DepositLedgerName = Limit(bank.LedgerName, 250);
                    Touch(state, userId, now);

                    AddHistory(state, "Deposit", date, userId, now,
                        ledgerCode: bank.LedgerCode,
                        ledgerName: bank.LedgerName,
                        slipNo: slip.SlipNo,
                        reason: Limit(
                            (dto.Notes ?? new List<CheckNoteDto>())
                                .FirstOrDefault(x => x.PaymentId == state.SourcePaymentId)?.ShortNotes,
                            500));

                    sources[i].Sync(Deposited, string.Empty, null);

                    AddActivity(state.CheckReconciliationId, "Deposit", "Check Deposited",
                        $"Check {state.CheckNo} of {state.PartyName} ({state.Amount:N2}) deposited into {bank.LedgerName}, slip {slip.SlipNo}.",
                        userId, now);
                }

                await _context.SaveChangesAsync();

                result.Message = $"{states.Count} check(s) deposited. Deposit Slip {slip.SlipNo}.";
                result.DepositSlipNo = slip.SlipNo;
                result.DepositSlipId = slip.CheckDepositSlipId;
                result.CheckCount = states.Count;
            });

        return result;
    }


    //===========================================================
    // Undo Deposit (Deposited → Pending)
    //===========================================================

    public async Task<CheckActionResultDto>
        UndoDepositAsync
        (
            CheckUndoDto dto,
            long userId
        )
    {
        CheckActionResultDto result =
            new();

        await InTransactionAsync(
            async () =>
            {
                SourceCheck source =
                    await LoadSourceAsync(Received, dto?.PaymentId ?? 0);

                DateTime now =
                    DateTime.UtcNow;

                CheckReconciliations state =
                    await StateAsync(source, userId, now);

                RequireStatus(state, "taken back from deposit", Deposited);

                string slipNo =
                    state.DepositSlipNo;

                if (state.DepositSlipId.HasValue)
                {
                    CheckDepositSlips? slip =
                        await _context
                            .Set<CheckDepositSlips>()
                            .FirstOrDefaultAsync(x => x.CheckDepositSlipId == state.DepositSlipId.Value);

                    if (slip != null)
                    {
                        slip.CheckCount = Math.Max(0, slip.CheckCount - 1);
                        slip.TotalAmount = Math.Max(0, slip.TotalAmount - state.Amount);
                    }
                }

                ClearDeposit(state);

                state.Status = Pending;
                Touch(state, userId, now);

                AddHistory(state, "Undo Deposit", BusinessToday(), userId, now,
                    slipNo: slipNo,
                    reason: Limit(dto?.Reason, 500));

                source.Sync(Pending, string.Empty, null);

                await _context.SaveChangesAsync();

                result.Message = $"Check {state.CheckNo} taken back from deposit slip {slipNo}.";
                result.DepositSlipNo = slipNo;
                result.CheckCount = 1;
            });

        return result;
    }


    //===========================================================
    // Clear (received Deposited / issued Pending → Cleared)
    //
    // One RRV / RRP per branch + bank account; one group per check.
    //===========================================================

    public async Task<CheckActionResultDto>
        ClearAsync
        (
            CheckClearDto dto,
            long userId
        )
    {
        string direction =
            ParseDirection(dto?.Direction);

        List<CheckClearItemDto> items =
            (dto?.Items ?? new List<CheckClearItemDto>())
                .OrderBy(x => x.PaymentId)
                .ToList();

        if (items.Count == 0)
        {
            throw new InvalidOperationException(
                "Select at least one check to clear.");
        }

        if (items.Select(x => x.PaymentId).Distinct().Count() != items.Count)
        {
            throw new InvalidOperationException(
                "A check is in the list twice.");
        }

        if (items.Count > 1 && !await IsSwitchOnAsync(MultiCheckSwitch, true))
        {
            throw new InvalidOperationException(
                "One check at a time (Multi Check Deposit / Clearing is OFF).");
        }

        foreach (CheckClearItemDto item in items)
        {
            if (item.Charge < 0 || !IsMoney(item.Charge))
            {
                throw new InvalidOperationException(
                    "A bank charge must be 0 or more with at most 2 decimals.");
            }
        }

        DateOnly date =
            ParseDate(dto!.ClearedDate, "Clearing date");

        string userNarration =
            Limit(dto.Narration, 500);

        bool received =
            direction == Received;

        CheckActionResultDto result =
            new();

        await InTransactionAsync(
            async () =>
            {
                DateTime now =
                    DateTime.UtcNow;

                await LockSourcesAsync(direction, items.Select(x => x.PaymentId));

                List<(SourceCheck Source, CheckReconciliations State, decimal Charge, string BankCode, string Notes)> work =
                    new();

                bool perBatch =
                    await IsSwitchOnAsync(OneVoucherPerBatchSwitch, true);

                foreach (CheckClearItemDto item in items)
                {
                    SourceCheck source =
                        await LoadSourceAsync(direction, item.PaymentId);

                    CheckReconciliations state =
                        await StateAsync(source, userId, now);

                    if (received)
                    {
                        RequireStatus(state, "cleared (deposit it first)", Deposited);

                        if (state.DepositDate.HasValue && date < state.DepositDate.Value)
                        {
                            throw new InvalidOperationException(
                                $"Check {state.CheckNo} : clearing date cannot be before the deposit date ({state.DepositDate.Value:dd-MM-yyyy}).");
                        }
                    }
                    else
                    {
                        RequireStatus(state, "cleared", Pending);
                    }

                    await EnsureDateAsync(date, source, $"Check {state.CheckNo} : clearing date");

                    string bankCode =
                        received
                            ? state.DepositLedgerCode
                            : state.AccountLedgerCode;

                    if (string.IsNullOrWhiteSpace(bankCode))
                    {
                        throw new InvalidOperationException(
                            $"Check {state.CheckNo} has no bank account.");
                    }

                    work.Add((source, state, item.Charge, bankCode, Limit(item.ShortNotes, 250)));
                }

                Dictionary<string, VoucherLedgerDto> ledgers =
                    await _ledgerRepository.GetByCodesAsync(
                        work.Select(x => x.BankCode)
                            .Append(BankChargesLedger)
                            .Distinct());

                if (work.Any(x => x.Charge > 0) && !ledgers.ContainsKey(BankChargesLedger))
                {
                    throw new InvalidOperationException(
                        $"Bank Charges ledger ({BankChargesLedger}) was not found.");
                }

                string prefix =
                    received
                        ? VoucherTypes.ReceiptReconciliation
                        : VoucherTypes.PaymentReconciliation;

                // Switch 0049 : one voucher per bank account, or one per
                // bank account AND source voucher
                foreach (var batch in work
                             .GroupBy(x => new { x.Source.BranchId, x.BankCode, Source = perBatch ? 0 : x.Source.VoucherId })
                             .OrderBy(x => x.Key.BranchId)
                             .ThenBy(x => x.Key.BankCode)
                             .ThenBy(x => x.Key.Source))
                {
                    VoucherLedgerDto bank =
                        ledgers.TryGetValue(batch.Key.BankCode, out VoucherLedgerDto? found)
                            ? found
                            : throw new InvalidOperationException(
                                $"Bank account '{batch.Key.BankCode}' was not found.");

                    if (!bank.IsActive)
                    {
                        throw new InvalidOperationException(
                            $"'{bank.LedgerName}' is inactive.");
                    }

                    var checks =
                        batch.ToList();

                    VoucherNumberDto number =
                        await _numberService.NextAsync(prefix, batch.Key.BranchId, date);

                    List<CheckReconciliationVoucherLines> lines =
                        BuildClearingLines(
                            received,
                            bank,
                            ledgers.GetValueOrDefault(BankChargesLedger),
                            checks.Select(x => (x.Source, x.Charge, x.Notes)).ToList());

                    decimal amount =
                        checks.Sum(x => x.State.Amount);

                    decimal charges =
                        checks.Sum(x => x.Charge);

                    string sourceText =
                        string.Join(", ", checks.Select(x => x.Source.VoucherNo).Distinct());

                    string narration =
                        userNarration.Length > 0
                            ? userNarration
                            : Limit(
                                received
                                    ? $"{checks.Count} check(s) cleared into {bank.LedgerName} ({sourceText})"
                                    : $"{checks.Count} issued check(s) cleared from {bank.LedgerName} ({sourceText})",
                                500);

                    CheckReconciliationVouchers voucher =
                        new()
                        {
                            VoucherNo = number.VoucherNo,
                            VoucherType = prefix,
                            Purpose = ClearingPurpose,
                            VoucherDate = date,
                            BranchId = batch.Key.BranchId,
                            BranchName = Limit(checks[0].Source.BranchName, 200),
                            BankLedgerCode = bank.LedgerCode,
                            BankLedgerName = Limit(bank.LedgerName, 250),
                            CheckCount = checks.Count,
                            Amount = amount,
                            Charges = charges,
                            Recovery = 0,
                            Narration = narration,
                            Status = VoucherStatuses.Posted,
                            ReverseReason = string.Empty,
                            CreatedBy = userId,
                            CreatedDate = now
                        };

                    await SaveVoucherAsync(voucher, lines, userId);

                    foreach (var check in checks)
                    {
                        CheckReconciliations state =
                            check.State;

                        state.Status = Cleared;
                        state.ClearedDate = date;
                        state.ClearingVoucherId = voucher.CheckReconciliationVoucherId;
                        state.ClearingVoucherNo = voucher.VoucherNo;
                        state.ClearingCharge = check.Charge;
                        Touch(state, userId, now);

                        AddHistory(state, "Clear", date, userId, now,
                            ledgerCode: bank.LedgerCode,
                            ledgerName: bank.LedgerName,
                            voucherNo: voucher.VoucherNo,
                            charge: check.Charge,
                            reason: check.Notes);

                        check.Source.Sync(Cleared, voucher.VoucherNo, date);

                        AddActivity(state.CheckReconciliationId, "Clear", "Check Cleared",
                            $"Check {state.CheckNo} of {state.PartyName} ({state.Amount:N2}) cleared in {voucher.VoucherNo}, {bank.LedgerName}{(check.Charge > 0 ? $", charge {check.Charge:N2}" : string.Empty)}.",
                            userId, now);
                    }

                    result.VoucherNos.Add(voucher.VoucherNo);
                    result.VoucherIds.Add(voucher.CheckReconciliationVoucherId);
                }

                await _context.SaveChangesAsync();

                result.CheckCount = items.Count;
                result.Message =
                    $"{items.Count} check(s) cleared : {string.Join(", ", result.VoucherNos)}.";
            });

        return result;
    }

    //===========================================================
    // Clearing lines (one group per check)
    //
    // Received : Dr bank (check)     / Cr customer line(s)
    // Issued   : Dr supplier line(s) / Cr bank (check)
    // Charge   : Dr Bank Charges     / Cr bank (same group)
    //===========================================================

    private static List<CheckReconciliationVoucherLines> BuildClearingLines
    (
        bool received,
        VoucherLedgerDto bank,
        VoucherLedgerDto? chargesLedger,
        List<(SourceCheck Source, decimal Charge, string Notes)> checks
    )
    {
        List<CheckReconciliationVoucherLines> lines =
            new();

        int group = 0;

        foreach ((SourceCheck source, decimal charge, string notes) in checks)
        {
            group++;

            // The user's short notes replace the default line text
            string LineText(string fallback) =>
                string.IsNullOrWhiteSpace(notes)
                    ? fallback
                    : notes;

            CheckReconciliationVoucherLines BankLine(decimal debit, decimal credit, string narration, bool isCharge) =>
                Line(group, source.CheckNo, bank.LedgerCode, bank.LedgerName, bank.SubGroupName,
                    string.Empty, string.Empty, debit, credit, narration, isCharge);

            if (received)
            {
                lines.Add(
                    BankLine(source.Amount, 0,
                        LineText($"Check {source.CheckNo} of {source.PartyName} cleared ({source.VoucherNo})"),
                        false));

                foreach (PartySlice party in source.Parties)
                {
                    lines.Add(
                        Line(group, source.CheckNo, party.LedgerCode, party.LedgerName, party.SubGroupName,
                            party.PartyCode, PartyTypeOf(party), 0, party.Amount,
                            LineText($"Check {source.CheckNo} cleared ({source.VoucherNo})"),
                            false));
                }
            }
            else
            {
                foreach (PartySlice party in source.Parties)
                {
                    lines.Add(
                        Line(group, source.CheckNo, party.LedgerCode, party.LedgerName, party.SubGroupName,
                            party.PartyCode, PartyTypeOf(party), party.Amount, 0,
                            LineText($"Check {source.CheckNo} cleared ({source.VoucherNo})"),
                            false));
                }

                lines.Add(
                    BankLine(0, source.Amount,
                        LineText($"Check {source.CheckNo} to {source.PartyName} cleared ({source.VoucherNo})"),
                        false));
            }

            if (charge > 0)
            {
                lines.Add(
                    Line(group, source.CheckNo, chargesLedger!.LedgerCode, chargesLedger.LedgerName,
                        chargesLedger.SubGroupName, string.Empty, string.Empty, charge, 0,
                        $"Bank charge on check {source.CheckNo}",
                        true));

                lines.Add(
                    BankLine(0, charge, $"Bank charge on check {source.CheckNo}", true));
            }
        }

        return lines;
    }

    private static CheckReconciliationVoucherLines Line
    (
        int group,
        string checkNo,
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
        return new CheckReconciliationVoucherLines
        {
            GroupNo = group,
            CheckNo = Limit(checkNo, 50),
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

    // Saves the voucher + lines and posts them
    private async Task
        SaveVoucherAsync
        (
            CheckReconciliationVouchers voucher,
            List<CheckReconciliationVoucherLines> lines,
            long userId
        )
    {
        _context.Set<CheckReconciliationVouchers>().Add(voucher);

        await _context.SaveChangesAsync();

        int lineNo = 0;

        foreach (CheckReconciliationVoucherLines line in lines)
        {
            line.CheckReconciliationVoucherId = voucher.CheckReconciliationVoucherId;
            line.LineNo = ++lineNo;
        }

        _context.Set<CheckReconciliationVoucherLines>().AddRange(lines);

        await _postingService.PostAsync(
            new VoucherPostingRequest
            {
                VoucherType = voucher.VoucherType,
                VoucherId = voucher.CheckReconciliationVoucherId,
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


    //===========================================================
    // Undo Clear : reverses the whole RRV / RRP; every check in
    // it goes back (received → Deposited, issued → Pending)
    //===========================================================

    public async Task<CheckActionResultDto>
        UndoClearAsync
        (
            CheckUndoDto dto,
            long userId
        )
    {
        string direction =
            ParseDirection(dto?.Direction);

        string reason =
            RequireReason(dto?.Reason, "undo a clearing");

        DateOnly date =
            OptionalDate(dto?.UndoDate, "Undo date");

        CheckActionResultDto result =
            new();

        await InTransactionAsync(
            async () =>
            {
                DateTime now =
                    DateTime.UtcNow;

                // The clearing voucher of the picked check, then
                // every check in it (source vouchers locked first,
                // in order)
                long? clearingId =
                    await _context
                        .Set<CheckReconciliations>()
                        .AsNoTracking()
                        .Where(x => x.Direction == direction && x.SourcePaymentId == dto!.PaymentId)
                        .Select(x => x.ClearingVoucherId)
                        .FirstOrDefaultAsync();

                if (clearingId == null)
                {
                    throw new InvalidOperationException(
                        "This check is not cleared.");
                }

                List<long> paymentIds =
                    await _context
                        .Set<CheckReconciliations>()
                        .AsNoTracking()
                        .Where(x => x.ClearingVoucherId == clearingId
                                    && x.Status == Cleared)
                        .OrderBy(x => x.SourcePaymentId)
                        .Select(x => x.SourcePaymentId)
                        .ToListAsync();

                await LockSourcesAsync(direction, paymentIds.Append(dto!.PaymentId));

                SourceCheck picked =
                    await LoadSourceAsync(direction, dto.PaymentId);

                CheckReconciliations pickedState =
                    await StateAsync(picked, userId, now);

                RequireStatus(pickedState, "un-cleared", Cleared);

                CheckReconciliationVouchers voucher =
                    await LoadVoucherAsync(pickedState.ClearingVoucherId);

                if (voucher.CheckReconciliationVoucherId != clearingId.Value)
                {
                    throw new InvalidOperationException(
                        "The check changed while undoing; refresh and try again.");
                }

                await ReverseVoucherAsync(voucher, date, reason, userId, now);

                foreach (long paymentId in paymentIds)
                {
                    SourceCheck source =
                        await LoadSourceAsync(direction, paymentId, requirePosted: false);

                    CheckReconciliations state =
                        await StateAsync(source, userId, now);

                    string back =
                        direction == Received ? Deposited : Pending;

                    state.Status = back;
                    state.ClearedDate = null;
                    state.ClearingVoucherId = null;
                    state.ClearingVoucherNo = string.Empty;
                    state.ClearingCharge = 0;
                    Touch(state, userId, now);

                    AddHistory(state, "Undo Clear", date, userId, now,
                        voucherNo: voucher.VoucherNo,
                        reason: reason);

                    source.Sync(back, string.Empty, null);

                    AddActivity(state.CheckReconciliationId, "Undo Clear", "Clearing Reversed",
                        $"Check {state.CheckNo} back to {back}; {voucher.VoucherNo} reversed. Reason : {reason}",
                        userId, now);
                }

                await _context.SaveChangesAsync();

                result.VoucherNos.Add(voucher.VoucherNo);
                result.CheckCount = paymentIds.Count;
                result.Message =
                    $"{voucher.VoucherNo} reversed; {paymentIds.Count} check(s) back to {(direction == Received ? Deposited : Pending)}.";
            });

        return result;
    }


    //===========================================================
    // Dishonour (received : Deposited → Dishonoured), a cart
    //
    // One optional RRV per branch + deposit bank account; per
    // check (each with its own reason) :
    //   fee group       Dr Bank Charges / Cr bank
    //   recovery group  Dr customer     / Cr Cheque Dishonour
    //                                     Charges Recovery
    // Checks without fee and recovery post nothing.
    //===========================================================

    public async Task<CheckActionResultDto>
        DishonourAsync
        (
            CheckDishonourDto dto,
            long userId
        )
    {
        List<CheckDishonourItemDto> items =
            (dto?.Items ?? new List<CheckDishonourItemDto>())
                .OrderBy(x => x.PaymentId)
                .ToList();

        if (items.Count == 0)
        {
            throw new InvalidOperationException(
                "Select at least one check to dishonour.");
        }

        if (items.Select(x => x.PaymentId).Distinct().Count() != items.Count)
        {
            throw new InvalidOperationException(
                "A check is in the list twice.");
        }

        if (items.Count > 1 && !await IsSwitchOnAsync(MultiCheckSwitch, true))
        {
            throw new InvalidOperationException(
                "One check at a time (Multi Check Deposit / Clearing is OFF).");
        }

        // Switch 0050 : the recovery from the payer is the check's
        // bank charges (ON) or nothing (OFF); never typed
        bool recoveryOn =
            await IsSwitchOnAsync(DishonourRecoverySwitch, true);

        foreach (CheckDishonourItemDto item in items)
        {
            item.Recovery =
                recoveryOn
                    ? item.Fee
                    : 0;
        }

        foreach (CheckDishonourItemDto item in items)
        {
            if (string.IsNullOrWhiteSpace(item.Reason))
            {
                throw new InvalidOperationException(
                    "A reason is required for every dishonoured check.");
            }

            if (item.Fee < 0 || !IsMoney(item.Fee) || item.Recovery < 0 || !IsMoney(item.Recovery))
            {
                throw new InvalidOperationException(
                    "Bank fee and recovery must be 0 or more with at most 2 decimals.");
            }
        }

        DateOnly date =
            ParseDate(dto!.DishonourDate, "Dishonour date");

        CheckActionResultDto result =
            new();

        await InTransactionAsync(
            async () =>
            {
                DateTime now =
                    DateTime.UtcNow;

                await LockSourcesAsync(Received, items.Select(x => x.PaymentId));

                List<(SourceCheck Source, CheckReconciliations State, CheckDishonourItemDto Item)> work =
                    new();

                foreach (CheckDishonourItemDto item in items)
                {
                    SourceCheck source =
                        await LoadSourceAsync(Received, item.PaymentId);

                    CheckReconciliations state =
                        await StateAsync(source, userId, now);

                    RequireStatus(state, "dishonoured", Deposited);

                    if (state.DepositDate.HasValue && date < state.DepositDate.Value)
                    {
                        throw new InvalidOperationException(
                            $"Check {state.CheckNo} : dishonour date cannot be before the deposit date ({state.DepositDate.Value:dd-MM-yyyy}).");
                    }

                    await EnsureDateAsync(date, source, $"Check {state.CheckNo} : dishonour date");

                    if (item.Recovery > 0
                        && !source.Parties.Any(x => !string.IsNullOrWhiteSpace(x.PartyCode)))
                    {
                        throw new InvalidOperationException(
                            $"Check {state.CheckNo} has no customer to recover the charge from.");
                    }

                    work.Add((source, state, item));
                }

                Dictionary<string, VoucherLedgerDto> ledgers =
                    await _ledgerRepository.GetByCodesAsync(
                        work.Select(x => x.State.DepositLedgerCode)
                            .Append(BankChargesLedger)
                            .Append(DishonourRecoveryLedger)
                            .Distinct());

                //=======================================================
                // Charges vouchers (only checks with a fee / recovery)
                //=======================================================

                Dictionary<long, (long Id, string No)> voucherOf =
                    new();

                bool perBatch =
                    await IsSwitchOnAsync(OneVoucherPerBatchSwitch, true);

                foreach (var batch in work
                             .Where(x => x.Item.Fee > 0 || x.Item.Recovery > 0)
                             .GroupBy(x => new { x.Source.BranchId, Bank = x.State.DepositLedgerCode, Source = perBatch ? 0 : x.Source.VoucherId })
                             .OrderBy(x => x.Key.BranchId)
                             .ThenBy(x => x.Key.Bank))
                {
                    var checks =
                        batch.ToList();

                    VoucherLedgerDto bank =
                        Need(ledgers, batch.Key.Bank, "Deposit bank account");

                    List<CheckReconciliationVoucherLines> lines =
                        new();

                    int group = 0;

                    foreach (var check in checks)
                    {
                        CheckReconciliations state =
                            check.State;

                        decimal fee =
                            check.Item.Fee;

                        decimal recovery =
                            check.Item.Recovery;

                        string notes =
                            Limit(check.Item.ShortNotes, 250);

                        if (fee > 0)
                        {
                            group++;

                            VoucherLedgerDto charges =
                                Need(ledgers, BankChargesLedger, "Bank Charges ledger");

                            lines.Add(
                                Line(group, state.CheckNo, charges.LedgerCode, charges.LedgerName, charges.SubGroupName,
                                    string.Empty, string.Empty, fee, 0,
                                    notes.Length > 0 ? notes : $"Dishonour fee on check {state.CheckNo}", true));

                            lines.Add(
                                Line(group, state.CheckNo, bank.LedgerCode, bank.LedgerName, bank.SubGroupName,
                                    string.Empty, string.Empty, 0, fee,
                                    notes.Length > 0 ? notes : $"Dishonour fee on check {state.CheckNo}", true));
                        }

                        if (recovery > 0)
                        {
                            group++;

                            PartySlice customer =
                                check.Source.Parties.First(x => !string.IsNullOrWhiteSpace(x.PartyCode));

                            VoucherLedgerDto income =
                                Need(ledgers, DishonourRecoveryLedger, "Cheque Dishonour Charges Recovery ledger");

                            lines.Add(
                                Line(group, state.CheckNo, customer.LedgerCode, customer.LedgerName, customer.SubGroupName,
                                    customer.PartyCode, PartyTypeOf(customer), recovery, 0,
                                    notes.Length > 0 ? notes : $"Dishonour charge on check {state.CheckNo}", true));

                            lines.Add(
                                Line(group, state.CheckNo, income.LedgerCode, income.LedgerName, income.SubGroupName,
                                    string.Empty, string.Empty, 0, recovery,
                                    $"Dishonour charge recovered from {customer.LedgerName}", true));
                        }
                    }

                    VoucherNumberDto number =
                        await _numberService.NextAsync(
                            VoucherTypes.ReceiptReconciliation,
                            batch.Key.BranchId,
                            date);

                    CheckReconciliationVouchers voucher =
                        new()
                        {
                            VoucherNo = number.VoucherNo,
                            VoucherType = VoucherTypes.ReceiptReconciliation,
                            Purpose = DishonourPurpose,
                            VoucherDate = date,
                            BranchId = batch.Key.BranchId,
                            BranchName = Limit(checks[0].Source.BranchName, 200),
                            BankLedgerCode = bank.LedgerCode,
                            BankLedgerName = Limit(bank.LedgerName, 250),
                            CheckCount = checks.Count,
                            Amount = 0,
                            Charges = checks.Sum(x => x.Item.Fee),
                            Recovery = checks.Sum(x => x.Item.Recovery),
                            Narration =
                                checks.Count == 1
                                    ? Limit($"Check {checks[0].State.CheckNo} of {checks[0].State.PartyName} dishonoured : {checks[0].Item.Reason.Trim()}", 500)
                                    : Limit($"{checks.Count} checks dishonoured : {string.Join(", ", checks.Select(x => x.State.CheckNo))}", 500),
                            Status = VoucherStatuses.Posted,
                            ReverseReason = string.Empty,
                            CreatedBy = userId,
                            CreatedDate = now
                        };

                    await SaveVoucherAsync(voucher, lines, userId);

                    foreach (var check in checks)
                    {
                        voucherOf[check.State.CheckReconciliationId] =
                            (voucher.CheckReconciliationVoucherId, voucher.VoucherNo);
                    }

                    result.VoucherNos.Add(voucher.VoucherNo);
                    result.VoucherIds.Add(voucher.CheckReconciliationVoucherId);
                }

                //=======================================================
                // Checks
                //=======================================================

                foreach (var check in work)
                {
                    CheckReconciliations state =
                        check.State;

                    string reason =
                        Limit(check.Item.Reason, 500);

                    bool posted =
                        voucherOf.TryGetValue(state.CheckReconciliationId, out (long Id, string No) voucherRef);

                    state.Status = Dishonoured;
                    state.DishonourDate = date;
                    state.DishonourReason = reason;
                    state.DishonourFee = check.Item.Fee;
                    state.DishonourRecovery = check.Item.Recovery;
                    state.DishonourVoucherId = posted ? voucherRef.Id : null;
                    state.DishonourVoucherNo = posted ? voucherRef.No : string.Empty;
                    state.DishonourCount++;
                    Touch(state, userId, now);

                    AddHistory(state, "Dishonour", date, userId, now,
                        ledgerCode: state.DepositLedgerCode,
                        ledgerName: state.DepositLedgerName,
                        voucherNo: state.DishonourVoucherNo,
                        slipNo: state.DepositSlipNo,
                        charge: check.Item.Fee,
                        recovery: check.Item.Recovery,
                        reason: reason);

                    check.Source.Sync(Dishonoured, string.Empty, null);

                    AddActivity(state.CheckReconciliationId, "Dishonour", "Check Dishonoured",
                        $"Check {state.CheckNo} of {state.PartyName} ({state.Amount:N2}) dishonoured. Reason : {reason}",
                        userId, now);
                }

                await _context.SaveChangesAsync();

                result.CheckCount = work.Count;
                result.Message =
                    result.VoucherNos.Count > 0
                        ? $"{work.Count} check(s) dishonoured; charges posted in {string.Join(", ", result.VoucherNos)}."
                        : $"{work.Count} check(s) dishonoured.";
            });

        return result;
    }


    //===========================================================
    // Undo Dishonour (Dishonoured → Deposited; its RRV reversed)
    //===========================================================

    public async Task<CheckActionResultDto>
        UndoDishonourAsync
        (
            CheckUndoDto dto,
            long userId
        )
    {
        string reason =
            RequireReason(dto?.Reason, "undo a dishonour");

        DateOnly date =
            OptionalDate(dto?.UndoDate, "Undo date");

        CheckActionResultDto result =
            new();

        await InTransactionAsync(
            async () =>
            {
                DateTime now =
                    DateTime.UtcNow;

                SourceCheck source =
                    await LoadSourceAsync(Received, dto!.PaymentId);

                CheckReconciliations state =
                    await StateAsync(source, userId, now);

                RequireStatus(state, "restored", Dishonoured);

                string voucherNo =
                    state.DishonourVoucherNo;

                if (voucherNo.Length > 0)
                {
                    CheckReconciliationVouchers voucher =
                        state.DishonourVoucherId.HasValue
                            ? await LoadVoucherAsync(state.DishonourVoucherId)
                            : await _context
                                  .Set<CheckReconciliationVouchers>()
                                  .FirstOrDefaultAsync(x => x.VoucherNo == voucherNo)
                              ??
                              throw new KeyNotFoundException(
                                  $"Voucher {voucherNo} not found.");

                    await ReverseVoucherAsync(voucher, date, reason, userId, now);

                    result.VoucherNos.Add(voucherNo);
                }

                state.Status = Deposited;
                state.DishonourDate = null;
                state.DishonourReason = string.Empty;
                state.DishonourFee = 0;
                state.DishonourRecovery = 0;
                state.DishonourVoucherId = null;
                state.DishonourVoucherNo = string.Empty;
                state.DishonourCount = Math.Max(0, state.DishonourCount - 1);
                Touch(state, userId, now);

                AddHistory(state, "Undo Dishonour", date, userId, now,
                    voucherNo: voucherNo,
                    reason: reason);

                source.Sync(Deposited, string.Empty, null);

                await _context.SaveChangesAsync();

                result.CheckCount = 1;
                result.Message =
                    voucherNo.Length > 0
                        ? $"Check {state.CheckNo} back to Deposited; {voucherNo} reversed."
                        : $"Check {state.CheckNo} back to Deposited.";
            });

        return result;
    }


    //===========================================================
    // Re-present (Dishonoured → Pending : deposit it again)
    //===========================================================

    public async Task<CheckActionResultDto>
        RepresentAsync
        (
            CheckUndoDto dto,
            long userId
        )
    {
        CheckActionResultDto result =
            new();

        await InTransactionAsync(
            async () =>
            {
                DateTime now =
                    DateTime.UtcNow;

                SourceCheck source =
                    await LoadSourceAsync(Received, dto?.PaymentId ?? 0);

                CheckReconciliations state =
                    await StateAsync(source, userId, now);

                RequireStatus(state, "re-presented", Dishonoured);

                // The dishonour stays in the history (and its RRV
                // stays posted); the count is kept
                ClearDeposit(state);

                state.Status = Pending;
                state.DishonourDate = null;
                state.DishonourReason = string.Empty;
                state.DishonourFee = 0;
                state.DishonourRecovery = 0;
                state.DishonourVoucherId = null;
                state.DishonourVoucherNo = string.Empty;
                Touch(state, userId, now);

                AddHistory(state, "Re-present", BusinessToday(), userId, now,
                    reason: Limit(dto?.Reason, 500));

                source.Sync(Pending, string.Empty, null);

                await _context.SaveChangesAsync();

                result.CheckCount = 1;
                result.Message =
                    $"Check {state.CheckNo} is Pending again; deposit it to present it.";
            });

        return result;
    }


    //===========================================================
    // Void (issued : Pending → Voided; nothing posted)
    //===========================================================

    public async Task<CheckActionResultDto>
        VoidAsync
        (
            CheckVoidDto dto,
            long userId
        )
    {
        string reason =
            RequireReason(dto?.Reason, "void a check");

        DateOnly date =
            ParseDate(dto!.VoidDate, "Void date");

        CheckActionResultDto result =
            new();

        await InTransactionAsync(
            async () =>
            {
                DateTime now =
                    DateTime.UtcNow;

                SourceCheck source =
                    await LoadSourceAsync(Issued, dto.PaymentId);

                CheckReconciliations state =
                    await StateAsync(source, userId, now);

                RequireStatus(state, "voided", Pending);

                await EnsureDateAsync(date, source, "Void date", checkDateRule: false);

                state.Status = Voided;
                state.VoidDate = date;
                state.VoidReason = reason;
                Touch(state, userId, now);

                AddHistory(state, "Void", date, userId, now,
                    reason: reason);

                source.Sync(Voided, string.Empty, null);

                AddActivity(state.CheckReconciliationId, "Void", "Check Voided",
                    $"Check {state.CheckNo} to {state.PartyName} ({state.Amount:N2}) voided. Reason : {reason}",
                    userId, now);

                await _context.SaveChangesAsync();

                result.CheckCount = 1;
                result.Message =
                    $"Check {state.CheckNo} voided. The amount stays payable to {state.PartyName}.";
            });

        return result;
    }


    //===========================================================
    // Undo Void (Void → Pending)
    //===========================================================

    public async Task<CheckActionResultDto>
        UndoVoidAsync
        (
            CheckUndoDto dto,
            long userId
        )
    {
        CheckActionResultDto result =
            new();

        await InTransactionAsync(
            async () =>
            {
                DateTime now =
                    DateTime.UtcNow;

                SourceCheck source =
                    await LoadSourceAsync(Issued, dto?.PaymentId ?? 0);

                CheckReconciliations state =
                    await StateAsync(source, userId, now);

                RequireStatus(state, "restored", Voided);

                state.Status = Pending;
                state.VoidDate = null;
                state.VoidReason = string.Empty;
                Touch(state, userId, now);

                AddHistory(state, "Undo Void", BusinessToday(), userId, now,
                    reason: Limit(dto?.Reason, 500));

                source.Sync(Pending, string.Empty, null);

                await _context.SaveChangesAsync();

                result.CheckCount = 1;
                result.Message =
                    $"Check {state.CheckNo} is Pending again.";
            });

        return result;
    }


    //===========================================================
    // Lock the source vouchers of several checks, lowest voucher
    // id first (every action takes them in the same order, so two
    // requests never wait on each other)
    //===========================================================

    private async Task
        LockSourcesAsync
        (
            string direction,
            IEnumerable<long> paymentIds
        )
    {
        List<long> ids =
            paymentIds.Distinct().ToList();

        List<long> voucherIds =
            direction == Received
                ? await _context
                    .Set<ReceiptVoucherPayments>()
                    .AsNoTracking()
                    .Where(x => ids.Contains(x.ReceiptVoucherPaymentId))
                    .Select(x => x.ReceiptVoucherId)
                    .Distinct()
                    .ToListAsync()
                : await _context
                    .Set<PaymentVoucherPayments>()
                    .AsNoTracking()
                    .Where(x => ids.Contains(x.PaymentVoucherPaymentId))
                    .Select(x => x.PaymentVoucherId)
                    .Distinct()
                    .ToListAsync();

        foreach (long voucherId in voucherIds.OrderBy(x => x))
        {
            if (direction == Received)
            {
                await _context.Database.ExecuteSqlInterpolatedAsync(
                    $@"SELECT 1 FROM ""ReceiptVoucher"" WHERE ""ReceiptVoucherId"" = {voucherId} FOR UPDATE");
            }
            else
            {
                await _context.Database.ExecuteSqlInterpolatedAsync(
                    $@"SELECT 1 FROM ""PaymentVoucher"" WHERE ""PaymentVoucherId"" = {voucherId} FOR UPDATE");
            }
        }
    }


    //===========================================================
    // Load a check with its source voucher (locked)
    //
    // The voucher header is locked (SELECT … FOR UPDATE) so a
    // Cancel of the voucher and an action on its check never run
    // at the same time.
    //===========================================================

    private async Task<SourceCheck>
        LoadSourceAsync
        (
            string direction,
            long paymentId,
            bool requirePosted = true
        )
    {
        return direction == Received
            ? await LoadReceivedAsync(paymentId, requirePosted)
            : await LoadIssuedAsync(paymentId, requirePosted);
    }

    private async Task<SourceCheck>
        LoadReceivedAsync
        (
            long paymentId,
            bool requirePosted
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
                "Check not found.");

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
                $"Receipt Voucher {voucher.VoucherNo} is {voucher.Status}; only checks of a posted voucher can be reconciled.");
        }

        List<ReceiptVoucherPayments> payments =
            await _context
                .Set<ReceiptVoucherPayments>()
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

        if (payment.Mode != CheckMode)
        {
            throw new InvalidOperationException(
                "This payment row is not a check.");
        }

        Dictionary<long, List<PartySlice>> allocation =
            Allocate(
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

        return new SourceCheck
        {
            Direction = Received,
            VoucherType = VoucherTypes.Receipt,
            VoucherId = voucher.ReceiptVoucherId,
            VoucherNo = voucher.VoucherNo,
            VoucherDate = voucher.VoucherDate,
            BranchId = voucher.BranchId,
            BranchName = voucher.BranchName,
            PartyName = voucher.PartyName,
            PaymentId = payment.ReceiptVoucherPaymentId,
            CheckNo = payment.CheckNo,
            CheckDate = payment.CheckDate,
            CheckBank = payment.CheckBank,
            Amount = payment.Amount,
            AccountLedgerCode = payment.LedgerCode,
            AccountLedgerName = payment.LedgerName,
            Parties = allocation[paymentId],
            Sync = (status, clearedNo, clearedDate) =>
            {
                payment.CheckStatus = status;
                payment.ClearedVoucherNo = clearedNo;
                payment.ClearedDate = clearedDate;
            }
        };
    }

    private async Task<SourceCheck>
        LoadIssuedAsync
        (
            long paymentId,
            bool requirePosted
        )
    {
        long voucherId =
            await _context
                .Set<PaymentVoucherPayments>()
                .AsNoTracking()
                .Where(x => x.PaymentVoucherPaymentId == paymentId)
                .Select(x => (long?)x.PaymentVoucherId)
                .FirstOrDefaultAsync()
            ??
            throw new KeyNotFoundException(
                "Check not found.");

        await _context.Database.ExecuteSqlInterpolatedAsync(
            $@"SELECT 1 FROM ""PaymentVoucher"" WHERE ""PaymentVoucherId"" = {voucherId} FOR UPDATE");

        PaymentVoucher voucher =
            await _context
                .Set<PaymentVoucher>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.PaymentVoucherId == voucherId && !x.IsDeleted)
            ??
            throw new KeyNotFoundException(
                "Payment Voucher not found.");

        if (requirePosted && voucher.Status != VoucherStatuses.Posted)
        {
            throw new InvalidOperationException(
                $"Payment Voucher {voucher.VoucherNo} is {voucher.Status}; only checks of a posted voucher can be reconciled.");
        }

        List<PaymentVoucherPayments> payments =
            await _context
                .Set<PaymentVoucherPayments>()
                .Where(x => x.PaymentVoucherId == voucherId)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        List<PaymentVoucherLines> lines =
            await _context
                .Set<PaymentVoucherLines>()
                .AsNoTracking()
                .Where(x => x.PaymentVoucherId == voucherId)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        PaymentVoucherPayments payment =
            payments.First(x => x.PaymentVoucherPaymentId == paymentId);

        if (payment.Mode != CheckMode)
        {
            throw new InvalidOperationException(
                "This payment row is not a check.");
        }

        Dictionary<long, List<PartySlice>> allocation =
            Allocate(
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
                    .Select(x => (x.PaymentVoucherPaymentId, x.Mode == CheckMode, x.Amount))
                    .ToList());

        return new SourceCheck
        {
            Direction = Issued,
            VoucherType = VoucherTypes.Payment,
            VoucherId = voucher.PaymentVoucherId,
            VoucherNo = voucher.VoucherNo,
            VoucherDate = voucher.VoucherDate,
            BranchId = voucher.BranchId,
            BranchName = voucher.BranchName,
            PartyName = string.IsNullOrWhiteSpace(payment.PayeeName)
                ? voucher.PartyName
                : payment.PayeeName,
            PaymentId = payment.PaymentVoucherPaymentId,
            CheckNo = payment.CheckNo,
            CheckDate = payment.CheckDate,
            CheckBank = payment.CheckBank,
            Amount = payment.Amount,
            AccountLedgerCode = payment.LedgerCode,
            AccountLedgerName = payment.LedgerName,
            Parties = allocation[paymentId],
            Sync = (status, clearedNo, clearedDate) =>
            {
                payment.CheckStatus = status;
                payment.ClearedVoucherNo = clearedNo;
                payment.ClearedDate = clearedDate;
            }
        };
    }


    //===========================================================
    // Allocate the party lines to the checks
    //
    // The voucher posted the party lines in order up to the
    // non-check total. What is left of the lines, in order,
    // belongs to the checks in their line order.
    //===========================================================

    public static Dictionary<long, List<PartySlice>> Allocate
    (
        List<PartySlice> lines,
        List<(long Id, bool IsCheck, decimal Amount)> payments
    )
    {
        decimal[] left =
            lines.Select(x => x.Amount).ToArray();

        int index = 0;

        // Skip what the voucher already posted
        decimal skip =
            payments.Where(x => !x.IsCheck).Sum(x => x.Amount);

        while (skip > 0 && index < left.Length)
        {
            decimal take =
                Math.Min(left[index], skip);

            left[index] -= take;
            skip -= take;

            if (left[index] <= 0)
            {
                index++;
            }
        }

        Dictionary<long, List<PartySlice>> result =
            new();

        foreach ((long id, bool isCheck, decimal amount) in payments)
        {
            if (!isCheck)
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
                        "The voucher's party lines do not cover its checks.");
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
    // State row of a check (created on the first action)
    //===========================================================

    private async Task<CheckReconciliations>
        StateAsync
        (
            SourceCheck source,
            long userId,
            DateTime now
        )
    {
        CheckReconciliations? state =
            await _context
                .Set<CheckReconciliations>()
                .FirstOrDefaultAsync(
                    x => x.Direction == source.Direction
                         && x.SourcePaymentId == source.PaymentId);

        if (state != null)
        {
            return state;
        }

        state =
            new CheckReconciliations
            {
                Direction = source.Direction,
                SourceVoucherType = source.VoucherType,
                SourceVoucherId = source.VoucherId,
                SourceVoucherNo = source.VoucherNo,
                SourcePaymentId = source.PaymentId,
                BranchId = source.BranchId,
                BranchName = Limit(source.BranchName, 200),
                CheckNo = Limit(source.CheckNo, 50),
                CheckDate = source.CheckDate,
                CheckBank = Limit(source.CheckBank, 200),
                PartyName = Limit(source.PartyName, 250),
                Amount = source.Amount,
                AccountLedgerCode = source.AccountLedgerCode,
                AccountLedgerName = Limit(source.AccountLedgerName, 250),
                Status = Pending,
                CreatedBy = userId,
                CreatedDate = now
            };

        _context.Set<CheckReconciliations>().Add(state);

        // The id is needed by the history rows
        await _context.SaveChangesAsync();

        return state;
    }

    private static void ClearDeposit
    (
        CheckReconciliations state
    )
    {
        state.DepositDate = null;
        state.DepositSlipId = null;
        state.DepositSlipNo = string.Empty;
        state.DepositLedgerCode = string.Empty;
        state.DepositLedgerName = string.Empty;
    }

    private static void Touch
    (
        CheckReconciliations state,
        long userId,
        DateTime now
    )
    {
        state.ModifiedBy = userId;
        state.ModifiedDate = now;
    }

    private static void RequireStatus
    (
        CheckReconciliations state,
        string action,
        string status
    )
    {
        if (!string.Equals(state.Status, status, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                $"Check {state.CheckNo} is {state.Status}; only a {status} check can be {action}.");
        }
    }


    //===========================================================
    // Clearing voucher : load (locked) and reverse
    //===========================================================

    private async Task<CheckReconciliationVouchers>
        LoadVoucherAsync
        (
            long? id
        )
    {
        if (id == null)
        {
            throw new KeyNotFoundException(
                "Clearing voucher not found.");
        }

        await _context.Database.ExecuteSqlInterpolatedAsync(
            $@"SELECT 1 FROM ""CheckReconciliationVouchers"" WHERE ""CheckReconciliationVoucherId"" = {id.Value} FOR UPDATE");

        return await _context
                   .Set<CheckReconciliationVouchers>()
                   .FirstOrDefaultAsync(x => x.CheckReconciliationVoucherId == id.Value)
               ??
               throw new KeyNotFoundException(
                   "Clearing voucher not found.");
    }

    private async Task
        ReverseVoucherAsync
        (
            CheckReconciliationVouchers voucher,
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
    // Dates
    //
    // Not after today; not before the voucher date; not before
    // the check date (a post-dated check waits); open financial
    // year.
    //===========================================================

    private async Task EnsureDateAsync
    (
        DateOnly date,
        SourceCheck source,
        string label,
        bool checkDateRule = true
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
                $"{label} cannot be before the voucher date ({source.VoucherDate:dd-MM-yyyy}, {source.VoucherNo}).");
        }

        if (checkDateRule && source.CheckDate.HasValue && date < source.CheckDate.Value)
        {
            throw new InvalidOperationException(
                $"{label} cannot be before the check date ({source.CheckDate.Value:dd-MM-yyyy}).");
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

    private static DateOnly BusinessToday()
    {
        return DateOnly.FromDateTime(
            TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow,
                BusinessZone));
    }


    //===========================================================
    // History / activity
    //===========================================================

    private void AddHistory
    (
        CheckReconciliations state,
        string action,
        DateOnly actionDate,
        long userId,
        DateTime now,
        string ledgerCode = "",
        string ledgerName = "",
        string voucherNo = "",
        string slipNo = "",
        decimal charge = 0,
        decimal recovery = 0,
        string reason = ""
    )
    {
        _context.Set<CheckReconciliationHistory>().Add(
            new CheckReconciliationHistory
            {
                CheckReconciliationId = state.CheckReconciliationId,
                Action = action,
                ActionDate = actionDate,
                Status = state.Status,
                LedgerCode = ledgerCode ?? string.Empty,
                LedgerName = Limit(ledgerName, 250),
                VoucherNo = voucherNo ?? string.Empty,
                DepositSlipNo = slipNo ?? string.Empty,
                Charge = charge,
                Recovery = recovery,
                Reason = Limit(reason, 500),
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
                PerformedByName = "System",
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

    private static string ParseDirection
    (
        string? direction
    )
    {
        string text =
            (direction ?? string.Empty).Trim();

        if (text.Equals(Received, StringComparison.OrdinalIgnoreCase))
        {
            return Received;
        }

        if (text.Equals(Issued, StringComparison.OrdinalIgnoreCase))
        {
            return Issued;
        }

        throw new InvalidOperationException(
            "Direction must be Received or Issued.");
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