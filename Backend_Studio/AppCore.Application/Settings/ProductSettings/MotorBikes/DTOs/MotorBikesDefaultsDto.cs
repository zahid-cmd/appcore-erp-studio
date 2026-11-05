//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Motor Bikes Defaults DTO
//
// Preview of the four codes for a sub category ('' when no sub
// category is chosen yet). Final numbers are assigned on save.
//===============================================================

public class MotorBikesDefaultsDto
{
    public string Code { get; set; } = string.Empty;

    public string InventoryLedgerCode { get; set; } = string.Empty;

    public string WipLedgerCode { get; set; } = string.Empty;

    public string CogsLedgerCode { get; set; } = string.Empty;

    // Sales ledger (CLS-005 / 006 / 008)
    public string SalesLedgerCode { get; set; } = string.Empty;

    // Category / sub category of the last saved motor bike (only
    // when no sub category is asked for) : the form preselects them
    public long LastProductCategoryId { get; set; }

    public long LastProductSubCategoryId { get; set; }

    // Stock levels of the last saved motor bike (the form starts
    // a new one with them; still editable)
    public int LastReorderLevel { get; set; }

    public int LastRedLevel { get; set; }

    public int LastMaxStockLevel { get; set; }
}