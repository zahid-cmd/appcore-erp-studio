//===============================================================
// Final Accounts : print sources (Print Engine)
//
//   /print-viewer/profit-loss/<token>?doc=profit-loss
//   /print-viewer/balance-sheet/<token>?doc=balance-sheet
//   (&orient=landscape : the viewer's Portrait / Landscape switch)
//
// The page saves what is on its canvas (period / date, branch,
// comparison, layout, level, switches, search) under the token;
// the viewer loads the statement again from the server and
// builds the same lines. Excel : the viewer's Excel button.
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
    BALANCE_SHEET_PRINT_KEY,
    BalanceSheet,
    BalanceSheetPrintRequest,
    FA_LEVELS,
    FaBusinessLine,
    FaLine,
    FaOptions,
    FaTAccount,
    PROFIT_LOSS_PRINT_KEY,
    ProfitLoss,
    ProfitLossPrintRequest,
    buildBalanceSheetLines,
    buildBusinessLines,
    buildProfitLossLines,
    buildProfitLossTForm,
    faChange,
    faChangePct,
    faChangeTone,
    faPct,
    isZero,
    marginOf,
    toIsoDate
}
from '../models/final-accounts.model';

import
{
    FinalAccountsService
}
from '../services/final-accounts.service';


//===============================================================
// Requests saved by the pages
//===============================================================

const PROFIT_LOSS_STORAGE =
    'appcore.profit-loss-print.';

const BALANCE_SHEET_STORAGE =
    'appcore.balance-sheet-print.';

export function saveRequest
(
    prefix:
        string,
    request:
        object
):
    number
{
    const token =
        Date.now();

    try
    {
        localStorage.setItem(
            prefix + token,
            JSON.stringify(request)
        );
    }
    catch
    {
        // Storage blocked : the viewer prints the defaults
    }

    return token;
}

export function readRequest<T>
(
    prefix:
        string,
    token:
        number
):
    T | null
{
    try
    {
        const text =
            localStorage.getItem(prefix + token);

        return text
            ? JSON.parse(text) as T
            : null;
    }
    catch
    {
        return null;
    }
}

export function saveProfitLossPrintRequest
(
    request:
        ProfitLossPrintRequest
):
    number
{
    return saveRequest(PROFIT_LOSS_STORAGE, request);
}

export function saveBalanceSheetPrintRequest
(
    request:
        BalanceSheetPrintRequest
):
    number
{
    return saveRequest(BALANCE_SHEET_STORAGE, request);
}


//===============================================================
// Data
//===============================================================

export interface ProfitLossPrintData
{
    request:ProfitLossPrintRequest;
    report:ProfitLoss;
    lines:FaLine[];
    accounts:FaTAccount[];
    businessLines:FaBusinessLine[];
    businessTotal:FaBusinessLine;
}

export interface BalanceSheetPrintData
{
    request:BalanceSheetPrintRequest;
    report:BalanceSheet;
    lines:FaLine[];
}


//===============================================================
// Styles
//===============================================================

