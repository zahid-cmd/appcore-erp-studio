/* ============================================================
   Account Class
============================================================ */

export interface AccountClass
{
    AccountClassId:
        number;


    ClassType:
        string;


    ClassCode:
        string;


    ClassName:
        string;


    Mode:
        string;


    ClassPrefix:
        string;


    AllowManualGroupCreation:
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
   Create Account Class
============================================================ */

export interface CreateAccountClass
{
    ClassType:
        string;


    ClassCode:
        string;


    ClassName:
        string;


    Mode:
        string;


    ClassPrefix:
        string;


    AllowManualGroupCreation:
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
   Update Account Class
============================================================ */

export interface UpdateAccountClass
{
    AccountClassId:
        number;


    ClassType:
        string;


    ClassCode:
        string;


    ClassName:
        string;


    Mode:
        string;


    ClassPrefix:
        string;


    AllowManualGroupCreation:
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
   Account Class Defaults
============================================================ */

export interface AccountClassDefaults
{
    // Last prefix used by Account Classes (empty on a fresh database)
    ClassPrefix:
        string;

    Code:
        string;
}