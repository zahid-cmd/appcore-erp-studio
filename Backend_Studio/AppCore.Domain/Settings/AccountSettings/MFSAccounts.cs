//===============================================================
// Namespaces
//===============================================================

using System.ComponentModel.DataAnnotations.Schema;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.AccountSettings;


//===============================================================
// MFS Accounts
//===============================================================

public class MFSAccounts
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
    // (Reserved : SUB-002-002-003 - Cash With MFS)
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
    // MFS Account Name (Provider : BKASH, NAGAD, ROCKET ...)
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
    //
    // Merchant : required, greater than 0 and up to 100
    // Personal : always 0
    //===========================================================

    [Column(TypeName = "numeric(5,2)")]
    public decimal MFSCharges
    {
        get;
        set;
    } = 0m;


    //===========================================================
    // Linked Bank Account (Bank Account Display Name)
    //
    // Merchant : required
    // Personal : always empty
    //===========================================================

    public string LinkedBankAccount
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
    // Display Name (MFS Account Name - MFS Account Number)
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
    } = false;


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