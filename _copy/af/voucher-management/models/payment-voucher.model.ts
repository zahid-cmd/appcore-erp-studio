/* ============================================================
   Payment Voucher
   (Accounts Finance › Voucher Management › Payment Voucher)

   One group per voucher :
     n Debits : 1 Credit   or   1 Debit : n Credits
   Debits  : Pay To (Supplier / Customer / General Ledger),
             entered first
   Credits : Payment Mode (Cash / Bank / Check / MFS)

   On the server Debits = Pay To rows and Credits = Payment Mode
   rows. The shared entry screen / Payment Desk always keep the
   money rows in Debits and the account rows in Credits, so the
   page swaps the two lists when it loads and saves.
   Number PV-<branch digits>-<FY>-<MM>-<seq>, taken on the first
   draft save (the page only shows a preview).
   Workflow : Draft → Approved → Posted → Cancelled.
============================================================ */

import
{
    VoucherDebitLine,
    VoucherCreditLine
}
from '../../../../shared/components/accounting/accounting.models';


export type PaymentVoucherStatus =
    'Draft' | 'Approved' | 'Posted' | 'Cancelled';


/* ============================================================
   Payment Voucher
============================================================ */

export interface PaymentVoucher
{
    PaymentVoucherId:
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

    // Supplier / Customer / General Ledger
    LedgerType:
        string;

    // Paid party / ledger ("+ n more" when several)
    PartyName:
        string;

    Narration:
        string;

    TotalAmount:
        number;

    // MFS charges the company paid on top
    CompanyCharges:
        number;

    // "Cash, Check"
    PaymentModes:
        string;

    Status:
        PaymentVoucherStatus | string;

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

    // Pay To rows
    Debits:
        VoucherCreditLine[];

    // Payment Mode rows
    Credits:
        VoucherDebitLine[];
}


/* ============================================================
   Create Payment Voucher (saved as Draft)
   Number, branch code / name, financial year, sub group /
   ledger names, party codes and totals are resolved by the
   server.
============================================================ */

export interface CreatePaymentVoucher
{
    // yyyy-MM-dd
    VoucherDate:
        string;

    // The branch the user logged in with
    BranchId:
        number;

    Narration:
        string;

    // Pay To rows
    Debits:
        VoucherCreditLine[];

    // Payment Mode rows
    Credits:
        VoucherDebitLine[];
}


/* ============================================================
   Update Payment Voucher (Draft only)
============================================================ */

export interface UpdatePaymentVoucher
    extends CreatePaymentVoucher
{
    PaymentVoucherId:
        number;
}


/* ============================================================
   Saved (create result : the number actually taken)
============================================================ */

export interface PaymentVoucherSaved
{
    PaymentVoucherId:
        number;

    VoucherNo:
        string;
}


/* ============================================================
   Cancel Payment Voucher (Posted only)
============================================================ */

export interface CancelPaymentVoucher
{
    // yyyy-MM-dd (empty = today)
    CancelDate:
        string;

    Reason:
        string;
}


/* ============================================================
   Payment Voucher Defaults (Add form)
   Next voucher number for branch + date (preview only).
   Message is set when no number can be given (closed / missing
   financial year ...).
============================================================ */

export interface PaymentVoucherDefaults
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