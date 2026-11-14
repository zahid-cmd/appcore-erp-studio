//===============================================================
// Imports
//===============================================================

import
{
    Component,
    HostListener,
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
    FA_REQUEST_TIMEOUT,
    FaOption,
    FaStatementPage,
    FaStatementPeriod,
    faErrorText,
    faToday
}
from '../shared/fa-statement-page';

import
{
    DailyStatementsService
}
from '../services/daily-statements.service';

import
{
    DAILY_COLLECTION_PRINT_KEY,
    DC_LINES,
    DC_MODES,
    DailyCollection,
    DcDay,
    DcGroup,
    DcLine,
    DcRow,
    DcTotals,
    buildDcDays,
    buildDcTotals,
    dayText,
    dcLineName,
    dcRowsShown
}
from '../models/daily-statements.model';

import
{
    saveDailyPrintRequest
}
from '../print/daily-statements.print';


//===============================================================
// Daily Collection Statement
//
//   Left  : period (default : today), branch, Show cancelled,
//           Submit; collected by and business line (no reload)
//   Bar   : By day / Every receipt
//   Right : one row per day : Cash · Bank · MFS · POS · EMI ·
//           Collected · Refunds · Net; a day opens its receipts.
//           Side panel : totals by mode, business line, document
//           and collector.
//===============================================================

@Component(
{
    selector:'daily-collection',

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

    templateUrl:'./daily-collection.html',

    styleUrl:'./daily-collection.css'
})

