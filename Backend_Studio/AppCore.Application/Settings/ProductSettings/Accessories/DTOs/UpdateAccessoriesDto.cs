//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Update Accessories DTO
//
// Category and Sub Category are locked after saving; they are
// sent back only to be checked against the saved values.
//===============================================================

public class UpdateAccessoriesDto
{
    public long AccessoryId { get; set; }

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