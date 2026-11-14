//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.FinancialStatements;


//===============================================================
// Daily statements repository (read only)
//
//   Daily Collection Statement
//   Invoice-wise Daily Profit & Loss (MB / SP / AC)
//
// Dates   : yyyy-MM-dd (empty = today)
// branchId: 0 = every branch the user is allotted to; another
//           branch must be one of them (400 otherwise)
//===============================================================

public interface IDailyStatementsRepository
{
    Task<DailyCollectionDto> GetDailyCollectionAsync(
        long userId,
        string? from,
        string? to,
        long branchId,
        bool showCancelled);

    Task<InvoiceProfitDto> GetInvoiceProfitAsync(
        long userId,
        string? from,
        string? to,
        long branchId,
        bool showCancelled);
}
