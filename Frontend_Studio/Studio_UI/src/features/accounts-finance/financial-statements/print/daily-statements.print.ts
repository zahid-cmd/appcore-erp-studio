//===============================================================
// Daily statements : print sources (Print Engine)
//
//   /print-viewer/daily-collection/<token>?doc=daily-collection
//   /print-viewer/invoice-profit/<token>?doc=invoice-profit
//
// The page saves its filter under the token; the viewer loads the
// figures again. Excel : the viewer's Excel button. Header,
// styles and helpers are shared with the Profit & Loss print.
//===============================================================

import
{
    Injector
}
from '@angular/core';

import
{
    firstValueFrom
}
from 'rxjs';

import
{
    ExcelCell,
    ExcelSheet,
    PrintKit,
    PrintSourceDef
}
from '../../../../shared/print/print.models';

import
{
    faPct,
    isZero,
    toIsoDate
}
from '../models/final-accounts.model';

import
{
    DAILY_COLLECTION_PRINT_KEY,
    DC_MODES,
    DailyCollection,
    DailyPrintRequest,
    DcDay,
    DcRow,
    DcTotals,
    INVOICE_PROFIT_PRINT_KEY,
    IP_TABS,
    InvoiceProfit,
    IpDay,
    IpTotals,
    buildDcDays,
    buildDcTotals,
    buildIpDays,
    dcLineName,
    dcRowsShown,
    ipCheck,
    ipMargin,
    ipRowsShown
}
from '../models/daily-statements.model';

import
{
    DailyStatementsService
}
from '../services/daily-statements.service';

import
{
    FINAL_ACCOUNTS_PRINT_CSS,
    amountOf,
    head,
    readRequest,
    saveRequest
}
from './final-accounts.print';


//===============================================================
// Requests saved by the pages
//===============================================================

const STORAGE_PREFIX =
    'appcore.daily-print.';

export function saveDailyPrintRequest
(
    key:
        string,
    request:
        DailyPrintRequest
):
    number
{
    return saveRequest(`${STORAGE_PREFIX}${key}.`, request);
}

function requestOf
(
    key:
        string,
    id:
        number | string
):
    DailyPrintRequest
{
    const today =
        toIsoDate(new Date());

    return readRequest<DailyPrintRequest>(`${STORAGE_PREFIX}${key}.`, Number(id))
        ??
        {
            from:today,
            to:today,
            branchId:0,
            showCancelled:false,
            search:'',
            collectedBy:null,
            line:'',
            withDetail:false,
            tab:'mb',
            salesPerson:''
        };
}

const DAILY_PRINT_CSS =
    FINAL_ACCOUNTS_PRINT_CSS + `
.dc-neg { color: #b42318; }
.dc-net { background: #f7faff; font-weight: 700; }
.dc-day td { font-weight: 700; color: #0b2a5b; background: #f5f8fd; }
.dc-sub { display: block; font-size: 6.4pt; color: #64748b; }
.dc-det td { font-size: 7pt; }
.dc-det td:first-child { padding-left: 5mm; }
.dc-tot td { padding-top: 1.6mm; padding-bottom: 1.6mm; border-top: 1.2px solid #0f172a; border-bottom: 1.2px solid #0f172a; background: #f3f7ff; font-size: 8.2pt; font-weight: 800; color: #0b2a5b; }
.dc-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 3mm; margin-top: 4mm; break-inside: avoid; }
.dc-grid > div { border: 1px solid #dbe3ef; border-radius: 1.6mm; padding: 1.6mm 2.4mm; }
.dc-grid b { display: block; margin-bottom: 1mm; font-size: 6.4pt; letter-spacing: 0.6pt; text-transform: uppercase; color: #1e3a8a; }
.dc-grid span { display: flex; justify-content: space-between; gap: 2mm; font-size: 7pt; }
.ip-dayhead td { background: #e9f0fb; font-weight: 800; color: #0b2a5b; text-transform: uppercase; letter-spacing: 0.4pt; font-size: 7pt; }
.ip-daytot td { background: #f8fafd; font-weight: 700; color: #1e3a8a; }
.ip-ret td { background: #fff7f7; }
`;

