//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.POSAccounts.DTOs;


//===============================================================
// POS Account DTO
//===============================================================

public class POSAccountDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long POSAccountId { get; set; }


    //===========================================================
    // Fields
    //===========================================================

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


    //===========================================================
    // Soft Delete
    //===========================================================

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }


    //===========================================================
    // Audit Information
    //===========================================================

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}