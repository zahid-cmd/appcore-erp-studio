//===============================================================
// Parts Requisition / Parts Issue / Parts Return : print sources
// (Print Engine)
//
//   /print-viewer/parts-requisition/<publicId>?doc=parts-requisition
//   /print-viewer/parts-issue/<publicId>?doc=parts-issue
//   /print-viewer/parts-return/<publicId>?doc=parts-return
//
// The document is read from the server by its public id, so what
// prints is what was saved. The head is the head of the operational
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
    PartsDocument,
    PartsKind,
    wsDay,
    wsMoney
}
from '../shared/ws.models';


//===============================================================
// Source keys (registered in shared/print/print-registry.ts)
//===============================================================

const KEYS:
    Record<PartsKind, string> =
{
    requisition:'parts-requisition',
    issue:'parts-issue',
    return:'parts-return'
};

const TITLES:
    Record<PartsKind, string> =
{
    requisition:'Parts Requisition',
    issue:'Parts Issue',
    return:'Parts Return'
};

// Opens the Print Engine viewer in a new tab. '' when it opened;
// otherwise what to tell the user.
export function openPartsDocumentPrint(router: Router, kind: PartsKind, publicId: string): string
{
    const url =
        router.serializeUrl(
            router.createUrlTree(
                ['/print-viewer', KEYS[kind], publicId],
                { queryParams:{ doc:KEYS[kind] } }));

    // Not "noopener" : the new tab keeps this session's login
    return window.open(url, '_blank')
        ? ''
        : 'The browser blocked the print tab. Allow pop-ups for this site.';
}


//===============================================================
// The paper
//===============================================================

const PARTS_DOCUMENT_CSS = `
.pv-page-inner { padding: 7mm 9mm 6mm; }

.pdp-facts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0; margin: 2.4mm 0 0; border: 1px solid #dbe3f0; border-radius: 1.8mm; overflow: hidden; }
.pdp-facts > div { display: flex; flex-direction: column; gap: 0.5mm; min-width: 0; padding: 1.5mm 2.6mm; border-right: 1px solid #edf1f6; border-bottom: 1px solid #edf1f6; margin: 0 -1px -1px 0; }
.pdp-facts span { font-size: 6.2pt; font-weight: 700; letter-spacing: 0.6pt; text-transform: uppercase; color: #64748b; }
.pdp-facts b { font-size: 8.4pt; font-weight: 700; color: #0f172a; line-height: 1.25; overflow-wrap: anywhere; }

.pdp-title { margin: 3mm 0 1mm; font-size: 7.2pt; font-weight: 800; letter-spacing: 0.7pt; text-transform: uppercase; color: #0b2a5b; }

table.pdp-lines { width: 100%; border-collapse: collapse; }
.pdp-lines th { font-size: 6.2pt; font-weight: 700; letter-spacing: 0.4pt; text-transform: uppercase; color: #475569; text-align: left;
                padding: 1.3mm 1.2mm; border-top: 1.2px solid #0f172a; border-bottom: 1px solid #0f172a; background: #f8fafc; }
.pdp-lines td { padding: 1mm 1.2mm; border-bottom: 1px solid #edf1f6; vertical-align: top; font-size: 7.6pt; overflow-wrap: anywhere; }
.pdp-no { width: 7mm; color: #94a3b8; text-align: center !important; }
.pdp-r { text-align: right !important; font-variant-numeric: tabular-nums; white-space: nowrap; }
.pdp-close td { border-top: 1.2px solid #0f172a; border-bottom: 1.2px solid #0f172a; font-size: 7.8pt; font-weight: 800; color: #0b2a5b; }
.pdp-fine { margin-top: 3mm; font-size: 7pt; color: #64748b; line-height: 1.45; }
.pdp-sign { margin-top: 12mm; }
`;

