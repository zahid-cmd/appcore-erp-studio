//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Create Bike Accessory Schemes DTO
//===============================================================

public class CreateBikeAccessorySchemesDto
{
    public string SchemeName { get; set; } = string.Empty;

    // Additional / Promotional
    public string SchemeKind { get; set; } = "Additional";

    // Supplier / Company
    public string SchemeSource { get; set; } = "Supplier";

    public long BrandManagementId { get; set; }

    public DateOnly ValidFrom { get; set; }

    // Promotional : required; Additional : ignored (no end)
    public DateOnly? ValidTo { get; set; }

    public List<long> BikeModelIds { get; set; } = new();

    public List<BikeAccessorySchemeItemInputDto> Items { get; set; } = new();

    public string Remarks { get; set; } = string.Empty;

    public bool Status { get; set; } = true;
}


public class BikeAccessorySchemeItemInputDto
{
    public long AccessoryId { get; set; }

    public int QuantityPerBike { get; set; } = 1;
}
