//===============================================================
// Check Reconciliations : models
//
// A check is addressed by Direction + PaymentId :
//   Received : Receipt Voucher payment row (Mode Check)
//   Issued   : Payment Voucher payment row (Mode Check)
// Dates travel as yyyy-MM-dd.
//===============================================================

export type CheckDirection =
    'Received' | 'Issued';

export type CheckStatus =
    'Pending' | 'Deposited' | 'Cleared' | 'Dishonoured' | 'Void';


//===============================================================
// List row
//===============================================================

export interface CheckReconciliations
{
    Direction:
        CheckDirection;

    PaymentId:
        number;

    // 0 until the first action
    CheckReconciliationId:
        number;

    // RV / PV
    SourceVoucherType:
        string;

    SourceVoucherId:
        number;

    SourceVoucherNo:
        string;

    VoucherDate:
        string;

    BranchId:
        number;

    BranchName:
        string;

    CheckNo:
        string;

    CheckDate:
        string;

    CheckBank:
        string;

    PartyName:
        string;

    Amount:
        number;

    // Bank account on the voucher
    AccountLedgerCode:
        string;

    AccountLedgerName:
        string;

    Status:
        CheckStatus;

    DepositDate:
        string;

    DepositSlipId:
        number | null;

    DepositSlipNo:
        string;

    DepositLedgerCode:
        string;

    DepositLedgerName:
        string;

    ClearedDate:
        string;

    ClearingVoucherId:
        number | null;

    ClearingVoucherNo:
        string;

    ClearingCharge:
        number;

    DishonourDate:
        string;

    DishonourReason:
        string;

    DishonourFee:
        number;

    DishonourRecovery:
        number;

    DishonourVoucherId:
        number | null;

    DishonourVoucherNo:
        string;

    DishonourCount:
        number;

    VoidDate:
        string;

    VoidReason:
        string;
}


//===============================================================
// History of one check
//===============================================================

export interface CheckReconciliationHistory
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

    DepositSlipNo:
        string;

    Charge:
        number;

    Recovery:
        number;

    Reason:
        string;

    PerformedBy:
        number;

    PerformedDate:
        string;
}


//===============================================================
// Deposit account
//===============================================================

export interface CheckBankAccount
{
    LedgerCode:
        string;

    LedgerName:
        string;

    SubGroupName:
        string;

    Branch:
        string;
}


//===============================================================
// Requests
//===============================================================

export interface CheckDepositRequest
{
    PaymentIds:
        number[];

    DepositDate:
        string;

    BankLedgerCode:
        string;

    // Optional short notes per check
    Notes?:
        CheckNote[];
}

export interface CheckNote
{
    PaymentId:
        number;

    ShortNotes:
        string;
}

export interface CheckClearItem
{
    PaymentId:
        number;

    // Optional bank charge (0 = none)
    Charge:
        number;

    // Optional; printed on the check's voucher lines
    ShortNotes?:
        string;
}

export interface CheckClearRequest
{
    Direction:
        CheckDirection;

    ClearedDate:
        string;

    Narration:
        string;

    Items:
        CheckClearItem[];
}

export interface CheckDishonourItem
{
    PaymentId:
        number;

    // Bank's return reason (required)
    Reason:
        string;

    // Bank's dishonour fee (0 = none)
    Fee:
        number;

    // Charged to the customer (0 = none)
    Recovery:
        number;

    // Optional; printed on the check's voucher lines
    ShortNotes?:
        string;
}

export interface CheckDishonourRequest
{
    DishonourDate:
        string;

    Items:
        CheckDishonourItem[];
}

export interface CheckVoidRequest
{
    PaymentId:
        number;

    VoidDate:
        string;

    Reason:
        string;
}

// Undo Deposit / Undo Clear / Undo Dishonour / Re-present /
// Undo Void
export interface CheckUndoRequest
{
    Direction:
        CheckDirection;

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

export interface CheckActionResult
{
    Message:
        string;

    VoucherNos:
        string[];

    VoucherIds:
        number[];

    DepositSlipId:
        number | null;

    DepositSlipNo:
        string;

    CheckCount:
        number;
}


//===============================================================
// Print : Clearing / Dishonour Voucher (RRV / RRP)
//===============================================================

export interface CheckClearingVoucherLine
{
    LineNo:
        number;

    GroupNo:
        number;

    CheckNo:
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

export interface CheckClearingVoucher
{
    Id:
        number;

    VoucherNo:
        string;

    // RRV / RRP
    VoucherType:
        string;

    // Clearing / Dishonour
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

    CheckCount:
        number;

    Amount:
        number;

    Charges:
        number;

    Recovery:
        number;

    Narration:
        string;

    // Posted / Reversed
    Status:
        string;

    ReversedDate:
        string;

    ReverseReason:
        string;

    Lines:
        CheckClearingVoucherLine[];

    // The checks in this voucher and the voucher each came from
    Sources:
        CheckClearingSource[];
}

export interface CheckClearingSource
{
    CheckNo:
        string;

    // RV / PV
    SourceVoucherType:
        string;

    SourceVoucherNo:
        string;

    PartyName:
        string;
}


//===============================================================
// Print : Bank Deposit Slip
//===============================================================

export interface CheckDepositSlipLine
{
    CheckNo:
        string;

    CheckDate:
        string;

    CheckBank:
        string;

    PartyName:
        string;

    SourceVoucherNo:
        string;

    Amount:
        number;

    Status:
        string;
}

export interface CheckDepositSlip
{
    Id:
        number;

    SlipNo:
        string;

    SlipDate:
        string;

    BranchId:
        number;

    BranchName:
        string;

    BankLedgerCode:
        string;

    BankLedgerName:
        string;

    CheckCount:
        number;

    TotalAmount:
        number;

    Checks:
        CheckDepositSlipLine[];
}


//===============================================================
// Check Clearing Center : number preview
// (nothing is reserved; Save takes the real next number)
//===============================================================

export interface CheckCenterDefaults
{
    // RRV-… / RRP-… / DS-… ; '' when there is no number
    VoucherNo:
        string;

    BranchId:
        number;

    BranchName:
        string;

    FinancialYearName:
        string;

    // Why there is no number (no open financial year …)
    Message:
        string;
}