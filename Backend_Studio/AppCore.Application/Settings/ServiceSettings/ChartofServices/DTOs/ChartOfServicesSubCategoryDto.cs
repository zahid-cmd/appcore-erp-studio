//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings.ChartOfServices.DTOs;


//===============================================================
// Chart of Services : Service Sub Category Node
//
// SubCategoryType : Labor Chart / Scheduled Services /
//                   Customized Services / Membership Services
// ServiceCount       : all services under the sub category
// ActiveServiceCount : active services only
//===============================================================

public class ChartOfServicesSubCategoryDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string SubCategoryType { get; set; } = string.Empty;

    public bool Status { get; set; }

    public int ServiceCount { get; set; }

    public int ActiveServiceCount { get; set; }
}