//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.MFSAccounts.DTOs;


//===============================================================
// MFS Account DTO
//===============================================================

public class MFSAccountDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long MFSAccountId
    {
        get;
        set;
    }


    //===========================================================
    // Account Sub Group
    //===========================================================

    public long AccountSubGroupsId
    {
        get;
        set;
    }


    //===========================================================
    // MFS Account Code
    //===========================================================

    public string MFSAccountCode
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // MFS Account Name (Provider)
    //===========================================================

    public string MFSAccountName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // MFS Account Number
    //===========================================================

    public string MFSAccountNumber
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Account Type (Personal / Merchant)
    //===========================================================

    public string AccountType
    {
        get;
        set;
    } = "Personal";


    //===========================================================
    // MFS Charges (%)
    //===========================================================

    public decimal MFSCharges
    {
        get;
        set;
    }


    //===========================================================
    // Linked Bank Account
    //===========================================================

    // Bank Accounts → BankAccountCode
    public string LinkedBankAccount
    {
        get;
        set;
    } = string.Empty;


    // Display name of the linked bank account (read only)
    public string LinkedBankAccountName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Branch
    //===========================================================

    public string Branch
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Display Name
    //===========================================================

    public string DisplayName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Configuration
    //===========================================================

    public bool CollectionAccount
    {
        get;
        set;
    }


    public bool PaymentAccount
    {
        get;
        set;
    }


    public bool BranchExclusive
    {
        get;
        set;
    }


    //===========================================================
    // Remarks
    //===========================================================

    public string Remarks
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Status
    //===========================================================

    public bool Status
    {
        get;
        set;
    }


    //===========================================================
    // Soft Delete
    //===========================================================

    public bool IsDeleted
    {
        get;
        set;
    }


    public long? DeletedBy
    {
        get;
        set;
    }


    public DateTime? DeletedDate
    {
        get;
        set;
    }


    //===========================================================
    // Audit Information
    //===========================================================

    public long CreatedBy
    {
        get;
        set;
    }


    public DateTime CreatedDate
    {
        get;
        set;
    }


    public long? ModifiedBy
    {
        get;
        set;
    }


    public DateTime? ModifiedDate
    {
        get;
        set;
    }
}