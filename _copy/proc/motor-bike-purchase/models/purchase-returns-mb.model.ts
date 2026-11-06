/* ============================================================
   Purchase Returns - MB
============================================================ */

export interface PurchaseReturnsMb
{
    id:
        number;

    // The id used in links and API calls (uuid v7)
    publicId?:
        string;

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
   Create Purchase Returns - MB
============================================================ */

export interface CreatePurchaseReturnsMb
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
   Update Purchase Returns - MB
============================================================ */

export interface UpdatePurchaseReturnsMb
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
   Purchase Returns - MB Defaults
============================================================ */

export interface PurchaseReturnsMbDefaults
{
    code:
        string;
}