/* ============================================================
   {{ENTITY_NAME}}
============================================================ */

export interface {{ENTITY_CLASS}}
{
    id: number;

    {{PARENT_PROPERTY}}Id: number;

    {{PARENT_PROPERTY}}Code: string;

    {{PARENT_PROPERTY}}Name: string;

    code: string;

    name: string;

    icon: string;

    routeKey: string;

    route: string;

    displayOrder: number;

    remarks: string;

    isActive: boolean;
}


/* ============================================================
   Create {{ENTITY_NAME}}
============================================================ */

export interface Create{{ENTITY_CLASS}}
{
    {{PARENT_PROPERTY}}Id: number;

    name: string;

    icon: string;

    routeKey: string;

    displayOrder: number;

    remarks: string;

    isActive: boolean;
}


/* ============================================================
   Update {{ENTITY_NAME}}
============================================================ */

export interface Update{{ENTITY_CLASS}}
{
    id: number;

    {{PARENT_PROPERTY}}Id: number;

    name: string;

    icon: string;

    routeKey: string;

    displayOrder: number;

    remarks: string;

    isActive: boolean;
}


/* ============================================================
   {{ENTITY_NAME}} Defaults
============================================================ */

export interface {{ENTITY_CLASS}}Defaults
{
    code: string;

    displayOrder: number;
}