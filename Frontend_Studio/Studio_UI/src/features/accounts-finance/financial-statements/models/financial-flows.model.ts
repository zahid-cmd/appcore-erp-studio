//===============================================================
// Financial flows (Accounts & Finance › Financial Statements)
//
//   Receipt & Payment Account and Cash Flow Statement : built
//   here from one server answer (cash ledgers + one row per
//   contra ledger with the money received from / paid to it).
//   Changes in Equity : equity ledgers, credit side positive.
//===============================================================

import
{
    FaLevel,
    FaLine,
    FaOptions,
    formatLedgerDate,
    isZero
}
from './final-accounts.model';


//===============================================================
// API shapes
//===============================================================

export type FlowActivity =
    'operating' | 'investing' | 'financing';

export interface CashLedger
{
    LedgerCode:string;
    LedgerName:string;
    LedgerType:string;
    IsActive:boolean;
    Opening:number;
    Received:number;
    Paid:number;
    Closing:number;
}

export interface CashFlowRow
{
    LedgerCode:string;
    LedgerName:string;
    LedgerType:string;
    ClassCode:string;
    ClassName:string;
    GroupCode:string;
    GroupName:string;
    SubGroupCode:string;
    SubGroupName:string;
    IsActive:boolean;
    Activity:FlowActivity;
    Received:number;
    Paid:number;
    Vouchers:number;
}

export interface CashFlows
{
    From:string;
    To:string;
    BranchId:number;
    BranchName:string;
    ShowCancelled:boolean;
    Message:string;
    CashLedgers:CashLedger[];
    Rows:CashFlowRow[];
    Transfers:number;
    Opening:number;
    Receipts:number;
    Payments:number;
    Closing:number;
    Difference:number;
}

export interface EquityLedger
{
    LedgerCode:string;
    LedgerName:string;
    GroupCode:string;
    GroupName:string;
    SubGroupCode:string;
    SubGroupName:string;
    IsActive:boolean;
    IsRetainedEarnings:boolean;
    Opening:number;
    Profit:number;
    Added:number;
    Withdrawn:number;
    Closing:number;
}

export interface ChangesInEquity
{
    From:string;
    To:string;
    BranchId:number;
    BranchName:string;
    ShowCancelled:boolean;
    YearStart:string;
    RetainedEarningsCode:string;
    RetainedEarningsName:string;
    Message:string;
    Ledgers:EquityLedger[];
    Opening:number;
    Profit:number;
    Added:number;
    Withdrawn:number;
    Closing:number;
    BalanceSheetEquity:number;
    Difference:number;
}


//===============================================================
// Shared
//===============================================================

function round2
(
    value:
        number
):
    number
{
    return Math.round((Number(value) || 0) * 100) / 100;
}

function matches
(
    texts:
        string[],
    search:
        string
):
    boolean
{
    const words =
        (search ?? '')
            .toLowerCase()
            .split(/\s+/)
            .filter(x => !!x);

    if (words.length === 0)
    {
        return true;
    }

    const text =
        texts.join(' ').toLowerCase();

    return words.every(word => text.includes(word));
}

function rowMatches
(
    row:
        CashFlowRow,
    search:
        string
):
    boolean
{
    return matches(
        [row.LedgerName, row.LedgerCode, row.ClassName, row.GroupName, row.SubGroupName],
        search);
}

// Cash Flow line : FaLine (amount = net) + money in / out
export interface CfLine extends FaLine
{
    inflow?:number;
    outflow?:number;
    flow?:CashFlowRow;
    cash?:CashLedger;
}

