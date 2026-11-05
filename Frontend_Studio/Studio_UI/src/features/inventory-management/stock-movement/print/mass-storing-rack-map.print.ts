//===============================================================
// Mass Storing : Rack Overview shelf map (Print Engine).
//
//   /print-viewer/mass-storing-rack-map/<token>?doc=rack-map
//   (&orient=landscape : the default from the page)
//
// The page saves what its Rack Overview shows (racks → shelves →
// bins with their item, colour and change, the legend and the
// summary) under the token; the viewer prints it as it is. One
// card per rack : a grid of bins (bin code, item code, change
// mark), legend and summary on top. Landscape.
//===============================================================

import
{
    PrintKit,
    PrintSourceDef
}
from '../../../../shared/print/print.models';

import
{
    MASS_STORING_RACK_MAP_PRINT_KEY
}
from '../models/mass-storing.model';

import
{
    STORING_HEAD_CSS,
    storingHead
}
from './mass-storing.print';


//===============================================================
// The snapshot saved by the page
//===============================================================

export interface RackMapPrintCell
{
    // A-03-05
    Code:string;
    // Item code ('' = free)
    Item:string;
    // Fill colour ('' = none)
    Color:string;
    // new / moved / vacated / cleared / same / free
    State:string;
    // The other product type's item
    Other:boolean;
}

export interface RackMapPrintShelf
{
    Label:string;
    Prime:boolean;
    Cells:RackMapPrintCell[];
}

export interface RackMapPrintRack
{
    Title:string;
    Zone:string;
    Assignment:string;
    Used:number;
    Total:number;
    Prime:string;
    Shelves:RackMapPrintShelf[];
}

export interface RackMapPrintRequest
{
    Title:string;
    Type:string;
    Number:string;
    Date:string;
    Warehouse:string;
    Status:string;
    // "Sub category" / "Movement class" / "Change"
    ColorBy:string;
    Legend:{ Label:string; Color:string; Count:number }[];
    Summary:{ Label:string; Value:string }[];
    Racks:RackMapPrintRack[];
}

const STORAGE_PREFIX =
    'appcore.mass-storing-rack-map.';

// Saves the snapshot; returns its token (the viewer's id)
export function saveRackMapPrintRequest
(
    request:
        RackMapPrintRequest
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
        // Storage blocked : the viewer says there is nothing to print
    }

    return token;
}

function readRackMapPrintRequest
(
    token:
        number
):
    RackMapPrintRequest | null
{
    try
    {
        const text =
            localStorage.getItem(STORAGE_PREFIX + token);

        return text
            ? JSON.parse(text) as RackMapPrintRequest
            : null;
    }
    catch
    {
        return null;
    }
}


export interface RackMapPrintData
{
    request:RackMapPrintRequest | null;
}


//===============================================================
// Styles
//===============================================================

