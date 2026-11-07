//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Motor Bike Specifications DTO
//===============================================================

public class MotorBikeSpecificationsDto
{
    public long MotorBikeSpecificationId { get; set; }

    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; }

    public string SpecificationCode { get; set; } = string.Empty;

    public long BikeModelId { get; set; }

    public string ModelCode { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public long BrandManagementId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    //-----------------------------------------------------------
    // Registration Data (BRTA)
    //-----------------------------------------------------------

    public decimal EngineCc { get; set; }

    public int MotorPowerWatts { get; set; }

    public string FuelType { get; set; } = string.Empty;

    public int Cylinders { get; set; }

    public string VehicleClass { get; set; } = string.Empty;

    public string BodyType { get; set; } = string.Empty;

    public int SeatingCapacity { get; set; }

    public decimal UnladenWeightKg { get; set; }

    public decimal LadenWeightKg { get; set; }

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

    //-----------------------------------------------------------
    // Technical rows
    //-----------------------------------------------------------

    public int ItemCount { get; set; }

    public List<MotorBikeSpecificationItemDto> Items { get; set; } = new();

    public bool ShowOnWebsite { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool Status { get; set; }

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


public class MotorBikeSpecificationItemDto
{
    public string Section { get; set; } = string.Empty;

    public int LineNo { get; set; }

    public string Label { get; set; } = string.Empty;

    public string Value { get; set; } = string.Empty;
}


//===============================================================
// Paged list request
//---------------------------------------------------------------
// GET .../motor-bike-specifications/paged?page=&pageSize=&search=
//     &sort=&dir=&status=&showOnWebsite=&brandManagementId=
//
// Search : code, model, brand, vehicle class, body type, fuel,
//          maker, country, remarks, row labels / values.
// Sort   : SpecificationCode, ModelName, BrandName, EngineCc,
//          VehicleClass, FuelType, ItemCount, ShowOnWebsite,
//          Status (default SpecificationCode).
// Counts : Total / Active / Inactive / OnWebsite (search and
//          filters applied) + WithoutSpecification (active bike
//          models with no live specification; brand filter only).
//===============================================================

public class MotorBikeSpecificationsPageRequest
    : AppCore.Application.Common.Paging.PagedRequest
{
    public bool? Status { get; set; }

    // true = Website tab, false = Hidden tab, null = all
    public bool? ShowOnWebsite { get; set; }

    public long? BrandManagementId { get; set; }
}
