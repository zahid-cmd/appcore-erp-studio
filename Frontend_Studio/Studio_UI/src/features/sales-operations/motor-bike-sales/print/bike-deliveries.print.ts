//===============================================================
// Bike Deliveries : print source (Print Engine, 2026-11-10)
//
//   /print-viewer/bike-deliveries/<delivery PublicId>?doc=pdi-sheet
//   /print-viewer/bike-deliveries/<delivery PublicId>?doc=delivery-challan
//
// Two documents :
//   pdi-sheet         the Pre-Delivery Inspection sheet as filled
//                     (Bangla first, English small; the model
//                     picture; Technician / QC In-charge - Sales
//                     Officer / Warehouse In-charge - Sales
//                     Manager signatures; one copy goes with the
//                     bike, one is kept)
//   delivery-challan  Delivery Challan / Gate Pass : the bike, the
//                     accessories that go with it (Additional /
//                     Promotional, when the bike is covered), the
//                     warranty, the receiver
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
    PrintKit,
    PrintSourceDef
}
from '../../../../shared/print/print.models';

import
{
    VOUCHER_DOCUMENT_CSS
}
from '../../../../shared/print/templates/voucher/voucher.styles';

import
{
    BikeDelivery,
    BikeDeliveryAccessory,
    bikeNoWord
}
from '../models/bike-deliveries.model';

import
{
    BikeDeliveriesService
}
from '../services/bike-deliveries.service';


export interface BikeDeliveryPrintData
{
    delivery:
        BikeDelivery;
}


//===============================================================
// Helpers
//===============================================================

// Chassis / motor : the last 4 written large (as on the sheet)
function bigTail(value: string, kit: PrintKit): string
{
    const v = String(value ?? '');
    const cut = Math.max(0, v.length - 4);
    return `${kit.escape(v.slice(0, cut))}<b class="bdp-tail">${kit.escape(v.slice(cut))}</b>`;
}

function bn(primaryBn: string, english: string, kit: PrintKit): string
{
    return primaryBn
        ? `<span class="bdp-bn">${kit.escape(primaryBn)}</span><span class="bdp-en">${kit.escape(english)}</span>`
        : `<span class="bdp-en-main">${kit.escape(english)}</span>`;
}

function mark(answer: string, unit: string, type: string, kit: PrintKit): string
{
    if (type === 'Check')
    {
        const cls =
            answer === 'OK' ? 'ok' : answer === 'Not OK' ? 'bad' : 'na';

        const sign =
            answer === 'OK' ? '&#10003;' : answer === 'Not OK' ? '&#10007;' : answer === 'N/A' ? 'N/A' : '';

        return `<span class="bdp-mark bdp-mark-${cls}">${sign}</span>`;
    }

    return `<span class="bdp-reading">${kit.escape(answer || '-')}${answer && unit ? ' ' + kit.escape(unit) : ''}</span>`;
}

function head(d: BikeDelivery, kit: PrintKit, title: string, copy: string): string
{
    return kit.voucherHead(
    {
        copy,
        title,
        numberLabel:'Challan No',
        number:d.DeliveryNo,
        meta:
        [
            { label:'Delivery Date', value:kit.date(d.DeliveryDate) },
            { label:'Invoice No', value:d.Bike.SalesInvoiceNo },
            { label:'Sale Date', value:kit.date(d.Bike.InvoiceDate) },
            { label:'Model', value:[d.Bike.ModelName || d.Bike.ProductName, d.Bike.ColorName].filter(x => !!x).join(' · ') }
        ],
        status:d.Status === 'Undone' ? 'Cancelled' : '',
        qr:[kit.company?.CompanyName || 'AppCore ERP', title, d.DeliveryNo, d.Bike.ChassisNo, d.Bike.CustomerName].filter(x => !!x).join(' | ')
    });
}


//===============================================================
// PDI sheet
//===============================================================

