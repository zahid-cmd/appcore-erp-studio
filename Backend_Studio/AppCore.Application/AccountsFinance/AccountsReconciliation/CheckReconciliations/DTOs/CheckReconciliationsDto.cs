//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.AccountsReconciliation;


//===============================================================
// Check Reconciliation DTOs
//
// A check is addressed by Direction + PaymentId :
//   Received : ReceiptVoucherPaymentId
//   Issued   : PaymentVoucherPaymentId
// Dates travel as yyyy-MM-dd.
//===============================================================


//===============================================================
// List row
//===============================================================

public class CheckReconciliationDto
{
    // Received / Issued
    public string Direction { get; set; } = string.Empty;

    public long PaymentId { get; set; }

    // 0 until the first action
    public long CheckReconciliationId { get; set; }

    // RV / PV
    public string SourceVoucherType { get; set; } = string.Empty;

    public long SourceVoucherId { get; set; }

    public string SourceVoucherNo { get; set; } = string.Empty;

    public string VoucherDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string CheckNo { get; set; } = string.Empty;

    public string CheckDate { get; set; } = string.Empty;

    public string CheckBank { get; set; } = string.Empty;

    public string PartyName { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    // Bank account on the voucher
    public string AccountLedgerCode { get; set; } = string.Empty;

    public string AccountLedgerName { get; set; } = string.Empty;

    // Pending / Deposited / Cleared / Dishonoured / Void
    public string Status { get; set; } = string.Empty;

    public string DepositDate { get; set; } = string.Empty;

    public long? DepositSlipId { get; set; }

    public string DepositSlipNo { get; set; } = string.Empty;

    public string DepositLedgerCode { get; set; } = string.Empty;

    public string DepositLedgerName { get; set; } = string.Empty;

    public string ClearedDate { get; set; } = string.Empty;

    public long? ClearingVoucherId { get; set; }

    public string ClearingVoucherNo { get; set; } = string.Empty;

    public decimal ClearingCharge { get; set; }

    public string DishonourDate { get; set; } = string.Empty;

    public string DishonourReason { get; set; } = string.Empty;

    public decimal DishonourFee { get; set; }

    public decimal DishonourRecovery { get; set; }

    public long? DishonourVoucherId { get; set; }

    public string DishonourVoucherNo { get; set; } = string.Empty;

    public int DishonourCount { get; set; }

    public string VoidDate { get; set; } = string.Empty;

    public string VoidReason { get; set; } = string.Empty;
}


//===============================================================
// History row
//===============================================================

public class CheckReconciliationHistoryDto
{
    public long Id { get; set; }

    public string Action { get; set; } = string.Empty;

    public string ActionDate { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public string VoucherNo { get; set; } = string.Empty;

    public string DepositSlipNo { get; set; } = string.Empty;

    public decimal Charge { get; set; }

    public decimal Recovery { get; set; }

    public string Reason { get; set; } = string.Empty;

    public long PerformedBy { get; set; }

    public DateTime PerformedDate { get; set; }
}


//===============================================================
// Deposit account (Bank, Collection, active, usable by the
// branch)
//===============================================================

public class CheckBankAccountDto
{
    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public string SubGroupName { get; set; } = string.Empty;

    public string Branch { get; set; } = string.Empty;
}


//===============================================================
// Check Clearing Center : number preview (nothing is reserved;
// Save takes the real next number)
//===============================================================

public class CheckCenterDefaultsDto
{
    // RRV-… / RRP-… / DS-… ; '' when there is no number
    public string VoucherNo { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string FinancialYearName { get; set; } = string.Empty;

    // Why there is no number (no open financial year …)
    public string Message { get; set; } = string.Empty;
}


//===============================================================
// Requests
//===============================================================

// Received checks into one bank account (one Deposit Slip)
public class CheckDepositDto
{
    public List<long> PaymentIds { get; set; } = new();

    public string DepositDate { get; set; } = string.Empty;

    public string BankLedgerCode { get; set; } = string.Empty;

    // Optional short notes per check
    public List<CheckNoteDto> Notes { get; set; } = new();
}

public class CheckNoteDto
{
    public long PaymentId { get; set; }

    public string ShortNotes { get; set; } = string.Empty;
}

// Clear a cart of checks (one RRV / RRP per bank account)
public class CheckClearDto
{
    // Received / Issued
    public string Direction { get; set; } = string.Empty;

    public string ClearedDate { get; set; } = string.Empty;

    // Optional; a default narration is built when empty
    public string Narration { get; set; } = string.Empty;

    public List<CheckClearItemDto> Items { get; set; } = new();
}

public class CheckClearItemDto
{
    public long PaymentId { get; set; }

