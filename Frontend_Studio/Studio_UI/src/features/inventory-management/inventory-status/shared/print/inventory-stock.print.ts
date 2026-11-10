//===============================================================
// Inventory Status : print source (Print Engine), shared by the
// three stock pages
//
//   /print-viewer/<page print key>/<token>?doc=stock-position
//   (&orient=landscape : the viewer's Portrait / Landscape switch)
//
// The list saves its filters under the token (browser storage)
// before opening the viewer; the viewer reads the stock again
// from the server and keeps the same rows. A token that is no
// longer there prints the whole page type (all branches).
//
// Documents : Stock Position (A4 flow, Excel); on the Motor Bike
// page's Bike Units tab : Bike Units. One layout each; the viewer's
// Portrait / Landscape switch re-renders it (kit.landscape) with
// more columns on the wide page.
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
from '../../../../../shared/print/print.models';

import
{
    InventoryStockPageConfig
}
from '../inventory-stock.config';

import
{
    VOUCHER_SWITCH
}
from '../../../../../shared/components/accounting/voucher-switches';

import
{
    InventoryBikeUnit,
    InventoryStockFilter,
    InventoryStockRow,
    filterStockRows,
    formatQuantity
}
from '../inventory-stock.model';

import
{
    bikesNoWord
}
from '../../../../../core/motor-power/motor-power.service';

import
{
    InventoryStockService
}
from '../inventory-stock.service';


//===============================================================
// Request saved by the list
//===============================================================

export interface StockPrintRequest
{
    pageType:string;
    branchId:number;
    warehouseId:number;
    branchName:string;
    warehouseName:string;
    tab:string;
    tabLabel:string;
    kind:string;
    filter:InventoryStockFilter;
    filterLabel:string;
    category:string;
    search:string;
}

const STORAGE_PREFIX =
    'appcore.stock-print.';

// Saves the request; returns its token (the viewer's id)
export function saveStockPrintRequest
(
    request:
        StockPrintRequest
):
    number
{
    const token =
        Date.now();

    try
    {
        localStorage.setItem(
            STORAGE_PREFIX + token,
            JSON.stringify(request)
        );
    }
    catch
    {
        // Storage blocked : the viewer prints every row
    }

    return token;
}

function readStockPrintRequest
(
    token:
        number
):
    StockPrintRequest | null
{
    try
    {
        const text =
            localStorage.getItem(STORAGE_PREFIX + token);

        return text
            ? JSON.parse(text) as StockPrintRequest
            : null;
    }
    catch
    {
        return null;
    }
}


//===============================================================
// Data
//===============================================================

export interface StockPrintData
{
    page:InventoryStockPageConfig;
    request:StockPrintRequest;
    canViewCost:boolean;
    asOf:string;
    rows:InventoryStockRow[];
    bikes:InventoryBikeUnit[];
    bikesTab:boolean;
}


//===============================================================
// Source
//===============================================================

