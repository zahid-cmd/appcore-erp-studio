//===============================================================
// Return on Investment : print (and Excel)
//
//   /print-viewer/return-on-investment/<token>?doc=return-on-investment
//
// The page saves its filter under a token; the viewer loads the
// figures again and prints what the page shows : the ratio band,
// Return, Investment (opening · closing · average), Ratios and
// the stock return by business line.
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
    toIsoDate
}
from '../models/final-accounts.model';

import
{
    RETURN_ON_INVESTMENT_PRINT_KEY,
    ReturnOnInvestment,
    RoiBase,
    RoiPrintRequest,
    RoiView,
    buildRoiView,
    roiPct,
    roiPoints,
    roiTimes
}
from '../models/return-on-investment.model';

import
{
    yearStartGuess
}
from '../models/financial-flows.model';

import
{
    FinalAccountsService
}
from '../services/final-accounts.service';

import
{
    FINAL_ACCOUNTS_PRINT_CSS,
    amountOf,
    head,
    readRequest,
    saveRequest
}
from './final-accounts.print';


const ROI_STORAGE =
    'appcore.return-on-investment-print.';

export function saveRoiPrintRequest
(
    request:
        RoiPrintRequest
):
    number
{
    return saveRequest(ROI_STORAGE, request);
}

export interface RoiPrintData
{
    request:RoiPrintRequest;
    report:ReturnOnInvestment;
    view:RoiView;
}

const ROI_PRINT_CSS =
    FINAL_ACCOUNTS_PRINT_CSS + `
.fa-band.roi-band { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.roi-band small { font-size: 6.2pt; font-weight: 700; color: #475569; }
.roi-band .roi-main { background: #16307a; }
.roi-band .roi-main span, .roi-band .roi-main small { color: #dbe4ff; }
.roi-band .roi-main b { color: #ffffff; }
.roi-avg { color: #9a4a12; font-weight: 800; }
.roi-lines { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2mm 4mm; margin-top: 1mm; }
.roi-line { padding: 1.6mm 2.4mm; border: 1px solid #cdd9ee; border-radius: 1.6mm; break-inside: avoid; }
.roi-line b { font-size: 8pt; color: #0b2a5b; }
.roi-line strong { float: right; font-size: 9.6pt; color: #0b2a5b; }
.roi-line.best strong { color: #9a4a12; }
.roi-line span { display: block; margin-top: 0.8mm; font-size: 6.8pt; color: #475569; }
`;

