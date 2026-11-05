/* ============================================================
   Application Components
============================================================ */

export interface ApplicationComponents
{
    id:
        number;

    // The id used in links and API calls (uuid v7)
    publicId?: string;

    code:
        string;

    name:
        string;

    tabName:
        string;

    componentKey:
        string;

    displayOrder:
        number;

    icon:
        string;

    componentPath:
        string;

    status:
        boolean;

    remarks:
        string;
}



/* ============================================================
   Create Application Components
============================================================ */

export interface CreateApplicationComponents
{
    code:
        string;

    name:
        string;

    tabName:
        string;

    componentKey:
        string;

    displayOrder:
        number;

    icon:
        string;

    componentPath:
        string;

    status:
        boolean;

    remarks:
        string;
}



/* ============================================================
   Update Application Components
============================================================ */

export interface UpdateApplicationComponents
{
    id:
        number;

    name:
        string;

    tabName:
        string;

    componentKey:
        string;

    displayOrder:
        number;

    icon:
        string;

    componentPath:
        string;

    status:
        boolean;

    remarks:
        string;
}



/* ============================================================
   Application Components Defaults
============================================================ */

export interface ApplicationComponentsDefaults
{
    code:
        string;
}