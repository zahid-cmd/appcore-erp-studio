//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    DestroyRef,
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
    ActivatedRoute,
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

//===============================================================
// Ledger Registers
//===============================================================

import
{
    LEDGER_PRINT_KEY,
    LedgerChart,
    LedgerChartLedger,
    LedgerRegisterConfig,
    LedgerStatement,
    LedgerStatementRow,
    LedgerSummary,
    LedgerSummaryRow,
    LedgerVoucher,
    LedgerVoucherLine,
    formatBalance,
    formatLedgerDate,
    formatLedgerMoney,
    ledgerRegisterConfig,
    statementRowMatches,
    summaryRowMatches,
    summaryRowShown,
    mergeVoucherRows,
    toIsoDate
}
from '../models/ledger-registers.model';

import
{
    LedgerRegistersService
}
from '../services/ledger-registers.service';

import
{
    saveLedgerPrintRequest
}
from '../print/ledger-registers.print';


//===============================================================
// Option of the dropdowns
//===============================================================

interface Option
{
    label:string;
    value:any;
}

type CanvasView =
    'none' | 'statement' | 'summary';


//===============================================================
// Ledger Statements / Cash · Bank · MFS · POS · EMI Registers
//
//   Left  : the filter (period, branch, class › group › sub
//           group › ledger, show cancelled) and Load
//   Right : empty until Load; then the ledger's statement, or
//           (no ledger chosen) a summary of the ledgers of the
//           class / group / sub group. A summary row opens its
//           statement; a voucher no opens the voucher inline.
//
// The route's data.registerType picks the page.
//===============================================================

@Component(
{
    selector:'ledger-registers',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        CommandCenterComponent,
        SearchBoxComponent,
        SearchDropdownComponent,
        DatepickerComponent,
        ToastComponent
    ],

    templateUrl:'./ledger-registers.html',

    styleUrl:'./ledger-registers.css'
})

