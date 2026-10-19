//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings.ChartOfInventory.DTOs;


//===============================================================
// Chart of Inventory : Product Category Node
//===============================================================

public class ChartOfInventoryCategoryDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public bool Status { get; set; }

    public List<ChartOfInventorySubCategoryDto> SubCategories { get; set; } = new List<ChartOfInventorySubCategoryDto>();
}