//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Bike Accessory Schemes Defaults : next code and the lists the
// form and the list filters need
//===============================================================

public class BikeAccessorySchemesDefaultsDto
{
    public string Code { get; set; } = string.Empty;

    public List<string> Kinds { get; set; } = new();

    public List<string> Sources { get; set; } = new();

    public List<BikeAccessorySchemeBrandOptionDto> Brands { get; set; } = new();

    public List<BikeAccessorySchemeModelOptionDto> Models { get; set; } = new();

    public List<BikeAccessorySchemeAccessoryOptionDto> Accessories { get; set; } = new();
}


public class BikeAccessorySchemeBrandOptionDto
{
    public long BrandManagementId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    public bool Status { get; set; }
}


public class BikeAccessorySchemeModelOptionDto
{
    public long BikeModelId { get; set; }

    public long BrandManagementId { get; set; }

    public string ModelCode { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public bool Status { get; set; }
}


public class BikeAccessorySchemeAccessoryOptionDto
{
    public long AccessoryId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string AccessoryName { get; set; } = string.Empty;

    // For Sale / Additional Accessories / Promotional Accessories
    public string AccessoryUse { get; set; } = string.Empty;

    public string SubCategoryName { get; set; } = string.Empty;

    public bool IsActive { get; set; }
}
