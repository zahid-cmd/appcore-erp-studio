//===============================================================
// Price Adjustment : models. A price circular changes the MRP
// (VAT inclusive) of products; the stock on hand on the cut-off
// date is revalued at cost (excluding VAT) and the difference is
// settled per supplier group. One document = one product type
// (MB / SP / AC). Dates are yyyy-MM-dd.
//===============================================================

import
{
    PRODUCT_PRICING_TYPES,
    ProductPricingTypeInfo,
    formatPricingCost,
    formatPricingDate,
    formatPricingMoney,
    formatPricingQty,
    fromPricingIso,
    productPricingType,
    toPricingIso
}
from './product-pricing.model';


export type PriceAdjustmentType =
    'MB' | 'SP' | 'AC';

// Draft / Posted / Cancelled
export type PriceAdjustmentStatus =
    'Draft' | 'Posted' | 'Cancelled';

// Increase / Reduction
export type PriceAdjustmentDirection =
    'Increase' | 'Reduction';

// Who takes an increase : the supplier, the Price Increase
// Reserve or the Price Increase Income
export type PriceAdjustmentIncreaseTo =
    'Supplier' | 'Reserve' | 'Income';

// Who bears a reduction : the supplier or the Price Reduction
// Expense
export type PriceAdjustmentReductionTo =
    'Supplier' | 'Expense';


//===============================================================
// List row
//===============================================================

export interface PriceAdjustmentListRow
{
    // The id used in links and API calls (uuid v7)
    PublicId?:string;

    Id:number;
    AdjustmentNo:string;
    PageType:string;
    CircularRef:string;
    CircularDate:string;
    CutOffDate:string;
    Status:string;
    ProductCount:number;
    BatchCount:number;
    IncreaseAmount:number;
    ReductionAmount:number;
    NetAmount:number;
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

export interface PriceAdjustmentProductOption
{
    Id:number;
    Code:string;
    Name:string;
    // The maker's part number (Motor Bikes : the model)
    PartNumber:string;
    BrandId:number;
    BrandName:string;
    CategoryId:number;
    CategoryName:string;
    // Its MRP now (price index)
    LastMrp:number;
    Stock:number;
}

export interface PriceAdjustmentBrand
{
    Id:number;
    Name:string;
}

// A supplier and its default settlement
export interface PriceAdjustmentSupplierDefault
{
    Code:string;
    Name:string;
    IncreaseTo:string;
    ReductionTo:string;
}

export interface PriceAdjustmentDefaults
{
    PageType:string;
    // yyyy-MM-dd business date
    Today:string;
    // PA-<type>-0001 the next save takes (preview)
    NextNo:string;
    Products:PriceAdjustmentProductOption[];
    Brands:PriceAdjustmentBrand[];
    Suppliers:PriceAdjustmentSupplierDefault[];
}


//===============================================================
// Analysis (also the saved document's rows)
//===============================================================

// One product of the circular
export interface PriceAdjustmentProduct
{
    PriceAdjustmentProductId:number;
    LineNo:number;
    ProductId:number;
    ProductCode:string;
    ProductName:string;
    PartNumber:string;
    OldMrp:number;
    NewMrp:number;
    Direction:string;
    BatchCount:number;
    // On hand on the cut-off date
    Quantity:number;
    Amount:number;
    // false = a price-only line (no qualifying batch)
    HasStock:boolean;
}

// One priced stock batch of a product (figures excluding VAT)
export interface PriceAdjustmentLine
{
    PriceAdjustmentLineId:number;
    ProductId:number;
    StockBatchId:number;
    BatchNo:string;
    // '' = opening stock with no supplier
    SupplierCode:string;
    SupplierName:string;
    VatRate:number;
    // On hand on the cut-off date
    Quantity:number;
    SoldSinceCutOff:number;
    ReleasedQuantity:number;
    QuantityOnHandNow:number;
    UnitCost:number;
    OldMrp:number;
    NewMrp:number;
    MarginPercent:number;
    MarginEdited:boolean;
    NewUnitCost:number;
    // + increase / − reduction
    DifferencePerUnit:number;
    Amount:number;
}

// One supplier group and its settlement
export interface PriceAdjustmentSupplier
{
    SupplierCode:string;
    SupplierName:string;
    IncreaseAmount:number;
    ReductionAmount:number;
    IncreaseTo:string;
    ReductionTo:string;
}

// A release of the stock price adjustment (catch-up on posting,
// later each sale)
export interface PriceAdjustmentRelease
{
    PriceAdjustmentReleaseId:number;
    PriceAdjustmentLineId:number;
    StockBatchId:number;
    Quantity:number;
    Amount:number;
    // Posting / Sale
    SourceType:string;
    SourceNo:string;
    ReleaseDate:string;
    CreatedDate:string;
}

export interface PriceAdjustmentAnalysis
{
    CutOffDate:string;
    Products:PriceAdjustmentProduct[];
    Lines:PriceAdjustmentLine[];
    Suppliers:PriceAdjustmentSupplier[];
    IncreaseAmount:number;
    ReductionAmount:number;
    NetAmount:number;
}


//===============================================================
// A document
//===============================================================

export interface PriceAdjustmentDetail
{
    // The id used in links and API calls (uuid v7)
    PublicId?:string;

