//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.VoucherManagement;


//===============================================================
// Voucher lists (Receipt / Payment / Journal / Fund Transfer) :
// paged list request
//---------------------------------------------------------------
// GET api/accounts-finance/voucher-management/<voucher>/paged
//     ?page=1&pageSize=10&search=rahim&sort=VoucherNo&dir=desc
//     &status=Posted&ledgerType=Customer
//
// Status     : Draft / Approved / Posted / Cancelled (the tab);
//              empty = all.
// LedgerType : Customer / Supplier / General Ledger (/ Mixed for
//              journals); for Fund Transfer the From account type
//              (Cash / Bank / MFS).
// Search     : voucher no, branch, ledger / transfer type, party,
//              narration, status, modes; a date typed as
//              dd-MM-yyyy or yyyy-MM-dd finds that voucher date.
// Sort       : VoucherNo, VoucherDateText, BranchName, PartyText,
//              TotalAmountText, Status (+ GroupCountText for
//              journals, TransferType for transfers). Default :
//              newest date first.
// Counts     : "Total", "Draft", "Approved", "Posted", "Cancelled"
//              (the summary line; ledger type and search applied,
//              not the tab).
//===============================================================

public class VoucherPageRequest
    : PagedRequest
{
    // Draft / Approved / Posted / Cancelled (the tab)
    public string? Status { get; set; }

    // Ledger type (RV / PV / JV) or From type (FT)
    public string? LedgerType { get; set; }
}
