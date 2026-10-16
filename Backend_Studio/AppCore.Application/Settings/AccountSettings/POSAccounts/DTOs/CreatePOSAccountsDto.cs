//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.POSAccounts.DTOs;


//===============================================================
// Create POS Account DTO
//
// AccountSubGroupsId, POSAccountCode and POSAccountName are
// accepted for compatibility but are always resolved / generated
// on the server.
//
// POSAccountName :
// POS - <Issuing Bank Short> - <Terminal> - <Linked Bank Short>
//===============================================================

public class CreatePOSAccountDto
{
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