//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings;


//===============================================================
// General Settings : one list page (GET paged)
//
// Shared by Company, Wings, Branches, Warehouses, Locations and
// Financial Years; each list reads only the filters it shows.
//
//   Status     : active · inactive (blank = all)
//   WingId     : Branches, Warehouses
//   BranchId   : Warehouses
//   Division   : Locations
//   District   : Locations
//   YearStatus : Financial Years (Open · Closed · Locked)
//
// The answer's Counts hold Total · Active · Inactive with the
// search and the other filters applied (not the status filter).
//===============================================================

public class GeneralSettingsPageRequest
    : PagedRequest
{
    public string? Status { get; set; }

    public long? WingId { get; set; }

    public long? BranchId { get; set; }

    public string? Division { get; set; }

    public string? District { get; set; }

    public string? YearStatus { get; set; }
}
