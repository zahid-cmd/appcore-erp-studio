//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation;


//===============================================================
// Check Reconciliations (one row per check)
//
// The check itself lives on the voucher that took it :
//   Received : ReceiptVoucherPayments (Mode Check)
//   Issued   : PaymentVoucherPayments (Mode Check)
// This row is created on the first action and keeps where the
// check stands. The voucher row's CheckStatus / ClearedVoucherNo
// / ClearedDate are kept in step (the vouchers read them).
//
// Received : Pending → Deposited → Cleared | Dishonoured
//            (Dishonoured → Re-present → Pending)
// Issued   : Pending → Cleared | Void
// Undo     : Cleared → Deposited (received) / Pending (issued);
//            Deposited → Pending; Void → Pending
//===============================================================

public class CheckReconciliations
{
    public long CheckReconciliationId { get; set; }


    //===========================================================
    // The check (copied from its voucher on the first action)
    //===========================================================

    // Received / Issued
    public string Direction { get; set; } = string.Empty;

    // RV / PV
    public string SourceVoucherType { get; set; } = string.Empty;

    public long SourceVoucherId { get; set; }

    public string SourceVoucherNo { get; set; } = string.Empty;

    // ReceiptVoucherPaymentId / PaymentVoucherPaymentId
    public long SourcePaymentId { get; set; }

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string CheckNo { get; set; } = string.Empty;

    public DateOnly? CheckDate { get; set; }

    // Received : issuing bank; Issued : our bank (drawn on)
    public string CheckBank { get; set; } = string.Empty;

    // Customer / supplier / payee shown in the list
    public string PartyName { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    // Bank account on the voucher (received : where it was meant
    // to be deposited; issued : the account it is drawn on)
    public string AccountLedgerCode { get; set; } = string.Empty;

    public string AccountLedgerName { get; set; } = string.Empty;


    //===========================================================
    // State
    //===========================================================

    // Pending / Deposited / Cleared / Dishonoured / Void
    public string Status { get; set; } = "Pending";

    // Deposit (received)
    public DateOnly? DepositDate { get; set; }

    public long? DepositSlipId { get; set; }

    public string DepositSlipNo { get; set; } = string.Empty;

    public string DepositLedgerCode { get; set; } = string.Empty;

    public string DepositLedgerName { get; set; } = string.Empty;

    // Clearing
    public DateOnly? ClearedDate { get; set; }

    public long? ClearingVoucherId { get; set; }

    public string ClearingVoucherNo { get; set; } = string.Empty;

    public decimal ClearingCharge { get; set; }

    // Dishonour (received)
    public DateOnly? DishonourDate { get; set; }

    public string DishonourReason { get; set; } = string.Empty;

    public decimal DishonourFee { get; set; }

    public decimal DishonourRecovery { get; set; }

    public long? DishonourVoucherId { get; set; }

    public string DishonourVoucherNo { get; set; } = string.Empty;

    // Times the check came back
    public int DishonourCount { get; set; }

    // Void (issued)
    public DateOnly? VoidDate { get; set; }

    public string VoidReason { get; set; } = string.Empty;


    //===========================================================
    // Audit
    //===========================================================

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}