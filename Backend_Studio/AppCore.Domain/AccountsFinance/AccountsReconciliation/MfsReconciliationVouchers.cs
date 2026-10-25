//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation;


//===============================================================
// MFS Reconciliation Vouchers (RRV)
//
// RRV-<branch>-<FY>-<MM>-<seq> (the same series as Check
// Reconciliation)
//
// Purpose Settlement : one voucher per wallet + branch per save
//                      (or per nightly run), one group per
//                      transaction; printed as Receipt Voucher
// Purpose Reject     : printed as Journal Voucher
//
// Posted when created; Reversed by Undo (reversing entries).
//===============================================================

public class MfsReconciliationVouchers
{
    public long MfsReconciliationVoucherId { get; set; }

    public string VoucherNo { get; set; } = string.Empty;

    // RRV
    public string VoucherType { get; set; } = string.Empty;

    // Settlement / Reject
    public string Purpose { get; set; } = string.Empty;

    public DateOnly VoucherDate { get; set; }

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string WalletCode { get; set; } = string.Empty;

    public string WalletName { get; set; } = string.Empty;

    // Settlement : the wallet's linked bank ('' for a reject)
    public string BankLedgerCode { get; set; } = string.Empty;

    public string BankLedgerName { get; set; } = string.Empty;

    public int TransactionCount { get; set; }

    // Gross taken out of the wallet
    public decimal Amount { get; set; }

    // MFS fee (settlement)
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