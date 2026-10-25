//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    OnDestroy,
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
    defer,
    timer,
    throwError,
    delayWhen,
    catchError,
    switchMap
}
from 'rxjs';

//===============================================================
// Models
//===============================================================

import
{
    ReceiptVoucher
}
from '../../../models/receipt-voucher.model';

import
{
    formatMoney
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
    PageCanvasComponent,
    PageCanvasConfig
}
from '../../../../../../shared/components/layout/page-canvas/page-canvas';

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
    ListTableComponent,
    ListTableColumn
}
from '../../../../../../shared/components/layout/list-table/list-table';

import
{
    PaginationComponent
}
from '../../../../../../shared/components/controls/pagination/pagination';

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

import
{
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

//===============================================================
// Service
//===============================================================

import
{
    ReceiptVoucherService
}
from '../../../services/receipt-voucher.service';

//===============================================================
// List Row (adds display values)
//===============================================================

type ReceiptVoucherRow =
    ReceiptVoucher
    &
    {
        // dd-MM-yyyy
        VoucherDateText:
            string;

        // Credited party / ledger
        PartyText:
            string;

        TotalAmountText:
            string;
    };

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'receipt-voucher-list',
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
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent,
        SearchDropdownComponent,
        ToastComponent
    ],
    templateUrl:'./receipt-voucher-list.html',
    styleUrl:'./receipt-voucher-list.css'
})

//===============================================================
// Receipt Voucher List
//===============================================================

