//===============================================================
// Product Transfer : models. Stock moves from one warehouse to
// another, one product type per document (MB / SP / AC), number
// TRF-<type>-0001.
//
//   Same branch   : one step. Post moves the stock at once
//                   (Completed); no journal.
//   Inter-branch  : two steps. Send (the post) takes the stock out
//                   of the From warehouse into transit and posts
//                   the TRF journal (Dr inventory of the To branch
//                   / Cr inventory of the From branch, the engine
//                   adds the Inter-Branch Current Account lines);
//                   the To branch then Receives it into the To
//                   warehouse (Received).
//
// Spare parts / accessories : batches are taken FIFO (oldest
// first) from the From warehouse; motor bikes : the bikes are
// picked by chassis no. Dates are yyyy-MM-dd.
//===============================================================


import
{
    binCode
}
from '../../../../shared/inventory/storage-labels';


export type ProductTransferType =
    'MB' | 'SP' | 'AC';

// Draft / In Transit / Completed / Received / Cancelled
export type ProductTransferStatus =
    'Draft' | 'In Transit' | 'Completed' | 'Received' | 'Cancelled';


//===============================================================
// List row
//===============================================================

export interface ProductTransferListRow
{
    Id:number;
    TransferNo:string;
    PageType:string;
    TransferDate:string;
    FromWarehouseName:string;
    FromBranchName:string;
    ToWarehouseName:string;
    ToBranchName:string;
    IsInterBranch:boolean;
    Status:string;
    LineCount:number;
    TotalQuantity:number;
    TotalValue:number;
    Remarks:string;
    // A deleted draft (shown for Restore)
    IsDeleted:boolean;
    CreatedByName:string;
    CreatedDate:string;
}


//===============================================================
// Defaults
//===============================================================

// A warehouse of General Settings › Warehouses (each belongs to a
// branch; one may be the central warehouse)
export interface ProductTransferWarehouse
{
    Id:number;
    Code:string;
    Name:string;
    BranchId:number;
    BranchName:string;
    IsCentral:boolean;
    // The branch's default warehouse
    IsDefault:boolean;
    // The branch runs this product type's business line today
    // (Business Configuration : wing core line or active grant)
    CanReceiveType:boolean;
    // Stock of this type is still on hand here (may be sent out
    // even after the line was revoked)
    HoldsTypeStock:boolean;
}

export interface ProductTransferBrand
{
    Id:number;
    Name:string;
}

export interface ProductTransferDefaults
{
    PageType:string;
    // yyyy-MM-dd business date
    Today:string;
    // TRF-<type>-0001 the next save takes (preview)
    NextNo:string;
    // The user's current branch (Receive belongs to the To branch)
    CurrentBranchId:number;
    Warehouses:ProductTransferWarehouse[];
    Brands:ProductTransferBrand[];
}


//===============================================================
// Stock on hand in a warehouse
//===============================================================

export interface ProductTransferStockBatch
{
    StockBatchId:number;
    BatchNo:string;
    // On hand in the warehouse
    Available:number;
    UnitCost:number;
    Mrp:number;
    // yyyy-MM-dd : FIFO order (oldest first)
    SourceDate:string;
}

// A motor bike on hand in the warehouse
export interface ProductTransferStockUnit
{
    MotorBikeUnitId:number;
    ChassisNo:string;
    EngineNo:string;
    Color:string;
    StockBatchId:number;
}

export interface ProductTransferStockProduct
{
    ProductId:number;
    Code:string;
    Name:string;
    PartNumber:string;
    Unit:string;
    BrandId:number;
    BrandName:string;
    CategoryId:number;
    // On hand in the warehouse (bikes : the units)
    Available:number;
    Batches:ProductTransferStockBatch[];
    // Motor bikes only
    Units:ProductTransferStockUnit[];
}


//===============================================================
// Places (rack / shelf / bin) in a warehouse. The BIN is the
// location : one item (spare part OR accessory) per bin. Shared
// by Mass Storing (same places shape).
//===============================================================

