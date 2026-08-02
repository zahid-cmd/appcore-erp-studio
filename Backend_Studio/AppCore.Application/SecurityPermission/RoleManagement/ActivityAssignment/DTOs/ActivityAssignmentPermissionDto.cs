//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.RoleManagement.ActivityAssignment.DTOs;

//===============================================================
// Activity Assignment Permission DTO
//===============================================================

public class ActivityAssignmentPermissionDto
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
       PARENT
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
       DISPLAY
    ===================================================== */

    public string ActivityName
    {
        get;
        set;
    }
    =
    string.Empty;
}