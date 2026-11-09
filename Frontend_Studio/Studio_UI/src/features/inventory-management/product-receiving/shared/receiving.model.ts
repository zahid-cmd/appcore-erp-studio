//===============================================================
// Product Receiving : models (shared by Motor Bike / Spare Parts
// & Lubricants / Accessories Receiving). Dates are yyyy-MM-dd.
//===============================================================

export type ReceivingType =
    'MB' | 'SP' | 'AC';


//===============================================================
// A receiving (list row; lines and bikes when opened)
//===============================================================

export interface ReceivingLine
{
    ReceivingLineId:number;
    LineNo:number;
    PurchaseLineId:number;
    StockBatchId:number;
    BatchNo:string;
    ProductId:number;
    ProductCode:string;
    ProductName:string;
    Unit:string;
    PurchasedQuantity:number;
    ReceivedBefore:number;
    Quantity:number;
    RackManagementId:number | null;
    RackCode:string;
    ShelfNumber:number;
    // The bin (the location; 0 = no place)
    BinNumber:number;
    // SLF-A-03 / A-03-05
    ShelfLabel:string;
    BinCode:string;
    ShortNotes:string;
}

export interface ReceivingUnit
{
    PurchaseLineId:number;
    ChassisNo:string;
    EngineNo:string;
    KeyNo:string;
    BatteryNo:string;
    // CKD documents in hand / on the portal : 'Yes' / 'No'
    CkdStatus?:string;
    // Year of manufacture (default : the purchase date's year)
    ManufactureYear?:number | null;
}

export interface Receiving
{
    // The id used in links and API calls (uuid v7)
    PublicId?:string;

    ReceivingId:number;
    PageType:string;
    ReceivingNo:string;
    ReceivingDate:string;
    BranchId:number;
    BranchName:string;
    WarehouseId:number;
    WarehouseName:string;
    PurchaseId:number;
    PurchaseNo:string;
    PurchaseDate:string;
    SupplierCode:string;
    SupplierName:string;
    SupplierInvoiceNo:string;
    MushakNo:string;
    DoReference:string;
    GatePassNo:string;
    ReceivedBy:string;
    Remarks:string;
    // 'Receiving' (made on this page) / 'Purchase' (made by the
    // purchase, stock received with it : read only here)
    ReceivedOn:string;
    TotalQuantity:number;
    LineCount:number;
    Status:string;
    CancelReason:string;
    CancelledDate:string;
    CreatedDate:string;
    Lines:ReceivingLine[];
    Units:ReceivingUnit[];
    // MB : free accessories received on it
    Accessories:ReceivingAccessoryLine[];
}


//===============================================================
// Defaults
//===============================================================

export interface ReceivingWarehouse
{
    Id:number;
    BranchId:number;
    Code:string;
    Name:string;
    IsDefault:boolean;
}

export interface ReceivingRack
{
    Id:number;
    WarehouseId:number;
    Code:string;
    Name:string;
    ShelfCount:number;
    ZoneCode:string;
    ZoneName:string;
    // Bins per shelf
    Shelves:{ ShelfNumber:number; ShelfLabel:string; BinCount:number }[];
}

export interface ReceivingDefaults
{
    PageType:string;
    Today:string;
    BranchId:number;
    BranchName:string;
    FinancialYearName:string;
    NextNumber:string;
    BackDatedAllowed:boolean;
    BackDatedDays:number;
    ShelfRequired:boolean;
    UnitsRequired:boolean;
    UniqueKeyNo:boolean;
    UniqueBatteryNo:boolean;
    Warehouses:ReceivingWarehouse[];
    Racks:ReceivingRack[];
    Message:string;
}


//===============================================================
// Purchases waiting to be received
//===============================================================

// The product's saved default place in a warehouse
export interface ReceivingShelf
{
    WarehouseId:number;
    RackManagementId:number;
    ShelfNumber:number;
    BinNumber:number;
    // A-03-05
    BinCode:string;
}

export interface ReceivingPurchaseLine
{
    PurchaseLineId:number;
    LineNo:number;
    StockBatchId:number;
    BatchNo:string;
    ProductId:number;
    ProductCode:string;
    ProductName:string;
    Unit:string;
    PurchasedQuantity:number;
    ReceivedBefore:number;
    PendingQuantity:number;
    Shelves:ReceivingShelf[];
}

export interface ReceivingPurchase
{
    PurchaseId:number;
    PurchaseNo:string;
    PurchaseDate:string;
    BranchId:number;
    SupplierCode:string;
    SupplierName:string;
    SupplierInvoiceNo:string;
    MushakNo:string;
    DoReference:string;
    GatePassNo:string;
    PurchasedQuantity:number;
    PendingQuantity:number;
    ReceivingStatus:string;
    Lines:ReceivingPurchaseLine[];
    // MB : free accessories still due from the supplier
    AccessoryPendingQuantity:number;
    Accessories:ReceivingAccessoryDue[];
}


//===============================================================
// MB : free accessories due from the supplier (Bike Accessory
// Schemes, Supplier source)
//===============================================================

