//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    DestroyRef,
    OnInit,
    inject,
    signal
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
    Router
}
from '@angular/router';

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
    ToastService
}
from '../../../../shared/components/utilities/toast/toast.service';

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
// Trial Balance
//===============================================================

import
{
    TRIAL_BALANCE_LEVELS,
    TRIAL_BALANCE_PRINT_KEY,
    TrialBalance,
    TrialBalanceLevel,
    TrialBalanceNode,
    TrialBalanceTotals,
    TrialBalanceView,
    buildTrialBalanceTree,
    crOf,
    drOf,
    formatLedgerDate,
    formatLedgerMoney,
    isBalanced,
    statementRoute,
    tbMoney,
    toIsoDate
}
from '../models/trial-balance.model';

import
{
    TrialBalanceService
}
from '../services/trial-balance.service';

import
{
    saveTrialBalancePrintRequest
}
from '../print/trial-balance.print';


interface Option
{
    label:string;
    value:any;
}


//===============================================================
// Trial Balance (Accounts & Finance › Financial Statements)
//
//   Left  : period, branch (allotted ones) and Submit
//   Bar   : view (six / two column), level, switches (no reload
//           except "Show cancelled")
//   Right : empty until Submit; then the check strip and the
//           Class › Group › Sub Group › Ledger tree. A ledger
//           opens its statement in a new tab.
//===============================================================

@Component(
{
    selector:'trial-balance',

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

    templateUrl:'./trial-balance.html',

    styleUrl:'./trial-balance.css'
})