// Class › Group › Sub Group › Ledger tree of contra rows, with
// money in / out / net on each node
function flowTree
(
    rows:
        CashFlowRow[],
    rootKey:
        string,
    level:
        FaLevel,
    inflow:
        (row: CashFlowRow) => number,
    outflow:
        (row: CashFlowRow) => number
):
    CfLine[]
{
    const lines:
        CfLine[] = [];

    const byKey =
        new Map<string, CfLine>();

    const add =
        (key: string, parentKeys: string[], depth: number, code: string, name: string): CfLine =>
        {
            let line =
                byKey.get(key);

            if (!line)
            {
                line =
                {
                    key,
                    kind:'node',
                    level:depth,
                    parentKeys,
                    code,
                    name,
                    count:0,
                    amount:0,
                    compare:0,
                    inflow:0,
                    outflow:0,
                    upIs:''
                };

                byKey.set(key, line);

                lines.push(line);
            }

            return line;
        };

    for (const row of rows)
    {
        const classKey =
            `${rootKey}|c|${row.ClassCode || '-'}`;

        const groupKey =
            `${classKey}|g|${row.GroupCode || '-'}`;

        const subKey =
            `${groupKey}|s|${row.SubGroupCode || '-'}`;

        const ledgerKey =
            `${subKey}|l|${row.LedgerCode || '-'}`;

        const chain:
            CfLine[] =
        [
            add(classKey, [rootKey], 1, row.ClassCode, row.ClassName || row.ClassCode || 'Not in the chart')
        ];

        if (level >= 2)
        {
            chain.push(add(groupKey, [rootKey, classKey], 2, row.GroupCode, row.GroupName || row.GroupCode || 'No group'));
        }

        if (level >= 3)
        {
            chain.push(add(subKey, [rootKey, classKey, groupKey], 3, row.SubGroupCode, row.SubGroupName || row.SubGroupCode || 'No sub group'));
        }

        if (level >= 4)
        {
            const leaf =
                add(ledgerKey, [rootKey, classKey, groupKey, subKey], 4, row.LedgerCode, row.LedgerName);

            leaf.flow = row;

            chain.push(leaf);
        }

        const money =
            inflow(row);

        const out =
            outflow(row);

        for (const line of chain)
        {
            line.count++;

            line.inflow = (line.inflow ?? 0) + money;

            line.outflow = (line.outflow ?? 0) + out;
        }
    }

    for (const line of lines)
    {
        line.inflow = round2(line.inflow ?? 0);

        line.outflow = round2(line.outflow ?? 0);

        line.amount = round2(line.inflow - line.outflow);
    }

    return lines;
}

const TYPE_ORDER =
    ['cash', 'bank', 'mfs', 'pos', 'emi'];

const TYPE_NAMES:
    Record<string, string> =
{
    cash:'Cash in hand',
    bank:'Bank accounts',
    mfs:'Mobile financial services',
    pos:'POS (card) accounts',
    emi:'EMI accounts'
};

export function cashTypeName
(
    type:
        string
):
    string
{
    return TYPE_NAMES[(type ?? '').toLowerCase()] ?? (type || 'Other');
}


//===============================================================
// Receipt & Payment Account (two sides)
//===============================================================

export interface RpItem
{
    key:string;
    // 0 heading (To / By ...), 1..4 tree, cash ledger lines 1
    level:number;
    code:string;
    name:string;
    amount:number;
    strong:boolean;
    flow?:CashFlowRow;
    cash?:CashLedger;
}

export interface RpOptions
{
    level:FaLevel;
    search:string;
    showTransfers:boolean;
    showCashLedgers:boolean;
}

export interface ReceiptPayment
{
    receipts:RpItem[];
    payments:RpItem[];
    receiptsTotal:number;
    paymentsTotal:number;
}

function treeItems
(
    rows:
        CashFlowRow[],
    key:
        string,
    level:
        FaLevel,
    value:
        (row: CashFlowRow) => number
):
    RpItem[]
{
    return flowTree(rows, key, level, value, () => 0)
        .map
        (
            line =>
            ({
                key:line.key,
                level:line.level,
                code:line.code,
                name:line.name,
                amount:line.inflow ?? 0,
                strong:false,
                flow:line.flow
            })
        );
}

