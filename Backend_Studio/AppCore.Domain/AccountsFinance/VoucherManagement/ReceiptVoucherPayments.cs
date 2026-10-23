//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.AccountsFinance.VoucherManagement;


//===============================================================
// Receipt Voucher Payments (DEBIT : Receipt Mode, money in)
//
// Mode : Cash / Bank / Check / MFS / POS / EMI
//   Cash, Bank : complete on step 1
//   Check      : Check No / Date / Issuing Bank (step 2); the
//                ledger is the deposit bank. Posts nothing with
//                the voucher : CheckStatus Pending → Cleared (RRV)
//                / Dishonoured, set by Check Reconciliation.
//   MFS        : Transaction ID + charge (step 2)
//   POS        : Card + approval / last 4 + charge (step 2)
//   EMI        : Card + tenure + interest + charge (step 2)
//===============================================================

public class ReceiptVoucherPayments
{
    public long ReceiptVoucherPaymentId { get; set; }

    public long ReceiptVoucherId { get; set; }

    public int LineNo { get; set; }

    public string Mode { get; set; } = string.Empty;


    //===========================================================
    // Money account (the deposit bank for a check)
    //===========================================================

    // Cash / Bank / MFS / POS / EMI
    public string LedgerType { get; set; } = string.Empty;

    public string SubGroupCode { get; set; } = string.Empty;

    public string SubGroupName { get; set; } = string.Empty;

    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public long AccountId { get; set; }

    public decimal Amount { get; set; }

    public string ShortNotes { get; set; } = string.Empty;


    //===========================================================
    // Platform charge (MFS / POS / EMI)
    //===========================================================

    public decimal ChargePercent { get; set; }

    public decimal ChargeAmount { get; set; }

    // Customer / Company ('' when no charge)
    public string ChargeBorneBy { get; set; } = string.Empty;


    //===========================================================
    // Card (POS / EMI)
    //===========================================================

    public long CardSetupId { get; set; }

    public string CardName { get; set; } = string.Empty;

    // MFS transaction id / POS approval code or last 4
    public string TransactionRef { get; set; } = string.Empty;


    //===========================================================
    // EMI (information only, not posted)
    //===========================================================

    public int TenureMonths { get; set; }

    public decimal InterestPercent { get; set; }

    public decimal InterestAmount { get; set; }

    public decimal TotalCharged { get; set; }


    //===========================================================
    // Check
    //===========================================================

    public string CheckNo { get; set; } = string.Empty;

    public DateOnly? CheckDate { get; set; }

    // Issuing bank (Bank Setup)
    public string CheckBank { get; set; } = string.Empty;

    // '' / Pending / Cleared / Dishonoured / Cancelled
    public string CheckStatus { get; set; } = string.Empty;

    public string ClearedVoucherNo { get; set; } = string.Empty;

    public DateOnly? ClearedDate { get; set; }
}