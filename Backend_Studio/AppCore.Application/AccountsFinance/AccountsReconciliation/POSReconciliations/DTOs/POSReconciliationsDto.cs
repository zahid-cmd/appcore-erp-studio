//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.AccountsReconciliation;


//===============================================================
// POS Reconciliation DTOs
//
// A transaction is addressed by PaymentId (the Receipt Voucher
// payment row id, Mode POS). A batch is one LINKED BANK ACCOUNT
// (every POS account linked to it). Dates travel as yyyy-MM-dd.
//===============================================================


//===============================================================
// List row
//===============================================================

public class PosReconciliationDto
{
    // ReceiptVoucherPaymentId
    public long PaymentId { get; set; }

    // 0 until the first action
    public long PosReconciliationId { get; set; }

    // RV
    public string SourceVoucherType { get; set; } = string.Empty;

    public long SourceVoucherId { get; set; }

    public string SourceVoucherNo { get; set; } = string.Empty;

    public string ReceiptDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    // Received From
    public string PartyName { get; set; } = string.Empty;

    // POS account (ledger)
    public string AccountCode { get; set; } = string.Empty;

    public string AccountName { get; set; } = string.Empty;

    public string CardName { get; set; } = string.Empty;

    // Approval / last 4
    public string TransactionRef { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    // Charge the customer paid on top (0 = company bears)
    public decimal CustomerCharge { get; set; }

    // Customer / Company
    public string ChargeBorneBy { get; set; } = string.Empty;

    // In the POS account = Amount + CustomerCharge
    public decimal GrossAmount { get; set; }

    // Pending / Settled / Rejected
    public string Status { get; set; } = string.Empty;

    // Auto Settlement due date (Pending, switch 0054 ON)
    public string DueDate { get; set; } = string.Empty;

    // Pending : the POS account's linked bank NOW; Settled : the
    // bank it settled into
    public string BankLedgerCode { get; set; } = string.Empty;

    public string BankLedgerName { get; set; } = string.Empty;

    // Settled : as posted; Pending : the charge saved on the RV
    public decimal FeePercent { get; set; }

    public decimal Fee { get; set; }

    // Charge audit : the system charge, whether the user changed
    // it (Edit Charges), and why
    public decimal StandardFee { get; set; }

    public bool FeeEdited { get; set; }

    public string FeeReason { get; set; } = string.Empty;

    public decimal NetAmount { get; set; }

    public string SettledDate { get; set; } = string.Empty;

    public long? SettlementVoucherId { get; set; }

    public string SettlementVoucherNo { get; set; } = string.Empty;

    public bool IsAuto { get; set; }

    public bool SkipAuto { get; set; }

    public string RejectDate { get; set; } = string.Empty;

    public string RejectReason { get; set; } = string.Empty;

    public long? RejectVoucherId { get; set; }

    public string RejectVoucherNo { get; set; } = string.Empty;

    public string ShortNotes { get; set; } = string.Empty;
}


//===============================================================
// History row
//===============================================================

public class PosReconciliationHistoryDto
{
    public long Id { get; set; }

    public string Action { get; set; } = string.Empty;

