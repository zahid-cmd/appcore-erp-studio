//===============================================================
// Trial Balance (Accounts & Finance › Financial Statements)
//
// The server sends one row per ledger (signed amounts : positive
// = Dr, negative = Cr). The page builds the Class › Group › Sub
// Group › Ledger tree, the Dr / Cr columns and the totals here.
//===============================================================

import
{
    formatLedgerDate,
    formatLedgerMoney,
    toIsoDate
}
from '../../accounting-registers/models/ledger-registers.model';

export
{
    formatLedgerDate,
    formatLedgerMoney,
    toIsoDate
};


//===============================================================
// API shapes
//===============================================================

export interface TrialBalanceBranch
{
    Id:number;
    Code:string;
    Name:string;
}

export interface TrialBalanceRow
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
    Mode:string;
    IsNominal:boolean;
    IsActive:boolean;
    IsRetainedEarnings:boolean;
    HasEntries:boolean;
    Opening:number;
    Debit:number;
    Credit:number;
    Closing:number;
}

export interface TrialBalance
{
    From:string;
    To:string;
    BranchId:number;
    BranchName:string;
    ShowCancelled:boolean;
    YearStart:string;
    RetainedEarningsCode:string;
    RetainedEarningsName:string;
    PriorYearsResult:number;
    Message:string;
    OpeningDebit:number;
    OpeningCredit:number;
    PeriodDebit:number;
    PeriodCredit:number;
    ClosingDebit:number;
    ClosingCredit:number;
    Difference:number;
    Rows:TrialBalanceRow[];
}


//===============================================================
// View settings
//===============================================================

// Six-column : Opening / Period / Closing (Dr · Cr each);
// Two-column : Closing Dr · Cr on the To date
export type TrialBalanceView =
    'six' | 'two';

// 1 Class · 2 Group · 3 Sub Group · 4 Ledger
export type TrialBalanceLevel =
    1 | 2 | 3 | 4;

export const TRIAL_BALANCE_LEVELS:
    { value:TrialBalanceLevel; label:string }[] =
[
    { value:1, label:'Class' },
    { value:2, label:'Group' },
    { value:3, label:'Sub Group' },
    { value:4, label:'Ledger' }
];

export interface TrialBalanceOptions
{
    view:TrialBalanceView;
    level:TrialBalanceLevel;
    showZeroBalance:boolean;
    showNoTransactions:boolean;
    search:string;
}


//===============================================================
// Tree
//===============================================================

export interface TrialBalanceNode
{
    // Unique key : "c|CLS-001", "g|CLS-001|GRP-001-002", ...
    key:string;
    parentKeys:string[];
    level:TrialBalanceLevel;
    code:string;
    name:string;
    // Ledgers under this node that are shown
    count:number;
    opening:number;
    debit:number;
    credit:number;
    closing:number;
    // Ledger row only
    row?:TrialBalanceRow;
}

export interface TrialBalanceTotals
{
    OpeningDebit:number;
    OpeningCredit:number;
    PeriodDebit:number;
    PeriodCredit:number;
    ClosingDebit:number;
    ClosingCredit:number;
}

export interface TrialBalanceTree
{
    // Every node down to the chosen level, in order
    nodes:TrialBalanceNode[];
    // Ledgers shown
    ledgerCount:number;
    // Totals of the rows at the chosen level (what the page and
    // the print add up)
    totals:TrialBalanceTotals;
}

const NOT_IN_CHART =
    'Not in the chart';

function round2
(
    value:
        number
):
    number
{
    return Math.round((Number(value) || 0) * 100) / 100;
}

function isZero
(
    value:
        number
):
    boolean
{
    return Math.abs(Number(value) || 0) < 0.005;
}

// Ledger shown with these switches / view / search
export function trialBalanceRowShown
(
    row:
        TrialBalanceRow,
    options:
        TrialBalanceOptions
):
    boolean
{
    // Never posted (up to To)
    if (!row.HasEntries)
    {
        if (!options.showNoTransactions)
        {
            return false;
        }
    }
    else if (!options.showZeroBalance)
    {
        // Posted, but nothing to show in the columns of the view
        const zero =
            options.view === 'two'
                ? isZero(row.Closing)
                : isZero(row.Opening) && isZero(row.Debit) && isZero(row.Credit);

        if (zero)
        {
            return false;
        }
    }

    const words =
        (options.search ?? '')
            .toLowerCase()
            .split(/\s+/)
            .filter(x => !!x);

    if (words.length === 0)
    {
        return true;
    }

    const text =
        [
            row.LedgerName,
            row.LedgerCode,
            row.ClassName,
            row.GroupName,
            row.SubGroupName
        ]
        .join(' ')
        .toLowerCase();

    return words.every(word => text.includes(word));
}

