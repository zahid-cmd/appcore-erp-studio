/* ============================================================
   Purchase Adjustments - AC
============================================================ */

export interface PurchaseAdjustmentsAc
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
   Create Purchase Adjustments - AC
============================================================ */

export interface CreatePurchaseAdjustmentsAc
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
   Update Purchase Adjustments - AC
============================================================ */

export interface UpdatePurchaseAdjustmentsAc
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
   Purchase Adjustments - AC Defaults
============================================================ */

export interface PurchaseAdjustmentsAcDefaults
{
    code:
        string;
}