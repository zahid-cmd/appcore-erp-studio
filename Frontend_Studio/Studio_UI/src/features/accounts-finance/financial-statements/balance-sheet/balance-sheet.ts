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
    FaCompare,
    FaLine,
    buildBalanceSheetLines,
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
        return this.report
            ? buildBalanceSheetLines(
                this.report,
                {
                    level:this.level,
                    showZero:this.showZero,
                    search:this.searchText
                })
            : [];
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
                    level:this.level,
                    showCodes:this.showCodes,
                    showZero:this.showZero,
                    search:this.searchText
                }
            );

        this.openPrint(BALANCE_SHEET_PRINT_KEY, token);
    }
}
