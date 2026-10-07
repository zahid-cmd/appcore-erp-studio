/* ============================================================
   MFS Accounts
============================================================ */

export interface MfsAccounts
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
   Create MFS Accounts
============================================================ */

export interface CreateMfsAccounts
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
   Update MFS Accounts
============================================================ */

export interface UpdateMfsAccounts
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
   MFS Accounts Defaults
============================================================ */

export interface MfsAccountsDefaults
{
    code:
        string;
}