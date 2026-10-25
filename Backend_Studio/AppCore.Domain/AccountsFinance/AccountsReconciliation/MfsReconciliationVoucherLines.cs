//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation;


//===============================================================
// MFS Reconciliation Voucher Lines (as posted; for the print)
//===============================================================

public class MfsReconciliationVoucherLines
{
    public long MfsReconciliationVoucherLineId { get; set; }

    public long MfsReconciliationVoucherId { get; set; }

    public int LineNo { get; set; }

    // One group per transaction
    public int GroupNo { get; set; }

    // Txn ID
    public string TransactionRef { get; set; } = string.Empty;

    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public string SubGroupName { get; set; } = string.Empty;

    // Customer / Supplier code ('' for bank / wallet / GL rows)
    public string PartyCode { get; set; } = string.Empty;

    public string PartyType { get; set; } = string.Empty;

    public decimal Debit { get; set; }

    public decimal Credit { get; set; }

    public string Narration { get; set; } = string.Empty;

    // MFS fee / charge recovery rows
    public bool IsCharge { get; set; }
}