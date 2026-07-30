/* ============================================================
   Navigation Submenu
============================================================ */

export interface NavigationSubmenu
{
    id: number;

    navigationModuleId: number;

    navigationModuleCode: string;

    navigationModuleName: string;

    navigationMenuId: number;

    navigationMenuCode: string;

    navigationMenuName: string;

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
   Create Navigation Submenu
============================================================ */

export interface CreateNavigationSubmenu
{
    navigationMenuId: number;

    name: string;

    icon: string;

    routeKey: string;

    displayOrder: number;

    remarks: string;

    isActive: boolean;
}


/* ============================================================
   Update Navigation Submenu
============================================================ */

export interface UpdateNavigationSubmenu
{
    id: number;

    navigationMenuId: number;

    name: string;

    icon: string;

    routeKey: string;

    displayOrder: number;

    remarks: string;

    isActive: boolean;
}


/* ============================================================
   Navigation Submenu Defaults
============================================================ */

export interface NavigationSubmenuDefaults
{
    code: string;

    displayOrder: number;
}