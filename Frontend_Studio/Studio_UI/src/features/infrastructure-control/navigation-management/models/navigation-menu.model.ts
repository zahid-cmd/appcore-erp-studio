/* ============================================================
   Navigation Menu
============================================================ */

export interface NavigationMenu
{
    id: number;

    // The id used in links and API calls (uuid v7)
    publicId?: string;

    navigationModuleId: number;

    navigationModuleCode: string;

    navigationModuleName: string;

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
   Create Navigation Menu
============================================================ */

export interface CreateNavigationMenu
{
    navigationModuleId: number;

    name: string;

    icon: string;

    routeKey: string;

    displayOrder: number;

    remarks: string;

    isActive: boolean;
}

/* ============================================================
   Update Navigation Menu
============================================================ */

export interface UpdateNavigationMenu
{
    id: number;

    navigationModuleId: number;

    name: string;

    icon: string;

    routeKey: string;

    displayOrder: number;

    remarks: string;

    isActive: boolean;
}

/* ============================================================
   Navigation Menu Defaults
============================================================ */

export interface NavigationMenuDefaults
{
    code: string;

    displayOrder: number;
}