/* ============================================================
   POS Reconciliations
============================================================ */

export interface PosReconciliations
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
   Create POS Reconciliations
============================================================ */

export interface CreatePosReconciliations
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
   Update POS Reconciliations
============================================================ */

export interface UpdatePosReconciliations
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
   POS Reconciliations Defaults
============================================================ */

export interface PosReconciliationsDefaults
{
    code:
        string;
}