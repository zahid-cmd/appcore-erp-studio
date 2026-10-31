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
    ActivatedRoute,
    Router
}
from '@angular/router';

import
{
    Subscription,
    timeout
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
    CommandCenterComponent
}
from '../../../../../shared/components/utilities/command-center/command-center';

import
{
    SearchDropdownComponent
}
from '../../../../../shared/components/controls/search-dropdown/search-dropdown';

import
{
    SearchBoxComponent
}
from '../../../../../shared/components/utilities/search-box/search-box';

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

//===============================================================
// Product Ledgers
//===============================================================

import
{
    PRODUCT_LEDGER_PRINT_KEY,
    ProductLedgerConfig,
    ProductLedgerFigures,
    ProductLedgerFilters,
    ProductLedgerProduct,
    ProductLedgerRow,
    ProductLedgerStatement,
    ProductLedgerSummary,
    ProductLedgerSummaryRow,
    bikesText,
    formatLedgerDate,
    formatLedgerMoney,
    formatLedgerQty,
    fromIsoDate,
    ledgerRowMatches,
    productLedgerConfig,
    sumFigures,
    summaryRowMatches,
    toIsoDate
}
from '../../models/product-ledgers.model';

import
{
    ProductLedgersService
}
from '../../services/product-ledgers.service';

import
{
    saveProductLedgerPrintRequest
}
from '../../print/product-ledgers.print';


//===============================================================
// Option of the dropdowns
//===============================================================

interface Option
{
    label:string;
    value:any;
}

type CanvasView =
    'none' | 'statement' | 'summary';


//===============================================================
// Motor Bikes / Spare Parts & Lubricants / Accessories Ledger
//
//   Left  : the filter (period, branch, warehouse, [kind],
//           category › sub category › product, switches) and
//           Submit
//   Right : empty until Submit; then the product's ledger, or
//           (no product chosen) a summary of the products. A
//           summary row opens its ledger.
//
// The route's data.ledgerType (MB / SP / AC) picks the page;
// ?product=<id> (stock card "Full Ledger") opens a product's
// ledger straight away.
//===============================================================

@Component(
{
    selector:'product-ledger',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        CommandCenterComponent,
        SearchBoxComponent,
        SearchDropdownComponent,
        DatepickerComponent,
        ToastComponent
    ],

    templateUrl:'./product-ledger.html',

    styleUrl:'./product-ledger.css'
})

