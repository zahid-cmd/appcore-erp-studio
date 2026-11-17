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
    FaLine,
    toIsoDate
}
from '../models/final-accounts.model';

import
{
    RETURN_ON_INVESTMENT_PRINT_KEY,
    ROI_COMPARE,
    ReturnOnInvestment,
    RoiBase,
    RoiCompare,
    RoiRatio,
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
    FA_REQUEST_TIMEOUT,
    FaStatementPage,
    FaStatementPeriod,
    faErrorText,
    faParseIso,
    faToday
}
from '../shared/fa-statement-page';

import
{
    saveRoiPrintRequest
}
from '../print/return-on-investment.print';


//===============================================================
// Return on Investment (Accounts & Finance › Financial Statements)
//
//   Bar    : period (default : this financial year), branch,
//            comparison (same period last year), Show cancelled,
//            Submit
//   Switch : Period rate / Annualised (no reload)
//   Canvas : head tiles (ROI, ROCE, ROE, ROA), Return,
//            Investment (opening · closing · average), Ratios;
//            side panel : stock return (GMROI) by business line
//            and the payback on capital
//===============================================================

@Component(
{
    selector:'return-on-investment',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        CommandCenterComponent,
        SearchDropdownComponent,
        DatepickerComponent,
        ToastComponent,
        OrbitLoaderComponent
    ],

    templateUrl:'./return-on-investment.html',

    styleUrl:'./return-on-investment.css'
})

