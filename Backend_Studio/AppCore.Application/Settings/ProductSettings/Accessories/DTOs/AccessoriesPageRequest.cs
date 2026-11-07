//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Accessories : paged list request
//---------------------------------------------------------------
// GET api/settings/product-settings/accessories/paged
//     ?page=1&pageSize=10&search=helmet&sort=ProductCode&dir=asc
//     &status=true
//
// Search : product code, part number, accessory name, unit,
//          movement class, ledger code, remarks, category / brand
//          / sub category, warehouse / rack of a location.
// Sort   : ProductCode, PartNumber, AccessoryName, CategoryName,
//          Unit, MovementText (fastest first), ReorderLevel,
//          RedLevel, MaxStockLevel, IsActive (default ProductCode).
// Counts : "Total", "Active", "Inactive" (the summary line; the
//          search applied, not the status).
//===============================================================

public class AccessoriesPageRequest
    : PagedRequest
{
    // true = Active, false = Inactive, empty = all
    public bool? Status { get; set; }

    // Filters (empty = all)
    public long? ProductCategoryId { get; set; }

    public long? ProductSubCategoryId { get; set; }

    // For Sale / Additional Accessories / Promotional Accessories
    // (empty = all)
    public string? AccessoryUse { get; set; }
}
