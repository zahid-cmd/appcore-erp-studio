/* ============================================================
   Journal Voucher
   (Accounts Finance › Voucher Management › Journal Voucher)

   Groups (switch 0045 "Multi Group Journal Voucher"; OFF = one
   group). In each group :
     n Debits : 1 Credit   or   1 Debit : n Credits
     debits first, debit = credit
   Rows : Supplier / Customer / General Ledger, per row (no cash /
   bank / MFS / POS / EMI ledgers).
   Number JV-<branch digits>-<FY>-<MM>-<seq>, taken on the first
   draft save (the page only shows a preview).
   Workflow : Draft → Approved → Posted → Cancelled.
============================================================ */

import
{
    JournalLine
}
from '../../../../shared/components/accounting/journal-entry/journal-entry.models';


export type JournalVoucherStatus =
    'Draft' | 'Approved' | 'Posted' | 'Cancelled';


/* ============================================================
   Journal Voucher
============================================================ */

export interface JournalVoucher
{
    JournalVoucherId:
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

    // Supplier / Customer / General Ledger, or Mixed
    LedgerType:
        string;

    // First debited ledger ("+ n more" when several rows)
    PartyName:
        string;

    Narration:
        string;

    TotalAmount:
        number;

    // Balanced groups
    GroupCount:
        number;

    Status:
        JournalVoucherStatus | string;

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

    // Debits and credits, group by group (debits first)
    Lines:
        JournalLine[];
}


/* ============================================================
   Create Journal Voucher (saved as Draft)
   Number, branch code / name, financial year, sub group /
   ledger names, party codes and totals are resolved by the
   server.
============================================================ */

export interface CreateJournalVoucher
{
    // yyyy-MM-dd
    VoucherDate:
        string;

    // The branch the user logged in with
    BranchId:
        number;

    Narration:
        string;

    // Debits and credits, group by group (debits first)
    Lines:
        JournalLine[];
}


/* ============================================================
   Update Journal Voucher (Draft only)
============================================================ */

export interface UpdateJournalVoucher
    extends CreateJournalVoucher
{
    JournalVoucherId:
        number;
}


/* ============================================================
   Saved (create result : the number actually taken)
============================================================ */

export interface JournalVoucherSaved
{
    JournalVoucherId:
        number;

    VoucherNo:
        string;
}


/* ============================================================
   Cancel Journal Voucher (Posted only)
============================================================ */

export interface CancelJournalVoucher
{
    // yyyy-MM-dd (empty = today)
    CancelDate:
        string;

    Reason:
        string;
}


/* ============================================================
   Journal Voucher Defaults (Add form)
   Next voucher number for branch + date (preview only).
   Message is set when no number can be given (closed / missing
   financial year ...).
============================================================ */

export interface JournalVoucherDefaults
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