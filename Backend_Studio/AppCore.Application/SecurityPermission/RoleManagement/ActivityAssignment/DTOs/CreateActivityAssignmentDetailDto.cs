//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.RoleManagement.ActivityAssignment.DTOs;

//===============================================================
// Create Activity Assignment Detail DTO
//===============================================================

public class CreateActivityAssignmentDetailDto
{
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
    =
    true;
}