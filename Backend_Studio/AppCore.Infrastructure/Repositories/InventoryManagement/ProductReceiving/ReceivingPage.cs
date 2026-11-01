//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InventoryManagement.ProductReceiving;


//===============================================================
// One Product Receiving page : what makes MB / SP / AC
// different. Switches are always read BY CODE; a null code = the
// switch is not on this page (its fallback is used).
//===============================================================

public sealed class ReceivingPage
{
    // MB / SP / AC
    public string PageType { get; init; } = string.Empty;

    // Number prefix (RCMB / RCSP / RCAC)
    public string Prefix { get; init; } = string.Empty;

    // "Motor Bike Receiving"
    public string Title { get; init; } = string.Empty;

    // Receiving header table (row lock FOR UPDATE)
    public string TableName { get; init; } = string.Empty;

    // Purchase header table of the same type
    public string PurchaseTableName { get; init; } = string.Empty;

    // Whole units only (MB)
    public bool WholeUnits { get; init; }

    // Rack · Shelf placement (SP : SparePartLocations, AC :
    // AccessoryLocations); MB : none
    public bool HasShelves { get; init; }

    //===========================================================
    // Switch codes
    //===========================================================

    // Back Dated Receiving (Value = days) : CFG-MOD-012-nnnn
    public string? SwitchBackDated { get; init; }

    // Shelf Required at Receiving (SP / AC)
    public string? SwitchShelfRequired { get; init; }

    // MB : the Purchases - MB switches (CFG-MOD-007-…)
    public string? SwitchUnitsRequired { get; init; }

    public string? SwitchUniqueKeyNo { get; init; }

    public string? SwitchUniqueBatteryNo { get; init; }
}
