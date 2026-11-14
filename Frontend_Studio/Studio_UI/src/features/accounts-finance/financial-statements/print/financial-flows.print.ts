//===============================================================
// Financial flows : print sources (Print Engine)
//
//   /print-viewer/receipt-payment/<token>?doc=receipt-payment
//   /print-viewer/cash-flow/<token>?doc=cash-flow
//   /print-viewer/changes-in-equity/<token>?doc=changes-in-equity
//
// The page saves its filter and switches under the token; the
// viewer loads the figures again and builds the same lines.
// Excel : the viewer's Excel button. Header, styles and helpers
// are shared with the Profit & Loss / Balance Sheet prints.
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
    isZero,
    toIsoDate
}
from '../models/final-accounts.model';

import
{
    CASH_FLOW_PRINT_KEY,
    CHANGES_IN_EQUITY_PRINT_KEY,
    CashFlowTotals,
    CashFlows,
    CfLine,
    ChangesInEquity,
    EQUITY_MATRIX_ROWS,
    EquityLedger,
    EquityMatrix,
    FlowPrintRequest,
    RECEIPT_PAYMENT_PRINT_KEY,
    ReceiptPayment,
    RpItem,
    buildCashFlowLines,
    buildEquityMatrix,
    buildReceiptPayment,
    cashFlowTotals,
    equityLedgersShown,
    yearStartGuess
}
from '../models/financial-flows.model';

import
{
    FinancialFlowsService
}
from '../services/financial-flows.service';

import
{
    FINAL_ACCOUNTS_PRINT_CSS,
    amountOf,
    head,
    levelLabel,
    readRequest,
    saveRequest
}
from './final-accounts.print';


//===============================================================
// Requests saved by the pages
//===============================================================

const STORAGE_PREFIX =
    'appcore.flows-print.';

export function saveFlowPrintRequest
(
    key:
        string,
    request:
        FlowPrintRequest
):
    number
{
    return saveRequest(`${STORAGE_PREFIX}${key}.`, request);
}

function requestOf
(
    key:
        string,
    id:
        number | string,
    from:
        Date
):
    FlowPrintRequest
{
    return readRequest<FlowPrintRequest>(`${STORAGE_PREFIX}${key}.`, Number(id))
        ??
        {
            from:toIsoDate(from),
            to:toIsoDate(new Date()),
            branchId:0,
            showCancelled:false,
            level:1,
            showCodes:true,
            showZero:false,
            search:'',
            showTransfers:false,
            showCashLedgers:true,
            showLedgers:true
        };
}

function monthStart():
    Date
{
    const now =
        new Date();

    return new Date(now.getFullYear(), now.getMonth(), 1);
}

const FLOWS_PRINT_CSS =
    FINAL_ACCOUNTS_PRINT_CSS + `
.fa-in { color: #15803d; }
.fa-out { color: #b42318; }
.fa-sec td.fa-in, .fa-sec td.fa-out, .fa-res td.fa-in, .fa-res td.fa-out { color: inherit; }
.ce-neg { color: #b42318; }
.ce-tot { background: #f3f7ff; font-weight: 800; color: #0b2a5b; }
.ce-open td { font-weight: 700; color: #0b2a5b; }
.ce-group td { background: #f5f8fd; font-weight: 700; color: #1e3a8a; }
.ce-ok { color: #15803d; font-weight: 800; }
.ce-bad { color: #b42318; font-weight: 800; }
`;

function shell
(
    kit:
        PrintKit,
    landscape:
        boolean,
    header:
        string,
    body:
        string
):
    string
{
    const e =
        kit.escape;

    return `<section class="pv-flow${landscape ? ' pv-landscape' : ''}" data-watermark="">
<div class="pv-run-head">
${header}
</div>
<div class="pv-body">
${body}
</div>
<div class="pv-end">
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>
</section>`;
}

function periodOf
(
    kit:
        PrintKit,
    from:
        string,
    to:
        string
):
    string
{
    return `${kit.date(from)} – ${kit.date(to)}`;
}

function bold
(
    text:
        string
):
    ExcelCell
{
    return { v:text, s:'bold' };
}

