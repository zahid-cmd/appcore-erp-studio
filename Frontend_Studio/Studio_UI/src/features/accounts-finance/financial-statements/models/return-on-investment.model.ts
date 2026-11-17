//===============================================================
// Return on Investment (Accounts & Finance › Financial Statements)
//
// The API sends the figures of the period (and of the same
// period last year) : net profit, finance costs, the investment
// on the day before From and on To, gross profit and stock by
// business line. Everything else is worked out here, once, for
// the page and the print :
//
//   ROI   = Net Profit ÷ average Capital Employed
//   ROCE  = Profit before interest ÷ average Capital Employed
//   ROE   = Net Profit ÷ average Equity
//   ROA   = Net Profit ÷ average Total Assets
//   GMROI = Gross Profit of a line ÷ its average stock
//
//   Capital Employed = Equity + Non-current Liabilities
//                    = Total Assets − Current Liabilities
//   average          = (opening + closing) ÷ 2
//   annualised       = period rate × 365 ÷ days in the period
//===============================================================

import
{
    BUSINESS_LINES,
    FaBusinessLineKey,
    isZero
}
from './final-accounts.model';


export type RoiCompare =
    'none' | 'last-year';

export const ROI_COMPARE:
    { value:RoiCompare; label:string; short:string; title:string }[] =
[
    { value:'none', label:'None', short:'None', title:'None : this period only' },
    { value:'last-year', label:'Same period last year', short:'Last year', title:'Same period last year : the same dates one year earlier' }
];

// The investment on one date
export interface RoiBase
{
    Date:string;
    Equity:number;
    NonCurrentLiabilities:number;
    CurrentLiabilities:number;
    TotalAssets:number;
    CapitalEmployed:number;
}

export interface RoiLine
{
    Line:FaBusinessLineKey;
    Sales:number;
    GrossProfit:number;
    OpeningStock:number;
    ClosingStock:number;
}

export interface RoiFigures
{
    From:string;
    To:string;
    NetProfit:number;
    FinanceCosts:number;
    ProfitBeforeInterest:number;
    Opening:RoiBase;
    Closing:RoiBase;
    Lines:RoiLine[];
}

export interface ReturnOnInvestment
{
    BranchId:number;
    BranchName:string;
    ShowCancelled:boolean;
    Compare:RoiCompare;
    CompareLabel:string;
    Message:string;
    // "SUB-004-001-001 Financial Expenses" ...
    FinanceSubGroups:string[];
    Current:RoiFigures;
    Previous:RoiFigures | null;
}


//===============================================================
// Worked out
//===============================================================

export type RoiRatioKey =
    'roi' | 'roce' | 'roe' | 'roa';

export interface RoiRatio
{
    key:RoiRatioKey;
    label:string;
    formula:string;
    hint:string;
    // Rates in % (null : the base is 0 or negative)
    period:number | null;
    annual:number | null;
    // Same period last year, the same way as the headline
    // (annualised or not); null : no comparison
    previous:number | null;
    // What the page shows (annualised when the switch is on)
    shown:number | null;
}

export interface RoiLineView
{
    key:FaBusinessLineKey;
    name:string;
    grossProfit:number;
    averageStock:number;
    // null : no stock (service) or no stock on hand
    gmroi:number | null;
    // Bar width (0–100, against the best line)
    width:number;
    best:boolean;
}

