//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.VoucherManagement;


//===============================================================
// Create Payment Voucher DTO (saved as Draft)
//
// Voucher No, branch code / name, financial year, sub group /
// ledger names, party codes and totals are always resolved by
// the server.
//===============================================================

public class CreatePaymentVoucherDto
{
    // yyyy-MM-dd
    public string VoucherDate { get; set; } = string.Empty;

    // The branch the user logged in with
    public long BranchId { get; set; }

    public string Narration { get; set; } = string.Empty;

    // Pay To rows (entered first)
    public List<PaymentVoucherDebitDto> Debits { get; set; } = new();

    // Payment Mode rows
    public List<PaymentVoucherCreditDto> Credits { get; set; } = new();
}