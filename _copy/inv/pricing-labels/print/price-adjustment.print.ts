//===============================================================
// Price Adjustment : print source (Print Engine) — the Price
// Adjustment note of one document.
//
//   /print-viewer/price-adjustment/<priceAdjustmentId>
//
// Header, info strip (No, type, circular ref / date, cut-off,
// status) · products (▲ / ▼) · batch detail (excl. VAT) ·
// supplier settlement · journal · totals · signatures.
// Landscape gives the batch table its VAT / new-cost columns.
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
    PRICE_ADJUSTMENT_NO_SUPPLIER,
    PRICE_ADJUSTMENT_PRINT_KEY,
    PriceAdjustmentDetail,
    formatAdjustmentCost,
    formatAdjustmentMoney,
    formatAdjustmentQty,
    normaliseIncreaseTo,
    normaliseReductionTo,
    priceAdjustmentChange,
    priceAdjustmentJournal,
    priceAdjustmentType
}
from '../models/price-adjustment.model';

import
{
    PriceAdjustmentService
}
from '../services/price-adjustment.service';


export interface PriceAdjustmentPrintData
{
    doc:PriceAdjustmentDetail;
}


//===============================================================
// Styles
//===============================================================

const PRICE_ADJUSTMENT_PRINT_CSS = `
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

/* Section titles */
.pa-h { margin-top: 3.4mm; font-size: 7pt; font-weight: 800; letter-spacing: 0.9pt; text-transform: uppercase; color: #1e3a8a; }

/* Tables */
table.vd-lines { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 1.2mm; }
.vd-lines th { font-size: 6.3pt; font-weight: 700; letter-spacing: 0.5pt; text-transform: uppercase; color: #475569; text-align: left;
               padding: 1.5mm 1.3mm; border-top: 1.2px solid #0f172a; border-bottom: 1px solid #0f172a; background: #f8fafc; white-space: nowrap; }
.vd-lines td { padding: 1.2mm 1.3mm; border-bottom: 1px solid #edf1f6; vertical-align: top; font-size: 7.6pt; overflow-wrap: break-word; color: #1e293b; }
.vd-r { text-align: right !important; font-variant-numeric: tabular-nums; white-space: nowrap; }
.vd-c { text-align: center !important; }
.rp-sl { color: #64748b; }
.rp-main { font-weight: 600; color: #0f172a; }
.rp-sub { margin-top: 0.3mm; font-size: 6.6pt; color: #475569; }
.rp-soft { color: #334155; font-size: 7.2pt; }
.rp-strong { font-weight: 800; }
.rp-mono { font-family: 'JetBrains Mono', Consolas, monospace; font-size: 7pt; }
.vd-lines tbody tr:last-child td { border-bottom: 0; }
.rp-total td { padding-top: 1.5mm; padding-bottom: 1.5mm; border-top: 1.2px solid #0f172a; border-bottom: 1.2px solid #0f172a; font-size: 8pt; font-weight: 800; color: #0b2a5b; }
.rp-cr { padding-left: 6mm !important; }
.rp-note { margin-top: 2.5mm; font-size: 7.2pt; color: #334155; }
.rp-cancel { margin: 2mm 0 0; padding: 1.6mm 2.4mm; border: 1px solid #fca5a5; border-radius: 1.6mm; background: #fef2f2; color: #b42318; font-size: 7.6pt; font-weight: 700; }
.rp-up { color: #047857; font-weight: 700; }
.rp-down { color: #b42318; font-weight: 700; }
.rp-tag { display: inline-block; margin-left: 1.4mm; padding: 0 1.4mm; border-radius: 1mm; background: #fef3c7; color: #92400e; font-size: 6pt; font-weight: 700; }

/* Totals boxes */
.pa-sum { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3mm; margin-top: 3mm; }
.pa-sum div { padding: 1.6mm 2.4mm; border: 1px solid #cdd9ee; border-left: 1mm solid #94a3b8; border-radius: 1.6mm; background: #f8fafd; }
.pa-sum span { display: block; font-size: 6pt; font-weight: 700; letter-spacing: 0.6pt; text-transform: uppercase; color: #64748b; }
.pa-sum b { font-size: 10pt; font-weight: 800; color: #0b2a5b; font-variant-numeric: tabular-nums; }
.pa-sum .pa-sum-up { border-left-color: #10b981; }
.pa-sum .pa-sum-down { border-left-color: #ef4444; }
.pa-sum .pa-sum-net { border-left-color: #1e3a8a; }

.rp-sign { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0 8mm; margin-top: 16mm; }
.rp-sign div { padding-top: 1.4mm; border-top: 1px solid #0f172a; text-align: center; font-size: 7pt; font-weight: 700; color: #334155; }
.rp-sign em { display: block; font-style: normal; font-weight: 500; color: #64748b; font-size: 6.4pt; }
`;