export interface RoiView
{
    days:number;
    // 365 ÷ days
    factor:number;
    annualise:boolean;
    current:RoiFigures;
    previous:RoiFigures | null;
    average:RoiBase;
    previousAverage:RoiBase | null;
    ratios:RoiRatio[];
    lines:RoiLineView[];
    // Years for the capital to earn itself back (1 ÷ annual ROI);
    // null : no profit
    payback:number | null;
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

function averageOf
(
    a:
        RoiBase,
    b:
        RoiBase
):
    RoiBase
{
    const avg =
        (x: number, y: number) => round2((x + y) / 2);

    return {
        Date:'',
        Equity:avg(a.Equity, b.Equity),
        NonCurrentLiabilities:avg(a.NonCurrentLiabilities, b.NonCurrentLiabilities),
        CurrentLiabilities:avg(a.CurrentLiabilities, b.CurrentLiabilities),
        TotalAssets:avg(a.TotalAssets, b.TotalAssets),
        CapitalEmployed:avg(a.CapitalEmployed, b.CapitalEmployed)
    };
}

// yyyy-MM-dd → days from-to, both counted
export function roiDays
(
    from:
        string,
    to:
        string
):
    number
{
    const day =
        (iso: string) =>
        {
            const match =
                /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');

            return match
                ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000
                : NaN;
        };

    const days =
        day(to) - day(from) + 1;

    return Number.isFinite(days) && days > 0 ? days : 1;
}

function rate
(
    value:
        number,
    base:
        number
):
    number | null
{
    return base > 0 && !isZero(base)
        ? value / base * 100
        : null;
}

function ratiosOf
(
    figures:
        RoiFigures,
    average:
        RoiBase
):
    Record<RoiRatioKey, number | null>
{
    return {
        roi:rate(figures.NetProfit, average.CapitalEmployed),
        roce:rate(figures.ProfitBeforeInterest, average.CapitalEmployed),
        roe:rate(figures.NetProfit, average.Equity),
        roa:rate(figures.NetProfit, average.TotalAssets)
    };
}

const RATIO_TEXT:
    Record<RoiRatioKey, { label:string; formula:string; hint:string }> =
{
    roi:{ label:'ROI', formula:'Net Profit ÷ average Capital Employed', hint:'Net profit ÷ capital employed' },
    roce:{ label:'ROCE', formula:'Profit before interest ÷ average Capital Employed', hint:'Before interest' },
    roe:{ label:'ROE', formula:'Net Profit ÷ average Equity', hint:"On the owner's equity" },
    roa:{ label:'ROA', formula:'Net Profit ÷ average Total Assets', hint:'On everything we own' }
};

export function buildRoiView
(
    report:
        ReturnOnInvestment,
    annualise:
        boolean
):
    RoiView
{
    const current =
        report.Current;

    const previous =
        report.Previous;

    const days =
        roiDays(current.From, current.To);

    const factor =
        365 / days;

    const average =
        averageOf(current.Opening, current.Closing);

    const previousAverage =
        previous ? averageOf(previous.Opening, previous.Closing) : null;

    const now =
        ratiosOf(current, average);

    const before =
        previous && previousAverage
            ? ratiosOf(previous, previousAverage)
            : null;

    const scale =
        (value: number | null) => value === null ? null : value * factor;

    const ratios:
        RoiRatio[] =
        (['roi', 'roce', 'roe', 'roa'] as RoiRatioKey[])
            .map
            (
                key =>
                {
                    const annual =
                        scale(now[key]);

                    const last =
                        before ? (annualise ? scale(before[key]) : before[key]) : null;

                    return {
                        key,
                        ...RATIO_TEXT[key],
                        period:now[key],
                        annual,
                        previous:last,
                        shown:annualise ? annual : now[key]
                    };
                }
            );

    // Business lines : GMROI (annualised with the switch)
    const raw =
        BUSINESS_LINES
            .filter(x => !!x.key)
            .map
            (
                meta =>
                {
                    const line =
                        current.Lines.find(x => x.Line === meta.key);

                    const grossProfit =
                        line?.GrossProfit ?? 0;

                    const averageStock =
                        round2(((line?.OpeningStock ?? 0) + (line?.ClosingStock ?? 0)) / 2);

                    const gmroi =
                        averageStock > 0 && !isZero(averageStock)
                            ? grossProfit / averageStock * (annualise ? factor : 1)
                            : null;

                    return { key:meta.key, name:meta.name, grossProfit, averageStock, gmroi };
                }
            )
            .filter(x => !isZero(x.grossProfit) || !isZero(x.averageStock));

    const best =
        Math.max(0, ...raw.map(x => x.gmroi ?? 0));

    const lines:
        RoiLineView[] =
        raw.map
        (
            x =>
            ({
                ...x,
                width:best > 0 && x.gmroi !== null ? Math.max(0, Math.min(100, x.gmroi / best * 100)) : 0,
                best:best > 0 && x.gmroi !== null && x.gmroi === best && raw.filter(y => y.gmroi !== null).length > 1
            })
        );

    const annualRoi =
        ratios[0].annual;

    return {
        days,
        factor,
        annualise,
        current,
        previous,
        average,
        previousAverage,
        ratios,
        lines,
        payback:annualRoi !== null && annualRoi > 0 ? 100 / annualRoi : null
    };
}

// 12.3456 → "12.35%" ("–" when there is no figure)
export function roiPct
(
    value:
        number | null | undefined
):
    string
{
    return value === null || value === undefined || !Number.isFinite(value)
        ? '–'
        : `${value.toFixed(2)}%`;
}

// Change in points : "▲ 4.40 pts" / "▼ 1.20 pts" ("" when none)
export function roiPoints
(
    now:
        number | null,
    before:
        number | null
):
    string
{
    if (now === null || before === null)
    {
        return '';
    }

    const diff =
        now - before;

    return isZero(diff)
        ? 'No change'
        : `${diff > 0 ? '▲' : '▼'} ${Math.abs(diff).toFixed(2)} pts`;
}

// 0.8312 → "0.83×"
export function roiTimes
(
    value:
        number | null
):
    string
{
    return value === null || !Number.isFinite(value)
        ? '–'
        : `${value.toFixed(2)}×`;
}


//===============================================================
// Print request
//===============================================================

export const RETURN_ON_INVESTMENT_PRINT_KEY =
    'return-on-investment';

export interface RoiPrintRequest
{
    from:string;
    to:string;
    branchId:number;
    showCancelled:boolean;
    compare:RoiCompare;
    annualise:boolean;
}
