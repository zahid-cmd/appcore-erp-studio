//===============================================================
// Ledger Statements and Registers : print source (Print Engine)
//
//   /print-viewer/ledger-registers/<token>?doc=ledger-statement
//   /print-viewer/ledger-registers/<token>?doc=ledger-summary
//   (&orient=landscape : the viewer's Portrait / Landscape switch)
//
// The page saves what is on its canvas (register, view, ledger
// or class / group / sub group, period, branch, cancelled) under
// the token; the viewer loads it again from the server.
//
// Portrait  : Date · Voucher · Particulars (party, narration
//             under) · [Ref] · Debit · Credit · Balance
// Landscape : adds Status (Bank) and a Narration column
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
    LEDGER_PRINT_KEY,
    LedgerPrintRequest,
    LedgerRegisterConfig,
    LedgerStatement,
    LedgerSummary,
    formatBalance,
    ledgerRegisterConfig,
    statementRowMatches,
    summaryRowMatches,
    summaryRowShown,
    mergeVoucherRows,
    toIsoDate
}
from '../models/ledger-registers.model';

import
{
    LedgerRegistersService
}
from '../services/ledger-registers.service';


//===============================================================
// Request saved by the page
//===============================================================

const STORAGE_PREFIX =
    'appcore.ledger-print.';

// Saves the request; returns its token (the viewer's id)
export function saveLedgerPrintRequest
(
    request:
        LedgerPrintRequest
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
        // Storage blocked : the viewer prints the summary of
        // all ledgers for this month
    }

    return token;
}

function readLedgerPrintRequest
(
    token:
        number
):
    LedgerPrintRequest | null
{
    try
    {
        const text =
            localStorage.getItem(STORAGE_PREFIX + token);

        return text
            ? JSON.parse(text) as LedgerPrintRequest
            : null;
    }
    catch
    {
        return null;
    }
}


//===============================================================
// Data
//===============================================================

export interface LedgerPrintData
{
    page:LedgerRegisterConfig;
    request:LedgerPrintRequest;
    statement:LedgerStatement | null;
    summary:LedgerSummary | null;
}


//===============================================================
// Styles
//===============================================================

