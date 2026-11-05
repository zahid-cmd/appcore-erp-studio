//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Accessories Repository Interface
//===============================================================

public interface IAccessoriesRepository
{
    Task<List<AccessoriesDto>> GetAllAsync();

    // The list page : one page, filtered, sorted, with the counts
    Task<PagedResult<AccessoriesDto>> GetPagedAsync(
        AccessoriesPageRequest request);

    // Public Id -> internal id (live rows only; null = not found)
    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);

    Task<AccessoriesDto?> GetByIdAsync(
        long id);

    Task<long> CreateAsync(
        CreateAccessoriesDto dto,
        long userId);

    Task UpdateAsync(
        UpdateAccessoriesDto dto,
        long userId);

    Task DeleteAsync(
        long id,
        long userId);

    Task<bool> RestoreAsync(
        long userId);

    Task<bool> ExistsAsync(
        long id);


    //===========================================================
    // Code preview for a sub category ('' codes when none given)
    //===========================================================

    Task<AccessoriesDefaultsDto> GetDefaultsAsync(
        long productSubCategoryId);
}