function cashItems
(
    ledgers:
        CashLedger[],
    key:
        string,
    value:
        (ledger: CashLedger) => number
):
    RpItem[]
{
    return ledgers
        .filter(x => !isZero(value(x)))
        .map
        (
            x =>
            ({
                key:`${key}|${x.LedgerCode}`,
                level:1,
                code:x.LedgerCode,
                name:`${x.LedgerName} · ${x.LedgerType}`,
                amount:value(x),
                strong:false,
                cash:x
            })
        );
}

export function buildReceiptPayment
(
    report:
        CashFlows,
    options:
        RpOptions
):
    ReceiptPayment
{
    const rows =
        report.Rows.filter(x => rowMatches(x, options.search));

    const receiptRows =
        rows.filter(x => !isZero(x.Received));

    const paymentRows =
        rows.filter(x => !isZero(x.Paid));

    const transfers =
        options.showTransfers && !isZero(report.Transfers);

    const heading =
        (key: string, name: string, amount: number): RpItem =>
            ({ key, level:0, code:'', name, amount, strong:true });

    const receipts:
        RpItem[] =
        [
            heading('r|open', 'To Opening balances', report.Opening),
            ...(options.showCashLedgers ? cashItems(report.CashLedgers, 'r|open', x => x.Opening) : []),
            heading('r|in', 'To Receipts', report.Receipts),
            ...treeItems(receiptRows, 'r|in', options.level, x => x.Received),
            ...(transfers ? [heading('r|contra', 'To Contra (transfers between cash and bank)', report.Transfers)] : [])
        ];

    const payments:
        RpItem[] =
        [
            heading('p|out', 'By Payments', report.Payments),
            ...treeItems(paymentRows, 'p|out', options.level, x => x.Paid),
            ...(transfers ? [heading('p|contra', 'By Contra (transfers between cash and bank)', report.Transfers)] : []),
            heading('p|close', 'By Closing balances', report.Closing),
            ...(options.showCashLedgers ? cashItems(report.CashLedgers, 'p|close', x => x.Closing) : [])
        ];

    const extra =
        transfers ? report.Transfers : 0;

    return {
        receipts,
        payments,
        receiptsTotal:round2(report.Opening + report.Receipts + extra),
        paymentsTotal:round2(report.Payments + extra + report.Closing)
    };
}


//===============================================================
// Cash Flow Statement (direct method)
//===============================================================

export const FLOW_ACTIVITIES:
    { key:FlowActivity; title:string; result:string }[] =
[
    { key:'operating', title:'Operating activities', result:'Net cash from operating activities' },
    { key:'investing', title:'Investing activities', result:'Net cash from investing activities' },
    { key:'financing', title:'Financing activities', result:'Net cash from financing activities' }
];

// Cash ledgers by type (Cash · Bank · MFS · POS · EMI) under a
// balance section
function balanceLines
(
    ledgers:
        CashLedger[],
    rootKey:
        string,
    value:
        (ledger: CashLedger) => number,
    level:
        FaLevel
):
    CfLine[]
{
    const lines:
        CfLine[] = [];

    const types =
        [...new Set(ledgers.map(x => (x.LedgerType ?? '').toLowerCase()))]
            .sort((a, b) => rank(a) - rank(b));

    for (const type of types)
    {
        const items =
            ledgers.filter(x => (x.LedgerType ?? '').toLowerCase() === type && !isZero(value(x)));

        if (items.length === 0)
        {
            continue;
        }

        const typeKey =
            `${rootKey}|t|${type}`;

        lines.push(
            {
                key:typeKey,
                kind:'node',
                level:1,
                parentKeys:[rootKey],
                code:'',
                name:cashTypeName(type),
                count:items.length,
                amount:round2(items.reduce((sum, x) => sum + value(x), 0)),
                compare:0,
                upIs:''
            });

        if (level >= 2)
        {
            for (const item of items)
            {
                lines.push(
                    {
                        key:`${typeKey}|${item.LedgerCode}`,
                        kind:'node',
                        level:4,
                        parentKeys:[rootKey, typeKey],
                        code:item.LedgerCode,
                        name:item.LedgerName,
                        count:1,
                        amount:value(item),
                        compare:0,
                        upIs:'',
                        cash:item
                    });
            }
        }
    }

    return lines;
}

