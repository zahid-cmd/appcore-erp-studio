/* ============================================================
   Purchases - MB
============================================================ */

export interface PurchasesMb
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
   Create Purchases - MB
============================================================ */

export interface CreatePurchasesMb
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
   Update Purchases - MB
============================================================ */

export interface UpdatePurchasesMb
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
   Purchases - MB Defaults
============================================================ */

export interface PurchasesMbDefaults
{
    code:
        string;
}