// PAGE-CLONED : Color Management -> Brand Management
//===============================================================
// Brand Management
//===============================================================

export interface BrandManagement
{
    BrandManagementId: number;

    BrandCode: string;

    BrandName: string;

    Remarks: string;

    Status: boolean;

    // Saved image path from the server ('' when none).
    // The image itself is uploaded / deleted separately.
    BrandImagePath?: string;
}


//===============================================================
// Create Brand Management
//===============================================================

export interface CreateBrandManagement
{
    BrandCode: string;

    BrandName: string;

    Remarks: string;

    Status: boolean;
}


//===============================================================
// Update Brand Management
//===============================================================

export interface UpdateBrandManagement
{
    BrandManagementId: number;

    BrandCode: string;

    BrandName: string;

    Remarks: string;

    Status: boolean;
}


//===============================================================
// Brand Management Defaults (next code for a new brand)
//===============================================================

export interface BrandManagementDefaults
{
    Code: string;
}