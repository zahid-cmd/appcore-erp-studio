//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.ProductSettings;


//===============================================================
// Bike Accessory Schemes (Settings › Product Settings)
//
// Which free accessories go with which bike models :
//   Kind   : Additional (all year, no end date) /
//            Promotional (Valid From – To)
//   Source : Supplier (the bike company's items, zero cost) /
//            Company (own sellable accessories, at cost)
//   Models : one or more bike models of the brand
//   Items  : accessories with a quantity per bike
//
// Tables : BikeAccessorySchemes, BikeAccessorySchemeModels,
//          BikeAccessorySchemeItems (BikeAccessorySchemes_Tables.sql)
//===============================================================

public class BikeAccessorySchemes
{
    public long BikeAccessorySchemeId { get; set; }

    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    // BAS-0001 (given on save, never reused)
    public string SchemeCode { get; set; } = string.Empty;

    public string SchemeName { get; set; } = string.Empty;

    // Additional / Promotional
    public string SchemeKind { get; set; } = "Additional";

    // Supplier / Company
    public string SchemeSource { get; set; } = "Supplier";

    public long BrandManagementId { get; set; }

    public DateOnly ValidFrom { get; set; }

    // Promotional only (Additional : null = no end)
    public DateOnly? ValidTo { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool Status { get; set; } = true;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


//===============================================================
// A bike model of a scheme
//===============================================================

public class BikeAccessorySchemeModels
{
    public long BikeAccessorySchemeModelId { get; set; }

    public long BikeAccessorySchemeId { get; set; }

    public long BikeModelId { get; set; }
}


//===============================================================
// An accessory of a scheme, with its quantity per bike
//===============================================================

public class BikeAccessorySchemeItems
{
    public long BikeAccessorySchemeItemId { get; set; }

    public long BikeAccessorySchemeId { get; set; }

    public int LineNo { get; set; }

    public long AccessoryId { get; set; }

    public int QuantityPerBike { get; set; } = 1;
}
