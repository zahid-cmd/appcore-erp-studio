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
    CheckActionResult,
    CheckDirection,
    CheckReconciliationHistory,
    CheckReconciliations,
    CheckStatus
}
from '../../../models/check-reconciliations.model';

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
    TextboxComponent
}
from '../../../../../../shared/components/controls/textbox/textbox';

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
    ConfirmDialogService
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';

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
// Login session (active branch)
//===============================================================

import
{
    AuthenticationStorageService
}
from '../../../../../../core/authentication/authentication-storage.service';

//===============================================================
// Service
//===============================================================

import
{
    CheckReconciliationsService
}
from '../../../services/check-reconciliations.service';


//===============================================================
// Types
//===============================================================

// List row with display values
type CheckRow =
    CheckReconciliations
    &
    {
        CheckDateText:
            string;

        VoucherDateText:
            string;

        AmountText:
            string;

        // Check date after today : waits (cannot be deposited /
        // cleared yet)
        PostDated:
            boolean;

        // One line under the status (where / when / why)
        StatusNote:
            string;

        // List table : check date (+ Post-dated), bank
        CheckDateDisplay:
            string;

        BankText:
            string;

    };

type DialogKind =
    'void'
    | 'undo-deposit'
    | 'undo-clear'
    | 'undo-dishonour'
    | 're-present'
    | 'undo-void';

interface DialogSpec
{
    title:
        string;

    icon:
        string;

    // red / blue / amber header
    tone:
        'danger' | 'primary' | 'warn';

    button:
        string;

    dateLabel:
        string;

    // Reason box : required / optional / hidden
    reason:
        'required' | 'optional' | 'none';

    // Fee + recovery boxes (dishonour)
    charges:
        boolean;
}

const DIALOGS:
    Record<DialogKind, DialogSpec> =
{
    'void':
    {
        title:'Void Check',
        icon:'fas fa-xmark',
        tone:'danger',
        button:'Void Check',
        dateLabel:'Void Date',
        reason:'required',
        charges:false
    },
    'undo-deposit':
    {
        title:'Undo Deposit',
        icon:'fas fa-rotate-left',
        tone:'warn',
        button:'Undo Deposit',
        dateLabel:'',
        reason:'optional',
        charges:false
    },
    'undo-clear':
    {
        title:'Undo Clearing',
        icon:'fas fa-rotate-left',
        tone:'danger',
        button:'Reverse Clearing',
        dateLabel:'Reversal Date',
        reason:'required',
        charges:false
    },
    'undo-dishonour':
    {
        title:'Undo Dishonour',
        icon:'fas fa-rotate-left',
        tone:'warn',
        button:'Undo Dishonour',
        dateLabel:'Reversal Date',
        reason:'required',
        charges:false
    },
    're-present':
    {
        title:'Re-present Check',
        icon:'fas fa-share',
        tone:'primary',
        button:'Re-present',
        dateLabel:'',
        reason:'optional',
        charges:false
    },
    'undo-void':
    {
        title:'Undo Void',
        icon:'fas fa-rotate-left',
        tone:'warn',
        button:'Undo Void',
        dateLabel:'',
        reason:'optional',
        charges:false
    }
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
    selector:'checkReconciliations-list',
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
        TextboxComponent,
        TextareaComponent,
        ListTableComponent,
        HistoryDrawerComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent,
        ToastComponent
    ],
    templateUrl:'./check-reconciliations-list.html',
    styleUrl:'./check-reconciliations-list.css'
})

//===============================================================
// Check Reconciliation
//
// Received Checks (Receipt Vouchers) / Issued Checks (Payment
// Vouchers) of posted vouchers.
//
//   Received : Pending → Deposit → Clear (Check Clearing Center)
//              Deposited → Dishonour → Re-present
//   Issued   : Pending → Clear (Check Clearing Center) | Void
//   Undo     : Deposit / Clear / Dishonour / Void
//
// Rows : Print Preview (every document of the check), Undo,
// History.
//===============================================================

