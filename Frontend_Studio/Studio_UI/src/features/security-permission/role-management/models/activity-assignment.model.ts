 
//===============================================================
// Activity Assignment Model
//===============================================================

export interface ActivityAssignment
{
    //===========================================================
    // Primary Key
    //===========================================================

    activityAssignmentId:
        number;


    //===========================================================
    // Role Profile
    //===========================================================

    roleProfileId:
        number;

    roleProfileName:
        string;


    //===========================================================
    // Activity Summary
    //===========================================================

    pageCount:
        number;

    masterActivityCount:
        number;

    specialActivityCount:
        number;

    totalActivityCount:
        number;


    //===========================================================
    // Status
    //===========================================================

    isActive:
        boolean;


    //===========================================================
    // Details
    //===========================================================

    details:
        ActivityAssignmentDetail[];
}



//===============================================================
// Activity Assignment Detail
//===============================================================

export interface ActivityAssignmentDetail
{
    //===========================================================
    // Primary Key
    //===========================================================

    activityAssignmentDetailId:
        number;

    activityAssignmentId:
        number;


    //===========================================================
    // Navigation
    //===========================================================

    moduleId:
        number;

    moduleName:
        string;

    menuId:
        number;

    menuName:
        string;

    subMenuId:
        number;

    subMenuName:
        string;


    //===========================================================
    // Permissions
    //===========================================================

    activityAssignmentPermissions:
        ActivityAssignmentPermission[];


    //===========================================================
    // Status
    //===========================================================

    isActive:
        boolean;
}



//===============================================================
// Activity Assignment Permission
//===============================================================

export interface ActivityAssignmentPermission
{
    //===========================================================
    // Primary Key
    //===========================================================

    activityAssignmentPermissionId:
        number;


    //===========================================================
    // Parent
    //===========================================================

    activityAssignmentDetailId:
        number;


    //===========================================================
    // Activities
    //===========================================================

    masterActivityId:
        number | null;

    navigationActivityId:
        number | null;

    activityName:
        string;
}