/* ============================================================
   Category Types
============================================================ */

export const PRODUCT_CATEGORY_TYPES:
    readonly string[] =
[
    'Motor Bikes',
    'Spare Parts',
    'Lubricants',
    'Accessories'
];

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
    // Category Type + Brand (the name is built from these)
    //===========================================================

    CategoryType:
        string;

    BrandManagementId:
        number;

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

    //===========================================================
    // Display only (from the server)
    //===========================================================

    BrandName?:
        string;
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
    // Category Type + Brand (the name is built from these)
    //===========================================================

    CategoryType:
        string;

    BrandManagementId:
        number;

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
    // Category Type + Brand (the name is built from these)
    //===========================================================

    CategoryType:
        string;

    BrandManagementId:
        number;

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
    // Next Category Code per Category Type
    // { 'Motor Bikes': 'MB-001', 'Spare Parts': 'SP-001', 'Lubricants': 'LB-001', ... }
    //===========================================================

    TypeCodes:
        Record<string, string>;

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