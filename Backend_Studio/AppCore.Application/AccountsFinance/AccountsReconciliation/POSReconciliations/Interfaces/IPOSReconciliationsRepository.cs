//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.AccountsReconciliation;


//===============================================================
// POS Reconciliations Repository
//
// POS receipts come from POSTED Receipt Vouchers (Mode POS).
// Every action runs in one transaction and locks the source
// voucher(s), so a Cancel of the voucher never runs at the same
// time.
//
// InvalidOperationException : rule broken (409 / 400)
// KeyNotFoundException      : transaction / voucher not found
//                             (404)
//===============================================================

public interface IPosReconciliationsRepository
{
    //===========================================================
    // Read
    //===========================================================

    Task<List<PosReconciliationDto>> GetAllAsync();

    Task<List<PosReconciliationHistoryDto>> GetHistoryAsync(
        long paymentId);

    // POS Settlement Center : next RRV preview
    Task<PosCenterDefaultsDto> GetDefaultsAsync(
        long branchId,
        DateOnly date);

    // Bank accounts that POS accounts are linked to (by code),
    // each with its POS accounts : one settlement batch per bank
    Task<List<PosBankDto>> GetBanksAsync();

    // Print (by id)
    Task<PosReconciliationVoucherDto?> GetVoucherAsync(
        long id);

    // Auto Settlement log, newest first
    Task<List<PosAutoSettlementRunDto>> GetAutoRunsAsync(
        int days);


    //===========================================================
    // Actions
    //===========================================================

    Task<PosActionResultDto> SettleAsync(
        PosSettleDto dto,
        long userId);

    Task<PosActionResultDto> RejectAsync(
        PosRejectDto dto,
        long userId);

    // Undo Settle (whole RRV) or Undo Reject, by the line's
    // status
    Task<PosActionResultDto> UndoAsync(
        PosUndoDto dto,
        long userId);


    //===========================================================
    // Auto Settlement (nightly job, switch 0054)
    //
    // Runs every date from the day after the last Completed run
    // up to today (today only after 23:59 Bangladesh time).
    // Safe to call any number of times.
    //===========================================================

    Task<PosAutoSettlementResultDto> RunAutoSettlementAsync(
        CancellationToken cancellationToken);
}