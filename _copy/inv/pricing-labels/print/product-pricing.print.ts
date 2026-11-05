//===============================================================
// Product Pricing : print source (Print Engine) — the Price
// Change note of one document.
//
//   /print-viewer/product-pricing/<productPricingId>
//
// One row per batch : SL · Product (code · batch · source) ·
// Branch · Qty · Cost · Old MRP · New MRP · Change; landscape
// gives the notes a column. MRP (VAT inclusive) is the sale price.
// No journal : stock stays at cost. Signature line at the end.
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
    PRODUCT_PRICING_PRINT_KEY,
    ProductPricing,
    formatPricingCost,
    formatPricingMoney,
    formatPricingQty,
    productPricingType
}
from '../models/product-pricing.model';

import
{
    ProductPricingService
}
from '../services/product-pricing.service';


export interface ProductPricingPrintData
{
    doc:ProductPricing;
}


//===============================================================
// Styles
//===============================================================

const PRODUCT_PRICING_PRINT_CSS = `
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


/* Table */
table.vd-lines { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 2.4mm; }
.vd-lines th { font-size: 6.3pt; font-weight: 700; letter-spacing: 0.5pt; text-transform: uppercase; color: #475569; text-align: left;
               padding: 1.6mm 1.4mm; border-top: 1.2px solid #0f172a; border-bottom: 1px solid #0f172a; background: #f8fafc; white-space: nowrap; }
.vd-lines td { padding: 1.3mm 1.4mm; border-bottom: 1px solid #edf1f6; vertical-align: top; font-size: 7.8pt; overflow-wrap: break-word; }
.vd-r { text-align: right !important; font-variant-numeric: tabular-nums; white-space: nowrap; }
.vd-c { text-align: center !important; }
.rp-sl { color: #94a3b8; }
.rp-main { font-weight: 600; color: #0f172a; }
.rp-sub { margin-top: 0.3mm; font-size: 6.8pt; color: #64748b; }
.rp-soft { color: #475569; font-size: 7.4pt; }
.rp-strong { font-weight: 800; }
.rp-bikes td { padding-top: 0; padding-bottom: 1.6mm; font-size: 6.9pt; color: #334155; font-family: 'JetBrains Mono', Consolas, monospace; }
.rp-bikes span { display: inline-block; margin: 0.4mm 3mm 0.4mm 0; white-space: nowrap; }
.rp-bikes i { color: #94a3b8; font-style: normal; margin-right: 1mm; }
.vd-lines tbody tr:last-child td { border-bottom: 0; }
.rp-total td { padding-top: 1.6mm; padding-bottom: 1.6mm; border-top: 1.2px solid #0f172a; border-bottom: 1.2px solid #0f172a; font-size: 8.4pt; font-weight: 800; color: #0b2a5b; }
.rp-note { margin-top: 2.5mm; font-size: 7.2pt; color: #475569; }
.rp-cancel { margin: 2mm 0 0; padding: 1.6mm 2.4mm; border: 1px solid #fca5a5; border-radius: 1.6mm; background: #fef2f2; color: #b42318; font-size: 7.6pt; font-weight: 700; }
.rp-sign { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0 8mm; margin-top: 16mm; }
.rp-sign div { padding-top: 1.4mm; border-top: 1px solid #0f172a; text-align: center; font-size: 7pt; font-weight: 700; color: #334155; }
.rp-sign em { display: block; font-style: normal; font-weight: 500; color: #64748b; font-size: 6.4pt; }

/* Journal under the total */
.op-journal { display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto; gap: 0.8mm 4mm; margin-top: 3mm; padding: 2mm 3mm;
              border: 1px solid #cdd9ee; border-radius: 1.8mm; background: #f8fafd; font-size: 7.6pt; align-items: baseline; }
.op-journal i { font-style: normal; font-size: 6pt; font-weight: 700; letter-spacing: 0.6pt; text-transform: uppercase; color: #94a3b8; }
.op-journal b { font-weight: 700; color: #0f172a; }
.op-journal span { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.op-journal .op-cr { padding-left: 6mm; }
.rp-up { color: #047857; }
.rp-down { color: #b42318; }
.rp-none { color: #b45309; font-style: italic; }
`;


//===============================================================
// Source (the id is the document)
//===============================================================