export class LedgerRegisters
    implements OnInit
{
    private readonly service =
        inject(LedgerRegistersService);

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly destroyRef =
        inject(DestroyRef);

    readonly page:
        LedgerRegisterConfig =
        ledgerRegisterConfig(
            String(this.route.snapshot.data['registerType'] ?? 'General Ledger')
        );

    //===========================================================
    // Filter
    //===========================================================

    fromDate:
        Date =
        monthStart();

    toDate:
        Date =
        today();

    branchId:
        number = 0;

    classCode:
        string = '';

    groupCode:
        string = '';

    subGroupCode:
        string = '';

    ledgerCode:
        string = '';

    showCancelled:
        boolean = false;

    // View switches (no reload)
    showCodes:
        boolean = true;

    showNarration:
        boolean = true;

    // Summary : zero-balance ledgers / ledgers with no debit or
    // credit in the period (default OFF : hidden)
    showZeroBalance:
        boolean = false;

    showNoTransactions:
        boolean = false;

    // Statement : Detail (one row per voucher line) or Summary
    // (one row per voucher). Ledger Statements page only for now.
    statementMode:
        'detail' | 'summary' = 'detail';

    get showStatementMode():
        boolean
    {
        return !this.isRegister;
    }

    setStatementMode
    (
        mode:
            'detail' | 'summary'
    ):
        void
    {
        if (this.statementMode === mode)
        {
            return;
        }

        this.statementMode = mode;

        this.closeVoucher();

        this.applySearch();

        this.refreshView();
    }

    // Per statement row : last row of its voucher / voucher
    // has more than one row on this statement
    rowInfo:
        { last:boolean; multi:boolean }[] = [];

    chart:
        LedgerChart | null = null;

    chartLoading:
        boolean = false;

    chartError:
        string = '';

    //===========================================================
    // Canvas
    //===========================================================

    view:
        CanvasView = 'none';

    statement:
        LedgerStatement | null = null;

    summary:
        LedgerSummary | null = null;

    loading:
        boolean = false;

    loadError:
        string = '';

    // Voucher opened under a statement row (by row index)
    openRow:
        number = -1;

    voucher:
        LedgerVoucher | null = null;

    voucherLoading:
        boolean = false;

    voucherError:
        string = '';

    private chartRequest?:
        Subscription;

    private loadRequest?:
        Subscription;

    private voucherRequest?:
        Subscription;

    //===========================================================
    // View refresh after an answer : marks the page for the
    // next check and checks it now (a failure is logged, never
    // left as a stuck "Loading")
    //===========================================================

    private refreshView():
        void
    {
        this.cdr.markForCheck();

        try
        {
            this.cdr.detectChanges();
        }
        catch (error)
        {
            console.error('[Ledger Registers] view update failed', error);
        }

        // Zoneless : a result that arrives outside an event (HTTP
        // reply) is painted once more on the next turn, so the
        // view never stays on "Loading..." until the next click
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
                    console.error('[Ledger Registers] view update failed (repaint)', error);
                }
            });
        }
    }

    private repaintQueued =
        false;

    //===========================================================
    // Start
    //===========================================================

    ngOnInit():
        void
    {
        // Opened from another page (Trial Balance) :
        // ?ledger=&from=&to=&branchId=&showCancelled= loads that
        // ledger's statement once the chart is in
        const query =
            this.route.snapshot.queryParamMap;

        const ledger =
            (query.get('ledger') ?? '').trim();

        if (ledger)
        {
            this.pendingLink =
            {
                ledger,
                from:query.get('from') ?? '',
                to:query.get('to') ?? '',
                branchId:Number(query.get('branchId')) || 0,
                showCancelled:query.get('showCancelled') === '1' || query.get('showCancelled') === 'true'
            };
        }

        this.loadChart();
    }

    private pendingLink:
        {
            ledger:string;
            from:string;
            to:string;
            branchId:number;
            showCancelled:boolean;
        } | null = null;

    // Applies the link once (after the chart is loaded)
    private applyLink():
        void
    {
        const link =
            this.pendingLink;

        if (!link)
        {
            return;
        }

        this.pendingLink = null;

        const from =
            parseIsoDate(link.from);

        const to =
            parseIsoDate(link.to);

        if (from)
        {
            this.fromDate = from;
        }

        if (to)
        {
            this.toDate = to;
        }

        this.branchId =
            (this.chart?.Branches ?? []).some(x => x.Id === link.branchId)
                ? link.branchId
                : 0;

        this.showCancelled = link.showCancelled;

        if (!(this.chart?.Ledgers ?? []).some(x => x.Code === link.ledger))
        {
            this.toast.error(
                'Ledger Not Found',
                `${link.ledger} is not a ${this.page.itemWord} of this page.`
            );

            this.rebuildItems();

            return;
        }

        this.onLedgerChange(link.ledger);

        this.submit();
    }

    private loadChart():
        void
    {
        this.chartRequest?.unsubscribe();

        this.chartLoading = true;

        this.chartError = '';

        this.chartRequest =
            this.service
                .getChart(this.page.apiType)
                .pipe(timeout(REQUEST_TIMEOUT), takeUntilDestroyed(this.destroyRef))
                .subscribe
                (
                    {
                        next:
                            chart =>
                            {
                                this.chart = chart;

                                this.rebuildItems();

                                this.chartLoading = false;

                                this.applyLink();

                                this.refreshView();
                            },

                        error:
                            err =>
                            {
                                this.chartLoading = false;

                                this.chartError = errorText(err, `The ${this.page.itemWord}s could not be loaded.`);

                                this.refreshView();
                            }
                    }
                );
    }

    //===========================================================
    // Dropdown items (each filtered by the ones above it)
    //===========================================================

    // Items are built once per change (not getters) : a new
    // array on every check made the dropdowns lose the first
    // click
    branchItems:
        Option[] = [];

    classItems:
        Option[] = [];

    groupItems:
        Option[] = [];

    subGroupItems:
        Option[] = [];

    ledgerItems:
        Option[] = [];

    ledgerCount:
        number = 0;

    // Registers : the class / group are not asked; the sub
    // group(s) of the type show read-only
    get isRegister():
        boolean
    {
        return this.page.type !== 'General Ledger';
    }

    // Sub groups holding accounts of this register
    get subGroupCount():
        number
    {
        return this.chart?.SubGroups.length ?? 0;
    }

    get subGroupText():
        string
    {
        const names =
            (this.chart?.SubGroups ?? []).map(x => x.Name).filter(x => !!x);

        return names.length ? names.join(', ') : '—';
    }

    private rebuildItems():
        void
    {
        const chart =
            this.chart;

        this.branchItems =
        [
            { label:'All Branches', value:0 },
            ...(chart?.Branches ?? []).map(x => ({ label:x.Name, value:x.Id }))
        ];

        this.classItems =
        [
            { label:'All Classes', value:'' },
            ...(chart?.Classes ?? []).map(x => ({ label:x.Name, value:x.Code }))
        ];

        this.groupItems =
        [
            { label:'All Groups', value:'' },
            ...(chart?.Groups ?? [])
                .filter(x => !this.classCode || x.ClassCode === this.classCode)
                .map(x => ({ label:x.Name, value:x.Code }))
        ];

        this.subGroupItems =
        [
            { label:'All Sub Groups', value:'' },
            ...(chart?.SubGroups ?? [])
                .filter
                (
                    x =>
                        (!this.classCode || x.ClassCode === this.classCode)
                        &&
                        (!this.groupCode || x.ParentCode === this.groupCode)
                )
                .map(x => ({ label:x.Name, value:x.Code }))
        ];

        const ledgers =
            this.scopedLedgers;

        this.ledgerCount = ledgers.length;

        this.ledgerItems =
        [
            { label:`Summary Of The ${this.page.itemWord === 'account' ? 'Accounts' : 'Ledgers'}`, value:'' },
            ...ledgers.map
            (
                x =>
                ({
                    label:`${x.Name} · ${x.Code}${x.IsActive ? '' : ' (inactive)'}`,
                    value:x.Code
                })
            )
        ];
    }

    private get scopedLedgers():
        LedgerChartLedger[]
    {
        return (this.chart?.Ledgers ?? [])
            .filter
            (
                x =>
                    (!this.classCode || x.ClassCode === this.classCode)
                    &&
                    (!this.groupCode || x.GroupCode === this.groupCode)
                    &&
                    (!this.subGroupCode || x.SubGroupCode === this.subGroupCode)
            );
    }


    //===========================================================
    // Filter changes (a parent clears children that no longer
    // fit; a child fills its parents)
    //===========================================================

    onFromChange
    (
        date:
            Date
    ):
        void
    {
        this.fromDate = date;

        if
        (
            this.fromDate > this.toDate
        )
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

        if
        (
            this.toDate < this.fromDate
        )
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

    onClassChange
    (
        value:
            any
    ):
        void
    {
        this.classCode = String(value ?? '');

        const group =
            this.chart?.Groups.find(x => x.Code === this.groupCode);

        if
        (
            group && this.classCode && group.ClassCode !== this.classCode
        )
        {
            this.groupCode = '';
        }

        this.fitChildren();

        this.rebuildItems();
    }

    onGroupChange
    (
        value:
            any
    ):
        void
    {
        this.groupCode = String(value ?? '');

        const group =
            this.chart?.Groups.find(x => x.Code === this.groupCode);

        if
        (
            group
        )
        {
            this.classCode = group.ClassCode;
        }

        this.fitChildren();

        this.rebuildItems();
    }

    onSubGroupChange
    (
        value:
            any
    ):
        void
    {
        this.subGroupCode = String(value ?? '');

        const sub =
            this.chart?.SubGroups.find(x => x.Code === this.subGroupCode);

        if
        (
            sub
        )
        {
            this.groupCode = sub.ParentCode;

            this.classCode = sub.ClassCode;
        }
        else if
        (
            this.isRegister
        )
        {
            // Registers ask no class / group : "All Sub Groups"
            // means every account of the register
            this.groupCode = '';

            this.classCode = '';
        }

        this.fitChildren();

        this.rebuildItems();
    }

    onLedgerChange
    (
        value:
            any
    ):
        void
    {
        this.ledgerCode = String(value ?? '');

        const ledger =
            this.chart?.Ledgers.find(x => x.Code === this.ledgerCode);

        if
        (
            ledger
        )
        {
            this.classCode = ledger.ClassCode;

            this.groupCode = ledger.GroupCode;

            this.subGroupCode = ledger.SubGroupCode;

            this.rebuildItems();
        }
    }

    // Clears the sub group / ledger that left the scope
    private fitChildren():
        void
    {
        const sub =
            this.chart?.SubGroups.find(x => x.Code === this.subGroupCode);

        if
        (
            sub
            &&
            (
                (this.groupCode && sub.ParentCode !== this.groupCode)
                ||
                (this.classCode && sub.ClassCode !== this.classCode)
            )
        )
        {
            this.subGroupCode = '';
        }

        if
        (
            this.ledgerCode
            &&
            !this.scopedLedgers.some(x => x.Code === this.ledgerCode)
        )
        {
            this.ledgerCode = '';
        }
    }

    onCodesChange
    (
        event:
            Event
    ):
        void
    {
        this.showCodes = !!(event.target as HTMLInputElement | null)?.checked;
    }

    onNarrationChange
    (
        event:
            Event
    ):
        void
    {
        this.showNarration = !!(event.target as HTMLInputElement | null)?.checked;
    }

    onZeroBalanceChange
    (
        event:
            Event
    ):
        void
    {
        this.showZeroBalance = !!(event.target as HTMLInputElement | null)?.checked;

        this.applySearch();

        this.refreshView();
    }

    onNoTransactionsChange
    (
        event:
            Event
    ):
        void
    {
        this.showNoTransactions = !!(event.target as HTMLInputElement | null)?.checked;

        this.applySearch();

        this.refreshView();
    }

    // Groups the statement rows by voucher (consecutive rows of
    // the same voucher and side)
    //===========================================================
    // Search (page header) : filters the loaded rows
    //===========================================================

    searchText:
        string = '';

    // Statement / summary rows on the canvas (after search)
    rows:
        LedgerStatementRow[] = [];

    summaryRows:
        LedgerSummaryRow[] = [];

    // Totals of the summary rows shown (all rows when no search)
    sumTotals:
        { Opening:number; Debit:number; Credit:number; Closing:number } =
        { Opening:0, Debit:0, Credit:0, Closing:0 };

    onSearch
    (
        value:
            string
    ):
        void
    {
        this.searchText = value ?? '';

        this.closeVoucher();

        this.applySearch();

        this.refreshView();
    }

    private applySearch():
        void
    {
        this.rows =
            (this.statement?.Rows ?? []).filter(x => statementRowMatches(x, this.searchText));

        if (this.showStatementMode && this.statementMode === 'summary')
        {
            this.rows = mergeVoucherRows(this.rows);
        }

        this.summaryRows =
            (this.summary?.Rows ?? []).filter(x =>
                summaryRowShown(x, this.showZeroBalance, this.showNoTransactions)
                && summaryRowMatches(x, this.searchText));

        // Totals of the rows shown when some are hidden
        this.sumTotals =
            this.searchText.trim() || this.summaryRows.length !== (this.summary?.Rows ?? []).length
                ? {
                    Opening:this.summaryRows.reduce((t, x) => t + x.Opening, 0),
                    Debit:this.summaryRows.reduce((t, x) => t + x.Debit, 0),
                    Credit:this.summaryRows.reduce((t, x) => t + x.Credit, 0),
                    Closing:this.summaryRows.reduce((t, x) => t + x.Closing, 0)
                }
                : {
                    Opening:this.summary?.Opening ?? 0,
                    Debit:this.summary?.TotalDebit ?? 0,
                    Credit:this.summary?.TotalCredit ?? 0,
                    Closing:this.summary?.Closing ?? 0
                };

        this.indexRows();
    }

    private indexRows():
        void
    {
        const rows =
            this.rows;

        const key =
            (x: LedgerStatementRow) =>
                `${x.VoucherType}|${x.VoucherNo}|${x.IsReversal}`;

        this.rowInfo = rows.map(() => ({ last:true, multi:false }));

        let start = 0;

        for (let i = 1; i <= rows.length; i++)
        {
            if
            (
                i === rows.length
                ||
                key(rows[i]) !== key(rows[start])
            )
            {
                for (let j = start; j < i; j++)
                {
                    this.rowInfo[j] =
                    {
                        last:j === i - 1,
                        multi:i - start > 1
                    };
                }

                start = i;
            }
        }
    }

    // Narration on its own row, once per voucher, under the
    // voucher's last row
    showNarrationRow
    (
        index:
            number,
        row:
            LedgerStatementRow
    ):
        boolean
    {
        const info =
            this.rowInfo[index];

        return this.showNarration && !!row.Narration && !!info && info.last;
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
    // Load
    //===========================================================

    load():
        void
    {
        this.loadRequest?.unsubscribe();

        this.closeVoucher();

        this.loading = true;

        this.loadError = '';

        this.view = this.ledgerCode ? 'statement' : 'summary';

        this.refreshView();

        const done =
            () =>
            {
                this.loading = false;

                this.refreshView();
            };

        const failed =
            (err: any) =>
            {
                this.loading = false;

                this.loadError = errorText(err, 'The statement could not be loaded.');

                this.refreshView();
            };

        if
        (
            this.ledgerCode
        )
        {
            this.loadRequest =
                this.service
                    .getStatement(
                        {
                            apiType:this.page.apiType,
                            ledgerCode:this.ledgerCode,
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
                                    this.statement = result;

                                    this.applySearch();

                                    this.summary = null;

                                    done();
                                },

                            error:failed
                        }
                    );

            return;
        }

        this.loadRequest =
            this.service
                .getSummary(
                    {
                        apiType:this.page.apiType,
                        classCode:this.classCode,
                        groupCode:this.groupCode,
                        subGroupCode:this.subGroupCode,
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
                                this.summary = result;

                                this.statement = null;

                                this.applySearch();

                                done();
                            },

                        error:failed
                    }
                );
    }

    //===========================================================
    // Navigation history
    // Submit starts a new history (the primary view). Opening a
    // ledger from a summary, or the summary from a statement,
    // remembers the view left; Back returns to it exactly as it
    // was (filters and loaded rows, no reload).
    //===========================================================

    private history:
        Array<
        {
            view:'none' | 'statement' | 'summary';
            summary:LedgerSummary | null;
            statement:any;
            classCode:string;
            groupCode:string;
            subGroupCode:string;
            ledgerCode:string;
            fromDate:Date;
            toDate:Date;
            branchId:number;
            showCancelled:boolean;
        }> = [];

    get canGoBack():
        boolean
    {
        return this.history.length > 0;
    }

    // What Back returns to (button label)
    get backLabel():
        string
    {
        const last =
            this.history[this.history.length - 1];

        if (!last)
        {
            return '';
        }

        return last.view === 'statement'
            ? (last.statement?.LedgerName ?? 'Statement')
            : (last.summary?.ScopePath ?? 'Summary');
    }

    private pushHistory():
        void
    {
        if
        (
            this.view === 'none'
            ||
            (!this.summary && !this.statement)
        )
        {
            return;
        }

        this.history.push(
            {
                view:this.view,
                summary:this.summary,
                statement:this.statement,
                classCode:this.classCode,
                groupCode:this.groupCode,
                subGroupCode:this.subGroupCode,
                ledgerCode:this.ledgerCode,
                fromDate:this.fromDate,
                toDate:this.toDate,
                branchId:this.branchId,
                showCancelled:this.showCancelled
            });

        // Keep the trail short
        if (this.history.length > 20)
        {
            this.history.shift();
        }
    }

    // Submit : a new primary view
    submit():
        void
    {
        this.history = [];

        this.load();
    }

    // Back : the view left last, as it was
    goBack():
        void
    {
        const last =
            this.history.pop();

        if (!last)
        {
            return;
        }

        this.loadRequest?.unsubscribe();

        this.closeVoucher();

        this.loading = false;

        this.loadError = '';

        this.classCode = last.classCode;
        this.groupCode = last.groupCode;
        this.subGroupCode = last.subGroupCode;
        this.ledgerCode = last.ledgerCode;
        this.fromDate = last.fromDate;
        this.toDate = last.toDate;
        this.branchId = last.branchId;
        this.showCancelled = last.showCancelled;

        this.rebuildItems();

        this.view = last.view;
        this.summary = last.summary;
        this.statement = last.statement;

        this.applySearch();

        this.refreshView();
    }

    // Summary row → that ledger's statement
    openLedger
    (
        code:
            string
    ):
        void
    {
        this.pushHistory();

        this.onLedgerChange(code);

        this.load();
    }

    // Statement → the summary of its sub group (Back returns to
    // the view this statement came from, when there is one)
    backToSummary():
        void
    {
        if
        (
            this.history.length > 0
            &&
            this.history[this.history.length - 1].view === 'summary'
        )
        {
            this.goBack();

            return;
        }

        this.pushHistory();

        this.ledgerCode = '';

        this.load();
    }

    //===========================================================
    // Refresh : default filter, empty canvas
    //===========================================================

    refresh():
        void
    {
        this.history = [];

        this.loadRequest?.unsubscribe();

        this.closeVoucher();

        this.fromDate = monthStart();

        this.toDate = today();

        this.branchId = 0;

        this.classCode = '';

        this.groupCode = '';

        this.subGroupCode = '';

        this.ledgerCode = '';

        this.showCancelled = false;

        this.showCodes = true;

        this.showNarration = true;

        this.showZeroBalance = false;

        this.showNoTransactions = false;

        this.searchText = '';

        this.rows = [];

        this.summaryRows = [];

        this.rowInfo = [];

        this.view = 'none';

        this.statement = null;

        this.summary = null;

        this.loading = false;

        this.loadError = '';

        this.rebuildItems();

        this.loadChart();
    }

    //===========================================================
    // Voucher opened inline under its row
    //===========================================================

    toggleVoucher
    (
        index:
            number,
        row:
            LedgerStatementRow,
        event:
            Event
    ):
        void
    {
        event.stopPropagation();

        if
        (
            this.openRow === index
        )
        {
            this.closeVoucher();

            return;
        }

        this.voucherRequest?.unsubscribe();

        this.openRow = index;

        this.voucher = null;

        this.voucherError = '';

        this.voucherLoading = true;

        this.voucherRequest =
            this.service
                .getVoucher(row.VoucherType, row.VoucherNo)
                .pipe(timeout(REQUEST_TIMEOUT), takeUntilDestroyed(this.destroyRef))
                .subscribe
                (
                    {
                        next:
                            voucher =>
                            {
                                this.voucher = voucher;

                                this.voucherLoading = false;

                                this.refreshView();
                            },

                        error:
                            err =>
                            {
                                this.voucherLoading = false;

                                this.voucherError = errorText(err, 'The voucher could not be loaded.');

                                this.refreshView();
                            }
                    }
                );
    }

    closeVoucher():
        void
    {
        this.voucherRequest?.unsubscribe();

        this.openRow = -1;

        this.voucher = null;

        this.voucherLoading = false;

        this.voucherError = '';
    }

    //===========================================================
    // Statement layout
    //===========================================================

    get showRef():
        boolean
    {
        return !!this.page.refLabel;
    }

    // Columns before Debit : SL, Date, Voucher, Particulars
    // (party · narration under it), [Ref], [Status]
    get leadCols():
        number
    {
        return 4 + (this.showRef ? 1 : 0) + (this.page.showStatus ? 1 : 0);
    }

    // Lead + Debit, Credit, Balance + Short Notes
    get colCount():
        number
    {
        return this.leadCols + 4;
    }

    get statementPath():
        string
    {
        const s =
            this.statement;

        return s
            ? [s.ClassName, s.GroupName, s.SubGroupName].filter(x => !!x).join(' › ')
            : '';
    }

    // Classic ledger : debit side "To …", credit side "By …"
    side
    (
        row:
            LedgerStatementRow
    ):
        string
    {
        return row.Debit > 0 ? 'To' : 'By';
    }

    // Balance colour by the ledger's normal side : on its
    // normal side green (assets / expenses Dr, liabilities /
    // income Cr), on the other side red
    balanceClass
    (
        value:
            number,
        mode:
            string
    ):
        string
    {
        const amount =
            Math.round((Number(value) || 0) * 100) / 100;

        if
        (
            amount === 0
        )
        {
            return 'lr-zero';
        }

        const side =
            amount > 0 ? 'Dr' : 'Cr';

        return side === (mode === 'Cr' ? 'Cr' : 'Dr')
            ? 'lr-good'
            : 'lr-bad';
    }

    statusClass
    (
        status:
            string
    ):
        string
    {
        return 'lr-st-' + (status || '').toLowerCase().replace(/[^a-z]+/g, '-');
    }

    voucherSum
    (
        lines:
            LedgerVoucherLine[],
        side:
            'Debit' | 'Credit'
    ):
        number
    {
        return lines.reduce((t, x) => t + x[side], 0);
    }

    //===========================================================
    // Formatting
    //===========================================================

    date
    (
        iso:
            string
    ):
        string
    {
        return formatLedgerDate(iso);
    }

    money
    (
        value:
            number
    ):
        string
    {
        return value ? formatLedgerMoney(value) : '';
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

    balance
    (
        value:
            number
    ):
        string
    {
        return formatBalance(value);
    }

    //===========================================================
    // Print : what is on the canvas (Print Viewer, new tab)
    //===========================================================

    get canPrint():
        boolean
    {
        return this.view === 'statement'
            ? !!this.statement
            : this.view === 'summary'
                ? !!this.summary
                : false;
    }

    print():
        void
    {
        if
        (
            !this.canPrint
        )
        {
            this.toast.error(
                'Nothing to Print',
                'Submit first to show a statement or a summary.'
            );

            return;
        }

        const token =
            saveLedgerPrintRequest(
                {
                    registerType:this.page.type,
                    view:this.view,
                    ledgerCode:this.view === 'statement' ? (this.statement?.LedgerCode ?? '') : '',
                    classCode:this.summary?.ClassCode ?? this.classCode,
                    groupCode:this.summary?.GroupCode ?? this.groupCode,
                    subGroupCode:this.summary?.SubGroupCode ?? this.subGroupCode,
                    from:(this.statement ?? this.summary)?.From ?? toIsoDate(this.fromDate),
                    to:(this.statement ?? this.summary)?.To ?? toIsoDate(this.toDate),
                    branchId:(this.statement ?? this.summary)?.BranchId ?? this.branchId,
                    showCancelled:(this.statement ?? this.summary)?.ShowCancelled ?? this.showCancelled,
                    showCodes:this.showCodes,
                    showNarration:this.showNarration,
                    showZeroBalance:this.showZeroBalance,
                    showNoTransactions:this.showNoTransactions,
                    statementMode:this.showStatementMode ? this.statementMode : 'detail',
                    search:this.searchText
                }
            );

        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(
                    ['/print-viewer', LEDGER_PRINT_KEY, token],
                    {
                        queryParams:{ doc:this.view === 'statement' ? 'ledger-statement' : 'ledger-summary' }
                    }
                )
            );

        // Not "noopener" : the new tab keeps this session's login
        const tab =
            window.open(
                url,
                '_blank'
            );

        if
        (
            !tab
        )
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

// An answer slower than this ends the wait with a message
const REQUEST_TIMEOUT =
    90000;

// yyyy-MM-dd → Date (local); anything else → null
function parseIsoDate
(
    text:
        string
):
    Date | null
{
    const match =
        /^(\d{4})-(\d{2})-(\d{2})$/.exec((text ?? '').trim());

    if (!match)
    {
        return null;
    }

    const date =
        new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

    return isNaN(date.getTime()) ? null : date;
}

function monthStart():
    Date
{
    const today =
        new Date();

    return new Date(today.getFullYear(), today.getMonth(), 1);
}

// Default To : today (the statement up to now)
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
    if
    (
        err?.name === 'TimeoutError'
    )
    {
        return 'The server took too long to answer. Narrow the period or the selection and submit again.';
    }

    const body =
        err?.error;

    return typeof body === 'string' && body.trim()
        ? body.trim()
        : fallback;
}
