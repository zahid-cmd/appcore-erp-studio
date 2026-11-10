//===============================================================
// Product Ledgers : print source (Print Engine)
//
//   /print-viewer/product-ledgers/<token>?doc=product-statement
//   /print-viewer/product-ledgers/<token>?doc=product-summary
//   (&orient=landscape : the viewer's Portrait / Landscape switch;
//   the page asks for landscape when values are shown)
//
// The page saves what is on its canvas (ledger type, view,
// product or kind / category / sub category, period, branch,
// warehouse, switches, search) under the token; the viewer loads
// it again from the server.
//
// Statement : Date · Particulars (batch / location under) ·
//             Doc No · In · Out · Balance · [Unit Cost · In Value
//             · Out Value · Balance Value] · Short Notes
// Summary   : Product · Category · Opening · In · Out · Closing
//             (values under the quantities)
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
    isElectricName
}
from '../../../../core/motor-power/motor-power.service';

import
{
    VOUCHER_SWITCH
}
from '../../../../shared/components/accounting/voucher-switches';

import
{
    PRODUCT_LEDGER_PRINT_KEY,
    ProductLedgerConfig,
    ProductLedgerPrintRequest,
    ProductLedgerStatement,
    ProductLedgerSummary,
    bikesText,
    formatLedgerQty,
    ledgerRowMatches,
    productLedgerConfig,
    sumFigures,
    summaryRowMatches,
    toIsoDate
}
from '../models/product-ledgers.model';

import
{
    ProductLedgersService
}
from '../services/product-ledgers.service';


//===============================================================
// Request saved by the page
//===============================================================

const STORAGE_PREFIX =
    'appcore.product-ledger-print.';

// Saves the request; returns its token (the viewer's id)
export function saveProductLedgerPrintRequest
(
    request:
        ProductLedgerPrintRequest
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
        // Storage blocked : the viewer prints the summary of
        // all spare parts for this month
    }

    return token;
}

