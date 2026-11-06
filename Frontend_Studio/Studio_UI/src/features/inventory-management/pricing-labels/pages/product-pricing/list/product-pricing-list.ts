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
    Router
}
from '@angular/router';

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
    ToastComponent
}
from '../../../../../../shared/components/utilities/toast/toast';

import
{
    ToastService
}
from '../../../../../../shared/components/utilities/toast/toast.service';

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
    ConfirmDialogService
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';

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
    ProgressRunner
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-runner';

import
{
    PRODUCT_PRICING_ROUTE,
    PRODUCT_PRICING_TYPES,
    ProductPricing,
    formatPricingDate,
    productPricingMatches,
    productPricingType
}
from '../../../models/product-pricing.model';

import
{
    ProductPricingService
}
from '../../../services/product-pricing.service';


// A row with its display texts
type ProductPricingRow =
    ProductPricing
    &
    {
        DateText:string;
        TypeText:string;
        StatusText:string;
    };


//===============================================================
// Product Pricing list : the price changes of every type; a type
// filter on the toolbar. A draft opens for editing, a posted /
// cancelled one opens to view (print, cancel).
//===============================================================

@Component(
{
    selector:'app-product-pricing-list',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        ControlTabsComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        ToastComponent,
        HistoryDrawerComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./product-pricing-list.html',

    styleUrl:'./product-pricing-list.css'
})

