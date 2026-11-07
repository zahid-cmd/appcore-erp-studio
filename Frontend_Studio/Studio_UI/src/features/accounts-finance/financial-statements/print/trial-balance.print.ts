//===============================================================
// Trial Balance : print source (Print Engine)
//
//   /print-viewer/trial-balance/<token>?doc=trial-balance
//   (&orient=landscape : the viewer's Portrait / Landscape switch)
//
// The page saves what is on its canvas (period, branch, view,
// level, switches, search) under the token; the viewer loads the
// trial balance again from the server and builds the same tree.
// Excel : the viewer's Excel button (same rows).
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
    TRIAL_BALANCE_LEVELS,
    TRIAL_BALANCE_PRINT_KEY,
    TrialBalance,
    TrialBalancePrintRequest,
    TrialBalanceTree,
    buildTrialBalanceTree,
    crOf,
    drOf,
    isBalanced,
    toIsoDate
}
from '../models/trial-balance.model';

import
{
    TrialBalanceService
}
from '../services/trial-balance.service';


//===============================================================
// Request saved by the page
//===============================================================

const STORAGE_PREFIX =
    'appcore.trial-balance-print.';

export function saveTrialBalancePrintRequest
(
    request:
        TrialBalancePrintRequest
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
        // Storage blocked : the viewer prints this month, all
        // allotted branches, six-column, down to ledgers
    }

    return token;
}

