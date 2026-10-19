//===============================================================
// Motor Bikes
//
// One Motor Bike = one model (Product Sub Category) in one Color.
// Codes and Product Name are built by the server.
//===============================================================

export interface MotorBikes
{
    MotorBikeId: number;

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
    Code: string;

    InventoryLedgerCode: string;

    WipLedgerCode: string;

    CogsLedgerCode: string;
}