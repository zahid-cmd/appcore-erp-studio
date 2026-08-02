//===============================================================
// Activity Assignment Permission Model
//===============================================================

export interface ActivityAssignmentPermission
{
    //===========================================================
    // Primary Key
    //===========================================================

    activityAssignmentPermissionId:number;

    //===========================================================
    // Parent
    //===========================================================

    activityAssignmentDetailId:number;

    //===========================================================
    // Activities
    //===========================================================

    masterActivityId:number | null;

    navigationActivityId:number | null;

    activityName:string;
}