// The saved place of a product in the warehouse
export interface ProductTransferPlace
{
    ProductId:number;
    RackId:number;
    RackName:string;
    ShelfNo:number;
    ShelfLabel:string;
    BinNo:number;
    // A-03-05
    BinCode:string;
}

// One bin of a shelf (a bin not listed by the server is free)
export interface StorageBin
{
    BinNo:number;
    BinCode:string;
    BinLabel:string;
    IsFree:boolean;
    HeldByType:string;
    HeldById:number;
    HeldByCode:string;
    HeldByName:string;
    // The holder is a product of the page's type (HeldById = its
    // ProductId); false = the other type
    IsOwnType:boolean;
}

export interface StorageShelf
{
    ShelfNo:number;
    // SLF-A-03
    Label:string;
    BinCount:number;
    FreeBins:number;
    // At least one free bin
    IsFree:boolean;
    IsPrime:boolean;
    Bins:StorageBin[];
}

export interface ProductTransferRack
{
    Id:number;
    Code:string;
    Name:string;
    // "R-001 - Rack A" ("... (Full)" when no free bin)
    DisplayName:string;
    ZoneCode:string;
    ZoneName:string;
    ZonePriority:number;
    AssignmentText:string;
    ShelfCount:number;
    TotalBins:number;
    FreeBinCount:number;
    // Shelves with at least one free bin
    FreeShelves:number[];
    IsFull:boolean;
    Shelves:StorageShelf[];
}

// The racks of Mass Storing : the same shape
export type StorageRack =
    ProductTransferRack;

export interface ProductTransferPlaces
{
    Places:ProductTransferPlace[];
    Racks:ProductTransferRack[];
}


//===============================================================
// A document
//===============================================================

// A batch taken for a line (filled at post; a draft may hold the
// planned FIFO split or none)
export interface ProductTransferLineBatch
{
    StockBatchId:number;
    BatchNo:string;
    Quantity:number;
    UnitCost:number;
    Value:number;
}

// A motor bike of a line
export interface ProductTransferLineUnit
{
    MotorBikeUnitId:number;
    ChassisNo:string;
    EngineNo:string;
    StockBatchId:number;
}

export interface ProductTransferLine
{
    ProductTransferLineId:number;
    LineNo:number;
    ProductId:number;
    ProductCode:string;
    ProductName:string;
    PartNumber:string;
    Unit:string;
    Quantity:number;
    UnitCostAvg:number;
    Value:number;
    // Destination place in the To warehouse (SP / AC)
    ToRackId:number | null;
    ToRackName:string;
    ToShelfNo:number | null;
    ToShelfLabel:string;
    ToBinNo:number | null;
    // A-03-05
    ToBinCode:string;
    // Save the place as the product's location there
    SavePlace:boolean;
    Notes:string;
    Batches:ProductTransferLineBatch[];
    Units:ProductTransferLineUnit[];
}

export interface ProductTransferDetail
{
    Id:number;
    TransferNo:string;
    PageType:string;
    TransferDate:string;
    FromWarehouseId:number;
    FromWarehouseName:string;
    FromBranchId:number;
    FromBranchName:string;
    ToWarehouseId:number;
    ToWarehouseName:string;
    ToBranchId:number;
    ToBranchName:string;
    IsInterBranch:boolean;
    Remarks:string;
    Status:string;
    LineCount:number;
    TotalQuantity:number;
    TotalValue:number;
    // The TRF journal (inter-branch; '' for the same branch)
    VoucherNo:string;
    IsDeleted:boolean;
    CreatedByName:string;
    CreatedDate:string;
    PostedByName:string;
    PostedDate:string;
    ReceivedByName:string;
    ReceivedDate:string;
    // yyyy-MM-dd the To branch received it
    ReceiveDate:string;
    CancelledByName:string;
    CancelledDate:string;
    CancelReason:string;
    CanEdit:boolean;
    CanPost:boolean;
    CanReceive:boolean;
    CanCancel:boolean;
    Lines:ProductTransferLine[];
}

