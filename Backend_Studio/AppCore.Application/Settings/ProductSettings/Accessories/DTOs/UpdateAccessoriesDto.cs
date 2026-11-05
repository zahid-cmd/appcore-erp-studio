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

    // Highest stock wanted (0 = not set) : a purchase order
    // cannot take the company stock above it
    public int MaxStockLevel { get; set; }


    // Movement Class : SuperFast / Fast / Regular / Periodic /
    // Slow ('' or unknown = Slow)
    public string MovementClass { get; set; } = "Slow";

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;


    // Storage Locations : one row per warehouse (optional).
    // Replaces the saved locations on every save.
    public List<AccessoryLocationInputDto> Locations { get; set; } = new();


    // Fits Models : other sub categories (models) of the same
    // category this item also fits. null = leave the saved links
    // as they are; a list replaces them.
    public List<long>? FitSubCategoryIds { get; set; }
}