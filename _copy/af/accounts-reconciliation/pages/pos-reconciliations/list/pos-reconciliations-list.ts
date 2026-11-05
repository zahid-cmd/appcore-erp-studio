//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    inject,
    ChangeDetectorRef,
    DestroyRef
}
from '@angular/core';

import
{
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import
{
    HttpErrorResponse
}
from '@angular/common/http';

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
    Observable,
    catchError,
    defer,
    delayWhen,
    switchMap,
    throwError,
    timer
}
from 'rxjs';

//===============================================================
// Models
//===============================================================

import
{
    PosActionResult,
    PosAutoSettlementRun,
    PosReconciliationHistory,
    PosReconciliations,
    PosStatus
}
from '../../../models/pos-reconciliations.model';

import
{
    formatMoney,
    fromIsoDate,
    roundMoney,
    toIsoDate
}
from '../../../../../../shared/components/accounting/accounting.models';

//===============================================================
// Shared Components
//===============================================================

import
{
    PageHeaderComponent
}
from '../../../../../../shared/components/layout/page-header/page-header';

import
{
    PageToolbarComponent
}
from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';

import
{
    ControlTabsComponent,
    ControlTab
}
from '../../../../../../shared/components/controls/control-tabs/control-tabs';

import
{
    SearchBoxComponent
}
from '../../../../../../shared/components/utilities/search-box/search-box';

import
{
    CommandCenterComponent
}
from '../../../../../../shared/components/utilities/command-center/command-center';

import
{
    PageCanvasComponent,
    PageCanvasConfig
}
from '../../../../../../shared/components/layout/page-canvas/page-canvas';

import
{
    PaginationComponent
}
from '../../../../../../shared/components/controls/pagination/pagination';

