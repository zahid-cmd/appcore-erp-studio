//===============================================================
// Product Transfer : print source (Print Engine) — the transfer
// note of one document.
//
//   /print-viewer/product-transfer/<productTransferId>
//
// Header, info strip (No, type, date, from → to, status, voucher
// no) · lines with their batches (motor bikes : the chassis) and
// places · journal (inter-branch) · totals · signatures (Issued
// by / Received by). Landscape gives the lines their batch and
// cost columns.
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
    PRODUCT_TRANSFER_PRINT_KEY,
    ProductTransferDetail,
    formatTransferCost,
    formatTransferMoney,
    formatTransferQty,
    placeText,
    productTransferJournal,
    productTransferType,
    warehouseText
}
from '../models/product-transfer.model';

import
{
    ProductTransferService
}
from '../services/product-transfer.service';


export interface ProductTransferPrintData
{
    doc:ProductTransferDetail;
}


//===============================================================
// Styles
//===============================================================

const PRODUCT_TRANSFER_PRINT_CSS = `
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

/* Route : from → to */
.pt-route { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: stretch; gap: 0 3mm; margin-top: 2.4mm; }
.pt-route > div { padding: 1.6mm 2.4mm; border: 1px solid #cdd9ee; border-radius: 1.6mm; background: #f8fafd; }
.pt-route span { display: block; font-size: 6pt; font-weight: 700; letter-spacing: 0.6pt; text-transform: uppercase; color: #64748b; }
.pt-route b { font-size: 9pt; font-weight: 800; color: #0b2a5b; }
.pt-route em { display: block; font-style: normal; font-size: 7pt; color: #475569; }
.pt-route .pt-arrow { align-self: center; padding: 0; border: 0; background: none; font-size: 12pt; color: #1e3a8a; }

/* Section titles */
.pt-h { margin-top: 3.4mm; font-size: 7pt; font-weight: 800; letter-spacing: 0.9pt; text-transform: uppercase; color: #1e3a8a; }

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
.rp-mono { font-family: 'JetBrains Mono', Consolas, monospace; font-size: 6.8pt; }
.rp-chassis { display: inline-block; margin: 0.4mm 1mm 0 0; padding: 0 1.2mm; border: 1px solid #cdd9ee; border-radius: 1mm; font-family: 'JetBrains Mono', Consolas, monospace; font-size: 6.4pt; color: #0f172a; }
.vd-lines tbody tr:last-child td { border-bottom: 0; }
.rp-total td { padding-top: 1.5mm; padding-bottom: 1.5mm; border-top: 1.2px solid #0f172a; border-bottom: 1.2px solid #0f172a; font-size: 8pt; font-weight: 800; color: #0b2a5b; }
.rp-cr { padding-left: 6mm !important; }
.rp-note { margin-top: 2.5mm; font-size: 7.2pt; color: #334155; }
.rp-cancel { margin: 2mm 0 0; padding: 1.6mm 2.4mm; border: 1px solid #fca5a5; border-radius: 1.6mm; background: #fef2f2; color: #b42318; font-size: 7.6pt; font-weight: 700; }
.rp-transit { margin: 2mm 0 0; padding: 1.6mm 2.4mm; border: 1px solid #bfdbfe; border-radius: 1.6mm; background: #eff6ff; color: #1e3a8a; font-size: 7.6pt; font-weight: 700; }
.rp-tag { display: inline-block; margin-left: 1.4mm; padding: 0 1.4mm; border-radius: 1mm; background: #fef3c7; color: #92400e; font-size: 6pt; font-weight: 700; }

/* Totals boxes */
.pt-sum { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3mm; margin-top: 3mm; }
.pt-sum div { padding: 1.6mm 2.4mm; border: 1px solid #cdd9ee; border-left: 1mm solid #94a3b8; border-radius: 1.6mm; background: #f8fafd; }
.pt-sum span { display: block; font-size: 6pt; font-weight: 700; letter-spacing: 0.6pt; text-transform: uppercase; color: #64748b; }
.pt-sum b { font-size: 10pt; font-weight: 800; color: #0b2a5b; font-variant-numeric: tabular-nums; }
.pt-sum .pt-sum-value { border-left-color: #1e3a8a; }

.rp-sign { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0 10mm; margin-top: 16mm; }
.rp-sign div { padding-top: 1.4mm; border-top: 1px solid #0f172a; text-align: center; font-size: 7pt; font-weight: 700; color: #334155; }
.rp-sign em { display: block; font-style: normal; font-weight: 500; color: #64748b; font-size: 6.4pt; }
`;


