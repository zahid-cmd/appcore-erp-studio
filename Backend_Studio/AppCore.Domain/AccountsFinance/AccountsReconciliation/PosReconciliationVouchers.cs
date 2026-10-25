//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation;


//===============================================================
// POS Reconciliation Vouchers (RRV)
//
// RRV-<branch>-<FY>-<MM>-<seq> (the same series as Check
// Reconciliation)
//
// Purpose Settlement : one voucher per linked bank account +
//                      branch per save (or per nightly run), one
//                      group per transaction; printed as Receipt
//                      Voucher
// Purpose Reject     : printed as Journal Voucher
//
// Posted when created; Reversed by Undo (reversing entries).
//===============================================================

public class PosReconciliationVouchers
{
    public long PosReconciliationVoucherId { get; set; }

    public string VoucherNo { get; set; } = string.Empty;

    // RRV
    public string VoucherType { get; set; } = string.Empty;

    // Settlement / Reject
    public string Purpose { get; set; } = string.Empty;

    public DateOnly VoucherDate { get; set; }

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    // The linked bank account of the batch (settlement : Dr;
    // reject : the batch it was picked under)
    public string BankLedgerCode { get; set; } = string.Empty;

    public string BankLedgerName { get; set; } = string.Empty;

    public int TransactionCount { get; set; }

    // Gross taken out of the POS account(s)
    public decimal Amount { get; set; }

    // Bank charges (settlement)
    public decimal Charges { get; set; }

    // Into the bank (settlement); 0 for a reject
    public decimal NetAmount { get; set; }

    public string Narration { get; set; } = string.Empty;

    // Made by the nightly Auto Settlement
    public bool IsAuto { get; set; }

    // Posted / Reversed
    public string Status { get; set; } = "Posted";

    public DateOnly? ReversedDate { get; set; }

    public string ReverseReason { get; set; } = string.Empty;

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}