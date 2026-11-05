/* ============================================================
   Designation
============================================================ */

export interface Designation
{
    // The id used in links and API calls (uuid v7)
    PublicId?:
        string;

    DesignationId:
        number;


    DesignationCode:
        string;


    DesignationName:
        string;


    DesignationShortName:
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
   Create Designation
============================================================ */

export interface CreateDesignation
{
    DesignationCode:
        string;


    DesignationName:
        string;


    DesignationShortName:
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
   Update Designation
============================================================ */

export interface UpdateDesignation
{
    DesignationId:
        number;


    DesignationCode:
        string;


    DesignationName:
        string;


    DesignationShortName:
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
   Designation Defaults
============================================================ */

export interface DesignationDefaults
{
    Code:
        string;
}