//===============================================================
// Daily statements (Accounts & Finance › Financial Statements)
//
//   Daily Collection Statement : one row per collection / refund
//   from the server; the page adds up the days, the modes, the
//   business lines, the documents and the collectors.
//   Invoice-wise Daily Profit & Loss : one row per posted sales
//   invoice / return (MB / SP / AC) with its lines; the page
//   makes the day subtotals and the totals.
//===============================================================

import
{
    formatLedgerDate,
    isZero
}
from './final-accounts.model';


//===============================================================
// Daily Collection : API shapes
//===============================================================

export type DcLine =
    'mb' | 'sp' | 'ac' | 'service' | 'customer' | 'other';

export interface DcRow
{
    Date:string;
    Time:string;
    VoucherNo:string;
    VoucherType:string;
    DocumentNo:string;
    DocumentType:string;
    Line:DcLine;
    Customer:string;
    Narration:string;
    Accounts:string;
    Cash:number;
    Bank:number;
    Mfs:number;
    Pos:number;
    Emi:number;
    Total:number;
    IsRefund:boolean;
    CollectedById:number;
    CollectedBy:string;
}

export interface DcUser
{
    Id:number;
    Name:string;
}

export interface DailyCollection
{
    From:string;
    To:string;
    BranchId:number;
    BranchName:string;
    ShowCancelled:boolean;
    Message:string;
    Users:DcUser[];
    Rows:DcRow[];
}

export const DC_LINES:
    { value:'' | DcLine; label:string }[] =
[
    { value:'', label:'All business lines' },
    { value:'mb', label:'Motor Bikes' },
    { value:'sp', label:'Spare Parts & Lubricants' },
    { value:'ac', label:'Accessories' },
    { value:'service', label:'Service' },
    { value:'customer', label:'Customer receipts (no invoice)' },
    { value:'other', label:'Other money in' }
];

export const DC_MODES:
    { key:'Cash' | 'Bank' | 'Mfs' | 'Pos' | 'Emi'; label:string }[] =
[
    { key:'Cash', label:'Cash' },
    { key:'Bank', label:'Bank' },
    { key:'Mfs', label:'MFS' },
    { key:'Pos', label:'POS (card)' },
    { key:'Emi', label:'EMI' }
];

export function dcLineName
(
    line:
        string
):
    string
{
    return DC_LINES.find(x => x.value === line)?.label ?? 'Other money in';
}


//===============================================================
// Daily Collection : days and totals
//===============================================================

function round2
(
    value:
        number
):
    number
{
    return Math.round((Number(value) || 0) * 100) / 100;
}

function matches
(
    texts:
        string[],
    search:
        string
):
    boolean
{
    const words =
        (search ?? '')
            .toLowerCase()
            .split(/\s+/)
            .filter(x => !!x);

    if (words.length === 0)
    {
        return true;
    }

    const text =
        texts.join(' ').toLowerCase();

    return words.every(word => text.includes(word));
}

export interface DcFilter
{
    collectedBy:number | null;
    line:'' | DcLine;
    search:string;
}

export function dcRowsShown
(
    report:
        DailyCollection,
    filter:
        DcFilter
):
    DcRow[]
{
    return report.Rows.filter
    (
        x =>
            (filter.collectedBy === null || x.CollectedById === filter.collectedBy)
            && (!filter.line || x.Line === filter.line)
            && matches([x.DocumentNo, x.VoucherNo, x.DocumentType, x.Customer, x.Accounts, x.CollectedBy, x.Narration], filter.search)
    );
}

export interface DcDay
{
    date:string;
    cash:number;
    bank:number;
    mfs:number;
    pos:number;
    emi:number;
    // Collections (money in) / refunds (negative) / net
    collections:number;
    refunds:number;
    net:number;
    count:number;
    rows:DcRow[];
}

function emptyDay
(
    date:
        string
):
    DcDay
{
    return {
        date,
        cash:0,
        bank:0,
        mfs:0,
        pos:0,
        emi:0,
        collections:0,
        refunds:0,
        net:0,
        count:0,
        rows:[]
    };
}

function addTo
(
    day:
        DcDay,
    row:
        DcRow
):
    void
{
    day.count++;

    day.rows.push(row);

    if (row.IsRefund)
    {
        day.refunds += row.Total;
    }
    else
    {
        day.cash += row.Cash;

        day.bank += row.Bank;

        day.mfs += row.Mfs;

        day.pos += row.Pos;

        day.emi += row.Emi;

        day.collections += row.Total;
    }

    day.net += row.Total;
}

