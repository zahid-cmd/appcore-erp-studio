//===============================================================
// Sales Enquiries : print source (Print Engine)
//
//   /print-viewer/sales-enquiries/<token>?doc=sales-enquiries
//   (&orient=landscape : the viewer's Portrait / Landscape switch)
//
// The list saves what is on its canvas (tab, interest chip,
// search and the rows in their order) under the token; the
// viewer loads the enquiries again from the server (the API
// checks "Print") and prints those rows in the same order.
//
// Enquiry Report : SL · Enquiry No (date) · Enquirer (mobile,
//                  location) · Model (colour) · Executive ·
//                  Interest · Status · Next Follow-up · Last
//                  Follow-up (landscape only).
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
    SalesEnquiry
}
from '../models/sales-enquiries.model';

import
{
    SalesEnquiriesService
}
from '../services/sales-enquiries.service';


//===============================================================
// Request saved by the list
//===============================================================

export const SALES_ENQUIRIES_PRINT_KEY =
    'sales-enquiries';

export interface SalesEnquiriesPrintRequest
{
    // Enquiries on the canvas, in their order
    ids:number[];

    // 'All Enquiries', 'Due', 'Website' …
    view:string;

    // 'All', 'Hot' …
    interest:string;

    search:string;
}

const STORAGE_PREFIX =
    'appcore.sales-enquiries-print.';

// Saves the request; returns its token (the viewer's id)
export function saveSalesEnquiriesPrintRequest
(
    request:
        SalesEnquiriesPrintRequest
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
        // Storage blocked : the viewer prints every enquiry
    }

    return token;
}

