/* ============================================================
   Account Group
============================================================ */

export interface AccountGroup
{
    AccountGroupId:
        number;


    AccountClassId:
        number;


    AccountClassName:
        string;


    ClassCode:
        string;


    Mode:
        string;


    GroupCode:
        string;


    GroupName:
        string;


    AllowManualSubGroup:
        boolean;


    //===========================================================
    // Configuration
    //===========================================================

    Remarks:
        string;


    //===========================================================
    // Status
    //===========================================================

    IsActive:
        boolean;
}



/* ============================================================
   Create Account Group
============================================================ */

export interface CreateAccountGroup
{
    AccountClassId:
        number;


    ClassCode:
        string;


    Mode:
        string;


    GroupCode:
        string;


    GroupName:
        string;


    AllowManualSubGroup:
        boolean;


    //===========================================================
    // Configuration
    //===========================================================

    Remarks:
        string;


    //===========================================================
    // Status
    //===========================================================

    IsActive:
        boolean;
}



/* ============================================================
   Update Account Group
============================================================ */

export interface UpdateAccountGroup
{
    AccountGroupId:
        number;


    AccountClassId:
        number;


    ClassCode:
        string;


    Mode:
        string;


    GroupCode:
        string;


    GroupName:
        string;


    AllowManualSubGroup:
        boolean;


    //===========================================================
    // Configuration
    //===========================================================

    Remarks:
        string;


    //===========================================================
    // Status
    //===========================================================

    IsActive:
        boolean;
}



/* ============================================================
   Account Group Defaults
============================================================ */

export interface AccountGroupDefaults
{
    Code:
        string;
}