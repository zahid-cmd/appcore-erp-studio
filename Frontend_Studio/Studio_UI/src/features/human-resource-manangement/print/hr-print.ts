//===============================================================
// Human Resource : print sources (Print Engine)
//
//   /print-viewer/hr-report/<token>?doc=report
//   /print-viewer/hr-payslip/<token>?doc=payslips
//   (&orient=landscape : the viewer's Portrait / Landscape switch)
//
// An HR page saves what it has on screen (a report as a grid, or
// the payslips of a salary sheet) under a token and opens the
// Print Engine viewer; the source reads it back. Nothing is asked
// from the server again : what prints is what the page showed.
// Excel : the viewer's Excel button (the same rows).
//
//   saveHrReport(doc)     a report : title, the filters, totals,
//                         columns and rows
//   saveHrPayslips(doc)   the payslips of a salary sheet
//   openHrPrint(...)      opens the viewer in a new tab
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


export const HR_REPORT_PRINT_KEY =
    'hr-report';

export const HR_PAYSLIP_PRINT_KEY =
    'hr-payslip';


//===============================================================
// What a page saves
//===============================================================

export interface HrPrintColumn
{
    header: string;
    // text (left), center, num (right), money (right)
    kind: 'text' | 'center' | 'num' | 'money';
    // A total column : shown strong
    strong?: boolean;
}

// A report as a plain grid (cells as the screen shows them)
export interface HrReportDoc
{
    // 'Staff List'
    title: string;
    // 'Uttara Showroom · Active'
    subtitle: string;
    // The filters, a label and a value each (under the header)
    meta?: { label: string; value: string }[];
    // The totals of the report (a band above the table)
    band?: { label: string; value: string }[];
    columns: HrPrintColumn[];
    rows: string[][];
    // Totals under the rows (null = none)
    footer?: string[] | null;
    // A small line under the table
    note?: string;
    // Wide reports open on landscape A4
    landscape?: boolean;
}

export interface HrPayslip
{
    employeeName: string;
    employeeCode: string;
    designation: string;
    department: string;
    monthDays: string;
    payDays: string;
    unpaidLate: string;
    status: string;
    paidOn: string;
    // label, Tk
    earnings: [string, string][];
    totalEarnings: string;
    deductions: [string, string][];
    totalDeductions: string;
    netPay: string;
    remarks: string;
}

export interface HrPayslipDoc
{
    // 'November 2026'
    month: string;
    branch: string;
    // 'SAL-2026-11-001 · Posted'
    sheet: string;
    slips: HrPayslip[];
}


//===============================================================
// Saved by the page, read by the viewer
//===============================================================

const STORAGE_PREFIX =
    'appcore.hr-print.';

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
function save(doc: unknown): number
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

function read<T>(id: number | string): T | null
{
    try
    {
        const text =
            localStorage.getItem(STORAGE_PREFIX + Number(id));

        return text ? JSON.parse(text) as T : null;
    }
    catch
    {
        return null;
    }
}

export function saveHrReport(doc: HrReportDoc): number
{
    return save(doc);
}

export function saveHrPayslips(doc: HrPayslipDoc): number
{
    return save(doc);
}

// Opens the Print Engine viewer in a new tab. '' when it opened;
// otherwise what to tell the user.
export function openHrPrint
(
    router: Router,
    key: string,
    token: number,
    doc: string,
    landscape = false
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
                { queryParams:landscape ? { doc, orient:'landscape' } : { doc } }));

    // Not "noopener" : the new tab keeps this session's login
    return window.open(url, '_blank')
        ? ''
        : 'The browser blocked the print tab. Allow pop-ups for this site.';
}


//===============================================================
// Report : a grid, cut into A4 pages by the engine
//===============================================================

