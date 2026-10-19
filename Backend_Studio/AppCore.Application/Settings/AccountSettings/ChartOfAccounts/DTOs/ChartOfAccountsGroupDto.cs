//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.ChartOfAccounts.DTOs;


//===============================================================
// Chart of Accounts : Group Node
//===============================================================

public class ChartOfAccountsGroupDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public bool Status { get; set; }

    public List<ChartOfAccountsSubGroupDto> SubGroups { get; set; } = new List<ChartOfAccountsSubGroupDto>();
}