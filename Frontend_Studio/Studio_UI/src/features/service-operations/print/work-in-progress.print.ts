//===============================================================
// Work In Progress : print source (Print Engine)
//
//   /print-viewer/workshop-wip/<branch id>~<search text>?doc=wip
//
// The parts that sit on the jobs not invoiced yet (owner 2026-11-19),
// job by job : issued from the store (less what came back) and
// bought outside for the job, at their cost. Read from the report
// work-in-progress of Service Reports, so the paper shows what the
// page shows.
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
    WsReport,
    wsDay
}
from '../shared/ws.models';


//===============================================================
// Source key (registered in shared/print/print-registry.ts)
//===============================================================

export const WORK_IN_PROGRESS_PRINT_KEY =
    'workshop-wip';

// The report and the service center it was asked for
interface WipPaper
{
    report: WsReport;
    branchName: string;
    text: string;
}

// Opens the Print Engine viewer in a new tab. '' when it opened;
// otherwise what to tell the user.
export function openWorkInProgressPrint(router: Router, branchId: number | null, text: string): string
{
    const url =
        router.serializeUrl(
            router.createUrlTree(
                ['/print-viewer', WORK_IN_PROGRESS_PRINT_KEY, `${branchId ?? 0}~${text ?? ''}`],
                { queryParams:{ doc:'wip' } }));

    // Not "noopener" : the new tab keeps this session's login
    return window.open(url, '_blank')
        ? ''
        : 'The browser blocked the print tab. Allow pop-ups for this site.';
}


//===============================================================
// The paper
//===============================================================

const WIP_CSS = `
.pv-page-inner { padding: 7mm 9mm 6mm; }
.wip-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 4mm; padding-bottom: 1.5mm; border-bottom: 1.6px solid #0f172a; }
.wip-name { font-size: 14pt; font-weight: 800; letter-spacing: 2pt; color: #0b2a5b; }
.wip-count { font-size: 9pt; font-weight: 800; color: #0b2a5b; letter-spacing: 0.6pt; }
.wip-line { display: flex; flex-wrap: wrap; gap: 0.8mm 5mm; padding: 1.6mm 0; border-bottom: 1px solid #cbd5e1; font-size: 8pt; color: #475569; }
.wip-line b { color: #0f172a; }
table.wip-lines { width: 100%; border-collapse: collapse; margin-top: 2mm; }
.wip-lines th { font-size: 6.2pt; font-weight: 700; letter-spacing: 0.4pt; text-transform: uppercase; color: #475569; text-align: left;
                padding: 1.3mm 1.2mm; border-top: 1.2px solid #0f172a; border-bottom: 1px solid #0f172a; background: #f8fafc; }
.wip-lines td { padding: 1.2mm 1.2mm; border-bottom: 1px solid #edf1f6; vertical-align: middle; font-size: 8pt; overflow-wrap: anywhere; }
.wip-no { width: 7mm; color: #94a3b8; text-align: center !important; }
.wip-r { text-align: right !important; font-variant-numeric: tabular-nums; white-space: nowrap; }
.wip-c { text-align: center !important; white-space: nowrap; }
.wip-job td { padding-top: 2.4mm; border-bottom: 1px solid #94a3b8; background: #f1f5f9; font-size: 7.8pt; color: #475569; }
.wip-job b { color: #0f172a; }
.wip-job .wip-token { font-size: 11pt; font-weight: 800; color: #15803d; margin-right: 2mm; }
.wip-job span { margin-right: 4mm; white-space: nowrap; }
.wip-part b { display: block; font-size: 8.2pt; }
.wip-part small { font-size: 6.8pt; color: #64748b; }
.wip-sub td { border-bottom: 1px solid #94a3b8; font-size: 7.8pt; font-weight: 700; color: #0b2a5b; }
.wip-close td { border-top: 1.2px solid #0f172a; border-bottom: 1.2px solid #0f172a; font-size: 8.4pt; font-weight: 800; color: #0b2a5b; }
.wip-fine { margin-top: 2.5mm; font-size: 7pt; color: #64748b; }
.wip-sign { margin-top: 12mm; }
`;

