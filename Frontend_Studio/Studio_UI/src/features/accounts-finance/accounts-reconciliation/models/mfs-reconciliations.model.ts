//===============================================================
// MFS Reconciliations : models
//
// A transaction is addressed by PaymentId (the Receipt Voucher
// payment row, Mode MFS). Dates travel as yyyy-MM-dd.
//
// Merchant wallet : Pending → Settled | Rejected
// Personal wallet : Direct (landed at once) → Rejected only
//===============================================================

export type MfsStatus =
    'Pending' | 'Direct' | 'Settled' | 'Rejected';

export type MfsWalletType =
    'Merchant' | 'Personal';


//===============================================================
// List row
//===============================================================

export interface MfsReconciliations
{
    // ReceiptVoucherPaymentId
    PaymentId:
        number;

    // 0 until the first action
    MfsReconciliationId:
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

    WalletCode:
        string;

    WalletName:
        string;

    WalletType:
        MfsWalletType;

    // Txn ID
    TransactionRef:
        string;

    Amount:
        number;

    // Charge the customer paid on top (0 = company bears)
    CustomerCharge:
        number;

    ChargeBorneBy:
        string;

    // In the wallet = Amount + CustomerCharge
    GrossAmount:
        number;

    Status:
        MfsStatus;

    // Auto Settlement due date (Pending, switch 0051 ON)
    DueDate:
        string;

    // Settled : as posted; Pending : the wallet's % now
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

export interface MfsReconciliationHistory
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
// MFS wallet (MFS Account) with its linked bank (by code)
//===============================================================

export interface MfsWallet
{
    WalletCode:
        string;

    WalletName:
        string;

    AccountType:
        MfsWalletType;

    // MFS Charges %
    FeePercent:
        number;

    Branch:
        string;

    BranchExclusive:
        boolean;

    IsActive:
        boolean;

    BankLedgerCode:
        string;

    BankLedgerName:
        string;

    // Why it cannot be settled ('' = it can)
    BankMessage:
        string;
}


//===============================================================
// MFS Settlement Center : number preview
//===============================================================

export interface MfsCenterDefaults
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

export interface MfsSettleRequest
{
    WalletCode:
        string;

    SettlementDate:
        string;

    Narration:
        string;

    Items:
        MfsSettleItem[];
}

export interface MfsSettleItem
{
    PaymentId:
        number;

    // Used only with switch 0052 Edit Charges ON
    Fee:
        number | null;

    // Required when Fee differs from the system charge
    FeeReason:
        string;

    ShortNotes:
        string;
}

export interface MfsRejectRequest
{
    WalletCode:
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

export interface MfsUndoRequest
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

export interface MfsActionResult
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

export interface MfsReconciliationVoucher
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

    WalletCode:
        string;

    WalletName:
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
        MfsReconciliationVoucherLine[];

    Sources:
        MfsReconciliationSource[];
}

export interface MfsReconciliationSource
{
    PaymentId:
        number;

    TransactionRef:
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

export interface MfsReconciliationVoucherLine
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

export interface MfsAutoSettlementRun
{
    Id:
        number;

    RunDate:
        string;

    WalletCode:
        string;

    WalletName:
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