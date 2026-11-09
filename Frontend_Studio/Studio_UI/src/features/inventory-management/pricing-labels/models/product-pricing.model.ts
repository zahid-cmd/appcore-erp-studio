//===============================================================
// Product Pricing (Price Change) : models. MRP (VAT inclusive) is
// the sale price : the only one. One document = one product type
// (MB / SP / AC), company-wide. Dates are yyyy-MM-dd.
//===============================================================

export type ProductPricingType =
    'MB' | 'SP' | 'AC';


//===============================================================
// A document (list row; lines when opened)
//===============================================================

export interface ProductPricingLine
{
    ProductPricingLineId:number;
    LineNo:number;
    ProductId:number;
    ProductCode:string;
    ProductName:string;
    Unit:string;
    StockBatchId:number;
    BatchNo:string;
    // Purchase / Opening
    SourceType:string;
    SourceNo:string;
    BranchId:number;
    BranchName:string;
    Quantity:number;
    // Excl. VAT
    UnitCost:number;
    // Before / new (VAT inclusive)
    OldMrp:number;
    NewMrp:number;
    Notes:string;
    // New : received, the line's %, the MRP it gave
    ReceivedQuantity:number;
    ProfitPercent:number;
    SuggestedMrp:number;
    // Older stock raised to the new MRP on post
    IsRaised:boolean;
}

export interface ProductPricing
{
    // The id used in links and API calls (uuid v7)
    PublicId?:string;

    ProductPricingId:number;
    PageType:string;
    PricingNo:string;
    PricingDate:string;
    Remarks:string;
    // New (one purchase invoice) / Reprice
    PricingKind:string;
    PurchaseId:number;
    PurchaseNo:string;
    SupplierName:string;
    // Cost (profit % on cost) / Margin (margin % on MRP)
    PricingBasis:string;
    BasisPercent:number;
    ProductCount:number;
    BatchCount:number;
    // Draft / Posted / Cancelled
    Status:string;
    PostedDate:string;
    CancelReason:string;
    CancelledDate:string;
    CreatedDate:string;
    Lines:ProductPricingLine[];
}


//===============================================================
// Defaults
//===============================================================

export interface ProductPricingVatRule
{
    VatType:string;
    Rate:number;
    EffectiveFrom:string;
    ValidTo:string;
}

export interface ProductPricingProduct
{
    Id:number;
    Code:string;
    Name:string;
    // The maker's part number / name : what suppliers know (the
    // product code stays internal). Motor Bikes : the model name
    PartNumber:string;
    PartName:string;
    // Its group / sub-group (category / sub-category)
    CategoryId:number;
    SubCategoryId:number;
    // Brand of its category (0 = none)
    BrandId:number;
    BrandName:string;
    Unit:string;
    // Motor Bikes / Spare Parts / Lubricants / Accessories
    VatType:string;
    InStock:number;
    BatchCount:number;
    UnpricedCount:number;
    LastMrp:number;
}

export interface ProductPricingDefaults
{
    PageType:string;
    Today:string;
    // PC-<type>-0001 the next save takes
    NextNumber:string;
    // Profit % On Sale Price : false = on cost (markup)
    ProfitOnSale:boolean;
    // Switches : grid MRP editable / raise old stock / reduction to all stock
    GridEditable:boolean;
    RaiseOldStock:boolean;
    ReductionAllStock:boolean;
    SalesVatApplicable:boolean;
    SalesVatRules:ProductPricingVatRule[];
    Products:ProductPricingProduct[];
}


//===============================================================
// The in-stock batches of a product
//===============================================================

export interface ProductPricingBatch
{
    StockBatchId:number;
    BatchNo:string;
    SourceType:string;
    SourceNo:string;
    SourceDate:string;
    SupplierName:string;
    BranchId:number;
    BranchName:string;
    Quantity:number;
    UnitCost:number;
    // 0 = unpriced (not saleable)
    Mrp:number;
    // DP-invoice suggestion (0 = none)
    SuggestedMrp:number;
    DefaultTicked:boolean;
}

