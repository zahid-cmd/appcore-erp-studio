//===============================================================
// Rack Management models
//
// Warehouse → Zone → Rack → Shelf → Bin. The BIN is the location
// (one bin holds ONE spare part or accessory).
//
// Labels (SLF-A-03, A-03-05, BIN-A-03-05) are built only by the
// shared helper src/shared/inventory/storage-labels.ts; the two
// functions below are re-exported from it so older imports keep
// working.
//===============================================================

export
{
    rackLetter,
    shelfLabel,
    binCode,
    binLabel,
    locationText
}
from '../../../../shared/inventory/storage-labels';


//===============================================================
// Rack Types
//===============================================================

export const RACK_TYPES:
    readonly string[] =
[
    'Open Shelf',
    'Closed Cabinet',
    'Bin Rack',
    'Pallet Rack'
];


// Highest number of shelves a rack may have
export const RACK_MAX_SHELVES:
    number =
    50;


// Highest number of bins on one shelf
export const RACK_MAX_BINS_PER_SHELF:
    number =
    60;


//===============================================================
// Rack Zone
//
// A part of one warehouse (Z-01 … per warehouse, built by the
// server). Priority 1 = nearest the counter (used by allocation).
//===============================================================

export interface RackZone
{
    RackZoneId: number;

    BranchId: number;

    WarehouseId: number;

    ZoneCode: string;

    ZoneName: string;

    Priority: number;

    Remarks: string;

    IsActive: boolean;

    //===========================================================
    // Display only (from the server)
    //===========================================================

    BranchName?: string;

    WarehouseCode?: string;

    WarehouseName?: string;

    RackCount?: number;
}


export interface CreateRackZone
{
    WarehouseId: number;

    ZoneName: string;

    Priority: number;

    Remarks: string;

    IsActive: boolean;
}


export interface UpdateRackZone
    extends CreateRackZone
{
    RackZoneId: number;
}


// Next zone code of a warehouse
export interface RackZoneDefaults
{
    Code: string;

    NextPriority: number;
}


//===============================================================
// Shelf (one row per shelf 1 … ShelfCount)
//===============================================================

export interface RackShelf
{
    ShelfNumber: number;

    BinCount: number;

    //===========================================================
    // Display only (from the server)
    //===========================================================

    ShelfLabel?: string;

    IsPrime?: boolean;
}


// Shelf sent on save
export interface RackShelfInput
{
    ShelfNumber: number;

    BinCount: number;
}


//===============================================================
// Assignment lookups (category → sub categories)
//===============================================================

export interface RackSubCategoryOption
{
    ProductSubCategoryId: number;

    SubCategoryCode: string;

    SubCategoryName: string;
}


export interface RackCategoryOption
{
    ProductCategoryId: number;

    CategoryCode: string;

    CategoryName: string;

    CategoryType: string;

    BrandName: string;

    SubCategories: RackSubCategoryOption[];
}


//===============================================================
// Rack Management
//
// One rack inside one warehouse (and one zone), with shelves
// (SLF-A-01 … SLF-A-nn), each with its own number of bins.
// Rack Code R-nnn is numbered per warehouse and built by the
// server. Category / Sub Categories = the allocation plan
// (none = General rack); Prime shelves = the best reach.
//===============================================================

export interface RackManagement
{
    // The id used in links and API calls (uuid v7)
    PublicId?:string;

    RackManagementId: number;

    //===========================================================
    // Location (Warehouse locked after saving)
    //===========================================================

    BranchId: number;

    WarehouseId: number;

    RackZoneId: number | null;

    //===========================================================
    // Rack
    //===========================================================

    RackCode: string;

    RackName: string;

    ShelfCount: number;

    Shelves: RackShelf[];

    // Legacy text, no longer shown (kept by the server)
    ZoneAisle: string;

    RackType: string;

    //===========================================================
    // Assignment (null category = General rack)
    //===========================================================

    ProductCategoryId: number | null;

    SubCategoryIds: number[];

    PrimeShelfFrom: number | null;

