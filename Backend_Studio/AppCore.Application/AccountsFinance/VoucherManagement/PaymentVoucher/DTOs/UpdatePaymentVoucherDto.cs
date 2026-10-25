//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.VoucherManagement;


//===============================================================
// Update Payment Voucher DTO (Draft only)
//===============================================================

public class UpdatePaymentVoucherDto : CreatePaymentVoucherDto
{
    public long PaymentVoucherId { get; set; }
}


//===============================================================
// Cancel Payment Voucher DTO (Posted only)
//===============================================================

public class CancelPaymentVoucherDto
{
    // yyyy-MM-dd (empty = today)
    public string CancelDate { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;
}