//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.UserManagement.BranchAssignment.DTOs;


//===============================================================
// Branch Assignment DTO
//===============================================================

public class BranchAssignmentDto
{
    //===========================================================
    // Branch Assignment
    //===========================================================

    public long BranchAssignmentId
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
    // Default Branch
    //===========================================================

    public string DefaultBranchName
    {
        get;
        set;
    }
    =
        "Not Assigned";


    //===========================================================
    // Branch Assignment Summary
    //===========================================================

    public int BranchCount
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

    public List<BranchAssignmentDetailDto> Details
    {
        get;
        set;
    }
    =
        new();
}


//===============================================================
// Branch Assignment Detail DTO
//===============================================================

public class BranchAssignmentDetailDto
{
    //===========================================================
    // Branch Assignment Detail
    //===========================================================

    public long BranchAssignmentDetailId
    {
        get;
        set;
    }


    public long BranchAssignmentId
    {
        get;
        set;
    }


    //===========================================================
    // Branch
    //===========================================================

    public long BranchId
    {
        get;
        set;
    }


    public string BranchCode
    {
        get;
        set;
    }
    =
        string.Empty;


    public string BranchName
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