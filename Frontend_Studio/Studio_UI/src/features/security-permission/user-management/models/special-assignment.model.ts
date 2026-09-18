//===============================================================
// Special Assignment Model
//===============================================================

export interface SpecialAssignment
{
    //===========================================================
    // Primary Key
    //===========================================================

    specialAssignmentId:
        number;


    //===========================================================
    // User Profile
    //===========================================================

    userProfileId:
        number;

    userProfileName:
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
        SpecialAssignmentDetail[];
}



//===============================================================
// Special Assignment Detail
//===============================================================

export interface SpecialAssignmentDetail
{
    //===========================================================
    // Primary Key
    //===========================================================

    specialAssignmentDetailId:
        number;

    specialAssignmentId:
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

    specialAssignmentPermissions:
        SpecialAssignmentPermission[];


    //===========================================================
    // Status
    //===========================================================

    isActive:
        boolean;
}



//===============================================================
// Special Assignment Permission
//===============================================================

export interface SpecialAssignmentPermission
{
    //===========================================================
    // Primary Key
    //===========================================================

    specialAssignmentPermissionId:
        number;


    //===========================================================
    // Parent
    //===========================================================

    specialAssignmentDetailId:
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