//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.AccountsReconciliation;


//===============================================================
// MFS Reconciliation DTOs
//
// A transaction is addressed by PaymentId (the Receipt Voucher
// payment row id, Mode MFS). Dates travel as yyyy-MM-dd.
//===============================================================


//===============================================================
// List row
//===============================================================

public class MfsReconciliationDto
{
    // ReceiptVoucherPaymentId
    public long PaymentId { get; set; }

    // 0 until the first action
    public long MfsReconciliationId { get; set; }

    // RV
    public string SourceVoucherType { get; set; } = string.Empty;

    public long SourceVoucherId { get; set; }

    public string SourceVoucherNo { get; set; } = string.Empty;

    public string ReceiptDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    // Received From
    public string PartyName { get; set; } = string.Empty;

    public string WalletCode { get; set; } = string.Empty;

    public string WalletName { get; set; } = string.Empty;

    // Merchant / Personal
    public string WalletType { get; set; } = string.Empty;

    // Txn ID
    public string TransactionRef { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    // Charge the customer paid on top (0 = company bears)
    public decimal CustomerCharge { get; set; }

    // Customer / Company
    public string ChargeBorneBy { get; set; } = string.Empty;

    // In the wallet = Amount + CustomerCharge
    public decimal GrossAmount { get; set; }

    // Pending / Direct / Settled / Rejected
    public string Status { get; set; } = string.Empty;

    // Auto Settlement due date (Pending merchant lines, switch
    // 0051 ON); '' otherwise
    public string DueDate { get; set; } = string.Empty;

    // Settled : as posted; Pending : the wallet's % now
    public decimal FeePercent { get; set; }

    public decimal Fee { get; set; }

    // Charge audit : the system charge, whether the user changed
    // it (Edit Charges), and why
    public decimal StandardFee { get; set; }

    public bool FeeEdited { get; set; }

    public string FeeReason { get; set; } = string.Empty;

    public decimal NetAmount { get; set; }

    public string BankLedgerCode { get; set; } = string.Empty;

    public string BankLedgerName { get; set; } = string.Empty;

    public string SettledDate { get; set; } = string.Empty;

    public long? SettlementVoucherId { get; set; }

    public string SettlementVoucherNo { get; set; } = string.Empty;

    // Settled by the nightly Auto Settlement
    public bool IsAuto { get; set; }

    // An auto settlement was undone; the job leaves it alone
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

public class MfsReconciliationHistoryDto
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
// MFS wallet (MFS Account) with its linked bank, by code
//===============================================================

public class MfsWalletDto
{
    // MFSAccountCode = ledger code
    public string WalletCode { get; set; } = string.Empty;

    public string WalletName { get; set; } = string.Empty;

    // Merchant / Personal
    public string AccountType { get; set; } = string.Empty;

    // MFS Charges %
    public decimal FeePercent { get; set; }

    public string Branch { get; set; } = string.Empty;

    public bool BranchExclusive { get; set; }

    public bool IsActive { get; set; }

    // Linked bank (BankAccountCode = ledger code); '' when none
    public string BankLedgerCode { get; set; } = string.Empty;

    public string BankLedgerName { get; set; } = string.Empty;

    // Why the wallet cannot be settled ('' = it can)
    public string BankMessage { get; set; } = string.Empty;
}


//===============================================================
// MFS Settlement Center : number preview (nothing is reserved;
// Save takes the real next number)
//===============================================================

public class MfsCenterDefaultsDto
{
    // RRV-… ; '' when there is no number
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

// Settle Pending merchant transactions of ONE wallet into its
// linked bank (one RRV per branch)
public class MfsSettleDto
{
    public string WalletCode { get; set; } = string.Empty;

    public string SettlementDate { get; set; } = string.Empty;

    // Optional; a default narration is built when empty
    public string Narration { get; set; } = string.Empty;

    public List<MfsSettleItemDto> Items { get; set; } = new();
}

public class MfsSettleItemDto
{
    public long PaymentId { get; set; }

    // Used only when switch 0052 Edit Charges is ON; empty or
    // switch OFF = the wallet's % of the gross
    public decimal? Fee { get; set; }

    // Required when Fee differs from the system charge (charge audit)
    public string FeeReason { get; set; } = string.Empty;

    // Optional; printed on the transaction's voucher lines
    public string ShortNotes { get; set; } = string.Empty;
}

// Reject transactions of ONE wallet (a wrong / failed entry);
// Pending merchant or Direct personal
public class MfsRejectDto
{
    public string WalletCode { get; set; } = string.Empty;

    public string RejectDate { get; set; } = string.Empty;

    // Required (the voucher's narration)
    public string Reason { get; set; } = string.Empty;

    public List<MfsRejectItemDto> Items { get; set; } = new();
}

public class MfsRejectItemDto
{
    public long PaymentId { get; set; }

    // Optional; printed on the transaction's voucher lines
    public string ShortNotes { get; set; } = string.Empty;
}

// Undo a settlement (reverses the whole RRV) or a reject
public class MfsUndoDto
{
    public long PaymentId { get; set; }

    // Reversal date (default today)
    public string UndoDate { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;
}


//===============================================================
// Result of an action
//===============================================================

public class MfsActionResultDto
{
    public string Message { get; set; } = string.Empty;

    // RRV created (or reversed)
    public List<string> VoucherNos { get; set; } = new();

    // Their ids (print)
    public List<long> VoucherIds { get; set; } = new();

    // Transactions the action touched
    public int TransactionCount { get; set; }
}


//===============================================================
// Print : Settlement (Receipt Voucher) / Reject (Journal
// Voucher)
//===============================================================

public class MfsReconciliationVoucherDto
{
    public long Id { get; set; }

    public string VoucherNo { get; set; } = string.Empty;

    public string VoucherType { get; set; } = string.Empty;

    // Settlement / Reject
    public string Purpose { get; set; } = string.Empty;

    public string VoucherDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string WalletCode { get; set; } = string.Empty;

    public string WalletName { get; set; } = string.Empty;

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

    public List<MfsReconciliationVoucherLineDto> Lines { get; set; } = new();

    // The transactions in this voucher and the voucher each came
    // from
    public List<MfsReconciliationSourceDto> Sources { get; set; } = new();
}

public class MfsReconciliationSourceDto
{
    public long PaymentId { get; set; }

    public string TransactionRef { get; set; } = string.Empty;

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

public class MfsReconciliationVoucherLineDto
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

public class MfsAutoSettlementRunDto
{
    public long Id { get; set; }

    public string RunDate { get; set; } = string.Empty;

    public string WalletCode { get; set; } = string.Empty;

    public string WalletName { get; set; } = string.Empty;

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

public class MfsAutoSettlementResultDto
{
    // Dates run now (yyyy-MM-dd)
    public List<string> RunDates { get; set; } = new();

    public List<string> VoucherNos { get; set; } = new();

    public int Settled { get; set; }

    public int Skipped { get; set; }

    public int Failed { get; set; }

    public string Message { get; set; } = string.Empty;
}