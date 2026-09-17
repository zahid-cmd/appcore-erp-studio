//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.RoleManagement.ActivityAssignment.DTOs;


//===============================================================
// Update Activity Assignment DTO
//===============================================================

public class UpdateActivityAssignmentDto
{
    //===========================================================
    // Activity Assignment
    //===========================================================

    public long ActivityAssignmentId
    {
        get;
        set;
    }


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


    //===========================================================
    // Details
    //===========================================================

    public List<UpdateActivityAssignmentDetailDto> Details
    {
        get;
        set;
    }
    =
        new();
}


//===============================================================
// Update Activity Assignment Detail DTO
//===============================================================

public class UpdateActivityAssignmentDetailDto
{
    //===========================================================
    // Activity Assignment Detail
    //===========================================================

    public long ActivityAssignmentDetailId
    {
        get;
        set;
    }


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