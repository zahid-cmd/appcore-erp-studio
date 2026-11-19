//===============================================================
// Location Chart of a job : print source (Print Engine)
//
//   /print-viewer/job-location-chart/<job card publicId>?doc=location-chart
//
// The pick list of the store (owner 2026-11-18) : the parts
// allocated to ONE job, with the rack, the shelf and the bin of
// Rack Management in the default warehouse of the service center.
// In the order of the walk through the store; the parts with no
// place come last. Read from the server by the public id of the job
// card, so what prints is what was saved.
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
    LocationChart,
    PartBin,
    wsDay
}
from '../shared/ws.models';


//===============================================================
// Source key (registered in shared/print/print-registry.ts)
//===============================================================

export const LOCATION_CHART_PRINT_KEY =
    'job-location-chart';

// Opens the Print Engine viewer in a new tab. '' when it opened;
// otherwise what to tell the user.
export function openLocationChartPrint(router: Router, jobCardPublicId: string): string
{
    const url =
        router.serializeUrl(
            router.createUrlTree(
                ['/print-viewer', LOCATION_CHART_PRINT_KEY, jobCardPublicId],
                { queryParams:{ doc:'location-chart' } }));

    // Not "noopener" : the new tab keeps this session's login
    return window.open(url, '_blank')
        ? ''
        : 'The browser blocked the print tab. Allow pop-ups for this site.';
}


//===============================================================
// The paper
//===============================================================

const LOCATION_CHART_CSS = `
.pv-page-inner { padding: 7mm 9mm 6mm; }
.lcp-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 4mm; padding-bottom: 1.5mm; border-bottom: 1.6px solid #0f172a; }
.lcp-name { font-size: 15pt; font-weight: 800; letter-spacing: 2.4pt; color: #0b2a5b; }
.lcp-token { display: flex; align-items: baseline; gap: 1.6mm; line-height: 1; }
.lcp-token small { font-size: 10pt; font-weight: 700; color: #64748b; }
.lcp-token b { font-size: 22pt; font-weight: 800; color: #15803d; letter-spacing: 0.6pt; }
.lcp-line { display: flex; flex-wrap: wrap; gap: 0.8mm 5mm; padding: 1.6mm 0; border-bottom: 1px solid #cbd5e1; font-size: 8pt; color: #475569; }
.lcp-line b { color: #0f172a; }
.lcp-jobs { display: flex; flex-wrap: wrap; gap: 0.8mm 5mm; padding: 1.4mm 0; border-bottom: 1px solid #cbd5e1; font-size: 7.6pt; color: #475569; }
.lcp-jobs b { color: #15803d; font-size: 9pt; }
.lcp-by { font-size: 7.6pt; line-height: 1.5; white-space: nowrap; }
.lcp-by b { color: #15803d; }
.lcp-count { font-size: 9pt; font-weight: 800; color: #0b2a5b; letter-spacing: 0.6pt; }
.lcp-title { margin: 3mm 0 1mm; font-size: 7.2pt; font-weight: 800; letter-spacing: 0.7pt; text-transform: uppercase; color: #0b2a5b; }
table.lcp-lines { width: 100%; border-collapse: collapse; }
.lcp-lines th { font-size: 6.2pt; font-weight: 700; letter-spacing: 0.4pt; text-transform: uppercase; color: #475569; text-align: left;
                padding: 1.3mm 1.2mm; border-top: 1.2px solid #0f172a; border-bottom: 1px solid #0f172a; background: #f8fafc; }
.lcp-lines td { padding: 1.5mm 1.2mm; border-bottom: 1px solid #edf1f6; vertical-align: middle; font-size: 8pt; overflow-wrap: anywhere; }
.lcp-no { width: 7mm; color: #94a3b8; text-align: center !important; }
.lcp-r { text-align: right !important; font-variant-numeric: tabular-nums; white-space: nowrap; }
.lcp-c { text-align: center !important; white-space: nowrap; }
.lcp-place { font-family: "Consolas", "Courier New", monospace; font-size: 10pt; font-weight: 700; color: #0b2a5b; white-space: nowrap; }
.lcp-place small { display: block; font-family: inherit; font-size: 6.4pt; font-weight: 600; color: #64748b; }
.lcp-place { display: block; min-height: 7mm; }
.lcp-cell { min-height: 7mm; font-size: 8.4pt; font-weight: 700; white-space: nowrap; }
.lcp-none { font-size: 7.4pt; font-weight: 600; color: #b45309; }
.lcp-part b { display: block; font-size: 8.4pt; }
.lcp-part small { font-size: 6.8pt; color: #64748b; }
.lcp-short { color: #b91c1c; font-weight: 700; }
.lcp-box { display: inline-block; width: 5mm; height: 5mm; border: 1.2px solid #0f172a; border-radius: 0.8mm; }
.lcp-close td { border-top: 1.2px solid #0f172a; border-bottom: 1.2px solid #0f172a; font-size: 7.8pt; font-weight: 800; color: #0b2a5b; }
.lcp-fine { margin-top: 2.5mm; font-size: 7pt; color: #64748b; }
.lcp-sign { margin-top: 12mm; }
`;

