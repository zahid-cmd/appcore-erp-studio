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
    Purchase,
    PurchasePageType
}
from '../purchase.model';

import
{
    formatMoney
}
from '../../../../../shared/components/accounting/accounting.models';

//===============================================================
// Shared Components
//===============================================================

import
{
    PageHeaderComponent
}
from '../../../../../shared/components/layout/page-header/page-header';

import
{
    PageToolbarComponent
}
from '../../../../../shared/components/layout/page-toolbar/page-toolbar';

import
{
    PageCanvasComponent,
    PageCanvasConfig
}
from '../../../../../shared/components/layout/page-canvas/page-canvas';

import
{
    ControlTabsComponent,
    ControlTab
}
from '../../../../../shared/components/controls/control-tabs/control-tabs';

import
{
    SearchBoxComponent
}
from '../../../../../shared/components/utilities/search-box/search-box';

import
{
    CommandCenterComponent
}
from '../../../../../shared/components/utilities/command-center/command-center';

import
{
    ListTableComponent,
    ListTableColumn
}
from '../../../../../shared/components/layout/list-table/list-table';

import
{
    PaginationComponent
}
from '../../../../../shared/components/controls/pagination/pagination';

import
{
    HistoryDrawerComponent
}
from '../../../../../shared/components/utilities/history-drawer/history-drawer';

import
{
    ConfirmDialogService
}
from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';

import
{
    ConfirmDialogComponent
}
from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';

import
{
    ProgressDialogComponent
}
from '../../../../../shared/components/utilities/progress-dialog/progress-dialog';

import
{
    ProgressDialogService
}
from '../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';

import
{
    ToastService
}
from '../../../../../shared/components/utilities/toast/toast.service';

import
{
    ToastComponent
}
from '../../../../../shared/components/utilities/toast/toast';

import
{
    SearchDropdownComponent
}
from '../../../../../shared/components/controls/search-dropdown/search-dropdown';

//===============================================================
// Service
//===============================================================

import
{
    PurchaseService
}
from '../purchase.service';

import
{
    PURCHASE_PAGE,
    PurchasePageConfig
}
from '../purchase.config';

//===============================================================
// List Row (adds display values)
//===============================================================

type PurchaseRow =
    Purchase
    &
    {
        // dd-MM-yyyy
        PurchaseDateText:
            string;

        // Supplier invoice / Mushak 6.3 numbers
        DocumentText:
            string;

        TotalQuantityText:
            string;

        TotalPayableText:
            string;

        // "DP" / "MRP"
        InvoiceText:
            string;
    };

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'purchase-list',

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

    templateUrl:'./purchase-list.html',

    styleUrl:'./purchase-list.css'
})

//===============================================================
// Purchases List (shared by MB / SP / AC : the page's
// config and service come from its own list file)
//===============================================================

