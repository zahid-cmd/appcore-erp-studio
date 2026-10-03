//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.UserManagement.BranchAssignment.DTOs;


//===============================================================
// Create Branch Assignment DTO
//===============================================================

public class CreateBranchAssignmentDto
{
    //===========================================================
    // Branch Assignment
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

    public List<CreateBranchAssignmentDetailDto> Details
    {
        get;
        set;
    }
    =
        new();
}


//===============================================================
// Create Branch Assignment Detail DTO
//===============================================================

public class CreateBranchAssignmentDetailDto
{
    //===========================================================
    // Branch Assignment Detail
    //===========================================================

    public long BranchId
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