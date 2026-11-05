//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Create Bike Models DTO (Model Code is given by the server)
//===============================================================

public class CreateBikeModelsDto
{
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
