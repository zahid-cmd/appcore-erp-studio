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
    Subscription
}
from 'rxjs';

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
    ListTableColumn,
    ListTableCellClickEvent
}
from '../../../../../shared/components/layout/list-table/list-table';

import
{
    PaginationComponent
}
from '../../../../../shared/components/controls/pagination/pagination';

import
{
    SearchDropdownComponent
}
from '../../../../../shared/components/controls/search-dropdown/search-dropdown';

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
    formatMoney
}
from '../../../../../shared/components/accounting/accounting.models';

import
{
    AuthenticationStorageService
}
from '../../../../../core/authentication/authentication-storage.service';

//===============================================================
// Inventory Status
//===============================================================

import
{
    INVENTORY_STOCK_PAGE,
    InventoryStockPageConfig
}
from '../inventory-stock.config';

import
{
    InventoryBikeUnit,
    InventoryStockFilter,
    InventoryStockPlace,
    InventoryStockRow,
    InventoryStockWarehouse,
    filterStockRows,
    formatQuantity,
    formatStockDate,
    stockMatches
}
from '../inventory-stock.model';

import
{
    InventoryStockService
}
from '../inventory-stock.service';

import
{
    InventoryStockCardComponent
}
from '../card/inventory-stock-card';

import
{
    saveStockPrintRequest
}
from '../print/inventory-stock.print';


// Tooltip of the figures that open "where the stock is"
const PLACES_TITLE =
    'Show where this stock is';


//===============================================================
// Table rows (display values added)
//===============================================================

type StockRow =
    InventoryStockRow
    &
    {
        InTransitText:string;
        OnHandText:string;
        TotalText:string;
        ReorderText:string;
        AverageCostText:string;
        StockValueText:string;
        BrandCategoryText:string;
    };

type BikeRow =
    InventoryBikeUnit
    &
    {
        StockInDateText:string;
        UnitCostText:string;
    };

// One summary card
interface StockCard
{
    id:InventoryStockFilter;
    label:string;
    icon:string;
    tone:string;
    value:string;
    note:string;
    // 0..1 : the meter under the figure
    share:number;
}

interface Option
{
    label:string;
    value:any;
}

// Where one product's stock is (the row opened under it)
interface PlacesView
{
    loading:boolean;
    error:string;
    rows:InventoryStockPlace[];
    quantity:number;
    value:number;
}


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'inventory-stock-list',

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
        SearchDropdownComponent,
        ToastComponent,
        InventoryStockCardComponent
    ],

    templateUrl:'./inventory-stock-list.html',

    styleUrl:'./inventory-stock-list.css'
})

//===============================================================
// Inventory Status list (Motor Bike Stock / Spare Parts &
// Lubricants Stock / Accessories Stock). The page's config comes
// from its own list file.
//
// Server : branch / warehouse (stock is read again).
// Here   : tab (kind / bikes), summary card, category, search,
//          sort, pages.
//===============================================================

