//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Motor Bike Specifications Defaults : next code and the lists
// the form and the list filter need
//===============================================================

public class MotorBikeSpecificationsDefaultsDto
{
    public string Code { get; set; } = string.Empty;

    public List<string> FuelTypes { get; set; } = new();

    public List<string> VehicleClasses { get; set; } = new();

    // Fixed sections, in display order
    public List<string> Sections { get; set; } = new();

    // Suggested labels for a new specification
    public List<MotorBikeSpecificationItemDto> SuggestedItems { get; set; } = new();

    public List<MotorBikeSpecificationBrandOptionDto> Brands { get; set; } = new();

    public List<MotorBikeSpecificationModelOptionDto> Models { get; set; } = new();
}


public class MotorBikeSpecificationBrandOptionDto
{
    public long BrandManagementId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    public bool Status { get; set; }
}


public class MotorBikeSpecificationModelOptionDto
{
    public long BikeModelId { get; set; }

    public long BrandManagementId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    // The brand's Maker's Name (BRTA Form-17 item 20)
    public string MakerName { get; set; } = string.Empty;

    public string ModelCode { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public bool Status { get; set; }

    // The model's live specification (null = none yet) : the form
    // offers models without one, and "Copy from" those with one
    public Guid? SpecificationPublicId { get; set; }

    public string SpecificationCode { get; set; } = string.Empty;
}
