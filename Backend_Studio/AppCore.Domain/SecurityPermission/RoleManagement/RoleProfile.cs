//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.SecurityPermission.RoleManagement;


//===============================================================
// Role Profile
//===============================================================

public class RoleProfile
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
    } = false;


    public bool IsDefaultRole
    {
        get;
        set;
    } = false;


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