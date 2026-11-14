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
    CASH_FLOW_PRINT_KEY,
    CashFlowTotals,
    CashFlows,
    CfLine,
    buildCashFlowLines,
    cashFlowTotals,
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
// Cash Flow Statement (direct method)
//
//   Left  : period (default : financial year start → today),
//           branch, Show cancelled, Submit
//   Bar   : level (no reload)
//   Right : opening cash, operating / investing / financing
//           (received · paid · net, by Class › Group › Sub Group
//           › Ledger of the contra ledgers), net change, closing
//           cash and the check
//===============================================================

@Component(
{
    selector:'cash-flow',

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

    templateUrl:'./cash-flow.html',

    styleUrl:'./cash-flow.css'
})

export class CashFlowPage
    extends FaStatementPage
    implements OnInit
{
    protected readonly pageName =
        'Cash Flow Statement';

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

    report:
        CashFlows | null = null;

    totals:
        CashFlowTotals | null = null;

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

    protected buildLines():
        FaLine[]
    {
        this.totals =
            this.report ? cashFlowTotals(this.report) : null;

        return this.report
            ? buildCashFlowLines(
                this.report,
                {
                    level:this.level,
                    showZero:this.showZero,
                    search:this.searchText
                })
            : [];
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

    // A contra ledger or a cash ledger opens its statement
    override isLedger
    (
        line:
            FaLine
    ):
        boolean
    {
        const cf =
            line as CfLine;

        return line.kind === 'node'
            && line.level === 4
            && (!!cf.flow?.LedgerCode || !!cf.cash?.LedgerCode);
    }

    override lineClick
    (
        line:
            FaLine
    ):
        void
    {
        const cf =
            line as CfLine;

        if (this.isLedger(line))
        {
            if (cf.flow)
            {
                this.openStatement(cf.flow.LedgerCode, cf.flow.LedgerType);
            }
            else if (cf.cash)
            {
                this.openStatement(cf.cash.LedgerCode, cf.cash.LedgerType);
            }

            return;
        }

        super.lineClick(line);
    }

    isActiveLine
    (
        line:
            FaLine
    ):
        boolean
    {
        const cf =
            line as CfLine;

        return cf.flow?.IsActive ?? cf.cash?.IsActive ?? true;
    }

    inflowOf
    (
        line:
            FaLine
    ):
        string
    {
        const value =
            (line as CfLine).inflow;

        return value === undefined ? '' : this.money(value);
    }

    outflowOf
    (
        line:
            FaLine
    ):
        string
    {
        const value =
            (line as CfLine).outflow;

        return value === undefined ? '' : this.money(value);
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
                .getCashFlows(
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

                                this.loadError = faErrorText(err, 'The cash flow statement could not be loaded.');

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

        this.totals = null;

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
                'Submit first to show the cash flow statement.'
            );

            return;
        }

        const token =
            saveFlowPrintRequest(
                CASH_FLOW_PRINT_KEY,
                {
                    from:this.report.From,
                    to:this.report.To,
                    branchId:this.report.BranchId,
                    showCancelled:this.report.ShowCancelled,
                    level:this.level,
                    showCodes:this.showCodes,
                    showZero:this.showZero,
                    search:this.searchText
                }
            );

        this.openPrint(CASH_FLOW_PRINT_KEY, token);
    }
}