function chartHtml(chart: LocationChart, kit: PrintKit): string
{
    const e =
        (value: string | number | null | undefined): string => kit.escape(value);

    // a detail of the job in the one line of the head
    const bit =
        (label: string, value: string | number | null | undefined): string =>
            `<span>${e(label)} : <b>${e(value === null || value === undefined || value === '' ? '-' : value)}</b></span>`;

    const lines =
        chart.Lines ?? [];

    // a part in more bins : one under the other
    const stack =
        (values: string[]): string =>
            values.map(x => `<div class="lcp-cell">${e(x || '-')}</div>`).join('');

    // 1118004 : 1118 small, 004 big (as the serial token of the pages)
    const token = chart.SerialToken ?? '';
    const lead = token.length > 3 ? token.substring(0, token.length - 3) : '';
    const tail = token.length > 3 ? token.substring(token.length - 3) : token;

    const sum =
        (pick: (x: LocationChart['Lines'][number]) => number): number =>
            lines.reduce((total, x) => total + (Number(pick(x)) || 0), 0);

    return `<section class="pv-flow" data-watermark="">
<div class="pv-run-head">
<div class="lcp-head">
<div class="lcp-name">LOCATION CHART</div>
<div class="lcp-token"><small>${e(lead)}</small><b>${e(tail || '-')}</b></div>
</div>
<div class="lcp-line">
${bit('Job Card', chart.JobCardNo)}
${bit('Date', wsDay(chart.JobDate))}
${bit('Customer', chart.CustomerName)}
${bit('Bike', [chart.ModelName, chart.BikeNo].filter(x => !!x).join(' - '))}
${bit('Technician', chart.TechnicianName)}
${bit('Warehouse', chart.WarehouseName)}
</div>
</div>
<div class="pv-body">
<div class="lcp-title">Parts : in the order of the walk through the store</div>
<table class="pv-split lcp-lines">
  <thead><tr><th class="lcp-no">#</th><th>Location</th><th>Rack</th><th>Shelf</th><th>Bin</th><th>Part</th><th class="lcp-r">Allocated</th><th class="lcp-r">Issued</th><th class="lcp-r">To Pick</th><th class="lcp-r">Stock</th><th class="lcp-c">Picked</th></tr></thead>
  <tbody>${
        lines.length > 0
            ? lines.map((x, i) => `<tr><td class="lcp-no">${i + 1}</td>${
                (x.Bins ?? []).length > 0
                    ? `<td>${(x.Bins ?? []).map(b => `<span class="lcp-place">${e(b.Code)}<small>${e(b.Zone)}</small></span>`).join('')}</td><td>${stack((x.Bins ?? []).map(b => b.Rack))}</td><td>${stack((x.Bins ?? []).map(b => b.Shelf))}</td><td>${stack((x.Bins ?? []).map(b => b.Bin))}</td>`
                    : '<td colspan="4"><span class="lcp-none">No location set</span></td>'
              }<td class="lcp-part"><b>${e(x.ItemName)}</b><small>${e(x.ItemCode)}</small></td><td class="lcp-r">${e(x.Allocated)}</td><td class="lcp-r">${e(x.Issued)}</td><td class="lcp-r"><b>${e(x.Waiting)}</b></td><td class="lcp-r${Number(x.Stock) < Number(x.Waiting) ? ' lcp-short' : ''}">${e(x.Stock)}</td><td class="lcp-c"><span class="lcp-box"></span></td></tr>`).join('')
            : '<tr><td colspan="11" class="lcp-c">No part is allocated to this job.</td></tr>'
    }</tbody>
  <tfoot><tr class="lcp-close"><td class="lcp-no"></td><td colspan="5">Total</td><td class="lcp-r">${e(sum(x => x.Allocated))}</td><td class="lcp-r">${e(sum(x => x.Issued))}</td><td class="lcp-r">${e(sum(x => x.Waiting))}</td><td></td><td></td></tr></tfoot>
</table>
<div class="lcp-fine">Location : rack - shelf - bin (Rack Management) in ${e(chart.WarehouseName || 'the default warehouse of the service center')}. A stock in red is less than what is still to pick. This chart moves no stock : the parts go out with the Material Issue Slip.</div>
<div class="lcp-sign">${kit.signatures(['Prepared By', 'Picked By (Store)', 'Received By (Technician)'])}</div>
</div>
<div class="pv-end">
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>
</section>`;
}

