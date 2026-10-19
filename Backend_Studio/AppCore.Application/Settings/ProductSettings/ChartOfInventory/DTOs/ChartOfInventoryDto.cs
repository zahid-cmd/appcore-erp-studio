//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings.ChartOfInventory.DTOs;


//===============================================================
// Chart of Inventory : Product Row
//
// One row per Motor Bike / Spare Part / Accessory.
// ItemType is one of ChartOfInventoryItemTypes.
//===============================================================

public class ChartOfInventoryDto
{
    public long Id { get; set; }

    public long SubCategoryId { get; set; }

    public long CategoryId { get; set; }

    public string ItemType { get; set; } = ChartOfInventoryItemTypes.MotorBike;

    public string Code { get; set; } = string.Empty;

    // Bike : product name; Spare Part : "Part No - Part Name";
    // Accessory : "Part No - Name" or just the name
    public string Name { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public string InventoryLedger { get; set; } = string.Empty;

    public string WipLedger { get; set; } = string.Empty;

    public string CogsLedger { get; set; } = string.Empty;

    public bool Status { get; set; }
}