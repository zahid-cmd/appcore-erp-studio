/* ============================================================
   Purchase Adjustments - SP
============================================================ */

export interface PurchaseAdjustmentsSp
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
   Create Purchase Adjustments - SP
============================================================ */

export interface CreatePurchaseAdjustmentsSp
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
   Update Purchase Adjustments - SP
============================================================ */

export interface UpdatePurchaseAdjustmentsSp
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
   Purchase Adjustments - SP Defaults
============================================================ */

export interface PurchaseAdjustmentsSpDefaults
{
    code:
        string;
}