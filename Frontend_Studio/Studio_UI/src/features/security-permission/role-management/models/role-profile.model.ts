/* ============================================================
   Role Profile
============================================================ */

export interface RoleProfile
{
    // The id used in links and API calls (uuid v7)
    PublicId?:
        string;

    RoleProfileId:
        number;

    ProfileCode:
        string;

    ProfileName:
        string;

    DisplayOrder:
        number;

    IsActive:
        boolean;

    Remarks:
        string;
}



/* ============================================================
   Create Role Profile
============================================================ */

export interface CreateRoleProfile
{
    ProfileCode:
        string;

    ProfileName:
        string;

    DisplayOrder:
        number;

    IsActive:
        boolean;

    Remarks:
        string;
}



/* ============================================================
   Update Role Profile
============================================================ */

export interface UpdateRoleProfile
{
    RoleProfileId:
        number;

    ProfileCode:
        string;

    ProfileName:
        string;

    DisplayOrder:
        number;

    IsActive:
        boolean;

    Remarks:
        string;
}



/* ============================================================
   Role Profile Defaults
============================================================ */

export interface RoleProfileDefaults
{
    Code:
        string;

    DisplayOrder:
        number;
}