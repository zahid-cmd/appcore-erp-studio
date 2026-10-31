//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.AccountingRegisters;


//===============================================================
// Ledger Statements and Registers repository (read only)
//
// type   : general-ledger / cash / bank / mfs / pos / emi
// from   : yyyy-MM-dd (empty = this month); to likewise
// branch : 0 = all branches
// showCancelled false : a cancelled voucher and its reversal
//                       are left out (they net to nothing)
//===============================================================

public interface ILedgerRegistersRepository
{
    Task<LedgerChartDto> GetChartAsync(
        string? type);

    Task<LedgerStatementDto> GetStatementAsync(
        string? type,
        string? ledgerCode,
        string? from,
        string? to,
        long branchId,
        bool showCancelled);

    Task<LedgerSummaryDto> GetSummaryAsync(
        string? type,
        string? classCode,
        string? groupCode,
        string? subGroupCode,
        string? from,
        string? to,
        long branchId,
        bool showCancelled);

    // null when the voucher has no posted lines
    Task<LedgerVoucherDto?> GetVoucherAsync(
        string? voucherType,
        string? voucherNo);
}
