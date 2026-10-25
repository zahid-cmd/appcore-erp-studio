//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation;


//===============================================================
// Check Reconciliation Voucher Lines (as posted; for the print)
//===============================================================

public class CheckReconciliationVoucherLines
{
    public long CheckReconciliationVoucherLineId { get; set; }

    public long CheckReconciliationVoucherId { get; set; }

    public int LineNo { get; set; }

    // One group per check
    public int GroupNo { get; set; }

    public string CheckNo { get; set; } = string.Empty;

    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public string SubGroupName { get; set; } = string.Empty;

    // Supplier / Customer code ('' for bank / GL rows)
    public string PartyCode { get; set; } = string.Empty;

    public string PartyType { get; set; } = string.Empty;

    public decimal Debit { get; set; }

    public decimal Credit { get; set; }

    public string Narration { get; set; } = string.Empty;

    // Bank charge / dishonour fee / recovery rows
    public bool IsCharge { get; set; }
}