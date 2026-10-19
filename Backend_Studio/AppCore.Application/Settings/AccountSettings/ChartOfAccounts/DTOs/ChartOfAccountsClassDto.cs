//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.ChartOfAccounts.DTOs;


//===============================================================
// Chart of Accounts : Class Node
//
// Top level of the tree. Groups are nested inside.
// ClassType : Account / Inventory / Work In Progress /
//             Cost of Goods Sold (classes are ordered by it).
//===============================================================

public class ChartOfAccountsClassDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string ClassType { get; set; } = string.Empty;

    public bool Status { get; set; }

    public List<ChartOfAccountsGroupDto> Groups { get; set; } = new List<ChartOfAccountsGroupDto>();
}