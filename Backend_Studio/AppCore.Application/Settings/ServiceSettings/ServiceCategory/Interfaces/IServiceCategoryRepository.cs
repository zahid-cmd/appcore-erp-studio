//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Service Category Repository Interface
//===============================================================

public interface IServiceCategoryRepository
{
    //===========================================================
    // Get All
    //===========================================================

    Task<List<ServiceCategoryDto>> GetAllAsync();


    // One list page (server paging) with Total / Active / Inactive
    Task<AppCore.Application.Common.Paging.PagedResult<ServiceCategoryDto>> GetPagedAsync(
        ServiceSettingsPageRequest request);


    // Public Id -> internal id (live rows only; null = not found)

    Task<long?> GetIdByPublicIdAsync(

        Guid publicId);


    //===========================================================
    // Get By Id
    //===========================================================

    Task<ServiceCategoryDto?> GetByIdAsync(
        long id);


    //===========================================================
    // Create
    //===========================================================

    Task<long> CreateAsync(
        CreateServiceCategoryDto dto,
        long userId);


    //===========================================================
    // Update
    //===========================================================

    Task UpdateAsync(
        UpdateServiceCategoryDto dto,
        long userId);


    //===========================================================
    // Delete
    //===========================================================

    Task DeleteAsync(
        long id,
        long userId);


    //===========================================================
    // Restore
    //===========================================================

    Task<bool> RestoreAsync(
        long userId);


    //===========================================================
    // Exists
    //===========================================================

    Task<bool> ExistsAsync(
        long id);


    //===========================================================
    // Get Next Service Category Code
    // (BRS-nnn Brand Services / DRS-nnn Differential Services)
    //===========================================================

    Task<string> GetNextCodeAsync(
        string categoryType);


    //===========================================================
    // Get Defaults
    //===========================================================

    Task<ServiceCategoryDefaultsDto> GetDefaultsAsync();
}