//===============================================================
// Namespaces
//===============================================================

using AppCore.Domain.Common;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.SecurityPermission.UserManagement;


//===============================================================
// Special Assignment
//===============================================================

public class SpecialAssignment
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long SpecialAssignmentId
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

    public virtual ICollection<SpecialAssignmentDetail>
        Details
    {
        get;
        set;
    }
    =
        new List<SpecialAssignmentDetail>();
}


//===============================================================
// Special Assignment Detail
//===============================================================

public class SpecialAssignmentDetail
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long SpecialAssignmentDetailId
    {
        get;
        set;
    }


    //===========================================================
    // Special Assignment
    //===========================================================

    public long SpecialAssignmentId
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
    // Special Assignment
    //===========================================================

    public virtual SpecialAssignment
        SpecialAssignment
    {
        get;
        set;
    }
    =
        null!;


    //===========================================================
    // Permissions
    //===========================================================

    public virtual ICollection<SpecialAssignmentPermission>
        SpecialAssignmentPermissions
    {
        get;
        set;
    }
    =
        new List<SpecialAssignmentPermission>();
}


//===============================================================
// Special Assignment Permission
//===============================================================

public class SpecialAssignmentPermission
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long SpecialAssignmentPermissionId
    {
        get;
        set;
    }


    //===========================================================
    // Special Assignment Detail
    //===========================================================

    public long SpecialAssignmentDetailId
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
    // Special Assignment Detail
    //===========================================================

    public virtual SpecialAssignmentDetail
        SpecialAssignmentDetail
    {
        get;
        set;
    }
    =
        null!;
}