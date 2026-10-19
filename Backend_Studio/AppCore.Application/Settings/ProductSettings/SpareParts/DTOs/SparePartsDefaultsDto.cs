//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Spare Parts Defaults DTO
//
// Preview of the four codes for a sub category ('' when no sub
// category is chosen yet). Final numbers are assigned on save.
//===============================================================

public class SparePartsDefaultsDto
{
    public string Code { get; set; } = string.Empty;

    public string InventoryLedgerCode { get; set; } = string.Empty;

    public string WipLedgerCode { get; set; } = string.Empty;

    public string CogsLedgerCode { get; set; } = string.Empty;
}