export class DailyCollectionPage
    extends FaStatementPage
    implements OnInit
{
    protected readonly pageName =
        'Daily Collection';

    private readonly daily =
        inject(DailyStatementsService);

    readonly modes =
        DC_MODES;

    readonly lineItems:
        FaOption[] =
        DC_LINES.map(x => ({ label:x.label, value:x.value }));

    //===========================================================
    // Filter
    //===========================================================

    fromDate:
        Date = faToday();

    toDate:
        Date = faToday();

    // -1 = everybody
    collectedBy:
        number = -1;

    line:
        '' | DcLine = '';

    userItems:
        FaOption[] = [{ label:'Everybody', value:-1 }];

    //===========================================================
    // View (no reload)
    //===========================================================

    view:
        'day' | 'all' = 'day';

    // Breakdown pop-up and its tab (0 mode · 1 line · 2 document ·
    // 3 collector)
    breakdownOpen:
        boolean = false;

    breakdownTab:
        number = 0;

    // Days opened (yyyy-MM-dd)
    openDays =
        new Set<string>();

    //===========================================================
    // Canvas
    //===========================================================

    report:
        DailyCollection | null = null;

    rows:
        DcRow[] = [];

    days:
        DcDay[] = [];

    grand:
        DcDay | null = null;

    totals:
        DcTotals | null = null;

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

    onCollectorChange
    (
        value:
            any
    ):
        void
    {
        const id =
            Number(value);

        this.collectedBy = Number.isFinite(id) ? id : -1;

        this.rebuild();
    }

    onLineChange
    (
        value:
            any
    ):
        void
    {
        this.line = (value ?? '') as '' | DcLine;

        this.rebuild();
    }

    setView
    (
        view:
            'day' | 'all'
    ):
        void
    {
        this.view = view;

        this.refreshView();
    }

    //===========================================================
    // Breakdown pop-up
    //===========================================================

    openBreakdown
    (
        tab:
            number
    ):
        void
    {
        if (!this.report)
        {
            return;
        }

        this.breakdownTab = tab;

        this.breakdownOpen = true;

        this.refreshView();
    }

    closeBreakdown():
        void
    {
        this.breakdownOpen = false;

        this.refreshView();
    }

    setBreakdownTab
    (
        tab:
            number
    ):
        void
    {
        this.breakdownTab =
            Math.max(0, Math.min(tab, this.panelBlocks.length - 1));

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

    // Bar width : % of the largest item of the block
    shareOf
    (
        items:
            DcGroup[],
        amount:
            number
    ):
        number
    {
        const max =
            Math.max(0, ...items.map(x => Math.abs(x.amount)));

        return max > 0 ? Math.round(Math.abs(amount) / max * 100) : 0;
    }

    // Share of the net collection
    sharePct
    (
        amount:
            number
    ):
        string
    {
        const net =
            this.grand?.net ?? 0;

        return Math.abs(net) < 0.005
            ? ''
            : `${this.pct(Math.round(amount / net * 1000) / 10)} of the net`;
    }

    //===========================================================
    // Rows (no statement lines)
    //===========================================================

    protected buildLines():
        FaLine[]
    {
        if (!this.report)
        {
            this.rows = [];

            this.days = [];

            this.grand = null;

            this.totals = null;

            return [];
        }

        this.rows =
            dcRowsShown(
                this.report,
                {
                    collectedBy:this.collectedBy < 0 ? null : this.collectedBy,
                    line:this.line,
                    search:this.searchText
                });

        const built =
            buildDcDays(this.rows);

        this.days = built.days;

        this.grand = built.total;

        this.totals = buildDcTotals(this.rows);

        return [];
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

    isOpen
    (
        day:
            DcDay
    ):
        boolean
    {
        return this.openDays.has(day.date);
    }

    toggleDay
    (
        day:
            DcDay
    ):
        void
    {
        if (this.openDays.has(day.date))
        {
            this.openDays.delete(day.date);
        }
        else
        {
            this.openDays.add(day.date);
        }

        this.refreshView();
    }

    openAllDays():
        void
    {
        this.days.forEach(x => this.openDays.add(x.date));

        this.refreshView();
    }

    closeAllDays():
        void
    {
        this.openDays.clear();

        this.refreshView();
    }

    dayName
    (
        iso:
            string
    ):
        string
    {
        return dayText(iso);
    }

    lineName
    (
        line:
            string
    ):
        string
    {
        return dcLineName(line);
    }

    // Totals panel blocks
    get panelBlocks():
        { title:string; items:DcGroup[] }[]
    {
        const t =
            this.totals;

        return t
            ? [
                { title:'By mode', items:t.modes },
                { title:'By business line', items:t.lines },
                { title:'By document', items:t.documents },
                { title:'By collector', items:t.collectors }
            ]
            : [];
    }

    // Mode of a receipt : the columns it has money in
    modeOf
    (
        row:
            DcRow
    ):
        string
    {
        return this.modes
            .filter(x => Math.abs(row[x.key]) >= 0.005)
            .map(x => x.label)
            .join(' + ');
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
            this.daily
                .getDailyCollection(
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
                            (result: DailyCollection) =>
                            {
                                this.report = result;

                                this.userItems =
                                [
                                    { label:'Everybody', value:-1 },
                                    ...result.Users.map(x => ({ label:x.Name, value:x.Id }))
                                ];

                                if (this.collectedBy >= 0 && !result.Users.some(x => x.Id === this.collectedBy))
                                {
                                    this.collectedBy = -1;
                                }

                                this.openDays.clear();

                                // One day : open at once
                                if (result.From === result.To)
                                {
                                    this.openDays.add(result.From);
                                }

                                this.loading = false;

                                this.rebuild();
                            },
                        error:
                            err =>
                            {
                                this.loading = false;

                                this.report = null;

                                this.loadError = faErrorText(err, 'The daily collection could not be loaded.');

                                this.refreshView();
                            }
                    }
                );
    }

    refresh():
        void
    {
        this.loadRequest?.unsubscribe();

        this.fromDate = faToday();

        this.toDate = faToday();

        this.branchId = 0;

        this.showCancelled = false;

        this.collectedBy = -1;

        this.line = '';

        this.userItems = [{ label:'Everybody', value:-1 }];

        this.view = 'day';

        this.breakdownOpen = false;

        this.breakdownTab = 0;

        this.showCodes = true;

        this.searchText = '';

        this.openDays.clear();

        this.report = null;

        this.loaded = false;

        this.loading = false;

        this.loadError = '';

        this.rows = [];

        this.days = [];

        this.grand = null;

        this.totals = null;

        this.loadBranches();

        this.refreshView();
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
                'Submit first to show the daily collection.'
            );

            return;
        }

        const token =
            saveDailyPrintRequest(
                DAILY_COLLECTION_PRINT_KEY,
                {
                    from:this.report.From,
                    to:this.report.To,
                    branchId:this.report.BranchId,
                    showCancelled:this.report.ShowCancelled,
                    search:this.searchText,
                    collectedBy:this.collectedBy < 0 ? null : this.collectedBy,
                    line:this.line,
                    withDetail:this.view === 'all' || this.openDays.size > 0
                }
            );

        this.openPrint(DAILY_COLLECTION_PRINT_KEY, token);
    }
}
