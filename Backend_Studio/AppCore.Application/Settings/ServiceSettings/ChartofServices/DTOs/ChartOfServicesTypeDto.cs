//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings.ChartOfServices.DTOs;


//===============================================================
// Chart of Services : Category Type Node
//
// Top level of the tree (fixed : Brand Services, Differential
// Services). Categories are nested inside.
// Code : BRS / DRS (the Category Code prefix).
//===============================================================

public class ChartOfServicesTypeDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // Brand Services / Differential Services
    public string CategoryType { get; set; } = string.Empty;

    public bool Status { get; set; }

    public List<ChartOfServicesCategoryDto> Categories { get; set; } = new List<ChartOfServicesCategoryDto>();
}