// Builds the tree down to the chosen level
export function buildTrialBalanceTree
(
    rows:
        TrialBalanceRow[],
    options:
        TrialBalanceOptions
):
    TrialBalanceTree
{
    const nodes:
        TrialBalanceNode[] = [];

    const byKey =
        new Map<string, TrialBalanceNode>();

    const add =
        (
            key:string,
            parentKeys:string[],
            level:TrialBalanceLevel,
            code:string,
            name:string
        ):
            TrialBalanceNode =>
        {
            let node =
                byKey.get(key);

            if (!node)
            {
                node =
                {
                    key,
                    parentKeys,
                    level,
                    code,
                    name,
                    count:0,
                    opening:0,
                    debit:0,
                    credit:0,
                    closing:0
                };

                byKey.set(key, node);

                nodes.push(node);
            }

            return node;
        };

    let ledgerCount = 0;

    for (const row of rows)
    {
        if (!trialBalanceRowShown(row, options))
        {
            continue;
        }

        ledgerCount++;

        const classKey =
            `c|${row.ClassCode || '-'}`;

        const groupKey =
            `${classKey}|g|${row.GroupCode || '-'}`;

        const subKey =
            `${groupKey}|s|${row.SubGroupCode || '-'}`;

        const ledgerKey =
            `${subKey}|l|${row.LedgerCode}`;

        const chain:
            TrialBalanceNode[] =
        [
            add(classKey, [], 1, row.ClassCode, row.ClassName || row.ClassCode || NOT_IN_CHART)
        ];

        if (options.level >= 2)
        {
            chain.push(
                add(groupKey, [classKey], 2, row.GroupCode, row.GroupName || row.GroupCode || 'No group'));
        }

        if (options.level >= 3)
        {
            chain.push(
                add(subKey, [classKey, groupKey], 3, row.SubGroupCode, row.SubGroupName || row.SubGroupCode || 'No sub group'));
        }

        if (options.level >= 4)
        {
            const leaf =
                add(ledgerKey, [classKey, groupKey, subKey], 4, row.LedgerCode, row.LedgerName);

            leaf.row = row;
        }

        for (const node of options.level >= 4 ? [...chain, byKey.get(ledgerKey)!] : chain)
        {
            node.count++;

            node.opening += row.Opening;

            node.debit += row.Debit;

            node.credit += row.Credit;

            node.closing += row.Closing;
        }
    }

    for (const node of nodes)
    {
        node.opening = round2(node.opening);

        node.debit = round2(node.debit);

        node.credit = round2(node.credit);

        node.closing = round2(node.closing);
    }

    // Totals of the rows at the chosen level
    const totals:
        TrialBalanceTotals =
        {
            OpeningDebit:0,
            OpeningCredit:0,
            PeriodDebit:0,
            PeriodCredit:0,
            ClosingDebit:0,
            ClosingCredit:0
        };

    for (const node of nodes)
    {
        if (node.level !== options.level)
        {
            continue;
        }

        totals.OpeningDebit += drOf(node.opening);

        totals.OpeningCredit += crOf(node.opening);

        totals.PeriodDebit += node.debit;

        totals.PeriodCredit += node.credit;

        totals.ClosingDebit += drOf(node.closing);

        totals.ClosingCredit += crOf(node.closing);
    }

    (Object.keys(totals) as (keyof TrialBalanceTotals)[])
        .forEach(key => totals[key] = round2(totals[key]));

    return {
        nodes,
        ledgerCount,
        totals
    };
}

// Dr side of a signed balance (0 when Cr)
export function drOf
(
    value:
        number
):
    number
{
    return value > 0 ? value : 0;
}

// Cr side of a signed balance, positive (0 when Dr)
export function crOf
(
    value:
        number
):
    number
{
    return value < 0 ? -value : 0;
}

// 0 shows as blank in the amount columns
export function tbMoney
(
    value:
        number
):
    string
{
    return isZero(value) ? '' : formatLedgerMoney(value);
}

export function isBalanced
(
    difference:
        number
):
    boolean
{
    return isZero(difference);
}


//===============================================================
// Ledger statement page of a ledger type (opened from a row)
//===============================================================

export function statementRoute
(
    ledgerType:
        string
):
    string
{
    const type =
        (ledgerType ?? '').toLowerCase();

    const page =
        type === 'cash' ? 'cash-registers'
        : type === 'bank' ? 'bank-registers'
        : type === 'mfs' ? 'mfs-registers'
        : type === 'pos' ? 'pos-registers'
        : type === 'emi' ? 'emi-registers'
        : 'ledger-statements';

    return `/accounts-finance/accounting-registers/${page}/list`;
}


//===============================================================
// Print request (saved by the page, read by the viewer)
//===============================================================

export const TRIAL_BALANCE_PRINT_KEY =
    'trial-balance';

export interface TrialBalancePrintRequest
{
    from:string;
    to:string;
    branchId:number;
    showCancelled:boolean;
    view:TrialBalanceView;
    level:TrialBalanceLevel;
    showCodes:boolean;
    showZeroBalance:boolean;
    showNoTransactions:boolean;
    search:string;
}
