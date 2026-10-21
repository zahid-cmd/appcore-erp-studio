//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Settings.AccountSettings.AutoAccounts.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings;


//===============================================================
// Auto Accounts Repository Interface (read-only)
//===============================================================

public interface IAutoAccountsRepository
{
    //===========================================================
    // Codes of the auto-created groups / sub groups / ledgers,
    // split into Inventory and Financial
    //===========================================================

    Task<AutoAccountCodesDto> GetCodesAsync();
}