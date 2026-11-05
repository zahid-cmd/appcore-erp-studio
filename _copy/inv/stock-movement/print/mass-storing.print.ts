//===============================================================
// Mass Storing : print source (Print Engine) — the storing note
// of one document.
//
//   /print-viewer/mass-storing/<massStoringId>
//
// Header (company, MST no, date, warehouse, status) · lines (SL ·
// Code · Product · Stock · From · To · Notes) · totals (lines,
// placed, cleared) · signatures (Prepared by / Stored by /
// Checked by).
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
    MASS_STORING_PRINT_KEY,
    MassStoringDetail,
    MassStoringLine,
    formatStoringQty,
    massStoringType,
    storingLocationText,
    storingWarehouseText
}
from '../models/mass-storing.model';

import
{
    MassStoringService
}
from '../services/mass-storing.service';


export interface MassStoringPrintData
{
    doc:MassStoringDetail;
}


//===============================================================
// Styles
//===============================================================

// The shared header (also used by the Rack Overview shelf map)
export const STORING_HEAD_CSS = `
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
`;

const MASS_STORING_PRINT_CSS = `
/* Compact paper margins */
.pv-page-inner { padding: 7mm 10mm 6mm; }

${STORING_HEAD_CSS}
/* Section titles */
.ms-h { margin-top: 3.4mm; font-size: 7pt; font-weight: 800; letter-spacing: 0.9pt; text-transform: uppercase; color: #1e3a8a; }

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
.rp-mono { font-family: 'JetBrains Mono', Consolas, monospace; font-size: 7pt; }
.rp-muted { color: #94a3b8; font-style: italic; }
.rp-place { color: #047857; font-weight: 700; }
.rp-clear { color: #b42318; font-weight: 700; }
.vd-lines tbody tr:last-child td { border-bottom: 0; }
.rp-note { margin-top: 2.5mm; font-size: 7.2pt; color: #334155; }
.rp-cancel { margin: 2mm 0 0; padding: 1.6mm 2.4mm; border: 1px solid #fca5a5; border-radius: 1.6mm; background: #fef2f2; color: #b42318; font-size: 7.6pt; font-weight: 700; }

/* Totals boxes */
.ms-sum { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3mm; margin-top: 3mm; }
.ms-sum div { padding: 1.6mm 2.4mm; border: 1px solid #cdd9ee; border-left: 1mm solid #94a3b8; border-radius: 1.6mm; background: #f8fafd; }
.ms-sum span { display: block; font-size: 6pt; font-weight: 700; letter-spacing: 0.6pt; text-transform: uppercase; color: #64748b; }
.ms-sum b { font-size: 10pt; font-weight: 800; color: #0b2a5b; font-variant-numeric: tabular-nums; }
.ms-sum .ms-sum-placed { border-left-color: #10b981; }
.ms-sum .ms-sum-cleared { border-left-color: #ef4444; }

.rp-sign { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0 10mm; margin-top: 16mm; }
.rp-sign div { padding-top: 1.4mm; border-top: 1px solid #0f172a; text-align: center; font-size: 7pt; font-weight: 700; color: #334155; }
.rp-sign em { display: block; font-style: normal; font-weight: 500; color: #64748b; font-size: 6.4pt; }
`;


//===============================================================
// Source (the id is the document)
//===============================================================

