//===============================================================
// Final Accounts (Accounts & Finance › Financial Statements)
//
// Profit & Loss and Balance Sheet. The server sends one row per
// ledger with its section and its amount in the statement's own
// sign (income / cost / asset / liability positive). The pages
// build the statement lines here : section headings, the Class ›
// Group › Sub Group › Ledger tree under each, and the result
// lines (Gross Profit, Net Profit, Total Liabilities & Equity).
//===============================================================

import
{
    TRIAL_BALANCE_LEVELS,
    TrialBalanceLevel,
    formatLedgerDate,
    formatLedgerMoney,
    statementRoute,
    toIsoDate
}
from './trial-balance.model';

export
{
    formatLedgerDate,
    formatLedgerMoney,
    statementRoute,
    toIsoDate
};


//===============================================================
// API shapes
//===============================================================

export type FaSection =
    'sales'
    | 'cogs'
    | 'other-income'
    | 'expense'
    | 'asset'
    | 'liability'
    | 'equity';

// Business line : Motor Bikes / Spare Parts & Lubricants /
// Accessories / Service / none
export type FaBusinessLineKey =
    'mb' | 'sp' | 'ac' | 'service' | '';

// none · Same period last year · Previous period (P&L) ·
// End of the previous financial year (Balance Sheet)
export type FaCompare =
    'none' | 'last-year' | 'previous' | 'year-end';

export interface FaRow
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
    IsRetainedEarnings:boolean;
    Section:FaSection;
    Line:FaBusinessLineKey;
    Amount:number;
    CompareAmount:number;
}

export interface ProfitLossTotals
{
    Sales:number;
    Cogs:number;
    GrossProfit:number;
    OtherIncome:number;
    Expenses:number;
    NetProfit:number;
}

export interface ProfitLoss
{
    From:string;
    To:string;
    BranchId:number;
    BranchName:string;
    ShowCancelled:boolean;
    Compare:FaCompare;
    CompareFrom:string;
    CompareTo:string;
    CompareLabel:string;
    YearStart:string;
    Message:string;
    Totals:ProfitLossTotals;
    CompareTotals:ProfitLossTotals;
    Rows:FaRow[];
}

export interface BalanceSheetTotals
{
    Assets:number;
    Liabilities:number;
    Equity:number;
    ProfitToDate:number;
    LiabilitiesAndEquity:number;
    Difference:number;
}

export interface BalanceSheet
{
    AsOn:string;
    BranchId:number;
    BranchName:string;
    ShowCancelled:boolean;
    Compare:FaCompare;
    CompareAsOn:string;
    CompareLabel:string;
    YearStart:string;
    RetainedEarningsCode:string;
    RetainedEarningsName:string;
    PriorYearsResult:number;
    Message:string;
    Totals:BalanceSheetTotals;
    CompareTotals:BalanceSheetTotals;
    Rows:FaRow[];
}

export interface FaYear
{
    Date:string;
    YearStart:string;
    YearEnd:string;
}


//===============================================================
// Choices
//===============================================================

export type FaLevel =
    TrialBalanceLevel;

export const FA_LEVELS =
    TRIAL_BALANCE_LEVELS;

// short : the filter button (one row); label / title : tooltip
export const PROFIT_LOSS_COMPARE:
    { value:FaCompare; label:string; short:string; title:string }[] =
[
    { value:'none', label:'None', short:'None', title:'None : this period only' },
    { value:'last-year', label:'Same period last year', short:'Last year', title:'Same period last year : the same dates one year earlier' },
    { value:'previous', label:'Previous period', short:'Previous', title:'Previous period : the period of the same length just before (whole months stay whole months)' }
];

export const BALANCE_SHEET_COMPARE:
    { value:FaCompare; label:string; short:string; title:string }[] =
[
    { value:'none', label:'None', short:'None', title:'None : this date only' },
    { value:'last-year', label:'Same date last year', short:'Last year', title:'Same date last year : the same date one year earlier' },
    { value:'year-end', label:'End of previous year', short:'Year end', title:'End of the previous financial year : its last day' }
];

