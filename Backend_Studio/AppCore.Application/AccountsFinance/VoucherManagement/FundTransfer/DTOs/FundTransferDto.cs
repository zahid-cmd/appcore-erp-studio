//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.VoucherManagement;


//===============================================================
// Fund Transfer DTO (list : header only; view : + lines)
//===============================================================

public class FundTransferDto
{
    public long FundTransferId { get; set; }

    public string VoucherNo { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string VoucherDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchCode { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public long FinancialYearId { get; set; }

    // "Cash to Bank", "Bank to Bank" ...
    public string TransferType { get; set; } = string.Empty;

    // "From account → To account"
    public string PartyName { get; set; } = string.Empty;

    public string Narration { get; set; } = string.Empty;

    public decimal TotalAmount { get; set; }

    // Bank / MFS charges the company pays on top
    public decimal Charges { get; set; }

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

    // From rows first, then To rows
    public List<FundTransferLineDto> Lines { get; set; } = new();
}


//===============================================================
// Line (From / To)
//===============================================================

public class FundTransferLineDto
{
    // From / To
    public string Side { get; set; } = string.Empty;

    // Cash / Bank / MFS
    public string AccountType { get; set; } = string.Empty;

    public string SubGroupCode { get; set; } = string.Empty;

    public string SubGroupName { get; set; } = string.Empty;

    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public long AccountId { get; set; }

    // Branch of the account (server sets it)
    public string AccountBranch { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public string ShortNotes { get; set; } = string.Empty;

    // From rows : Cash / Bank Transfer / Cheque / MFS
    public string Method { get; set; } = string.Empty;

    // Bank transfer reference / MFS transaction id
    public string Reference { get; set; } = string.Empty;

    public string CheckNo { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string CheckDate { get; set; } = string.Empty;

    // Charge the company pays on top (From Bank / MFS rows)
    public decimal ChargeAmount { get; set; }
}


//===============================================================
// Create result (the number actually taken)
//===============================================================

public class FundTransferSavedDto
{
    public long FundTransferId { get; set; }

    public string VoucherNo { get; set; } = string.Empty;
}