//===============================================================
// Source (the id is the document)
//===============================================================

export const PRODUCT_TRANSFER_PRINT:
    PrintSourceDef<ProductTransferPrintData> =
{
    key:PRODUCT_TRANSFER_PRINT_KEY,

    title:'Product Transfer',

    canRotate:true,

    async load
    (
        injector:
            Injector,
        id:
            number
    ):
        Promise<ProductTransferPrintData>
    {
        const doc =
            await firstValueFrom(
                injector.get(ProductTransferService).getById(id)
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
            ProductTransferPrintData
    ):
        string
    {
        return `Product Transfer - ${data.doc.TransferNo}`;
    },

    documents:
    [
        {
            key:'product-transfer-note',
            title:'Product Transfer Note',
            icon:'fas fa-right-left',
            available:
                () =>
                    true,
            render:
                (data: ProductTransferPrintData, kit: PrintKit) =>
                    noteHtml(data, kit),
            css:
                PRODUCT_TRANSFER_PRINT_CSS,
            excel:
                (data: ProductTransferPrintData, kit: PrintKit) =>
                    noteSheet(data, kit)
        }
    ]
};


//===============================================================
// Header : two identical cards split by a divider
//===============================================================

function transferHead
(
    kit:
        PrintKit,
    kicker:
        string,
    title:
        string,
    transferDate:
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
                [company?.CompanyName || 'AppCore ERP', kicker, title, kit.date(transferDate)]
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
      <span class="sh-asof">Date <b>${e(kit.date(transferDate))}</b></span>
    </div>
    ${qr ? `<div class="sh-qr">${qr}</div>` : ''}
  </div>
</div>
<div class="sh-meta">${meta.filter(x => !!x[1]).map(([label, value]) => `<span><i>${e(label)}</i>${e(value)}</span>`).join('')}</div>`;
}


//===============================================================
// Transfer note
//===============================================================

function noteHtml
(
    data:
        ProductTransferPrintData,
    kit:
        PrintKit
):
    string
{
    const d =
        data.doc;

    const info =
        productTransferType(d.PageType);

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

    // ---- Lines ----------------------------------------------------
    const cols:
        [string, string, string][] =
    [
        ['SL', '8mm', 'vd-c'],
        [info.item, '', ''],
        ['Batches', wide ? '62mm' : '40mm', ''],
        [info.bikes ? 'Bikes' : 'Qty', '16mm', 'vd-r'],
        ['Unit', '12mm', ''],
        ...(wide ? [['Avg Cost', '20mm', 'vd-r']] as [string, string, string][] : []),
        ['Value', '24mm', 'vd-r'],
        ...(info.hasPlaces ? [['Place', wide ? '34mm' : '26mm', '']] as [string, string, string][] : [])
    ];

    const body =
        d.Lines
            .map
            (
                (line, index) =>
                {
                    const batches =
                        line.Batches
                            .map(b => `<div><span class="rp-mono">${e(b.BatchNo || '#' + b.StockBatchId)}</span> × ${e(formatTransferQty(b.Quantity))}${wide ? ` <span class="rp-soft">@ ${e(formatTransferCost(b.UnitCost))}</span>` : ''}</div>`)
                            .join('');

                    const chassis =
                        info.bikes && line.Units.length
                            ? `<div class="rp-sub">${line.Units.map(u => `<span class="rp-chassis">${e(u.ChassisNo)}</span>`).join('')}</div>`
                            : '';

                    const place =
                        placeText(line.ToRackName, line.ToShelfNo, line.ToBinNo, line.ToBinCode);

                    const avg =
                        line.UnitCostAvg || (line.Quantity ? line.Value / line.Quantity : 0);

                    return `<tr>
  <td class="vd-c rp-sl">${index + 1}</td>
  <td><div class="rp-main">${e(line.ProductName)}</div><div class="rp-sub">${e([line.ProductCode, line.PartNumber].filter(x => !!x).join(' · '))}${line.Notes ? ` · ${e(line.Notes)}` : ''}</div>${chassis}</td>
  <td class="rp-soft">${batches || '<span class="rp-soft">On post</span>'}</td>
  <td class="vd-r rp-strong">${e(formatTransferQty(line.Quantity))}</td>
  <td class="rp-soft">${e(info.bikes ? 'Bike' : line.Unit)}</td>
  ${wide ? `<td class="vd-r rp-soft">${e(formatTransferCost(avg))}</td>` : ''}
  <td class="vd-r">${e(formatTransferMoney(line.Value))}</td>
  ${info.hasPlaces ? `<td class="rp-soft">${e(place || '—')}${line.SavePlace && place ? '<span class="rp-tag">saved</span>' : ''}</td>` : ''}
</tr>`;
                }
            )
            .join('');

    const totalQuantity =
        d.TotalQuantity || d.Lines.reduce((total, x) => total + x.Quantity, 0);

    const totalValue =
        d.TotalValue || d.Lines.reduce((total, x) => total + x.Value, 0);

    const valueAt =
        cols.findIndex(x => x[0] === 'Value');

    const foot =
        `<tr class="rp-total"><td colspan="3" class="vd-r">Total</td><td class="vd-r">${e(formatTransferQty(totalQuantity))}</td><td colspan="${valueAt - 4}"></td><td class="vd-r">${e(formatTransferMoney(totalValue))}</td>${cols.length - valueAt - 1 > 0 ? `<td colspan="${cols.length - valueAt - 1}"></td>` : ''}</tr>`;

    // ---- Journal (inter-branch) -----------------------------------
    const journal =
        d.IsInterBranch
            ? productTransferJournal(info.title, d.FromBranchName, d.ToBranchName, totalValue)
            : [];

    const journalCols:
        [string, string, string][] =
    [
        ['Ledger', '', ''],
        ['Branch', '40mm', ''],
        ['Debit', '26mm', 'vd-r'],
        ['Credit', '26mm', 'vd-r']
    ];

    const journalBody =
        journal
            .map
            (
                j =>
                    `<tr>
  <td class="${j.Credit > 0 ? 'rp-cr' : ''}">${e(j.Ledger)}${j.Engine ? '<span class="rp-tag">inter-branch</span>' : ''}</td>
  <td class="rp-soft">${e(j.Branch || '—')}</td>
  <td class="vd-r">${j.Debit ? e(formatTransferMoney(j.Debit)) : ''}</td>
  <td class="vd-r">${j.Credit ? e(formatTransferMoney(j.Credit)) : ''}</td>
</tr>`
            )
            .join('');

    const debit =
        journal.reduce((total, x) => total + x.Debit, 0);

    const credit =
        journal.reduce((total, x) => total + x.Credit, 0);

    const journalFoot =
        `<tr class="rp-total"><td colspan="2" class="vd-r">Total</td><td class="vd-r">${e(formatTransferMoney(debit))}</td><td class="vd-r">${e(formatTransferMoney(credit))}</td></tr>`;

    const journalTitle =
        d.VoucherNo
            ? `Journal TRF · ${d.VoucherNo}${d.PostedDate ? ` · ${kit.date(d.PostedDate)}` : ''}${d.Status === 'Cancelled' ? ' · reversed' : ''}`
            : 'Journal on send (preview)';

    const watermark =
        d.Status === 'Cancelled' ? 'CANCELLED' : (d.Status === 'Draft' ? 'DRAFT' : '');

    return `<section class="pv-flow${wide ? ' pv-landscape' : ''}" data-watermark="${watermark}">
<div class="pv-run-head">
${transferHead(kit, `Product Transfer · ${info.title}`, d.TransferNo, d.TransferDate,
    [
        ['No', d.TransferNo],
        ['Type', info.title],
        ['Date', kit.date(d.TransferDate)],
        ['Kind', d.IsInterBranch ? 'Inter-branch' : 'Same branch'],
        ['Status', d.Status],
        ['Voucher', d.VoucherNo],
        ['Received', d.ReceiveDate ? kit.date(d.ReceiveDate) : '']
    ])}
</div>
<div class="pv-body">
${d.Status === 'Cancelled' ? `<div class="rp-cancel">CANCELLED ${e(kit.date(d.CancelledDate))}${d.CancelledByName ? ` · ${e(d.CancelledByName)}` : ''} · ${e(d.CancelReason)}</div>` : ''}
${d.Status === 'In Transit' ? `<div class="rp-transit">IN TRANSIT · waiting for ${e(d.ToBranchName || 'the To branch')} to receive</div>` : ''}
<div class="pt-route">
  <div><span>From</span><b>${e(d.FromWarehouseName)}</b><em>${e(d.FromBranchName)}</em></div>
  <div class="pt-arrow">→</div>
  <div><span>To</span><b>${e(d.ToWarehouseName)}</b><em>${e(d.ToBranchName)}</em></div>
</div>
<div class="pt-h">${e(info.title)} transferred</div>
${table(cols, body || `<tr><td colspan="${cols.length}" class="vd-c rp-soft">No lines</td></tr>`, body ? foot : '')}
${journal.length ? `<div class="pt-h">${e(journalTitle)}</div>${table(journalCols, journalBody, journalFoot)}` : ''}
<div class="pt-sum">
  <div><span>Lines</span><b>${d.LineCount || d.Lines.length}</b></div>
  <div><span>${info.bikes ? 'Bikes' : 'Quantity'}</span><b>${e(formatTransferQty(totalQuantity))}</b></div>
  <div class="pt-sum-value"><span>Value at cost</span><b>${e(formatTransferMoney(totalValue))}</b></div>
</div>
${d.Remarks ? `<div class="rp-note"><b>Narration :</b> ${e(d.Remarks)}</div>` : ''}
<div class="rp-note">${d.IsInterBranch
    ? 'Inter-branch : the From branch sends (stock in transit, one TRF journal at batch cost; the engine adds the Inter-Branch Current Account lines), the To branch receives it into the To warehouse.'
    : 'Same branch : the stock moved at once between the warehouses; no journal.'} Batches are taken oldest first (FIFO).</div>
</div>
<div class="pv-end">
<div class="rp-sign">
  <div>Prepared By<em>${e(d.CreatedByName || ' ')}</em></div>
  <div>Issued By<em>${e(d.PostedByName || ' ')}</em></div>
  <div>Received By<em>${e(d.ReceivedByName || ' ')}</em></div>
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
        ProductTransferPrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const d =
        data.doc;

    const info =
        productTransferType(d.PageType);

    const bold =
        (text: string): ExcelCell =>
            ({ v:text, s:'bold' });

    return {
        name:'Product Transfer',
        columns:[16, 40, 20, 18, 12, 10, 14, 14, 24, 30],
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [bold(`PRODUCT TRANSFER - ${d.TransferNo}`)],
            [bold('Type'), info.title, null, bold('Date'), kit.date(d.TransferDate)],
            [bold('From'), warehouseText(d.FromWarehouseName, d.FromBranchName), null, bold('To'), warehouseText(d.ToWarehouseName, d.ToBranchName)],
            [bold('Status'), d.Status, null, bold('Kind'), d.IsInterBranch ? 'Inter-branch' : 'Same branch'],
            [bold('Voucher'), d.VoucherNo, null, bold('Narration'), d.Remarks],
            [bold('Quantity'), d.TotalQuantity, null, bold('Value'), d.TotalValue],
            [],
            [bold('Code'), bold('Product'), bold('Batch'), bold(info.bikes ? 'Chassis' : 'Part No'), bold('Qty'), bold('Unit'), bold('Unit Cost'), bold('Value'), bold('Place'), bold('Notes')],
            ...d.Lines.flatMap
            (
                (line): ExcelCell[][] =>
                {
                    const place =
                        placeText(line.ToRackName, line.ToShelfNo, line.ToBinNo, line.ToBinCode);

                    if
                    (
                        info.bikes && line.Units.length
                    )
                    {
                        return line.Units.map
                        (
                            u =>
                            {
                                const batch =
                                    line.Batches.find(b => b.StockBatchId === u.StockBatchId);

                                return [line.ProductCode, line.ProductName, batch?.BatchNo ?? '', u.ChassisNo, 1, 'Bike', batch?.UnitCost ?? null, batch?.UnitCost ?? null, '', line.Notes];
                            }
                        );
                    }

                    if
                    (
                        line.Batches.length
                    )
                    {
                        return line.Batches.map
                        (
                            b =>
                                [line.ProductCode, line.ProductName, b.BatchNo, line.PartNumber, b.Quantity, line.Unit, b.UnitCost, b.Value, place, line.Notes]
                        );
                    }

                    return [[line.ProductCode, line.ProductName, '', line.PartNumber, line.Quantity, line.Unit, line.UnitCostAvg, line.Value, place, line.Notes]];
                }
            )
        ]
    };
}
