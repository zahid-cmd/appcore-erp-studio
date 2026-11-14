//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.FinancialStatements;


//===============================================================
// Final Accounts repository (read only) : Profit & Loss and
// Balance Sheet, built on the Trial Balance engine
//
// Dates   : yyyy-MM-dd
// branchId: 0 = every branch the user is allotted to; another
//           branch must be one of them (400 otherwise)
// compare : FinalAccountsCompare (anything else = none)
//===============================================================

public interface IFinalAccountsRepository
{
    // The financial year that holds the date (empty = today)
    Task<FinalAccountsYearDto> GetYearAsync(
        string? date);

    // from empty = start of the financial year of To; to empty =
    // today
    Task<ProfitLossDto> GetProfitLossAsync(
        long userId,
        string? from,
        string? to,
        long branchId,
        bool showCancelled,
        string? compare);

    // asOn empty = today
    Task<BalanceSheetDto> GetBalanceSheetAsync(
        long userId,
        string? asOn,
        long branchId,
        bool showCancelled,
        string? compare);
}
