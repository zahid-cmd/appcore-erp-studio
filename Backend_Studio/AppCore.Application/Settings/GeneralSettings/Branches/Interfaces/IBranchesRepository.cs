//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Settings.GeneralSettings.Branches.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings;


//===============================================================
// Branches Repository Interface
//===============================================================

public interface IBranchesRepository
{
    //===========================================================
    // Get All
    //===========================================================

    Task<List<BranchesDto>> GetAllAsync();


    // One list page (server paging) with Total / Active / Inactive
    Task<AppCore.Application.Common.Paging.PagedResult<BranchesDto>> GetPagedAsync(
        GeneralSettingsPageRequest request);


    // Public Id -> internal id (live rows only; null = not found)

    Task<long?> GetIdByPublicIdAsync(

        Guid publicId);


    //===========================================================
    // Get By Id
    //===========================================================

    Task<BranchesDto?> GetByIdAsync(
        long id);


    //===========================================================
    // Create
    //===========================================================

    Task<long> CreateAsync(
        CreateBranchesDto dto,
        long userId);


    //===========================================================
    // Update
    //===========================================================

    Task UpdateAsync(
        UpdateBranchesDto dto,
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

    Task<string> GetNextCodeAsync(
        long wingId);


    //===========================================================
    // Get Defaults
    //===========================================================

    Task<BranchesDefaultsDto> GetDefaultsAsync(
        long wingId);
}