//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.GeneralLedgers.DTOs;


//===============================================================
// General Ledgers list : paged list request
//---------------------------------------------------------------
// GET api/settings/account-settings/general-ledger/paged
//     ?page=1&pageSize=10&search=cash&sort=LedgerCode&dir=asc
//     &origin=manual&accountClassId=1&accountGroupId=2
//     &accountSubGroupId=3&status=active
//
// Origin   : the tab. manual (default, "All General Ledgers") /
//            inventory ("Auto Inventory Ledgers") / financial
//            ("Auto Financial Ledgers"). Decided by the ledger
//            CODE against the Auto Accounts registry
//            (AutoAccountsRepository), as before.
// Class / Group / Sub Group : the toolbar filters; 0 or empty
//            = all.
// Status   : active / inactive; empty = all.
// Search   : class / group / sub group names and codes, ledger
//            code / name, mode, remarks.
// Sort     : AccountClassName, AccountGroupName,
//            AccountSubGroupName, LedgerCode, LedgerName, Mode,
//            IsActive. Default : LedgerCode.
// Counts   : "Total", "Active", "Inactive" (the summary line;
//            tab, filters and search applied, not the status).
//===============================================================

public class GeneralLedgersPageRequest
    : PagedRequest
{
    // manual / inventory / financial (the tab)
    public string? Origin { get; set; }

    public long? AccountClassId { get; set; }

    public long? AccountGroupId { get; set; }

    public long? AccountSubGroupId { get; set; }

    // active / inactive
    public string? Status { get; set; }
}


//===============================================================
// General Ledgers list : one page plus the filter choices
//---------------------------------------------------------------
// ClassIds / GroupIds / SubGroupIds : the classes, groups and
// sub groups holding at least one ledger of the tab, so each
// toolbar filter offers only those (as before).
//===============================================================

public class GeneralLedgersPagedResult
    : PagedResult<GeneralLedgersDto>
{
    public List<long> ClassIds { get; set; } = new();

    public List<long> GroupIds { get; set; } = new();

    public List<long> SubGroupIds { get; set; } = new();
}
