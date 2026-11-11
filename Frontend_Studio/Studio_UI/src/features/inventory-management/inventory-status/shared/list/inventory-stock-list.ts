//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    DestroyRef,
    OnInit,
    effect,
    inject
}
from '@angular/core';

import
{
    MotorPowerService
}
from '../../../../../core/motor-power/motor-power.service';

import
{
    environment
}
from '../../../../../environments/environment';

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
    Subject,
    Subscription,
    catchError,
    debounceTime,
    of,
    switchMap
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
    ListTableCellClickEvent,
    ListTableRowAction,
    ListTableRowActionEvent
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
    DatepickerComponent
}
from '../../../../../shared/components/controls/datepicker/datepicker';

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
    HistoryDrawerComponent
}
from '../../../../../shared/components/utilities/history-drawer/history-drawer';

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
    InventoryStockPageConfig,
    STOCK_AC_PAGE
}
from '../inventory-stock.config';

import
{
    InventoryBikeNumberField,
    InventoryBikeNumbers,
    InventoryBikeNumberTaken,
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
        OpeningText:string;
        PurchaseText:string;
        SalesText:string;
        InTransitText:string;
        OnHandText:string;
        TotalText:string;
        ReorderText:string;
        AverageCostText:string;
        StockValueText:string;
        AverageCostVatText:string;
        StockValueVatText:string;
        BrandCategoryText:string;
        ImageUrl:string;
        // Colour icon (Motor Bikes) : CSS colour from the name
        ColorHex:string;
    };

