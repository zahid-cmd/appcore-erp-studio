//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings.ChartOfInventory.DTOs;


//===============================================================
// Chart of Inventory : Link Issue
//
// One broken or inconsistent link found by the link check.
// Level   : Category / Sub Category / Product (Spare Part) …
// Problem : plain-language description shown on the page.
//===============================================================

public class ChartOfInventoryIssueDto
{
    public string Level { get; set; } = string.Empty;

    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Problem { get; set; } = string.Empty;
}