export const LOCATION_CHART_PRINT:
    PrintSourceDef<LocationChart | null> =
{
    key:LOCATION_CHART_PRINT_KEY,

    title:'Location Chart',

    canRotate:false,

    async load(injector: Injector, id: number | string): Promise<LocationChart | null>
    {
        try
        {
            return await firstValueFrom(injector.get(WsService).getLocationChart(String(id)));
        }
        catch
        {
            return null;
        }
    },

    denyReason(data: LocationChart | null): string
    {
        return !data
            ? 'The location chart could not be loaded.'
            : (data.Lines ?? []).length === 0
                ? 'No part is allocated to this job card yet : save its requirement first.'
                : '';
    },

    fileName(data: LocationChart | null): string
    {
        return `Location Chart ${data?.JobCardNo ?? ''}`.trim();
    },

    documents:
    [
        {
            key:'location-chart',
            title:'Location Chart',
            icon:'fas fa-map-location-dot',
            render:
                (data: LocationChart | null, kit: PrintKit) =>
                    data ? chartHtml(data, kit) : '',
            css:LOCATION_CHART_CSS
        }
    ]
};



//===============================================================
// The combined chart (owner 2026-11-18) : the parts of SEVERAL jobs
// on one sheet, a part a line, in the order of the walk through
// the store. A line tells how much of the part every job waits for
// (by its serial token), so the parts are shared out at the counter.
//
//   /print-viewer/jobs-location-chart/<publicId,publicId,...>?doc=location-chart
//===============================================================

export const LOCATION_CHART_ALL_PRINT_KEY =
    'jobs-location-chart';

// The id of a posted slip : mis-<publicId of one of its issues>
const MIS_PREFIX =
    'mis-';

// The chart of a posted slip : the parts it issued
export function openLocationChartSlipPrint(router: Router, misPublicId: string): string
{
    const url =
        router.serializeUrl(
            router.createUrlTree(
                ['/print-viewer', LOCATION_CHART_ALL_PRINT_KEY, MIS_PREFIX + misPublicId],
                { queryParams:{ doc:'location-chart' } }));

    return window.open(url, '_blank')
        ? ''
        : 'The browser blocked the print tab. Allow pop-ups for this site.';
}

export function openLocationChartAllPrint(router: Router, jobCardPublicIds: string[]): string
{
    const url =
        router.serializeUrl(
            router.createUrlTree(
                ['/print-viewer', LOCATION_CHART_ALL_PRINT_KEY, jobCardPublicIds.join(',')],
                { queryParams:{ doc:'location-chart' } }));

    return window.open(url, '_blank')
        ? ''
        : 'The browser blocked the print tab. Allow pop-ups for this site.';
}

// A part of the combined chart
interface CombinedLine
{
    ItemCode: string;
    ItemName: string;
    Zone: string;
    Location: string;
    Bins: PartBin[];
    Waiting: number;
    Stock: number;
    // the jobs that wait for it : serial token, how much
    Jobs: { Token: string; Quantity: number }[];
}

