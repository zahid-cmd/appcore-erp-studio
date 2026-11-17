//===============================================================
// Service Estimate : print source (Print Engine)
//
//   /print-viewer/service-estimate/<publicId>?doc=service-estimate
//
// The estimate is read from the server by its public id, so what
// prints is what was saved. The head is the head of the operational
// documents : logo | company | QR code, the title ribbon with the
// estimate number, the info strip with the status stamp.
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
    ServiceEstimate,
    ServiceEstimateLine,
    wsDay,
    wsEstimateName,
    wsMoney
}
from '../shared/ws.models';


//===============================================================
// Source key (registered in shared/print/print-registry.ts)
//===============================================================

export const SERVICE_ESTIMATE_PRINT_KEY =
    'service-estimate';

// Opens the Print Engine viewer in a new tab. '' when it opened;
// otherwise what to tell the user.
export function openServiceEstimatePrint(router: Router, publicId: string): string
{
    const url =
        router.serializeUrl(
            router.createUrlTree(
                ['/print-viewer', SERVICE_ESTIMATE_PRINT_KEY, publicId],
                { queryParams:{ doc:'service-estimate' } }));

    // Not "noopener" : the new tab keeps this session's login
    return window.open(url, '_blank')
        ? ''
        : 'The browser blocked the print tab. Allow pop-ups for this site.';
}


//===============================================================
// The paper
//===============================================================

const SERVICE_ESTIMATE_CSS = `
.pv-page-inner { padding: 7mm 9mm 6mm; }

.sep-facts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0; margin: 2.4mm 0 0; border: 1px solid #dbe3f0; border-radius: 1.8mm; overflow: hidden; }
.sep-facts > div { display: flex; flex-direction: column; gap: 0.5mm; min-width: 0; padding: 1.5mm 2.6mm; border-right: 1px solid #edf1f6; border-bottom: 1px solid #edf1f6; margin: 0 -1px -1px 0; }
.sep-facts span { font-size: 6.2pt; font-weight: 700; letter-spacing: 0.6pt; text-transform: uppercase; color: #64748b; }
.sep-facts b { font-size: 8.4pt; font-weight: 700; color: #0f172a; line-height: 1.25; overflow-wrap: anywhere; }

.sep-title { margin: 3mm 0 1mm; font-size: 7.2pt; font-weight: 800; letter-spacing: 0.7pt; text-transform: uppercase; color: #0b2a5b; }
.sep-box { padding: 1.6mm 2.6mm; border: 1px solid #dbe3f0; border-radius: 1.8mm; font-size: 8pt; color: #0f172a; line-height: 1.4; overflow-wrap: anywhere; }
.sep-box ol { margin: 0; padding-left: 4.5mm; }

table.sep-lines { width: 100%; border-collapse: collapse; }
.sep-lines th { font-size: 6.2pt; font-weight: 700; letter-spacing: 0.4pt; text-transform: uppercase; color: #475569; text-align: left;
                padding: 1.3mm 1.2mm; border-top: 1.2px solid #0f172a; border-bottom: 1px solid #0f172a; background: #f8fafc; }
.sep-lines td { padding: 1mm 1.2mm; border-bottom: 1px solid #edf1f6; vertical-align: top; font-size: 7.6pt; overflow-wrap: anywhere; }
.sep-no { width: 7mm; color: #94a3b8; text-align: center !important; }
.sep-r { text-align: right !important; font-variant-numeric: tabular-nums; white-space: nowrap; }
.sep-c { text-align: center !important; white-space: nowrap; }
.sep-close td { border-top: 1.2px solid #0f172a; border-bottom: 1.2px solid #0f172a; font-size: 7.8pt; font-weight: 800; color: #0b2a5b; }

.sep-total { display: grid; grid-template-columns: minmax(0, 1fr) 62mm; margin-top: 3.5mm; gap: 4mm; align-items: start; }
.sep-sum { border: 1px solid #dbe3f0; border-radius: 1.8mm; overflow: hidden; font-size: 8pt; }
.sep-sum > div { display: flex; justify-content: space-between; gap: 3mm; padding: 1.3mm 2.6mm; border-bottom: 1px solid #edf1f6; }
.sep-sum > div:last-child { border-bottom: 0; background: #0b2a5b; color: #ffffff; font-size: 9pt; font-weight: 800; }
.sep-sum b { font-variant-numeric: tabular-nums; }
.sep-fine { font-size: 7pt; color: #64748b; line-height: 1.45; }
.sep-sign { margin-top: 12mm; }
`;

