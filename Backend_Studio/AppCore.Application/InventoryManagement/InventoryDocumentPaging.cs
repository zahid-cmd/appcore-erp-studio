//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement;


//===============================================================
// Inventory document list : one page (GET paged)
//
// Used by Opening Stock and Product Pricing.
//
//   Type : product type ('' = every type)
//   Tab  : all · draft · posted · cancelled
//
// Counts : All / <status> (type + search applied),
//          Type_<type> / Type_All (search applied).
// Sort   : the list column fields; empty = newest first.
//===============================================================

public class InventoryDocumentPageRequest
    : AppCore.Application.Common.Paging.PagedRequest
{
    public string? Type { get; set; }

    public string? Tab { get; set; }
}