export const PRODUCT_PRICING_PRINT:
    PrintSourceDef<ProductPricingPrintData> =
{
    key:PRODUCT_PRICING_PRINT_KEY,

    title:'Product Pricing',

    canRotate:true,

    async load
    (
        injector:
            Injector,
        id:
            number
    ):
        Promise<ProductPricingPrintData>
    {
        const doc =
            await firstValueFrom(
                injector.get(ProductPricingService).getById(id)
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
            ProductPricingPrintData
    ):
        string
    {
        return `Price Change - ${data.doc.PricingNo}`;
    },

    documents:
    [
        {
            key:'price-change-note',
            title:'Price Change Note',
            icon:'fas fa-tags',
            available:
                () =>
                    true,
            render:
                (data: ProductPricingPrintData, kit: PrintKit) =>
                    noteHtml(data, kit),
            css:
                PRODUCT_PRICING_PRINT_CSS,
            excel:
                (data: ProductPricingPrintData, kit: PrintKit) =>
                    noteSheet(data, kit)
        }
    ]
};


//===============================================================
// Header : two identical cards split by a divider
//===============================================================

function pricingHead
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
        string[][],
    asOfLabel:
        string = 'Period'
):
    string
{
    const e =
        kit.escape;

    const company =
        kit.company;

    const period =
        from === to
            ? kit.date(from)
            : `${kit.date(from)} – ${kit.date(to)}`;

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
      <span class="sh-asof">${e(asOfLabel)} <b>${e(period)}</b></span>
    </div>
    ${qr ? `<div class="sh-qr">${qr}</div>` : ''}
  </div>
</div>
<div class="sh-meta">${meta.filter(x => !!x[1]).map(([label, value]) => `<span><i>${e(label)}</i>${e(value)}</span>`).join('')}</div>`;
}


//===============================================================
// Price Change note
//===============================================================

function noteHtml
(
    data:
        ProductPricingPrintData,
    kit:
        PrintKit
):
    string
{
    const d =
        data.doc;

    const info =
        productPricingType(d.PageType);

    const e =
        kit.escape;

    // Portrait / Landscape switch of the viewer
    const wide =
        !!kit.landscape;

    const cols:
        [string, string, string][] =
    [
        ['SL', '8mm', 'vd-c'],
        ['Product · Batch', '', ''],
        ['Branch', '30mm', ''],
        ['Qty', '16mm', 'vd-r'],
        ['Cost', '22mm', 'vd-r'],
        ['Old MRP', '22mm', 'vd-r'],
        ['New MRP', '22mm', 'vd-r'],
        ['Change', '18mm', 'vd-r'],
        ...(wide ? [['Notes', '20%', '']] as [string, string, string][] : [])
    ];

    const change =
        (oldMrp: number, newMrp: number): string =>
        {
            if
            (
                !(oldMrp > 0)
            )
            {
                return '<span class="rp-none">priced</span>';
            }

            const pct =
                Math.round((newMrp - oldMrp) / oldMrp * 10000) / 100;

            return pct === 0
                ? '0.00%'
                : `<span class="${pct > 0 ? 'rp-up' : 'rp-down'}">${pct > 0 ? '+' : ''}${pct.toFixed(2)}%</span>`;
        };

    const body =
        d.Lines
            .map
            (
                (line, index) =>
                {
                    const sub =
                        // A declared-price line : no batch (new purchases take it)
                        (line.StockBatchId > 0
                            ? [line.ProductCode, `Batch ${line.BatchNo}`, `${line.SourceType} ${line.SourceNo}`.trim(), wide ? '' : line.Notes]
                            : [line.ProductCode, 'Declared price : new purchases take it', wide ? '' : line.Notes])
                            .filter(x => !!x)
                            .join(' · ');

                    return `<tr>
  <td class="vd-c rp-sl">${index + 1}</td>
  <td><div class="rp-main">${e(line.ProductName)}</div><div class="rp-sub">${e(sub)}</div></td>
  <td class="rp-soft">${e(line.BranchName || '—')}</td>
  <td class="vd-r">${e(formatPricingQty(line.Quantity))} <span class="rp-soft">${e(line.Unit)}</span></td>
  <td class="vd-r rp-soft">${line.StockBatchId > 0 ? e(formatPricingCost(line.UnitCost)) : '—'}</td>
  <td class="vd-r rp-soft">${line.OldMrp ? e(formatPricingMoney(line.OldMrp)) : '<span class="rp-none">unpriced</span>'}</td>
  <td class="vd-r rp-strong">${e(formatPricingMoney(line.NewMrp))}</td>
  <td class="vd-r">${change(line.OldMrp, line.NewMrp)}</td>
  ${wide ? `<td class="rp-soft">${e(line.Notes)}</td>` : ''}
</tr>`;
                }
            )
            .join('');

    return `<section class="pv-flow${wide ? ' pv-landscape' : ''}" data-watermark="${d.Status === 'Cancelled' ? 'CANCELLED' : d.Status === 'Draft' ? 'DRAFT' : ''}">
<div class="pv-run-head">
${pricingHead(kit, `Price Change · ${info.title}`, d.PricingNo, d.PricingDate, d.PricingDate,
    [
        ['Type', info.title],
        ['Kind', d.PricingKind === 'New' ? 'New Pricing' : 'Repricing'],
        ['Invoice', d.PricingKind === 'New' ? `${d.PurchaseNo} · ${d.SupplierName}` : ''],
        ['Basis', d.PricingKind === 'New' ? `${d.PricingBasis === 'Margin' ? 'Margin on MRP' : 'Profit on cost'} ${d.BasisPercent}%` : ''],
        ['Products', String(d.ProductCount)],
        ['Batches', String(d.BatchCount)],
        ['Status', d.Status]
    ],
    'Effective')}
</div>
<div class="pv-body">
${d.Status === 'Cancelled' ? `<div class="rp-cancel">CANCELLED ${e(kit.date(d.CancelledDate))} · ${e(d.CancelReason)}</div>` : ''}
<table class="pv-split vd-lines">
  <colgroup>${cols.map(x => x[1] ? `<col style="width:${x[1]}">` : '<col>').join('')}</colgroup>
  <thead><tr>${cols.map(x => `<th class="${x[2]}">${e(x[0])}</th>`).join('')}</tr></thead>
  <tbody>${body}</tbody>
  <tfoot>
    <tr class="rp-total"><td colspan="${cols.length}" class="vd-r">${d.ProductCount} product${d.ProductCount === 1 ? '' : 's'} · ${d.BatchCount} batch${d.BatchCount === 1 ? '' : 'es'}</td></tr>
  </tfoot>
</table>
${d.Remarks ? `<div class="rp-note"><b>Remarks :</b> ${e(d.Remarks)}</div>` : ''}
<div class="rp-note">MRP includes VAT and is the sale price. ${d.Status === 'Posted' ? 'The batches above sell at the new MRP from' : 'Effective'} ${e(kit.date(d.PricingDate))}. No journal : the stock stays at its cost.</div>
</div>
<div class="pv-end">
<div class="rp-sign">
  <div>Prepared By<em>&nbsp;</em></div>
  <div>Checked By<em>&nbsp;</em></div>
  <div>Approved By<em>&nbsp;</em></div>
  <div>Authorised By<em>&nbsp;</em></div>
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
        ProductPricingPrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const d =
        data.doc;

    const info =
        productPricingType(d.PageType);

    const bold =
        (text: string): ExcelCell =>
            ({ v:text, s:'bold' });

    return {
        name:'Price Change',
        columns:[6, 22, 44, 24, 22, 22, 12, 14, 14, 14, 30],
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [bold(`PRICE CHANGE - ${d.PricingNo}`)],
            [bold('Effective'), kit.date(d.PricingDate), null, bold('Type'), info.title],
            [bold('Status'), d.Status, null, bold('Remarks'), d.Remarks],
            [],
            [bold('SL'), bold('Code'), bold('Product'), bold('Batch'), bold('Source'), bold('Branch'), bold('Quantity'), bold('Unit Cost'), bold('Old MRP'), bold('New MRP'), bold('Notes')],
            ...d.Lines.map
            (
                (line, index): ExcelCell[] =>
                [
                    index + 1,
                    line.ProductCode,
                    line.ProductName,
                    line.StockBatchId > 0 ? line.BatchNo : 'Declared price',
                    line.StockBatchId > 0 ? `${line.SourceType} ${line.SourceNo}`.trim() : 'New purchases take it',
                    line.BranchName,
                    line.Quantity,
                    line.UnitCost,
                    line.OldMrp,
                    line.NewMrp,
                    line.Notes
                ]
            )
        ]
    };
}
