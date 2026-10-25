//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation;


//===============================================================
// Check Reconciliation Vouchers (RRV / RRP)
//
// RRV-<branch>-<FY>-<MM>-<seq> : received checks
// RRP-<branch>-<FY>-<MM>-<seq> : issued checks
//
// Purpose Clearing  : one voucher per bank account per batch,
//                     one group per check
// Purpose Dishonour : bank fee (+ recovery from the customer)
//
// Posted when created; Reversed by Undo (reversing entries).
//===============================================================

public class CheckReconciliationVouchers
{
    public long CheckReconciliationVoucherId { get; set; }

    public string VoucherNo { get; set; } = string.Empty;

    // RRV / RRP
    public string VoucherType { get; set; } = string.Empty;

    // Clearing / Dishonour
    public string Purpose { get; set; } = string.Empty;

    public DateOnly VoucherDate { get; set; }

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    // Our bank account
    public string BankLedgerCode { get; set; } = string.Empty;

    public string BankLedgerName { get; set; } = string.Empty;

    public int CheckCount { get; set; }

    // Checks cleared (dishonour : 0)
    public decimal Amount { get; set; }

    // Bank charges
    public decimal Charges { get; set; }

    // Dishonour fee recovered from the customer
    public decimal Recovery { get; set; }

    public string Narration { get; set; } = string.Empty;

    // Posted / Reversed
    public string Status { get; set; } = "Posted";

    public DateOnly? ReversedDate { get; set; }

    public string ReverseReason { get; set; } = string.Empty;

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}