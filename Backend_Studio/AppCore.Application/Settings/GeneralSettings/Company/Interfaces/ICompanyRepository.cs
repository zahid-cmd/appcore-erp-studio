//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Settings.GeneralSettings.Company.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings;


//===============================================================
// Company Repository Interface
//===============================================================

public interface ICompanyRepository
{
    //===========================================================
    // Get All
    //===========================================================

    Task<List<CompanyDto>> GetAllAsync();


    // One list page (server paging) with Total / Active / Inactive
    Task<AppCore.Application.Common.Paging.PagedResult<CompanyDto>> GetPagedAsync(
        GeneralSettingsPageRequest request);


    // Public Id -> internal id (live rows only; null = not found)

    Task<long?> GetIdByPublicIdAsync(

        Guid publicId);


    //===========================================================
    // Get By Id
    //===========================================================

    Task<CompanyDto?> GetByIdAsync(
        long id);


    //===========================================================
    // Create
    //===========================================================

    Task<long> CreateAsync(
        CreateCompanyDto dto,
        long userId);


    //===========================================================
    // Update
    //===========================================================

    Task UpdateAsync(
        UpdateCompanyDto dto,
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

    Task<CompanyDefaultsDto> GetDefaultsAsync();
}