// The placeholder's name for a document
export type ProductTransfer =
    ProductTransferDetail;


//===============================================================
// Requests
//===============================================================

export interface ProductTransferLineInput
{
    ProductId:number;
    // Motor bikes : the number of bikes
    Quantity:number;
    // Motor bikes : the bikes picked by chassis
    UnitIds:number[];
    // Optional batch pick (none = FIFO)
    BatchIds?:number[];
    ToRackId:number | null;
    ToShelfNo:number | null;
    ToBinNo:number | null;
    SavePlace:boolean;
    Notes:string;
}

export interface CreateProductTransfer
{
    Type:string;
    TransferDate:string;
    FromWarehouseId:number;
    ToWarehouseId:number;
    Remarks:string;
    Lines:ProductTransferLineInput[];
}

// Same fields (draft only)
export type UpdateProductTransfer =
    CreateProductTransfer;


//===============================================================
// Product types, route, print key
//===============================================================

export interface ProductTransferTypeInfo
{
    type:ProductTransferType;
    title:string;
    // The type segment's short label
    segment:string;
    item:string;
    itemLower:string;
    icon:string;
    // Bikes : picked by chassis (whole units)
    bikes:boolean;
    // A rack / shelf in the To warehouse
    hasPlaces:boolean;
}

export const PRODUCT_TRANSFER_TYPES:
    ProductTransferTypeInfo[] =
[
    { type:'MB', title:'Motor Bikes', segment:'Motor Bikes', item:'Motor Bike', itemLower:'motor bikes', icon:'fas fa-motorcycle', bikes:true, hasPlaces:false },
    { type:'SP', title:'Spare Parts & Lubricants', segment:'Parts & Lubricant', item:'Spare Part / Lubricant', itemLower:'spare parts or lubricants', icon:'fas fa-oil-can', bikes:false, hasPlaces:true },
    { type:'AC', title:'Accessories', segment:'Accessories', item:'Accessory', itemLower:'accessories', icon:'fas fa-box-open', bikes:false, hasPlaces:true }
];

export function productTransferType
(
    type:
        string
):
    ProductTransferTypeInfo
{
    const key =
        String(type ?? '').trim().toUpperCase();

    return PRODUCT_TRANSFER_TYPES.find(x => x.type === key) ?? PRODUCT_TRANSFER_TYPES[1];
}

// Menu route of the page
export const PRODUCT_TRANSFER_ROUTE =
    '/inventory-management/stock-movement/product-transfer';

export const PRODUCT_TRANSFER_PRINT_KEY =
    'product-transfer';

// Quantities : 2 decimals for spare parts / accessories, whole
// bikes
export const PRODUCT_TRANSFER_QTY_DECIMALS =
    2;


//===============================================================
// FIFO preview (the server allocates again on post)
//===============================================================

export interface ProductTransferAllocation
{
    StockBatchId:number;
    BatchNo:string;
    Quantity:number;
    UnitCost:number;
    Value:number;
}

// Batches oldest first : source date, then id
export function fifoBatches
(
    batches:
        ProductTransferStockBatch[]
):
    ProductTransferStockBatch[]
{
    return [...(batches ?? [])]
        .filter(x => x.Available > 0)
        .sort
        (
            (a, b) =>
                (a.SourceDate || '').localeCompare(b.SourceDate || '')
                || a.StockBatchId - b.StockBatchId
        );
}

// A quantity taken from the batches, oldest first; short = the
// part no batch could give
export function fifoAllocate
(
    batches:
        ProductTransferStockBatch[],
    quantity:
        number
):
    { Allocations:ProductTransferAllocation[]; Value:number; Short:number }
{
    let left =
        roundQty(quantity);

    const out:
        ProductTransferAllocation[] = [];

    for
    (
        const batch of fifoBatches(batches)
    )
    {
        if
        (
            left <= 0
        )
        {
            break;
        }

        const take =
            roundQty(Math.min(left, batch.Available));

        if
        (
            take <= 0
        )
        {
            continue;
        }

        out.push
        ({
            StockBatchId:batch.StockBatchId,
            BatchNo:batch.BatchNo,
            Quantity:take,
            UnitCost:batch.UnitCost,
            Value:round2(take * batch.UnitCost)
        });

        left = roundQty(left - take);
    }

    return {
        Allocations:out,
        Value:round2(out.reduce((total, x) => total + x.Value, 0)),
        Short:Math.max(0, left)
    };
}

