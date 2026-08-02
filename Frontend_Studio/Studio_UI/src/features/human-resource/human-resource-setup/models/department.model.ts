/* ============================================================
   Department
============================================================ */

export interface Department
{
    id: number;

    code: string;

    name: string;

    shortName: string;

    departmentHead: string;

    email: string;

    phone: string;

    companyId: number;

    companyName: string;

    remarks: string;

    isActive: boolean;
}

/* ============================================================
   Create Department
============================================================ */

export interface CreateDepartment
{
    name: string;

    shortName: string;

    departmentHead: string;

    email: string;

    phone: string;

    companyId: number;

    remarks: string;

    isActive: boolean;
}

/* ============================================================
   Update Department
============================================================ */

export interface UpdateDepartment
{
    id: number;

    name: string;

    shortName: string;

    departmentHead: string;

    email: string;

    phone: string;

    companyId: number;

    remarks: string;

    isActive: boolean;
}

/* ============================================================
   Department Defaults
============================================================ */

export interface DepartmentDefaults
{
    code: string;

    companyId: number;

    isActive: boolean;
}