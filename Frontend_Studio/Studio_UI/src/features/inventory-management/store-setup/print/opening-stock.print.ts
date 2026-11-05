//===============================================================
// Opening Stock : print source (Print Engine) — the Opening
// Stock note of one document.
//
//   /print-viewer/opening-stock/<openingStockId>
//
// Portrait : SL · Product (code · batch) · Quantity · Unit Cost ·
// Value · [VAT] · MRP (the sale price) · [Location (bin)]; motor bikes : the bikes
// (chassis / engine / key / battery) under their line. The
// journal (Dr Inventory / Cr the credit ledger) under the total.
// Signature line at the end.
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
    OPENING_STOCK_PRINT_KEY,
    OpeningStock,
    formatOpeningCost,
    formatOpeningMoney,
    formatOpeningQty,
    openingStockType
}
from '../models/opening-stock.model';

import
{
    OpeningStockService
}
from '../services/opening-stock.service';


export interface OpeningStockPrintData
{
    doc:OpeningStock;
}


//===============================================================
// Styles
//===============================================================

const OPENING_STOCK_PRINT_CSS = `
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
`;


//===============================================================
// Source (the id is the document)
//===============================================================

export const OPENING_STOCK_PRINT:
    PrintSourceDef<OpeningStockPrintData> =
{
    key:OPENING_STOCK_PRINT_KEY,

    title:'Opening Stock',

    canRotate:true,

    async load
    (
        injector:
            Injector,
        id:
            number | string
    ):
        Promise<OpeningStockPrintData>
    {
        const doc =
            await firstValueFrom(
                injector.get(OpeningStockService).getById(String(id))
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
            OpeningStockPrintData
    ):
        string
    {
        return `Opening Stock - ${data.doc.OpeningNo}`;
    },

    documents:
    [
        {
            key:'opening-stock-note',
            title:'Opening Stock Note',
            icon:'fas fa-boxes-stacked',
            available:
                () =>
                    true,
            render:
                (data: OpeningStockPrintData, kit: PrintKit) =>
                    noteHtml(data, kit),
            css:
                OPENING_STOCK_PRINT_CSS,
            excel:
                (data: OpeningStockPrintData, kit: PrintKit) =>
                    noteSheet(data, kit)
        }
    ]
};


//===============================================================
// Header : two identical cards split by a divider
//===============================================================

function openingHead
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
// Opening Stock note
//===============================================================

function noteHtml
(
    data:
        OpeningStockPrintData,
    kit:
        PrintKit
):
    string
{
    const d =
        data.doc;

    const info =
        openingStockType(d.PageType);

    const e =
        kit.escape;

    const shelves =
        info.hasShelves;

    // Portrait / Landscape switch of the viewer
    const wide =
        !!kit.landscape;

    // Unclaimed VAT carried in (VAT column, journal line)
    const vat =
        d.TotalVat > 0;

    const cols:
        [string, string, string][] =
    [
        ['SL', '8mm', 'vd-c'],
        ['Product', '', ''],
        ['Quantity', '19mm', 'vd-r'],
        ['Unit Cost', '22mm', 'vd-r'],
        ['Value', '25mm', 'vd-r'],
        ...(vat ? [['VAT', '20mm', 'vd-r']] as [string, string, string][] : []),
        ['MRP', '22mm', 'vd-r'],
        ...(shelves ? [['Location', '22mm', '']] as [string, string, string][] : []),
        // Landscape : the notes get their own column
        ...(wide ? [['Notes', '22%', '']] as [string, string, string][] : [])
    ];

    const body =
        d.Lines
            .map
            (
                (line, index) =>
                {
                    const units =
                        d.Units.filter(x => x.ProductId === line.ProductId);

                    const bikes =
                        units.length
                            ? `<tr class="rp-bikes"><td></td><td colspan="${cols.length - 1}">${
                                units
                                    .map
                                    (
                                        (u, i) =>
                                            `<span><i>${i + 1}</i>${e(u.ChassisNo)} / ${e(u.EngineNo)}${u.KeyNo || u.BatteryNo ? ` · K ${e(u.KeyNo || '—')} · B ${e(u.BatteryNo || '—')}` : ''}</span>`
                                    )
                                    .join('')
                            }</td></tr>`
                            : '';

                    // The bin code A-03-05 (the server's label)
                    const rack =
                        line.RackCode
                            ? (line.BinCode || line.ShelfLabel || line.RackCode)
                            : '—';

                    const sub =
                        [line.ProductCode, line.BatchNo ? `Batch ${line.BatchNo}` : '', line.MarginPercent ? `Margin ${line.MarginPercent}% on MRP` : '', wide ? '' : line.ShortNotes]
                            .filter(x => !!x)
                            .join(' · ');

                    return `<tr>
  <td class="vd-c rp-sl">${index + 1}</td>
  <td><div class="rp-main">${e(line.ProductName)}</div><div class="rp-sub">${e(sub)}</div></td>
  <td class="vd-r rp-strong">${e(formatOpeningQty(line.Quantity))} <span class="rp-soft">${e(line.Unit)}</span></td>
  <td class="vd-r rp-soft">${e(formatOpeningCost(line.UnitCost))}</td>
  <td class="vd-r rp-strong">${e(formatOpeningMoney(line.LineValue))}</td>
  ${vat ? `<td class="vd-r rp-soft">${line.VatAmount ? e(formatOpeningMoney(line.VatAmount)) : '—'}</td>` : ''}
  <td class="vd-r rp-soft">${line.Mrp ? e(formatOpeningMoney(line.Mrp)) : '—'}</td>
  ${shelves ? `<td class="rp-soft">${e(rack)}</td>` : ''}
  ${wide ? `<td class="rp-soft">${e(line.ShortNotes)}</td>` : ''}
</tr>${bikes}`;
                }
            )
            .join('');

    const journal =
        d.Status === 'Draft'
            ? ''
            : `<div class="op-journal">
  <i>Dr</i><b>Inventory · ${e(info.title)}</b><span>${e(formatOpeningMoney(d.TotalValue))}</span><span></span>
  ${vat ? `<i>Dr</i><b>VAT Current Account · ${e(info.title)} (unclaimed input VAT)</b><span>${e(formatOpeningMoney(d.TotalVat))}</span><span></span>` : ''}
  <i>Cr</i><b class="op-cr">${e(d.LedgerName)} · ${e(d.LedgerCode)}</b><span></span><span>${e(formatOpeningMoney(d.TotalValue + d.TotalVat))}</span>
</div>`;

    return `<section class="pv-flow${wide ? ' pv-landscape' : ''}" data-watermark="${d.Status === 'Cancelled' ? 'CANCELLED' : d.Status === 'Draft' ? 'DRAFT' : ''}">
<div class="pv-run-head">
${openingHead(kit, `Opening Stock · ${info.title}`, d.OpeningNo, d.OpeningDate, d.OpeningDate,
    [
        ['Branch', d.BranchCode ? `${d.BranchName} (${d.BranchCode})` : d.BranchName],
        ['Warehouse', d.WarehouseName],
        ['Cost', d.CostBasis === 'MRP' ? 'MRP less margin, excl. VAT' : 'Unit cost, excl. VAT'],
        ['Credit Ledger', d.LedgerName],
        ['Journal', d.JournalNo],
        ['Status', d.Status]
    ],
    'Date')}
</div>
<div class="pv-body">
${d.Status === 'Cancelled' ? `<div class="rp-cancel">CANCELLED ${e(kit.date(d.CancelledDate))} · ${e(d.CancelReason)}</div>` : ''}
<table class="pv-split vd-lines">
  <colgroup>${cols.map(x => x[1] ? `<col style="width:${x[1]}">` : '<col>').join('')}</colgroup>
  <thead><tr>${cols.map(x => `<th class="${x[2]}">${e(x[0])}</th>`).join('')}</tr></thead>
  <tbody>${body}</tbody>
  <tfoot>
    <tr class="rp-total"><td colspan="2" class="vd-r">Total · ${d.Lines.length} line${d.Lines.length === 1 ? '' : 's'}</td><td class="vd-r">${e(formatOpeningQty(d.TotalQuantity))}</td><td></td><td class="vd-r">${e(formatOpeningMoney(d.TotalValue))}</td>${vat ? `<td class="vd-r">${e(formatOpeningMoney(d.TotalVat))}</td>` : ''}<td></td>${shelves ? '<td></td>' : ''}${wide ? '<td></td>' : ''}</tr>
  </tfoot>
</table>
${journal}
${d.Remarks ? `<div class="rp-note"><b>Remarks :</b> ${e(d.Remarks)}</div>` : ''}
<div class="rp-note">Stock counted and found in ${e(d.WarehouseName)} on ${e(kit.date(d.OpeningDate))}, taken in at the cost above (excluding VAT). MRP includes VAT and is the sale price.</div>
</div>
<div class="pv-end">
<div class="rp-sign">
  <div>Counted By<em>&nbsp;</em></div>
  <div>Store Keeper<em>&nbsp;</em></div>
  <div>Checked By<em>&nbsp;</em></div>
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
        OpeningStockPrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const d =
        data.doc;

    const info =
        openingStockType(d.PageType);

    const bold =
        (text: string): ExcelCell =>
            ({ v:text, s:'bold' });

    return {
        name:'Opening Stock',
        columns:[6, 22, 44, 24, 12, 14, 16, 14, 14, 14, 18, 30],
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [bold(`OPENING STOCK - ${d.OpeningNo}`)],
            [bold('Date'), kit.date(d.OpeningDate), null, bold('Type'), info.title],
            [bold('Warehouse'), d.WarehouseName, null, bold('Credit Ledger'), `${d.LedgerName} (${d.LedgerCode})`],
            [bold('Status'), d.Status, null, bold('Cost Basis'), d.CostBasis === 'MRP' ? 'MRP less margin (excl. VAT)' : 'Unit cost (excl. VAT)'],
            [],
            [bold('SL'), bold('Code'), bold('Product'), bold('Batch'), bold('Quantity'), bold('Unit Cost'), bold('Value'), bold('VAT'), bold('MRP'), bold('Location'), bold('Notes')],
            ...d.Lines.map
            (
                (line, index): ExcelCell[] =>
                [
                    index + 1,
                    line.ProductCode,
                    line.ProductName,
                    line.BatchNo,
                    line.Quantity,
                    line.UnitCost,
                    line.LineValue,
                    line.VatAmount,
                    line.Mrp,
                    line.RackCode ? (line.BinCode || line.ShelfLabel || line.RackCode) : '',
                    line.ShortNotes
                ]
            ),
            [null, null, null, bold('Total'), d.TotalQuantity, null, d.TotalValue, d.TotalVat],
            ...(d.Units.length
                ? [
                    [] as ExcelCell[],
                    [bold('SL'), bold('Product'), bold('Chassis No'), bold('Engine No'), bold('Key No'), bold('Battery No')] as ExcelCell[],
                    ...d.Units.map
                    (
                        (u, i): ExcelCell[] =>
                        [
                            i + 1,
                            d.Lines.find(x => x.ProductId === u.ProductId)?.ProductCode ?? '',
                            u.ChassisNo,
                            u.EngineNo,
                            u.KeyNo,
                            u.BatteryNo
                        ]
                    )
                ]
                : [])
        ]
    };
}