//===============================================================
// Source (the id is the document)
//===============================================================

export const PRICE_ADJUSTMENT_PRINT:
    PrintSourceDef<PriceAdjustmentPrintData> =
{
    key:PRICE_ADJUSTMENT_PRINT_KEY,

    title:'Price Adjustment',

    canRotate:true,

    async load
    (
        injector:
            Injector,
        id:
            number
    ):
        Promise<PriceAdjustmentPrintData>
    {
        const doc =
            await firstValueFrom(
                injector.get(PriceAdjustmentService).getById(id)
            );

        return {
            doc
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
            PriceAdjustmentPrintData
    ):
        string
    {
        return `Price Adjustment - ${data.doc.AdjustmentNo}`;
    },

    documents:
    [
        {
            key:'price-adjustment-note',
            title:'Price Adjustment Note',
            icon:'fas fa-scale-unbalanced',
            available:
                () =>
                    true,
            render:
                (data: PriceAdjustmentPrintData, kit: PrintKit) =>
                    noteHtml(data, kit),
            css:
                PRICE_ADJUSTMENT_PRINT_CSS,
            excel:
                (data: PriceAdjustmentPrintData, kit: PrintKit) =>
                    noteSheet(data, kit)
        }
    ]
};


//===============================================================
// Header : two identical cards split by a divider
//===============================================================

function adjustmentHead
(
    kit:
        PrintKit,
    kicker:
        string,
    title:
        string,
    cutOff:
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
                [company?.CompanyName || 'AppCore ERP', kicker, title, kit.date(cutOff)]
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
      <span class="sh-asof">Cut-off <b>${e(kit.date(cutOff))}</b></span>
    </div>
    ${qr ? `<div class="sh-qr">${qr}</div>` : ''}
  </div>
</div>
<div class="sh-meta">${meta.filter(x => !!x[1]).map(([label, value]) => `<span><i>${e(label)}</i>${e(value)}</span>`).join('')}</div>`;
}


//===============================================================
// Helpers
//===============================================================

function signedMoney
(
    value:
        number
):
    string
{
    const amount =
        Math.round((Number(value) || 0) * 100) / 100;

    return amount > 0
        ? `+${formatAdjustmentMoney(amount)}`
        : (amount < 0 ? `−${formatAdjustmentMoney(-amount)}` : formatAdjustmentMoney(0));
}

function signedCost
(
    value:
        number
):
    string
{
    return value > 0
        ? `+${formatAdjustmentCost(value)}`
        : (value < 0 ? `−${formatAdjustmentCost(-value)}` : formatAdjustmentCost(0));
}

function toneClass
(
    value:
        number
):
    string
{
    const amount =
        Math.round((Number(value) || 0) * 100) / 100;

    return amount > 0 ? 'rp-up' : (amount < 0 ? 'rp-down' : '');
}

function supplierLabel
(
    code:
        string,
    name:
        string
):
    string
{
    return name || code || PRICE_ADJUSTMENT_NO_SUPPLIER;
}


//===============================================================
// Price Adjustment note
//===============================================================

function noteHtml
(
    data:
        PriceAdjustmentPrintData,
    kit:
        PrintKit
):
    string
{
    const d =
        data.doc;

    const info =
        priceAdjustmentType(d.PageType);

    const e =
        kit.escape;

    // Portrait / Landscape switch of the viewer
    const wide =
        !!kit.landscape;

    const table =
        (cols: [string, string, string][], body: string, foot: string = ''): string =>
            `<table class="pv-split vd-lines">
  <colgroup>${cols.map(x => x[1] ? `<col style="width:${x[1]}">` : '<col>').join('')}</colgroup>
  <thead><tr>${cols.map(x => `<th class="${x[2]}">${e(x[0])}</th>`).join('')}</tr></thead>
  <tbody>${body}</tbody>
  ${foot ? `<tfoot>${foot}</tfoot>` : ''}
</table>`;

    // ---- Products -------------------------------------------------
    const productCols:
        [string, string, string][] =
    [
        ['SL', '8mm', 'vd-c'],
        ['Product', '', ''],
        ['Last MRP', '22mm', 'vd-r'],
        ['New MRP', '22mm', 'vd-r'],
        ['Change', '22mm', 'vd-r'],
        ['Batches', '15mm', 'vd-r'],
        ['Qty', '17mm', 'vd-r'],
        ['Amount', '25mm', 'vd-r']
    ];

    const productBody =
        d.Products
            .map
            (
                (p, index) =>
                {
                    const change =
                        priceAdjustmentChange(p.OldMrp, p.NewMrp);

                    const arrow =
                        p.Direction === 'Reduction' ? '▼' : '▲';

                    const changeText =
                        change === null ? 'New' : `${change > 0 ? '+' : ''}${change.toFixed(2)}%`;

                    return `<tr>
  <td class="vd-c rp-sl">${index + 1}</td>
  <td><div class="rp-main">${e(p.ProductName)}</div><div class="rp-sub">${e([p.ProductCode, p.PartNumber].filter(x => !!x).join(' · '))}${p.HasStock ? '' : ' · price only'}</div></td>
  <td class="vd-r rp-soft">${e(formatAdjustmentMoney(p.OldMrp))}</td>
  <td class="vd-r rp-strong">${e(formatAdjustmentMoney(p.NewMrp))}</td>
  <td class="vd-r ${p.Direction === 'Reduction' ? 'rp-down' : 'rp-up'}">${arrow} ${e(changeText)}</td>
  <td class="vd-r">${p.BatchCount}</td>
  <td class="vd-r">${e(formatAdjustmentQty(p.Quantity))}</td>
  <td class="vd-r ${toneClass(p.Amount)}">${e(signedMoney(p.Amount))}</td>
</tr>`;
                }
            )
            .join('');

    // ---- Batches --------------------------------------------------
    const batchCols:
        [string, string, string][] =
    [
        ['Product · Batch', '', ''],
        ['Supplier', wide ? '34mm' : '26mm', ''],
        ...(wide ? [['VAT', '11mm', 'vd-r']] as [string, string, string][] : []),
        ['Qty', '14mm', 'vd-r'],
        ['Sold', '12mm', 'vd-r'],
        ['Cost', '18mm', 'vd-r'],
        ['Margin', '15mm', 'vd-r'],
        ...(wide ? [['New Cost', '18mm', 'vd-r']] as [string, string, string][] : []),
        ['Diff/Unit', '18mm', 'vd-r'],
        ['Amount', '22mm', 'vd-r']
    ];

    const batchBody =
        d.Lines
            .map
            (
                line =>
                {
                    const product =
                        d.Products.find(x => x.ProductId === line.ProductId);

                    return `<tr>
  <td><div class="rp-main">${e(product?.ProductName ?? '')}</div><div class="rp-sub"><span class="rp-mono">${e(line.BatchNo)}</span> · MRP ${e(formatAdjustmentMoney(line.OldMrp))} → ${e(formatAdjustmentMoney(line.NewMrp))}</div></td>
  <td class="rp-soft">${e(supplierLabel(line.SupplierCode, line.SupplierName))}</td>
  ${wide ? `<td class="vd-r rp-soft">${e(String(line.VatRate))}%</td>` : ''}
  <td class="vd-r">${e(formatAdjustmentQty(line.Quantity))}</td>
  <td class="vd-r rp-soft">${e(formatAdjustmentQty(line.SoldSinceCutOff))}</td>
  <td class="vd-r rp-soft">${e(formatAdjustmentCost(line.UnitCost))}</td>
  <td class="vd-r">${e(line.MarginPercent.toFixed(2))}%${line.MarginEdited ? '<span class="rp-tag">set</span>' : ''}</td>
  ${wide ? `<td class="vd-r">${e(formatAdjustmentCost(line.NewUnitCost))}</td>` : ''}
  <td class="vd-r ${toneClass(line.DifferencePerUnit)}">${e(signedCost(line.DifferencePerUnit))}</td>
  <td class="vd-r ${toneClass(line.Amount)}">${e(signedMoney(line.Amount))}</td>
</tr>`;
                }
            )
            .join('');

    const batchFoot =
        `<tr class="rp-total"><td colspan="${batchCols.length - 1}" class="vd-r">▲ ${e(formatAdjustmentMoney(d.IncreaseAmount))} · ▼ ${e(formatAdjustmentMoney(d.ReductionAmount))} · Net</td><td class="vd-r">${e(signedMoney(d.NetAmount))}</td></tr>`;

    // ---- Settlement -----------------------------------------------
    const settleCols:
        [string, string, string][] =
    [
        ['Supplier', '', ''],
        ['Increase', '26mm', 'vd-r'],
        ['Increase to', '28mm', ''],
        ['Reduction', '26mm', 'vd-r'],
        ['Reduction to', '28mm', '']
    ];

    const settleBody =
        d.Suppliers
            .map
            (
                s =>
                    `<tr>
  <td class="rp-main">${e(supplierLabel(s.SupplierCode, s.SupplierName))}${s.SupplierCode ? ` <span class="rp-soft">${e(s.SupplierCode)}</span>` : ''}</td>
  <td class="vd-r rp-up">${s.IncreaseAmount ? e(formatAdjustmentMoney(s.IncreaseAmount)) : '—'}</td>
  <td>${s.IncreaseAmount ? e(normaliseIncreaseTo(s.IncreaseTo, s.SupplierCode)) : '—'}</td>
  <td class="vd-r rp-down">${s.ReductionAmount ? e(formatAdjustmentMoney(s.ReductionAmount)) : '—'}</td>
  <td>${s.ReductionAmount ? e(normaliseReductionTo(s.ReductionTo, s.SupplierCode)) : '—'}</td>
</tr>`
            )
            .join('');

    // ---- Journal --------------------------------------------------
    const journal =
        priceAdjustmentJournal(d.Lines, d.Suppliers, s => ({ IncreaseTo:s.IncreaseTo, ReductionTo:s.ReductionTo }));

    const journalCols:
        [string, string, string][] =
    [
        ['Ledger', '', ''],
        ['Party', '40mm', ''],
        ['Debit', '26mm', 'vd-r'],
        ['Credit', '26mm', 'vd-r']
    ];

    const journalBody =
        journal
            .map
            (
                j =>
                    `<tr>
  <td class="${j.Credit > 0 ? 'rp-cr' : ''}">${e(j.Ledger)}${j.Kind === 'Release' ? '<span class="rp-tag">sold since cut-off</span>' : ''}</td>
  <td class="rp-soft">${e(j.Party || '—')}</td>
  <td class="vd-r">${j.Debit ? e(formatAdjustmentMoney(j.Debit)) : ''}</td>
  <td class="vd-r">${j.Credit ? e(formatAdjustmentMoney(j.Credit)) : ''}</td>
</tr>`
            )
            .join('');

    const debit =
        journal.reduce((total, x) => total + x.Debit, 0);

    const credit =
        journal.reduce((total, x) => total + x.Credit, 0);

    const journalFoot =
        `<tr class="rp-total"><td colspan="2" class="vd-r">Total</td><td class="vd-r">${e(formatAdjustmentMoney(debit))}</td><td class="vd-r">${e(formatAdjustmentMoney(credit))}</td></tr>`;

    const journalTitle =
        d.Status === 'Draft'
            ? 'Journal on post (preview)'
            : `Journal PA · ${d.AdjustmentNo}${d.PostedDate ? ` · ${kit.date(d.PostedDate)}` : ''}${d.Status === 'Cancelled' ? ' · reversed' : ''}`;

    return `<section class="pv-flow${wide ? ' pv-landscape' : ''}" data-watermark="${d.Status === 'Cancelled' ? 'CANCELLED' : d.Status === 'Draft' ? 'DRAFT' : ''}">
<div class="pv-run-head">
${adjustmentHead(kit, `Price Adjustment · ${info.title}`, d.AdjustmentNo, d.CutOffDate,
    [
        ['No', d.AdjustmentNo],
        ['Type', info.title],
        ['Circular', d.CircularRef],
        ['Circular Date', d.CircularDate ? kit.date(d.CircularDate) : ''],
        ['Cut-off', kit.date(d.CutOffDate)],
        ['Status', d.Status]
    ])}
</div>
<div class="pv-body">
${d.Status === 'Cancelled' ? `<div class="rp-cancel">CANCELLED ${e(kit.date(d.CancelledDate))}${d.CancelledByName ? ` · ${e(d.CancelledByName)}` : ''} · ${e(d.CancelReason)}</div>` : ''}
<div class="pa-h">Products</div>
${table(productCols, productBody || `<tr><td colspan="${productCols.length}" class="vd-c rp-soft">No products</td></tr>`)}
<div class="pa-h">Stock on hand on ${e(kit.date(d.CutOffDate))} (excluding VAT)</div>
${table(batchCols, batchBody || `<tr><td colspan="${batchCols.length}" class="vd-c rp-soft">No priced stock on the cut-off date : the new MRPs go to the price index only.</td></tr>`, batchBody ? batchFoot : '')}
${d.Suppliers.length ? `<div class="pa-h">Settlement by supplier</div>${table(settleCols, settleBody)}` : ''}
${journal.length ? `<div class="pa-h">${e(journalTitle)}</div>${table(journalCols, journalBody, journalFoot)}` : ''}
<div class="pa-sum">
  <div class="pa-sum-up"><span>Total Increase</span><b>${e(formatAdjustmentMoney(d.IncreaseAmount))}</b></div>
  <div class="pa-sum-down"><span>Total Reduction</span><b>${e(formatAdjustmentMoney(d.ReductionAmount))}</b></div>
  <div class="pa-sum-net"><span>Net</span><b>${e(signedMoney(d.NetAmount))}</b></div>
</div>
${d.Remarks ? `<div class="rp-note"><b>Remarks :</b> ${e(d.Remarks)}</div>` : ''}
<div class="rp-note">MRP includes VAT and is the sale price; costs and differences exclude VAT. Units still on hand release the adjustment as they are sold.</div>
</div>
<div class="pv-end">
<div class="rp-sign">
  <div>Prepared By<em>${e(d.CreatedByName || ' ')}</em></div>
  <div>Checked By<em>&nbsp;</em></div>
  <div>Approved By<em>&nbsp;</em></div>
  <div>Posted By<em>${e(d.PostedByName || ' ')}</em></div>
</div>
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>
</section>`;
}


//===============================================================
// Excel
//===============================================================

function noteSheet
(
    data:
        PriceAdjustmentPrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const d =
        data.doc;

    const info =
        priceAdjustmentType(d.PageType);

    const bold =
        (text: string): ExcelCell =>
            ({ v:text, s:'bold' });

    return {
        name:'Price Adjustment',
        columns:[22, 40, 20, 26, 10, 12, 12, 14, 12, 14, 14, 14, 16],
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [bold(`PRICE ADJUSTMENT - ${d.AdjustmentNo}`)],
            [bold('Type'), info.title, null, bold('Cut-off'), kit.date(d.CutOffDate)],
            [bold('Circular'), d.CircularRef, null, bold('Circular Date'), d.CircularDate ? kit.date(d.CircularDate) : ''],
            [bold('Status'), d.Status, null, bold('Remarks'), d.Remarks],
            [bold('Increase'), d.IncreaseAmount, null, bold('Reduction'), d.ReductionAmount, bold('Net'), d.NetAmount],
            [],
            [bold('Code'), bold('Product'), bold('Batch'), bold('Supplier'), bold('VAT %'), bold('Qty'), bold('Sold Since'), bold('Unit Cost'), bold('Margin %'), bold('New Cost'), bold('Diff / Unit'), bold('Amount'), bold('Old → New MRP')],
            ...d.Lines.map
            (
                (line): ExcelCell[] =>
                {
                    const product =
                        d.Products.find(x => x.ProductId === line.ProductId);

                    return [
                        product?.ProductCode ?? '',
                        product?.ProductName ?? '',
                        line.BatchNo,
                        supplierLabel(line.SupplierCode, line.SupplierName),
                        line.VatRate,
                        line.Quantity,
                        line.SoldSinceCutOff,
                        line.UnitCost,
                        line.MarginPercent,
                        line.NewUnitCost,
                        line.DifferencePerUnit,
                        line.Amount,
                        `${formatAdjustmentMoney(line.OldMrp)} → ${formatAdjustmentMoney(line.NewMrp)}`
                    ];
                }
            ),
            // Price-only products (no batch)
            ...d.Products
                .filter(p => !d.Lines.some(l => l.ProductId === p.ProductId))
                .map
                (
                    (p): ExcelCell[] =>
                        [p.ProductCode, p.ProductName, 'Price only', '', null, 0, null, null, null, null, null, 0, `${formatAdjustmentMoney(p.OldMrp)} → ${formatAdjustmentMoney(p.NewMrp)}`]
                ),
            [],
            [bold('Supplier'), bold('Increase'), bold('Increase to'), bold('Reduction'), bold('Reduction to')],
            ...d.Suppliers.map
            (
                (s): ExcelCell[] =>
                    [
                        supplierLabel(s.SupplierCode, s.SupplierName),
                        s.IncreaseAmount,
                        s.IncreaseAmount ? normaliseIncreaseTo(s.IncreaseTo, s.SupplierCode) : '',
                        s.ReductionAmount,
                        s.ReductionAmount ? normaliseReductionTo(s.ReductionTo, s.SupplierCode) : ''
                    ]
            )
        ]
    };
}
