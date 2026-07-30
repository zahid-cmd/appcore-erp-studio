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