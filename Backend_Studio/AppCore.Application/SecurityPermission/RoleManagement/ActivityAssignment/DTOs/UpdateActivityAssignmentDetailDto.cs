//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.RoleManagement.ActivityAssignment.DTOs;

//===============================================================
// Update Activity Assignment Detail DTO
//===============================================================

public class UpdateActivityAssignmentDetailDto
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
       MODULE
    ===================================================== */

    public long ModuleId
    {
        get;
        set;
    }

    /* =====================================================
       MENU
    ===================================================== */

    public long MenuId
    {
        get;
        set;
    }

    /* =====================================================
       SUB MENU
    ===================================================== */

    public long SubMenuId
    {
        get;
        set;
    }

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