    public string ActionDate { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public string VoucherNo { get; set; } = string.Empty;

    public decimal Fee { get; set; }

    // Charge audit : the system charge, whether the user changed
    // it (Edit Charges), and why
    public decimal StandardFee { get; set; }

    public bool FeeEdited { get; set; }

    public string FeeReason { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;

    public bool IsAuto { get; set; }

    public long PerformedBy { get; set; }

    public DateTime PerformedDate { get; set; }
}


//===============================================================
// Settlement bank : a bank account that POS accounts are linked
// to (by code), with those POS accounts
//===============================================================

public class PosBankDto
{
    // BankAccountCode = ledger code
    public string BankLedgerCode { get; set; } = string.Empty;

    public string BankLedgerName { get; set; } = string.Empty;

    // The POS accounts linked to it
    public List<PosBankAccountDto> Accounts { get; set; } = new();

    // Why it cannot be settled into ('' = it can)
    public string BankMessage { get; set; } = string.Empty;
}

public class PosBankAccountDto
{
    public string AccountCode { get; set; } = string.Empty;

    public string AccountName { get; set; } = string.Empty;

    public string TerminalNumber { get; set; } = string.Empty;

    public bool IsActive { get; set; }
}


//===============================================================
// POS Settlement Center : number preview
//===============================================================

public class PosCenterDefaultsDto
{
    public string VoucherNo { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string FinancialYearName { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;
}


//===============================================================
// Requests
//===============================================================

// Settle Pending card receipts of the POS accounts linked to ONE
// bank account (one RRV per branch)
public class PosSettleDto
{
    public string BankLedgerCode { get; set; } = string.Empty;

    public string SettlementDate { get; set; } = string.Empty;

    // Required
    public string Narration { get; set; } = string.Empty;

    public List<PosSettleItemDto> Items { get; set; } = new();
}

public class PosSettleItemDto
{
    public long PaymentId { get; set; }

    // Used only when switch 0055 Edit Charges is ON; empty or
    // switch OFF = the charge saved on the Receipt Voucher
    public decimal? Fee { get; set; }

    // Required when Fee differs from the system charge (charge audit)
    public string FeeReason { get; set; } = string.Empty;

    public string ShortNotes { get; set; } = string.Empty;
}

// Reject card receipts (a void / wrong entry) of the POS accounts
// linked to ONE bank account
public class PosRejectDto
{
    public string BankLedgerCode { get; set; } = string.Empty;

    public string RejectDate { get; set; } = string.Empty;

    // Required (the voucher's narration)
    public string Reason { get; set; } = string.Empty;

    public List<PosRejectItemDto> Items { get; set; } = new();
}

public class PosRejectItemDto
{
    public long PaymentId { get; set; }

    public string ShortNotes { get; set; } = string.Empty;
}

// Undo a settlement (reverses the whole RRV) or a reject
public class PosUndoDto
{
    public long PaymentId { get; set; }

    public string UndoDate { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;
}


//===============================================================
// Result of an action
//===============================================================

public class PosActionResultDto
{
    public string Message { get; set; } = string.Empty;

    public List<string> VoucherNos { get; set; } = new();

    public List<long> VoucherIds { get; set; } = new();

    public int TransactionCount { get; set; }
}


//===============================================================
// Print : Settlement (Receipt Voucher) / Reject (Journal)
//===============================================================

public class PosReconciliationVoucherDto
{
    public long Id { get; set; }

    public string VoucherNo { get; set; } = string.Empty;

    public string VoucherType { get; set; } = string.Empty;

    // Settlement / Reject
    public string Purpose { get; set; } = string.Empty;

    public string VoucherDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string BankLedgerCode { get; set; } = string.Empty;

    public string BankLedgerName { get; set; } = string.Empty;

    public int TransactionCount { get; set; }

    public decimal Amount { get; set; }

    public decimal Charges { get; set; }

    public decimal NetAmount { get; set; }

    public string Narration { get; set; } = string.Empty;

    public bool IsAuto { get; set; }

    // Posted / Reversed
    public string Status { get; set; } = string.Empty;

    public string ReversedDate { get; set; } = string.Empty;

    public string ReverseReason { get; set; } = string.Empty;

    public List<PosReconciliationVoucherLineDto> Lines { get; set; } = new();

    public List<PosReconciliationSourceDto> Sources { get; set; } = new();
}

public class PosReconciliationSourceDto
{
    public long PaymentId { get; set; }

    public string TransactionRef { get; set; } = string.Empty;

    public string CardName { get; set; } = string.Empty;

    public string AccountCode { get; set; } = string.Empty;

    public string AccountName { get; set; } = string.Empty;

    public string SourceVoucherType { get; set; } = string.Empty;

    public long SourceVoucherId { get; set; }

    public string SourceVoucherNo { get; set; } = string.Empty;

    public string ReceiptDate { get; set; } = string.Empty;

    public string PartyName { get; set; } = string.Empty;

    public decimal GrossAmount { get; set; }

    public decimal Fee { get; set; }

    // Charge audit : the system charge, whether the user changed
    // it (Edit Charges), and why
    public decimal StandardFee { get; set; }

    public bool FeeEdited { get; set; }

    public string FeeReason { get; set; } = string.Empty;
}

public class PosReconciliationVoucherLineDto
{
    public int LineNo { get; set; }

    public int GroupNo { get; set; }

    public string TransactionRef { get; set; } = string.Empty;

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
// Auto Settlement : run log row / result of a run
//===============================================================

public class PosAutoSettlementRunDto
{
    public long Id { get; set; }

    public string RunDate { get; set; } = string.Empty;

    public string BankLedgerCode { get; set; } = string.Empty;

    public string BankLedgerName { get; set; } = string.Empty;

    public long BranchId { get; set; }

    // Settled / Skipped / Failed / Completed
    public string Outcome { get; set; } = string.Empty;

    public long? VoucherId { get; set; }

    public string VoucherNo { get; set; } = string.Empty;

    public int TransactionCount { get; set; }

    public decimal Amount { get; set; }

    public string Message { get; set; } = string.Empty;

    public DateTime CreatedDate { get; set; }
}

public class PosAutoSettlementResultDto
{
    public List<string> RunDates { get; set; } = new();

    public List<string> VoucherNos { get; set; } = new();

    public int Settled { get; set; }

    public int Skipped { get; set; }

    public int Failed { get; set; }

    public string Message { get; set; } = string.Empty;
}