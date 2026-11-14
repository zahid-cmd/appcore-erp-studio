//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.FinancialStatements;


//===============================================================
// Financial flows repository (read only)
//
//   Cash flows        : Receipt & Payment Account, Cash Flow
//                       Statement
//   Changes in Equity
//
// Dates   : yyyy-MM-dd (from empty = this month's first day,
//           to empty = today)
// branchId: 0 = every branch the user is allotted to; another
//           branch must be one of them (400 otherwise)
//===============================================================

public interface IFinancialFlowsRepository
{
    Task<CashFlowsDto> GetCashFlowsAsync(
        long userId,
        string? from,
        string? to,
        long branchId,
        bool showCancelled);

    Task<ChangesInEquityDto> GetChangesInEquityAsync(
        long userId,
        string? from,
        string? to,
        long branchId,
        bool showCancelled);
}
