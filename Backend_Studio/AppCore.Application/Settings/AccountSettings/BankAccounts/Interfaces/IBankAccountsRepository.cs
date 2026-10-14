// PAGE-CLONED : Cash Accounts -> Bank Accounts
// PAGE-CLONED : Wings -> Bank Accounts
//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Settings.AccountSettings.BankAccounts.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings;


//===============================================================
// BankAccount Repository Interface
//===============================================================

public interface IBankAccountsRepository
{
    //===========================================================
    // Get All
    //===========================================================

    Task<List<BankAccountDto>> GetAllAsync();


    //===========================================================
    // Get By Id
    //===========================================================

    Task<BankAccountDto?> GetByIdAsync(
        long id);


    //===========================================================
    // Create
    //===========================================================

    Task<long> CreateAsync(
        CreateBankAccountDto dto,
        long userId);


    //===========================================================
    // Update
    //===========================================================

    Task UpdateAsync(
        UpdateBankAccountDto dto,
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

    Task<BankAccountsDefaultsDto> GetDefaultsAsync(
        long accountSubGroupsId);
}