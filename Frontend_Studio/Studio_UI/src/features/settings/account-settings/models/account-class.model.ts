/* ============================================================
   Account Class
============================================================ */

export interface AccountClass
{
    id:
        number;

    code:
        string;

    name:
        string;

    sampleSearchDropdownId:
        number | null;

    sampleField:
        string;

    status:
        string;

    remarks:
        string;
}



/* ============================================================
   Create Account Class
============================================================ */

export interface CreateAccountClass
{
    name:
        string;

    sampleSearchDropdownId:
        number | null;

    sampleField:
        string;

    status:
        string;

    remarks:
        string;
}



/* ============================================================
   Update Account Class
============================================================ */

export interface UpdateAccountClass
{
    id:
        number;

    name:
        string;

    sampleSearchDropdownId:
        number | null;

    sampleField:
        string;

    status:
        string;

    remarks:
        string;
}



/* ============================================================
   Account Class Defaults
============================================================ */

export interface AccountClassDefaults
{
    code:
        string;
}