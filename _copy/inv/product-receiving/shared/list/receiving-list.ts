//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    DestroyRef,
    Input,
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
    AuthenticationStorageService
}
from '../../../../../core/authentication/authentication-storage.service';

import
{
    Receiving,
    ReceivingPageConfig,
    formatReceivingDate,
    formatReceivingQty,
    receivingConfig,
    receivingMatches
}
from '../receiving.model';

import
{
    ReceivingService
}
from '../receiving.service';


// A row with its display texts
type ReceivingRow =
    Receiving
    &
    {
        DateText:string;
        QuantityText:string;
        DocumentText:string;
    };


//===============================================================
// Product Receiving list : one page type (wrapper gives it).
// Receivings are posted on save; a row opens the receiving
// (view, print, cancel). "Waiting" on the tab : posted purchases
// of the login branch with stock still in transit.
//===============================================================

@Component(
{
    selector:'receiving-list',

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
        ToastComponent
    ],

    templateUrl:'./receiving-list.html',

    styleUrl:'./receiving-list.css'
})

export class ReceivingList
    implements OnInit
{
    private readonly service =
        inject(ReceivingService);

    private readonly router =
        inject(Router);

    private readonly toast =
        inject(ToastService);

    private readonly authStorage =
        inject(AuthenticationStorageService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly destroyRef =
        inject(DestroyRef);

    // MB / SP / AC (page wrapper)
    @Input({ required:true })
    type!:
        string;

    page!:
        ReceivingPageConfig;

    //===========================================================
    // Tabs : All / Posted / Cancelled
    //===========================================================

    tabs:
        ControlTab[] = [];

    selectedTab:
        string = 'all';

    //===========================================================
    // Data
    //===========================================================

    rows:
        ReceivingRow[] = [];

    filteredRows:
        ReceivingRow[] = [];

    pagedRows:
        ReceivingRow[] = [];

    waiting:
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

    columns:
        ListTableColumn[] = [];

    //===========================================================
    // Start
    //===========================================================

    ngOnInit():
        void
    {
        this.page =
            receivingConfig(this.type);

        this.columns =
        [
            { header:'#', field:'serial', type:'serial', width:'55px', align:'center' },
            { header:'Receiving No', field:'ReceivingNo', width:'210px', align:'center', sortable:true },
            { header:'Date', field:'DateText', width:'135px', align:'center', sortable:true },
            { header:'Purchase', field:'PurchaseNo', width:'200px', align:'center', sortable:true },
            { header:'Supplier', field:'SupplierName', align:'left', sortable:true },
            { header:'Invoice / 6.3', field:'DocumentText', width:'170px', align:'left', sortable:true },
            { header:'Warehouse', field:'WarehouseName', width:'160px', align:'left', sortable:true },
            { header:'Lines', field:'LineCount', width:'70px', align:'right', sortable:true },
            { header:'Quantity', field:'QuantityText', width:'95px', align:'right', sortable:true },
            { header:'Status', field:'Status', type:'status', width:'140px', align:'center', sortable:true },
            { header:'Actions', field:'actions', type:'actions', width:'80px', align:'center' }
        ];

        this.load();
    }

    private get branchId():
        number
    {
        const user =
            this.authStorage.getUser() as any;

        return Number(user?.branchId) || 0;
    }

    load():
        void
    {
        this.loading = true;

        this.loadFailed = false;

        this.cdr.detectChanges();

        this.service
            .getAll(this.page.path)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    rows =>
                    {
                        this.rows =
                            rows.map
                            (
                                x =>
                                ({
                                    ...x,
                                    DateText:formatReceivingDate(x.ReceivingDate),
                                    QuantityText:formatReceivingQty(x.TotalQuantity),
                                    DocumentText:[x.SupplierInvoiceNo, x.MushakNo].filter(v => !!v).join(' · ')
                                })
                            );

                        this.loading = false;

                        this.applyFilters();
                    },

                error:
                    () =>
                    {
                        this.loading = false;

                        this.loadFailed = true;

                        this.rows = [];

                        this.applyFilters();
                    }
            });

        // Purchases waiting (tab label)
        this.service
            .getPendingPurchases(this.page.path, this.branchId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    list =>
                    {
                        this.waiting = list.length;

                        this.buildTabs();

                        this.cdr.detectChanges();
                    },

                error:
                    () =>
                    {
                        this.waiting = 0;

                        this.buildTabs();
                    }
            });

        this.buildTabs();
    }

    private buildTabs():
        void
    {
        this.tabs =
        [
            { id:'all', label:`All Receivings` },
            { id:'posted', label:'Posted' },
            { id:'cancelled', label:'Cancelled' }
        ];
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

        this.applyFilters();
    }

    onSearch
    (
        value:
            string
    ):
        void
    {
        this.searchText = value ?? '';

        this.applyFilters();
    }

    private applyFilters():
        void
    {
        this.filteredRows =
            this.rows.filter
            (
                x =>
                    (this.selectedTab === 'all' || x.Status.toLowerCase() === this.selectedTab)
                    &&
                    receivingMatches(x, this.searchText)
            );

        this.currentPage = 1;

        this.paginate();
    }

    onSort
    (
        event:
            { field:string; direction:'asc' | 'desc' }
    ):
        void
    {
        const field =
            event.field === 'DateText'
                ? 'ReceivingDate'
                : event.field === 'QuantityText'
                    ? 'TotalQuantity'
                    : event.field;

        const sign =
            event.direction === 'asc' ? 1 : -1;

        this.filteredRows =
            [...this.filteredRows].sort
            (
                (a: any, b: any) =>
                {
                    const x = a[field];

                    const y = b[field];

                    return (typeof x === 'number' && typeof y === 'number'
                        ? x - y
                        : String(x ?? '').localeCompare(String(y ?? ''))) * sign;
                }
            );

        this.paginate();
    }

    onPageChange
    (
        page:
            number
    ):
        void
    {
        this.currentPage = page;

        this.paginate();
    }

    onPageSizeChange
    (
        size:
            number
    ):
        void
    {
        this.pageSize = size;

        this.currentPage = 1;

        this.paginate();
    }

    private paginate():
        void
    {
        const start =
            (this.currentPage - 1) * this.pageSize;

        this.pagedRows =
            this.filteredRows.slice(start, start + this.pageSize);

        this.cdr.detectChanges();
    }

    //===========================================================
    // Commands
    //===========================================================

    add():
        void
    {
        this.router.navigate([this.page.route, 'add']);
    }

    refresh():
        void
    {
        this.searchText = '';

        this.selectedTab = 'all';

        this.load();
    }

    view
    (
        row:
            Receiving
    ):
        void
    {
        if
        (
            row?.ReceivingId
        )
        {
            this.router.navigate([this.page.route, 'view', row.ReceivingId]);
        }
    }
}