function readSalesEnquiriesPrintRequest
(
    token:
        number
):
    SalesEnquiriesPrintRequest | null
{
    try
    {
        const text =
            localStorage.getItem(STORAGE_PREFIX + token);

        return text
            ? JSON.parse(text) as SalesEnquiriesPrintRequest
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

export interface SalesEnquiriesTotals
{
    Records:number;
    Open:number;
    Due:number;
    Lapsed:number;
    Matured:number;
    Suspended:number;
    Unassigned:number;
}

export interface SalesEnquiriesPrintData
{
    request:SalesEnquiriesPrintRequest;
    rows:SalesEnquiry[];
    totals:SalesEnquiriesTotals;
    // yyyy-MM-dd (local)
    today:string;
}

function isoToday():
    string
{
    const now =
        new Date();

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function day
(
    value:
        string | null | undefined
):
    string
{
    return (value ?? '').slice(0, 10);
}

function isOpen
(
    row:
        SalesEnquiry
):
    boolean
{
    return !row.IsMatured && row.StatusStage !== 'Lost';
}

// Follow-up today
function isDue
(
    row:
        SalesEnquiry,
    today:
        string
):
    boolean
{
    return isOpen(row) && !!row.NextFollowUpDate && day(row.NextFollowUpDate) === today;
}

// Follow-up date passed, no call logged
function isLapsed
(
    row:
        SalesEnquiry,
    today:
        string
):
    boolean
{
    return isOpen(row) && !!row.NextFollowUpDate && day(row.NextFollowUpDate) < today;
}

function totalsOf
(
    rows:
        SalesEnquiry[],
    today:
        string
):
    SalesEnquiriesTotals
{
    return {
        Records:rows.length,
        Open:rows.filter(x => isOpen(x)).length,
        Due:rows.filter(x => isDue(x, today)).length,
        Lapsed:rows.filter(x => isLapsed(x, today)).length,
        Matured:rows.filter(x => x.IsMatured).length,
        Suspended:rows.filter(x => !x.IsMatured && x.StatusStage === 'Lost').length,
        Unassigned:rows.filter(x => isOpen(x) && !(x.ExecutiveUserId > 0)).length
    };
}


//===============================================================
// Texts
//===============================================================

function modelText
(
    row:
        SalesEnquiry
):
    string
{
    return row.SecondModelName
        ? `${row.ModelName} / ${row.SecondModelName}`
        : row.ModelName;
}

function interestText
(
    row:
        SalesEnquiry
):
    string
{
    if
    (
        !row.InterestLevelName
    )
    {
        return '—';
    }

    return row.InterestAuto && row.DaysToPurchase !== null && row.DaysToPurchase !== undefined
        ? `${row.InterestLevelName} · ${row.DaysToPurchase === 0 ? 'due' : row.DaysToPurchase + 'd'}`
        : row.InterestLevelName;
}

function statusText
(
    row:
        SalesEnquiry,
    kit:
        PrintKit
):
    string
{
    if
    (
        row.IsMatured
    )
    {
        return `Matured${row.SaleNo ? ' · ' + row.SaleNo : ''}`;
    }

    if
    (
        row.StatusStage === 'Lost'
    )
    {
        return `${row.StatusName}${row.LostReasonName ? ' · ' + row.LostReasonName : ''}`;
    }

    return row.StatusName
        + (row.TestRideDate ? ` · Ride ${kit.date(day(row.TestRideDate))}${row.TestRideSlot ? ' ' + row.TestRideSlot : ''}` : '');
}

function statusColor
(
    row:
        SalesEnquiry
):
    string
{
    return row.IsMatured ? '#16A34A' : (row.StatusColor || '#64748b');
}

function executiveText
(
    row:
        SalesEnquiry
):
    string
{
    return row.ExecutiveUserId > 0 ? row.ExecutiveName : 'Unassigned';
}

function nextText
(
    row:
        SalesEnquiry,
    kit:
        PrintKit
):
    string
{
    return isOpen(row) && row.NextFollowUpDate
        ? kit.date(day(row.NextFollowUpDate))
        : '—';
}

function scopeText
(
    request:
        SalesEnquiriesPrintRequest
):
    string
{
    return [
        request.view || 'All Enquiries',
        request.interest && request.interest !== 'All' ? `${request.interest} interest` : ''
    ]
    .filter(x => !!x)
    .join(' · ');
}


//===============================================================
// Styles
//===============================================================

const SALES_ENQUIRIES_PRINT_CSS = `
/* Compact paper margins */
.pv-page-inner { padding: 7mm 10mm 6mm; }

/* Header : two cards split by a divider */
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
.se-band { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); margin: 0 0 2.4mm; border: 1px solid #c7d5f0; border-radius: 1.8mm; overflow: hidden; }
.se-band > div { display: flex; flex-direction: column; padding: 1.1mm 3mm; border-right: 1px solid #e2e8f0; min-width: 0; }
.se-band > div:first-child { background: #f1f6ff; }
.se-band > div:last-child { border-right: 0; }
.se-band span { font-size: 6pt; font-weight: 700; letter-spacing: 0.7pt; text-transform: uppercase; color: #64748b; }
.se-band b { font-size: 9.6pt; font-weight: 800; color: #0b2a5b; font-variant-numeric: tabular-nums; }
.se-band b.se-warn { color: #b45309; }
.se-band b.se-green { color: #15803d; }
.se-band b.se-red { color: #b42318; }

/* Table */
table.vd-lines { width: 100%; border-collapse: collapse; table-layout: fixed; }
.vd-lines th { font-size: 6.3pt; font-weight: 700; letter-spacing: 0.5pt; text-transform: uppercase; color: #475569; text-align: left;
               padding: 1.6mm 1.4mm; border-top: 1.2px solid #0f172a; border-bottom: 1px solid #0f172a; background: #f8fafc; white-space: nowrap; }
.vd-lines td { padding: 1.2mm 1.4mm; border-bottom: 1px solid #edf1f6; vertical-align: top; font-size: 7.6pt; color: #0f172a; overflow-wrap: anywhere; }
.vd-c { text-align: center !important; }
.se-sl { color: #334155; }
.se-no { font-size: 7pt; font-weight: 700; color: #0b2a5b; white-space: nowrap; letter-spacing: -0.1pt; }
.se-main { font-weight: 600; color: #0f172a; }
.se-sub { display: block; margin-top: 0.3mm; font-size: 6.6pt; color: #475569; }
.se-dot { display: inline-block; width: 1.6mm; height: 1.6mm; margin-right: 1.2mm; border-radius: 50%; vertical-align: 0.15mm; }
.se-un { color: #b45309; font-style: italic; }
.se-due td { background: #fff7ed; }
.se-due .se-next { color: #b45309; font-weight: 700; }
.se-lapsed td { background: #fef2f2; }
.se-lapsed .se-next { color: #b42318; font-weight: 700; }
.se-note { font-size: 6.8pt; color: #334155; }
.vd-lines tbody tr:last-child td { border-bottom: 0; }
.se-close td { padding-top: 1.6mm; padding-bottom: 1.6mm; border-top: 1.2px solid #0f172a; border-bottom: 1.2px solid #0f172a; font-size: 8pt; font-weight: 800; color: #0b2a5b; }
.se-none { padding: 6mm 0 !important; color: #334155; text-align: center; }
.se-fine { margin-top: 2.5mm; font-size: 7pt; color: #334155; }
`;


//===============================================================
// Source
//===============================================================

export const SALES_ENQUIRIES_PRINT:
    PrintSourceDef<SalesEnquiriesPrintData> =
{
    key:SALES_ENQUIRIES_PRINT_KEY,

    title:'Sales Enquiries',

    // Portrait / Landscape switch in the viewer
    canRotate:true,

    async load
    (
        injector:
            Injector,
        id:
            number
    ):
        Promise<SalesEnquiriesPrintData>
    {
        const saved =
            readSalesEnquiriesPrintRequest(id);

        const service =
            injector.get(SalesEnquiriesService);

        const all =
            await firstValueFrom(
                service.getForPrint()
            );

        const today =
            isoToday();

        let rows:
            SalesEnquiry[] =
            all;

        // The rows of the canvas, in its order
        if
        (
            saved
        )
        {
            const byId =
                new Map(all.map(x => [x.SalesEnquiryId, x]));

            rows =
                (saved.ids ?? [])
                    .map(x => byId.get(x))
                    .filter((x): x is SalesEnquiry => !!x);
        }

        const request:
            SalesEnquiriesPrintRequest =
            saved
            ??
            {
                ids:[],
                view:'All Enquiries',
                interest:'All',
                search:''
            };

        return {
            request,
            rows,
            totals:totalsOf(rows, today),
            today
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
            SalesEnquiriesPrintData
    ):
        string
    {
        return `Sales Enquiries - ${scopeText(data.request)}`;
    },

    documents:
    [
        {
            key:'sales-enquiries',

            title:'Sales Enquiries',

            icon:'fas fa-motorcycle',

            render:
                (data: SalesEnquiriesPrintData, kit: PrintKit) =>
                    reportHtml(data, kit, !!kit.landscape),

            css:
                SALES_ENQUIRIES_PRINT_CSS,

            excel:
                (data: SalesEnquiriesPrintData, kit: PrintKit) =>
                    reportSheet(data, kit)
        }
    ]
};


//===============================================================
// Header : company card | report card (QR)
//===============================================================

function reportHead
(
    kit:
        PrintKit,
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
                [company?.CompanyName || 'AppCore ERP', 'Sales Enquiries', title, kit.date(asOf)]
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
      <span class="sh-kicker">Enquiry Report</span>
      <b class="sh-title">Sales Enquiries · ${e(title)}</b>
      <span class="sh-asof">As of <b>${e(kit.date(asOf))}</b></span>
    </div>
    ${qr ? `<div class="sh-qr">${qr}</div>` : ''}
  </div>
</div>
<div class="sh-meta">${meta.filter(x => !!x[1]).map(([label, value]) => `<span><i>${e(label)}</i>${e(value)}</span>`).join('')}</div>`;
}

// Records · Open · Due Today · Lapsed · Matured · Suspended · Unassigned
function band
(
    totals:
        SalesEnquiriesTotals
):
    string
{
    return `<div class="se-band">
  <div><span>Enquiries</span><b>${totals.Records}</b></div>
  <div><span>Open</span><b>${totals.Open}</b></div>
  <div><span>Due Today</span><b class="${totals.Due ? 'se-warn' : ''}">${totals.Due}</b></div>
  <div><span>Lapsed</span><b class="${totals.Lapsed ? 'se-red' : ''}">${totals.Lapsed}</b></div>
  <div><span>Matured</span><b class="${totals.Matured ? 'se-green' : ''}">${totals.Matured}</b></div>
  <div><span>Suspended</span><b>${totals.Suspended}</b></div>
  <div><span>Unassigned</span><b class="${totals.Unassigned ? 'se-warn' : ''}">${totals.Unassigned}</b></div>
</div>`;
}


//===============================================================
// Report
//===============================================================

function reportHtml
(
    data:
        SalesEnquiriesPrintData,
    kit:
        PrintKit,
    landscape:
        boolean
):
    string
{
    const e =
        kit.escape;

    // Landscape adds Last Follow-up; portrait keeps the rest
    const cols:
        [string, string, string][] =
        landscape
            ? [
                ['SL', '8mm', ''],
                ['Enquiry', '33mm', ''],
                ['Enquirer', '', ''],
                ['Model', '38mm', ''],
                ['Executive', '24mm', ''],
                ['Interest', '20mm', ''],
                ['Status', '30mm', ''],
                ['Next F-up', '20mm', 'vd-c'],
                ['Last Follow-up', '52mm', '']
            ]
            : [
                ['SL', '7mm', ''],
                ['Enquiry', '30mm', ''],
                ['Enquirer', '', ''],
                ['Model', '32mm', ''],
                ['Executive', '20mm', ''],
                ['Interest', '17mm', ''],
                ['Status', '24mm', ''],
                ['Next F-up', '18mm', 'vd-c']
            ];

    const body =
        data.rows
            .map
            (
                (row, index) =>
                {
                    const mark =
                        isLapsed(row, data.today)
                            ? 'se-lapsed'
                            : isDue(row, data.today) ? 'se-due' : '';

                    const enquirerSub =
                        [
                            row.EnquirerMobile,
                            row.EnquiryFor === 'Referrer' ? 'Referrer' : '',
                            row.LocationName
                        ]
                        .filter(x => !!x)
                        .join(' · ');

                    const modelSub =
                        [
                            row.PreferredColor,
                            row.PaymentMode && row.PaymentMode !== 'Cash' ? row.PaymentMode : ''
                        ]
                        .filter(x => !!x)
                        .join(' · ');

                    const enquirySub =
                        [
                            kit.date(day(row.EnquiryDate)),
                            row.SourceName
                        ]
                        .filter(x => !!x)
                        .join(' · ');

                    const interest =
                        row.InterestLevelName
                            ? `<span class="se-dot" style="background:${e(row.InterestLevelColor || '#94a3b8')}"></span>${e(interestText(row))}`
                            : '—';

                    const last =
                        row.LastFollowUpDate
                            ? `<span class="se-main">${e(kit.date(day(row.LastFollowUpDate)))}</span>${row.LastFollowUpNote ? `<span class="se-sub se-note">${e(row.LastFollowUpNote)}</span>` : ''}`
                            : '<span class="se-sub">Not called yet</span>';

                    return `<tr class="${mark}">
  <td class="se-sl">${index + 1}</td>
  <td><span class="se-no">${e(row.EnquiryNo)}</span><span class="se-sub">${e(enquirySub)}</span></td>
  <td><span class="se-main">${e(row.EnquirerName)}</span>${enquirerSub ? `<span class="se-sub">${e(enquirerSub)}</span>` : ''}</td>
  <td><span class="se-main">${e(modelText(row))}</span>${modelSub ? `<span class="se-sub">${e(modelSub)}</span>` : ''}</td>
  <td>${row.ExecutiveUserId > 0 ? e(row.ExecutiveName) : '<span class="se-un">Unassigned</span>'}</td>
  <td>${interest}</td>
  <td><span class="se-dot" style="background:${e(statusColor(row))}"></span>${e(statusText(row, kit))}</td>
  <td class="vd-c se-next">${e(nextText(row, kit))}</td>
  ${landscape ? `<td>${last}</td>` : ''}
</tr>`;
                }
            )
            .join('');

    const t =
        data.totals;

    return `<section class="pv-flow${landscape ? ' pv-landscape' : ''}" data-watermark="">
<div class="pv-run-head">
${reportHead(kit, scopeText(data.request), data.today,
    [
        ['Enquiries', `${t.Records}`],
        ['View', data.request.view || 'All Enquiries'],
        ['Interest', data.request.interest || 'All'],
        ['Search', data.request.search ?? '']
    ])}
</div>
<div class="pv-body">
${band(t)}
<table class="pv-split vd-lines">
  <colgroup>${cols.map(x => x[1] ? `<col style="width:${x[1]}">` : '<col>').join('')}</colgroup>
  <thead><tr>${cols.map(x => `<th class="${x[2]}">${e(x[0])}</th>`).join('')}</tr></thead>
  <tbody>
    ${body || `<tr><td colspan="${cols.length}" class="se-none">No enquiry in this view.</td></tr>`}
  </tbody>
  <tfoot>
    <tr class="se-close"><td colspan="${cols.length}">Total · ${t.Records} enquir${t.Records === 1 ? 'y' : 'ies'} · ${t.Open} open · ${t.Due} due today · ${t.Lapsed} lapsed · ${t.Matured} matured · ${t.Suspended} suspended</td></tr>
  </tfoot>
</table>
<div class="se-fine">Amber rows : follow-up due today. Red rows : lapsed, the follow-up date passed with no call logged. Interest "· 6d" : days left to the expected purchase date.${landscape ? '' : ' Turn the page to Landscape for the last follow-up note.'}</div>
</div>
<div class="pv-end">
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>
</section>`;
}


//===============================================================
// Excel
//===============================================================

function reportSheet
(
    data:
        SalesEnquiriesPrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const t =
        data.totals;

    const bold =
        (text: string): ExcelCell =>
            ({ v:text, s:'bold' });

    return {
        name:'Sales Enquiries',
        columns:[6, 24, 13, 14, 24, 15, 18, 26, 14, 10, 18, 14, 22, 14, 13, 13, 13, 40, 30],
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [bold(`SALES ENQUIRIES - ${scopeText(data.request)}`)],
            [bold('As of'), kit.date(data.today), null, bold('Search'), data.request.search ?? '', null, bold('Enquiries'), t.Records],
            [],
            [
                bold('SL'), bold('Enquiry No'), bold('Date'), bold('Source'), bold('Enquirer'), bold('Mobile'), bold('Location'),
                bold('Model'), bold('Colour'), bold('Payment'), bold('Executive'), bold('Interest'), bold('Status'), bold('Expected Purchase'),
                bold('Next Follow-up'), bold('Last Follow-up'), bold('Test Ride'), bold('Last Note'), bold('Remarks')
            ],
            ...data.rows.map
            (
                (row, index): ExcelCell[] =>
                [
                    index + 1,
                    row.EnquiryNo,
                    kit.date(day(row.EnquiryDate)),
                    row.SourceName,
                    row.EnquirerName + (row.EnquiryFor === 'Referrer' ? ' (Referrer)' : ''),
                    row.EnquirerMobile,
                    row.LocationName,
                    modelText(row),
                    row.PreferredColor,
                    row.PaymentMode,
                    executiveText(row),
                    row.InterestLevelName ? interestText(row) : '',
                    statusText(row, kit),
                    row.ExpectedPurchaseDate ? kit.date(day(row.ExpectedPurchaseDate)) : '',
                    isOpen(row) && row.NextFollowUpDate ? kit.date(day(row.NextFollowUpDate)) : '',
                    row.LastFollowUpDate ? kit.date(day(row.LastFollowUpDate)) : '',
                    row.TestRideDate ? `${kit.date(day(row.TestRideDate))}${row.TestRideSlot ? ' ' + row.TestRideSlot : ''}` : '',
                    row.LastFollowUpNote,
                    row.Remarks
                ]
            ),
            [],
            [null, bold(`Total · ${t.Records} enquiries`), null, null, bold(`${t.Open} open · ${t.Due} due today · ${t.Lapsed} lapsed · ${t.Matured} matured · ${t.Suspended} suspended · ${t.Unassigned} unassigned`)]
        ]
    };
}