const REPORT_CSS = `
.pv-page-inner { padding: 7mm 9mm 6mm; }
.hrp-meta { display: flex; flex-wrap: wrap; gap: 0.6mm 5mm; margin-top: 2mm; padding: 1.2mm 0 1.6mm; border-top: 1.2px solid #1e3a8a; font-size: 7.4pt; color: #0f172a; font-weight: 600; }
.hrp-meta i { margin-right: 1.4mm; font-style: normal; font-size: 6pt; font-weight: 700; letter-spacing: 0.6pt; text-transform: uppercase; color: #94a3b8; }
.hrp-band { display: flex; margin: 0 0 2.4mm; border: 1px solid #c7d5f0; border-radius: 1.8mm; overflow: hidden; }
.hrp-band > div { display: flex; flex: 1 1 0; flex-direction: column; min-width: 0; padding: 1.1mm 3mm; border-right: 1px solid #e2e8f0; }
.hrp-band > div:last-child { border-right: 0; }
.hrp-band span { font-size: 6pt; font-weight: 700; letter-spacing: 0.7pt; text-transform: uppercase; color: #64748b; }
.hrp-band b { font-size: 9.2pt; font-weight: 800; color: #0b2a5b; font-variant-numeric: tabular-nums; white-space: nowrap; }
table.hrp-lines { width: 100%; border-collapse: collapse; }
.hrp-lines th { font-size: 6.2pt; font-weight: 700; letter-spacing: 0.4pt; text-transform: uppercase; color: #475569; text-align: left;
                padding: 1.3mm 1.2mm; border-top: 1.2px solid #0f172a; border-bottom: 1px solid #0f172a; background: #f8fafc; }
.hrp-lines td { padding: 1mm 1.2mm; border-bottom: 1px solid #edf1f6; vertical-align: top; font-size: 7.4pt; overflow-wrap: anywhere; }
.hrp-lines.hrp-wide th { font-size: 5.6pt; padding: 1.1mm 0.9mm; }
.hrp-lines.hrp-wide td { font-size: 6.6pt; padding: 0.9mm 0.9mm; }
.hrp-no { width: 7mm; color: #94a3b8; text-align: center !important; }
.hrp-c { text-align: center !important; }
.hrp-r { text-align: right !important; font-variant-numeric: tabular-nums; white-space: nowrap; }
.hrp-strong { font-weight: 800; color: #0b2a5b; }
.hrp-lines tbody tr:last-child td { border-bottom: 0; }
.hrp-close td { padding-top: 1.5mm; padding-bottom: 1.5mm; border-top: 1.2px solid #0f172a; border-bottom: 1.2px solid #0f172a; font-size: 7.8pt; font-weight: 800; color: #0b2a5b; }
.hrp-none { padding: 6mm 0 !important; color: #64748b; text-align: center; }
.hrp-fine { margin-top: 2.5mm; font-size: 7pt; color: #64748b; }
`;

function cellClass(column: HrPrintColumn): string
{
    const kind =
        column.kind === 'center' ? 'hrp-c' : column.kind === 'text' ? '' : 'hrp-r';

    return [kind, column.strong ? 'hrp-strong' : ''].filter(Boolean).join(' ');
}

function reportHtml
(
    doc: HrReportDoc,
    kit: PrintKit,
    landscape: boolean
):
    string
{
    const e =
        (value: string | number | null | undefined): string => kit.escape(value);

    const cls =
        (column: HrPrintColumn): string =>
        {
            const name = cellClass(column);

            return name ? ` class="${name}"` : '';
        };

    const line =
        (cells: string[], tag: string): string =>
            cells.map((cell, i) => `<${tag}${cls(doc.columns[i])}>${e(cell)}</${tag}>`).join('');

    const meta =
        (doc.meta ?? []).filter(x => x.value);

    const band =
        doc.band ?? [];

    // many columns : smaller type so the table fits the page
    const wide =
        doc.columns.length > (landscape ? 13 : 8);

    return `<section class="pv-flow${landscape ? ' pv-landscape' : ''}" data-watermark="">
<div class="pv-run-head">
${kit.header(doc.title, doc.subtitle)}
${meta.length > 0 ? `<div class="hrp-meta">${meta.map(x => `<span><i>${e(x.label)}</i>${e(x.value)}</span>`).join('')}</div>` : ''}
</div>
<div class="pv-body">
${band.length > 0 ? `<div class="hrp-band">${band.map(x => `<div><span>${e(x.label)}</span><b>${e(x.value)}</b></div>`).join('')}</div>` : ''}
<table class="pv-split hrp-lines${wide ? ' hrp-wide' : ''}">
  <thead><tr><th class="hrp-no">#</th>${doc.columns.map(c => `<th${cls(c)}>${e(c.header)}</th>`).join('')}</tr></thead>
  <tbody>${
        doc.rows.length > 0
            ? doc.rows.map((row, i) => `<tr><td class="hrp-no">${i + 1}</td>${line(row, 'td')}</tr>`).join('')
            : `<tr><td colspan="${doc.columns.length + 1}" class="hrp-none">Nothing to show.</td></tr>`
    }</tbody>
  ${doc.footer ? `<tfoot><tr class="hrp-close"><td class="hrp-no"></td>${line(doc.footer, 'td')}</tr></tfoot>` : ''}
</table>
${doc.note ? `<div class="hrp-fine">${e(doc.note)}</div>` : ''}
</div>
<div class="pv-end">
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>
</section>`;
}

// '12,500.00' : 12500 (text stays text)
function excelCell(value: string, column: HrPrintColumn, bold: boolean): ExcelCell
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

