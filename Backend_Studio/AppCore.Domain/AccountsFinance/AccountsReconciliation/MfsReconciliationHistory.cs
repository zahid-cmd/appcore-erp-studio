//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation;


//===============================================================
// MFS Reconciliation History (every action on a transaction)
//
// Action : Settle / Undo Settle / Reject / Undo Reject
//===============================================================

public class MfsReconciliationHistory
{
    public long MfsReconciliationHistoryId { get; set; }

    public long MfsReconciliationId { get; set; }

    public string Action { get; set; } = string.Empty;

    // Business date of the action
    public DateOnly ActionDate { get; set; }

    // Status after the action
    public string Status { get; set; } = string.Empty;

    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public string VoucherNo { get; set; } = string.Empty;

    public decimal Fee { get; set; }

    // Charge audit (Settle) : the system charge, whether the user
    // changed it, and why
    public decimal StandardFee { get; set; }

    public bool FeeEdited { get; set; }

    public string FeeReason { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;

    // Done by the nightly Auto Settlement
    public bool IsAuto { get; set; }

    public long PerformedBy { get; set; }

    public DateTime PerformedDate { get; set; }
}