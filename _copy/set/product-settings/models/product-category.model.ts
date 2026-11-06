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
    // Sales account (CLS-005 / 006 / 008), set by the server
    SalesGroupCode?:
        string;

    SalesGroupName?:
        string;

    ProductCategoryId:
        number;

    // The id used in links and API calls (uuid v7)
    PublicId?: string;

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
    // Sales group code of every Category Type
    SalesGroupCodes?:
        Record<string, string>;

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


//===============================================================
// List page query (server-side paging)
//===============================================================

export interface ProductCategoryPageQuery
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
