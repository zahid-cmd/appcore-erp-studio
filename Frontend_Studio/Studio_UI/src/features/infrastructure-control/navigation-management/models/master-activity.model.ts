/* ============================================================
   Activity Scope
   Common : on every page (View, Add, Update, Delete, Restore)
   Page   : only on the pages it is linked to (Approve, Post ...)
============================================================ */

export type ActivityScope =
    'Common'
    |
    'Page';


/* ============================================================
   Master Activity
============================================================ */

export interface MasterActivity
{
    id: number;

    code: string;

    name: string;

    displayOrder: number;

    remarks: string;

    activityScope: ActivityScope;

    // Page activity : also on every page that has page switches
    linkToSwitchPages: boolean;

    // Pages linked by hand (submenu codes)
    pageSubmenuCodes: string[];

    // Every page it shows on (hand links + pages with switches)
    pageSubmenuIds: number[];

    isActive: boolean;
}


/* ============================================================
   Create Master Activity
============================================================ */

export interface CreateMasterActivity
{
    name: string;

    displayOrder: number;

    remarks: string;

    activityScope: ActivityScope;

    linkToSwitchPages: boolean;

    pageSubmenuCodes: string[];

    isActive: boolean;
}


/* ============================================================
   Update Master Activity
============================================================ */

export interface UpdateMasterActivity
{
    id: number;

    name: string;

    displayOrder: number;

    remarks: string;

    activityScope: ActivityScope;

    linkToSwitchPages: boolean;

    pageSubmenuCodes: string[];

    isActive: boolean;
}


/* ============================================================
   Master Activity Defaults
============================================================ */

export interface MasterActivityDefaults
{
    code: string;

    displayOrder: number;

    isActive: boolean;
}