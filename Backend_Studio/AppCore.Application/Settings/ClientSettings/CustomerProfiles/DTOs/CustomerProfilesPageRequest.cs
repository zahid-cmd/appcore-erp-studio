//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ClientSettings;


//===============================================================
// Customer Profiles : paged list request
//---------------------------------------------------------------
// GET api/settings/client-settings/customer-profiles/paged
//     ?page=1&pageSize=10&search=rahim&sort=CustomerCode&dir=asc
//     &type=Inbound&locationId=12&status=true
//
// Search : code, previous code, name, display name, phones, NID,
//          location, ledger code, remarks ("walk-in" finds the
//          walk-in customers).
// Sort   : CustomerCode, CustomerName, Phone1, LocationName,
//          ReceivableLedgerCode, IsActive (default CustomerCode).
// Counts : "Total", "Inbound", "Outside", "Active", "Inactive"
//          (the counter strip; location and search applied, not
//          the tab or the status filter).
//===============================================================

public class CustomerProfilesPageRequest
    : PagedRequest
{
    // Inbound / Outside (the tab); empty = both
    public string? Type { get; set; }

    // Inbound only : true = Corporate / Institution, false =
    // Individual, empty = both (the Individual / Corporate tabs)
    public bool? Corporate { get; set; }

    public long? LocationId { get; set; }

    // true = Active, false = Inactive, empty = all
    public bool? Status { get; set; }
}