export class ReceiptVoucherList
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly receiptVoucherService =
        inject(ReceiptVoucherService);

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

    // Requests stop when the page is left
    private readonly destroyRef =
        inject(DestroyRef);

    //===========================================================
    // Page Tabs
    //===========================================================

    tabs:
        ControlTab[] =
    [
        {
            id:'all',
            label:'All Receipt Vouchers'
        },
        {
            id:'Draft',
            label:'Draft'
        },
        {
            id:'Approved',
            label:'Approved'
        },
        {
            id:'Posted',
            label:'Posted'
        },
        {
            id:'Cancelled',
            label:'Cancelled'
        }
    ];

    selectedTab:
        string =
        'all';

    //===========================================================
    // Data
    //===========================================================

    receiptVouchers:
        ReceiptVoucherRow[] =
    [];

    filteredReceiptVouchers:
        ReceiptVoucherRow[] =
    [];

    pagedReceiptVouchers:
        ReceiptVoucherRow[] =
    [];

    //===========================================================
    // Search & Loading
    //===========================================================

    searchText:
        string =
        '';

    loading:
        boolean =
        false;

    loadFailed:
        boolean =
        false;

    // Prevents a second Delete / Restore while one is running
    isProcessing:
        boolean =
        false;

    //===========================================================
    // Ledger Type Filter
    //===========================================================

    partyTypeFilterItems:
        any[] =
    [
        {
            label:'All Ledger Types',
            value:null
        },
        {
            label:'Customer',
            value:'Customer'
        },
        {
            label:'Supplier',
            value:'Supplier'
        },
        {
            label:'General Ledger',
            value:'General Ledger'
        }
    ];

    selectedPartyType:
        string | null =
        null;

    //===========================================================
    // Progress Dialog Settings
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

    private progressTimer?:
        number;

    private progressValue:
        number =
        0;

    //===========================================================
    // Pagination
    //===========================================================

    currentPage:
        number =
        1;

    pageSize:
        number =
        10;

    //===========================================================
    // History
    //===========================================================

    historyOpened:
        boolean =
        false;

    historyTitle:
        string =
        'Receipt Voucher History';

    historyItems:
        any[] =
    [];

    //===========================================================
    // Page Canvas Configuration
    //===========================================================

    readonly canvasConfig:
        PageCanvasConfig =
    {
        mode:'list',
        showHeader:false,
        showFooter:true,
        reserveFooterSpace:true,
        bodyScrollable:true,
        fixedHeight:true,
        visibleRows:10,
        rowHeight:32,
        headerHeight:36,
        footerHeight:56
    };

    //===========================================================
    // Table Columns
    //===========================================================

    readonly columns:
        ListTableColumn[] =
    [
        {
            header:'#',
            field:'serial',
            type:'serial',
            width:'50px',
            align:'center'
        },
        {
            header:'Voucher No',
            field:'VoucherNo',
            width:'210px',
            align:'center'
        },
        {
            header:'Date',
            field:'VoucherDateText',
            width:'100px',
            align:'center'
        },
        {
            header:'Branch',
            field:'BranchName',
            width:'140px',
            align:'left'
        },
        {
            header:'Received From',
            field:'PartyText',
            width:'280px',
            align:'left'
        },
        {
            header:'Amount',
            field:'TotalAmountText',
            width:'130px',
            align:'right'
        },
        {
            header:'Receipt Modes',
            field:'ReceiptModes',
            width:'170px',
            align:'left'
        },
        {
            header:'Status',
            field:'Status',
            type:'status',
            width:'100px',
            align:'center'
        },
        {
            header:'Actions',
            field:'actions',
            type:'actions',
            width:'80px',
            align:'center'
        }
    ];



    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.loadItems();
    }

    //===========================================================
    // Destroy
    //===========================================================

    ngOnDestroy():
        void
    {
        this.clearProgressTimer();

        if
        (
            this.isProcessing
        )
        {
            this.progressDialog.close();
        }
    }

    //===========================================================
    // Progress Dialog (Animated)
    //===========================================================

    private startProgress
    (
        title:
            string,

        message:
            string
    ):
        void
    {
        this.isProcessing =
            true;

        this.progressValue =
            0;

        this.progressDialog.show(
            title,
            message,
            false
        );

        this.clearProgressTimer();

        this.progressTimer =
            window.setInterval(
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
                        Math.round(
                            this.progressValue
                        )
                    );
                },

                this.PROGRESS_TICK_MS
            );

        this.cdr.detectChanges();
    }

    private completeProgress
    (
        message:
            string,

        done:
            () => void
    ):
        void
    {
        this.clearProgressTimer();

        this.progressDialog.update(
            100,
            message
        );

        window.setTimeout(
            () =>
            {
                this.progressDialog.close();

                this.isProcessing =
                    false;

                this.cdr.detectChanges();

                done();
            },

            this.PROGRESS_COMPLETE_HOLD_MS
        );
    }

    private failProgress
    (
        done:
            () => void
    ):
        void
    {
        this.clearProgressTimer();

        this.progressDialog.close();

        this.isProcessing =
            false;

        this.cdr.detectChanges();

        done();
    }

    private clearProgressTimer():
        void
    {
        if
        (
            this.progressTimer
        )
        {
            clearInterval(
                this.progressTimer
            );

            this.progressTimer =
                undefined;
        }
    }

    //===========================================================
    // Minimum Progress Duration
    //===========================================================

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
                const startedAt:
                    number =
                    Date.now();

                const remaining =
                    (): number =>
                        Math.max(
                            0,
                            this.MIN_PROGRESS_MS - (Date.now() - startedAt)
                        );

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
            }
        );
    }

    //===========================================================
    // Error Message
    //===========================================================

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
    // Load Items
    //===========================================================

    loadItems():
        void
    {
        this.loading =
            true;

        this.loadFailed =
            false;

        this.receiptVoucherService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    response:
                        ReceiptVoucher[]
                ):
                    void =>
                {
                    // Display values
                    this.receiptVouchers =
                        (response ?? []).map
                        (
                            item =>
                            ({
                                ...item,

                                VoucherDateText:
                                    this.toDisplayDate(
                                        item.VoucherDate
                                    ),

                                PartyText:
                                    item.PartyName,

                                TotalAmountText:
                                    formatMoney(
                                        item.TotalAmount
                                    )
                            })
                        );

                    this.applyFilters();

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
                    console.error
                    (
                        'Load Receipt Vouchers Error:',
                        error
                    );

                    this.receiptVouchers =
                        [];

                    this.filteredReceiptVouchers =
                        [];

                    this.pagedReceiptVouchers =
                        [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.toast.error
                    (
                        'Load Failed',
                        'Unable to load receipt vouchers.'
                    );

                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Apply Filters
    //===========================================================

    applyFilters():
        void
    {
        const keyword =
            this.searchText
                .trim()
                .toLowerCase();

        this.filteredReceiptVouchers =
            this.receiptVouchers.filter
            (
                item =>
                {
                    const partyMatch =
                        this.selectedPartyType === null
                        ||
                        item.LedgerType ===
                        this.selectedPartyType;

                    const tabMatch =
                        this.selectedTab === 'all'
                        ||
                        item.Status ===
                        this.selectedTab;

                    const text =
                        [
                            item.VoucherNo,
                            item.VoucherDate,
                            item.VoucherDateText,
                            item.BranchName,
                            item.LedgerType,
                            item.PartyText,
                            item.Narration,
                            item.TotalAmountText,
                            item.ReceiptModes,
                            item.Status
                        ]
                        .join(' ')
                        .toLowerCase();

                    return partyMatch
                        &&
                        tabMatch
                        &&
                        (
                            !keyword
                            ||
                            text.includes(keyword)
                        );
                }
            );

        this.currentPage =
            1;

        this.updatePagination();
    }

    //===========================================================
    // Tab Change
    //===========================================================

    onTabChange
    (
        value:
            string
    ):
        void
    {
        this.selectedTab =
            value;

        this.applyFilters();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Search
    //===========================================================

    onSearch
    (
        value:
            string
    ):
        void
    {
        this.searchText =
            value
            ??
            '';

        this.applyFilters();
    }

    //===========================================================
    // Ledger Type Filter Change
    //===========================================================

    onPartyTypeFilterChange
    (
        value:
            string | null
    ):
        void
    {
        this.selectedPartyType =
            value
            ||
            null;

        this.applyFilters();
    }

    //===========================================================
    // Display Date (yyyy-MM-dd → dd-MM-yyyy)
    //===========================================================

    private toDisplayDate
    (
        value:
            string
    ):
        string
    {
        const parts =
            (value ?? '').substring(0, 10).split('-');

        return parts.length === 3
            ? `${parts[2]}-${parts[1]}-${parts[0]}`
            : value ?? '';
    }

    //===========================================================
    // Sort
    //===========================================================

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

        // Display columns sort on their raw values
        const field =
            event.field === 'VoucherDateText'
                ? 'VoucherDate'
                : event.field === 'TotalAmountText'
                    ? 'TotalAmount'
                    : event.field;

        this.filteredReceiptVouchers =
        [
            ...this.filteredReceiptVouchers
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
                    &&
                    valueB == null
                )
                {
                    return 0;
                }

                if
                (
                    valueA == null
                )
                {
                    return -1 * direction;
                }

                if
                (
                    valueB == null
                )
                {
                    return 1 * direction;
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
    // Refresh
    //===========================================================

    refresh():
        void
    {
        this.searchText =
            '';

        this.selectedTab =
            'all';

        this.selectedPartyType =
            null;

        this.currentPage =
            1;

        this.loadItems();
    }

    //===========================================================
    // Pagination
    //===========================================================

    updatePagination():
        void
    {
        const start:
            number =
            (this.currentPage - 1) * this.pageSize;

        this.pagedReceiptVouchers =
        [
            ...this.filteredReceiptVouchers.slice
            (
                start,
                start + this.pageSize
            )
        ];
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

    //===========================================================
    // Add / View / Edit
    //===========================================================

    add():
        void
    {
        void this.router.navigate
        (
            [
                'add'
            ],
            {
                relativeTo:
                    this.route.parent
            }
        );
    }

    view
    (
        item:
            ReceiptVoucherRow
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',
                item.ReceiptVoucherId
            ],
            {
                relativeTo:
                    this.route.parent
            }
        );
    }

    edit
    (
        item:
            ReceiptVoucherRow
    ):
        void
    {
        // Only drafts can be changed; others open in View
        if
        (
            item.Status !== 'Draft'
        )
        {
            this.toast.info
            (
                'Edit Not Allowed',
                `${item.VoucherNo} is ${item.Status}. Only a draft can be edited; it opens in View.`
            );

            this.view(
                item
            );

            return;
        }

        void this.router.navigate
        (
            [
                'edit',
                item.ReceiptVoucherId
            ],
            {
                relativeTo:
                    this.route.parent
            }
        );
    }

    //===========================================================
    // Delete
    //===========================================================

    delete
    (
        item:
            ReceiptVoucherRow
    ):
        void
    {
        if
        (
            this.isProcessing
        )
        {
            return;
        }

        if
        (
            item.Status !== 'Draft'
        )
        {
            this.toast.info
            (
                'Delete Not Allowed',
                `${item.VoucherNo} is ${item.Status}. Only a draft can be deleted; a posted voucher is cancelled from its page.`
            );

            return;
        }

        this.confirmDialog.open
        (
            'Delete Receipt Voucher',
            `Are you sure you want to delete draft "${item.VoucherNo}"?`,
            ():
                void =>
            {
                // Next tick : let the confirm dialog close first
                setTimeout(
                    () =>
                        this.deleteItem(
                            item
                        )
                );
            }
        );
    }

    private deleteItem
    (
        item:
            ReceiptVoucherRow
    ):
        void
    {
        this.startProgress(
            'Deleting Receipt Voucher',
            `Please wait while "${item.VoucherNo}" is being deleted...`
        );

        this.withMinimumDuration(
            this.receiptVoucherService.delete(
                item.ReceiptVoucherId
            )
        )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                ():
                    void =>
                {
                    this.completeProgress(

                        'Receipt voucher deleted.',

                        () =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',
                                `${item.VoucherNo} deleted successfully.`
                            );

                            this.loadItems();
                        }
                    );
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error
                    (
                        'Delete Receipt Voucher Error:',
                        error
                    );

                    this.failProgress(
                        () =>
                        {
                            if
                            (
                                error instanceof HttpErrorResponse
                                &&
                                error.status === 409
                            )
                            {
                                this.toast.info
                                (
                                    'Delete Blocked',
                                    this.extractErrorMessage(
                                        error,
                                        'Only a draft receipt voucher can be deleted.'
                                    )
                                );

                                return;
                            }

                            this.toast.error
                            (
                                'Delete Failed',
                                'Failed to delete receipt voucher.'
                            );
                        }
                    );
                }
            });
    }

    //===========================================================
    // Restore
    //===========================================================

    restore():
        void
    {
        if
        (
            this.isProcessing
        )
        {
            return;
        }

        this.confirmDialog.open
        (
            'Restore Receipt Voucher',
            'Are you sure you want to restore the most recently deleted draft receipt voucher?',
            ():
                void =>
            {
                setTimeout(
                    () =>
                        this.restoreItem()
                );
            },
            'Restore',
            'Cancel',
            'primary'
        );
    }

    private restoreItem():
        void
    {
        this.startProgress(
            'Restoring Receipt Voucher',
            'Please wait while the most recently deleted receipt voucher is being restored...'
        );

        this.withMinimumDuration(
            this.receiptVoucherService.restore()
        )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                ():
                    void =>
                {
                    this.completeProgress(

                        'Receipt voucher restored.',

                        () =>
                        {
                            this.toast.success
                            (
                                'Restore Successful',
                                'The most recently deleted receipt voucher has been restored.'
                            );

                            this.loadItems();
                        }
                    );
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error
                    (
                        'Restore Receipt Voucher Error:',
                        error
                    );

                    this.failProgress(
                        () =>
                        {
                            if
                            (
                                error instanceof HttpErrorResponse
                                &&
                                error.status === 404
                            )
                            {
                                this.toast.info
                                (
                                    'No Data to Restore',
                                    'There is no deleted receipt voucher to restore.'
                                );

                                return;
                            }

                            if
                            (
                                error instanceof HttpErrorResponse
                                &&
                                error.status === 409
                            )
                            {
                                this.toast.info
                                (
                                    'Restore Blocked',
                                    this.extractErrorMessage(
                                        error,
                                        'The receipt voucher cannot be restored.'
                                    )
                                );

                                return;
                            }

                            this.toast.error
                            (
                                'Restore Failed',
                                'Failed to restore receipt voucher.'
                            );
                        }
                    );
                }
            });
    }

    //===========================================================
    // History
    //===========================================================

    openHistory():
        void
    {
        this.receiptVoucherService
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
                                title:
                                    history.activityTitle
                                    ??
                                    history.ActivityTitle,

                                description:
                                    history.activityDescription
                                    ??
                                    history.ActivityDescription,

                                user:
                                    history.performedByName
                                    ??
                                    history.PerformedByName
                                    ??
                                    'System',

                                dateTime:
                                    new Date
                                    (
                                        history.performedDate
                                        ??
                                        history.PerformedDate
                                    )
                                    .toLocaleString(),

                                badge:
                                    history.activityType
                                    ??
                                    history.ActivityType
                            })
                        );

                    this.historyTitle =
                        'Receipt Voucher History';

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
                    console.error
                    (
                        'History Load Failed:',
                        error
                    );

                    this.toast.error
                    (
                        'History',
                        'Failed to load receipt voucher history.'
                    );
                }
            });
    }

    closeHistory():
        void
    {
        this.historyOpened =
            false;

        this.cdr.detectChanges();
    }
}