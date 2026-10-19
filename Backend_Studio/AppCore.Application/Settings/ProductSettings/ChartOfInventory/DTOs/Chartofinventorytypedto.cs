//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings.ChartOfInventory.DTOs;


//===============================================================
// Chart of Inventory : Category Type Node
//
// Top level of the tree (fixed : Motor Bikes, Spare Parts,
// Accessories). Categories are nested inside.
// Code : MB / SP / AC (the Category Code prefix).
//===============================================================

public class ChartOfInventoryTypeDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // Motor Bikes / Spare Parts / Accessories
    public string CategoryType { get; set; } = string.Empty;

    public bool Status { get; set; }

    public List<ChartOfInventoryCategoryDto> Categories { get; set; } = new List<ChartOfInventoryCategoryDto>();
}