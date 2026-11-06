//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Service Settings : one list page (GET paged)
//
// Shared by the Service Settings lists; each list reads only
// the filters it shows.
//
//   Status        : active · inactive (blank = all)
//   Tab           : Service Categories : category type
//                   Service Sub Categories : sub category type
//                   Scheduled Services : readiness
//   BrandId       : Labor Chart / Scheduled Services
//   SubCategoryId : Customized Services
//   Section       : Labor Chart
//   CardId        : Membership Services
//   Readiness     : Membership Services
//
// The answer's Counts hold Total · Active · Inactive with the
// search and the other filters applied (not the status filter).
//===============================================================

public class ServiceSettingsPageRequest
    : PagedRequest
{
    public string? Status { get; set; }

    public string? Tab { get; set; }

    public long? BrandId { get; set; }

    public long? SubCategoryId { get; set; }

    public string? Section { get; set; }

    public long? CardId { get; set; }

    public string? Readiness { get; set; }
}
