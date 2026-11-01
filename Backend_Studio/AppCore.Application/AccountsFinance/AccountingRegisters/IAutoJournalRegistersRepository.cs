//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.AccountingRegisters;


//===============================================================
// Auto Journal Registers repository (read only)
//
// from / to : yyyy-MM-dd (empty = this month)
// branchId  : 0 = all branches
// node      : module / menu / submenu code; "" = all journals;
//             "OTHER" = types not linked to a page
//===============================================================

public interface IAutoJournalRegistersRepository
{
    Task<AutoJournalTreeDto> GetTreeAsync(
        string? from,
        string? to,
        long branchId);

    Task<AutoJournalListDto> GetJournalsAsync(
        string? from,
        string? to,
        long branchId,
        string? node);
}
