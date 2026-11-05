//===============================================================
// Mass Storing : models. Bulk placement of spare parts /
// accessories on racks and shelves inside ONE warehouse. Location
// only : no quantity change, no stock movement, no journal. One
// product type per document (SP / AC), number MST-<type>-0001.
//
//   Draft  : Save / Update keep the changed rows (editable,
//            deletable, restorable).
//   Posted : every line applied at once (the product's location
//            in the warehouse set, or cleared = Unplaced).
//   Cancelled : every product's previous location put back (all
//            or nothing).
//
// Only free bins (one item per bin, no swaps); two lines cannot
// target the same bin. Dates are yyyy-MM-dd.
//===============================================================

import
{
    formatTransferDate,
    formatTransferQty,
    fromTransferIso,
    placeText,
    ProductTransferPlace,
    StorageBin,
    StorageRack,
    StorageShelf,
    toTransferIso
}
from './product-transfer.model';


export type MassStoringType =
    'SP' | 'AC';

// Draft / Posted / Cancelled
export type MassStoringStatus =
    'Draft' | 'Posted' | 'Cancelled';


//===============================================================
// List row
//===============================================================

export interface MassStoringListRow
{
    Id:number;
    StoringNo:string;
    PageType:string;
    StoringDate:string;
    BranchId:number;
    BranchName:string;
    WarehouseId:number;
    WarehouseCode:string;
    WarehouseName:string;
    Status:string;
    LineCount:number;
    PlacedCount:number;
    ClearedCount:number;
    Remarks:string;
    // A deleted draft (shown for Restore)
    IsDeleted:boolean;
    CreatedByName:string;
    CreatedDate:string;
    PostedDate:string;
}


//===============================================================
// Defaults
//===============================================================

// A warehouse whose branch runs the type's business line today
export interface MassStoringWarehouse
{
    Id:number;
    Code:string;
    Name:string;
    BranchId:number;
    BranchName:string;
    IsDefault:boolean;
    CanReceiveType:boolean;
}

export interface MassStoringBrand
{
    Id:number;
    Name:string;
}

export interface MassStoringCategory
{
    Id:number;
    Name:string;
    BrandId:number;
    BrandName:string;
}

export interface MassStoringDefaults
{
    PageType:string;
    // yyyy-MM-dd business date
    Today:string;
    // MST-<type>-0001 the next save takes (preview)
    NextNo:string;
    CurrentBranchId:number;
    CurrentBranchName:string;
    // The login branch's warehouse running the line (0 = none)
    DefaultWarehouseId:number;
    Warehouses:MassStoringWarehouse[];
    Brands:MassStoringBrand[];
    Categories:MassStoringCategory[];
}


//===============================================================
// Grid source : the products of the warehouse
//===============================================================

export interface MassStoringProduct
{
    ProductId:number;
    Code:string;
    Name:string;
    PartNumber:string;
    Unit:string;
    BrandId:number;
    BrandName:string;
    CategoryId:number;
    CategoryName:string;
    // Rack plan / overview : sub category and movement class
    SubCategoryId:number;
    SubCategoryName:string;
    // SuperFast / Fast / Regular / Periodic / Slow
    MovementClass:string;
    // 1 fastest .. 5 slow
    MovementRank:number;
    // On hand in the warehouse (0 = no stock, listed by the switch)
    Stock:number;
    // Its location in the warehouse now (null = Unplaced)
    RackId:number | null;
    RackCode:string;
    RackName:string;
    ShelfNo:number | null;
    ShelfLabel:string;
    // The bin (the location) : null = Unplaced
    BinNo:number | null;
    // A-03-05
    BinCode:string;
    Location:string;
    IsPlaced:boolean;
}


//===============================================================
// Racks and shelves of the warehouse
//===============================================================

// A bin with its holder (the Product Transfer shape) plus what the
// Rack Overview shows of an item that is not a row of the grid
export interface MassStoringBin
    extends StorageBin
{
    HeldBySubCategoryId:number;
    HeldBySubCategoryName:string;
    HeldByMovementClass:string;
    HeldByPartNumber:string;
    // On hand in this warehouse (0 = none)
    HeldByStock:number;
}

