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
    // Account Sub Group
    //===========================================================

    public long AccountSubGroupsId { get; set; }


    //===========================================================
    // POS Account Code
    //===========================================================

    public string POSAccountCode { get; set; } = string.Empty;


    //===========================================================
    // POS Account Name (generated)
    //===========================================================

    public string POSAccountName { get; set; } = string.Empty;


    //===========================================================
    // Issuing Bank (Bank Setup › Bank Name)
    //===========================================================

    public string IssuingBank { get; set; } = string.Empty;


    //===========================================================
    // Terminal Number
    //===========================================================

    public string TerminalNumber { get; set; } = string.Empty;


    //===========================================================
    // Linked Bank Account : the BANK ACCOUNT CODE
    //===========================================================

    public string LinkedBankAccount { get; set; } = string.Empty;


    //===========================================================
    // Display name of the linked bank account (read only)
    //===========================================================

    public string LinkedBankAccountName { get; set; } = string.Empty;


    //===========================================================
    // Branch
    //===========================================================

    public string Branch { get; set; } = string.Empty;


    //===========================================================
    // Collection Account
    //===========================================================

    public bool CollectionAccount { get; set; }


    //===========================================================
    // Payment Account
    //===========================================================

    public bool PaymentAccount { get; set; }


    //===========================================================
    // Branch Exclusive
    //===========================================================

    public bool BranchExclusive { get; set; }


    //===========================================================
    // Remarks
    //===========================================================

    public string Remarks { get; set; } = string.Empty;


    //===========================================================
    // Status
    //===========================================================

    public bool Status { get; set; }


    //===========================================================
    // Soft Delete
    //===========================================================

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }


    //===========================================================
    // Audit
    //===========================================================

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}