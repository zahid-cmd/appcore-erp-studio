//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.SecurityPermission.RoleManagement;

//===============================================================
// Activity Assignment Detail
//===============================================================

public class ActivityAssignmentDetail
{
    /* =====================================================
       PRIMARY KEY
    ===================================================== */

    public long ActivityAssignmentDetailId
    {
        get;
        set;
    }

    /* =====================================================
       HEADER
    ===================================================== */

    public long ActivityAssignmentId
    {
        get;
        set;
    }

    /* =====================================================
       NAVIGATION
    ===================================================== */

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

    /* =====================================================
       STATUS
    ===================================================== */

    public bool IsActive
    {
        get;
        set;
    } = true;

    /* =====================================================
       SOFT DELETE
    ===================================================== */

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

    /* =====================================================
       AUDIT INFORMATION
    ===================================================== */

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

    /* =====================================================
       PARENT
    ===================================================== */

    public virtual ActivityAssignment
        ActivityAssignment
    {
        get;
        set;
    }
    =
    null!;

    /* =====================================================
       PERMISSIONS
    ===================================================== */

   public virtual ICollection<ActivityAssignmentPermission>
      ActivityAssignmentPermissions
   {
      get;
      set;
   }
   =
   new List<ActivityAssignmentPermission>();
}