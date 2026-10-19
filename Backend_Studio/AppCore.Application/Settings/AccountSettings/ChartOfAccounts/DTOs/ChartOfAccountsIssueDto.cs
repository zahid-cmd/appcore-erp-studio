//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.ChartOfAccounts.DTOs;


//===============================================================
// Chart of Accounts : Link Issue
//
// One broken or inconsistent link found by the link check.
// Level   : Group / Sub Group / Ledger (Cash) …
// Problem : plain-language description shown on the page.
//===============================================================

public class ChartOfAccountsIssueDto
{
    public string Level { get; set; } = string.Empty;

    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Problem { get; set; } = string.Empty;
}