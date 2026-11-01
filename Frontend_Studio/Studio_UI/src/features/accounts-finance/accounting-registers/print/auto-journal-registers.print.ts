//===============================================================
// Auto Journal Registers : print source (Print Engine)
//
//   /print-viewer/auto-journal-registers/<token>?doc=journal-register
//   (&orient=landscape : the viewer's Portrait / Landscape switch)
//
// The page saves its choice (period, branch, node, one journal)
// under the token (browser storage) before opening the viewer;
// the viewer loads the journals again from the server. A token
// that is no longer there prints this month, all journals.
//
// One document : Journal Register (A4 flow, Excel). Ledger ·
// [Party] · [Narration, landscape] · Debit · Credit. A line's
// party / narration shows only when it is not a repeat; a column
// no line needs is left out (Excel keeps every field).
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
    AUTO_JOURNAL_PRINT_KEY,
    AutoJournal,
    AutoJournalLine,
    AutoJournalList,
    journalMatches,
    journalShowsNotes,
    journalShowsParty,
    lineNote,
    lineParty,
    partyText,
    toIsoDate
}
from '../models/auto-journal-registers.model';

import
{
    AutoJournalRegistersService
}
from '../services/auto-journal-registers.service';


//===============================================================
// Request saved by the page
//===============================================================

export interface JournalPrintRequest
{
    from:string;
    to:string;
    branchId:number;
    node:string;
    voucherNo:string;
    // Page search (optional)
    search?:string;
}

const STORAGE_PREFIX =
    'appcore.journal-print.';

// Saves the request; returns its token (the viewer's id)
export function saveJournalPrintRequest
(
    request:
        JournalPrintRequest
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
        // Storage blocked : the viewer prints this month
    }

    return token;
}