export interface MassStoringShelf
    extends Omit<StorageShelf, 'Bins'>
{
    Bins:MassStoringBin[];
}

// The racks : Racks → Shelves → Bins with their holders (the
// Product Transfer places shape) plus the rack plan (assignment,
// prime range) for "Allocate by rack plan"
export interface MassStoringRack
    extends Omit<StorageRack, 'Shelves'>
{
    // null + IsGeneral = General rack
    ProductCategoryId:number | null;
    CategoryName:string;
    // [] = the whole category
    SubCategoryIds:number[];
    SubCategoryNames:string[];
    IsGeneral:boolean;
    PrimeShelfFrom:number | null;
    PrimeShelfTo:number | null;
    RackLetter:string;
    IsActive:boolean;
    Shelves:MassStoringShelf[];
}

// A product's saved place (with its bin)
export type MassStoringPlace =
    ProductTransferPlace;

export interface MassStoringPlaces
{
    Places:MassStoringPlace[];
    Racks:MassStoringRack[];
}


//===============================================================
// A document
//===============================================================

export interface MassStoringLine
{
    MassStoringLineId:number;
    LineNo:number;
    ProductId:number;
    ProductCode:string;
    ProductName:string;
    PartNumber:string;
    Unit:string;
    // Stock when saved (display only)
    StockQuantity:number;
    // The location before (when saved / when posted)
    FromRackId:number | null;
    FromRackCode:string;
    FromRackName:string;
    FromShelfNo:number | null;
    FromShelfLabel:string;
    FromBinNo:number | null;
    FromBinCode:string;
    FromLocation:string;
    // The new location (null = Unplaced)
    ToRackId:number | null;
    ToRackCode:string;
    ToRackName:string;
    ToShelfNo:number | null;
    ToShelfLabel:string;
    ToBinNo:number | null;
    ToBinCode:string;
    ToLocation:string;
    // The line clears the product's location (Unplaced)
    IsClear:boolean;
    Notes:string;
}

export interface MassStoringDetail
{
    Id:number;
    StoringNo:string;
    PageType:string;
    StoringDate:string;
    BranchId:number;
    BranchName:string;
    WarehouseId:number;
    WarehouseCode:string;
    WarehouseName:string;
    Remarks:string;
    Status:string;
    LineCount:number;
    PlacedCount:number;
    ClearedCount:number;
    IsDeleted:boolean;
    CreatedByName:string;
    CreatedDate:string;
    PostedByName:string;
    PostedDate:string;
    CancelledByName:string;
    CancelledDate:string;
    CancelReason:string;
    CanEdit:boolean;
    CanPost:boolean;
    CanCancel:boolean;
    // Posted but not cancellable now : the conflicts
    CancelBlockedReason:string;
    Lines:MassStoringLine[];
}

// The placeholder's name for a document
export type MassStoring =
    MassStoringDetail;


//===============================================================
// Requests (only the changed rows)
//===============================================================

export interface MassStoringLineInput
{
    ProductId:number;
    // null = Unplaced (clear the location)
    ToRackId:number | null;
    ToShelfNo:number | null;
    ToBinNo:number | null;
    Notes:string;
}

export interface CreateMassStoring
{
    Type:string;
    StoringDate:string;
    WarehouseId:number;
    Remarks:string;
    Lines:MassStoringLineInput[];
}

// Same fields (draft only)
export type UpdateMassStoring =
    CreateMassStoring;


//===============================================================
// Product types, route, print key
//===============================================================

export interface MassStoringTypeInfo
{
    type:MassStoringType;
    title:string;
    // The type segment's short label
    segment:string;
    item:string;
    itemLower:string;
    icon:string;
}

export const MASS_STORING_TYPES:
    MassStoringTypeInfo[] =
