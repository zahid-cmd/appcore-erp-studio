//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Product Sub Categories : paged list request
//---------------------------------------------------------------
// GET api/settings/product-settings/product-sub-category/paged?page=1&pageSize=10&search=&sort=&dir=asc&productCategoryId=
//
// Search : code, name, category, sub group codes, remarks.
// Sort   : SubCategoryCode, SubCategoryName, ProductCategoryName, InventorySubGroupCode, WipSubGroupCode, CogsSubGroupCode, IsActive (default SubCategoryCode).
// Counts : "Total", "Active", "Inactive" (the summary line; search
//          applied, not the status).
//===============================================================

public class ProductSubCategoryPageRequest
    : PagedRequest
{
    // true = Active, false = Inactive, empty = all
    public bool? Status { get; set; }

    // Product Category filter (empty = all categories)
    public long? ProductCategoryId { get; set; }
}
