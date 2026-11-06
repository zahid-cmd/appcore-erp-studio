//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings;


//===============================================================
// Account Settings : one list page (GET paged)
//
// Shared by the Account Settings lists; each list reads only
// the filters it shows.
//
//   Status         : active · inactive (blank = all)
//   Branch         : branch name (Bank / Cash / MFS / POS)
//   Tab            : the list's tab (Account Groups / Sub Groups :
//                    all · auto-inventory · auto-financial; EMI
//                    Accounts : platform; Schemes : active ·
//                    expired)
//   AccountClassId : Account Groups / Sub Groups
//   AccountGroupId : Account Sub Groups
//   Brand          : EMI Reimbursement Schemes
//
// The answer's Counts hold Total · Active · Inactive with the
// search and the other filters applied (not the status filter).
//===============================================================

public class AccountSettingsPageRequest
    : PagedRequest
{
    public string? Status { get; set; }

    public string? Branch { get; set; }

    public string? Tab { get; set; }

    public long? AccountClassId { get; set; }

    public long? AccountGroupId { get; set; }

    public string? Brand { get; set; }
}
