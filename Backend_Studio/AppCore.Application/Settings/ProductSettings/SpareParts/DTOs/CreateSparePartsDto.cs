//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Create Spare Parts DTO
//
// Codes and ledger names are always built by the server.
//===============================================================

public class CreateSparePartsDto
{
    public long ProductCategoryId { get; set; }

    public long ProductSubCategoryId { get; set; }

    public string PartNumber { get; set; } = string.Empty;

    public string PartName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public int ReorderLevel { get; set; }

    public int RedLevel { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;


    // Storage Locations : one row per warehouse (optional).
    // Replaces the saved locations on every save.
    public List<SparePartLocationInputDto> Locations { get; set; } = new();
}