function rank
(
    type:
        string
):
    number
{
    const index =
        TYPE_ORDER.indexOf(type);

    return index < 0 ? 99 : index;
}

export interface CashFlowTotals
{
    operating:number;
    investing:number;
    financing:number;
    netChange:number;
}

export function cashFlowTotals
(
    report:
        CashFlows
):
    CashFlowTotals
{
    const net =
        (activity: FlowActivity) =>
            round2(
                report.Rows
                    .filter(x => x.Activity === activity)
                    .reduce((sum, x) => sum + x.Received - x.Paid, 0));

    const operating =
        net('operating');

    const investing =
        net('investing');

    const financing =
        net('financing');

    return {
        operating,
        investing,
        financing,
        netChange:round2(operating + investing + financing)
    };
}

export function buildCashFlowLines
(
    report:
        CashFlows,
    options:
        FaOptions
):
    CfLine[]
{
    const lines:
        CfLine[] = [];

    const totals =
        cashFlowTotals(report);

    const rows =
        report.Rows.filter(x => rowMatches(x, options.search));

    const balance =
        (key: string, name: string, amount: number, value: (ledger: CashLedger) => number) =>
        {
            const children =
                balanceLines(report.CashLedgers, key, value, options.level);

            lines.push(
                {
                    key,
                    kind:'section',
                    level:0,
                    parentKeys:[],
                    code:'',
                    name,
                    count:children.filter(x => x.level === 1).reduce((sum, x) => sum + x.count, 0),
                    amount,
                    compare:0,
                    upIs:''
                },
                ...children);
        };

    balance('b|open', 'Opening cash & cash equivalents', report.Opening, x => x.Opening);

    for (const activity of FLOW_ACTIVITIES)
    {
        const sectionKey =
            `a|${activity.key}`;

        const own =
            rows.filter(x => x.Activity === activity.key);

        const all =
            report.Rows.filter(x => x.Activity === activity.key);

        const children =
            flowTree(own, sectionKey, options.level, x => x.Received, x => x.Paid)
                .filter(x => options.showZero || !isZero(x.inflow ?? 0) || !isZero(x.outflow ?? 0));

        const inflow =
            round2(all.reduce((sum, x) => sum + x.Received, 0));

        const outflow =
            round2(all.reduce((sum, x) => sum + x.Paid, 0));

        const net =
            totals[activity.key];

        lines.push(
            {
                key:sectionKey,
                kind:'section',
                level:0,
                parentKeys:[],
                code:'',
                name:activity.title,
                count:children.filter(x => x.level === 1).reduce((sum, x) => sum + x.count, 0),
                amount:net,
                compare:0,
                inflow,
                outflow,
                upIs:''
            },
            ...children,
            {
                key:`r|${activity.key}`,
                kind:'result',
                level:0,
                parentKeys:[],
                code:'',
                name:activity.result,
                count:0,
                amount:net,
                compare:0,
                inflow,
                outflow,
                tone:net < 0 ? 'bad' : 'good',
                upIs:''
            });
    }

    lines.push(
        {
            key:'r|change',
            kind:'result',
            level:0,
            parentKeys:[],
            code:'',
            name:totals.netChange < 0 ? 'Net decrease in cash & cash equivalents' : 'Net increase in cash & cash equivalents',
            count:0,
            amount:totals.netChange,
            compare:0,
            inflow:report.Receipts,
            outflow:report.Payments,
            tone:totals.netChange < 0 ? 'bad' : 'good',
            upIs:''
        });

    balance('b|close', 'Closing cash & cash equivalents', report.Closing, x => x.Closing);

    lines.push(
        {
            key:'r|check',
            kind:'result',
            level:0,
            parentKeys:[],
            code:'',
            name:'Opening + net change − closing',
            hint:'Must be 0 : every taka traced to a contra ledger',
            count:0,
            amount:report.Difference,
            compare:0,
            tone:isZero(report.Difference) ? 'good' : 'bad',
            upIs:'',
            check:true
        });

    return lines;
}