function shell
(
    kit:
        PrintKit,
    landscape:
        boolean,
    header:
        string,
    body:
        string
):
    string
{
    const e =
        kit.escape;

    return `<section class="pv-flow${landscape ? ' pv-landscape' : ''}" data-watermark="">
<div class="pv-run-head">
${header}
</div>
<div class="pv-body">
${body}
</div>
<div class="pv-end">
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>
</section>`;
}

function periodOf
(
    kit:
        PrintKit,
    from:
        string,
    to:
        string
):
    string
{
    return from === to
        ? kit.date(from)
        : `${kit.date(from)} – ${kit.date(to)}`;
}

function bold
(
    text:
        string
):
    ExcelCell
{
    return { v:text, s:'bold' };
}

function money
(
    value:
        number,
    strong = false
):
    ExcelCell
{
    return isZero(value) && !strong
        ? null
        : { v:value, s:strong ? 'boldMoney' : 'money' };
}


//===============================================================
// Daily Collection
//===============================================================

export interface DailyCollectionPrintData
{
    request:DailyPrintRequest;
    report:DailyCollection;
    rows:DcRow[];
    days:DcDay[];
    total:DcDay;
    totals:DcTotals;
}

export const DAILY_COLLECTION_PRINT:
    PrintSourceDef<DailyCollectionPrintData> =
{
    key:DAILY_COLLECTION_PRINT_KEY,

    title:'Daily Collection Statement',

    canRotate:true,

    async load
    (
        injector:
            Injector,
        id:
            number | string
    ):
        Promise<DailyCollectionPrintData>
    {
        const request =
            requestOf(DAILY_COLLECTION_PRINT_KEY, id);

        const report =
            await firstValueFrom(
                injector.get(DailyStatementsService).getDailyCollection(request));

        const rows =
            dcRowsShown(
                report,
                {
                    collectedBy:request.collectedBy ?? null,
                    line:request.line ?? '',
                    search:request.search ?? ''
                });

        const built =
            buildDcDays(rows);

        return {
            request,
            report,
            rows,
            days:built.days,
            total:built.total,
            totals:buildDcTotals(rows)
        };
    },

    denyReason():
        string
    {
        return '';
    },

    fileName
    (
        data:
            DailyCollectionPrintData
    ):
        string
    {
        return `Daily Collection - ${data.report.From} to ${data.report.To}`;
    },

    documents:
    [
        {
            key:'daily-collection',
            title:'Daily Collection Statement',
            icon:'fas fa-cash-register',
            render:
                (data: DailyCollectionPrintData, kit: PrintKit) =>
                    dailyCollectionHtml(data, kit, !!kit.landscape),
            css:
                DAILY_PRINT_CSS,
            excel:
                (data: DailyCollectionPrintData, kit: PrintKit) =>
                    dailyCollectionSheet(data, kit)
        }
    ]
};

