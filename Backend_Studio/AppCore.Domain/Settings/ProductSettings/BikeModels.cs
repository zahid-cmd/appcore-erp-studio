//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.ProductSettings;


//===============================================================
// Bike Models (Product Settings › Bike Models)
//
// A motor bike model of a brand (e.g. REVOO "C32") with its type
// and what the website shows. The Product Sub Category of a Motor
// Bikes category will pick its model from here (later).
//===============================================================

public class BikeModels
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long BikeModelId { get; set; }


    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; } = Guid.CreateVersion7();


    //===========================================================
    // Model Code : BMD-0001 (auto)
    //===========================================================

    public string ModelCode { get; set; } = string.Empty;


    //===========================================================
    // Brand (Brand Management; no database foreign key)
    //===========================================================

    public long BrandManagementId { get; set; }


    //===========================================================
    // Model Name : typed, unique within the brand
    //===========================================================

    public string ModelName { get; set; } = string.Empty;


    //===========================================================
    // Bike Type : Scooter / Commuter / Sports / Cruiser /
    // Electric / Off-road
    //===========================================================

    public string BikeType { get; set; } = string.Empty;


    //===========================================================
    // Website
    //===========================================================

    public bool ShowOnWebsite { get; set; }

    public bool IsFeatured { get; set; }

    // One line on the bike card
    public string Tagline { get; set; } = string.Empty;

    // A paragraph on the bike's page
    public string Description { get; set; } = string.Empty;

    public int DisplayOrder { get; set; }


    //===========================================================
    // Remarks / Status
    //===========================================================

    public string Remarks { get; set; } = string.Empty;

    public bool Status { get; set; }


    //===========================================================
    // Soft Delete
    //===========================================================

    public bool IsDeleted { get; set; } = false;

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }


    //===========================================================
    // Audit Information
    //===========================================================

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
