//===============================================================
// Accessory Units
//===============================================================

export const ACCESSORY_UNITS:
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
// Accessory Uses
//
//   For Sale                 : sold in the accessories shop
//   Additional Accessories   : free with every bike, all year
//   Promotional Accessories  : free with bikes during a promotion
//
// Additional / Promotional items also show on Motor Bike Stock ›
// Accessories. Every use keeps its ledgers (leftover free stock
// may be sold later with a price from Product Pricing).
//===============================================================

export const ACCESSORY_USE_FOR_SALE =
    'For Sale';

export const ACCESSORY_USES:
    readonly string[] =
[
    'For Sale',
    'Additional Accessories',
    'Promotional Accessories'
];

// Unknown / empty → For Sale
export function normalizeAccessoryUse
(
    value:
        any
):
    string
{
    const text =
        String(value ?? '').trim().toLowerCase();

    return ACCESSORY_USES.find(x => x.toLowerCase() === text)
        ?? ACCESSORY_USES.find(x => !!text && x.toLowerCase().startsWith(text))
        ?? ACCESSORY_USE_FOR_SALE;
}


//===============================================================
// Accessory Location
//
// One per warehouse : Warehouse → Rack → Shelf → Bin. The bin is
// the location (one item per bin), shown as A-03-05 (rack - shelf
// - bin, built by shared/inventory/storage-labels).
//===============================================================

export interface AccessoryLocation
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
// Accessories
//
// One Accessory = one item inside a Product Sub Category (category
// of Category Type "Accessories"). Codes are built by the server;
// Accessory Name is typed. Part Number is OPTIONAL; when given it
// is unique within the brand (category), ignoring spaces, hyphens,
// dots and case. No image.
//===============================================================

export interface Accessories
{
    // Sales account (CLS-005 / 006 / 008), set by the server
    SalesLedgerCode?: string;

    AccessoryId: number;

    // The id used in links and API calls (uuid v7)
    PublicId: string;

    //===========================================================
    // Parent (locked after saving)
    //===========================================================

    ProductCategoryId: number;

    ProductSubCategoryId: number;

    //===========================================================
    // Accessory
    //===========================================================

    // Optional ('' when none)
    PartNumber: string;

    AccessoryName: string;

    Unit: string;

    ProductCode: string;

    //===========================================================
    // Inventory Ledgers
    //===========================================================

    InventoryLedgerCode: string;

    WipLedgerCode: string;

    CogsLedgerCode: string;

    //===========================================================
    // Stock Levels / Status
    //===========================================================

    ReorderLevel: number;

    RedLevel: number;


    // 0 = not set : a purchase order cannot take the

    // company stock above it

    MaxStockLevel: number;

    // SuperFast / Fast / Regular / Periodic / Slow (default Slow);
    // labels and colours : shared/inventory/storage-labels
    MovementClass: string;

    // For Sale (default) / Additional Accessories / Promotional
    // Accessories (see ACCESSORY_USES)
    AccessoryUse?: string;

    Remarks: string;

    IsActive: boolean;

    //===========================================================
    // Storage Locations (one per warehouse, optional)
    //===========================================================

    Locations: AccessoryLocation[];

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
    Fits?: AccessoryFit[];

    // "Y06, A10"
    FitsText?: string;

    // Edited on the form; sent on save (replaces the links)
    FitSubCategoryIds?: number[];
}


//===============================================================
// Fits Models : one other sub category (model)
//===============================================================

export interface AccessoryFit
{
    ProductSubCategoryId: number;

    SubCategoryCode: string;

    SubCategoryName: string;

    // The bike model ('' when the sub category has none)
    ModelName: string;
}


//===============================================================
// Create Accessories
//===============================================================

export interface CreateAccessories
{
    ProductCategoryId: number;

    ProductSubCategoryId: number;

    // Optional ('' when none)
    PartNumber: string;

    AccessoryName: string;

    Unit: string;

    ReorderLevel: number;

    RedLevel: number;


    // 0 = not set : a purchase order cannot take the

    // company stock above it

    MaxStockLevel: number;

    // SuperFast / Fast / Regular / Periodic / Slow (default Slow);
    // labels and colours : shared/inventory/storage-labels
    MovementClass: string;

    // For Sale (default) / Additional Accessories / Promotional
    // Accessories (see ACCESSORY_USES)
    AccessoryUse?: string;

    Remarks: string;

    IsActive: boolean;

    // Replaces the saved locations on every save
    Locations: AccessoryLocation[];

    // Fits Models : replaces the saved links (omit = keep them)
    FitSubCategoryIds?: number[];
}


//===============================================================
// Update Accessories
//===============================================================

export interface UpdateAccessories
    extends CreateAccessories
{
    AccessoryId: number;
}


//===============================================================
// Accessories Defaults (code preview for a sub category)
//===============================================================

export interface AccessoriesDefaults
{
    SalesLedgerCode?: string;

    Code: string;

    InventoryLedgerCode: string;

    WipLedgerCode: string;

    CogsLedgerCode: string;
}


//===============================================================
// List page query (server-side paging)
//===============================================================

export interface AccessoriesPageQuery
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

    // For Sale / Additional Accessories / Promotional Accessories
    // ('' = all)
    accessoryUse?:string;
}
