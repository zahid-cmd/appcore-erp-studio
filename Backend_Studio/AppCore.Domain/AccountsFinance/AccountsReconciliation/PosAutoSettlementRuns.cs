//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation;


//===============================================================
// POS Auto Settlement Runs (the nightly job's log)
//
// One row per linked bank account + branch handled on a run date :
//   Settled : an RRV was posted
//   Skipped : bank missing / inactive, closed financial year …
//   Failed  : posting refused (see Message)
// and one Completed row (BankLedgerCode '') when the whole date is
// done; a Completed date is never run again.
//===============================================================

public class PosAutoSettlementRuns
{
    public long PosAutoSettlementRunId { get; set; }

    public DateOnly RunDate { get; set; }

    public string BankLedgerCode { get; set; } = string.Empty;

    public string BankLedgerName { get; set; } = string.Empty;

    public long BranchId { get; set; }

    // Settled / Skipped / Failed / Completed
    public string Outcome { get; set; } = string.Empty;

    public long? VoucherId { get; set; }

    public string VoucherNo { get; set; } = string.Empty;

    public int TransactionCount { get; set; }

    public decimal Amount { get; set; }

    public string Message { get; set; } = string.Empty;

    public DateTime CreatedDate { get; set; }
}