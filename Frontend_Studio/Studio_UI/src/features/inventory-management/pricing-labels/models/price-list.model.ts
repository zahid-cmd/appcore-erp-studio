//===============================================================
// Price List : models. The current MRP (VAT inclusive : the sale
// price) of every product of one product type (MB / SP / AC),
// whether in stock or not, with its cost and markup. Read only.
// Dates are yyyy-MM-dd.
//===============================================================

import
{
    ProductPricingType,
    ProductPricingVatRule,
    pricingProfit,
    salesVatRateOn
}
from './product-pricing.model';


//===============================================================
// One product
//===============================================================

export interface PriceListRow
{
    ProductId:number;
    Code:string;
    Name:string;
    // The maker's part number / name (MB : the model name)
    PartNumber:string;
    PartName:string;
    Unit:string;
    // Motor Bikes / Spare Parts / Lubricants / Accessories
    VatType:string;
    // Brand of its category (0 = none; below 0 = taken from the
    // category name)
    BrandId:number;
    BrandName:string;
    CategoryId:number;
    CategoryName:string;
    SubCategoryId:number;
    SubCategoryName:string;
    // On hand + in transit
    InStock:number;
    // Weighted average net unit cost of the in-stock batches (0 =
    // none in stock)
    AvgCost:number;
    // Net unit cost of the latest batch (0 = never purchased)
    LastCost:number;
    // Current MRP (0 = unpriced) : the declared MRP, else the
    // latest priced batch
    CurrentMrp:number;
    MrpDate:string;
    MrpSourceNo:string;
    // In-stock batches / those without an MRP
    BatchCount:number;
    UnpricedBatches:number;
}

export interface PriceList
{
    PageType:string;
    // Business date (sales VAT rate on this day)
    Today:string;
    // Profit % On Sale Price : false = on cost (markup)
    ProfitOnSale:boolean;
    SalesVatApplicable:boolean;
    SalesVatRules:ProductPricingVatRule[];
    Rows:PriceListRow[];
}


//===============================================================
// Filter (left panel) : the same on the page and in print
//===============================================================

export type PriceListStock =
    'all' | 'in' | 'none';

export type PriceListPrice =
    'all' | 'priced' | 'unpriced';

export interface PriceListFilter
{
    // SP : Spare Parts / Lubricants ('' = both)
    kind:string;
    brandId:number;
    categoryId:number;
    subCategoryId:number;
    stock:PriceListStock;
    price:PriceListPrice;
    search:string;
}

export interface PriceListPrintRequest
    extends PriceListFilter
{
    type:ProductPricingType;
    groupBySub:boolean;
    showPart:boolean;
}

export const PRICE_LIST_ROUTE =
    '/inventory-management/pricing-labels/price-list';

export const PRICE_LIST_PRINT_KEY =
    'price-list';


//===============================================================
// Cost / markup
//===============================================================

// The cost a row is judged on : the in-stock average, else the
// latest batch (0 = never purchased)
export function priceListCost
(
    row:
        PriceListRow
):
    number
{
    return row.AvgCost > 0
        ? row.AvgCost
        : row.LastCost;
}

// No stock : the cost shown is the latest batch's
export function priceListLastCostOnly
(
    row:
        PriceListRow
):
    boolean
{
    return !(row.AvgCost > 0) && row.LastCost > 0;
}

// Sales VAT % inside the MRP of a VAT type today (0 = none)
export function priceListVatRate
(
    list:
        PriceList,
    vatType:
        string
):
    number
{
    if
    (
        !list.SalesVatApplicable
    )
    {
        return 0;
    }

    return salesVatRateOn(list.SalesVatRules, vatType, list.Today) ?? 0;
}

// Markup % : on cost, or on the net sale (System Configuration
// switch); null = no MRP or no cost
export function priceListMarkup
(
    list:
        PriceList,
    row:
        PriceListRow
):
    number | null
{
    return pricingProfit(
        row.CurrentMrp,
        priceListVatRate(list, row.VatType),
        priceListCost(row),
        list.ProfitOnSale
    );
}

// MRP under the cost
export function priceListBelowCost
(
    row:
        PriceListRow
):
    boolean
{
    const cost =
        priceListCost(row);

    return row.CurrentMrp > 0 && cost > 0 && row.CurrentMrp < cost;
}

export function priceListMarkupTitle
(
    onSale:
        boolean
):
    string
{
    return onSale
        ? 'Markup % on the net sale : (net sale − cost) ÷ net sale. Net sale = MRP less the sales VAT in it; cost = average net unit cost of the stock (no stock : the latest purchase).'
        : 'Markup % on cost : (net sale − cost) ÷ cost. Net sale = MRP less the sales VAT in it; cost = average net unit cost of the stock (no stock : the latest purchase).';
}


//===============================================================
// Filter / search
//===============================================================

// Search : every word must appear in code, part number or name
export function priceListMatches
(
    row:
        PriceListRow,
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
            row.Code,
            row.PartNumber,
            row.PartName,
            row.Name
        ]
        .join(' \u001f ')
        .toLowerCase();

    return words.every(word => text.includes(word));
}

