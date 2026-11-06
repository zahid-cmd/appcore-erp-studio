// PAGE-CLONED : Bank Setup -> Card Setup
// PAGE-CLONED : Wings -> Card Setup
//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Settings.AccountSettings.CardSetup.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings;


//===============================================================
// CardSetup Repository Interface
//===============================================================

public interface ICardSetupRepository
{
    //===========================================================
    // Get All
    //===========================================================

    Task<List<CardSetupDto>> GetAllAsync();


    // One list page (server paging) with Total / Active / Inactive
    Task<AppCore.Application.Common.Paging.PagedResult<CardSetupDto>> GetPagedAsync(
        AccountSettingsPageRequest request);


    // Public Id -> internal id (live rows only; null = not found)

    Task<long?> GetIdByPublicIdAsync(

        Guid publicId);


    //===========================================================
    // Get By Id
    //===========================================================

    Task<CardSetupDto?> GetByIdAsync(
        long id);


    //===========================================================
    // Create
    //===========================================================

    Task<long> CreateAsync(
        CreateCardSetupDto dto,
        long userId);


    //===========================================================
    // Update
    //===========================================================

    Task UpdateAsync(
        UpdateCardSetupDto dto,
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

    Task<CardSetupDefaultsDto> GetDefaultsAsync();
}