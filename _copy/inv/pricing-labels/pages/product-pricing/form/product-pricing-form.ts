//===============================================================
// Imports
//===============================================================

import
{
    ApplicationRef,
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
    Observable,
    Subscription,
    catchError,
    forkJoin,
    map,
    of,
    switchMap
}
from 'rxjs';

import
{
    PageHeaderComponent
}
from '../../../../../../shared/components/layout/page-header/page-header';

import
{
    CommandCenterComponent
}
from '../../../../../../shared/components/utilities/command-center/command-center';

import
{
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

import
{
    DatepickerComponent
}
from '../../../../../../shared/components/controls/datepicker/datepicker';

import
{
    TextboxComponent
}
from '../../../../../../shared/components/controls/textbox/textbox';

import
{
    TextareaComponent
}
from '../../../../../../shared/components/controls/textarea/textarea';

import
{
    ControlSegmentComponent,
    ControlSegmentItem
}
from '../../../../../../shared/components/utilities/control-segment/control-segment';

import
{
    ToastService
}
from '../../../../../../shared/components/utilities/toast/toast.service';

import
{
    ToastComponent
}
from '../../../../../../shared/components/utilities/toast/toast';

import
{
    CheckboxComponent
}
from '../../../../../../shared/components/utilities/checkbox/checkbox';

import
{
    OrbitLoaderComponent
}
from '../../../../../../shared/components/utilities/orbit-loader/orbit-loader';

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
    CreateProductPricing,
    PRODUCT_PRICING_PRINT_KEY,
    PRODUCT_PRICING_ROUTE,
    PRODUCT_PRICING_TYPES,
    ProductPricing,
    ProductPricingBatch,
    ProductPricingBatchList,
    NewItemBin,
    NewItemResult,
    NewItemSetup,
    ProductPricingDefaults,
    ProductPricingInvoice,
    ProductPricingInvoiceLine,
    ProductPricingInvoiceLines,
    PricingBasis,
    priceFromBasis,
    ProductPricingLine,
    ProductPricingProduct,
    ProductPricingSaved,
    ProductPricingTypeInfo,
    formatPricingCost,
    formatPricingDate,
    formatPricingMoney,
    formatPricingQty,
    fromPricingIso,
    pricingProfit,
    productPricingType,
    salesVatRateOn,
    toPricingIso
}
from '../../../models/product-pricing.model';

import
{
    ProductPricingService
}
from '../../../services/product-pricing.service';


//===============================================================
// Form rows
//===============================================================

interface Option
{
    label:string;
    value:any;
}

interface Fact
{
    label:string;
    value:string;
    wide?:boolean;
}

// One product of the document (summary, right) : its in-stock
// batches and the ticked ones taking the new MRP
interface FormLine
{
    ProductId:number;
    ProductCode:string;
    ProductName:string;
    Unit:string;
    VatType:string;
    NewMrp:number;
    Notes:string;
    Batches:ProductPricingBatch[];
    Ticked:number[];
    // Its declared MRP now (price index); a line left at it is not
    // saved
    LastMrp:number;
}

// A product of a saved document, from its lines (view)
interface ViewGroup
{
    ProductId:number;
    ProductCode:string;
    ProductName:string;
    Unit:string;
    NewMrp:number;
    Notes:string;
    Lines:ProductPricingLine[];
}

// New Pricing : one received invoice line (batch) on the grid
interface InvRow
    extends ProductPricingInvoiceLine
{
    Include:boolean;
    // The line's % (text while typed) and the MRP it gives
    Percent:string;
    Suggested:number;
    // The new MRP (text while typed)
    NewMrp:string;
}

// Excel import page : one row read from the file / paste
type ImportStatus =
    'Pending' | 'NewItem' | 'Ambiguous' | 'Loading' | 'Increase' | 'Reduction' | 'NewPrice' | 'Same' | 'ReductionNew'
    | 'NoStock' | 'BelowCost' | 'NotFound' | 'BadMrp' | 'Duplicate' | 'Failed';

interface ImportRow
{
    Key:number;
    // Its row in the sheet
    Row:number;
    Code:string;
    Product:ProductPricingProduct | null;
    // Text while typed
    NewMrp:string;
    Notes:string;
    Duplicate:boolean;
    Status:ImportStatus;
    Message:string;
    Include:boolean;
    // From its stock
    Qty:number;
    LastMrp:number;
    Change:number | null;
    Profit:number | null;
    // The batches taking the new MRP (the rule)
    Ticked:number[];
    // The sheet's part name; a part number of several brands; a
    // part created by Validate (New Items)
    Name:string;
    Ambiguous:boolean;
    IsNew:boolean;
}

// Excel import : a part not in the database (New Items tab)
interface NewItemRow
{
    // Its import row
    Key:number;
    Row:number;
    PartNumber:string;
    PartName:string;
    CategoryId:number;
    SubCategoryId:number;
    Unit:string;
    RackId:number;
    Shelf:number;
    // The bin (the location; one item per bin)
    Bin:number;
    Include:boolean;
    Created:boolean;
    ProductCode:string;
    Error:string;
}


//===============================================================
// Product Pricing (Price Change) form. Same layout as Opening
// Stock :
//
//   LEFT  : Price Change Information (No, Effective Date, Product
//           Type); Add <item> : product, new MRP, its in-stock
//           batches to tick (default : unpriced + the newest).
//   RIGHT : Excel Import (Product Code, New MRP), Remarks; Price
//           Change Summary (double-click a product to edit it).
//
//   MRP (VAT inclusive) is the sale price : the only one. Save
//   keeps a draft; Post sets the MRP of every ticked batch (no
//   journal). A draft can be deleted; a posted one cancelled
//   (the old MRPs back) while no later price change touched it.
//===============================================================

