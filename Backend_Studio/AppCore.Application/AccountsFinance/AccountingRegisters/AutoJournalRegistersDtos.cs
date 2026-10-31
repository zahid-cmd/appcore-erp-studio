//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.AccountingRegisters;


//===============================================================
// Auto Journal Registers : the journals that pages post by
// themselves (VoucherEntries), shown under the page that made
// them (Module › Menu › Submenu, from Navigation).
//
// The voucher type → page link is AutoJournalSources (by
// submenu code). Types not linked show under "Other"; manual
// vouchers (IsAutoJournal = false) are left out.
//
// Dates are yyyy-MM-dd. BranchId 0 = all branches.
//===============================================================


//===============================================================
// Tree : Module › Menu › Submenu with journal counts
//===============================================================

public class AutoJournalTreeDto
{
    public string From { get; set; } = string.Empty;

    public string To { get; set; } = string.Empty;

    public long BranchId { get; set; }

    // Journals in the period (every node)
    public int Total { get; set; }

    // Journals of types not linked to a page
    public int OtherCount { get; set; }

    public List<AutoJournalNodeDto> Modules { get; set; } = new();

    public List<AutoJournalOptionDto> Branches { get; set; } = new();
}


public class AutoJournalNodeDto
{
    // Module / menu / submenu code (the node's id)
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Icon { get; set; } = string.Empty;

    public int Count { get; set; }

    // Submenu only : the voucher types it posts (PIMB …)
    public List<string> VoucherTypes { get; set; } = new();

    public List<AutoJournalNodeDto> Children { get; set; } = new();
}


public class AutoJournalOptionDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
}


//===============================================================
// Journals of one node for a period
//===============================================================

public class AutoJournalListDto
{
    // Node asked for ("" = all, "OTHER" = not linked)
    public string Node { get; set; } = string.Empty;

    // e.g. "Procurement › Motor Bike Purchase › Purchases - MB"
    public string NodePath { get; set; } = string.Empty;

    public string From { get; set; } = string.Empty;

    public string To { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    // Journals in scope / sent (Truncated when Total > Shown)
    public int Total { get; set; }

    public int Shown { get; set; }

    public bool Truncated { get; set; }

    public List<AutoJournalDto> Journals { get; set; } = new();
}


public class AutoJournalDto
{
    public string VoucherNo { get; set; } = string.Empty;

    public string VoucherType { get; set; } = string.Empty;

    public string VoucherDate { get; set; } = string.Empty;

    // Page that made it ("" / "Other" when not linked)
    public string SourceCode { get; set; } = string.Empty;

    public string SourceName { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    // One party for the whole journal, else empty
    public string PartyType { get; set; } = string.Empty;

    public string PartyCode { get; set; } = string.Empty;

    public string PartyName { get; set; } = string.Empty;

    public string Narration { get; set; } = string.Empty;

    public string ReferenceNo { get; set; } = string.Empty;

    public decimal TotalDebit { get; set; }

    public decimal TotalCredit { get; set; }

    public List<AutoJournalLineDto> Lines { get; set; } = new();

    // Cancelled : the reversing lines (posted on ReversalDate)
    public bool IsReversed { get; set; }

    public string ReversalDate { get; set; } = string.Empty;

    public string ReversalReason { get; set; } = string.Empty;

    public List<AutoJournalLineDto> ReversalLines { get; set; } = new();
}


public class AutoJournalLineDto
{
    public int GroupNo { get; set; }

    public int LineNo { get; set; }

    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public string LedgerType { get; set; } = string.Empty;

    public string PartyType { get; set; } = string.Empty;

    public string PartyCode { get; set; } = string.Empty;

    public string PartyName { get; set; } = string.Empty;

    public string Narration { get; set; } = string.Empty;

    public decimal Debit { get; set; }

    public decimal Credit { get; set; }
}