export class ProductPricingList
    implements OnInit
{
    private readonly service =
        inject(ProductPricingService);

    private readonly router =
        inject(Router);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly toast =
        inject(ToastService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    // Progress dialog around delete / restore
    readonly progress =
        new ProgressRunner(inject(ProgressDialogService), () => this.cdr.detectChanges());

    //===========================================================
    // History
    //===========================================================

    historyOpened:
        boolean = false;

    historyTitle:
        string = 'Product Pricing History';

    historyItems:
        any[] = [];

    private readonly destroyRef =
        inject(DestroyRef);

    //===========================================================
    // Tabs : All / Draft / Posted / Cancelled ; type filter
    //===========================================================

    tabs:
        ControlTab[] =
        [
            { id:'all', label:'All' },
            { id:'draft', label:'Draft' },
            { id:'posted', label:'Posted' },
            { id:'cancelled', label:'Cancelled' }
        ];

    selectedTab:
        string = 'all';

    readonly types =
        [
            { id:'', label:'All Types', icon:'fas fa-layer-group' },
            ...PRODUCT_PRICING_TYPES.map(x => ({ id:x.type as string, label:x.title, icon:x.icon }))
        ];

    selectedType:
        string = '';

    //===========================================================
    // Data
    //===========================================================

    rows:
        ProductPricingRow[] = [];

    // Rows on all pages after the tab / type / search (server)
    totalRecords:
        number = 0;

    // Tab / type / status counts from the server
    counts:
        Record<string, number> = {};

    // Server sort ('' = newest first)
    private sortField:
        string = '';

    private sortDirection:
        'asc' | 'desc' = 'asc';

    private searchTimer?:
        number;

    // A load that is out of date is ignored
    private loadSeq:
        number = 0;

    pagedRows:
        ProductPricingRow[] = [];

    searchText:
        string = '';

    loading:
        boolean = false;

    loadFailed:
        boolean = false;

    currentPage:
        number = 1;

    pageSize:
        number = 10;

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

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Price Change No', field:'PricingNo', width:'190px', align:'center', sortable:true },
        { header:'Effective Date', field:'DateText', width:'140px', align:'center', sortable:true },
        { header:'Product Type', field:'TypeText', width:'200px', align:'left', sortable:true },
        { header:'Products', field:'ProductCount', width:'100px', align:'right', sortable:true },
        { header:'Batches', field:'BatchCount', width:'100px', align:'right', sortable:true },
        { header:'Remarks', field:'Remarks', align:'left', sortable:true },
        { header:'Status', field:'Status', type:'status', width:'140px', align:'center', sortable:true },
        { header:'Actions', field:'actions', type:'actions', width:'150px', align:'center' }
    ];

    //===========================================================
    // Start
    //===========================================================

    ngOnInit():
        void
    {
        this.load();
    }

    load():
        void
    {
        this.loading = true;

        this.loadFailed = false;

        const seq =
            ++this.loadSeq;

        this.cdr.detectChanges();

        this.service
            .getPaged
            ({
                page:this.currentPage,
                pageSize:this.pageSize,
                search:this.searchText,
                sort:this.sortField,
                dir:this.sortDirection,
                type:this.selectedType,
                tab:this.selectedTab
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    result =>
                    {
                        if (seq !== this.loadSeq)
                        {
                            return;
                        }

                        this.rows =
                            result.items.map
                            (
                                (x: any) =>
                                ({
                                    ...x,
                                    DateText:formatPricingDate(x.PricingDate),
                                    TypeText:productPricingType(x.PageType).title,
                                    StatusText:x.Status
                                })
                            );

                        this.pagedRows =
                            this.rows;

                        this.totalRecords =
                            result.totalCount;

                        this.currentPage =
                            result.page || 1;

                        this.counts =
                            result.counts ?? {};

                        this.loading = false;

                        this.cdr.detectChanges();
                    },

                error:
                    () =>
                    {
                        if (seq !== this.loadSeq)
                        {
                            return;
                        }

                        this.loading = false;

                        this.loadFailed = true;

                        this.rows = [];

                        this.pagedRows = [];

                        this.totalRecords = 0;

                        this.counts = {};

                        this.cdr.detectChanges();
                    }
            });
    }

    //===========================================================
    // Filters
    //===========================================================

    onTabChange
    (
        tab:
            string
    ):
        void
    {
        this.selectedTab = tab;

        this.reload();
    }

    onTypeChange
    (
        type:
            string
    ):
        void
    {
        this.selectedType = type;

        this.reload();
    }

    // Search after a short pause in typing
    onSearch
    (
        value:
            string
    ):
        void
    {
        this.searchText = value ?? '';

        if (this.searchTimer)
        {
            clearTimeout(this.searchTimer);
        }

        this.searchTimer =
            window.setTimeout
            (
                () =>
                {
                    this.searchTimer = undefined;

                    this.reload();
                },
                300
            );
    }

    // Documents of a type (search applied) ; '' = all types
    typeCount
    (
        type:
            string
    ):
        number
    {
        return Number(this.counts['Type_' + (type || 'All')] ?? 0);
    }

    // Back to page 1 and load (search, filters, paging on the server)
    private reload():
        void
    {
        this.currentPage = 1;

        this.load();
    }

    onSort
    (
        event:
            { field:string; direction:'asc' | 'desc' }
    ):
        void
    {
        this.sortField = event?.field ?? '';

        this.sortDirection = event?.direction === 'desc' ? 'desc' : 'asc';

        this.reload();
    }

    onPageChange
    (
        page:
            number
    ):
        void
    {
        this.currentPage = page;

        this.load();
    }

    onPageSizeChange
    (
        size:
            number
    ):
        void
    {
        this.pageSize = size;

        this.reload();
    }

    //===========================================================
    // Commands
    //===========================================================

    add():
        void
    {
        this.router.navigate(
            [PRODUCT_PRICING_ROUTE, 'add'],
            this.selectedType ? { queryParams:{ type:this.selectedType } } : {});
    }

    refresh():
        void
    {
        this.searchText = '';

        this.selectedTab = 'all';

        this.selectedType = '';

        this.sortField = '';

        this.currentPage = 1;

        this.load();
    }

    view
    (
        row:
            ProductPricing
    ):
        void
    {
        if
        (
            row?.ProductPricingId
        )
        {
            this.router.navigate([PRODUCT_PRICING_ROUTE, 'view', row.PublicId]);
        }
    }

    // Only a draft is edited; a posted / cancelled one opens to view
    edit
    (
        row:
            ProductPricing
    ):
        void
    {
        if
        (
            !row?.ProductPricingId
        )
        {
            return;
        }

        if
        (
            row.Status !== 'Draft'
        )
        {
            this.toast.info('Edit Not Allowed', `${row.PricingNo} is ${row.Status}. Only a draft can be edited; it opens to view.`);

            this.view(row);

            return;
        }

        this.router.navigate([PRODUCT_PRICING_ROUTE, 'edit', row.PublicId]);
    }

    //===========================================================
    // Delete (draft)
    //===========================================================

    delete
    (
        row:
            ProductPricing
    ):
        void
    {
        if
        (
            this.progress.busy || !row?.ProductPricingId
        )
        {
            return;
        }

        if
        (
            row.Status !== 'Draft'
        )
        {
            this.toast.info('Delete Not Allowed', `${row.PricingNo} is ${row.Status}. Only a draft can be deleted; a posted one is cancelled from its page.`);

            return;
        }

        this.confirmDialog.open
        (
            'Delete Price Change',
            `Are you sure you want to delete draft "${row.PricingNo}"?`,
            () =>
                // Next tick : let the confirm dialog close first
                setTimeout(() => this.deleteRow(row))
        );
    }

    private deleteRow
    (
        row:
            ProductPricing
    ):
        void
    {
        this.progress
            .run(
                'Deleting Price Change',
                `Please wait while "${row.PricingNo}" is being deleted...`,
                'Price change deleted.',
                this.service.delete(row.PublicId ?? ''))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.toast.success('Delete Successful', `${row.PricingNo} deleted successfully.`);

                        this.load();
                    },

                error:
                    err =>
                        this.toast.error('Delete Failed', errorText(err, 'Failed to delete the price change.'))
            });
    }

    //===========================================================
    // Restore (the most recently deleted draft)
    //===========================================================

    restore():
        void
    {
        if
        (
            this.progress.busy
        )
        {
            return;
        }

        this.confirmDialog.open
        (
            'Restore Price Change',
            'Are you sure you want to restore the most recently deleted draft price change?',
            () =>
                setTimeout(() => this.restoreLast()),
            'Restore',
            'Cancel',
            'primary'
        );
    }

    private restoreLast():
        void
    {
        this.progress
            .run(
                'Restoring Price Change',
                'Please wait while the most recently deleted draft is being restored...',
                'Price change restored.',
                this.service.restore())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.toast.success('Restore Successful', 'The most recently deleted draft has been restored.');

                        this.load();
                    },

                error:
                    err =>
                    {
                        if
                        (
                            err?.status === 404
                        )
                        {
                            this.toast.info('No Data to Restore', 'There is no deleted price change draft to restore.');

                            return;
                        }

                        this.toast.error('Restore Failed', errorText(err, 'Failed to restore the price change.'));
                    }
            });
    }

    //===========================================================
    // History
    //===========================================================

    openHistory():
        void
    {
        this.service
            .getHistory()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    rows =>
                    {
                        this.historyItems = (rows ?? []).map(toHistoryItem);

                        this.historyTitle = 'Product Pricing History';

                        this.historyOpened = true;

                        this.cdr.detectChanges();
                    },

                error:
                    () =>
                        this.toast.error('History', 'Failed to load the price change history.')
            });
    }

    closeHistory():
        void
    {
        this.historyOpened = false;

        this.cdr.detectChanges();
    }

    //===========================================================
    // Summary Line (below the canvas) : documents by status
    // (all records, every type)
    //===========================================================

    // Summary : documents by status (type and search applied)
    get summaryTotal():
        number
    {
        return Number(this.counts['All'] ?? 0);
    }

    summaryCount(
        status: string
    ):
        number
    {
        const key =
            Object.keys(this.counts).find(k => k.toLowerCase() === status.toLowerCase());

        return key ? Number(this.counts[key] ?? 0) : 0;
    }

    summaryText(
        value: number
    ):
        string
    {
        return value.toLocaleString('en-US');
    }
}


//===============================================================
// Helpers
//===============================================================

function errorText
(
    err:
        any,
    fallback:
        string
):
    string
{
    const body =
        err?.error;

    return typeof body === 'string' && body.trim()
        ? body.trim()
        : body?.message || body?.title || fallback;
}

// An activity row → a history drawer item
export function toHistoryItem
(
    row:
        any
):
    any
{
    return {
        title:row?.activityTitle ?? row?.ActivityTitle,
        description:row?.activityDescription ?? row?.ActivityDescription,
        user:row?.performedByName ?? row?.PerformedByName ?? 'System',
        dateTime:new Date(row?.performedDate ?? row?.PerformedDate).toLocaleString(),
        badge:row?.activityType ?? row?.ActivityType
    };
}
