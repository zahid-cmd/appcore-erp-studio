// PAGE-CLONED : Company -> Color Management
//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Settings.ProductSettings.ColorManagement.DTOs;


//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// ColorManagement Repository Interface
//===============================================================

public interface IColorManagementRepository
{
    //===========================================================
    // Get All
    //===========================================================

    Task<List<ColorManagementDto>> GetAllAsync();


    // The list page : one page, filtered, sorted, with the counts

    Task<PagedResult<ColorManagementDto>> GetPagedAsync(

        ColorManagementPageRequest request);


    // Public Id -> internal id (live rows only; null = not found)

    Task<long?> GetIdByPublicIdAsync(

        Guid publicId);


    //===========================================================
    // Get By Id
    //===========================================================

    Task<ColorManagementDto?> GetByIdAsync(
        long id);


    //===========================================================
    // Create
    //===========================================================

    Task<long> CreateAsync(
        CreateColorManagementDto dto,
        long userId);


    //===========================================================
    // Update
    //===========================================================

    Task UpdateAsync(
        UpdateColorManagementDto dto,
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
    // Get Next Code
    //===========================================================

    Task<string> GetNextCodeAsync();


    //===========================================================
    // Get Defaults
    //===========================================================

    Task<ColorManagementDefaultsDto> GetDefaultsAsync();
}