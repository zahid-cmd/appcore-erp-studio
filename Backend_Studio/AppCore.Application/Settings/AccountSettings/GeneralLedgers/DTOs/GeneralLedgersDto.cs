//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.GeneralLedgers.DTOs;


//===============================================================
// General Ledgers DTO
//===============================================================

public class GeneralLedgersDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long GeneralLedgerId
    {
        get;
        set;
    }


    //===========================================================
    // Account Class
    //===========================================================

    public long AccountClassId
    {
        get;
        set;
    }


    public string AccountClassName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Account Group
    //===========================================================

    public long AccountGroupId
    {
        get;
        set;
    }


    public string AccountGroupName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Account Sub Group
    //===========================================================

    public long AccountSubGroupId
    {
        get;
        set;
    }


    public string AccountSubGroupName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Basic Information
    //===========================================================

    public string ClassCode
    {
        get;
        set;
    } = string.Empty;


    public string Mode
    {
        get;
        set;
    } = string.Empty;


    public string GroupCode
    {
        get;
        set;
    } = string.Empty;


    public string SubGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string LedgerCode
    {
        get;
        set;
    } = string.Empty;


    public string LedgerName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Configuration
    //===========================================================

    // TODO: Add General Ledger specific configuration fields here


    public string Remarks
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Status
    //===========================================================

    public bool IsActive
    {
        get;
        set;
    } = true;


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