//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit
}
from '@angular/core';

import
{
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import
{
    CommonModule
}
from '@angular/common';

import
{
    Subscription,
    timeout
}
from 'rxjs';

//===============================================================
// Shared Components
//===============================================================

import
{
    PageHeaderComponent
}
from '../../../../shared/components/layout/page-header/page-header';

import
{
    CommandCenterComponent
}
from '../../../../shared/components/utilities/command-center/command-center';

import
{
    SearchDropdownComponent
}
from '../../../../shared/components/controls/search-dropdown/search-dropdown';

import
{
    SearchBoxComponent
}
from '../../../../shared/components/utilities/search-box/search-box';

import
{
    DatepickerComponent
}
from '../../../../shared/components/controls/datepicker/datepicker';

import
{
    ToastComponent
}
from '../../../../shared/components/utilities/toast/toast';

import
{
    OrbitLoaderComponent
}
from '../../../../shared/components/utilities/orbit-loader/orbit-loader';

//===============================================================
// Final Accounts
//===============================================================

import
{
    BALANCE_SHEET_COMPARE,
    BALANCE_SHEET_PRINT_KEY,
    BalanceSheet,
    BalanceSheetLayout,
    FaCompare,
    FaLine,
    FaSideItem,
    FaTAccount,
    buildBalanceSheetLines,
    buildBalanceSheetNetAssets,
    buildBalanceSheetTForm,
    formatLedgerMoney,
    isZero,
    toIsoDate
}
from '../models/final-accounts.model';

import
{
    FA_REQUEST_TIMEOUT,
    FaStatementPage,
    FaStatementPeriod,
    faErrorText,
    faToday
}
from '../shared/fa-statement-page';

import
{
    saveBalanceSheetPrintRequest
}
from '../print/final-accounts.print';



//===============================================================
// Insights panel shapes
//===============================================================

interface BsMixPart
{
    label:string;
    amount:string;
    pct:string;
    width:string;
    color:string;
}

interface BsInsights
{
    assets:BsMixPart[];
    funding:BsMixPart[];
    ratios:{ label:string; value:string; hint:string }[];
    profit:string;
    profitLoss:boolean;
    profitNote:string;
}

//===============================================================
// Balance Sheet (Accounts & Finance › Financial Statements)
//
//   Left  : as on date (default : today), branch, comparison,
//           Show cancelled, Submit
//   Bar   : level (no reload)
//   Right : head card (Assets · Liabilities & Equity · check),
//           then Assets, Liabilities, Equity (with the Profit for
//           the year to date) and the balance check
//===============================================================

@Component(
{
    selector:'balance-sheet',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        CommandCenterComponent,
        SearchBoxComponent,
        SearchDropdownComponent,
        DatepickerComponent,
        ToastComponent,
        OrbitLoaderComponent
    ],

    templateUrl:'./balance-sheet.html',

    styleUrl:'./balance-sheet.css'
})

