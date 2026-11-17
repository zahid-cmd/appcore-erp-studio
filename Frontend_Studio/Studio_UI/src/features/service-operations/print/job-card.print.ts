//===============================================================
// Job Card : print source (Print Engine)
//
//   /print-viewer/job-card/<publicId>?doc=job-card
//
// The job card is read from the server by its public id, so what
// prints is what was saved. The head is the head of the operational
// documents : logo | company | QR code, the title ribbon with the
// job card number, the info strip with the status stamp.
//===============================================================

import
{
    Injector
}
from '@angular/core';

import
{
    Router
}
from '@angular/router';

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
from '../../../shared/print/print.models';

import { WsService } from '../shared/ws.service';

import
{
    JobCard,
    wsDateTime,
    wsDay,
    wsMinutes,
    wsMoney
}
from '../shared/ws.models';


//===============================================================
// Source key (registered in shared/print/print-registry.ts)
//===============================================================

export const JOB_CARD_PRINT_KEY =
    'job-card';

// Opens the Print Engine viewer in a new tab. '' when it opened;
// otherwise what to tell the user.
export function openJobCardPrint(router: Router, publicId: string): string
{
    const url =
        router.serializeUrl(
            router.createUrlTree(
                ['/print-viewer', JOB_CARD_PRINT_KEY, publicId],
                { queryParams:{ doc:'job-card' } }));

    // Not "noopener" : the new tab keeps this session's login
    return window.open(url, '_blank')
        ? ''
        : 'The browser blocked the print tab. Allow pop-ups for this site.';
}


// The two tokens of the customer : welcome drink, bike delivery
export function openJobCardTokensPrint(router: Router, publicId: string): string
{
    const url =
        router.serializeUrl(
            router.createUrlTree(
                ['/print-viewer', JOB_CARD_PRINT_KEY, publicId],
                { queryParams:{ doc:'tokens' } }));

    return window.open(url, '_blank')
        ? ''
        : 'The browser blocked the print tab. Allow pop-ups for this site.';
}


//===============================================================
// The paper
//===============================================================

const JOB_CARD_CSS = `
.pv-page-inner { padding: 7mm 9mm 6mm; }
.jcp-facts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0; margin: 2.4mm 0 0; border: 1px solid #dbe3f0; border-radius: 1.8mm; overflow: hidden; }
.jcp-facts > div { display: flex; flex-direction: column; gap: 0.5mm; min-width: 0; padding: 1.5mm 2.6mm; border-right: 1px solid #edf1f6; border-bottom: 1px solid #edf1f6; margin: 0 -1px -1px 0; }
.jcp-facts span { font-size: 6.2pt; font-weight: 700; letter-spacing: 0.6pt; text-transform: uppercase; color: #64748b; }
.jcp-facts b { font-size: 8.4pt; font-weight: 700; color: #0f172a; line-height: 1.25; overflow-wrap: anywhere; }
.jcp-title { margin: 3mm 0 1mm; font-size: 7.2pt; font-weight: 800; letter-spacing: 0.7pt; text-transform: uppercase; color: #0b2a5b; }
.jcp-box { padding: 1.6mm 2.6mm; border: 1px solid #dbe3f0; border-radius: 1.8mm; font-size: 8pt; color: #0f172a; line-height: 1.4; overflow-wrap: anywhere; }
.jcp-box ol { margin: 0; padding-left: 4.5mm; }
table.jcp-lines { width: 100%; border-collapse: collapse; }
.jcp-lines th { font-size: 6.2pt; font-weight: 700; letter-spacing: 0.4pt; text-transform: uppercase; color: #475569; text-align: left;
                padding: 1.3mm 1.2mm; border-top: 1.2px solid #0f172a; border-bottom: 1px solid #0f172a; background: #f8fafc; }
.jcp-lines td { padding: 1mm 1.2mm; border-bottom: 1px solid #edf1f6; vertical-align: top; font-size: 7.6pt; overflow-wrap: anywhere; }
.jcp-no { width: 7mm; color: #94a3b8; text-align: center !important; }
.jcp-r { text-align: right !important; font-variant-numeric: tabular-nums; white-space: nowrap; }
.jcp-c { text-align: center !important; white-space: nowrap; }
.jcp-close td { border-top: 1.2px solid #0f172a; border-bottom: 1.2px solid #0f172a; font-size: 7.8pt; font-weight: 800; color: #0b2a5b; }
.jcp-check { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.8mm 4mm; padding: 1.6mm 2.6mm; border: 1px solid #dbe3f0; border-radius: 1.8mm; font-size: 7.6pt; }
.jcp-check > div { display: flex; justify-content: space-between; gap: 2mm; border-bottom: 1px dotted #cbd5e1; }
.jcp-check b { white-space: nowrap; }
.jcp-fine { margin-top: 2.5mm; font-size: 7pt; color: #64748b; }
.jcp-sign { margin-top: 12mm; }
`;

