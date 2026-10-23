//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Platform.Accounting;


//===============================================================
// Voucher Entries
//
// The posted debit / credit lines of EVERY voucher type
// (RV, PV, JV, FT, RRV, RRP). Ledger balances, day book and
// reports read from this table only.
//
// Rows are never edited or deleted. Cancelling a posted voucher
// adds reversing rows (IsReversal = true, debit / credit swapped).
//===============================================================

public class VoucherEntries
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long VoucherEntryId { get; set; }


    //===========================================================
    // Voucher
    //===========================================================

    // RV / PV / JV / FT / RRV / RRP
    public string VoucherType { get; set; } = string.Empty;

    // Primary key of the voucher header row (in its own table)
    public long VoucherId { get; set; }

    // e.g. RV-010101-2627-10-00001
    public string VoucherNo { get; set; } = string.Empty;

    // Posting date (the voucher date; the cancel date for
    // reversing rows)
    public DateOnly VoucherDate { get; set; }

    public long FinancialYearId { get; set; }

    public long BranchId { get; set; }

    public string BranchCode { get; set; } = string.Empty;


    //===========================================================
    // Line
    //===========================================================

    // Journal group (1 Dr : n Cr or n Dr : 1 Cr); 1 for others
    public int GroupNo { get; set; }

    public int LineNo { get; set; }

    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    // General Ledger / Cash / Bank / MFS / POS / EMI
    public string LedgerType { get; set; } = string.Empty;

    public decimal Debit { get; set; }

    public decimal Credit { get; set; }

    public string Narration { get; set; } = string.Empty;


    //===========================================================
    // Party / Reference
    //===========================================================

    // Customer / Supplier / General Ledger (empty for JV / FT)
    public string PartyType { get; set; } = string.Empty;

    public string PartyCode { get; set; } = string.Empty;

    public string ReferenceNo { get; set; } = string.Empty;


    //===========================================================
    // Reversal
    //===========================================================

    public bool IsReversal { get; set; }

    public string ReversalReason { get; set; } = string.Empty;


    //===========================================================
    // Audit
    //===========================================================

    public long PostedBy { get; set; }

    public DateTime PostedDate { get; set; }
}