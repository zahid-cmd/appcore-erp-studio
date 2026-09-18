/* ============================================================
   User Profile
============================================================ */

export interface UserProfile
{
    UserProfileId:
        number;


    ProfileCode:
        string;


    UserName:
        string;


    DisplayName:
        string;


    FullName:
        string;


    Email:
        string;


    MobileNo:
        string;


    //===========================================================
    // Role Assignment
    //===========================================================

    HasRoleAssignment?:
        boolean;


    RoleProfileCount?:
        number;


    PrimaryRoleName?:
        string;


    //===========================================================
    // Status
    //===========================================================

    IsActive:
        boolean;
}



/* ============================================================
   Create User Profile
============================================================ */

export interface CreateUserProfile
{
    ProfileCode:
        string;


    UserName:
        string;


    DisplayName:
        string;


    FullName:
        string;


    Email:
        string;


    MobileNo:
        string;


    IsActive:
        boolean;
}



/* ============================================================
   Update User Profile
============================================================ */

export interface UpdateUserProfile
{
    UserProfileId:
        number;


    ProfileCode:
        string;


    UserName:
        string;


    DisplayName:
        string;


    FullName:
        string;


    Email:
        string;


    MobileNo:
        string;


    IsActive:
        boolean;
}



/* ============================================================
   User Profile Defaults
============================================================ */

export interface UserProfileDefaults
{
    Code:
        string;
}