/* ============================================================
   {{ENTITY_NAME}}
============================================================ */

export interface {{ENTITY_CLASS}}
{
    id:
        number;

    code:
        string;

    name:
        string;

    sampleSearchDropdownId:
        number | null;

    sampleField:
        string;

    status:
        string;

    remarks:
        string;
}



/* ============================================================
   Create {{ENTITY_NAME}}
============================================================ */

export interface Create{{ENTITY_CLASS}}
{
    name:
        string;

    sampleSearchDropdownId:
        number | null;

    sampleField:
        string;

    status:
        string;

    remarks:
        string;
}



/* ============================================================
   Update {{ENTITY_NAME}}
============================================================ */

export interface Update{{ENTITY_CLASS}}
{
    id:
        number;

    name:
        string;

    sampleSearchDropdownId:
        number | null;

    sampleField:
        string;

    status:
        string;

    remarks:
        string;
}



/* ============================================================
   {{ENTITY_NAME}} Defaults
============================================================ */

export interface {{ENTITY_CLASS}}Defaults
{
    code:
        string;
}