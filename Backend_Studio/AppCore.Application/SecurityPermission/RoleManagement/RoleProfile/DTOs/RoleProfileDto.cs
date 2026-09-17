//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.RoleManagement.RoleProfile.DTOs;


//===============================================================
// Role Profile DTO
//===============================================================

public class RoleProfileDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long RoleProfileId
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


    public string ProfileName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Description
    //===========================================================

    public string? Remarks
    {
        get;
        set;
    }


    //===========================================================
    // Display Information
    //===========================================================

    public int DisplayOrder
    {
        get;
        set;
    }


    //===========================================================
    // System Flags
    //===========================================================

    public bool IsSystemRole
    {
        get;
        set;
    }


    public bool IsDefaultRole
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
    }


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