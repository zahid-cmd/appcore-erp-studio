//===============================================================
// Product Receiving : print source (Print Engine) — the Goods
// Received Note of one receiving.
//
//   /print-viewer/motor-bike-receiving/<receivingId>
//   /print-viewer/spare-parts-lubricants-receiving/<receivingId>
//   /print-viewer/accessories-receiving/<receivingId>
//
// Portrait : SL · Product (code · batch) · Purchased · Before ·
// Received · [Location (bin)] · Notes; motor bikes : the bikes
// (chassis / engine / key / battery) under their line. Signature
// line at the end.
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
    bikesNoWord
}
from '../../../../../core/motor-power/motor-power.service';

import
{
    VOUCHER_SWITCH
}
from '../../../../../shared/components/accounting/voucher-switches';

import
{
    Receiving,
    ReceivingPageConfig,
    formatReceivingQty,
    receivingConfig
}
from '../receiving.model';

import
{
    ReceivingService
}
from '../receiving.service';


export interface ReceivingPrintData
{
    page:ReceivingPageConfig;
    receiving:Receiving;
}


//===============================================================
// Styles
//===============================================================

const RECEIVING_PRINT_CSS = `
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
`;


//===============================================================
// Sources (one per page; the id is the receiving)
//===============================================================

function receivingSource
(
    type:
        string
):
    PrintSourceDef<ReceivingPrintData>
{
    const page =
        receivingConfig(type);

    return {
        key:page.printKey,

        title:page.title,

        canRotate:false,

        async load
        (
            injector:
                Injector,
            id:
                number | string
        ):
            Promise<ReceivingPrintData>
        {
            const receiving =
                await firstValueFrom(
                    injector.get(ReceivingService).getById(page.path, String(id))
                );

            return {
                page,
                receiving
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
                ReceivingPrintData
        ):
            string
        {
            return `Goods Received Note - ${data.receiving.ReceivingNo}`;
        },

        documents:
        [
            {
                key:'goods-received-note',

                title:'Goods Received Note',

                icon:'fas fa-truck-ramp-box',

                available:
                    () =>
                        true,

                render:
                    (data: ReceivingPrintData, kit: PrintKit) =>
                        noteHtml(data, kit),

                css:
                    RECEIVING_PRINT_CSS,

                excel:
                    (data: ReceivingPrintData, kit: PrintKit) =>
                        noteSheet(data, kit)
            }
        ]
    };
}

export const MOTOR_BIKE_RECEIVING_PRINT =
    receivingSource('MB');

export const SPARE_PARTS_LUBRICANTS_RECEIVING_PRINT =
    receivingSource('SP');

export const ACCESSORIES_RECEIVING_PRINT =
    receivingSource('AC');


//===============================================================
// Header : two identical cards split by a divider
//===============================================================

function receivingHead
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
// Goods Received Note
//===============================================================

function noteHtml
(
    data:
        ReceivingPrintData,
    kit:
        PrintKit
):
    string
{
    const r =
        data.receiving;

    const page =
        data.page;

    const e =
        kit.escape;

    const qty =
        (value: number) =>
            formatReceivingQty(value);

    const shelves =
        page.hasShelves;

    const cols:
        [string, string, string][] =
    [
        ['SL', '8mm', 'vd-c'],
        ['Product', '', ''],
        ['Purchased', '18mm', 'vd-r'],
        ['Before', '15mm', 'vd-r'],
        ['Received', '18mm', 'vd-r'],
        ...(shelves ? [['Location', '24mm', '']] as [string, string, string][] : []),
        ['Notes', '24%', '']
    ];

    const body =
        r.Lines
            .map
            (
                (line, index) =>
                {
                    const units =
                        r.Units.filter(x => x.PurchaseLineId === line.PurchaseLineId);

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

                    return `<tr>
  <td class="vd-c rp-sl">${index + 1}</td>
  <td><div class="rp-main">${e(line.ProductName)}</div><div class="rp-sub">${e(line.ProductCode)} · Batch ${e(line.BatchNo)}</div></td>
  <td class="vd-r">${e(qty(line.PurchasedQuantity))} <span class="rp-soft">${e(line.Unit)}</span></td>
  <td class="vd-r rp-soft">${e(qty(line.ReceivedBefore))}</td>
  <td class="vd-r rp-strong">${e(qty(line.Quantity))}</td>
  ${shelves ? `<td class="rp-soft">${e(rack)}</td>` : ''}
  <td class="rp-soft">${e(line.ShortNotes)}</td>
</tr>${bikes}`;
                }
            )
            .join('');

    return `<section class="pv-flow" data-watermark="${r.Status === 'Cancelled' ? 'CANCELLED' : ''}">
<div class="pv-run-head">
${receivingHead(kit, `${page.title} · Goods Received Note`, r.ReceivingNo, r.ReceivingDate, r.ReceivingDate,
    [
        ['Purchase', `${r.PurchaseNo} (${kit.date(r.PurchaseDate)})`],
        ['Supplier', r.SupplierName],
        ['Invoice', r.SupplierInvoiceNo],
        ['Mushak 6.3', r.MushakNo],
        ['DO', r.DoReference],
        ['Gate Pass', r.GatePassNo],
        ['Branch', r.BranchName],
        ['Warehouse', r.WarehouseName]
    ],
    'Date')}
</div>
<div class="pv-body">
${r.Status === 'Cancelled' ? `<div class="rp-cancel">CANCELLED ${e(kit.date(r.CancelledDate))} · ${e(r.CancelReason)}</div>` : ''}
<table class="pv-split vd-lines">
  <colgroup>${cols.map(x => x[1] ? `<col style="width:${x[1]}">` : '<col>').join('')}</colgroup>
  <thead><tr>${cols.map(x => `<th class="${x[2]}">${e(x[0])}</th>`).join('')}</tr></thead>
  <tbody>${body}</tbody>
  <tfoot>
    <tr class="rp-total"><td colspan="4" class="vd-r">Total received · ${r.Lines.length} line${r.Lines.length === 1 ? '' : 's'}</td><td class="vd-r">${e(qty(r.TotalQuantity))}</td>${shelves ? '<td></td>' : ''}<td></td></tr>
  </tfoot>
</table>
${r.Remarks ? `<div class="rp-note"><b>Remarks :</b> ${e(r.Remarks)}</div>` : ''}
<div class="rp-note">Received the goods above in good condition into ${e(r.WarehouseName)}${r.ReceivedBy ? `, by ${e(r.ReceivedBy)}` : ''}.</div>
</div>
<div class="pv-end">
<div class="rp-sign">
  <div>Received By<em>${e(r.ReceivedBy)}</em></div>
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
        ReceivingPrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const r =
        data.receiving;

    const bold =
        (text: string): ExcelCell =>
            ({ v:text, s:'bold' });

    return {
        name:'Goods Received Note',
        columns:[6, 22, 44, 30, 12, 12, 12, 18, 30],
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [bold(`GOODS RECEIVED NOTE - ${r.ReceivingNo}`)],
            [bold('Date'), kit.date(r.ReceivingDate), null, bold('Warehouse'), r.WarehouseName],
            [bold('Purchase'), r.PurchaseNo, null, bold('Supplier'), r.SupplierName],
            [],
            [bold('SL'), bold('Code'), bold('Product'), bold('Batch'), bold('Purchased'), bold('Before'), bold('Received'), bold('Location'), bold('Notes')],
            ...r.Lines.map
            (
                (line, index): ExcelCell[] =>
                [
                    index + 1,
                    line.ProductCode,
                    line.ProductName,
                    line.BatchNo,
                    line.PurchasedQuantity,
                    line.ReceivedBefore,
                    line.Quantity,
                    line.RackCode ? (line.BinCode || line.ShelfLabel || line.RackCode) : '',
                    line.ShortNotes
                ]
            ),
            [null, null, null, null, null, bold('Total'), r.TotalQuantity],
            ...(r.Units.length
                ? [
                    [] as ExcelCell[],
                    [bold('SL'), bold('Chassis No'), bold(`${bikesNoWord(r.Lines.map(x => x.ProductId))} No`), bold('Key No'), bold('Battery No')] as ExcelCell[],
                    ...r.Units.map((u, i): ExcelCell[] => [i + 1, u.ChassisNo, u.EngineNo, u.KeyNo, u.BatteryNo])
                ]
                : [])
        ]
    };
}