function serviceEstimateHtml(estimate: ServiceEstimate, kit: PrintKit): string
{
    const e =
        (value: string | number | null | undefined): string => kit.escape(value);

    const fact =
        (label: string, value: string | number | null | undefined): string =>
            `<div><span>${e(label)}</span><b>${e(value === null || value === undefined || value === '' ? '-' : value)}</b></div>`;

    const rows =
        (lines: ServiceEstimateLine[]): string =>
            lines.map((x, i) => `<tr><td class="sep-no">${i + 1}</td><td>${e([x.ItemCode, x.ItemName].filter(v => !!v).join('  '))}</td><td>${e(x.IsFree ? ['Free', x.Note].filter(v => !!v).join(' : ') : x.Note)}</td><td class="sep-r">${e(x.Quantity)}</td><td class="sep-r">${wsMoney(x.Rate)}</td><td class="sep-r">${wsMoney(x.Amount)}</td></tr>`).join('');

    const services =
        estimate.Services ?? [];

    const parts =
        estimate.Parts ?? [];

    const observations =
        estimate.Observations ?? [];

    const name =
        wsEstimateName(estimate);

    return `<section class="pv-flow" data-watermark="">

<div class="pv-run-head">
${kit.voucherHead(
    {
        title:'SERVICE ESTIMATE',
        numberLabel:'Estimate No',
        number:name,
        meta:
        [
            { label:'Date', value:wsDay(estimate.EstimateDate) },
            { label:'Valid Until', value:wsDay(estimate.ValidUntil) || '-' },
            { label:'Service Center', value:estimate.BranchName },
            { label:'Job Card', value:estimate.JobCardNo || '-' }
        ],
        status:estimate.Status,
        qr:['Service Estimate', name, estimate.JobCardNo, estimate.CustomerName, wsMoney(estimate.GrandTotal)].filter(x => !!x).join(' | ')
    })}
</div>

<div class="pv-body">

<div class="sep-facts">
${fact('Customer', estimate.CustomerName)}
${fact('Mobile', estimate.Mobile)}
${fact('Model', [estimate.BrandName, estimate.ModelName].filter(x => !!x).join(' '))}
${fact('Color', estimate.ColorName)}
${fact('Chassis No', estimate.ChassisNo)}
${fact('Engine No', estimate.EngineNo)}
${fact('Registration No', estimate.RegistrationNo)}
${fact('KM Reading', estimate.KmReading)}
</div>

${estimate.BasicRequirement ? `<div class="sep-title">What The Customer Asks For</div><div class="sep-box">${e(estimate.BasicRequirement)}</div>` : ''}

${observations.length > 0 ? `<div class="sep-title">Observations &amp; Diagnosis</div>
<table class="pv-split sep-lines">
  <thead><tr><th class="sep-no">#</th><th>Observation</th><th>Diagnosis</th><th>Note</th></tr></thead>
  <tbody>${observations.map((x, i) => `<tr><td class="sep-no">${i + 1}</td><td>${e(x.Observation)}</td><td>${e(x.Diagnosis || '-')}</td><td>${e(x.Note)}</td></tr>`).join('')}</tbody>
</table>` : ''}

${services.length > 0 ? `<div class="sep-title">Service / Labour</div>
<table class="pv-split sep-lines">
  <thead><tr><th class="sep-no">#</th><th>Service</th><th>Note</th><th class="sep-r">Qty</th><th class="sep-r">Rate</th><th class="sep-r">Amount</th></tr></thead>
  <tbody>${rows(services)}</tbody>
  <tfoot><tr class="sep-close"><td class="sep-no"></td><td colspan="4">Labour Total</td><td class="sep-r">${wsMoney(estimate.LabourTotal)}</td></tr></tfoot>
</table>` : ''}

${parts.length > 0 ? `<div class="sep-title">Parts</div>
<table class="pv-split sep-lines">
  <thead><tr><th class="sep-no">#</th><th>Part</th><th>Note</th><th class="sep-r">Qty</th><th class="sep-r">Rate</th><th class="sep-r">Amount</th></tr></thead>
  <tbody>${rows(parts)}</tbody>
  <tfoot><tr class="sep-close"><td class="sep-no"></td><td colspan="4">Parts Total</td><td class="sep-r">${wsMoney(estimate.PartsTotal)}</td></tr></tfoot>
</table>` : ''}

<div class="sep-total">
<div class="sep-fine">
This is an estimate, not an invoice. Prices are before VAT : VAT is added on the service invoice.
Work or parts found to be needed after this estimate are done only after a revised estimate is approved.
${estimate.ChargeCollected ? `<br>${e(estimate.ChargeName || 'Estimate Charge')} ${wsMoney(estimate.ChargeTotal)} was paid on ${e(wsDay(estimate.ChargeCollectedDate))} (${e(estimate.ChargeReceiptVoucherNo)}). It comes off the service invoice when the work is done here.` : ''}
${estimate.ValidUntil ? `<br>The prices hold until ${e(wsDay(estimate.ValidUntil))}.` : ''}
${estimate.Remarks ? `<br>Remarks : ${e(estimate.Remarks)}` : ''}
${estimate.Status === 'Rejected' && estimate.StatusNote ? `<br>Rejected : ${e(estimate.StatusNote)}` : ''}
</div>
<div class="sep-sum">
<div><span>Labour</span><b>${wsMoney(estimate.LabourTotal)}</b></div>
<div><span>Parts</span><b>${wsMoney(estimate.PartsTotal)}</b></div>
<div><span>Estimate Total</span><b>${wsMoney(estimate.GrandTotal)}</b></div>
</div>
</div>

<div class="sep-sign">${kit.signatures(['Customer (approved)', 'Service Advisor', 'Authorized By'])}</div>

</div>

<div class="pv-end">
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>

</section>`;
}

export const SERVICE_ESTIMATE_PRINT:
    PrintSourceDef<ServiceEstimate | null> =
{
    key:SERVICE_ESTIMATE_PRINT_KEY,

    title:'Service Estimate',

    canRotate:false,

    async load(injector: Injector, id: number | string): Promise<ServiceEstimate | null>
    {
        try
        {
            return await firstValueFrom(injector.get(WsService).getEstimate(String(id)));
        }
        catch
        {
            return null;
        }
    },

    denyReason(data: ServiceEstimate | null): string
    {
        if (!data)
        {
            return 'The estimate could not be loaded.';
        }

        return data.CanPrint
            ? ''
            : 'The estimate is printed only when its Estimate Charge was collected or a job card was made from it.';
    },

    fileName(data: ServiceEstimate | null): string
    {
        return `Service Estimate ${data ? wsEstimateName(data) : ''}`.trim();
    },

    documents:
    [
        {
            key:'service-estimate',
            title:'Service Estimate',
            icon:'fas fa-file-pen',
            render:
                (data: ServiceEstimate | null, kit: PrintKit) =>
                    data ? serviceEstimateHtml(data, kit) : '',
            css:SERVICE_ESTIMATE_CSS
        }
    ]
};
