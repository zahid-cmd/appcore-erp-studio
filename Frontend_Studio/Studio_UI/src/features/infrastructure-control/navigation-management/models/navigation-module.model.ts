/* ============================================================
   Navigation Module
============================================================ */

export interface NavigationModule
{
    id: number;

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
   Create Navigation Module
============================================================ */

export interface CreateNavigationModule
{
    name: string;

    icon: string;

    routeKey: string;

    displayOrder: number;

    remarks: string;

    isActive: boolean;
}

/* ============================================================
   Update Navigation Module
============================================================ */

export interface UpdateNavigationModule
{
    id: number;

    name: string;

    icon: string;

    routeKey: string;

    displayOrder: number;

    remarks: string;

    isActive: boolean;
}

/* ============================================================
   Navigation Module Defaults
============================================================ */

export interface NavigationModuleDefaults
{
    code: string;

    displayOrder: number;
}