//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings.ChartOfServices.DTOs;


//===============================================================
// Chart of Services : Link Issue
//
// One broken or inconsistent link found by the link check.
// Level   : Category / Sub Category / Service (Labor Chart) …
// Problem : plain-language description shown on the page.
//===============================================================

public class ChartOfServicesIssueDto
{
    public string Level { get; set; } = string.Empty;

    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Problem { get; set; } = string.Empty;
}