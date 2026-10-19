//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings.ChartOfInventory.DTOs;


//===============================================================
// Chart of Inventory : Product Sub Category Node
//
// ProductCount       : all products under the sub category
// ActiveProductCount : active products only
//
// Products = Motor Bikes + Spare Parts + Accessories.
//===============================================================

public class ChartOfInventorySubCategoryDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public bool Status { get; set; }

    public int ProductCount { get; set; }

    public int ActiveProductCount { get; set; }
}