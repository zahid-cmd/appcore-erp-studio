//===============================================================
// Product Ledgers : models
//
// The stock history of one product type (MB / SP / AC) :
// statement of one product, or a summary of the products.
// Dates are yyyy-MM-dd; ids 0 = all.
//===============================================================

export type ProductLedgerType =
    'MB' | 'SP' | 'AC';


//===============================================================
// Filter lists
//===============================================================

export interface ProductLedgerOption
{
    Id:number;
    Code:string;
    Name:string;
}

export interface ProductLedgerWarehouse
{
    Id:number;
    BranchId:number;
    Code:string;
    Name:string;
}

export interface ProductLedgerCategory
{
    Id:number;
    Name:string;
    Kind:string;
}

export interface ProductLedgerSubCategory
{
    Id:number;
    CategoryId:number;
    Name:string;
}

export interface ProductLedgerProduct
{
    Id:number;
    Code:string;
    Name:string;
    Unit:string;
    Kind:string;
    CategoryId:number;
    SubCategoryId:number;
    IsActive:boolean;
}

export interface ProductLedgerFilters
{
    PageType:string;
    CanViewCost:boolean;
    Branches:ProductLedgerOption[];
    Warehouses:ProductLedgerWarehouse[];
    Categories:ProductLedgerCategory[];
    SubCategories:ProductLedgerSubCategory[];
    Products:ProductLedgerProduct[];
}


//===============================================================
// Statement
//===============================================================

export interface ProductLedgerBike
{
    ChassisNo:string;
    EngineNo:string;
}

export interface ProductLedgerRow
{
    Date:string;
    MovementType:string;
    DocumentType:string;
    DocumentNo:string;
    Particulars:string;
    PartyName:string;
    Batches:string;
    Location:string;
    IsReversal:boolean;
    IsCancelled:boolean;
    IsTransfer:boolean;
    InQty:number;
    OutQty:number;
    BalanceQty:number;
    // In Transit : this row's change (+ purchased, - received) and
    // the running in-transit balance after it
    TransitQty:number;
    TransitBalance:number;
    UnitCost:number;
    InValue:number;
    OutValue:number;
    BalanceValue:number;
    ShortNote:string;
    Bikes:ProductLedgerBike[];
}

export interface ProductLedgerFigures
{
    OpeningQty:number;
    OpeningValue:number;
    InQty:number;
    InValue:number;
    OutQty:number;
    OutValue:number;
    ClosingQty:number;
    ClosingValue:number;
    // In Transit (purchased, not yet received) at the end; part of
    // Closing (stock = In Transit + On Hand)
    ClosingTransit:number;
}

export interface ProductLedgerStatement
    extends ProductLedgerFigures
{
    PageType:string;
    CanViewCost:boolean;
    ProductId:number;
    ProductCode:string;
    ProductName:string;
    Unit:string;
    Kind:string;
    CategoryName:string;
    SubCategoryName:string;
    BrandName:string;
    ColorName:string;
    From:string;
    To:string;
    BranchId:number;
    BranchName:string;
    WarehouseId:number;
    WarehouseName:string;
    ShowCancelled:boolean;
    OpeningTransit:number;
    Truncated:boolean;
    Rows:ProductLedgerRow[];
}


//===============================================================
// Summary
//===============================================================

export interface ProductLedgerSummaryRow
    extends ProductLedgerFigures
{
    ProductId:number;
    ProductCode:string;
    ProductName:string;
    Unit:string;
    CategoryName:string;
    SubCategoryName:string;
    IsActive:boolean;
}

export interface ProductLedgerSummary
    extends ProductLedgerFigures
{
    PageType:string;
    CanViewCost:boolean;
    ScopePath:string;
    Kind:string;
    CategoryId:number;
    SubCategoryId:number;
    From:string;
    To:string;
    BranchId:number;
    BranchName:string;
    WarehouseId:number;
    WarehouseName:string;
    ShowCancelled:boolean;
    Rows:ProductLedgerSummaryRow[];
}


//===============================================================
// Print request (saved by the page, read by the viewer)
//===============================================================

export interface ProductLedgerPrintRequest
{
    ledgerType:ProductLedgerType;
    view:'statement' | 'summary';
    productId:number;
    kind:string;
    categoryId:number;
    subCategoryId:number;
    from:string;
    to:string;
    branchId:number;
    warehouseId:number;
    showCancelled:boolean;
    showBatch:boolean;
    showLocation:boolean;
    showValue:boolean;
    showBikes:boolean;
    search:string;
}


