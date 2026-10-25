//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation;


//===============================================================
// MFS Auto Settlement Runs (the nightly job's log)
//
// One row per wallet + branch handled on a run date :
//   Settled : an RRV was posted
//   Skipped : no linked bank, closed financial year …
//   Failed  : posting refused (see Message)
// and one Completed row (WalletCode '') when the whole date is
// done; a Completed date is never run again.
//===============================================================

public class MfsAutoSettlementRuns
{
    public long MfsAutoSettlementRunId { get; set; }

    public DateOnly RunDate { get; set; }

    public string WalletCode { get; set; } = string.Empty;

    public string WalletName { get; set; } = string.Empty;

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