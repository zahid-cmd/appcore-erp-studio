/* ============================================================
   Login Pages
============================================================ */

export interface LoginPages
{
    id:
        number;

    code:
        string;

    name:
        string;

    pageKey:
        string;

    title:
        string;

    subtitle:
        string;

    status:
        boolean;

    remarks:
        string;
}



/* ============================================================
   Create Login Pages
============================================================ */

export interface CreateLoginPages
{
    name:
        string;

    pageKey:
        string;

    title:
        string;

    subtitle:
        string;

    status:
        boolean;

    remarks:
        string;
}



/* ============================================================
   Update Login Pages
============================================================ */

export interface UpdateLoginPages
{
    id:
        number;

    name:
        string;

    pageKey:
        string;

    title:
        string;

    subtitle:
        string;

    status:
        boolean;

    remarks:
        string;
}



/* ============================================================
   Login Pages Defaults
============================================================ */

export interface LoginPagesDefaults
{
    code:
        string;
}