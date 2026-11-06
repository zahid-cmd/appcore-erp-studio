// PAGE-CLONED : Bank Accounts -> MFS Accounts
// PAGE-CLONED : Cash Accounts -> MFS Accounts
// PAGE-CLONED : Wings -> MFS Accounts
//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Settings.AccountSettings.MFSAccounts.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings;


//===============================================================
// MFSAccount Repository Interface
//===============================================================

public interface IMFSAccountsRepository
{
    //===========================================================
    // Get All
    //===========================================================

    Task<List<MFSAccountDto>> GetAllAsync();


    // One list page (server paging) with Total / Active / Inactive
    Task<AppCore.Application.Common.Paging.PagedResult<MFSAccountDto>> GetPagedAsync(
        AccountSettingsPageRequest request);


    // Public Id -> internal id (live rows only; null = not found)

    Task<long?> GetIdByPublicIdAsync(

        Guid publicId);


    //===========================================================
    // Get By Id
    //===========================================================

    Task<MFSAccountDto?> GetByIdAsync(
        long id);


    //===========================================================
    // Create
    //===========================================================

    Task<long> CreateAsync(
        CreateMFSAccountDto dto,
        long userId);


    //===========================================================
    // Update
    //===========================================================

    Task UpdateAsync(
        UpdateMFSAccountDto dto,
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
        long accountSubGroupsId);


    //===========================================================
    // Get Defaults
    //===========================================================

    Task<MFSAccountsDefaultsDto> GetDefaultsAsync(
        long accountSubGroupsId);
}