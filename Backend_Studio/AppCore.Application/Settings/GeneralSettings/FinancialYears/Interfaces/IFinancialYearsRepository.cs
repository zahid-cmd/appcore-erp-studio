//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Settings.GeneralSettings.FinancialYears.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings;


//===============================================================
// Financial Years Repository Interface
//===============================================================

public interface IFinancialYearsRepository
{
    //===========================================================
    // Read
    //===========================================================

    Task<List<FinancialYearsDto>> GetAllAsync();


    // One list page (server paging) with Total / Active / Inactive
    Task<AppCore.Application.Common.Paging.PagedResult<FinancialYearsDto>> GetPagedAsync(
        GeneralSettingsPageRequest request);


    // Public Id -> internal id (live rows only; null = not found)

    Task<long?> GetIdByPublicIdAsync(

        Guid publicId);

    Task<FinancialYearsDto?> GetByIdAsync(
        long id);

    Task<FinancialYearsDto?> GetCurrentAsync();

    Task<string> GetNextCodeAsync();

    Task<FinancialYearsDefaultsDto> GetDefaultsAsync();


    //===========================================================
    // Write
    //===========================================================

    Task<long> CreateAsync(
        CreateFinancialYearsDto dto,
        long userId);

    Task UpdateAsync(
        UpdateFinancialYearsDto dto,
        long userId);

    Task DeleteAsync(
        long id,
        long userId);

    Task<bool> RestoreAsync(
        long userId);


    //===========================================================
    // Exists
    //===========================================================

    Task<bool> ExistsAsync(
        long id);
}