export function inventoryStockPrintSource
(
    page:
        InventoryStockPageConfig
):
    PrintSourceDef<StockPrintData>
{
    return {
        key:page.printKey,

        title:page.title,

        // Portrait / Landscape switch in the viewer
        canRotate:true,

        async load
        (
            injector:
                Injector,
            id:
                number
        ):
            Promise<StockPrintData>
        {
            const request:
                StockPrintRequest =
                readStockPrintRequest(id)
                ??
                {
                    pageType:page.pageType,
                    branchId:0,
                    warehouseId:0,
                    branchName:'All Branches',
                    warehouseName:'All Warehouses',
                    tab:page.tabs[0]?.id ?? '',
                    tabLabel:page.tabs[0]?.label ?? '',
                    kind:page.tabs[0]?.kind ?? '',
                    filter:'all',
                    filterLabel:'Stocked',
                    category:'',
                    search:''
                };

            const service =
                injector.get(InventoryStockService);

            const bikesTab =
                request.tab === 'bikes';

            if
            (
                bikesTab
            )
            {
                const bikes =
                    await firstValueFrom(
                        service.getBikes(page.apiPath, request.branchId, '')
                    );

                const text =
                    (request.search ?? '').trim().toLowerCase();

                return {
                    page,
                    request,
                    canViewCost:bikes.CanViewCost,
                    asOf:'',
                    rows:[],
                    bikes:bikes.Rows.filter
                    (
                        x =>
                            !text
                            ||
                            [x.ChassisNo, x.EngineNo, x.KeyNo, x.BatteryNo, x.ProductCode, x.ProductName, x.PurchaseNo, x.Status]
                                .some(value => String(value ?? '').toLowerCase().includes(text))
                    ),
                    bikesTab
                };
            }

            const stock =
                await firstValueFrom(
                    service.getStock(page.apiPath, request.branchId, request.warehouseId)
                );

            return {
                page,
                request,
                canViewCost:stock.CanViewCost,
                asOf:stock.AsOf,
                rows:filterStockRows(
                    stock.Rows,
                    {
                        kind:request.kind,
                        filter:request.filter,
                        category:request.category,
                        search:request.search
                    }
                ),
                bikes:[],
                bikesTab
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
                StockPrintData
        ):
            string
        {
            return `${data.page.title}${data.bikesTab ? ' - Bike Units' : ''}`;
        },

        documents:
        [
            {
                key:'stock-position',

                title:'Stock Position',

                icon:'fas fa-boxes-stacked',

                available:
                    (data: StockPrintData) =>
                        !data.bikesTab,

                render:
                    (data: StockPrintData, kit: PrintKit) =>
                        stockPositionHtml(data, kit, !!kit.landscape),

                css:
                    STOCK_PRINT_CSS,

                excel:
                    (data: StockPrintData, kit: PrintKit) =>
                        stockPositionSheet(data, kit)
            },

            {
                key:'bike-units',

                title:'Bike Units',

                icon:'fas fa-motorcycle',

                available:
                    (data: StockPrintData) =>
                        data.bikesTab,

                render:
                    (data: StockPrintData, kit: PrintKit) =>
                        bikeUnitsHtml(data, kit, !!kit.landscape),

                css:
                    STOCK_PRINT_CSS,

                excel:
                    (data: StockPrintData, kit: PrintKit) =>
                        bikeUnitsSheet(data, kit)
            }
        ]
    };
}


//===============================================================
// Header : compact, one band (repeated on every page)
//
//   [logo] Company / address / contact      REPORT
//                                            Page title
//                                            As of 31-Oct-2026  [QR]
//   Branch … · Warehouse … · View … · Showing …   (one line)
//
// Logo and BIN / TIN follow the company print switches.
//===============================================================

function stockHead
(
    data:
        StockPrintData,
    kit:
        PrintKit,
    report:
        string,
    summary:
        string
):
    string
{
    const e =
        kit.escape;

    const request =
        data.request;

    const company =
        kit.company;

    const asOf =
        kit.date(data.asOf || new Date().toISOString().slice(0, 10));

    const logo =
        kit.logo && kit.isOn(VOUCHER_SWITCH.PRINT_LOGO, true)
            ? `<img class="sh-logo" src="${e(kit.logo)}" alt="">`
            : '';

    const address =
        [company?.AddressLine1, company?.AddressLine2]
            .map(part => (part ?? '').trim())
            .filter(part => !!part)
            .join(', ');

    // One fact group per line : phones, email, BIN / TIN
    const phones =
        [
            company?.Phone ? `Phone : ${company.Phone}` : '',
            company?.Mobile ? `Mobile : ${company.Mobile}` : ''
        ]
        .filter(part => !!part)
        .join(' · ');

    const legal =
        kit.isOn(VOUCHER_SWITCH.PRINT_BIN_TIN, true)
            ? [
                company?.BINNo ? `BIN : ${company.BINNo}` : '',
                company?.TINNo ? `TIN : ${company.TINNo}` : ''
            ]
            .filter(part => !!part)
            .join(' · ')
            : '';

    // Each fact stays whole (Phone / Mobile, BIN / TIN wrap
    // between facts, never inside a number)
    const lines =
        [address, phones, company?.Email ? `Email : ${company.Email}` : '', legal]
            .filter(part => !!part)
            .map
            (
                (part, index) =>
                    index === 0
                        ? `<span>${e(part)}</span>`
                        : `<span>${part.split(' · ').map(fact => `<em>${e(fact)}</em>`).join('<i> · </i>')}</span>`
            )
            .join('');

    const qrText =
        [
            company?.CompanyName || 'AppCore ERP',
            data.page.title,
            report,
            summary,
            `As of ${asOf}`
        ]
        .filter(part => !!part)
        .join(' | ');

    let qr = '';

    try
    {
        qr =
            kit.qr(qrText);
    }
    catch
    {
        qr = '';
    }

    const meta =
        [
            ['Branch', request.branchName || 'All Branches'],
            ...(data.bikesTab ? [] : [['Warehouse', request.warehouseName || 'All Warehouses']]),
            ...(request.tabLabel && data.page.tabs.length > 1 ? [['View', request.tabLabel]] : []),
            ...(!data.bikesTab ? [['Showing', request.filterLabel || 'Stocked']] : []),
            ...(request.category ? [['Category', request.category]] : []),
            ...(request.search ? [['Search', request.search]] : [])
        ]
        .map(([label, value]) => `<span><i>${e(label)}</i>${e(value)}</span>`)
        .join('');

    return `<div class="sh">
  <div class="sh-card sh-left">
    ${logo}
    <div class="sh-co">
      <b>${e(company?.CompanyName ?? '')}</b>
      ${lines}
    </div>
  </div>
  <div class="sh-divider"></div>
  <div class="sh-card sh-right">
    <div class="sh-doc">
      <span class="sh-kicker">${e(report)}</span>
      <b class="sh-title">${e(data.page.title)}</b>
      <span class="sh-asof">As of <b>${e(asOf)}</b></span>
    </div>
    ${qr ? `<div class="sh-qr">${qr}</div>` : ''}
  </div>
</div>
<div class="sh-meta">${meta}</div>`;
}


//===============================================================
// Stock Position
//
//   Portrait  : SL · Product (name; code / part no · colour ·
//               brand · category · location) · In Transit · On
//               Hand · Total · Re-order · [Avg. Cost · Value] ·
//               Status
//   Landscape : every fact in its own column (code, colour /
//               part no, brand, category, location, batches,
//               last movement)
//
// Rows are grouped by category with a subtotal per group; a
// summary band (items, quantities, value, low / out) sits under
// the filters.
//===============================================================

function stockPositionHtml
(
    data:
        StockPrintData,
    kit:
        PrintKit,
    landscape:
        boolean
):
    string
{
    const e =
        kit.escape;

    const page =
        data.page;

    const mb =
        page.pageType === 'MB';

    const cost =
        data.canViewCost;

    const rows =
        [...data.rows].sort
        (
            (a, b) =>
                (a.CategoryName || '~').localeCompare(b.CategoryName || '~')
                ||
                a.ProductCode.localeCompare(b.ProductCode, undefined, { numeric:true })
        );

    const sum =
        (list: InventoryStockRow[], pick: (x: InventoryStockRow) => number) =>
            list.reduce((total, x) => total + (pick(x) || 0), 0);

    const qty =
        (value: number, dash: boolean = false) =>
            dash && !value
                ? '<span class="sp-dash">–</span>'
                : formatQuantity(value);

    //===========================================================
    // Columns
    //===========================================================

    type Col = { head:string; width:string; cls?:string };

    const cols:
        Col[] =
        landscape
            ? [
                { head:'SL', width:'8mm', cls:'vd-c' },
                { head:'Code', width:'31mm' },
                { head:mb ? 'Model' : page.productHeader, width:'' },
                ...(mb
                    ? [{ head:'Colour', width:'17mm' }]
                    : [{ head:'Part No', width:'24mm' }]),
                { head:'Brand · Category', width:'32mm' },
                ...(page.showLocation ? [{ head:'Location', width:'22mm' }] : []),
                { head:'In Transit', width:'16mm', cls:'vd-r' },
                { head:'On Hand', width:'15mm', cls:'vd-r' },
                { head:'Total', width:'13mm', cls:'vd-r' },
                { head:'Re-order', width:'14mm', cls:'vd-r' },
                // SP / AC give this room to Location
                ...(page.showLocation ? [] : [{ head:'Last Move', width:'21mm', cls:'vd-c' }]),
                ...(cost
                    ? [{ head:'Avg. Cost', width:'20mm', cls:'vd-r' }, { head:'Value (Tk)', width:'24mm', cls:'vd-r' }]
                    : []),
                { head:'Status', width:'22mm' }
            ]
            : [
                { head:'SL', width:'8mm', cls:'vd-c' },
                { head:mb ? 'Model' : page.productHeader, width:'' },
                { head:'In Transit', width:'16mm', cls:'vd-r' },
                { head:'On Hand', width:'15mm', cls:'vd-r' },
                { head:'Total', width:'12mm', cls:'vd-r' },
                { head:'Re-order', width:'14mm', cls:'vd-r' },
                ...(cost
                    ? [{ head:'Avg. Cost', width:'20mm', cls:'vd-r' }, { head:'Value (Tk)', width:'23mm', cls:'vd-r' }]
                    : []),
                { head:'Status', width:'21mm' }
            ];

    const colCount =
        cols.length;

    // Columns before In Transit (where a subtotal label spans)
    const lead =
        cols.findIndex(x => x.head === 'In Transit');

    //===========================================================
    // One product row
    //===========================================================

    let serial = 0;

    const status =
        (row: InventoryStockRow) =>
            `<span class="sp-st sp-${statusKey(row.StockStatus)}"><i></i>${e(row.StockStatus)}</span>`;

    const productRow =
        (row: InventoryStockRow) =>
        {
            serial++;

            const figures =
                `<td class="vd-r">${qty(row.InTransit, true)}</td>
  <td class="vd-r">${qty(row.OnHand, true)}</td>
  <td class="vd-r sp-strong">${qty(row.Total)}</td>
  <td class="vd-r sp-soft">${row.ReorderLevel > 0 ? formatQuantity(row.ReorderLevel) : '<span class="sp-dash">–</span>'}</td>`;

            const money =
                cost
                    ? `<td class="vd-r">${row.Total > 0 ? kit.money(row.AverageCost) : '<span class="sp-dash">–</span>'}</td>
  <td class="vd-r sp-strong">${row.Total > 0 ? kit.money(row.StockValue) : '<span class="sp-dash">–</span>'}</td>`
                    : '';

            if
            (
                landscape
            )
            {
                return `<tr>
  <td class="vd-c vd-sl">${serial}</td>
  <td class="sp-code">${e(row.ProductCode)}</td>
  <td class="vd-main">${e(row.ItemName)}</td>
  <td>${e(mb ? row.ColorName : row.PartNumber)}</td>
  <td>${e(row.CategoryName)}${row.BrandName && !row.CategoryName.startsWith(row.BrandName) ? `<div class="vd-code">${e(row.BrandName)}</div>` : ''}</td>
  ${page.showLocation ? `<td>${e(row.Location || '–')}</td>` : ''}
  ${figures}
  ${page.showLocation ? '' : `<td class="vd-c sp-soft sp-nowrap">${row.LastMovementDate ? e(kit.date(row.LastMovementDate)) : '–'}</td>`}
  ${money}
  <td>${status(row)}</td>
</tr>`;
            }

            const sub =
                [
                    row.ProductCode,
                    mb ? row.ColorName : row.PartNumber,
                    row.BrandName,
                    page.showLocation && row.Location ? `Loc ${row.Location}` : ''
                ]
                .filter(x => !!x)
                .map(x => e(x))
                .join(' · ');

            return `<tr>
  <td class="vd-c vd-sl">${serial}</td>
  <td><div class="vd-main">${e(row.ItemName)}</div><div class="vd-code">${sub}</div></td>
  ${figures}
  ${money}
  <td>${status(row)}</td>
</tr>`;
        };

    //===========================================================
    // Groups (category) with subtotals
    //===========================================================

    const groups =
        new Map<string, InventoryStockRow[]>();

    for
    (
        const row of rows
    )
    {
        const key =
            row.CategoryName || 'Uncategorised';

        groups.set(key, [...(groups.get(key) ?? []), row]);
    }

    const totalsCells =
        (list: InventoryStockRow[]) =>
            `<td class="vd-r">${formatQuantity(sum(list, x => x.InTransit))}</td>
  <td class="vd-r">${formatQuantity(sum(list, x => x.OnHand))}</td>
  <td class="vd-r">${formatQuantity(sum(list, x => x.Total))}</td>
  <td></td>
  ${landscape && !page.showLocation ? '<td></td>' : ''}
  ${cost ? `<td></td><td class="vd-r">${kit.money(sum(list, x => x.StockValue))}</td>` : ''}
  <td></td>`;

    const body =
        Array.from(groups.entries())
            .map
            (
                ([name, list]) =>
                    `<tr class="sp-group"><td colspan="${colCount}"><b>${e(name)}</b><span>${list.length} ${e(page.itemWord)}${list.length === 1 ? '' : 's'}</span></td></tr>
${list.map(productRow).join('')}
${groups.size > 1
    ? `<tr class="sp-subtotal"><td colspan="${lead}" class="vd-r">Subtotal · ${e(name)}</td>${totalsCells(list)}</tr>`
    : ''}`
            )
            .join('');

    //===========================================================
    // Summary band
    //===========================================================

    const low =
        rows.filter(x => x.StockStatus === 'Low Stock' || x.StockStatus === 'Critical').length;

    const out =
        rows.filter(x => x.StockStatus === 'Out of Stock').length;

    const band =
        [
            ['Items', `${rows.length}`],
            ['In Transit', formatQuantity(sum(rows, x => x.InTransit))],
            ['On Hand', formatQuantity(sum(rows, x => x.OnHand))],
            ['Total Units', formatQuantity(sum(rows, x => x.Total))],
            ...(cost ? [['Stock Value', `Tk ${kit.money(sum(rows, x => x.StockValue))}`]] : []),
            ['Low / Critical', `${low}`],
            ['Out of Stock', `${out}`]
        ]
        .map(([label, value]) => `<div><span>${e(label)}</span><b>${e(value)}</b></div>`)
        .join('');

    return `<section class="pv-flow${landscape ? ' pv-landscape' : ''}" data-watermark="">
<div class="pv-run-head">
${stockHead(data, kit, 'Stock Position', `${rows.length} ${page.itemWord}s, ${formatQuantity(sum(rows, x => x.Total))} units`)}
</div>
<div class="pv-body">
<div class="sp-band" style="grid-template-columns:${cost ? 'repeat(4, minmax(0, 1fr)) minmax(0, 1.7fr) repeat(2, minmax(0, 1fr))' : 'repeat(6, minmax(0, 1fr))'}">${band}</div>
<table class="pv-split vd-lines sp-lines${landscape ? ' sp-wide' : ''}">
  <colgroup>${cols.map(x => x.width ? `<col style="width:${x.width}">` : '<col>').join('')}</colgroup>
  <thead><tr>${cols.map(x => `<th class="${x.cls ?? ''}">${e(x.head)}</th>`).join('')}</tr></thead>
  <tbody>${body || `<tr><td colspan="${colCount}" class="vd-c sp-none">No ${e(page.itemWord)} matches.</td></tr>`}</tbody>
  <tfoot>
    <tr class="sp-grand"><td colspan="${lead}" class="vd-r">Grand Total · ${rows.length} ${e(page.itemWord)}${rows.length === 1 ? '' : 's'}</td>${totalsCells(rows)}</tr>
  </tfoot>
</table>
${!cost ? '<div class="sp-fine">Cost and value are not shown (View Cost permission).</div>' : ''}
</div>
<div class="pv-end">
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>
</section>`;
}


//===============================================================
// Bike Units (grouped by model)
//===============================================================

function bikeUnitsHtml
(
    data:
        StockPrintData,
    kit:
        PrintKit,
    landscape:
        boolean
):
    string
{
    const e =
        kit.escape;

    const cost =
        data.canViewCost;

    const bikes =
        [...data.bikes].sort
        (
            (a, b) =>
                a.ProductCode.localeCompare(b.ProductCode, undefined, { numeric:true })
                ||
                a.ChassisNo.localeCompare(b.ChassisNo)
        );

    // Portrait stacks the numbers two to a cell (Chassis over
    // Engine, Key over Battery, Purchase over Stock In) so nothing
    // runs into the next column
    // Landscape : a Branch column only when every branch is shown
    const branchCol =
        landscape
        &&
        !data.request.branchId;

    const colCount =
        (landscape ? 8 : 5) + (branchCol ? 1 : 0) + (cost ? 1 : 0);

    const groups =
        new Map<string, InventoryBikeUnit[]>();

    for
    (
        const bike of bikes
    )
    {
        const key =
            `${bike.ProductName}|${bike.ProductCode}`;

        groups.set(key, [...(groups.get(key) ?? []), bike]);
    }

    let serial = 0;

    const body =
        Array.from(groups.entries())
            .map
            (
                ([key, list]) =>
                {
                    const [name, code] =
                        key.split('|');

                    return `<tr class="sp-group"><td colspan="${colCount}"><b>${e(name)}</b><span>${e(code)} · ${list.length} bike${list.length === 1 ? '' : 's'}</span></td></tr>
${list.map
(
    bike =>
    {
        serial++;

        const status =
            `<td><span class="sp-st sp-${statusKey(bike.Status)}"><i></i>${e(bike.Status)}</span></td>`;

        const unitCost =
            cost
                ? `<td class="vd-r">${kit.money(bike.UnitCost)}</td>`
                : '';

        if
        (
            !landscape
        )
        {
            return `<tr>
  <td class="vd-c vd-sl">${serial}</td>
  <td><div class="sp-no sp-main-no">${e(bike.ChassisNo)}</div><div class="sp-no sp-sub-no">${e(bike.EngineNo)}</div></td>
  <td><div class="sp-no">${e(bike.KeyNo || '–')}</div><div class="sp-no sp-sub-no">${e(bike.BatteryNo || '–')}</div></td>
  <td><div class="sp-no">${e(bike.PurchaseNo)}</div><div class="vd-code">${e(kit.date(bike.StockInDate))}</div></td>
  ${unitCost}
  ${status}
</tr>`;
        }

        return `<tr>
  <td class="vd-c vd-sl">${serial}</td>
  <td class="sp-no">${e(bike.ChassisNo)}</td>
  <td class="sp-no">${e(bike.EngineNo)}</td>
  <td class="sp-no">${e(bike.KeyNo || '–')}</td>
  <td class="sp-no">${e(bike.BatteryNo || '–')}</td>
  ${branchCol ? `<td>${e(bike.BranchName)}</td>` : ''}
  <td class="sp-no">${e(bike.PurchaseNo)}</td>
  <td class="vd-c sp-nowrap">${e(kit.date(bike.StockInDate))}</td>
  ${unitCost}
  ${status}
</tr>`;
    }
).join('')}`;
                }
            )
            .join('');

    const head =
        landscape
            ? `<colgroup><col style="width:8mm"><col style="width:45mm"><col style="width:30mm"><col style="width:14mm"><col style="width:34mm">${branchCol ? '<col style="width:30mm">' : ''}<col><col style="width:20mm">${cost ? '<col style="width:22mm">' : ''}<col style="width:20mm"></colgroup>
  <thead><tr><th class="vd-c">SL</th><th>Chassis No</th><th>${bikesNoWord(data.bikes.map(x => x.ProductId))} No</th><th>Key No</th><th>Battery No</th>${branchCol ? '<th>Branch</th>' : ''}<th>Purchase No</th><th class="vd-c">Stock In</th>${cost ? '<th class="vd-r">Unit Cost</th>' : ''}<th>Status</th></tr></thead>`
            : `<colgroup><col style="width:8mm"><col style="width:46mm"><col style="width:36mm"><col>${cost ? '<col style="width:22mm">' : ''}<col style="width:22mm"></colgroup>
  <thead><tr><th class="vd-c">SL</th><th>Chassis No<span class="sp-th-sub">${bikesNoWord(data.bikes.map(x => x.ProductId))} No</span></th><th>Key No<span class="sp-th-sub">Battery No</span></th><th>Purchase No<span class="sp-th-sub">Stock In</span></th>${cost ? '<th class="vd-r">Unit Cost</th>' : ''}<th>Status</th></tr></thead>`;

    const inStock =
        bikes.filter(x => x.Status === 'In Stock').length;

    const transit =
        bikes.filter(x => x.Status === 'In Transit' || x.Status === 'Partly Received').length;

    return `<section class="pv-flow${landscape ? ' pv-landscape' : ''}" data-watermark="">
<div class="pv-run-head">
${stockHead(data, kit, 'Bike Units', `${bikes.length} bikes`)}
</div>
<div class="pv-body">
<div class="sp-band" style="grid-template-columns:repeat(4, minmax(0, 1fr))">
  <div><span>Models</span><b>${groups.size}</b></div>
  <div><span>Bikes</span><b>${bikes.length}</b></div>
  <div><span>In Stock</span><b>${inStock}</b></div>
  <div><span>In Transit</span><b>${transit}</b></div>
</div>
<table class="pv-split vd-lines sp-lines${landscape ? ' sp-wide' : ''}">
  ${head}
  <tbody>${body || `<tr><td colspan="${colCount}" class="vd-c sp-none">No bike matches.</td></tr>`}</tbody>
</table>
</div>
<div class="pv-end">
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>
</section>`;
}


function statusKey
(
    status:
        string
):
    string
{
    return String(status ?? '')
        .toLowerCase()
        .replace(/[^a-z]+/g, '-');
}


//===============================================================
// Styles
//===============================================================

const STOCK_PRINT_CSS = `
/* Compact paper margins for these reports */
.pv-page-inner { padding: 7mm 10mm 6mm; }

/* Header : two identical cards split by a divider */
.sh { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: stretch; gap: 0 3mm; }
.sh-card { display: flex; align-items: center; gap: 3mm; min-width: 0; padding: 2mm 3mm;
           border: 1px solid #cdd9ee; border-radius: 2mm; background: linear-gradient(180deg, #f7faff 0%, #ffffff 100%); }
.sh-divider { width: 0.5mm; margin: 1.5mm 0; border-radius: 1mm; background: linear-gradient(180deg, #93b4f5, #1e3a8a); }
.sh-logo { display: block; flex: 0 0 auto; height: 11mm; max-width: 22mm; object-fit: contain; }
.sh-co { display: flex; flex-direction: column; min-width: 0; line-height: 1.32; }
.sh-co b { font-size: 11pt; font-weight: 800; color: #0b2a5b; margin-bottom: 0.3mm; }
.sh-co span { font-size: 6.6pt; color: #475569; overflow-wrap: anywhere; }
.sh-co em { font-style: normal; white-space: nowrap; }
.sh-co span i { font-style: normal; color: #94a3b8; }
.sh-right { justify-content: space-between; }
.sh-doc { display: flex; flex-direction: column; min-width: 0; line-height: 1.3; }
.sh-kicker { font-size: 6pt; font-weight: 700; letter-spacing: 1.4pt; text-transform: uppercase; color: #64748b; }
.sh-title { font-size: 11pt; font-weight: 800; color: #0b2a5b; }
.sh-asof { margin-top: 0.6mm; font-size: 7pt; color: #475569; }
.sh-asof b { color: #0b2a5b; }
.sh-qr { flex: 0 0 auto; width: 14mm; height: 14mm; padding: 0.8mm; border: 1px solid #cdd9ee; border-radius: 1.4mm; background: #ffffff; }
.sh-qr svg { display: block; width: 100%; height: 100%; }
.sh-meta { display: flex; flex-wrap: wrap; gap: 0.6mm 5mm; margin-top: 2mm; padding: 1.2mm 0 1.6mm; border-top: 1.2px solid #1e3a8a; font-size: 7.4pt; color: #0f172a; font-weight: 600; }
.sh-meta i { margin-right: 1.4mm; font-style: normal; font-size: 6pt; font-weight: 700; letter-spacing: 0.6pt; text-transform: uppercase; color: #94a3b8; }
/* Filters under the header */
.sp-filters { display: flex; flex-wrap: wrap; gap: 1mm 5mm; margin: 2.4mm 0 0; padding: 1.4mm 3.5mm;
              border: 1px solid #dbe3ef; border-radius: 1.6mm; background: #f6f9fe; font-size: 7.4pt; }
.sp-filters span { display: inline-flex; gap: 1.5mm; align-items: baseline; }
.sp-filters i { font-style: normal; font-size: 6.2pt; font-weight: 700; letter-spacing: 0.6pt; text-transform: uppercase; color: #64748b; }
.sp-filters b { color: #0f172a; }

/* Summary band : one line of figures */
.sp-band { display: grid; margin: 0 0 2.4mm; border: 1px solid #c7d5f0; border-radius: 1.8mm; overflow: hidden; }
.sp-band > div { display: flex; flex-direction: column; padding: 1.1mm 3mm; border-right: 1px solid #e2e8f0; background: #ffffff; min-width: 0; }
.sp-band > div:first-child { background: #f1f6ff; }
.sp-band > div:last-child { border-right: 0; }
.sp-band span { font-size: 6pt; font-weight: 700; letter-spacing: 0.7pt; text-transform: uppercase; color: #64748b; white-space: nowrap; }
.sp-band b { font-size: 9.6pt; font-weight: 800; color: #0b2a5b; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Table */
table.vd-lines { width: 100%; border-collapse: collapse; table-layout: fixed; }
.vd-lines th { font-size: 6.3pt; font-weight: 700; letter-spacing: 0.5pt; text-transform: uppercase; color: #475569; text-align: left;
               padding: 1.6mm 1.4mm; border-top: 1.2px solid #0f172a; border-bottom: 1px solid #0f172a; background: #f8fafc; white-space: nowrap; }
.vd-lines td { padding: 1.3mm 1.4mm; border-bottom: 1px solid #edf1f6; vertical-align: middle; font-size: 8pt; overflow-wrap: anywhere; }
.sp-wide td { font-size: 7.8pt; }
.vd-c { text-align: center !important; }
.vd-r { text-align: right !important; font-variant-numeric: tabular-nums; white-space: nowrap; }
.vd-sl { color: #94a3b8; }
.vd-main { font-weight: 600; color: #0f172a; }
.vd-code { margin-top: 0.3mm; font-size: 6.8pt; color: #64748b; }
.sp-nowrap { white-space: nowrap; }
.sp-code { font-size: 7.2pt; color: #334155; white-space: nowrap; font-variant-numeric: tabular-nums; }
.sp-strong { font-weight: 800; }
.sp-soft { color: #64748b; }
.sp-dash { color: #cbd5e1; }
/* Long numbers : break inside the cell rather than run into the next one */
.sp-no { font-size: 7.6pt; font-variant-numeric: tabular-nums; letter-spacing: 0; overflow-wrap: anywhere; word-break: break-all; }
.sp-main-no { font-weight: 600; color: #0f172a; }
.sp-sub-no { margin-top: 0.3mm; color: #475569; }
.sp-wide .sp-no { font-size: 7.2pt; }
.sp-th-sub { display: block; margin-top: 0.3mm; font-weight: 600; color: #94a3b8; }

/* Group heading and subtotal */
.sp-group td { padding: 1.6mm 1.6mm 1.2mm; border-bottom: 1px solid #c7d5f0; background: #eef4ff; }
.sp-group b { font-size: 7.8pt; font-weight: 800; letter-spacing: 0.3pt; color: #1e3a8a; text-transform: uppercase; }
.sp-group span { margin-left: 3mm; font-size: 7pt; color: #64748b; }
.sp-subtotal td { padding-top: 1.2mm; padding-bottom: 1.6mm; border-bottom: 1px solid #cbd5e1; font-size: 7.6pt; font-weight: 700; color: #334155; }
.sp-grand td { padding-top: 2mm; padding-bottom: 2mm; border-top: 1.4px solid #0f172a; border-bottom: 3px double #0f172a;
               font-size: 8.6pt; font-weight: 800; color: #0f172a; }

/* Status : coloured dot + word */
.sp-st { display: inline-flex; align-items: center; gap: 1.2mm; font-size: 7pt; font-weight: 700; white-space: nowrap; }
.sp-st i { width: 1.8mm; height: 1.8mm; border-radius: 50%; background: currentColor; flex: 0 0 auto; }
.sp-in-stock { color: #15803d; }
.sp-low-stock { color: #b45309; }
.sp-critical { color: #c2410c; }
.sp-in-transit, .sp-partly-received { color: #1d4ed8; }
.sp-out-of-stock { color: #b42318; }

.sp-none { padding: 6mm 0 !important; color: #64748b; }
.sp-fine { margin-top: 2.5mm; font-size: 7pt; color: #64748b; }
`;


//===============================================================
// Excel
//===============================================================

function stockPositionSheet
(
    data:
        StockPrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const bold =
        (text: string): ExcelCell =>
            ({ v:text, s:'bold' });

    const cost =
        data.canViewCost;

    const mb =
        data.page.pageType === 'MB';

    const header:
        ExcelCell[] =
    [
        bold('SL'),
        bold('Code'),
        ...(mb ? [bold('Model'), bold('Colour')] : [bold('Part No'), bold(data.page.productHeader), bold('Location')]),
        bold('Brand'),
        bold('Category'),
        bold('In Transit'),
        bold('On Hand'),
        bold('Total'),
        bold('Re-order'),
        ...(cost ? [bold('Avg. Cost'), bold('Stock Value')] : []),
        bold('Status')
    ];

    return {
        name:'Stock Position',
        columns:mb
            ? [6, 18, 30, 14, 16, 18, 11, 11, 11, 10, ...(cost ? [14, 16] : []), 14]
            : [6, 18, 16, 32, 16, 16, 18, 11, 11, 11, 10, ...(cost ? [14, 16] : []), 14],
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [bold(`${data.page.title.toUpperCase()} - STOCK POSITION`)],
            [bold('Branch'), data.request.branchName, null, bold('Warehouse'), data.request.warehouseName],
            [bold('Showing'), data.request.filterLabel || 'Stocked', null, bold('As of'), data.asOf ? kit.date(data.asOf) : ''],
            [],
            header,
            ...data.rows.map
            (
                (row, index): ExcelCell[] =>
                [
                    index + 1,
                    row.ProductCode,
                    ...(mb ? [row.ItemName, row.ColorName] : [row.PartNumber, row.ItemName, row.Location]),
                    row.BrandName,
                    row.CategoryName,
                    row.InTransit,
                    row.OnHand,
                    row.Total,
                    row.ReorderLevel,
                    ...(cost ? [{ v:row.AverageCost, s:'money' } as ExcelCell, { v:row.StockValue, s:'money' } as ExcelCell] : []),
                    row.StockStatus
                ]
            ),
            [],
            [
                null,
                bold(`${data.rows.length} ${data.page.itemWord}s`),
                ...(mb ? [null, null] : [null, null, null]),
                null,
                null,
                { v:data.rows.reduce((t, x) => t + x.InTransit, 0), s:'bold' },
                { v:data.rows.reduce((t, x) => t + x.OnHand, 0), s:'bold' },
                { v:data.rows.reduce((t, x) => t + x.Total, 0), s:'bold' },
                null,
                ...(cost ? [null, { v:data.rows.reduce((t, x) => t + x.StockValue, 0), s:'boldMoney' } as ExcelCell] : [])
            ]
        ]
    };
}