function dailyCollectionHtml
(
    data:
        DailyCollectionPrintData,
    kit:
        PrintKit,
    landscape:
        boolean
):
    string
{
    const e =
        kit.escape;

    const r =
        data.report;

    const t =
        data.total;

    const period =
        periodOf(kit, r.From, r.To);

    const collector =
        data.request.collectedBy === null || data.request.collectedBy === undefined
            ? ''
            : r.Users.find(x => x.Id === data.request.collectedBy)?.Name ?? '';

    const header =
        head(
            kit,
            'Daily Collection Statement',
            'Period',
            period,
            r.BranchName,
            [
                ['Branch', r.BranchName],
                ['Collected by', collector],
                ['Business line', data.request.line ? dcLineName(data.request.line) : ''],
                ['Cancelled', r.ShowCancelled ? 'Shown' : ''],
                ['Search', data.request.search ?? '']
            ]);

    const cells =
        (day: DcDay, strong: boolean) =>
            `<td class="fa-r fa-rule">${e(amountOf(kit, day.cash, strong))}</td>`
            + `<td class="fa-r fa-rule">${e(amountOf(kit, day.bank, strong))}</td>`
            + `<td class="fa-r fa-rule">${e(amountOf(kit, day.mfs, strong))}</td>`
            + `<td class="fa-r fa-rule">${e(amountOf(kit, day.pos, strong))}</td>`
            + `<td class="fa-r fa-rule">${e(amountOf(kit, day.emi, strong))}</td>`
            + `<td class="fa-r fa-rule">${e(amountOf(kit, day.collections, strong))}</td>`
            + `<td class="fa-r fa-rule dc-neg">${e(amountOf(kit, day.refunds, strong))}</td>`
            + `<td class="fa-r fa-rule dc-net">${e(amountOf(kit, day.net, true))}</td>`;

    const detail =
        (row: DcRow) =>
            `<tr class="dc-det"><td colspan="6">${e(row.Time)} · <b>${e(row.DocumentNo)}</b> ${e(row.DocumentType)} · ${e(row.Customer || '—')} · ${e(row.Accounts)} · ${e(row.CollectedBy)}</td>`
            + `<td class="fa-r fa-rule" colspan="2">${e(dcLineName(row.Line))}</td>`
            + `<td class="fa-r fa-rule${row.IsRefund ? ' dc-neg' : ''}">${e(amountOf(kit, row.Total, true))}</td></tr>`;

    const body =
        data.days
            .map
            (
                day =>
                    `<tr class="dc-day"><td>${e(kit.date(day.date))} <span class="dc-sub">${day.count} receipt${day.count === 1 ? '' : 's'}</span></td>${cells(day, false)}</tr>`
                    + (data.request.withDetail ? day.rows.map(detail).join('') : '')
            )
            .join('');

    const block =
        (title: string, items: { name:string; amount:number; count:number }[]) =>
            `<div><b>${e(title)}</b>${items.map(x => `<span><i>${e(x.name)} (${x.count})</i><i class="${x.amount < 0 ? 'dc-neg' : ''}">${e(amountOf(kit, x.amount, true))}</i></span>`).join('') || '<span>Nothing</span>'}</div>`;

    const content =
        `<div class="fa-band">
  <div><span>Collected</span><b>${e(amountOf(kit, t.collections, true))}</b></div>
  <div><span>Refunds</span><b>${e(amountOf(kit, t.refunds, true))}</b></div>
  <div class="ok"><span>Net collection</span><b>${e(amountOf(kit, t.net, true))}</b></div>
</div>
<table class="pv-split fa-lines">
  <colgroup><col style="width:${landscape ? '44mm' : '30mm'}">${Array(8).fill('<col>').join('')}</colgroup>
  <thead><tr><th>Day</th>${DC_MODES.map(m => `<th class="fa-r fa-rule">${e(m.label)}</th>`).join('')}<th class="fa-r fa-rule">Collected</th><th class="fa-r fa-rule">Refunds</th><th class="fa-r fa-rule">Net</th></tr></thead>
  <tbody>${body || '<tr><td colspan="9" class="fa-none">No money came in during this period.</td></tr>'}</tbody>
  <tfoot><tr class="dc-tot"><td>Total</td>${cells(t, true)}</tr></tfoot>
</table>
<div class="dc-grid">
${block('By mode', data.totals.modes)}
${block('By business line', data.totals.lines)}
${block('By document', data.totals.documents)}
${block('By collector', data.totals.collectors)}
</div>
${r.Message ? `<div class="fa-fine">${e(r.Message)}</div>` : ''}`;

    return shell(kit, landscape, header, content);
}

