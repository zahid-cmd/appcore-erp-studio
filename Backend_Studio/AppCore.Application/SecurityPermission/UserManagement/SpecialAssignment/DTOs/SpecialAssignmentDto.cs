//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.UserManagement;


//===============================================================
// Special Assignment DTO
//===============================================================

public class SpecialAssignmentDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long SpecialAssignmentId
    {
        get;
        set;
    }


    //===========================================================
    // User Profile
    //===========================================================

    public long UserProfileId
    {
        get;
        set;
    }


    //===========================================================
    // User Profile Information
    //===========================================================

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
    // Status
    //===========================================================

    public bool IsActive
    {
        get;
        set;
    }


    //===========================================================
    // Details
    //===========================================================

    public List<SpecialAssignmentDetailDto> Details
    {
        get;
        set;
    }
    =
        new List<SpecialAssignmentDetailDto>();
}


//===============================================================
// Special Assignment Detail DTO
//===============================================================

public class SpecialAssignmentDetailDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long SpecialAssignmentDetailId
    {
        get;
        set;
    }


    //===========================================================
    // Special Assignment
    //===========================================================

    public long SpecialAssignmentId
    {
        get;
        set;
    }


    //===========================================================
    // Module
    //===========================================================

    public long ModuleId
    {
        get;
        set;
    }


    //===========================================================
    // Menu
    //===========================================================

    public long MenuId
    {
        get;
        set;
    }


    //===========================================================
    // Sub Menu
    //===========================================================

    public long SubMenuId
    {
        get;
        set;
    }


    //===========================================================
    // Display Information
    //===========================================================

    public string ModuleName
    {
        get;
        set;
    }
    =
        string.Empty;


    public string MenuName
    {
        get;
        set;
    }
    =
        string.Empty;


    public string SubMenuName
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


    //===========================================================
    // Permissions
    //===========================================================

    public List<SpecialAssignmentPermissionDto> Permissions
    {
        get;
        set;
    }
    =
        new List<SpecialAssignmentPermissionDto>();
}


//===============================================================
// Special Assignment Permission DTO
//===============================================================

public class SpecialAssignmentPermissionDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long SpecialAssignmentPermissionId
    {
        get;
        set;
    }


    //===========================================================
    // Special Assignment Detail
    //===========================================================

    public long SpecialAssignmentDetailId
    {
        get;
        set;
    }


    //===========================================================
    // Master Activity
    //===========================================================

    public long? MasterActivityId
    {
        get;
        set;
    }


    //===========================================================
    // Navigation Activity
    //===========================================================

    public long? NavigationActivityId
    {
        get;
        set;
    }


    //===========================================================
    // Status
    //===========================================================

    public bool IsActive
    {
        get;
        set;
    }
}