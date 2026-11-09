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
    PRODUCT_PRICING_MB_ROUTE,
    PriceCard,
    priceCardDate
}
from '../../../models/product-pricing-motor-bikes.model';

import
{
    ProductPricingMotorBikesService
}
from '../../../services/product-pricing-motor-bikes.service';


// A row with its display texts
type PriceCardRow =
    PriceCard
    &
    {
        FromText:string;
        ToText:string;
        TypeText:string;
        InForceTitle:string;
    };


//===============================================================
// Product Pricing - Motor Bikes list : the price cards (DP / MRP
// per model, per supplier). A draft opens for editing; a posted /
// cancelled card opens to view (cancel). In Force = posted cards
// that decide at least one model today.
//===============================================================

@Component(
{
    selector:'app-product-pricing-motor-bikes-list',

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

    templateUrl:'./product-pricing-motor-bikes-list.html',

    styleUrl:'./product-pricing-motor-bikes-list.css'
})

export class ProductPricingMotorBikesList
    implements OnInit
{
    private readonly service =
        inject(ProductPricingMotorBikesService);

    private readonly router =
        inject(Router);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly toast =
        inject(ToastService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly destroyRef =
        inject(DestroyRef);

    // Progress dialog around delete / restore
    readonly progress =
        new ProgressRunner(inject(ProgressDialogService), () => this.cdr.detectChanges());

    readonly pageTitle =
        'Product Pricing - Motor Bikes';

    //===========================================================
    // History
    //===========================================================

    historyOpened:
        boolean = false;

    historyTitle:
        string = 'Price Card History';

    historyItems:
        any[] = [];

    //===========================================================
    // Tabs
    //===========================================================

    tabs:
        ControlTab[] =
        [
            { id:'all', label:'All' },
            { id:'inforce', label:'In Force' },
            { id:'draft', label:'Draft' },
            { id:'posted', label:'Posted' },
            { id:'superseded', label:'Superseded' },
            { id:'cancelled', label:'Cancelled' }
        ];

    selectedTab:
        string = 'all';

    //===========================================================
    // Data
    //===========================================================

    pagedRows:
        PriceCardRow[] = [];

    totalRecords:
        number = 0;

    counts:
        Record<string, number> = {};

    private sortField:
        string = '';

    private sortDirection:
        'asc' | 'desc' = 'asc';

    private searchTimer?:
        number;

    private loadSeq:
        number = 0;

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
        { header:'Card No', field:'CardNo', width:'190px', align:'left', sortable:true, flagField:'InForce', flagText:'In Force', flagTitleField:'InForceTitle' },
        { header:'Supplier', field:'SupplierName', align:'left', sortable:true },
        { header:'Effective From', field:'FromText', width:'130px', align:'center', sortable:true },
        { header:'Effective To', field:'ToText', width:'130px', align:'center', sortable:true },
        { header:'Models', field:'ProductCount', width:'90px', align:'right', sortable:true },
        { header:'Reference', field:'Reference', width:'170px', align:'left', sortable:true },
        { header:'Status', field:'Status', type:'status', width:'120px', align:'center', sortable:true },
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

                        this.pagedRows =
                            result.items.map
                            (
                                x =>
                                ({
                                    ...x,
                                    // A replaced card shows Superseded
                                    Status:x.Superseded ? 'Superseded' : x.Status,
                                    FromText:priceCardDate(x.EffectiveFrom),
                                    ToText:
                                        x.SupersededFrom
                                            ? `Replaced ${priceCardDate(x.SupersededFrom)}`
                                            : 'Until replaced',
                                    TypeText:x.CardType,
                                    InForceTitle:'The current price card of the supplier'
                                })
                            );

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
                    err =>
                    {
                        if (seq !== this.loadSeq)
                        {
                            return;
                        }

                        this.loading = false;

                        this.loadFailed = true;

                        this.pagedRows = [];

                        this.totalRecords = 0;

                        this.counts = {};

                        this.toast.error(this.pageTitle, errorText(err, 'Failed to load the price cards.'));

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
        const field =
            event?.field ?? '';

        this.sortField = field === 'TypeText' ? 'CardType' : field;

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
        this.router.navigate([PRODUCT_PRICING_MB_ROUTE, 'add']);
    }

    refresh():
        void
    {
        this.searchText = '';

        this.selectedTab = 'all';

        this.sortField = '';

        this.currentPage = 1;

        this.load();
    }

    view
    (
        row:
            PriceCard
    ):
        void
    {
        if (row?.PublicId)
        {
            this.router.navigate([PRODUCT_PRICING_MB_ROUTE, 'view', row.PublicId]);
        }
    }

    // Only a draft is edited; a posted / cancelled card opens to view
    edit
    (
        row:
            PriceCard
    ):
        void
    {
        if (!row?.PublicId)
        {
            return;
        }

        if (row.Status !== 'Draft')
        {
            this.toast.info('Edit Not Allowed', `${row.CardNo} is ${row.Status}. Only a draft can be edited; for new prices add a new card.`);

            this.view(row);

            return;
        }

        this.router.navigate([PRODUCT_PRICING_MB_ROUTE, 'edit', row.PublicId]);
    }

    //===========================================================
    // Delete (draft)
    //===========================================================

    delete
    (
        row:
            PriceCard
    ):
        void
    {
        if (this.progress.busy || !row?.PublicId)
        {
            return;
        }

        if (row.Status !== 'Draft')
        {
            this.toast.info('Delete Not Allowed', `${row.CardNo} is ${row.Status}. Only a draft can be deleted; a posted card is cancelled from its page.`);

            return;
        }

        this.confirmDialog.open
        (
            'Delete Price Card',
            `Are you sure you want to delete draft "${row.CardNo}"?`,
            () =>
                setTimeout(() => this.deleteRow(row))
        );
    }

    private deleteRow
    (
        row:
            PriceCard
    ):
        void
    {
        this.progress
            .run(
                'Deleting Price Card',
                `Please wait while "${row.CardNo}" is being deleted...`,
                'Price card deleted.',
                this.service.delete(row.PublicId))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.toast.success('Delete Successful', `${row.CardNo} deleted successfully.`);

                        this.load();
                    },

                error:
                    err =>
                        this.toast.error('Delete Failed', errorText(err, 'Failed to delete the price card.'))
            });
    }

    //===========================================================
    // Restore (the most recently deleted draft)
    //===========================================================

    restore():
        void
    {
        if (this.progress.busy)
        {
            return;
        }

        this.confirmDialog.open
        (
            'Restore Price Card',
            'Are you sure you want to restore the most recently deleted draft price card?',
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
                'Restoring Price Card',
                'Please wait while the most recently deleted draft is being restored...',
                'Price card restored.',
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
                        if (err?.status === 404)
                        {
                            this.toast.info('No Data to Restore', 'There is no deleted price card draft to restore.');

                            return;
                        }

                        this.toast.error('Restore Failed', errorText(err, 'Failed to restore the price card.'));
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

                        this.historyTitle = 'Price Card History';

                        this.historyOpened = true;

                        this.cdr.detectChanges();
                    },

                error:
                    err =>
                        this.toast.error('History', errorText(err, 'Failed to load the price card history.'))
            });
    }

    closeHistory():
        void
    {
        this.historyOpened = false;

        this.cdr.detectChanges();
    }

    //===========================================================
    // Summary line (search applied)
    //===========================================================

    summaryCount
    (
        key:
            string
    ):
        number
    {
        const found =
            Object.keys(this.counts).find(k => k.toLowerCase() === key.toLowerCase());

        return found ? Number(this.counts[found] ?? 0) : 0;
    }

    summaryText
    (
        value:
            number
    ):
        string
    {
        return value.toLocaleString('en-US');
    }
}


//===============================================================
// Helpers
//===============================================================

export function errorText
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
        : body?.message || body?.Message || body?.title || fallback;
}

// An activity row -> a history drawer item
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
