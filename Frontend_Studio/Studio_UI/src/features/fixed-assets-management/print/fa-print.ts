//===============================================================
// Fixed Assets : print source (Print Engine)
//
//   /print-viewer/fa-report/<token>?doc=report
//   (&orient=landscape : the viewer's Portrait / Landscape switch)
//
// A Fixed Assets page saves what it has on screen (a document or a
// list, as a grid) under a token and opens the Print Engine viewer;
// the source reads it back. Nothing is asked from the server again :
// what prints is what the page showed. Excel : the viewer's Excel
// button (the same rows).
//
// The head is the head of the operational documents (vouchers,
// invoices) : logo | company | QR code, the title ribbon with the
// document number, the info strip with the status stamp.
//
// Every print opens on PORTRAIT A4; the viewer's switch turns a
// wide one to landscape.
//
//   saveFaReport(doc)   title, number, the facts, totals, columns
//                       and rows
//   openFaPrint(...)    opens the viewer in a new tab
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
    ExcelCell,
    ExcelSheet,
    PrintKit,
    PrintSourceDef
}
from '../../../shared/print/print.models';


//===============================================================
// Source key (registered in shared/print/print-registry.ts)
//===============================================================

export const FA_REPORT_PRINT_KEY =
    'fa-report';


//===============================================================
// What a page saves
//===============================================================

export interface FaPrintColumn
{
    header: string;
    // text (left), center, num (right), money (right)
    kind: 'text' | 'center' | 'num' | 'money';
    // A total column : shown strong
    strong?: boolean;
}

// A document or a list as a plain grid (cells as the screen shows
// them)
export interface FaReportDoc
{
    // 'Asset Acquisition'
    title: string;
    // 'Uttara Showroom' : who / what it is about
    subtitle: string;
    // The number on the title ribbon ('FAQ-0001') and its label
    // ('Acquisition No'). Left out : the first fact that looks like
    // a document number is taken; a list shows its subtitle there.
    number?: string;
    numberLabel?: string;
    // The stamp of the info strip (Draft / Posted / Closed ...).
    // Left out : the fact labelled Status is taken.
    status?: string;
    // The facts, a label and a value each (the info strip)
    meta?: { label: string; value: string }[];
    // The totals (a band above the table)
    band?: { label: string; value: string }[];
    columns: FaPrintColumn[];
    rows: string[][];
    // Totals under the rows (null = none)
    footer?: string[] | null;
    // A small line under the table
    note?: string;
    // (kept for the pages that say it : the print still opens on
    // portrait)
    landscape?: boolean;
}


//===============================================================
// Saved by the page, read by the viewer
//===============================================================

const STORAGE_PREFIX =
    'appcore.fa-print.';

// Requests older than a day go (the viewer opens at once)
function sweep():
    void
{
    try
    {
        const limit =
            Date.now() - 24 * 60 * 60 * 1000;

        for (let i = localStorage.length - 1; i >= 0; i--)
        {
            const key = localStorage.key(i) ?? '';

            if (key.startsWith(STORAGE_PREFIX) && Number(key.substring(STORAGE_PREFIX.length)) < limit)
            {
                localStorage.removeItem(key);
            }
        }
    }
    catch
    {
        // Storage blocked : nothing to sweep
    }
}

// 0 when the storage is blocked or full (nothing can be printed)
export function saveFaReport(doc: FaReportDoc): number
{
    sweep();

    const token =
        Date.now();

    try
    {
        localStorage.setItem(STORAGE_PREFIX + token, JSON.stringify(doc));

        return token;
    }
    catch
    {
        return 0;
    }
}

function read(id: number | string): FaReportDoc | null
{
    try
    {
        const text =
            localStorage.getItem(STORAGE_PREFIX + Number(id));

        return text ? JSON.parse(text) as FaReportDoc : null;
    }
    catch
    {
        return null;
    }
}

