//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.AccountSettings;


//===============================================================
// Account Class
//===============================================================

public class AccountClass
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long AccountClassId
    {
        get;
        set;
    }


    //===========================================================
    // Basic Information
    //===========================================================

    public string ClassType
    {
        get;
        set;
    } = string.Empty;


    public string ClassCode
    {
        get;
        set;
    } = string.Empty;


    public string ClassName
    {
        get;
        set;
    } = string.Empty;


    public string Mode
    {
        get;
        set;
    } = string.Empty;


    public string ClassPrefix
    {
        get;
        set;
    } = string.Empty;


    public bool AllowManualGroupCreation
    {
        get;
        set;
    } = false;


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