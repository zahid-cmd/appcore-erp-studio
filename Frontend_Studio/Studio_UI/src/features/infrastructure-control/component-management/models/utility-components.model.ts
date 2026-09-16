/* ============================================================
   Utility Components
============================================================ */

export interface UtilityComponents
{
    id:
        number;

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
   Create Utility Components
============================================================ */

export interface CreateUtilityComponents
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
   Update Utility Components
============================================================ */

export interface UpdateUtilityComponents
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
   Utility Components Defaults
============================================================ */

export interface UtilityComponentsDefaults
{
    code:
        string;
}