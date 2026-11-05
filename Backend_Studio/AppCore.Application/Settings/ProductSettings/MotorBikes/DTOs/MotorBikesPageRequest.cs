//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Motor Bikes : paged list request
//---------------------------------------------------------------
// GET api/settings/product-settings/motor-bikes/paged
//     ?page=1&pageSize=10&search=cbr&sort=ProductCode&dir=asc
//     &status=true
//
// Search : product code, product name, ledger codes, remarks,
//          category / brand / sub category, color.
// Sort   : ProductCode, ProductName, CategoryName, ColorName,
//          ReorderLevel, RedLevel, MaxStockLevel, IsActive
//          (default ProductCode).
// Counts : "Total", "Active", "Inactive" (the summary line; the
//          search applied, not the status).
//===============================================================

public class MotorBikesPageRequest
    : PagedRequest
{
    // true = Active, false = Inactive, empty = all
    public bool? Status { get; set; }

    // Filters (empty = all)
    public long? ProductCategoryId { get; set; }

    public long? ProductSubCategoryId { get; set; }

    public long? ColorManagementId { get; set; }
}
