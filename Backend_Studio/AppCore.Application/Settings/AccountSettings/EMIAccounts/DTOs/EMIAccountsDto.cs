//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings;


//===============================================================
// EMI Accounts DTO (list / view)
//===============================================================

public class EmiAccountsDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long EmiAccountId { get; set; }


    //===========================================================
    // Account Sub Group
    //===========================================================

    public long AccountSubGroupsId { get; set; }

    public string SubGroupCode { get; set; } = string.Empty;

    public string SubGroupName { get; set; } = string.Empty;


    //===========================================================
    // EMI Account
    //===========================================================

    public string EmiAccountCode { get; set; } = string.Empty;

    public string EmiAccountName { get; set; } = string.Empty;


    //===========================================================
    // Platform / Settlement / Branch
    //===========================================================

    public string Platform { get; set; } = string.Empty;

    public string LinkedBankAccount { get; set; } = string.Empty;

    public string Branch { get; set; } = string.Empty;


    //===========================================================
    // Configuration
    //===========================================================

    public bool CollectionAccount { get; set; }

    public bool PaymentAccount { get; set; }

    public bool BranchExclusive { get; set; }


    //===========================================================
    // Remarks / Status
    //===========================================================

    public string Remarks { get; set; } = string.Empty;

    public bool Status { get; set; }


    //===========================================================
    // Audit
    //===========================================================

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}