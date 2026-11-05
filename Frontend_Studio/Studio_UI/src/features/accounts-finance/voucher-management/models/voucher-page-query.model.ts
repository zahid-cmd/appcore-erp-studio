/* ============================================================
   Voucher lists (Receipt / Payment / Journal / Fund Transfer) :
   the query of the server-side "paged" call
============================================================ */

export interface VoucherPageQuery
{
    page:number;

    pageSize:number;

    search:string;

    // Column field ('' = newest voucher date first)
    sort:string;

    dir:'asc' | 'desc';

    // Draft / Approved / Posted / Cancelled ('' = all)
    status:string;

    // Customer / Supplier / General Ledger (/ Mixed); Fund
    // Transfer : the From account type (Cash / Bank / MFS)
    ledgerType:string;
}
