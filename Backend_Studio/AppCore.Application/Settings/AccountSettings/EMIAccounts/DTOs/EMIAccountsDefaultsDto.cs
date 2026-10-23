//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings;


//===============================================================
// EMI Accounts Defaults DTO (Add form)
//
// Message is set (and Code left empty) when the reserved sub
// group SUB-002-002-005 is missing / deleted.
//===============================================================

public class EmiAccountsDefaultsDto
{
    public long AccountSubGroupsId { get; set; }

    public string SubGroupCode { get; set; } = string.Empty;

    public string SubGroupName { get; set; } = string.Empty;

    // Next code, e.g. EMI-002-002-005-00001 (preview only)
    public string Code { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;
}