function dailyCollectionSheet
(
    data:
        DailyCollectionPrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const r =
        data.report;

    const rows:
        ExcelCell[][] =
        data.rows.map
        (
            x =>
                [
                    kit.date(x.Date),
                    x.Time,
                    x.DocumentNo,
                    x.DocumentType,
                    x.VoucherNo,
                    x.Customer,
                    dcLineName(x.Line),
                    x.Accounts,
                    x.CollectedBy,
                    money(x.Cash),
                    money(x.Bank),
                    money(x.Mfs),
                    money(x.Pos),
                    money(x.Emi),
                    money(x.Total, true),
                    x.IsRefund ? 'Refund' : ''
                ]
        );

    const t =
        data.total;

    return {
        name:'Daily Collection',
        columns:[14, 8, 26, 20, 26, 32, 18, 32, 20, 14, 14, 14, 14, 14, 16, 10],
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [bold('DAILY COLLECTION STATEMENT')],
            [bold('Period'), `${kit.date(r.From)} - ${kit.date(r.To)}`, bold('Branch'), r.BranchName],
            [],
            [bold('Date'), bold('Time'), bold('Document'), bold('Kind'), bold('Voucher'), bold('Customer / from'), bold('Line'), bold('Accounts'), bold('Collected by'), bold('Cash'), bold('Bank'), bold('MFS'), bold('POS'), bold('EMI'), bold('Total'), bold('')],
            ...rows,
            [bold('Total'), null, null, null, null, null, null, null, null, money(t.cash, true), money(t.bank, true), money(t.mfs, true), money(t.pos, true), money(t.emi, true), money(t.net, true), null]
        ]
    };
}


//===============================================================
// Invoice-wise Daily Profit & Loss
//===============================================================

export interface InvoiceProfitPrintData
{
    request:DailyPrintRequest;
    report:InvoiceProfit;
    days:IpDay[];
    total:IpTotals;
}

export const INVOICE_PROFIT_PRINT:
    PrintSourceDef<InvoiceProfitPrintData> =
{
    key:INVOICE_PROFIT_PRINT_KEY,

    title:'Invoice-wise Profit & Loss',

    canRotate:true,

    async load
    (
        injector:
            Injector,
        id:
            number | string
    ):
        Promise<InvoiceProfitPrintData>
    {
        const request =
            requestOf(INVOICE_PROFIT_PRINT_KEY, id);

        const report =
            await firstValueFrom(
                injector.get(DailyStatementsService).getInvoiceProfit(request));

        const built =
            buildIpDays(
                ipRowsShown(
                    report,
                    {
                        line:request.tab ?? 'mb',
                        salesPerson:request.salesPerson ?? '',
                        search:request.search ?? ''
                    }));

        return {
            request,
            report,
            days:built.days,
            total:built.total
        };
    },

    denyReason():
        string
    {
        return '';
    },

    fileName
    (
        data:
            InvoiceProfitPrintData
    ):
        string
    {
        return `Invoice Profit ${(data.request.tab ?? 'mb').toUpperCase()} - ${data.report.From} to ${data.report.To}`;
    },

    documents:
    [
        {
            key:'invoice-profit',
            title:'Invoice-wise Profit & Loss',
            icon:'fas fa-file-invoice-dollar',
            render:
                (data: InvoiceProfitPrintData, kit: PrintKit) =>
                    invoiceProfitHtml(data, kit, !!kit.landscape),
            css:
                DAILY_PRINT_CSS,
            excel:
                (data: InvoiceProfitPrintData, kit: PrintKit) =>
                    invoiceProfitSheet(data, kit)
        }
    ]
};

function tabLabel
(
    request:
        DailyPrintRequest
):
    string
{
    return IP_TABS.find(x => x.key === (request.tab ?? 'mb'))?.label ?? '';
}

