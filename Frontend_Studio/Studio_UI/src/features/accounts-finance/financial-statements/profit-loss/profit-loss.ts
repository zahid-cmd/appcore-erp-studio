//===============================================================
// Imports
//===============================================================

import
{
    Component,
    HostListener,
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
    FaBusinessLine,
    FaCompare,
    FaLine,
    FaSideItem,
    FaTAccount,
    PROFIT_LOSS_COMPARE,
    PROFIT_LOSS_PRINT_KEY,
    ProfitLoss,
    ProfitLossLayout,
    buildBusinessLines,
    buildProfitLossLines,
    buildProfitLossTForm,
    isZero,
    marginOf,
    toIsoDate
}
from '../models/final-accounts.model';

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
    saveProfitLossPrintRequest
}
from '../print/final-accounts.print';


//===============================================================
// Profit & Loss (Accounts & Finance › Financial Statements)
//
//   Left  : period (default : financial year start → today),
//           branch, comparison, Show cancelled, Submit
//   Bar   : Vertical / T-form, level (no reload)
//   Right : head card (Sales · Gross Profit · Net Profit), the
//           statement, and the gross profit by business line
//===============================================================

@Component(
{
    selector:'profit-loss',

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

    templateUrl:'./profit-loss.html',

    styleUrl:'./profit-loss.css'
})

export class ProfitLossPage
    extends FaStatementPage
    implements OnInit
{
    protected readonly pageName =
        'Profit & Loss';

    readonly compareOptions =
        PROFIT_LOSS_COMPARE;

    //===========================================================
    // Filter (Submit)
    //===========================================================

    fromDate:
        Date = yearStartGuess();

    toDate:
        Date = faToday();

    compare:
        FaCompare = 'none';

    // The From date was picked by hand (the year start answer then
    // does not move it)
    private fromTouched =
        false;

    //===========================================================
    // View (no reload)
    //===========================================================

    layout:
        ProfitLossLayout = 'vertical';

    // Business lines on the print (always)
    showLines:
        boolean = true;

    // Business-line pop-up
    breakdownOpen:
        boolean = false;

    //===========================================================
    // Canvas
    //===========================================================

    report:
        ProfitLoss | null = null;

    accounts:
        FaTAccount[] = [];

    businessLines:
        FaBusinessLine[] = [];

    businessTotal:
        FaBusinessLine | null = null;

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
                                // Keep the guess (1 July / 1 January)
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
    // View changes (no reload)
    //===========================================================

    setLayout
    (
        layout:
            ProfitLossLayout
    ):
        void
    {
        if (this.layout === layout)
        {
            return;
        }

        this.layout = layout;

        this.rebuild();
    }

    onLinesChange
    (
        event:
            Event
    ):
        void
    {
        this.showLines = !!(event.target as HTMLInputElement | null)?.checked;

        this.refreshView();
    }

    //===========================================================
    // Business-line pop-up
    //===========================================================

    openBreakdown():
        void
    {
        if (!this.report)
        {
            return;
        }

        this.breakdownOpen = true;

        this.refreshView();
    }

    closeBreakdown():
        void
    {
        this.breakdownOpen = false;

        this.refreshView();
    }

    @HostListener('document:keydown.escape')
    onEscape():
        void
    {
        if (this.breakdownOpen)
        {
            this.closeBreakdown();
        }
    }

    //===========================================================
    // Lines
    //===========================================================

    protected buildLines():
        FaLine[]
    {
        if (!this.report)
        {
            this.accounts = [];

            this.businessLines = [];

            this.businessTotal = null;

            return [];
        }

        const options =
        {
            level:this.level,
            showZero:this.showZero,
            search:this.searchText
        };

        this.accounts =
            buildProfitLossTForm(this.report, options);

        const lines =
            buildBusinessLines(this.report.Rows);

        this.businessLines = lines.lines;

        this.businessTotal = lines.total;

        return buildProfitLossLines(this.report, options);
    }

    protected statementPeriod():
        FaStatementPeriod | null
    {
        return this.report
            ? {
                from:this.report.From,
                to:this.report.To,
                branchId:this.report.BranchId,
                showCancelled:this.report.ShowCancelled
            }
            : null;
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

    // Rows of a T account : Dr and Cr side by side
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
                .getProfitLoss(
                    {
                        from:toIsoDate(this.fromDate),
                        to:toIsoDate(this.toDate),
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

                                this.loadError = faErrorText(err, 'The profit & loss account could not be loaded.');

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

        this.layout = 'vertical';

        this.level = 1;

        this.showCodes = true;

        this.showZero = false;

        this.showLines = true;

        this.breakdownOpen = false;

        this.searchText = '';

        this.collapsed.clear();

        this.report = null;

        this.loaded = false;

        this.loading = false;

        this.loadError = '';

        this.allLines = [];

        this.lines = [];

        this.accounts = [];

        this.businessLines = [];

        this.businessTotal = null;

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
        return !!this.report && this.report.Compare !== 'none';
    }

    get layoutWord():
        string
    {
        return this.layout === 'vertical' ? 'Vertical' : 'T-form';
    }

    get grossMargin():
        string
    {
        return this.report
            ? this.pct(marginOf(this.report.Totals.GrossProfit, this.report.Totals.Sales))
            : '';
    }

    get netMargin():
        string
    {
        return this.report
            ? this.pct(marginOf(this.report.Totals.NetProfit, this.report.Totals.Sales))
            : '';
    }

    get isLoss():
        boolean
    {
        return !!this.report && this.report.Totals.NetProfit < 0;
    }

    // Bar width (% of the largest gross profit)
    barWidth
    (
        line:
            FaBusinessLine
    ):
        number
    {
        const max =
            Math.max(0, ...this.businessLines.map(x => Math.abs(x.gross)));

        return max > 0
            ? Math.round(Math.abs(line.gross) / max * 100)
            : 0;
    }

    zero
    (
        value:
            number
    ):
        boolean
    {
        return isZero(value);
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
                'Submit first to show the profit & loss account.'
            );

            return;
        }

        const token =
            saveProfitLossPrintRequest(
                {
                    from:this.report.From,
                    to:this.report.To,
                    branchId:this.report.BranchId,
                    showCancelled:this.report.ShowCancelled,
                    compare:this.report.Compare,
                    layout:this.layout,
                    level:this.level,
                    showCodes:this.showCodes,
                    showZero:this.showZero,
                    showLines:this.showLines,
                    search:this.searchText
                }
            );

        this.openPrint(PROFIT_LOSS_PRINT_KEY, token);
    }
}


//===============================================================
// Helpers
//===============================================================

// Before the server answers : 1 July (Bangladesh financial year)
function yearStartGuess():
    Date
{
    const today =
        faToday();

    const year =
        today.getMonth() >= 6
            ? today.getFullYear()
            : today.getFullYear() - 1;

    return new Date(year, 6, 1);
}