function readRequest
(
    token:
        number
):
    TrialBalancePrintRequest | null
{
    try
    {
        const text =
            localStorage.getItem(STORAGE_PREFIX + token);

        return text
            ? JSON.parse(text) as TrialBalancePrintRequest
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

export interface TrialBalancePrintData
{
    request:TrialBalancePrintRequest;
    report:TrialBalance;
    tree:TrialBalanceTree;
}


//===============================================================
// Styles
//===============================================================

const TRIAL_BALANCE_PRINT_CSS = `
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
.tb-band { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 0 0 2.4mm; border: 1px solid #c7d5f0; border-radius: 1.8mm; overflow: hidden; }
.tb-band > div { display: flex; flex-direction: column; padding: 1.1mm 3mm; border-right: 1px solid #e2e8f0; min-width: 0; }
.tb-band > div:last-child { border-right: 0; }
.tb-band span { font-size: 6pt; font-weight: 700; letter-spacing: 0.7pt; text-transform: uppercase; color: #64748b; }
.tb-band b { font-size: 9.6pt; font-weight: 800; color: #0b2a5b; font-variant-numeric: tabular-nums; white-space: nowrap; }
.tb-band .ok b { color: #15803d; }
.tb-band .bad b { color: #b42318; }
table.tb-lines { width: 100%; border-collapse: collapse; table-layout: fixed; }
.tb-lines th { font-size: 6.3pt; font-weight: 700; letter-spacing: 0.5pt; text-transform: uppercase; color: #475569; text-align: left;
               padding: 1.3mm 1.4mm; border-bottom: 1px solid #0f172a; background: #f8fafc; white-space: nowrap; }
.tb-lines thead tr:first-child th { border-top: 1.2px solid #0f172a; }
.tb-lines th.c { text-align: center; }
.tb-lines td { padding: 1mm 1.4mm; border-bottom: 1px solid #edf1f6; vertical-align: top; font-size: 7.6pt; overflow-wrap: anywhere; }
.tb-r { text-align: right !important; font-variant-numeric: tabular-nums; white-space: nowrap; }
.tb-rule { border-left: 1px solid #dbe3ef; }
.tb-code { margin-left: 1.2mm; font-size: 6.2pt; color: #94a3b8; white-space: nowrap; }
.tb-l1 td { background: #eef3fc; font-weight: 800; color: #0b2a5b; }
.tb-l2 td { background: #f8fafd; font-weight: 700; }
.tb-l2 td:first-child { padding-left: 4mm; }
.tb-l3 td { font-weight: 600; }
.tb-l3 td:first-child { padding-left: 7mm; }
.tb-l4 td:first-child { padding-left: 10mm; }
.tb-lines tbody tr:last-child td { border-bottom: 0; }
.tb-close td { padding-top: 1.6mm; padding-bottom: 1.6mm; border-top: 1.2px solid #0f172a; border-bottom: 1.2px solid #0f172a; font-size: 8.2pt; font-weight: 800; color: #0b2a5b; }
.tb-none { padding: 6mm 0 !important; color: #64748b; text-align: center; }
.tb-fine { margin-top: 2.5mm; font-size: 7pt; color: #64748b; }
`;


//===============================================================
// Source
//===============================================================

export const TRIAL_BALANCE_PRINT:
    PrintSourceDef<TrialBalancePrintData> =
{
    key:TRIAL_BALANCE_PRINT_KEY,

    title:'Trial Balance',

    canRotate:true,

    async load
    (
        injector:
            Injector,
        id:
            number | string
    ):
        Promise<TrialBalancePrintData>
    {
        const now =
            new Date();

        const request:
            TrialBalancePrintRequest =
            readRequest(Number(id))
            ??
            {
                from:toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
                to:toIsoDate(now),
                branchId:0,
                showCancelled:false,
                view:'six',
                level:4,
                showCodes:true,
                showZeroBalance:false,
                showNoTransactions:false,
                search:''
            };

        const report =
            await firstValueFrom(
                injector
                    .get(TrialBalanceService)
                    .getTrialBalance(
                        {
                            from:request.from,
                            to:request.to,
                            branchId:request.branchId,
                            showCancelled:request.showCancelled
                        }
                    )
            );

        const tree =
            buildTrialBalanceTree(
                report.Rows,
                {
                    view:request.view,
                    level:request.level,
                    showZeroBalance:request.showZeroBalance,
                    showNoTransactions:request.showNoTransactions,
                    search:request.search ?? ''
                }
            );

        return {
            request,
            report,
            tree
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
            TrialBalancePrintData
    ):
        string
    {
        return `Trial Balance - ${data.report.From} to ${data.report.To}`;
    },

    documents:
    [
        {
            key:'trial-balance',
            title:'Trial Balance',
            icon:'fas fa-scale-balanced',
            render:
                (data: TrialBalancePrintData, kit: PrintKit) =>
                    trialBalanceHtml(data, kit, !!kit.landscape),
            css:
                TRIAL_BALANCE_PRINT_CSS,
            excel:
                (data: TrialBalancePrintData, kit: PrintKit) =>
                    trialBalanceSheet(data, kit)
        }
    ]
};


//===============================================================
// Header : company card | document card
//===============================================================

function head
(
    kit:
        PrintKit,
    data:
        TrialBalancePrintData
):
    string
{
    const e =
        kit.escape;

    const company =
        kit.company;

    const r =
        data.report;

    const period =
        `${kit.date(r.From)} – ${kit.date(r.To)}`;

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
                [company?.CompanyName || 'AppCore ERP', 'Trial Balance', period, r.BranchName]
                    .filter(part => !!part)
                    .join(' | ')
            );
    }
    catch
    {
        qr = '';
    }

    const level =
        TRIAL_BALANCE_LEVELS.find(x => x.value === data.request.level)?.label ?? '';

    const meta:
        string[][] =
    [
        ['Branch', r.BranchName],
        ['Columns', data.request.view === 'six' ? 'Six-column' : 'Two-column'],
        ['Down to', level],
        ['Income & expense from', r.YearStart ? kit.date(r.YearStart) : ''],
        ['Cancelled', r.ShowCancelled ? 'Shown' : ''],
        ['Search', data.request.search ?? '']
    ];

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
      <b class="sh-title">Trial Balance</b>
      <span class="sh-asof">Period <b>${e(period)}</b></span>
    </div>
    ${qr ? `<div class="sh-qr">${qr}</div>` : ''}
  </div>
</div>
<div class="sh-meta">${meta.filter(x => !!x[1]).map(([label, value]) => `<span><i>${e(label)}</i>${e(value)}</span>`).join('')}</div>`;
}


//===============================================================
// Page
//===============================================================

function trialBalanceHtml
(
    data:
        TrialBalancePrintData,
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

    const tree =
        data.tree;

    const six =
        data.request.view === 'six';

    const showCodes =
        data.request.showCodes !== false;

    const amount =
        (value: number) =>
            Math.abs(value) < 0.005 ? '' : kit.money(value);

    const cells =
        (opening: number, debit: number, credit: number, closing: number) =>
            six
                ? `<td class="tb-r tb-rule">${amount(drOf(opening))}</td><td class="tb-r">${amount(crOf(opening))}</td>`
                  + `<td class="tb-r tb-rule">${amount(debit)}</td><td class="tb-r">${amount(credit)}</td>`
                  + `<td class="tb-r tb-rule">${amount(drOf(closing))}</td><td class="tb-r">${amount(crOf(closing))}</td>`
                : `<td class="tb-r tb-rule">${amount(drOf(closing))}</td><td class="tb-r">${amount(crOf(closing))}</td>`;

    const body =
        tree.nodes
            .map
            (
                node =>
                    `<tr class="tb-l${node.level}"><td>${e(node.name)}${showCodes && node.code ? `<span class="tb-code">${e(node.code)}</span>` : ''}</td>${cells(node.opening, node.debit, node.credit, node.closing)}</tr>`
            )
            .join('');

    const t =
        tree.totals;

    const colCount =
        six ? 7 : 3;

    const widths =
        six
            ? ['', ...Array(6).fill(landscape ? '30mm' : '21mm')]
            : ['', '34mm', '34mm'];

    const headRows =
        six
            ? `<tr><th rowspan="2">Account</th><th class="c tb-rule" colspan="2">Opening</th><th class="c tb-rule" colspan="2">Period</th><th class="c tb-rule" colspan="2">Closing</th></tr>
<tr><th class="tb-r tb-rule">Debit</th><th class="tb-r">Credit</th><th class="tb-r tb-rule">Debit</th><th class="tb-r">Credit</th><th class="tb-r tb-rule">Debit</th><th class="tb-r">Credit</th></tr>`
            : `<tr><th>Account</th><th class="tb-r tb-rule">Debit</th><th class="tb-r">Credit</th></tr>`;

    const foot =
        six
            ? `<td class="tb-r tb-rule">${kit.money(t.OpeningDebit)}</td><td class="tb-r">${kit.money(t.OpeningCredit)}</td><td class="tb-r tb-rule">${kit.money(t.PeriodDebit)}</td><td class="tb-r">${kit.money(t.PeriodCredit)}</td><td class="tb-r tb-rule">${kit.money(t.ClosingDebit)}</td><td class="tb-r">${kit.money(t.ClosingCredit)}</td>`
            : `<td class="tb-r tb-rule">${kit.money(t.ClosingDebit)}</td><td class="tb-r">${kit.money(t.ClosingCredit)}</td>`;

    const balanced =
        isBalanced(r.Difference);

    const prior =
        Math.abs(r.PriorYearsResult) >= 0.005
            ? `<div class="tb-fine">The opening of ${e(r.RetainedEarningsName || 'Retained Earnings')} includes the result of the earlier financial years : ${e(kit.money(Math.abs(r.PriorYearsResult)))} ${r.PriorYearsResult < 0 ? 'Cr (profit)' : 'Dr (loss)'}.</div>`
            : '';

    return `<section class="pv-flow${landscape ? ' pv-landscape' : ''}" data-watermark="">
<div class="pv-run-head">
${head(kit, data)}
</div>
<div class="pv-body">
<div class="tb-band">
  <div><span>Total Dr</span><b>${e(kit.money(r.ClosingDebit))}</b></div>
  <div><span>Total Cr</span><b>${e(kit.money(r.ClosingCredit))}</b></div>
  <div class="${balanced ? 'ok' : 'bad'}"><span>Difference</span><b>${balanced ? 'Balanced' : e(kit.money(r.Difference))}</b></div>
</div>
<table class="pv-split tb-lines">
  <colgroup>${widths.map(x => x ? `<col style="width:${x}">` : '<col>').join('')}</colgroup>
  <thead>${headRows}</thead>
  <tbody>${body || `<tr><td colspan="${colCount}" class="tb-none">No ledgers to show.</td></tr>`}</tbody>
  <tfoot>
    <tr class="tb-close"><td class="tb-r">Total · ${tree.ledgerCount} ledger${tree.ledgerCount === 1 ? '' : 's'}</td>${foot}</tr>
  </tfoot>
</table>
${prior}
${r.Message ? `<div class="tb-fine">${e(r.Message)}</div>` : ''}
</div>
<div class="pv-end">
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>
</section>`;
}


//===============================================================
// Excel
//===============================================================

function trialBalanceSheet
(
    data:
        TrialBalancePrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const r =
        data.report;

    const six =
        data.request.view === 'six';

    const bold =
        (text: string): ExcelCell =>
            ({ v:text, s:'bold' });

    const money =
        (value: number, strong = false): ExcelCell =>
            Math.abs(value) < 0.005
                ? null
                : { v:value, s:strong ? 'boldMoney' : 'money' };

    const indent =
        (level: number) =>
            '    '.repeat(level - 1);

    const header:
        ExcelCell[] =
        six
            ? [bold('Account'), bold('Code'), bold('Opening Dr'), bold('Opening Cr'), bold('Period Dr'), bold('Period Cr'), bold('Closing Dr'), bold('Closing Cr')]
            : [bold('Account'), bold('Code'), bold('Debit'), bold('Credit')];

    const rows:
        ExcelCell[][] =
        data.tree.nodes.map
        (
            node =>
            {
                const strong =
                    node.level < data.request.level;

                const name:
                    ExcelCell =
                    strong
                        ? bold(indent(node.level) + node.name)
                        : indent(node.level) + node.name;

                return six
                    ? [name, node.code, money(drOf(node.opening), strong), money(crOf(node.opening), strong), money(node.debit, strong), money(node.credit, strong), money(drOf(node.closing), strong), money(crOf(node.closing), strong)]
                    : [name, node.code, money(drOf(node.closing), strong), money(crOf(node.closing), strong)];
            }
        );

    const t =
        data.tree.totals;

    const total:
        ExcelCell[] =
        six
            ? [bold('Total'), null, { v:t.OpeningDebit, s:'boldMoney' }, { v:t.OpeningCredit, s:'boldMoney' }, { v:t.PeriodDebit, s:'boldMoney' }, { v:t.PeriodCredit, s:'boldMoney' }, { v:t.ClosingDebit, s:'boldMoney' }, { v:t.ClosingCredit, s:'boldMoney' }]
            : [bold('Total'), null, { v:t.ClosingDebit, s:'boldMoney' }, { v:t.ClosingCredit, s:'boldMoney' }];

    return {
        name:'Trial Balance',
        columns:six ? [48, 24, 16, 16, 16, 16, 16, 16] : [48, 24, 18, 18],
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [bold('TRIAL BALANCE')],
            [bold('Period'), `${kit.date(r.From)} - ${kit.date(r.To)}`, bold('Branch'), r.BranchName],
            [],
            header,
            ...rows,
            total
        ]
    };
}
