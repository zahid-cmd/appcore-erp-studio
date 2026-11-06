//===============================================================
// Spare Part Units
//===============================================================

export const SPARE_PART_UNITS:
    readonly string[] =
[
    'Pcs',
    'Set',
    'Pair',
    'Box',
    'Packet',
    'Litre',
    'Kg',
    'Meter',
    'Roll'
];


//===============================================================
// Spare Part Location
//
// One per warehouse : Warehouse → Rack → Shelf → Bin. The bin is
// the location (one item per bin), shown as A-03-05 (rack - shelf
// - bin, built by shared/inventory/storage-labels).
//===============================================================

export interface SparePartLocation
{
    WarehouseId: number;

    RackManagementId: number;

    ShelfNumber: number;

    // 1 … the shelf's bin count
    BinNumber: number;

    //===========================================================
    // Display only (from the server)
    //===========================================================

    WarehouseCode?: string;

    WarehouseName?: string;

    RackCode?: string;

    RackName?: string;

    // SLF-A-03
    ShelfLabel?: string;

    // A-03-05
    BinCode?: string;

    // "WH-001: A-03-05"
    LocationText?: string;
}


//===============================================================
// Spare Parts
//
// One Spare Part = one part number inside a Product Sub Category.
// Codes are built by the server; Part Number and Part Name are
// typed. Part Number is unique within the brand (category),
// ignoring spaces, hyphens, dots and case.
//===============================================================

export interface SpareParts
{
    // Sales account (CLS-005 / 006 / 008), set by the server
    SalesLedgerCode?: string;

    SparePartId: number;

    // The id used in links and API calls (uuid v7)
    PublicId: string;

    //===========================================================
    // Parent (locked after saving)
    //===========================================================

    ProductCategoryId: number;

    ProductSubCategoryId: number;

    //===========================================================
    // Part
    //===========================================================

    PartNumber: string;

    PartName: string;

    Unit: string;

    ProductCode: string;

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

    // SuperFast / Fast / Regular / Periodic / Slow (default Slow);
    // labels and colours : shared/inventory/storage-labels
    MovementClass: string;

    // Saved image path from the server ('' when none).
    // The image itself is uploaded / deleted separately.
    ImagePath: string;

    Remarks: string;

    IsActive: boolean;

    //===========================================================
    // Storage Locations (one per warehouse, optional)
    //===========================================================

    Locations: SparePartLocation[];

    //===========================================================
    // Display only (from the server)
    //===========================================================

    // Reserved : the class will later follow the 3- or 6-month
    // average sale (read only)
    MovementClassAuto?: boolean;

    // "WH-001: A-03-05, WH-002: B-01-02"
    LocationsText?: string;

    CategoryCode?: string;

    CategoryName?: string;

    BrandName?: string;

    SubCategoryCode?: string;

    SubCategoryName?: string;

    // Fits Models : other sub categories (models) of the same
    // category it also fits (its home is ProductSubCategoryId)
    Fits?: SparePartFit[];

    // "Y06, A10"
    FitsText?: string;

    // Edited on the form; sent on save (replaces the links)
    FitSubCategoryIds?: number[];
}


//===============================================================
// Fits Models : one other sub category (model)
//===============================================================

export interface SparePartFit
{
    ProductSubCategoryId: number;

    SubCategoryCode: string;

    SubCategoryName: string;

    // The bike model ('' when the sub category has none)
    ModelName: string;
}


//===============================================================
// Create Spare Parts
//===============================================================

export interface CreateSpareParts
{
    ProductCategoryId: number;

    ProductSubCategoryId: number;

    PartNumber: string;

    PartName: string;

    Unit: string;

    ReorderLevel: number;

    RedLevel: number;


    // 0 = not set : a purchase order cannot take the

    // company stock above it

    MaxStockLevel: number;

    // SuperFast / Fast / Regular / Periodic / Slow (default Slow);
    // labels and colours : shared/inventory/storage-labels
    MovementClass: string;

    Remarks: string;

    IsActive: boolean;

    // Replaces the saved locations on every save
    Locations: SparePartLocation[];

    // Fits Models : replaces the saved links (omit = keep them)
    FitSubCategoryIds?: number[];
}


//===============================================================
// Update Spare Parts
//===============================================================

export interface UpdateSpareParts
    extends CreateSpareParts
{
    SparePartId: number;
}


//===============================================================
// List page query (server-side paging)
//===============================================================

export interface SparePartsPageQuery
{
    page:number;

    pageSize:number;

    search:string;

    // Column field ('' = Product Code)
    sort:string;

    dir:'asc' | 'desc';

    // SP / LB (the tab; '' = all)
    type:string;

    // true / false (null = all)
    status:boolean | null;

    // Filters (null = all)
    productCategoryId?:number | null;

    productSubCategoryId?:number | null;
}


//===============================================================
// Spare Parts Defaults (code preview for a sub category)
//===============================================================

export interface SparePartsDefaults
{
    SalesLedgerCode?: string;

    Code: string;

    InventoryLedgerCode: string;

    WipLedgerCode: string;

    CogsLedgerCode: string;
}