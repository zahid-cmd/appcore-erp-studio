//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation;


//===============================================================
// POS Reconciliations (one row per Receipt Voucher POS line)
//
// The card transaction lives on the Receipt Voucher
// (ReceiptVoucherPayments, Mode POS). This row is created on the
// first action and keeps where the transaction stands.
//
// The POS account is a transit ledger linked (by code) to a bank
// account. Settlement moves the money from the POS account to that
// bank; one batch / one RRV per linked bank account.
//
//   Pending → Settled | Rejected   (Undo : back to Pending)
//
// Settle (RRV) : Dr linked Bank (net) + Dr POS Charges (charges) /
//                Cr POS account (gross)
// Reject (RRV) : Dr customer (the RV party lines) [+ Dr POS
//                Charges Recovery when the customer paid the
//                charge] / Cr POS account (gross)
//===============================================================

public class PosReconciliations
{
    public long PosReconciliationId { get; set; }


    //===========================================================
    // The transaction (copied from its voucher on the first action)
    //===========================================================

    // RV
    public string SourceVoucherType { get; set; } = string.Empty;

    public long SourceVoucherId { get; set; }

    public string SourceVoucherNo { get; set; } = string.Empty;

    // ReceiptVoucherPaymentId
    public long SourcePaymentId { get; set; }

    // Receipt Voucher date
    public DateOnly ReceiptDate { get; set; }

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    // Received From
    public string PartyName { get; set; } = string.Empty;

    // POS account (ledger code = POSAccountCode)
    public string AccountCode { get; set; } = string.Empty;

    public string AccountName { get; set; } = string.Empty;

    public string CardName { get; set; } = string.Empty;

    // Approval / last 4
    public string TransactionRef { get; set; } = string.Empty;

    // Received against the party lines
    public decimal Amount { get; set; }

    // Charge the customer paid on top (0 when the company bears it)
    public decimal CustomerCharge { get; set; }

    // What landed in the POS account = Amount + CustomerCharge
    public decimal GrossAmount { get; set; }

    // The card charge saved on the Receipt Voucher at the sale
    public decimal SaleChargePercent { get; set; }

    public decimal SaleChargeAmount { get; set; }


    //===========================================================
    // State
    //===========================================================

    // Pending / Settled / Rejected
    public string Status { get; set; } = "Pending";

    // Settlement
    public DateOnly? SettledDate { get; set; }

    public long? SettlementVoucherId { get; set; }

    public string SettlementVoucherNo { get; set; } = string.Empty;

    public string BankLedgerCode { get; set; } = string.Empty;

    public string BankLedgerName { get; set; } = string.Empty;

    public decimal FeePercent { get; set; }

    // Bank charges taken at settlement
    public decimal Fee { get; set; }

    // Charge audit : the system charge (the RV line's charge),
    // whether the user changed it, and why
    public decimal StandardFee { get; set; }

    public bool FeeEdited { get; set; }

    public string FeeReason { get; set; } = string.Empty;

    // GrossAmount - Fee (into the bank)
    public decimal NetAmount { get; set; }

    // Settled by the nightly Auto Settlement
    public bool IsAuto { get; set; }

    // An auto settlement was undone : the nightly job leaves this
    // line alone (settle it by hand)
    public bool SkipAuto { get; set; }

    // Reject
    public DateOnly? RejectDate { get; set; }

    public string RejectReason { get; set; } = string.Empty;

    public long? RejectVoucherId { get; set; }

    public string RejectVoucherNo { get; set; } = string.Empty;

    // Short notes of the last settle / reject
    public string ShortNotes { get; set; } = string.Empty;


    //===========================================================
    // Audit
    //===========================================================

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}