function partsDocumentHtml(kind: PartsKind, doc: PartsDocument, kit: PrintKit): string
{
    const e =
        (value: string | number | null | undefined): string => kit.escape(value);

    const fact =
        (label: string, value: string | number | null | undefined): string =>
            `<div><span>${e(label)}</span><b>${e(value === null || value === undefined || value === '' ? '-' : value)}</b></div>`;

    const lines =
        doc.Lines ?? [];

    // A requisition shows what was issued; an issue and a return
    // show the cost
    const extraHead =
        kind === 'requisition'
            ? '<th class="pdp-r">Issued</th>'
            : '<th class="pdp-r">Cost</th>';

    const rows =
        lines.map((x, i) => `<tr><td class="pdp-no">${i + 1}</td><td>${e(x.ItemCode)}</td><td>${e(x.ItemName)}</td><td>${e(x.Note)}</td><td class="pdp-r">${e(x.Quantity)}</td><td class="pdp-r">${kind === 'requisition' ? e(x.IssuedQuantity) : wsMoney(x.Cost)}</td></tr>`).join('');

    const title =
        TITLES[kind];

    const signatures =
        kind === 'requisition' ? ['Requested By', 'Service Advisor', 'Store']
        : kind === 'issue' ? ['Issued By (Store)', 'Received By (Technician)', 'Authorized By']
        : ['Returned By (Technician)', 'Received By (Store)', 'Authorized By'];

    return `<section class="pv-flow" data-watermark="">

<div class="pv-run-head">
${kit.voucherHead(
    {
        title:title.toUpperCase(),
        numberLabel:kind === 'requisition' ? 'Requisition No' : kind === 'issue' ? 'Issue No' : 'Return No',
        number:doc.DocumentNo,
        meta:
        [
            { label:'Date', value:wsDay(doc.DocumentDate) },
            { label:'Service Center', value:doc.BranchName },
            { label:'Job Card', value:doc.JobCardNo },
            { label:kind === 'requisition' ? 'Requested By' : 'Warehouse', value:(kind === 'requisition' ? doc.PersonName : doc.WarehouseName) || '-' }
        ],
        status:doc.Status,
        qr:[title, doc.DocumentNo, doc.JobCardNo, doc.CustomerName].filter(x => !!x).join(' | ')
    })}
</div>

<div class="pv-body">

<div class="pdp-facts">
${fact('Customer', doc.CustomerName)}
${fact('Mobile', doc.Mobile)}
${fact('Model', doc.ModelName)}
${fact('Bike', doc.BikeNo)}
${kind === 'issue' ? fact('Requisition', doc.SourceNo) + fact('Technician', doc.PersonName) : ''}
${kind === 'return' ? fact('Parts Issue', doc.SourceNo) : ''}
</div>

<div class="pdp-title">Parts</div>
<table class="pv-split pdp-lines">
  <thead><tr><th class="pdp-no">#</th><th>Part No</th><th>Part</th><th>Note</th><th class="pdp-r">Qty</th>${extraHead}</tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr class="pdp-close"><td class="pdp-no"></td><td colspan="3">Total</td><td class="pdp-r">${e(doc.TotalQuantity)}</td><td class="pdp-r">${kind === 'requisition' ? '' : wsMoney(doc.TotalCost)}</td></tr></tfoot>
</table>

${doc.Remarks ? `<div class="pdp-fine">Remarks : ${e(doc.Remarks)}</div>` : ''}

<div class="pdp-sign">${kit.signatures(signatures)}</div>

</div>

<div class="pv-end">
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>

</section>`;
}

function source(kind: PartsKind): PrintSourceDef<PartsDocument | null>
{
    return {
        key:KEYS[kind],

        title:TITLES[kind],

        canRotate:false,

        async load(injector: Injector, id: number | string): Promise<PartsDocument | null>
        {
            try
            {
                return await firstValueFrom(injector.get(WsService).getPartsDocument(kind, String(id)));
            }
            catch
            {
                return null;
            }
        },

        denyReason(data: PartsDocument | null): string
        {
            return data ? '' : `The ${TITLES[kind].toLowerCase()} could not be loaded.`;
        },

        fileName(data: PartsDocument | null): string
        {
            return `${TITLES[kind]} ${data?.DocumentNo ?? ''}`.trim();
        },

        documents:
        [
            {
                key:KEYS[kind],
                title:TITLES[kind],
                icon:'fas fa-gears',
                render:
                    (data: PartsDocument | null, kit: PrintKit) =>
                        data ? partsDocumentHtml(kind, data, kit) : '',
                css:PARTS_DOCUMENT_CSS
            }
        ]
    };
}

export const PARTS_REQUISITION_PRINT = source('requisition');

export const PARTS_ISSUE_PRINT = source('issue');

export const PARTS_RETURN_PRINT = source('return');