export interface ProductPricingBatchList
{
    ProductId:number;
    SuggestedMrp:number;
    SuggestionNote:string;
    LastMrp:number;
    Batches:ProductPricingBatch[];
}


//===============================================================
// Save
//===============================================================

export interface CreateProductPricingLine
{
    ProductId:number;
    StockBatchId:number;
    NewMrp:number;
    Notes:string;
    ProfitPercent:number;
    SuggestedMrp:number;
}

export interface CreateProductPricing
{
    PageType:string;
    PricingDate:string;
    Remarks:string;
    PricingKind:string;
    PurchaseId:number;
    PricingBasis:string;
    BasisPercent:number;
    Lines:CreateProductPricingLine[];
}


//===============================================================
// New Pricing : purchase invoices and their received lines
//===============================================================

export interface ProductPricingInvoice
{
    PurchaseId:number;
    PurchaseNo:string;
    PurchaseDate:string;
    SupplierCode:string;
    SupplierName:string;
    // DP / MRP
    InvoicePriceBasis:string;
    ReceivedLines:number;
    UnpricedLines:number;
    PendingLines:number;
}

export interface ProductPricingInvoiceLine
{
    StockBatchId:number;
    BatchNo:string;
    PurchaseLineId:number;
    ProductId:number;
    ProductCode:string;
    ProductName:string;
    Unit:string;
    VatType:string;
    SalesVatRate:number;
    BranchId:number;
    BranchName:string;
    Quantity:number;
    ReceivedQuantity:number;
    UnitCost:number;
    Mrp:number;
    LastMrp:number;
    LastMrpDate:string;
    ProductStock:number;
}

export interface ProductPricingInvoiceLines
{
    Invoice:ProductPricingInvoice;
    // Cost / Margin; '' = not set on the Supplier Profile
    SupplierBasis:string;
    SupplierPercent:number;
    Lines:ProductPricingInvoiceLine[];
}

export type PricingBasis =
    'Cost' | 'Margin';

// The MRP a % gives, VAT inclusive, up to the whole taka :
//   Cost   : cost × (1 + p%) + sales VAT
//   Margin : (cost + sales VAT) ÷ (1 − m%)
export function priceFromBasis
(
    unitCost:
        number,
    basis:
        PricingBasis,
    percent:
        number,
    salesVatRate:
        number
):
    number
{
    if
    (
        !(unitCost > 0) || !(percent >= 0) || (basis === 'Margin' && percent >= 100)
    )
    {
        return 0;
    }

    const withVat =
        unitCost * (1 + (salesVatRate || 0) / 100);

    const value =
        basis === 'Margin'
            ? withVat / (1 - percent / 100)
            : withVat * (1 + percent / 100);

    return Math.ceil(Math.round(value * 10000) / 10000);
}

export interface ProductPricingSaved
{
    // The id used in links and API calls (uuid v7)
    PublicId?:string;

    ProductPricingId:number;
    PricingNo:string;
    Status:string;
}


//===============================================================
// Product types
//===============================================================

export interface ProductPricingTypeInfo
{
    type:ProductPricingType;
    title:string;
    item:string;
    itemLower:string;
    icon:string;
}

export const PRODUCT_PRICING_TYPES:
    ProductPricingTypeInfo[] =
[
    { type:'MB', title:'Motor Bikes', item:'Motor Bike', itemLower:'motor bikes', icon:'fas fa-motorcycle' },
    { type:'SP', title:'Spare Parts & Lubricants', item:'Spare Part / Lubricant', itemLower:'spare parts or lubricants', icon:'fas fa-oil-can' },
    { type:'AC', title:'Accessories', item:'Accessory', itemLower:'accessories', icon:'fas fa-box-open' }
];

// Types priced on this page : Motor Bikes moved to the price cards
// (Product Pricing - Motor Bikes, 2026-11-09)
export const PRODUCT_PRICING_PAGE_TYPES:
    ProductPricingTypeInfo[] =
    PRODUCT_PRICING_TYPES.filter(x => x.type !== 'MB');

