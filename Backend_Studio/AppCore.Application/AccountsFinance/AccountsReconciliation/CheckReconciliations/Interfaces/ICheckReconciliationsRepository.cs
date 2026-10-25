//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.AccountsReconciliation;


//===============================================================
// Check Reconciliations Repository
//
// Checks come from POSTED Receipt Vouchers (received) and Payment
// Vouchers (issued). Every action runs in one transaction, locks
// the source voucher and keeps its CheckStatus in step.
//
// InvalidOperationException : rule broken (409 / 400)
// KeyNotFoundException      : check / voucher not found (404)
//===============================================================

public interface ICheckReconciliationsRepository
{
    //===========================================================
    // Read
    //===========================================================

    // direction : Received / Issued / empty = both
    Task<List<CheckReconciliationDto>> GetAllAsync(
        string? direction);

    Task<List<CheckReconciliationHistoryDto>> GetCheckHistoryAsync(
        string direction,
        long paymentId);

    // Check Clearing Center : next number preview
    //   mode : deposit (DS) / clear (RRV / RRP) / dishonour (RRV)
    Task<CheckCenterDefaultsDto> GetDefaultsAsync(
        string direction,
        string mode,
        long branchId,
        DateOnly date);

    // Bank accounts a branch may deposit into
    Task<List<CheckBankAccountDto>> GetDepositAccountsAsync(
        long branchId);

    // Print (by id)
    Task<CheckClearingVoucherDto?> GetVoucherAsync(
        long id);

    Task<CheckDepositSlipDto?> GetDepositSlipAsync(
        long id);


    //===========================================================
    // Received
    //===========================================================

    Task<CheckActionResultDto> DepositAsync(
        CheckDepositDto dto,
        long userId);

    Task<CheckActionResultDto> UndoDepositAsync(
        CheckUndoDto dto,
        long userId);

    Task<CheckActionResultDto> DishonourAsync(
        CheckDishonourDto dto,
        long userId);

    Task<CheckActionResultDto> UndoDishonourAsync(
        CheckUndoDto dto,
        long userId);

    Task<CheckActionResultDto> RepresentAsync(
        CheckUndoDto dto,
        long userId);


    //===========================================================
    // Both
    //===========================================================

    Task<CheckActionResultDto> ClearAsync(
        CheckClearDto dto,
        long userId);

    Task<CheckActionResultDto> UndoClearAsync(
        CheckUndoDto dto,
        long userId);


    //===========================================================
    // Issued
    //===========================================================

    Task<CheckActionResultDto> VoidAsync(
        CheckVoidDto dto,
        long userId);

    Task<CheckActionResultDto> UndoVoidAsync(
        CheckUndoDto dto,
        long userId);
}