export const FINAL_ACCOUNTS_PRINT_CSS = `
.pv-page-inner { padding: 7mm 10mm 6mm; }
.sh { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: stretch; gap: 0 3mm; }
.sh-card { display: flex; align-items: center; gap: 3mm; min-width: 0; padding: 2mm 3mm;
           border: 1px solid #cdd9ee; border-radius: 2mm; background: linear-gradient(180deg, #f7faff 0%, #ffffff 100%); }
.sh-divider { width: 0.5mm; margin: 1.5mm 0; border-radius: 1mm; background: linear-gradient(180deg, #93b4f5, #1e3a8a); }
.sh-logo { display: block; flex: 0 0 auto; height: 11mm; max-width: 22mm; object-fit: contain; }
.sh-co { display: flex; flex-direction: column; min-width: 0; line-height: 1.32; }
.sh-co b { font-size: 11pt; font-weight: 800; color: #0b2a5b; margin-bottom: 0.3mm; }
.sh-co span { font-size: 6.6pt; color: #475569; overflow-wrap: anywhere; }
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
.fa-band { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 0 0 2.4mm; border: 1px solid #c7d5f0; border-radius: 1.8mm; overflow: hidden; }
.fa-band > div { display: flex; flex-direction: column; padding: 1.1mm 3mm; border-right: 1px solid #e2e8f0; min-width: 0; }
.fa-band > div:last-child { border-right: 0; }
.fa-band span { font-size: 6pt; font-weight: 700; letter-spacing: 0.7pt; text-transform: uppercase; color: #64748b; }
.fa-band b { font-size: 9.6pt; font-weight: 800; color: #0b2a5b; font-variant-numeric: tabular-nums; white-space: nowrap; }
.fa-band .ok b { color: #15803d; }
.fa-band .bad b { color: #b42318; }
table.fa-lines { width: 100%; border-collapse: collapse; table-layout: fixed; }
.fa-lines th { font-size: 6.3pt; font-weight: 700; letter-spacing: 0.5pt; text-transform: uppercase; color: #475569; text-align: left;
               padding: 1.3mm 1.4mm; border-top: 1.2px solid #0f172a; border-bottom: 1px solid #0f172a; background: #f8fafc; white-space: nowrap; }
.fa-lines th small { display: block; font-size: 5.8pt; font-weight: 600; letter-spacing: 0; text-transform: none; color: #64748b; }
.fa-lines td { padding: 1mm 1.4mm; border-bottom: 1px solid #edf1f6; vertical-align: top; font-size: 7.6pt; overflow-wrap: anywhere; }
.fa-r { text-align: right !important; font-variant-numeric: tabular-nums; white-space: nowrap; }
.fa-rule { border-left: 1px solid #dbe3ef; }
.fa-code { margin-left: 1.2mm; font-size: 6.2pt; color: #94a3b8; white-space: nowrap; }
.fa-pill { margin-left: 1.6mm; font-size: 6.2pt; font-weight: 700; color: #047857; }
.fa-sec td { background: #e9f0fb; font-weight: 800; color: #0b2a5b; text-transform: uppercase; letter-spacing: 0.4pt; font-size: 7.4pt; }
.fa-l1 td { font-weight: 700; color: #0b2a5b; }
.fa-l1 td:first-child { padding-left: 4mm; }
.fa-l2 td:first-child { padding-left: 7mm; font-weight: 600; }
.fa-l3 td:first-child { padding-left: 10mm; }
.fa-l4 td:first-child { padding-left: 13mm; }
.fa-extra td { background: #fffbeb; color: #78350f; font-weight: 600; }
.fa-extra td:first-child { padding-left: 4mm; }
.fa-detail td { font-style: italic; font-weight: 500; }
.fa-detail td:first-child { padding-left: 16mm; }
.fa-res td { padding-top: 1.6mm; padding-bottom: 1.6mm; border-top: 1.2px solid #0f172a; border-bottom: 1.2px solid #0f172a; background: #f3f7ff;
             font-size: 8.2pt; font-weight: 800; color: #0b2a5b; }
.fa-res.good td.fa-r:nth-child(2) { color: #15803d; }
.fa-res.bad td { color: #b42318; }
.fa-up-good { color: #15803d; }
.fa-up-bad { color: #b42318; }
.fa-none { padding: 6mm 0 !important; color: #64748b; text-align: center; }
.fa-fine { margin-top: 2.5mm; font-size: 7pt; color: #64748b; }
.fa-h2 { margin: 4mm 0 1.6mm; font-size: 8.4pt; font-weight: 800; color: #0b2a5b; letter-spacing: 0.4pt; text-transform: uppercase; }
.fa-t { margin-bottom: 4mm; break-inside: avoid; }
.fa-t-title { padding: 1.4mm 2mm; text-align: center; font-size: 8.6pt; font-weight: 800; color: #0b2a5b; background: #eef3fb; border: 1px solid #c7d5f0; border-bottom: 0; }
.fa-t table td.fa-cr, .fa-t table th.fa-cr { border-left: 1.4px solid #94a3b8; }
.fa-t .fa-strong { font-weight: 800; color: #0b2a5b; }
.fa-t .fa-tot td { border-top: 1.2px solid #0f172a; border-bottom: 1.2px solid #0f172a; font-weight: 800; color: #0b2a5b; background: #f3f7ff; }
`;


//===============================================================
// Header : company card | document card
//===============================================================

