//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.PostingSetup.DTOs;


//===============================================================
// Posting Setup : the page in one call
//===============================================================

public class PostingSetupWorkspaceDto
{
    // Update activity on the Posting Setup page
    public bool CanChange { get; set; }

    public List<PostingSetupRowDto> Rows { get; set; } = new();

    // Every active General Ledger (GLR-) a purpose may use; the
    // page narrows it per row by AllowedSubGroupCodes
    public List<PostingSetupLedgerOptionDto> Ledgers { get; set; } = new();

    // Posting switches (read-only here; changed on System
    // Configurations)
    public List<PostingSwitchDto> Switches { get; set; } = new();
}


//===============================================================
// A posting switch, shown read-only
//===============================================================

public class PostingSwitchDto
{
    public string ConfigurationCode { get; set; } = string.Empty;

    public string Page { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // false = the switch does not exist (yet)
    public bool Found { get; set; }

    public bool IsEnabled { get; set; }

    public string Value { get; set; } = string.Empty;
}


//===============================================================
// One purpose
//===============================================================

public class PostingSetupRowDto
{
    public string PurposeCode { get; set; } = string.Empty;

    public string PurposeName { get; set; } = string.Empty;

    public string GroupName { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string UsedBy { get; set; } = string.Empty;

    public List<string> AllowedSubGroupCodes { get; set; } = new();

    public bool IsRequired { get; set; }

    public int DisplayOrder { get; set; }

    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public string SubGroupCode { get; set; } = string.Empty;

    public string SubGroupName { get; set; } = string.Empty;

    // Sum of posted debit - credit (all branches)
    public decimal Balance { get; set; }

    // Ready / NotSet / NotFound / Inactive / OutsideGroup
    public string Status { get; set; } = string.Empty;

    public string StatusText { get; set; } = string.Empty;

    public DateTime? ModifiedDate { get; set; }
}


//===============================================================
// Ledger choice
//===============================================================

public class PostingSetupLedgerOptionDto
{
    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public string SubGroupCode { get; set; } = string.Empty;

    public string SubGroupName { get; set; } = string.Empty;
}


//===============================================================
// Change one purpose's ledger
//===============================================================

public class UpdatePostingSetupDto
{
    public string LedgerCode { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;
}


//===============================================================
// History row
//===============================================================

public class PostingSetupHistoryDto
{
    public string PurposeCode { get; set; } = string.Empty;

    public string PurposeName { get; set; } = string.Empty;

    public string OldLedgerCode { get; set; } = string.Empty;

    public string OldLedgerName { get; set; } = string.Empty;

    public string NewLedgerCode { get; set; } = string.Empty;

    public string NewLedgerName { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;

    public string ChangedByName { get; set; } = string.Empty;

    public DateTime ChangedDate { get; set; }
}