// Motor bikes : the picked units grouped by their batch
export function unitAllocate
(
    batches:
        ProductTransferStockBatch[],
    units:
        ProductTransferStockUnit[]
):
    { Allocations:ProductTransferAllocation[]; Value:number }
{
    const out:
        ProductTransferAllocation[] = [];

    for
    (
        const unit of units
    )
    {
        const batch =
            (batches ?? []).find(x => x.StockBatchId === unit.StockBatchId);

        const found =
            out.find(x => x.StockBatchId === unit.StockBatchId);

        const cost =
            batch?.UnitCost ?? 0;

        if
        (
            found
        )
        {
            found.Quantity += 1;

            found.Value = round2(found.Quantity * cost);
        }
        else
        {
            out.push
            ({
                StockBatchId:unit.StockBatchId,
                BatchNo:batch?.BatchNo ?? '',
                Quantity:1,
                UnitCost:cost,
                Value:round2(cost)
            });
        }
    }

    return {
        Allocations:out,
        Value:round2(out.reduce((total, x) => total + x.Value, 0))
    };
}


//===============================================================
// Journal (preview on the page / print; the server builds the
// real one on Send from Posting Setup)
//===============================================================

export interface ProductTransferJournalLine
{
    Ledger:string;
    Branch:string;
    Debit:number;
    Credit:number;
    // Added by the posting engine (inter-branch balancing)
    Engine:boolean;
}

// Inter-branch only : the inventory moves to the To branch at
// batch cost; the engine adds the Inter-Branch Current Account
// lines so that every branch balances
export function productTransferJournal
(
    typeTitle:
        string,
    fromBranch:
        string,
    toBranch:
        string,
    value:
        number
):
    ProductTransferJournalLine[]
{
    const amount =
        round2(value);

    if
    (
        !(amount > 0)
    )
    {
        return [];
    }

    const inventory =
        `Inventory · ${typeTitle}`;

    const current =
        'Inter-Branch Current Account';

    return [
        { Ledger:inventory, Branch:toBranch, Debit:amount, Credit:0, Engine:false },
        { Ledger:current, Branch:toBranch, Debit:0, Credit:amount, Engine:true },
        { Ledger:current, Branch:fromBranch, Debit:amount, Credit:0, Engine:true },
        { Ledger:inventory, Branch:fromBranch, Debit:0, Credit:amount, Engine:false }
    ];
}


//===============================================================
// Status texts
//===============================================================

// The banner / note of a status
export function productTransferStatusNote
(
    status:
        string,
    toBranchName:
        string
):
    string
{
    switch
    (
        status
    )
    {
        case 'In Transit':
            return `Waiting for ${toBranchName || 'the To branch'} to receive.`;

        case 'Completed':
            return 'Moved at once (same branch).';

        case 'Received':
            return `Received by ${toBranchName || 'the To branch'}.`;

        case 'Cancelled':
            return 'Cancelled : the stock movements were reversed.';

        default:
            return 'Draft : nothing moved yet.';
    }
}


//===============================================================
// Formatting
//===============================================================

export function round2
(
    value:
        number
):
    number
{
    return Math.round((Number(value) || 0) * 100) / 100;
}

export function roundQty
(
    value:
        number
):
    number
{
    return Math.round((Number(value) || 0) * 10000) / 10000;
}

