//===============================================================
// Service Invoice : print source (Print Engine)
//
//   /print-viewer/service-invoice/<publicId>?doc=service-invoice
//
// The invoice is read from the server by its public id, so what
// prints is what was posted. The head is the head of the operational
// documents : logo | company | QR code, the title ribbon with the
// number, the info strip with the status stamp.
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
    ServiceInvoice,
    ServiceInvoiceLine,
    wsDay,
    wsMoney
}
from '../shared/ws.models';


//===============================================================
// Source key (registered in shared/print/print-registry.ts)
//===============================================================

const KEY =
    'service-invoice';

// Opens the Print Engine viewer in a new tab. '' when it opened;
// otherwise what to tell the user.
export function openServiceInvoicePrint(router: Router, publicId: string): string
{
    const url =
        router.serializeUrl(
            router.createUrlTree(
                ['/print-viewer', KEY, publicId],
                { queryParams:{ doc:KEY } }));

    // Not "noopener" : the new tab keeps this session's login
    return window.open(url, '_blank')
        ? ''
        : 'The browser blocked the print tab. Allow pop-ups for this site.';
}


//===============================================================
// The paper
//===============================================================

const SERVICE_INVOICE_CSS = `
.pv-page-inner { padding: 7mm 9mm 6mm; }

.sip-facts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0; margin: 2.4mm 0 0; border: 1px solid #dbe3f0; border-radius: 1.8mm; overflow: hidden; }
.sip-facts > div { display: flex; flex-direction: column; gap: 0.5mm; min-width: 0; padding: 1.5mm 2.6mm; border-right: 1px solid #edf1f6; border-bottom: 1px solid #edf1f6; margin: 0 -1px -1px 0; }
.sip-facts span { font-size: 6.2pt; font-weight: 700; letter-spacing: 0.6pt; text-transform: uppercase; color: #64748b; }
.sip-facts b { font-size: 8.4pt; font-weight: 700; color: #0f172a; line-height: 1.25; overflow-wrap: anywhere; }

.sip-title { margin: 3mm 0 1mm; font-size: 7.2pt; font-weight: 800; letter-spacing: 0.7pt; text-transform: uppercase; color: #0b2a5b; }

table.sip-lines { width: 100%; border-collapse: collapse; }
.sip-lines th { font-size: 6.2pt; font-weight: 700; letter-spacing: 0.4pt; text-transform: uppercase; color: #475569; text-align: left;
                padding: 1.3mm 1.2mm; border-top: 1.2px solid #0f172a; border-bottom: 1px solid #0f172a; background: #f8fafc; }
.sip-lines td { padding: 1mm 1.2mm; border-bottom: 1px solid #edf1f6; vertical-align: top; font-size: 7.6pt; overflow-wrap: anywhere; }
.sip-no { width: 7mm; color: #94a3b8; text-align: center !important; }
.sip-r { text-align: right !important; font-variant-numeric: tabular-nums; white-space: nowrap; }
.sip-group td { font-size: 6.6pt; font-weight: 800; letter-spacing: 0.5pt; text-transform: uppercase; color: #0b2a5b; background: #f1f5f9; }

.sip-foot { display: grid; grid-template-columns: minmax(0, 1fr) 68mm; gap: 6mm; margin-top: 3mm; align-items: start; }
.sip-fine { font-size: 7pt; color: #64748b; line-height: 1.45; }
.sip-fine b { color: #0f172a; }
table.sip-sum { width: 100%; border-collapse: collapse; }
.sip-sum td { padding: 0.9mm 1.2mm; font-size: 7.8pt; border-bottom: 1px solid #edf1f6; }
.sip-sum td:last-child { text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; }
.sip-sum .sip-grand td { border-top: 1.2px solid #0f172a; border-bottom: 1.2px solid #0f172a; font-size: 9pt; font-weight: 800; color: #0b2a5b; }
.sip-sign { margin-top: 12mm; }
`;