// Opens the Print Engine viewer in a new tab, on portrait. '' when
// it opened; otherwise what to tell the user. (The last argument is
// what the pages passed for the HR report : it is not used, every
// Fixed Assets print opens on portrait.)
export function openFaPrint
(
    router: Router,
    key: string,
    token: number,
    doc: string,
    _landscape = false
):
    string
{
    if (!token)
    {
        return 'The browser did not let the page hand the document to the print viewer (its storage is blocked or full).';
    }

    const url =
        router.serializeUrl(
            router.createUrlTree(
                ['/print-viewer', key, token],
                { queryParams:{ doc:'report' } }));

    // Not "noopener" : the new tab keeps this session's login
    return window.open(url, '_blank')
        ? ''
        : 'The browser blocked the print tab. Allow pop-ups for this site.';
}


//===============================================================
// The head : number, status and facts of the document
//===============================================================

// FAQ-0001, FDR-0003, FA-01-002-00001 ...
const DOCUMENT_NO =
    /^[A-Z]{2,4}-[0-9A-Z]+(-[0-9A-Z]+)*$/;

interface FaHead
{
    number: string;
    numberLabel: string;
    status: string;
    meta: { label: string; value: string }[];
}

function headOf(doc: FaReportDoc): FaHead
{
    let meta =
        (doc.meta ?? []).filter(x => !!x.value);

    let status =
        (doc.status ?? '').trim();

    if (!status)
    {
        const found =
            meta.find(x => x.label.trim().toLowerCase() === 'status');

        if (found)
        {
            status = found.value;
            meta = meta.filter(x => x !== found);
        }
    }

    let number =
        (doc.number ?? '').trim();

    let numberLabel =
        (doc.numberLabel ?? '').trim();

    if (!number)
    {
        // a document : the first fact that is its number
        const found =
            meta.find(x => DOCUMENT_NO.test(x.value.trim()));

        if (found)
        {
            number = found.value.trim();
            numberLabel = numberLabel || `${found.label} No`;
            meta = meta.filter(x => x !== found);

            if (doc.subtitle)
            {
                meta = [{ label:'For', value:doc.subtitle }, ...meta];
            }
        }
        else
        {
            // "FA-01-002-0001 \u00b7 Chairs" : the number, then its name
            const parts =
                (doc.subtitle ?? '').split(' \u00b7 ').map(x => x.trim()).filter(x => !!x);

            if (parts.length > 0 && DOCUMENT_NO.test(parts[0]))
            {
                number = parts[0];
                numberLabel = numberLabel || `${doc.title} No`;

                if (parts.length > 1)
                {
                    meta = [{ label:'Name', value:parts.slice(1).join(' \u00b7 ') }, ...meta];
                }
            }
            else
            {
                // a list : what it lists
                number = doc.subtitle || 'All';
                numberLabel = numberLabel || 'Showing';
            }
        }
    }
    else if (doc.subtitle)
    {
        meta = [{ label:'For', value:doc.subtitle }, ...meta];
    }

    return {
        number,
        numberLabel:numberLabel || 'No',
        status,
        meta
    };
}


//===============================================================
// Report : a grid, cut into A4 pages by the engine
//===============================================================

