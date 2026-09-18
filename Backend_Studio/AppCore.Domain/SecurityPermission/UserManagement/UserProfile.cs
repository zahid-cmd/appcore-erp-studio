//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.SecurityPermission.UserManagement;


//===============================================================
// User Profile
//===============================================================

public class UserProfile
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long UserProfileId
    {
        get;
        set;
    }


    //===========================================================
    // Basic Information
    //===========================================================

    public string ProfileCode
    {
        get;
        set;
    } = string.Empty;


    public string UserName
    {
        get;
        set;
    } = string.Empty;


    public string DisplayName
    {
        get;
        set;
    } = string.Empty;


    public string FullName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Contact Information
    //===========================================================

    public string Email
    {
        get;
        set;
    } = string.Empty;


    public string MobileNo
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