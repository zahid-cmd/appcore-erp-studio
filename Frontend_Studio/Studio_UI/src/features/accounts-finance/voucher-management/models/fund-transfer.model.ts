/* ============================================================
   Fund Transfer
   (Accounts Finance › Voucher Management › Fund Transfer)

   Money between our own Cash / Bank / MFS accounts (same or
   another branch), posted at once :
     From (CREDIT, entered first) → To (DEBIT)
     n From : 1 To   or   1 From : n To   (switch 0023 OFF : one
     From and one To)
   Bank / MFS charges the company pays : Dr Bank Charges / MFS
   Charges, Cr the From account.
   Number FT-<branch digits>-<FY>-<MM>-<seq>, taken on the first
   draft save (the page only shows a preview).
   Workflow : Draft → Approved → Posted → Cancelled.
============================================================ */

import
{
    TransferLine
}
from '../../../../shared/components/accounting/transfer-entry/transfer-entry.models';


export type FundTransferStatus =
    'Draft' | 'Approved' | 'Posted' | 'Cancelled';


/* ============================================================
   Fund Transfer
============================================================ */

export interface FundTransfer
{
    FundTransferId:
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

    // "Cash to Bank", "Bank to Bank" ...
    TransferType:
        string;

    // "From account to To account"
    PartyName:
        string;

    Narration:
        string;

    TotalAmount:
        number;

    // Bank / MFS charges the company pays on top
    Charges:
        number;

    Status:
        FundTransferStatus | string;

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

    // From rows first, then To rows
    Lines:
        TransferLine[];
}


/* ============================================================
   Create Fund Transfer (saved as Draft)
   Number, branch code / name, financial year, sub group /
   ledger names, party codes and totals are resolved by the
   server.
============================================================ */

export interface CreateFundTransfer
{
    // yyyy-MM-dd
    VoucherDate:
        string;

    // The branch the user logged in with
    BranchId:
        number;

    Narration:
        string;

    // From rows first, then To rows
    Lines:
        TransferLine[];
}


/* ============================================================
   Update Fund Transfer (Draft only)
============================================================ */

export interface UpdateFundTransfer
    extends CreateFundTransfer
{
    FundTransferId:
        number;
}


/* ============================================================
   Saved (create result : the number actually taken)
============================================================ */

export interface FundTransferSaved
{
    FundTransferId:
        number;

    VoucherNo:
        string;
}


/* ============================================================
   Cancel Fund Transfer (Posted only)
============================================================ */

export interface CancelFundTransfer
{
    // yyyy-MM-dd (empty = today)
    CancelDate:
        string;

    Reason:
        string;
}


/* ============================================================
   Fund Transfer Defaults (Add form)
   Next voucher number for branch + date (preview only).
   Message is set when no number can be given (closed / missing
   financial year ...).
============================================================ */

export interface FundTransferDefaults
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