const REPORT_CSS = `
.pv-page-inner { padding: 7mm 9mm 6mm; }
.fap-facts { display: grid; gap: 0; margin: 2.4mm 0 0; border: 1px solid #dbe3f0; border-radius: 1.8mm; overflow: hidden; }
.fap-facts > div { display: flex; flex-direction: column; gap: 0.5mm; min-width: 0; padding: 1.6mm 2.6mm; border-right: 1px solid #edf1f6; border-bottom: 1px solid #edf1f6; margin: 0 -1px -1px 0; }
.fap-facts span { font-size: 6.2pt; font-weight: 700; letter-spacing: 0.6pt; text-transform: uppercase; color: #64748b; }
.fap-facts b { font-size: 8.4pt; font-weight: 700; color: #0f172a; line-height: 1.25; overflow-wrap: anywhere; }
.fap-band { display: flex; margin: 2.4mm 0 2.4mm; border: 1px solid #c7d5f0; border-radius: 1.8mm; overflow: hidden; }
.fap-band > div { display: flex; flex: 1 1 0; flex-direction: column; min-width: 0; padding: 1.1mm 3mm; border-right: 1px solid #e2e8f0; }
.fap-band > div:last-child { border-right: 0; }
.fap-band span { font-size: 6pt; font-weight: 700; letter-spacing: 0.7pt; text-transform: uppercase; color: #64748b; }
.fap-band b { font-size: 9.2pt; font-weight: 800; color: #0b2a5b; font-variant-numeric: tabular-nums; white-space: nowrap; }
table.fap-lines { width: 100%; margin-top: 2mm; border-collapse: collapse; }
.fap-lines th { font-size: 6.2pt; font-weight: 700; letter-spacing: 0.4pt; text-transform: uppercase; color: #475569; text-align: left;
                padding: 1.3mm 1.2mm; border-top: 1.2px solid #0f172a; border-bottom: 1px solid #0f172a; background: #f8fafc; }
.fap-lines td { padding: 1mm 1.2mm; border-bottom: 1px solid #edf1f6; vertical-align: top; font-size: 7.4pt; overflow-wrap: anywhere; }
.fap-lines.fap-wide th { font-size: 5.4pt; padding: 1.1mm 0.8mm; letter-spacing: 0.2pt; }
.fap-lines.fap-wide td { font-size: 6.3pt; padding: 0.9mm 0.8mm; }
.fap-no { width: 7mm; color: #94a3b8; text-align: center !important; }
.fap-c { text-align: center !important; }
.fap-r { text-align: right !important; font-variant-numeric: tabular-nums; white-space: nowrap; }
.fap-strong { font-weight: 800; color: #0b2a5b; }
.fap-lines tbody tr:last-child td { border-bottom: 0; }
.fap-close td { padding-top: 1.5mm; padding-bottom: 1.5mm; border-top: 1.2px solid #0f172a; border-bottom: 1.2px solid #0f172a; font-size: 7.8pt; font-weight: 800; color: #0b2a5b; }
.fap-lines.fap-wide .fap-close td { font-size: 6.6pt; }
.fap-none { padding: 6mm 0 !important; color: #64748b; text-align: center; }
.fap-fine { margin-top: 2.5mm; font-size: 7pt; color: #64748b; }
`;

function cellClass(column: FaPrintColumn): string
{
    const kind =
        column.kind === 'center' ? 'fap-c' : column.kind === 'text' ? '' : 'fap-r';

    return [kind, column.strong ? 'fap-strong' : ''].filter(Boolean).join(' ');
}

function reportHtml
(
    doc: FaReportDoc,
    kit: PrintKit,
    landscape: boolean
):
    string
{
    const e =
        (value: string | number | null | undefined): string => kit.escape(value);

    const cls =
        (column: FaPrintColumn): string =>
        {
            const name = cellClass(column);

            return name ? ` class="${name}"` : '';
        };

    const line =
        (cells: string[], tag: string): string =>
            cells.map((cell, i) => `<${tag}${cls(doc.columns[i])}>${e(cell)}</${tag}>`).join('');

    const head =
        headOf(doc);

    const band =
        doc.band ?? [];

    // The info strip holds a few facts on one line; the others go in
    // a grid under it, a label over its value (a strip of fourteen
    // facts breaks every value letter by letter)
    const perRow =
        landscape ? 6 : 4;

    const strip =
        head.meta.slice(0, perRow);

    const facts =
        head.meta.slice(perRow);

    // many columns : smaller type so the table fits the page
    const wide =
        doc.columns.length > (landscape ? 13 : 7);

    return `<section class="pv-flow${landscape ? ' pv-landscape' : ''}" data-watermark="">
<div class="pv-run-head">
${kit.voucherHead(
    {
        title:doc.title.toUpperCase(),
        numberLabel:head.numberLabel,
        number:head.number,
        meta:strip,
        status:head.status,
        // read by any phone : what the paper is
        qr:[doc.title, head.number, doc.subtitle].filter(x => !!x).join(' | ')
    })}
</div>
<div class="pv-body">
${facts.length > 0 ? `<div class="fap-facts" style="grid-template-columns:repeat(${perRow}, minmax(0, 1fr))">${facts.map(x => `<div><span>${e(x.label)}</span><b>${e(x.value)}</b></div>`).join('')}</div>` : ''}
${band.length > 0 ? `<div class="fap-band">${band.map(x => `<div><span>${e(x.label)}</span><b>${e(x.value)}</b></div>`).join('')}</div>` : ''}
<table class="pv-split fap-lines${wide ? ' fap-wide' : ''}">
  <thead><tr><th class="fap-no">#</th>${doc.columns.map(c => `<th${cls(c)}>${e(c.header)}</th>`).join('')}</tr></thead>
  <tbody>${
        doc.rows.length > 0
            ? doc.rows.map((row, i) => `<tr><td class="fap-no">${i + 1}</td>${line(row, 'td')}</tr>`).join('')
            : `<tr><td colspan="${doc.columns.length + 1}" class="fap-none">Nothing to show.</td></tr>`
    }</tbody>
  ${doc.footer ? `<tfoot><tr class="fap-close"><td class="fap-no"></td>${line(doc.footer, 'td')}</tr></tfoot>` : ''}
</table>
${doc.note ? `<div class="fap-fine">${e(doc.note)}</div>` : ''}
</div>
<div class="pv-end">
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>
</section>`;
}

