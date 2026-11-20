//===============================================================
// Brand Pack (2026-11-20, design-client-brands-modules-users)
//
// One brand's catalogue as a file : AppCore exports it from
// AppCoreERP_Studio and installs it in a client's database. The
// file holds names and texts only : no ids, no account codes.
// Install creates everything through the ERP's own create logic,
// so every ledger / account group is made in the client's own
// chart. Installing again = update (new models / colours added,
// brand texts refreshed, the dealer's stock levels and prices
// kept).
//
// Zip : pack.json + images/<file> (brand picture, bike pictures).
//===============================================================

namespace AppCore.Application.Platform.BrandPacks;

public class BrandPack
{
    public string Format { get; set; } = "appcore-brand-pack";
    public int Version { get; set; } = 1;
    public DateTime ExportedAt { get; set; }
    public string ExportedFrom { get; set; } = string.Empty;

    public BrandPackBrand Brand { get; set; } = new();

    // Category types of the brand (Motor Bikes, Spare Parts ...)
    public List<string> CategoryTypes { get; set; } = new();

    public List<BrandPackColour> Colours { get; set; } = new();
    public List<BrandPackModel> Models { get; set; } = new();
    public List<BrandPackWarrantyPart> WarrantyParts { get; set; } = new();
    public List<BrandPackWarrantyPolicy> WarrantyPolicies { get; set; } = new();
    public List<BrandPackPdiTemplate> PdiTemplates { get; set; } = new();
}

public class BrandPackBrand
{
    public string Name { get; set; } = string.Empty;
    public string MakerName { get; set; } = string.Empty;
    public string Remarks { get; set; } = string.Empty;
    // images/<file> inside the zip ('' = none)
    public string Image { get; set; } = string.Empty;
}

public class BrandPackColour
{
    public string Name { get; set; } = string.Empty;
    public string Remarks { get; set; } = string.Empty;
}

public class BrandPackModel
{
    public string Name { get; set; } = string.Empty;
    public string BikeType { get; set; } = string.Empty;
    public string Tagline { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool ShowOnWebsite { get; set; }
    public bool IsFeatured { get; set; }
    public int DisplayOrder { get; set; }
    public string Remarks { get; set; } = string.Empty;
    public bool Active { get; set; } = true;

    // one motor bike per colour
    public List<BrandPackBike> Bikes { get; set; } = new();

    public BrandPackSpecification? Specification { get; set; }
}

public class BrandPackBike
{
    public string Colour { get; set; } = string.Empty;
    public string Image { get; set; } = string.Empty;
    public bool Active { get; set; } = true;
}

public class BrandPackSpecification
{
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
    public string Mileage { get; set; } = string.Empty;
    public int TopSpeedKmh { get; set; }
    public string TopSpeed { get; set; } = string.Empty;
    public int WheelBaseMm { get; set; }
    public int LengthMm { get; set; }
    public int WidthMm { get; set; }
    public int HeightMm { get; set; }
    public int TyreCount { get; set; }
    public string FrontTyreSize { get; set; } = string.Empty;
    public string RearTyreSize { get; set; } = string.Empty;
    public int AxleCount { get; set; }
    public bool ShowOnWebsite { get; set; }
    public string Remarks { get; set; } = string.Empty;
    public List<BrandPackSpecificationItem> Items { get; set; } = new();
}

public class BrandPackSpecificationItem
{
    public string Section { get; set; } = string.Empty;
    public int LineNo { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}

public class BrandPackWarrantyPart
{
    public string Name { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public string Remarks { get; set; } = string.Empty;
}

public class BrandPackWarrantyPolicy
{
    public string Name { get; set; } = string.Empty;
    // '' = every model of the brand
    public string Model { get; set; } = string.Empty;
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public int PeriodValue { get; set; }
    public string PeriodUnit { get; set; } = string.Empty;
    public int? KmLimit { get; set; }
    public string Terms { get; set; } = string.Empty;
    public string Exclusions { get; set; } = string.Empty;
    public string Remarks { get; set; } = string.Empty;
    public bool Active { get; set; } = true;
    public List<BrandPackWarrantyCoverage> Coverages { get; set; } = new();
}

public class BrandPackWarrantyCoverage
{
    public string Part { get; set; } = string.Empty;
    public int PeriodValue { get; set; }
    public string PeriodUnit { get; set; } = string.Empty;
    public int? KmLimit { get; set; }
    public string Notes { get; set; } = string.Empty;
    public bool Active { get; set; } = true;
}

public class BrandPackPdiTemplate
{
    public string Name { get; set; } = string.Empty;
    public string NameBn { get; set; } = string.Empty;
    public string SheetTitle { get; set; } = string.Empty;
    public string SheetTitleBn { get; set; } = string.Empty;
    public string FooterNote { get; set; } = string.Empty;
    public string FooterNoteBn { get; set; } = string.Empty;
    public string ServiceProviderName { get; set; } = string.Empty;
    public string Remarks { get; set; } = string.Empty;
    public bool Active { get; set; } = true;
    public List<string> Models { get; set; } = new();
    public List<BrandPackPdiSection> Sections { get; set; } = new();
}

public class BrandPackPdiSection
{
    public int SortOrder { get; set; }
    public string Title { get; set; } = string.Empty;
    public string TitleBn { get; set; } = string.Empty;
    public bool HasComments { get; set; }
    public List<BrandPackPdiItem> Items { get; set; } = new();
}

public class BrandPackPdiItem
{
    public int SortOrder { get; set; }
    public string Text { get; set; } = string.Empty;
    public string TextBn { get; set; } = string.Empty;
    public string ItemType { get; set; } = "Check";
    public string Unit { get; set; } = string.Empty;
    public bool IsRequired { get; set; } = true;
}

// What an install did, line by line
public class BrandPackReport
{
    public bool Success { get; set; }
    public string Brand { get; set; } = string.Empty;
    public int Created { get; set; }
    public int Updated { get; set; }
    public int Kept { get; set; }
    public List<string> Lines { get; set; } = new();
    public string? Error { get; set; }
}
