//===============================================================
// Namespaces
//===============================================================

using AppCore.Domain.Common;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.SecurityPermission.RoleManagement;


//===============================================================
// Activity Assignment
//===============================================================

public class ActivityAssignment
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long ActivityAssignmentId
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
    // Details
    //===========================================================

    public virtual ICollection<ActivityAssignmentDetail>
        Details
    {
        get;
        set;
    }
    =
        new List<ActivityAssignmentDetail>();
}


//===============================================================
// Activity Assignment Detail
//===============================================================

public class ActivityAssignmentDetail
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long ActivityAssignmentDetailId
    {
        get;
        set;
    }


    //===========================================================
    // Activity Assignment
    //===========================================================

    public long ActivityAssignmentId
    {
        get;
        set;
    }


    //===========================================================
    // Navigation
    //===========================================================

    public long ModuleId
    {
        get;
        set;
    }


    public long MenuId
    {
        get;
        set;
    }


    public long SubMenuId
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
    // Activity Assignment
    //===========================================================

    public virtual ActivityAssignment
        ActivityAssignment
    {
        get;
        set;
    }
    =
        null!;


    //===========================================================
    // Permissions
    //===========================================================

    public virtual ICollection<ActivityAssignmentPermission>
        ActivityAssignmentPermissions
    {
        get;
        set;
    }
    =
        new List<ActivityAssignmentPermission>();
}


//===============================================================
// Activity Assignment Permission
//===============================================================

public class ActivityAssignmentPermission
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long ActivityAssignmentPermissionId
    {
        get;
        set;
    }


    //===========================================================
    // Activity Assignment Detail
    //===========================================================

    public long ActivityAssignmentDetailId
    {
        get;
        set;
    }


    //===========================================================
    // Master Activity
    //===========================================================

    public long? MasterActivityId
    {
        get;
        set;
    }


    //===========================================================
    // Navigation Activity
    //===========================================================

    public long? NavigationActivityId
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
    // Activity Assignment Detail
    //===========================================================

    public virtual ActivityAssignmentDetail
        ActivityAssignmentDetail
    {
        get;
        set;
    }
    =
        null!;
}