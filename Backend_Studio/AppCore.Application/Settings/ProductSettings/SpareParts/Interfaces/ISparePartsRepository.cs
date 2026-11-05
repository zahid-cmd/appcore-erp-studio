//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Spare Parts Repository Interface
//===============================================================

public interface ISparePartsRepository
{
    Task<List<SparePartsDto>> GetAllAsync();

    // The list page : one page, filtered, sorted, with the counts
    Task<PagedResult<SparePartsDto>> GetPagedAsync(
        SparePartsPageRequest request);

    // Public Id -> internal id (live parts only; null = not found)
    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);

    Task<SparePartsDto?> GetByIdAsync(
        long id);

    Task<long> CreateAsync(
        CreateSparePartsDto dto,
        long userId);

    Task UpdateAsync(
        UpdateSparePartsDto dto,
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

    Task<SparePartsDefaultsDto> GetDefaultsAsync(
        long productSubCategoryId);


    //===========================================================
    // Spare Part Image : store the new path (or '' to clear).
    // Returns the previous path so the old file can be removed.
    //===========================================================

    Task<string> SetImagePathAsync(
        long id,
        string imagePath,
        long userId);
}