//===============================================================
// Page config (route data.ledgerType)
//===============================================================

export interface ProductLedgerConfig
{
    type:ProductLedgerType;
    // API / route segment : motor-bikes-ledger …
    path:string;
    title:string;
    subtitle:string;
    icon:string;
    // "model" / "part" / "accessory"
    itemWord:string;
    itemWords:string;
}

const CONFIGS:
    Record<ProductLedgerType, ProductLedgerConfig> =
{
    MB:
    {
        type:'MB',
        path:'motor-bikes-ledger',
        title:'Motor Bikes Ledger',
        subtitle:'Product Ledgers : stock in and out of every model, with the bikes',
        icon:'fas fa-motorcycle',
        itemWord:'model',
        itemWords:'models'
    },

    SP:
    {
        type:'SP',
        path:'spare-parts-lubricants-ledger',
        title:'Spare Parts & Lubricants Ledger',
        subtitle:'Product Ledgers : stock in and out of every part and lubricant',
        icon:'fas fa-gears',
        itemWord:'part',
        itemWords:'parts'
    },

    AC:
    {
        type:'AC',
        path:'accessories-ledger',
        title:'Accessories Ledger',
        subtitle:'Product Ledgers : stock in and out of every accessory',
        icon:'fas fa-helmet-safety',
        itemWord:'accessory',
        itemWords:'accessories'
    }
};

export function productLedgerConfig
(
    type:
        string
):
    ProductLedgerConfig
{
    const key =
        String(type ?? '').trim().toUpperCase() as ProductLedgerType;

    return CONFIGS[key] ?? CONFIGS.SP;
}

// Route of a ledger page (stock card "Full Ledger")
export function productLedgerRoute
(
    type:
        string
):
    string
{
    return `/inventory-management/product-ledgers/${productLedgerConfig(type).path}`;
}


//===============================================================
// Constants
//===============================================================

// Print Viewer key (print-registry.ts)
export const PRODUCT_LEDGER_PRINT_KEY =
    'product-ledgers';


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
export function formatLedgerDate
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

// 1234.5 → "1,234.50"
export function formatLedgerMoney
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

// 1200 → "1,200" ; 2.5 → "2.5"
export function formatLedgerQty
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


// Search : every word must appear in the row
function matches
(
    parts:
        string[],
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
        parts.join(' \u001f ').toLowerCase();

    return words.every(word => text.includes(word));
}

export function ledgerRowMatches
(
    row:
        ProductLedgerRow,
    search:
        string
):
    boolean
{
    return matches(
        [
            row.Date,
            formatLedgerDate(row.Date),
            row.DocumentNo,
            row.DocumentType,
            row.Particulars,
            row.PartyName,
            row.Batches,
            row.Location,
            row.ShortNote,
            String(row.InQty || ''),
            String(row.OutQty || ''),
            ...row.Bikes.flatMap(x => [x.ChassisNo, x.EngineNo])
        ],
        search
    );
}

export function summaryRowMatches
(
    row:
        ProductLedgerSummaryRow,
    search:
        string
):
    boolean
{
    return matches(
        [
            row.ProductCode,
            row.ProductName,
            row.CategoryName,
            row.SubCategoryName,
            row.Unit
        ],
        search
    );
}

// Totals of summary rows (after a search)
export function sumFigures
(
    rows:
        ProductLedgerFigures[]
):
    ProductLedgerFigures
{
    const total =
        (field: keyof ProductLedgerFigures) =>
            rows.reduce((t, x) => t + (Number(x[field]) || 0), 0);

    return {
        OpeningQty:total('OpeningQty'),
        OpeningValue:total('OpeningValue'),
        InQty:total('InQty'),
        InValue:total('InValue'),
        OutQty:total('OutQty'),
        OutValue:total('OutValue'),
        ClosingQty:total('ClosingQty'),
        ClosingValue:total('ClosingValue'),
        ClosingTransit:total('ClosingTransit')
    };
}

// Bikes as one line : "CH-1 / EN-1, CH-2 / EN-2"
export function bikesText
(
    bikes:
        ProductLedgerBike[]
):
    string
{
    return bikes
        .map(x => [x.ChassisNo, x.EngineNo].filter(v => !!v).join(' / '))
        .filter(x => !!x)
        .join(', ');
}
