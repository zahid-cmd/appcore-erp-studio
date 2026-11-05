//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Product Categories : paged list request
//---------------------------------------------------------------
// GET api/settings/product-settings/product-category/paged?page=1&pageSize=10&search=&sort=&dir=asc
//
// Search : code, name, type, brand, group codes, remarks.
// Sort   : CategoryCode, CategoryName, CategoryType, InventoryGroupCode, WipGroupCode, CogsGroupCode, SubCategoryCreationAllowed, IsActive (default CategoryCode).
// Counts : "Total", "Active", "Inactive" (the summary line; search
//          applied, not the status).
//===============================================================

public class ProductCategoryPageRequest
    : PagedRequest
{
    // true = Active, false = Inactive, empty = all
    public bool? Status { get; set; }
}
