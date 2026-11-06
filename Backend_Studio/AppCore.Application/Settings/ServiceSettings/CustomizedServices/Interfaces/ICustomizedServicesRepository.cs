//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Customized Services Repository Interface
//===============================================================

public interface ICustomizedServicesRepository
{
    //===========================================================
    // Get All
    //===========================================================

    Task<List<CustomizedServicesDto>> GetAllAsync();


    // One list page (server paging) with Total / Active / Inactive
    Task<AppCore.Application.Common.Paging.PagedResult<CustomizedServicesDto>> GetPagedAsync(
        ServiceSettingsPageRequest request);


    // Public Id -> internal id (live rows only; null = not found)

    Task<long?> GetIdByPublicIdAsync(

        Guid publicId);


    //===========================================================
    // Get By Id
    //===========================================================

    Task<CustomizedServicesDto?> GetByIdAsync(
        long id);


    //===========================================================
    // Create
    //===========================================================

    Task<long> CreateAsync(
        CreateCustomizedServicesDto dto,
        long userId);


    //===========================================================
    // Update
    //===========================================================

    Task UpdateAsync(
        UpdateCustomizedServicesDto dto,
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
    // Get Defaults
    // (Customized Services sub categories with the next codes)
    //===========================================================

    Task<CustomizedServicesDefaultsDto> GetDefaultsAsync();
}