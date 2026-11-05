/* ============================================================
   Purchase Returns - AC
============================================================ */

export interface PurchaseReturnsAc
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
   Create Purchase Returns - AC
============================================================ */

export interface CreatePurchaseReturnsAc
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
   Update Purchase Returns - AC
============================================================ */

export interface UpdatePurchaseReturnsAc
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
   Purchase Returns - AC Defaults
============================================================ */

export interface PurchaseReturnsAcDefaults
{
    code:
        string;
}