export class PurchaseList
implements OnInit, OnDestroy
{
    //===========================================================
    // This page (MB / SP / AC)
    //===========================================================

    readonly page:
        PurchasePageConfig =
        inject(PURCHASE_PAGE);

    private readonly pageType:
        PurchasePageType =
        this.page.pageType;

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly purchasesService =
        inject(PurchaseService);

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
            label:'All Purchases'
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

    purchases:
        PurchaseRow[] =
    [];

    filteredPurchases:
        PurchaseRow[] =
    [];

    pagedPurchases:
        PurchaseRow[] =
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
    // Supplier Filter (built from the loaded purchases)
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
        'Purchase History';

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
            header:'Purchase No',
            field:'PurchaseNo',
            width:'190px',
            align:'center'
        },
        {
            header:'Date',
            field:'PurchaseDateText',
            width:'100px',
            align:'center'
        },
        {
            header:'Supplier',
            field:'SupplierName',
            width:'210px',
            align:'left'
        },
        // How the supplier bills : DP / MRP invoice (MB : always DP)
        {
            header:'Invoice',
            field:'InvoiceText',
            width:'80px',
            align:'center'
        },
        {
            header:'Invoice / Mushak',
            field:'DocumentText',
            width:'170px',
            align:'left'
        },
        {
            header:'PO No',
            field:'OrderNo',
            width:'170px',
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

        this.purchasesService
            .getAll(this.pageType)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    response:
                        Purchase[]
                ):
                    void =>
                {
                    // Display values
                    this.purchases =
                        (response ?? []).map
                        (
                            item =>
                            ({
                                ...item,

                                PurchaseDateText:
                                    this.toDisplayDate(
                                        item.PurchaseDate
                                    ),

                                DocumentText:
                                    [item.SupplierInvoiceNo, item.MushakNo]
                                        .filter(x => !!x)
                                        .join(' · ')
                                    ||
                                    '—',

                                TotalQuantityText:
                                    String(item.TotalQuantity || 0),

                                TotalPayableText:
                                    formatMoney(
                                        item.TotalPayable
                                    ),

                                InvoiceText:
                                    item.InvoicePriceBasis === 'MRP' ? 'MRP' : 'DP'
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
                        'Load Purchases Error:',
                        error
                    );

                    this.purchases =
                        [];

                    this.filteredPurchases =
                        [];

                    this.pagedPurchases =
                        [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.toast.error
                    (
                        'Load Failed',
                        'Unable to load purchases.'
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
            const item of this.purchases
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

        this.filteredPurchases =
            this.purchases.filter
            (
                item =>
                {
                    const supplierMatch =
                        this.selectedSupplier === null
                        ||
                        item.SupplierCode ===
                        this.selectedSupplier;

                    const tabMatch =
                        this.selectedTab === 'all'
                        ||
                        item.Status === this.selectedTab;

                    const text =
                        [
                            item.PurchaseNo,
                            item.PurchaseDate,
                            item.PurchaseDateText,
                            item.OrderNo,
                            item.SupplierInvoiceNo,
                            item.MushakNo,
                            item.DoReference,
                            item.GatePassNo,
                            item.VoucherNo,
                            item.SupplierName,
                            item.InvoicePriceBasis,
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
            PurchaseDateText:'PurchaseDate',
            TotalQuantityText:'TotalQuantity',
            TotalPayableText:'TotalPayable'
        };

        const field =
            rawFields[event.field]
            ??
            event.field;

        this.filteredPurchases =
        [
            ...this.filteredPurchases
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

        this.pagedPurchases =
        [
            ...this.filteredPurchases.slice
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
            PurchaseRow
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',
                item.PurchaseId
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
            PurchaseRow
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
                `${item.PurchaseNo} is ${item.Status}. Only a draft can be edited; it opens in View.`
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
                item.PurchaseId
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
            PurchaseRow
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
                `${item.PurchaseNo} is ${item.Status}. Only a draft can be deleted; a posted purchase is cancelled from its page.`
            );

            return;
        }

        this.confirmDialog.open
        (
            'Delete Purchase',
            `Are you sure you want to delete draft "${item.PurchaseNo}"?`,
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
            PurchaseRow
    ):
        void
    {
        this.startProgress(
            'Deleting Purchase',
            `Please wait while "${item.PurchaseNo}" is being deleted...`
        );

        this.withMinimumDuration(
            this.purchasesService.delete(
                item.PurchaseId
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
                        'Purchase deleted.',
                        () =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',
                                `${item.PurchaseNo} deleted successfully.`
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
                        'Delete Purchase Error:',
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
                                        'Only a draft purchase can be deleted.'
                                    )
                                );

                                return;
                            }

                            this.toast.error
                            (
                                'Delete Failed',
                                'Failed to delete purchase.'
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
            'Restore Purchase',
            'Are you sure you want to restore the most recently deleted draft purchase?',
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
            'Restoring Purchase',
            'Please wait while the most recently deleted purchase is being restored...'
        );

        this.withMinimumDuration(
            this.purchasesService.restore(
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
                        'Purchase restored.',
                        () =>
                        {
                            this.toast.success
                            (
                                'Restore Successful',
                                'The most recently deleted purchase has been restored.'
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
                        'Restore Purchase Error:',
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
                                    'There is no deleted purchase to restore.'
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
                                        'The purchase cannot be restored.'
                                    )
                                );

                                return;
                            }

                            this.toast.error
                            (
                                'Restore Failed',
                                'Failed to restore purchase.'
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
        this.purchasesService
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
                        'Purchase History';

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
                        'Failed to load purchase history.'
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
