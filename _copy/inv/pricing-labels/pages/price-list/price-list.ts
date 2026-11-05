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
    ControlSegmentComponent,
    ControlSegmentItem
}
from '../../../../../shared/components/utilities/control-segment/control-segment';

import
{
    OrbitLoaderComponent
}
from '../../../../../shared/components/utilities/orbit-loader/orbit-loader';

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
// Pricing & Labels
//===============================================================

import
{
    PRODUCT_PRICING_TYPES,
    ProductPricingType,
    ProductPricingTypeInfo,
    formatPricingCost,
    formatPricingDate,
    formatPricingMoney,
    formatPricingQty,
    productPricingType
}
from '../../models/product-pricing.model';

import
{
    PRICE_LIST_PRINT_KEY,
    PriceList,
    PriceListFilter,
    PriceListLine,
    PriceListPrice,
    PriceListRow,
    PriceListStock,
    PriceListTotals,
    filterPriceList,
    formatMarkup,
    groupPriceList,
    priceListBelowCost,
    priceListCost,
    priceListLastCostOnly,
    priceListMarkup,
    priceListMarkupTitle,
    priceListTotals
}
from '../../models/price-list.model';

import
{
    PriceListService
}
from '../../services/price-list.service';

import
{
    savePriceListPrintRequest
}
from '../../print/price-list.print';


//===============================================================
// Option of the dropdowns
//===============================================================

interface Option
{
    label:string;
    value:any;
}

type CanvasView =
    'none' | 'list';


//===============================================================
// Price List
//
//   Left  : the filter (product type, [stock type], brand,
//           category, sub category, stock, price) and Submit
//   Right : empty until Submit; then the current MRP of every
//           product of the selection, grouped by Category ›
//           Sub Category, with cost and markup. Read only.
//
// ?type=MB|SP|AC opens on that product type (default SP).
//===============================================================

@Component(
{
    selector:'price-list',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        CommandCenterComponent,
        SearchBoxComponent,
        SearchDropdownComponent,
        ControlSegmentComponent,
        OrbitLoaderComponent,
        ToastComponent
    ],

    templateUrl:'./price-list.html',

    styleUrl:'./price-list.css'
})

