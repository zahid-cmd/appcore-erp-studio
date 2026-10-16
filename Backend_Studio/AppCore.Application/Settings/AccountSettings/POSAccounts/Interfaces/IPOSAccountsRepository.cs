// PAGE-CLONED : MFS Accounts -> POS Accounts
// PAGE-CLONED : Bank Accounts -> POS Accounts
// PAGE-CLONED : Cash Accounts -> POS Accounts
// PAGE-CLONED : Wings -> POS Accounts
//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Settings.AccountSettings.POSAccounts.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings;


//===============================================================
// POSAccount Repository Interface
//===============================================================

public interface IPOSAccountsRepository
{
    //===========================================================
    // Get All
    //===========================================================

    Task<List<POSAccountDto>> GetAllAsync();


    //===========================================================
    // Get By Id
    //===========================================================

    Task<POSAccountDto?> GetByIdAsync(
        long id);


    //===========================================================
    // Create
    //===========================================================

    Task<long> CreateAsync(
        CreatePOSAccountDto dto,
        long userId);


    //===========================================================
    // Update
    //===========================================================

    Task UpdateAsync(
        UpdatePOSAccountDto dto,
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

    Task<POSAccountsDefaultsDto> GetDefaultsAsync(
        long accountSubGroupsId);
}