const RACK_MAP_PRINT_CSS = `
.pv-page-inner { padding: 7mm 10mm 6mm; }
${STORING_HEAD_CSS}

.rm-band { display: flex; flex-wrap: wrap; margin: 1mm 0 2mm; border: 1px solid #c7d5f0; border-radius: 1.8mm; overflow: hidden; }
.rm-band > div { display: flex; flex-direction: column; flex: 1 1 0; padding: 1mm 3mm; border-right: 1px solid #e2e8f0; min-width: 18mm; }
.rm-band > div:last-child { border-right: 0; }
.rm-band span { font-size: 5.8pt; font-weight: 700; letter-spacing: 0.7pt; text-transform: uppercase; color: #475569; }
.rm-band b { font-size: 9.4pt; font-weight: 800; color: #0b2a5b; font-variant-numeric: tabular-nums; }

.rm-legend { display: flex; flex-wrap: wrap; gap: 1mm 4mm; margin: 0 0 2.4mm; font-size: 7pt; color: #1e293b; }
.rm-legend b { font-weight: 700; color: #334155; margin-right: 1mm; }
.rm-key { display: inline-flex; align-items: center; gap: 1.2mm; white-space: nowrap; }
.rm-dot { display: inline-block; width: 2.6mm; height: 2.6mm; border-radius: 0.6mm; border: 0.6px solid rgba(15, 23, 42, 0.25); }

table.rm-pair { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; margin-bottom: 3mm; }
.rm-pair th, .rm-pair td { padding: 0; vertical-align: top; text-align: left; font-weight: normal; }
.rm-pair th.rm-col { border: 1px solid #cdd9ee; border-bottom: 0; border-radius: 1.8mm 1.8mm 0 0; overflow: hidden; }
.rm-pair td.rm-col { padding: 0.45mm 2mm; border-left: 1px solid #cdd9ee; border-right: 1px solid #cdd9ee; }
.rm-pair tbody tr:first-child td.rm-col { padding-top: 1.4mm; }
.rm-pair td.rm-last { padding-bottom: 1.6mm; border-bottom: 1px solid #cdd9ee; border-radius: 0 0 1.8mm 1.8mm; }
.rm-pair th.rm-col:empty, .rm-pair td.rm-col:empty { border: 0; }
.rm-pair .rm-shelf { margin-bottom: 0; }
.rm-racks { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3mm; }
.rm-one { grid-template-columns: minmax(0, 1fr); }
.rm-rack { border: 1px solid #cdd9ee; border-radius: 1.8mm; }
.rm-racks { align-items: start; }
.rm-head { break-after: avoid; page-break-after: avoid; display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.4mm 3mm; padding: 1.3mm 2.4mm; border-bottom: 1px solid #dbe4f3; background: #f6f9ff; }
.rm-head b { font-size: 8.4pt; font-weight: 800; color: #0b2a5b; }
.rm-head span { font-size: 6.6pt; color: #334155; }
.rm-grid { padding: 1.4mm 2mm 1.8mm; }
.rm-shelf { break-inside: avoid; page-break-inside: avoid; display: grid; grid-template-columns: 15mm minmax(0, 1fr); align-items: stretch; gap: 1.4mm; margin-bottom: 0.9mm; }
.rm-shelf:last-child { margin-bottom: 0; }
.rm-label { display: flex; align-items: center; padding: 0 1mm; border-radius: 0.8mm; font-size: 6.2pt; font-weight: 700; color: #1e293b; white-space: nowrap; }
.rm-prime .rm-label { background: #eef4ff; color: #1e3a8a; }
.rm-cells { display: flex; gap: 0.6mm; min-width: 0; }
.rm-cell { position: relative; flex: 1 1 0; min-width: 0; min-height: 6.4mm; padding: 0.4mm 0.6mm; border: 0.6px solid #cbd5e1; border-radius: 0.8mm; background: #ffffff; overflow: hidden; }
.rm-cell em { display: block; font-style: normal; font-size: 5pt; color: #334155; white-space: nowrap; overflow: hidden; }
.rm-cell strong { display: block; font-size: 5.8pt; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; }
.rm-other { background: repeating-linear-gradient(135deg, #f1f5f9 0 1.2mm, #e2e8f0 1.2mm 2.4mm) !important; }
.rm-new { box-shadow: inset 0 0 0 0.6mm #047857; }
.rm-moved { box-shadow: inset 0 0 0 0.6mm #1d4ed8; }
.rm-vacated { border: 0.8px dashed #b45309; }
.rm-cleared { border: 0.8px dashed #be123c; }
.rm-mark { position: absolute; top: 0.5mm; right: 0.6mm; font-size: 4.8pt; font-weight: 800; color: #0f172a; }
.rm-none { padding: 8mm 0; text-align: center; font-size: 8pt; color: #334155; }
`;


//===============================================================
// The map
//===============================================================

const MARKS:
    Record<string, string> =
{
    new:'N',
    moved:'M',
    vacated:'V',
    cleared:'C'
};

// Text on a coloured cell stays readable : dark text on a light
// tint of the colour
function tint
(
    color:
        string
):
    string
{
    return /^#[0-9a-f]{6}$/i.test(color) ? `${color}33` : color;
}

