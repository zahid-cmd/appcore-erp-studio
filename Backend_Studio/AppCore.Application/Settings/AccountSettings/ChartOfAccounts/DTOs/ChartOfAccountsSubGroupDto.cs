//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.ChartOfAccounts.DTOs;


//===============================================================
// Chart of Accounts : Sub Group Node
//
// LedgerCount       : all ledgers under the sub group
// ActiveLedgerCount : active ledgers only
//
// Ledgers = General Ledgers + Cash / Bank / MFS / POS accounts.
//===============================================================

public class ChartOfAccountsSubGroupDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public bool Status { get; set; }

    public int LedgerCount { get; set; }

    public int ActiveLedgerCount { get; set; }
}