function roundDay
(
    day:
        DcDay
):
    DcDay
{
    day.cash = round2(day.cash);

    day.bank = round2(day.bank);

    day.mfs = round2(day.mfs);

    day.pos = round2(day.pos);

    day.emi = round2(day.emi);

    day.collections = round2(day.collections);

    day.refunds = round2(day.refunds);

    day.net = round2(day.net);

    return day;
}

export function buildDcDays
(
    rows:
        DcRow[]
):
    { days:DcDay[]; total:DcDay }
{
    const byDate =
        new Map<string, DcDay>();

    const total =
        emptyDay('');

    for (const row of rows)
    {
        let day =
            byDate.get(row.Date);

        if (!day)
        {
            day = emptyDay(row.Date);

            byDate.set(row.Date, day);
        }

        addTo(day, row);

        addTo(total, row);
    }

    total.rows = [];

    return {
        days:[...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).map(roundDay),
        total:roundDay(total)
    };
}

export interface DcGroup
{
    key:string;
    name:string;
    amount:number;
    count:number;
}

function groupBy
(
    rows:
        DcRow[],
    key:
        (row: DcRow) => string,
    name:
        (row: DcRow) => string,
    amount:
        (row: DcRow) => number = row => row.Total
):
    DcGroup[]
{
    const groups =
        new Map<string, DcGroup>();

    for (const row of rows)
    {
        const k =
            key(row);

        let group =
            groups.get(k);

        if (!group)
        {
            group = { key:k, name:name(row), amount:0, count:0 };

            groups.set(k, group);
        }

        group.amount += amount(row);

        group.count++;
    }

    return [...groups.values()]
        .map(x => ({ ...x, amount:round2(x.amount) }))
        .filter(x => !isZero(x.amount))
        .sort((a, b) => b.amount - a.amount);
}

export interface DcTotals
{
    modes:DcGroup[];
    lines:DcGroup[];
    documents:DcGroup[];
    collectors:DcGroup[];
}

// Net of refunds in every panel
export function buildDcTotals
(
    rows:
        DcRow[]
):
    DcTotals
{
    return {
        modes:
            DC_MODES
                .map
                (
                    mode =>
                    ({
                        key:mode.key,
                        name:mode.label,
                        amount:round2(rows.reduce((sum, x) => sum + x[mode.key], 0)),
                        count:rows.filter(x => !isZero(x[mode.key])).length
                    })
                )
                .filter(x => !isZero(x.amount)),
        lines:groupBy(rows, x => x.Line, x => dcLineName(x.Line)),
        documents:groupBy(rows, x => x.DocumentType || x.VoucherType, x => x.DocumentType || x.VoucherType),
        collectors:groupBy(rows, x => String(x.CollectedById), x => x.CollectedBy)
    };
}


//===============================================================
// Invoice-wise Daily Profit & Loss : API shapes
//===============================================================

export type IpLine =
    'mb' | 'sp' | 'ac';

export interface IpDetail
{
    LineNo:number;
    ProductCode:string;
    ProductName:string;
    ChassisNo:string;
    Detail:string;
    Quantity:number;
    UnitPrice:number;
    Gross:number;
    Discount:number;
    Net:number;
    UnitCost:number;
    Cost:number;
    Profit:number;
}

export interface IpRow
{
    Line:IpLine;
    Kind:'invoice' | 'return';
    Date:string;
    DocumentNo:string;
    InvoiceNo:string;
    Customer:string;
    SalesPerson:string;
    Quantity:number;
    Chassis:string;
    Sales:number;
    Discount:number;
    Other:number;
    NetSales:number;
    Cost:number;
    Profit:number;
    // Other vouchers under the invoice number added to it
    LinkedVouchers:number;
    Lines:IpDetail[];
}

// The Profit & Loss of the period by business line
export interface IpCheck
{
    Line:IpLine;
    Sales:number;
    Cost:number;
}

export interface InvoiceProfit
{
    From:string;
    To:string;
    BranchId:number;
    BranchName:string;
    ShowCancelled:boolean;
    Message:string;
    Checks:IpCheck[];
    Rows:IpRow[];
}

export const IP_TABS:
    { key:IpLine; label:string; icon:string }[] =
[
    { key:'mb', label:'Motor Bikes', icon:'fas fa-motorcycle' },
    { key:'sp', label:'Spare Parts & Lubricants', icon:'fas fa-gears' },
    { key:'ac', label:'Accessories', icon:'fas fa-helmet-safety' }
];

export interface IpTotals
{
    count:number;
    quantity:number;
    sales:number;
    discount:number;
    other:number;
    netSales:number;
    cost:number;
    profit:number;
}

export interface IpDay
{
    date:string;
    rows:IpRow[];
    totals:IpTotals;
}