function mapHtml
(
    data:
        RackMapPrintData,
    kit:
        PrintKit
):
    string
{
    const r =
        data.request;

    const e =
        kit.escape;

    // The viewer's Portrait / Landscape switch (landscape : two
    // racks a row)
    const wide =
        !!kit.landscape;

    if
    (
        !r
    )
    {
        return `<section class="pv-flow${wide ? ' pv-landscape' : ''}"><div class="pv-body"><div class="rm-none">The rack map is no longer available : open Rack Overview and print again.</div></div></section>`;
    }

    const shelfHtml =
        (shelf: RackMapPrintShelf | undefined): string =>
            shelf
                ? `<div class="rm-shelf${shelf.Prime ? ' rm-prime' : ''}">
  <div class="rm-label">${e(shelf.Label)}</div>
  <div class="rm-cells">${shelf.Cells.map
                (
                    cell =>
                        `<div class="rm-cell rm-${e(cell.State)}${cell.Other ? ' rm-other' : ''}" style="${cell.Color && !cell.Other ? `background:${tint(cell.Color)}` : ''}">${MARKS[cell.State] ? `<span class="rm-mark">${MARKS[cell.State]}</span>` : ''}<em>${e(cell.Code)}</em><strong>${e(cell.Item)}</strong></div>`
                ).join('')}</div>
</div>`
                : '';

    const headHtml =
        (rack: RackMapPrintRack | undefined): string =>
            rack
                ? `<div class="rm-head"><b>${e(rack.Title)}</b><span>${e(rack.Zone)}</span><span>${e(rack.Assignment)}</span><span>${rack.Used} / ${rack.Total} bins</span>${rack.Prime ? `<span>Prime ${e(rack.Prime)}</span>` : ''}</div>`
                : '';

    // Two racks side by side (portrait and landscape) : one table
    // per pair, one row per shelf number, so the engine can break
    // pages between shelf rows (the rack titles repeat)
    const pairs:
        string[] = [];

    for
    (
        let index = 0;
        index < r.Racks.length;
        index += 2
    )
    {
        const left =
            r.Racks[index];

        const right =
            r.Racks[index + 1];

        const rows =
            Math.max(left.Shelves.length, right?.Shelves.length ?? 0);

        let body = '';

        for
        (
            let row = 0;
            row < rows;
            row++
        )
        {
            // The rack's last shelf closes its card
            const cls =
                (rack: RackMapPrintRack | undefined): string =>
                    rack && row === rack.Shelves.length - 1 ? 'rm-col rm-last' : 'rm-col';

            body += `<tr><td class="${cls(left)}">${shelfHtml(left.Shelves[row])}</td><td class="rm-gap"></td><td class="${cls(right)}">${shelfHtml(right?.Shelves[row])}</td></tr>`;
        }

        pairs.push(
            `<table class="pv-split rm-pair">
  <colgroup><col><col style="width:3mm"><col></colgroup>
  <thead><tr><th class="rm-col">${headHtml(left)}</th><th class="rm-gap"></th><th class="rm-col">${headHtml(right)}</th></tr></thead>
  <tbody>${body}</tbody>
</table>`
        );
    }

    const racks =
        pairs.join('\n');

    const metaRows:
        string[][] =
    [
        ['No', r.Number],
        ['Type', r.Type],
        ['Date', r.Date],
        ['Warehouse', r.Warehouse],
        ['Status', r.Status],
        ['Colour', r.ColorBy]
    ];

    return `<section class="pv-flow${wide ? ' pv-landscape' : ''}" data-watermark="">
<div class="pv-run-head">
${storingHead(kit, `Mass Storing · Rack Overview`, `Shelf Map · ${r.Number}`, r.Date, metaRows)}
</div>
<div class="pv-body">
<div class="rm-band">${r.Summary.map(x => `<div><span>${e(x.Label)}</span><b>${e(x.Value)}</b></div>`).join('')}</div>
<div class="rm-legend"><b>${e(r.ColorBy)} :</b>${r.Legend.map(x => `<span class="rm-key"><span class="rm-dot" style="background:${tint(x.Color)};border-color:${x.Color}"></span>${e(x.Label)} (${x.Count})</span>`).join('')}<span class="rm-key"><b>Marks :</b>N new · M moved in · V vacated · C cleared</span></div>
${racks || '<div class="rm-none">No rack to show.</div>'}
</div>
<div class="pv-end">
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>
</section>`;
}


//===============================================================
// Source
//===============================================================

export const MASS_STORING_RACK_MAP_PRINT:
    PrintSourceDef<RackMapPrintData> =
{
    key:MASS_STORING_RACK_MAP_PRINT_KEY,

    title:'Rack Overview',

    canRotate:true,

    async load
    (
        _injector:
            unknown,
        id:
            number
    ):
        Promise<RackMapPrintData>
    {
        return { request:readRackMapPrintRequest(id) };
    },

    denyReason():
        string
    {
        return '';
    },

    fileName
    (
        data:
            RackMapPrintData
    ):
        string
    {
        return `Rack Overview${data.request?.Number ? ' - ' + data.request.Number : ''}`;
    },

    documents:
    [
        {
            key:'rack-map',

            title:'Rack Overview',

            icon:'fas fa-table-cells-large',

            render:
                (data: RackMapPrintData, kit: PrintKit) =>
                    mapHtml(data, kit),

            css:
                RACK_MAP_PRINT_CSS
        }
    ]
};