function bikeUnitsSheet
(
    data:
        StockPrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const bold =
        (text: string): ExcelCell =>
            ({ v:text, s:'bold' });

    const cost =
        data.canViewCost;

    return {
        name:'Bike Units',
        columns:[6, 24, 22, 12, 16, 30, 18, 24, 14, ...(cost ? [14] : []), 14],
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [bold('MOTOR BIKE STOCK - BIKE UNITS')],
            [bold('Branch'), data.request.branchName],
            [],
            [bold('SL'), bold('Chassis No'), bold(`${bikesNoWord(data.bikes.map(x => x.ProductId))} No`), bold('Key No'), bold('Battery No'), bold('Model'), bold('Code'), bold('Purchase No'), bold('Stock In'), ...(cost ? [bold('Unit Cost')] : []), bold('Status')],
            ...data.bikes.map
            (
                (bike, index): ExcelCell[] =>
                [
                    index + 1,
                    bike.ChassisNo,
                    bike.EngineNo,
                    bike.KeyNo,
                    bike.BatteryNo,
                    bike.ProductName,
                    bike.ProductCode,
                    bike.PurchaseNo,
                    bike.StockInDate ? kit.date(bike.StockInDate) : '',
                    ...(cost ? [{ v:bike.UnitCost, s:'money' } as ExcelCell] : []),
                    bike.Status
                ]
            )
        ]
    };
}