//===============================================================
// Changes in Equity
//===============================================================

export interface EquityColumn
{
    key:string;
    name:string;
    hasRetained:boolean;
    opening:number;
    profit:number;
    added:number;
    withdrawn:number;
    closing:number;
}

export interface EquityMatrix
{
    columns:EquityColumn[];
    total:EquityColumn;
}

// One column per equity group (+ Total)
export function buildEquityMatrix
(
    report:
        ChangesInEquity
):
    EquityMatrix
{
    const columns:
        EquityColumn[] = [];

    const byKey =
        new Map<string, EquityColumn>();

    const empty =
        (key: string, name: string): EquityColumn =>
            ({ key, name, hasRetained:false, opening:0, profit:0, added:0, withdrawn:0, closing:0 });

    const total =
        empty('total', 'Total');

    for (const ledger of report.Ledgers)
    {
        const key =
            ledger.GroupCode || ledger.GroupName || '-';

        let column =
            byKey.get(key);

        if (!column)
        {
            column = empty(key, ledger.GroupName || 'Equity');

            byKey.set(key, column);

            columns.push(column);
        }

        for (const target of [column, total])
        {
            target.opening += ledger.Opening;

            target.profit += ledger.Profit;

            target.added += ledger.Added;

            target.withdrawn += ledger.Withdrawn;

            target.closing += ledger.Closing;
        }

        column.hasRetained = column.hasRetained || ledger.IsRetainedEarnings;
    }

    for (const column of [...columns, total])
    {
        column.opening = round2(column.opening);

        column.profit = round2(column.profit);

        column.added = round2(column.added);

        column.withdrawn = round2(column.withdrawn);

        column.closing = round2(column.closing);
    }

    return {
        columns,
        total
    };
}

export const EQUITY_MATRIX_ROWS:
    { key:'opening' | 'profit' | 'added' | 'withdrawn' | 'closing'; name:string; sign:1 | -1 }[] =
[
    { key:'opening', name:'Opening balance', sign:1 },
    { key:'profit', name:'Profit / (loss) for the period', sign:1 },
    { key:'added', name:'Capital introduced / additions', sign:1 },
    { key:'withdrawn', name:'Drawings / withdrawals', sign:-1 },
    { key:'closing', name:'Closing balance', sign:1 }
];

export function equityLedgersShown
(
    report:
        ChangesInEquity,
    search:
        string,
    showZero:
        boolean
):
    EquityLedger[]
{
    return report.Ledgers.filter
    (
        x =>
            (showZero || x.IsRetainedEarnings || !isZero(x.Opening) || !isZero(x.Added) || !isZero(x.Withdrawn) || !isZero(x.Closing))
            && matches([x.LedgerName, x.LedgerCode, x.GroupName, x.SubGroupName], search)
    );
}

export function equityPeriodText
(
    report:
        ChangesInEquity
):
    string
{
    return `${formatLedgerDate(report.From)} – ${formatLedgerDate(report.To)}`;
}


//===============================================================
// Filter default : 1 July (Bangladesh financial year) until the
// server answers with the real year start
//===============================================================

export function yearStartGuess():
    Date
{
    const now =
        new Date();

    const year =
        now.getMonth() >= 6
            ? now.getFullYear()
            : now.getFullYear() - 1;

    return new Date(year, 6, 1);
}


//===============================================================
// Print requests
//===============================================================

export const RECEIPT_PAYMENT_PRINT_KEY =
    'receipt-payment';

export const CASH_FLOW_PRINT_KEY =
    'cash-flow';

export const CHANGES_IN_EQUITY_PRINT_KEY =
    'changes-in-equity';

export interface FlowPrintRequest
{
    from:string;
    to:string;
    branchId:number;
    showCancelled:boolean;
    level:FaLevel;
    showCodes:boolean;
    showZero:boolean;
    search:string;
    // Receipt & Payment
    showTransfers?:boolean;
    showCashLedgers?:boolean;
    // Changes in Equity
    showLedgers?:boolean;
}
