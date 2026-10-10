/* ============================================================
   Product Master
============================================================ */

export interface ProductMaster
{
    ProductMasterId:
        number;

    ProductCategoryId:
        number;

    ProductCategoryName:
        string;

    ProductSubCategoryId:
        number;

    ProductSubCategoryName:
        string;

    SubCategoryCode:
        string;

    ProductCode:
        string;

    ProductName:
        string;

    //===========================================================
    // Auto Ledger Codes
    //===========================================================

    InventoryLedgerCode:
        string;

    WipLedgerCode:
        string;

    CogsLedgerCode:
        string;

    //===========================================================
    // Auto Ledger Names
    //===========================================================

    InventoryLedgerName:
        string;

    WipLedgerName:
        string;

    CogsLedgerName:
        string;

    //===========================================================
    // Configuration
    //===========================================================

    // TODO: Add Product Master specific configuration fields here
    // (e.g. UnitId, Barcode, SalePrice, PurchasePrice, ReorderLevel)

    Remarks:
        string;

    //===========================================================
    // Status
    //===========================================================

    IsActive:
        boolean;
}

/* ============================================================
   Create Product Master
============================================================ */

export interface CreateProductMaster
{
    ProductCategoryId:
        number;

    ProductSubCategoryId:
        number;

    SubCategoryCode:
        string;

    ProductCode:
        string;

    ProductName:
        string;

    InventoryLedgerCode:
        string;

    WipLedgerCode:
        string;

    CogsLedgerCode:
        string;

    InventoryLedgerName:
        string;

    WipLedgerName:
        string;

    CogsLedgerName:
        string;

    Remarks:
        string;

    IsActive:
        boolean;
}

/* ============================================================
   Update Product Master
============================================================ */

export interface UpdateProductMaster
{
    ProductMasterId:
        number;

    ProductCategoryId:
        number;

    ProductSubCategoryId:
        number;

    SubCategoryCode:
        string;

    ProductCode:
        string;

    ProductName:
        string;

    InventoryLedgerCode:
        string;

    WipLedgerCode:
        string;

    CogsLedgerCode:
        string;

    InventoryLedgerName:
        string;

    WipLedgerName:
        string;

    CogsLedgerName:
        string;

    Remarks:
        string;

    IsActive:
        boolean;
}

/* ============================================================
   Product Master Defaults
============================================================ */

export interface ProductMasterDefaults
{
    //===========================================================
    // Product Master Code
    //===========================================================

    Code:
        string;

    //===========================================================
    // Inventory Ledger Code
    //===========================================================

    InventoryLedgerCode:
        string;

    //===========================================================
    // WIP Ledger Code
    //===========================================================

    WipLedgerCode:
        string;

    //===========================================================
    // COGS Ledger Code
    //===========================================================

    CogsLedgerCode:
        string;
}