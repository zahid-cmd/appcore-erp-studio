//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Colors : paged list request
//---------------------------------------------------------------
// GET api/settings/product-settings/color-management/paged?page=1&pageSize=10&search=&sort=&dir=asc
//
// Search : code, name, remarks.
// Sort   : ColorCode, ColorName, Status (default ColorCode).
// Counts : "Total", "Active", "Inactive" (the summary line; search
//          applied, not the status).
//===============================================================

public class ColorManagementPageRequest
    : PagedRequest
{
    // true = Active, false = Inactive, empty = all
    public bool? Status { get; set; }
}
