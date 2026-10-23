//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.VoucherManagement;


//===============================================================
// Update Receipt Voucher DTO (Draft only)
//===============================================================

public class UpdateReceiptVoucherDto : CreateReceiptVoucherDto
{
    public long ReceiptVoucherId { get; set; }
}


//===============================================================
// Cancel Receipt Voucher DTO (Posted only)
//===============================================================

public class CancelReceiptVoucherDto
{
    // yyyy-MM-dd (empty = today)
    public string CancelDate { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;
}