function pdiSheetHtml(data: BikeDeliveryPrintData, kit: PrintKit): string
{
    const d =
        data.delivery;

    const e =
        (v: any) => kit.escape(v);

    const word =
        bikeNoWord(d.Bike.IsElectric);

    const sections =
        new Map<number, typeof d.Answers>();

    for (const a of d.Answers)
    {
        sections.set(a.SectionOrder, [...(sections.get(a.SectionOrder) ?? []), a]);
    }

    const blocks =
        [...sections.entries()]
            .sort((x, y) => x[0] - y[0])
            .map(([, items]) =>
            {
                const first = items[0];

                if (first.HasComments)
                {
                    const rows =
                        items.map((a, i) => `<tr>
  <td class="bdp-c">${i + 1}</td>
  <td>${bn(a.ItemTextBn, a.ItemText, kit)}${a.Remark ? `<div class="bdp-remark">${e(a.Remark)}</div>` : ''}</td>
  <td class="bdp-c">${mark(a.Answer, a.Unit, a.ItemType, kit)}</td>
  <td>${e(a.TechnicianComment)}</td>
  <td>${e(a.QcComment)}</td>
</tr>`).join('');

                    return `<table class="bdp-table bdp-comments">
  <colgroup><col style="width:7mm"><col><col style="width:14mm"><col style="width:32mm"><col style="width:32mm"></colgroup>
  <thead><tr><th colspan="2">${bn(first.SectionTitleBn, first.SectionTitle, kit)}</th><th class="bdp-c">Result</th><th>Technician's comment</th><th>QC In-charge's comment</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
                }

                // Two columns of check points (as the sheet)
                const half =
                    Math.ceil(items.length / 2);

                const cell =
                    (a: typeof first | undefined, n: number) =>
                        a
                            ? `<td class="bdp-c">${n}</td><td>${bn(a.ItemTextBn, a.ItemText, kit)}${a.Remark ? `<div class="bdp-remark">${e(a.Remark)}</div>` : ''}</td><td class="bdp-c">${mark(a.Answer, a.Unit, a.ItemType, kit)}</td>`
                            : '<td></td><td></td><td></td>';

                const rows =
                    Array.from({ length:half }, (_, i) =>
                        `<tr>${cell(items[i], i + 1)}${cell(items[i + half], i + half + 1)}</tr>`).join('');

                return `<table class="bdp-table">
  <colgroup><col style="width:7mm"><col><col style="width:13mm"><col style="width:7mm"><col><col style="width:13mm"></colgroup>
  <thead><tr><th colspan="6" class="bdp-sec">${bn(first.SectionTitleBn, first.SectionTitle, kit)}</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
            })
            .join('');

    const titleBn =
        d.SheetTitleBn ? `<div class="bdp-title-bn bdp-bn">${e(d.SheetTitleBn)}</div>` : '';

    return `<section class="pv-flow" data-watermark="${d.Status === 'Undone' ? 'UNDONE' : ''}">
<div class="pv-run-head">
<div class="bdp-head bdp-pdi-head${d.Status === 'Undone' ? ' bdp-head-stamp' : ''}">${head(d, kit, d.SheetTitle || 'QC - Pre Delivery Inspection (PDI)', '')}</div>
${titleBn}
</div>
<div class="pv-body">
<div class="bdp-top">
  <div class="bdp-info">
    <div><span>Customer / Dealer</span><b>${e(d.Bike.CustomerName)}</b><i>${e(d.Bike.CustomerPhone)}</i></div>
    <div><span>Address</span><b>${e(d.Bike.CustomerAddress || '-')}</b></div>
    <div><span>Chassis No</span><b class="bdp-no">${bigTail(d.Bike.ChassisNo, kit)}</b></div>
    <div><span>${e(word)}</span><b class="bdp-no">${bigTail(d.Bike.EngineNo, kit)}</b></div>
    <div><span>Technician</span><b>${e(d.TechnicianName || '-')}</b><i>PDI ${e(kit.date(d.PdiDate))}</i></div>
    <div><span>PDI Template</span><b>${e(d.PdiTemplateCode)}</b><i>${e(d.PdiTemplateName)}</i></div>
  </div>
  ${d.Bike.ImageUrl ? `<div class="bdp-pic"><img src="${e(d.Bike.ImageUrl)}" alt=""></div>` : ''}
</div>
${blocks}
<div class="bdp-boxes">
  <div class="bdp-box"><span>Problems found at delivery <i class="bdp-bn">(বাইক ডেলিভারি করার সময় কোন সমস্যা)</i></span><p>${e(d.ProblemsFound || '-')}</p></div>
  <div class="bdp-box"><span>Remarks <i class="bdp-bn">(মন্তব্য)</i></span><p>${e(d.PdiRemarks || '-')}</p></div>
</div>
<div class="vd-after">
${kit.signatures(['Technician', 'QC In-charge / Sales Officer', 'Warehouse In-charge / Sales Manager'])}
</div>
</div>
<div class="pv-end">
<div class="bdp-foot">${d.FooterNoteBn ? `<span class="bdp-bn">${e(d.FooterNoteBn)}</span>` : ''}<span>${e(d.FooterNote)}</span></div>
<div class="pv-printed">${e(d.Bike.BranchName ? d.Bike.BranchName + ' · ' : '')}Printed ${e(kit.now())}</div>
</div>
</section>`;
}


//===============================================================
// Delivery Challan / Gate Pass
//===============================================================

function accessoryRows(items: BikeDeliveryAccessory[], kit: PrintKit): string
{
    return items
        .map((a, i) => `<tr><td class="bdp-c">${i + 1}</td><td>${kit.escape(a.AccessoryName)}<span class="bdp-en"> ${kit.escape(a.ProductCode)}</span></td><td>${kit.escape(a.SchemeName)}</td><td class="bdp-r">${a.Quantity} ${kit.escape(a.Unit)}</td><td class="bdp-c"><span class="bdp-box-tick"></span></td></tr>`)
        .join('');
}

function challanHtml(data: BikeDeliveryPrintData, kit: PrintKit): string
{
    const d =
        data.delivery;

    const e =
        (v: any) => kit.escape(v);

    const word =
        bikeNoWord(d.Bike.IsElectric);

    const additional =
        d.Accessories.filter(a => a.SchemeKind !== 'Promotional');

    const promotional =
        d.Accessories.filter(a => a.SchemeKind === 'Promotional');

    const accessories =
        d.Accessories.length === 0
            ? ''
            : `<div class="bdp-sub">Accessories with the bike</div>
${additional.length ? `<table class="bdp-table">
  <colgroup><col style="width:8mm"><col><col style="width:48mm"><col style="width:22mm"><col style="width:14mm"></colgroup>
  <thead><tr><th colspan="2">Additional accessories</th><th>Scheme</th><th class="bdp-r">Qty</th><th class="bdp-c">Given</th></tr></thead>
  <tbody>${accessoryRows(additional, kit)}</tbody>
</table>` : ''}
${promotional.length ? `<table class="bdp-table">
  <colgroup><col style="width:8mm"><col><col style="width:48mm"><col style="width:22mm"><col style="width:14mm"></colgroup>
  <thead><tr><th colspan="2">Promotional accessories</th><th>Scheme</th><th class="bdp-r">Qty</th><th class="bdp-c">Given</th></tr></thead>
  <tbody>${accessoryRows(promotional, kit)}</tbody>
</table>` : ''}`;

    const w =
        d.Warranty;

    const warranty =
        w
            ? `<div class="bdp-sub">Warranty</div>
<div class="bdp-info bdp-info-3">
  <div><span>Record</span><b>${e(w.Code)}</b><i>${e(w.Status)}</i></div>
  <div><span>Policy</span><b>${e(w.PolicyName)}</b><i>${e(w.PolicyCode)}</i></div>
  <div><span>Valid</span><b>${e(kit.date(w.StartDate))} to ${e(kit.date(w.ExpiryDate))}</b><i>${w.KmLimit ? e(w.KmLimit.toLocaleString('en-US')) + ' km (whichever first)' : 'No km limit'}</i></div>
</div>
${w.Parts.length ? `<table class="bdp-table"><thead><tr><th>Part warranty</th><th>Until</th><th>Km</th><th>Notes</th></tr></thead><tbody>${w.Parts.map(p => `<tr><td>${e(p.PartName)}</td><td>${e(kit.date(p.ExpiryDate))}</td><td>${p.KmLimit ? e(p.KmLimit.toLocaleString('en-US')) : '-'}</td><td>${e(p.Notes)}</td></tr>`).join('')}</tbody></table>` : ''}`
            : '';

    return `<section class="pv-flow" data-watermark="${d.Status === 'Undone' ? 'UNDONE' : ''}">
<div class="pv-run-head">
<div class="bdp-head${d.Status === 'Undone' ? ' bdp-head-stamp' : ''}">${head(d, kit, 'DELIVERY CHALLAN / GATE PASS', '')}</div>
</div>
<div class="pv-body">
<div class="bdp-info bdp-info-3">
  <div><span>Customer</span><b>${e(d.Bike.CustomerName)}</b><i>${e(d.Bike.CustomerCode)} · ${e(d.Bike.CustomerPhone)}</i></div>
  <div><span>Address</span><b>${e(d.Bike.CustomerAddress || '-')}</b></div>
  <div><span>Received by</span><b>${e(d.ReceiverName)}</b><i>${e(d.ReceivedBy)}${d.ReceiverPhone ? ' · ' + e(d.ReceiverPhone) : ''}</i></div>
</div>
<table class="bdp-table bdp-bike">
  <colgroup><col style="width:8mm"><col><col style="width:40mm"><col style="width:40mm"><col style="width:14mm"><col style="width:12mm"></colgroup>
  <thead><tr><th class="bdp-c">SL</th><th>Motor Bike</th><th>Chassis No</th><th>${e(word)}</th><th class="bdp-c">Year</th><th class="bdp-c">Qty</th></tr></thead>
  <tbody><tr>
    <td class="bdp-c">1</td>
    <td><b>${e(d.Bike.ModelName || d.Bike.ProductName)}</b><span class="bdp-en"> ${e(d.Bike.BrandName)}${d.Bike.ColorName ? ' · ' + e(d.Bike.ColorName) : ''}</span><div class="bdp-en">${e(d.Bike.ProductCode)}</div></td>
    <td class="bdp-no">${bigTail(d.Bike.ChassisNo, kit)}</td>
    <td class="bdp-no">${bigTail(d.Bike.EngineNo, kit)}</td>
    <td class="bdp-c">${e(d.Bike.ManufactureYear ?? '-')}</td>
    <td class="bdp-c">1</td>
  </tr></tbody>
</table>
${accessories}
${warranty}
<div class="bdp-boxes">
  <div class="bdp-box"><span>Remarks</span><p>${e(d.Remarks || '-')}</p></div>
  <div class="bdp-box"><span>PDI</span><p>${d.PdiTemplateCode ? `${e(d.PdiTemplateCode)} by ${e(d.TechnicianName)} on ${e(kit.date(d.PdiDate))}` : 'Delivered without the PDI sheet'}</p></div>
</div>
<div class="bdp-note">Received the above motor bike${d.Accessories.length ? ', its accessories' : ''} and documents in good condition.</div>
<div class="vd-after">
${kit.signatures(['Customer / Receiver', 'Delivered by (Sales Officer)', 'Warehouse In-charge / Sales Manager', 'Security (Gate)'])}
</div>
</div>
<div class="pv-end">
<div class="pv-printed">${e(d.Bike.BranchName ? d.Bike.BranchName + ' · ' : '')}Printed ${e(kit.now())}</div>
</div>
</section>`;
}


//===============================================================
// Styles (bdp-)
//===============================================================

// Shared with the blank PDI sheet (PDI Templates print)
export function BIKE_DELIVERY_CSS(): string
{
    return VOUCHER_DOCUMENT_CSS() + `
/* Header strip : Delivery Date | Invoice No | Sale Date | Model;
   the dates narrow, the invoice no wide (the engine sets equal
   columns inline, hence !important) */
.bdp-head .pv-vh-meta { grid-template-columns: minmax(0, 0.72fr) minmax(0, 1.7fr) minmax(0, 0.72fr) minmax(0, 1.2fr) !important; }
.bdp-head.bdp-head-stamp .pv-vh-meta { grid-template-columns: minmax(0, 0.72fr) minmax(0, 1.7fr) minmax(0, 0.72fr) minmax(0, 1.2fr) 26mm !important; }
.bdp-head .pv-vh-cell:nth-child(2) .pv-vh-v { white-space: nowrap; }
/* PDI sheet : the title on one line, as typed */
.bdp-pdi-head .pv-vh-title { min-width: 0; font-size: 12pt; letter-spacing: 1pt; text-transform: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bdp-bn { font-family: 'Noto Sans Bengali', 'Nirmala UI', 'Vrinda', 'SolaimanLipi', sans-serif; font-size: 8.6pt; color: #0f172a; }
.bdp-en { display: block; font-size: 6.4pt; color: #64748b; }
span.bdp-en { display: inline; }
td > .bdp-en:first-of-type { display: block; }
.bdp-en-main { font-size: 8.2pt; color: #0f172a; }
.bdp-title-bn { margin: -1mm 0 2mm; text-align: center; font-size: 11pt; font-weight: 700; color: #1e3a8a; }
.bdp-top { display: flex; gap: 3mm; margin: 0 0 3mm; }
.bdp-info { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 1.6mm 3mm; padding: 2mm 3mm; border: 1px solid #dbe3ef; border-radius: 2mm; margin: 0 0 3mm; }
.bdp-top .bdp-info { margin: 0; }
.bdp-info-3 { grid-template-columns: 1fr 1.3fr 1fr; }
.bdp-info > div { display: flex; flex-direction: column; min-width: 0; line-height: 1.3; }
.bdp-info span { font-size: 6pt; font-weight: 700; letter-spacing: 0.5pt; text-transform: uppercase; color: #94a3b8; }
.bdp-info b { font-size: 8.6pt; font-weight: 700; color: #0f172a; overflow-wrap: anywhere; }
.bdp-info i { font-size: 7pt; font-style: normal; color: #64748b; }
.bdp-no { font-family: ui-monospace, Consolas, monospace; letter-spacing: 0.4pt; }
.bdp-tail { font-size: 12pt; font-weight: 800; color: #1e3a8a; }
.bdp-pic { flex: 0 0 46mm; display: flex; align-items: center; justify-content: center; border: 1px solid #eef2f7; border-radius: 2mm; }
.bdp-pic img { max-width: 44mm; max-height: 34mm; object-fit: contain; }
.bdp-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0 0 3mm; }
.bdp-table th { padding: 1.2mm 1.6mm; border: 1px solid #cbd5e1; background: rgba(37, 99, 235, 0.06); font-size: 7pt; font-weight: 700; text-align: left; color: #1e293b; }
.bdp-table td { padding: 1mm 1.6mm; border: 1px solid #dbe3ef; font-size: 7.8pt; vertical-align: middle; color: #0f172a; }
.bdp-table th.bdp-sec { text-align: center; font-size: 8pt; }
.bdp-c { text-align: center !important; }
.bdp-r { text-align: right !important; }
.bdp-mark { display: inline-block; min-width: 6mm; font-size: 10pt; font-weight: 800; }
.bdp-mark-ok { color: #047857; }
.bdp-mark-bad { color: #be123c; }
.bdp-mark-na { font-size: 6.8pt; color: #64748b; }
.bdp-reading { font-size: 7.8pt; font-weight: 700; }
.bdp-remark { margin-top: 0.4mm; font-size: 6.6pt; color: #be123c; }
.bdp-boxes { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin: 0 0 3mm; }
.bdp-box { min-height: 14mm; padding: 1.6mm 2.4mm; border: 1px solid #dbe3ef; border-radius: 2mm; }
.bdp-box span { font-size: 6.4pt; font-weight: 700; letter-spacing: 0.4pt; text-transform: uppercase; color: #64748b; }
.bdp-box span i { font-style: normal; text-transform: none; letter-spacing: 0; }
.bdp-box p { margin: 1mm 0 0; font-size: 8pt; color: #0f172a; white-space: pre-wrap; }
.bdp-sub { margin: 1mm 0 1.6mm; font-size: 7.4pt; font-weight: 800; letter-spacing: 1pt; text-transform: uppercase; color: #1e3a8a; }
.bdp-box-tick { display: inline-block; width: 3.6mm; height: 3.6mm; border: 1px solid #64748b; border-radius: 0.6mm; }
.bdp-note { margin: 1mm 0 2mm; font-size: 7.6pt; color: #334155; }
.bdp-foot { display: flex; flex-direction: column; gap: 0.6mm; margin: 0 0 1.2mm; font-size: 7pt; color: #334155; }
`;
}


//===============================================================
// Source
//===============================================================

export const BIKE_DELIVERIES_PRINT:
    PrintSourceDef<BikeDeliveryPrintData> =
{
    key:'bike-deliveries',

    title:'Bike Delivery',

    async load
    (
        injector: Injector,
        id: number | string
    ):
        Promise<BikeDeliveryPrintData>
    {
        const delivery =
            await firstValueFrom(
                injector
                    .get(BikeDeliveriesService)
                    .getById(String(id)));

        return { delivery };
    },

    denyReason():
        string
    {
        return '';
    },

    fileName
    (
        data: BikeDeliveryPrintData
    ):
        string
    {
        return data.delivery.DeliveryNo || 'Bike Delivery';
    },

    documents:
    [
        {
            key:'delivery-challan',
            title:'Delivery Challan / Gate Pass',
            icon:'fas fa-truck-ramp-box',
            render:(data, kit) => challanHtml(data, kit),
            css:BIKE_DELIVERY_CSS()
        },
        {
            key:'pdi-sheet',
            title:'PDI Sheet',
            icon:'fas fa-clipboard-check',
            available:(data) => data.delivery.Answers.length > 0,
            render:(data, kit) => pdiSheetHtml(data, kit),
            css:BIKE_DELIVERY_CSS()
        }
    ]
};
