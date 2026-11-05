//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.VoucherManagement;


//===============================================================
// Journal Voucher Repository Interface
//===============================================================

public interface IJournalVoucherRepository
{
    //===========================================================
    // Read
    //===========================================================

    Task<List<JournalVoucherDto>> GetAllAsync();

    // The list page : one page, filtered, sorted, with the counts
    Task<PagedResult<JournalVoucherDto>> GetPagedAsync(
        VoucherPageRequest request);

    Task<JournalVoucherDto?> GetByIdAsync(
        long id);

    // Next voucher number preview (Add form)
    Task<JournalVoucherDefaultsDto> GetDefaultsAsync(
        long branchId,
        DateOnly voucherDate);


    //===========================================================
    // Draft
    //===========================================================

    Task<JournalVoucherSavedDto> CreateAsync(
        CreateJournalVoucherDto dto,
        long userId);

    Task UpdateAsync(
        UpdateJournalVoucherDto dto,
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
        CancelJournalVoucherDto dto,
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