// Profit & Loss : vertical (step by step) or T-form (Trading +
// Profit & Loss Account, Dr / Cr sides)
export type ProfitLossLayout =
    'vertical' | 'tform';

export const BUSINESS_LINES:
    { key:FaBusinessLineKey; name:string; icon:string }[] =
[
    { key:'mb', name:'Motor Bikes', icon:'fas fa-motorcycle' },
    { key:'sp', name:'Spare Parts & Lubricants', icon:'fas fa-gears' },
    { key:'ac', name:'Accessories', icon:'fas fa-helmet-safety' },
    { key:'service', name:'Service', icon:'fas fa-screwdriver-wrench' },
    { key:'', name:'Not linked to a line', icon:'fas fa-circle-question' }
];

export const SECTION_TITLES:
    Record<FaSection, string> =
{
    sales:'Sales',
    cogs:'Cost of Goods Sold',
    'other-income':'Other Income',
    expense:'Operating Expenses',
    asset:'Assets',
    liability:'Liabilities',
    equity:'Equity'
};


//===============================================================
// Statement lines
//===============================================================

// section : a heading with its total
// node    : class / group / sub group / ledger under a section
// extra   : a line that is not a ledger (Profit for the year to
//           date under Equity)
// result  : Gross Profit, Net Profit, Total Liabilities & Equity,
//           the balance check
export type FaLineKind =
    'section' | 'node' | 'extra' | 'result';

export interface FaLine
{
    key:string;
    kind:FaLineKind;
    // 0 section / result · 1 Class · 2 Group · 3 Sub Group ·
    // 4 Ledger
    level:number;
    parentKeys:string[];
    section?:FaSection;
    code:string;
    name:string;
    // Ledgers under it that are shown
    count:number;
    amount:number;
    compare:number;
    // Ledger lines only
    row?:FaRow;
    // Result lines : % of sales (null = not shown)
    margin?:number | null;
    compareMargin?:number | null;
    // Result lines : profit (good) / loss (bad) / neutral
    tone?:'good' | 'bad' | '';
    // Small note beside the name
    hint?:string;
    // Change colour : an increase is good (income, profit, assets)
    // or bad (costs); '' = no colour
    upIs?:'good' | 'bad' | '';
    // The balance check line (Balanced / difference)
    check?:boolean;
}

export interface FaOptions
{
    level:FaLevel;
    showZero:boolean;
    search:string;
}

function round2
(
    value:
        number
):
    number
{
    return Math.round((Number(value) || 0) * 100) / 100;
}

export function isZero
(
    value:
        number
):
    boolean
{
    return Math.abs(Number(value) || 0) < 0.005;
}

