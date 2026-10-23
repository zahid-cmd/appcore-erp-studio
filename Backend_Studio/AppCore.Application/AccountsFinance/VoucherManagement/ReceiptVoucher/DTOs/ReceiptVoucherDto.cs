//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.VoucherManagement;


//===============================================================
// Receipt Voucher DTO (list : header only; view : + debits and
// credits)
//===============================================================

public class ReceiptVoucherDto
{
    public long ReceiptVoucherId { get; set; }

    public string VoucherNo { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string VoucherDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchCode { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public long FinancialYearId { get; set; }

    // Customer / Supplier / General Ledger
    public string LedgerType { get; set; } = string.Empty;

    // Credited party / ledger ("+ n more" when several)
    public string PartyName { get; set; } = string.Empty;

    public string Narration { get; set; } = string.Empty;

    public decimal TotalAmount { get; set; }

    public decimal CustomerCharges { get; set; }

    // "Cash, Check" (list)
    public string ReceiptModes { get; set; } = string.Empty;

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

    // Receipt Mode rows
    public List<ReceiptVoucherDebitDto> Debits { get; set; } = new();

    // Account Details rows
    public List<ReceiptVoucherCreditDto> Credits { get; set; } = new();
}


//===============================================================
// Debit (Receipt Mode row + step 2 details)
//===============================================================

public class ReceiptVoucherDebitDto
{
    // Cash / Bank / Check / MFS / POS / EMI
    public string Mode { get; set; } = string.Empty;

    // Cash / Bank / MFS / POS / EMI (server sets it)
    public string LedgerType { get; set; } = string.Empty;

    public string SubGroupCode { get; set; } = string.Empty;

    public string SubGroupName { get; set; } = string.Empty;

    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public long AccountId { get; set; }

    public decimal Amount { get; set; }

    public string ShortNotes { get; set; } = string.Empty;

    // MFS / POS / EMI
    public decimal ChargePercent { get; set; }

    public decimal ChargeAmount { get; set; }

    // Customer / Company
    public string ChargeBorneBy { get; set; } = string.Empty;

    // POS / EMI
    public long CardSetupId { get; set; }

    public string CardName { get; set; } = string.Empty;

    // MFS transaction id / POS approval code or last 4
    public string TransactionRef { get; set; } = string.Empty;

    // EMI
    public int TenureMonths { get; set; }

    public decimal InterestPercent { get; set; }

    public decimal InterestAmount { get; set; }

    public decimal TotalCharged { get; set; }

    // Check
    public string CheckNo { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string CheckDate { get; set; } = string.Empty;

    public string CheckBank { get; set; } = string.Empty;

    // Read only (set by Check Reconciliation)
    public string CheckStatus { get; set; } = string.Empty;

    public string ClearedVoucherNo { get; set; } = string.Empty;
}


//===============================================================
// Credit (Account Details row)
//===============================================================

public class ReceiptVoucherCreditDto
{
    // Customer / Supplier / General Ledger
    public string LedgerType { get; set; } = string.Empty;

    public string SubGroupCode { get; set; } = string.Empty;

    public string SubGroupName { get; set; } = string.Empty;

    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    // Customer / Supplier code (server sets it)
    public string PartyCode { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public string ShortNotes { get; set; } = string.Empty;
}


//===============================================================
// Create result (the number actually taken)
//===============================================================

public class ReceiptVoucherSavedDto
{
    public long ReceiptVoucherId { get; set; }

    public string VoucherNo { get; set; } = string.Empty;
}