// Date → yyyy-MM-dd (local)
export function toTransferIso
(
    date:
        Date
):
    string
{
    const pad =
        (value: number) =>
            String(value).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// yyyy-MM-dd → Date (local; invalid → null)
export function fromTransferIso
(
    iso:
        string
):
    Date | null
{
    const match =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');

    return match
        ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
        : null;
}

// yyyy-MM-dd → 01-Nov-2026
export function formatTransferDate
(
    iso:
        string
):
    string
{
    const match =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');

    if
    (
        !match
    )
    {
        return '';
    }

    const months =
        ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return `${match[3]}-${months[Number(match[2]) - 1] ?? match[2]}-${match[1]}`;
}

// 1200 → "1,200" ; 2.5 → "2.5"
export function formatTransferQty
(
    value:
        number
):
    string
{
    return (Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits:0, maximumFractionDigits:2 });
}

// 1200 → "1,200.00"
export function formatTransferMoney
(
    value:
        number
):
    string
{
    return (Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

// Unit cost : 2 to 4 decimals
export function formatTransferCost
(
    value:
        number
):
    string
{
    return (Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:4 });
}

// "Main Store · Dhaka" (· Central)
export function warehouseText
(
    name:
        string,
    branchName:
        string,
    isCentral:
        boolean = false
):
    string
{
    return [name, branchName, isCentral ? 'Central' : '']
        .filter(x => !!x)
        .join(' · ');
}

// The place of a line : the bin code "A-03-05" ('' = none). The
// server's code wins; else the shared storage-labels helper builds
// it (never hand-formatted)
export function placeText
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
    return serverCode || binCode(rackName, shelfNo, binNo);
}


//===============================================================
// Bins of a rack (places answer)
//===============================================================

export function rackShelf
(
    rack:
        StorageRack | null | undefined,
    shelfNo:
        number
):
    StorageShelf | null
{
    return rack?.Shelves.find(x => x.ShelfNo === shelfNo) ?? null;
}

// Bins on a shelf (no shelf row = 1 bin)
export function shelfBinCount
(
    rack:
        StorageRack | null | undefined,
    shelfNo:
        number
):
    number
{
    if
    (
        !rack || shelfNo < 1 || shelfNo > rack.ShelfCount
    )
    {
        return 0;
    }

    return Math.max(1, rackShelf(rack, shelfNo)?.BinCount || 1);
}

// The item on a bin NOW (null = free). A bin the server did not
// list is free; a shelf it did not list counts as free when it is
// one of FreeShelves
export function binHolder
(
    rack:
        StorageRack,
    shelfNo:
        number,
    binNo:
        number
):
    StorageBin | null
{
    const shelf =
        rackShelf(rack, shelfNo);

    if
    (
        !shelf
    )
    {
        return rack.FreeShelves.includes(shelfNo)
            ? null
            : { BinNo:binNo, BinCode:'', BinLabel:'', IsFree:false, HeldByType:'', HeldById:0, HeldByCode:'', HeldByName:'', IsOwnType:false };
    }

    const bin =
        shelf.Bins.find(x => x.BinNo === binNo);

    return bin && !bin.IsFree ? bin : null;
}

// The bin code of a place on a rack (server label first)
export function rackBinCode
(
    rack:
        StorageRack | null | undefined,
    shelfNo:
        number,
    binNo:
        number
):
    string
{
    const bin =
        rackShelf(rack, shelfNo)?.Bins.find(x => x.BinNo === binNo);

    return bin?.BinCode || binCode(rack?.Name ?? '', shelfNo, binNo);
}

// Search : every word must appear in the document
export function productTransferMatches
(
    row:
        ProductTransferListRow,
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
            row.TransferNo,
            row.TransferDate,
            formatTransferDate(row.TransferDate),
            productTransferType(row.PageType).title,
            row.FromWarehouseName,
            row.FromBranchName,
            row.ToWarehouseName,
            row.ToBranchName,
            row.IsInterBranch ? 'inter-branch' : 'same branch',
            row.Remarks,
            row.Status,
            row.IsDeleted ? 'deleted' : '',
            row.CreatedByName
        ]
        .join(' \u001f ')
        .toLowerCase();

    return words.every(word => text.includes(word));
}
