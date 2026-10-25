//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.AccountsFinance.VoucherManagement;


//===============================================================
// Payment Voucher Lines (DEBIT : Pay To)
//
// LedgerType : Customer / Supplier / General Ledger
//   Customer : the customer's receivable ledger (refund /
//              advance return; PartyCode = customer code)
//   Supplier : the supplier's payable ledger (PartyCode =
//              supplier code)
//   General  : any non-money general ledger (PartyCode empty)
//===============================================================

public class PaymentVoucherLines
{
    public long PaymentVoucherLineId { get; set; }

    public long PaymentVoucherId { get; set; }

    public int LineNo { get; set; }

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