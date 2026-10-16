//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.AccountSettings;


//===============================================================
// POS Accounts
//
// POSAccountName is system generated (UPPERCASE):
// POS - <Issuing Bank Short Name> - <Terminal Number>
//     - <Short Bank Name of Linked Bank Account>
//===============================================================

public class POSAccounts
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long POSAccountId { get; set; }


    //===========================================================
    // Account Sub Groups Id
    //===========================================================

    public long AccountSubGroupsId { get; set; }


    //===========================================================
    // POS Account Code
    //===========================================================

    public string POSAccountCode { get; set; } = string.Empty;


    //===========================================================
    // POS Account Name (auto generated)
    //===========================================================

    public string POSAccountName { get; set; } = string.Empty;


    //===========================================================
    // Issuing Bank (Bank Setup → Bank Name)
    //===========================================================

    public string IssuingBank { get; set; } = string.Empty;


    //===========================================================
    // Terminal Number
    //===========================================================

    public string TerminalNumber { get; set; } = string.Empty;


    //===========================================================
    // Linked Bank Account (Bank Accounts → Display Name)
    //===========================================================

    public string LinkedBankAccount { get; set; } = string.Empty;


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

    public bool IsDeleted { get; set; } = false;

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