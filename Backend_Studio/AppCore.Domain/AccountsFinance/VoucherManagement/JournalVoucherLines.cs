//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.AccountsFinance.VoucherManagement;


//===============================================================
// Journal Voucher Lines (debits and credits)
//
// Side    : Debit / Credit
// GroupNo : 1, 2, ... (each group balances; debits first)
// LineNo  : 1, 2, ... across the voucher, in screen order
//
// LedgerType : Supplier / Customer / General Ledger (per row)
//   Customer : the customer's receivable ledger (PartyCode =
//              customer code)
//   Supplier : the supplier's payable ledger (PartyCode =
//              supplier code)
//   General  : any non-money general ledger (PartyCode empty)
//===============================================================

public class JournalVoucherLines
{
    public long JournalVoucherLineId { get; set; }

    public long JournalVoucherId { get; set; }

    public int LineNo { get; set; }

    public int GroupNo { get; set; }

    // Debit / Credit
    public string Side { get; set; } = string.Empty;

    public string LedgerType { get; set; } = string.Empty;

    public string SubGroupCode { get; set; } = string.Empty;

    public string SubGroupName { get; set; } = string.Empty;

    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    // Customer / Supplier code; empty for General Ledger
    public string PartyCode { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public string ShortNotes { get; set; } = string.Empty;
}