/* ============================================================
   Login Component 1
============================================================ */

export interface LoginComponent1
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
   Create Login Component 1
============================================================ */

export interface CreateLoginComponent1
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
   Update Login Component 1
============================================================ */

export interface UpdateLoginComponent1
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
   Login Component 1 Defaults
============================================================ */

export interface LoginComponent1Defaults
{
    code:
        string;
}