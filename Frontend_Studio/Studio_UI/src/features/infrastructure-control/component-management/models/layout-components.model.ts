/* ============================================================
   Layout Components
============================================================ */

export interface LayoutComponents
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
   Create Layout Components
============================================================ */

export interface CreateLayoutComponents
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
   Update Layout Components
============================================================ */

export interface UpdateLayoutComponents
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
   Layout Components Defaults
============================================================ */

export interface LayoutComponentsDefaults
{
    code:
        string;
}