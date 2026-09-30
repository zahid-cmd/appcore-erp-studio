/* ============================================================
   Core Components
============================================================ */

export interface CoreComponents
{
    id:
        number;


    //===========================================================
    // Section 1 - General Information
    //===========================================================

    code:
        string;

    name:
        string;

    tabName:
        string;

    icon:
        string;


    //===========================================================
    // Section 2 - Component Information
    //===========================================================

    folderName:
        string;

    featureFolder:
        string;

    featureSubFolder:
        string;

    componentPath:
        string;


    //===========================================================
    // Section 3 - File & Registration Information
    //===========================================================

    registrationFilePath:
        string;

    htmlFilePath:
        string;

    tsFilePath:
        string;

    cssFilePath:
        string;


    //===========================================================
    // Section 4 - Status & Additional Information
    //===========================================================

    displayOrder:
        number;

    status:
        boolean;

    remarks:
        string;
}



/* ============================================================
   Create Core Components
============================================================ */

export interface CreateCoreComponents
{
    //===========================================================
    // Section 1 - General Information
    //===========================================================

    name:
        string;

    tabName:
        string;

    icon:
        string;


    //===========================================================
    // Section 2 - Component Information
    //===========================================================

    folderName:
        string;

    featureFolder:
        string;

    featureSubFolder:
        string;

    componentPath:
        string;


    //===========================================================
    // Section 3 - File & Registration Information
    //===========================================================

    registrationFilePath:
        string;

    htmlFilePath:
        string;

    tsFilePath:
        string;

    cssFilePath:
        string;


    //===========================================================
    // Section 4 - Status & Additional Information
    //===========================================================

    displayOrder:
        number;

    status:
        boolean;

    remarks:
        string;
}



/* ============================================================
   Update Core Components
============================================================ */

export interface UpdateCoreComponents
{
    id:
        number;


    //===========================================================
    // Section 1 - General Information
    //===========================================================

    name:
        string;

    tabName:
        string;

    icon:
        string;


    //===========================================================
    // Section 2 - Component Information
    //===========================================================

    folderName:
        string;

    featureFolder:
        string;

    featureSubFolder:
        string;

    componentPath:
        string;


    //===========================================================
    // Section 3 - File & Registration Information
    //===========================================================

    registrationFilePath:
        string;

    htmlFilePath:
        string;

    tsFilePath:
        string;

    cssFilePath:
        string;


    //===========================================================
    // Section 4 - Status & Additional Information
    //===========================================================

    displayOrder:
        number;

    status:
        boolean;

    remarks:
        string;
}



/* ============================================================
   Core Components Defaults
============================================================ */

export interface CoreComponentsDefaults
{
    code:
        string;
}