function readJournalPrintRequest
(
    token:
        number
):
    JournalPrintRequest | null
{
    try
    {
        const text =
            localStorage.getItem(STORAGE_PREFIX + token);

        return text
            ? JSON.parse(text) as JournalPrintRequest
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

export interface JournalPrintData
{
    request:JournalPrintRequest;
    list:AutoJournalList;
    journals:AutoJournal[];
}

const TITLE =
    'Auto Journal Registers';


//===============================================================
// Styles
//===============================================================

const JOURNAL_PRINT_CSS = `
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

/* Table */
table.vd-lines { width: 100%; border-collapse: collapse; table-layout: fixed; }
.vd-lines th { font-size: 6.3pt; font-weight: 700; letter-spacing: 0.5pt; text-transform: uppercase; color: #475569; text-align: left;
               padding: 1.6mm 1.4mm; border-top: 1.2px solid #0f172a; border-bottom: 1px solid #0f172a; background: #f8fafc; white-space: nowrap; }
.vd-lines td { padding: 1mm 1.4mm; vertical-align: top; font-size: 7.8pt; overflow-wrap: anywhere; }
.vd-c { text-align: center !important; }
.vd-r { text-align: right !important; font-variant-numeric: tabular-nums; white-space: nowrap; }

/* One journal : keep its head with its first lines */
.jr-head td { padding: 2.2mm 1.6mm 1.2mm; border-bottom: 1px solid #c7d5f0; background: #eef4ff; break-after: avoid; }
.jr-sl { display: inline-block; min-width: 5mm; color: #94a3b8; font-size: 7pt; }
.jr-no { font-size: 8pt; font-weight: 800; color: #0b2a5b; letter-spacing: 0.1pt; }
.jr-type { margin: 0 2mm 0 1.6mm; padding: 0 1.4mm; border: 0.8px solid #94a3b8; border-radius: 3mm; font-size: 6pt; font-weight: 700; color: #475569; }
.jr-facts { font-size: 7pt; color: #334155; }
.jr-facts em { font-style: normal; white-space: nowrap; }
.jr-facts i { font-style: normal; color: #94a3b8; }
.jr-tag { float: right; padding: 0 1.6mm; border: 0.8px solid #dc2626; border-radius: 3mm; font-size: 6.4pt; font-weight: 700; color: #b42318; }
.jr-narr td { padding: 0.8mm 1.6mm 0.4mm 6.6mm; font-size: 7pt; color: #64748b; }
.jr-line td { border-bottom: 1px solid #f1f4f9; }
.jr-line.jr-cr td:first-child { padding-left: 5mm; }
.jr-ledger { font-weight: 600; color: #0f172a; }
.jr-code { margin-top: 0.2mm; font-size: 6.6pt; color: #64748b; }
.jr-soft { color: #475569; font-size: 7.4pt; }
.jr-total td { padding-top: 1mm; padding-bottom: 1.8mm; border-top: 1px solid #cbd5e1; font-size: 7.8pt; font-weight: 800; color: #0f172a; }
.jr-rev-head td { padding: 1.4mm 1.6mm 0.8mm; border-top: 1px dashed #f87171; font-size: 7pt; color: #b42318; }
.jr-rev-line td { color: #7f1d1d; background: #fffafa; }
.jr-rev-total td { color: #7f1d1d; }
.jr-grand td { padding-top: 2mm; padding-bottom: 2mm; border-top: 1.4px solid #0f172a; border-bottom: 1.4px solid #0f172a;
               font-size: 8.6pt; font-weight: 800; color: #0f172a; }
.jr-none { padding: 6mm 0 !important; color: #64748b; }
.jr-fine { margin-top: 2.5mm; font-size: 7pt; color: #64748b; }
`;


//===============================================================
// Source
//===============================================================

export const AUTO_JOURNAL_REGISTERS_PRINT:
    PrintSourceDef<JournalPrintData> =
{
    key:AUTO_JOURNAL_PRINT_KEY,

    title:TITLE,

    // Portrait / Landscape switch in the viewer
    canRotate:true,

    async load
    (
        injector:
            Injector,
        id:
            number
    ):
        Promise<JournalPrintData>
    {
        const today =
            new Date();

        const request:
            JournalPrintRequest =
            readJournalPrintRequest(id)
            ??
            {
                from:toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
                to:toIsoDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
                branchId:0,
                node:'',
                voucherNo:''
            };

        const list =
            await firstValueFrom(
                injector
                    .get(AutoJournalRegistersService)
                    .getJournals(request.from, request.to, request.branchId, request.node)
            );

        return {
            request,
            list,
            journals:list.Journals.filter
            (
                x =>
                    (!request.voucherNo || x.VoucherNo === request.voucherNo)
                    &&
                    journalMatches(x, request.search ?? '')
            )
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
            JournalPrintData
    ):
        string
    {
        return data.request.voucherNo
            ? `Journal ${data.request.voucherNo}`
            : `${TITLE} ${data.list.From} to ${data.list.To}`;
    },

    documents:
    [
        {
            key:'journal-register',

            title:'Journal Register',

            icon:'fas fa-book',

            render:
                (data: JournalPrintData, kit: PrintKit) =>
                    registerHtml(data, kit, !!kit.landscape),

            css:
                JOURNAL_PRINT_CSS,

            excel:
                (data: JournalPrintData, kit: PrintKit) =>
                    registerSheet(data, kit)
        }
    ]
};


//===============================================================
// Header : two identical cards split by a divider
//===============================================================

function registerHead
(
    data:
        JournalPrintData,
    kit:
        PrintKit
):
    string
{
    const e =
        kit.escape;

    const company =
        kit.company;

    const period =
        `${kit.date(data.list.From)} – ${kit.date(data.list.To)}`;

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

    // Each fact stays whole (wraps between facts only)
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
                [
                    company?.CompanyName || 'AppCore ERP',
                    TITLE,
                    data.list.NodePath,
                    period,
                    `${data.journals.length} journals`
                ]
                .filter(part => !!part)
                .join(' | ')
            );
    }
    catch
    {
        qr = '';
    }

    const meta =
        [
            ['Source', data.list.NodePath || 'All Auto Journals'],
            ['Branch', data.list.BranchName || 'All Branches'],
            ...(data.request.voucherNo ? [['Journal', data.request.voucherNo]] : []),
            ...(data.request.search ? [['Search', data.request.search]] : []),
            ['Journals', data.list.Truncated && !data.request.voucherNo
                ? `${data.journals.length} of ${data.list.Total}`
                : `${data.journals.length}`]
        ]
        .map(([label, value]) => `<span><i>${e(label)}</i>${e(value)}</span>`)
        .join('');

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
      <span class="sh-kicker">Journal Register</span>
      <b class="sh-title">${e(TITLE)}</b>
      <span class="sh-asof">Period <b>${e(period)}</b></span>
    </div>
    ${qr ? `<div class="sh-qr">${qr}</div>` : ''}
  </div>
</div>
<div class="sh-meta">${meta}</div>`;
}


//===============================================================
// Journal Register
//===============================================================

function registerHtml
(
    data:
        JournalPrintData,
    kit:
        PrintKit,
    landscape:
        boolean
):
    string
{
    const e =
        kit.escape;

    // No repeats : a line's party / narration only when it adds
    // something (not the ledger's own party, not the journal's
    // narration or reversal reason); a column nobody needs is left
    // out. Portrait : the narration goes under the ledger.
    const withParty =
        data.journals.some(x => journalShowsParty(x));

    const withNotes =
        landscape && data.journals.some(x => journalShowsNotes(x));

    // Ledger · [Party] · [Narration] · Debit · Credit
    const cols =
        [
            withParty || withNotes ? (landscape ? '34%' : '52%') : '',
            ...(withParty ? [withNotes ? '22%' : ''] : []),
            ...(withNotes ? [''] : []),
            '24mm',
            '24mm'
        ];

    const colCount =
        cols.length;

    const lead =
        colCount - 2;

    const money =
        (value: number) =>
            value ? kit.money(value) : '';

    const lineRows =
        (journal: AutoJournal, lines: AutoJournalLine[], reversal: boolean) =>
            lines
                .map
                (
                    line =>
                    {
                        const note =
                            lineNote(line, journal, reversal);

                        return `<tr class="jr-line${reversal ? ' jr-rev-line' : ''}${line.Credit > 0 && !line.Debit ? ' jr-cr' : ''}">
  <td><div class="jr-ledger">${e(line.LedgerName)}</div><div class="jr-code">${e(line.LedgerCode)}${!withNotes && note ? ` · ${e(note)}` : ''}</div></td>
  ${withParty ? `<td class="jr-soft">${e(lineParty(line, journal))}</td>` : ''}
  ${withNotes ? `<td class="jr-soft">${e(note)}</td>` : ''}
  <td class="vd-r">${money(line.Debit)}</td>
  <td class="vd-r">${money(line.Credit)}</td>
</tr>`;
                    }
                )
                .join('');

    const sum =
        (lines: AutoJournalLine[], side: 'Debit' | 'Credit') =>
            lines.reduce((t, x) => t + x[side], 0);

    const body =
        data.journals
            .map
            (
                (journal, index) =>
                {
                    const facts =
                        [
                            kit.date(journal.VoucherDate),
                            journal.BranchName,
                            journal.SourceName,
                            partyText(journal.PartyType, journal.PartyCode, journal.PartyName),
                            journal.ReferenceNo ? `Ref ${journal.ReferenceNo}` : ''
                        ]
                        .filter(part => !!part)
                        .map(part => `<em>${e(part)}</em>`)
                        .join('<i> · </i>');

                    const reversal =
                        journal.IsReversed
                            ? `<tr class="jr-rev-head"><td colspan="${colCount}"><b>Reversal</b> ${e(kit.date(journal.ReversalDate))}${journal.ReversalReason ? ` · ${e(journal.ReversalReason)}` : ''}</td></tr>
${lineRows(journal, journal.ReversalLines, true)}
<tr class="jr-total jr-rev-total"><td colspan="${lead}" class="vd-r">Reversal Total</td><td class="vd-r">${kit.money(sum(journal.ReversalLines, 'Debit'))}</td><td class="vd-r">${kit.money(sum(journal.ReversalLines, 'Credit'))}</td></tr>`
                            : '';

                    // One body for the whole table : the print engine
                    // splits pages over the rows of the first body only
                    return `<tr class="jr-head"><td colspan="${colCount}">
  <span class="jr-sl">${index + 1}</span><b class="jr-no">${e(journal.VoucherNo)}</b><span class="jr-type">${e(journal.VoucherType)}</span>
  <span class="jr-facts">${facts}</span>
  ${journal.IsReversed ? '<span class="jr-tag">Reversed</span>' : ''}
</td></tr>
${journal.Narration ? `<tr class="jr-narr"><td colspan="${colCount}">${e(journal.Narration)}</td></tr>` : ''}
${lineRows(journal, journal.Lines, false)}
<tr class="jr-total"><td colspan="${lead}" class="vd-r">Total</td><td class="vd-r">${kit.money(journal.TotalDebit)}</td><td class="vd-r">${kit.money(journal.TotalCredit)}</td></tr>
${reversal}`;
                }
            )
            .join('');

    const debit =
        data.journals.reduce((t, x) => t + x.TotalDebit, 0);

    const credit =
        data.journals.reduce((t, x) => t + x.TotalCredit, 0);

    const reversed =
        data.journals.filter(x => x.IsReversed).length;

    return `<section class="pv-flow${landscape ? ' pv-landscape' : ''}" data-watermark="">
<div class="pv-run-head">
${registerHead(data, kit)}
</div>
<div class="pv-body">
<table class="pv-split vd-lines jr-lines">
  <colgroup>${cols.map(x => x ? `<col style="width:${x}">` : '<col>').join('')}</colgroup>
  <thead><tr>
    <th>Ledger</th>
    ${withParty ? '<th>Party</th>' : ''}
    ${withNotes ? '<th>Narration</th>' : ''}
    <th class="vd-r">Debit</th>
    <th class="vd-r">Credit</th>
  </tr></thead>
  <tbody>${body || `<tr><td colspan="${colCount}" class="vd-c jr-none">No journals in this period.</td></tr>`}</tbody>
  <tfoot>
    <tr class="jr-grand"><td colspan="${lead}" class="vd-r">Grand Total · ${data.journals.length} journal${data.journals.length === 1 ? '' : 's'}${reversed ? ` (${reversed} reversed)` : ''}</td><td class="vd-r">${kit.money(debit)}</td><td class="vd-r">${kit.money(credit)}</td></tr>
  </tfoot>
</table>
${data.list.Truncated && !data.request.voucherNo ? `<div class="jr-fine">First ${data.list.Shown} of ${data.list.Total} journals. Narrow the period to print the rest.</div>` : ''}
</div>
<div class="pv-end">
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>
</section>`;
}


//===============================================================
// Excel : one row per line
//===============================================================

function registerSheet
(
    data:
        JournalPrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const bold =
        (text: string): ExcelCell =>
            ({ v:text, s:'bold' });

    const rows:
        ExcelCell[][] = [];

    for (const journal of data.journals)
    {
        const add =
            (line: AutoJournalLine, kind: string, date: string) =>
                rows.push(
                    [
                        journal.VoucherNo,
                        journal.VoucherType,
                        kit.date(date),
                        journal.SourceName,
                        journal.BranchName,
                        kind,
                        line.LedgerCode,
                        line.LedgerName,
                        partyText(line.PartyType, line.PartyCode, line.PartyName),
                        line.Narration,
                        { v:line.Debit, s:'money' },
                        { v:line.Credit, s:'money' }
                    ]
                );

        journal.Lines.forEach(line => add(line, 'Journal', journal.VoucherDate));

        journal.ReversalLines.forEach(line => add(line, 'Reversal', journal.ReversalDate));
    }

    return {
        name:'Journal Register',
        columns:[26, 8, 13, 26, 18, 10, 14, 30, 28, 40, 14, 14],
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [bold(`${TITLE.toUpperCase()} - JOURNAL REGISTER`)],
            [bold('Source'), data.list.NodePath || 'All Auto Journals', null, bold('Branch'), data.list.BranchName || 'All Branches'],
            [bold('Period'), `${kit.date(data.list.From)} - ${kit.date(data.list.To)}`, null, bold('Journals'), data.journals.length],
            [],
            [
                bold('Voucher No'),
                bold('Type'),
                bold('Date'),
                bold('Source'),
                bold('Branch'),
                bold('Line'),
                bold('Ledger Code'),
                bold('Ledger'),
                bold('Party'),
                bold('Narration'),
                bold('Debit'),
                bold('Credit')
            ],
            ...rows,
            [],
            [
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                bold('Total (journals)'),
                { v:data.journals.reduce((t, x) => t + x.TotalDebit, 0), s:'boldMoney' },
                { v:data.journals.reduce((t, x) => t + x.TotalCredit, 0), s:'boldMoney' }
            ]
        ]
    };
}
