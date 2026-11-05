//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.SalesOperations.Shared;


//===============================================================
// Sales invoice payment : one Payment Desk row (the debit row of
// the Receipt Voucher made when the invoice is posted). Shared by
// Sales Invoices - SP / AC / MB.
//===============================================================

public abstract class SalesInvoicePayment
{
    public long SalesInvoicePaymentId { get; set; }
    public long SalesInvoiceId { get; set; }
    public int LineNo { get; set; }
    // Cash / Bank / Check / MFS / POS / EMI
    public string Mode { get; set; } = string.Empty;
    public string LedgerType { get; set; } = string.Empty;
    public string SubGroupCode { get; set; } = string.Empty;
    public string SubGroupName { get; set; } = string.Empty;
    public string LedgerCode { get; set; } = string.Empty;
    public string LedgerName { get; set; } = string.Empty;
    public long AccountId { get; set; }
    public decimal Amount { get; set; }
    public string ShortNotes { get; set; } = string.Empty;
    public decimal ChargePercent { get; set; }
    public decimal ChargeAmount { get; set; }
    // Customer / Company
    public string ChargeBorneBy { get; set; } = string.Empty;
    public long CardSetupId { get; set; }
    public string CardName { get; set; } = string.Empty;
    public string TransactionRef { get; set; } = string.Empty;
    public int TenureMonths { get; set; }
    public decimal InterestPercent { get; set; }
    public decimal InterestAmount { get; set; }
    public decimal TotalCharged { get; set; }
    public string CheckNo { get; set; } = string.Empty;
    public DateOnly? CheckDate { get; set; }
    public string CheckBank { get; set; } = string.Empty;
}
