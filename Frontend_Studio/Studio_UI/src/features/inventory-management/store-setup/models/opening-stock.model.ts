//===============================================================
// Opening Stock : models. One document = one warehouse + one
// product type (MB / SP / AC). Dates are yyyy-MM-dd.
//===============================================================

export type OpeningStockType =
    'MB' | 'SP' | 'AC';


//===============================================================
// A document (list row; lines and bikes when opened)
//===============================================================

export interface OpeningStockLine
{
    OpeningStockLineId:number;
    LineNo:number;
    ProductId:number;
    ProductCode:string;
    ProductName:string;
    Unit:string;
    Quantity:number;
    UnitCost:number;
    LineValue:number;
    // VAT inclusive
    SalePrice:number;
    Mrp:number;
    // MRP basis : supplier margin on MRP
    MarginPercent:number;
    // Cost incl. VAT, the rate taken out and the line's VAT
    GrossUnitCost:number;
    VatRate:number;
    VatAmount:number;
    RackManagementId:number | null;
    RackCode:string;
    ShelfNumber:number;
    SaveAsDefault:boolean;
    ShortNotes:string;
    BatchNo:string;
}

export interface OpeningStockUnit
{
    ProductId:number;
    ChassisNo:string;
    EngineNo:string;
    KeyNo:string;
    BatteryNo:string;
}

export interface OpeningStock
{
    OpeningStockId:number;
    PageType:string;
    OpeningNo:string;
    OpeningDate:string;
    BranchId:number;
    BranchCode:string;
    BranchName:string;
    WarehouseId:number;
    WarehouseName:string;
    // Cost / MRP
    CostBasis:string;
    // Journal voucher number (given on post)
    JournalNo:string;
    // Includes Unclaimed VAT : the VAT carried to the VAT Current Account
    VatIncluded:boolean;
    TotalVat:number;
    LedgerCode:string;
    LedgerName:string;
    Remarks:string;
    TotalQuantity:number;
    TotalValue:number;
    LineCount:number;
    // Draft / Posted / Cancelled
    Status:string;
    PostedDate:string;
    CancelReason:string;
    CancelledDate:string;
    CreatedDate:string;
    Lines:OpeningStockLine[];
    Units:OpeningStockUnit[];
}


//===============================================================
// Defaults
//===============================================================

export interface OpeningStockBranch
{
    Id:number;
    Code:string;
    Name:string;
    // OS-<code>-<type>-0001
    NextNumber:string;
}

export interface OpeningStockVatRule
{
    VatType:string;
    Rate:number;
    InputCreditAllowed:boolean;
    EffectiveFrom:string;
    ValidTo:string;
}

export interface OpeningStockWarehouse
{
    Id:number;
    BranchId:number;
    BranchName:string;
    Code:string;
    Name:string;
    IsDefault:boolean;
}

export interface OpeningStockRack
{
    Id:number;
    WarehouseId:number;
    Code:string;
    Name:string;
    ShelfCount:number;
}

export interface OpeningStockShelf
{
    WarehouseId:number;
    RackManagementId:number;
    ShelfNumber:number;
}

export interface OpeningStockProduct
{
    Id:number;
    Code:string;
    Name:string;
    Unit:string;
    CategoryName:string;
    SubCategoryName:string;
    // Has an Inventory ledger (needed to post)
    HasLedger:boolean;
    LastCost:number;
    LastSalePrice:number;
    LastMrp:number;
    // Motor Bikes / Spare Parts / Lubricants / Accessories
    VatType:string;
    Shelves:OpeningStockShelf[];
}

export interface OpeningStockLedger
{
    Code:string;
    Name:string;
}

export interface OpeningStockDefaults
{
    PageType:string;
    Today:string;
    // Lock Opening Stock Ledger : the credit ledger is the Posting
    // Setup one, not changeable
    LedgerLocked:boolean;
    // Includes Unclaimed VAT (switch of the type) : cost typed incl.
    // VAT, the VAT part to the VAT Current Account
    VatIncluded:boolean;
    Branches:OpeningStockBranch[];
    Warehouses:OpeningStockWarehouse[];
    Racks:OpeningStockRack[];
    Products:OpeningStockProduct[];
    Ledgers:OpeningStockLedger[];
    // Posting Setup › Opening Stock ('' = not set)
    DefaultLedgerCode:string;
    // MB : Key & Battery Required
    UnitsRequired:boolean;
    UniqueKeyNo:boolean;
    UniqueBatteryNo:boolean;
    // VAT : cost excl. VAT; MRP / sale price incl. VAT
    PurchaseVatApplicable:boolean;
    SalesVatApplicable:boolean;
    PurchaseVatRules:OpeningStockVatRule[];
    SalesVatRules:OpeningStockVatRule[];
}