// '12,500.00' : 12500 (text stays text)
function excelCell(value: string, column: FaPrintColumn, bold: boolean): ExcelCell
{
    if (column.kind === 'money' || column.kind === 'num')
    {
        const number =
            Number(String(value ?? '').replace(/,/g, ''));

        if (value !== '' && Number.isFinite(number))
        {
            return { v:number, s:column.kind === 'money' ? (bold ? 'boldMoney' : 'money') : (bold ? 'bold' : 'normal') };
        }
    }

    return { v:value ?? '', s:bold ? 'bold' : 'normal' };
}

function reportSheet(doc: FaReportDoc, kit: PrintKit): ExcelSheet
{
    const rows:
        ExcelCell[][] =
    [
        [{ v:kit.company?.CompanyName ?? '', s:'title' }],
        [{ v:doc.title, s:'bold' }],
        [{ v:doc.subtitle, s:'muted' }],
        ...(doc.meta ?? []).filter(x => x.value).map(x => [{ v:`${x.label} : ${x.value}`, s:'muted' } as ExcelCell]),
        [],
        [{ v:'#', s:'bold' }, ...doc.columns.map(c => ({ v:c.header, s:'bold' }) as ExcelCell)],
        ...doc.rows.map((row, i) => [i + 1, ...row.map((cell, c) => excelCell(cell, doc.columns[c], false))] as ExcelCell[]),
        ...(doc.footer ? [['', ...doc.footer.map((cell, c) => excelCell(cell, doc.columns[c], true))] as ExcelCell[]] : [])
    ];

    return {
        name:doc.title.replace(/[\\/?*\[\]:]/g, ' ').slice(0, 31),
        rows,
        columns:[5, ...doc.columns.map(c => c.kind === 'text' ? 26 : c.kind === 'money' ? 15 : 12)]
    };
}

export const FA_REPORT_PRINT:
    PrintSourceDef<FaReportDoc | null> =
{
    key:FA_REPORT_PRINT_KEY,

    title:'Fixed Assets',

    canRotate:true,

    async load(_injector: Injector, id: number | string): Promise<FaReportDoc | null>
    {
        return read(id);
    },

    denyReason(data: FaReportDoc | null): string
    {
        return data
            ? ''
            : 'The document is no longer waiting to be printed : open the page and press Print again.';
    },

    fileName(data: FaReportDoc | null): string
    {
        return data ? `${data.title} - ${data.number || data.subtitle}`.replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 120) : 'Fixed Assets';
    },

    documents:
    [
        {
            key:'report',
            title:'Document',
            icon:'fas fa-file-lines',
            render:
                (data: FaReportDoc | null, kit: PrintKit) =>
                    data ? reportHtml(data, kit, !!kit.landscape) : '',
            css:REPORT_CSS,
            excel:
                (data: FaReportDoc | null, kit: PrintKit) =>
                    reportSheet(data ?? { title:'Fixed Assets', subtitle:'', columns:[], rows:[] }, kit)
        }
    ]
};
