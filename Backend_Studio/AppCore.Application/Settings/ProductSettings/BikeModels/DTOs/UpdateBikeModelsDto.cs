//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Update Bike Models DTO (the row comes from the link's Public
// Id; Model Code never changes)
//===============================================================

public class UpdateBikeModelsDto
{
    public long BikeModelId { get; set; }

    public long BrandManagementId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public string BikeType { get; set; } = string.Empty;

    public bool ShowOnWebsite { get; set; }

    public bool IsFeatured { get; set; }

    public string Tagline { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public int DisplayOrder { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool Status { get; set; }
}