export class CheckReconciliationsList
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly service =
        inject(CheckReconciliationsService);

    private readonly authenticationStorage =
        inject(AuthenticationStorageService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

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
    // Tabs
    //===========================================================

    readonly tabs:
        ControlTab[] =
    [
        {
            id:'Received',
            label:'Received Checks'
        },
        {
            id:'Issued',
            label:'Issued Checks'
        }
    ];

    selectedTab:
        string =
        'Received';

    get direction():
        CheckDirection
    {
        return this.selectedTab === 'Issued'
            ? 'Issued'
            : 'Received';
    }

    get received():
        boolean
    {
        return this.direction === 'Received';
    }


    //===========================================================
    // Data
    //===========================================================

    rows:
        CheckRow[] =
    [];

    filteredRows:
        CheckRow[] =
    [];

    // Rows of the current page
    pagedRows:
        CheckRow[] =
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

    // Branch filter (default : login branch)
    branchItems:
        { label:string; value:number | null }[] =
    [];

    branchFilter:
        number | null =
        null;

    private loginBranchId:
        number =
        0;

    private branchTouched:
        boolean =
        false;

    private today:
        string =
        toIsoDate(new Date());


    //===========================================================
    // Dialog (one check)
    //===========================================================

    dialogKind:
        DialogKind | null =
        null;

    dialogRow:
        CheckRow | null =
        null;

    dialogDate:
        Date | null =
        new Date();

    dialogReason:
        string =
        '';

    dialogFeeText:
        string =
        '';

    dialogRecoveryText:
        string =
        '';

    get dialog():
        DialogSpec | null
    {
        return this.dialogKind
            ? DIALOGS[this.dialogKind]
            : null;
    }


    //===========================================================
    // History drawer
    //===========================================================

    historyOpened:
        boolean =
        false;

    historyTitle:
        string =
        'Check Reconciliation History';

    historyItems:
        any[] =
    [];


    //===========================================================
    // List table : columns (by tab), row actions
    //===========================================================

    private readonly receivedColumns:
        ListTableColumn[] =
        this.buildColumns('Received From', 'Issuing Bank');

    private readonly issuedColumns:
        ListTableColumn[] =
        this.buildColumns('Paid To', 'Drawn On');

    get columns():
        ListTableColumn[]
    {
        return this.received
            ? this.receivedColumns
            : this.issuedColumns;
    }

    private buildColumns
    (
        partyHeader:
            string,
        bankHeader:
            string
    ):
        ListTableColumn[]
    {
        return [
            { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
            { header:'Check No', field:'CheckNo', width:'130px', align:'left' },
            { header:'Check Date', field:'CheckDateDisplay', width:'150px', align:'center' },
            { header:partyHeader, field:'PartyName', width:'260px', align:'left' },
            { header:'Voucher No', field:'SourceVoucherNo', width:'200px', align:'center' },
            { header:bankHeader, field:'BankText', width:'200px', align:'left' },
            { header:'Amount', field:'AmountText', width:'130px', align:'right' },
            { header:'Status', field:'Status', type:'status', width:'110px', align:'center' },
            { header:'Actions', field:'actions', type:'actions', width:'80px', align:'center', cellAlign:'right' }
        ];
    }

    // Only the page's own actions (no View / Edit / Delete)
    readonly tableActions:
        ListTableActions =
        {
            view:false,
            edit:false,
            delete:false
        };

    // Print first, then the undo / re-present / void the status
    // allows, then History
    readonly rowActions:
        ListTableRowAction[] =
    [
        {
            key:'print',
            icon:'fas fa-print',
            title:'Print Preview : all documents of this check',
            tone:'primary'
        },
        {
            key:'undo-deposit',
            icon:'fas fa-rotate-left',
            title:'Undo deposit',
            visible:(row: CheckRow) => row.Direction === 'Received' && row.Status === 'Deposited'
        },
        {
            key:'undo-clear',
            icon:'fas fa-rotate-left',
            title:'Undo clearing (reverses the voucher)',
            visible:(row: CheckRow) => row.Status === 'Cleared'
        },
        {
            key:'re-present',
            icon:'fas fa-share',
            title:'Re-present (deposit again)',
            tone:'success',
            visible:(row: CheckRow) => row.Status === 'Dishonoured'
        },
        {
            key:'undo-dishonour',
            icon:'fas fa-rotate-left',
            title:'Undo dishonour',
            visible:(row: CheckRow) => row.Status === 'Dishonoured'
        },
        {
            key:'void',
            icon:'fas fa-xmark',
            title:'Void check',
            tone:'danger',
            visible:(row: CheckRow) => row.Direction === 'Issued' && row.Status === 'Pending'
        },
        {
            key:'undo-void',
            icon:'fas fa-rotate-left',
            title:'Undo void',
            visible:(row: CheckRow) => row.Status === 'Void'
        },
        {
            key:'history',
            icon:'fas fa-clock-rotate-left',
            title:'Check history'
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
            event.row as CheckRow;

        if
        (
            this.busy
            &&
            event.key !== 'print'
            &&
            event.key !== 'history'
        )
        {
            return;
        }

        switch
        (
            event.key
        )
        {
            case 'print':
                this.printPreview(row);
                break;

            case 'history':
                this.openCheckHistory(row);
                break;

            default:
                this.openDialog(event.key as DialogKind, row);
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

        const field =
            event.field === 'CheckDateDisplay'
                ? 'CheckDate'
                : event.field === 'AmountText'
                    ? 'Amount'
                    : event.field;

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
    // by this page's CSS). The table scrolls inside its own box
    // under the status chips; pagination in the footer.
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

        const user =
            this.authenticationStorage.getUser();

        this.loginBranchId =
            Number(user?.branchId) || 0;

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

        this.today =
            toIsoDate(new Date());

        const direction =
            this.direction;

        this.service
            .getAll(direction)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    response:
                        CheckReconciliations[]
                ):
                    void =>
                {
                    // A late answer of the other tab
                    if
                    (
                        direction !== this.direction
                    )
                    {
                        return;
                    }

                    this.rows =
                        (response ?? []).map(item => this.toRow(item));

                    this.buildBranchItems();

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
                    console.error('Load Check Reconciliations Error:', error);

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
                        'Unable to load checks.'
                    );

                    this.cdr.detectChanges();
                }
            });
    }

    private toRow
    (
        item:
            CheckReconciliations
    ):
        CheckRow
    {
        const postDated =
            !!item.CheckDate
            &&
            item.CheckDate > this.today;

        return {
            ...item,
            CheckDateText:this.displayDate(item.CheckDate),
            VoucherDateText:this.displayDate(item.VoucherDate),
            AmountText:formatMoney(item.Amount),
            PostDated:postDated,
            StatusNote:this.statusNote(item, postDated),
            CheckDateDisplay:`${this.displayDate(item.CheckDate)}${postDated ? ' · Post-dated' : ''}`,
            BankText:
                (item.Direction === 'Issued'
                    ? (item.AccountLedgerName || item.CheckBank)
                    : item.CheckBank)
                || '—'
        };
    }

    private statusNote
    (
        item:
            CheckReconciliations,
        postDated:
            boolean
    ):
        string
    {
        switch
        (
            item.Status
        )
        {
            case 'Deposited':
                return `${item.DepositLedgerName} · ${this.displayDate(item.DepositDate)} · ${item.DepositSlipNo}`;

            case 'Cleared':
                return `${this.displayDate(item.ClearedDate)} · ${item.ClearingVoucherNo}${item.ClearingCharge > 0 ? ` · charge ${formatMoney(item.ClearingCharge)}` : ''}`;

            case 'Dishonoured':
                return `${this.displayDate(item.DishonourDate)} · ${item.DishonourReason}`;

            case 'Void':
                return `${this.displayDate(item.VoidDate)} · ${item.VoidReason}`;

            default:
            {
                const parts:
                    string[] =
                    [];

                if
                (
                    postDated
                )
                {
                    parts.push(`Post-dated : due ${this.displayDate(item.CheckDate)}`);
                }

                if
                (
                    item.DishonourCount > 0
                )
                {
                    parts.push(`Returned ${item.DishonourCount}×, re-presented`);
                }

                return parts.join(' · ');
            }
        }
    }

    private buildBranchItems():
        void
    {
        const branches =
            new Map<number, string>();

        for
        (
            const row of this.rows
        )
        {
            branches.set(row.BranchId, row.BranchName);
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

        // Login branch first time (when it has checks)
        if
        (
            !this.branchTouched
        )
        {
            this.branchFilter =
                branches.has(this.loginBranchId)
                    ? this.loginBranchId
                    : null;
        }
        else if
        (
            this.branchFilter !== null
            &&
            !branches.has(this.branchFilter)
        )
        {
            this.branchFilter =
                null;
        }
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

        const inBranch =
            this.rows.filter(
                row =>
                    this.branchFilter === null
                    ||
                    row.BranchId === this.branchFilter
            );

        this.statusChips =
            this.buildChips(inBranch);

        this.filteredRows =
            inBranch.filter
            (
                row =>
                {
                    const statusMatch =
                        this.statusFilter === 'all'
                        ||
                        (
                            this.statusFilter === 'open'
                                ? this.isOpen(row)
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
                        row.CheckNo,
                        row.CheckDateText,
                        row.CheckBank,
                        row.PartyName,
                        row.SourceVoucherNo,
                        row.AmountText,
                        row.AccountLedgerName,
                        row.DepositLedgerName,
                        row.DepositSlipNo,
                        row.ClearingVoucherNo,
                        row.Status,
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

    // Still to work on
    private isOpen
    (
        row:
            CheckRow
    ):
        boolean
    {
        return row.Status === 'Pending'
            || row.Status === 'Deposited'
            || row.Status === 'Dishonoured';
    }

    private buildChips
    (
        rows:
            CheckRow[]
    ):
        StatusChip[]
    {
        const count =
            (status: CheckStatus): number =>
                rows.filter(row => row.Status === status).length;

        const chips:
            StatusChip[] =
        [
            { id:'open', label:'Open', count:rows.filter(row => this.isOpen(row)).length },
            { id:'Pending', label:'Pending', count:count('Pending') }
        ];

        if
        (
            this.received
        )
        {
            chips.push({ id:'Deposited', label:'Deposited', count:count('Deposited') });
        }

        chips.push({ id:'Cleared', label:'Cleared', count:count('Cleared') });

        chips.push(
            this.received
                ? { id:'Dishonoured', label:'Dishonoured', count:count('Dishonoured') }
                : { id:'Void', label:'Void', count:count('Void') });

        chips.push({ id:'all', label:'All', count:rows.length });

        return chips;
    }

    get filteredTotalText():
        string
    {
        return formatMoney(
            roundMoney(this.filteredRows.reduce((sum, row) => sum + (Number(row.Amount) || 0), 0)));
    }

    onTabChange
    (
        value:
            string
    ):
        void
    {
        if
        (
            value === this.selectedTab
            &&
            this.rows.length > 0
        )
        {
            return;
        }

        this.selectedTab =
            value;

        this.statusFilter =
            'open';

        this.rows =
            [];

        this.filteredRows =
            [];

        this.pagedRows =
            [];

        this.currentPage =
            1;

        this.loadItems();
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
        this.branchTouched =
            true;

        this.branchFilter =
            value === null || value === undefined
                ? null
                : Number(value);

        this.applyFilters();
    }

    refresh():
        void
    {
        this.loadItems();
    }

    // Empty state "Show All" : every status, every branch, no search
    clearFilters():
        void
    {
        this.statusFilter =
            'all';

        this.searchText =
            '';

        this.branchTouched =
            true;

        this.branchFilter =
            null;

        this.applyFilters();
    }


    //===========================================================
    // Check Clearing Center
    //===========================================================

    // Command center : open the Check Clearing Center for this tab
    openCenter():
        void
    {
        void this.router.navigate(
            ['center'],
            {
                relativeTo:this.route.parent,
                queryParams:{ direction:this.selectedTab === 'Issued' ? 'Issued' : 'Received' }
            });
    }

    get maxDate():
        Date
    {
        return new Date();
    }


    //===========================================================
    // Row actions (one check)
    //===========================================================

    openDialog
    (
        kind:
            DialogKind,
        row:
            CheckRow
    ):
        void
    {
        this.dialogKind =
            kind;

        this.dialogRow =
            row;

        this.dialogDate =
            new Date();

        this.dialogReason =
            '';

        this.dialogFeeText =
            '';

        this.dialogRecoveryText =
            '';
    }

    closeDialog():
        void
    {
        this.dialogKind =
            null;

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

    onDialogFee
    (
        value:
            string | number
    ):
        void
    {
        this.dialogFeeText =
            String(value ?? '');
    }

    onDialogRecovery
    (
        value:
            string | number
    ):
        void
    {
        this.dialogRecoveryText =
            String(value ?? '');
    }

    // Checks reversed together by Undo Clear
    get dialogVoucherCount():
        number
    {
        const id =
            this.dialogRow?.ClearingVoucherId;

        return id
            ? this.rows.filter(row => row.ClearingVoucherId === id).length
            : 0;
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

        switch
        (
            this.dialogKind
        )
        {
            case 'void':
                return fromIsoDate(row.VoucherDate);

            case 'undo-clear':
                return fromIsoDate(row.ClearedDate);

            case 'undo-dishonour':
                return fromIsoDate(row.DishonourDate);

            default:
                return null;
        }
    }

    get dialogIssue():
        string
    {
        const spec =
            this.dialog;

        if
        (
            !spec
        )
        {
            return '';
        }

        if
        (
            spec.dateLabel
            &&
            !this.dialogDate
        )
        {
            return `${spec.dateLabel} is required.`;
        }

        if
        (
            spec.dateLabel
            &&
            this.dialogDate
        )
        {
            const date =
                toIsoDate(this.dialogDate);

            if
            (
                date > toIsoDate(new Date())
            )
            {
                return `${spec.dateLabel} cannot be after today.`;
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
                return `${spec.dateLabel} cannot be before ${this.displayDate(toIsoDate(min))}.`;
            }
        }

        if
        (
            spec.reason === 'required'
            &&
            !this.dialogReason.trim()
        )
        {
            return 'A reason is required.';
        }

        if
        (
            spec.charges
        )
        {
            for
            (
                const [label, text] of [['Bank fee', this.dialogFeeText], ['Recovery', this.dialogRecoveryText]]
            )
            {
                const value =
                    text.trim();

                if
                (
                    value
                    &&
                    !/^\d[\d,]*(\.\d{0,2})?$/.test(value)
                )
                {
                    return `${label} must be a number with at most 2 decimals.`;
                }
            }
        }

        return '';
    }

    confirmDialogAction():
        void
    {
        const kind =
            this.dialogKind;

        const row =
            this.dialogRow;

        if
        (
            !kind
            ||
            !row
        )
        {
            return;
        }

        const issue =
            this.dialogIssue;

        if
        (
            issue
        )
        {
            this.toast.error(DIALOGS[kind].title, issue);

            return;
        }

        const date =
            this.dialogDate
                ? toIsoDate(this.dialogDate)
                : '';

        const reason =
            this.dialogReason.trim();

        const undo =
        {
            Direction:row.Direction,
            PaymentId:row.PaymentId,
            UndoDate:date,
            Reason:reason
        };

        let request$:
            Observable<CheckActionResult>;

        switch
        (
            kind
        )
        {
            case 'void':
                request$ =
                    this.service.voidCheck(
                    {
                        PaymentId:row.PaymentId,
                        VoidDate:date,
                        Reason:reason
                    });
                break;

            case 'undo-deposit':
                request$ = this.service.undoDeposit(undo);
                break;

            case 'undo-clear':
                request$ = this.service.undoClear(undo);
                break;

            case 'undo-dishonour':
                request$ = this.service.undoDishonour(undo);
                break;

            case 're-present':
                request$ = this.service.represent(undo);
                break;

            default:
                request$ = this.service.undoVoid(undo);
                break;
        }

        this.closeDialog();

        this.run(
            DIALOGS[kind].title,
            request$,
            () => undefined);
    }


    //===========================================================
    // Run an action : progress, toast, reload
    //===========================================================

    private run
    (
        title:
            string,
        request$:
            Observable<CheckActionResult>,
        done:
            (result: CheckActionResult) => void
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
                        CheckActionResult
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

                            done(result);

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
    // Print Preview : every document of the check
    //   /print-viewer/check-received/<payment id>
    //   /print-viewer/check-issued/<payment id>
    //   Source voucher, Deposit Slip, Clearing Voucher, Dishonour
    //   Voucher (those that exist), with All Documents
    //===========================================================

    printPreview
    (
        row:
            CheckRow
    ):
        void
    {
        this.openPrint(
            row.Direction === 'Issued' ? 'check-issued' : 'check-received',
            row.PaymentId);
    }

    private openPrint
    (
        key:
            string,
        id:
            number
    ):
        void
    {
        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(
                    ['/print-viewer', key, id],
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

    // Page activity (deposits, clearings, dishonours …)
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
                        'Check Reconciliation History';

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

    // One check's life
    openCheckHistory
    (
        row:
            CheckRow
    ):
        void
    {
        this.service
            .getCheckHistory(row.Direction, row.PaymentId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    response:
                        CheckReconciliationHistory[]
                ):
                    void =>
                {
                    const steps =
                        (response ?? []).map
                        (
                            item =>
                            ({
                                title:`${item.Action} → ${item.Status}`,
                                description:
                                    [
                                        this.displayDate(item.ActionDate),
                                        item.LedgerName,
                                        item.DepositSlipNo,
                                        item.VoucherNo,
                                        item.Charge > 0 ? `charge ${formatMoney(item.Charge)}` : '',
                                        item.Recovery > 0 ? `recovery ${formatMoney(item.Recovery)}` : '',
                                        item.Reason
                                    ]
                                    .filter(part => !!part)
                                    .join(' · '),
                                user:'System',
                                dateTime:new Date(item.PerformedDate).toLocaleString(),
                                badge:item.Action
                            })
                        );

                    // The check's origin
                    steps.push(
                    {
                        title:`Received on ${row.SourceVoucherNo}`,
                        description:`${row.VoucherDateText} · Check ${row.CheckNo} dated ${row.CheckDateText} · Tk ${row.AmountText}`,
                        user:'System',
                        dateTime:row.VoucherDateText,
                        badge:row.SourceVoucherType
                    });

                    if
                    (
                        row.Direction === 'Issued'
                    )
                    {
                        steps[steps.length - 1].title =
                            `Issued on ${row.SourceVoucherNo}`;
                    }

                    this.historyItems =
                        steps;

                    this.historyTitle =
                        `Check ${row.CheckNo}`;

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
                    console.error('Check History Failed:', error);

                    this.toast.error('History', 'Failed to load the check history.');
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

    statusClass
    (
        status:
            string
    ):
        string
    {
        return `crc-pill crc-pill-${(status || 'pending').toLowerCase()}`;
    }

    trackRow
    (
        _index:
            number,
        row:
            CheckRow
    ):
        number
    {
        return row.PaymentId;
    }
}