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
    receivingConfig
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
        // Purchase no, with "(on purchase)" when the purchase made it
        PurchaseText:string;
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
            { header:'Purchase', field:'PurchaseText', width:'230px', align:'center', sortable:true },
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

        const seq =
            ++this.loadSeq;

        this.cdr.detectChanges();

        this.service
            .getPaged
            (
                this.page.path,
                {
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
                        this.selectedTab
                }
            )
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

                        this.rows =
                            result.items.map(x => this.toRow(x));

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
                        if
                        (
                            seq !== this.loadSeq
                        )
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

    // A list row with its display texts
    private toRow
    (
        x:
            any
    ):
        ReceivingRow
    {
        return ({
            ...x,
            DateText:formatReceivingDate(x.ReceivingDate),
            QuantityText:formatReceivingQty(x.TotalQuantity),
            DocumentText:[x.SupplierInvoiceNo, x.MushakNo].filter(v => !!v).join(' · '),
            PurchaseText:x.ReceivedOn === 'Purchase'
                ? `${x.PurchaseNo} (on purchase)`
                : x.PurchaseNo
        });
    }

    //===========================================================
    // Filters (tab / type / search / sort / page on the server)
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

    // Search after a short pause in typing
    onSearch
    (
        value:
            string
    ):
        void
    {
        this.searchText = value ?? '';

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
                    this.searchTimer = undefined;

                    this.reload();
                },
                300
            );
    }

    // Back to page 1 and load
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
    // Summary Line (below the canvas) : documents by status
    // (search applied)
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
        return this.searchText.trim()
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

        this.sortField = '';

        this.currentPage = 1;

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
            this.router.navigate([this.page.route, 'view', row.PublicId]);
        }
    }
}
