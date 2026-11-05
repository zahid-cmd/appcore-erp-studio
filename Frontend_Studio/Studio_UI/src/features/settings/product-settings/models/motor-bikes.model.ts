//===============================================================
// Motor Bikes
//
// One Motor Bike = one model (Product Sub Category) in one Color.
// Codes and Product Name are built by the server.
//===============================================================

export interface MotorBikes
{
    // Sales account (CLS-005 / 006 / 008), set by the server
    SalesLedgerCode?: string;

    MotorBikeId: number;

    // The id used in links and API calls (uuid v7)
    PublicId: string;

    //===========================================================
    // Parent (locked after saving)
    //===========================================================

    ProductCategoryId: number;

    ProductSubCategoryId: number;

    ColorManagementId: number;

    //===========================================================
    // Product
    //===========================================================

    ProductCode: string;

    ProductName: string;

    //===========================================================
    // Inventory Ledgers
    //===========================================================

    InventoryLedgerCode: string;

    WipLedgerCode: string;

    CogsLedgerCode: string;

    //===========================================================
    // Stock Levels / Image / Status
    //===========================================================

    ReorderLevel: number;

    RedLevel: number;


    // 0 = not set : a purchase order cannot take the

    // company stock above it

    MaxStockLevel: number;

    // Saved image path from the server ('' when none).
    // The image itself is uploaded / deleted separately.
    ImagePath: string;

    Remarks: string;

    IsActive: boolean;

    //===========================================================
    // Display only (from the server)
    //===========================================================

    CategoryCode?: string;

    CategoryName?: string;

    BrandName?: string;

    SubCategoryCode?: string;

    SubCategoryName?: string;

    ColorName?: string;
}


//===============================================================
// Create Motor Bikes
//===============================================================

export interface CreateMotorBikes
{
    ProductCategoryId: number;

    ProductSubCategoryId: number;

    ColorManagementId: number;

    ReorderLevel: number;

    RedLevel: number;


    // 0 = not set : a purchase order cannot take the

    // company stock above it

    MaxStockLevel: number;

    Remarks: string;

    IsActive: boolean;
}


//===============================================================
// Update Motor Bikes
//===============================================================

export interface UpdateMotorBikes
    extends CreateMotorBikes
{
    MotorBikeId: number;
}


//===============================================================
// Motor Bikes Defaults (code preview for a sub category)
//===============================================================

export interface MotorBikesDefaults
{
    SalesLedgerCode?: string;

    Code: string;

    InventoryLedgerCode: string;

    WipLedgerCode: string;

    CogsLedgerCode: string;

    // Last saved motor bike's parents (asked with no sub category)
    LastProductCategoryId?: number;

    LastProductSubCategoryId?: number;

    LastReorderLevel?: number;

    LastRedLevel?: number;

    LastMaxStockLevel?: number;
}


//===============================================================
// List page query (server-side paging)
//===============================================================

export interface MotorBikesPageQuery
{
    page:number;

    pageSize:number;

    search:string;

    // Column field ('' = Product Code)
    sort:string;

    dir:'asc' | 'desc';

    // true / false (null = all)
    status:boolean | null;

    // Filters (null = all)
    productCategoryId?:number | null;

    productSubCategoryId?:number | null;

    colorManagementId?:number | null;
}
