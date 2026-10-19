//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Create Accessories DTO
//
// Codes and ledger names are always built by the server.
//===============================================================

public class CreateAccessoriesDto
{
    public long ProductCategoryId { get; set; }

    public long ProductSubCategoryId { get; set; }

    // Optional ('' when none)
    public string PartNumber { get; set; } = string.Empty;

    public string AccessoryName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public int ReorderLevel { get; set; }

    public int RedLevel { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;


    // Storage Locations : one row per warehouse (optional).
    // Replaces the saved locations on every save.
    public List<AccessoryLocationInputDto> Locations { get; set; } = new();
}