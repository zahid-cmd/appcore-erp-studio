//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.UserManagement.RoleAssignment.DTOs;


//===============================================================
// Update Role Assignment DTO
//===============================================================

public class UpdateRoleAssignmentDto
{
    //===========================================================
    // Role Assignment
    //===========================================================

    public long RoleAssignmentId
    {
        get;
        set;
    }


    public long UserProfileId
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

    public List<UpdateRoleAssignmentDetailDto> Details
    {
        get;
        set;
    }
    =
        new();
}


//===============================================================
// Update Role Assignment Detail DTO
//===============================================================

public class UpdateRoleAssignmentDetailDto
{
    //===========================================================
    // Role Assignment Detail
    //===========================================================

    public long RoleAssignmentDetailId
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
}