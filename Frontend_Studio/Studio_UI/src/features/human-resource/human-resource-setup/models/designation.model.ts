/* ============================================================
   Designation
============================================================ */

export interface Designation
{
    id: number;

    code: string;

    name: string;

    remarks: string;

    isActive: boolean;
}


/* ============================================================
   Create Designation
============================================================ */

export interface CreateDesignation
{
    name: string;

    remarks: string;

    isActive: boolean;
}


/* ============================================================
   Update Designation
============================================================ */

export interface UpdateDesignation
{
    id: number;

    name: string;

    remarks: string;

    isActive: boolean;
}


/* ============================================================
   Designation Defaults
============================================================ */

export interface DesignationDefaults
{
    code: string;

    isActive: boolean;
}