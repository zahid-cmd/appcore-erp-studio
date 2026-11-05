//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Bike Models : paged list request
//---------------------------------------------------------------
// GET api/settings/product-settings/bike-models/paged?page=1&pageSize=10&search=&sort=&dir=asc
//
// Search : code, model name, brand, type, tagline, remarks.
// Sort   : ModelCode, BrandName, ModelName, BikeType,
//          ShowOnWebsite, IsFeatured, DisplayOrder, Status
//          (default ModelCode).
// Counts : "Total", "Active", "Inactive" (the summary line; search
//          applied, not the status).
//===============================================================

public class BikeModelsPageRequest
    : PagedRequest
{
    // true = Active, false = Inactive, empty = all
    public bool? Status { get; set; }

    // Filters (empty = all)
    public long? BrandManagementId { get; set; }

    public string? BikeType { get; set; }
}
