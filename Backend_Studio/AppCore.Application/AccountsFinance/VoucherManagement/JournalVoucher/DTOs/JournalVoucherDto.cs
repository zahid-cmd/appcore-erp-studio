//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.VoucherManagement;


//===============================================================
// Journal Voucher DTO (list : header only; view : + lines)
//===============================================================

public class JournalVoucherDto
{
    public long JournalVoucherId { get; set; }

    public string VoucherNo { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string VoucherDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchCode { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public long FinancialYearId { get; set; }

    // Supplier / Customer / General Ledger, or Mixed
    public string LedgerType { get; set; } = string.Empty;

    // First debited ledger ("+ n more" when several rows)
    public string PartyName { get; set; } = string.Empty;

    public string Narration { get; set; } = string.Empty;

    public decimal TotalAmount { get; set; }

    public int GroupCount { get; set; }

    // Draft / Approved / Posted / Cancelled
    public string Status { get; set; } = string.Empty;

    public string CancelReason { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string CancelDate { get; set; } = string.Empty;

    public DateTime? ApprovedDate { get; set; }

    public DateTime? PostedDate { get; set; }

    public DateTime? CancelledDate { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? ModifiedDate { get; set; }

    // Debits and credits in screen order (group by group, debits
    // first)
    public List<JournalVoucherLineDto> Lines { get; set; } = new();
}


//===============================================================
// Line (debit or credit)
//===============================================================

public class JournalVoucherLineDto
{
    // Debit / Credit
    public string Side { get; set; } = string.Empty;

    // 1, 2, ... (the server renumbers in order)
    public int GroupNo { get; set; }

    // Supplier / Customer / General Ledger
    public string LedgerType { get; set; } = string.Empty;

    public string SubGroupCode { get; set; } = string.Empty;

    public string SubGroupName { get; set; } = string.Empty;

    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    // Supplier / Customer code (server sets it)
    public string PartyCode { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public string ShortNotes { get; set; } = string.Empty;
}


//===============================================================
// Create result (the number actually taken)
//===============================================================

public class JournalVoucherSavedDto
{
    public long JournalVoucherId { get; set; }

    public string VoucherNo { get; set; } = string.Empty;
}