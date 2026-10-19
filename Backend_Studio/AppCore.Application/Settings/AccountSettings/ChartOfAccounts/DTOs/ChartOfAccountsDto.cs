//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.ChartOfAccounts.DTOs;


//===============================================================
// Chart of Accounts : Ledger Row
//
// One row per General Ledger / Cash / Bank / MFS / POS account.
// Type is one of ChartOfAccountsLedgerTypes.
//===============================================================

public class ChartOfAccountsDto
{
    public long Id { get; set; }

    public long SubGroupId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Type { get; set; } = ChartOfAccountsLedgerTypes.GeneralLedger;

    public string Branch { get; set; } = string.Empty;

    public bool Status { get; set; }
}