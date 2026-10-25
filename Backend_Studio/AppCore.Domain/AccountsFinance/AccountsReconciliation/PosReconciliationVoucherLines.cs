//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation;


//===============================================================
// POS Reconciliation Voucher Lines (as posted; for the print)
//===============================================================

public class PosReconciliationVoucherLines
{
    public long PosReconciliationVoucherLineId { get; set; }

    public long PosReconciliationVoucherId { get; set; }

    public int LineNo { get; set; }

    // One group per transaction
    public int GroupNo { get; set; }

    // Txn ID
    public string TransactionRef { get; set; } = string.Empty;

    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public string SubGroupName { get; set; } = string.Empty;

    // Customer / Supplier code ('' for bank / POS / GL rows)
    public string PartyCode { get; set; } = string.Empty;

    public string PartyType { get; set; } = string.Empty;

    public decimal Debit { get; set; }

    public decimal Credit { get; set; }

    public string Narration { get; set; } = string.Empty;

    // bank charges / charge recovery rows
    public bool IsCharge { get; set; }
}