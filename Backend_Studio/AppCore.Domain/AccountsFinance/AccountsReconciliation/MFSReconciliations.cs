//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation;


//===============================================================
// MFS Reconciliations (one row per Receipt Voucher MFS line)
//
// The transaction itself lives on the Receipt Voucher
// (ReceiptVoucherPayments, Mode MFS). This row is created on the
// first action and keeps where the transaction stands.
//
// Merchant wallet : Pending → Settled | Rejected
//                   (Undo : back to Pending)
// Personal wallet : Direct (money landed at once; nothing to
//                   settle) → Rejected only (a wrong entry)
//                   (Undo : back to Direct)
//
// Settle (RRV) : Dr linked Bank (net) + Dr MFS Charges (fee) /
//                Cr MFS wallet (gross)
// Reject (RRV) : Dr customer (the RV party lines) [+ Dr MFS
//                Charges Recovery when the customer paid the
//                charge] / Cr MFS wallet (gross)
//===============================================================

public class MfsReconciliations
{
    public long MfsReconciliationId { get; set; }


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

    // MFS account (ledger code = MFSAccountCode)
    public string WalletCode { get; set; } = string.Empty;

    public string WalletName { get; set; } = string.Empty;

    // Merchant / Personal
    public string WalletType { get; set; } = string.Empty;

    // Txn ID
    public string TransactionRef { get; set; } = string.Empty;

    // Received against the party lines
    public decimal Amount { get; set; }

    // MFS charge the customer paid on top (0 when the company
    // bears it)
    public decimal CustomerCharge { get; set; }

    // What landed in the wallet = Amount + CustomerCharge
    public decimal GrossAmount { get; set; }


    //===========================================================
    // State
    //===========================================================

    // Pending / Direct / Settled / Rejected
    public string Status { get; set; } = "Pending";

    // Settlement
    public DateOnly? SettledDate { get; set; }

    public long? SettlementVoucherId { get; set; }

    public string SettlementVoucherNo { get; set; } = string.Empty;

    public string BankLedgerCode { get; set; } = string.Empty;

    public string BankLedgerName { get; set; } = string.Empty;

    public decimal FeePercent { get; set; }

    public decimal Fee { get; set; }

    // Charge audit : the system charge (the wallet's % of the gross),
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