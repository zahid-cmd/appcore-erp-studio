//===============================================================
// POS Reconciliations : models
//
// A transaction is addressed by PaymentId (the Receipt Voucher
// payment row, Mode POS). A batch is one LINKED BANK ACCOUNT : every
// POS account linked to it. Dates travel as yyyy-MM-dd.
//
//   Pending → Settled | Rejected   (Undo : back to Pending)
//===============================================================

export type PosStatus =
    'Pending' | 'Settled' | 'Rejected';


//===============================================================
// List row
//===============================================================

export interface PosReconciliations
{
    // ReceiptVoucherPaymentId
    PaymentId:
        number;

    // 0 until the first action
    PosReconciliationId:
        number;

    // RV
    SourceVoucherType:
        string;

    SourceVoucherId:
        number;

    SourceVoucherNo:
        string;

    ReceiptDate:
        string;

    BranchId:
        number;

    BranchName:
        string;

    // Received From
    PartyName:
        string;

    // POS account (ledger)
    AccountCode:
        string;

    AccountName:
        string;

    CardName:
        string;

    // Approval / last 4
    TransactionRef:
        string;

    Amount:
        number;

    // Charge the customer paid on top (0 = company bears)
    CustomerCharge:
        number;

    ChargeBorneBy:
        string;

    // In the POS account = Amount + CustomerCharge
    GrossAmount:
        number;

    Status:
        PosStatus;

    // Auto Settlement due date (Pending, switch 0051 ON)
    DueDate:
        string;

    // Settled : as posted; Pending : the card charge saved on the
    // Receipt Voucher
    FeePercent:
        number;

    Fee:
        number;

    // Charge audit : the system charge, whether the user changed
    // it (Edit Charges), and why
    StandardFee:
        number;

    FeeEdited:
        boolean;

    FeeReason:
        string;

    NetAmount:
        number;

    BankLedgerCode:
        string;

    BankLedgerName:
        string;

    SettledDate:
        string;

    SettlementVoucherId:
        number | null;

    SettlementVoucherNo:
        string;

    // Settled by the nightly Auto Settlement
    IsAuto:
        boolean;

    // An auto settlement was undone; the job leaves it alone
    SkipAuto:
        boolean;

    RejectDate:
        string;

    RejectReason:
        string;

    RejectVoucherId:
        number | null;

    RejectVoucherNo:
        string;

    ShortNotes:
        string;
}


//===============================================================
// History row (one transaction)
//===============================================================

export interface PosReconciliationHistory
{
    Id:
        number;

    Action:
        string;

    ActionDate:
        string;

    Status:
        string;

    LedgerName:
        string;

    VoucherNo:
        string;

    Fee:
        number;

    // Charge audit : the system charge, whether the user changed
    // it (Edit Charges), and why
    StandardFee:
        number;

    FeeEdited:
        boolean;

    FeeReason:
        string;

    Reason:
        string;

    IsAuto:
        boolean;

    PerformedBy:
        number;

    PerformedDate:
        string;
}


//===============================================================
// Settlement bank : a bank account POS accounts are linked to
// (by code), with those POS accounts
//===============================================================

export interface PosBank
{
    BankLedgerCode:
        string;

    BankLedgerName:
        string;

    Accounts:
        PosBankAccount[];

    // Why it cannot be settled into ('' = it can)
    BankMessage:
        string;
}

export interface PosBankAccount
{
    AccountCode:
        string;

    AccountName:
        string;

    TerminalNumber:
        string;

    IsActive:
        boolean;
}


//===============================================================
// POS Settlement Center : number preview
//===============================================================

export interface PosCenterDefaults
{
    VoucherNo:
        string;

    BranchId:
        number;

    BranchName:
        string;

    FinancialYearName:
        string;

    Message:
        string;
}


//===============================================================
// Requests
//===============================================================

export interface PosSettleRequest
{
    BankLedgerCode:
        string;

    SettlementDate:
        string;

    Narration:
        string;

    Items:
        PosSettleItem[];
}

export interface PosSettleItem
{
    PaymentId:
        number;

    // Used only with switch 0055 Edit Charges ON
    Fee:
        number | null;

    // Required when Fee differs from the system charge
    FeeReason:
        string;

    ShortNotes:
        string;
}

export interface PosRejectRequest
{
    BankLedgerCode:
        string;

    RejectDate:
        string;

    Reason:
        string;

    Items:
    {
        PaymentId:
            number;

        ShortNotes:
            string;
    }[];
}

export interface PosUndoRequest
{
    PaymentId:
        number;

    UndoDate:
        string;

    Reason:
        string;
}


//===============================================================
// Result of an action
//===============================================================

export interface PosActionResult
{
    Message:
        string;

    VoucherNos:
        string[];

    VoucherIds:
        number[];

    TransactionCount:
        number;
}


//===============================================================
// Print : Settlement (Receipt Voucher) / Reject (Journal)
//===============================================================

export interface PosReconciliationVoucher
{
    Id:
        number;

    VoucherNo:
        string;

    VoucherType:
        string;

    // Settlement / Reject
    Purpose:
        string;

    VoucherDate:
        string;

    BranchId:
        number;

    BranchName:
        string;

    BankLedgerCode:
        string;

    BankLedgerName:
        string;

    TransactionCount:
        number;

    Amount:
        number;

    Charges:
        number;

    NetAmount:
        number;

    Narration:
        string;

    IsAuto:
        boolean;

    // Posted / Reversed
    Status:
        string;

    ReversedDate:
        string;

    ReverseReason:
        string;

    Lines:
        PosReconciliationVoucherLine[];

    Sources:
        PosReconciliationSource[];
}

export interface PosReconciliationSource
{
    PaymentId:
        number;

    TransactionRef:
        string;

    CardName:
        string;

    AccountCode:
        string;

    AccountName:
        string;

    SourceVoucherType:
        string;

    SourceVoucherId:
        number;

    SourceVoucherNo:
        string;

    ReceiptDate:
        string;

    PartyName:
        string;

    GrossAmount:
        number;

    Fee:
        number;

    // Charge audit : the system charge, whether the user changed
    // it (Edit Charges), and why
    StandardFee:
        number;

    FeeEdited:
        boolean;

    FeeReason:
        string;
}

export interface PosReconciliationVoucherLine
{
    LineNo:
        number;

    GroupNo:
        number;

    TransactionRef:
        string;

    LedgerCode:
        string;

    LedgerName:
        string;

    SubGroupName:
        string;

    PartyCode:
        string;

    Debit:
        number;

    Credit:
        number;

    Narration:
        string;

    IsCharge:
        boolean;
}


//===============================================================
// Auto Settlement log
//===============================================================

export interface PosAutoSettlementRun
{
    Id:
        number;

    RunDate:
        string;

    BankLedgerCode:
        string;

    BankLedgerName:
        string;

    BranchId:
        number;

    // Settled / Skipped / Failed / Completed
    Outcome:
        string;

    VoucherId:
        number | null;

    VoucherNo:
        string;

    TransactionCount:
        number;

    Amount:
        number;

    Message:
        string;

    CreatedDate:
        string;
}