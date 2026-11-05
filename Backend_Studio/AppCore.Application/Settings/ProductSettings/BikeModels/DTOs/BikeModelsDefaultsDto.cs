//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Bike Models Defaults : next code, brands and bike types
//===============================================================

public class BikeModelsDefaultsDto
{
    // Preview only (the real code is given on save)
    public string Code { get; set; } = string.Empty;

    // Active brands (the record's own inactive brand is added by
    // the form when editing)
    public List<BikeModelBrandOptionDto> Brands { get; set; } = new();

    public List<string> BikeTypes { get; set; } = new();

    // Bike Type of the most recently saved model : the form
    // pre-selects it for a new model (still editable)
    public string LastBikeType { get; set; } = string.Empty;
}


public class BikeModelBrandOptionDto
{
    public long BrandManagementId { get; set; }

    public string BrandCode { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public bool Status { get; set; }
}
