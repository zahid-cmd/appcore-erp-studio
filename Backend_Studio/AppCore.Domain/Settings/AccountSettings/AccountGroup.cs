//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.AccountSettings;


//===============================================================
// Account Group
//===============================================================

public class AccountGroup
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long AccountGroupId
    {
        get;
        set;
    }


    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; } = Guid.CreateVersion7();


    //===========================================================
    // Account Class
    //===========================================================

    public long AccountClassId
    {
        get;
        set;
    }


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


    public string GroupName
    {
        get;
        set;
    } = string.Empty;


    public bool AllowManualSubGroup
    {
        get;
        set;
    } = false;

    // Balance Sheet term of an asset / liability group :
    // true = non-current, false = current. Used by the Net
    // assets view; ignored for equity, income and expense.
    public bool IsNonCurrent
    {
        get;
        set;
    } = false;

    // Cash flow statement : Operating / Investing / Financing
    // (CashFlowActivities). The statement goes by this, never by
    // the group name.
    public string CashFlowActivity
    {
        get;
        set;
    } = "Operating";


    //===========================================================
    // Configuration
    //===========================================================

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