function readProductLedgerPrintRequest
(
    token:
        number
):
    ProductLedgerPrintRequest | null
{
    try
    {
        const text =
            localStorage.getItem(STORAGE_PREFIX + token);

        return text
            ? JSON.parse(text) as ProductLedgerPrintRequest
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

export interface ProductLedgerPrintData
{
    page:ProductLedgerConfig;
    request:ProductLedgerPrintRequest;
    statement:ProductLedgerStatement | null;
    summary:ProductLedgerSummary | null;
}


//===============================================================
// Styles
//===============================================================

const PRODUCT_LEDGER_PRINT_CSS = `
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
.lp-band { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); margin: 0 0 2.4mm; border: 1px solid #c7d5f0; border-radius: 1.8mm; overflow: hidden; }
.lp-band > div { display: flex; flex-direction: column; padding: 1.1mm 3mm; border-right: 1px solid #e2e8f0; min-width: 0; }
.lp-band > div:last-child { border-right: 0; background: #f1f6ff; }
.lp-band > div.lp-band-transit b, .lp-transit { color: #b45309; }
.lp-transit small { margin-left: 1mm; font-size: 6.4pt; font-weight: 600; color: #d97706; }
.lp-band span { font-size: 6pt; font-weight: 700; letter-spacing: 0.7pt; text-transform: uppercase; color: #64748b; }
.lp-band b { font-size: 9.6pt; font-weight: 800; color: #0b2a5b; font-variant-numeric: tabular-nums; white-space: nowrap; }
.lp-band em { font-size: 7pt; font-style: normal; color: #475569; font-variant-numeric: tabular-nums; white-space: nowrap; }

/* Table */
table.vd-lines { width: 100%; border-collapse: collapse; table-layout: fixed; }
.vd-lines th { font-size: 6.3pt; font-weight: 700; letter-spacing: 0.5pt; text-transform: uppercase; color: #475569; text-align: left;
               padding: 1.6mm 1.4mm; border-top: 1.2px solid #0f172a; border-bottom: 1px solid #0f172a; background: #f8fafc; white-space: nowrap; }
.vd-lines td { padding: 1.2mm 1.4mm; border-bottom: 1px solid #edf1f6; vertical-align: top; font-size: 7.8pt; overflow-wrap: anywhere; }
.vd-r { text-align: right !important; font-variant-numeric: tabular-nums; white-space: nowrap; }
.lp-sl { color: #94a3b8; }
.lp-no { font-size: 6.8pt; font-weight: 700; color: #0b2a5b; white-space: nowrap; letter-spacing: -0.1pt; }
.lp-date { white-space: nowrap; }
.lp-code { margin-left: 1mm; font-size: 6.4pt; color: #94a3b8; white-space: nowrap; }
.lp-main { font-weight: 600; color: #0f172a; overflow-wrap: break-word; word-break: normal; }
.lp-sub { margin-top: 0.3mm; font-size: 6.8pt; color: #64748b; }
.lp-soft { color: #475569; font-size: 7.4pt; }
.lp-val { display: block; font-size: 6.6pt; color: #64748b; }
.lp-bal { font-weight: 700; }
.lp-open td { background: #f6f9ff; font-weight: 600; }
.lp-bikes td { padding-top: 0.2mm; padding-bottom: 1.4mm; border-bottom: 1px solid #dfe6f1; font-size: 6.8pt; color: #475569; }
.lp-bikes i { margin-right: 2mm; font-style: normal; font-size: 5.8pt; font-weight: 700; letter-spacing: 0.5pt; text-transform: uppercase; color: #94a3b8; }
.lp-cancel td { color: #94a3b8; }
.lp-cancel td.lp-amt { text-decoration: line-through; }
.lp-tag { margin-left: 1mm; padding: 0 1.2mm; border: 0.8px solid #dc2626; border-radius: 3mm; font-size: 5.8pt; font-weight: 700; color: #b42318; }
.lp-total td { padding-top: 1.6mm; padding-bottom: 1.6mm; border-top: 1.2px solid #0f172a; border-bottom: 0; font-size: 8.2pt; font-weight: 800; }
/* Last body row gives way so the closing / total row's top line shows */
.vd-lines tbody tr:last-child td { border-bottom: 0; }
.lp-close td { padding-top: 1.6mm; padding-bottom: 1.6mm; border-top: 1.2px solid #0f172a; border-bottom: 1.2px solid #0f172a; font-size: 8.4pt; font-weight: 800; color: #0b2a5b; }
.lp-none { padding: 6mm 0 !important; color: #64748b; text-align: center; }
.lp-fine { margin-top: 2.5mm; font-size: 7pt; color: #64748b; }
`;


//===============================================================
// Source
//===============================================================

export const PRODUCT_LEDGERS_PRINT:
    PrintSourceDef<ProductLedgerPrintData> =
{
    key:PRODUCT_LEDGER_PRINT_KEY,

    title:'Product Ledgers',

    // Portrait / Landscape switch in the viewer
    canRotate:true,

    async load
    (
        injector:
            Injector,
        id:
            number
    ):
        Promise<ProductLedgerPrintData>
    {
        const today =
            new Date();

        const request:
            ProductLedgerPrintRequest =
            readProductLedgerPrintRequest(id)
            ??
            {
                ledgerType:'SP',
                view:'summary',
                productId:0,
                kind:'',
                categoryId:0,
                subCategoryId:0,
                from:toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
                to:toIsoDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
                branchId:0,
                warehouseId:0,
                showCancelled:false,
                showBatch:false,
                showLocation:false,
                showValue:false,
                showBikes:false,
                search:''
            };

        const page =
            productLedgerConfig(request.ledgerType);

        const service =
            injector.get(ProductLedgersService);

        if
        (
            request.view === 'statement' && request.productId
        )
        {
            const statement =
                await firstValueFrom(
                    service.getStatement(
                        {
                            path:page.path,
                            productId:request.productId,
                            from:request.from,
                            to:request.to,
                            branchId:request.branchId,
                            warehouseId:request.warehouseId,
                            showCancelled:request.showCancelled,
                            withBikes:page.type === 'MB'
                        }
                    )
                );

            // The page's search : only the matching rows
            statement.Rows =
                statement.Rows.filter(x => ledgerRowMatches(x, request.search ?? ''));

            return {
                page,
                request,
                summary:null,
                statement
            };
        }

        const summary =
            await firstValueFrom(
                service.getSummary(
                    {
                        path:page.path,
                        kind:request.kind,
                        categoryId:request.categoryId,
                        subCategoryId:request.subCategoryId,
                        from:request.from,
                        to:request.to,
                        branchId:request.branchId,
                        warehouseId:request.warehouseId,
                        showCancelled:request.showCancelled
                    }
                )
            );

        if
        (
            (request.search ?? '').trim()
        )
        {
            summary.Rows =
                summary.Rows.filter(x => summaryRowMatches(x, request.search ?? ''));

            // Totals of the rows printed
            Object.assign(summary, sumFigures(summary.Rows));
        }

        return {
            page,
            request,
            statement:null,
            summary
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
            ProductLedgerPrintData
    ):
        string
    {
        return data.statement
            ? `${data.page.title} - ${data.statement.ProductCode}`
            : `${data.page.title} - Summary`;
    },

    documents:
    [
        {
            key:'product-statement',

            title:'Ledger',

            icon:'fas fa-book-open',

            available:
                (data: ProductLedgerPrintData) =>
                    !!data.statement,

            render:
                (data: ProductLedgerPrintData, kit: PrintKit) =>
                    statementHtml(data, kit, !!kit.landscape),

            css:
                PRODUCT_LEDGER_PRINT_CSS,

            excel:
                (data: ProductLedgerPrintData, kit: PrintKit) =>
                    statementSheet(data, kit)
        },

        {
            key:'product-summary',

            title:'Summary',

            icon:'fas fa-list',

            available:
                (data: ProductLedgerPrintData) =>
                    !!data.summary,

            render:
                (data: ProductLedgerPrintData, kit: PrintKit) =>
                    summaryHtml(data, kit, !!kit.landscape),

            css:
                PRODUCT_LEDGER_PRINT_CSS,

            excel:
                (data: ProductLedgerPrintData, kit: PrintKit) =>
                    summarySheet(data, kit)
        }
    ]
};


//===============================================================
// Header : two identical cards split by a divider
//===============================================================

function ledgerHead
(
    kit:
        PrintKit,
    kicker:
        string,
    title:
        string,
    from:
        string,
    to:
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

    const period =
        `${kit.date(from)} – ${kit.date(to)}`;

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
                [company?.CompanyName || 'AppCore ERP', kicker, title, period]
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
      <span class="sh-asof">Period <b>${e(period)}</b></span>
    </div>
    ${qr ? `<div class="sh-qr">${qr}</div>` : ''}
  </div>
</div>
<div class="sh-meta">${meta.filter(x => !!x[1]).map(([label, value]) => `<span><i>${e(label)}</i>${e(value)}</span>`).join('')}</div>`;
}

// Opening · In · Out · In Transit · Closing (values under, when
// shown; In Transit has no value : purchased, not yet received)
function band
(
    kit:
        PrintKit,
    figures:
        {
            OpeningQty:number;
            OpeningValue:number;
            InQty:number;
            InValue:number;
            OutQty:number;
            OutValue:number;
            ClosingQty:number;
            ClosingValue:number;
            ClosingTransit:number;
        },
    values:
        boolean
):
    string
{
    const e =
        kit.escape;

    const cell =
        (label: string, qty: number, value: number) =>
            `<div><span>${e(label)}</span><b>${e(formatLedgerQty(qty))}</b>${values ? `<em>${e(kit.money(value))}</em>` : ''}</div>`;

    return `<div class="lp-band">${
        cell('Opening', figures.OpeningQty, figures.OpeningValue)
    }${
        cell('In', figures.InQty, figures.InValue)
    }${
        cell('Out', figures.OutQty, figures.OutValue)
    }<div class="lp-band-transit"><span>In Transit</span><b>${e(formatLedgerQty(figures.ClosingTransit))}</b>${values ? '<em>&nbsp;</em>' : ''}</div>${
        cell('Closing', figures.ClosingQty, figures.ClosingValue)
    }</div>`;
}


//===============================================================
// Statement
//===============================================================

function statementHtml
(
    data:
        ProductLedgerPrintData,
    kit:
        PrintKit,
    landscape:
        boolean
):
    string
{
    const s =
        data.statement!;

    const e =
        kit.escape;

    const r =
        data.request;

    // Values only when the user may see them
    const values =
        !!r.showValue && s.CanViewCost;

    const bikes =
        !!r.showBikes && data.page.type === 'MB';

    const qty =
        (value: number) =>
            value ? formatLedgerQty(value) : '';

    const money =
        (value: number) =>
            value ? kit.money(value) : '';

    // Short notes : own column in landscape, under the
    // particulars in portrait
    const notes =
        landscape;

    // Portrait with values : no room for a Doc No column; the
    // doc no goes under the particulars
    const docCol =
        landscape || !values;

    // Widths fit A4 (portrait ≈ 190mm, landscape ≈ 277mm) and
    // always leave the particulars at least ~45mm
    const w =
        landscape
            ? { date:'19mm', doc:'38mm', qty:'14mm', bal:'16mm', cost:'19mm', val:'22mm', bval:'24mm', note:values ? '13%' : '22%' }
            : values
                ? { date:'17mm', doc:'', qty:'11mm', bal:'13mm', cost:'17mm', val:'20mm', bval:'22mm', note:'' }
                : { date:'19mm', doc:'34mm', qty:'14mm', bal:'16mm', cost:'', val:'', bval:'', note:'' };

    const cols:
        [string, string, string][] =
    [
        ['Date', w.date, ''],
        ['Particulars', '', ''],
        ...(docCol ? [['Doc No', w.doc, '']] as [string, string, string][] : []),
        ['In Transit', w.bal, 'vd-r'],
        ['In', w.qty, 'vd-r'],
        ['Out', w.qty, 'vd-r'],
        ['Balance', w.bal, 'vd-r'],
        ...(values
            ? [
                ['Unit Cost', w.cost, 'vd-r'],
                ['In Value', w.val, 'vd-r'],
                ['Out Value', w.val, 'vd-r'],
                ['Bal. Value', w.bval, 'vd-r']
            ] as [string, string, string][]
            : []),
        ...(notes ? [['Short Notes', w.note, '']] as [string, string, string][] : [])
    ];

    // Columns before In Transit : Date, Particulars, [Doc No]
    const lead =
        docCol ? 3 : 2;

    const valueBlank =
        values ? '<td></td><td></td><td></td>' : '';

    const noteCell =
        notes ? '<td></td>' : '';

    const body =
        s.Rows
            .map
            (
                row =>
                {
                    const tag =
                        row.IsReversal
                            ? '<span class="lp-tag">Reversal</span>'
                            : row.IsCancelled
                                ? '<span class="lp-tag">Cancelled</span>'
                                : '';

                    const under =
                        [
                            docCol ? '' : row.DocumentNo,
                            r.showBatch && row.Batches ? `Batch ${row.Batches}` : '',
                            r.showLocation ? row.Location : '',
                            notes ? '' : row.ShortNote
                        ]
                        .filter(x => !!x)
                        .join(' · ');

                    const units =
                        bikes ? bikesText(row.Bikes) : '';

                    const bikeRow =
                        units
                            ? `<tr class="lp-bikes"><td colspan="${cols.length}"><i>Chassis / ${isElectricName(s.ProductCode) || isElectricName(s.ProductName) ? 'Motor' : 'Engine'}</i>${e(units)}</td></tr>`
                            : '';

                    return `<tr class="${row.IsReversal || row.IsCancelled ? 'lp-cancel' : ''}">
  <td class="lp-date">${e(kit.date(row.Date))}</td>
  <td><div class="lp-main">${e(row.Particulars || '—')}${docCol ? '' : tag}</div>${under ? `<div class="lp-sub">${e(under)}</div>` : ''}</td>
  ${docCol ? `<td><span class="lp-no">${e(row.DocumentNo)}</span>${tag}</td>` : ''}
  <td class="vd-r lp-transit">${row.TransitQty ? e(formatLedgerQty(row.TransitBalance)) : ''}</td>
  <td class="vd-r lp-amt">${qty(row.InQty)}</td>
  <td class="vd-r lp-amt">${qty(row.OutQty)}</td>
  <td class="vd-r lp-bal">${e(formatLedgerQty(row.BalanceQty))}</td>
  ${values ? `<td class="vd-r lp-soft">${money(row.UnitCost)}</td><td class="vd-r lp-amt">${money(row.InValue)}</td><td class="vd-r lp-amt">${money(row.OutValue)}</td><td class="vd-r lp-bal">${kit.money(row.BalanceValue)}</td>` : ''}
  ${notes ? `<td class="lp-soft">${e(row.ShortNote)}</td>` : ''}
</tr>${bikeRow}`;
                }
            )
            .join('');

    const path =
        [s.Kind, s.CategoryName, s.SubCategoryName, s.BrandName, s.ColorName].filter(x => !!x).join(' › ');

    return `<section class="pv-flow${landscape ? ' pv-landscape' : ''}" data-watermark="">
<div class="pv-run-head">
${ledgerHead(kit, `${data.page.title} · Ledger`, s.ProductName, s.From, s.To,
    [
        ['Code', s.ProductCode],
        ['Product', path],
        ['Unit', s.Unit],
        ['Branch', s.BranchName || 'All Branches'],
        ['Warehouse', s.WarehouseName],
        ['Values', values ? 'FIFO batch cost' : ''],
        ['Cancelled', s.ShowCancelled ? 'Shown' : ''],
        ['Search', r.search ?? '']
    ])}
</div>
<div class="pv-body">
${band(kit, s, values)}
<table class="pv-split vd-lines">
  <colgroup>${cols.map(x => x[1] ? `<col style="width:${x[1]}">` : '<col>').join('')}</colgroup>
  <thead><tr>${cols.map(x => `<th class="${x[2]}">${e(x[0])}</th>`).join('')}</tr></thead>
  <tbody>
    <tr class="lp-open"><td class="lp-date">${e(kit.date(s.From))}</td><td colspan="${lead - 1}">Opening Balance</td><td class="vd-r lp-transit">${s.OpeningTransit ? e(formatLedgerQty(s.OpeningTransit)) : ''}</td><td></td><td></td><td class="vd-r lp-bal">${e(formatLedgerQty(s.OpeningQty))}</td>${values ? `${valueBlank}<td class="vd-r lp-bal">${kit.money(s.OpeningValue)}</td>` : ''}${noteCell}</tr>
    ${body || `<tr><td colspan="${cols.length}" class="lp-none">No movement in this period.</td></tr>`}
  </tbody>
  <tfoot>
    <tr class="lp-total"><td colspan="${lead}" class="vd-r">Total · ${s.Rows.length} entr${s.Rows.length === 1 ? 'y' : 'ies'}</td><td></td><td class="vd-r">${e(formatLedgerQty(s.InQty))}</td><td class="vd-r">${e(formatLedgerQty(s.OutQty))}</td><td></td>${values ? `<td></td><td class="vd-r">${kit.money(s.InValue)}</td><td class="vd-r">${kit.money(s.OutValue)}</td><td></td>` : ''}${noteCell}</tr>
    <tr class="lp-close"><td colspan="${lead}" class="vd-r">Closing Balance · ${e(kit.date(s.To))}</td><td class="vd-r lp-transit">${e(formatLedgerQty(s.ClosingTransit))}</td><td></td><td></td><td class="vd-r">${e(formatLedgerQty(s.ClosingQty))}</td>${values ? `${valueBlank}<td class="vd-r">${kit.money(s.ClosingValue)}</td>` : ''}${noteCell}</tr>
  </tfoot>
</table>
${s.Truncated ? '<div class="lp-fine">Only the first entries are listed; totals and closing cover the whole period.</div>' : ''}
</div>
<div class="pv-end">
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>
</section>`;
}


//===============================================================
// Summary
//===============================================================

function summaryHtml
(
    data:
        ProductLedgerPrintData,
    kit:
        PrintKit,
    landscape:
        boolean
):
    string
{
    const s =
        data.summary!;

    const e =
        kit.escape;

    const values =
        !!data.request.showValue && s.CanViewCost;

    const cell =
        (quantity: number, value: number, blank: boolean, bold: boolean) =>
            `<td class="vd-r${bold ? ' lp-bal' : ''}">${blank && !quantity ? '' : e(formatLedgerQty(quantity))}${values && (!blank || value) ? `<span class="lp-val">${e(kit.money(value))}</span>` : ''}</td>`;

    const body =
        s.Rows
            .map
            (
                (row, index) =>
                    `<tr>
  <td class="lp-sl">${index + 1}</td>
  <td><div class="lp-main">${e(row.ProductName)}</div><div class="lp-sub">${[row.ProductCode, landscape ? '' : row.CategoryName].filter(x => !!x).map(x => e(x)).join(' · ')}</div></td>
  ${landscape ? `<td class="lp-soft">${e(row.CategoryName)} · ${e(row.SubCategoryName)}</td>` : ''}
  ${cell(row.OpeningQty, row.OpeningValue, false, false)}
  ${cell(row.InQty, row.InValue, true, false)}
  ${cell(row.OutQty, row.OutValue, true, false)}
  ${cell(row.ClosingQty, row.ClosingValue, false, true)}
  <td class="vd-r lp-transit">${row.ClosingTransit ? e(formatLedgerQty(row.ClosingTransit)) : ''}</td>
</tr>`
            )
            .join('');

    const width =
        values ? '26mm' : '20mm';

    const cols =
        landscape
            ? ['8mm', '', '26%', width, width, width, width, '18mm']
            : ['8mm', '', width, width, width, width, '17mm'];

    const lead =
        landscape ? 3 : 2;

    const word =
        s.Rows.length === 1 ? data.page.itemWord : data.page.itemWords;

    return `<section class="pv-flow${landscape ? ' pv-landscape' : ''}" data-watermark="">
<div class="pv-run-head">
${ledgerHead(kit, `${data.page.title} · Summary`, s.ScopePath, s.From, s.To,
    [
        ['Branch', s.BranchName || 'All Branches'],
        ['Warehouse', s.WarehouseName],
        ['Products', `${s.Rows.length}`],
        ['Values', values ? 'FIFO batch cost' : ''],
        ['Cancelled', s.ShowCancelled ? 'Shown' : ''],
        ['Search', data.request.search ?? '']
    ])}
</div>
<div class="pv-body">
${band(kit, s, values)}
<table class="pv-split vd-lines">
  <colgroup>${cols.map(x => x ? `<col style="width:${x}">` : '<col>').join('')}</colgroup>
  <thead><tr><th>SL</th><th>Product</th>${landscape ? '<th>Category · Sub Category</th>' : ''}<th class="vd-r">Opening</th><th class="vd-r">In</th><th class="vd-r">Out</th><th class="vd-r">Closing</th><th class="vd-r">In Transit</th></tr></thead>
  <tbody>${body || `<tr><td colspan="${cols.length}" class="lp-none">No stock or movement in this selection.</td></tr>`}</tbody>
  <tfoot>
    <tr class="lp-close"><td colspan="${lead}" class="vd-r">Total · ${s.Rows.length} ${e(word)}</td>${cell(s.OpeningQty, s.OpeningValue, false, false)}${cell(s.InQty, s.InValue, false, false)}${cell(s.OutQty, s.OutValue, false, false)}${cell(s.ClosingQty, s.ClosingValue, false, false)}<td class="vd-r lp-transit">${e(formatLedgerQty(s.ClosingTransit))}</td></tr>
  </tfoot>
</table>
</div>
<div class="pv-end">
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>
</section>`;
}


//===============================================================
// Excel
//===============================================================

function statementSheet
(
    data:
        ProductLedgerPrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const s =
        data.statement!;

    const values =
        !!data.request.showValue && s.CanViewCost;

    const bold =
        (text: string): ExcelCell =>
            ({ v:text, s:'bold' });

    return {
        name:'Ledger',
        columns:values
            ? [13, 40, 24, 26, 30, 12, 10, 10, 12, 14, 16, 16, 18, 30, 40]
            : [13, 40, 24, 26, 30, 12, 10, 10, 12, 30, 40],
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [bold(`${data.page.title.toUpperCase()} - ${s.ProductName} (${s.ProductCode})`)],
            [bold('Period'), `${kit.date(s.From)} - ${kit.date(s.To)}`, null, bold('Branch'), [s.BranchName, s.WarehouseName].filter(x => !!x).join(' · ')],
            [],
            [
                bold('Date'), bold('Particulars'), bold('Doc No'), bold('Batch'), bold('Location'),
                bold('In Transit'), bold('In'), bold('Out'), bold('Balance'),
                ...(values ? [bold('Unit Cost'), bold('In Value'), bold('Out Value'), bold('Balance Value')] : []),
                bold('Short Notes'), bold(`Chassis / ${isElectricName(s.ProductCode) || isElectricName(s.ProductName) ? 'Motor' : 'Engine'}`)
            ],
            [
                kit.date(s.From), 'Opening Balance', null, null, null, s.OpeningTransit || null, null, null, s.OpeningQty,
                ...(values ? [null, null, null, { v:s.OpeningValue, s:'money' } as ExcelCell] : [])
            ],
            ...s.Rows.map
            (
                (row): ExcelCell[] =>
                [
                    kit.date(row.Date),
                    row.Particulars + (row.IsReversal ? ' (Reversal)' : row.IsCancelled ? ' (Cancelled)' : ''),
                    row.DocumentNo,
                    row.Batches,
                    row.Location,
                    row.TransitQty ? row.TransitBalance : null,
                    row.InQty || null,
                    row.OutQty || null,
                    row.BalanceQty,
                    ...(values
                        ? [
                            { v:row.UnitCost, s:'money' } as ExcelCell,
                            { v:row.InValue, s:'money' } as ExcelCell,
                            { v:row.OutValue, s:'money' } as ExcelCell,
                            { v:row.BalanceValue, s:'money' } as ExcelCell
                        ]
                        : []),
                    row.ShortNote,
                    bikesText(row.Bikes)
                ]
            ),
            [
                null, null, null, null, bold('Total'), null, s.InQty, s.OutQty, null,
                ...(values ? [null, { v:s.InValue, s:'boldMoney' } as ExcelCell, { v:s.OutValue, s:'boldMoney' } as ExcelCell, null] : [])
            ],
            [
                null, null, null, null, bold('Closing Balance'), s.ClosingTransit, null, null, s.ClosingQty,
                ...(values ? [null, null, null, { v:s.ClosingValue, s:'boldMoney' } as ExcelCell] : [])
            ]
        ]
    };
}

function summarySheet
(
    data:
        ProductLedgerPrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const s =
        data.summary!;

    const values =
        !!data.request.showValue && s.CanViewCost;

    const bold =
        (text: string): ExcelCell =>
            ({ v:text, s:'bold' });

    return {
        name:'Summary',
        columns:values
            ? [6, 22, 40, 26, 26, 12, 16, 12, 16, 12, 16, 12, 16, 12]
            : [6, 22, 40, 26, 26, 12, 12, 12, 12, 12],
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [bold(`${data.page.title.toUpperCase()} - SUMMARY - ${s.ScopePath}`)],
            [bold('Period'), `${kit.date(s.From)} - ${kit.date(s.To)}`, null, bold('Branch'), [s.BranchName, s.WarehouseName].filter(x => !!x).join(' · ')],
            [],
            [
                bold('SL'), bold('Code'), bold('Product'), bold('Category'), bold('Sub Category'),
                ...(values
                    ? [bold('Opening'), bold('Opening Value'), bold('In'), bold('In Value'), bold('Out'), bold('Out Value'), bold('Closing'), bold('Closing Value'), bold('In Transit')]
                    : [bold('Opening'), bold('In'), bold('Out'), bold('Closing'), bold('In Transit')])
            ],
            ...s.Rows.map
            (
                (row, index): ExcelCell[] =>
                [
                    index + 1,
                    row.ProductCode,
                    row.ProductName,
                    row.CategoryName,
                    row.SubCategoryName,
                    ...(values
                        ? [
                            row.OpeningQty, { v:row.OpeningValue, s:'money' } as ExcelCell,
                            row.InQty, { v:row.InValue, s:'money' } as ExcelCell,
                            row.OutQty, { v:row.OutValue, s:'money' } as ExcelCell,
                            row.ClosingQty, { v:row.ClosingValue, s:'money' } as ExcelCell,
                            row.ClosingTransit
                        ]
                        : [row.OpeningQty, row.InQty, row.OutQty, row.ClosingQty, row.ClosingTransit])
                ]
            ),
            [
                null, null, null, null, bold('Total'),
                ...(values
                    ? [
                        s.OpeningQty, { v:s.OpeningValue, s:'boldMoney' } as ExcelCell,
                        s.InQty, { v:s.InValue, s:'boldMoney' } as ExcelCell,
                        s.OutQty, { v:s.OutValue, s:'boldMoney' } as ExcelCell,
                        s.ClosingQty, { v:s.ClosingValue, s:'boldMoney' } as ExcelCell,
                        s.ClosingTransit
                    ]
                    : [s.OpeningQty, s.InQty, s.OutQty, s.ClosingQty, s.ClosingTransit])
            ]
        ]
    };
}
