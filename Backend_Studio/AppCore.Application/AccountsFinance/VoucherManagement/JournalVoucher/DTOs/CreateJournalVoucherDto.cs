//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.VoucherManagement;


//===============================================================
// Create Journal Voucher DTO (saved as Draft)
//
// Voucher No, branch code / name, financial year, sub group /
// ledger names, party codes, group / line numbers and totals are
// always resolved by the server.
//===============================================================

public class CreateJournalVoucherDto
{
    // yyyy-MM-dd
    public string VoucherDate { get; set; } = string.Empty;

    // The branch the user logged in with
    public long BranchId { get; set; }

    public string Narration { get; set; } = string.Empty;

    // Debits and credits, group by group
    public List<JournalVoucherLineDto> Lines { get; set; } = new();
}