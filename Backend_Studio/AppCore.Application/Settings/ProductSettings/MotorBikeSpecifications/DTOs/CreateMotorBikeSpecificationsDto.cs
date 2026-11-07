//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Create Motor Bike Specifications DTO
//===============================================================

public class CreateMotorBikeSpecificationsDto
{
    public long BikeModelId { get; set; }

    public decimal EngineCc { get; set; }

    public int MotorPowerWatts { get; set; }

    public string FuelType { get; set; } = "Petrol";

    public int Cylinders { get; set; }

    public string VehicleClass { get; set; } = string.Empty;

    public string BodyType { get; set; } = string.Empty;

    public int SeatingCapacity { get; set; } = 2;

    public decimal UnladenWeightKg { get; set; }

    public decimal LadenWeightKg { get; set; }

    // Ignored : the maker comes from the brand (Brand Management)
    public string Maker { get; set; } = string.Empty;

    public string CountryOfOrigin { get; set; } = string.Empty;

    public string HorsePower { get; set; } = string.Empty;

    public int Rpm { get; set; }

    public int WheelBaseMm { get; set; }

    public int LengthMm { get; set; }

    public int WidthMm { get; set; }

    public int HeightMm { get; set; }

    public int TyreCount { get; set; } = 2;

    public string FrontTyreSize { get; set; } = string.Empty;

    public string RearTyreSize { get; set; } = string.Empty;

    public int AxleCount { get; set; } = 1;

    // Rows with an empty label or value are not saved
    public List<MotorBikeSpecificationItemInputDto> Items { get; set; } = new();

    public bool ShowOnWebsite { get; set; } = true;

    public string Remarks { get; set; } = string.Empty;

    public bool Status { get; set; } = true;
}


public class MotorBikeSpecificationItemInputDto
{
    public string Section { get; set; } = string.Empty;

    public string Label { get; set; } = string.Empty;

    public string Value { get; set; } = string.Empty;
}
