//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Settings.AccountSettings.ChartOfAccounts.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings;


//===============================================================
// Chart of Accounts Repository Interface (read-only)
//===============================================================

public interface IChartOfAccountsRepository
{
    //===========================================================
    // Tree : Class → Group → Sub Group, with ledger counts
    //===========================================================

    Task<List<ChartOfAccountsClassDto>> GetTreeAsync();


    //===========================================================
    // Ledgers of one Sub Group
    //===========================================================

    Task<List<ChartOfAccountsDto>> GetSubGroupLedgersAsync(
        long subGroupId);


    //===========================================================
    // All Ledgers (printing)
    //===========================================================

    Task<List<ChartOfAccountsDto>> GetAllLedgersAsync();


    //===========================================================
    // Link Issues (broken / inconsistent links)
    //===========================================================

    Task<List<ChartOfAccountsIssueDto>> GetIssuesAsync();


    //===========================================================
    // Sub Group Exists
    //===========================================================

    Task<bool> SubGroupExistsAsync(
        long subGroupId);
}