import
{
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

import
{
    DatepickerComponent
}
from '../../../../../../shared/components/controls/datepicker/datepicker';

import
{
    TextareaComponent
}
from '../../../../../../shared/components/controls/textarea/textarea';

import
{
    ListTableActions,
    ListTableColumn,
    ListTableComponent,
    ListTableRowAction,
    ListTableRowActionEvent
}
from '../../../../../../shared/components/layout/list-table/list-table';

import
{
    HistoryDrawerComponent
}
from '../../../../../../shared/components/utilities/history-drawer/history-drawer';

import
{
    ConfirmDialogComponent
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';

import
{
    ProgressDialogComponent
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';

import
{
    ProgressDialogService
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';

import
{
    ToastService
}
from '../../../../../../shared/components/utilities/toast/toast.service';

import
{
    ToastComponent
}
from '../../../../../../shared/components/utilities/toast/toast';

//===============================================================
// Service
//===============================================================

import
{
    PosReconciliationsService
}
from '../../../services/pos-reconciliations.service';


//===============================================================
// Types
//===============================================================

// List row with display values
type PosRow =
    PosReconciliations
    &
    {
        ReceiptDateText:
            string;

        AmountText:
            string;

        FeeText:
            string;

        // Charge audit tooltip (edited charges only)
        FeeEditedText:
            string;

        // Status column : "Settled · Auto"
        StatusText:
            string;

        TxnText:
            string;
    };

interface StatusChip
{
    id:
        string;

    label:
        string;

    count:
        number;
}


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'posReconciliations-list',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        ControlTabsComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        PageCanvasComponent,
        PaginationComponent,
        SearchDropdownComponent,
        DatepickerComponent,
        TextareaComponent,
        ListTableComponent,
        HistoryDrawerComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent,
        ToastComponent
    ],
    templateUrl:'./pos-reconciliations-list.html',
    styleUrl:'./pos-reconciliations-list.css'
})

//===============================================================
// POS Reconciliation
//
// Card (POS) receipts of posted Receipt Vouchers.
//   Pending → Settle | Reject (POS Settlement Center, by linked
//             bank account, or the nightly Auto Settlement)
//   Undo    : Settlement (the whole RRV) / Reject
//
// Rows : Print Preview, Undo, History.
//===============================================================

export class PosReconciliationsList
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly service =
        inject(PosReconciliationsService);

    private readonly progressDialog =
        inject(ProgressDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly router =
        inject(Router);

    private readonly route =
        inject(ActivatedRoute);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly destroyRef =
        inject(DestroyRef);


    //===========================================================
    // Tab (one : the page toolbar keeps the same look as the
    // other list pages)
    //===========================================================

    readonly tabs:
        ControlTab[] =
    [
        {
            id:'pos',
            label:'POS Receipts'
        }
    ];

    readonly selectedTab:
        string =
        'pos';


    //===========================================================
    // Data
    //===========================================================

    rows:
        PosRow[] =
    [];

    filteredRows:
        PosRow[] =
    [];

    // Rows of the current page
    pagedRows:
        PosRow[] =
    [];

    currentPage:
        number =
        1;

    pageSize:
        number =
        15;

    loading:
        boolean =
        false;

    loadFailed:
        boolean =
        false;

    busy:
        boolean =
        false;

    searchText:
        string =
        '';

    statusFilter:
        string =
        'open';

    statusChips:
        StatusChip[] =
    [];

    // Bank account filter (the POS accounts' linked bank)
    bankItems:
        { label:string; value:string | null }[] =
    [];

    bankFilter:
        string | null =
        null;

    // Branch filter (starts at All; linked to the bank account)
    branchItems:
        { label:string; value:number | null }[] =
    [];

    branchFilter:
        number | null =
        null;


    //===========================================================
    // Undo dialog (one transaction)
    //===========================================================

    dialogRow:
        PosRow | null =
        null;

    dialogDate:
        Date | null =
        new Date();

    dialogReason:
        string =
        '';

    readonly maxDate:
        Date =
        new Date();


    //===========================================================
    // History drawer
    //===========================================================

    historyOpened:
        boolean =
        false;

    historyTitle:
        string =
        'POS Reconciliation History';

    historyItems:
        any[] =
    [];


    //===========================================================
    // List table : columns, row actions
    //===========================================================

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Card Number', field:'TxnText', width:'120px', align:'left' },
        { header:'Receipt Date', field:'ReceiptDateText', width:'110px', align:'center' },
        { header:'Received From', field:'PartyName', width:'180px', align:'left' },
        { header:'Voucher No', field:'SourceVoucherNo', width:'190px', align:'center' },
        { header:'POS Account', field:'AccountName', width:'210px', align:'left' },
        { header:'Card', field:'CardName', width:'110px', align:'left' },
        { header:'Amount', field:'AmountText', width:'110px', align:'right' },
        // Charge audit : 'Edited' pill when the user changed the
        // system charge; tooltip = standard, reason
        { header:'Charges', field:'FeeText', width:'140px', align:'right', flagField:'FeeEdited', flagText:'Edited', flagTitleField:'FeeEditedText' },
        { header:'Status', field:'StatusText', type:'status', width:'130px', align:'center' },
        { header:'Actions', field:'actions', type:'actions', width:'120px', align:'center', cellAlign:'center' }
    ];

    // Only the page's own actions (no View / Edit / Delete)
    readonly tableActions:
        ListTableActions =
        {
            view:false,
            edit:false,
            delete:false
        };

    // Print first, Undo when settled / rejected, then History
    readonly rowActions:
        ListTableRowAction[] =
    [
        {
            key:'print',
            icon:'fas fa-print',
            title:'Print Preview : all documents of this transaction',
            tone:'primary'
        },
        {
            key:'undo',
            icon:'fas fa-rotate-left',
            title:'Undo (reverses the voucher)',
            visible:(row: PosRow) => row.Status === 'Settled' || row.Status === 'Rejected'
        },
        {
            key:'history',
            icon:'fas fa-clock-rotate-left',
            title:'Transaction history'
        }
    ];

    onRowAction
    (
        event:
            ListTableRowActionEvent
    ):
        void
    {
        const row =
            event.row as PosRow;

        switch
        (
            event.key
        )
        {
            case 'print':
                this.printPreview(row);
                break;

            case 'history':
                this.openLineHistory(row);
                break;

            case 'undo':
                if
                (
                    !this.busy
                )
                {
                    this.openDialog(row);
                }
                break;
        }
    }

    // Header click : sort the filtered rows (display columns sort
    // on their raw values)
    onSort
    (
        event:
        {
            field:
                string;

            direction:
                'asc' | 'desc';
        }
    ):
        void
    {
        const direction =
            event.direction === 'asc'
                ? 1
                : -1;

        const raw:
            Record<string, string> =
        {
            ReceiptDateText:'ReceiptDate',
            AmountText:'GrossAmount',
            FeeText:'Fee',
            StatusText:'Status',
            TxnText:'TransactionRef'
        };

        const field =
            raw[event.field] ?? event.field;

        this.filteredRows =
        [
            ...this.filteredRows
        ]
        .sort
        (
            (a: any, b: any): number =>
            {
                const valueA =
                    a[field];

                const valueB =
                    b[field];

                if
                (
                    valueA == null
                    ||
                    valueB == null
                )
                {
                    return (valueA == null ? (valueB == null ? 0 : -1) : 1) * direction;
                }

                if
                (
                    typeof valueA === 'string'
                    &&
                    typeof valueB === 'string'
                )
                {
                    return valueA.localeCompare(valueB) * direction;
                }

                return (valueA < valueB ? -1 : valueA > valueB ? 1 : 0) * direction;
            }
        );

        this.currentPage =
            1;

        this.updatePagination();
    }


    //===========================================================
    // Page Canvas (standard frame; stretched to the full height
    // by this page's CSS)
    //===========================================================

    readonly canvasConfig:
        PageCanvasConfig =
    {
        mode:'list',
        showHeader:false,
        showFooter:true,
        reserveFooterSpace:true,
        bodyScrollable:false,
        fixedHeight:true,
        visibleRows:15,
        rowHeight:44,
        headerHeight:36,
        footerHeight:56
    };


    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        // Leaving the page stops the progress timers
        this.destroyRef.onDestroy(
            () =>
                this.clearProgressTimers());

        this.loadItems();
    }


    //===========================================================
    // Load
    //===========================================================

    loadItems():
        void
    {
        this.loading =
            true;

        this.loadFailed =
            false;

        this.service
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    response:
                        PosReconciliations[]
                ):
                    void =>
                {
                    this.rows =
                        (response ?? []).map(item => this.toRow(item));

                    this.buildFilterItems();

                    // Keep the page after an action
                    this.applyFilters(false);

                    this.loading =
                        false;

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error('Load POS Reconciliations Error:', error);

                    this.rows =
                        [];

                    this.filteredRows =
                        [];

                    this.pagedRows =
                        [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.toast.error(
                        'Load Failed',
                        'Unable to load the card receipts.'
                    );

                    this.cdr.detectChanges();
                }
            });
    }

    private toRow
    (
        item:
            PosReconciliations
    ):
        PosRow
    {
        return {
            ...item,
            ReceiptDateText:this.displayDate(item.ReceiptDate),
            AmountText:formatMoney(item.GrossAmount),
            FeeText:
                item.Status === 'Settled' || item.Status === 'Pending'
                    ? formatMoney(item.Fee)
                    : '—',
            FeeEdited:item.Status === 'Settled' && !!item.FeeEdited,
            FeeEditedText:
                item.Status === 'Settled' && item.FeeEdited
                    ? `Charges changed from ${formatMoney(item.StandardFee)} to ${formatMoney(item.Fee)} · Reason: ${item.FeeReason}`
                    : '',
            StatusText:
                item.Status === 'Settled' && item.IsAuto
                    ? 'Settled · Auto'
                    : item.Status,
            TxnText:item.TransactionRef || '—'
        };
    }

    // Branch and Bank Account are linked both ways : both start at
    // All; a branch offers only the bank accounts its card receipts
    // settle into, a bank account only the branches it has
    // receipts in
    private buildFilterItems():
        void
    {
        // A choice that no longer has receipts (after a reload)
        if
        (
            this.branchFilter !== null
            &&
            !this.rows.some(row => row.BranchId === this.branchFilter)
        )
        {
            this.branchFilter =
                null;
        }

        if
        (
            this.bankFilter
            &&
            !this.rows.some(row => row.BankLedgerCode === this.bankFilter)
        )
        {
            this.bankFilter =
                null;
        }

        const branches =
            new Map<number, string>();

        const banks =
            new Map<string, string>();

        for
        (
            const row of this.rows
        )
        {
            if
            (
                !this.bankFilter
                ||
                row.BankLedgerCode === this.bankFilter
            )
            {
                branches.set(row.BranchId, row.BranchName);
            }

            if
            (
                this.branchFilter === null
                ||
                row.BranchId === this.branchFilter
            )
            {
                if
                (
                    row.BankLedgerCode
                )
                {
                    banks.set(row.BankLedgerCode, row.BankLedgerName || row.BankLedgerCode);
                }
            }
        }

        this.branchItems =
        [
            {
                label:'All Branches',
                value:null
            },
            ...[...branches.entries()]
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map(([value, label]) => ({ label, value }))
        ];

        this.bankItems =
        [
            {
                label:'All Bank Accounts',
                value:null
            },
            ...[...banks.entries()]
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map(([value, label]) => ({ label, value }))
        ];
    }


    //===========================================================
    // Filters
    //===========================================================

    applyFilters
    (
        resetPage:
            boolean =
            true
    ):
        void
    {
        const keyword =
            this.searchText.trim().toLowerCase();

        const scoped =
            this.rows.filter(
                row =>
                    (this.branchFilter === null || row.BranchId === this.branchFilter)
                    &&
                    (!this.bankFilter || row.BankLedgerCode === this.bankFilter)
            );

        this.statusChips =
            this.buildChips(scoped);

        this.filteredRows =
            scoped.filter
            (
                row =>
                {
                    const statusMatch =
                        this.statusFilter === 'all'
                        ||
                        (
                            this.statusFilter === 'open'
                                ? row.Status === 'Pending'
                                : row.Status === this.statusFilter
                        );

                    if
                    (
                        !statusMatch
                    )
                    {
                        return false;
                    }

                    if
                    (
                        !keyword
                    )
                    {
                        return true;
                    }

                    return [
                        row.TransactionRef,
                        row.ReceiptDateText,
                        row.PartyName,
                        row.SourceVoucherNo,
                        row.BankLedgerName,
                        row.AccountName,
                        row.CardName,
                        row.AmountText,
                        row.SettlementVoucherNo,
                        row.RejectVoucherNo,
                        row.StatusText,
                        row.BranchName
                    ]
                    .join(' ')
                    .toLowerCase()
                    .includes(keyword);
                }
            );

        if
        (
            resetPage
        )
        {
            this.currentPage =
                1;
        }

        this.updatePagination();
    }

    //===========================================================
    // Pagination
    //===========================================================

    updatePagination():
        void
    {
        const pages =
            Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));

        // A reload may leave fewer pages
        if
        (
            this.currentPage > pages
        )
        {
            this.currentPage =
                pages;
        }

        const start =
            (this.currentPage - 1) * this.pageSize;

        this.pagedRows =
            this.filteredRows.slice(start, start + this.pageSize);
    }

    onPageChange
    (
        page:
            number
    ):
        void
    {
        this.currentPage =
            page;

        this.updatePagination();
    }

    onPageSizeChange
    (
        size:
            number
    ):
        void
    {
        this.pageSize =
            size;

        this.currentPage =
            1;

        this.updatePagination();
    }

    // Open = Pending card receipts
    private buildChips
    (
        rows:
            PosRow[]
    ):
        StatusChip[]
    {
        const count =
            (status: PosStatus): number =>
                rows.filter(row => row.Status === status).length;

        const chips:
            StatusChip[] =
        [
            { id:'open', label:'Open', count:count('Pending') },
            { id:'Pending', label:'Pending', count:count('Pending') },
            { id:'Settled', label:'Settled', count:count('Settled') },
            { id:'Rejected', label:'Rejected', count:count('Rejected') }
        ];

        chips.push({ id:'all', label:'All', count:rows.length });

        return chips;
    }

    get filteredTotalText():
        string
    {
        return formatMoney(
            roundMoney(this.filteredRows.reduce((sum, row) => sum + (Number(row.GrossAmount) || 0), 0)));
    }

    onStatusFilter
    (
        id:
            string
    ):
        void
    {
        this.statusFilter =
            id;

        this.applyFilters();
    }

    onSearch
    (
        value:
            string
    ):
        void
    {
        this.searchText =
            value ?? '';

        this.applyFilters();
    }

    onBranchFilter
    (
        value:
            number | null
    ):
        void
    {
        this.branchFilter =
            value === null || value === undefined
                ? null
                : Number(value);

        // The bank list follows the branch
        this.buildFilterItems();

        this.applyFilters();
    }

    onBankFilter
    (
        value:
            string | null
    ):
        void
    {
        this.bankFilter =
            value || null;

        // The branch list follows the bank account
        this.buildFilterItems();

        this.applyFilters();
    }

    refresh():
        void
    {
        this.loadItems();
    }


    //===========================================================
    // POS Settlement Center
    //===========================================================

    openCenter():
        void
    {
        void this.router.navigate(
            ['center'],
            {
                relativeTo:this.route.parent,
                queryParams:this.bankFilter
                    ? { bank:this.bankFilter }
                    : {}
            });
    }


    //===========================================================
    // Undo (one transaction; reverses its whole voucher)
    //===========================================================

    openDialog
    (
        row:
            PosRow
    ):
        void
    {
        this.dialogRow =
            row;

        this.dialogDate =
            new Date();

        this.dialogReason =
            '';
    }

    closeDialog():
        void
    {
        this.dialogRow =
            null;
    }

    onDialogDate
    (
        value:
            Date | null
    ):
        void
    {
        this.dialogDate =
            value;
    }

    onDialogReason
    (
        value:
            string | number
    ):
        void
    {
        this.dialogReason =
            String(value ?? '');
    }

    get dialogSettled():
        boolean
    {
        return this.dialogRow?.Status === 'Settled';
    }

    get dialogVoucherNo():
        string
    {
        return this.dialogSettled
            ? this.dialogRow?.SettlementVoucherNo ?? ''
            : this.dialogRow?.RejectVoucherNo ?? '';
    }

    // Transactions reversed together
    get dialogVoucherCount():
        number
    {
        const row =
            this.dialogRow;

        if
        (
            !row
        )
        {
            return 0;
        }

        return this.dialogSettled
            ? this.rows.filter(item => item.Status === 'Settled' && item.SettlementVoucherId === row.SettlementVoucherId).length
            : this.rows.filter(item => item.Status === 'Rejected' && item.RejectVoucherId === row.RejectVoucherId).length;
    }

    // Back to : always Pending
    get dialogBackTo():
        string
    {
        return 'Pending';
    }

    get dialogMinDate():
        Date | null
    {
        const row =
            this.dialogRow;

        if
        (
            !row
        )
        {
            return null;
        }

        return fromIsoDate(
            this.dialogSettled
                ? row.SettledDate
                : row.RejectDate);
    }

    get dialogIssue():
        string
    {
        if
        (
            !this.dialogDate
        )
        {
            return 'Reversal Date is required.';
        }

        const date =
            toIsoDate(this.dialogDate);

        if
        (
            date > toIsoDate(new Date())
        )
        {
            return 'Reversal Date cannot be after today.';
        }

        const min =
            this.dialogMinDate;

        if
        (
            min
            &&
            date < toIsoDate(min)
        )
        {
            return `Reversal Date cannot be before ${this.displayDate(toIsoDate(min))}.`;
        }

        if
        (
            !this.dialogReason.trim()
        )
        {
            return 'A reason is required.';
        }

        return '';
    }

    confirmDialogAction():
        void
    {
        const row =
            this.dialogRow;

        if
        (
            !row
        )
        {
            return;
        }

        const issue =
            this.dialogIssue;

        const title =
            this.dialogSettled
                ? 'Undo Settlement'
                : 'Undo Reject';

        if
        (
            issue
        )
        {
            this.toast.error(title, issue);

            return;
        }

        const request$ =
            this.service.undo(
            {
                PaymentId:row.PaymentId,
                UndoDate:toIsoDate(this.dialogDate as Date),
                Reason:this.dialogReason.trim()
            });

        this.closeDialog();

        this.run(
            title,
            request$);
    }


    //===========================================================
    // Run an action : progress, toast, reload
    //===========================================================

    private run
    (
        title:
            string,
        request$:
            Observable<PosActionResult>
    ):
        void
    {
        if
        (
            this.busy
        )
        {
            return;
        }

        this.busy =
            true;

        this.startProgress(
            title,
            'Please wait…'
        );

        this.withMinimumDuration(request$)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    result:
                        PosActionResult
                ):
                    void =>
                {
                    this.completeProgress(
                        'Completed.',
                        () =>
                        {
                            this.busy =
                                false;

                            this.toast.success(
                                title,
                                result?.Message || 'Done.'
                            );

                            this.loadItems();
                        });
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    this.failProgress();

                    this.busy =
                        false;

                    console.error(`${title} Error:`, error);

                    this.toast.error(
                        title,
                        this.extractErrorMessage(error, `${title} failed.`)
                    );

                    this.loadItems();
                }
            });
    }

    //===========================================================
    // Progress (same as the voucher pages) : the bar climbs to
    // 90 % while the server works, stays open at least 3 seconds,
    // shows 100 % briefly, then closes
    //===========================================================

    private readonly MIN_PROGRESS_MS:
        number =
        3000;

    private readonly PROGRESS_TICK_MS:
        number =
        100;

    private readonly PROGRESS_CEILING:
        number =
        90;

    private readonly PROGRESS_COMPLETE_HOLD_MS:
        number =
        600;

    private progressValue:
        number =
        0;

    private progressTimer:
        ReturnType<typeof setInterval> | null =
        null;

    private completeTimer:
        ReturnType<typeof setTimeout> | null =
        null;

    private startProgress
    (
        title:
            string,
        message:
            string
    ):
        void
    {
        this.progressValue =
            0;

        this.progressDialog.show(
            title,
            message,
            false
        );

        this.clearProgressTimers();

        this.progressTimer =
            setInterval(
                () =>
                {
                    const step =
                        Math.max(
                            0.4,
                            (this.PROGRESS_CEILING - this.progressValue) * 0.06
                        );

                    this.progressValue =
                        Math.min(
                            this.PROGRESS_CEILING,
                            this.progressValue + step
                        );

                    this.progressDialog.update(
                        Math.round(this.progressValue)
                    );
                },
                this.PROGRESS_TICK_MS
            );
    }

    // 100 %, a short hold, close, then done()
    private completeProgress
    (
        message:
            string,
        done:
            () => void
    ):
        void
    {
        this.clearProgressTimers();

        this.progressDialog.update(
            100,
            message
        );

        this.completeTimer =
            setTimeout(
                () =>
                {
                    this.completeTimer =
                        null;

                    this.progressDialog.close();

                    done();

                    this.cdr.detectChanges();
                },
                this.PROGRESS_COMPLETE_HOLD_MS
            );
    }

    private failProgress():
        void
    {
        this.clearProgressTimers();

        this.progressDialog.close();
    }

    private clearProgressTimers():
        void
    {
        if
        (
            this.progressTimer
        )
        {
            clearInterval(this.progressTimer);

            this.progressTimer =
                null;
        }

        if
        (
            this.completeTimer
        )
        {
            clearTimeout(this.completeTimer);

            this.completeTimer =
                null;
        }
    }

    // The request takes at least MIN_PROGRESS_MS (success or error)
    private withMinimumDuration<T>
    (
        source$:
            Observable<T>
    ):
        Observable<T>
    {
        return defer(
            () =>
            {
                const startedAt =
                    Date.now();

                const remaining =
                    (): number =>
                        Math.max(0, this.MIN_PROGRESS_MS - (Date.now() - startedAt));

                return source$.pipe(
                    delayWhen(
                        () =>
                            timer(remaining())
                    ),
                    catchError(
                        error =>
                            timer(remaining()).pipe(
                                switchMap(
                                    () =>
                                        throwError(() => error)
                                )
                            )
                    )
                );
            });
    }

    private extractErrorMessage
    (
        error:
            unknown,
        fallback:
            string
    ):
        string
    {
        if
        (
            error instanceof HttpErrorResponse
        )
        {
            if
            (
                typeof error.error === 'string'
                &&
                error.error.trim()
            )
            {
                return error.error;
            }

            if
            (
                error.error?.message
            )
            {
                return error.error.message;
            }

            if
            (
                error.error?.title
            )
            {
                return error.error.title;
            }
        }

        return fallback;
    }


    //===========================================================
    // Print Preview : every document of the transaction
    //   /print-viewer/pos-received/<payment id>
    //   Receipt Voucher, Settlement Voucher (Receipt), Reject
    //   Voucher (Journal) : those that exist, with All Documents
    //===========================================================

    printPreview
    (
        row:
            PosRow
    ):
        void
    {
        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(
                    ['/print-viewer', 'pos-received', row.PaymentId],
                    {
                        queryParams:{ doc:'all' }
                    }
                )
            );

        // Not "noopener" : the new tab keeps this session's login
        const tab =
            window.open(url, '_blank');

        if
        (
            !tab
        )
        {
            this.toast.error(
                'Print Failed',
                'The browser blocked the new tab. Allow pop-ups for this site.'
            );
        }
    }


    //===========================================================
    // History
    //===========================================================

    // Page activity (settlements, rejects, undo …)
    openHistory():
        void
    {
        this.service
            .getHistory()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    response:
                        any[]
                ):
                    void =>
                {
                    this.historyItems =
                        (response ?? []).map
                        (
                            history =>
                            ({
                                title:history.activityTitle ?? history.ActivityTitle,
                                description:history.activityDescription ?? history.ActivityDescription,
                                user:history.performedByName ?? history.PerformedByName ?? 'System',
                                dateTime:new Date(history.performedDate ?? history.PerformedDate).toLocaleString(),
                                badge:history.activityType ?? history.ActivityType
                            })
                        );

                    this.historyTitle =
                        'POS Reconciliation History';

                    this.historyOpened =
                        true;

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error('History Load Failed:', error);

                    this.toast.error('History', 'Failed to load the history.');
                }
            });
    }

    // Auto Settlement log (last 30 days)
    openAutoRuns():
        void
    {
        this.service
            .getAutoRuns(30)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    response:
                        PosAutoSettlementRun[]
                ):
                    void =>
                {
                    this.historyItems =
                        (response ?? []).map
                        (
                            run =>
                            ({
                                title:
                                    run.Outcome === 'Completed'
                                        ? `${this.displayDate(run.RunDate)} · run completed`
                                        : `${run.BankLedgerName || run.BankLedgerCode} → ${run.Outcome}`,
                                description:
                                    [
                                        this.displayDate(run.RunDate),
                                        run.VoucherNo,
                                        run.TransactionCount > 0 ? `${run.TransactionCount} txn` : '',
                                        run.Amount > 0 ? `Tk ${formatMoney(run.Amount)}` : '',
                                        run.Message
                                    ]
                                    .filter(part => !!part)
                                    .join(' · '),
                                user:'System (Auto Settlement)',
                                dateTime:new Date(run.CreatedDate).toLocaleString(),
                                badge:run.Outcome
                            })
                        );

                    if
                    (
                        this.historyItems.length === 0
                    )
                    {
                        this.historyItems =
                        [
                            {
                                title:'No Auto Settlement runs',
                                description:'Nothing ran in the last 30 days (switch POS Reconciliation : Auto Settlement).',
                                user:'System',
                                dateTime:'',
                                badge:'Info'
                            }
                        ];
                    }

                    this.historyTitle =
                        'Auto Settlement Log';

                    this.historyOpened =
                        true;

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error('Auto Runs Load Failed:', error);

                    this.toast.error('Auto Settlement Log', 'Failed to load the log.');
                }
            });
    }

    // One transaction's life
    openLineHistory
    (
        row:
            PosRow
    ):
        void
    {
        this.service
            .getLineHistory(row.PaymentId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    response:
                        PosReconciliationHistory[]
                ):
                    void =>
                {
                    const steps =
                        (response ?? []).map
                        (
                            item =>
                            ({
                                title:`${item.Action} → ${item.Status}${item.IsAuto ? ' · Auto' : ''}`,
                                description:
                                    [
                                        this.displayDate(item.ActionDate),
                                        item.LedgerName,
                                        item.VoucherNo,
                                        item.FeeEdited
                                            ? `charges ${formatMoney(item.Fee)} (changed from ${formatMoney(item.StandardFee)} · Reason: ${item.FeeReason})`
                                            : item.Fee > 0 ? `charges ${formatMoney(item.Fee)}` : '',
                                        item.Reason
                                    ]
                                    .filter(part => !!part)
                                    .join(' · '),
                                user:item.IsAuto ? 'System (Auto Settlement)' : 'System',
                                dateTime:new Date(item.PerformedDate).toLocaleString(),
                                badge:item.Action
                            })
                        );

                    // Where it came from
                    steps.push(
                    {
                        title:`Received on ${row.SourceVoucherNo}`,
                        description:`${row.ReceiptDateText} · ${row.AccountName}${row.CardName ? ` · ${row.CardName}` : ''}${row.TransactionRef ? ` · Ref ${row.TransactionRef}` : ''} · Tk ${row.AmountText}`,
                        user:'System',
                        dateTime:row.ReceiptDateText,
                        badge:row.SourceVoucherType
                    });

                    this.historyItems =
                        steps;

                    this.historyTitle =
                        row.TransactionRef
                            ? `Card **** ${row.TransactionRef}`
                            : `Card receipt · ${row.SourceVoucherNo}`;

                    this.historyOpened =
                        true;

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error('POS History Failed:', error);

                    this.toast.error('History', 'Failed to load the transaction history.');
                }
            });
    }

    closeHistory():
        void
    {
        this.historyOpened =
            false;
    }


    //===========================================================
    // Display helpers
    //===========================================================

    money
    (
        value:
            number
    ):
        string
    {
        return formatMoney(value);
    }

    // yyyy-MM-dd → dd-MM-yyyy
    displayDate
    (
        value:
            string | null | undefined
    ):
        string
    {
        const parts =
            (value ?? '').substring(0, 10).split('-');

        return parts.length === 3
            ? `${parts[2]}-${parts[1]}-${parts[0]}`
            : value ?? '';
    }
}