function wipHtml(paper: WipPaper, kit: PrintKit): string
{
    const e =
        (value: string | number | null | undefined): string => kit.escape(value);

    const report = paper.report;

    // the columns of the job (the same on all its rows)
    const lead = report.GroupColumns ?? 5;

    // the jobs, in the order they come
    const jobs: string[][][] = [];

    let last = '';

    for (const row of report.Rows ?? [])
    {
        const key = row.slice(0, lead).join('|');

        if (key !== last || jobs.length === 0)
        {
            jobs.push([]);
            last = key;
        }

        jobs[jobs.length - 1].push(row);
    }

    // 1118004 : the serial of the day only (004), as the big figure
    const short =
        (token: string): string => token.length > 3 && /^[0-9]+$/.test(token) ? token.substring(token.length - 3) : token;

    const totals = report.Totals ?? [];

    let no = 0;

    const body =
        jobs.map((rows, i) =>
        {
            const [jobCardNo, jobDate, token, days, customer] = rows[0];

            const sub = (report.GroupTotals ?? [])[i] ?? [];

            return `<tr class="wip-job"><td colspan="11">
<span><b class="wip-token">${e(short(token) || '-')}</b><b>${e(jobCardNo)}</b></span>
<span>Date : <b>${e(wsDay(jobDate))}</b></span>
<span>Days : <b>${e(days)}</b></span>
<span>Customer : <b>${e(customer || '-')}</b></span>
</td></tr>${
                rows.map(x => `<tr><td class="wip-no">${++no}</td><td class="wip-part"><b>${e(x[lead + 1])}</b><small>${e(x[lead])}</small></td><td>${e(x[lead + 2])}</td><td class="wip-c">${e(wsDay(x[lead + 3]))}</td><td class="wip-r">${e(x[lead + 4])}</td><td class="wip-r">${e(x[lead + 5])}</td><td class="wip-r">${e(x[lead + 6])}</td><td class="wip-r"><b>${e(x[lead + 7])}</b></td><td class="wip-r">${e(x[lead + 8])}</td><td class="wip-r">${e(x[lead + 9])}</td><td class="wip-r">${e(x[lead + 10])}</td></tr>`).join('')
            }<tr class="wip-sub"><td class="wip-no"></td><td colspan="3">Total of ${e(jobCardNo)}</td><td class="wip-r">${e(sub[lead + 4])}</td><td class="wip-r">${e(sub[lead + 5])}</td><td class="wip-r">${e(sub[lead + 6])}</td><td class="wip-r">${e(sub[lead + 7])}</td><td class="wip-r">${e(sub[lead + 8])}</td><td class="wip-r"></td><td class="wip-r">${e(sub[lead + 10])}</td></tr>`;
        }).join('');

    return `<section class="pv-flow" data-watermark="">
<div class="pv-run-head">
${kit.voucherHead(
    {
        title:'WORK IN PROGRESS',
        numberLabel:'As of',
        number:wsDay(report.To),
        meta:
        [
            { label:'Service Center', value:paper.branchName || 'All service centers' },
            { label:'Jobs', value:String(jobs.length) },
            { label:'Lines', value:String(no) },
            { label:'Cost on the Jobs', value:totals[lead + 10] ?? '' },
            ...(paper.text ? [{ label:'Search', value:paper.text }] : [])
        ],
        // read by any phone : what the sheet is and its figures
        qr:['Work In Progress', wsDay(report.To), paper.branchName || 'All service centers', `${jobs.length} job(s)`, `Cost ${totals[lead + 10] ?? ''}`].filter(x => !!x).join(' | ')
    })}
</div>
<div class="pv-body">
<table class="pv-split wip-lines">
  <thead><tr><th class="wip-no">#</th><th>Part</th><th>Issue</th><th class="wip-c">Date</th><th class="wip-r">Allocated</th><th class="wip-r">Issued</th><th class="wip-r">Returned</th><th class="wip-r">On Job</th><th class="wip-r">Remaining</th><th class="wip-r">Rate</th><th class="wip-r">Cost</th></tr></thead>
  <tbody>${body}</tbody>
  <tfoot><tr class="wip-close"><td class="wip-no"></td><td colspan="3">Grand Total</td><td class="wip-r">${e(totals[lead + 4] ?? '')}</td><td class="wip-r">${e(totals[lead + 5] ?? '')}</td><td class="wip-r">${e(totals[lead + 6] ?? '')}</td><td class="wip-r">${e(totals[lead + 7] ?? '')}</td><td class="wip-r">${e(totals[lead + 8] ?? '')}</td><td class="wip-r"></td><td class="wip-r">${e(totals[lead + 10] ?? '')}</td></tr></tfoot>
</table>
<div class="wip-fine">The jobs not invoiced yet and the parts that sit on them : issued from the store by a Material Issue Slip, less what came back, and the parts bought outside for the job (bought). Allocated : what Job Card Requirements gave the job; Remaining : what is still to issue. Cost : the FIFO cost of the issue. The stock left the store with the issue; the cost stays on Workshop WIP until the job is invoiced.${report.Cut ? ' Only the first rows are shown.' : ''}</div>
${(kit.toggles?.['signatures'] ?? true) ? `<div class="wip-sign">${kit.signatures(['Prepared By', 'Store', 'Service Manager'])}</div>` : ''}
</div>
<div class="pv-end">
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>
</section>`;
}

export const WORK_IN_PROGRESS_PRINT:
    PrintSourceDef<WipPaper | null> =
{
    key:WORK_IN_PROGRESS_PRINT_KEY,

    title:'Work In Progress',

    canRotate:false,

    async load(injector: Injector, id: number | string): Promise<WipPaper | null>
    {
        try
        {
            const ws = injector.get(WsService);

            const text = String(id);
            const cut = text.indexOf('~');

            const branchId = Number(cut < 0 ? text : text.substring(0, cut)) || null;
            const find = cut < 0 ? '' : text.substring(cut + 1);

            const report =
                await firstValueFrom(ws.getReport('work-in-progress', '', '', branchId, find));

            return {
                report,
                branchName:(report.Branches ?? []).find(x => x.Id === branchId)?.Name ?? '',
                text:find
            };
        }
        catch
        {
            return null;
        }
    },

    denyReason(data: WipPaper | null): string
    {
        return !data
            ? 'The report could not be loaded.'
            : (data.report.Rows ?? []).length === 0
                ? 'No part sits on an open job.'
                : '';
    },

    fileName(data: WipPaper | null): string
    {
        return `Work In Progress ${wsDay(data?.report.To ?? '')}`.trim();
    },

    documents:
    [
        {
            key:'wip',
            title:'Work In Progress',
            icon:'fas fa-hourglass-half',
            // Signature lines on / off, on the print page (owner
            // 2026-11-19)
            toggles:
            [
                { key:'signatures', label:'Signature Lines', on:true }
            ],
            render:
                (data: WipPaper | null, kit: PrintKit) =>
                    data ? wipHtml(data, kit) : '',
            css:WIP_CSS
        }
    ]
};