    // Optional bank charge for this check (0 = none)
    public decimal Charge { get; set; }

    // Optional; printed on the check's voucher lines
    public string ShortNotes { get; set; } = string.Empty;
}

// Received checks came back (a cart)
public class CheckDishonourDto
{
    public string DishonourDate { get; set; } = string.Empty;

    public List<CheckDishonourItemDto> Items { get; set; } = new();
}

public class CheckDishonourItemDto
{
    public long PaymentId { get; set; }

    // Bank's return reason (required)
    public string Reason { get; set; } = string.Empty;

    // Bank's dishonour fee (0 = none)
    public decimal Fee { get; set; }

    // Fee charged to the customer (0 = none)
    public decimal Recovery { get; set; }

    // Optional; printed on the check's voucher lines
    public string ShortNotes { get; set; } = string.Empty;
}

// Issued check voided
public class CheckVoidDto
{
    public long PaymentId { get; set; }

    public string VoidDate { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;
}

// Undo Deposit / Undo Clear / Undo Dishonour / Re-present /
// Undo Void
public class CheckUndoDto
{
    public string Direction { get; set; } = string.Empty;

    public long PaymentId { get; set; }

    // Reversal date (Undo Clear / Undo Dishonour; default today)
    public string UndoDate { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;
}


//===============================================================
// Result of an action
//===============================================================

public class CheckActionResultDto
{
    public string Message { get; set; } = string.Empty;

    // RRV / RRP created (or reversed)
    public List<string> VoucherNos { get; set; } = new();

    // Their ids (print)
    public List<long> VoucherIds { get; set; } = new();

    public long? DepositSlipId { get; set; }

    public string DepositSlipNo { get; set; } = string.Empty;

    // Checks the action touched
    public int CheckCount { get; set; }
}


//===============================================================
// Print : Clearing / Dishonour Voucher (RRV / RRP)
//===============================================================

public class CheckClearingVoucherDto
{
    public long Id { get; set; }

    public string VoucherNo { get; set; } = string.Empty;

    public string VoucherType { get; set; } = string.Empty;

    // Clearing / Dishonour
    public string Purpose { get; set; } = string.Empty;

    public string VoucherDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string BankLedgerCode { get; set; } = string.Empty;

    public string BankLedgerName { get; set; } = string.Empty;

    public int CheckCount { get; set; }

    public decimal Amount { get; set; }

    public decimal Charges { get; set; }

    public decimal Recovery { get; set; }

    public string Narration { get; set; } = string.Empty;

    // Posted / Reversed
    public string Status { get; set; } = string.Empty;

    public string ReversedDate { get; set; } = string.Empty;

    public string ReverseReason { get; set; } = string.Empty;

    public List<CheckClearingVoucherLineDto> Lines { get; set; } = new();

    // The checks in this voucher and the voucher each came from
    public List<CheckClearingSourceDto> Sources { get; set; } = new();
}

public class CheckClearingSourceDto
{
    public string CheckNo { get; set; } = string.Empty;

    // RV / PV
    public string SourceVoucherType { get; set; } = string.Empty;

    public string SourceVoucherNo { get; set; } = string.Empty;

    public string PartyName { get; set; } = string.Empty;
}

public class CheckClearingVoucherLineDto
{
    public int LineNo { get; set; }

    public int GroupNo { get; set; }

    public string CheckNo { get; set; } = string.Empty;

    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public string SubGroupName { get; set; } = string.Empty;

    public string PartyCode { get; set; } = string.Empty;

    public decimal Debit { get; set; }

    public decimal Credit { get; set; }

    public string Narration { get; set; } = string.Empty;

    public bool IsCharge { get; set; }
}


//===============================================================
// Print : Bank Deposit Slip
//===============================================================

public class CheckDepositSlipDto
{
    public long Id { get; set; }

    public string SlipNo { get; set; } = string.Empty;

    public string SlipDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string BankLedgerCode { get; set; } = string.Empty;

    public string BankLedgerName { get; set; } = string.Empty;

    public int CheckCount { get; set; }

    public decimal TotalAmount { get; set; }

    public List<CheckDepositSlipLineDto> Checks { get; set; } = new();
}

public class CheckDepositSlipLineDto
{
    public string CheckNo { get; set; } = string.Empty;

    public string CheckDate { get; set; } = string.Empty;

    public string CheckBank { get; set; } = string.Empty;

    public string PartyName { get; set; } = string.Empty;

    public string SourceVoucherNo { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    // Status now (an undone check drops off the slip)
    public string Status { get; set; } = string.Empty;
}