// PAGE-CLONED : Color Management -> Brand Management
//===============================================================
// Brand Management
//===============================================================

export interface BrandManagement
{
    BrandManagementId: number;
    // The id used in links and API calls (uuid v7)
    PublicId?: string;

    BrandCode: string;

    BrandName: string;

    Remarks: string;

    Status: boolean;

    // Saved image path from the server ('' when none).
    // The image itself is uploaded / deleted separately.
    BrandImagePath?: string;

    // Supplier Profiles → SupplierCode (Supply Type Motor Bikes;
    // '' = none) and its display name
    MotorBikesSupplierCode?: string;

    MotorBikesSupplierName?: string;

    // Brand ledgers (created by the server on save)
    OfferAdjustmentLedgerCode?: string;

    OfferAdjustmentLedgerName?: string;

    EmiClaimLedgerCode?: string;

    EmiClaimLedgerName?: string;
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

    MotorBikesSupplierCode: string;
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

    MotorBikesSupplierCode: string;
}


//===============================================================
// Brand Management Defaults : next code, Motor Bikes suppliers,
// brand ledger sub groups with their next codes (preview only)
//===============================================================

export interface BrandSupplierOption
{
    SupplierCode: string;

    DisplayName: string;

    IsActive: boolean;
}

export interface BrandManagementDefaults
{
    Code: string;

    MotorBikesSuppliers: BrandSupplierOption[];

    OfferAdjustmentSubGroupCode: string;

    OfferAdjustmentSubGroupName: string;

    NextOfferAdjustmentLedgerCode: string;

    EmiClaimSubGroupCode: string;

    EmiClaimSubGroupName: string;

    NextEmiClaimLedgerCode: string;

    // Why a ledger sub group cannot be used ('' = fine)
    LedgerMessage: string;
}


//===============================================================
// List page query (server-side paging)
//===============================================================

export interface BrandManagementPageQuery
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