export class BalanceSheetPage
    extends FaStatementPage
    implements OnInit
{
    protected readonly pageName =
        'Balance Sheet';

    readonly compareOptions =
        BALANCE_SHEET_COMPARE;

    //===========================================================
    // Filter (Submit)
    //===========================================================

    asOnDate:
        Date = faToday();

    compare:
        FaCompare = 'none';

    //===========================================================
    // Canvas
    //===========================================================

    report:
        BalanceSheet | null = null;

    // View (no reload) : Vertical / Net assets / T-form
    layout:
        BalanceSheetLayout = 'vertical';

    account:
        FaTAccount | null = null;

    readonly layouts:
        { value:BalanceSheetLayout; label:string; icon:string; title:string }[] =
    [
        { value:'vertical', label:'Vertical', icon:'fas fa-list', title:'Assets, Liabilities, Equity in one column' },
        { value:'net-assets', label:'Net assets', icon:'fas fa-layer-group', title:'Total Assets − Current Liabilities = Net Assets, presented by Equity + Non-current Liabilities' },
        { value:'tform', label:'T-form', icon:'fas fa-table-columns', title:'Liabilities & Equity beside Assets' }
    ];

    private loadRequest?:
        Subscription;

    //===========================================================
    // Start
    //===========================================================

    ngOnInit():
        void
    {
        this.loadBranches();
    }

    //===========================================================
    // Filter changes
    //===========================================================

    onAsOnChange
    (
        date:
            Date
    ):
        void
    {
        this.asOnDate = date;
    }

    // The chosen comparison in full (under the one-row choices)
    get compareHint():
        string
    {
        const item =
            this.compareOptions.find(x => x.value === this.compare);

        return item && item.value !== 'none'
            ? `${item.label} : adds the comparison, the change and the change %.`
            : 'No comparison. Pick one to add the change and the change %.';
    }

    setCompare
    (
        value:
            FaCompare
    ):
        void
    {
        this.compare = value;

        this.refreshView();
    }

    //===========================================================
    // Lines
    //===========================================================

    protected buildLines():
        FaLine[]
    {
        if (!this.report)
        {
            this.account = null;

            return [];
        }

        const options =
        {
            level:this.level,
            showZero:this.showZero,
            search:this.searchText
        };

        this.account =
            this.layout === 'tform'
                ? buildBalanceSheetTForm(this.report, options)
                : null;

        return this.layout === 'net-assets'
            ? buildBalanceSheetNetAssets(this.report, options)
            : buildBalanceSheetLines(this.report, options);
    }

    setLayout
    (
        layout:
            BalanceSheetLayout
    ):
        void
    {
        if (this.layout === layout)
        {
            return;
        }

        this.layout = layout;

        this.collapsed.clear();

        this.rebuild();
    }

    get layoutWord():
        string
    {
        return this.layouts.find(x => x.value === this.layout)?.label ?? 'Vertical';
    }

    // T-form : a ledger item opens its statement
    sideClick
    (
        item:
            FaSideItem
    ):
        void
    {
        if (item.row?.ClassCode)
        {
            this.openStatement(item.row.LedgerCode, item.row.LedgerType);
        }
    }

    // Rows of the T account : both sides side by side
    sideRows
    (
        account:
            FaTAccount
    ):
        { dr:FaSideItem | null; cr:FaSideItem | null }[]
    {
        const count =
            Math.max(account.dr.length, account.cr.length);

        return Array.from(
            { length:count },
            (_, i) =>
            ({
                dr:account.dr[i] ?? null,
                cr:account.cr[i] ?? null
            })
        );
    }

    // A ledger statement : from the year start (or the date) to
    // the date
    protected statementPeriod():
        FaStatementPeriod | null
    {
        return this.report
            ? {
                from:this.report.YearStart || this.report.AsOn,
                to:this.report.AsOn,
                branchId:this.report.BranchId,
                showCancelled:this.report.ShowCancelled
            }
            : null;
    }

    //===========================================================
    // Submit / Refresh
    //===========================================================

    submit():
        void
    {
        this.loadRequest?.unsubscribe();

        this.loading = true;

        this.loaded = true;

        this.loadError = '';

        this.refreshView();

        this.loadRequest =
            this.finalAccounts
                .getBalanceSheet(
                    {
                        asOn:toIsoDate(this.asOnDate),
                        branchId:this.branchId,
                        showCancelled:this.showCancelled,
                        compare:this.compare
                    }
                )
                .pipe(timeout(FA_REQUEST_TIMEOUT), takeUntilDestroyed(this.destroyRef))
                .subscribe
                (
                    {
                        next:
                            result =>
                            {
                                this.report = result;

                                this.collapsed.clear();

                                this.loading = false;

                                this.rebuild();
                            },
                        error:
                            err =>
                            {
                                this.loading = false;

                                this.report = null;

                                this.loadError = faErrorText(err, 'The balance sheet could not be loaded.');

                                this.refreshView();
                            }
                    }
                );
    }

    refresh():
        void
    {
        this.loadRequest?.unsubscribe();

        this.asOnDate = faToday();

        this.branchId = 0;

        this.showCancelled = false;

        this.compare = 'none';

        this.layout = 'vertical';

        this.level = 1;

        this.showCodes = true;

        this.showZero = false;

        this.searchText = '';

        this.collapsed.clear();

        this.report = null;

        this.loaded = false;

        this.loading = false;

        this.loadError = '';

        this.allLines = [];

        this.lines = [];

        this.loadBranches();

        this.refreshView();
    }

    //===========================================================
    // Figures
    //===========================================================

    get hasCompare():
        boolean
    {
        return !!this.report && this.report.Compare !== 'none';
    }

    get balanced():
        boolean
    {
        return !!this.report && isZero(this.report.Totals.Difference);
    }

    // Retained Earnings : how much is the earlier years' result
    priorText():
        string
    {
        const value =
            this.report?.PriorYearsResult ?? 0;

        if (isZero(value))
        {
            return '';
        }

        return `${formatLedgerMoney(Math.abs(value))} ${value < 0 ? 'profit' : 'loss'}`;
    }

    //===========================================================
    // Print (Print Viewer, new tab; Excel from the viewer)
    //===========================================================

    print():
        void
    {
        if (!this.report)
        {
            this.toast.error(
                'Nothing to Print',
                'Submit first to show the balance sheet.'
            );

            return;
        }

        const token =
            saveBalanceSheetPrintRequest(
                {
                    asOn:this.report.AsOn,
                    branchId:this.report.BranchId,
                    showCancelled:this.report.ShowCancelled,
                    compare:this.report.Compare,
                    layout:this.layout,
                    level:this.level,
                    showCodes:this.showCodes,
                    showZero:this.showZero,
                    search:this.searchText
                }
            );

        this.openPrint(BALANCE_SHEET_PRINT_KEY, token);
    }


    //===========================================================
    // Insights panel (2026-11-16) : what the assets are made of,
    // how they are funded and the key ratios. Built once per
    // loaded report (same objects until the report changes).
    //===========================================================

    private insightsReport:
        BalanceSheet | null = null;

    private insightsCache:
        BsInsights | null = null;

    get insights():
        BsInsights | null
    {
        const report =
            this.report;

        if (!report)
        {
            return null;
        }

        if (this.insightsReport !== report || !this.insightsCache)
        {
            this.insightsReport =
                report;

            this.insightsCache =
                this.buildInsights(report);
        }

        return this.insightsCache;
    }

    private buildInsights
    (
        report:
            BalanceSheet
    ):
        BsInsights
    {
        const t =
            report.Totals;

        const colors =
            ['#16307a', '#5b7bd5', '#b8692f', '#9fb3e6', '#cbd5e1'];

        const parts =
            (items: { label:string; amount:number }[]): BsMixPart[] =>
            {
                const sum =
                    items.reduce((s, x) => s + x.amount, 0);

                return items.map(
                    (x, i) =>
                    {
                        const pct =
                            sum > 0 ? x.amount / sum * 100 : 0;

                        return {
                            label:x.label,
                            amount:this.total(x.amount),
                            pct:pct.toFixed(1) + '%',
                            width:pct.toFixed(2) + '%',
                            color:colors[i % colors.length]
                        };
                    });
            };

        // Assets by group (largest four, then the rest together)
        const byGroup =
            new Map<string, number>();

        for (const row of report.Rows)
        {
            if (row.Section !== 'asset')
            {
                continue;
            }

            const key =
                row.GroupName || row.ClassName || 'Other';

            byGroup.set(key, (byGroup.get(key) ?? 0) + (Number(row.Amount) || 0));
        }

        const groups =
            [...byGroup.entries()]
                .map(([label, amount]) => ({ label, amount }))
                .filter(x => x.amount > 0)
                .sort((a, b) => b.amount - a.amount);

        const assetItems =
            groups.length > 5
                ? [
                    ...groups.slice(0, 4),
                    { label:'Other assets', amount:groups.slice(4).reduce((s, x) => s + x.amount, 0) }
                  ]
                : groups;

        const equity =
            (Number(t.Equity) || 0) + (Number(t.ProfitToDate) || 0);

        const liabilities =
            Number(t.Liabilities) || 0;

        const assets =
            Number(t.Assets) || 0;

        const fundItems =
            [
                { label:'Equity (with profit to date)', amount:Math.max(equity, 0) },
                { label:'Liabilities', amount:Math.max(liabilities, 0) }
            ]
            .filter(x => x.amount > 0);

        const ratio =
            (a: number, b: number): string =>
                Math.abs(b) < 0.005 ? '-' : (a / b).toFixed(2);

        const pct =
            (a: number, b: number): string =>
                Math.abs(b) < 0.005 ? '-' : (a / b * 100).toFixed(1) + '%';

        const profit =
            Number(t.ProfitToDate) || 0;

        return {
            assets:parts(assetItems),
            funding:parts(fundItems),
            ratios:
            [
                { label:'Debt to equity', value:ratio(liabilities, equity), hint:'Liabilities / equity' },
                { label:'Equity ratio', value:pct(equity, assets), hint:'Equity / total assets' },
                { label:'Debt ratio', value:pct(liabilities, assets), hint:'Liabilities / total assets' },
                { label:'Return on equity', value:pct(profit, equity), hint:'Profit to date / equity' }
            ],
            profit:this.total(profit),
            profitLoss:profit < 0,
            profitNote:
                report.YearStart
                    ? 'From ' + this.date(report.YearStart) + ' · included in equity'
                    : 'Included in equity'
        };
    }
}
