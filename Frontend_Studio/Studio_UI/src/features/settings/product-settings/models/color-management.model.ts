// PAGE-CLONED : Company -> Color Management (cleaned: Company leftovers removed)
//===============================================================
// Color Management
//===============================================================

export interface ColorManagement
{
    ColorManagementId: number;

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