export const RETURN_ON_INVESTMENT_PRINT:
    PrintSourceDef<RoiPrintData> =
{
    key:RETURN_ON_INVESTMENT_PRINT_KEY,

    title:'Return on Investment',

    canRotate:true,

    async load
    (
        injector:
            Injector,
        id:
            number | string
    ):
        Promise<RoiPrintData>
    {
        const request:
            RoiPrintRequest =
            readRequest<RoiPrintRequest>(ROI_STORAGE, Number(id))
            ??
            {
                from:toIsoDate(yearStartGuess()),
                to:toIsoDate(new Date()),
                branchId:0,
                showCancelled:false,
                compare:'none',
                annualise:true
            };

        const report =
            await firstValueFrom(
                injector
                    .get(FinalAccountsService)
                    .getReturnOnInvestment(
                        {
                            from:request.from,
                            to:request.to,
                            branchId:request.branchId,
                            showCancelled:request.showCancelled,
                            compare:request.compare
                        }
                    )
            );

        return {
            request,
            report,
            view:buildRoiView(report, request.annualise !== false)
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
            RoiPrintData
    ):
        string
    {
        return `Return on Investment - ${data.view.current.From} to ${data.view.current.To}`;
    },

    documents:
    [
        {
            key:'return-on-investment',
            title:'Return on Investment',
            icon:'fas fa-arrow-trend-up',
            toggles:[{ key:'signatures', label:'Signature lines', on:false }],
            render:
                (data: RoiPrintData, kit: PrintKit) =>
                    withSignatures(roiHtml(data, kit, !!kit.landscape), kit),
            css:
                ROI_PRINT_CSS,
            excel:
                (data: RoiPrintData, kit: PrintKit) =>
                    roiSheet(data, kit)
        }
    ]
};


const INVESTMENT:
    { name:string; key:keyof RoiBase; result:boolean }[] =
[
    { name:'Equity (with profit to date)', key:'Equity', result:false },
    { name:'Non-current Liabilities', key:'NonCurrentLiabilities', result:false },
    { name:'Capital Employed (= Net Assets)', key:'CapitalEmployed', result:true },
    { name:'Add : Current Liabilities', key:'CurrentLiabilities', result:false },
    { name:'Total Assets', key:'TotalAssets', result:true }
];

function roiHtml
(
    data:
        RoiPrintData,
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

    const v =
        data.view;

    const prev =
        v.previous;

    const period =
        `${kit.date(v.current.From)} – ${kit.date(v.current.To)}`;

    const header =
        head(
            kit,
            'Return on Investment',
            'Period',
            period,
            r.BranchName,
            [
                ['Branch', r.BranchName],
                ['Rates', v.annualise ? `Annualised (× 365 ÷ ${v.days})` : 'Period rate'],
                ['Compared with', prev ? `${r.CompareLabel} (${kit.date(prev.From)} – ${kit.date(prev.To)})` : ''],
                ['Cancelled', r.ShowCancelled ? 'Shown' : '']
            ]);

    const money =
        (value: number, strong: boolean) => e(amountOf(kit, value, strong));

    const band =
        `<div class="fa-band roi-band">${v.ratios.map((q, i) => `<div class="${i === 0 ? 'roi-main' : ''}"><span>${e(q.label)}</span><b>${e(roiPct(q.shown))}</b>${prev ? `<small>${e(roiPoints(q.shown, q.previous))}</small>` : ''}</div>`).join('')}</div>`;

    const returnRows =
        [
            ['Net Profit', v.current.NetProfit, prev?.NetProfit ?? 0, false],
            ['Add : Finance costs', v.current.FinanceCosts, prev?.FinanceCosts ?? 0, false],
            ['Profit before interest', v.current.ProfitBeforeInterest, prev?.ProfitBeforeInterest ?? 0, true]
        ] as [string, number, number, boolean][];

    const returnTable =
        `<div class="fa-h2">Return</div>
<table class="pv-split fa-lines">
  <colgroup><col>${prev ? '<col style="width:30mm"><col style="width:30mm"><col style="width:30mm">' : '<col style="width:34mm">'}</colgroup>
  <thead><tr><th>Particulars</th><th class="fa-r fa-rule">This period<small>${e(period)}</small></th>${prev ? `<th class="fa-r fa-rule">Last year<small>${e(kit.date(prev.From))} – ${e(kit.date(prev.To))}</small></th><th class="fa-r fa-rule">Change</th>` : ''}</tr></thead>
  <tbody>${returnRows.map(([name, now, before, strong]) => `<tr class="${strong ? 'fa-res' : 'fa-l1'}"><td>${e(name)}</td><td class="fa-r fa-rule">${money(now, strong)}</td>${prev ? `<td class="fa-r fa-rule">${money(before, strong)}</td><td class="fa-r fa-rule">${money(now - before, strong)}</td>` : ''}</tr>`).join('')}</tbody>
</table>
<div class="fa-fine">Finance costs : ${e(r.FinanceSubGroups.length > 0 ? r.FinanceSubGroups.join(', ') : 'no sub group is marked Finance cost (profit before interest = net profit)')}.</div>`;

    const investmentTable =
        `<div class="fa-h2">Investment</div>
<table class="pv-split fa-lines">
  <colgroup><col><col style="width:30mm"><col style="width:30mm"><col style="width:30mm"></colgroup>
  <thead><tr><th>Particulars</th><th class="fa-r fa-rule">Opening<small>${e(kit.date(v.current.Opening.Date))}</small></th><th class="fa-r fa-rule">Closing<small>${e(kit.date(v.current.Closing.Date))}</small></th><th class="fa-r fa-rule">Average<small>(opening + closing) ÷ 2</small></th></tr></thead>
  <tbody>${INVESTMENT.map(row => `<tr class="${row.result ? 'fa-res' : 'fa-l1'}"><td>${e(row.name)}</td><td class="fa-r fa-rule">${money(v.current.Opening[row.key] as number, row.result)}</td><td class="fa-r fa-rule">${money(v.current.Closing[row.key] as number, row.result)}</td><td class="fa-r fa-rule roi-avg">${money(v.average[row.key] as number, true)}</td></tr>`).join('')}</tbody>
</table>`;

    const ratioTable =
        `<div class="fa-h2">Ratios</div>
<table class="pv-split fa-lines">
  <colgroup><col style="width:16mm"><col><col style="width:24mm"><col style="width:24mm">${prev ? '<col style="width:24mm">' : ''}</colgroup>
  <thead><tr><th>Ratio</th><th>How it is worked out</th><th class="fa-r fa-rule">This period</th><th class="fa-r fa-rule">Annualised</th>${prev ? `<th class="fa-r fa-rule">Last year<small>${v.annualise ? 'annualised' : 'period rate'}</small></th>` : ''}</tr></thead>
  <tbody>${v.ratios.map(q => `<tr class="fa-l1"><td><b>${e(q.label)}</b></td><td>${e(q.formula)}</td><td class="fa-r fa-rule">${e(roiPct(q.period))}</td><td class="fa-r fa-rule roi-avg">${e(roiPct(q.annual))}</td>${prev ? `<td class="fa-r fa-rule">${e(roiPct(q.previous))}</td>` : ''}</tr>`).join('')}</tbody>
</table>`;

    const lines =
        v.lines.length > 0
            ? `<div class="fa-h2">Stock return by business line (GMROI${v.annualise ? ', annualised' : ''})</div>
<div class="roi-lines">${v.lines.map(line => `<div class="roi-line${line.best ? ' best' : ''}"><b>${e(line.name)}</b><strong>${e(line.gmroi === null ? amountOf(kit, line.grossProfit, true) : roiTimes(line.gmroi))}</strong><span>${line.gmroi === null ? `Gross profit only : no stock on hand` : `Gross profit ${e(amountOf(kit, line.grossProfit, true))} · average stock ${e(amountOf(kit, line.averageStock, true))}`}</span></div>`).join('')}</div>
<div class="fa-fine">Payback on capital : ${v.payback === null ? 'no profit in the period' : `${v.payback.toFixed(1)} years at the annualised ROI`}.</div>`
            : '';

    return `<section class="pv-flow${landscape ? ' pv-landscape' : ''}" data-watermark="">
<div class="pv-run-head">
${header}
</div>
<div class="pv-body">
${band}
${returnTable}
${investmentTable}
${ratioTable}
${lines}
${r.Message ? `<div class="fa-fine">${e(r.Message)}</div>` : ''}
</div>
<div class="pv-end">
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>
</section>`;
}

function roiSheet
(
    data:
        RoiPrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const v =
        data.view;

    const prev =
        v.previous;

    const bold =
        (text: string): ExcelCell =>
            ({ v:text, s:'bold' });

    const money =
        (value: number, strong = false): ExcelCell =>
            ({ v:value, s:strong ? 'boldMoney' : 'money' });

    const pct =
        (value: number | null): ExcelCell =>
            value === null ? null : `${value.toFixed(2)}%`;

    return {
        name:'Return on Investment',
        columns:[44, 18, 18, 18, 18],
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [bold('RETURN ON INVESTMENT')],
            [bold('Period'), `${kit.date(v.current.From)} – ${kit.date(v.current.To)}`, bold('Branch'), data.report.BranchName],
            [],
            [bold('Return'), bold('This period'), ...(prev ? [bold('Last year'), bold('Change')] : [])],
            ['Net Profit', money(v.current.NetProfit), ...(prev ? [money(prev.NetProfit), money(v.current.NetProfit - prev.NetProfit)] : [])],
            ['Add : Finance costs', money(v.current.FinanceCosts), ...(prev ? [money(prev.FinanceCosts), money(v.current.FinanceCosts - prev.FinanceCosts)] : [])],
            [bold('Profit before interest'), money(v.current.ProfitBeforeInterest, true), ...(prev ? [money(prev.ProfitBeforeInterest, true), money(v.current.ProfitBeforeInterest - prev.ProfitBeforeInterest, true)] : [])],
            [],
            [bold('Investment'), bold('Opening'), bold('Closing'), bold('Average')],
            ...INVESTMENT.map(row => [row.result ? bold(row.name) : row.name, money(v.current.Opening[row.key] as number, row.result), money(v.current.Closing[row.key] as number, row.result), money(v.average[row.key] as number, true)] as ExcelCell[]),
            [],
            [bold('Ratio'), bold('This period'), bold('Annualised'), ...(prev ? [bold('Last year')] : [])],
            ...v.ratios.map(q => [`${q.label} : ${q.formula}`, pct(q.period), pct(q.annual), ...(prev ? [pct(q.previous)] : [])] as ExcelCell[]),
            [],
            [bold('Business line'), bold('Gross profit'), bold('Average stock'), bold('GMROI')],
            ...v.lines.map(line => [line.name, money(line.grossProfit), money(line.averageStock), line.gmroi === null ? null : `${line.gmroi.toFixed(2)}×`] as ExcelCell[])
        ]
    };
}


function withSignatures
(
    html:
        string,
    kit:
        PrintKit
):
    string
{
    if (!kit.toggles?.['signatures'])
    {
        return html;
    }

    return html.replace(
        '<div class="pv-end">',
        '<div class="pv-end">' + kit.signatures(['Prepared by', 'Checked by', 'Approved by']));
}
