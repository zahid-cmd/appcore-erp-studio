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

import
{
    DatepickerComponent
}
from '../../../../../shared/components/controls/datepicker/datepicker';

// Item summary card (row hover)
import
{
    ItemSummaryCardComponent,
    ItemSummaryHover
}
from '../../../../../shared/components/utilities/item-summary-card/item-summary-card';

// System Configuration switches (shared reader)
import
{
    VoucherSwitchesService,
    switchOn
}
from '../../../../../shared/components/accounting/voucher-switches';

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
        DatepickerComponent,
        ItemSummaryCardComponent,
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

    private readonly switchesService =
        inject(VoucherSwitchesService);

    //===========================================================
    // Item summary card : resting the mouse on a row shows the
    // purchase's items (bikes per model) with qty and amount.
    // Switch "Show Items on Hover" (page's ITEM_SUMMARY).
    //===========================================================

    readonly itemHover =
        new ItemSummaryHover(
            row => String((row as PurchaseRow)?.PublicId ?? ''),
            row => this.purchasesService.getItemSummary(String((row as PurchaseRow).PublicId)),
            row =>
            {
                const purchase =
                    row as PurchaseRow;

                return {
                    title:purchase.PurchaseNo || 'Purchase',
                    subtitle:[purchase.SupplierName, purchase.PurchaseDateText, purchase.Status]
                        .filter(x => !!x)
                        .join(' · ')
                };
            },
            () => this.cdr.detectChanges());

    private async loadItemHoverSwitch():
        Promise<void>
    {
        const switches =
            await this.switchesService.load();

        this.itemHover.enabled =
            switchOn(switches, this.page.switches.ITEM_SUMMARY, false);
    }

    //===========================================================
    // Page Tabs
    //===========================================================

    // One tab only; the status is chosen in the Status filter
    // (2026-11-10)
    tabs:
        ControlTab[] =
    [
        {
            id:'all',
            label:'All Purchases'
        }
    ];

    // The status filter value sent to the server as "tab"
    // ('all' / Draft / Approved / Posted / Cancelled)
    selectedTab:
        string =
        'all';

    //===========================================================
    // Status Filter (before the supplier filter; the supplier
    // list follows it)
    //===========================================================

    readonly statusFilterItems:
        any[] =
    [
        { label:'All Statuses', value:null },
        { label:'Draft', value:'Draft' },
        { label:'Approved', value:'Approved' },
        { label:'Posted', value:'Posted' },
        { label:'Cancelled', value:'Cancelled' }
    ];

    get selectedStatus():
        string | null
    {
        return this.selectedTab === 'all'
            ? null
            : this.selectedTab;
    }

    //===========================================================
    // Date Range (purchase date, both ends included; empty = open)
    //===========================================================

    dateFrom:
        Date | null =
        null;

    dateTo:
        Date | null =
        null;

    //===========================================================
    // Data
    //===========================================================

    purchases:
        PurchaseRow[] =
    [];

    // Rows on all pages after the tab / supplier / search (server)
    totalRecords:
        number =
        0;

    // Status counts from the server (supplier and search applied)
    counts:
        Record<string, number> =
        {};

    // Server sort ('' = newest first)
    private sortField:
        string =
        '';

    private sortDirection:
        'asc' | 'desc' =
        'asc';

    private searchTimer?:
        number;

    // A load that is out of date is ignored
    private loadSeq:
        number =
        0;

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
    // Supplier Filter (suppliers on this page's documents, from the server)
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
            // The pill is 110px wide : room for it and the cell padding
            width:'140px',
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

        void this.loadItemHoverSwitch();
    }

    //===========================================================
    // Destroy
    //===========================================================

    ngOnDestroy():
        void
    {
        this.itemHover.dispose();

        this.clearProgressTimer();

        if
        (
            this.searchTimer
        )
        {
            clearTimeout(this.searchTimer);
        }

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
    // Load Items : one page from the server (tab / supplier /
    // search / sort / page). withSuppliers also reloads the
    // supplier filter (start, refresh, after delete / restore).
    //===========================================================

    loadItems
    (
        withSuppliers:
            boolean =
            true
    ):
        void
    {
        // Saved / deleted / paged : the cards are read again
        this.itemHover.clear();

        this.loading =
            true;

        this.loadFailed =
            false;

        const seq =
            ++this.loadSeq;

        if
        (
            withSuppliers
        )
        {
            this.loadSuppliers();
        }

        this.purchasesService
            .getPaged
            ({
                page:
                    this.currentPage,
                pageSize:
                    this.pageSize,
                search:
                    this.searchText,
                sort:
                    this.sortField,
                dir:
                    this.sortDirection,
                tab:
                    this.selectedTab,
                supplier:
                    this.selectedSupplier ?? '',
                from:
                    this.isoDate(this.dateFrom),
                to:
                    this.isoDate(this.dateTo)
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    result =>
                    {
                        if
                        (
                            seq !== this.loadSeq
                        )
                        {
                            return;
                        }

                        this.purchases =
                            result.items.map(item => this.toRow(item));

                        this.pagedPurchases =
                            this.purchases;

                        this.totalRecords =
                            result.totalCount;

                        this.currentPage =
                            result.page || 1;

                        this.counts =
                            result.counts ?? {};

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
                    if
                    (
                        seq !== this.loadSeq
                    )
                    {
                        return;
                    }

                    console.error
                    (
                        'Load Error:',
                        error
                    );

                    this.purchases =
                        [];

                    this.pagedPurchases =
                        [];

                    this.totalRecords =
                        0;

                    this.counts =
                        {};

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

    // A list row with its display values
    private toRow
    (
        item:
            Purchase
    ):
        PurchaseRow
    {
        return ({
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
            });
    }

    //===========================================================
    // Supplier Filter Items (suppliers on this page's documents)
    //===========================================================

    private loadSuppliers():
        void
    {
        this.purchasesService
            .getListSuppliers(this.selectedStatus ?? '')
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    suppliers =>
                    {
                        // The chosen supplier has no purchase in this
                        // status : the supplier filter goes back to All
                        if
                        (
                            this.selectedSupplier
                            &&
                            !suppliers.some(x => x.code === this.selectedSupplier)
                        )
                        {
                            this.selectedSupplier =
                                null;

                            this.reload();
                        }

                        this.supplierFilterItems =
                        [
                            {
                                label:'All Suppliers',
                                value:null
                            },

                            ...suppliers.map
                            (
                                x =>
                                ({
                                    label:x.name || x.code,
                                    value:x.code
                                })
                            )
                        ];

                        this.cdr.detectChanges();
                    },

                error:
                    () =>
                    {
                        // The list still works without the filter options
                    }
            });
    }

    // Back to page 1 and load (filters / sort changed)
    private reload():
        void
    {
        this.currentPage =
            1;

        this.loadItems(false);
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
        // One tab only (All Purchases) : nothing to change
    }

    //===========================================================
    // Status Filter Change : the supplier list follows it
    //===========================================================

    onStatusFilterChange
    (
        value:
            string | null
    ):
        void
    {
        this.selectedTab =
            value || 'all';

        this.loadSuppliers();

        this.reload();
    }

    //===========================================================
    // Date Range Change (a From after the To moves the To, and
    // the other way round)
    //===========================================================

    onDateFromChange
    (
        value:
            Date | null
    ):
        void
    {
        this.dateFrom =
            this.validDate(value);

        if (this.dateFrom && this.dateTo && this.dateFrom > this.dateTo)
        {
            this.dateTo = this.dateFrom;
        }

        this.reload();
    }

    onDateToChange
    (
        value:
            Date | null
    ):
        void
    {
        this.dateTo =
            this.validDate(value);

        if (this.dateFrom && this.dateTo && this.dateTo < this.dateFrom)
        {
            this.dateFrom = this.dateTo;
        }

        this.reload();
    }

    clearDates():
        void
    {
        this.dateFrom =
            null;

        this.dateTo =
            null;

        this.reload();
    }

    get hasDates():
        boolean
    {
        return !!this.dateFrom || !!this.dateTo;
    }

    private validDate
    (
        value:
            Date | null
    ):
        Date | null
    {
        return value instanceof Date && !isNaN(value.getTime())
            ? new Date(value.getFullYear(), value.getMonth(), value.getDate())
            : null;
    }

    // Date -> "yyyy-MM-dd" (local day; '' = no limit)
    private isoDate
    (
        value:
            Date | null
    ):
        string
    {
        if (!value)
        {
            return '';
        }

        return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    }

    //===========================================================
    // Search (after a short pause in typing)
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

        if
        (
            this.searchTimer
        )
        {
            clearTimeout(this.searchTimer);
        }

        this.searchTimer =
            window.setTimeout
            (
                () =>
                {
                    this.searchTimer =
                        undefined;

                    this.reload();
                },
                300
            );
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

        this.reload();
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
    // Sort (on the server)
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
        this.sortField =
            event?.field ?? '';

        this.sortDirection =
            event?.direction === 'desc'
                ? 'desc'
                : 'asc';

        this.reload();
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

        this.dateFrom =
            null;

        this.dateTo =
            null;

        this.sortField =
            '';

        this.currentPage =
            1;

        this.loadItems();
    }

    //===========================================================
    // Pagination (on the server)
    //===========================================================

    onPageChange
    (
        page:
            number
    ):
        void
    {
        this.currentPage =
            page;

        this.loadItems(false);
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

        this.reload();
    }

    //===========================================================
    // Summary Line (below the canvas) : documents by status
    // (supplier and search applied)
    //===========================================================

    get summaryTotal():
        number
    {
        return Number(this.counts['All'] ?? 0);
    }

    // A status count ; the server keys are the status names
    countOf
    (
        status:
            string
    ):
        number
    {
        const key =
            Object.keys(this.counts).find(k => k.toLowerCase() === status.toLowerCase());

        return key ? Number(this.counts[key] ?? 0) : 0;
    }

    get summaryNote():
        string
    {
        return this.searchText.trim() || this.selectedSupplier || this.selectedStatus || this.hasDates
            ? 'Filtered records'
            : 'All records';
    }

    summaryText(
        value: number
    ):
        string
    {
        return value.toLocaleString('en-US');
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
                item.PublicId
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
                item.PublicId
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
                item.PublicId ?? ''
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
