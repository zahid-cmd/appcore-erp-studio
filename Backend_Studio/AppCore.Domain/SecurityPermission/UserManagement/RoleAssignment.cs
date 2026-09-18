//===============================================================
// Namespaces
//===============================================================

using AppCore.Domain.Common;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.SecurityPermission.UserManagement;


//===============================================================
// Role Assignment
//===============================================================

public class RoleAssignment
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long RoleAssignmentId
    {
        get;
        set;
    }


    //===========================================================
    // User Profile
    //===========================================================

    public long UserProfileId
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
    =
        true;


    public bool IsDeleted
    {
        get;
        set;
    }
    =
        false;


    //===========================================================
    // Delete Audit
    //===========================================================

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
    // Create Audit
    //===========================================================

    public long? CreatedBy
    {
        get;
        set;
    }


    public DateTime CreatedDate
    {
        get;
        set;
    }
    =
        DateTime.UtcNow;


    //===========================================================
    // Modify Audit
    //===========================================================

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


    //===========================================================
    // Details
    //===========================================================

    public virtual ICollection<RoleAssignmentDetail>
        Details
    {
        get;
        set;
    }
    =
        new List<RoleAssignmentDetail>();
}


//===============================================================
// Role Assignment Detail
//===============================================================

public class RoleAssignmentDetail
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long RoleAssignmentDetailId
    {
        get;
        set;
    }


    //===========================================================
    // Role Assignment
    //===========================================================

    public long RoleAssignmentId
    {
        get;
        set;
    }


    //===========================================================
    // Role Profile
    //===========================================================

    public long RoleProfileId
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
    =
        true;


    public bool IsDeleted
    {
        get;
        set;
    }
    =
        false;


    //===========================================================
    // Delete Audit
    //===========================================================

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
    // Create Audit
    //===========================================================

    public long? CreatedBy
    {
        get;
        set;
    }


    public DateTime CreatedDate
    {
        get;
        set;
    }
    =
        DateTime.UtcNow;


    //===========================================================
    // Modify Audit
    //===========================================================

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


    //===========================================================
    // Role Assignment
    //===========================================================

    public virtual RoleAssignment
        RoleAssignment
    {
        get;
        set;
    }
    =
        null!;
}