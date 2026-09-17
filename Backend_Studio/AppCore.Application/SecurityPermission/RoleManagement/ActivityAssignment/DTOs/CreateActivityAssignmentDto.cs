//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.RoleManagement.ActivityAssignment.DTOs;


//===============================================================
// Create Activity Assignment DTO
//===============================================================

public class CreateActivityAssignmentDto
{
    //===========================================================
    // Activity Assignment
    //===========================================================

    public long RoleProfileId
    {
        get;
        set;
    }


    public bool IsActive
    {
        get;
        set;
    }
    =
        true;


    //===========================================================
    // Details
    //===========================================================

    public List<CreateActivityAssignmentDetailDto> Details
    {
        get;
        set;
    }
    =
        new();
}


//===============================================================
// Create Activity Assignment Detail DTO
//===============================================================

public class CreateActivityAssignmentDetailDto
{
    //===========================================================
    // Activity Assignment Detail
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


    public bool IsActive
    {
        get;
        set;
    }
    =
        true;


    //===========================================================
    // Permissions
    //===========================================================

    public List<ActivityAssignmentPermissionDto>
        ActivityAssignmentPermissions
    {
        get;
        set;
    }
    =
        new();
}