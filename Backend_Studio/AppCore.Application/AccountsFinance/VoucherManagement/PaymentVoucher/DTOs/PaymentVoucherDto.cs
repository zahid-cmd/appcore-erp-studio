//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.VoucherManagement;


//===============================================================
// Payment Voucher DTO (list : header only; view : + debits and
// credits)
//===============================================================

public class PaymentVoucherDto
{
    public long PaymentVoucherId { get; set; }

    public string VoucherNo { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string VoucherDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchCode { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public long FinancialYearId { get; set; }

    // Supplier / Customer / General Ledger
    public string LedgerType { get; set; } = string.Empty;

    // Paid party / ledger ("+ n more" when several)
    public string PartyName { get; set; } = string.Empty;

    public string Narration { get; set; } = string.Empty;

    public decimal TotalAmount { get; set; }

    // MFS charges the company pays on top
    public decimal CompanyCharges { get; set; }

    // "Cash, Check" (list)
    public string PaymentModes { get; set; } = string.Empty;

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

    // Pay To rows (entered first)
    public List<PaymentVoucherDebitDto> Debits { get; set; } = new();

    // Payment Mode rows
    public List<PaymentVoucherCreditDto> Credits { get; set; } = new();
}


//===============================================================
// Debit (Pay To row)
//===============================================================

public class PaymentVoucherDebitDto
{
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
// Credit (Payment Mode row + step 2 details)
//===============================================================

public class PaymentVoucherCreditDto
{
    // Cash / Bank / Check / MFS
    public string Mode { get; set; } = string.Empty;

    // Cash / Bank / MFS (server sets it)
    public string LedgerType { get; set; } = string.Empty;

    public string SubGroupCode { get; set; } = string.Empty;

    public string SubGroupName { get; set; } = string.Empty;

    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public long AccountId { get; set; }

    public decimal Amount { get; set; }

    public string ShortNotes { get; set; } = string.Empty;

    // MFS
    public decimal ChargePercent { get; set; }

    public decimal ChargeAmount { get; set; }

    // Company / Payee
    public string ChargeBorneBy { get; set; } = string.Empty;

    // MFS transaction id
    public string TransactionRef { get; set; } = string.Empty;

    // Check : name on the check; MFS : payee wallet / account
    public string PayeeName { get; set; } = string.Empty;

    public string PayeeAccount { get; set; } = string.Empty;

    // Check
    public string CheckNo { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string CheckDate { get; set; } = string.Empty;

    // Our bank (the ledger)
    public string CheckBank { get; set; } = string.Empty;

    // Read only (set by Check Reconciliation)
    public string CheckStatus { get; set; } = string.Empty;

    public string ClearedVoucherNo { get; set; } = string.Empty;
}


//===============================================================
// Create result (the number actually taken)
//===============================================================

public class PaymentVoucherSavedDto
{
    public long PaymentVoucherId { get; set; }

    public string VoucherNo { get; set; } = string.Empty;
}