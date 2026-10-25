//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.AccountsReconciliation;


//===============================================================
// MFS Reconciliations Repository
//
// MFS receipts come from POSTED Receipt Vouchers (Mode MFS).
// Every action runs in one transaction and locks the source
// voucher(s), so a Cancel of the voucher never runs at the same
// time.
//
// InvalidOperationException : rule broken (409 / 400)
// KeyNotFoundException      : transaction / voucher not found
//                             (404)
//===============================================================

public interface IMfsReconciliationsRepository
{
    //===========================================================
    // Read
    //===========================================================

    Task<List<MfsReconciliationDto>> GetAllAsync();

    Task<List<MfsReconciliationHistoryDto>> GetHistoryAsync(
        long paymentId);

    // MFS Settlement Center : next RRV preview
    Task<MfsCenterDefaultsDto> GetDefaultsAsync(
        long branchId,
        DateOnly date);

    // Every MFS account (Merchant + Personal) with its linked
    // bank resolved BY CODE
    Task<List<MfsWalletDto>> GetWalletsAsync();

    // Print (by id)
    Task<MfsReconciliationVoucherDto?> GetVoucherAsync(
        long id);

    // Auto Settlement log, newest first
    Task<List<MfsAutoSettlementRunDto>> GetAutoRunsAsync(
        int days);


    //===========================================================
    // Actions
    //===========================================================

    Task<MfsActionResultDto> SettleAsync(
        MfsSettleDto dto,
        long userId);

    Task<MfsActionResultDto> RejectAsync(
        MfsRejectDto dto,
        long userId);

    // Undo Settle (whole RRV) or Undo Reject, by the line's
    // status
    Task<MfsActionResultDto> UndoAsync(
        MfsUndoDto dto,
        long userId);


    //===========================================================
    // Auto Settlement (nightly job, switch 0051)
    //
    // Runs every date from the day after the last Completed run
    // up to today (today only after 23:59 Bangladesh time).
    // Safe to call any number of times.
    //===========================================================

    Task<MfsAutoSettlementResultDto> RunAutoSettlementAsync(
        CancellationToken cancellationToken);
}