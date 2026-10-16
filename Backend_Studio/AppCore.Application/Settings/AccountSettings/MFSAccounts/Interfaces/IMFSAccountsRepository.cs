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