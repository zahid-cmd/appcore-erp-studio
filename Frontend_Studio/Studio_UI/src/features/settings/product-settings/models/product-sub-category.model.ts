/* ============================================================
   Product Sub Category
============================================================ */

export interface ProductSubCategory
{
    ProductSubCategoryId:
        number;

    ProductCategoryId:
        number;

    SubCategoryCode:
        string;

    SubCategoryName:
        string;

    //===========================================================
    // Inventory Sub Group Codes
    //===========================================================

    InventorySubGroupCode:
        string;

    WipSubGroupCode:
        string;

    CogsSubGroupCode:
        string;

    //===========================================================
    // Inventory Sub Group Names
    //===========================================================

    InventorySubGroupName:
        string;

    WipSubGroupName:
        string;

    CogsSubGroupName:
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
   Create Product Sub Category
============================================================ */

export interface CreateProductSubCategory
{
    ProductCategoryId:
        number;

    SubCategoryCode:
        string;

    SubCategoryName:
        string;

    //===========================================================
    // Inventory Sub Group Codes
    //===========================================================

    InventorySubGroupCode:
        string;

    WipSubGroupCode:
        string;

    CogsSubGroupCode:
        string;

    //===========================================================
    // Inventory Sub Group Names
    //===========================================================

    InventorySubGroupName:
        string;

    WipSubGroupName:
        string;

    CogsSubGroupName:
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
   Update Product Sub Category
============================================================ */

export interface UpdateProductSubCategory
{
    ProductSubCategoryId:
        number;

    ProductCategoryId:
        number;

    SubCategoryCode:
        string;

    SubCategoryName:
        string;

    //===========================================================
    // Inventory Sub Group Codes
    //===========================================================

    InventorySubGroupCode:
        string;

    WipSubGroupCode:
        string;

    CogsSubGroupCode:
        string;

    //===========================================================
    // Inventory Sub Group Names
    //===========================================================

    InventorySubGroupName:
        string;

    WipSubGroupName:
        string;

    CogsSubGroupName:
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
   Product Sub Category Defaults
============================================================ */

export interface ProductSubCategoryDefaults
{
    //===========================================================
    // Product Sub Category Code
    //===========================================================

    Code:
        string;

    //===========================================================
    // Inventory Sub Group Code
    //===========================================================

    InventorySubGroupCode:
        string;

    //===========================================================
    // WIP Sub Group Code
    //===========================================================

    WipSubGroupCode:
        string;

    //===========================================================
    // COGS Sub Group Code
    //===========================================================

    CogsSubGroupCode:
        string;
}