// The tokens : two cards of the size and the look of a bank card
// (the curved shapes, the chip above the number), in a grey and
// white gradient with dark text - they are printed, so little ink.
// Everything is inside the card. (owner 2026-11-18)
const TOKENS_CSS = `
.pv-page-inner { padding: 9mm 9mm 6mm; }
.jct-row { display: flex; justify-content: center; gap: 0; }
.jct { padding: 4mm 4.5mm; border: 1.2px dashed #9ca3af; margin: 0 -1.2px 0 0; }
.jct-card { position: relative; box-sizing: border-box; width: 85.6mm; height: 54mm; padding: 4mm 5.5mm 2.6mm; border: 0.3mm solid #9ca3af; border-radius: 3.6mm; overflow: hidden; display: flex; flex-direction: column; color: #111827; background: linear-gradient(135deg, #ffffff 0%, #eef0f2 50%, #cfd4da 100%); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.jct-card[data-tone="delivery"] { background: linear-gradient(135deg, #d5d9de 0%, #eef0f2 50%, #ffffff 100%); }
.jct-card::before { content: ""; position: absolute; right: -16mm; top: -20mm; width: 52mm; height: 52mm; border-radius: 50%; background: rgba(17, 24, 39, 0.045); }
.jct-card::after { content: ""; position: absolute; right: -6mm; bottom: -26mm; width: 46mm; height: 46mm; border-radius: 50%; background: rgba(17, 24, 39, 0.04); }
.jct-card > * { position: relative; z-index: 1; }
.jct-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 3mm; }
.jct-top b { font-size: 8.6pt; font-weight: 800; letter-spacing: 0.2pt; }
.jct-kind { font-size: 6pt; font-weight: 700; letter-spacing: 1.1pt; text-transform: uppercase; text-align: right; color: #374151; white-space: nowrap; }
.jct-chip { position: relative; width: 10mm; height: 7.4mm; margin-top: 2.2mm; border: 0.25mm solid #6b7280; border-radius: 1.5mm; background: linear-gradient(135deg, #f3f4f6 0%, #9ca3af 60%, #e5e7eb 100%); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.jct-chip::before { content: ""; position: absolute; left: 0; right: 0; top: 50%; border-top: 0.25mm solid #4b5563; }
.jct-chip::after { content: ""; position: absolute; top: 0; bottom: 0; left: 33%; width: 34%; border-left: 0.25mm solid #4b5563; border-right: 0.25mm solid #4b5563; }
.jct-no { margin-top: 2.2mm; font-family: "Consolas", "Courier New", monospace; font-size: 19pt; font-weight: 700; letter-spacing: 1.6pt; line-height: 1; white-space: nowrap; }
.jct-facts { margin-top: auto; display: grid; grid-template-columns: 1.35fr 1fr; gap: 0.9mm 4mm; }
.jct-facts div { min-width: 0; }
.jct-facts div:nth-child(2n) { text-align: right; }
.jct-facts div.is-wide { grid-column: 1 / -1; text-align: left; }
.jct-facts span { display: block; font-size: 4.6pt; letter-spacing: 0.8pt; text-transform: uppercase; color: #6b7280; }
.jct-facts b { display: block; font-size: 7pt; font-weight: 700; letter-spacing: 0.2pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.jct-fine { margin-top: 1.3mm; font-size: 4.8pt; line-height: 1.2; color: #4b5563; text-align: center; }
.jct-cut { margin-top: 2mm; font-size: 6.6pt; color: #9ca3af; text-align: center; }
`;

