//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Bike Models DTO
//===============================================================

public class BikeModelsDto
{
    public long BikeModelId { get; set; }

    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; }

    public string ModelCode { get; set; } = string.Empty;

    public long BrandManagementId { get; set; }

    // From Brand Management
    public string BrandCode { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public string BikeType { get; set; } = string.Empty;

    public bool ShowOnWebsite { get; set; }

    public bool IsFeatured { get; set; }

    public string Tagline { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public int DisplayOrder { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool Status { get; set; }

    //===========================================================
    // Soft Delete / Audit
    //===========================================================

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
