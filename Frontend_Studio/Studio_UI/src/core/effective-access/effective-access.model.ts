//===============================================================
// Effective Access Model
//===============================================================

export interface EffectiveAccess
{
    userProfileId: number;

    moduleId: number;

    menuId: number;

    subMenuId: number;

    masterActivityId: number | null;

    navigationActivityId: number | null;
}