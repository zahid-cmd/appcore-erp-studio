//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.VoucherManagement;


//===============================================================
// Create Receipt Voucher DTO (saved as Draft)
//
// Voucher No, branch code / name, financial year, sub group /
// ledger names, party codes and totals are always resolved by
// the server.
//===============================================================

public class CreateReceiptVoucherDto
{
    // yyyy-MM-dd
    public string VoucherDate { get; set; } = string.Empty;

    // The branch the user logged in with
    public long BranchId { get; set; }

    public string Narration { get; set; } = string.Empty;

    // Receipt Mode rows (entered first)
    public List<ReceiptVoucherDebitDto> Debits { get; set; } = new();

    // Account Details rows
    public List<ReceiptVoucherCreditDto> Credits { get; set; } = new();
}