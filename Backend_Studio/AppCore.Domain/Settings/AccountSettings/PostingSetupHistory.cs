//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.AccountSettings;


//===============================================================
// Posting Setup History
//
// One row per ledger change on the Posting Setup page, with the
// reason. Old postings keep their ledger; only new postings use
// the new one.
//===============================================================

public class PostingSetupHistory
{
    public long PostingSetupHistoryId { get; set; }

    public string PurposeCode { get; set; } = string.Empty;

    public string OldLedgerCode { get; set; } = string.Empty;

    public string OldLedgerName { get; set; } = string.Empty;

    public string NewLedgerCode { get; set; } = string.Empty;

    public string NewLedgerName { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;

    public long ChangedBy { get; set; }

    public string ChangedByName { get; set; } = string.Empty;

    public DateTime ChangedDate { get; set; }
}
