/* ============================================================
   Default Dashboard Components
============================================================ */

export interface DefaultDashboardComponents
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
   Create Default Dashboard Components
============================================================ */

export interface CreateDefaultDashboardComponents
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
   Update Default Dashboard Components
============================================================ */

export interface UpdateDefaultDashboardComponents
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
   Default Dashboard Components Defaults
============================================================ */

export interface DefaultDashboardComponentsDefaults
{
    code:
        string;
}