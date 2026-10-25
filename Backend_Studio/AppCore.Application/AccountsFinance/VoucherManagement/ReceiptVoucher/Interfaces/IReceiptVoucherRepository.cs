//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.VoucherManagement;


//===============================================================
// Receipt Voucher Repository Interface
//===============================================================

public interface IReceiptVoucherRepository
{
    //===========================================================
    // Read
    //===========================================================

    Task<List<ReceiptVoucherDto>> GetAllAsync();

    Task<ReceiptVoucherDto?> GetByIdAsync(
        long id);

    // Next voucher number preview (Add form)
    Task<ReceiptVoucherDefaultsDto> GetDefaultsAsync(
        long branchId,
        DateOnly voucherDate);


    //===========================================================
    // Draft
    //===========================================================

    Task<ReceiptVoucherSavedDto> CreateAsync(
        CreateReceiptVoucherDto dto,
        long userId);

    Task UpdateAsync(
        UpdateReceiptVoucherDto dto,
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
        CancelReceiptVoucherDto dto,
        long userId);


    //===========================================================
    // Exists
    //===========================================================

    Task<bool> ExistsAsync(
        long id);
}