//===============================================================
// Save
//===============================================================

export interface CreateOpeningStockLine
{
    ProductId:number;
    Quantity:number;
    UnitCost:number;
    SalePrice:number;
    Mrp:number;
    MarginPercent:number;
    RackManagementId:number | null;
    ShelfNumber:number;
    SaveAsDefault:boolean;
    ShortNotes:string;
}

export interface CreateOpeningStock
{
    PageType:string;
    OpeningDate:string;
    BranchId:number;
    WarehouseId:number;
    CostBasis:string;
    LedgerCode:string;
    Remarks:string;
    Lines:CreateOpeningStockLine[];
    Units:OpeningStockUnit[];
}

export interface OpeningStockSaved
{
    OpeningStockId:number;
    OpeningNo:string;
    Status:string;
}

export interface OpeningStockUnitTaken
{
    Field:string;
    Value:string;
    Message:string;
}


//===============================================================
// Product types
//===============================================================

export interface OpeningStockTypeInfo
{
    type:OpeningStockType;
    title:string;
    // Add card / summary : "Add Motor Bike", "No motor bikes yet"
    item:string;
    itemLower:string;
    icon:string;
    // Whole units (bikes) / rack · shelf placement
    wholeUnits:boolean;
    hasShelves:boolean;
}

export const OPENING_STOCK_TYPES:
    OpeningStockTypeInfo[] =
[
    {
        type:'MB',
        title:'Motor Bikes',
        item:'Motor Bike',
        itemLower:'motor bikes',
        icon:'fas fa-motorcycle',
        wholeUnits:true,
        hasShelves:false
    },
    {
        type:'SP',
        title:'Spare Parts & Lubricants',
        item:'Spare Part / Lubricant',
        itemLower:'spare parts or lubricants',
        icon:'fas fa-oil-can',
        wholeUnits:false,
        hasShelves:true
    },
    {
        type:'AC',
        title:'Accessories',
        item:'Accessory',
        itemLower:'accessories',
        icon:'fas fa-box-open',
        wholeUnits:false,
        hasShelves:true
    }
];

export function openingStockType
(
    type:
        string
):
    OpeningStockTypeInfo
{
    const key =
        String(type ?? '').trim().toUpperCase();

    return OPENING_STOCK_TYPES.find(x => x.type === key) ?? OPENING_STOCK_TYPES[0];
}

// Menu route of the page
export const OPENING_STOCK_ROUTE =
    '/inventory-management/store-setup/opening-stock';

export const OPENING_STOCK_PRINT_KEY =
    'opening-stock';


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
export function formatOpeningDate
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
export function formatOpeningQty
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

// 1200 → "1,200.00"
export function formatOpeningMoney
(
    value:
        number
):
    string
{
    return (Number(value) || 0).toLocaleString(
        'en-US',
        {
            minimumFractionDigits:2,
            maximumFractionDigits:2
        }
    );
}

// Unit cost : 2 to 4 decimals
export function formatOpeningCost
(
    value:
        number
):
    string
{
    return (Number(value) || 0).toLocaleString(
        'en-US',
        {
            minimumFractionDigits:2,
            maximumFractionDigits:4
        }
    );
}

// The VAT rule of a type on a date (none → null)
export function vatRuleOn
(
    rules:
        OpeningStockVatRule[],
    vatType:
        string,
    iso:
        string
):
    OpeningStockVatRule | null
{
    return rules
        .filter(x => x.VatType === vatType && x.EffectiveFrom <= iso && x.ValidTo >= iso)
        .sort((a, b) => b.EffectiveFrom.localeCompare(a.EffectiveFrom))[0] ?? null;
}

// MRP basis : DP = MRP × (1 − margin) ; cost = DP excl. VAT
// (4 decimals, as the server)
export function costFromMrp
(
    mrp:
        number,
    marginPercent:
        number,
    vatRate:
        number
):
    number
{
    const value =
        mrp * (1 - marginPercent / 100) / (1 + vatRate / 100);

    return Math.round(value * 10000) / 10000;
}

// Search : every word must appear in the document
export function openingStockMatches
(
    row:
        OpeningStock,
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
            row.OpeningNo,
            row.OpeningDate,
            formatOpeningDate(row.OpeningDate),
            openingStockType(row.PageType).title,
            row.BranchName,
            row.BranchCode,
            row.WarehouseName,
            row.LedgerName,
            row.Remarks,
            row.Status
        ]
        .join(' \u001f ')
        .toLowerCase();

    return words.every(word => text.includes(word));
}