export class PriceListPage
    implements OnInit
{
    private readonly service =
        inject(PriceListService);

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

    readonly title =
        'Price List';

    readonly subtitle =
        'Current MRP (VAT inclusive) of every product, in stock or not, with cost and markup';

    readonly icon =
        'fa-solid fa-list-ol';

    //===========================================================
    // Filter
    //===========================================================

    type:
        ProductPricingType = 'SP';

    // SP : Spare Parts / Lubricants ('' = both)
    kind:
        string = '';

    brandId:
        number = 0;

    categoryId:
        number = 0;

    subCategoryId:
        number = 0;

    stock:
        PriceListStock = 'all';

    price:
        PriceListPrice = 'all';

    // View switches (no reload)
    groupBySub:
        boolean = true;

    showPart:
        boolean = true;

    // The products of the type (dropdowns; refreshed on Submit)
    list:
        PriceList | null = null;

    scopeLoading:
        boolean = false;

    scopeError:
        string = '';

    //===========================================================
    // Canvas
    //===========================================================

    view:
        CanvasView = 'none';

    loading:
        boolean = false;

    loadError:
        string = '';

    // The filter of the last Submit (the canvas)
    applied:
        PriceListFilter | null = null;

    private scopeRequest?:
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
            console.error('[Price List] view update failed', error);
        }
    }

    //===========================================================
    // Start
    //===========================================================

    ngOnInit():
        void
    {
        const type =
            String(this.route.snapshot.queryParamMap.get('type') ?? '').trim().toUpperCase();

        this.type =
            PRODUCT_PRICING_TYPES.some(x => x.type === type)
                ? type as ProductPricingType
                : 'SP';

        this.rebuildItems();

        this.loadScope();
    }

    // The products of the type : fills Brand / Category / Sub
    // Category (the canvas stays as it is)
    private loadScope():
        void
    {
        this.scopeRequest?.unsubscribe();

        this.scopeLoading = true;

        this.scopeError = '';

        const type =
            this.type;

        this.scopeRequest =
            this.service
                .get(type)
                .pipe(timeout(REQUEST_TIMEOUT), takeUntilDestroyed(this.destroyRef))
                .subscribe
                (
                    {
                        next:
                            list =>
                            {
                                if
                                (
                                    type !== this.type
                                )
                                {
                                    return;
                                }

                                this.list = list;

                                this.scopeLoading = false;

                                this.fitChildren();

                                this.rebuildItems();

                                this.refreshView();
                            },

                        error:
                            err =>
                            {
                                this.scopeLoading = false;

                                this.scopeError = errorText(err, `The ${this.info.itemLower} could not be loaded.`);

                                this.refreshView();
                            }
                    }
                );
    }

    //===========================================================
    // Product type
    //===========================================================

    readonly typeItems:
        Option[] =
        PRODUCT_PRICING_TYPES.map(x => ({ label:x.title, value:x.type }));

    get info():
        ProductPricingTypeInfo
    {
        return productPricingType(this.type);
    }

    get isSpareParts():
        boolean
    {
        return this.type === 'SP';
    }

    get isMotorBikes():
        boolean
    {
        return this.type === 'MB';
    }

    // MB has no part number (its part name is the model)
    get partShown():
        boolean
    {
        return this.showPart && !this.isMotorBikes;
    }

    onTypeChange
    (
        value:
            any
    ):
        void
    {
        const type =
            String(value ?? '').trim().toUpperCase();

        if
        (
            type === this.type
            ||
            !PRODUCT_PRICING_TYPES.some(x => x.type === type)
        )
        {
            return;
        }

        this.loadRequest?.unsubscribe();

        this.type = type as ProductPricingType;

        this.kind = '';

        this.brandId = 0;

        this.categoryId = 0;

        this.subCategoryId = 0;

        this.list = null;

        this.clearCanvas();

        this.rebuildItems();

        this.loadScope();
    }

    //===========================================================
    // Dropdown items (each filtered by the ones above it)
    //===========================================================

    // Items are built once per change (not getters) : a new
    // array on every check made the dropdowns lose the first
    // click
    kindItems:
        Option[] =
        [
            { label:'Spare Parts & Lubricants', value:'' },
            { label:'Spare Parts', value:'Spare Parts' },
            { label:'Lubricants', value:'Lubricants' }
        ];

    brandItems:
        Option[] = [];

    categoryItems:
        Option[] = [];

    subCategoryItems:
        Option[] = [];

    readonly stockItems:
        ControlSegmentItem[] =
        [
            { value:'all', text:'All' },
            { value:'in', text:'In stock' },
            { value:'none', text:'No stock' }
        ];

    readonly priceItems:
        ControlSegmentItem[] =
        [
            { value:'all', text:'All' },
            { value:'priced', text:'Priced' },
            { value:'unpriced', text:'Unpriced' }
        ];

    productCount:
        number = 0;

    private get allRows():
        PriceListRow[]
    {
        return this.list?.Rows ?? [];
    }

    private rebuildItems():
        void
    {
        const rows =
            this.allRows;

        const kindRows =
            rows.filter(x => !this.kind || x.VatType === this.kind);

        this.brandItems =
        [
            { label:'All Brands', value:0 },
            ...distinct
            (
                kindRows
                    .filter(x => !!x.BrandId && !!x.BrandName)
                    .map(x => ({ label:x.BrandName, value:x.BrandId }))
            )
        ];

        const brandRows =
            kindRows.filter(x => !this.brandId || x.BrandId === this.brandId);

        this.categoryItems =
        [
            { label:'All Categories', value:0 },
            ...distinct
            (
                brandRows
                    .filter(x => !!x.CategoryId)
                    .map(x => ({ label:x.CategoryName || `Category ${x.CategoryId}`, value:x.CategoryId }))
            )
        ];

        const categoryRows =
            brandRows.filter(x => !this.categoryId || x.CategoryId === this.categoryId);

        this.subCategoryItems =
        [
            { label:'All Sub Categories', value:0 },
            ...distinct
            (
                categoryRows
                    .filter(x => !!x.SubCategoryId)
                    .map(x => ({ label:x.SubCategoryName || `Sub Category ${x.SubCategoryId}`, value:x.SubCategoryId }))
            )
        ];

        this.productCount =
            categoryRows.filter(x => !this.subCategoryId || x.SubCategoryId === this.subCategoryId).length;
    }

    //===========================================================
    // Filter changes (a parent clears children that no longer
    // fit; a child fills its parents)
    //===========================================================

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

    onBrandChange
    (
        value:
            any
    ):
        void
    {
        this.brandId = Number(value) || 0;

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

        const row =
            this.allRows.find(x => x.CategoryId === this.categoryId);

        if
        (
            row
        )
        {
            if
            (
                this.isSpareParts && this.kind && row.VatType !== this.kind
            )
            {
                this.kind = row.VatType;
            }

            if
            (
                this.brandId && row.BrandId !== this.brandId
            )
            {
                this.brandId = row.BrandId;
            }
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

        const row =
            this.allRows.find(x => x.SubCategoryId === this.subCategoryId);

        if
        (
            row && row.CategoryId
        )
        {
            this.categoryId = row.CategoryId;

            if
            (
                this.isSpareParts && this.kind
            )
            {
                this.kind = row.VatType;
            }

            if
            (
                this.brandId
            )
            {
                this.brandId = row.BrandId;
            }
        }

        this.fitChildren();

        this.rebuildItems();
    }

    onStockChange
    (
        value:
            any
    ):
        void
    {
        this.stock =
            value === 'in' || value === 'none'
                ? value
                : 'all';
    }

    onPriceChange
    (
        value:
            any
    ):
        void
    {
        this.price =
            value === 'priced' || value === 'unpriced'
                ? value
                : 'all';
    }

    // Clears the brand / category / sub category that left the
    // scope
    private fitChildren():
        void
    {
        const rows =
            this.allRows;

        if
        (
            rows.length === 0
        )
        {
            return;
        }

        if
        (
            this.brandId
            &&
            !rows.some(x => x.BrandId === this.brandId && (!this.kind || x.VatType === this.kind))
        )
        {
            this.brandId = 0;
        }

        if
        (
            this.categoryId
            &&
            !rows.some
            (
                x =>
                    x.CategoryId === this.categoryId
                    &&
                    (!this.kind || x.VatType === this.kind)
                    &&
                    (!this.brandId || x.BrandId === this.brandId)
            )
        )
        {
            this.categoryId = 0;
        }

        if
        (
            this.subCategoryId
            &&
            !rows.some
            (
                x =>
                    x.SubCategoryId === this.subCategoryId
                    &&
                    (!this.kind || x.VatType === this.kind)
                    &&
                    (!this.brandId || x.BrandId === this.brandId)
                    &&
                    (!this.categoryId || x.CategoryId === this.categoryId)
            )
        )
        {
            this.subCategoryId = 0;
        }
    }

    onSwitch
    (
        name:
            'groupBySub' | 'showPart',
        event:
            Event
    ):
        void
    {
        this[name] = !!(event.target as HTMLInputElement | null)?.checked;

        this.applyView();

        this.refreshView();
    }


    //===========================================================
    // Search (page header) : filters the loaded rows
    //===========================================================

    searchText:
        string = '';

    // Rows on the canvas (filter of the last Submit + search)
    rows:
        PriceListRow[] = [];

    // Group headers and rows, in order
    lines:
        PriceListLine[] = [];

    totals:
        PriceListTotals = priceListTotals([]);

    onSearch
    (
        value:
            string
    ):
        void
    {
        this.searchText = value ?? '';

        this.applyView();

        this.refreshView();
    }

    private applyView():
        void
    {
        if
        (
            !this.list || !this.applied
        )
        {
            this.rows = [];

            this.lines = [];

            this.totals = priceListTotals([]);

            return;
        }

        this.rows =
            filterPriceList(
                this.list.Rows,
                {
                    ...this.applied,
                    search:this.searchText
                }
            );

        this.lines =
            groupPriceList(this.rows, this.groupBySub);

        this.totals =
            priceListTotals(this.rows);
    }


    //===========================================================
    // Submit : the prices again (fresh) with this filter
    //===========================================================

    load():
        void
    {
        this.loadRequest?.unsubscribe();

        this.scopeRequest?.unsubscribe();

        this.scopeLoading = false;

        this.loading = true;

        this.loadError = '';

        this.view = 'list';

        const type =
            this.type;

        const filter:
            PriceListFilter =
            {
                kind:this.isSpareParts ? this.kind : '',
                brandId:this.brandId,
                categoryId:this.categoryId,
                subCategoryId:this.subCategoryId,
                stock:this.stock,
                price:this.price,
                search:''
            };

        this.refreshView();

        this.loadRequest =
            this.service
                .get(type)
                .pipe(timeout(REQUEST_TIMEOUT), takeUntilDestroyed(this.destroyRef))
                .subscribe
                (
                    {
                        next:
                            list =>
                            {
                                this.list = list;

                                this.applied = filter;

                                this.scopeError = '';

                                this.fitChildren();

                                this.rebuildItems();

                                this.applyView();

                                this.loading = false;

                                this.refreshView();
                            },

                        error:
                            err =>
                            {
                                this.loading = false;

                                this.loadError = errorText(err, 'The price list could not be loaded.');

                                this.refreshView();
                            }
                    }
                );
    }

    private clearCanvas():
        void
    {
        this.view = 'none';

        this.applied = null;

        this.rows = [];

        this.lines = [];

        this.totals = priceListTotals([]);

        this.loading = false;

        this.loadError = '';
    }

    //===========================================================
    // Refresh : default filter, empty canvas
    //===========================================================

    refresh():
        void
    {
        this.loadRequest?.unsubscribe();

        this.kind = '';

        this.brandId = 0;

        this.categoryId = 0;

        this.subCategoryId = 0;

        this.stock = 'all';

        this.price = 'all';

        this.groupBySub = true;

        this.showPart = true;

        this.searchText = '';

        this.clearCanvas();

        this.rebuildItems();

        this.loadScope();
    }

    //===========================================================
    // Layout
    //===========================================================

    // SL, Code, Product, Unit, Stock, Avg Cost, Current MRP,
    // Effective, Markup %, Unpriced
    readonly colCount =
        10;

    get markupTitle():
        string
    {
        return priceListMarkupTitle(!!this.list?.ProfitOnSale);
    }

    get markupBasis():
        string
    {
        return this.list?.ProfitOnSale ? 'on net sale' : 'on cost';
    }

    // Title over the table : type › [kind] › [brand] › [category]
    // › [sub category]
    get scopePath():
        string
    {
        const filter =
            this.applied;

        if
        (
            !filter
        )
        {
            return this.info.title;
        }

        const rows =
            this.allRows;

        return [
            this.info.title,
            filter.kind,
            filter.brandId ? rows.find(x => x.BrandId === filter.brandId)?.BrandName ?? '' : '',
            filter.categoryId ? rows.find(x => x.CategoryId === filter.categoryId)?.CategoryName ?? '' : '',
            filter.subCategoryId ? rows.find(x => x.SubCategoryId === filter.subCategoryId)?.SubCategoryName ?? '' : ''
        ]
        .filter(x => !!x)
        .join(' › ');
    }

    get filterText():
        string
    {
        const filter =
            this.applied;

        if
        (
            !filter
        )
        {
            return '';
        }

        return [
            filter.stock === 'in' ? 'In stock' : filter.stock === 'none' ? 'No stock' : '',
            filter.price === 'priced' ? 'Priced' : filter.price === 'unpriced' ? 'Unpriced' : ''
        ]
        .filter(x => !!x)
        .join(' · ');
    }

    // Main line of the product : its part name / model
    productName
    (
        row:
            PriceListRow
    ):
        string
    {
        return row.PartName || row.Name;
    }

    cost
    (
        row:
            PriceListRow
    ):
        number
    {
        return priceListCost(row);
    }

    lastCostOnly
    (
        row:
            PriceListRow
    ):
        boolean
    {
        return priceListLastCostOnly(row);
    }

    belowCost
    (
        row:
            PriceListRow
    ):
        boolean
    {
        return priceListBelowCost(row);
    }

    markup
    (
        row:
            PriceListRow
    ):
        string
    {
        return this.list
            ? formatMarkup(priceListMarkup(this.list, row))
            : '—';
    }

    markupNegative
    (
        row:
            PriceListRow
    ):
        boolean
    {
        const value =
            this.list ? priceListMarkup(this.list, row) : null;

        return value !== null && value < 0;
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
        return formatPricingDate(iso);
    }

    qty
    (
        value:
            number
    ):
        string
    {
        return formatPricingQty(value);
    }

    money
    (
        value:
            number
    ):
        string
    {
        return formatPricingMoney(value);
    }

    unitCost
    (
        value:
            number
    ):
        string
    {
        return formatPricingCost(value);
    }

    //===========================================================
    // Print : what is on the canvas (Print Viewer, new tab)
    //===========================================================

    get canPrint():
        boolean
    {
        return this.view === 'list' && !!this.applied && !this.loading && !this.loadError;
    }

    print():
        void
    {
        if
        (
            !this.canPrint || !this.applied
        )
        {
            this.toast.error(
                'Nothing to Print',
                'Submit first to show the price list.'
            );

            return;
        }

        const token =
            savePriceListPrintRequest(
                {
                    ...this.applied,
                    search:this.searchText,
                    type:this.type,
                    groupBySub:this.groupBySub,
                    showPart:this.partShown
                }
            );

        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(
                    ['/print-viewer', PRICE_LIST_PRINT_KEY, token],
                    {
                        queryParams:
                        {
                            doc:'price-list'
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

// One option per value, sorted by label
function distinct
(
    items:
        Option[]
):
    Option[]
{
    const seen =
        new Map<any, Option>();

    items.forEach
    (
        x =>
        {
            if
            (
                !seen.has(x.value)
            )
            {
                seen.set(x.value, x);
            }
        }
    );

    return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
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
        return 'The server took too long to answer. Submit again.';
    }

    const body =
        err?.error;

    return typeof body === 'string' && body.trim()
        ? body.trim()
        : fallback;
}