export function productPricingType
(
    type:
        string
):
    ProductPricingTypeInfo
{
    const key =
        String(type ?? '').trim().toUpperCase();

    return PRODUCT_PRICING_TYPES.find(x => x.type === key) ?? PRODUCT_PRICING_TYPES[0];
}

// Menu route of the page
export const PRODUCT_PRICING_ROUTE =
    '/inventory-management/pricing-labels/product-pricing';

export const PRODUCT_PRICING_PRINT_KEY =
    'product-pricing';


//===============================================================
// Helpers
//===============================================================

// Date → yyyy-MM-dd (local)
export function toPricingIso
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
export function fromPricingIso
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
export function formatPricingDate
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
export function formatPricingQty
(
    value:
        number
):
    string
{
    return (Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits:0, maximumFractionDigits:2 });
}

// 1200 → "1,200.00"
export function formatPricingMoney
(
    value:
        number
):
    string
{
    return (Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

// Unit cost : 2 to 4 decimals
export function formatPricingCost
(
    value:
        number
):
    string
{
    return (Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:4 });
}

// The Sales VAT rule rate of a VAT type on a date (none → null)
export function salesVatRateOn
(
    rules:
        ProductPricingVatRule[],
    vatType:
        string,
    iso:
        string
):
    number | null
{
    const rule =
        rules
            .filter(x => x.VatType === vatType && x.EffectiveFrom <= iso && (!x.ValidTo || x.ValidTo >= iso))
            .sort((a, b) => b.EffectiveFrom.localeCompare(a.EffectiveFrom))[0];

    return rule ? rule.Rate : null;
}

// Profit % : the net sale (MRP less the sales VAT in it) over the
// cost; on cost (markup) or on the net sale. null = no figures
export function pricingProfit
(
    mrp:
        number,
    salesVatRate:
        number,
    unitCost:
        number,
    onSale:
        boolean
):
    number | null
{
    const net =
        Math.round(mrp / (1 + (salesVatRate || 0) / 100) * 100) / 100;

    if
    (
        !(net > 0 && unitCost > 0)
    )
    {
        return null;
    }

    return Math.round((net - unitCost) / (onSale ? net : unitCost) * 10000) / 100;
}

// Search : every word must appear in the document
export function productPricingMatches
(
    row:
        ProductPricing,
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
            row.PricingNo,
            row.PricingDate,
            formatPricingDate(row.PricingDate),
            productPricingType(row.PageType).title,
            row.Remarks,
            row.Status
        ]
        .join(' \u001f ')
        .toLowerCase();

    return words.every(word => text.includes(word));
}


//===============================================================
// Excel import : parts not in the database (Spare Parts /
// Lubricants), created with the Spare Parts page's rules
//===============================================================

export interface NewItemCategory
{
    Id:number;
    Name:string;
    CategoryType:string;
}

export interface NewItemSubCategory
{
    Id:number;
    CategoryId:number;
    Name:string;
}

// A free bin of a rack (A-01-02 : the server's code)
export interface NewItemBin
{
    ShelfNumber:number;
    BinNumber:number;
    BinCode:string;
}

export interface NewItemRack
{
    Id:number;
    Name:string;
    // Shelves with at least one free bin
    FreeShelves:number[];
    // Every free bin, shelf-then-bin (one item per bin)
    FreeBins:NewItemBin[];
}

export interface NewItemSetup
{
    Categories:NewItemCategory[];
    SubCategories:NewItemSubCategory[];
    Units:string[];
    BranchId:number;
    BranchName:string;
    WarehouseId:number;
    WarehouseName:string;
    Racks:NewItemRack[];
}

export interface NewItemInput
{
    Key:number;
    ProductCategoryId:number;
    ProductSubCategoryId:number;
    PartNumber:string;
    PartName:string;
    Unit:string;
    RackManagementId:number;
    ShelfNumber:number;
    // The bin (0 = 1)
    BinNumber:number;
}

export interface NewItemResult
{
    Key:number;
    Created:boolean;
    ProductId:number;
    ProductCode:string;
    Error:string;
}
