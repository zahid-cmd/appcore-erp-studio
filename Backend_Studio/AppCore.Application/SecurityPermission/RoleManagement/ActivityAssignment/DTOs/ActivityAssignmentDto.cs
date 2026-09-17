//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.RoleManagement.ActivityAssignment.DTOs;


//===============================================================
// Activity Assignment DTO
//===============================================================

public class ActivityAssignmentDto
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


    public string RoleProfileName
    {
        get;
        set;
    }
    =
        string.Empty;


    public int PageCount
    {
        get;
        set;
    }


    public int MasterActivityCount
    {
        get;
        set;
    }


    public int SpecialActivityCount
    {
        get;
        set;
    }


    public int TotalActivityCount
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

    public List<ActivityAssignmentDetailDto> Details
    {
        get;
        set;
    }
    =
        new();
}


//===============================================================
// Activity Assignment Detail DTO
//===============================================================

public class ActivityAssignmentDetailDto
{
    //===========================================================
    // Activity Assignment Detail
    //===========================================================

    public long ActivityAssignmentDetailId
    {
        get;
        set;
    }


    public long ActivityAssignmentId
    {
        get;
        set;
    }


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


//===============================================================
// Activity Assignment Permission DTO
//===============================================================

public class ActivityAssignmentPermissionDto
{
    //===========================================================
    // Activity Assignment Permission
    //===========================================================

    public long ActivityAssignmentPermissionId
    {
        get;
        set;
    }


    public long ActivityAssignmentDetailId
    {
        get;
        set;
    }


    public long? MasterActivityId
    {
        get;
        set;
    }


    public long? NavigationActivityId
    {
        get;
        set;
    }


    public string ActivityName
    {
        get;
        set;
    }
    =
        string.Empty;
}