//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.VoucherManagement;


//===============================================================
// Update Journal Voucher DTO (Draft only)
//===============================================================

public class UpdateJournalVoucherDto : CreateJournalVoucherDto
{
    public long JournalVoucherId { get; set; }
}


//===============================================================
// Cancel Journal Voucher DTO (Posted only)
//===============================================================

public class CancelJournalVoucherDto
{
    // yyyy-MM-dd (empty = today)
    public string CancelDate { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;
}