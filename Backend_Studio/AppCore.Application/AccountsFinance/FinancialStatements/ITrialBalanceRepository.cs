//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.FinancialStatements;


//===============================================================
// Trial Balance repository (read only)
//
// from / to : yyyy-MM-dd (empty = this month's first day / today)
// branchId  : 0 = every branch the user is allotted to; another
//             branch must be one of them
// showCancelled false : a cancelled voucher and its reversal are
//                       left out (they net to nothing)
//===============================================================

public interface ITrialBalanceRepository
{
    // Branches the user is allotted to (Branch Assignment)
    Task<List<TrialBalanceBranchDto>> GetBranchesAsync(
        long userId);

    Task<TrialBalanceDto> GetTrialBalanceAsync(
        long userId,
        string? from,
        string? to,
        long branchId,
        bool showCancelled);
}
