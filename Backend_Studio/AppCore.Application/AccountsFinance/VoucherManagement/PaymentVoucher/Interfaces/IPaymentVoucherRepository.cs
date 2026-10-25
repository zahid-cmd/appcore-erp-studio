//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.VoucherManagement;


//===============================================================
// Payment Voucher Repository Interface
//===============================================================

public interface IPaymentVoucherRepository
{
    //===========================================================
    // Read
    //===========================================================

    Task<List<PaymentVoucherDto>> GetAllAsync();

    Task<PaymentVoucherDto?> GetByIdAsync(
        long id);

    // Next voucher number preview (Add form)
    Task<PaymentVoucherDefaultsDto> GetDefaultsAsync(
        long branchId,
        DateOnly voucherDate);


    //===========================================================
    // Draft
    //===========================================================

    Task<PaymentVoucherSavedDto> CreateAsync(
        CreatePaymentVoucherDto dto,
        long userId);

    Task UpdateAsync(
        UpdatePaymentVoucherDto dto,
        long userId);

    Task DeleteAsync(
        long id,
        long userId);

    Task<bool> RestoreAsync(
        long userId);


    //===========================================================
    // Workflow
    //===========================================================

    Task ApproveAsync(
        long id,
        long userId);

    Task ReturnToDraftAsync(
        long id,
        long userId);

    Task PostAsync(
        long id,
        long userId);

    Task CancelAsync(
        long id,
        CancelPaymentVoucherDto dto,
        long userId);


    //===========================================================
    // Exists
    //===========================================================

    Task<bool> ExistsAsync(
        long id);
}