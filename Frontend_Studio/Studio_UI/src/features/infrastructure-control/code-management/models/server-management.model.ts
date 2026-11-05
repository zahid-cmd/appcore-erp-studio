/* ============================================================
   Server Management
============================================================ */

export interface ServerManagement
{
    id:
        number;

    // The id used in links and API calls (uuid v7)
    publicId?: string;

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
   Create Server Management
============================================================ */

export interface CreateServerManagement
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
   Update Server Management
============================================================ */

export interface UpdateServerManagement
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
   Server Management Defaults
============================================================ */

export interface ServerManagementDefaults
{
    code:
        string;
}