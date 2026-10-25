//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.AccountsFinance.VoucherManagement;


//===============================================================
// Payment Voucher Payments (CREDIT : Payment Mode, money out)
//
// Mode : Cash / Bank / Check / MFS
//   Cash / Bank : posted with the voucher
//   Check      : Check No / Date (step 2); drawn on our bank (the
//                ledger); posts nothing with the voucher :
//                CheckStatus Pending → Cleared (RRP)
//   MFS        : Transaction ID + charge (step 2); a charge the
//                company bears is posted with the voucher
//                (Dr MFS Charges, Cr the MFS account)
//===============================================================

public class PaymentVoucherPayments
{
    public long PaymentVoucherPaymentId { get; set; }

    public long PaymentVoucherId { get; set; }

    public int LineNo { get; set; }

    // Cash / Bank / Check / MFS
    public string Mode { get; set; } = string.Empty;

    // Cash / Bank / MFS (actual type of the ledger)
    public string LedgerType { get; set; } = string.Empty;

    public string SubGroupCode { get; set; } = string.Empty;

    public string SubGroupName { get; set; } = string.Empty;

    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    // Id of the account in its own table (Cash / Bank / MFS)
    public long AccountId { get; set; }

    public decimal Amount { get; set; }

    public string ShortNotes { get; set; } = string.Empty;


    //===========================================================
    // MFS charge
    //===========================================================

    public decimal ChargePercent { get; set; }

    public decimal ChargeAmount { get; set; }

    // Company / Payee ('' when no charge)
    public string ChargeBorneBy { get; set; } = string.Empty;

    // MFS transaction id
    public string TransactionRef { get; set; } = string.Empty;

    // Check : name on the check; MFS : payee wallet / account
    public string PayeeName { get; set; } = string.Empty;

    public string PayeeAccount { get; set; } = string.Empty;


    //===========================================================
    // Check
    //===========================================================

    public string CheckNo { get; set; } = string.Empty;

    public DateOnly? CheckDate { get; set; }

    // Our bank (the ledger name)
    public string CheckBank { get; set; } = string.Empty;

    // Pending / Cleared / Cancelled (Check Reconciliation)
    public string CheckStatus { get; set; } = string.Empty;

    public string ClearedVoucherNo { get; set; } = string.Empty;

    public DateOnly? ClearedDate { get; set; }
}