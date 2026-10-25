//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.VoucherManagement;


//===============================================================
// Create Fund Transfer DTO (saved as Draft)
//
// Voucher No, branch code / name, financial year, sub group /
// ledger names, account branches, line numbers and totals are
// always resolved by the server.
//===============================================================

public class CreateFundTransferDto
{
    // yyyy-MM-dd
    public string VoucherDate { get; set; } = string.Empty;

    // The branch the user logged in with
    public long BranchId { get; set; }

    public string Narration { get; set; } = string.Empty;

    // From rows (credit) and To rows (debit)
    public List<FundTransferLineDto> Lines { get; set; } = new();
}