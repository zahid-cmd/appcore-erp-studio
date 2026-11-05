/* ============================================================
   Receipt Voucher
   (Accounts Finance › Voucher Management › Receipt Voucher)

   One group per voucher :
     n Debits : 1 Credit   or   1 Debit : n Credits
   Debits  : Receipt Mode (Cash / Bank / Check / MFS / POS /
             EMI), entered first
   Credits : Account Details (Customer / Supplier / General
             Ledger)
   Number RV-<branch digits>-<FY>-<MM>-<seq>, taken on the first
   draft save (the page only shows a preview).
   Workflow : Draft → Approved → Posted → Cancelled.
============================================================ */

import
{
    VoucherDebitLine,
    VoucherCreditLine
}
from '../../../../shared/components/accounting/accounting.models';


export type ReceiptVoucherStatus =
    'Draft' | 'Approved' | 'Posted' | 'Cancelled';


/* ============================================================
   Receipt Voucher
============================================================ */

export interface ReceiptVoucher
{
    ReceiptVoucherId:
        number;

    VoucherNo:
        string;

    // yyyy-MM-dd
    VoucherDate:
        string;

    BranchId:
        number;

    BranchCode:
        string;

    BranchName:
        string;

    FinancialYearId:
        number;

    // Customer / Supplier / General Ledger
    LedgerType:
        string;

    // Credited party / ledger ("+ n more" when several)
    PartyName:
        string;

    Narration:
        string;

    TotalAmount:
        number;

    // MFS / POS / EMI charges the customer paid on top
    CustomerCharges:
        number;

    // "Cash, Check"
    ReceiptModes:
        string;

    Status:
        ReceiptVoucherStatus | string;

    CancelReason:
        string;

    // yyyy-MM-dd
    CancelDate:
        string;

    ApprovedDate:
        string | null;

    PostedDate:
        string | null;

    CancelledDate:
        string | null;

    CreatedDate:
        string | null;

    ModifiedDate:
        string | null;

    Debits:
        VoucherDebitLine[];

    Credits:
        VoucherCreditLine[];
}


/* ============================================================
   Create Receipt Voucher (saved as Draft)
   Number, branch code / name, financial year, sub group /
   ledger names, party codes and totals are resolved by the
   server.
============================================================ */

export interface CreateReceiptVoucher
{
    // yyyy-MM-dd
    VoucherDate:
        string;

    // The branch the user logged in with
    BranchId:
        number;

    Narration:
        string;

    Debits:
        VoucherDebitLine[];

    Credits:
        VoucherCreditLine[];
}


/* ============================================================
   Update Receipt Voucher (Draft only)
============================================================ */

export interface UpdateReceiptVoucher
    extends CreateReceiptVoucher
{
    ReceiptVoucherId:
        number;
}


/* ============================================================
   Saved (create result : the number actually taken)
============================================================ */

export interface ReceiptVoucherSaved
{
    ReceiptVoucherId:
        number;

    VoucherNo:
        string;
}


/* ============================================================
   Cancel Receipt Voucher (Posted only)
============================================================ */

export interface CancelReceiptVoucher
{
    // yyyy-MM-dd (empty = today)
    CancelDate:
        string;

    Reason:
        string;
}


/* ============================================================
   Receipt Voucher Defaults (Add form)
   Next voucher number for branch + date (preview only).
   Message is set when no number can be given (closed / missing
   financial year ...).
============================================================ */

export interface ReceiptVoucherDefaults
{
    VoucherNo:
        string;

    BranchId:
        number;

    BranchName:
        string;

    FinancialYearId:
        number;

    FinancialYearName:
        string;

    FinancialYearCode:
        string;

    PeriodMonth:
        number;

    Message:
        string;
}