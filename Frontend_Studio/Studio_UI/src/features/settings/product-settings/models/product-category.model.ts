/* ============================================================
   Product Category
============================================================ */

export interface ProductCategory
{
    ProductCategoryId:
        number;

    CategoryCode:
        string;

    CategoryName:
        string;

    //===========================================================
    // Inventory Group Codes
    //===========================================================

    InventoryGroupCode:
        string;

    WipGroupCode:
        string;

    CogsGroupCode:
        string;

    //===========================================================
    // Inventory Group Names
    //===========================================================

    InventoryGroupName:
        string;

    WipGroupName:
        string;

    CogsGroupName:
        string;

    //===========================================================
    // Configuration
    //===========================================================

    SubCategoryCreationAllowed:
        boolean;

    Remarks:
        string;

    //===========================================================
    // Status
    //===========================================================

    IsActive:
        boolean;
}

/* ============================================================
   Create Product Category
============================================================ */

export interface CreateProductCategory
{
    CategoryCode:
        string;

    CategoryName:
        string;

    //===========================================================
    // Inventory Group Codes
    //===========================================================

    InventoryGroupCode:
        string;

    WipGroupCode:
        string;

    CogsGroupCode:
        string;

    //===========================================================
    // Inventory Group Names
    //===========================================================

    InventoryGroupName:
        string;

    WipGroupName:
        string;

    CogsGroupName:
        string;

    //===========================================================
    // Configuration
    //===========================================================

    SubCategoryCreationAllowed:
        boolean;

    Remarks:
        string;

    //===========================================================
    // Status
    //===========================================================

    IsActive:
        boolean;
}

/* ============================================================
   Update Product Category
============================================================ */

export interface UpdateProductCategory
{
    ProductCategoryId:
        number;

    CategoryCode:
        string;

    CategoryName:
        string;

    //===========================================================
    // Inventory Group Codes
    //===========================================================

    InventoryGroupCode:
        string;

    WipGroupCode:
        string;

    CogsGroupCode:
        string;

    //===========================================================
    // Inventory Group Names
    //===========================================================

    InventoryGroupName:
        string;

    WipGroupName:
        string;

    CogsGroupName:
        string;

    //===========================================================
    // Configuration
    //===========================================================

    SubCategoryCreationAllowed:
        boolean;

    Remarks:
        string;

    //===========================================================
    // Status
    //===========================================================

    IsActive:
        boolean;
}

/* ============================================================
   Product Category Defaults
============================================================ */

export interface ProductCategoryDefaults
{
    //===========================================================
    // Product Category Code
    //===========================================================

    Code:
        string;

    //===========================================================
    // Inventory Group Code
    //===========================================================

    InventoryGroupCode:
        string;

    //===========================================================
    // WIP Group Code
    //===========================================================

    WipGroupCode:
        string;

    //===========================================================
    // COGS Group Code
    //===========================================================

    CogsGroupCode:
        string;
}