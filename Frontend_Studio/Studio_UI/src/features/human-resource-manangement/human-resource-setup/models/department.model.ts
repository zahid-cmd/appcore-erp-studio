/* ============================================================
   Department
============================================================ */

export interface Department
{
    DepartmentId:
        number;


    DepartmentCode:
        string;


    DepartmentName:
        string;


    DepartmentShortName:
        string;


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
   Create Department
============================================================ */

export interface CreateDepartment
{
    DepartmentCode:
        string;


    DepartmentName:
        string;


    DepartmentShortName:
        string;


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
   Update Department
============================================================ */

export interface UpdateDepartment
{
    DepartmentId:
        number;


    DepartmentCode:
        string;


    DepartmentName:
        string;


    DepartmentShortName:
        string;


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
   Department Defaults
============================================================ */

export interface DepartmentDefaults
{
    Code:
        string;
}