function rowShown
(
    row:
        FaRow,
    options:
        FaOptions
):
    boolean
{
    if (!options.showZero && isZero(row.Amount) && isZero(row.CompareAmount))
    {
        return false;
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

const UP_IS:
    Record<FaSection, 'good' | 'bad' | ''> =
{
    sales:'good',
    cogs:'bad',
    'other-income':'good',
    expense:'bad',
    asset:'',
    liability:'',
    equity:''
};

// The tree of one section down to the chosen level
export function buildSectionLines
(
    rows:
        FaRow[],
    section:
        FaSection,
    sectionKey:
        string,
    options:
        FaOptions
):
    FaLine[]
{
    const lines:
        FaLine[] = [];

    const byKey =
        new Map<string, FaLine>();

    const upIs =
        UP_IS[section];

    const add =
        (
            key:string,
            parentKeys:string[],
            level:number,
            code:string,
            name:string
        ):
            FaLine =>
        {
            let line =
                byKey.get(key);

            if (!line)
            {
                line =
                {
                    key,
                    kind:'node',
                    level,
                    parentKeys,
                    section,
                    code,
                    name,
                    count:0,
                    amount:0,
                    compare:0,
                    upIs
                };

                byKey.set(key, line);

                lines.push(line);
            }

            return line;
        };

    for (const row of rows)
    {
        if (row.Section !== section || !rowShown(row, options))
        {
            continue;
        }

        const classKey =
            `${sectionKey}|c|${row.ClassCode || '-'}`;

        const groupKey =
            `${classKey}|g|${row.GroupCode || '-'}`;

        const subKey =
            `${groupKey}|s|${row.SubGroupCode || '-'}`;

        const ledgerKey =
            `${subKey}|l|${row.LedgerCode}`;

        const chain:
            FaLine[] =
        [
            add(classKey, [sectionKey], 1, row.ClassCode, row.ClassName || row.ClassCode || 'Not in the chart')
        ];

        if (options.level >= 2)
        {
            chain.push(
                add(groupKey, [sectionKey, classKey], 2, row.GroupCode, row.GroupName || row.GroupCode || 'No group'));
        }

        if (options.level >= 3)
        {
            chain.push(
                add(subKey, [sectionKey, classKey, groupKey], 3, row.SubGroupCode, row.SubGroupName || row.SubGroupCode || 'No sub group'));
        }

        if (options.level >= 4)
        {
            const leaf =
                add(ledgerKey, [sectionKey, classKey, groupKey, subKey], 4, row.LedgerCode, row.LedgerName);

            leaf.row = row;

            chain.push(leaf);
        }

        for (const line of chain)
        {
            line.count++;

            line.amount += row.Amount;

            line.compare += row.CompareAmount;
        }
    }

    for (const line of lines)
    {
        line.amount = round2(line.amount);

        line.compare = round2(line.compare);
    }

    return lines;
}

function sectionLine
(
    section:
        FaSection,
    key:
        string,
    amount:
        number,
    compare:
        number,
    count:
        number,
    name?:
        string
):
    FaLine
{
    return {
        key,
        kind:'section',
        level:0,
        parentKeys:[],
        section,
        code:'',
        name:name ?? SECTION_TITLES[section],
        count,
        amount,
        compare,
        upIs:UP_IS[section]
    };
}

// % of sales (null when there are no sales)
export function marginOf
(
    value:
        number,
    sales:
        number
):
    number | null
{
    return isZero(sales)
        ? null
        : Math.round(value / sales * 1000) / 10;
}

function ledgerCount
(
    lines:
        FaLine[]
):
    number
{
    // Every class line counts its ledgers once
    return lines
        .filter(x => x.level === 1)
        .reduce((sum, x) => sum + x.count, 0);
}


//===============================================================
// Profit & Loss : vertical lines
//===============================================================

export function buildProfitLossLines
(
    report:
        ProfitLoss,
    options:
        FaOptions
):
    FaLine[]
{
    const t =
        report.Totals;

    const c =
        report.CompareTotals;

    const lines:
        FaLine[] = [];

    const section =
        (key: FaSection, amount: number, compare: number) =>
        {
            const sectionKey =
                `x|${key}`;

            const children =
                buildSectionLines(report.Rows, key, sectionKey, options);

            lines.push(
                sectionLine(key, sectionKey, amount, compare, ledgerCount(children)),
                ...children);
        };

    section('sales', t.Sales, c.Sales);

    section('cogs', t.Cogs, c.Cogs);

    lines.push(
        {
            key:'r|gross',
            kind:'result',
            level:0,
            parentKeys:[],
            code:'',
            name:t.GrossProfit < 0 ? 'Gross Loss' : 'Gross Profit',
            hint:'Sales − Cost of Goods Sold',
            count:0,
            amount:t.GrossProfit,
            compare:c.GrossProfit,
            margin:marginOf(t.GrossProfit, t.Sales),
            compareMargin:marginOf(c.GrossProfit, c.Sales),
            tone:t.GrossProfit < 0 ? 'bad' : 'good',
            upIs:'good'
        });

    section('other-income', t.OtherIncome, c.OtherIncome);

    section('expense', t.Expenses, c.Expenses);

    lines.push(
        {
            key:'r|net',
            kind:'result',
            level:0,
            parentKeys:[],
            code:'',
            name:t.NetProfit < 0 ? 'Net Loss' : 'Net Profit',
            hint:'Gross Profit + Other Income − Operating Expenses',
            count:0,
            amount:t.NetProfit,
            compare:c.NetProfit,
            margin:marginOf(t.NetProfit, t.Sales),
            compareMargin:marginOf(c.NetProfit, c.Sales),
            tone:t.NetProfit < 0 ? 'bad' : 'good',
            upIs:'good'
        });

    return lines;
}


//===============================================================
// Profit & Loss : T-form (Trading + Profit & Loss Account)
//===============================================================

export interface FaSideItem
{
    // "To" (Dr) / "By" (Cr) line; level 0 = a heading or a
    // carried figure, 1..4 = the tree under it
    key:string;
    level:number;
    code:string;
    name:string;
    amount:number;
    strong:boolean;
    row?:FaRow;
}

export interface FaTAccount
{
    title:string;
    dr:FaSideItem[];
    cr:FaSideItem[];
    total:number;
}

function sideItems
(
    report:
        ProfitLoss,
    section:
        FaSection,
    prefix:
        string,
    options:
        FaOptions,
    amount:
        number
):
    FaSideItem[]
{
    const sectionKey =
        `t|${section}`;

    const tree =
        buildSectionLines(report.Rows, section, sectionKey, options);

    return [
        {
            key:sectionKey,
            level:0,
            code:'',
            name:`${prefix} ${SECTION_TITLES[section]}`,
            amount,
            strong:true
        },
        ...tree.map
        (
            line =>
            ({
                key:line.key,
                level:line.level,
                code:line.code,
                name:line.name,
                amount:line.amount,
                strong:false,
                row:line.row
            })
        )
    ];
}

export function buildProfitLossTForm
(
    report:
        ProfitLoss,
    options:
        FaOptions
):
    FaTAccount[]
{
    const t =
        report.Totals;

    const gross =
        t.GrossProfit;

    const net =
        t.NetProfit;

    const carried =
        (key: string, name: string, value: number): FaSideItem =>
            ({ key, level:0, code:'', name, amount:value, strong:true });

    // Trading Account : COGS + Gross Profit c/d | Sales + Gross
    // Loss c/d
    const tradingDr =
        [
            ...sideItems(report, 'cogs', 'To', options, t.Cogs),
            ...(gross > 0 ? [carried('t|gp-cd', 'To Gross Profit c/d', gross)] : [])
        ];

    const tradingCr =
        [
            ...sideItems(report, 'sales', 'By', options, t.Sales),
            ...(gross < 0 ? [carried('t|gl-cd', 'By Gross Loss c/d', -gross)] : [])
        ];

    // Profit & Loss Account : Gross Loss b/d + Expenses + Net
    // Profit | Gross Profit b/d + Other Income + Net Loss
    const plDr =
        [
            ...(gross < 0 ? [carried('t|gl-bd', 'To Gross Loss b/d', -gross)] : []),
            ...sideItems(report, 'expense', 'To', options, t.Expenses),
            ...(net > 0 ? [carried('t|np', 'To Net Profit', net)] : [])
        ];

    const plCr =
        [
            ...(gross > 0 ? [carried('t|gp-bd', 'By Gross Profit b/d', gross)] : []),
            ...sideItems(report, 'other-income', 'By', options, t.OtherIncome),
            ...(net < 0 ? [carried('t|nl', 'By Net Loss', -net)] : [])
        ];

    return [
        {
            title:'Trading Account',
            dr:tradingDr,
            cr:tradingCr,
            total:round2(Math.max(t.Cogs + Math.max(gross, 0), t.Sales + Math.max(-gross, 0)))
        },
        {
            title:'Profit & Loss Account',
            dr:plDr,
            cr:plCr,
            total:round2(Math.max(Math.max(-gross, 0) + t.Expenses + Math.max(net, 0), Math.max(gross, 0) + t.OtherIncome + Math.max(-net, 0)))
        }
    ];
}


//===============================================================
// Gross profit by business line
//===============================================================

export interface FaBusinessLine
{
    key:FaBusinessLineKey;
    name:string;
    icon:string;
    sales:number;
    cogs:number;
    gross:number;
    margin:number | null;
    compareGross:number;
}

export function buildBusinessLines
(
    rows:
        FaRow[]
):
    { lines:FaBusinessLine[]; total:FaBusinessLine }
{
    const lines:
        FaBusinessLine[] =
        BUSINESS_LINES.map
        (
            x =>
            ({
                key:x.key,
                name:x.name,
                icon:x.icon,
                sales:0,
                cogs:0,
                gross:0,
                margin:null,
                compareGross:0
            })
        );

    const byKey =
        new Map(lines.map(x => [x.key, x]));

    for (const row of rows)
    {
        if (row.Section !== 'sales' && row.Section !== 'cogs')
        {
            continue;
        }

        const line =
            byKey.get(row.Line) ?? byKey.get('')!;

        if (row.Section === 'sales')
        {
            line.sales += row.Amount;

            line.compareGross += row.CompareAmount;
        }
        else
        {
            line.cogs += row.Amount;

            line.compareGross -= row.CompareAmount;
        }
    }

    const total:
        FaBusinessLine =
        {
            key:'',
            name:'Total',
            icon:'',
            sales:0,
            cogs:0,
            gross:0,
            margin:null,
            compareGross:0
        };

    for (const line of lines)
    {
        line.sales = round2(line.sales);

        line.cogs = round2(line.cogs);

        line.gross = round2(line.sales - line.cogs);

        line.compareGross = round2(line.compareGross);

        line.margin = marginOf(line.gross, line.sales);

        total.sales += line.sales;

        total.cogs += line.cogs;

        total.compareGross += line.compareGross;
    }

    total.sales = round2(total.sales);

    total.cogs = round2(total.cogs);

    total.gross = round2(total.sales - total.cogs);

    total.compareGross = round2(total.compareGross);

    total.margin = marginOf(total.gross, total.sales);

    return {
        // The four lines always; "not linked" only when it has
        // figures
        lines:lines.filter(x => x.key !== '' || !isZero(x.sales) || !isZero(x.cogs)),
        total
    };
}


//===============================================================
// Balance Sheet lines
//===============================================================

export function buildBalanceSheetLines
(
    report:
        BalanceSheet,
    options:
        FaOptions
):
    FaLine[]
{
    const t =
        report.Totals;

    const c =
        report.CompareTotals;

    const lines:
        FaLine[] = [];

    // The profit / loss for the year to date sits inside Retained
    // Earnings (as the earlier years' result does in the Trial
    // Balance) : its class, group and sub group carry it too
    const retained =
        report.Rows.find(x => x.IsRetainedEarnings);

    const rows =
        retained
            ? report.Rows.map
            (
                x =>
                    x === retained
                        ? {
                            ...x,
                            Amount:round2(x.Amount + t.ProfitToDate),
                            CompareAmount:round2(x.CompareAmount + c.ProfitToDate)
                        }
                        : x
            )
            : report.Rows;

    const profit:
        FaLine =
        {
            key:'e|profit',
            kind:'extra',
            level:1,
            parentKeys:[],
            section:'equity',
            code:'',
            name:t.ProfitToDate < 0 ? 'Loss for the year to date' : 'Profit for the year to date',
            hint:report.YearStart
                ? `Income − expense from ${formatLedgerDate(report.YearStart)}`
                : 'Income − expense of this financial year',
            count:0,
            amount:t.ProfitToDate,
            compare:c.ProfitToDate,
            upIs:''
        };

    const section =
        (key: FaSection, amount: number, compare: number) =>
        {
            const sectionKey =
                `x|${key}`;

            const children =
                buildSectionLines(rows, key, sectionKey, options);

            const out:
                FaLine[] = [];

            for (const line of children)
            {
                out.push(line);

                // Ledger level : "of which" line under Retained
                // Earnings
                if (retained && line.row?.IsRetainedEarnings && line.level === 4)
                {
                    out.push(
                        {
                            ...profit,
                            key:`${line.key}|profit`,
                            level:5,
                            parentKeys:[...line.parentKeys, line.key],
                            name:`incl. ${profit.name.toLowerCase()}`
                        });
                }
            }

            // No Retained Earnings ledger (Posting Setup) : its own
            // line under Equity
            if (key === 'equity' && !retained)
            {
                out.push(
                    {
                        ...profit,
                        parentKeys:[sectionKey],
                        hint:`${profit.hint}; Retained Earnings is not set on Posting Setup`
                    });
            }

            lines.push(
                sectionLine(key, sectionKey, amount, compare, ledgerCount(children)),
                ...out);
        };

    section('asset', t.Assets, c.Assets);

    section('liability', t.Liabilities, c.Liabilities);

    section(
        'equity',
        round2(t.Equity + t.ProfitToDate),
        round2(c.Equity + c.ProfitToDate));

    lines.push(
        {
            key:'r|le',
            kind:'result',
            level:0,
            parentKeys:[],
            code:'',
            name:'Total Liabilities & Equity',
            hint:'Liabilities + Equity + Profit for the year to date',
            count:0,
            amount:t.LiabilitiesAndEquity,
            compare:c.LiabilitiesAndEquity,
            tone:'',
            upIs:''
        },
        {
            key:'r|check',
            kind:'result',
            level:0,
            parentKeys:[],
            code:'',
            name:'Assets − (Liabilities + Equity)',
            hint:'Must be 0 : the same difference as the Trial Balance',
            count:0,
            amount:t.Difference,
            compare:c.Difference,
            tone:isZero(t.Difference) ? 'good' : 'bad',
            upIs:'',
            check:true
        });

    return lines;
}


//===============================================================
// Figures
//===============================================================

// 0 → blank; negative → (1,234.00)
export function faMoney
(
    value:
        number
):
    string
{
    if (isZero(value))
    {
        return '';
    }

    return value < 0
        ? `(${formatLedgerMoney(-value)})`
        : formatLedgerMoney(value);
}

// 0 → 0.00 (totals, results)
export function faTotal
(
    value:
        number
):
    string
{
    return isZero(value)
        ? formatLedgerMoney(0)
        : faMoney(value);
}

export function faChange
(
    amount:
        number,
    compare:
        number
):
    number
{
    return round2(amount - compare);
}

// Change % against the comparison (null when it is 0)
export function faChangePct
(
    amount:
        number,
    compare:
        number
):
    number | null
{
    if (isZero(compare))
    {
        return null;
    }

    return Math.round((amount - compare) / Math.abs(compare) * 1000) / 10;
}

export function faPct
(
    value:
        number | null | undefined
):
    string
{
    if (value === null || value === undefined || !Number.isFinite(value))
    {
        return '';
    }

    return `${value.toLocaleString('en-US', { minimumFractionDigits:1, maximumFractionDigits:1 })}%`;
}

// "good" / "bad" colour of a change (or '')
export function faChangeTone
(
    line:
        FaLine
):
    'good' | 'bad' | ''
{
    const change =
        faChange(line.amount, line.compare);

    if (!line.upIs || isZero(change))
    {
        return '';
    }

    const up =
        change > 0;

    return (up === (line.upIs === 'good')) ? 'good' : 'bad';
}


//===============================================================
// Print requests (saved by the page, read by the viewer)
//===============================================================

export const PROFIT_LOSS_PRINT_KEY =
    'profit-loss';

export const BALANCE_SHEET_PRINT_KEY =
    'balance-sheet';

export interface ProfitLossPrintRequest
{
    from:string;
    to:string;
    branchId:number;
    showCancelled:boolean;
    compare:FaCompare;
    layout:ProfitLossLayout;
    level:FaLevel;
    showCodes:boolean;
    showZero:boolean;
    showLines:boolean;
    search:string;
}

export interface BalanceSheetPrintRequest
{
    asOn:string;
    branchId:number;
    showCancelled:boolean;
    compare:FaCompare;
    level:FaLevel;
    showCodes:boolean;
    showZero:boolean;
    search:string;
}
