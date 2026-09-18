//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.UserManagement.RoleAssignment.DTOs;


//===============================================================
// Role Assignment DTO
//===============================================================

public class RoleAssignmentDto
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


    public string UserProfileCode
    {
        get;
        set;
    }
    =
        string.Empty;


    public string UserProfileName
    {
        get;
        set;
    }
    =
        string.Empty;


    //===========================================================
    // Primary Role
    //===========================================================

    public string PrimaryRoleName
    {
        get;
        set;
    }
    =
        "Not Assigned";


    //===========================================================
    // Role Assignment Summary
    //===========================================================

    public int RoleProfileCount
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

    public List<RoleAssignmentDetailDto> Details
    {
        get;
        set;
    }
    =
        new();
}


//===============================================================
// Role Assignment Detail DTO
//===============================================================

public class RoleAssignmentDetailDto
{
    //===========================================================
    // Role Assignment Detail
    //===========================================================

    public long RoleAssignmentDetailId
    {
        get;
        set;
    }


    public long RoleAssignmentId
    {
        get;
        set;
    }


    //===========================================================
    // Role Profile
    //===========================================================

    public long RoleProfileId
    {
        get;
        set;
    }


    public string RoleProfileCode
    {
        get;
        set;
    }
    =
        string.Empty;


    public string RoleProfileName
    {
        get;
        set;
    }
    =
        string.Empty;


    //===========================================================
    // Status
    //===========================================================

    public bool IsActive
    {
        get;
        set;
    }
}