    PrimeShelfTo: number | null;

    Remarks: string;

    IsActive: boolean;

    //===========================================================
    // Display only (from the server)
    //===========================================================

    BranchName?: string;

    WarehouseCode?: string;

    WarehouseName?: string;

    // "<Warehouse Code>-R-001"
    FullRackCode?: string;

    RackLetter?: string;

    ZoneCode?: string;

    ZoneName?: string;

    ZonePriority?: number;

    CategoryCode?: string;

    CategoryName?: string;

    CategoryType?: string;

    SubCategories?: RackSubCategoryOption[];

    IsGeneral?: boolean;

    // "General" / "Bajaj Spare Parts" / "Bajaj Spare Parts (3 sub categories)"
    AssignmentText?: string;

    TotalBins?: number;

    // Items (spare parts + accessories) on the rack
    PartsPlaced?: number;
}


//===============================================================
// Create Rack Management
//===============================================================

export interface CreateRackManagement
{
    WarehouseId: number;

    // Ignored by the server (it names racks)
    RackName: string;

    ShelfCount: number;

    // Bins for a shelf missing from Shelves
    BinsPerShelf: number;

    // Always the full list 1 … ShelfCount
    Shelves: RackShelfInput[];

    RackZoneId: number | null;

    ProductCategoryId: number | null;

    SubCategoryIds: number[];

    PrimeShelfFrom: number | null;

    PrimeShelfTo: number | null;

    // null keeps the saved legacy text
    ZoneAisle: string | null;

    RackType: string;

    Remarks: string;

    IsActive: boolean;
}


//===============================================================
// Update Rack Management
//===============================================================

export interface UpdateRackManagement
    extends CreateRackManagement
{
    RackManagementId: number;
}


//===============================================================
// Rack Management Defaults (for a warehouse)
//===============================================================

export interface RackManagementDefaults
{
    Code: string;

    FullCode: string;

    // "Rack A" : lowest free letter in the warehouse
    Name: string;

    // The warehouse has at least one active zone
    ZoneRequired: boolean;

    // Active zones of the warehouse (priority order)
    Zones: RackZone[];

    // Assignable categories (Spare Parts / Lubricants / Accessories)
    Categories: RackCategoryOption[];

    MaxShelves: number;

    MaxBinsPerShelf: number;
}


//===============================================================
// Rack map : a rack with every shelf / bin and its holder
// (GET {id}/bins, GET bins?warehouseId=)
//===============================================================

export interface BinHolder
{
    RackManagementId: number;

    WarehouseId: number;

    ShelfNumber: number;

    BinNumber: number;

    // "Spare Part" / "Accessory"
    ItemType: string;

    ItemId: number;

    ProductCode: string;

    ItemName: string;
}


export interface RackMapBin
{
    BinNumber: number;

    // A-03-05
    BinCode: string;

    // BIN-A-03-05
    BinLabel: string;

    // No holder, or the holder is the item being edited
    IsFree: boolean;

    // Held by the item being edited
    IsOwn: boolean;

    Holder: BinHolder | null;
}


export interface RackMapShelf
{
    ShelfNumber: number;

    ShelfLabel: string;

    BinCount: number;

    IsPrime: boolean;

    FreeBins: number;

    Bins: RackMapBin[];
}


export interface RackMap
{
    RackManagementId: number;

    WarehouseId: number;

    WarehouseCode: string;

    RackCode: string;

    FullRackCode: string;

    RackName: string;

    RackLetter: string;

    RackType: string;

    IsActive: boolean;

    RackZoneId: number | null;

    ZoneCode: string;

    ZoneName: string;

    ZonePriority: number;

    ProductCategoryId: number | null;

    CategoryName: string;

    CategoryType: string;

    SubCategoryIds: number[];

    IsGeneral: boolean;

    AssignmentText: string;

    PrimeShelfFrom: number | null;

    PrimeShelfTo: number | null;

    ShelfCount: number;

    TotalBins: number;

    FreeBins: number;

    Shelves: RackMapShelf[];
}
