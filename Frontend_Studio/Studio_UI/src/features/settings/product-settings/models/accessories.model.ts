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
// Accessory Location
//
// One per warehouse : Warehouse → Rack → Shelf number (1 … the
// rack's shelf count, shown as SLF-A-01 …).
//===============================================================

export interface AccessoryLocation
{
    WarehouseId: number;

    RackManagementId: number;

    ShelfNumber: number;

    //===========================================================
    // Display only (from the server)
    //===========================================================

    WarehouseCode?: string;

    WarehouseName?: string;

    RackCode?: string;

    RackName?: string;

    // "WH-001: R-001 / S-03"
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
    AccessoryId: number;

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

    Remarks: string;

    IsActive: boolean;

    //===========================================================
    // Storage Locations (one per warehouse, optional)
    //===========================================================

    Locations: AccessoryLocation[];

    //===========================================================
    // Display only (from the server)
    //===========================================================

    // "WH-001: R-001 / S-03, WH-002: R-002 / S-01"
    LocationsText?: string;

    CategoryCode?: string;

    CategoryName?: string;

    BrandName?: string;

    SubCategoryCode?: string;

    SubCategoryName?: string;
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

    Remarks: string;

    IsActive: boolean;

    // Replaces the saved locations on every save
    Locations: AccessoryLocation[];
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
    Code: string;

    InventoryLedgerCode: string;

    WipLedgerCode: string;

    CogsLedgerCode: string;
}