@Component(
{
    selector:'app-product-pricing-form',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        CommandCenterComponent,
        SearchDropdownComponent,
        DatepickerComponent,
        TextboxComponent,
        TextareaComponent,
        ControlSegmentComponent,
        ToastComponent,
        OrbitLoaderComponent,
        CheckboxComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./product-pricing-form.html',
    styleUrl:'./product-pricing-form.css'
})
export class ProductPricingForm
    implements OnInit
{
    private readonly service =
        inject(ProductPricingService);

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly appRef =
        inject(ApplicationRef);

    private readonly destroyRef =
        inject(DestroyRef);

    // Progress dialog around save / post / delete / cancel
    private readonly progress =
        new ProgressRunner(inject(ProgressDialogService), () => this.refreshView());


    //===========================================================
    // State
    //===========================================================

    // add / edit (draft) / view (posted, cancelled, or a draft opened to view)
    mode:
        'add' | 'edit' | 'view' = 'add';

    loading:
        boolean = false;

    saving:
        boolean = false;

    error:
        string = '';

    defaults:
        ProductPricingDefaults | null = null;

    doc:
        ProductPricing | null = null;

    type:
        string = 'SP';

    info:
        ProductPricingTypeInfo = PRODUCT_PRICING_TYPES[1];

    pricingDate:
        Date = new Date();

    remarks:
        string = '';

    lines:
        FormLine[] = [];

    // New (one purchase invoice) / Reprice (by product)
    kind:
        'New' | 'Reprice' = 'New';

    readonly kindItems:
        Option[] =
        [
            { label:'New Pricing (purchase invoice)', value:'New' },
            { label:'Repricing (by product)', value:'Reprice' }
        ];

    invoices:
        ProductPricingInvoice[] = [];

    invoiceItems:
        Option[] = [];

    purchaseId:
        number = 0;

    invoice:
        ProductPricingInvoiceLines | null = null;

    invoiceLoading:
        boolean = false;

    readonly basisItems:
        Option[] =
        [
            { label:'Profit % on Cost', value:'Cost' },
            { label:'Margin % on MRP', value:'Margin' }
        ];

    basis:
        PricingBasis = 'Cost';

    basisPercent:
        string = '';

    // Pricing Basis bar : closed (chips) / open (Basis, % + apply)
    basisOpen:
        boolean = false;

    readonly basisSegments:
        ControlSegmentItem[] =
        [
            { value:'Cost', text:'Profit on Cost' },
            { value:'Margin', text:'Margin on MRP' }
        ];

    rows:
        InvRow[] = [];

    readonly typeItems:
        Option[] =
        PRODUCT_PRICING_TYPES.map(x => ({ label:x.title, value:x.type }));

    productItems:
        Option[] = [];

    facts:
        Fact[] = [];

    viewGroups:
        ViewGroup[] = [];


    //===========================================================
    // Add card
    //===========================================================

    pickId:
        number = 0;

    pickMrp:
        string = '';

    pickNotes:
        string = '';

    // The batches of the picked product and the ticked ones
    pickBatches:
        ProductPricingBatch[] = [];

    pickTicked:
        number[] = [];

    pickSuggested:
        number = 0;

    pickNote:
        string = '';

    pickLastMrp:
        number = 0;

    batchesLoading:
        boolean = false;

    editingId:
        number = 0;

    lineError:
        string = '';

    private batchRequest?:
        Subscription;


    //===========================================================
    // Cancel / Delete / Import
    //===========================================================

    cancelOpen:
        boolean = false;

    cancelReason:
        string = '';

    deleteOpen:
        boolean = false;

    importOpen:
        boolean = false;

    importText:
        string = '';

    importFile:
        string = '';

    importRows:
        ImportRow[] = [];

    // 'All', 'Ready' or a status
    importFilter:
        string = 'All';

    importLoading:
        boolean = false;

    importDragging:
        boolean = false;

    // Brand-wide repricing (Motor Bikes)
    brandId:
        number = 0;

    // Loaded once : Import reads Recheck, Load reads Reload
    importLoaded:
        boolean = false;

    // The products the last load put on the summary
    importLoadedIds:
        Set<number> = new Set<number>();


    //===========================================================
    // View refresh
    //===========================================================

    // After an async result (the progress dialog closing) : this
    // view now, then the whole app once the dialog has gone, so the
    // page never stays on its old state
    private refreshAll():
        void
    {
        this.refreshView();

        setTimeout
        (
            () =>
            {
                this.refreshView();

                try
                {
                    this.appRef.tick();
                }
                catch (error)
                {
                    console.error('[Product Pricing] view update failed', error);
                }
            },
            0
        );
    }

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
            console.error('[Product Pricing] view update failed', error);
        }
    }


    //===========================================================
    // Start
    //===========================================================

    ngOnInit():
        void
    {
        const id =
            Number(this.route.snapshot.paramMap.get('id')) || 0;

        const viewing =
            /\/view\/\d+/.test(this.router.url);

        if
        (
            id > 0
        )
        {
            this.mode = viewing ? 'view' : 'edit';

            this.loadDocument(id);

            return;
        }

        const type =
            String(this.route.snapshot.queryParamMap.get('type') ?? '').toUpperCase();

        this.setType(PRODUCT_PRICING_TYPES.some(x => x.type === type) ? type : 'SP');

        this.loadDefaults();
    }

    get isView():
        boolean
    {
        return this.mode === 'view';
    }

    private setType
    (
        type:
            string
    ):
        void
    {
        this.type = type;

        this.info = productPricingType(type);
    }

    private loadDefaults():
        void
    {
        this.loading = true;

        this.refreshView();

        this.service
            .getDefaults(this.type)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    defaults =>
                    {
                        this.loading = false;

                        this.defaults = defaults;

                        const today =
                            fromPricingIso(defaults.Today);

                        if
                        (
                            today && this.mode === 'add'
                        )
                        {
                            this.pricingDate = today;
                        }

                        this.buildProductItems();

                        if
                        (
                            this.kind === 'New'
                        )
                        {
                            this.loadInvoices();
                        }

                        this.refreshView();
                    },
                error:
                    err =>
                    {
                        this.loading = false;

                        this.error = errorText(err, 'The product pricing defaults could not be loaded.');

                        this.refreshView();
                    }
            });
    }

    private loadDocument
    (
        id:
            number
    ):
        void
    {
        this.loading = true;

        this.refreshView();

        this.service
            .getById(id)
            .pipe(
                switchMap
                (
                    doc =>
                    {
                        this.doc = doc;

                        this.setType(doc.PageType);

                        this.kind = doc.PricingKind === 'New' ? 'New' : 'Reprice';

                        if
                        (
                            doc.Status !== 'Draft' && this.mode === 'edit'
                        )
                        {
                            this.mode = 'view';

                            this.router.navigate([PRODUCT_PRICING_ROUTE, 'view', doc.ProductPricingId], { replaceUrl:true });
                        }

                        return this.service.getDefaults(doc.PageType);
                    }
                ),
                switchMap
                (
                    defaults =>
                    {
                        this.defaults = defaults;

                        if
                        (
                            this.mode !== 'edit' || !this.doc
                        )
                        {
                            return of([] as any[]) as Observable<any>;
                        }

                        // Edit, New : the invoice's lines again
                        if
                        (
                            this.kind === 'New'
                        )
                        {
                            return this.service.getInvoice(this.type, this.doc.PurchaseId) as Observable<any>;
                        }

                        // Edit : each product's batches again (to tick)
                        const ids =
                            [...new Set(this.doc.Lines.map(x => x.ProductId))];

                        return (ids.length
                            ? forkJoin(ids.map(x => this.service.getBatches(this.type, x)))
                            : of([] as any[])) as Observable<any>;
                    }
                ),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe
            ({
                next:
                    lists =>
                    {
                        this.loading = false;

                        if
                        (
                            this.mode === 'edit' && this.kind === 'New'
                        )
                        {
                            this.fillInvoiceFromDoc(lists as any);
                        }
                        else if
                        (
                            this.mode === 'edit'
                        )
                        {
                            this.fillFromDoc(lists as any[]);
                        }
                        else
                        {
                            this.buildView();
                        }

                        this.refreshView();
                    },
                error:
                    err =>
                    {
                        this.loading = false;

                        this.error = errorText(err, 'The price change could not be loaded.');

                        this.refreshView();
                    }
            });
    }

    // Edit : the saved lines become products with their batches;
    // a ticked batch no longer listed stays (the server checks it)
    private fillFromDoc
    (
        lists:
            any[]
    ):
        void
    {
        const doc =
            this.doc;

        if
        (
            !doc
        )
        {
            return;
        }

        this.pricingDate = fromPricingIso(doc.PricingDate) ?? new Date();

        this.remarks = doc.Remarks;

        this.lines =
            this.groupLines(doc.Lines).map
            (
                group =>
                {
                    const list =
                        (lists ?? []).find((x: any) => x?.ProductId === group.ProductId);

                    const batches:
                        ProductPricingBatch[] =
                        [...(list?.Batches ?? [])];

                    group.Lines
                        .filter(l => l.StockBatchId > 0 && !batches.some(b => b.StockBatchId === l.StockBatchId))
                        .forEach
                        (
                            l =>
                                batches.push(
                                {
                                    StockBatchId:l.StockBatchId,
                                    BatchNo:l.BatchNo,
                                    SourceType:l.SourceType,
                                    SourceNo:l.SourceNo,
                                    SourceDate:'',
                                    SupplierName:'',
                                    BranchId:l.BranchId,
                                    BranchName:l.BranchName,
                                    Quantity:l.Quantity,
                                    UnitCost:l.UnitCost,
                                    Mrp:l.OldMrp,
                                    SuggestedMrp:0,
                                    DefaultTicked:false
                                })
                        );

                    const product =
                        this.productById(group.ProductId);

                    return {
                        ProductId:group.ProductId,
                        ProductCode:group.ProductCode,
                        ProductName:group.ProductName,
                        Unit:group.Unit,
                        VatType:product?.VatType ?? '',
                        NewMrp:group.NewMrp,
                        Notes:group.Notes,
                        Batches:batches,
                        Ticked:group.Lines.filter(x => x.StockBatchId > 0).map(x => x.StockBatchId),
                        LastMrp:list?.LastMrp ?? product?.LastMrp ?? 0
                    };
                }
            );

        this.buildProductItems();
    }

    private groupLines
    (
        lines:
            ProductPricingLine[]
    ):
        ViewGroup[]
    {
        const groups =
            new Map<number, ViewGroup>();

        for
        (
            const line of lines
        )
        {
            let group =
                groups.get(line.ProductId);

            if
            (
                !group
            )
            {
                group =
                {
                    ProductId:line.ProductId,
                    ProductCode:line.ProductCode,
                    ProductName:line.ProductName,
                    Unit:line.Unit,
                    NewMrp:line.NewMrp,
                    Notes:line.Notes,
                    Lines:[]
                };

                groups.set(line.ProductId, group);
            }

            group.Lines.push(line);
        }

        return [...groups.values()];
    }

    private buildView():
        void
    {
        const doc =
            this.doc;

        if
        (
            !doc
        )
        {
            return;
        }

        this.viewGroups = this.groupLines(doc.Lines);

        this.facts =
            [
                { label:'Status', value:doc.Status },
                { label:'Kind', value:doc.PricingKind === 'New' ? 'New Pricing' : 'Repricing' },
                ...(doc.PricingKind === 'New'
                    ? [
                        { label:'Purchase Invoice', value:doc.PurchaseNo },
                        { label:'Supplier', value:doc.SupplierName },
                        { label:'Basis', value:`${doc.PricingBasis === 'Margin' ? 'Margin % on MRP' : 'Profit % on Cost'} · ${doc.BasisPercent}%` }
                    ]
                    : []),
                { label:'Products', value:String(doc.ProductCount) },
                { label:'Batches', value:String(doc.BatchCount) },
                { label:'Saved On', value:formatPricingDate(doc.CreatedDate) },
                { label:'Posted On', value:formatPricingDate(doc.PostedDate) },
                { label:'Journal', value:'None : stock stays at cost' }
            ];
    }

    private productById
    (
        id:
            number
    ):
        ProductPricingProduct | undefined
    {
        return this.defaults?.Products.find(x => x.Id === id);
    }

    // Products in stock, without the ones on the list (except the
    // one being edited)
    private buildProductItems():
        void
    {
        this.buildBrandItems();

        this.buildMbItems();

        const used =
            new Set(this.lines.map(x => x.ProductId));

        this.productItems =
            (this.defaults?.Products ?? [])
                .filter(x => !used.has(x.Id) || x.Id === this.editingId)
                .map
                (
                    x =>
                    ({
                        label:`${x.Code} · ${x.Name}${x.InStock > 0 ? '' : ' · no stock'}${x.UnpricedCount ? ` · ${x.UnpricedCount} unpriced` : ''}`,
                        value:x.Id
                    })
                );
    }


    //===========================================================
    // Header
    //===========================================================

    onTypeChange
    (
        value:
            any
    ):
        void
    {
        const type =
            String(value ?? '');

        if
        (
            !type || type === this.type || this.mode !== 'add' || this.lines.length > 0 || this.rows.length > 0
        )
        {
            return;
        }

        this.setType(type);

        this.resetPick();

        this.rows = [];

        this.invoice = null;

        this.purchaseId = 0;

        this.invoiceItems = [];

        this.loadDefaults();
    }

    onDateChange
    (
        value:
            any
    ):
        void
    {
        if
        (
            value instanceof Date
        )
        {
            this.pricingDate = value;
        }
    }

    get numberText():
        string
    {
        return this.doc?.PricingNo || this.defaults?.NextNumber || '';
    }


    //===========================================================
    // Sales VAT / profit
    //===========================================================

    salesVatRate
    (
        vatType:
            string
    ):
        number
    {
        if
        (
            !this.defaults?.SalesVatApplicable
        )
        {
            return 0;
        }

        return salesVatRateOn(this.defaults.SalesVatRules, vatType, toPricingIso(this.pricingDate)) ?? 0;
    }

    get profitOnSale():
        boolean
    {
        return !!this.defaults?.ProfitOnSale;
    }

    get profitLabel():
        string
    {
        return this.profitOnSale ? 'Profit on Net Sale' : 'Profit on Cost';
    }

    // Profit % on the highest-cost ticked batch (the lowest profit)
    profitOf
    (
        mrp:
            number,
        batches:
            ProductPricingBatch[],
        ticked:
            number[],
        vatType:
            string
    ):
        number | null
    {
        const costs =
            batches
                .filter(x => ticked.includes(x.StockBatchId))
                .map(x => x.UnitCost);

        if
        (
            !(mrp > 0) || costs.length === 0
        )
        {
            return null;
        }

        return pricingProfit(mrp, this.salesVatRate(vatType), Math.max(...costs), this.profitOnSale);
    }

    lineProfit
    (
        line:
            FormLine
    ):
        number | null
    {
        return this.profitOf(line.NewMrp, line.Batches, line.Ticked, line.VatType);
    }

    viewProfit
    (
        group:
            ViewGroup
    ):
        number | null
    {
        const product =
            this.productById(group.ProductId);

        // A declared-price line has no batch (no cost)
        const costs =
            group.Lines.filter(x => x.StockBatchId > 0).map(x => x.UnitCost);

        return costs.length
            ? pricingProfit(group.NewMrp, this.salesVatRate(product?.VatType ?? ''), Math.max(...costs), this.profitOnSale)
            : null;
    }


    //===========================================================
    // Add card
    //===========================================================

    get pick():
        ProductPricingProduct | null
    {
        return this.pickId
            ? this.productById(this.pickId) ?? null
            : null;
    }

    get pickMrpValue():
        number
    {
        const value =
            toNumber(this.pickMrp);

        return Number.isFinite(value) ? value : 0;
    }

    get pickProfit():
        number | null
    {
        return this.pick
            ? this.profitOf(this.pickMrpValue, this.pickBatches, this.pickChanging.map(x => x.StockBatchId), this.pick.VatType)
            : null;
    }

    get pickNetSale():
        number
    {
        const mrp =
            this.pickMrpValue;

        return this.pick && mrp > 0
            ? Math.round(mrp / (1 + this.salesVatRate(this.pick.VatType) / 100) * 100) / 100
            : 0;
    }

    // The highest cost among the ticked batches : MRP floor
    get pickFloor():
        number
    {
        const costs =
            this.pickBatches
                .filter(x => this.pickTicked.includes(x.StockBatchId))
                .map(x => x.UnitCost);

        return costs.length ? Math.max(...costs) : 0;
    }

    onPickChange
    (
        value:
            any
    ):
        void
    {
        const id =
            Number(value) || 0;

        this.lineError = '';

        if
        (
            id === this.pickId
        )
        {
            return;
        }

        this.pickId = id;

        this.pickBatches = [];

        this.pickTicked = [];

        this.pickSuggested = 0;

        this.pickNote = '';

        this.pickLastMrp = 0;

        if
        (
            !id
        )
        {
            this.refreshView();

            return;
        }

        const existing =
            this.lines.find(x => x.ProductId === id);

        if
        (
            existing
        )
        {
            this.loadIntoPick(existing);

            return;
        }

        this.pickMrp = '';

        this.pickNotes = '';

        this.batchesLoading = true;

        this.batchRequest?.unsubscribe();

        this.batchRequest =
            this.service
                .getBatches(this.type, id)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe
                ({
                    next:
                        list =>
                        {
                            if
                            (
                                this.pickId !== id
                            )
                            {
                                return;
                            }

                            this.batchesLoading = false;

                            this.pickBatches = list.Batches;

                            this.pickTicked = list.Batches.filter(x => x.DefaultTicked).map(x => x.StockBatchId);

                            this.pickSuggested = list.SuggestedMrp;

                            this.pickNote = list.SuggestionNote;

                            this.pickLastMrp = list.LastMrp;

                            this.pickMrp = list.SuggestedMrp > 0 ? String(list.SuggestedMrp) : '';

                            this.refreshView();
                        },
                    error:
                        err =>
                        {
                            this.batchesLoading = false;

                            this.lineError = errorText(err, 'The batches of the product could not be loaded.');

                            this.refreshView();
                        }
                });

        this.refreshView();
    }

    private loadIntoPick
    (
        line:
            FormLine
    ):
        void
    {
        this.pickId = line.ProductId;

        this.pickBatches = [...line.Batches];

        this.pickTicked = [...line.Ticked];

        this.pickMrp = String(line.NewMrp);

        this.pickNotes = line.Notes;

        this.pickLastMrp = Math.max(0, ...line.Batches.map(x => x.Mrp));

        this.pickSuggested = 0;

        this.pickNote = '';

        this.editingId = line.ProductId;

        this.buildProductItems();

        this.refreshView();
    }

    // Repricing : the batches that take the new MRP, by the rule.
    // An increase (or an unpriced batch) always; a reduction only
    // with switch 0013 (Price Reduction Applies to All Stock) ON;
    // never a batch whose cost is above the new MRP
    autoTicked
    (
        batches:
            ProductPricingBatch[],
        mrp:
            number
    ):
        ProductPricingBatch[]
    {
        if
        (
            !(mrp > 0)
        )
        {
            return [];
        }

        const allStock =
            !!this.defaults?.ReductionAllStock;

        return batches.filter
        (
            x =>
                Math.round(x.UnitCost * 100) / 100 <= mrp
                &&
                (x.Mrp < mrp || (allStock && x.Mrp !== mrp))
        );
    }

    get pickChanging():
        ProductPricingBatch[]
    {
        return this.autoTicked(this.pickBatches, this.pickMrpValue);
    }

    get pickRuleText():
        string
    {
        return this.defaults?.ReductionAllStock
            ? 'Up or down, all stock takes it (System Configuration).'
            : 'An increase applies to the stock; on a reduction the stock keeps its MRP.';
    }

    isTicked
    (
        batch:
            ProductPricingBatch
    ):
        boolean
    {
        return this.pickTicked.includes(batch.StockBatchId);
    }

    toggleBatch
    (
        batch:
            ProductPricingBatch
    ):
        void
    {
        this.pickTicked =
            this.isTicked(batch)
                ? this.pickTicked.filter(x => x !== batch.StockBatchId)
                : [...this.pickTicked, batch.StockBatchId];

        this.lineError = '';
    }

    get allTicked():
        boolean
    {
        return this.pickBatches.length > 0 && this.pickTicked.length === this.pickBatches.length;
    }

    toggleAll():
        void
    {
        this.pickTicked =
            this.allTicked
                ? []
                : this.pickBatches.map(x => x.StockBatchId);
    }

    useSuggested():
        void
    {
        if
        (
            this.pickSuggested > 0
        )
        {
            this.pickMrp = String(this.pickSuggested);
        }
    }

    // The figures of the Add card checked; a problem as text
    private pickProblem():
        string
    {
        if
        (
            !this.pick
        )
        {
            return `Select the ${this.info.item.toLowerCase()}.`;
        }

        if
        (
            this.batchesLoading
        )
        {
            return 'The batches are still loading.';
        }


        const mrp =
            toNumber(this.pickMrp);

        if
        (
            !Number.isFinite(mrp) || !(mrp > 0)
        )
        {
            return 'Enter the new MRP (VAT inclusive) : it is the sale price.';
        }

        if
        (
            Math.round(mrp * 100) !== mrp * 100
        )
        {
            return 'The MRP can have at most 2 decimals.';
        }


        return '';
    }

    onAddLine():
        void
    {
        const problem =
            this.pickProblem();

        if
        (
            problem
        )
        {
            this.lineError = problem;

            this.toast.error('Not Added', problem);

            this.refreshView();

            return;
        }

        const product =
            this.pick!;

        // The batches by the rule (not ticks)
        this.pickTicked =
            this.autoTicked(this.pickBatches, toNumber(this.pickMrp)).map(x => x.StockBatchId);

        // No stock taking it : a declared price (new purchases take
        // it), unless it is the MRP already
        if
        (
            this.pickTicked.length === 0 && Math.round(toNumber(this.pickMrp) * 100) === Math.round(this.lastMrpOf(product.Id) * 100)
        )
        {
            this.lineError = 'This is its MRP already : nothing changes.';

            this.toast.error('Not Added', this.lineError);

            this.refreshView();

            return;
        }

        const line:
            FormLine =
            {
                ProductId:product.Id,
                ProductCode:product.Code,
                ProductName:product.Name,
                Unit:product.Unit,
                VatType:product.VatType,
                NewMrp:Math.round(toNumber(this.pickMrp) * 100) / 100,
                Notes:this.pickNotes.trim(),
                Batches:[...this.pickBatches],
                Ticked:[...this.pickTicked],
                LastMrp:this.lastMrpOf(product.Id)
            };

        const index =
            this.lines.findIndex(x => x.ProductId === product.Id);

        if
        (
            index >= 0
        )
        {
            this.lines = this.lines.map((x, i) => i === index ? line : x);
        }
        else
        {
            this.lines = [...this.lines, line];
        }

        this.resetPick();

        this.buildProductItems();

        this.refreshView();
    }

    startEdit
    (
        line:
            FormLine
    ):
        void
    {
        if
        (
            this.isView
        )
        {
            return;
        }

        this.loadIntoPick(line);
    }

    cancelEdit():
        void
    {
        this.resetPick();

        this.buildProductItems();

        this.refreshView();
    }

    removeLine
    (
        line:
            FormLine
    ):
        void
    {
        this.lines = this.lines.filter(x => x.ProductId !== line.ProductId);

        if
        (
            this.editingId === line.ProductId
        )
        {
            this.resetPick();
        }

        this.buildProductItems();

        this.refreshView();
    }

    private resetPick():
        void
    {
        this.batchRequest?.unsubscribe();

        this.pickId = 0;

        this.pickMrp = '';

        this.pickNotes = '';

        this.pickBatches = [];

        this.pickTicked = [];

        this.pickSuggested = 0;

        this.pickNote = '';

        this.pickLastMrp = 0;

        this.batchesLoading = false;

        this.editingId = 0;

        this.lineError = '';
    }

    // The product's declared MRP now
    lastMrpOf
    (
        productId:
            number
    ):
        number
    {
        return this.pickId === productId && this.pickLastMrp > 0
            ? this.pickLastMrp
            : this.productById(productId)?.LastMrp ?? 0;
    }

    // A line that changes something : a batch takes the new MRP, or
    // the declared MRP changes
    lineChanged
    (
        line:
            FormLine
    ):
        boolean
    {
        return line.NewMrp > 0
            && (line.Ticked.length > 0 || Math.round(line.NewMrp * 100) !== Math.round(line.LastMrp * 100));
    }

    get changedLines():
        FormLine[]
    {
        return this.lines.filter(x => this.lineChanged(x));
    }

    // Summary (Motor Bikes) : the new MRP typed in the grid; its
    // stock follows the rule
    onLineMrp
    (
        line:
            FormLine,
        value:
            any
    ):
        void
    {
        const mrp =
            toNumber(String(value ?? '').replace(/,/g, ''));

        line.NewMrp = Number.isFinite(mrp) && mrp > 0 ? Math.round(mrp * 100) / 100 : 0;

        line.Ticked = this.autoTicked(line.Batches, line.NewMrp).map(x => x.StockBatchId);
    }

    // Brand-wide (Motor Bikes) : the brands of the products, built
    // once per defaults (a stable list for the dropdown)
    brandItems:
        { label:string; value:number }[] = [];

    private buildBrandItems():
        void
    {
        const map =
            new Map<number, string>();

        (this.defaults?.Products ?? [])
            .filter(x => x.BrandId !== 0 && !!x.BrandName)
            .forEach(x => map.set(x.BrandId, x.BrandName));

        this.brandItems =
            [...map.entries()]
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map(([value, label]) => ({ label, value }));
    }

    // Motor Bikes : the brand filters the Motor Bike list; it loads
    // nothing by itself
    onBrandChange
    (
        value:
            any
    ):
        void
    {
        this.brandId = Number(value) || 0;

        this.mbPickId = 0;

        this.buildMbItems();

        this.refreshView();
    }

    onMbPickChange
    (
        value:
            any
    ):
        void
    {
        this.mbPickId = Number(value) || 0;

        this.lineError = '';
    }

    // The Motor Bike list : "All models" first, then the models of
    // the brand (every model when no brand) not on the summary yet
    mbItems:
        { label:string; value:number }[] = [];

    mbPickId:
        number = 0;

    private get brandProducts():
        ProductPricingProduct[]
    {
        return (this.defaults?.Products ?? [])
            .filter(x => !this.brandId || x.BrandId === this.brandId);
    }

    private buildMbItems():
        void
    {
        const used =
            new Set(this.lines.map(x => x.ProductId));

        const brand =
            this.brandItems.find(x => x.value === this.brandId)?.label ?? '';

        const models =
            this.brandProducts.filter(x => !used.has(x.Id));

        this.mbItems =
            models.length === 0
                ? []
                : [
                    { label:`★ All models${brand ? ' of ' + brand : ''} (${models.length})`, value:-1 },
                    ...models.map
                    (
                        x =>
                        ({
                            label:`${x.Code} · ${x.Name}${x.InStock > 0 ? '' : ' · no stock'}`,
                            value:x.Id
                        })
                    )
                ];
    }

    // Add : the picked model, or all the brand's models, into the
    // summary at their MRP (typed over there)
    addModels():
        void
    {
        const used =
            new Set(this.lines.map(x => x.ProductId));

        const products =
            this.mbPickId === -1
                ? this.brandProducts.filter(x => !used.has(x.Id))
                : this.brandProducts.filter(x => x.Id === this.mbPickId && !used.has(x.Id));

        if
        (
            products.length === 0
        )
        {
            this.lineError = this.mbPickId ? 'Already on the summary.' : `Select a ${this.info.item.toLowerCase()} (or All models).`;

            this.toast.error('Not Added', this.lineError);

            this.refreshView();

            return;
        }

        this.lineError = '';

        this.progress
            .run(
                products.length === 1 ? 'Loading the Model' : 'Loading the Models',
                `Please wait while ${products.length === 1 ? products[0].Name : products.length + ' models'} and the stock are being loaded...`,
                products.length === 1 ? 'Model loaded.' : 'Models loaded.',
                this.service.getStocks(this.type, products.map(x => x.Id)))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    (lists: ProductPricingBatchList[]) =>
                    {
                        const added:
                            FormLine[] =
                            products.map
                            (
                                product =>
                                {
                                    const list =
                                        lists.find(x => x.ProductId === product.Id);

                                    const last =
                                        list?.LastMrp ?? product.LastMrp;

                                    const batches =
                                        list?.Batches ?? [];

                                    return {
                                        ProductId:product.Id,
                                        ProductCode:product.Code,
                                        ProductName:product.Name,
                                        Unit:product.Unit,
                                        VatType:product.VatType,
                                        NewMrp:last,
                                        Notes:'',
                                        Batches:batches,
                                        Ticked:this.autoTicked(batches, last).map(x => x.StockBatchId),
                                        LastMrp:last
                                    };
                                }
                            );

                        this.lines = [...this.lines, ...added];

                        this.mbPickId = 0;

                        this.buildProductItems();

                        this.refreshAll();
                    },
                error:
                    err =>
                    {
                        this.toast.error('Not Added', errorText(err, 'The models could not be loaded.'));

                        this.refreshView();
                    }
            });
    }

    // Summary (Motor Bikes) : the row's short notes
    onLineNotes
    (
        line:
            FormLine,
        value:
            any
    ):
        void
    {
        line.Notes = String(value ?? '').slice(0, 200);
    }

    tickedOf
    (
        line:
            FormLine
    ):
        ProductPricingBatch[]
    {
        return line.Batches.filter(x => line.Ticked.includes(x.StockBatchId));
    }

    // "300.00" or "300.00 – 350.00" (0 = unpriced)
    mrpRange
    (
        values:
            number[]
    ):
        string
    {
        if
        (
            values.length === 0
        )
        {
            return '—';
        }

        const low =
            Math.min(...values);

        const high =
            Math.max(...values);

        const text =
            (value: number) =>
                value > 0 ? formatPricingMoney(value) : 'unpriced';

        return low === high
            ? text(low)
            : `${text(low)} – ${text(high)}`;
    }

    oldMrps
    (
        line:
            FormLine
    ):
        number[]
    {
        return this.tickedOf(line).map(x => x.Mrp);
    }

    viewOldMrps
    (
        group:
            ViewGroup
    ):
        number[]
    {
        return group.Lines.map(x => x.OldMrp);
    }

    quantityOf
    (
        batches:
            { Quantity:number }[]
    ):
        number
    {
        return batches.reduce((t, x) => t + x.Quantity, 0);
    }

    get rowCount():
        number
    {
        return this.isView
            ? this.viewGroups.length
            : this.lines.length;
    }

    get batchCount():
        number
    {
        return this.isView
            ? (this.doc?.Lines.filter(x => x.StockBatchId > 0).length ?? 0)
            : this.lines.reduce((t, x) => t + x.Ticked.length, 0);
    }


    //===========================================================
    // New Pricing : one purchase invoice
    //===========================================================

    get isNew():
        boolean
    {
        return this.kind === 'New';
    }

    onKindChange
    (
        value:
            any
    ):
        void
    {
        const kind =
            value === 'Reprice' ? 'Reprice' : 'New';

        if
        (
            kind === this.kind || this.mode !== 'add'
        )
        {
            return;
        }

        if
        (
            this.lines.length > 0 || this.rows.length > 0
        )
        {
            this.toast.error('Not Changed', 'Clear the list first : a price change is either New Pricing or Repricing.');

            this.refreshView();

            return;
        }

        this.kind = kind;

        this.resetPick();

        if
        (
            kind === 'New'
        )
        {
            this.loadInvoices();
        }

        this.refreshView();
    }

    private loadInvoices():
        void
    {
        this.service
            .getInvoices(this.type)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    list =>
                    {
                        this.invoices = list;

                        this.invoiceItems =
                            list.map
                            (
                                x =>
                                ({
                                    label:`${x.PurchaseNo} · ${formatPricingDate(x.PurchaseDate)} · ${x.SupplierName} · ${x.InvoicePriceBasis} invoice${x.UnpricedLines ? ` · ${x.UnpricedLines} unpriced` : ' · priced'}${x.PendingLines ? ` · ${x.PendingLines} not received` : ''}`,
                                    value:x.PurchaseId
                                })
                            );

                        this.refreshView();
                    },
                error:
                    err =>
                    {
                        this.error = errorText(err, 'The purchase invoices could not be loaded.');

                        this.refreshView();
                    }
            });
    }

    onInvoiceChange
    (
        value:
            any
    ):
        void
    {
        const id =
            Number(value) || 0;

        if
        (
            id === this.purchaseId
        )
        {
            return;
        }

        this.purchaseId = id;

        this.invoice = null;

        this.rows = [];

        if
        (
            !id
        )
        {
            this.refreshView();

            return;
        }

        this.invoiceLoading = true;

        this.refreshView();

        this.service
            .getInvoice(this.type, id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    data =>
                    {
                        this.invoiceLoading = false;

                        if
                        (
                            this.purchaseId === id
                        )
                        {
                            this.applyInvoice(data, null);
                        }

                        this.refreshView();
                    },
                error:
                    err =>
                    {
                        this.invoiceLoading = false;

                        this.toast.error('Not Loaded', errorText(err, 'The purchase invoice could not be loaded.'));

                        this.refreshView();
                    }
            });
    }

    // The invoice's received lines onto the grid. New : the
    // supplier's terms (or Profit % on Cost) for every line; edit :
    // the saved lines as saved
    private applyInvoice
    (
        data:
            ProductPricingInvoiceLines,
        saved:
            ProductPricingLine[] | null
    ):
        void
    {
        this.invoice = data;

        this.purchaseId = data.Invoice.PurchaseId;

        if
        (
            !saved
        )
        {
            this.basis = data.SupplierBasis === 'Margin' ? 'Margin' : 'Cost';

            this.basisPercent = data.SupplierPercent > 0 ? String(data.SupplierPercent) : '';
        }

        const percent =
            toNumber(this.basisPercent);

        this.rows =
            data.Lines.map
            (
                line =>
                {
                    const kept =
                        saved?.find(x => x.StockBatchId === line.StockBatchId && !x.IsRaised);

                    const linePercent =
                        kept
                            ? kept.ProfitPercent
                            : (Number.isFinite(percent) ? percent : 0);

                    const suggested =
                        priceFromBasis(line.UnitCost, this.basis, linePercent, line.SalesVatRate);

                    // Saved : its MRP. Motor Bikes : the Last MRP
                    // (else the invoice's MRP). Others : the
                    // invoice's MRP, else the suggestion
                    const mrp =
                        kept
                            ? kept.NewMrp
                            : !this.usesBasis
                                ? (line.LastMrp > 0 ? line.LastMrp : line.Mrp)
                                : line.Mrp > 0
                                    ? line.Mrp
                                    : suggested;

                    return {
                        ...line,
                        Include:saved ? !!kept : true,
                        Percent:Number.isFinite(linePercent) && (kept || this.basisPercent !== '') ? String(linePercent) : '',
                        Suggested:suggested,
                        NewMrp:mrp > 0 ? String(mrp) : ''
                    };
                }
            );
    }

    private fillInvoiceFromDoc
    (
        data:
            ProductPricingInvoiceLines
    ):
        void
    {
        const doc =
            this.doc;

        if
        (
            !doc || !data
        )
        {
            return;
        }

        this.pricingDate = fromPricingIso(doc.PricingDate) ?? new Date();

        this.remarks = doc.Remarks;

        this.basis = doc.PricingBasis === 'Margin' ? 'Margin' : 'Cost';

        this.basisPercent = String(doc.BasisPercent);

        this.invoiceItems =
            [{ label:`${data.Invoice.PurchaseNo} · ${formatPricingDate(data.Invoice.PurchaseDate)} · ${data.Invoice.SupplierName}`, value:data.Invoice.PurchaseId }];

        this.applyInvoice(data, doc.Lines);
    }

    get gridEditable():
        boolean
    {
        return this.defaults?.GridEditable !== false;
    }

    get basisLabel():
        string
    {
        return this.basis === 'Margin' ? 'Margin % on MRP' : 'Profit % on Cost';
    }

    // The basis is the supplier's (Supplier Profile) as it came
    get basisFromSupplier():
        boolean
    {
        const data =
            this.invoice;

        return !!data
            && !!data.SupplierBasis
            && data.SupplierPercent > 0
            && data.SupplierBasis === this.basis
            && toNumber(this.basisPercent) === data.SupplierPercent;
    }

    get basisSource():
        string
    {
        if
        (
            !this.invoice
        )
        {
            return this.isView ? '' : 'Choose the invoice : the supplier\'s terms fill in.';
        }

        return this.basisFromSupplier
            ? 'Supplier Profile'
            : this.invoice.SupplierBasis
                ? 'Changed here'
                : 'Typed here (none on the Supplier Profile)';
    }

    // The tip : the supplier's terms, the formula, the grid lock
    get basisTip():
        string
    {
        const parts:
            string[] = [];

        if
        (
            this.invoice
        )
        {
            parts.push(this.supplierTermsText);
        }

        parts.push(
            this.basis === 'Margin'
                ? 'MRP = (cost + sales VAT) ÷ (1 − margin %), up to the whole taka.'
                : 'MRP = cost × (1 + profit %) + sales VAT, up to the whole taka.');

        parts.push(
            this.gridEditable
                ? 'Each line\'s % and New MRP can be changed on the grid.'
                : 'The grid MRP is locked to the calculated one (System Configuration).');

        return parts.join(' ');
    }

    get supplierTermsText():
        string
    {
        const data =
            this.invoice;

        if
        (
            !data
        )
        {
            return '';
        }

        return data.SupplierBasis && data.SupplierPercent > 0
            ? `${data.Invoice.SupplierName} : ${data.SupplierBasis === 'Margin' ? 'margin' : 'profit'} ${data.SupplierPercent}% ${data.SupplierBasis === 'Margin' ? 'on MRP' : 'on cost'} (Supplier Profile).`
            : `${data.Invoice.SupplierName} has no profit / margin on the Supplier Profile : enter it here.`;
    }

    onBasisChange
    (
        value:
            any
    ):
        void
    {
        this.basis = value === 'Margin' ? 'Margin' : 'Cost';

        this.rows.forEach(row => this.recompute(row, false));
    }

    // The % of the box on every line, and their MRPs again
    applyToAll():
        void
    {
        const percent =
            toNumber(this.basisPercent);

        if
        (
            !Number.isFinite(percent) || percent < 0 || (this.basis === 'Margin' && percent >= 100)
        )
        {
            this.toast.error('Not Applied', this.basis === 'Margin' ? 'Enter the margin % (0 to below 100).' : 'Enter the profit % (0 or more).');

            return;
        }

        this.rows.forEach
        (
            row =>
            {
                row.Percent = String(percent);

                this.recompute(row, true);
            }
        );

        this.refreshView();
    }

    // The line's MRP from its % (overwrite : the new MRP too)
    private recompute
    (
        row:
            InvRow,
        overwrite:
            boolean
    ):
        void
    {
        const percent =
            toNumber(row.Percent);

        row.Suggested =
            Number.isFinite(percent)
                ? priceFromBasis(row.UnitCost, this.basis, percent, row.SalesVatRate)
                : 0;

        if
        (
            overwrite || !this.gridEditable
        )
        {
            row.NewMrp = row.Suggested > 0 ? String(row.Suggested) : '';

            this.syncProduct(row);
        }
    }

    onRowPercent
    (
        row:
            InvRow,
        value:
            any
    ):
        void
    {
        row.Percent = String(value ?? '');

        this.recompute(row, true);
    }

    onRowMrp
    (
        row:
            InvRow,
        value:
            any
    ):
        void
    {
        if
        (
            !this.gridEditable
        )
        {
            return;
        }

        row.NewMrp = String(value ?? '');

        this.syncProduct(row);
    }

    // A product twice on the invoice : one MRP for both lines
    private syncProduct
    (
        row:
            InvRow
    ):
        void
    {
        this.rows
            .filter(x => x !== row && x.ProductId === row.ProductId)
            .forEach(x => x.NewMrp = row.NewMrp);
    }

    toggleRow
    (
        row:
            InvRow
    ):
        void
    {
        row.Include = !row.Include;
    }

    // A line not priced in this document : off the grid (choosing
    // the invoice again brings every line back)
    removeRow
    (
        row:
            InvRow
    ):
        void
    {
        this.rows = this.rows.filter(x => x !== row);

        this.refreshView();
    }

    get allRowsIncluded():
        boolean
    {
        return this.rows.length > 0 && this.rows.every(x => x.Include);
    }

    toggleAllRows():
        void
    {
        const on =
            !this.allRowsIncluded;

        this.rows.forEach(x => x.Include = on);
    }

    rowMrp
    (
        row:
            InvRow
    ):
        number
    {
        const value =
            toNumber(row.NewMrp);

        return Number.isFinite(value) ? value : 0;
    }

    // Motor Bikes : the MRP is the maker's, typed as it is; no
    // pricing basis (Profit % / Calculated)
    get usesBasis():
        boolean
    {
        return this.type !== 'MB';
    }

    // The profit the current MRP (Last MRP) gives on this batch
    lastProfit
    (
        row:
            InvRow
    ):
        number | null
    {
        return row.LastMrp > 0
            ? pricingProfit(row.LastMrp, row.SalesVatRate, row.UnitCost, this.profitOnSale)
            : null;
    }

    rowProfit
    (
        row:
            InvRow
    ):
        number | null
    {
        return pricingProfit(this.rowMrp(row), row.SalesVatRate, row.UnitCost, this.profitOnSale);
    }

    rowBelowCost
    (
        row:
            InvRow
    ):
        boolean
    {
        const mrp =
            this.rowMrp(row);

        return mrp > 0 && mrp < Math.round(row.UnitCost * 100) / 100;
    }

    get includedRows():
        InvRow[]
    {
        return this.rows.filter(x => x.Include);
    }

    get invoiceTotals():
        { cost:number; sale:number }
    {
        return this.includedRows.reduce
        (
            (t, x) =>
            ({
                cost:t.cost + x.ReceivedQuantity * x.UnitCost,
                sale:t.sale + x.ReceivedQuantity * this.rowMrp(x)
            }),
            { cost:0, sale:0 }
        );
    }

    private newProblem():
        string
    {
        if
        (
            !this.purchaseId || !this.invoice
        )
        {
            return 'Choose the purchase invoice to price.';
        }

        const rows =
            this.includedRows;

        if
        (
            rows.length === 0
        )
        {
            return 'Tick at least one line of the invoice.';
        }

        for
        (
            const row of rows
        )
        {
            const mrp =
                this.rowMrp(row);

            if
            (
                !(mrp > 0) || Math.round(mrp * 100) !== mrp * 100
            )
            {
                return `${row.ProductName} : enter the new MRP (above 0, at most 2 decimals).`;
            }

            if
            (
                this.rowBelowCost(row)
            )
            {
                return `${row.ProductName} : the MRP ${formatPricingMoney(mrp)} is below the cost ${formatPricingCost(row.UnitCost)}. MRP must be equal to or more than the cost.`;
            }

            const other =
                rows.find(x => x.ProductId === row.ProductId && this.rowMrp(x) !== mrp);

            if
            (
                other
            )
            {
                return `${row.ProductName} : its lines take one new MRP.`;
            }
        }

        return '';
    }


    //===========================================================
    // Excel import page : Product Code, New MRP, Notes. Read from
    // an .xlsx / .xls / .csv file or rows pasted from Excel; each
    // row checked against its stock (status chips, Include ticks)
    // and the ticked ones loaded to the Price Change Summary
    //===========================================================

    readonly importColumns:
        string[] =
        ['Part Number', 'New MRP', 'Notes'];

    // The template : every product by its part number and name
    // (what suppliers know; the product code and the stock stay
    // internal), its current MRP to compare
    private readonly templateColumns:
        string[] =
        ['Part Number', 'Part Name', 'Current MRP', 'New MRP', 'Notes'];

    readonly importStatusText:
        Record<ImportStatus, string> =
        {
            Pending:'Not checked',
            NewItem:'Not in database',
            Ambiguous:'Several brands',
            Loading:'Checking…',
            Increase:'Increase',
            Reduction:'Reduction',
            NewPrice:'Prices unpriced',
            Same:'Same MRP',
            ReductionNew:'New purchases only',
            NoStock:'No stock',
            BelowCost:'Below cost',
            NotFound:'Not found',
            BadMrp:'Invalid MRP',
            Duplicate:'Duplicate',
            Failed:'Not checked'
        };

    // Chip order on the page
    readonly importStatusOrder:
        ImportStatus[] =
        ['Increase', 'Reduction', 'NewPrice', 'Same', 'ReductionNew', 'NoStock', 'NewItem', 'BelowCost', 'NotFound', 'Ambiguous', 'BadMrp', 'Duplicate', 'Failed', 'Pending', 'Loading'];

    private importType =
        '';

    private importKey =
        0;

    private readonly importCache =
        new Map<number, ProductPricingBatchList>();

    get importSubtitle():
        string
    {
        return `${this.info.title} : new MRP per product, checked against its stock before it goes to the Price Change Summary`;
    }

    openImport():
        void
    {
        if
        (
            this.importType !== this.type
        )
        {
            this.clearImport();

            this.importType = this.type;
        }

        this.importOpen = true;

        this.refreshView();
    }

    closeImport():
        void
    {
        this.importOpen = false;

        this.refreshView();
    }

    clearImport():
        void
    {
        this.importRows = [];

        this.newItems = [];

        this.importView = 'check';

        this.importLoaded = false;

        this.importLoadedIds = new Set<number>();

        this.importText = '';

        this.importFile = '';

        this.importFilter = 'All';

        this.importCache.clear();

        this.refreshView();
    }

    // Excel template (.xlsx) : every product with its stock and
    // current MRP; fill New MRP (a blank New MRP row is skipped)
    async downloadTemplate():
        Promise<void>
    {
        const rows:
            (string | number)[][] =
            [
                this.templateColumns,
                ...(this.defaults?.Products ?? []).map
                (
                    x => [x.PartNumber, x.PartName, x.LastMrp || '', '', '']
                )
            ];

        const name =
            `Product Pricing - ${this.info.title} - Template`;

        try
        {
            const XLSX =
                await import('xlsx');

            const sheet =
                XLSX.utils.aoa_to_sheet(rows);

            sheet['!cols'] = [{ wch:18 }, { wch:44 }, { wch:13 }, { wch:12 }, { wch:30 }];

            const book =
                XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(book, sheet, 'Price List');

            XLSX.writeFile(book, `${name}.xlsx`);
        }
        catch
        {
            // No Excel library : the same template as CSV
            const csv =
                rows.map(row => row.map(x => csvCell(String(x))).join(',')).join('\r\n');

            const blob =
                new Blob(['﻿' + csv], { type:'text/csv;charset=utf-8' });

            const url =
                URL.createObjectURL(blob);

            const link =
                document.createElement('a');

            link.href = url;

            link.download = `${name}.csv`;

            document.body.appendChild(link);

            link.click();

            link.remove();

            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
    }

    onImportFile
    (
        event:
            Event
    ):
        void
    {
        const input =
            event.target as HTMLInputElement;

        const file =
            input.files?.[0];

        input.value = '';

        if
        (
            file
        )
        {
            this.readImportFile(file);
        }
    }

    // The attachment (file or paste) removed : its rows and New
    // Items go; a load already on the summary stays there
    removeAttachment():
        void
    {
        const loaded =
            this.importLoaded;

        const loadedIds =
            this.importLoadedIds;

        this.clearImport();

        this.importLoaded = loaded;

        this.importLoadedIds = loadedIds;
    }

    onImportDrop
    (
        event:
            DragEvent
    ):
        void
    {
        event.preventDefault();

        this.importDragging = false;

        const file =
            event.dataTransfer?.files?.[0];

        if
        (
            file
        )
        {
            this.readImportFile(file);
        }
    }

    onImportDragOver
    (
        event:
            DragEvent
    ):
        void
    {
        event.preventDefault();

        this.importDragging = true;
    }

    private async readImportFile
    (
        file:
            File
    ):
        Promise<void>
    {
        this.importFile = file.name;

        this.importText = '';

        try
        {
            if
            (
                /\.(xlsx|xlsm|xls|ods)$/i.test(file.name)
            )
            {
                const XLSX =
                    await import('xlsx');

                const book =
                    XLSX.read(await file.arrayBuffer(), { type:'array' });

                const sheet =
                    book.Sheets[book.SheetNames[0]];

                const rows =
                    XLSX.utils.sheet_to_json<string[]>(sheet, { header:1, raw:false, defval:'' })
                        .map(row => row.map(x => String(x ?? '')));

                this.readRows(rows);
            }
            else
            {
                this.readRows(parseRows(await file.text()));
            }

            this.importFile = `${file.name} · ${this.importRows.length} ${this.importRows.length === 1 ? 'row' : 'rows'}`;

            if
            (
                this.importRows.length === 0
            )
            {
                this.toast.error('Nothing Read', `${file.name} has no row with a New MRP : fill the New MRP column of the rows to price.`);
            }
        }
        catch
        {
            this.importFile = '';

            this.toast.error('Not Read', `${file.name} could not be read. Use an .xlsx, .xls or .csv file, or paste the rows.`);

            this.refreshView();
        }
    }

    // Ctrl+V of cells copied from Excel (tab separated) : read at
    // once
    onImportPaste
    (
        event:
            ClipboardEvent
    ):
        void
    {
        const text =
            event.clipboardData?.getData('text/plain') ?? '';

        if
        (
            !text.trim()
        )
        {
            return;
        }

        event.preventDefault();

        this.importText = '';

        this.readRows(parseRows(text));

        this.importFile = `Pasted from Excel · ${this.importRows.length} ${this.importRows.length === 1 ? 'row' : 'rows'}`;
    }

    onImportText
    (
        value:
            string
    ):
        void
    {
        this.importText = value;
    }

    // Check : typed rows (if any) read first; then every row's
    // stock read under the progress dialog
    checkImport():
        void
    {
        if
        (
            this.importText.trim()
        )
        {
            this.readRows(parseRows(this.importText));

            this.importText = '';

            this.importFile = `Typed rows · ${this.importRows.length} ${this.importRows.length === 1 ? 'row' : 'rows'}`;
        }

        if
        (
            this.importRows.length > 0
        )
        {
            this.loadImportStock();
        }
    }

    private readRows
    (
        source:
            string[][]
    ):
        void
    {
        // A new sheet : read fresh on its Check
        this.importCache.clear();

        const all =
            source.filter(x => x.some(v => !!String(v ?? '').trim()));

        // A heading row (not a product) : columns by their names
        const names =
            (all[0] ?? []).map(x => String(x ?? '').trim().toLowerCase().replace(/[.:]/g, ''));

        const known =
            ['part number', 'part no', 'part name', 'product code', 'code', 'product name', 'name', 'new mrp'];

        const heading =
            names.some(x => known.includes(x))
            &&
            !this.findProduct(String(all[0]?.[0] ?? ''));

        const rows =
            heading ? all.slice(1) : all;

        const find =
            (...keys: string[]) =>
                keys.map(k => names.indexOf(k)).find(n => n >= 0) ?? -1;

        // No heading : by position. The template's layout (Part
        // Number, Part Name, Current MRP, New MRP, Notes) when the
        // rows are that wide, else Part Number, New MRP, Notes. A
        // stock column is never read : the stock is the system's
        const width =
            heading ? 0 : Math.max(0, ...rows.map(x => x.length));

        const mrpPos =
            width >= 6 ? 4 : (width >= 4 ? 3 : 1);

        const partAt =
            heading ? find('part number', 'part no', 'product code', 'code') : 0;

        const nameAt =
            heading ? find('part name', 'product name', 'name') : (width >= 4 ? 1 : -1);

        const mrpAt =
            heading ? find('new mrp') : mrpPos;

        const notesAt =
            heading ? find('notes', 'note', 'remarks') : mrpPos + 1;

        const cell =
            (cells: string[], n: number) =>
                n < 0 ? '' : String(cells[n] ?? '').trim();

        const seen =
            new Set<number>();

        const list:
            ImportRow[] = [];

        rows.forEach
        (
            (cells, index) =>
            {
                const part =
                    cell(cells, partAt);

                const name =
                    cell(cells, nameAt);

                const code =
                    part || name;

                const mrp =
                    cell(cells, mrpAt);

                // The template's rows left blank : skipped
                if
                (
                    !mrp && !cell(cells, notesAt)
                )
                {
                    return;
                }

                // By its part number (unique within a brand); the
                // name only settles a part number of several brands
                const match =
                    this.matchProduct(part, name);

                const product =
                    match.product;

                const row:
                    ImportRow =
                    {
                        Key:++this.importKey,
                        Row:index + (heading ? 2 : 1),
                        Code:code,
                        Product:product,
                        NewMrp:mrp.replace(/,/g, ''),
                        Notes:cell(cells, notesAt).slice(0, 200),
                        Duplicate:!!product && seen.has(product.Id),
                        Status:'Loading',
                        Message:'',
                        Include:false,
                        Qty:product?.InStock ?? 0,
                        LastMrp:product?.LastMrp ?? 0,
                        Change:null,
                        Profit:null,
                        Ticked:[],
                        Name:name,
                        Ambiguous:match.ambiguous,
                        IsNew:false
                    };

                if
                (
                    product
                )
                {
                    seen.add(product.Id);
                }

                list.push(row);
            }
        );

        this.importRows = list;

        this.importFilter = 'All';

        if
        (
            list.length === 0
        )
        {
            this.toast.error('Nothing to Import', 'No row with a New MRP was found. Use the template\'s columns : Part Number, New MRP, Notes.');
        }

        // Into the grid only : the stock is read on Analyze
        this.importRows.forEach(x => this.evaluateImport(x));

        this.buildNewItems();

        this.refreshView();
    }

    // Its product : by part number, then by the product code (an
    // older sheet), the full name, then a part name only one product
    // has
    private findProduct
    (
        text:
            string
    ):
        ProductPricingProduct | null
    {
        return this.matchProduct(text, '').product;
    }

    // The Spare Parts page's part number key : no spaces, hyphens or
    // dots, upper case
    partKey
    (
        text:
            string
    ):
        string
    {
        return String(text ?? '').replace(/[\s.\-]/g, '').toUpperCase();
    }

    // By the part number key (unique within a brand). Several
    // brands with it : the part name settles it, else ambiguous. An
    // older sheet's product code still works; no part number : a part
    // name only one product has
    matchProduct
    (
        part:
            string,
        name:
            string
    ):
        { product:ProductPricingProduct | null; ambiguous:boolean }
    {
        const products =
            this.defaults?.Products ?? [];

        const key =
            this.partKey(part);

        const nameKey =
            String(name ?? '').trim().toUpperCase();

        if
        (
            key
        )
        {
            const byPart =
                products.filter(x => !!x.PartNumber && this.partKey(x.PartNumber) === key);

            if
            (
                byPart.length === 1
            )
            {
                return { product:byPart[0], ambiguous:false };
            }

            if
            (
                byPart.length > 1
            )
            {
                const named =
                    byPart.filter(x => x.PartName.trim().toUpperCase() === nameKey);

                return named.length === 1
                    ? { product:named[0], ambiguous:false }
                    : { product:null, ambiguous:true };
            }

            const byCode =
                products.find(x => x.Code.toUpperCase() === String(part).trim().toUpperCase());

            if
            (
                byCode
            )
            {
                return { product:byCode, ambiguous:false };
            }

            return { product:null, ambiguous:false };
        }

        if
        (
            nameKey
        )
        {
            const byName =
                products.filter(x => x.PartName.trim().toUpperCase() === nameKey || x.Name.toUpperCase() === nameKey);

            if
            (
                byName.length === 1
            )
            {
                return { product:byName[0], ambiguous:false };
            }
        }

        return { product:null, ambiguous:false };
    }

    // The stock (batches) of each product, once per product
    private loadImportStock():
        void
    {
        const ids =
            [...new Set(this.importRows.filter(x => x.Product && !this.importCache.has(x.Product.Id)).map(x => x.Product!.Id))];

        this.importRows.forEach(x => this.evaluateImport(x));

        // Spare Parts / Lubricants : the groups and racks for the
        // parts not in the database
        const needSetup =
            this.type === 'SP' && this.newItems.length > 0 && !this.newItemSetup;

        if
        (
            ids.length === 0 && !needSetup
        )
        {
            this.suggestNewItems();

            this.refreshAll();

            return;
        }

        this.importLoading = true;

        this.refreshView();

        const finish =
            () =>
            {
                this.importLoading = false;

                try
                {
                    this.importRows.forEach(x => this.evaluateImport(x, true));

                    this.suggestNewItems();
                }
                catch (error)
                {
                    console.error('[Product Pricing] import check failed', error);
                }

                // New row objects : every row (and its tick box) is
                // drawn again, not only the changed bindings
                this.importRows = this.importRows.map(x => ({ ...x, Ticked:[...x.Ticked] }));

                this.refreshAll();
            };

        // One call for the stock, one for the setup, under the
        // progress dialog
        this.progress
            .run(
                'Analyzing the Price List',
                `Please wait while ${this.importRows.length} ${this.importRows.length === 1 ? 'row is' : 'rows are'} matched by part number and the stock is read...`,
                'Price list analyzed.',
                forkJoin
                ({
                    stocks:ids.length ? this.service.getStocks(this.type, ids) : of([] as ProductPricingBatchList[]),
                    setup:needSetup ? this.service.getNewItemSetup(this.type) : of(null)
                }) as Observable<any>)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    (result: { stocks:ProductPricingBatchList[]; setup:NewItemSetup | null }) =>
                    {
                        (result?.stocks ?? []).forEach(x => this.importCache.set(x.ProductId, x));

                        if
                        (
                            result?.setup
                        )
                        {
                            this.newItemSetup = result.setup;
                        }

                        finish();
                    },
                error:
                    err =>
                    {
                        this.toast.error('Not Analyzed', errorText(err, 'The price list could not be analyzed.'));

                        finish();
                    }
            });
    }


    //===========================================================
    // New Items (Spare Parts / Lubricants) : parts not in the
    // database, created with the Spare Parts page's rules
    //===========================================================

    importView:
        'check' | 'new' = 'check';

    newItems:
        NewItemRow[] = [];

    newItemSetup:
        NewItemSetup | null = null;

    newItemsBusy:
        boolean = false;

    // One per part number not in the database (the first row of a
    // part number; a duplicate row stays a duplicate)
    private buildNewItems():
        void
    {
        const kept =
            new Map(this.newItems.map(x => [this.partKey(x.PartNumber), x]));

        const seen =
            new Set<string>();

        this.newItems =
            this.importRows
                .filter(x => !x.Product && !x.Ambiguous && !!x.Code && this.type === 'SP')
                .filter
                (
                    x =>
                    {
                        const key =
                            this.partKey(x.Code);

                        if
                        (
                            seen.has(key)
                        )
                        {
                            return false;
                        }

                        seen.add(key);

                        return true;
                    }
                )
                .map
                (
                    x =>
                    {
                        const old =
                            kept.get(this.partKey(x.Code));

                        return old && !old.Created
                            ? { ...old, Key:x.Key, Row:x.Row, PartName:old.PartName || x.Name }
                            : {
                                Key:x.Key,
                                Row:x.Row,
                                PartNumber:x.Code,
                                PartName:x.Name,
                                CategoryId:0,
                                SubCategoryId:0,
                                Unit:'Pcs',
                                RackId:0,
                                Shelf:0,
                                Bin:0,
                                Include:true,
                                Created:false,
                                ProductCode:'',
                                Error:''
                            };
                    }
                );
    }

    // The suggested group / sub-group : the part sharing the longest
    // part number start (4 characters or more); else the group /
    // sub-group most of this sheet's parts are in; else the first
    private suggestNewItems():
        void
    {
        const setup =
            this.newItemSetup;

        if
        (
            !setup || setup.Categories.length === 0
        )
        {
            return;
        }

        const products =
            (this.defaults?.Products ?? []).filter(x => !!x.PartNumber && x.CategoryId > 0);

        const valid =
            (categoryId: number, subId: number) =>
                setup.SubCategories.some(s => s.Id === subId && s.CategoryId === categoryId);

        // Most common among the matched rows
        const counts =
            new Map<string, number>();

        this.importRows
            .filter(x => !!x.Product && x.Product.CategoryId > 0)
            .forEach
            (
                x =>
                {
                    const k =
                        `${x.Product!.CategoryId}:${x.Product!.SubCategoryId}`;

                    counts.set(k, (counts.get(k) ?? 0) + 1);
                }
            );

        const common =
            [...counts.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([k]) => k.split(':').map(Number))
                .find(([c, s]) => valid(c, s));

        const first =
            setup.Categories[0];

        const firstSub =
            setup.SubCategories.find(s => s.CategoryId === first.Id);

        this.newItems
            .filter(x => !x.Created && !x.CategoryId)
            .forEach
            (
                item =>
                {
                    const key =
                        this.partKey(item.PartNumber);

                    let best:
                        ProductPricingProduct | null = null;

                    let bestLength =
                        3;

                    products.forEach
                    (
                        p =>
                        {
                            const other =
                                this.partKey(p.PartNumber);

                            let n =
                                0;

                            while (n < key.length && n < other.length && key[n] === other[n])
                            {
                                n++;
                            }

                            if
                            (
                                n > bestLength && valid(p.CategoryId, p.SubCategoryId)
                            )
                            {
                                best = p;

                                bestLength = n;
                            }
                        }
                    );

                    const chosen =
                        best as ProductPricingProduct | null;

                    if
                    (
                        chosen
                    )
                    {
                        item.CategoryId = chosen.CategoryId;

                        item.SubCategoryId = chosen.SubCategoryId;
                    }
                    else if
                    (
                        common
                    )
                    {
                        item.CategoryId = common[0];

                        item.SubCategoryId = common[1];
                    }
                    else
                    {
                        item.CategoryId = first.Id;

                        item.SubCategoryId = firstSub?.Id ?? 0;
                    }
                }
            );
    }

    subCategoriesOf
    (
        categoryId:
            number
    ):
        { Id:number; Name:string }[]
    {
        return (this.newItemSetup?.SubCategories ?? []).filter(x => x.CategoryId === categoryId);
    }

    onNewCategory
    (
        item:
            NewItemRow,
        value:
            any
    ):
        void
    {
        item.CategoryId = Number(value) || 0;

        const subs =
            this.subCategoriesOf(item.CategoryId);

        if
        (
            !subs.some(x => x.Id === item.SubCategoryId)
        )
        {
            item.SubCategoryId = subs[0]?.Id ?? 0;
        }

        item.Error = '';
    }

    // The rack's free bins, less those picked on other rows
    // (one item per bin), shelf-then-bin
    private freeBinsOf
    (
        item:
            NewItemRow
    ):
        NewItemBin[]
    {
        const rack =
            this.newItemSetup?.Racks.find(x => x.Id === item.RackId);

        const taken =
            new Set(
                this.newItems
                    .filter(x => x !== item && !x.Created && x.RackId === item.RackId && x.Shelf > 0)
                    .map(x => `${x.Shelf}:${x.Bin || 1}`));

        return (rack?.FreeBins ?? [])
            .filter
            (
                b =>
                    !taken.has(`${b.ShelfNumber}:${b.BinNumber}`)
                    || (b.ShelfNumber === item.Shelf && b.BinNumber === item.Bin)
            );
    }

    // The rack's shelves with a free bin for this row
    shelvesOf
    (
        item:
            NewItemRow
    ):
        number[]
    {
        return [...new Set(this.freeBinsOf(item).map(x => x.ShelfNumber))];
    }

    // The free bins of the row's shelf
    binsOf
    (
        item:
            NewItemRow
    ):
        NewItemBin[]
    {
        return this.freeBinsOf(item).filter(x => x.ShelfNumber === item.Shelf);
    }

    // A-03-05 of the row's place ('' = no place); the server's code
    newItemPlace
    (
        item:
            NewItemRow
    ):
        string
    {
        if
        (
            !item.RackId || !item.Shelf
        )
        {
            return '';
        }

        const rack =
            this.newItemSetup?.Racks.find(x => x.Id === item.RackId);

        return rack?.FreeBins.find(x => x.ShelfNumber === item.Shelf && x.BinNumber === (item.Bin || 1))?.BinCode
            ?? '';
    }

    onNewRack
    (
        item:
            NewItemRow,
        value:
            any
    ):
        void
    {
        item.RackId = Number(value) || 0;

        item.Shelf = 0;

        item.Bin = 0;

        // The first free bin of the rack (shelf-then-bin)
        const first =
            item.RackId ? this.freeBinsOf(item)[0] : undefined;

        item.Shelf = first?.ShelfNumber ?? 0;

        item.Bin = first?.BinNumber ?? 0;

        item.Error = '';
    }

    setNewSub
    (
        item:
            NewItemRow,
        value:
            any
    ):
        void
    {
        item.SubCategoryId = Number(value) || 0;

        item.Error = '';
    }

    setNewShelf
    (
        item:
            NewItemRow,
        value:
            any
    ):
        void
    {
        item.Shelf = Number(value) || 0;

        item.Bin = item.Shelf ? (this.binsOf(item)[0]?.BinNumber ?? 0) : 0;
    }

    setNewBin
    (
        item:
            NewItemRow,
        value:
            any
    ):
        void
    {
        item.Bin = Number(value) || 0;
    }

    get newItemsPending():
        NewItemRow[]
    {
        return this.newItems.filter(x => !x.Created);
    }

    get newItemsReady():
        NewItemRow[]
    {
        return this.newItemsPending.filter(x => x.Include);
    }

    toggleNewItem
    (
        item:
            NewItemRow
    ):
        void
    {
        if
        (
            !item.Created
        )
        {
            item.Include = !item.Include;
        }
    }

    get newItemsAllTicked():
        boolean
    {
        const pending =
            this.newItemsPending;

        return pending.length > 0 && pending.every(x => x.Include);
    }

    toggleNewItemsAll():
        void
    {
        const value =
            !this.newItemsAllTicked;

        this.newItemsPending.forEach(x => x.Include = value);
    }

    // The main grid's "Set up" : the New Items tab
    openNewItems():
        void
    {
        this.importView = 'new';

        this.refreshView();
    }

    // Validate : every ticked row checked here, then created on the
    // server (each answers on its own); a created part becomes a
    // priceable row (no stock : its declared price)
    validateNewItems():
        void
    {
        const items =
            this.newItemsReady;

        if
        (
            items.length === 0 || this.newItemsBusy
        )
        {
            this.toast.error('Nothing to Validate', 'Tick at least one new item.');

            return;
        }

        let bad =
            0;

        items.forEach
        (
            x =>
            {
                x.Error =
                    !x.PartNumber.trim() ? 'Part number is required.'
                    : !x.PartName.trim() ? 'Part name is required.'
                    : !x.CategoryId ? 'Choose the group.'
                    : !x.SubCategoryId ? 'Choose the sub-group.'
                    : x.RackId && !x.Shelf ? 'Choose the shelf (or no rack).'
                    : x.RackId && !x.Bin ? 'Choose the bin (or no rack).'
                    : x.RackId && !this.binsOf(x).some(b => b.BinNumber === x.Bin) ? 'The bin is not free (one item per bin) : choose another.'
                    : '';

                if
                (
                    x.Error
                )
                {
                    bad++;
                }
            }
        );

        if
        (
            bad > 0
        )
        {
            this.toast.error('Not Validated', `${bad} ${bad === 1 ? 'row needs' : 'rows need'} attention.`);

            this.refreshView();

            return;
        }

        this.newItemsBusy = true;

        this.progress
            .run(
                'Creating the New Parts',
                `Please wait while ${items.length} ${items.length === 1 ? 'part is' : 'parts are'} created with the Spare Parts rules...`,
                'New parts created.',
                this.service.createNewItems
                (
                    items.map
                    (
                        x =>
                        ({
                            Key:x.Key,
                            ProductCategoryId:x.CategoryId,
                            ProductSubCategoryId:x.SubCategoryId,
                            PartNumber:x.PartNumber.trim(),
                            PartName:x.PartName.trim(),
                            Unit:x.Unit || 'Pcs',
                            RackManagementId:x.RackId,
                            ShelfNumber:x.RackId ? x.Shelf : 0,
                            BinNumber:x.RackId && x.Shelf ? (x.Bin || 1) : 0
                        })
                    )
                ).pipe(switchMap((results: NewItemResult[]) => this.service.getDefaults(this.type).pipe(map(defaults => ({ results, defaults }))))) as Observable<any>)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    (answer: { results:NewItemResult[]; defaults:ProductPricingDefaults }) =>
                    {
                        this.newItemsBusy = false;

                        if
                        (
                            answer?.defaults
                        )
                        {
                            this.defaults = answer.defaults;

                            this.buildProductItems();
                        }

                        let created =
                            0;

                        (answer?.results ?? []).forEach
                        (
                            result =>
                            {
                                const item =
                                    this.newItems.find(x => x.Key === result.Key);

                                if
                                (
                                    !item
                                )
                                {
                                    return;
                                }

                                if
                                (
                                    !result.Created
                                )
                                {
                                    item.Error = result.Error || 'Not created.';

                                    return;
                                }

                                created++;

                                const product =
                                    this.productById(result.ProductId) ?? this.matchProduct(item.PartNumber, item.PartName).product;

                                item.Created = true;

                                item.Error = '';

                                item.ProductCode = product?.Code ?? result.ProductCode;

                                // Its bin is no longer free (the shelf stays
                                // free while it has another free bin)
                                const rack =
                                    this.newItemSetup?.Racks.find(r => r.Id === item.RackId);

                                if
                                (
                                    rack
                                )
                                {
                                    rack.FreeBins = rack.FreeBins.filter(b => !(b.ShelfNumber === item.Shelf && b.BinNumber === (item.Bin || 1)));

                                    rack.FreeShelves = rack.FreeShelves.filter(n => rack.FreeBins.some(b => b.ShelfNumber === n));
                                }

                                // Every sheet row of this part number : now a
                                // priceable product (no stock yet)
                                this.importRows
                                    .filter(x => !x.Product && this.partKey(x.Code) === this.partKey(item.PartNumber))
                                    .forEach
                                    (
                                        row =>
                                        {
                                            row.Product = product ?? null;

                                            row.IsNew = true;

                                            if
                                            (
                                                product
                                            )
                                            {
                                                this.importCache.set(product.Id, { ProductId:product.Id, SuggestedMrp:0, SuggestionNote:'', LastMrp:0, Batches:[] });
                                            }
                                        }
                                    );
                            }
                        );

                        this.importRows.forEach(x => this.evaluateImport(x, true));

                        this.importRows = this.importRows.map(x => ({ ...x, Ticked:[...x.Ticked] }));

                        const failed =
                            (answer?.results ?? []).filter(x => !x.Created).length;

                        if
                        (
                            created > 0
                        )
                        {
                            this.toast.success('Validated', `${created} new ${created === 1 ? 'part' : 'parts'} created${failed ? `; ${failed} not (see the rows)` : ''}. They are priceable now.`);
                        }
                        else
                        {
                            this.toast.error('Not Validated', 'No part was created : see the rows.');
                        }

                        this.refreshAll();
                    },
                error:
                    err =>
                    {
                        this.newItemsBusy = false;

                        this.toast.error('Not Validated', errorText(err, 'The new parts could not be created.'));

                        this.refreshView();
                    }
            });
    }

    // View : a product's batches open under it in the summary
    private readonly viewOpen =
        new Set<number>();

    isViewOpen
    (
        group:
            ViewGroup
    ):
        boolean
    {
        return this.viewOpen.has(group.ProductId);
    }

    toggleViewOpen
    (
        group:
            ViewGroup
    ):
        void
    {
        if
        (
            this.viewOpen.has(group.ProductId)
        )
        {
            this.viewOpen.delete(group.ProductId);
        }
        else
        {
            this.viewOpen.add(group.ProductId);
        }

        this.refreshView();
    }

    // The row's product is on the Price Change Summary
    inSummary
    (
        row:
            ImportRow
    ):
        boolean
    {
        return !!row.Product && this.lines.some(x => x.ProductId === row.Product!.Id);
    }

    get importInSummary():
        number
    {
        return this.importRows.filter(x => this.inSummary(x)).length;
    }

    importLoadable
    (
        row:
            ImportRow
    ):
        boolean
    {
        return row.Status === 'Increase' || row.Status === 'Reduction' || row.Status === 'NewPrice' || row.Status === 'ReductionNew' || row.Status === 'NoStock';
    }

    // The row's status, by the stock rule (autoTicked)
    private evaluateImport
    (
        row:
            ImportRow,
        settled:
            boolean = false
    ):
        void
    {
        const was =
            this.importLoadable(row);

        const set =
            (status: ImportStatus, message: string) =>
            {
                row.Status = status;

                row.Message = message;
            };

        row.Qty = row.Product?.InStock ?? 0;

        row.Change = null;

        row.Profit = null;

        row.Ticked = [];

        const product =
            row.Product;

        const mrp =
            toNumber(row.NewMrp);

        const list =
            product ? this.importCache.get(product.Id) : undefined;

        row.LastMrp = list?.LastMrp ?? product?.LastMrp ?? 0;

        if
        (
            !product
        )
        {
            if
            (
                row.Ambiguous
            )
            {
                set('Ambiguous', `Part number "${row.Code}" is in more than one brand : give its exact part name in the sheet.`);
            }
            else if
            (
                this.type === 'SP' && !!row.Code
            )
            {
                set('NewItem', `"${row.Code}" is not in the database : set it up on the New Items tab and Validate; then it can be priced.`);
            }
            else
            {
                set('NotFound', row.Code ? `"${row.Code}" is not a ${this.info.title} product.` : 'No part number.');
            }
        }
        else if
        (
            row.Duplicate
        )
        {
            set('Duplicate', `${product.Code} is on the list more than once : only its first row is used.`);
        }
        else if
        (
            !Number.isFinite(mrp) || !(mrp > 0) || Math.round(mrp * 100) !== mrp * 100
        )
        {
            set('BadMrp', 'The new MRP must be above 0, at most 2 decimals.');
        }
        else if
        (
            !list
        )
        {
            set(settled ? 'Failed' : 'Pending', settled ? 'Its stock could not be read : press Check again.' : 'Press Check : its stock is read and the row checked.');
        }
        else
        {
            const batches =
                list.Batches;

            const ticked =
                this.autoTicked(batches, mrp);

            row.Qty = this.quantityOf(batches);

            row.Ticked = ticked.map(x => x.StockBatchId);

            row.Change = row.LastMrp > 0 ? Math.round((mrp - row.LastMrp) / row.LastMrp * 10000) / 100 : null;

            row.Profit = this.profitOf(mrp, batches, row.Ticked, product.VatType);

            const allStock =
                !!this.defaults?.ReductionAllStock;

            const wanting =
                batches.filter(x => x.Mrp < mrp || (allStock && x.Mrp !== mrp));

            if
            (
                batches.length === 0
            )
            {
                set('NoStock', 'No stock in hand : saved as its declared price; new purchases take it.');
            }
            else if
            (
                ticked.length > 0
            )
            {
                const skipped =
                    wanting.length - ticked.length;

                const note =
                    skipped > 0 ? ` ${skipped} ${skipped === 1 ? 'batch costs' : 'batches cost'} more and ${skipped === 1 ? 'keeps' : 'keep'} its MRP.` : '';

                if
                (
                    row.LastMrp > 0 && mrp < row.LastMrp
                )
                {
                    set('Reduction', `${ticked.length} of ${batches.length} ${batches.length === 1 ? 'batch' : 'batches'} take the lower MRP.${note}`);
                }
                else if
                (
                    row.LastMrp > 0 && mrp > row.LastMrp
                )
                {
                    set('Increase', `${ticked.length} of ${batches.length} ${batches.length === 1 ? 'batch' : 'batches'} take the new MRP.${note}`);
                }
                else
                {
                    set('NewPrice', `${ticked.length} unpriced ${ticked.length === 1 ? 'batch takes' : 'batches take'} this MRP.${note}`);
                }
            }
            else if
            (
                wanting.length > 0
            )
            {
                const floor =
                    Math.min(...wanting.map(x => x.UnitCost));

                set('BelowCost', `Below the cost ${formatPricingCost(floor)} : the MRP can't be less than the cost.`);
            }
            else if
            (
                mrp === row.LastMrp || batches.every(x => x.Mrp === mrp)
            )
            {
                set('Same', 'Its stock already has this MRP : nothing changes.');
            }
            else
            {
                set('ReductionNew', 'A reduction : its stock keeps its MRP (switch off); saved as its declared price, new purchases take it.');
            }
        }

        const loadable =
            this.importLoadable(row);

        row.Include = loadable && (was ? row.Include : true);
    }

    onImportMrp
    (
        row:
            ImportRow,
        value:
            any
    ):
        void
    {
        row.NewMrp = String(value ?? '').replace(/,/g, '');

        this.evaluateImport(row);

        this.refreshView();
    }

    onImportNotes
    (
        row:
            ImportRow,
        value:
            any
    ):
        void
    {
        row.Notes = String(value ?? '').slice(0, 200);
    }

    toggleImport
    (
        row:
            ImportRow
    ):
        void
    {
        if
        (
            this.importLoadable(row)
        )
        {
            row.Include = !row.Include;

            this.refreshView();
        }
    }

    removeImport
    (
        row:
            ImportRow
    ):
        void
    {
        this.importRows = this.importRows.filter(x => x !== row);

        // The next row of the same product is no longer a duplicate
        const next =
            row.Product && !row.Duplicate
                ? this.importRows.find(x => x.Product?.Id === row.Product!.Id)
                : undefined;

        if
        (
            next
        )
        {
            next.Duplicate = false;

            this.evaluateImport(next, true);
        }

        this.refreshView();
    }

    get importShown():
        ImportRow[]
    {
        const filter =
            this.importFilter;

        return filter === 'All'
            ? this.importRows
            : filter === 'Ready'
                ? this.importRows.filter(x => this.importLoadable(x))
                : this.importRows.filter(x => x.Status === filter);
    }

    get importChips():
        { status:ImportStatus; text:string; count:number }[]
    {
        return this.importStatusOrder
            .map(status => ({ status, text:this.importStatusText[status], count:this.importRows.filter(x => x.Status === status).length }))
            .filter(x => x.count > 0);
    }

    get importReadyCount():
        number
    {
        return this.importRows.filter(x => this.importLoadable(x)).length;
    }

    get importIncluded():
        ImportRow[]
    {
        return this.importRows.filter(x => x.Include && this.importLoadable(x));
    }

    get importAllTicked():
        boolean
    {
        const ready =
            this.importShown.filter(x => this.importLoadable(x));

        return ready.length > 0 && ready.every(x => x.Include);
    }

    toggleImportAll():
        void
    {
        const value =
            !this.importAllTicked;

        this.importShown
            .filter(x => this.importLoadable(x))
            .forEach(x => x.Include = value);

        this.refreshView();
    }

    setImportFilter
    (
        filter:
            string
    ):
        void
    {
        this.importFilter = this.importFilter === filter ? 'All' : filter;

        this.refreshView();
    }

    // The change % without its sign (the arrow shows it)
    changeText
    (
        value:
            number | null
    ):
        string
    {
        return value === null ? '—' : this.pct(Math.abs(value));
    }

    // The status colour (tabs and the grid's Status)
    importTone
    (
        status:
            ImportStatus
    ):
        string
    {
        switch (status)
        {
            case 'Increase':
            case 'NewPrice':
                return 'pp-tone-ok';
            case 'Reduction':
                return 'pp-tone-blue';
            case 'Same':
            case 'Pending':
            case 'Loading':
                return 'pp-tone-grey';
            case 'ReductionNew':
            case 'NoStock':
            case 'Failed':
                return 'pp-tone-amber';
            case 'NewItem':
                return 'pp-tone-violet';
            default:
                return 'pp-tone-red';
        }
    }

    importIcon
    (
        status:
            ImportStatus
    ):
        string
    {
        switch (status)
        {
            case 'Increase':
                return 'fas fa-arrow-trend-up';
            case 'Reduction':
                return 'fas fa-arrow-trend-down';
            case 'NewPrice':
                return 'fas fa-tag';
            case 'Same':
                return 'fas fa-equals';
            case 'ReductionNew':
                return 'fas fa-clock';
            case 'NoStock':
                return 'fas fa-box-open';
            case 'BelowCost':
                return 'fas fa-triangle-exclamation';
            case 'NotFound':
                return 'fas fa-circle-question';
            case 'BadMrp':
                return 'fas fa-circle-xmark';
            case 'Duplicate':
                return 'fas fa-clone';
            case 'Failed':
                return 'fas fa-rotate';
            case 'Pending':
                return 'fas fa-hourglass-half';
            case 'NewItem':
                return 'fas fa-circle-plus';
            case 'Ambiguous':
                return 'fas fa-code-branch';
            default:
                return 'fas fa-spinner fa-spin';
        }
    }

    // The ticked rows to the summary : a product already on the
    // list is replaced
    loadImport():
        void
    {
        const rows =
            this.importIncluded;

        const reload =
            this.importLoaded;

        if
        (
            rows.length === 0 && !reload
        )
        {
            this.toast.error('Nothing to Load', 'Tick at least one ready row (Increase, Reduction or Prices unpriced).');

            return;
        }

        const added:
            FormLine[] = rows.map
            (
                row =>
                {
                    const product =
                        row.Product!;

                    return {
                        ProductId:product.Id,
                        ProductCode:product.Code,
                        ProductName:product.Name,
                        Unit:product.Unit,
                        VatType:product.VatType,
                        NewMrp:toNumber(row.NewMrp),
                        Notes:row.Notes,
                        Batches:this.importCache.get(product.Id)?.Batches ?? [],
                        Ticked:[...row.Ticked],
                        LastMrp:row.LastMrp
                    };
                }
            );

        const ids =
            new Set(added.map(x => x.ProductId));

        // Reload : the products the last load put on the summary go
        // first (an unticked row leaves it); the ticked ones come in
        // as they are now. A product added by hand stays, unless
        // ticked here (then replaced)
        const before =
            this.importLoadedIds;

        const removed =
            [...before].filter(id => !ids.has(id) && this.lines.some(x => x.ProductId === id)).length;

        this.lines = [...this.lines.filter(x => !ids.has(x.ProductId) && !before.has(x.ProductId)), ...added];

        this.importLoadedIds = ids;

        this.importLoaded = true;

        this.resetPick();

        this.buildProductItems();

        // The import page keeps its rows (until saved or cleared) :
        // Recheck opens it again as it was
        this.importOpen = false;

        this.toast.success
        (
            reload ? 'Reloaded' : 'Loaded',
            `${added.length} ${added.length === 1 ? 'product' : 'products'} ${reload ? 'reloaded' : 'loaded'} to the Price Change Summary${removed ? `; ${removed} unticked ${removed === 1 ? 'product' : 'products'} taken off` : ''}.`
        );

        this.refreshAll();
    }


    //===========================================================
    // Save / Post
    //===========================================================

    private problem():
        string
    {
        if
        (
            this.isNew
        )
        {
            return this.newProblem();
        }

        if
        (
            this.lines.length === 0
        )
        {
            return `Add at least one ${this.info.item.toLowerCase()} : pick it on the left, tick its batches and press Add, or import from Excel.`;
        }

        if
        (
            this.changedLines.length === 0
        )
        {
            return 'Nothing changes : every product is at its MRP already. Enter a new MRP for at least one.';
        }

        return '';
    }

    private payload():
        CreateProductPricing
    {
        if
        (
            this.isNew
        )
        {
            const percent =
                toNumber(this.basisPercent);

            return {
                PageType:this.type,
                PricingDate:toPricingIso(this.pricingDate),
                Remarks:this.remarks.trim(),
                PricingKind:'New',
                PurchaseId:this.purchaseId,
                PricingBasis:this.basis,
                BasisPercent:Number.isFinite(percent) ? percent : 0,
                Lines:this.includedRows.map
                (
                    x =>
                    {
                        const linePercent =
                            toNumber(x.Percent);

                        return {
                            ProductId:x.ProductId,
                            StockBatchId:x.StockBatchId,
                            NewMrp:Math.round(this.rowMrp(x) * 100) / 100,
                            Notes:'',
                            // Motor Bikes : no basis; the profit the
                            // typed MRP gives
                            ProfitPercent:this.usesBasis ? (Number.isFinite(linePercent) ? linePercent : 0) : Math.round((this.rowProfit(x) ?? 0) * 100) / 100,
                            SuggestedMrp:this.usesBasis ? x.Suggested : 0
                        };
                    }
                )
            };
        }

        return {
            PageType:this.type,
            PricingDate:toPricingIso(this.pricingDate),
            Remarks:this.remarks.trim(),
            PricingKind:'Reprice',
            PurchaseId:0,
            PricingBasis:'',
            BasisPercent:0,
            // Only the changed products. No batch taking it : one
            // declared-price line (StockBatchId 0)
            Lines:this.changedLines.flatMap
            (
                x =>
                    (x.Ticked.length ? x.Ticked : [0]).map
                    (
                        id =>
                        ({
                            ProductId:x.ProductId,
                            StockBatchId:id,
                            NewMrp:x.NewMrp,
                            Notes:x.Notes,
                            ProfitPercent:0,
                            SuggestedMrp:0
                        })
                    )
            )
        };
    }

    private saveDraft():
        Observable<ProductPricingSaved>
    {
        const id =
            this.doc?.ProductPricingId ?? 0;

        return id > 0
            ? this.service.update(id, this.payload())
            : this.service.create(this.payload());
    }

    save():
        void
    {
        if
        (
            this.saving || this.isView
        )
        {
            return;
        }

        const problem =
            this.problem();

        if
        (
            problem
        )
        {
            this.toast.error('Not Saved', problem);

            return;
        }

        this.saving = true;

        const updating =
            !!this.doc?.ProductPricingId;

        this.progress
            .run(
                updating ? 'Updating Price Change' : 'Saving Price Change',
                updating ? `Please wait while "${this.doc?.PricingNo}" is being updated...` : 'Please wait while the price change is being saved...',
                updating ? 'Price change updated.' : 'Price change saved.',
                this.saveDraft())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    saved =>
                    {
                        this.saving = false;

                        this.toast.success(
                            updating ? 'Updated' : 'Saved',
                            `${saved.PricingNo} ${updating ? 'updated' : 'saved as a draft'}. Post it to put the new MRPs on the batches.`);

                        this.back();
                    },
                error:
                    err =>
                    {
                        this.saving = false;

                        this.toast.error('Not Saved', errorText(err, 'The price change could not be saved.'));

                        this.refreshView();
                    }
            });
    }

    post():
        void
    {
        if
        (
            this.saving || this.isView
        )
        {
            return;
        }

        const problem =
            this.problem();

        if
        (
            problem
        )
        {
            this.toast.error('Not Posted', problem);

            return;
        }

        this.saving = true;

        let savedNo =
            '';

        const posting =
            this.saveDraft()
                .pipe(
                switchMap
                (
                    saved =>
                    {
                        savedNo = saved.PricingNo;

                        if
                        (
                            !this.doc
                        )
                        {
                            this.doc = { ProductPricingId:saved.ProductPricingId } as ProductPricing;
                        }

                        return this.service.post(saved.ProductPricingId);
                    }
                ));

        this.progress
            .run(
                'Posting Price Change',
                'Please wait while the new MRPs are put on the batches...',
                'Price change posted.',
                posting)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    posted =>
                    {
                        this.saving = false;

                        this.toast.success('Posted', `${posted.PricingNo || savedNo} posted : the ticked batches sell at the new MRP.`);

                        this.back();
                    },
                error:
                    err =>
                    {
                        this.saving = false;

                        this.toast.error(
                            'Not Posted',
                            errorText(err, 'The price change could not be posted.')
                            + (savedNo ? ` It is saved as draft ${savedNo}.` : ''));

                        if
                        (
                            this.mode === 'add' && this.doc?.ProductPricingId
                        )
                        {
                            this.router.navigate([PRODUCT_PRICING_ROUTE, 'edit', this.doc.ProductPricingId], { replaceUrl:true });

                            return;
                        }

                        this.refreshView();
                    }
            });
    }

    get viewPosted():
        boolean
    {
        return this.isView && this.doc?.Status === 'Posted';
    }

    // View of a draft : post it as saved (the server checks it all)
    postDraft():
        void
    {
        const doc =
            this.doc;

        if
        (
            !doc || doc.Status !== 'Draft' || this.saving || this.progress.busy
        )
        {
            return;
        }

        this.saving = true;

        this.progress
            .run(
                'Posting Price Change',
                `Please wait while "${doc.PricingNo}" puts the new MRPs on the batches...`,
                'Price change posted.',
                this.service.post(doc.ProductPricingId))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.saving = false;

                        this.toast.success('Posted', `${doc.PricingNo} posted : the ticked batches sell at the new MRP.`);

                        this.back();
                    },
                error:
                    err =>
                    {
                        this.saving = false;

                        this.toast.error('Not Posted', errorText(err, 'The price change could not be posted.') + ' Open it for editing to fix it.');

                        this.refreshView();
                    }
            });
    }

    clear():
        void
    {
        this.lines = [];

        this.brandId = 0;

        this.importRows = [];

        this.importText = '';

        this.importFile = '';

        this.importFilter = 'All';

        this.importCache.clear();

        this.importLoaded = false;

        this.importLoadedIds = new Set<number>();

        this.rows = [];

        this.invoice = null;

        this.purchaseId = 0;

        this.remarks = '';

        this.error = '';

        this.resetPick();

        this.buildProductItems();

        this.refreshView();
    }

    openDelete():
        void
    {
        this.deleteOpen = true;
    }

    confirmDelete():
        void
    {
        const doc =
            this.doc;

        if
        (
            !doc || this.saving
        )
        {
            return;
        }

        this.saving = true;

        this.deleteOpen = false;

        this.progress
            .run(
                'Deleting Price Change',
                `Please wait while "${doc.PricingNo}" is being deleted...`,
                'Price change deleted.',
                this.service.delete(doc.ProductPricingId))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.saving = false;

                        this.toast.success('Deleted', `Draft ${doc.PricingNo} deleted.`);

                        this.back();
                    },
                error:
                    err =>
                    {
                        this.saving = false;

                        this.toast.error('Not Deleted', errorText(err, 'The draft could not be deleted.'));

                        this.refreshView();
                    }
            });
    }


    //===========================================================
    // View : print, cancel
    //===========================================================

    print():
        void
    {
        if
        (
            !this.doc
        )
        {
            return;
        }

        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(['/print-viewer', PRODUCT_PRICING_PRINT_KEY, this.doc.ProductPricingId])
            );

        const tab =
            window.open(url, '_blank');

        if
        (
            !tab
        )
        {
            this.toast.error('Print Failed', 'The browser blocked the print tab. Allow pop-ups for this site.');
        }
    }

    openCancel():
        void
    {
        this.cancelOpen = true;

        this.cancelReason = '';
    }

    confirmCancel():
        void
    {
        const doc =
            this.doc;

        if
        (
            !doc || this.saving
        )
        {
            return;
        }

        if
        (
            !this.cancelReason.trim()
        )
        {
            this.toast.error('Reason Needed', 'Write why the price change is cancelled.');

            return;
        }

        this.saving = true;

        this.cancelOpen = false;

        this.progress
            .run(
                'Cancelling Price Change',
                `Please wait while "${doc.PricingNo}" is being cancelled...`,
                'Price change cancelled.',
                this.service.cancel(doc.ProductPricingId, this.cancelReason.trim()))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.saving = false;

                        this.toast.success('Cancelled', `${doc.PricingNo} cancelled : the batches have their old MRP back.`);

                        this.back();
                    },
                error:
                    err =>
                    {
                        this.saving = false;

                        this.toast.error('Not Cancelled', errorText(err, 'The price change could not be cancelled.'));

                        this.refreshView();
                    }
            });
    }

    back():
        void
    {
        this.router.navigate([PRODUCT_PRICING_ROUTE, 'list']);
    }


    //===========================================================
    // Header texts
    //===========================================================

    get pageTitle():
        string
    {
        switch
        (
            this.mode
        )
        {
            case 'add':
                return 'Add Product Pricing';

            case 'edit':
                return 'Update Product Pricing';

            default:
                return 'View Product Pricing';
        }
    }

    get statusText():
        string
    {
        return this.mode === 'add'
            ? 'New'
            : (this.doc?.Status ?? '');
    }

    get statusClass():
        string
    {
        const status =
            this.mode === 'add' ? 'new' : (this.doc?.Status || 'new');

        return `pof-status pof-status-${status.toLowerCase()}`;
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

    cost
    (
        value:
            number
    ):
        string
    {
        return formatPricingCost(value);
    }

    pct
    (
        value:
            number | null
    ):
        string
    {
        return value === null
            ? '—'
            : `${value.toFixed(2)}%`;
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
        : fallback;
}

// "1,250.50" → 1250.5 ; '' / text → NaN
function toNumber
(
    text:
        string
):
    number
{
    const clean =
        String(text ?? '').replace(/,/g, '').trim();

    return clean === '' ? NaN : Number(clean);
}

function csvCell
(
    value:
        string
):
    string
{
    return /[",\r\n]/.test(value)
        ? `"${value.replace(/"/g, '""')}"`
        : value;
}

// Pasted Excel rows (tabs) or CSV (commas, quotes)
function parseRows
(
    text:
        string
):
    string[][]
{
    const source =
        String(text ?? '').replace(/^﻿/, '');

    if
    (
        source.includes('\t')
    )
    {
        return source
            .replace(/\r/g, '')
            .split('\n')
            .map(x => x.split('\t'));
    }

    const rows:
        string[][] = [];

    let row:
        string[] = [];

    let cell =
        '';

    let quoted =
        false;

    for (let i = 0; i < source.length; i++)
    {
        const ch =
            source[i];

        if
        (
            quoted
        )
        {
            if
            (
                ch === '"' && source[i + 1] === '"'
            )
            {
                cell += '"';

                i++;
            }
            else if
            (
                ch === '"'
            )
            {
                quoted = false;
            }
            else
            {
                cell += ch;
            }

            continue;
        }

        if
        (
            ch === '"'
        )
        {
            quoted = true;
        }
        else if
        (
            ch === ','
        )
        {
            row.push(cell);

            cell = '';
        }
        else if
        (
            ch === '\n'
        )
        {
            row.push(cell);

            rows.push(row);

            row = [];

            cell = '';
        }
        else if
        (
            ch !== '\r'
        )
        {
            cell += ch;
        }
    }

    if
    (
        cell !== '' || row.length > 0
    )
    {
        row.push(cell);

        rows.push(row);
    }

    return rows;
}