type BikeRow =
    InventoryBikeUnit
    &
    {
        StockInDateText:string;
        UnitCostText:string;
        // Colour icon : CSS colour from the name
        ColorHex:string;
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
        DatepickerComponent,
        ToastComponent,
        HistoryDrawerComponent,
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

    // Electric bikes : "Motor No" instead of "Engine No"
    readonly power =
        inject(MotorPowerService);

    // The list arrives before / after the electric bikes : the
    // number heading follows them
    private readonly powerWatch =
        effect
        (
            () =>
            {
                this.power.electricIds();

                if ((this.bikes ?? []).length > 0)
                {
                    this.buildColumns();

                    this.cdr.detectChanges();
                }
            }
        );

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

    // MB : Free Accessories tab (Additional / Promotional
    // Accessories products)
    get isAccessoriesTab():
        boolean
    {
        return !!this.page.tabs.find(x => x.id === this.selectedTab)?.accessories;
    }

    private get hasAccessoriesTab():
        boolean
    {
        return this.page.tabs.some(x => !!x.accessories);
    }

    private get accessoriesApiPath():
        string
    {
        return `${this.page.apiPath}/bike-accessories`;
    }

    // The card of a free accessory reads the Accessories stock
    // through the Motor Bike Stock page
    cardIsAccessory:
        boolean =
        false;

    get cardPage():
        InventoryStockPageConfig
    {
        return this.cardIsAccessory
            ? { ...STOCK_AC_PAGE, apiPath:this.accessoriesApiPath }
            : this.page;
    }

    private accessoryRequest?:
        Subscription;

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

    // Second page action : cost incl. VAT columns
    canViewCostVat:
        boolean =
        false;

    asOf:
        string =
        '';

    // Period of Opening / Purchase / Sales : the running
    // calendar month on load
    fromDate:
        Date =
        monthStart();

    toDate:
        Date =
        monthEnd();

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
        return this.page.pageType !== 'MB' || this.isAccessoriesTab;
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
                    this.isAccessoriesTab ? this.accessoriesApiPath : this.page.apiPath,
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

    accessoryColumns:
        ListTableColumn[] =
        [];

    get columns():
        ListTableColumn[]
    {
        return this.isBikesTab
            ? this.bikeColumns
            : this.isAccessoriesTab
                ? this.accessoryColumns
                : this.stockColumns;
    }

    get tableRows():
        any[]
    {
        return this.isBikesTab
            ? this.pagedBikes
            : this.pagedRows;
    }

    // Page Total / Grand Total rows (Models tab) : pinned under
    // the table, above the pager. Grand = every row matching the
    // filters and search.
    footerRows:
        any[] =
        [];

    private buildFooter():
        void
    {
        if (this.isBikesTab || this.filteredRows.length === 0)
        {
            this.footerRows = [];

            return;
        }

        const word =
            this.page.pageType === 'MB' && !this.isAccessoriesTab ? 'model' : 'item';

        const totals =
            (rows: StockRow[], label: string, grand: boolean) =>
            {
                const sum =
                    (pick: (x: StockRow) => number) =>
                        rows.reduce((a, x) => a + (pick(x) || 0), 0);

                return {
                    grand,
                    ItemName:`${label} · ${rows.length} ${word}${rows.length === 1 ? '' : 's'}`,
                    OpeningText:formatQuantity(sum(x => x.OpeningQty)),
                    PurchaseText:formatQuantity(sum(x => x.PurchaseQty)),
                    SalesText:formatQuantity(sum(x => x.SalesQty)),
                    InTransitText:formatQuantity(sum(x => x.InTransit)),
                    OnHandText:formatQuantity(sum(x => x.OnHand)),
                    TotalText:formatQuantity(sum(x => x.Total)),
                    StockValueText:this.canViewCost ? formatMoney(sum(x => x.StockValue)) : ''
                };
            };

        this.footerRows =
        [
            totals(this.pagedRows, 'Page Total', false),
            totals(this.filteredRows, 'Grand Total', true)
        ];
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
        this.power.load();

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
                    this.warehouseId,
                    isoDate(this.fromDate),
                    isoDate(this.toDate)
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

                            this.canViewCostVat =
                                !!result.CanViewCostVat;

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

                            // MB : the free accessories join the rows
                            // (their own tab)
                            this.loadAccessories();
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

                            // Edit Bike Numbers : pencil per row
                            this.canEditNumbers =
                                result.CanEditNumbers;

                            this.canEditSold =
                                result.CanEditSold;

                            this.keyBatteryOn =
                                result.KeyBatteryOn;

                            this.bikeRowActions =
                                this.canEditNumbers
                                    ? [{
                                        key:'edit-numbers',
                                        icon:'fas fa-pen',
                                        title:'Edit bike numbers',
                                        tone:'primary',
                                        visible:(row:any) => !row?.IsSold || this.canEditSold
                                    }]
                                    : [];

                            this.bikes =
                                result.Rows.map
                                (
                                    x =>
                                    ({
                                        ...x,
                                        // "Motor Bikes - " left out of the model
                                        ProductName:modelName(x.ProductName),
                                        ColorHex:colorHex(x.ColorName),
                                        StockInDateText:formatStockDate(x.StockInDate),
                                        UnitCostText:this.canViewCost ? formatMoney(x.UnitCost) : ''
                                    })
                                );

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

                            this.bikes =
                                [];

                            this.applyFilters();

                            this.toast.error(
                                'Load Failed',
                                typeof error?.error === 'string'
                                    ? error.error
                                    : 'The bikes could not be loaded.'
                            );
                        }
                });
    }

    //===========================================================
    // Edit Bike Numbers (Technical Records)
    //
    // Switch Edit Bike Numbers (+ After Sale for sold bikes) and
    // Update on the page : a pencil per row opens the four
    // numbers. Live check as on Purchases / Receiving (other
    // bikes' numbers); the server checks everything again.
    //===========================================================

    canEditNumbers:
        boolean =
        false;

    canEditSold:
        boolean =
        false;

    // Key & Battery Required : Key / Battery No asked
    keyBatteryOn:
        boolean =
        true;

    bikeRowActions:
        ListTableRowAction[] =
        [];

    editBike:
        BikeRow | null =
        null;

    // Values typed (capitals) and the values the inputs open with
    editForm:
        Record<InventoryBikeNumberField, string> =
        { ChassisNo:'', EngineNo:'', KeyNo:'', BatteryNo:'' };

    editInitial:
        Record<InventoryBikeNumberField, string> =
        { ChassisNo:'', EngineNo:'', KeyNo:'', BatteryNo:'' };

    // Field → "already on purchase ..." (server)
    editTaken:
        Record<string, string> =
        {};

    editChecking:
        boolean =
        false;

    editSaving:
        boolean =
        false;

    private readonly editCheck$ =
        new Subject<void>();

    readonly editCheckSub =
        this.editCheck$
            .pipe(
                debounceTime(350),
                switchMap
                (
                    () =>
                    {
                        const dto =
                            this.editDto();

                        if
                        (
                            !dto
                            ||
                            !dto.ChassisNo
                            ||
                            !dto.EngineNo
                        )
                        {
                            return of([] as InventoryBikeNumberTaken[]);
                        }

                        return this.stockService
                            .checkBikeNumbers(this.page.apiPath, dto)
                            .pipe(catchError(() => of(null)));
                    }
                ),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe
            (
                list =>
                {
                    this.editChecking =
                        false;

                    if
                    (
                        list
                    )
                    {
                        const taken:
                            Record<string, string> =
                            {};

                        list.forEach(x => taken[x.Field] = x.Message);

                        this.editTaken =
                            taken;
                    }

                    this.cdr.detectChanges();
                }
            );

    get editFields():
        { key:InventoryBikeNumberField; label:string; required:boolean }[]
    {
        return [
            { key:'ChassisNo', label:'Chassis No', required:true },
            { key:'EngineNo', label:this.power.label(this.editBike?.ProductId), required:true },
            ...(this.keyBatteryOn
                ? [
                    { key:'KeyNo' as InventoryBikeNumberField, label:'Key No', required:false },
                    { key:'BatteryNo' as InventoryBikeNumberField, label:'Battery No', required:false }
                ]
                : [])
        ];
    }

    onRowAction
    (
        event:
            ListTableRowActionEvent
    ):
        void
    {
        if
        (
            event.key === 'edit-numbers'
        )
        {
            this.openEditor(event.row as BikeRow);
        }
    }

    openEditor
    (
        bike:
            BikeRow
    ):
        void
    {
        const values:
            Record<InventoryBikeNumberField, string> =
        {
            ChassisNo:(bike.ChassisNo ?? '').trim().toUpperCase(),
            EngineNo:(bike.EngineNo ?? '').trim().toUpperCase(),
            KeyNo:(bike.KeyNo ?? '').trim().toUpperCase(),
            BatteryNo:(bike.BatteryNo ?? '').trim().toUpperCase()
        };

        this.editBike =
            bike;

        this.editForm =
            { ...values };

        this.editInitial =
            { ...values };

        this.editTaken =
            {};

        this.editChecking =
            false;

        this.editSaving =
            false;

        this.cdr.detectChanges();
    }

    closeEditor():
        void
    {
        if
        (
            this.editSaving
        )
        {
            return;
        }

        this.editBike =
            null;

        this.cdr.detectChanges();
    }

    onEditInput
    (
        field:
            InventoryBikeNumberField,
        value:
            string
    ):
        void
    {
        this.editForm =
        {
            ...this.editForm,
            [field]:(value ?? '').trim().toUpperCase()
        };

        // An old answer no longer applies to this field
        const taken =
            { ...this.editTaken };

        delete taken[field];

        this.editTaken =
            taken;

        this.editChecking =
            true;

        this.editCheck$.next();
    }

    // Required (here) or taken (server)
    editError
    (
        field:
            InventoryBikeNumberField
    ):
        string
    {
        const required =
            this.editFields.find(x => x.key === field)?.required;

        if
        (
            required
            &&
            !this.editForm[field]
        )
        {
            return `${field === 'ChassisNo' ? 'Chassis No' : this.power.label(this.editBike?.ProductId)} is required.`;
        }

        return this.editTaken[field] ?? '';
    }

    get editHasErrors():
        boolean
    {
        return this.editFields.some(x => !!this.editError(x.key));
    }

    get editChanged():
        boolean
    {
        return this.editFields.some(x => this.editForm[x.key] !== this.editInitial[x.key]);
    }

    get canSaveEditor():
        boolean
    {
        return !!this.editBike
            && !this.editSaving
            && !this.editChecking
            && this.editChanged
            && !this.editHasErrors;
    }

    private editDto():
        InventoryBikeNumbers | null
    {
        if
        (
            !this.editBike
        )
        {
            return null;
        }

        return {
            MotorBikeUnitId:this.editBike.MotorBikeUnitId,
            ChassisNo:this.editForm.ChassisNo,
            EngineNo:this.editForm.EngineNo,
            KeyNo:this.keyBatteryOn ? this.editForm.KeyNo : this.editInitial.KeyNo,
            BatteryNo:this.keyBatteryOn ? this.editForm.BatteryNo : this.editInitial.BatteryNo
        };
    }

    saveEditor():
        void
    {
        const dto =
            this.editDto();

        if
        (
            !dto
            ||
            !this.canSaveEditor
        )
        {
            return;
        }

        this.editSaving =
            true;

        this.cdr.detectChanges();

        this.stockService
            .updateBikeNumbers(this.page.apiPath, dto)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.editSaving =
                            false;

                        this.toast.success(
                            'Bike Numbers Saved',
                            `${dto.ChassisNo} · ${this.editBike?.ProductName ?? ''}`
                        );

                        this.editBike =
                            null;

                        this.loadBikes();
                    },

                error:
                    (error:any) =>
                    {
                        this.editSaving =
                            false;

                        const body =
                            error?.error;

                        const message =
                            typeof body === 'string' && body.trim()
                                ? body
                                : typeof body?.text === 'string' && body.text.trim()
                                    ? body.text
                                    : body?.message || body?.title || 'The bike numbers could not be saved.';

                        this.toast.error(
                            'Not Saved',
                            message
                        );

                        this.cdr.detectChanges();
                    }
            });
    }

    //===========================================================
    // History (Motor Bike Stock : the bike number edits)
    //===========================================================

    historyOpened:
        boolean =
        false;

    historyItems:
        any[] =
        [];

    get hasHistory():
        boolean
    {
        return this.page.pageType === 'MB';
    }

    openHistory():
        void
    {
        if
        (
            !this.hasHistory
        )
        {
            return;
        }

        this.stockService
            .getBikeHistory(this.page.apiPath)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    rows =>
                    {
                        const read =
                            (x: any, key: string) =>
                                x?.[key] ?? x?.[key.charAt(0).toLowerCase() + key.slice(1)];

                        this.historyItems =
                            rows.map
                            (
                                x =>
                                ({
                                    title:read(x, 'ActivityTitle'),
                                    // "A -> B" shown as an arrow
                                    description:String(read(x, 'ActivityDescription') ?? '').split(' -> ').join(' → '),
                                    user:read(x, 'PerformedByName') || 'System',
                                    dateTime:new Date(read(x, 'PerformedDate')).toLocaleString(),
                                    badge:read(x, 'ActivityType')
                                })
                            );

                        this.historyOpened =
                            true;

                        this.cdr.detectChanges();
                    },

                error:
                    () =>
                    {
                        this.toast.error(
                            'History',
                            'Failed to load the bike history.'
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
            OpeningText:row.OpeningQty ? formatQuantity(row.OpeningQty) : '–',
            PurchaseText:row.PurchaseQty ? formatQuantity(row.PurchaseQty) : '–',
            SalesText:row.SalesQty ? formatQuantity(row.SalesQty) : '–',
            InTransitText:row.InTransit ? formatQuantity(row.InTransit) : '–',
            OnHandText:formatQuantity(row.OnHand),
            TotalText:formatQuantity(row.Total),
            ReorderText:row.ReorderLevel > 0 ? formatQuantity(row.ReorderLevel) : '–',
            AverageCostText:row.Total > 0 ? formatMoney(row.AverageCost) : '–',
            StockValueText:row.Total > 0 ? formatMoney(row.StockValue) : '–',
            AverageCostVatText:row.Total > 0 ? formatMoney(row.AverageCostVat ?? 0) : '–',
            StockValueVatText:row.Total > 0 ? formatMoney(row.StockValueVat ?? 0) : '–',
            BrandCategoryText:[row.BrandName, row.CategoryName].filter(x => !!x).join(' · '),
            ImageUrl:imageUrl(row.ImagePath),
            ColorHex:colorHex(row.ColorName),
            // Motor Bikes : "Motor Bikes - " left out of the model
            ...(this.page.pageType === 'MB'
                ? { ItemName:modelName(row.ItemName), ProductName:modelName(row.ProductName) }
                : {})
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
                    // Cost is always incl. VAT (the input VAT claimed at
                    // purchase is added back; owner 2026-11-06)
                    { header:'Avg. Cost', field:'AverageCostText', width:'115px', align:'right', sortable:true },
                    { header:'Stock Value', field:'StockValueText', width:'125px', align:'right', sortable:true, link:true, linkTitle:PLACES_TITLE }
                ]
                : [];

        const quantities:
            ListTableColumn[] =
        [
            // The period (date range) : opening, purchased, sold
            { header:'Opening', field:'OpeningText', width:'85px', align:'right', sortable:true },
            { header:'Purchase', field:'PurchaseText', width:'85px', align:'right', sortable:true },
            { header:'Sales', field:'SalesText', width:'75px', align:'right', sortable:true },
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
                    { header:'Model', field:'ItemName', width:'250px', align:'left', sortable:true },
                    // A motorcycle painted in the bike's colour (the name on hover)
                    { header:'Colour', field:'ColorName', width:'80px', align:'center', sortable:true, dotField:'ColorHex', dotIcon:'fas fa-motorcycle' }
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
            // Image with the hover preview : name + stock (bold);
            // Accessories have no image
            ...(page.pageType === 'AC'
                ? []
                : [{
                    header:'Image',
                    field:'ImageUrl',
                    type:'image',
                    width:'80px',
                    align:'center',
                    sortable:false,
                    previewTitleField:'ProductName',
                    // Big round stock number at the top left : Motor
                    // Bikes show On Hand only (owner 06-11) ; the others
                    // the total
                    previewBadgeField:page.pageType === 'MB' ? 'OnHandText' : 'TotalText',
                    previewDetails:
                    [
                        { label:'In Transit', field:'InTransitText' },
                        { label:'On Hand', field:'OnHandText' },
                        { label:'Total', field:'TotalText' }
                    ]
                } as ListTableColumn]),
            { header:'Status', field:'StockStatus', type:'status', width:'135px', align:'center', sortable:true },
            { header:'Card', field:'actions', type:'actions', width:'70px', align:'center' }
        ];

        // MB › Free Accessories : laid out like the Accessories
        // Stock page (no image)
        this.accessoryColumns =
        [
            { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
            { header:'Code', field:'ProductCode', width:'150px', align:'center', sortable:true },
            { header:'Part No', field:'PartNumber', width:'120px', align:'left', sortable:true },
            { header:'Accessory', field:'ItemName', width:'230px', align:'left', sortable:true },
            { header:'Sub Category', field:'SubCategoryName', width:'170px', align:'left', sortable:true },
            { header:'Location', field:'Location', width:'110px', align:'left', sortable:true },
            ...quantities,
            ...cost,
            { header:'Status', field:'StockStatus', type:'status', width:'135px', align:'center', sortable:true },
            { header:'Card', field:'actions', type:'actions', width:'70px', align:'center' }
        ];

        this.bikeColumns =
        [
            // Widths sized to the longest values (purchase no, engine
            // no) with the denser cells of this tab (.is-dense)
            { header:'#', field:'serial', type:'serial', width:'36px', align:'center' },
            // Which bike first (model, purchase, date), then its numbers
            { header:'Model', field:'ProductName', width:'170px', align:'left', sortable:true },
            // A motorcycle painted in the bike's colour (the name on hover)
            { header:'Colour', field:'ColorName', width:'70px', align:'center', sortable:true, dotField:'ColorHex', dotIcon:'fas fa-motorcycle' },
            { header:'Purchase No', field:'PurchaseNo', width:'205px', align:'left', sortable:true },
            { header:'Stock In', field:'StockInDateText', width:'105px', align:'center', sortable:true },
            { header:'Chassis No', field:'ChassisNo', width:'150px', align:'left', sortable:true },
            { header:`${this.power.wordFor((this.bikes ?? []).map(x => x.ProductId))} No`, field:'EngineNo', width:'170px', align:'left', sortable:true },
            { header:'Key No', field:'KeyNo', width:'85px', align:'left', sortable:true },
            { header:'Battery No', field:'BatteryNo', width:'105px', align:'left', sortable:true },
            ...(this.canViewCost
                ? [{ header:'Unit Cost', field:'UnitCostText', width:'100px', align:'right', sortable:true } as ListTableColumn]
                : []),
            { header:'Status', field:'Status', type:'status', width:'135px', align:'center', sortable:true },
            { header:'Card', field:'actions', type:'actions', width:'75px', align:'center' }
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
                label:'All',
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

        this.buildFooter();

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

    // Date range : a new period reloads the list
    onFromChange
    (
        date:
            Date
    ):
        void
    {
        if (!date)
        {
            return;
        }

        this.fromDate =
            date;

        if (this.fromDate > this.toDate)
        {
            this.toDate =
                date;
        }

        this.load();
    }

    onToChange
    (
        date:
            Date
    ):
        void
    {
        if (!date)
        {
            return;
        }

        this.toDate =
            date;

        if (this.toDate < this.fromDate)
        {
            this.fromDate =
                date;
        }

        this.load();
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
            OpeningText:'OpeningQty',
            PurchaseText:'PurchaseQty',
            SalesText:'SalesQty',
            InTransitText:'InTransit',
            OnHandText:'OnHand',
            TotalText:'Total',
            ReorderText:'ReorderLevel',
            AverageCostText:'AverageCost',
            StockValueText:'StockValue',
            AverageCostVatText:'AverageCostVat',
            StockValueVatText:'StockValueVat',
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
            this.cardIsAccessory =
                this.isAccessoriesTab;

            this.cardProductId =
                id;

            this.cdr.detectChanges();
        }
    }


    //===========================================================
    // MB : free accessories (Additional / Promotional
    // Accessories products), loaded after the models with the
    // same branch / warehouse
    //===========================================================

    private loadAccessories():
        void
    {
        if
        (
            !this.hasAccessoriesTab
        )
        {
            return;
        }

        this.accessoryRequest?.unsubscribe();

        this.accessoryRequest =
            this.stockService
                .getStock(
                    this.accessoriesApiPath,
                    this.branchId,
                    this.warehouseId,
                    isoDate(this.fromDate),
                    isoDate(this.toDate)
                )
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe
                ({
                    next:
                        result =>
                        {
                            const kind =
                                this.page.tabs.find(x => !!x.accessories)?.kind ?? 'Free Accessories';

                            this.rows =
                            [
                                ...this.rows.filter(x => x.ProductKind !== kind),
                                ...result.Rows
                                    .map(x => this.toStockRow({ ...x, ProductKind:kind }))
                            ];

                            this.categoryItems =
                            [
                                { label:'All Categories', value:'' },
                                ...Array.from(new Set(this.rows.map(x => x.CategoryName).filter(x => !!x)))
                                    .sort()
                                    .map(x => ({ label:x, value:x }))
                            ];

                            this.applyFilters(true);
                        },

                    error:
                        () =>
                        {
                            this.toast.error(
                                'Load Failed',
                                'The free accessories could not be loaded.'
                            );
                        }
                });
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
                    search:this.searchText,
                    from:isoDate(this.fromDate),
                    to:isoDate(this.toDate)
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


//===============================================================
// The running calendar month; Date → yyyy-MM-dd (local)
//===============================================================

function monthStart():
    Date
{
    const today =
        new Date();

    return new Date(today.getFullYear(), today.getMonth(), 1);
}

function monthEnd():
    Date
{
    const today =
        new Date();

    return new Date(today.getFullYear(), today.getMonth() + 1, 0);
}

function isoDate
(
    date:
        Date
):
    string
{
    if (!date || isNaN(date.getTime()))
    {
        return '';
    }

    const pad =
        (n: number) => String(n).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}


//===============================================================
// Image path → URL served by the API ('' = no image)
//===============================================================

function imageUrl
(
    path:
        string | null | undefined
):
    string
{
    const value =
        (path ?? '').trim();

    if
    (
        !value
        ||
        /^(https?:|blob:|data:)/i.test(value)
    )
    {
        return value;
    }

    const root =
        environment.apiUrl
            .replace(/\/+$/, '')
            .replace(/\/api$/i, '');

    return `${root}/${value.replace(/^\/+/, '')}`;
}


//===============================================================
// Colour name → CSS colour for the colour icon. Colours keep only
// a name, so the first known word in it decides ("Matte Black",
// "Racing Red"); '' = unknown (a neutral grey).
//===============================================================

const COLOR_WORDS:
    [string, string][] =
[
    ['navy', '#1e3a8a'],
    ['maroon', '#7f1d1d'],
    ['black', '#1f2937'],
    ['white', '#f8fafc'],
    ['silver', '#c0c6cf'],
    ['grey', '#9ca3af'],
    ['gray', '#9ca3af'],
    ['red', '#dc2626'],
    ['pink', '#ec4899'],
    ['green', '#16a34a'],
    ['blue', '#2563eb'],
    ['cyan', '#06b6d4'],
    ['yellow', '#facc15'],
    ['gold', '#d4a017'],
    ['orange', '#f97316'],
    ['brown', '#92400e'],
    ['purple', '#7c3aed'],
    ['violet', '#7c3aed']
];

function colorHex
(
    name:
        string | null | undefined
):
    string
{
    const words =
        (name ?? '').toLowerCase().split(/[^a-z]+/);

    const found =
        COLOR_WORDS.find(([word]) => words.includes(word));

    return found
        ? found[1]
        : '';
}


//===============================================================
// Motor bike model without its product type : "Motor Bikes -
// REVOO - A04 - Black" -> "REVOO - A04 - Black"
//===============================================================

function modelName
(
    name:
        string | null | undefined
):
    string
{
    return (name ?? '').replace(/^\s*motor\s*bikes?\s*-\s*/i, '');
}
