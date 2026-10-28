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
    PurchaseOrder,
    PurchaseOrderPageType
}
from '../../../models/purchase-orders-mb.model';

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
    PurchaseOrdersMbService
}
from '../../../services/purchase-orders-mb.service';

//===============================================================
// List Row (adds display values)
//===============================================================

type PurchaseOrderRow =
    PurchaseOrder
    &
    {
        // dd-MM-yyyy
        OrderDateText:
            string;

        ExpectedDateText:
            string;

        TotalQuantityText:
            string;

        TotalPayableText:
            string;
    };

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'purchase-orders-mb-list',

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

    templateUrl:'./purchase-orders-mb-list.html',

    styleUrl:'./purchase-orders-mb-list.css'
})

//===============================================================
// Purchase Orders List (Motor Bikes)
//===============================================================

export class PurchaseOrdersMbList
implements OnInit, OnDestroy
{
    //===========================================================
    // Page Type (this page : Motor Bikes)
    //===========================================================

    private readonly pageType:
        PurchaseOrderPageType =
        'MB';

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly purchaseOrdersService =
        inject(PurchaseOrdersMbService);

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
            label:'All Purchase Orders'
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
            id:'Placed',
            label:'Placed'
        },
        {
            id:'Completed',
            label:'Completed'
        },
        {
            id:'Closed',
            label:'Closed / Cancelled'
        }
    ];

    selectedTab:
        string =
        'all';

    //===========================================================
    // Data
    //===========================================================

    purchaseOrders:
        PurchaseOrderRow[] =
    [];

    filteredPurchaseOrdersMb:
        PurchaseOrderRow[] =
    [];

    pagedPurchaseOrdersMb:
        PurchaseOrderRow[] =
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
    // Supplier Filter (built from the loaded orders)
    //===========================================================

    supplierFilterItems:
        any[] =
    [
        {
            label:'All Suppliers',
            value:null
        }
    ];

    selectedSupplier:
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
        'Purchase Order History';

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
            header:'PO No',
            field:'OrderNo',
            width:'200px',
            align:'center'
        },
        {
            header:'Date',
            field:'OrderDateText',
            width:'100px',
            align:'center'
        },
        {
            header:'Supplier',
            field:'SupplierName',
            width:'260px',
            align:'left'
        },
        {
            header:'Expected',
            field:'ExpectedDateText',
            width:'100px',
            align:'center'
        },
        {
            header:'Qty',
            field:'TotalQuantityText',
            width:'70px',
            align:'right'
        },
        {
            header:'Total Payable',
            field:'TotalPayableText',
            width:'140px',
            align:'right'
        },
        {
            header:'Status',
            field:'Status',
            type:'status',
            width:'110px',
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

        this.purchaseOrdersService
            .getAll(this.pageType)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    response:
                        PurchaseOrder[]
                ):
                    void =>
                {
                    // Display values
                    this.purchaseOrders =
                        (response ?? []).map
                        (
                            item =>
                            ({
                                ...item,

                                OrderDateText:
                                    this.toDisplayDate(
                                        item.OrderDate
                                    ),

                                ExpectedDateText:
                                    this.toDisplayDate(
                                        item.ExpectedDate
                                    ),

                                TotalQuantityText:
                                    String(item.TotalQuantity || 0),

                                TotalPayableText:
                                    formatMoney(
                                        item.TotalPayable
                                    )
                            })
                        );

                    this.buildSupplierFilter();

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
                        'Load Purchase Orders Error:',
                        error
                    );

                    this.purchaseOrders =
                        [];

                    this.filteredPurchaseOrdersMb =
                        [];

                    this.pagedPurchaseOrdersMb =
                        [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.toast.error
                    (
                        'Load Failed',
                        'Unable to load purchase orders.'
                    );

                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Supplier Filter Items (one per supplier on the list)
    //===========================================================

    private buildSupplierFilter():
        void
    {
        const suppliers =
            new Map<string, string>();

        for
        (
            const item of this.purchaseOrders
        )
        {
            if
            (
                item.SupplierCode
            )
            {
                suppliers.set(
                    item.SupplierCode,
                    item.SupplierName || item.SupplierCode
                );
            }
        }

        this.supplierFilterItems =
        [
            {
                label:'All Suppliers',
                value:null
            },

            ...[...suppliers.entries()]
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map
                (
                    ([code, name]) =>
                    ({
                        label:name,
                        value:code
                    })
                )
        ];

        // Supplier no longer on the list → clear the filter
        if
        (
            this.selectedSupplier
            &&
            !suppliers.has(this.selectedSupplier)
        )
        {
            this.selectedSupplier =
                null;
        }
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

        this.filteredPurchaseOrdersMb =
            this.purchaseOrders.filter
            (
                item =>
                {
                    const supplierMatch =
                        this.selectedSupplier === null
                        ||
                        item.SupplierCode ===
                        this.selectedSupplier;

                    // "Closed" tab holds Closed Short and Cancelled
                    const tabMatch =
                        this.selectedTab === 'all'
                        ||
                        (
                            this.selectedTab === 'Closed'
                                ? item.Status === 'Closed Short' || item.Status === 'Cancelled'
                                : item.Status === this.selectedTab
                        );

                    const text =
                        [
                            item.OrderNo,
                            item.OrderDate,
                            item.OrderDateText,
                            item.ExpectedDateText,
                            item.SupplierName,
                            item.Narration,
                            item.TotalPayableText,
                            item.Status
                        ]
                        .join(' ')
                        .toLowerCase();

                    return supplierMatch
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
    // Supplier Filter Change
    //===========================================================

    onSupplierFilterChange
    (
        value:
            string | null
    ):
        void
    {
        this.selectedSupplier =
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
        const rawFields:
            Record<string, string> =
        {
            OrderDateText:'OrderDate',
            ExpectedDateText:'ExpectedDate',
            TotalQuantityText:'TotalQuantity',
            TotalPayableText:'TotalPayable'
        };

        const field =
            rawFields[event.field]
            ??
            event.field;

        this.filteredPurchaseOrdersMb =
        [
            ...this.filteredPurchaseOrdersMb
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

        this.selectedSupplier =
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

        this.pagedPurchaseOrdersMb =
        [
            ...this.filteredPurchaseOrdersMb.slice
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
            PurchaseOrderRow
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',
                item.PurchaseOrderId
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
            PurchaseOrderRow
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
                `${item.OrderNo} is ${item.Status}. Only a draft can be edited; it opens in View.`
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
                item.PurchaseOrderId
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
            PurchaseOrderRow
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
                `${item.OrderNo} is ${item.Status}. Only a draft can be deleted; an approved or placed order is cancelled from its page.`
            );

            return;
        }

        this.confirmDialog.open
        (
            'Delete Purchase Order',
            `Are you sure you want to delete draft "${item.OrderNo}"?`,
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
            PurchaseOrderRow
    ):
        void
    {
        this.startProgress(
            'Deleting Purchase Order',
            `Please wait while "${item.OrderNo}" is being deleted...`
        );

        this.withMinimumDuration(
            this.purchaseOrdersService.delete(
                item.PurchaseOrderId
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
                        'Purchase order deleted.',
                        () =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',
                                `${item.OrderNo} deleted successfully.`
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
                        'Delete Purchase Order Error:',
                        error
                    );

                    this.failProgress(
                        () =>
                        {
                            if
                            (
                                error instanceof HttpErrorResponse
                                &&
                                (
                                    error.status === 400
                                    ||
                                    error.status === 403
                                    ||
                                    error.status === 409
                                )
                            )
                            {
                                this.toast.info
                                (
                                    'Delete Blocked',
                                    this.extractErrorMessage(
                                        error,
                                        'Only a draft purchase order can be deleted.'
                                    )
                                );

                                return;
                            }

                            this.toast.error
                            (
                                'Delete Failed',
                                'Failed to delete purchase order.'
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
            'Restore Purchase Order',
            'Are you sure you want to restore the most recently deleted draft purchase order?',
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
            'Restoring Purchase Order',
            'Please wait while the most recently deleted purchase order is being restored...'
        );

        this.withMinimumDuration(
            this.purchaseOrdersService.restore(
                this.pageType
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
                        'Purchase order restored.',
                        () =>
                        {
                            this.toast.success
                            (
                                'Restore Successful',
                                'The most recently deleted purchase order has been restored.'
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
                        'Restore Purchase Order Error:',
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
                                    'There is no deleted purchase order to restore.'
                                );

                                return;
                            }

                            if
                            (
                                error instanceof HttpErrorResponse
                                &&
                                (
                                    error.status === 400
                                    ||
                                    error.status === 403
                                    ||
                                    error.status === 409
                                )
                            )
                            {
                                this.toast.info
                                (
                                    'Restore Blocked',
                                    this.extractErrorMessage(
                                        error,
                                        'The purchase order cannot be restored.'
                                    )
                                );

                                return;
                            }

                            this.toast.error
                            (
                                'Restore Failed',
                                'Failed to restore purchase order.'
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
        this.purchaseOrdersService
            .getHistory(this.pageType)
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
                        'Purchase Order History';

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
                        'Failed to load purchase order history.'
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