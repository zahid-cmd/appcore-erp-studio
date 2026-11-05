/* ============================================================
   Control Components
============================================================ */

export interface ControlComponents
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
   Create Control Components
============================================================ */

export interface CreateControlComponents
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
   Update Control Components
============================================================ */

export interface UpdateControlComponents
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
   Control Components Defaults
============================================================ */

export interface ControlComponentsDefaults
{
    code:
        string;
}