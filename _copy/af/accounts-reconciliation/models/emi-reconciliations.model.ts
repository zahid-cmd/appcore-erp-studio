/* ============================================================
   EMI Reconciliations
============================================================ */

export interface EmiReconciliations
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
   Create EMI Reconciliations
============================================================ */

export interface CreateEmiReconciliations
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
   Update EMI Reconciliations
============================================================ */

export interface UpdateEmiReconciliations
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
   EMI Reconciliations Defaults
============================================================ */

export interface EmiReconciliationsDefaults
{
    code:
        string;
}