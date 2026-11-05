//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Settings.ProductSettings.BrandManagement.DTOs;


//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Brand Management Repository Interface
//===============================================================

public interface IBrandManagementRepository
{
    Task<List<BrandManagementDto>> GetAllAsync();

    // The list page : one page, filtered, sorted, with the counts
    Task<PagedResult<BrandManagementDto>> GetPagedAsync(
        BrandManagementPageRequest request);

    // Public Id -> internal id (live rows only; null = not found)
    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);

    Task<BrandManagementDto?> GetByIdAsync(
        long id);

    Task<long> CreateAsync(
        CreateBrandManagementDto dto,
        long userId);

    Task UpdateAsync(
        UpdateBrandManagementDto dto,
        long userId);

    Task DeleteAsync(
        long id,
        long userId);

    Task<bool> RestoreAsync(
        long userId);

    Task<bool> ExistsAsync(
        long id);

    Task<string> GetNextCodeAsync();

    Task<BrandManagementDefaultsDto> GetDefaultsAsync();


    //===========================================================
    // Brand Image : store the new path (or '' to clear).
    // Returns the previous path so the old file can be removed.
    //===========================================================

    Task<string> SetImagePathAsync(
        long id,
        string imagePath,
        long userId);
}