function reportSheet(doc: HrReportDoc, kit: PrintKit): ExcelSheet
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

export const HR_REPORT_PRINT:
    PrintSourceDef<HrReportDoc | null> =
{
    key:HR_REPORT_PRINT_KEY,

    title:'HR Report',

    canRotate:true,

    async load(_injector: Injector, id: number | string): Promise<HrReportDoc | null>
    {
        return read<HrReportDoc>(id);
    },

    denyReason(data: HrReportDoc | null): string
    {
        return data
            ? ''
            : 'The report is no longer waiting to be printed : open the report page and press Print again.';
    },

    fileName(data: HrReportDoc | null): string
    {
        return data ? `${data.title} - ${data.subtitle}`.replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 120) : 'HR Report';
    },

    documents:
    [
        {
            key:'report',
            title:'Report',
            icon:'fas fa-table-list',
            render:
                (data: HrReportDoc | null, kit: PrintKit) =>
                    data ? reportHtml(data, kit, !!kit.landscape) : '',
            css:REPORT_CSS,
            excel:
                (data: HrReportDoc | null, kit: PrintKit) =>
                    reportSheet(data ?? { title:'HR Report', subtitle:'', columns:[], rows:[] }, kit)
        }
    ]
};


//===============================================================
// Payslips : one block per employee (kept whole on a page)
//===============================================================

const PAYSLIP_CSS = `
.pv-page-inner { padding: 7mm 10mm 6mm; }
.hps { margin: 0 0 4mm; padding: 3mm 4mm 3.4mm; border: 1px solid #94a3b8; border-radius: 2.4mm; break-inside: avoid; page-break-inside: avoid; }
.hps-head { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 1.6mm; border-bottom: 1.4px solid #1e3a8a; }
.hps-head b { font-size: 10.5pt; font-weight: 800; color: #0b2a5b; }
.hps-head span { font-size: 7.2pt; color: #475569; }
table.hps-who { width: 100%; margin: 1.8mm 0; border-collapse: collapse; font-size: 7.8pt; }
.hps-who td { padding: 0.7mm 1.2mm; }
.hps-who td:nth-child(odd) { width: 17%; color: #64748b; }
.hps-who td:nth-child(even) { width: 33%; font-weight: 600; color: #0f172a; }
.hps-cols { display: flex; gap: 4mm; align-items: flex-start; }
table.hps-money { width: 100%; border-collapse: collapse; font-size: 7.8pt; }
.hps-money th { padding: 1.1mm 1.4mm; background: #eef2ff; color: #1e3a8a; font-size: 6.6pt; font-weight: 700; letter-spacing: 0.5pt; text-align: left; text-transform: uppercase; }
.hps-money td { padding: 0.9mm 1.4mm; border-bottom: 1px solid #e5e7eb; }
.hps-money .n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.hps-money tfoot td { border-top: 1px solid #94a3b8; border-bottom: 0; font-weight: 800; color: #0b2a5b; }
.hps-none { color: #94a3b8; }
.hps-net { display: flex; justify-content: space-between; align-items: center; margin-top: 2mm; padding: 1.8mm 3mm; border-radius: 1.6mm; background: #1e3a8a; color: #ffffff; font-size: 8.6pt; font-weight: 700; }
.hps-net b { font-size: 10.5pt; font-variant-numeric: tabular-nums; }
.hps-remarks { margin: 1.6mm 0 0; font-size: 7.2pt; color: #475569; }
.hps-sign { display: flex; justify-content: space-between; gap: 8mm; margin-top: 9mm; }
.hps-sign span { flex: 1 1 0; padding-top: 1mm; border-top: 1px solid #64748b; color: #475569; font-size: 7pt; text-align: center; }
`;