function serviceInvoiceHtml(doc: ServiceInvoice, kit: PrintKit): string
{
    const e =
        (value: string | number | null | undefined): string => kit.escape(value);

    const fact =
        (label: string, value: string | number | null | undefined): string =>
            `<div><span>${e(label)}</span><b>${e(value === null || value === undefined || value === '' ? '-' : value)}</b></div>`;

    const lines =
        doc.Lines ?? [];

    // a column Discount, only when a line carries one
    const discounted =
        lines.some(x => !!x.Discount);

    let serial = 0;

    const row =
        (x: ServiceInvoiceLine): string =>
            `<tr><td class="sip-no">${++serial}</td><td>${e(x.ItemName)}${x.IsFree ? ' <i>(free)</i>' : ''}${x.LineType === 'Outside' && x.Note ? ` <i>(${e(x.Note)})</i>` : ''}</td><td>${e(x.ItemCode)}</td><td class="sip-r">${e(x.Quantity)}</td><td class="sip-r">${wsMoney(x.Rate)}</td><td class="sip-r">${wsMoney(x.Amount)}</td>${discounted ? `<td class="sip-r">${x.Discount ? wsMoney(x.Discount) : ''}</td>` : ''}<td class="sip-r">${x.VatAmount ? wsMoney(x.VatAmount) : ''}</td><td class="sip-r">${wsMoney(x.Total)}</td></tr>`;

    const group =
        (title: string, type: string): string =>
        {
            const rows = lines.filter(x => x.LineType === type);

            return rows.length === 0 ? '' : `<tr class="sip-group"><td colspan="${discounted ? 9 : 8}">${e(title)}</td></tr>${rows.map(row).join('')}`;
        };

    const sum =
        (label: string, value: number, cls = ''): string =>
            `<tr class="${cls}"><td>${e(label)}</td><td>${wsMoney(value)}</td></tr>`;

    const payments =
        (doc.Payments ?? []).map(x => `${e(x.Mode)} ${wsMoney(x.Amount)}${x.TransactionRef ? ` (${e(x.TransactionRef)})` : ''}`).join(', ');

    return `<section class="pv-flow" data-watermark="${doc.Status === 'Returned' ? 'RETURNED' : ''}">

<div class="pv-run-head">
${kit.voucherHead(
    {
        title:'SERVICE INVOICE',
        numberLabel:'Invoice No',
        number:doc.InvoiceNo,
        meta:
        [
            { label:'Date', value:wsDay(doc.InvoiceDate) },
            { label:'Service Center', value:doc.BranchName },
            { label:'Job Card', value:doc.JobCardNo },
            { label:'Job Type', value:doc.JobType || '-' }
        ],
        status:doc.Status === 'Returned' ? 'Returned' : (doc.DueAmount > 0 ? 'Due' : 'Paid'),
        qr:['Service Invoice', doc.InvoiceNo, doc.JobCardNo, doc.CustomerName, wsMoney(doc.GrandTotal)].filter(x => !!x).join(' | ')
    })}
</div>

<div class="pv-body">

<div class="sip-facts">
${fact('Customer', doc.CustomerName)}
${fact('Mobile', doc.Mobile)}
${fact('Model', [doc.BrandName, doc.ModelName].filter(x => !!x).join(' '))}
${fact('Registration No', doc.RegistrationNo)}
${fact('Chassis No', doc.ChassisNo)}
${fact('Engine No', doc.EngineNo)}
${fact('Km Reading', doc.KmReading)}
${fact('Receipt', doc.ReceiptVoucherNo)}
</div>

<div class="sip-title">Services and Parts</div>
<table class="pv-split sip-lines">
  <thead><tr><th class="sip-no">#</th><th>Description</th><th>Code</th><th class="sip-r">Qty</th><th class="sip-r">Rate</th><th class="sip-r">Amount</th>${discounted ? '<th class="sip-r">Discount</th>' : ''}<th class="sip-r">VAT</th><th class="sip-r">Total</th></tr></thead>
  <tbody>${group('Labour', 'Service')}${group('Parts', 'Part')}${group('Outside Work', 'Outside')}</tbody>
</table>

<div class="sip-foot">
  <div class="sip-fine">
    <div><b>In words :</b> ${e(kit.words(doc.GrandTotal))}</div>
    ${payments ? `<div><b>Collected :</b> ${payments}</div>` : ''}
    ${doc.Remarks ? `<div><b>Remarks :</b> ${e(doc.Remarks)}</div>` : ''}
    ${doc.ReturnNo ? `<div><b>Returned :</b> ${e(doc.ReturnNo)}</div>` : ''}
  </div>
  <table class="sip-sum">
    ${sum('Labour', doc.LabourTotal)}
    ${sum('Parts', doc.PartsTotal)}
    ${doc.OutsideTotal ? sum('Outside work', doc.OutsideTotal) : ''}
    ${doc.LineDiscount ? sum('Item discount', -doc.LineDiscount) : ''}
    ${doc.VatTotal ? sum('VAT', doc.VatTotal) : ''}
    ${doc.Discount ? sum(doc.LineDiscount ? 'Round off' : 'Discount', -doc.Discount) : ''}
    ${sum('Invoice Total', doc.GrandTotal, 'sip-grand')}
    ${sum('Collected', doc.PaidAmount)}
    ${sum('Due', doc.DueAmount)}
  </table>
</div>

<div class="sip-sign">${kit.signatures(['Customer', 'Service Advisor', 'Authorized By'])}</div>

</div>

<div class="pv-end">
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>

</section>`;
}

export const SERVICE_INVOICE_PRINT:
    PrintSourceDef<ServiceInvoice | null> =
{
    key:KEY,

    title:'Service Invoice',

    canRotate:false,

    async load(injector: Injector, id: number | string): Promise<ServiceInvoice | null>
    {
        try
        {
            return await firstValueFrom(injector.get(WsService).getInvoice(String(id)));
        }
        catch
        {
            return null;
        }
    },

    denyReason(data: ServiceInvoice | null): string
    {
        return data ? '' : 'The service invoice could not be loaded.';
    },

    fileName(data: ServiceInvoice | null): string
    {
        return `Service Invoice ${data?.InvoiceNo ?? ''}`.trim();
    },

    documents:
    [
        {
            key:KEY,
            title:'Service Invoice',
            icon:'fas fa-file-invoice',
            render:
                (data: ServiceInvoice | null, kit: PrintKit) =>
                    data ? serviceInvoiceHtml(data, kit) : '',
            css:SERVICE_INVOICE_CSS
        }
    ]
};
