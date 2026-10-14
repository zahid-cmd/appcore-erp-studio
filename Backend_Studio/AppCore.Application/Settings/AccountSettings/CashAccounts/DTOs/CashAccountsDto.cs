// PAGE-CLONED : Wings -> Cash Accounts
//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.CashAccounts.DTOs;


//===============================================================
// CashAccount DTO
//===============================================================

public class CashAccountDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long CashAccountId
    {
        get;
        set;
    }


    //===============================================================
    // Account Sub Groups Id
    //===============================================================

    public long AccountSubGroupsId { get; set; }

    //===============================================================
    // Cash Account Code
    //===============================================================

    public string CashAccountCode { get; set; } = string.Empty;

    //===============================================================
    // Cash Account Name
    //===============================================================

    public string CashAccountName { get; set; } = string.Empty;

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