//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.AccountSubGroup.DTOs;


//===============================================================
// Account Sub Group DTO
//===============================================================

public class AccountSubGroupDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long AccountSubGroupId
    {
        get;
        set;
    }


    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; }


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


    public string SubGroupName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Configuration
    //===========================================================

    public bool AllowManualLedger
    {
        get;
        set;
    }

    // Expense sub group that holds finance costs (interest, bank
    // charges) : added back for Profit before interest (ROI /
    // ROCE). Ignored for other classes.
    public bool IsFinanceCost
    {
        get;
        set;
    }


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