export class ReturnOnInvestmentPage
    extends FaStatementPage
    implements OnInit
{
    protected readonly pageName =
        'Return on Investment';

    readonly compareOptions =
        ROI_COMPARE;

    //===========================================================
    // Filter (Submit)
    //===========================================================

    fromDate:
        Date = yearStartGuess();

    toDate:
        Date = faToday();

    compare:
        RoiCompare = 'none';

    private fromTouched =
        false;

    //===========================================================
    // View (no reload)
    //===========================================================

    annualise:
        boolean = true;

    //===========================================================
    // Canvas
    //===========================================================

    report:
        ReturnOnInvestment | null = null;

    view:
        RoiView | null = null;

    private loadRequest?:
        Subscription;

    private yearRequest?:
        Subscription;

    //===========================================================
    // Start
    //===========================================================

    ngOnInit():
        void
    {
        this.loadBranches();

        this.loadYearStart();
    }

    // From = start of the financial year that holds today
    private loadYearStart():
        void
    {
        this.yearRequest?.unsubscribe();

        this.yearRequest =
            this.finalAccounts
                .getYear(toIsoDate(faToday()))
                .pipe(timeout(FA_REQUEST_TIMEOUT), takeUntilDestroyed(this.destroyRef))
                .subscribe
                (
                    {
                        next:
                            year =>
                            {
                                const start =
                                    faParseIso(year.YearStart);

                                if (start && !this.fromTouched)
                                {
                                    this.fromDate = start;

                                    this.refreshView();
                                }
                            },
                        error:
                            () =>
                            {
                                // Keep the guess
                            }
                    }
                );
    }

    //===========================================================
    // Filter changes
    //===========================================================

    onFromChange
    (
        date:
            Date
    ):
        void
    {
        this.fromTouched = true;

        this.fromDate = date;

        if (this.fromDate > this.toDate)
        {
            this.toDate = date;
        }
    }

    onToChange
    (
        date:
            Date
    ):
        void
    {
        this.toDate = date;

        if (this.toDate < this.fromDate)
        {
            this.fromTouched = true;

            this.fromDate = date;
        }
    }

    setCompare
    (
        value:
            RoiCompare
    ):
        void
    {
        this.compare = value;

        this.refreshView();
    }

    get compareHint():
        string
    {
        return this.compare === 'last-year'
            ? 'Same period last year : adds last year\'s rates and the change in points.'
            : 'No comparison. Pick Last year to add last year\'s rates.';
    }

    setAnnualise
    (
        value:
            boolean
    ):
        void
    {
        if (this.annualise === value)
        {
            return;
        }

        this.annualise = value;

        this.rebuild();
    }

    //===========================================================
    // Lines (none : this page has its own canvas)
    //===========================================================

    protected buildLines():
        FaLine[]
    {
        this.view =
            this.report
                ? buildRoiView(this.report, this.annualise)
                : null;

        return [];
    }

    protected statementPeriod():
        FaStatementPeriod | null
    {
        return null;
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
                .getReturnOnInvestment(
                    {
                        from:toIsoDate(this.fromDate),
                        to:toIsoDate(this.toDate),
                        branchId:this.branchId,
                        showCancelled:this.showCancelled,
                        compare:this.compare
                    }
                )
                .pipe(timeout(FA_REQUEST_TIMEOUT * 2), takeUntilDestroyed(this.destroyRef))
                .subscribe
                (
                    {
                        next:
                            result =>
                            {
                                this.report = result;

                                this.loading = false;

                                this.rebuild();
                            },
                        error:
                            err =>
                            {
                                this.loading = false;

                                this.report = null;

                                this.view = null;

                                this.loadError = faErrorText(err, 'The return on investment could not be loaded.');

                                this.refreshView();
                            }
                    }
                );
    }

    refresh():
        void
    {
        this.loadRequest?.unsubscribe();

        this.fromTouched = false;

        this.fromDate = yearStartGuess();

        this.toDate = faToday();

        this.branchId = 0;

        this.showCancelled = false;

        this.compare = 'none';

        this.annualise = true;

        this.report = null;

        this.view = null;

        this.loaded = false;

        this.loading = false;

        this.loadError = '';

        this.allLines = [];

        this.lines = [];

        this.loadBranches();

        this.loadYearStart();

        this.refreshView();
    }

    //===========================================================
    // Figures
    //===========================================================

    get hasCompare():
        boolean
    {
        return !!this.report?.Previous;
    }

    get headline():
        RoiRatio | null
    {
        return this.view?.ratios[0] ?? null;
    }

    get others():
        RoiRatio[]
    {
        return this.view?.ratios.slice(1) ?? [];
    }

    get monthsText():
        string
    {
        const days =
            this.view?.days ?? 0;

        const months =
            days * 12 / 365;

        return months >= 0.95
            ? `${months.toFixed(1).replace(/\.0$/, '')} months`
            : `${days} days`;
    }

    get financeText():
        string
    {
        const groups =
            this.report?.FinanceSubGroups ?? [];

        return groups.length > 0
            ? groups.join(', ')
            : 'No sub group is marked Finance cost (Account Sub Group) : Profit before interest = Net Profit';
    }

    // Rates are already in % (the base page's pct takes a ratio)
    override pct
    (
        value:
            number | null | undefined
    ):
        string
    {
        return roiPct(value);
    }

    points
    (
        ratio:
            RoiRatio
    ):
        string
    {
        return roiPoints(ratio.shown, ratio.previous);
    }

    pointsUp
    (
        ratio:
            RoiRatio
    ):
        boolean
    {
        return ratio.shown !== null && ratio.previous !== null && ratio.shown > ratio.previous;
    }

    times
    (
        value:
            number | null
    ):
        string
    {
        return roiTimes(value);
    }

    years
    (
        value:
            number | null
    ):
        string
    {
        return value === null
            ? '–'
            : `${value.toFixed(1)} years`;
    }

    // Investment rows : name, opening, closing, average
    investmentRows():
        { name:string; note:string; key:keyof RoiBase; result:boolean }[]
    {
        return INVESTMENT_ROWS;
    }

    baseValue
    (
        base:
            RoiBase | null | undefined,
        key:
            keyof RoiBase
    ):
        number
    {
        return Number(base?.[key] ?? 0);
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
                'Submit first to show the return on investment.'
            );

            return;
        }

        const token =
            saveRoiPrintRequest(
                {
                    from:this.report.Current.From,
                    to:this.report.Current.To,
                    branchId:this.report.BranchId,
                    showCancelled:this.report.ShowCancelled,
                    compare:this.report.Compare,
                    annualise:this.annualise
                }
            );

        this.openPrint(RETURN_ON_INVESTMENT_PRINT_KEY, token);
    }
}


//===============================================================
// The investment table
//===============================================================

const INVESTMENT_ROWS:
    { name:string; note:string; key:keyof RoiBase; result:boolean }[] =
[
    { name:'Equity', note:'with profit to date', key:'Equity', result:false },
    { name:'Non-current Liabilities', note:'Account Group term', key:'NonCurrentLiabilities', result:false },
    { name:'Capital Employed', note:'= Net Assets', key:'CapitalEmployed', result:true },
    { name:'Add : Current Liabilities', note:'', key:'CurrentLiabilities', result:false },
    { name:'Total Assets', note:'', key:'TotalAssets', result:true }
];
