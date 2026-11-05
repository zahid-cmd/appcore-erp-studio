//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


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

    // The list page : one page, filtered, sorted, with the counts
    Task<PagedResult<ReceiptVoucherDto>> GetPagedAsync(
        VoucherPageRequest request);

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
    // Receipts of other documents (Sales Invoices : the Payment
    // Desk rows). Same rules and posting as the RV page; run in
    // the caller's transaction when there is one.
    //===========================================================

    // Checks the rows only (nothing saved)
    Task ValidateAsync(
        CreateReceiptVoucherDto dto);

    // Saves, approves and posts at once; referenceNo = the
    // document number (Reference No of the journal rows)
    Task<ReceiptVoucherSavedDto> CreatePostedAsync(
        CreateReceiptVoucherDto dto,
        string referenceNo,
        long userId);


    //===========================================================
    // Exists
    //===========================================================

    Task<bool> ExistsAsync(
        long id);


    // Public Id -> internal id (live rows only; null = not found)
    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);
}