function money
(
    value:
        number,
    strong = false
):
    ExcelCell
{
    return isZero(value) && !strong
        ? null
        : { v:value, s:strong ? 'boldMoney' : 'money' };
}


//===============================================================
// Receipt & Payment Account
//===============================================================

export interface ReceiptPaymentPrintData
{
    request:FlowPrintRequest;
    report:CashFlows;
    sides:ReceiptPayment;
}

export const RECEIPT_PAYMENT_PRINT:
    PrintSourceDef<ReceiptPaymentPrintData> =
{
    key:RECEIPT_PAYMENT_PRINT_KEY,

    title:'Receipt & Payment Account',

    canRotate:true,

    async load
    (
        injector:
            Injector,
        id:
            number | string
    ):
        Promise<ReceiptPaymentPrintData>
    {
        const request =
            requestOf(RECEIPT_PAYMENT_PRINT_KEY, id, monthStart());

        const report =
            await firstValueFrom(
                injector.get(FinancialFlowsService).getCashFlows(request));

        return {
            request,
            report,
            sides:
                buildReceiptPayment(
                    report,
                    {
                        level:request.level,
                        search:request.search ?? '',
                        showTransfers:!!request.showTransfers,
                        showCashLedgers:request.showCashLedgers !== false
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
            ReceiptPaymentPrintData
    ):
        string
    {
        return `Receipt and Payment - ${data.report.From} to ${data.report.To}`;
    },

    documents:
    [
        {
            key:'receipt-payment',
            title:'Receipt & Payment Account',
            icon:'fas fa-receipt',
            render:
                (data: ReceiptPaymentPrintData, kit: PrintKit) =>
                    receiptPaymentHtml(data, kit, !!kit.landscape),
            css:
                FLOWS_PRINT_CSS,
            excel:
                (data: ReceiptPaymentPrintData, kit: PrintKit) =>
                    receiptPaymentSheet(data, kit)
        }
    ]
};

function receiptPaymentHtml
(
    data:
        ReceiptPaymentPrintData,
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

    const period =
        periodOf(kit, r.From, r.To);

    const showCodes =
        data.request.showCodes !== false;

    const header =
        head(
            kit,
            'Receipt & Payment Account',
            'Period',
            period,
            r.BranchName,
            [
                ['Branch', r.BranchName],
                ['Down to', levelLabel(data.request.level)],
                ['Contra transfers', data.request.showTransfers ? 'Shown' : 'Hidden'],
                ['Cancelled', r.ShowCancelled ? 'Shown' : ''],
                ['Search', data.request.search ?? '']
            ]);

    const cell =
        (item: RpItem | undefined, cr: boolean) =>
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

    const s =
        data.sides;

    const count =
        Math.max(s.receipts.length, s.payments.length);

    const rows =
        Array.from({ length:count }, (_, i) => `<tr>${cell(s.receipts[i], false)}${cell(s.payments[i], true)}</tr>`)
            .join('');

    const body =
        `<div class="fa-band">
  <div><span>Receipts</span><b>${e(amountOf(kit, r.Receipts, true))}</b></div>
  <div><span>Payments</span><b>${e(amountOf(kit, r.Payments, true))}</b></div>
  <div class="${isZero(s.receiptsTotal - s.paymentsTotal) ? 'ok' : 'bad'}"><span>Both sides</span><b>${isZero(s.receiptsTotal - s.paymentsTotal) ? 'Agree' : e(amountOf(kit, s.receiptsTotal - s.paymentsTotal, true))}</b></div>
</div>
<div class="fa-t">
<div class="fa-t-title">Receipt &amp; Payment Account for ${e(period)}</div>
<table class="pv-split fa-lines">
  <colgroup><col><col style="width:27mm"><col><col style="width:27mm"></colgroup>
  <thead><tr><th>Dr · Receipts</th><th class="fa-r">Amount</th><th class="fa-cr">Cr · Payments</th><th class="fa-r">Amount</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr class="fa-tot"><td class="fa-r">Total</td><td class="fa-r">${e(amountOf(kit, s.receiptsTotal, true))}</td><td class="fa-r fa-cr">Total</td><td class="fa-r">${e(amountOf(kit, s.paymentsTotal, true))}</td></tr></tfoot>
</table>
</div>
${r.Message ? `<div class="fa-fine">${e(r.Message)}</div>` : ''}`;

    return shell(kit, landscape, header, body);
}

function receiptPaymentSheet
(
    data:
        ReceiptPaymentPrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const r =
        data.report;

    const indent =
        (item: RpItem) =>
            '    '.repeat(item.level);

    const side =
        (items: RpItem[]): ExcelCell[][] =>
            items.map
            (
                item =>
                    [
                        item.strong ? bold(item.name) : indent(item) + item.name,
                        item.code || null,
                        money(item.amount, item.strong)
                    ]
            );

    return {
        name:'Receipt & Payment',
        columns:[52, 24, 18],
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [bold('RECEIPT & PAYMENT ACCOUNT')],
            [bold('Period'), `${kit.date(r.From)} - ${kit.date(r.To)}`, bold('Branch'), r.BranchName],
            [],
            [bold('RECEIPTS (Dr)'), bold('Code'), bold('Amount')],
            ...side(data.sides.receipts),
            [bold('Total'), null, { v:data.sides.receiptsTotal, s:'boldMoney' }],
            [],
            [bold('PAYMENTS (Cr)'), bold('Code'), bold('Amount')],
            ...side(data.sides.payments),
            [bold('Total'), null, { v:data.sides.paymentsTotal, s:'boldMoney' }]
        ]
    };
}


//===============================================================
// Cash Flow Statement
//===============================================================

export interface CashFlowPrintData
{
    request:FlowPrintRequest;
    report:CashFlows;
    lines:CfLine[];
    totals:CashFlowTotals;
}

export const CASH_FLOW_PRINT:
    PrintSourceDef<CashFlowPrintData> =
{
    key:CASH_FLOW_PRINT_KEY,

    title:'Cash Flow Statement',

    canRotate:true,

    async load
    (
        injector:
            Injector,
        id:
            number | string
    ):
        Promise<CashFlowPrintData>
    {
        const request =
            requestOf(CASH_FLOW_PRINT_KEY, id, yearStartGuess());

        const report =
            await firstValueFrom(
                injector.get(FinancialFlowsService).getCashFlows(request));

        return {
            request,
            report,
            lines:
                buildCashFlowLines(
                    report,
                    {
                        level:request.level,
                        showZero:request.showZero,
                        search:request.search ?? ''
                    }),
            totals:cashFlowTotals(report)
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
            CashFlowPrintData
    ):
        string
    {
        return `Cash Flow Statement - ${data.report.From} to ${data.report.To}`;
    },

    documents:
    [
        {
            key:'cash-flow',
            title:'Cash Flow Statement',
            icon:'fas fa-money-bill-transfer',
            render:
                (data: CashFlowPrintData, kit: PrintKit) =>
                    cashFlowHtml(data, kit, !!kit.landscape),
            css:
                FLOWS_PRINT_CSS,
            excel:
                (data: CashFlowPrintData, kit: PrintKit) =>
                    cashFlowSheet(data, kit)
        }
    ]
};

function cashFlowHtml
(
    data:
        CashFlowPrintData,
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

    const period =
        periodOf(kit, r.From, r.To);

    const showCodes =
        data.request.showCodes !== false;

    const header =
        head(
            kit,
            'Cash Flow Statement',
            'Period',
            period,
            r.BranchName,
            [
                ['Branch', r.BranchName],
                ['Method', 'Direct'],
                ['Down to', levelLabel(data.request.level)],
                ['Transfers left out', amountOf(kit, r.Transfers, true)],
                ['Cancelled', r.ShowCancelled ? 'Shown' : ''],
                ['Search', data.request.search ?? '']
            ]);

    const rowClass =
        (line: CfLine) =>
            line.kind === 'section' ? 'fa-sec'
            : line.kind === 'result' ? `fa-res ${line.tone ?? ''}`
            : `fa-l${line.level}`;

    const flowCell =
        (value: number | undefined, css: string) =>
            `<td class="fa-r fa-rule ${css}">${value === undefined ? '' : e(amountOf(kit, value, false))}</td>`;

    const body =
        data.lines
            .map
            (
                line =>
                {
                    const net =
                        line.check
                            ? (isZero(line.amount) ? 'Balanced' : amountOf(kit, line.amount, true))
                            : amountOf(kit, line.amount, line.kind !== 'node');

                    return `<tr class="${rowClass(line)}"><td>${e(line.name)}${showCodes && line.code && line.kind === 'node' ? `<span class="fa-code">${e(line.code)}</span>` : ''}</td>`
                        + flowCell(line.inflow, 'fa-in')
                        + flowCell(line.outflow, 'fa-out')
                        + `<td class="fa-r fa-rule">${e(net)}</td></tr>`;
                }
            )
            .join('');

    const t =
        data.totals;

    const content =
        `<div class="fa-band">
  <div><span>Opening cash</span><b>${e(amountOf(kit, r.Opening, true))}</b></div>
  <div><span>Net change</span><b>${e(amountOf(kit, t.netChange, true))}</b></div>
  <div class="${isZero(r.Difference) ? 'ok' : 'bad'}"><span>Closing cash</span><b>${e(amountOf(kit, r.Closing, true))}</b></div>
</div>
<table class="pv-split fa-lines">
  <colgroup><col><col style="width:26mm"><col style="width:26mm"><col style="width:28mm"></colgroup>
  <thead><tr><th>Account</th><th class="fa-r fa-rule">Received</th><th class="fa-r fa-rule">Paid</th><th class="fa-r fa-rule">Net<small>${e(period)}</small></th></tr></thead>
  <tbody>${body}</tbody>
</table>
${r.Message ? `<div class="fa-fine">${e(r.Message)}</div>` : ''}
${data.request.search ? '<div class="fa-fine">Only the ledgers matching the search are listed; the section totals and results are of the whole statement.</div>' : ''}`;

    return shell(kit, landscape, header, content);
}

function cashFlowSheet
(
    data:
        CashFlowPrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const r =
        data.report;

    const rows:
        ExcelCell[][] =
        data.lines.map
        (
            line =>
            {
                const strong =
                    line.kind !== 'node';

                return [
                    strong ? bold(line.name) : '    '.repeat(line.level) + line.name,
                    line.kind === 'node' ? line.code : null,
                    line.inflow === undefined ? null : money(line.inflow, strong),
                    line.outflow === undefined ? null : money(line.outflow, strong),
                    line.check ? (isZero(line.amount) ? 'Balanced' : money(line.amount, true)) : money(line.amount, strong)
                ];
            }
        );

    return {
        name:'Cash Flow',
        columns:[50, 24, 18, 18, 18],
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [bold('CASH FLOW STATEMENT (DIRECT METHOD)')],
            [bold('Period'), `${kit.date(r.From)} - ${kit.date(r.To)}`, bold('Branch'), r.BranchName],
            [],
            [bold('Account'), bold('Code'), bold('Received'), bold('Paid'), bold('Net')],
            ...rows
        ]
    };
}


//===============================================================
// Changes in Equity
//===============================================================

export interface ChangesInEquityPrintData
{
    request:FlowPrintRequest;
    report:ChangesInEquity;
    matrix:EquityMatrix;
    ledgers:EquityLedger[];
}

export const CHANGES_IN_EQUITY_PRINT:
    PrintSourceDef<ChangesInEquityPrintData> =
{
    key:CHANGES_IN_EQUITY_PRINT_KEY,

    title:'Changes in Equity',

    canRotate:true,

    async load
    (
        injector:
            Injector,
        id:
            number | string
    ):
        Promise<ChangesInEquityPrintData>
    {
        const request =
            requestOf(CHANGES_IN_EQUITY_PRINT_KEY, id, yearStartGuess());

        const report =
            await firstValueFrom(
                injector.get(FinancialFlowsService).getChangesInEquity(request));

        return {
            request,
            report,
            matrix:buildEquityMatrix(report),
            ledgers:equityLedgersShown(report, request.search ?? '', request.showZero)
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
            ChangesInEquityPrintData
    ):
        string
    {
        return `Changes in Equity - ${data.report.From} to ${data.report.To}`;
    },

    documents:
    [
        {
            key:'changes-in-equity',
            title:'Changes in Equity',
            icon:'fas fa-landmark',
            render:
                (data: ChangesInEquityPrintData, kit: PrintKit) =>
                    changesInEquityHtml(data, kit, !!kit.landscape),
            css:
                FLOWS_PRINT_CSS,
            excel:
                (data: ChangesInEquityPrintData, kit: PrintKit) =>
                    changesInEquitySheet(data, kit)
        }
    ]
};

function changesInEquityHtml
(
    data:
        ChangesInEquityPrintData,
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

    const m =
        data.matrix;

    const period =
        periodOf(kit, r.From, r.To);

    const showCodes =
        data.request.showCodes !== false;

    const header =
        head(
            kit,
            'Statement of Changes in Equity',
            'Period',
            period,
            r.BranchName,
            [
                ['Branch', r.BranchName],
                ['Profit / loss from', r.YearStart ? kit.date(r.YearStart) : ''],
                ['Cancelled', r.ShowCancelled ? 'Shown' : ''],
                ['Search', data.request.search ?? '']
            ]);

    const columns =
        [...m.columns, m.total];

    const rowName =
        (key: string, name: string) =>
            key === 'opening' ? `Opening balance at ${kit.date(r.From)}`
            : key === 'closing' ? `Closing balance at ${kit.date(r.To)}`
            : name;

    const matrixRows =
        EQUITY_MATRIX_ROWS
            .map
            (
                row =>
                {
                    const strong =
                        row.key === 'opening' || row.key === 'closing';

                    const cells =
                        columns
                            .map
                            (
                                column =>
                                {
                                    const value =
                                        column[row.key] * row.sign;

                                    return `<td class="fa-r fa-rule${column === m.total ? ' ce-tot' : ''}${value < 0 ? ' ce-neg' : ''}">${e(amountOf(kit, value, strong || column === m.total))}</td>`;
                                }
                            )
                            .join('');

                    return `<tr class="${row.key === 'closing' ? 'fa-res' : row.key === 'opening' ? 'ce-open' : ''}"><td>${e(rowName(row.key, row.name))}</td>${cells}</tr>`;
                }
            )
            .join('');

    const balanced =
        isZero(r.Difference);

    const ledgerRows =
        data.request.showLedgers !== false
            ? m.columns
                .map
                (
                    column =>
                    {
                        const items =
                            data.ledgers.filter(x => (x.GroupCode || x.GroupName || '-') === column.key);

                        if (items.length === 0)
                        {
                            return '';
                        }

                        return `<tr class="ce-group"><td colspan="6">${e(column.name)}</td></tr>`
                            + items
                                .map
                                (
                                    x =>
                                        `<tr><td style="padding-left:4mm">${e(x.LedgerName)}${showCodes && x.LedgerCode ? `<span class="fa-code">${e(x.LedgerCode)}</span>` : ''}</td>`
                                        + `<td class="fa-r fa-rule">${e(amountOf(kit, x.Opening, false))}</td>`
                                        + `<td class="fa-r fa-rule">${e(amountOf(kit, x.Profit, false))}</td>`
                                        + `<td class="fa-r fa-rule">${e(amountOf(kit, x.Added, false))}</td>`
                                        + `<td class="fa-r fa-rule ce-neg">${e(amountOf(kit, -x.Withdrawn, false))}</td>`
                                        + `<td class="fa-r fa-rule ce-tot">${e(amountOf(kit, x.Closing, true))}</td></tr>`
                                )
                                .join('');
                    }
                )
                .join('')
            : '';

    const content =
        `<div class="fa-band">
  <div><span>Opening equity</span><b>${e(amountOf(kit, r.Opening, true))}</b></div>
  <div class="${r.Profit < 0 ? 'bad' : 'ok'}"><span>${r.Profit < 0 ? 'Loss' : 'Profit'} for the period</span><b>${e(amountOf(kit, r.Profit, true))}</b></div>
  <div class="${balanced ? 'ok' : 'bad'}"><span>Closing equity</span><b>${e(amountOf(kit, r.Closing, true))}</b></div>
</div>
<table class="pv-split fa-lines">
  <colgroup><col style="width:${landscape ? '62mm' : '48mm'}">${columns.map(() => '<col>').join('')}</colgroup>
  <thead><tr><th>Particulars</th>${columns.map(c => `<th class="fa-r fa-rule${c === m.total ? ' ce-tot' : ''}">${e(c.name)}${c.hasRetained ? ' *' : ''}</th>`).join('')}</tr></thead>
  <tbody>${matrixRows}</tbody>
</table>
<div class="fa-fine">Equity on the Balance Sheet at ${e(kit.date(r.To))} (incl. the profit / loss to date) : ${e(amountOf(kit, r.BalanceSheetEquity, true))} · <span class="${balanced ? 'ce-ok' : 'ce-bad'}">${balanced ? 'Agrees' : `Difference ${e(amountOf(kit, r.Difference, true))}`}</span>${m.columns.some(c => c.hasRetained) ? ' · * holds Retained Earnings (the profit / loss)' : ''}</div>
${ledgerRows ? `<div class="fa-h2">Equity ledgers</div>
<table class="pv-split fa-lines">
  <colgroup><col><col style="width:24mm"><col style="width:24mm"><col style="width:24mm"><col style="width:24mm"><col style="width:26mm"></colgroup>
  <thead><tr><th>Ledger</th><th class="fa-r fa-rule">Opening</th><th class="fa-r fa-rule">Profit / (loss)</th><th class="fa-r fa-rule">Introduced</th><th class="fa-r fa-rule">Drawings</th><th class="fa-r fa-rule ce-tot">Closing</th></tr></thead>
  <tbody>${ledgerRows}</tbody>
</table>` : ''}
${r.Message ? `<div class="fa-fine">${e(r.Message)}</div>` : ''}`;

    return shell(kit, landscape, header, content);
}

function changesInEquitySheet
(
    data:
        ChangesInEquityPrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const r =
        data.report;

    const m =
        data.matrix;

    const columns =
        [...m.columns, m.total];

    const matrix:
        ExcelCell[][] =
        EQUITY_MATRIX_ROWS.map
        (
            row =>
                [
                    row.key === 'opening' || row.key === 'closing' ? bold(row.name) : row.name,
                    ...columns.map(column => money(column[row.key] * row.sign, column === m.total || row.key === 'closing'))
                ]
        );

    const ledgers:
        ExcelCell[][] =
        data.request.showLedgers !== false
            ? [
                [],
                [bold('EQUITY LEDGERS')],
                [bold('Ledger'), bold('Code'), bold('Group'), bold('Opening'), bold('Profit / (loss)'), bold('Introduced'), bold('Drawings'), bold('Closing')],
                ...data.ledgers.map
                (
                    x =>
                        [
                            x.LedgerName,
                            x.LedgerCode || null,
                            x.GroupName,
                            money(x.Opening),
                            money(x.Profit),
                            money(x.Added),
                            money(-x.Withdrawn),
                            money(x.Closing, true)
                        ] as ExcelCell[]
                )
            ]
            : [];

    return {
        name:'Changes in Equity',
        columns:[40, ...columns.map(() => 18), 18, 18],
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [bold('STATEMENT OF CHANGES IN EQUITY')],
            [bold('Period'), `${kit.date(r.From)} - ${kit.date(r.To)}`, bold('Branch'), r.BranchName],
            [],
            [bold('Particulars'), ...columns.map(c => bold(c.name))],
            ...matrix,
            [],
            [bold('Balance Sheet equity at To'), { v:r.BalanceSheetEquity, s:'boldMoney' }, bold(isZero(r.Difference) ? 'Agrees' : 'Difference'), isZero(r.Difference) ? null : { v:r.Difference, s:'boldMoney' }],
            ...ledgers
        ]
    };
}