[
    { type:'SP', title:'Spare Parts & Lubricants', segment:'Parts & Lubricant', item:'Spare Part / Lubricant', itemLower:'spare parts or lubricants', icon:'fas fa-oil-can' },
    { type:'AC', title:'Accessories', segment:'Accessories', item:'Accessory', itemLower:'accessories', icon:'fas fa-box-open' }
];

export function massStoringType
(
    type:
        string
):
    MassStoringTypeInfo
{
    const key =
        String(type ?? '').trim().toUpperCase();

    return MASS_STORING_TYPES.find(x => x.type === key) ?? MASS_STORING_TYPES[0];
}

// Menu route of the page
export const MASS_STORING_ROUTE =
    '/inventory-management/stock-movement/mass-storing';

export const MASS_STORING_PRINT_KEY =
    'mass-storing';

// Rack Overview : the shelf map (the id is the page's token)
export const MASS_STORING_RACK_MAP_PRINT_KEY =
    'mass-storing-rack-map';

// "No change" / "Unplaced" in the New Rack dropdown
export const MASS_STORING_NO_CHANGE =
    0;

export const MASS_STORING_UNPLACED =
    -1;


//===============================================================
// Texts
//===============================================================

// The banner / note of a status
export function massStoringStatusNote
(
    status:
        string
):
    string
{
    switch
    (
        status
    )
    {
        case 'Posted':
            return 'Posted : every location is applied in the warehouse.';

        case 'Cancelled':
            return 'Cancelled : the previous locations were put back.';

        default:
            return 'Draft : no location changed yet.';
    }
}

// A location : the bin code "A-03-05" ('' = Unplaced); the
// server's code first, else the shared storage-labels helper
export function storingLocationText
(
    rackName:
        string,
    shelfNo:
        number | null,
    binNo:
        number | null,
    serverCode:
        string = ''
):
    string
{
    return placeText(rackName, shelfNo, binNo, serverCode);
}

// The database is WIN1252 : arrows, smart quotes, dashes and any
// character it cannot hold are replaced before sending
export function win1252Safe
(
    value:
        string
):
    string
{
    const replaced =
        String(value ?? '')
            .replace(/[→⇒➝⟶]/g, '->')
            .replace(/[←⇐⟵]/g, '<-')
            .replace(/[‘’‚′]/g, '\'')
            .replace(/[“”„″]/g, '"')
            .replace(/[–—−]/g, '-')
            .replace(/…/g, '...')
            .replace(/[   ]/g, ' ')
            .replace(/[★☆]/g, '*');

    // Windows-1252 : Latin-1 plus the 0x80-0x9F extras
    const extras =
        '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';

    return [...replaced]
        .map(ch => ch.charCodeAt(0) <= 0xFF || extras.includes(ch) ? ch : '?')
        .join('');
}


//===============================================================
// Formatting (the Product Transfer helpers)
//===============================================================

export const toStoringIso =
    toTransferIso;

export const fromStoringIso =
    fromTransferIso;

export const formatStoringDate =
    formatTransferDate;

export const formatStoringQty =
    formatTransferQty;

// "Uttara Store · Uttara"
export function storingWarehouseText
(
    name:
        string,
    branchName:
        string
):
    string
{
    return [name, branchName].filter(x => !!x).join(' · ');
}

// Search : every word must appear in the document
export function massStoringMatches
(
    row:
        MassStoringListRow,
    search:
        string
):
    boolean
{
    const words =
        (search ?? '').trim().toLowerCase().split(/\s+/).filter(x => !!x);

    if
    (
        words.length === 0
    )
    {
        return true;
    }

    const text =
        [
            row.StoringNo,
            row.StoringDate,
            formatTransferDate(row.StoringDate),
            massStoringType(row.PageType).title,
            row.WarehouseCode,
            row.WarehouseName,
            row.BranchName,
            row.Remarks,
            row.Status,
            row.IsDeleted ? 'deleted' : '',
            row.CreatedByName
        ]
        .join(' \u001f ')
        .toLowerCase();

    return words.every(word => text.includes(word));
}
