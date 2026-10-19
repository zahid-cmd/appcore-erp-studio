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
// One per warehouse : Warehouse → Rack → Shelf number (1 … the
// rack's shelf count, shown as S-01 …).
//===============================================================

export interface SparePartLocation
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
// Spare Parts
//
// One Spare Part = one part number inside a Product Sub Category.
// Codes are built by the server; Part Number and Part Name are
// typed. Part Number is unique within the brand (category),
// ignoring spaces, hyphens, dots and case.
//===============================================================

export interface SpareParts
{
    SparePartId: number;

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

    // "WH-001: R-001 / S-03, WH-002: R-002 / S-01"
    LocationsText?: string;

    CategoryCode?: string;

    CategoryName?: string;

    BrandName?: string;

    SubCategoryCode?: string;

    SubCategoryName?: string;
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

    Remarks: string;

    IsActive: boolean;

    // Replaces the saved locations on every save
    Locations: SparePartLocation[];
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
// Spare Parts Defaults (code preview for a sub category)
//===============================================================

export interface SparePartsDefaults
{
    Code: string;

    InventoryLedgerCode: string;

    WipLedgerCode: string;

    CogsLedgerCode: string;
}