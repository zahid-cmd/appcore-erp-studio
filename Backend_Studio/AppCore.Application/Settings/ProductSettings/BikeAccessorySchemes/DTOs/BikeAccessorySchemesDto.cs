//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Bike Accessory Schemes DTO
//===============================================================

public class BikeAccessorySchemesDto
{
    public long BikeAccessorySchemeId { get; set; }

    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; }

    public string SchemeCode { get; set; } = string.Empty;

    public string SchemeName { get; set; } = string.Empty;

    // Additional / Promotional
    public string SchemeKind { get; set; } = string.Empty;

    // Supplier / Company
    public string SchemeSource { get; set; } = string.Empty;

    public long BrandManagementId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    public DateOnly ValidFrom { get; set; }

    public DateOnly? ValidTo { get; set; }

    // Running / Scheduled / Expired (today against the dates)
    public string Validity { get; set; } = string.Empty;

    // "A04, A10, A12S"
    public string ModelsText { get; set; } = string.Empty;

    // "Helmet x1, Key Ring x1"
    public string ItemsText { get; set; } = string.Empty;

    public int ModelCount { get; set; }

    public int ItemCount { get; set; }

    public List<BikeAccessorySchemeModelDto> Models { get; set; } = new();

    public List<BikeAccessorySchemeItemDto> Items { get; set; } = new();

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


public class BikeAccessorySchemeModelDto
{
    public long BikeModelId { get; set; }

    public string ModelCode { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;
}


public class BikeAccessorySchemeItemDto
{
    public long AccessoryId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string AccessoryName { get; set; } = string.Empty;

    // For Sale / Additional Accessories / Promotional Accessories
    public string AccessoryUse { get; set; } = string.Empty;

    public int QuantityPerBike { get; set; }
}


//===============================================================
// Paged list request
//---------------------------------------------------------------
// GET .../bike-accessory-schemes/paged?page=&pageSize=&search=&sort=&dir=
//     &status=&schemeKind=&validity=&brandManagementId=
//
// Search : code, name, brand, remarks, model names, item names.
// Sort   : SchemeCode, SchemeName, SchemeKind, SchemeSource,
//          BrandName, ValidFrom, ValidTo, Status (default
//          SchemeCode).
// Counts : Total / Active / Inactive (search and filters applied).
//===============================================================

public class BikeAccessorySchemesPageRequest
    : AppCore.Application.Common.Paging.PagedRequest
{
    public bool? Status { get; set; }

    // Additional / Promotional (empty = all)
    public string? SchemeKind { get; set; }

    // Running / Scheduled / Expired (empty = all)
    public string? Validity { get; set; }

    public long? BrandManagementId { get; set; }
}