function combinedLines(charts: LocationChart[]): CombinedLine[]
{
    const map = new Map<string, CombinedLine>();

    for (const chart of charts)
    {
        for (const x of chart.Lines ?? [])
        {
            const waiting = Number(x.Waiting) || 0;

            // nothing left to pick for this job
            if (waiting <= 0)
            {
                continue;
            }

            const key = `${x.ItemKind}:${x.ItemId}`;

            let line = map.get(key);

            if (!line)
            {
                line =
                {
                    ItemCode:x.ItemCode,
                    ItemName:x.ItemName,
                    Zone:x.Zone ?? '',
                    Location:x.Location ?? '',
                    Bins:x.Bins ?? [],
                    Waiting:0,
                    Stock:Number(x.Stock) || 0,
                    Jobs:[]
                };

                map.set(key, line);
            }

            line.Waiting += waiting;
            line.Jobs.push({ Token:chart.SerialToken || chart.JobCardNo, Quantity:waiting });
        }
    }

    // the walk through the store; no place : last
    return [...map.values()].sort((a, b) =>
        (a.Location ? 0 : 1) - (b.Location ? 0 : 1)
        || a.Zone.localeCompare(b.Zone)
        || a.Location.localeCompare(b.Location)
        || a.ItemName.localeCompare(b.ItemName));
}

function combinedHtml(charts: LocationChart[], kit: PrintKit): string
{
    const e =
        (value: string | number | null | undefined): string => kit.escape(value);

    const stack =
        (values: string[]): string =>
            values.map(x => `<div class="lcp-cell">${e(x || '-')}</div>`).join('');

    // 1118004 : the serial of the day only (004), as the big figure
    const short =
        (token: string): string => token.length > 3 && /^[0-9]+$/.test(token) ? token.substring(token.length - 3) : token;

    const lines = combinedLines(charts);

    // a posted slip : the quantities are what it issued
    const misNo = charts.find(x => !!x.MisNo)?.MisNo ?? '';
    const word = misNo ? 'Issued' : 'To Pick';

    const total = lines.reduce((sum, x) => sum + x.Waiting, 0);

    const warehouses = [...new Set(charts.map(x => x.WarehouseName).filter(x => !!x))].join(', ');

    return `<section class="pv-flow" data-watermark="">
<div class="pv-run-head">
<div class="lcp-head">
<div class="lcp-name">LOCATION CHART</div>
<div class="lcp-count">${charts.length} ${charts.length === 1 ? 'JOB' : 'JOBS'}  -  ${lines.length} ${lines.length === 1 ? 'PART' : 'PARTS'}</div>
</div>
<div class="lcp-line">
<span>Service Center : <b>${e([...new Set(charts.map(x => x.BranchName).filter(x => !!x))].join(', ') || '-')}</b></span>
<span>Warehouse : <b>${e(warehouses || '-')}</b></span>
${misNo ? `<span>MIS No : <b>${e(misNo)}</b></span>` : ''}
<span>${word} : <b>${e(total)}</b></span>
</div>
<div class="lcp-jobs">
${charts.map(x => `<span><b>${e(short(x.SerialToken || ''))}</b>  ${e(x.JobCardNo)}  -  ${e(x.CustomerName)}${x.TechnicianName ? `  (${e(x.TechnicianName)})` : ''}</span>`).join('')}
</div>
</div>
<div class="pv-body">
<div class="lcp-title">Parts of all the jobs : in the order of the walk through the store</div>
<table class="pv-split lcp-lines">
  <thead><tr><th class="lcp-no">#</th><th>Location</th><th>Rack</th><th>Shelf</th><th>Bin</th><th>Part</th><th>Job : Qty</th><th class="lcp-r">${word}</th><th class="lcp-r">Stock</th><th class="lcp-c">Picked</th></tr></thead>
  <tbody>${
        lines.length > 0
            ? lines.map((x, i) => `<tr><td class="lcp-no">${i + 1}</td>${
                x.Bins.length > 0
                    ? `<td>${x.Bins.map(b => `<span class="lcp-place">${e(b.Code)}<small>${e(b.Zone)}</small></span>`).join('')}</td><td>${stack(x.Bins.map(b => b.Rack))}</td><td>${stack(x.Bins.map(b => b.Shelf))}</td><td>${stack(x.Bins.map(b => b.Bin))}</td>`
                    : '<td colspan="4"><span class="lcp-none">No location set</span></td>'
              }<td class="lcp-part"><b>${e(x.ItemName)}</b><small>${e(x.ItemCode)}</small></td><td class="lcp-by">${x.Jobs.map(j => `<div><b>${e(short(j.Token))}</b> : ${e(j.Quantity)}</div>`).join('')}</td><td class="lcp-r"><b>${e(x.Waiting)}</b></td><td class="lcp-r${!misNo && x.Stock < x.Waiting ? ' lcp-short' : ''}">${e(x.Stock)}</td><td class="lcp-c"><span class="lcp-box"></span></td></tr>`).join('')
            : '<tr><td colspan="10" class="lcp-c">Nothing is left to pick for these jobs.</td></tr>'
    }</tbody>
  <tfoot><tr class="lcp-close"><td class="lcp-no"></td><td colspan="6">Total</td><td class="lcp-r">${e(total)}</td><td></td><td></td></tr></tfoot>
</table>
<div class="lcp-fine">${misNo
    ? `Job : Qty - the serial token of the job and what ${e(misNo)} issued to it. Location : rack - shelf - bin (Rack Management). Stock : what the warehouse holds now, after the issue.`
    : 'Job : Qty - the serial token of the job and what it still waits for. Location : rack - shelf - bin (Rack Management). A stock in red is less than what is to pick. This chart moves no stock : the parts go out with the Material Issue Slip.'}</div>
<div class="lcp-sign">${kit.signatures(['Prepared By', 'Picked By (Store)', 'Checked By'])}</div>
</div>
<div class="pv-end">
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>
</section>`;
}