export function head
(
    kit:
        PrintKit,
    title:
        string,
    periodLabel:
        string,
    period:
        string,
    branchName:
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
            .map(part => `<span>${e(part)}</span>`)
            .join('');

    let qr = '';

    try
    {
        qr =
            kit.qr(
                [company?.CompanyName || 'AppCore ERP', title, period, branchName]
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
      <span class="sh-kicker">Financial Statements</span>
      <b class="sh-title">${e(title)}</b>
      <span class="sh-asof">${e(periodLabel)} <b>${e(period)}</b></span>
    </div>
    ${qr ? `<div class="sh-qr">${qr}</div>` : ''}
  </div>
</div>
<div class="sh-meta">${meta.filter(x => !!x[1]).map(([label, value]) => `<span><i>${e(label)}</i>${e(value)}</span>`).join('')}</div>`;
}

export function levelLabel
(
    level:
        number
):
    string
{
    return FA_LEVELS.find(x => x.value === level)?.label ?? '';
}

// 0 → blank; negative → (1,234.00)
export function amountOf
(
    kit:
        PrintKit,
    value:
        number,
    always:
        boolean
):
    string
{
    if (isZero(value))
    {
        return always ? kit.money(0) : '';
    }

    return value < 0
        ? `(${kit.money(-value)})`
        : kit.money(value);
}


//===============================================================
// Statement table (vertical P&L, Balance Sheet)
//===============================================================

export function statementTable
(
    kit:
        PrintKit,
    lines:
        FaLine[],
    compare:
        boolean,
    currentHead:
        [string, string],
    compareHead:
        [string, string],
    showCodes:
        boolean,
    landscape:
        boolean
):
    string
{
    const e =
        kit.escape;

    const amountText =
        (line: FaLine, value: number) =>
            line.check
                ? (isZero(value) ? 'Balanced' : amountOf(kit, value, true))
                : amountOf(kit, value, line.kind === 'section' || line.kind === 'result');

    const rowClass =
        (line: FaLine) =>
            line.kind === 'section' ? 'fa-sec'
            : line.kind === 'result' ? `fa-res ${line.tone ?? ''}`
            : line.kind === 'extra' ? (line.level === 5 ? 'fa-extra fa-detail' : 'fa-extra')
            : `fa-l${line.level}`;

    const body =
        lines
            .map
            (
                line =>
                {
                    const name =
                        e(line.name)
                        + (showCodes && line.code && line.kind === 'node' ? `<span class="fa-code">${e(line.code)}</span>` : '')
                        + (line.margin !== undefined && line.margin !== null ? `<span class="fa-pill">${e(faPct(line.margin))} of sales</span>` : '');

                    const tone =
                        faChangeTone(line);

                    const toneClass =
                        tone ? ` fa-up-${tone}` : '';

                    const cmp =
                        compare
                            ? `<td class="fa-r fa-rule">${e(amountText(line, line.compare))}</td>`
                              + `<td class="fa-r fa-rule${toneClass}">${line.check ? '' : e(amountOf(kit, faChange(line.amount, line.compare), false))}</td>`
                              + `<td class="fa-r${toneClass}">${line.check ? '' : e(faPct(faChangePct(line.amount, line.compare)))}</td>`
                            : '';

                    return `<tr class="${rowClass(line)}"><td>${name}</td><td class="fa-r fa-rule">${e(amountText(line, line.amount))}</td>${cmp}</tr>`;
                }
            )
            .join('');

    const width =
        landscape ? '34mm' : '27mm';

    const widths =
        compare
            ? ['', width, width, landscape ? '30mm' : '24mm', '16mm']
            : ['', '36mm'];

    const headRow =
        `<tr><th>Account</th><th class="fa-r fa-rule">${e(currentHead[0])}<small>${e(currentHead[1])}</small></th>`
        + (compare
            ? `<th class="fa-r fa-rule">${e(compareHead[0])}<small>${e(compareHead[1])}</small></th><th class="fa-r fa-rule">Change</th><th class="fa-r">Change %</th>`
            : '')
        + '</tr>';

    return `<table class="pv-split fa-lines">
  <colgroup>${widths.map(x => x ? `<col style="width:${x}">` : '<col>').join('')}</colgroup>
  <thead>${headRow}</thead>
  <tbody>${body || `<tr><td colspan="${compare ? 5 : 2}" class="fa-none">No ledgers to show.</td></tr>`}</tbody>
</table>`;
}

export function statementSheetRows
(
    lines:
        FaLine[],
    compare:
        boolean
):
    ExcelCell[][]
{
    const indent =
        (line: FaLine) =>
            line.kind === 'node' ? '    '.repeat(line.level) : line.kind === 'extra' ? '    '.repeat(line.level) : '';

    const money =
        (value: number, strong: boolean): ExcelCell =>
            isZero(value) && !strong
                ? null
                : { v:value, s:strong ? 'boldMoney' : 'money' };

    return lines.map
    (
        line =>
        {
            const strong =
                line.kind === 'section' || line.kind === 'result';

            const name:
                ExcelCell =
                strong
                    ? { v:line.name, s:'bold' }
                    : indent(line) + line.name;

            const row:
                ExcelCell[] =
                [
                    name,
                    line.kind === 'node' ? line.code : null,
                    money(line.amount, strong)
                ];

            if (compare)
            {
                const pct =
                    faChangePct(line.amount, line.compare);

                row.push(
                    money(line.compare, strong),
                    line.check ? null : money(faChange(line.amount, line.compare), strong),
                    line.check || pct === null ? null : `${pct}%`);
            }

            return row;
        }
    );
}


//===============================================================
// Profit & Loss
//===============================================================

export const PROFIT_LOSS_PRINT:
    PrintSourceDef<ProfitLossPrintData> =
{
    key:PROFIT_LOSS_PRINT_KEY,

    title:'Profit & Loss',

    canRotate:true,

    async load
    (
        injector:
            Injector,
        id:
            number | string
    ):
        Promise<ProfitLossPrintData>
    {
        const now =
            new Date();

        const request:
            ProfitLossPrintRequest =
            readRequest<ProfitLossPrintRequest>(PROFIT_LOSS_STORAGE, Number(id))
            ??
            {
                // Server default : the financial year start
                from:'',
                to:toIsoDate(now),
                branchId:0,
                showCancelled:false,
                compare:'none',
                layout:'vertical',
                level:1,
                showCodes:true,
                showZero:false,
                showLines:true,
                search:''
            };

        const report =
            await firstValueFrom(
                injector
                    .get(FinalAccountsService)
                    .getProfitLoss(
                        {
                            from:request.from,
                            to:request.to,
                            branchId:request.branchId,
                            showCancelled:request.showCancelled,
                            compare:request.compare
                        }
                    )
            );

        const options:
            FaOptions =
            {
                level:request.level,
                showZero:request.showZero,
                search:request.search ?? ''
            };

        const business =
            buildBusinessLines(report.Rows);

        return {
            request,
            report,
            lines:buildProfitLossLines(report, options),
            accounts:buildProfitLossTForm(report, options),
            businessLines:business.lines,
            businessTotal:business.total
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
            ProfitLossPrintData
    ):
        string
    {
        return `Profit and Loss - ${data.report.From} to ${data.report.To}`;
    },

    documents:
    [
        {
            key:'profit-loss',
            title:'Profit & Loss',
            icon:'fas fa-chart-line',
            render:
                (data: ProfitLossPrintData, kit: PrintKit) =>
                    profitLossHtml(data, kit, !!kit.landscape),
            css:
                FINAL_ACCOUNTS_PRINT_CSS,
            excel:
                (data: ProfitLossPrintData, kit: PrintKit) =>
                    profitLossSheet(data, kit)
        }
    ]
};

function profitLossHtml
(
    data:
        ProfitLossPrintData,
    kit:
        PrintKit,
    landscape:
        boolean
):
    string
{
    const e =
        kit.escape;

    const r =
        data.report;

    const t =
        r.Totals;

    const compare =
        r.Compare !== 'none';

    const period =
        `${kit.date(r.From)} – ${kit.date(r.To)}`;

    const comparePeriod =
        compare ? `${kit.date(r.CompareFrom)} – ${kit.date(r.CompareTo)}` : '';

    const showCodes =
        data.request.showCodes !== false;

    const tform =
        data.request.layout === 'tform';

    const header =
        head(
            kit,
            'Profit & Loss Account',
            'Period',
            period,
            r.BranchName,
            [
                ['Branch', r.BranchName],
                ['Layout', tform ? 'T-form' : 'Vertical'],
                ['Down to', levelLabel(data.request.level)],
                ['Compared with', compare ? `${r.CompareLabel} (${comparePeriod})` : ''],
                ['Cancelled', r.ShowCancelled ? 'Shown' : ''],
                ['Search', data.request.search ?? '']
            ]);

    const pctText =
        (value: number) =>
        {
            const pct =
                faPct(marginOf(value, t.Sales));

            return pct ? ` · ${pct}` : '';
        };

    const loss =
        t.NetProfit < 0;

    const band =
        `<div class="fa-band">
  <div><span>Sales</span><b>${e(amountOf(kit, t.Sales, true))}</b></div>
  <div><span>Gross Profit${e(pctText(t.GrossProfit))}</span><b>${e(amountOf(kit, t.GrossProfit, true))}</b></div>
  <div class="${loss ? 'bad' : 'ok'}"><span>${loss ? 'Net Loss' : 'Net Profit'}${e(pctText(t.NetProfit))}</span><b>${e(amountOf(kit, t.NetProfit, true))}</b></div>
</div>`;

    const statement =
        tform
            ? data.accounts.map(account => tAccountHtml(kit, account, period, showCodes)).join('')
              + (compare ? '<div class="fa-fine">The comparison shows in the vertical layout.</div>' : '')
            : statementTable(
                kit,
                data.lines,
                compare,
                ['This period', period],
                [r.CompareLabel, comparePeriod],
                showCodes,
                landscape);

    const lines =
        data.request.showLines !== false
            ? businessLinesHtml(kit, data, compare)
            : '';

    return `<section class="pv-flow${landscape ? ' pv-landscape' : ''}" data-watermark="">
<div class="pv-run-head">
${header}
</div>
<div class="pv-body">
${band}
${statement}
${lines}
${r.Message ? `<div class="fa-fine">${e(r.Message)}</div>` : ''}
${data.request.search ? '<div class="fa-fine">Only the ledgers matching the search are listed; the section totals and results are of the whole statement.</div>' : ''}
</div>
<div class="pv-end">
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>
</section>`;
}

function tAccountHtml
(
    kit:
        PrintKit,
    account:
        FaTAccount,
    period:
        string,
    showCodes:
        boolean
):
    string
{
    const e =
        kit.escape;

    const count =
        Math.max(account.dr.length, account.cr.length);

    const cell =
        (item: FaTAccount['dr'][number] | undefined, cr: boolean) =>
        {
            if (!item)
            {
                return `<td${cr ? ' class="fa-cr"' : ''}></td><td></td>`;
            }

            const pad =
                item.level > 0 ? ` style="padding-left:${2 + item.level * 3}mm"` : '';

            const strong =
                item.strong ? ' fa-strong' : '';

            return `<td class="${cr ? 'fa-cr' : ''}${strong}"${pad}>${e(item.name)}${showCodes && item.code ? `<span class="fa-code">${e(item.code)}</span>` : ''}</td>`
                + `<td class="fa-r${strong}">${e(amountOf(kit, item.amount, item.strong))}</td>`;
        };

    const rows =
        Array.from({ length:count }, (_, i) => `<tr>${cell(account.dr[i], false)}${cell(account.cr[i], true)}</tr>`)
            .join('');

    return `<div class="fa-t">
<div class="fa-t-title">${e(account.title)} for ${e(period)}</div>
<table class="pv-split fa-lines">
  <colgroup><col><col style="width:27mm"><col><col style="width:27mm"></colgroup>
  <thead><tr><th>Dr · Particulars</th><th class="fa-r">Amount</th><th class="fa-cr">Cr · Particulars</th><th class="fa-r">Amount</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr class="fa-tot"><td class="fa-r">Total</td><td class="fa-r">${e(amountOf(kit, account.total, true))}</td><td class="fa-r fa-cr">Total</td><td class="fa-r">${e(amountOf(kit, account.total, true))}</td></tr></tfoot>
</table>
</div>`;
}

function businessLinesHtml
(
    kit:
        PrintKit,
    data:
        ProfitLossPrintData,
    compare:
        boolean
):
    string
{
    const e =
        kit.escape;

    const row =
        (line: FaBusinessLine, total: boolean) =>
            `<tr class="${total ? 'fa-res' : ''}"><td>${e(line.name)}</td>`
            + `<td class="fa-r fa-rule">${e(amountOf(kit, line.sales, true))}</td>`
            + `<td class="fa-r fa-rule">${line.key === 'service' && isZero(line.cogs) ? 'none' : e(amountOf(kit, line.cogs, true))}</td>`
            + `<td class="fa-r fa-rule">${e(amountOf(kit, line.gross, true))}</td>`
            + `<td class="fa-r fa-rule">${e(faPct(line.margin))}</td>`
            + (compare ? `<td class="fa-r fa-rule">${e(amountOf(kit, line.compareGross, true))}</td>` : '')
            + '</tr>';

    return `<div class="fa-h2">Gross profit by business line</div>
<table class="pv-split fa-lines">
  <colgroup><col><col style="width:27mm"><col style="width:27mm"><col style="width:27mm"><col style="width:16mm">${compare ? '<col style="width:27mm">' : ''}</colgroup>
  <thead><tr><th>Business line</th><th class="fa-r fa-rule">Sales</th><th class="fa-r fa-rule">Cost of goods sold</th><th class="fa-r fa-rule">Gross profit</th><th class="fa-r fa-rule">Margin</th>${compare ? `<th class="fa-r fa-rule">Gross profit<small>${e(data.report.CompareLabel)}</small></th>` : ''}</tr></thead>
  <tbody>${data.businessLines.map(x => row(x, false)).join('')}${row(data.businessTotal, true)}</tbody>
</table>`;
}

function profitLossSheet
(
    data:
        ProfitLossPrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const r =
        data.report;

    const compare =
        r.Compare !== 'none';

    const bold =
        (text: string): ExcelCell =>
            ({ v:text, s:'bold' });

    const header:
        ExcelCell[] =
        compare
            ? [bold('Account'), bold('Code'), bold('This period'), bold(r.CompareLabel), bold('Change'), bold('Change %')]
            : [bold('Account'), bold('Code'), bold('This period')];

    const lineRows:
        ExcelCell[][] =
        data.request.showLines !== false
            ? [
                [],
                [bold('GROSS PROFIT BY BUSINESS LINE')],
                [bold('Business line'), null, bold('Sales'), bold('Cost of goods sold'), bold('Gross profit'), bold('Margin %')],
                ...[...data.businessLines, data.businessTotal].map
                (
                    x =>
                        [
                            x.name === 'Total' ? bold('Total') : x.name,
                            null,
                            { v:x.sales, s:'money' },
                            { v:x.cogs, s:'money' },
                            { v:x.gross, s:'boldMoney' },
                            x.margin === null ? null : `${x.margin}%`
                        ] as ExcelCell[]
                )
            ]
            : [];

    return {
        name:'Profit & Loss',
        columns:compare ? [48, 24, 18, 18, 18, 12] : [48, 24, 18, 18, 18, 12],
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [bold('PROFIT & LOSS ACCOUNT')],
            [bold('Period'), `${kit.date(r.From)} - ${kit.date(r.To)}`, bold('Branch'), r.BranchName],
            ...(compare ? [[bold('Compared with'), `${r.CompareLabel} : ${kit.date(r.CompareFrom)} - ${kit.date(r.CompareTo)}`] as ExcelCell[]] : []),
            [],
            header,
            ...statementSheetRows(data.lines, compare),
            ...lineRows
        ]
    };
}


//===============================================================
// Balance Sheet
//===============================================================

export const BALANCE_SHEET_PRINT:
    PrintSourceDef<BalanceSheetPrintData> =
{
    key:BALANCE_SHEET_PRINT_KEY,

    title:'Balance Sheet',

    canRotate:true,

    async load
    (
        injector:
            Injector,
        id:
            number | string
    ):
        Promise<BalanceSheetPrintData>
    {
        const request:
            BalanceSheetPrintRequest =
            readRequest<BalanceSheetPrintRequest>(BALANCE_SHEET_STORAGE, Number(id))
            ??
            {
                asOn:toIsoDate(new Date()),
                branchId:0,
                showCancelled:false,
                compare:'none',
                level:1,
                showCodes:true,
                showZero:false,
                search:''
            };

        const report =
            await firstValueFrom(
                injector
                    .get(FinalAccountsService)
                    .getBalanceSheet(
                        {
                            asOn:request.asOn,
                            branchId:request.branchId,
                            showCancelled:request.showCancelled,
                            compare:request.compare
                        }
                    )
            );

        return {
            request,
            report,
            lines:
                buildBalanceSheetLines(
                    report,
                    {
                        level:request.level,
                        showZero:request.showZero,
                        search:request.search ?? ''
                    })
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
            BalanceSheetPrintData
    ):
        string
    {
        return `Balance Sheet - ${data.report.AsOn}`;
    },

    documents:
    [
        {
            key:'balance-sheet',
            title:'Balance Sheet',
            icon:'fas fa-building-columns',
            render:
                (data: BalanceSheetPrintData, kit: PrintKit) =>
                    balanceSheetHtml(data, kit, !!kit.landscape),
            css:
                FINAL_ACCOUNTS_PRINT_CSS,
            excel:
                (data: BalanceSheetPrintData, kit: PrintKit) =>
                    balanceSheetSheet(data, kit)
        }
    ]
};

function balanceSheetHtml
(
    data:
        BalanceSheetPrintData,
    kit:
        PrintKit,
    landscape:
        boolean
):
    string
{
    const e =
        kit.escape;

    const r =
        data.report;

    const t =
        r.Totals;

    const compare =
        r.Compare !== 'none';

    const asOn =
        kit.date(r.AsOn);

    const balanced =
        isZero(t.Difference);

    const prior =
        isZero(r.PriorYearsResult)
            ? ''
            : `${kit.money(Math.abs(r.PriorYearsResult))} ${r.PriorYearsResult < 0 ? 'profit' : 'loss'}`;

    const header =
        head(
            kit,
            'Balance Sheet',
            'As on',
            asOn,
            r.BranchName,
            [
                ['Branch', r.BranchName],
                ['Down to', levelLabel(data.request.level)],
                ['Compared with', compare ? `${r.CompareLabel} (${kit.date(r.CompareAsOn)})` : ''],
                ['Profit for the year from', r.YearStart ? kit.date(r.YearStart) : ''],
                ['Cancelled', r.ShowCancelled ? 'Shown' : ''],
                ['Search', data.request.search ?? '']
            ]);

    const band =
        `<div class="fa-band">
  <div><span>Total Assets</span><b>${e(amountOf(kit, t.Assets, true))}</b></div>
  <div><span>Liabilities &amp; Equity</span><b>${e(amountOf(kit, t.LiabilitiesAndEquity, true))}</b></div>
  <div class="${balanced ? 'ok' : 'bad'}"><span>Difference</span><b>${balanced ? 'Balanced' : e(amountOf(kit, t.Difference, true))}</b></div>
</div>`;

    return `<section class="pv-flow${landscape ? ' pv-landscape' : ''}" data-watermark="">
<div class="pv-run-head">
${header}
</div>
<div class="pv-body">
${band}
${statementTable(kit, data.lines, compare, ['As on', asOn], [r.CompareLabel, compare ? kit.date(r.CompareAsOn) : ''], data.request.showCodes !== false, landscape)}
${prior ? `<div class="fa-fine">${e(r.RetainedEarningsName || 'Retained Earnings')} includes the result of the earlier financial years : ${e(prior)}.</div>` : ''}
${r.Message ? `<div class="fa-fine">${e(r.Message)}</div>` : ''}
${data.request.search ? '<div class="fa-fine">Only the ledgers matching the search are listed; the section totals and the check are of the whole statement.</div>' : ''}
</div>
<div class="pv-end">
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>
</section>`;
}

function balanceSheetSheet
(
    data:
        BalanceSheetPrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const r =
        data.report;

    const compare =
        r.Compare !== 'none';

    const bold =
        (text: string): ExcelCell =>
            ({ v:text, s:'bold' });

    const header:
        ExcelCell[] =
        compare
            ? [bold('Account'), bold('Code'), bold('As on'), bold(r.CompareLabel), bold('Change'), bold('Change %')]
            : [bold('Account'), bold('Code'), bold('As on')];

    return {
        name:'Balance Sheet',
        columns:compare ? [48, 24, 18, 18, 18, 12] : [48, 24, 18],
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [bold('BALANCE SHEET')],
            [bold('As on'), kit.date(r.AsOn), bold('Branch'), r.BranchName],
            ...(compare ? [[bold('Compared with'), `${r.CompareLabel} : ${kit.date(r.CompareAsOn)}`] as ExcelCell[]] : []),
            [],
            header,
            ...statementSheetRows(data.lines, compare)
        ]
    };
}