const LEDGER_PRINT_CSS = `
/* Compact paper margins */
.pv-page-inner { padding: 7mm 10mm 6mm; }

/* Header : two identical cards split by a divider */
.sh { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: stretch; gap: 0 3mm; }
.sh-card { display: flex; align-items: center; gap: 3mm; min-width: 0; padding: 2mm 3mm;
           border: 1px solid #cdd9ee; border-radius: 2mm; background: linear-gradient(180deg, #f7faff 0%, #ffffff 100%); }
.sh-divider { width: 0.5mm; margin: 1.5mm 0; border-radius: 1mm; background: linear-gradient(180deg, #93b4f5, #1e3a8a); }
.sh-logo { display: block; flex: 0 0 auto; height: 11mm; max-width: 22mm; object-fit: contain; }
.sh-co { display: flex; flex-direction: column; min-width: 0; line-height: 1.32; }
.sh-co b { font-size: 11pt; font-weight: 800; color: #0b2a5b; margin-bottom: 0.3mm; }
.sh-co span { font-size: 6.6pt; color: #475569; overflow-wrap: anywhere; }
.sh-co em { font-style: normal; white-space: nowrap; }
.sh-co span i { font-style: normal; color: #94a3b8; }
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

/* Figures band */
.lp-band { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 0 0 2.4mm; border: 1px solid #c7d5f0; border-radius: 1.8mm; overflow: hidden; }
.lp-band > div { display: flex; flex-direction: column; padding: 1.1mm 3mm; border-right: 1px solid #e2e8f0; min-width: 0; }
.lp-band > div:last-child { border-right: 0; background: #f1f6ff; }
.lp-band span { font-size: 6pt; font-weight: 700; letter-spacing: 0.7pt; text-transform: uppercase; color: #64748b; }
.lp-band b { font-size: 9.6pt; font-weight: 800; color: #0b2a5b; font-variant-numeric: tabular-nums; white-space: nowrap; }

/* Table */
table.vd-lines { width: 100%; border-collapse: collapse; table-layout: fixed; }
.vd-lines th { font-size: 6.3pt; font-weight: 700; letter-spacing: 0.5pt; text-transform: uppercase; color: #475569; text-align: left;
               padding: 1.6mm 1.4mm; border-top: 1.2px solid #0f172a; border-bottom: 1px solid #0f172a; background: #f8fafc; white-space: nowrap; }
.vd-lines td { padding: 1.2mm 1.4mm; border-bottom: 1px solid #edf1f6; vertical-align: top; font-size: 7.8pt; overflow-wrap: anywhere; }
.vd-c { text-align: center !important; }
.vd-r { text-align: right !important; font-variant-numeric: tabular-nums; white-space: nowrap; }
.lp-sl { color: #94a3b8; }
.lp-no { font-size: 6.8pt; font-weight: 700; color: #0b2a5b; white-space: nowrap; letter-spacing: -0.1pt; }
.lp-date { white-space: nowrap; }
.lp-code { margin-left: 1mm; font-size: 6.4pt; color: #94a3b8; white-space: nowrap; }
.lp-type { display: inline-block; margin-top: 0.4mm; padding: 0 1.2mm; border: 0.8px solid #94a3b8; border-radius: 3mm; font-size: 5.8pt; font-weight: 700; color: #475569; }
.lp-side { font-style: italic; color: #64748b; }
.lp-main { font-weight: 600; color: #0f172a; }
.lp-sub { margin-top: 0.3mm; font-size: 6.8pt; color: #64748b; }
.lp-soft { color: #475569; font-size: 7.4pt; }
.lp-bal { font-weight: 700; }
.lp-open td { background: #f6f9ff; font-weight: 600; }
.lp-narr td { padding-top: 0.2mm; padding-bottom: 1.4mm; border-bottom: 1px solid #dfe6f1; font-size: 7pt; color: #64748b; }
.lp-narr i { margin-right: 2mm; font-style: normal; font-size: 5.8pt; font-weight: 700; letter-spacing: 0.5pt; text-transform: uppercase; color: #94a3b8; }
.lp-cancel td { color: #94a3b8; }
.lp-cancel td.lp-amt { text-decoration: line-through; }
.lp-tag { margin-left: 1mm; padding: 0 1.2mm; border: 0.8px solid #dc2626; border-radius: 3mm; font-size: 5.8pt; font-weight: 700; color: #b42318; }
.lp-total td { padding-top: 1.6mm; padding-bottom: 1.6mm; border-top: 1.2px solid #0f172a; border-bottom: 0; font-size: 8.2pt; font-weight: 800; }
/* Last body row gives way so the closing / total row's top line shows */
.vd-lines tbody tr:last-child td { border-bottom: 0; }
.lp-close td { padding-top: 1.6mm; padding-bottom: 1.6mm; border-top: 1.2px solid #0f172a; border-bottom: 1.2px solid #0f172a; font-size: 8.4pt; font-weight: 800; color: #0b2a5b; }
.lp-none { padding: 6mm 0 !important; color: #64748b; text-align: center; }
.lp-fine { margin-top: 2.5mm; font-size: 7pt; color: #64748b; }
`;


//===============================================================
// Source
//===============================================================