export class InventoryStockList
implements OnInit
{
    readonly page:
        InventoryStockPageConfig =
        inject(INVENTORY_STOCK_PAGE);

    private readonly stockService =
        inject(InventoryStockService);

    private readonly authStorage =
        inject(AuthenticationStorageService);

    private readonly toast =
        inject(ToastService);

    private readonly router =
        inject(Router);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly destroyRef =
        inject(DestroyRef);

    //===========================================================
    // Tabs
    //===========================================================

    readonly tabs:
        ControlTab[] =
        this.page.tabs.map(x => ({ id:x.id, label:x.label }));

    selectedTab:
        string =
        this.page.tabs[0]?.id ?? '';

    get isBikesTab():
        boolean
    {
        return this.selectedTab === 'bikes';
    }

    private get tabKind():
        string
    {
        return this.page.tabs.find(x => x.id === this.selectedTab)?.kind ?? '';
    }

    //===========================================================
    // Data
    //===========================================================

    rows:
        StockRow[] =
        [];

    filteredRows:
        StockRow[] =
        [];

    pagedRows:
        StockRow[] =
        [];

    bikes:
        BikeRow[] =
        [];

    filteredBikes:
        BikeRow[] =
        [];

    pagedBikes:
        BikeRow[] =
        [];

    canViewCost:
        boolean =
        false;

    asOf:
        string =
        '';

    loading:
        boolean =
        false;

    loadFailed:
        boolean =
        false;

    private bikesLoaded:
        boolean =
        false;

    private request?:
        Subscription;

    private bikeRequest?:
        Subscription;

    //===========================================================
    // Filters
    //===========================================================

    searchText:
        string =
        '';

    filter:
        InventoryStockFilter =
        'all';

    selectedCategory:
        string =
        '';

    branchId:
        number =
        0;

    warehouseId:
        number =
        0;

    // Stable arrays (search-dropdown needs them stable)
    branchItems:
        Option[] =
        [{ label:'All Branches', value:0 }];

    warehouseItems:
        Option[] =
        [{ label:'All Warehouses', value:0 }];

    categoryItems:
        Option[] =
        [{ label:'All Categories', value:'' }];

    private warehouses:
        InventoryStockWarehouse[] =
        [];

    //===========================================================
    // Summary cards
    //===========================================================

    cards:
        StockCard[] =
        [];

    bikeCards:
        { label:string; tone:string; value:string; share:number }[] =
        [];

    // yyyy-MM-dd → 31-Oct-2026
    get asOfText():
        string
    {
        return formatStockDate(this.asOf);
    }

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
    // Stock card (side panel)
    //===========================================================

    cardProductId:
        number | null =
        null;

    //===========================================================
    // Where the stock is : a row opened under the product (a
    // click on On Hand / Total / Stock Value; click again to
    // close). One at a time.
    //===========================================================

    placesProductId:
        number | null =
        null;

    placesView:
        PlacesView | null =
        null;

    private placesRequest?:
        Subscription;

    // MB has no racks : no Rack · Shelf column
    get placesShowRack():
        boolean
    {
        return this.page.pageType !== 'MB';
    }

    onFigureClick
    (
        event:
            ListTableCellClickEvent
    ):
        void
    {
        const id =
            Number(event?.row?.ProductId) || 0;

        if
        (
            !id || this.isBikesTab
        )
        {
            return;
        }

        if
        (
            this.placesProductId === id
        )
        {
            this.closePlaces();

            this.cdr.detectChanges();

            return;
        }

        this.placesRequest?.unsubscribe();

        this.placesProductId =
            id;

        this.placesView =
            { loading:true, error:'', rows:[], quantity:0, value:0 };

        this.cdr.detectChanges();

        this.placesRequest =
            this.stockService
                .getCard(
                    this.page.apiPath,
                    id,
                    this.branchId,
                    this.warehouseId
                )
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe
                ({
                    next:
                        card =>
                        {
                            const rows =
                                card.Places ?? [];

                            this.placesView =
                            {
                                loading:false,
                                error:'',
                                rows,
                                quantity:rows.reduce((t, x) => t + (Number(x.Quantity) || 0), 0),
                                value:rows.reduce((t, x) => t + (Number(x.Value) || 0), 0)
                            };

                            this.cdr.detectChanges();
                        },

                    error:
                        () =>
                        {
                            this.placesView =
                                { loading:false, error:'The locations could not be loaded.', rows:[], quantity:0, value:0 };

                            this.cdr.detectChanges();
                        }
                });
    }

    closePlaces():
        void
    {
        this.placesRequest?.unsubscribe();

        this.placesProductId =
            null;

        this.placesView =
            null;
    }

    // Close button of the opened row
    onPlacesClose():
        void
    {
        this.closePlaces();

        this.cdr.detectChanges();
    }

    placeQty
    (
        value:
            number
    ):
        string
    {
        return formatQuantity(value);
    }

    placeMoney
    (
        value:
            number
    ):
        string
    {
        return formatMoney(value);
    }

    //===========================================================
    // Page canvas
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
    // Columns (cost columns only with View Cost)
    //===========================================================

    stockColumns:
        ListTableColumn[] =
        [];

    bikeColumns:
        ListTableColumn[] =
        [];

    get columns():
        ListTableColumn[]
    {
        return this.isBikesTab
            ? this.bikeColumns
            : this.stockColumns;
    }

    get tableRows():
        any[]
    {
        return this.isBikesTab
            ? this.pagedBikes
            : this.pagedRows;
    }

    get totalRecords():
        number
    {
        return this.isBikesTab
            ? this.filteredBikes.length
            : this.filteredRows.length;
    }

    get searchPlaceholder():
        string
    {
        return this.isBikesTab
            ? 'Search chassis, engine, key, battery, model...'
            : this.page.pageType === 'MB'
                ? 'Search model, code, colour, brand...'
                : 'Search code, part no, name, location...';
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        const user =
            this.authStorage.getUser() as any;

        this.branchId =
            Number(user?.branchId) || 0;

        this.buildColumns();

        this.load();
    }

    //===========================================================
    // Load (server : branch / warehouse)
    //===========================================================

    load():
        void
    {
        this.request?.unsubscribe();

        this.closePlaces();

        this.loading =
            true;

        this.loadFailed =
            false;

        this.cdr.detectChanges();

        this.request =
            this.stockService
                .getStock(
                    this.page.apiPath,
                    this.branchId,
                    this.warehouseId
                )
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe
                ({
                    next:
                        result =>
                        {
                            this.loading =
                                false;

                            this.asOf =
                                result.AsOf;

                            this.canViewCost =
                                result.CanViewCost;

                            this.buildOptions(
                                result.Branches,
                                result.Warehouses
                            );

                            // Login branch not in the list : all
                            if
                            (
                                this.branchId
                                &&
                                !result.Branches.some(x => x.Id === this.branchId)
                            )
                            {
                                this.branchId =
                                    0;
                            }

                            this.rows =
                                result.Rows.map(x => this.toStockRow(x));

                            this.categoryItems =
                            [
                                { label:'All Categories', value:'' },
                                ...Array.from(new Set(this.rows.map(x => x.CategoryName).filter(x => !!x)))
                                    .sort()
                                    .map(x => ({ label:x, value:x }))
                            ];

                            if
                            (
                                this.selectedCategory
                                &&
                                !this.categoryItems.some(x => x.value === this.selectedCategory)
                            )
                            {
                                this.selectedCategory =
                                    '';
                            }

                            this.buildColumns();

                            this.applyFilters();
                        },

                    error:
                        error =>
                        {
                            this.loading =
                                false;

                            this.loadFailed =
                                true;

                            this.rows =
                                [];

                            this.applyFilters();

                            this.toast.error(
                                'Load Failed',
                                typeof error?.error === 'string'
                                    ? error.error
                                    : 'The stock could not be loaded.'
                            );
                        }
                });
    }

    // MB : bikes of the branch (search filters here)
    private loadBikes():
        void
    {
        this.bikeRequest?.unsubscribe();

        this.loading =
            true;

        this.loadFailed =
            false;

        this.cdr.detectChanges();

        this.bikeRequest =
            this.stockService
                .getBikes(
                    this.page.apiPath,
                    this.branchId,
                    ''
                )
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe
                ({
                    next:
                        result =>
                        {
                            this.loading =
                                false;

                            this.bikesLoaded =
                                true;

                            this.canViewCost =
                                result.CanViewCost;

                            this.bikes =
                                result.Rows.map
                                (
                                    x =>
                                    ({
                                        ...x,
                                        StockInDateText:formatStockDate(x.StockInDate),
                                        UnitCostText:this.canViewCost ? formatMoney(x.UnitCost) : ''
                                    })
                                );

                            this.buildColumns();

                            this.applyFilters();
                        },

                    error:
                        () =>
                        {
                            this.loading =
                                false;

                            this.loadFailed =
                                true;

                            this.bikes =
                                [];

                            this.applyFilters();
                        }
                });
    }

    refresh():
        void
    {
        if
        (
            this.isBikesTab
        )
        {
            this.loadBikes();
        }

        this.load();
    }

    //===========================================================
    // Options
    //===========================================================

    private buildOptions
    (
        branches:
            { Id:number; Name:string }[],
        warehouses:
            InventoryStockWarehouse[]
    ):
        void
    {
        this.branchItems =
        [
            { label:'All Branches', value:0 },
            ...branches.map(x => ({ label:x.Name, value:x.Id }))
        ];

        this.warehouses =
            warehouses;

        this.buildWarehouseItems();
    }

    private buildWarehouseItems():
        void
    {
        this.warehouseItems =
        [
            { label:'All Warehouses', value:0 },
            ...this.warehouses
                .filter(x => !this.branchId || x.BranchId === this.branchId)
                .map(x => ({ label:x.Name, value:x.Id }))
        ];

        if
        (
            this.warehouseId
            &&
            !this.warehouseItems.some(x => x.value === this.warehouseId)
        )
        {
            this.warehouseId =
                0;
        }
    }

    //===========================================================
    // Rows
    //===========================================================

    private toStockRow
    (
        row:
            InventoryStockRow
    ):
        StockRow
    {
        return {
            ...row,
            InTransitText:row.InTransit ? formatQuantity(row.InTransit) : '–',
            OnHandText:formatQuantity(row.OnHand),
            TotalText:formatQuantity(row.Total),
            ReorderText:row.ReorderLevel > 0 ? formatQuantity(row.ReorderLevel) : '–',
            AverageCostText:row.Total > 0 ? formatMoney(row.AverageCost) : '–',
            StockValueText:row.Total > 0 ? formatMoney(row.StockValue) : '–',
            BrandCategoryText:[row.BrandName, row.CategoryName].filter(x => !!x).join(' · ')
        };
    }

    //===========================================================
    // Columns
    //===========================================================

    private buildColumns():
        void
    {
        const page =
            this.page;

        const cost:
            ListTableColumn[] =
            this.canViewCost
                ? [
                    { header:'Avg. Cost', field:'AverageCostText', width:'115px', align:'right', sortable:true },
                    { header:'Stock Value', field:'StockValueText', width:'125px', align:'right', sortable:true, link:true, linkTitle:PLACES_TITLE }
                ]
                : [];

        const quantities:
            ListTableColumn[] =
        [
            { header:'In Transit', field:'InTransitText', width:'95px', align:'right', sortable:true },
            { header:'On Hand', field:'OnHandText', width:'90px', align:'right', sortable:true, link:true, linkTitle:PLACES_TITLE },
            { header:'Total', field:'TotalText', width:'75px', align:'right', sortable:true, link:true, linkTitle:PLACES_TITLE },
            { header:'Re-order', field:'ReorderText', width:'85px', align:'right', sortable:true }
        ];

        const product:
            ListTableColumn[] =
            page.pageType === 'MB'
                ? [
                    { header:'Code', field:'ProductCode', width:'145px', align:'center', sortable:true },
                    { header:'Model', field:'ItemName', width:'200px', align:'left', sortable:true },
                    { header:'Colour', field:'ColorName', width:'90px', align:'left', sortable:true },
                    { header:'Brand · Category', field:'BrandCategoryText', width:'210px', align:'left', sortable:true }
                ]
                : [
                    { header:'Code', field:'ProductCode', width:'150px', align:'center', sortable:true },
                    { header:'Part No', field:'PartNumber', width:'120px', align:'left', sortable:true },
                    { header:page.productHeader, field:'ItemName', width:'210px', align:'left', sortable:true },
                    { header:'Category', field:'CategoryName', width:'140px', align:'left', sortable:true },
                    { header:'Location', field:'Location', width:'110px', align:'left', sortable:true }
                ];

        this.stockColumns =
        [
            { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
            ...product,
            ...quantities,
            ...cost,
            { header:'Status', field:'StockStatus', type:'status', width:'135px', align:'center', sortable:true },
            { header:'Card', field:'actions', type:'actions', width:'70px', align:'center' }
        ];

        this.bikeColumns =
        [
            { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
            { header:'Chassis No', field:'ChassisNo', width:'180px', align:'left', sortable:true },
            { header:'Engine No', field:'EngineNo', width:'160px', align:'left', sortable:true },
            { header:'Key No', field:'KeyNo', width:'90px', align:'left', sortable:true },
            { header:'Battery No', field:'BatteryNo', width:'110px', align:'left', sortable:true },
            { header:'Model', field:'ProductName', width:'190px', align:'left', sortable:true },
            { header:'Purchase No', field:'PurchaseNo', width:'180px', align:'center', sortable:true },
            { header:'Stock In', field:'StockInDateText', width:'100px', align:'center', sortable:true },
            ...(this.canViewCost
                ? [{ header:'Unit Cost', field:'UnitCostText', width:'120px', align:'right', sortable:true } as ListTableColumn]
                : []),
            { header:'Status', field:'Status', type:'status', width:'145px', align:'center', sortable:true },
            { header:'Card', field:'actions', type:'actions', width:'70px', align:'center' }
        ];
    }

    //===========================================================
    // Filters (here)
    //===========================================================

    applyFilters
    (
        keepPage:
            boolean =
            false
    ):
        void
    {
        const kindRows =
            this.rows.filter(x => !this.tabKind || x.ProductKind === this.tabKind);

        this.filteredRows =
            filterStockRows(
                kindRows,
                {
                    kind:'',
                    filter:this.filter,
                    category:this.selectedCategory,
                    search:this.searchText
                }
            ) as StockRow[];

        const text =
            this.searchText.trim().toLowerCase();

        this.filteredBikes =
            this.bikes.filter
            (
                x =>
                    !text
                    ||
                    [x.ChassisNo, x.EngineNo, x.KeyNo, x.BatteryNo, x.ProductCode, x.ProductName, x.PurchaseNo, x.Status]
                        .some(value => String(value ?? '').toLowerCase().includes(text))
            );

        this.buildCards(kindRows);

        if
        (
            !keepPage
        )
        {
            this.currentPage =
                1;
        }

        this.paginate();
    }

    private buildCards
    (
        rows:
            InventoryStockRow[]
    ):
        void
    {
        const sum =
            (list: InventoryStockRow[], pick: (x: InventoryStockRow) => number) =>
                list.reduce((total, x) => total + (pick(x) || 0), 0);

        const stocked =
            rows.filter(x => stockMatches(x, 'all'));

        const valueNote =
            (list: InventoryStockRow[]) =>
                this.canViewCost
                    ? `Tk ${formatMoney(sum(list, x => x.StockValue))}`
                    : `${formatQuantity(sum(list, x => x.Total))} units`;

        const onHand =
            rows.filter(x => stockMatches(x, 'in-stock'));

        const transit =
            rows.filter(x => stockMatches(x, 'transit'));

        const low =
            rows.filter(x => stockMatches(x, 'low'));

        const out =
            rows.filter(x => stockMatches(x, 'out'));

        const word =
            this.page.itemWord;

        const ratio =
            (part: number, whole: number) =>
                whole > 0
                    ? Math.max(0, Math.min(1, part / whole))
                    : 0;

        const totalUnits =
            sum(stocked, x => x.Total);

        const active =
            rows.filter(x => x.IsActive).length;

        this.cards =
        [
            {
                id:'all',
                label:'Stocked',
                icon:'fas fa-boxes-stacked',
                tone:'navy',
                value:`${stocked.length} ${word}${stocked.length === 1 ? '' : 's'}`,
                note:valueNote(stocked),
                share:ratio(stocked.length, rows.length)
            },
            {
                id:'in-stock',
                label:'On Hand',
                icon:'fas fa-warehouse',
                tone:'green',
                value:formatQuantity(sum(onHand, x => x.OnHand)),
                note:`${onHand.length} ${word}${onHand.length === 1 ? '' : 's'}`,
                share:ratio(sum(onHand, x => x.OnHand), totalUnits)
            },
            {
                id:'transit',
                label:'In Transit',
                icon:'fas fa-truck-fast',
                tone:'blue',
                value:formatQuantity(sum(transit, x => x.InTransit)),
                note:`${transit.length} ${word}${transit.length === 1 ? '' : 's'}`,
                share:ratio(sum(transit, x => x.InTransit), totalUnits)
            },
            {
                id:'low',
                label:'Low Stock',
                icon:'fas fa-arrow-trend-down',
                tone:'amber',
                value:String(low.length),
                note:'≤ re-order level',
                share:ratio(low.length, stocked.length)
            },
            {
                id:'out',
                label:'Out of Stock',
                icon:'fas fa-circle-xmark',
                tone:'red',
                value:String(out.length),
                note:`active ${word}s`,
                share:ratio(out.length, active)
            }
        ];

        const bikes =
            this.bikes;

        const bikesIn =
            bikes.filter(x => x.Status === 'In Stock').length;

        const bikesTransit =
            bikes.filter(x => x.Status === 'In Transit' || x.Status === 'Partly Received').length;

        this.bikeCards =
        [
            { label:'Bikes', tone:'navy', value:String(bikes.length), share:bikes.length ? 1 : 0 },
            { label:'In Stock', tone:'green', value:String(bikesIn), share:ratio(bikesIn, bikes.length) },
            { label:'In Transit', tone:'blue', value:String(bikesTransit), share:ratio(bikesTransit, bikes.length) }
        ];
    }

    private paginate():
        void
    {
        const start =
            (this.currentPage - 1) * this.pageSize;

        this.pagedRows =
            this.filteredRows.slice(start, start + this.pageSize);

        // The opened row left the page : close it
        if
        (
            this.placesProductId
            &&
            !this.pagedRows.some(x => x.ProductId === this.placesProductId)
        )
        {
            this.closePlaces();
        }

        this.pagedBikes =
            this.filteredBikes.slice(start, start + this.pageSize);

        this.cdr.detectChanges();
    }

    //===========================================================
    // Events
    //===========================================================

    onTabChange
    (
        tab:
            string
    ):
        void
    {
        this.selectedTab =
            tab;

        this.cardProductId =
            null;

        this.closePlaces();

        if
        (
            this.isBikesTab
            &&
            !this.bikesLoaded
        )
        {
            this.loadBikes();
        }

        this.applyFilters();
    }

    onSearch
    (
        text:
            string
    ):
        void
    {
        this.searchText =
            text ?? '';

        this.applyFilters();
    }

    onCardClick
    (
        id:
            InventoryStockFilter
    ):
        void
    {
        this.filter =
            this.filter === id && id !== 'all'
                ? 'all'
                : id;

        this.applyFilters();
    }

    onCategoryChange
    (
        value:
            any
    ):
        void
    {
        this.selectedCategory =
            value ?? '';

        this.applyFilters();
    }

    onBranchChange
    (
        value:
            any
    ):
        void
    {
        this.branchId =
            Number(value) || 0;

        this.buildWarehouseItems();

        this.cardProductId =
            null;

        this.bikesLoaded =
            false;

        if
        (
            this.isBikesTab
        )
        {
            this.loadBikes();
        }

        this.load();
    }

    onWarehouseChange
    (
        value:
            any
    ):
        void
    {
        this.warehouseId =
            Number(value) || 0;

        this.cardProductId =
            null;

        this.load();
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

        this.paginate();
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

        this.paginate();
    }

    onSort
    (
        event:
        {
            field:string;
            direction:'asc' | 'desc';
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
            InTransitText:'InTransit',
            OnHandText:'OnHand',
            TotalText:'Total',
            ReorderText:'ReorderLevel',
            AverageCostText:'AverageCost',
            StockValueText:'StockValue',
            StockInDateText:'StockInDate',
            UnitCostText:'UnitCost'
        };

        const field =
            raw[event.field] ?? event.field;

        const compare =
            (a: any, b: any): number =>
            {
                const x =
                    a[field];

                const y =
                    b[field];

                if
                (
                    typeof x === 'number'
                    &&
                    typeof y === 'number'
                )
                {
                    return (x - y) * direction;
                }

                return String(x ?? '').localeCompare(String(y ?? ''), undefined, { numeric:true }) * direction;
            };

        if
        (
            this.isBikesTab
        )
        {
            this.filteredBikes =
                [...this.filteredBikes].sort(compare);
        }
        else
        {
            this.filteredRows =
                [...this.filteredRows].sort(compare);
        }

        this.paginate();
    }

    //===========================================================
    // Stock card
    //===========================================================

    openCard
    (
        row:
            any
    ):
        void
    {
        const id =
            Number(row?.ProductId) || 0;

        if
        (
            id > 0
        )
        {
            this.cardProductId =
                id;

            this.cdr.detectChanges();
        }
    }

    closeCard():
        void
    {
        this.cardProductId =
            null;

        this.cdr.detectChanges();
    }

    //===========================================================
    // Print : the list as filtered here (Print Viewer, new tab)
    //===========================================================

    print():
        void
    {
        const token =
            saveStockPrintRequest(
                {
                    pageType:this.page.pageType,
                    branchId:this.branchId,
                    warehouseId:this.warehouseId,
                    branchName:this.branchItems.find(x => x.value === this.branchId)?.label ?? 'All Branches',
                    warehouseName:this.warehouseItems.find(x => x.value === this.warehouseId)?.label ?? 'All Warehouses',
                    tab:this.selectedTab,
                    tabLabel:this.page.tabs.find(x => x.id === this.selectedTab)?.label ?? '',
                    kind:this.tabKind,
                    filter:this.filter,
                    filterLabel:this.cards.find(x => x.id === this.filter)?.label ?? '',
                    category:this.selectedCategory,
                    search:this.searchText
                }
            );

        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(
                    ['/print-viewer', this.page.printKey, token],
                    {
                        // Portrait first; the viewer's document list
                        // switches to Landscape
                        queryParams:{ doc:this.isBikesTab ? 'bike-units' : 'stock-position' }
                    }
                )
            );

        // Not "noopener" : the new tab keeps this session's login
        const tab =
            window.open(
                url,
                '_blank'
            );

        if
        (
            !tab
        )
        {
            this.toast.error(
                'Print Failed',
                'The browser blocked the print tab. Allow pop-ups for this site.'
            );
        }
    }
}
