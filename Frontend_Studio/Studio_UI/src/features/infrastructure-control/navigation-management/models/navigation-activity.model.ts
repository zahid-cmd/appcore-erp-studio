/* ============================================================
   Navigation Activity
============================================================ */

export interface NavigationActivity
{
    id: number;

    navigationModuleId: number;

    navigationModuleName: string;

    code: string;

    name: string;

    displayOrder: number;

    remarks: string;

    isActive: boolean;
}


/* ============================================================
   Create Navigation Activity
============================================================ */

export interface CreateNavigationActivity
{
    navigationModuleId: number;

    name: string;

    displayOrder: number;

    remarks: string;

    isActive: boolean;
}


/* ============================================================
   Update Navigation Activity
============================================================ */

export interface UpdateNavigationActivity
{
    id: number;

    navigationModuleId: number;

    name: string;

    displayOrder: number;

    remarks: string;

    isActive: boolean;
}


/* ============================================================
   Navigation Activity Defaults
============================================================ */

export interface NavigationActivityDefaults
{
    navigationModuleId: number;

    navigationModuleName: string;

    code: string;

    displayOrder: number;

    isActive: boolean;
}