function tokensHtml(card: JobCard, kit: PrintKit): string
{
    const e =
        (value: string | number | null | undefined): string => kit.escape(value);

    if (!card.WelcomeTokenNo && !card.DeliveryTokenNo)
    {
        return `<section class="pv-flow" data-watermark=""><div class="pv-run-head"></div><div class="pv-body"><div class="jct-cut">${e(card.JobCardNo)} has no tokens.</div></div></section>`;
    }

    const bike =
        [[card.BrandName, card.ModelName].filter(x => !!x).join(' '), card.RegistrationNo || card.ChassisNo]
            .filter(x => !!x).join(' - ');

    // The serial token as on the page : mmdd001 (the month and the
    // day of the job, then the serial of the day); the delivery
    // token keeps its check code : mmdd001-4746
    const date = (card.JobDate ?? '').substring(0, 10);
    const day = date.length === 10 ? date.substring(5, 7) + date.substring(8, 10) : '';
    const welcomeNo = day + (card.WelcomeTokenNo ?? '').replace(/^W-/, '');
    const deliveryNo = day + (card.DeliveryTokenNo ?? '').replace(/^D-/, '');

    // 1118001-4746 on the card : 1118 001 4746 (in groups, as a
    // card number)
    const grouped =
        (no: string): string =>
            no.replace(/^([0-9]{4})([0-9]+)/, '$1 $2').replace('-', ' ');

    // a fact of the card : [label, value, the whole width ?]
    const slip =
        (tone: string, kind: string, no: string | undefined, facts: [string, string | undefined, boolean?][], fine: string): string =>
            `<div class="jct">
<div class="jct-card" data-tone="${tone}">
<div class="jct-top"><b>${e(card.BranchName)}</b><div class="jct-kind">${e(kind)}</div></div>
<div class="jct-chip"></div>
<div class="jct-no">${e(no ? grouped(no) : '-')}</div>
<div class="jct-facts">${facts.map(x => `<div${x[2] ? ' class="is-wide"' : ''}><span>${e(x[0])}</span><b>${e(x[1] || '-')}</b></div>`).join('')}</div>
<div class="jct-fine">${e(fine)}</div>
</div>
</div>`;

    return `<section class="pv-flow" data-watermark="">
<div class="pv-run-head"></div>
<div class="pv-body">
<div class="jct-row">
${slip(
    'drink',
    'Welcome Drink Token',
    card.WelcomeTokenNo ? welcomeNo : '',
    [['Customer', card.CustomerName], ['Date', wsDay(card.JobDate)], ['Job Card', card.JobCardNo, true]],
    'Present this token at the counter for one welcome drink. Valid on the date of the card only.')}
${slip(
    'delivery',
    'Bike Delivery Token',
    card.DeliveryTokenNo ? deliveryNo : '',
    [['Customer', card.CustomerName], ['Date', wsDay(card.JobDate)], ['Job Card', card.JobCardNo], ['Mobile', card.Mobile], ['Bike', bike, true]],
    'Keep this token. Present it at billing and at delivery : the bike is handed over against it.')}
</div>
<div class="jct-cut">cut along the dashed lines</div>
</div>
</section>`;
}

