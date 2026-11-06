/* ============================================================
   Product Sub Category
============================================================ */

export interface ProductSubCategory
{
    // Bike Model (Motor Bikes categories only)
    BikeModelId?:
        number | null;

    // Sales account (CLS-005 / 006 / 008), set by the server
    SalesSubGroupCode?:
        string;

    SalesSubGroupName?:
        string;

    ProductSubCategoryId:
        number;

    // The id used in links and API calls (uuid v7)
    PublicId?: string;

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
    // Bike Model (Motor Bikes categories only)
    BikeModelId?:
        number | null;

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
    // Bike Model (Motor Bikes categories only)
    BikeModelId?:
        number | null;

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
    SalesSubGroupCode?:
        string;

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


//===============================================================
// List page query (server-side paging)
//===============================================================

export interface ProductSubCategoryPageQuery
{
    page:number;

    pageSize:number;

    search:string;

    // Column field ('' = the default sort)
    sort:string;

    dir:'asc' | 'desc';

    // true / false (null = all)
    status:boolean | null;

    // Product Category filter (null = all)
    productCategoryId?:number | null;
}
