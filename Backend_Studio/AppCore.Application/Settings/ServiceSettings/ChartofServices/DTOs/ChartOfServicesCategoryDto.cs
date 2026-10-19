//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings.ChartOfServices.DTOs;


//===============================================================
// Chart of Services : Service Category Node
//===============================================================

public class ChartOfServicesCategoryDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public bool Status { get; set; }

    public List<ChartOfServicesSubCategoryDto> SubCategories { get; set; } = new List<ChartOfServicesSubCategoryDto>();
}