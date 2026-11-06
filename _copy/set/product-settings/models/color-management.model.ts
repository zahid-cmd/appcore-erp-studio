// PAGE-CLONED : Company -> Color Management (cleaned: Company leftovers removed)
//===============================================================
// Color Management
//===============================================================

export interface ColorManagement
{
    ColorManagementId: number;
    // The id used in links and API calls (uuid v7)
    PublicId?: string;

    ColorCode: string;

    ColorName: string;

    Remarks: string;

    Status: boolean;
}


//===============================================================
// Create Color Management
//===============================================================

export interface CreateColorManagement
{
    ColorCode: string;

    ColorName: string;

    Remarks: string;

    Status: boolean;
}


//===============================================================
// Update Color Management
//===============================================================

export interface UpdateColorManagement
{
    ColorManagementId: number;

    ColorCode: string;

    ColorName: string;

    Remarks: string;

    Status: boolean;
}


//===============================================================
// Color Management Defaults (next code for a new color)
//===============================================================

export interface ColorManagementDefaults
{
    Code: string;
}


//===============================================================
// List page query (server-side paging)
//===============================================================

export interface ColorManagementPageQuery
{
    page:number;

    pageSize:number;

    search:string;

    // Column field ('' = the default sort)
    sort:string;

    dir:'asc' | 'desc';

    // true / false (null = all)
    status:boolean | null;
}