export const LOCATION_CHART_ALL_PRINT:
    PrintSourceDef<LocationChart[] | null> =
{
    key:LOCATION_CHART_ALL_PRINT_KEY,

    title:'Location Chart',

    canRotate:false,

    async load(injector: Injector, id: number | string): Promise<LocationChart[] | null>
    {
        try
        {
            const ws = injector.get(WsService);

            // A posted slip (mis-<publicId>) : what the slip issued,
            // job by job - not what the jobs still wait for
            if (String(id).startsWith(MIS_PREFIX))
            {
                const mis = await firstValueFrom(ws.getMis(String(id).substring(MIS_PREFIX.length)));

                return await Promise.all((mis.Jobs ?? []).map(async job =>
                {
                    const chart = await firstValueFrom(ws.getLocationChart(job.JobCardPublicId));

                    const places = new Map((chart.Places ?? []).map(x => [`${x.ItemKind}:${x.ItemId}`, x]));

                    const stock = new Map((chart.Lines ?? []).map(x => [`${x.ItemKind}:${x.ItemId}`, Number(x.Stock) || 0]));

                    return {
                        ...chart,
                        MisNo:mis.MisNo,
                        Lines:(job.Lines ?? []).map(x =>
                        {
                            const key = `${x.ItemKind}:${x.ItemId}`;
                            const place = places.get(key);
                            const quantity = Number(x.Quantity) || 0;

                            return {
                                ItemKind:x.ItemKind,
                                ItemId:x.ItemId,
                                ItemCode:x.ItemCode,
                                ItemName:x.ItemName,
                                Zone:place?.Zone ?? '',
                                Rack:place?.Rack ?? '',
                                Location:place?.Location ?? '',
                                Bins:place?.Bins ?? [],
                                Allocated:quantity,
                                Issued:quantity,
                                Waiting:quantity,
                                Stock:stock.get(key) ?? 0
                            };
                        })
                    };
                }));
            }

            const ids = String(id).split(',').map(x => x.trim()).filter(x => !!x);

            return await Promise.all(ids.map(x => firstValueFrom(ws.getLocationChart(x))));
        }
        catch
        {
            return null;
        }
    },

    denyReason(data: LocationChart[] | null): string
    {
        return !data || data.length === 0
            ? 'The location chart could not be loaded.'
            : data.every(x => (x.Lines ?? []).length === 0)
                ? 'No part is allocated to these job cards yet.'
                : '';
    },

    fileName(data: LocationChart[] | null): string
    {
        return `Location Chart ${(data ?? []).length} jobs`;
    },

    documents:
    [
        {
            key:'location-chart',
            title:'Location Chart',
            icon:'fas fa-map-location-dot',
            render:
                (data: LocationChart[] | null, kit: PrintKit) =>
                    data ? combinedHtml(data, kit) : '',
            css:LOCATION_CHART_CSS
        }
    ]
};
