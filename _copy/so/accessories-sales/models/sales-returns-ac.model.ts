/* ============================================================
   Sales Returns - AC
============================================================ */

export interface SalesReturnsAc
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
   Create Sales Returns - AC
============================================================ */

export interface CreateSalesReturnsAc
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
   Update Sales Returns - AC
============================================================ */

export interface UpdateSalesReturnsAc
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
   Sales Returns - AC Defaults
============================================================ */

export interface SalesReturnsAcDefaults
{
    code:
        string;
}