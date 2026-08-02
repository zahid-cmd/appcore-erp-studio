//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.RoleManagement.ActivityAssignment.DTOs;

//===============================================================
// Activity Assignment Detail DTO
//===============================================================

public class ActivityAssignmentDetailDto
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

    public string ModuleName
    {
        get;
        set;
    }
    =
    string.Empty;

    public long MenuId
    {
        get;
        set;
    }

    public string MenuName
    {
        get;
        set;
    }
    =
    string.Empty;

    public long SubMenuId
    {
        get;
        set;
    }

    public string SubMenuName
    {
        get;
        set;
    }
    =
    string.Empty;

    /* =====================================================
       PERMISSIONS
    ===================================================== */

    public List<ActivityAssignmentPermissionDto>
        ActivityAssignmentPermissions
    {
        get;
        set;
    }
    =
    new();

    /* =====================================================
       STATUS
    ===================================================== */

    public bool IsActive
    {
        get;
        set;
    }
}