function emptyTotals():
    IpTotals
{
    return { count:0, quantity:0, sales:0, discount:0, other:0, netSales:0, cost:0, profit:0 };
}

function addRow
(
    totals:
        IpTotals,
    row:
        IpRow
):
    void
{
    totals.count++;

    totals.quantity += row.Quantity;

    totals.sales += row.Sales;

    totals.discount += row.Discount;

    totals.other += row.Other;

    totals.netSales += row.NetSales;

    totals.cost += row.Cost;

    totals.profit += row.Profit;
}

function roundTotals
(
    totals:
        IpTotals
):
    IpTotals
{
    return {
        count:totals.count,
        quantity:round2(totals.quantity),
        sales:round2(totals.sales),
        discount:round2(totals.discount),
        other:round2(totals.other),
        netSales:round2(totals.netSales),
        cost:round2(totals.cost),
        profit:round2(totals.profit)
    };
}

export interface IpFilter
{
    line:IpLine;
    salesPerson:string;
    search:string;
}

export function ipRowsShown
(
    report:
        InvoiceProfit,
    filter:
        IpFilter
):
    IpRow[]
{
    return report.Rows.filter
    (
        x =>
            x.Line === filter.line
            && (!filter.salesPerson || x.SalesPerson === filter.salesPerson)
            && matches([x.DocumentNo, x.InvoiceNo, x.Customer, x.SalesPerson, x.Chassis, ...x.Lines.map(l => `${l.ProductCode} ${l.ProductName}`)], filter.search)
    );
}

export function buildIpDays
(
    rows:
        IpRow[]
):
    { days:IpDay[]; total:IpTotals }
{
    const byDate =
        new Map<string, IpDay>();

    const total =
        emptyTotals();

    for (const row of rows)
    {
        let day =
            byDate.get(row.Date);

        if (!day)
        {
            day = { date:row.Date, rows:[], totals:emptyTotals() };

            byDate.set(row.Date, day);
        }

        day.rows.push(row);

        addRow(day.totals, row);

        addRow(total, row);
    }

    return {
        days:
            [...byDate.values()]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(x => ({ ...x, totals:roundTotals(x.totals) })),
        total:roundTotals(total)
    };
}

// Invoices vs the Profit & Loss of the same line : the sales and
// cost of every invoice of the tab (no sales person / search
// filter) against the P&L business-line figures
export interface IpCheckResult
{
    plSales:number;
    plCost:number;
    salesGap:number;
    costGap:number;
    agrees:boolean;
}

export function ipCheck
(
    report:
        InvoiceProfit,
    line:
        IpLine
):
    IpCheckResult
{
    const check =
        report.Checks.find(x => x.Line === line);

    const rows =
        report.Rows.filter(x => x.Line === line);

    const sales =
        round2(rows.reduce((sum, x) => sum + x.Sales, 0));

    const cost =
        round2(rows.reduce((sum, x) => sum + x.Cost, 0));

    const plSales =
        check?.Sales ?? 0;

    const plCost =
        check?.Cost ?? 0;

    const salesGap =
        round2(plSales - sales);

    const costGap =
        round2(plCost - cost);

    return {
        plSales,
        plCost,
        salesGap,
        costGap,
        agrees:isZero(salesGap) && isZero(costGap)
    };
}

// Profit as % of net sales (null when no sales)
export function ipMargin
(
    profit:
        number,
    netSales:
        number
):
    number | null
{
    return isZero(netSales)
        ? null
        : Math.round(profit / netSales * 1000) / 10;
}

export function ipSalesPeople
(
    report:
        InvoiceProfit,
    line:
        IpLine
):
    string[]
{
    return [...new Set(report.Rows.filter(x => x.Line === line && !!x.SalesPerson).map(x => x.SalesPerson))].sort();
}

export function dayText
(
    iso:
        string
):
    string
{
    const date =
        new Date(`${iso}T00:00:00`);

    const name =
        Number.isNaN(date.getTime())
            ? ''
            : date.toLocaleDateString('en-US', { weekday:'short' });

    return `${formatLedgerDate(iso)}${name ? ' · ' + name : ''}`;
}


//===============================================================
// Print requests
//===============================================================

export const DAILY_COLLECTION_PRINT_KEY =
    'daily-collection';

export const INVOICE_PROFIT_PRINT_KEY =
    'invoice-profit';

export interface DailyPrintRequest
{
    from:string;
    to:string;
    branchId:number;
    showCancelled:boolean;
    search:string;
    // Daily Collection
    collectedBy?:number | null;
    line?:'' | DcLine;
    withDetail?:boolean;
    // Invoice-wise P&L
    tab?:IpLine;
    salesPerson?:string;
}
