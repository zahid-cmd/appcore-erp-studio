//===============================================================
// Imports
//===============================================================

import
{
    ActivityAssignmentPermission
}
from './activity-assignment-permission.model';

//===============================================================
// Activity Assignment Detail Model
//===============================================================

export interface ActivityAssignmentDetail
{
    //===========================================================
    // Primary Key
    //===========================================================

    activityAssignmentDetailId:number;

    activityAssignmentId:number;

    //===========================================================
    // Navigation
    //===========================================================

    moduleId:number;

    moduleName:string;

    menuId:number;

    menuName:string;

    subMenuId:number;

    subMenuName:string;

    //===========================================================
    // Permissions
    //===========================================================

    activityAssignmentPermissions:
        ActivityAssignmentPermission[];

    //===========================================================
    // Status
    //===========================================================

    isActive:boolean;
}