function payslipHtml(doc: HrPayslipDoc, slip: HrPayslip, kit: PrintKit): string
{
    const e =
        (value: string | number | null | undefined): string => kit.escape(value);

    const money =
        (rows: [string, string][]): string =>
            rows.map(r => `<tr><td>${e(r[0])}</td><td class="n">${e(r[1])}</td></tr>`).join('');

    return `<div class="hps">
<div class="hps-head"><b>${e(slip.employeeName)} <span>(${e(slip.employeeCode)})</span></b><span>Payslip of ${e(doc.month)}</span></div>
<table class="hps-who">
  <tr><td>Designation</td><td>${e(slip.designation)}</td><td>Month Days</td><td>${e(slip.monthDays)}</td></tr>
  <tr><td>Department</td><td>${e(slip.department)}</td><td>Pay Days</td><td>${e(slip.payDays)}</td></tr>
  <tr><td>Status</td><td>${e(slip.status)}</td><td>Unpaid / Late</td><td>${e(slip.unpaidLate)}</td></tr>
  <tr><td>Paid On</td><td>${e(slip.paidOn)}</td><td></td><td></td></tr>
</table>
<div class="hps-cols">
  <table class="hps-money">
    <thead><tr><th>Earnings</th><th class="n">Tk</th></tr></thead>
    <tbody>${money(slip.earnings)}</tbody>
    <tfoot><tr><td>Total Earnings</td><td class="n">${e(slip.totalEarnings)}</td></tr></tfoot>
  </table>
  <table class="hps-money">
    <thead><tr><th>Deductions</th><th class="n">Tk</th></tr></thead>
    <tbody>${money(slip.deductions) || '<tr><td colspan="2" class="hps-none">None</td></tr>'}</tbody>
    <tfoot><tr><td>Total Deductions</td><td class="n">${e(slip.totalDeductions)}</td></tr></tfoot>
  </table>
</div>
<div class="hps-net"><span>Net Pay</span><b>Tk ${e(slip.netPay)}</b></div>
${slip.remarks ? `<p class="hps-remarks">Remarks : ${e(slip.remarks)}</p>` : ''}
<div class="hps-sign"><span>Prepared By</span><span>Approved By</span><span>Received By (employee)</span></div>
</div>`;
}

function payslipsHtml(doc: HrPayslipDoc, kit: PrintKit, landscape: boolean): string
{
    const e =
        (value: string | number | null | undefined): string => kit.escape(value);

    return `<section class="pv-flow${landscape ? ' pv-landscape' : ''}" data-watermark="">
<div class="pv-run-head">
${kit.header('Payslip', `${doc.month} · ${doc.branch}`)}
</div>
<div class="pv-body">
${doc.slips.map(slip => payslipHtml(doc, slip, kit)).join('')}
</div>
<div class="pv-end">
<div class="pv-printed">${e(doc.sheet)} · printed ${e(kit.now())}</div>
</div>
</section>`;
}

function payslipsSheet(doc: HrPayslipDoc, kit: PrintKit): ExcelSheet
{
    const amount =
        (value: string, bold = false): ExcelCell =>
        {
            const number = Number(String(value ?? '').replace(/,/g, ''));

            return Number.isFinite(number) ? { v:number, s:bold ? 'boldMoney' : 'money' } : { v:value, s:'normal' };
        };

    return {
        name:'Payslips',
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [{ v:`Payslips of ${doc.month}`, s:'bold' }],
            [{ v:`${doc.branch} · ${doc.sheet}`, s:'muted' }],
            [],
            ['#', 'Code', 'Employee', 'Designation', 'Department', 'Pay Days', 'Total Earnings', 'Total Deductions', 'Net Pay', 'Status']
                .map(x => ({ v:x, s:'bold' }) as ExcelCell),
            ...doc.slips.map((s, i) =>
            [
                i + 1,
                s.employeeCode,
                s.employeeName,
                s.designation,
                s.department,
                s.payDays,
                amount(s.totalEarnings),
                amount(s.totalDeductions),
                amount(s.netPay, true),
                s.status
            ] as ExcelCell[])
        ],
        columns:[5, 12, 28, 22, 22, 10, 16, 16, 16, 14]
    };
}

export const HR_PAYSLIP_PRINT:
    PrintSourceDef<HrPayslipDoc | null> =
{
    key:HR_PAYSLIP_PRINT_KEY,

    title:'Payslips',

    canRotate:false,

    async load(_injector: Injector, id: number | string): Promise<HrPayslipDoc | null>
    {
        return read<HrPayslipDoc>(id);
    },

    denyReason(data: HrPayslipDoc | null): string
    {
        return data && data.slips.length > 0
            ? ''
            : 'The payslips are no longer waiting to be printed : open the salary sheet and press Payslips again.';
    },

    fileName(data: HrPayslipDoc | null): string
    {
        return data ? `Payslips ${data.month} - ${data.branch}`.replace(/[\\/:*?"<>|]+/g, ' ') : 'Payslips';
    },

    documents:
    [
        {
            key:'payslips',
            title:'Payslips',
            icon:'fas fa-file-invoice-dollar',
            render:
                (data: HrPayslipDoc | null, kit: PrintKit) =>
                    data ? payslipsHtml(data, kit, false) : '',
            css:PAYSLIP_CSS,
            excel:
                (data: HrPayslipDoc | null, kit: PrintKit) =>
                    payslipsSheet(data ?? { month:'', branch:'', sheet:'', slips:[] }, kit)
        }
    ]
};
