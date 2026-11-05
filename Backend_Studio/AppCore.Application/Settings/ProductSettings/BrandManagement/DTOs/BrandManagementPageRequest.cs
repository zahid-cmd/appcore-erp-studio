//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Brands : paged list request
//---------------------------------------------------------------
// GET api/settings/product-settings/brand-management/paged?page=1&pageSize=10&search=&sort=&dir=asc
//
// Search : code, name, supplier code / name, ledger codes, remarks.
// Sort   : BrandCode, BrandName, MotorBikesSupplierName, Status (default BrandCode).
// Counts : "Total", "Active", "Inactive" (the summary line; search
//          applied, not the status).
//===============================================================

public class BrandManagementPageRequest
    : PagedRequest
{
    // true = Active, false = Inactive, empty = all
    public bool? Status { get; set; }
}
