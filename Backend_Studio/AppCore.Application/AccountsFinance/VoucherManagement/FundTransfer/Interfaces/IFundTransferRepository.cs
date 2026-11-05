//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.VoucherManagement;


//===============================================================
// Fund Transfer Repository Interface
//===============================================================

public interface IFundTransferRepository
{
    //===========================================================
    // Read
    //===========================================================

    Task<List<FundTransferDto>> GetAllAsync();

    // The list page : one page, filtered, sorted, with the counts
    Task<PagedResult<FundTransferDto>> GetPagedAsync(
        VoucherPageRequest request);

    Task<FundTransferDto?> GetByIdAsync(
        long id);

    // Next voucher number preview (Add form)
    Task<FundTransferDefaultsDto> GetDefaultsAsync(
        long branchId,
        DateOnly voucherDate);


    //===========================================================
    // Draft
    //===========================================================

    Task<FundTransferSavedDto> CreateAsync(
        CreateFundTransferDto dto,
        long userId);

    Task UpdateAsync(
        UpdateFundTransferDto dto,
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
        CancelFundTransferDto dto,
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
