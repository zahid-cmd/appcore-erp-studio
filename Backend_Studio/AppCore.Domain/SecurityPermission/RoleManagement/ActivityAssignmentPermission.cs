//===============================================================
// Namespace
//===============================================================

using AppCore.Domain.Common;

namespace AppCore.Domain.Entities.SecurityPermission.RoleManagement;

//===============================================================
// Activity Assignment Permission
//===============================================================

public class ActivityAssignmentPermission
    : BaseEntity
{
    /* =====================================================
       PRIMARY KEY
    ===================================================== */

    public long ActivityAssignmentPermissionId
    {
        get;
        set;
    }

    /* =====================================================
       DETAIL
    ===================================================== */

    public long ActivityAssignmentDetailId
    {
        get;
        set;
    }

    /* =====================================================
       ACTIVITY
    ===================================================== */

    public long? MasterActivityId
    {
        get;
        set;
    }

    public long? NavigationActivityId
    {
        get;
        set;
    }

    /* =====================================================
       PARENT
    ===================================================== */

    public virtual ActivityAssignmentDetail
        ActivityAssignmentDetail
    {
        get;
        set;
    }
    =
    null!;
}