function invoiceProfitHtml
(
    data:
        InvoiceProfitPrintData,
    kit:
        PrintKit,
    landscape:
        boolean
):
    string
{
    const e =
        kit.escape;

    const r =
        data.report;

    const t =
        data.total;

    const period =
        periodOf(kit, r.From, r.To);

    const qty =
        (value: number) =>
            (Number(value) || 0).toLocaleString('en-US', { maximumFractionDigits:2 });

    const header =
        head(
            kit,
            `Invoice-wise Profit & Loss · ${tabLabel(data.request)}`,
            'Period',
            period,
            r.BranchName,
            [
                ['Branch', r.BranchName],
                ['Line', tabLabel(data.request)],
                ['Sales person', data.request.salesPerson ?? ''],
                ['Cancelled', r.ShowCancelled ? 'Shown' : ''],
                ['Search', data.request.search ?? '']
            ]);

    const figures =
        (x: { quantity:number; sales:number; discount:number; netSales:number; cost:number; profit:number }, strong: boolean) =>
            `<td class="fa-r fa-rule">${e(qty(x.quantity))}</td>`
            + `<td class="fa-r fa-rule">${e(amountOf(kit, x.sales, strong))}</td>`
            + `<td class="fa-r fa-rule dc-neg">${e(amountOf(kit, x.discount, strong))}</td>`
            + `<td class="fa-r fa-rule">${e(amountOf(kit, x.netSales, strong))}</td>`
            + `<td class="fa-r fa-rule">${e(amountOf(kit, x.cost, strong))}</td>`
            + `<td class="fa-r fa-rule dc-net${x.profit < 0 ? ' dc-neg' : ''}">${e(amountOf(kit, x.profit, true))}</td>`
            + `<td class="fa-r fa-rule">${e(faPct(ipMargin(x.profit, x.netSales)))}</td>`;

    const body =
        data.days
            .map
            (
                day =>
                    `<tr class="ip-dayhead"><td colspan="9">${e(kit.date(day.date))}</td></tr>`
                    + day.rows
                        .map
                        (
                            row =>
                                `<tr class="${row.Kind === 'return' ? 'ip-ret' : ''}"><td><b>${e(row.DocumentNo)}</b>${row.Kind === 'return' ? `<span class="dc-sub">Return of ${e(row.InvoiceNo || '—')}</span>` : ''}</td>`
                                + `<td>${e(row.Customer || '—')}${row.SalesPerson || row.Chassis ? `<span class="dc-sub">${e([row.SalesPerson, row.Chassis].filter(x => !!x).join(' · '))}</span>` : ''}</td>`
                                + figures(
                                    {
                                        quantity:row.Quantity,
                                        sales:row.Sales,
                                        discount:row.Discount,
                                        netSales:row.NetSales,
                                        cost:row.Cost,
                                        profit:row.Profit
                                    },
                                    false)
                                + '</tr>'
                                + (data.request.withDetail
                                    ? row.Lines
                                        .map
                                        (
                                            l =>
                                                `<tr class="dc-det"><td colspan="2">${e(l.ProductName)}${l.ChassisNo ? ` · ${e(l.ChassisNo)}` : ''}</td>`
                                                + `<td class="fa-r fa-rule">${e(qty(l.Quantity))}</td>`
                                                + `<td class="fa-r fa-rule">${e(amountOf(kit, l.Gross, false))}</td>`
                                                + `<td class="fa-r fa-rule">${e(amountOf(kit, l.Discount, false))}</td>`
                                                + `<td class="fa-r fa-rule">${e(amountOf(kit, l.Net, false))}</td>`
                                                + `<td class="fa-r fa-rule">${e(amountOf(kit, l.Cost, false))}</td>`
                                                + `<td class="fa-r fa-rule">${e(amountOf(kit, l.Profit, false))}</td>`
                                                + '<td class="fa-r fa-rule"></td></tr>'
                                        )
                                        .join('')
                                    : '')
                        )
                        .join('')
                    + `<tr class="ip-daytot"><td colspan="2" class="fa-r">Day total · ${day.totals.count}</td>${figures(day.totals, true)}</tr>`
            )
            .join('');

    const checkLine =
        () =>
        {
            if (data.request.salesPerson || data.request.search)
            {
                return '';
            }

            const c =
                ipCheck(r, data.request.tab ?? 'mb');

            return `<div class="fa-fine">Profit &amp; Loss · ${e(tabLabel(data.request))} : Sales ${e(amountOf(kit, c.plSales, true))} · Cost ${e(amountOf(kit, c.plCost, true))} · `
                + (c.agrees
                    ? '<b>agrees with the invoices</b>'
                    : `<b class="dc-neg">not on invoices : Sales ${e(amountOf(kit, c.salesGap, true))} · Cost ${e(amountOf(kit, c.costGap, true))}</b>`)
                + '</div>';
        };

    const content =
        `<div class="fa-band">
  <div><span>Net sales</span><b>${e(amountOf(kit, t.netSales, true))}</b></div>
  <div><span>Cost</span><b>${e(amountOf(kit, t.cost, true))}</b></div>
  <div class="${t.profit < 0 ? 'bad' : 'ok'}"><span>Profit${faPct(ipMargin(t.profit, t.netSales)) ? ' · ' + faPct(ipMargin(t.profit, t.netSales)) : ''}</span><b>${e(amountOf(kit, t.profit, true))}</b></div>
</div>
<table class="pv-split fa-lines">
  <colgroup><col style="width:${landscape ? '44mm' : '30mm'}"><col><col style="width:11mm">${Array(5).fill(`<col style="width:${landscape ? '26mm' : '19mm'}">`).join('')}<col style="width:13mm"></colgroup>
  <thead><tr><th>Invoice</th><th>Customer · sales person</th><th class="fa-r fa-rule">Qty</th><th class="fa-r fa-rule">Sales</th><th class="fa-r fa-rule">Discount</th><th class="fa-r fa-rule">Net sales</th><th class="fa-r fa-rule">Cost</th><th class="fa-r fa-rule">Profit</th><th class="fa-r fa-rule">Margin</th></tr></thead>
  <tbody>${body || '<tr><td colspan="9" class="fa-none">No posted invoice in this period.</td></tr>'}</tbody>
  <tfoot><tr class="dc-tot"><td colspan="2">Total · ${t.count} document${t.count === 1 ? '' : 's'}</td>${figures(t, true)}</tr></tfoot>
</table>
<div class="fa-fine">Figures from each invoice's journal (and later vouchers under its number) : sales without VAT; discount = discount / promotion / price-reduction ledgers; net sales also holds other income on the invoice (price increase, commission); cost = FIFO cost of goods sold. Returns are negative.</div>
${checkLine()}
${r.Message ? `<div class="fa-fine">${e(r.Message)}</div>` : ''}`;

    return shell(kit, landscape, header, content);
}

