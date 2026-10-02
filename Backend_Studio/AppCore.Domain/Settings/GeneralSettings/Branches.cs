//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.GeneralSettings;


//===============================================================
// Branches
//===============================================================

public class Branches
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long BranchId
    {
        get;
        set;
    }


    //===========================================================
    // Company
    //===========================================================

    public long CompanyId
    {
        get;
        set;
    }


    //===========================================================
    // Wing
    //===========================================================

    public long WingId
    {
        get;
        set;
    }


    //===========================================================
    // Branch Information
    //===========================================================

    public string BranchCode
    {
        get;
        set;
    } = string.Empty;


    public string ShortName
    {
        get;
        set;
    } = string.Empty;


    public string BranchName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Contact Information
    //===========================================================

    public string Mobile
    {
        get;
        set;
    } = string.Empty;


    public string Email
    {
        get;
        set;
    } = string.Empty;


    public string Address
    {
        get;
        set;
    } = string.Empty;


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