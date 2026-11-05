//===============================================================
// Price List : print source (Print Engine)
//
//   /print-viewer/price-list/<token>?doc=price-list
//   (&orient=landscape : the viewer's Portrait / Landscape switch)
//
// The page saves what is on its canvas (product type, filter,
// switches, search) under the token; the viewer loads the prices
// again from the server (the API checks "Print").
//
// Price List : Category › Sub Category headers · SL · Code ·
//              Product (part number under) · Unit · Stock · Avg
//              Cost · Current MRP · Effective · Markup % ·
//              Unpriced. Portrait : code under the product, unit
//              after the stock.
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
    VOUCHER_SWITCH
}
from '../../../../shared/components/accounting/voucher-switches';

import
{
    ProductPricingTypeInfo,
    formatPricingCost,
    formatPricingQty,
    productPricingType
}
from '../models/product-pricing.model';

import
{
    PRICE_LIST_PRINT_KEY,
    PriceList,
    PriceListLine,
    PriceListPrintRequest,
    PriceListRow,
    PriceListTotals,
    filterPriceList,
    formatMarkup,
    groupPriceList,
    priceListBelowCost,
    priceListCost,
    priceListLastCostOnly,
    priceListMarkup,
    priceListTotals
}
from '../models/price-list.model';

import
{
    PriceListService
}
from '../services/price-list.service';


//===============================================================
// Request saved by the page
//===============================================================

const STORAGE_PREFIX =
    'appcore.price-list-print.';

// Saves the request; returns its token (the viewer's id)
export function savePriceListPrintRequest
(
    request:
        PriceListPrintRequest
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
        // Storage blocked : the viewer prints every spare part /
        // lubricant
    }

    return token;
}