function jobCardHtml(card: JobCard, kit: PrintKit): string
{
    const e =
        (value: string | number | null | undefined): string => kit.escape(value);

    const fact =
        (label: string, value: string | number | null | undefined): string =>
            `<div><span>${e(label)}</span><b>${e(value === null || value === undefined || value === '' ? '-' : value)}</b></div>`;

    const complaints =
        (card.Complaints ?? []).map(x => (x.Complaint ?? '').trim()).filter(x => !!x);

    const services =
        card.Services ?? [];

    const parts =
        card.Parts ?? [];

    const checklist =
        card.Checklist ?? [];

    const work =
        card.WorkEntries ?? [];

    return `<section class="pv-flow" data-watermark="">
<div class="pv-run-head">
${kit.voucherHead(
    {
        title:'JOB CARD',
        numberLabel:'Job Card No',
        number:card.JobCardNo,
        meta:
        [
            { label:'Date', value:wsDay(card.JobDate) },
            { label:'Check-in', value:wsDateTime(card.CheckInAt) },
            { label:'Service Center', value:card.BranchName },
            { label:'Job Type', value:card.JobType }
        ],
        status:card.Status,
        qr:['Job Card', card.JobCardNo, card.ChassisNo, card.CustomerName].filter(x => !!x).join(' | ')
    })}
</div>
<div class="pv-body">
<div class="jcp-facts">
${fact('Customer', card.CustomerName)}
${fact('Mobile', card.Mobile)}
${fact('Model', [card.BrandName, card.ModelName].filter(x => !!x).join(' '))}
${fact('Color', card.ColorName)}
${fact('Chassis No', card.ChassisNo)}
${fact('Engine No', card.EngineNo)}
${fact('Registration No', card.RegistrationNo)}
${fact('KM Reading', card.KmReading)}
${fact('Fuel', card.FuelLevel)}
${fact('Service', card.ScheduleName)}
${fact('Service Advisor', card.AdvisorName)}
${fact('Promised', wsDateTime(card.PromisedAt))}
</div>
${card.BasicRequirement ? `<div class="jcp-title">Basic Requirement</div><div class="jcp-box">${e(card.BasicRequirement)}</div>` : ''}
${complaints.length > 0 ? `<div class="jcp-title">Customer Complaints</div><div class="jcp-box"><ol>${complaints.map(x => `<li>${e(x)}</li>`).join('')}</ol></div>` : ''}
<div class="jcp-title">Service / Labour</div>
<table class="pv-split jcp-lines">
  <thead><tr><th class="jcp-no">#</th><th>Service</th><th>Note</th><th class="jcp-r">Qty</th><th class="jcp-r">Rate</th><th class="jcp-r">Amount</th></tr></thead>
  <tbody>${
        services.length > 0
            ? services.map((x, i) => `<tr><td class="jcp-no">${i + 1}</td><td>${e([x.ItemCode, x.ItemName].filter(v => !!v).join('  '))}</td><td>${e(x.IsFree ? ['Free', x.Note].filter(v => !!v).join(' : ') : x.Note)}</td><td class="jcp-r">${e(x.Quantity)}</td><td class="jcp-r">${wsMoney(x.Rate)}</td><td class="jcp-r">${wsMoney(x.Amount)}</td></tr>`).join('')
            : '<tr><td colspan="6" class="jcp-c">-</td></tr>'
    }</tbody>
  <tfoot><tr class="jcp-close"><td class="jcp-no"></td><td colspan="4">Labour Total</td><td class="jcp-r">${wsMoney(card.LabourTotal)}</td></tr></tfoot>
</table>
${parts.length > 0 ? `<div class="jcp-title">Parts Needed</div>
<table class="pv-split jcp-lines">
  <thead><tr><th class="jcp-no">#</th><th>Part</th><th>Note</th><th class="jcp-r">Qty</th><th class="jcp-r">Rate</th><th class="jcp-r">Amount</th></tr></thead>
  <tbody>${parts.map((x, i) => `<tr><td class="jcp-no">${i + 1}</td><td>${e([x.ItemCode, x.ItemName].filter(v => !!v).join('  '))}</td><td>${e(x.Note)}</td><td class="jcp-r">${e(x.Quantity)}</td><td class="jcp-r">${wsMoney(x.Rate)}</td><td class="jcp-r">${wsMoney(x.Amount)}</td></tr>`).join('')}</tbody>
  <tfoot><tr class="jcp-close"><td class="jcp-no"></td><td colspan="4">Parts Total (estimate)</td><td class="jcp-r">${wsMoney(card.PartsTotal)}</td></tr></tfoot>
</table>` : ''}
${checklist.length > 0 ? `<div class="jcp-title">Check-in Checklist</div><div class="jcp-check">${checklist.map(x => `<div><span>${e(x.ItemName)}${x.Note ? ` (${e(x.Note)})` : ''}</span><b>${e(x.Result || '____')}</b></div>`).join('')}</div>` : ''}
${work.length > 0 ? `<div class="jcp-title">Technician Time</div>
<table class="jcp-lines">
  <thead><tr><th class="jcp-no">#</th><th>Technician</th><th>Bay</th><th>Work</th><th>Start</th><th>End</th><th class="jcp-r">Time</th></tr></thead>
  <tbody>${work.map((x, i) => `<tr><td class="jcp-no">${i + 1}</td><td>${e(x.TechnicianName)}</td><td>${e(x.BayName)}</td><td>${e(x.WorkNote)}</td><td>${e(wsDateTime(x.StartAt))}</td><td>${e(x.EndAt ? wsDateTime(x.EndAt) : 'Working')}</td><td class="jcp-r">${e(wsMinutes(x.Minutes))}</td></tr>`).join('')}</tbody>
</table>` : ''}
${card.Remarks ? `<div class="jcp-fine">Remarks : ${e(card.Remarks)}</div>` : ''}
${card.Status === 'Cancelled' && card.CancelReason ? `<div class="jcp-fine">Cancelled : ${e(card.CancelReason)}</div>` : ''}
<div class="jcp-sign">${kit.signatures(['Customer', 'Service Advisor', 'Technician'])}</div>
</div>
<div class="pv-end">
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>
</section>`;
}

export const JOB_CARD_PRINT:
    PrintSourceDef<JobCard | null> =
{
    key:JOB_CARD_PRINT_KEY,

    title:'Job Card',

    canRotate:false,

    async load(injector: Injector, id: number | string): Promise<JobCard | null>
    {
        try
        {
            return await firstValueFrom(injector.get(WsService).getJobCard(String(id)));
        }
        catch
        {
            return null;
        }
    },

    denyReason(data: JobCard | null): string
    {
        return data ? '' : 'The job card could not be loaded.';
    },

    fileName(data: JobCard | null): string
    {
        return `Job Card ${data?.JobCardNo ?? ''}`.trim();
    },

    documents:
    [
        {
            key:'job-card',
            title:'Job Card',
            icon:'fas fa-clipboard-list',
            render:
                (data: JobCard | null, kit: PrintKit) =>
                    data ? jobCardHtml(data, kit) : '',
            css:JOB_CARD_CSS
        },
        {
            key:'tokens',
            title:'Tokens',
            icon:'fas fa-ticket',
            render:
                (data: JobCard | null, kit: PrintKit) =>
                    data ? tokensHtml(data, kit) : '',
            css:TOKENS_CSS
        }
    ]
};
