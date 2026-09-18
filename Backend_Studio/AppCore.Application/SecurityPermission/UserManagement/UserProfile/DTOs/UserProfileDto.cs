//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.UserManagement.UserProfile.DTOs;


//===============================================================
// User Profile DTO
//===============================================================

public class UserProfileDto
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
    // Role Assignment
    //===========================================================

    public bool HasRoleAssignment
    {
        get;
        set;
    }


    public string PrimaryRoleName
    {
        get;
        set;
    } =
        "Not Assigned";


    public int RoleProfileCount
    {
        get;
        set;
    }


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