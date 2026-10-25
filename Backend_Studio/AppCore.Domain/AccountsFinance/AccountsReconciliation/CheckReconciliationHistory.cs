//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation;


//===============================================================
// Check Reconciliation History (every action on a check)
//
// Action : Deposit / Undo Deposit / Clear / Undo Clear /
//          Dishonour / Re-present / Void / Undo Void
//===============================================================

public class CheckReconciliationHistory
{
    public long CheckReconciliationHistoryId { get; set; }

    public long CheckReconciliationId { get; set; }

    public string Action { get; set; } = string.Empty;

    // Business date of the action (deposit / clearing ...)
    public DateOnly ActionDate { get; set; }

    // Status after the action
    public string Status { get; set; } = string.Empty;

    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public string VoucherNo { get; set; } = string.Empty;

    public string DepositSlipNo { get; set; } = string.Empty;

    public decimal Charge { get; set; }

    public decimal Recovery { get; set; }

    public string Reason { get; set; } = string.Empty;

    public long PerformedBy { get; set; }

    public DateTime PerformedDate { get; set; }
}