export function filterPriceList
(
    rows:
        PriceListRow[],
    filter:
        PriceListFilter
):
    PriceListRow[]
{
    return rows.filter
    (
        x =>
            (!filter.kind || x.VatType === filter.kind)
            &&
            (!filter.brandId || x.BrandId === filter.brandId)
            &&
            (!filter.categoryId || x.CategoryId === filter.categoryId)
            &&
            (!filter.subCategoryId || x.SubCategoryId === filter.subCategoryId)
            &&
            (filter.stock === 'all' || (filter.stock === 'in' ? x.InStock > 0 : !(x.InStock > 0)))
            &&
            (filter.price === 'all' || (filter.price === 'priced' ? x.CurrentMrp > 0 : !(x.CurrentMrp > 0)))
            &&
            priceListMatches(x, filter.search)
    );
}


//===============================================================
// Groups : Category › Sub Category (the rows in order)
//===============================================================

export interface PriceListLine
{
    // Unique key (track)
    key:string;
    kind:'category' | 'sub' | 'row';
    label:string;
    count:number;
    // Running number (rows)
    sl:number;
    row:PriceListRow | null;
}

export function sortPriceList
(
    rows:
        PriceListRow[]
):
    PriceListRow[]
{
    return [...rows].sort
    (
        (a, b) =>
            (a.CategoryName || '~').localeCompare(b.CategoryName || '~')
            ||
            a.CategoryId - b.CategoryId
            ||
            (a.SubCategoryName || '~').localeCompare(b.SubCategoryName || '~')
            ||
            a.SubCategoryId - b.SubCategoryId
            ||
            a.Code.localeCompare(b.Code)
    );
}

// Header lines (with counts) and rows, in order
export function groupPriceList
(
    rows:
        PriceListRow[],
    bySub:
        boolean
):
    PriceListLine[]
{
    const sorted =
        sortPriceList(rows);

    const categoryCount =
        new Map<number, number>();

    const subCount =
        new Map<string, number>();

    sorted.forEach
    (
        x =>
        {
            categoryCount.set(x.CategoryId, (categoryCount.get(x.CategoryId) ?? 0) + 1);

            subCount.set(`${x.CategoryId}:${x.SubCategoryId}`, (subCount.get(`${x.CategoryId}:${x.SubCategoryId}`) ?? 0) + 1);
        }
    );

    const lines:
        PriceListLine[] = [];

    let category =
        -1;

    let sub =
        '';

    let sl =
        0;

    sorted.forEach
    (
        x =>
        {
            if
            (
                x.CategoryId !== category
            )
            {
                category = x.CategoryId;

                sub = '';

                lines.push(
                    {
                        key:`c${x.CategoryId}`,
                        kind:'category',
                        label:x.CategoryName || 'No Category',
                        count:categoryCount.get(x.CategoryId) ?? 0,
                        sl:0,
                        row:null
                    }
                );
            }

            const subKey =
                `${x.CategoryId}:${x.SubCategoryId}`;

            if
            (
                bySub && subKey !== sub
            )
            {
                sub = subKey;

                lines.push(
                    {
                        key:`s${subKey}`,
                        kind:'sub',
                        label:x.SubCategoryName || 'No Sub Category',
                        count:subCount.get(subKey) ?? 0,
                        sl:0,
                        row:null
                    }
                );
            }

            sl++;

            lines.push(
                {
                    key:`p${x.ProductId}`,
                    kind:'row',
                    label:x.Name,
                    count:0,
                    sl,
                    row:x
                }
            );
        }
    );

    return lines;
}


//===============================================================
// Totals
//===============================================================

export interface PriceListTotals
{
    Products:number;
    Priced:number;
    Unpriced:number;
    StockQty:number;
    // Stock × cost / stock × current MRP
    StockAtCost:number;
    StockAtMrp:number;
    BelowCost:number;
}

export function priceListTotals
(
    rows:
        PriceListRow[]
):
    PriceListTotals
{
    const round =
        (value: number) =>
            Math.round(value * 100) / 100;

    return rows.reduce
    (
        (sum, x) =>
        {
            const stock =
                x.InStock > 0 ? x.InStock : 0;

            sum.Products++;

            if
            (
                x.CurrentMrp > 0
            )
            {
                sum.Priced++;
            }
            else
            {
                sum.Unpriced++;
            }

            if
            (
                priceListBelowCost(x)
            )
            {
                sum.BelowCost++;
            }

            sum.StockQty = round(sum.StockQty + stock);

            sum.StockAtCost = round(sum.StockAtCost + stock * x.AvgCost);

            sum.StockAtMrp = round(sum.StockAtMrp + stock * x.CurrentMrp);

            return sum;
        },
        {
            Products:0,
            Priced:0,
            Unpriced:0,
            StockQty:0,
            StockAtCost:0,
            StockAtMrp:0,
            BelowCost:0
        } as PriceListTotals
    );
}

// 12.5 → "12.50%" ; null → "—"
export function formatMarkup
(
    value:
        number | null
):
    string
{
    return value === null
        ? '—'
        : `${value.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}%`;
}