export const MASS_STORING_PRINT:
    PrintSourceDef<MassStoringPrintData> =
{
    key:MASS_STORING_PRINT_KEY,

    title:'Mass Storing',

    canRotate:true,

    async load
    (
        injector:
            Injector,
        id:
            number
    ):
        Promise<MassStoringPrintData>
    {
        const doc =
            await firstValueFrom(
                injector.get(MassStoringService).getById(id)
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
            MassStoringPrintData
    ):
        string
    {
        return `Mass Storing - ${data.doc.StoringNo}`;
    },

    documents:
    [
        {
            key:'mass-storing-note',
            title:'Mass Storing Note',
            icon:'fas fa-boxes-stacked',
            available:
                () =>
                    true,
            render:
                (data: MassStoringPrintData, kit: PrintKit) =>
                    noteHtml(data, kit),
            css:
                MASS_STORING_PRINT_CSS,
            excel:
                (data: MassStoringPrintData, kit: PrintKit) =>
                    noteSheet(data, kit)
        }
    ]
};


//===============================================================
// Header : two identical cards split by a divider
//===============================================================

export function storingHead
(
    kit:
        PrintKit,
    kicker:
        string,
    title:
        string,
    // already formatted (kit.date)
    dateText:
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
                [company?.CompanyName || 'AppCore ERP', kicker, title, dateText]
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
      ${dateText ? `<span class="sh-asof">Date <b>${e(dateText)}</b></span>` : ''}
    </div>
    ${qr ? `<div class="sh-qr">${qr}</div>` : ''}
  </div>
</div>
<div class="sh-meta">${meta.filter(x => !!x[1]).map(([label, value]) => `<span><i>${e(label)}</i>${e(value)}</span>`).join('')}</div>`;
}


//===============================================================
// Helpers
//===============================================================

function fromText
(
    line:
        MassStoringLine
):
    string
{
    return storingLocationText(line.FromRackName, line.FromShelfNo, line.FromBinNo, line.FromBinCode);
}

function toText
(
    line:
        MassStoringLine
):
    string
{
    return line.IsClear
        ? ''
        : storingLocationText(line.ToRackName, line.ToShelfNo, line.ToBinNo, line.ToBinCode);
}


//===============================================================
// Storing note
//===============================================================

function noteHtml
(
    data:
        MassStoringPrintData,
    kit:
        PrintKit
):
    string
{
    const d =
        data.doc;

    const info =
        massStoringType(d.PageType);

    const e =
        kit.escape;

    // Portrait / Landscape switch of the viewer
    const wide =
        !!kit.landscape;

    const cols:
        [string, string, string][] =
    [
        ['SL', '8mm', 'vd-c'],
        ['Code', wide ? '26mm' : '22mm', ''],
        [info.item, '', ''],
        ['Stock', '14mm', 'vd-r'],
        ['From', wide ? '42mm' : '32mm', ''],
        ['To', wide ? '42mm' : '32mm', ''],
        ['Notes', wide ? '44mm' : '26mm', '']
    ];

    const body =
        d.Lines
            .map
            (
                (line, index) =>
                {
                    const from =
                        fromText(line);

                    const to =
                        toText(line);

                    return `<tr>
  <td class="vd-c rp-sl">${index + 1}</td>
  <td class="rp-mono">${e(line.ProductCode)}</td>
  <td><div class="rp-main">${e(line.ProductName)}</div>${line.PartNumber ? `<div class="rp-sub">${e(line.PartNumber)}</div>` : ''}</td>
  <td class="vd-r">${e(formatStoringQty(line.StockQuantity))}</td>
  <td>${from ? e(from) : '<span class="rp-muted">Unplaced</span>'}</td>
  <td>${line.IsClear ? '<span class="rp-clear">Unplaced</span>' : `<span class="rp-place">${e(to)}</span>`}</td>
  <td class="rp-soft">${e(line.Notes)}</td>
</tr>`;
                }
            )
            .join('');

    const table =
        `<table class="pv-split vd-lines">
  <colgroup>${cols.map(x => x[1] ? `<col style="width:${x[1]}">` : '<col>').join('')}</colgroup>
  <thead><tr>${cols.map(x => `<th class="${x[2]}">${e(x[0])}</th>`).join('')}</tr></thead>
  <tbody>${body || `<tr><td colspan="${cols.length}" class="vd-c rp-soft">No lines</td></tr>`}</tbody>
</table>`;

    const watermark =
        d.Status === 'Cancelled' ? 'CANCELLED' : (d.Status === 'Draft' ? 'DRAFT' : '');

    return `<section class="pv-flow${wide ? ' pv-landscape' : ''}" data-watermark="${watermark}">
<div class="pv-run-head">
${storingHead(kit, `Mass Storing · ${info.title}`, d.StoringNo, kit.date(d.StoringDate),
    [
        ['No', d.StoringNo],
        ['Type', info.title],
        ['Date', kit.date(d.StoringDate)],
        ['Warehouse', storingWarehouseText(d.WarehouseName, d.BranchName)],
        ['Status', d.Status],
        ['Posted', d.PostedDate ? kit.date(d.PostedDate) : '']
    ])}
</div>
<div class="pv-body">
${d.Status === 'Cancelled' ? `<div class="rp-cancel">CANCELLED ${e(kit.date(d.CancelledDate))}${d.CancelledByName ? ` · ${e(d.CancelledByName)}` : ''} · ${e(d.CancelReason)}</div>` : ''}
<div class="ms-h">${e(info.title)} : rack and shelf placement</div>
${table}
<div class="ms-sum">
  <div><span>Lines</span><b>${d.LineCount || d.Lines.length}</b></div>
  <div class="ms-sum-placed"><span>Placed</span><b>${d.PlacedCount}</b></div>
  <div class="ms-sum-cleared"><span>Cleared</span><b>${d.ClearedCount}</b></div>
</div>
${d.Remarks ? `<div class="rp-note"><b>Narration :</b> ${e(d.Remarks)}</div>` : ''}
<div class="rp-note">Location only : no quantity changed and no journal. One item per bin (free, or vacated in this document).</div>
</div>
<div class="pv-end">
<div class="rp-sign">
  <div>Prepared By<em>${e(d.CreatedByName || ' ')}</em></div>
  <div>Stored By<em>${e(d.PostedByName || ' ')}</em></div>
  <div>Checked By<em>&nbsp;</em></div>
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
        MassStoringPrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const d =
        data.doc;

    const info =
        massStoringType(d.PageType);

    const bold =
        (text: string): ExcelCell =>
            ({ v:text, s:'bold' });

    return {
        name:'Mass Storing',
        columns:[8, 16, 40, 18, 10, 26, 26, 30],
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [bold(`MASS STORING - ${d.StoringNo}`)],
            [bold('Type'), info.title, null, bold('Date'), kit.date(d.StoringDate)],
            [bold('Warehouse'), storingWarehouseText(d.WarehouseName, d.BranchName), null, bold('Status'), d.Status],
            [bold('Lines'), d.LineCount || d.Lines.length, null, bold('Placed'), d.PlacedCount, bold('Cleared'), d.ClearedCount],
            [bold('Narration'), d.Remarks],
            [],
            [bold('SL'), bold('Code'), bold('Product'), bold('Part No'), bold('Stock'), bold('From'), bold('To'), bold('Notes')],
            ...d.Lines.map
            (
                (line, index): ExcelCell[] =>
                    [index + 1, line.ProductCode, line.ProductName, line.PartNumber, line.StockQuantity, fromText(line) || 'Unplaced', line.IsClear ? 'Unplaced' : toText(line), line.Notes]
            )
        ]
    };
}