function invoiceProfitSheet
(
    data:
        InvoiceProfitPrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const r =
        data.report;

    const rows:
        ExcelCell[][] = [];

    for (const day of data.days)
    {
        for (const row of day.rows)
        {
            rows.push(
                [
                    kit.date(row.Date),
                    row.DocumentNo,
                    row.Kind === 'return' ? `Return of ${row.InvoiceNo}` : 'Invoice',
                    row.Customer,
                    row.SalesPerson,
                    row.Chassis,
                    row.Quantity,
                    money(row.Sales),
                    money(row.Discount),
                    money(row.Other),
                    money(row.NetSales),
                    money(row.Cost),
                    money(row.Profit, true),
                    faPct(ipMargin(row.Profit, row.NetSales))
                ]);
        }

        const t =
            day.totals;

        rows.push(
            [bold(`Day total ${kit.date(day.date)}`), null, null, null, null, null, t.quantity, money(t.sales, true), money(t.discount, true), money(t.other, true), money(t.netSales, true), money(t.cost, true), money(t.profit, true), faPct(ipMargin(t.profit, t.netSales))]);
    }

    const t =
        data.total;

    return {
        name:'Invoice Profit',
        columns:[14, 26, 22, 32, 20, 26, 8, 14, 14, 14, 14, 14, 14, 10],
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [bold(`INVOICE-WISE PROFIT & LOSS : ${tabLabel(data.request).toUpperCase()}`)],
            [bold('Period'), `${kit.date(r.From)} - ${kit.date(r.To)}`, bold('Branch'), r.BranchName],
            [],
            [bold('Date'), bold('Document'), bold('Kind'), bold('Customer'), bold('Sales person'), bold('Chassis'), bold('Qty'), bold('Sales'), bold('Discount'), bold('Other income'), bold('Net sales'), bold('Cost'), bold('Profit'), bold('Margin')],
            ...rows,
            [bold('Total'), null, null, null, null, null, t.quantity, money(t.sales, true), money(t.discount, true), money(t.other, true), money(t.netSales, true), money(t.cost, true), money(t.profit, true), faPct(ipMargin(t.profit, t.netSales))]
        ]
    };
}