export interface ReceivingAccessoryDue
{
    PurchaseAccessoryDueId:number;
    SchemeCode:string;
    SchemeName:string;
    // Additional / Promotional
    SchemeKind:string;
    AccessoryId:number;
    ProductCode:string;
    AccessoryName:string;
    Unit:string;
    QuantityDue:number;
    ReceivedBefore:number;
    QuantityClosed:number;
    PendingQuantity:number;
}

export interface ReceivingAccessoryLine
{
    PurchaseAccessoryDueId:number;
    SchemeCode:string;
    SchemeKind:string;
    AccessoryId:number;
    ProductCode:string;
    AccessoryName:string;
    Unit:string;
    Quantity:number;
    BatchNo:string;
}

export interface CreateReceivingAccessory
{
    PurchaseAccessoryDueId:number;
    Quantity:number;
}


//===============================================================
// Save
//===============================================================

export interface CreateReceivingLine
{
    PurchaseLineId:number;
    Quantity:number;
    RackManagementId:number | null;
    ShelfNumber:number;
    BinNumber:number;
    SaveAsDefault:boolean;
    ShortNotes:string;
}

export interface CreateReceiving
{
    ReceivingDate:string;
    BranchId:number;
    WarehouseId:number;
    PurchaseId:number;
    ReceivedBy:string;
    Remarks:string;
    Lines:CreateReceivingLine[];
    Units:ReceivingUnit[];
    // MB : free accessories received now
    Accessories?:CreateReceivingAccessory[];
}

export interface ReceivingUnitTaken
{
    Field:string;
    Value:string;
    Message:string;
}


//===============================================================
// Page config (route data / wrapper)
//===============================================================

export interface ReceivingPageConfig
{
    type:ReceivingType;
    // API + route segment
    path:string;
    // Menu route
    route:string;
    title:string;
    subtitle:string;
    icon:string;
    itemWord:string;
    // Add card / summary : "Add Motor Bike", "No motor bikes yet"
    item:string;
    itemLower:string;
    itemIcon:string;
    printKey:string;
    // Whole units (bikes) / rack · shelf · bin placement
    wholeUnits:boolean;
    hasShelves:boolean;
}

const CONFIGS:
    Record<ReceivingType, ReceivingPageConfig> =
{
    MB:
    {
        type:'MB',
        path:'motor-bike-receiving',
        route:'/inventory-management/product-receiving/motor-bike-receiving',
        title:'Motor Bike Receiving',
        subtitle:'Product Receiving : bikes of posted purchases into the warehouse, with their numbers',
        icon:'fas fa-truck-ramp-box',
        itemWord:'bike',
        item:'Motor Bike',
        itemLower:'motor bikes',
        itemIcon:'fas fa-motorcycle',
        printKey:'motor-bike-receiving',
        wholeUnits:true,
        hasShelves:false
    },

    SP:
    {
        type:'SP',
        path:'spare-parts-lubricants-receiving',
        route:'/inventory-management/product-receiving/spare-parts-lubricants-receiving',
        title:'Spare Parts & Lubricants Receiving',
        subtitle:'Product Receiving : parts and lubricants of posted purchases into the warehouse and shelf',
        icon:'fas fa-oil-can',
        itemWord:'part',
        item:'Spare Part / Lubricant',
        itemLower:'spare parts or lubricants',
        itemIcon:'fas fa-oil-can',
        printKey:'spare-parts-lubricants-receiving',
        wholeUnits:false,
        hasShelves:true
    },

    AC:
    {
        type:'AC',
        path:'accessories-receiving',
        route:'/inventory-management/product-receiving/accessories-receiving',
        title:'Accessories Receiving',
        subtitle:'Product Receiving : accessories of posted purchases into the warehouse and shelf',
        icon:'fas fa-box-open',
        itemWord:'accessory',
        item:'Accessory',
        itemLower:'accessories',
        itemIcon:'fas fa-box-open',
        printKey:'accessories-receiving',
        wholeUnits:false,
        hasShelves:true
    }
};

export function receivingConfig
(
    type:
        string
):
    ReceivingPageConfig
{
    const key =
        String(type ?? '').trim().toUpperCase() as ReceivingType;

    return CONFIGS[key] ?? CONFIGS.SP;
}


//===============================================================
// Helpers
//===============================================================

// Date → yyyy-MM-dd (local)
export function toIsoDate
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
export function fromIsoDate
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

// yyyy-MM-dd → 31-Oct-2026
export function formatReceivingDate
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
export function formatReceivingQty
(
    value:
        number
):
    string
{
    return (Number(value) || 0).toLocaleString(
        'en-US',
        {
            minimumFractionDigits:0,
            maximumFractionDigits:2
        }
    );
}

// Search : every word must appear in the receiving
export function receivingMatches
(
    row:
        Receiving,
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
            row.ReceivingNo,
            row.ReceivingDate,
            formatReceivingDate(row.ReceivingDate),
            row.PurchaseNo,
            row.SupplierName,
            row.SupplierInvoiceNo,
            row.MushakNo,
            row.WarehouseName,
            row.ReceivedBy,
            row.Remarks,
            row.Status
        ]
        .join(' \u001f ')
        .toLowerCase();

    return words.every(word => text.includes(word));
}
