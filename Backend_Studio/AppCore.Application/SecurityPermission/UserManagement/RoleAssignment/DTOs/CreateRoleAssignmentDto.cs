//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.UserManagement.RoleAssignment.DTOs;


//===============================================================
// Create Role Assignment DTO
//===============================================================

public class CreateRoleAssignmentDto
{
    //===========================================================
    // Role Assignment
    //===========================================================

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
    =
        true;


    //===========================================================
    // Details
    //===========================================================

    public List<CreateRoleAssignmentDetailDto> Details
    {
        get;
        set;
    }
    =
        new();
}


//===============================================================
// Create Role Assignment Detail DTO
//===============================================================

public class CreateRoleAssignmentDetailDto
{
    //===========================================================
    // Role Assignment Detail
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
}