export class TrialBalancePage
    implements OnInit
{
    private readonly service =
        inject(TrialBalanceService);

    private readonly router =
        inject(Router);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly destroyRef =
        inject(DestroyRef);

    readonly levels =
        TRIAL_BALANCE_LEVELS;

    //===========================================================
    // Filter (Submit)
    //===========================================================

    fromDate:
        Date =
        monthStart();

    toDate:
        Date =
        today();

    branchId:
        number = 0;

    showCancelled:
        boolean = false;

    branchItems:
        Option[] = [];

    branchesLoading:
        boolean = false;

    branchesError:
        string = '';

    //===========================================================
    // View (no reload)
    //===========================================================

    view:
        TrialBalanceView = 'six';

    // Class by default (owner)
    level:
        TrialBalanceLevel = 1;

    showCodes:
        boolean = true;

    showZeroBalance:
        boolean = false;

    showNoTransactions:
        boolean = false;

    searchText:
        string = '';

    // Nodes closed by a click (keys)
    private collapsed =
        new Set<string>();

    //===========================================================
    // Canvas
    //===========================================================

    report:
        TrialBalance | null = null;

    loaded:
        boolean = false;

    loading:
        boolean = false;

    loadError:
        string = '';

    // Rows on the canvas (after level, switches, search, collapse)
    nodes:
        TrialBalanceNode[] = [];

    ledgerCount:
        number = 0;

    totals:
        TrialBalanceTotals =
        {
            OpeningDebit:0,
            OpeningCredit:0,
            PeriodDebit:0,
            PeriodCredit:0,
            ClosingDebit:0,
            ClosingCredit:0
        };

    private allNodes:
        TrialBalanceNode[] = [];

    private branchRequest?:
        Subscription;

    private loadRequest?:
        Subscription;

    //===========================================================
    // View refresh (zoneless : painted once more on the next turn)
    //===========================================================

    private repaintQueued =
        false;

    // Read by the template : bumping it makes Angular paint the
    // page even when an HTTP answer arrives outside an event
    // (zoneless). Without it the canvas stayed on "Loading" until
    // the next click.
    readonly renderTick =
        signal(0);

    private refreshView():
        void
    {
        this.renderTick.update((x: number) => x + 1);

        this.cdr.markForCheck();

        try
        {
            this.cdr.detectChanges();
        }
        catch (error)
        {
            console.error('[Trial Balance] view update failed', error);
        }

        if (!this.repaintQueued)
        {
            this.repaintQueued = true;

            setTimeout(() =>
            {
                this.repaintQueued = false;

                this.cdr.markForCheck();

                try
                {
                    this.cdr.detectChanges();
                }
                catch (error)
                {
                    console.error('[Trial Balance] view update failed (repaint)', error);
                }
            });
        }
    }

    //===========================================================
    // Start
    //===========================================================

    ngOnInit():
        void
    {
        this.loadBranches();
    }

    private loadBranches():
        void
    {
        this.branchRequest?.unsubscribe();

        this.branchesLoading = true;

        this.branchesError = '';

        this.branchRequest =
            this.service
                .getBranches()
                .pipe(timeout(REQUEST_TIMEOUT), takeUntilDestroyed(this.destroyRef))
                .subscribe
                (
                    {
                        next:
                            branches =>
                            {
                                this.branchItems =
                                [
                                    {
                                        label:branches.length > 1
                                            ? `All Allotted Branches (${branches.length})`
                                            : 'All Allotted Branches',
                                        value:0
                                    },
                                    ...branches.map(x => ({ label:x.Name, value:x.Id }))
                                ];

                                if (branches.length === 0)
                                {
                                    this.branchesError =
                                        'You are not allotted to any branch (Security & Permission > Branch Assignment).';
                                }

                                this.branchesLoading = false;

                                this.refreshView();
                            },
                        error:
                            err =>
                            {
                                this.branchesLoading = false;

                                this.branchesError = errorText(err, 'The branches could not be loaded.');

                                this.refreshView();
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
            this.fromDate = date;
        }
    }

    onBranchChange
    (
        value:
            any
    ):
        void
    {
        this.branchId = Number(value) || 0;
    }

    onCancelledChange
    (
        event:
            Event
    ):
        void
    {
        this.showCancelled = !!(event.target as HTMLInputElement | null)?.checked;
    }

    //===========================================================
    // View changes (no reload)
    //===========================================================

    setView
    (
        view:
            TrialBalanceView
    ):
        void
    {
        if (this.view === view)
        {
            return;
        }

        this.view = view;

        this.rebuild();
    }

    setLevel
    (
        level:
            TrialBalanceLevel
    ):
        void
    {
        if (this.level === level)
        {
            return;
        }

        this.level = level;

        this.collapsed.clear();

        this.rebuild();
    }

    onCodesChange
    (
        event:
            Event
    ):
        void
    {
        this.showCodes = !!(event.target as HTMLInputElement | null)?.checked;

        this.refreshView();
    }

    onZeroBalanceChange
    (
        event:
            Event
    ):
        void
    {
        this.showZeroBalance = !!(event.target as HTMLInputElement | null)?.checked;

        this.rebuild();
    }

    onNoTransactionsChange
    (
        event:
            Event
    ):
        void
    {
        this.showNoTransactions = !!(event.target as HTMLInputElement | null)?.checked;

        this.rebuild();
    }

    onSearch
    (
        value:
            string
    ):
        void
    {
        this.searchText = value ?? '';

        this.rebuild();
    }

    //===========================================================
    // Tree
    //===========================================================

    private rebuild():
        void
    {
        const tree =
            buildTrialBalanceTree(
                this.report?.Rows ?? [],
                {
                    view:this.view,
                    level:this.level,
                    showZeroBalance:this.showZeroBalance,
                    showNoTransactions:this.showNoTransactions,
                    search:this.searchText
                }
            );

        this.allNodes = tree.nodes;

        this.ledgerCount = tree.ledgerCount;

        this.totals = tree.totals;

        this.applyCollapse();

        this.refreshView();
    }

    private applyCollapse():
        void
    {
        this.nodes =
            this.allNodes.filter(
                node => !node.parentKeys.some(key => this.collapsed.has(key)));
    }

    // A class / group / sub group row opens or closes its children
    canToggle
    (
        node:
            TrialBalanceNode
    ):
        boolean
    {
        return node.level < this.level;
    }

    isCollapsed
    (
        node:
            TrialBalanceNode
    ):
        boolean
    {
        return this.collapsed.has(node.key);
    }

    toggle
    (
        node:
            TrialBalanceNode
    ):
        void
    {
        if (!this.canToggle(node))
        {
            return;
        }

        if (this.collapsed.has(node.key))
        {
            this.collapsed.delete(node.key);
        }
        else
        {
            this.collapsed.add(node.key);
        }

        this.applyCollapse();

        this.refreshView();
    }

    expandAll():
        void
    {
        this.collapsed.clear();

        this.applyCollapse();

        this.refreshView();
    }

    collapseAll():
        void
    {
        this.allNodes
            .filter(x => x.level === 1 && this.canToggle(x))
            .forEach(x => this.collapsed.add(x.key));

        this.applyCollapse();

        this.refreshView();
    }

    trackNode
    (
        index:
            number,
        node:
            TrialBalanceNode
    ):
        string
    {
        return node.key;
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
            this.service
                .getTrialBalance(
                    {
                        from:toIsoDate(this.fromDate),
                        to:toIsoDate(this.toDate),
                        branchId:this.branchId,
                        showCancelled:this.showCancelled
                    }
                )
                .pipe(timeout(REQUEST_TIMEOUT), takeUntilDestroyed(this.destroyRef))
                .subscribe
                (
                    {
                        next:
                            result =>
                            {
                                this.report = result;

                                this.collapsed.clear();

                                this.loading = false;

                                try
                                {
                                    this.rebuild();
                                }
                                catch (error)
                                {
                                    console.error('[Trial Balance] could not build the rows', error);

                                    this.loadError = 'The trial balance came back but could not be shown.';

                                    this.refreshView();
                                }
                            },
                        error:
                            err =>
                            {
                                this.loading = false;

                                this.report = null;

                                this.loadError = errorText(err, 'The trial balance could not be loaded.');

                                this.refreshView();
                            }
                    }
                );
    }

    refresh():
        void
    {
        this.loadRequest?.unsubscribe();

        this.fromDate = monthStart();

        this.toDate = today();

        this.branchId = 0;

        this.showCancelled = false;

        this.view = 'six';

        this.level = 1;

        this.showCodes = true;

        this.showZeroBalance = false;

        this.showNoTransactions = false;

        this.searchText = '';

        this.collapsed.clear();

        this.report = null;

        this.loaded = false;

        this.loading = false;

        this.loadError = '';

        this.allNodes = [];

        this.nodes = [];

        this.ledgerCount = 0;

        this.loadBranches();

        this.refreshView();
    }

    //===========================================================
    // Ledger → its statement (new tab, same period and branch)
    //===========================================================

    openStatement
    (
        node:
            TrialBalanceNode
    ):
        void
    {
        const row =
            node.row;

        if (!row || !row.ClassCode || !this.report)
        {
            return;
        }

        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(
                    [statementRoute(row.LedgerType)],
                    {
                        queryParams:
                        {
                            ledger:row.LedgerCode,
                            from:this.report.From,
                            to:this.report.To,
                            branchId:this.report.BranchId || 0,
                            showCancelled:this.report.ShowCancelled ? 1 : 0
                        }
                    }
                )
            );

        const tab =
            window.open(url, '_blank');

        if (!tab)
        {
            this.toast.error(
                'Statement Not Opened',
                'The browser blocked the new tab. Allow pop-ups for this site.'
            );
        }
    }

    //===========================================================
    // Figures
    //===========================================================

    get balanced():
        boolean
    {
        return !!this.report && isBalanced(this.report.Difference);
    }

    get viewWord():
        string
    {
        return this.view === 'six' ? 'Six-column' : 'Two-column';
    }

    get levelWord():
        string
    {
        return this.levels.find(x => x.value === this.level)?.label ?? '';
    }

    get colCount():
        number
    {
        return this.view === 'six' ? 7 : 3;
    }

    dr
    (
        value:
            number
    ):
        string
    {
        return tbMoney(drOf(value));
    }

    cr
    (
        value:
            number
    ):
        string
    {
        return tbMoney(crOf(value));
    }

    money
    (
        value:
            number
    ):
        string
    {
        return tbMoney(value);
    }

    total
    (
        value:
            number
    ):
        string
    {
        return formatLedgerMoney(value);
    }

    date
    (
        iso:
            string
    ):
        string
    {
        return formatLedgerDate(iso);
    }

    // Retained Earnings : how much of its opening is the earlier
    // years' result
    priorText():
        string
    {
        const value =
            this.report?.PriorYearsResult ?? 0;

        if (Math.abs(value) < 0.005)
        {
            return '';
        }

        return `${formatLedgerMoney(Math.abs(value))} ${value < 0 ? 'Cr (profit)' : 'Dr (loss)'}`;
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
                'Submit first to show the trial balance.'
            );

            return;
        }

        const token =
            saveTrialBalancePrintRequest(
                {
                    from:this.report.From,
                    to:this.report.To,
                    branchId:this.report.BranchId,
                    showCancelled:this.report.ShowCancelled,
                    view:this.view,
                    level:this.level,
                    showCodes:this.showCodes,
                    showZeroBalance:this.showZeroBalance,
                    showNoTransactions:this.showNoTransactions,
                    search:this.searchText
                }
            );

        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(
                    ['/print-viewer', TRIAL_BALANCE_PRINT_KEY, token],
                    {
                        queryParams:{ doc:'trial-balance' }
                    }
                )
            );

        // Not "noopener" : the new tab keeps this session's login
        const tab =
            window.open(url, '_blank');

        if (!tab)
        {
            this.toast.error(
                'Print Failed',
                'The browser blocked the print tab. Allow pop-ups for this site.'
            );
        }
    }
}


//===============================================================
// Helpers
//===============================================================

const REQUEST_TIMEOUT =
    120000;

function monthStart():
    Date
{
    const now =
        new Date();

    return new Date(now.getFullYear(), now.getMonth(), 1);
}

function today():
    Date
{
    const now =
        new Date();

    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function errorText
(
    err:
        any,
    fallback:
        string
):
    string
{
    if (err?.name === 'TimeoutError')
    {
        return 'The server took too long to answer. Narrow the period and submit again.';
    }

    const body =
        err?.error;

    if (typeof body === 'string' && body.trim())
    {
        return body.trim();
    }

    if (typeof body?.message === 'string' && body.message.trim())
    {
        return body.message.trim();
    }

    return fallback;
}
