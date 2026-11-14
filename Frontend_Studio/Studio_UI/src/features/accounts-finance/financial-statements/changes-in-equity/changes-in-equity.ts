//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    inject
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
// Financial Statements
//===============================================================

import
{
    FaLine,
    toIsoDate
}
from '../models/final-accounts.model';

import
{
    CHANGES_IN_EQUITY_PRINT_KEY,
    ChangesInEquity,
    EQUITY_MATRIX_ROWS,
    EquityColumn,
    EquityLedger,
    EquityMatrix,
    buildEquityMatrix,
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
    saveFlowPrintRequest
}
from '../print/financial-flows.print';


//===============================================================
// Changes in Equity
//
//   Left  : period (default : financial year start → today),
//           branch, Show cancelled, Submit
//   Bar   : Summary / With ledgers (no reload)
//   Right : one column per equity group + Total; rows Opening,
//           Profit / (loss), Capital introduced, Drawings,
//           Closing; the check against the Balance Sheet; the
//           equity ledgers
//===============================================================

@Component(
{
    selector:'changes-in-equity',

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

    templateUrl:'./changes-in-equity.html',

    styleUrl:'./changes-in-equity.css'
})

export class ChangesInEquityPage
    extends FaStatementPage
    implements OnInit
{
    protected readonly pageName =
        'Changes in Equity';

    private readonly flows =
        inject(FinancialFlowsService);

    //===========================================================
    // Filter (Submit)
    //===========================================================

    fromDate:
        Date = yearStartGuess();

    toDate:
        Date = faToday();

    private fromTouched =
        false;

    //===========================================================
    // Canvas
    //===========================================================

    readonly matrixRows =
        EQUITY_MATRIX_ROWS;

    report:
        ChangesInEquity | null = null;

    matrix:
        EquityMatrix | null = null;

    ledgers:
        EquityLedger[] = [];

    // View (no reload)
    showLedgers:
        boolean = true;

    private loadRequest?:
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

    private loadYearStart():
        void
    {
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

    //===========================================================
    // Lines
    //===========================================================

    // Matrix and ledger list (no statement lines)
    protected buildLines():
        FaLine[]
    {
        this.matrix =
            this.report ? buildEquityMatrix(this.report) : null;

        this.ledgers =
            this.report ? equityLedgersShown(this.report, this.searchText, this.showZero) : [];

        return [];
    }

    setShowLedgers
    (
        value:
            boolean
    ):
        void
    {
        this.showLedgers = value;

        this.refreshView();
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

    // Matrix cell (drawings shown negative)
    cell
    (
        column:
            EquityColumn,
        row:
            { key:'opening' | 'profit' | 'added' | 'withdrawn' | 'closing'; sign:1 | -1 }
    ):
        number
    {
        return column[row.key] * row.sign;
    }

    // Ledgers of one group (in the ledger table)
    groupLedgers
    (
        column:
            EquityColumn
    ):
        EquityLedger[]
    {
        return this.ledgers.filter(x => (x.GroupCode || x.GroupName || '-') === column.key);
    }

    ledgerClick
    (
        ledger:
            EquityLedger
    ):
        void
    {
        if (ledger.LedgerCode)
        {
            this.openStatement(ledger.LedgerCode, 'General Ledger');
        }
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
            this.flows
                .getChangesInEquity(
                    {
                        from:toIsoDate(this.fromDate),
                        to:toIsoDate(this.toDate),
                        branchId:this.branchId,
                        showCancelled:this.showCancelled
                    }
                )
                .pipe(timeout(FA_REQUEST_TIMEOUT), takeUntilDestroyed(this.destroyRef))
                .subscribe
                (
                    {
                        next:
                            (result: ChangesInEquity) =>
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

                                this.loadError = faErrorText(err, 'The changes in equity could not be loaded.');

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

        this.level = 1;

        this.showCodes = true;

        this.showZero = false;

        this.searchText = '';

        this.collapsed.clear();

        this.report = null;

        this.matrix = null;

        this.ledgers = [];

        this.showLedgers = true;

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

    get balanced():
        boolean
    {
        return !!this.report && Math.abs(this.report.Difference) < 0.005;
    }

    get isLoss():
        boolean
    {
        return !!this.report && this.report.Profit < 0;
    }

    //===========================================================
    // Print
    //===========================================================

    print():
        void
    {
        if (!this.report)
        {
            this.toast.error(
                'Nothing to Print',
                'Submit first to show the changes in equity.'
            );

            return;
        }

        const token =
            saveFlowPrintRequest(
                CHANGES_IN_EQUITY_PRINT_KEY,
                {
                    from:this.report.From,
                    to:this.report.To,
                    branchId:this.report.BranchId,
                    showCancelled:this.report.ShowCancelled,
                    level:this.level,
                    showCodes:this.showCodes,
                    showZero:this.showZero,
                    search:this.searchText,
                    showLedgers:this.showLedgers
                }
            );

        this.openPrint(CHANGES_IN_EQUITY_PRINT_KEY, token);
    }
}
