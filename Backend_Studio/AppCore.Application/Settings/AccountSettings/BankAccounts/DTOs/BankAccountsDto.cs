// PAGE-CLONED : Cash Accounts -> Bank Accounts
// PAGE-CLONED : Wings -> Bank Accounts
//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.BankAccounts.DTOs;


//===============================================================
// BankAccount DTO
//===============================================================

public class BankAccountDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long BankAccountId
    {
        get;
        set;
    }


    //===============================================================
    // Account Sub Groups Id
    //===============================================================

    public long AccountSubGroupsId { get; set; }

    //===============================================================
    // Bank Account Code
    //===============================================================

    public string BankAccountCode { get; set; } = string.Empty;

    //===============================================================
    // Bank Account Name
    //===============================================================

    public string BankAccountName { get; set; } = string.Empty;

    //===============================================================
    // Remarks
    //===============================================================

    public string Remarks { get; set; } = string.Empty;

    //===============================================================
    // Is Active
    //===============================================================

    public bool IsActive { get; set; }

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