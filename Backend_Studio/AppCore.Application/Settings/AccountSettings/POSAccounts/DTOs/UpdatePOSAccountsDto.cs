//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.POSAccounts.DTOs;


//===============================================================
// Update POS Account DTO
//
// Account Sub Group and Code are locked after creation.
// POSAccountName is always regenerated on the server.
//===============================================================

public class UpdatePOSAccountDto
{
    public long POSAccountId { get; set; }

    public long AccountSubGroupsId { get; set; }

    public string POSAccountCode { get; set; } = string.Empty;

    public string POSAccountName { get; set; } = string.Empty;

    public string IssuingBank { get; set; } = string.Empty;

    public string TerminalNumber { get; set; } = string.Empty;

    public string LinkedBankAccount { get; set; } = string.Empty;

    public string Branch { get; set; } = string.Empty;

    public bool CollectionAccount { get; set; }

    public bool PaymentAccount { get; set; }

    public bool BranchExclusive { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool Status { get; set; }
}