function readPriceListPrintRequest
(
    token:
        number
):
    PriceListPrintRequest | null
{
    try
    {
        const text =
            localStorage.getItem(STORAGE_PREFIX + token);

        return text
            ? JSON.parse(text) as PriceListPrintRequest
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

export interface PriceListPrintData
{
    info:ProductPricingTypeInfo;
    request:PriceListPrintRequest;
    list:PriceList;
    // The rows printed (filter + search)
    rows:PriceListRow[];
    lines:PriceListLine[];
    totals:PriceListTotals;
    // Type › kind › brand › category › sub category
    scope:string;
}


//===============================================================
// Styles
//===============================================================

const PRICE_LIST_PRINT_CSS = `
/* Compact paper margins */
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

/* Figures band */
.pr-band { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); margin: 0 0 2.4mm; border: 1px solid #c7d5f0; border-radius: 1.8mm; overflow: hidden; }
.pr-band > div { display: flex; flex-direction: column; padding: 1.1mm 3mm; border-right: 1px solid #e2e8f0; min-width: 0; }
.pr-band > div:last-child { border-right: 0; background: #f1f6ff; }
.pr-band span { font-size: 6pt; font-weight: 700; letter-spacing: 0.7pt; text-transform: uppercase; color: #64748b; }
.pr-band b { font-size: 9.6pt; font-weight: 800; color: #0b2a5b; font-variant-numeric: tabular-nums; white-space: nowrap; }
.pr-band b.pr-warn { color: #b45309; }
.pr-band b.pr-red { color: #b42318; }

/* Table */
table.vd-lines { width: 100%; border-collapse: collapse; table-layout: fixed; }
.vd-lines th { font-size: 6.3pt; font-weight: 700; letter-spacing: 0.5pt; text-transform: uppercase; color: #475569; text-align: left;
               padding: 1.6mm 1.4mm; border-top: 1.2px solid #0f172a; border-bottom: 1px solid #0f172a; background: #f8fafc; white-space: nowrap; }
.vd-lines td { padding: 1.2mm 1.4mm; border-bottom: 1px solid #edf1f6; vertical-align: top; font-size: 7.8pt; color: #0f172a; overflow-wrap: anywhere; }
.vd-r { text-align: right !important; font-variant-numeric: tabular-nums; white-space: nowrap; }
.pr-sl { color: #334155; }
.pr-code { font-size: 6.8pt; font-weight: 700; color: #0b2a5b; white-space: nowrap; letter-spacing: -0.1pt; }
.pr-main { font-weight: 600; color: #0f172a; overflow-wrap: break-word; word-break: normal; }
.pr-sub { margin-top: 0.3mm; font-size: 6.8pt; color: #334155; }
.pr-soft { color: #334155; font-size: 7.2pt; }
.pr-val { display: block; font-size: 6.4pt; color: #334155; white-space: nowrap; }
.pr-mrp { font-weight: 700; color: #0b2a5b; }
.pr-tag { padding: 0 1.2mm; border: 0.8px solid #d97706; border-radius: 3mm; font-size: 5.8pt; font-weight: 700; color: #92400e; white-space: nowrap; }
.pr-unpriced td { background: #fffbeb; }
.pr-below td, .pr-below td .pr-main, .pr-below td.pr-mrp { color: #b42318; }
.pr-cat td { padding-top: 1.6mm; padding-bottom: 1.2mm; border-bottom: 1px solid #c7d5f0; background: #eef3fc; font-size: 8pt; font-weight: 800; color: #0b2a5b; }
.pr-subcat td { padding-left: 5mm; border-bottom: 1px solid #e2e8f0; background: #f8fafc; font-size: 7.6pt; font-weight: 700; color: #1e293b; }
.pr-cat em, .pr-subcat em { margin-left: 2mm; font-style: normal; font-size: 6.4pt; font-weight: 700; color: #334155; }
/* Last body row gives way so the total row's top line shows */
.vd-lines tbody tr:last-child td { border-bottom: 0; }
.pr-close td { padding-top: 1.6mm; padding-bottom: 1.6mm; border-top: 1.2px solid #0f172a; border-bottom: 1.2px solid #0f172a; font-size: 8.2pt; font-weight: 800; color: #0b2a5b; }
.pr-none { padding: 6mm 0 !important; color: #334155; text-align: center; }
.pr-fine { margin-top: 2.5mm; font-size: 7pt; color: #334155; }
`;


//===============================================================
// Source
//===============================================================

export const PRICE_LIST_PRINT:
    PrintSourceDef<PriceListPrintData> =
{
    key:PRICE_LIST_PRINT_KEY,

    title:'Price List',

    // Portrait / Landscape switch in the viewer
    canRotate:true,

    async load
    (
        injector:
            Injector,
        id:
            number
    ):
        Promise<PriceListPrintData>
    {
        const request:
            PriceListPrintRequest =
            readPriceListPrintRequest(id)
            ??
            {
                type:'SP',
                kind:'',
                brandId:0,
                categoryId:0,
                subCategoryId:0,
                stock:'all',
                price:'all',
                search:'',
                groupBySub:true,
                showPart:true
            };

        const info =
            productPricingType(request.type);

        const service =
            injector.get(PriceListService);

        const list =
            await firstValueFrom(
                service.get(info.type, true)
            );

        const rows =
            filterPriceList(list.Rows, request);

        const scope =
            [
                info.title,
                request.kind,
                request.brandId ? list.Rows.find(x => x.BrandId === request.brandId)?.BrandName ?? '' : '',
                request.categoryId ? list.Rows.find(x => x.CategoryId === request.categoryId)?.CategoryName ?? '' : '',
                request.subCategoryId ? list.Rows.find(x => x.SubCategoryId === request.subCategoryId)?.SubCategoryName ?? '' : ''
            ]
            .filter(x => !!x)
            .join(' › ');

        return {
            info,
            request,
            list,
            rows,
            lines:groupPriceList(rows, request.groupBySub !== false),
            totals:priceListTotals(rows),
            scope
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
            PriceListPrintData
    ):
        string
    {
        return `Price List - ${data.info.title}`;
    },

    documents:
    [
        {
            key:'price-list',

            title:'Price List',

            icon:'fas fa-list-ol',

            render:
                (data: PriceListPrintData, kit: PrintKit) =>
                    priceListHtml(data, kit, !!kit.landscape),

            css:
                PRICE_LIST_PRINT_CSS,

            excel:
                (data: PriceListPrintData, kit: PrintKit) =>
                    priceListSheet(data, kit)
        }
    ]
};


//===============================================================
// Header : two identical cards split by a divider
//===============================================================

function priceListHead
(
    kit:
        PrintKit,
    kicker:
        string,
    title:
        string,
    asOf:
        string,
    meta:
        string[][]
):
    string
{
    const e =
        kit.escape;

    const company =
        kit.company;

    const logo =
        kit.logo && kit.isOn(VOUCHER_SWITCH.PRINT_LOGO, true)
            ? `<img class="sh-logo" src="${e(kit.logo)}" alt="">`
            : '';

    const address =
        [company?.AddressLine1, company?.AddressLine2]
            .map(part => (part ?? '').trim())
            .filter(part => !!part)
            .join(', ');

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

    let qr = '';

    try
    {
        qr =
            kit.qr(
                [company?.CompanyName || 'AppCore ERP', kicker, title, kit.date(asOf)]
                    .filter(part => !!part)
                    .join(' | ')
            );
    }
    catch
    {
        qr = '';
    }

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
      <span class="sh-kicker">${e(kicker)}</span>
      <b class="sh-title">${e(title)}</b>
      <span class="sh-asof">As of <b>${e(kit.date(asOf))}</b></span>
    </div>
    ${qr ? `<div class="sh-qr">${qr}</div>` : ''}
  </div>
</div>
<div class="sh-meta">${meta.filter(x => !!x[1]).map(([label, value]) => `<span><i>${e(label)}</i>${e(value)}</span>`).join('')}</div>`;
}

// Products · Priced · Unpriced · Stock · At Cost · At MRP
function band
(
    kit:
        PrintKit,
    totals:
        PriceListTotals
):
    string
{
    const e =
        kit.escape;

    return `<div class="pr-band">
  <div><span>Products</span><b>${totals.Products}</b></div>
  <div><span>Priced</span><b>${totals.Priced}</b></div>
  <div><span>Unpriced</span><b class="${totals.Unpriced ? 'pr-warn' : ''}">${totals.Unpriced}</b></div>
  <div><span>Below Cost</span><b class="${totals.BelowCost ? 'pr-red' : ''}">${totals.BelowCost}</b></div>
  <div><span>Stock At Cost</span><b>${e(kit.money(totals.StockAtCost))}</b></div>
  <div><span>Stock At MRP</span><b>${e(kit.money(totals.StockAtMrp))}</b></div>
</div>`;
}

function filterText
(
    request:
        PriceListPrintRequest
):
    string
{
    return [
        request.stock === 'in' ? 'In stock' : request.stock === 'none' ? 'No stock' : '',
        request.price === 'priced' ? 'Priced' : request.price === 'unpriced' ? 'Unpriced' : ''
    ]
    .filter(x => !!x)
    .join(' · ');
}


//===============================================================
// Price List
//===============================================================

function priceListHtml
(
    data:
        PriceListPrintData,
    kit:
        PrintKit,
    landscape:
        boolean
):
    string
{
    const e =
        kit.escape;

    const list =
        data.list;

    const showPart =
        data.request.showPart !== false && data.info.type !== 'MB';

    // Landscape : every column; portrait : the code under the
    // product, the unit after the stock
    const cols:
        [string, string, string][] =
        landscape
            ? [
                ['SL', '9mm', ''],
                ['Code', '26mm', ''],
                ['Product', '', ''],
                ['Unit', '13mm', ''],
                ['Stock', '17mm', 'vd-r'],
                ['Avg Cost', '24mm', 'vd-r'],
                ['Current MRP', '24mm', 'vd-r'],
                ['Effective', '27mm', ''],
                ['Markup %', '18mm', 'vd-r'],
                ['Unpriced', '15mm', 'vd-r']
            ]
            : [
                ['SL', '8mm', ''],
                ['Product', '', ''],
                ['Stock', '17mm', 'vd-r'],
                ['Avg Cost', '20mm', 'vd-r'],
                ['Current MRP', '21mm', 'vd-r'],
                ['Effective', '22mm', ''],
                ['Markup %', '16mm', 'vd-r'],
                ['Unpr.', '10mm', 'vd-r']
            ];

    const body =
        data.lines
            .map
            (
                line =>
                {
                    if
                    (
                        line.kind === 'category'
                    )
                    {
                        return `<tr class="pr-cat"><td colspan="${cols.length}">${e(line.label)}<em>${line.count} product${line.count === 1 ? '' : 's'}</em></td></tr>`;
                    }

                    if
                    (
                        line.kind === 'sub' || !line.row
                    )
                    {
                        return `<tr class="pr-subcat"><td colspan="${cols.length}">${e(line.label)}<em>${line.count}</em></td></tr>`;
                    }

                    const row =
                        line.row;

                    const cost =
                        priceListCost(row);

                    const name =
                        row.PartName || row.Name;

                    const under =
                        [
                            landscape ? '' : row.Code,
                            showPart ? row.PartNumber : ''
                        ]
                        .filter(x => !!x)
                        .join(' · ');

                    const stock =
                        row.InStock
                            ? `${formatPricingQty(row.InStock)}${landscape ? '' : ` <span class="pr-soft">${e(row.Unit || 'Pcs')}</span>`}`
                            : '—';

                    const costCell =
                        cost > 0
                            ? `${e(formatPricingCost(cost))}${priceListLastCostOnly(row) ? '<span class="pr-val">last purchase</span>' : ''}`
                            : '—';

                    const mrpCell =
                        row.CurrentMrp > 0
                            ? e(kit.money(row.CurrentMrp))
                            : '<span class="pr-tag">Unpriced</span>';

                    const effective =
                        row.MrpDate
                            ? `${e(kit.date(row.MrpDate))}${row.MrpSourceNo ? `<span class="pr-val">${e(row.MrpSourceNo)}</span>` : ''}`
                            : '—';

                    const classes =
                        [
                            row.CurrentMrp > 0 ? '' : 'pr-unpriced',
                            priceListBelowCost(row) ? 'pr-below' : ''
                        ]
                        .filter(x => !!x)
                        .join(' ');

                    return `<tr class="${classes}">
  <td class="pr-sl">${line.sl}</td>
  ${landscape ? `<td><span class="pr-code">${e(row.Code)}</span></td>` : ''}
  <td><div class="pr-main">${e(name)}</div>${under ? `<div class="pr-sub">${e(under)}</div>` : ''}</td>
  ${landscape ? `<td class="pr-soft">${e(row.Unit || 'Pcs')}</td>` : ''}
  <td class="vd-r">${stock}</td>
  <td class="vd-r">${costCell}</td>
  <td class="vd-r pr-mrp">${mrpCell}</td>
  <td>${effective}</td>
  <td class="vd-r">${e(formatMarkup(priceListMarkup(list, row)))}</td>
  <td class="vd-r">${row.UnpricedBatches > 0 ? row.UnpricedBatches : ''}</td>
</tr>`;
                }
            )
            .join('');

    // Columns before Stock : SL, [Code], Product, [Unit]
    const lead =
        landscape ? 4 : 2;

    const t =
        data.totals;

    return `<section class="pv-flow${landscape ? ' pv-landscape' : ''}" data-watermark="">
<div class="pv-run-head">
${priceListHead(kit, 'Price List', data.scope, list.Today,
    [
        ['Products', `${t.Products}`],
        ['Filter', filterText(data.request)],
        ['Markup', list.ProfitOnSale ? 'On net sale' : 'On cost'],
        ['MRP', 'VAT inclusive'],
        ['Search', data.request.search ?? '']
    ])}
</div>
<div class="pv-body">
${band(kit, t)}
<table class="pv-split vd-lines">
  <colgroup>${cols.map(x => x[1] ? `<col style="width:${x[1]}">` : '<col>').join('')}</colgroup>
  <thead><tr>${cols.map(x => `<th class="${x[2]}">${e(x[0])}</th>`).join('')}</tr></thead>
  <tbody>
    ${body || `<tr><td colspan="${cols.length}" class="pr-none">No product in this selection.</td></tr>`}
  </tbody>
  <tfoot>
    <tr class="pr-close"><td colspan="${lead}" class="vd-r">Total · ${t.Products} product${t.Products === 1 ? '' : 's'} · ${t.Priced} priced · ${t.Unpriced} unpriced</td><td class="vd-r">${e(formatPricingQty(t.StockQty))}</td><td class="vd-r">${e(kit.money(t.StockAtCost))}</td><td class="vd-r">${e(kit.money(t.StockAtMrp))}</td><td colspan="3"></td></tr>
  </tfoot>
</table>
<div class="pr-fine">Avg Cost : weighted average net unit cost (excl. VAT) of the stock; no stock : the latest purchase. Markup % ${list.ProfitOnSale ? 'on the net sale' : 'on cost'}; net sale = MRP less the sales VAT in it. Stock at cost / at MRP : the stock × average cost / × current MRP.</div>
</div>
<div class="pv-end">
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>
</section>`;
}


//===============================================================
// Excel
//===============================================================

function priceListSheet
(
    data:
        PriceListPrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const list =
        data.list;

    const t =
        data.totals;

    const bold =
        (text: string): ExcelCell =>
            ({ v:text, s:'bold' });

    // Rows in the printed order (Category › Sub Category › Code)
    const rows =
        data.lines
            .filter(x => x.kind === 'row' && !!x.row)
            .map(x => x.row!);

    return {
        name:'Price List',
        columns:[6, 16, 22, 40, 26, 26, 22, 8, 12, 14, 14, 14, 14, 18, 12, 10, 10],
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [bold(`PRICE LIST - ${data.scope}`)],
            [bold('As of'), kit.date(list.Today), null, bold('Markup'), list.ProfitOnSale ? 'On net sale' : 'On cost', null, bold('Filter'), filterText(data.request)],
            [],
            [
                bold('SL'), bold('Code'), bold('Part Number'), bold('Product'), bold('Category'), bold('Sub Category'), bold('Brand'),
                bold('Unit'), bold('Stock'), bold('Avg Cost'), bold('Last Cost'), bold('Current MRP'), bold('Effective'), bold('Source No'),
                bold('Markup %'), bold('Batches'), bold('Unpriced')
            ],
            ...rows.map
            (
                (row, index): ExcelCell[] =>
                {
                    const markup =
                        priceListMarkup(list, row);

                    return [
                        index + 1,
                        row.Code,
                        row.PartNumber,
                        row.PartName || row.Name,
                        row.CategoryName,
                        row.SubCategoryName,
                        row.BrandName,
                        row.Unit || 'Pcs',
                        row.InStock,
                        row.AvgCost ? { v:row.AvgCost, s:'money' } as ExcelCell : null,
                        row.LastCost ? { v:row.LastCost, s:'money' } as ExcelCell : null,
                        row.CurrentMrp ? { v:row.CurrentMrp, s:'money' } as ExcelCell : 'Unpriced',
                        row.MrpDate ? kit.date(row.MrpDate) : '',
                        row.MrpSourceNo,
                        markup,
                        row.BatchCount,
                        row.UnpricedBatches
                    ];
                }
            ),
            [
                null, null, null, bold(`Total · ${t.Products} products · ${t.Priced} priced · ${t.Unpriced} unpriced`), null, null, null, null,
                t.StockQty, null, null, null, null, null, null, null, null
            ],
            [
                null, null, null, bold('Stock at cost'), { v:t.StockAtCost, s:'boldMoney' }
            ],
            [
                null, null, null, bold('Stock at MRP'), { v:t.StockAtMrp, s:'boldMoney' }
            ]
        ]
    };
}
