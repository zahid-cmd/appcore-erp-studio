//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Spare Parts & Lubricants : paged list request
//---------------------------------------------------------------
// GET api/settings/product-settings/spare-parts/paged
//     ?page=1&pageSize=10&search=filter&sort=ProductCode&dir=asc
//     &type=LB&status=true
//
// Type   : SP (Spare Parts) / LB (Lubricants), by the category
//          code prefix (the tab); empty = all.
// Search : product code, part number, part name, unit, movement
//          class, ledger codes, remarks, category / brand / sub
//          category, warehouse / rack of a location.
// Sort   : ProductCode, PartNumber, PartName, CategoryName, Unit,
//          MovementText (fastest first), ReorderLevel, RedLevel,
//          MaxStockLevel, IsActive (default ProductCode).
// Counts : "Total", "SP", "LB", "Active", "Inactive" (the summary
//          line; search applied, not the tab or the status).
//===============================================================

public class SparePartsPageRequest
    : PagedRequest
{
    // SP / LB (the tab); empty = all
    public string? Type { get; set; }

    // true = Active, false = Inactive, empty = all
    public bool? Status { get; set; }

    // Filters (empty = all)
    public long? ProductCategoryId { get; set; }

    public long? ProductSubCategoryId { get; set; }
}