    Id:number;
    AdjustmentNo:string;
    PageType:string;
    BranchId:number;
    CircularRef:string;
    CircularDate:string;
    CutOffDate:string;
    Remarks:string;
    Status:string;
    ProductCount:number;
    BatchCount:number;
    IncreaseAmount:number;
    ReductionAmount:number;
    NetAmount:number;
    IsDeleted:boolean;
    CreatedDate:string;
    PostedDate:string;
    CancelledDate:string;
    CancelReason:string;
    CreatedByName:string;
    PostedByName:string;
    CancelledByName:string;
    CanEdit:boolean;
    CanPost:boolean;
    CanCancel:boolean;
    Products:PriceAdjustmentProduct[];
    Lines:PriceAdjustmentLine[];
    Suppliers:PriceAdjustmentSupplier[];
    Releases:PriceAdjustmentRelease[];
}

// The placeholder's name for a document
export type PriceAdjustment =
    PriceAdjustmentDetail;


//===============================================================
// Requests
//===============================================================

export interface PriceAdjustmentProductInput
{
    ProductId:number;
    NewMrp:number;
}

export interface PriceAdjustmentMarginInput
{
    StockBatchId:number;
    MarginPercent:number;
}

export interface PriceAdjustmentSupplierInput
{
    SupplierCode:string;
    IncreaseTo:string;
    ReductionTo:string;
}

export interface PriceAdjustmentAnalyseInput
{
    Type:string;
    CutOffDate:string;
    Products:PriceAdjustmentProductInput[];
    Margins:PriceAdjustmentMarginInput[];
}

export interface CreatePriceAdjustment
{
    Type:string;
    CircularRef:string;
    // null = none
    CircularDate:string | null;
    CutOffDate:string;
    Remarks:string;
    Products:PriceAdjustmentProductInput[];
    Margins:PriceAdjustmentMarginInput[];
    Suppliers:PriceAdjustmentSupplierInput[];
}

// Same fields (draft only)
export type UpdatePriceAdjustment =
    CreatePriceAdjustment;


//===============================================================
// Settlement choices
//===============================================================

export const PRICE_ADJUSTMENT_INCREASE_TO:
    { value:PriceAdjustmentIncreaseTo; text:string; title:string }[] =
[
    { value:'Supplier', text:'Supplier', title:'The supplier takes the benefit (Cr Supplier)' },
    { value:'Reserve', text:'Reserve', title:'Kept as Price Increase Reserve until the units are sold' },
    { value:'Income', text:'Income', title:'Kept as Price Increase Income now' }
];

export const PRICE_ADJUSTMENT_REDUCTION_TO:
    { value:PriceAdjustmentReductionTo; text:string; title:string }[] =
[
    { value:'Supplier', text:'Supplier', title:'The supplier compensates (Dr Supplier)' },
    { value:'Expense', text:'Expense', title:'Price Reduction Expense of the dealer' }
];

export const PRICE_ADJUSTMENT_DEFAULT_INCREASE_TO:
    PriceAdjustmentIncreaseTo = 'Reserve';

export const PRICE_ADJUSTMENT_DEFAULT_REDUCTION_TO:
    PriceAdjustmentReductionTo = 'Expense';

// The opening-stock group (no supplier)
export const PRICE_ADJUSTMENT_NO_SUPPLIER =
    'No supplier';

// A usable increase choice for a group ('' group : no Supplier)
export function normaliseIncreaseTo
(
    value:
        string,
    supplierCode:
        string
):
    PriceAdjustmentIncreaseTo
{
    const found =
        PRICE_ADJUSTMENT_INCREASE_TO.find(x => x.value.toLowerCase() === String(value ?? '').trim().toLowerCase());

    if
    (
        !found || (found.value === 'Supplier' && !supplierCode)
    )
    {
        return PRICE_ADJUSTMENT_DEFAULT_INCREASE_TO;
    }

    return found.value;
}

export function normaliseReductionTo
(
    value:
        string,
    supplierCode:
        string
):
    PriceAdjustmentReductionTo
{
    const found =
        PRICE_ADJUSTMENT_REDUCTION_TO.find(x => x.value.toLowerCase() === String(value ?? '').trim().toLowerCase());

    if
    (
        !found || (found.value === 'Supplier' && !supplierCode)
    )
    {
        return PRICE_ADJUSTMENT_DEFAULT_REDUCTION_TO;
    }

    return found.value;
}


//===============================================================
// Journal (preview on the page / print; the server builds the
// real one on post from Posting Setup)
//===============================================================

export const PRICE_ADJUSTMENT_LEDGERS:
    Record<string, string> =
{
    'STOCK-PRICE-ADJ':'Stock Price Adjustment',
    'PRICE-INC-RESERVE':'Price Increase Reserve',
    'PRICE-INC-INCOME':'Price Increase Income',
    'PRICE-RED-EXPENSE':'Price Reduction Expense',
    'PRICE-ADJ-COST':'Price Adjustment on Cost of Sales'
};

export interface PriceAdjustmentJournalLine
{
    // Settlement / Release (units sold between cut-off and posting)
    Kind:'Settlement' | 'Release';
    Ledger:string;
    // Supplier name when the supplier's payable
    Party:string;
    Debit:number;
    Credit:number;
}

function round2
(
    value:
        number
):
    number
{
    return Math.round((Number(value) || 0) * 100) / 100;
}

// The journal the post makes : per supplier group the increase /
// reduction against Stock Price Adjustment, then the catch-up
// release for the units sold since the cut-off date
export function priceAdjustmentJournal
(
    lines:
        PriceAdjustmentLine[],
    suppliers:
        PriceAdjustmentSupplier[],
    choice:
        (supplier: PriceAdjustmentSupplier) => { IncreaseTo:string; ReductionTo:string }
):
    PriceAdjustmentJournalLine[]
{
    const out:
        PriceAdjustmentJournalLine[] = [];

    const ledger =
        PRICE_ADJUSTMENT_LEDGERS;

    for
    (
        const group of suppliers
    )
    {
        const picked =
            choice(group);

        const supplierName =
            group.SupplierName || (group.SupplierCode ? group.SupplierCode : PRICE_ADJUSTMENT_NO_SUPPLIER);

        const increase =
            round2(group.IncreaseAmount);

        const reduction =
            round2(group.ReductionAmount);

        if
        (
            increase > 0
        )
        {
            const to =
                normaliseIncreaseTo(picked.IncreaseTo, group.SupplierCode);

            out.push({ Kind:'Settlement', Ledger:ledger['STOCK-PRICE-ADJ'], Party:supplierName, Debit:increase, Credit:0 });

            out.push
            ({
                Kind:'Settlement',
                Ledger:to === 'Supplier' ? 'Supplier payable' : (to === 'Reserve' ? ledger['PRICE-INC-RESERVE'] : ledger['PRICE-INC-INCOME']),
                Party:to === 'Supplier' ? supplierName : '',
                Debit:0,
                Credit:increase
            });
        }

        if
        (
            reduction > 0
        )
        {
            const to =
                normaliseReductionTo(picked.ReductionTo, group.SupplierCode);

            out.push
            ({
                Kind:'Settlement',
                Ledger:to === 'Supplier' ? 'Supplier payable' : ledger['PRICE-RED-EXPENSE'],
                Party:to === 'Supplier' ? supplierName : '',
                Debit:reduction,
                Credit:0
            });

            out.push({ Kind:'Settlement', Ledger:ledger['STOCK-PRICE-ADJ'], Party:supplierName, Debit:0, Credit:reduction });
        }
    }

    // Catch-up release : units sold between the cut-off and posting
    let releaseUp = 0;

    let releaseDown = 0;

    let reserveToIncome = 0;

    for
    (
        const line of lines
    )
    {
        const sold =
            Math.min(Math.max(0, line.SoldSinceCutOff), Math.max(0, line.Quantity));

        const amount =
            round2(sold * line.DifferencePerUnit);

        if
        (
            amount > 0
        )
        {
            releaseUp += amount;

            const group =
                suppliers.find(x => x.SupplierCode === line.SupplierCode);

            if
            (
                group && normaliseIncreaseTo(choice(group).IncreaseTo, group.SupplierCode) === 'Reserve'
            )
            {
                reserveToIncome += amount;
            }
        }
        else if
        (
            amount < 0
        )
        {
            releaseDown += -amount;
        }
    }

    releaseUp = round2(releaseUp);

    releaseDown = round2(releaseDown);

    reserveToIncome = round2(reserveToIncome);

    if
    (
        releaseUp > 0
    )
    {
        out.push({ Kind:'Release', Ledger:ledger['PRICE-ADJ-COST'], Party:'', Debit:releaseUp, Credit:0 });

        out.push({ Kind:'Release', Ledger:ledger['STOCK-PRICE-ADJ'], Party:'', Debit:0, Credit:releaseUp });
    }

    if
    (
        releaseDown > 0
    )
    {
        out.push({ Kind:'Release', Ledger:ledger['STOCK-PRICE-ADJ'], Party:'', Debit:releaseDown, Credit:0 });

        out.push({ Kind:'Release', Ledger:ledger['PRICE-ADJ-COST'], Party:'', Debit:0, Credit:releaseDown });
    }

    if
    (
        reserveToIncome > 0
    )
    {
        out.push({ Kind:'Release', Ledger:ledger['PRICE-INC-RESERVE'], Party:'', Debit:reserveToIncome, Credit:0 });

        out.push({ Kind:'Release', Ledger:ledger['PRICE-INC-INCOME'], Party:'', Debit:0, Credit:reserveToIncome });
    }

    return out;
}


//===============================================================
// Figures (the server's rule; the page previews a margin edit)
//===============================================================

// A batch at a margin % : new cost, difference per unit, amount
export function priceAdjustmentFigures
(
    line:
        PriceAdjustmentLine,
    marginPercent:
        number
):
    { NewUnitCost:number; DifferencePerUnit:number; Amount:number }
{
    const vat =
        Math.max(0, Number(line.VatRate) || 0);

    const newNet =
        (Number(line.NewMrp) || 0) / (1 + vat / 100);

    const newCost =
        Math.round(newNet * (1 - (Number(marginPercent) || 0) / 100) * 10000) / 10000;

    const difference =
        Math.round((newCost - (Number(line.UnitCost) || 0)) * 10000) / 10000;

    return {
        NewUnitCost:newCost,
        DifferencePerUnit:difference,
        Amount:round2(difference * (Number(line.Quantity) || 0))
    };
}

// New MRP vs last : % change (null when no last MRP)
export function priceAdjustmentChange
(
    lastMrp:
        number,
    newMrp:
        number
):
    number | null
{
    if
    (
        !(lastMrp > 0)
    )
    {
        return null;
    }

    return Math.round((newMrp - lastMrp) / lastMrp * 10000) / 100;
}


//===============================================================
// Product types, route, print key
//===============================================================

export type PriceAdjustmentTypeInfo =
    ProductPricingTypeInfo;

export const PRICE_ADJUSTMENT_TYPES:
    PriceAdjustmentTypeInfo[] =
    PRODUCT_PRICING_TYPES;

export function priceAdjustmentType
(
    type:
        string
):
    PriceAdjustmentTypeInfo
{
    return productPricingType(type);
}

// Menu route of the page
export const PRICE_ADJUSTMENT_ROUTE =
    '/inventory-management/pricing-labels/price-adjustment';

export const PRICE_ADJUSTMENT_PRINT_KEY =
    'price-adjustment';


//===============================================================
// Formatting (the Product Pricing helpers)
//===============================================================

export const toAdjustmentIso =
    toPricingIso;

export const fromAdjustmentIso =
    fromPricingIso;

export const formatAdjustmentDate =
    formatPricingDate;

export const formatAdjustmentQty =
    formatPricingQty;

export const formatAdjustmentMoney =
    formatPricingMoney;

export const formatAdjustmentCost =
    formatPricingCost;

// 12.5 → "+12.50%" ; null → "—"
export function formatAdjustmentPercent
(
    value:
        number | null,
    signed:
        boolean = true
):
    string
{
    if
    (
        value === null || !Number.isFinite(value)
    )
    {
        return '—';
    }

    return `${signed && value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

// Search : every word must appear in the document
export function priceAdjustmentMatches
(
    row:
        PriceAdjustmentListRow,
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
            row.AdjustmentNo,
            row.CircularRef,
            row.CutOffDate,
            formatPricingDate(row.CutOffDate),
            formatPricingDate(row.CircularDate),
            productPricingType(row.PageType).title,
            row.Remarks,
            row.Status,
            row.IsDeleted ? 'deleted' : '',
            row.CreatedByName
        ]
        .join(' \u001f ')
        .toLowerCase();

    return words.every(word => text.includes(word));
}
