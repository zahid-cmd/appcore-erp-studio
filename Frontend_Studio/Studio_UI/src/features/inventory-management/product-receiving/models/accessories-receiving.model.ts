/* ============================================================
   Accessories Receiving
============================================================ */

export interface AccessoriesReceiving
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
   Create Accessories Receiving
============================================================ */

export interface CreateAccessoriesReceiving
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
   Update Accessories Receiving
============================================================ */

export interface UpdateAccessoriesReceiving
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
   Accessories Receiving Defaults
============================================================ */

export interface AccessoriesReceivingDefaults
{
    code:
        string;
}