export const LEDGER_REGISTERS_PRINT:
    PrintSourceDef<LedgerPrintData> =
{
    key:LEDGER_PRINT_KEY,

    title:'Ledger Statements',

    // Portrait / Landscape switch in the viewer
    canRotate:true,

    async load
    (
        injector:
            Injector,
        id:
            number
    ):
        Promise<LedgerPrintData>
    {
        const today =
            new Date();

        const request:
            LedgerPrintRequest =
            readLedgerPrintRequest(id)
            ??
            {
                registerType:'General Ledger',
                view:'summary',
                ledgerCode:'',
                classCode:'',
                groupCode:'',
                subGroupCode:'',
                from:toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
                to:toIsoDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
                branchId:0,
                showCancelled:false
            };

        const page =
            ledgerRegisterConfig(request.registerType);

        const service =
            injector.get(LedgerRegistersService);

        if
        (
            request.view === 'statement' && request.ledgerCode
        )
        {
            const statement =
                await firstValueFrom(
                    service.getStatement(
                        {
                            apiType:page.apiType,
                            ledgerCode:request.ledgerCode,
                            from:request.from,
                            to:request.to,
                            branchId:request.branchId,
                            showCancelled:request.showCancelled
                        }
                    )
                );

            // The page's search : only the matching rows
            statement.Rows =
                statement.Rows.filter(x => statementRowMatches(x, request.search ?? ''));

            // Summary view : one row per voucher
            if (request.statementMode === 'summary')
            {
                statement.Rows =
                    mergeVoucherRows(statement.Rows);
            }

            return {
                page,
                request,
                summary:null,
                statement
            };
        }

        const summary =
            await firstValueFrom(
                service.getSummary(
                    {
                        apiType:page.apiType,
                        classCode:request.classCode,
                        groupCode:request.groupCode,
                        subGroupCode:request.subGroupCode,
                        from:request.from,
                        to:request.to,
                        branchId:request.branchId,
                        showCancelled:request.showCancelled
                    }
                )
            );

        const allRows =
            summary.Rows.length;

        // The page's view switches (zero balance / no transactions)
        summary.Rows =
            summary.Rows.filter(x =>
                summaryRowShown(x, request.showZeroBalance ?? true, request.showNoTransactions ?? true));

        if
        (
            (request.search ?? '').trim()
            ||
            summary.Rows.length !== allRows
        )
        {
            summary.Rows =
                summary.Rows.filter(x => summaryRowMatches(x, request.search ?? ''));

            // Totals of the rows printed
            summary.Opening = summary.Rows.reduce((t, x) => t + x.Opening, 0);
            summary.TotalDebit = summary.Rows.reduce((t, x) => t + x.Debit, 0);
            summary.TotalCredit = summary.Rows.reduce((t, x) => t + x.Credit, 0);
            summary.Closing = summary.Rows.reduce((t, x) => t + x.Closing, 0);
        }

        return {
            page,
            request,
            statement:null,
            summary
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
            LedgerPrintData
    ):
        string
    {
        return data.statement
            ? `${data.page.title} - ${data.statement.LedgerName}`
            : `${data.page.title} - Summary`;
    },

    documents:
    [
        {
            key:'ledger-statement',

            title:'Statement',

            icon:'fas fa-book-open',

            available:
                (data: LedgerPrintData) =>
                    !!data.statement,

            render:
                (data: LedgerPrintData, kit: PrintKit) =>
                    statementHtml(data, kit, !!kit.landscape),

            css:
                LEDGER_PRINT_CSS,

            excel:
                (data: LedgerPrintData, kit: PrintKit) =>
                    statementSheet(data, kit)
        },

        {
            key:'ledger-summary',

            title:'Summary',

            icon:'fas fa-list',

            available:
                (data: LedgerPrintData) =>
                    !!data.summary,

            render:
                (data: LedgerPrintData, kit: PrintKit) =>
                    summaryHtml(data, kit, !!kit.landscape),

            css:
                LEDGER_PRINT_CSS,

            excel:
                (data: LedgerPrintData, kit: PrintKit) =>
                    summarySheet(data, kit)
        }
    ]
};


//===============================================================
// Header : two identical cards split by a divider
//===============================================================

function ledgerHead
(
    kit:
        PrintKit,
    kicker:
        string,
    title:
        string,
    from:
        string,
    to:
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

    const period =
        `${kit.date(from)} – ${kit.date(to)}`;

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
            .map
            (
                (part, index) =>
                    index === 0
                        ? `<span>${e(part)}</span>`
                        : `<span>${part.split(' · ').map(fact => `<em>${e(fact)}</em>`).join('<i> · </i>')}</span>`
            )
            .join('');

    let qr = '';

    try
    {
        qr =
            kit.qr(
                [company?.CompanyName || 'AppCore ERP', kicker, title, period]
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
      <span class="sh-kicker">${e(kicker)}</span>
      <b class="sh-title">${e(title)}</b>
      <span class="sh-asof">Period <b>${e(period)}</b></span>
    </div>
    ${qr ? `<div class="sh-qr">${qr}</div>` : ''}
  </div>
</div>
<div class="sh-meta">${meta.filter(x => !!x[1]).map(([label, value]) => `<span><i>${e(label)}</i>${e(value)}</span>`).join('')}</div>`;
}

function band
(
    kit:
        PrintKit,
    opening:
        number,
    debit:
        number,
    credit:
        number,
    closing:
        number
):
    string
{
    const e =
        kit.escape;

    return `<div class="lp-band">${
        [
            ['Opening', formatBalance(opening)],
            ['Debit', kit.money(debit)],
            ['Credit', kit.money(credit)],
            ['Closing', formatBalance(closing)]
        ]
        .map(([label, value]) => `<div><span>${e(label)}</span><b>${e(value)}</b></div>`)
        .join('')
    }</div>`;
}


//===============================================================
// Statement
//===============================================================

function statementHtml
(
    data:
        LedgerPrintData,
    kit:
        PrintKit,
    landscape:
        boolean
):
    string
{
    const s =
        data.statement!;

    const e =
        kit.escape;

    const page =
        data.page;

    const ref =
        !!page.refLabel;

    const status =
        landscape && page.showStatus;

    const money =
        (value: number) =>
            value ? kit.money(value) : '';

    // Column list : [heading, width, class]
    // The page's switches (codes, narration)
    const showCodes =
        data.request.showCodes !== false;

    const showNarration =
        data.request.showNarration !== false;

    // Same order as the page : Date · Particulars · Voucher No ·
    // [Ref] · [Status] · Debit · Credit · Balance · [Short Notes]
    const notes =
        landscape;

    const cols:
        [string, string, string][] =
    [
        ['Date', '19mm', ''],
        ['Particulars', '', ''],
        ['Voucher No', landscape ? '45mm' : '38mm', ''],
        ...(ref ? [[page.refLabel, landscape ? '24mm' : '16mm', '']] as [string, string, string][] : []),
        ...(status ? [['Status', '18mm', '']] as [string, string, string][] : []),
        ['Debit', '22mm', 'vd-r'],
        ['Credit', '22mm', 'vd-r'],
        ['Balance', '25mm', 'vd-r'],
        ...(notes ? [['Short Notes', '17%', '']] as [string, string, string][] : [])
    ];

    // Columns before Debit
    const lead =
        cols.length - 3 - (notes ? 1 : 0);

    const noteCell =
        notes ? '<td></td>' : '';

    const body =
        s.Rows
            .map
            (
                (row, index) =>
                {
                    const tag =
                        row.IsReversal
                            ? '<span class="lp-tag">Reversal</span>'
                            : row.IsCancelled
                                ? '<span class="lp-tag">Cancelled</span>'
                                : '';

                    // Counter head only; the short note under it on
                    // the portrait page (its own column in landscape)
                    const under =
                        landscape ? '' : e(row.ShortNote);

                    // Narration once per voucher, under its last row
                    const next =
                        s.Rows[index + 1];

                    const last =
                        !next
                        ||
                        next.VoucherType !== row.VoucherType
                        ||
                        next.VoucherNo !== row.VoucherNo
                        ||
                        next.IsReversal !== row.IsReversal;

                    const narration =
                        showNarration && last && row.Narration
                            ? `<tr class="lp-narr"><td colspan="${cols.length}"><i>Narration</i>${e(row.Narration)}</td></tr>`
                            : '';

                    const code =
                        showCodes && row.ContraCodes
                            ? ` <span class="lp-code">${e(row.ContraCodes)}</span>`
                            : '';

                    return `<tr class="${row.IsReversal || row.IsCancelled ? 'lp-cancel' : ''}">
  <td class="lp-date">${e(kit.date(row.VoucherDate))}</td>
  <td><div><i class="lp-side">${row.Debit > 0 ? 'To' : 'By'}</i> <span class="lp-main">${e(row.Particulars || '—')}</span>${code}</div>${under ? `<div class="lp-sub">${under}</div>` : ''}</td>
  <td><span class="lp-no">${e(row.VoucherNo)}</span>${tag}</td>
  ${ref ? `<td class="lp-soft">${e(row.Reference)}</td>` : ''}
  ${status ? `<td class="lp-soft">${e(row.Status)}</td>` : ''}
  <td class="vd-r lp-amt">${money(row.Debit)}</td>
  <td class="vd-r lp-amt">${money(row.Credit)}</td>
  <td class="vd-r lp-bal">${e(formatBalance(row.Balance))}</td>
  ${notes ? `<td class="lp-soft">${e(row.ShortNote)}</td>` : ''}
</tr>${narration}`;
                }
            )
            .join('');

    const path =
        [s.ClassName, s.GroupName, s.SubGroupName].filter(x => !!x).join(' › ');

    return `<section class="pv-flow${landscape ? ' pv-landscape' : ''}" data-watermark="">
<div class="pv-run-head">
${ledgerHead(kit, `${page.title} · Statement`, s.LedgerName, s.From, s.To,
    [
        ['Ledger', showCodes ? s.LedgerCode : ''],
        ['Chart', path],
        ['Branch', s.BranchName || 'All Branches'],
        ['Normal', s.Mode],
        ['Cancelled', s.ShowCancelled ? 'Shown' : ''],
        ['Search', data.request.search ?? '']
    ])}
</div>
<div class="pv-body">
${band(kit, s.Opening, s.TotalDebit, s.TotalCredit, s.Closing)}
<table class="pv-split vd-lines">
  <colgroup>${cols.map(x => x[1] ? `<col style="width:${x[1]}">` : '<col>').join('')}</colgroup>
  <thead><tr>${cols.map(x => `<th class="${x[2]}">${e(x[0])}</th>`).join('')}</tr></thead>
  <tbody>
    <tr class="lp-open"><td class="lp-date">${e(kit.date(s.From))}</td><td colspan="${lead - 1}">Opening Balance${s.IsNominal && s.OpeningFrom ? ` (from ${e(kit.date(s.OpeningFrom))})` : ''}</td><td></td><td></td><td class="vd-r lp-bal">${e(formatBalance(s.Opening))}</td>${noteCell}</tr>
    ${body || `<tr><td colspan="${cols.length}" class="lp-none">No entries in this period.</td></tr>`}
  </tbody>
  <tfoot>
    <tr class="lp-total"><td colspan="${lead}" class="vd-r">Total · ${s.Rows.length} entr${s.Rows.length === 1 ? 'y' : 'ies'}</td><td class="vd-r">${kit.money(s.TotalDebit)}</td><td class="vd-r">${kit.money(s.TotalCredit)}</td><td></td>${noteCell}</tr>
    <tr class="lp-close"><td colspan="${lead}" class="vd-r">Closing Balance · ${e(kit.date(s.To))}</td><td></td><td></td><td class="vd-r">${e(formatBalance(s.Closing))}</td>${noteCell}</tr>
  </tfoot>
</table>
${s.Truncated ? '<div class="lp-fine">Only the first entries are listed; totals and closing cover the whole period.</div>' : ''}
</div>
<div class="pv-end">
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>
</section>`;
}


//===============================================================
// Summary
//===============================================================

function summaryHtml
(
    data:
        LedgerPrintData,
    kit:
        PrintKit,
    landscape:
        boolean
):
    string
{
    const s =
        data.summary!;

    const e =
        kit.escape;

    const word =
        data.page.itemWord === 'account' ? 'Account' : 'Ledger';

    const money =
        (value: number) =>
            value ? kit.money(value) : '';

    const body =
        s.Rows
            .map
            (
                (row, index) =>
                    `<tr>
  <td class="lp-sl">${index + 1}</td>
  <td><div class="lp-main">${e(row.LedgerName)}</div><div class="lp-sub">${[data.request.showCodes !== false ? row.LedgerCode : '', landscape ? '' : row.SubGroupName].filter(x => !!x).map(x => e(x)).join(' · ')}</div></td>
  ${landscape ? `<td class="lp-soft">${e(row.GroupName)} · ${e(row.SubGroupName)}</td>` : ''}
  <td class="vd-r">${e(formatBalance(row.Opening))}</td>
  <td class="vd-r">${money(row.Debit)}</td>
  <td class="vd-r">${money(row.Credit)}</td>
  <td class="vd-r lp-bal">${e(formatBalance(row.Closing))}</td>
</tr>`
            )
            .join('');

    const cols =
        landscape
            ? ['8mm', '', '30%', '28mm', '26mm', '26mm', '28mm']
            : ['8mm', '', '26mm', '24mm', '24mm', '26mm'];

    const lead =
        landscape ? 3 : 2;

    return `<section class="pv-flow${landscape ? ' pv-landscape' : ''}" data-watermark="">
<div class="pv-run-head">
${ledgerHead(kit, `${data.page.title} · Summary`, s.ScopePath, s.From, s.To,
    [
        ['Branch', s.BranchName || 'All Branches'],
        [`${word}s`, `${s.Rows.length}`],
        ['Cancelled', s.ShowCancelled ? 'Shown' : ''],
        ['Search', data.request.search ?? '']
    ])}
</div>
<div class="pv-body">
${band(kit, s.Opening, s.TotalDebit, s.TotalCredit, s.Closing)}
<table class="pv-split vd-lines">
  <colgroup>${cols.map(x => x ? `<col style="width:${x}">` : '<col>').join('')}</colgroup>
  <thead><tr><th>SL</th><th>${e(word)}</th>${landscape ? '<th>Group · Sub Group</th>' : ''}<th class="vd-r">Opening</th><th class="vd-r">Debit</th><th class="vd-r">Credit</th><th class="vd-r">Closing</th></tr></thead>
  <tbody>${body || `<tr><td colspan="${cols.length}" class="lp-none">No ${e(word.toLowerCase())}s in this selection.</td></tr>`}</tbody>
  <tfoot>
    <tr class="lp-close"><td colspan="${lead}" class="vd-r">Total · ${s.Rows.length} ${e(word.toLowerCase())}${s.Rows.length === 1 ? '' : 's'}</td><td class="vd-r">${e(formatBalance(s.Opening))}</td><td class="vd-r">${kit.money(s.TotalDebit)}</td><td class="vd-r">${kit.money(s.TotalCredit)}</td><td class="vd-r">${e(formatBalance(s.Closing))}</td></tr>
  </tfoot>
</table>
</div>
<div class="pv-end">
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>
</section>`;
}


//===============================================================
// Excel
//===============================================================

function statementSheet
(
    data:
        LedgerPrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const s =
        data.statement!;

    const bold =
        (text: string): ExcelCell =>
            ({ v:text, s:'bold' });

    return {
        name:'Statement',
        columns:[13, 40, 24, 28, 18, 14, 40, 14, 14, 18, 30],
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [bold(`${data.page.title.toUpperCase()} - ${s.LedgerName} (${s.LedgerCode})`)],
            [bold('Period'), `${kit.date(s.From)} - ${kit.date(s.To)}`, null, bold('Branch'), s.BranchName],
            [],
            [bold('Date'), bold('Particulars'), bold('Code'), bold('Voucher No'), bold(data.page.refLabel || 'Ref'), bold('Status'), bold('Narration'), bold('Debit'), bold('Credit'), bold('Balance'), bold('Short Notes')],
            [kit.date(s.From), 'Opening Balance', null, null, null, null, null, null, null, formatBalance(s.Opening)],
            ...s.Rows.map
            (
                (row): ExcelCell[] =>
                [
                    kit.date(row.VoucherDate),
                    `${row.Debit > 0 ? 'To' : 'By'} ${row.Particulars}`,
                    row.ContraCodes,
                    row.VoucherNo,
                    row.Reference,
                    row.IsReversal ? 'Reversal' : row.IsCancelled ? 'Cancelled' : row.Status,
                    row.Narration,
                    { v:row.Debit, s:'money' },
                    { v:row.Credit, s:'money' },
                    formatBalance(row.Balance),
                    row.ShortNote
                ]
            ),
            [null, null, null, null, null, null, bold('Total'), { v:s.TotalDebit, s:'boldMoney' }, { v:s.TotalCredit, s:'boldMoney' }, null],
            [null, null, null, null, null, null, bold('Closing Balance'), null, null, bold(formatBalance(s.Closing))]
        ]
    };
}

function summarySheet
(
    data:
        LedgerPrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const s =
        data.summary!;

    const bold =
        (text: string): ExcelCell =>
            ({ v:text, s:'bold' });

    return {
        name:'Summary',
        columns:[6, 22, 36, 26, 26, 18, 16, 16, 18],
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [bold(`${data.page.title.toUpperCase()} - SUMMARY - ${s.ScopePath}`)],
            [bold('Period'), `${kit.date(s.From)} - ${kit.date(s.To)}`, null, bold('Branch'), s.BranchName],
            [],
            [bold('SL'), bold('Code'), bold('Name'), bold('Group'), bold('Sub Group'), bold('Opening'), bold('Debit'), bold('Credit'), bold('Closing')],
            ...s.Rows.map
            (
                (row, index): ExcelCell[] =>
                [
                    index + 1,
                    row.LedgerCode,
                    row.LedgerName,
                    row.GroupName,
                    row.SubGroupName,
                    formatBalance(row.Opening),
                    { v:row.Debit, s:'money' },
                    { v:row.Credit, s:'money' },
                    formatBalance(row.Closing)
                ]
            ),
            [null, null, null, null, bold('Total'), bold(formatBalance(s.Opening)), { v:s.TotalDebit, s:'boldMoney' }, { v:s.TotalCredit, s:'boldMoney' }, bold(formatBalance(s.Closing))]
        ]
    };
}