export class ProductLedger
    implements OnInit
{
    private readonly service =
        inject(ProductLedgersService);

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly destroyRef =
        inject(DestroyRef);

    readonly page:
        ProductLedgerConfig =
        productLedgerConfig(
            String(this.route.snapshot.data['ledgerType'] ?? 'SP')
        );

    //===========================================================
    // Filter
    //===========================================================

    fromDate:
        Date =
        monthStart();

    toDate:
        Date =
        monthEnd();

    branchId:
        number = 0;

    warehouseId:
        number = 0;

    // SP : Spare Parts / Lubricants ('' = both)
    kind:
        string = '';

    categoryId:
        number = 0;

    subCategoryId:
        number = 0;

    productId:
        number = 0;

    showCancelled:
        boolean = false;

    // View switches (no reload)
    showBatch:
        boolean = false;

    showLocation:
        boolean = false;

    showValue:
        boolean = false;

    showBikes:
        boolean = false;

    filters:
        ProductLedgerFilters | null = null;

    filtersLoading:
        boolean = false;

    filtersError:
        string = '';

    //===========================================================
    // Canvas
    //===========================================================

    view:
        CanvasView = 'none';

    statement:
        ProductLedgerStatement | null = null;

    summary:
        ProductLedgerSummary | null = null;

    loading:
        boolean = false;

    loadError:
        string = '';

    private filtersRequest?:
        Subscription;

    private loadRequest?:
        Subscription;

    //===========================================================
    // View refresh after an answer : marks the page for the
    // next check and checks it now (a failure is logged, never
    // left as a stuck "Loading")
    //===========================================================

    private refreshView():
        void
    {
        this.cdr.markForCheck();

        try
        {
            this.cdr.detectChanges();
        }
        catch (error)
        {
            console.error('[Product Ledger] view update failed', error);
        }
    }

    //===========================================================
    // Start
    //===========================================================

    // ?product=&branch=&warehouse= : opened from the stock card
    private openProduct:
        number = 0;

    ngOnInit():
        void
    {
        const query =
            this.route.snapshot.queryParamMap;

        this.openProduct = Number(query.get('product')) || 0;

        this.branchId = Number(query.get('branch')) || 0;

        this.warehouseId = Number(query.get('warehouse')) || 0;

        const from =
            fromIsoDate(query.get('from') ?? '');

        if
        (
            from
        )
        {
            this.fromDate = from;
        }

        this.loadFilters();
    }

    private loadFilters():
        void
    {
        this.filtersRequest?.unsubscribe();

        this.filtersLoading = true;

        this.filtersError = '';

        this.filtersRequest =
            this.service
                .getFilters(this.page.path)
                .pipe(timeout(REQUEST_TIMEOUT), takeUntilDestroyed(this.destroyRef))
                .subscribe
                (
                    {
                        next:
                            filters =>
                            {
                                this.filters = filters;

                                if
                                (
                                    !filters.CanViewCost
                                )
                                {
                                    this.showValue = false;
                                }

                                this.filtersLoading = false;

                                if
                                (
                                    this.openProduct
                                    &&
                                    filters.Products.some(x => x.Id === this.openProduct)
                                )
                                {
                                    const id =
                                        this.openProduct;

                                    this.openProduct = 0;

                                    this.onProductChange(id);

                                    this.rebuildItems();

                                    this.load();

                                    return;
                                }

                                this.rebuildItems();

                                this.refreshView();
                            },

                        error:
                            err =>
                            {
                                this.filtersLoading = false;

                                this.filtersError = errorText(err, `The ${this.page.itemWords} could not be loaded.`);

                                this.refreshView();
                            }
                    }
                );
    }

    //===========================================================
    // Dropdown items (each filtered by the ones above it)
    //===========================================================

    // Items are built once per change (not getters) : a new
    // array on every check made the dropdowns lose the first
    // click
    branchItems:
        Option[] = [];

    warehouseItems:
        Option[] = [];

    kindItems:
        Option[] =
        [
            { label:'Spare Parts & Lubricants', value:'' },
            { label:'Spare Parts', value:'Spare Parts' },
            { label:'Lubricants', value:'Lubricants' }
        ];

    categoryItems:
        Option[] = [];

    subCategoryItems:
        Option[] = [];

    productItems:
        Option[] = [];

    productCount:
        number = 0;

    get isMotorBikes():
        boolean
    {
        return this.page.type === 'MB';
    }

    get isSpareParts():
        boolean
    {
        return this.page.type === 'SP';
    }

    get canViewCost():
        boolean
    {
        return !!this.filters?.CanViewCost;
    }

    private rebuildItems():
        void
    {
        const filters =
            this.filters;

        this.branchItems =
        [
            { label:'All Branches', value:0 },
            ...(filters?.Branches ?? []).map(x => ({ label:x.Name, value:x.Id }))
        ];

        this.warehouseItems =
        [
            { label:'All Warehouses', value:0 },
            ...(filters?.Warehouses ?? [])
                .filter(x => !this.branchId || x.BranchId === this.branchId)
                .map(x => ({ label:x.Name, value:x.Id }))
        ];

        this.categoryItems =
        [
            { label:'All Categories', value:0 },
            ...(filters?.Categories ?? [])
                .filter(x => !this.kind || x.Kind === this.kind)
                .map(x => ({ label:x.Name, value:x.Id }))
        ];

        this.subCategoryItems =
        [
            { label:'All Sub Categories', value:0 },
            ...(filters?.SubCategories ?? [])
                .filter(x => this.categoryFits(x.CategoryId))
                .filter(x => !this.categoryId || x.CategoryId === this.categoryId)
                .map(x => ({ label:x.Name, value:x.Id }))
        ];

        const products =
            this.scopedProducts;

        this.productCount = products.length;

        this.productItems =
        [
            { label:`Summary Of The ${capital(this.page.itemWords)}`, value:0 },
            ...products.map
            (
                x =>
                ({
                    label:`${x.Name} · ${x.Code}${x.IsActive ? '' : ' (inactive)'}`,
                    value:x.Id
                })
            )
        ];
    }

    // A category of the chosen kind (SP)
    private categoryFits
    (
        categoryId:
            number
    ):
        boolean
    {
        if
        (
            !this.kind
        )
        {
            return true;
        }

        const category =
            this.filters?.Categories.find(x => x.Id === categoryId);

        return !!category && category.Kind === this.kind;
    }

    private get scopedProducts():
        ProductLedgerProduct[]
    {
        return (this.filters?.Products ?? [])
            .filter
            (
                x =>
                    (!this.kind || x.Kind === this.kind)
                    &&
                    (!this.categoryId || x.CategoryId === this.categoryId)
                    &&
                    (!this.subCategoryId || x.SubCategoryId === this.subCategoryId)
            );
    }


    //===========================================================
    // Filter changes (a parent clears children that no longer
    // fit; a child fills its parents)
    //===========================================================

    onFromChange
    (
        date:
            Date
    ):
        void
    {
        this.fromDate = date;

        if
        (
            this.fromDate > this.toDate
        )
        {
            this.toDate = date;
        }
    }

    onToChange
    (
        date:
            Date
    ):
        void
    {
        this.toDate = date;

        if
        (
            this.toDate < this.fromDate
        )
        {
            this.fromDate = date;
        }
    }

    onBranchChange
    (
        value:
            any
    ):
        void
    {
        this.branchId = Number(value) || 0;

        const warehouse =
            this.filters?.Warehouses.find(x => x.Id === this.warehouseId);

        if
        (
            warehouse && this.branchId && warehouse.BranchId !== this.branchId
        )
        {
            this.warehouseId = 0;
        }

        this.rebuildItems();
    }

    onWarehouseChange
    (
        value:
            any
    ):
        void
    {
        this.warehouseId = Number(value) || 0;

        const warehouse =
            this.filters?.Warehouses.find(x => x.Id === this.warehouseId);

        if
        (
            warehouse
        )
        {
            this.branchId = warehouse.BranchId;
        }

        this.rebuildItems();
    }

    onKindChange
    (
        value:
            any
    ):
        void
    {
        this.kind = String(value ?? '');

        this.fitChildren();

        this.rebuildItems();
    }

    onCategoryChange
    (
        value:
            any
    ):
        void
    {
        this.categoryId = Number(value) || 0;

        const category =
            this.filters?.Categories.find(x => x.Id === this.categoryId);

        if
        (
            category && this.isSpareParts && this.kind && category.Kind !== this.kind
        )
        {
            this.kind = category.Kind;
        }

        this.fitChildren();

        this.rebuildItems();
    }

    onSubCategoryChange
    (
        value:
            any
    ):
        void
    {
        this.subCategoryId = Number(value) || 0;

        const sub =
            this.filters?.SubCategories.find(x => x.Id === this.subCategoryId);

        if
        (
            sub && sub.CategoryId
        )
        {
            this.categoryId = sub.CategoryId;
        }

        this.fitChildren();

        this.rebuildItems();
    }

    onProductChange
    (
        value:
            any
    ):
        void
    {
        this.productId = Number(value) || 0;

        const product =
            this.filters?.Products.find(x => x.Id === this.productId);

        if
        (
            product
        )
        {
            this.categoryId = product.CategoryId;

            this.subCategoryId = product.SubCategoryId;

            if
            (
                this.isSpareParts && this.kind
            )
            {
                this.kind = product.Kind;
            }

            this.rebuildItems();
        }
    }

    // Clears the category / sub category / product that left
    // the scope
    private fitChildren():
        void
    {
        if
        (
            this.categoryId && !this.categoryFits(this.categoryId)
        )
        {
            this.categoryId = 0;
        }

        const sub =
            this.filters?.SubCategories.find(x => x.Id === this.subCategoryId);

        if
        (
            sub
            &&
            (
                (this.categoryId && sub.CategoryId !== this.categoryId)
                ||
                !this.categoryFits(sub.CategoryId)
            )
        )
        {
            this.subCategoryId = 0;
        }

        if
        (
            this.productId
            &&
            !this.scopedProducts.some(x => x.Id === this.productId)
        )
        {
            this.productId = 0;
        }
    }

    onSwitch
    (
        name:
            'showCancelled' | 'showBatch' | 'showLocation' | 'showValue' | 'showBikes',
        event:
            Event
    ):
        void
    {
        this[name] = !!(event.target as HTMLInputElement | null)?.checked;
    }


    //===========================================================
    // Search (page header) : filters the loaded rows
    //===========================================================

    searchText:
        string = '';

    // Statement / summary rows on the canvas (after search)
    rows:
        ProductLedgerRow[] = [];

    summaryRows:
        ProductLedgerSummaryRow[] = [];

    // Totals of the summary rows shown (all rows when no search)
    sumTotals:
        ProductLedgerFigures = sumFigures([]);

    onSearch
    (
        value:
            string
    ):
        void
    {
        this.searchText = value ?? '';

        this.applySearch();

        this.refreshView();
    }

    private applySearch():
        void
    {
        this.rows =
            (this.statement?.Rows ?? []).filter(x => ledgerRowMatches(x, this.searchText));

        this.summaryRows =
            (this.summary?.Rows ?? []).filter(x => summaryRowMatches(x, this.searchText));

        this.sumTotals =
            this.searchText.trim()
                ? sumFigures(this.summaryRows)
                : (this.summary ?? sumFigures([]));
    }


    //===========================================================
    // Submit
    //===========================================================

    load():
        void
    {
        this.loadRequest?.unsubscribe();

        this.loading = true;

        this.loadError = '';

        this.view = this.productId ? 'statement' : 'summary';

        this.refreshView();

        const done =
            () =>
            {
                this.loading = false;

                this.refreshView();
            };

        const failed =
            (err: any) =>
            {
                this.loading = false;

                this.loadError = errorText(err, 'The ledger could not be loaded.');

                this.refreshView();
            };

        if
        (
            this.productId
        )
        {
            this.loadRequest =
                this.service
                    .getStatement(
                        {
                            path:this.page.path,
                            productId:this.productId,
                            from:toIsoDate(this.fromDate),
                            to:toIsoDate(this.toDate),
                            branchId:this.branchId,
                            warehouseId:this.warehouseId,
                            showCancelled:this.showCancelled,
                            withBikes:this.isMotorBikes
                        }
                    )
                    .pipe(timeout(REQUEST_TIMEOUT), takeUntilDestroyed(this.destroyRef))
                    .subscribe
                    (
                        {
                            next:
                                result =>
                                {
                                    this.statement = result;

                                    this.summary = null;

                                    this.applySearch();

                                    done();
                                },

                            error:failed
                        }
                    );

            return;
        }

        this.loadRequest =
            this.service
                .getSummary(
                    {
                        path:this.page.path,
                        kind:this.isSpareParts ? this.kind : '',
                        categoryId:this.categoryId,
                        subCategoryId:this.subCategoryId,
                        from:toIsoDate(this.fromDate),
                        to:toIsoDate(this.toDate),
                        branchId:this.branchId,
                        warehouseId:this.warehouseId,
                        showCancelled:this.showCancelled
                    }
                )
                .pipe(timeout(REQUEST_TIMEOUT), takeUntilDestroyed(this.destroyRef))
                .subscribe
                (
                    {
                        next:
                            result =>
                            {
                                this.summary = result;

                                this.statement = null;

                                this.applySearch();

                                done();
                            },

                        error:failed
                    }
                );
    }

    // Summary row → that product's ledger
    openLedger
    (
        id:
            number
    ):
        void
    {
        this.onProductChange(id);

        this.load();
    }

    // Ledger → back to the summary of its scope
    backToSummary():
        void
    {
        this.productId = 0;

        this.rebuildItems();

        this.load();
    }

    //===========================================================
    // Refresh : default filter, empty canvas
    //===========================================================

    refresh():
        void
    {
        this.loadRequest?.unsubscribe();

        this.fromDate = monthStart();

        this.toDate = monthEnd();

        this.branchId = 0;

        this.warehouseId = 0;

        this.kind = '';

        this.categoryId = 0;

        this.subCategoryId = 0;

        this.productId = 0;

        this.showCancelled = false;

        this.showBatch = false;

        this.showLocation = false;

        this.showValue = false;

        this.showBikes = false;

        this.searchText = '';

        this.rows = [];

        this.summaryRows = [];

        this.view = 'none';

        this.statement = null;

        this.summary = null;

        this.loading = false;

        this.loadError = '';

        this.rebuildItems();

        this.loadFilters();
    }

    //===========================================================
    // Layout
    //===========================================================

    // Values shown : switch on and the server sent them
    get values():
        boolean
    {
        return this.showValue && this.canViewCost;
    }

    get bikes():
        boolean
    {
        return this.isMotorBikes && this.showBikes;
    }

    // Statement columns : SL, Date, Particulars, Doc No | In,
    // Out, Balance | [Unit Cost, In Value, Out Value, Balance
    // Value] | Short Notes
    get colCount():
        number
    {
        return 8 + (this.values ? 4 : 0);
    }

    get statementPath():
        string
    {
        const s =
            this.statement;

        return s
            ? [s.Kind, s.CategoryName, s.SubCategoryName, s.BrandName, s.ColorName].filter(x => !!x).join(' › ')
            : '';
    }

    get placeText():
        string
    {
        const s =
            this.statement ?? this.summary;

        return s
            ? [s.BranchName, s.WarehouseName].filter(x => !!x).join(' · ')
            : '';
    }

    // Second line under the particulars (batch / location)
    subLine
    (
        row:
            ProductLedgerRow
    ):
        string
    {
        return [
            this.showBatch && row.Batches ? `Batch ${row.Batches}` : '',
            this.showLocation ? row.Location : ''
        ]
        .filter(x => !!x)
        .join(' · ');
    }

    bikesLine
    (
        row:
            ProductLedgerRow
    ):
        string
    {
        return this.bikes ? bikesText(row.Bikes) : '';
    }

    //===========================================================
    // Formatting
    //===========================================================

    date
    (
        iso:
            string
    ):
        string
    {
        return formatLedgerDate(iso);
    }

    qty
    (
        value:
            number
    ):
        string
    {
        return value ? formatLedgerQty(value) : '';
    }

    total
    (
        value:
            number
    ):
        string
    {
        return formatLedgerQty(value);
    }

    money
    (
        value:
            number
    ):
        string
    {
        return value ? formatLedgerMoney(value) : '';
    }

    amount
    (
        value:
            number
    ):
        string
    {
        return formatLedgerMoney(value);
    }

    //===========================================================
    // Print : what is on the canvas (Print Viewer, new tab).
    // With values the page opens in landscape.
    //===========================================================

    get canPrint():
        boolean
    {
        return this.view === 'statement'
            ? !!this.statement
            : this.view === 'summary'
                ? !!this.summary
                : false;
    }

    print():
        void
    {
        if
        (
            !this.canPrint
        )
        {
            this.toast.error(
                'Nothing to Print',
                'Submit first to show a ledger or a summary.'
            );

            return;
        }

        const shown =
            (this.statement ?? this.summary)!;

        const token =
            saveProductLedgerPrintRequest(
                {
                    ledgerType:this.page.type,
                    view:this.view === 'statement' ? 'statement' : 'summary',
                    productId:this.statement?.ProductId ?? 0,
                    kind:this.summary?.Kind ?? (this.isSpareParts ? this.kind : ''),
                    categoryId:this.summary?.CategoryId ?? this.categoryId,
                    subCategoryId:this.summary?.SubCategoryId ?? this.subCategoryId,
                    from:shown.From,
                    to:shown.To,
                    branchId:shown.BranchId,
                    warehouseId:shown.WarehouseId,
                    showCancelled:shown.ShowCancelled,
                    showBatch:this.showBatch,
                    showLocation:this.showLocation,
                    showValue:this.values,
                    showBikes:this.bikes,
                    search:this.searchText
                }
            );

        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(
                    ['/print-viewer', PRODUCT_LEDGER_PRINT_KEY, token],
                    {
                        queryParams:
                        {
                            doc:this.view === 'statement' ? 'product-statement' : 'product-summary',
                            ...(this.values ? { orient:'landscape' } : {})
                        }
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
// Helpers
//===============================================================

// An answer slower than this ends the wait with a message
const REQUEST_TIMEOUT =
    90000;

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

// "accessories" → "Accessories"
function capital
(
    value:
        string
):
    string
{
    return (value ?? '')
        .split(' ')
        .map(x => x ? x.charAt(0).toUpperCase() + x.slice(1) : x)
        .join(' ');
}

function errorText
(
    err:
        any,
    fallback:
        string
):
    string
{
    if
    (
        err?.name === 'TimeoutError'
    )
    {
        return 'The server took too long to answer. Narrow the period or the selection and submit again.';
    }

    const body =
        err?.error;

    return typeof body === 'string' && body.trim()
        ? body.trim()
        : fallback;
}
