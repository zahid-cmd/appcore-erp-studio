//===============================================================
// Imports
//===============================================================

import
{
    ApplicationRef,
    ChangeDetectorRef,
    Component,
    DestroyRef,
    ElementRef,
    HostListener,
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
    CreatePriceAdjustment,
    PRICE_ADJUSTMENT_INCREASE_TO,
    PRICE_ADJUSTMENT_NO_SUPPLIER,
    PRICE_ADJUSTMENT_PRINT_KEY,
    PRICE_ADJUSTMENT_REDUCTION_TO,
    PRICE_ADJUSTMENT_ROUTE,
    PRICE_ADJUSTMENT_TYPES,
    PriceAdjustmentAnalyseInput,
    PriceAdjustmentAnalysis,
    PriceAdjustmentDefaults,
    PriceAdjustmentDetail,
    PriceAdjustmentJournalLine,
    PriceAdjustmentLine,
    PriceAdjustmentProduct,
    PriceAdjustmentProductOption,
    PriceAdjustmentRelease,
    PriceAdjustmentSupplier,
    PriceAdjustmentTypeInfo,
    formatAdjustmentCost,
    formatAdjustmentDate,
    formatAdjustmentMoney,
    formatAdjustmentPercent,
    formatAdjustmentQty,
    fromAdjustmentIso,
    normaliseIncreaseTo,
    normaliseReductionTo,
    priceAdjustmentChange,
    priceAdjustmentFigures,
    priceAdjustmentJournal,
    priceAdjustmentType,
    toAdjustmentIso
}
from '../../../models/price-adjustment.model';

import
{
    PriceAdjustmentService
}
from '../../../services/price-adjustment.service';


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

// One product of the circular (Products grid)
interface ProductRow
{
    ProductId:number;
    ProductCode:string;
    ProductName:string;
    PartNumber:string;
    BrandName:string;
    // Its MRP now (price index)
    LastMrp:number;
    // The new MRP (VAT inclusive); the text while typed
    NewMrp:number;
    NewMrpText:string;
    // same / up / down / bad
    State:'same' | 'up' | 'down' | 'bad';
    Change:number | null;
}

// A batch on the analysis grid (margin text while typed)
interface LineRow
    extends PriceAdjustmentLine
{
    MarginText:string;
    MarginBad:boolean;
}

// A product of the analysis with its batches
interface AnalysisGroup
{
    Product:PriceAdjustmentProduct;
    Lines:LineRow[];
    Change:number | null;
}

// One supplier group's settlement card
interface SettleCard
{
    SupplierCode:string;
    SupplierName:string;
    IncreaseAmount:number;
    ReductionAmount:number;
    IncreaseTo:string;
    ReductionTo:string;
    IncreaseItems:ControlSegmentItem[];
    ReductionItems:ControlSegmentItem[];
}

// A release on the view (with its batch)
interface ReleaseRow
    extends PriceAdjustmentRelease
{
    ProductName:string;
    BatchNo:string;
}


//===============================================================
// Price Adjustment form. Same look as Product Pricing :
//
//   Products view (two parts) :
//   Left        : Information (product type, circular ref / date,
//                 cut-off date) and the master data to pick from :
//                 brand → product (or ★ all of the brand) → Add.
//   Right       : Products & New MRP (Analyse in its header), the
//                 one-line Narration (voucher pages), then the new
//                 MRP typed on the grid (▲ / ▼).
//
//   Analysis view (replaces the body below the page header, like
//   Product Pricing's import page; Back returns to the products) :
//   Analyse     : the priced batches on hand on the cut-off date,
//                 revalued at cost (excl. VAT) by each batch's
//                 margin (editable per batch → re-analysed).
//   Settlement  : per supplier group, who takes an increase /
//                 bears a reduction; the journal the post makes.
//
//   Save keeps a draft (the server analyses again); Post sets
//   the new MRP on the batches, the price index and one PA
//   journal. A posted one can be cancelled while no sale
//   released it. Any change to the products, the new MRPs or the
//   cut-off date makes the analysis out of date : Save / Post
//   wait for Analyse.
//===============================================================

@Component(
{
    selector:'app-price-adjustment-form',
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
        OrbitLoaderComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./price-adjustment-form.html',
    styleUrl:'./price-adjustment-form.css'
})
export class PriceAdjustmentForm
    implements OnInit
{
    private readonly service =
        inject(PriceAdjustmentService);

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly appRef =
        inject(ApplicationRef);

    private readonly destroyRef =
        inject(DestroyRef);

    // Progress dialog around analyse / save / post / delete / cancel
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

    // The banner on top (load / save / post errors)
    error:
        string = '';

    defaults:
        PriceAdjustmentDefaults | null = null;

    // Current stock per product (from the defaults; rebuilt when
    // the defaults change)
    private stockMap =
        new Map<number, number>();

    private stockMapOf:
        PriceAdjustmentDefaults | null = null;

    stockOf
    (
        productId:
            number
    ):
        number
    {
        if
        (
            this.stockMapOf !== this.defaults
        )
        {
            this.stockMap =
                new Map((this.defaults?.Products ?? []).map(x => [x.Id, x.Stock] as [number, number]));

            this.stockMapOf =
                this.defaults;
        }

        return this.stockMap.get(productId) ?? 0;
    }

    doc:
        PriceAdjustmentDetail | null = null;

    // A post that failed after its save created the draft : the
    // next Save / Post updates it
    private savedId:
        number = 0;

    type:
        string = 'SP';

    info:
        PriceAdjustmentTypeInfo = PRICE_ADJUSTMENT_TYPES[1];

    readonly typeSegments:
        ControlSegmentItem[] =
        // Short labels so the three fit the card ("Parts & Lubricant")
        PRICE_ADJUSTMENT_TYPES.map(x => ({ value:x.type, text:x.type === 'SP' ? 'Parts & Lubricant' : x.title }));

    circularRef:
        string = '';

    circularDate:
        Date | null = null;

    cutOffDate:
        Date = new Date();

    remarks:
        string = '';


    //===========================================================
    // Products
    //===========================================================

    rows:
        ProductRow[] = [];

    brandItems:
        Option[] = [];

    productItems:
        Option[] = [];

    // 0 = every brand
    brandId:
        number = 0;

    // -1 = every product of the brand
    pickId:
        number = 0;

    productError:
        string = '';


    //===========================================================
    // Analysis
    //===========================================================

    analysis:
        PriceAdjustmentAnalysis | null = null;

    groups:
        AnalysisGroup[] = [];

    // Products / new MRP / cut-off changed since the analysis
    analysisStale:
        boolean = false;

    // A margin edit waits for its re-analysis (quiet, no dialog)
    reanalysing:
        boolean = false;

    private reanalyseTimer?:
        number;

    private reanalyseCall:
        { unsubscribe():void } | null = null;

    analysisError:
        string = '';

    // The Analysis view replaces the body below the page header
    analysisOpen:
        boolean = false;

    // The journal dialog (the Journal button of the Analysis view)
    journalOpen:
        boolean = false;

    // Products opened to their batches
    private readonly expanded =
        new Set<number>();

    // Margin % typed per batch (StockBatchId → %)
    private readonly marginOverrides =
        new Map<number, number>();

    marginAllText:
        string = '';


    //===========================================================
    // Settlement
    //===========================================================

    // SupplierCode → choice (kept across analyses)
    private readonly settlement =
        new Map<string, { IncreaseTo:string; ReductionTo:string }>();

    settleCards:
        SettleCard[] = [];

    journal:
        PriceAdjustmentJournalLine[] = [];


    //===========================================================
    // View
    //===========================================================

    facts:
        Fact[] = [];

    releases:
        ReleaseRow[] = [];


    //===========================================================
    // Cancel / Delete
    //===========================================================

    cancelOpen:
        boolean = false;

    cancelReason:
        string = '';

    cancelError:
        string = '';

    deleteOpen:
        boolean = false;


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
                    console.error('[Price Adjustment] view update failed', error);
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
            console.error('[Price Adjustment] view update failed', error);

            // The Analysis view could not be drawn : back to the
            // products with the reason, instead of a silent page
            if
            (
                this.analysisOpen
            )
            {
                this.analysisOpen = false;

                this.error =
                    `The evaluation view could not be drawn : ${(error as any)?.message ?? error}`;

                try
                {
                    this.cdr.detectChanges();
                }
                catch
                {
                    // ignore : logged above
                }
            }
        }
    }


    //===========================================================
    // Start
    //===========================================================

    ngOnInit():
        void
    {
        this.destroyRef.onDestroy(() => this.stopReanalyse());

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

        this.setType(PRICE_ADJUSTMENT_TYPES.some(x => x.type === type) ? type : 'SP');

        this.loadDefaults();
    }

    get isView():
        boolean
    {
        return this.mode === 'view';
    }

    get viewPosted():
        boolean
    {
        return this.isView && this.doc?.Status === 'Posted';
    }

    private setType
    (
        type:
            string
    ):
        void
    {
        this.type = type;

        this.info = priceAdjustmentType(type);
    }

    private loadDefaults():
        void
    {
        this.loading = true;

        this.error = '';

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
                            fromAdjustmentIso(defaults.Today);

                        if
                        (
                            today && this.mode === 'add'
                        )
                        {
                            this.cutOffDate = today;
                        }

                        this.buildPickers();

                        this.refreshAll();
                    },
                error:
                    err =>
                    {
                        this.loading = false;

                        this.error = errorText(err, 'The price adjustment defaults could not be loaded.');

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

                        if
                        (
                            doc.Status !== 'Draft' && this.mode === 'edit'
                        )
                        {
                            this.mode = 'view';

                            this.router.navigate([PRICE_ADJUSTMENT_ROUTE, 'view', doc.Id], { replaceUrl:true });
                        }

                        // Edit : the products to pick from again
                        return (this.mode === 'edit'
                            ? this.service.getDefaults(doc.PageType)
                            : of(null)) as Observable<PriceAdjustmentDefaults | null>;
                    }
                ),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe
            ({
                next:
                    defaults =>
                    {
                        this.loading = false;

                        this.defaults = defaults;

                        this.fillFromDoc();

                        this.refreshAll();

                        // Edit : the stock may have moved since the
                        // draft was saved; analyse again quietly
                        if
                        (
                            this.mode === 'edit' && this.changedRows.length
                        )
                        {
                            this.reanalyse(0);
                        }
                    },
                error:
                    err =>
                    {
                        this.loading = false;

                        this.error = errorText(err, 'The price adjustment could not be loaded.');

                        this.refreshView();
                    }
            });
    }

    // The saved document into the form (edit) or the view
    private fillFromDoc():
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

        this.circularRef = doc.CircularRef;

        this.circularDate = fromAdjustmentIso(doc.CircularDate);

        this.cutOffDate = fromAdjustmentIso(doc.CutOffDate) ?? new Date();

        this.remarks = doc.Remarks;

        this.marginOverrides.clear();

        doc.Lines
            .filter(x => x.MarginEdited)
            .forEach(x => this.marginOverrides.set(x.StockBatchId, x.MarginPercent));

        this.settlement.clear();

        doc.Suppliers.forEach
        (
            x =>
                this.settlement.set(
                    x.SupplierCode,
                    {
                        IncreaseTo:normaliseIncreaseTo(x.IncreaseTo, x.SupplierCode),
                        ReductionTo:normaliseReductionTo(x.ReductionTo, x.SupplierCode)
                    })
        );

        this.rows =
            doc.Products.map
            (
                p =>
                {
                    const option =
                        this.productById(p.ProductId);

                    return makeRow
                    (
                        {
                            ProductId:p.ProductId,
                            ProductCode:p.ProductCode || option?.Code || '',
                            ProductName:p.ProductName || option?.Name || '',
                            PartNumber:p.PartNumber || option?.PartNumber || '',
                            BrandName:option?.BrandName ?? '',
                            // Its MRP now; a posted one : the MRP it had
                            LastMrp:this.mode === 'edit' && option ? option.LastMrp : p.OldMrp
                        },
                        p.NewMrp
                    );
                }
            );

        this.applyAnalysis
        (
            {
                CutOffDate:doc.CutOffDate,
                Products:doc.Products,
                Lines:doc.Lines,
                Suppliers:doc.Suppliers,
                IncreaseAmount:doc.IncreaseAmount,
                ReductionAmount:doc.ReductionAmount,
                NetAmount:doc.NetAmount
            },
            false
        );

        if
        (
            this.mode === 'edit'
        )
        {
            this.buildPickers();
        }
        else
        {
            this.buildView();
        }
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

        const by =
            (name: string, when: string): string =>
                [name, when ? formatAdjustmentDate(when) : ''].filter(x => !!x).join(' · ');

        this.facts =
            [
                { label:'Status', value:doc.Status },
                { label:'Products', value:String(doc.ProductCount || doc.Products.length) },
                { label:'Batches', value:String(doc.BatchCount || doc.Lines.length) },
                { label:'Increase', value:formatAdjustmentMoney(doc.IncreaseAmount) },
                { label:'Reduction', value:formatAdjustmentMoney(doc.ReductionAmount) },
                { label:'Net', value:formatAdjustmentMoney(doc.NetAmount) },
                { label:'Saved By', value:by(doc.CreatedByName, doc.CreatedDate) },
                { label:'Posted By', value:by(doc.PostedByName, doc.PostedDate) },
                ...(doc.Status === 'Cancelled'
                    ? [{ label:'Cancelled By', value:by(doc.CancelledByName, doc.CancelledDate) }]
                    : []),
                { label:'Journal', value:doc.Status === 'Draft' ? 'On post' : `PA · ${doc.AdjustmentNo}${doc.Status === 'Cancelled' ? ' (reversed)' : ''}`, wide:true }
            ];

        this.releases =
            doc.Releases.map
            (
                r =>
                {
                    const line =
                        doc.Lines.find(x => x.PriceAdjustmentLineId === r.PriceAdjustmentLineId)
                        ?? doc.Lines.find(x => x.StockBatchId === r.StockBatchId);

                    const product =
                        doc.Products.find(x => x.ProductId === line?.ProductId);

                    return {
                        ...r,
                        ProductName:product ? `${product.ProductCode} · ${product.ProductName}` : '',
                        BatchNo:line?.BatchNo ?? ''
                    };
                }
            );
    }

    private productById
    (
        id:
            number
    ):
        PriceAdjustmentProductOption | undefined
    {
        return this.defaults?.Products.find(x => x.Id === id);
    }


    //===========================================================
    // Information
    //===========================================================

    onTypeChange
    (
        value:
            any
    ):
        void
    {
        const type =
            String(value ?? '').toUpperCase();

        if
        (
            this.mode !== 'add' || type === this.type || !PRICE_ADJUSTMENT_TYPES.some(x => x.type === type)
        )
        {
            return;
        }

        if
        (
            this.rows.length
        )
        {
            this.productError = 'Clear the products first : one price adjustment is for one product type.';

            this.refreshView();

            return;
        }

        this.setType(type);

        this.brandId = 0;

        this.pickId = 0;

        this.resetAnalysis();

        this.loadDefaults();
    }

    onCircularRef
    (
        value:
            string | number
    ):
        void
    {
        this.circularRef = String(value ?? '');
    }

    onCircularDate
    (
        value:
            Date
    ):
        void
    {
        this.circularDate = value instanceof Date && !isNaN(value.getTime()) ? value : null;

        this.refreshView();
    }

    clearCircularDate():
        void
    {
        this.circularDate = null;

        this.refreshView();
    }

    onCutOffChange
    (
        value:
            Date
    ):
        void
    {
        if
        (
            !(value instanceof Date) || isNaN(value.getTime())
        )
        {
            return;
        }

        const changed =
            toAdjustmentIso(value) !== toAdjustmentIso(this.cutOffDate);

        this.cutOffDate = value;

        if
        (
            changed
        )
        {
            this.markStale();
        }

        this.refreshView();
    }

    onRemarks
    (
        value:
            string | number
    ):
        void
    {
        this.remarks = String(value ?? '');
    }

    get numberText():
        string
    {
        return this.doc?.AdjustmentNo || this.defaults?.NextNo || '';
    }


    //===========================================================
    // Products : brand → product (★ all of the brand)
    //===========================================================

    private buildPickers():
        void
    {
        const products =
            this.defaults?.Products ?? [];

        // Brands : the defaults' list, else the products' own
        const brands =
            (this.defaults?.Brands ?? []).length
                ? (this.defaults?.Brands ?? [])
                : [...new Map(products.filter(x => x.BrandId > 0).map(x => [x.BrandId, { Id:x.BrandId, Name:x.BrandName }])).values()];

        this.brandItems =
            [
                { label:'All brands', value:0 },
                ...brands
                    .filter(b => products.some(p => p.BrandId === b.Id))
                    .sort((a, b) => a.Name.localeCompare(b.Name))
                    .map(b => ({ label:b.Name, value:b.Id }))
            ];

        if
        (
            this.brandId && !this.brandItems.some(x => x.value === this.brandId)
        )
        {
            this.brandId = 0;
        }

        const used =
            new Set(this.rows.map(x => x.ProductId));

        const free =
            products.filter(x => !used.has(x.Id) && (!this.brandId || x.BrandId === this.brandId));

        this.productItems =
            [
                ...(this.brandId && free.length > 1
                    ? [{ label:`★ All products of the brand (${free.length})`, value:-1 }]
                    : []),
                ...free.map
                (
                    x =>
                    ({
                        label:[x.Code, x.Name, x.PartNumber && x.PartNumber !== x.Name ? x.PartNumber : '', x.LastMrp ? `MRP ${formatAdjustmentMoney(x.LastMrp)}` : 'no MRP']
                            .filter(t => !!t)
                            .join(' · '),
                        value:x.Id
                    })
                )
            ];

        if
        (
            this.pickId && !this.productItems.some(x => x.value === this.pickId)
        )
        {
            this.pickId = 0;
        }
    }

    onBrandChange
    (
        value:
            any
    ):
        void
    {
        this.brandId = Number(value) || 0;

        this.pickId = 0;

        this.productError = '';

        this.buildPickers();

        this.refreshView();
    }

    onPickChange
    (
        value:
            any
    ):
        void
    {
        this.pickId = Number(value) || 0;

        this.productError = '';

        this.refreshView();
    }

    get addText():
        string
    {
        return this.pickId === -1 ? 'Add All' : 'Add';
    }

    addProducts():
        void
    {
        if
        (
            !this.defaults || this.isView
        )
        {
            return;
        }

        if
        (
            !this.pickId
        )
        {
            this.productError = `Pick a ${this.info.item.toLowerCase()} (or ★ all products of a brand) first.`;

            this.refreshView();

            return;
        }

        const used =
            new Set(this.rows.map(x => x.ProductId));

        const picked =
            this.pickId === -1
                ? this.defaults.Products.filter(x => !used.has(x.Id) && x.BrandId === this.brandId)
                : this.defaults.Products.filter(x => x.Id === this.pickId && !used.has(x.Id));

        if
        (
            !picked.length
        )
        {
            this.productError = 'Every picked product is on the list already.';

            this.refreshView();

            return;
        }

        this.rows =
            [
                ...this.rows,
                ...picked.map
                (
                    x =>
                        makeRow
                        (
                            {
                                ProductId:x.Id,
                                ProductCode:x.Code,
                                ProductName:x.Name,
                                PartNumber:x.PartNumber,
                                BrandName:x.BrandName,
                                LastMrp:x.LastMrp
                            },
                            // Prefilled at its MRP : type the new one
                            x.LastMrp
                        )
                )
            ];

        const firstNew =
            this.rows.length - picked.length;

        this.pickId = 0;

        this.productError = '';

        this.buildPickers();

        this.markStale();

        this.refreshView();

        // Ready to type : the first loaded row's New MRP
        this.focusMrp(firstNew);
    }

    // The New MRP box of a row (by its position), focused and
    // selected after the view has drawn it
    private readonly host =
        inject(ElementRef);

    focusMrp
    (
        index:
            number
    ):
        void
    {
        setTimeout
        (
            () =>
            {
                const input =
                    (this.host.nativeElement as HTMLElement)
                        .querySelector<HTMLInputElement>(`input[data-mrp-index="${index}"]`);

                input?.focus();

                input?.select();
            },
            0
        );
    }

    // Enter in a New MRP box : take the value, go to the next row
    onMrpEnter
    (
        event:
            Event,
        index:
            number
    ):
        void
    {
        event.preventDefault();

        const input =
            event.target as HTMLInputElement;

        const row =
            this.rows[index];

        if
        (
            row
        )
        {
            this.onRowMrp(row, input.value);
        }

        if
        (
            index + 1 < this.rows.length
        )
        {
            this.focusMrp(index + 1);
        }
        else
        {
            this.focusMrp(index);
        }
    }

    onRowMrp
    (
        row:
            ProductRow,
        value:
            string
    ):
        void
    {
        const typed =
            String(value ?? '').trim();

        const parsed =
            toNumber(typed);

        const mrp =
            Number.isFinite(parsed) && parsed > 0
                ? Math.round(parsed * 100) / 100
                : 0;

        // New objects : the grid redraws the row
        this.rows =
            this.rows.map
            (
                x =>
                    x.ProductId === row.ProductId
                        ? { ...makeRow(x, mrp), NewMrpText:mrp > 0 ? formatAdjustmentMoney(mrp) : typed }
                        : x
            );

        this.markStale();

        this.refreshView();
    }

    removeRow
    (
        row:
            ProductRow
    ):
        void
    {
        this.rows = this.rows.filter(x => x.ProductId !== row.ProductId);

        this.buildPickers();

        this.markStale();

        this.refreshView();
    }

    // The products the circular changes (sent to analyse / save)
    get changedRows():
        ProductRow[]
    {
        return this.rows.filter(x => x.State === 'up' || x.State === 'down');
    }

    get sameCount():
        number
    {
        return this.rows.filter(x => x.State === 'same').length;
    }

    get badCount():
        number
    {
        return this.rows.filter(x => x.State === 'bad').length;
    }

    get upCount():
        number
    {
        return this.rows.filter(x => x.State === 'up').length;
    }

    get downCount():
        number
    {
        return this.rows.filter(x => x.State === 'down').length;
    }


    //===========================================================
    // Analyse
    //===========================================================

    private markStale():
        void
    {
        this.stopReanalyse();

        if
        (
            this.analysis
        )
        {
            this.analysisStale = true;
        }
    }

    private resetAnalysis():
        void
    {
        this.stopReanalyse();

        this.analysis = null;

        this.groups = [];

        this.analysisStale = false;

        this.analysisError = '';

        this.analysisOpen = false;

        this.journalOpen = false;

        this.expanded.clear();

        this.marginOverrides.clear();

        this.settleCards = [];

        this.journal = [];
    }

    private analyseProblem():
        string
    {
        if
        (
            !this.rows.length
        )
        {
            return `Add at least one ${this.info.item.toLowerCase()} with its new MRP.`;
        }

        if
        (
            this.badCount
        )
        {
            return `${this.badCount} ${this.badCount === 1 ? 'product has' : 'products have'} no valid new MRP : enter it, or remove the row.`;
        }

        if
        (
            !this.changedRows.length
        )
        {
            return 'Nothing changes : every new MRP equals the last MRP. Enter the circular\'s new MRP for at least one product.';
        }

        if
        (
            !(this.cutOffDate instanceof Date) || isNaN(this.cutOffDate.getTime())
        )
        {
            return 'Enter the cut-off date : the date the new prices apply from.';
        }

        return '';
    }

    private analyseInput():
        PriceAdjustmentAnalyseInput
    {
        return {
            Type:this.type,
            CutOffDate:toAdjustmentIso(this.cutOffDate),
            Products:this.changedRows.map(x => ({ ProductId:x.ProductId, NewMrp:x.NewMrp })),
            Margins:[...this.marginOverrides.entries()].map(([id, margin]) => ({ StockBatchId:id, MarginPercent:margin }))
        };
    }

    // The Analyse button : the progress dialog around the call
    analyse():
        void
    {
        if
        (
            this.isView || this.progress.busy || this.saving
        )
        {
            return;
        }

        const problem =
            this.analyseProblem();

        if
        (
            problem
        )
        {
            this.analysisError = problem;

            this.refreshView();

            return;
        }

        this.stopReanalyse();

        this.analysisError = '';

        this.progress
            .run(
                'Evaluating Price Adjustment',
                `Please wait while the stock on hand on ${formatAdjustmentDate(toAdjustmentIso(this.cutOffDate))} is being revalued...`,
                'Evaluation ready.',
                this.service.analyse(this.analyseInput()))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    result =>
                    {
                        try
                        {
                            this.applyAnalysis(result, true);

                            // The result on its own page
                            this.analysisOpen = true;
                        }
                        catch (failure)
                        {
                            // Never fail silently : the reason on the page
                            // and in the console
                            console.error('[Price Adjustment] analysis could not be shown', failure, result);

                            this.analysisOpen = false;

                            this.error =
                                `The evaluation came back but could not be shown : ${(failure as any)?.message ?? failure}`;
                        }

                        this.refreshAll();
                    },
                error:
                    err =>
                    {
                        this.analysisError = errorText(err, 'The stock could not be evaluated.');

                        this.refreshAll();
                    }
            });
    }

    // An analysis that still matches the products / cut-off date
    get analysisCurrent():
        boolean
    {
        return !!this.analysis && !this.analysisStale;
    }

    // The Analyse button of the products view : an up-to-date
    // analysis opens at once, else it is run first (the progress
    // dialog) and opens on success
    analyseFromProducts():
        void
    {
        if
        (
            this.isView || this.progress.busy || this.saving
        )
        {
            return;
        }

        if
        (
            this.analysisCurrent
        )
        {
            this.openAnalysis();

            return;
        }

        this.analyse();
    }

    // The Analysis view (view mode : as saved, no re-analysis)
    openAnalysis():
        void
    {
        this.analysisOpen = true;

        this.refreshView();
    }

    // Back to the products view
    closeAnalysis():
        void
    {
        this.analysisOpen = false;

        this.journalOpen = false;

        this.refreshView();
    }

    // The command center's back arrow : the Analysis view goes
    // back to the products, the products view to the list
    onBackCommand():
        void
    {
        if
        (
            this.analysisOpen
        )
        {
            this.closeAnalysis();

            return;
        }

        this.back();
    }

    // Quiet re-analysis (margin edits, edit mode start) after a
    // short wait; the last one wins
    private reanalyse
    (
        delayMs:
            number = 900
    ):
        void
    {
        this.stopReanalyse();

        if
        (
            this.isView || this.analysisStale || this.analyseProblem()
        )
        {
            return;
        }

        this.reanalysing = true;

        this.reanalyseTimer =
            window.setTimeout
            (
                () =>
                {
                    this.reanalyseTimer = undefined;

                    this.reanalyseCall =
                        this.service
                            .analyse(this.analyseInput())
                            .pipe(takeUntilDestroyed(this.destroyRef))
                            .subscribe
                            ({
                                next:
                                    result =>
                                    {
                                        this.reanalyseCall = null;

                                        this.reanalysing = false;

                                        this.analysisError = '';

                                        this.applyAnalysis(result, true);

                                        this.refreshView();
                                    },
                                error:
                                    err =>
                                    {
                                        this.reanalyseCall = null;

                                        this.reanalysing = false;

                                        this.analysisError = errorText(err, 'The stock could not be evaluated again.') + ' Press Evaluate to try again.';

                                        this.analysisStale = true;

                                        this.refreshView();
                                    }
                            });
                },
                delayMs
            );

        this.refreshView();
    }

    private stopReanalyse():
        void
    {
        if
        (
            this.reanalyseTimer
        )
        {
            clearTimeout(this.reanalyseTimer);

            this.reanalyseTimer = undefined;
        }

        if
        (
            this.reanalyseCall
        )
        {
            this.reanalyseCall.unsubscribe();

            this.reanalyseCall = null;
        }

        this.reanalysing = false;
    }

    private applyAnalysis
    (
        result:
            PriceAdjustmentAnalysis,
        fresh:
            boolean
    ):
        void
    {
        this.analysis = result;

        this.analysisStale = false;

        const batchIds =
            new Set(result.Lines.map(x => x.StockBatchId));

        // A typed margin of a batch no longer analysed goes
        [...this.marginOverrides.keys()]
            .filter(id => !batchIds.has(id))
            .forEach(id => this.marginOverrides.delete(id));

        // Settlement : kept per supplier; a new group takes the
        // server's / supplier profile's default
        for
        (
            const group of result.Suppliers
        )
        {
            if
            (
                !this.settlement.has(group.SupplierCode)
            )
            {
                const profile =
                    this.defaults?.Suppliers.find(x => x.Code === group.SupplierCode);

                this.settlement.set
                (
                    group.SupplierCode,
                    {
                        IncreaseTo:normaliseIncreaseTo(group.IncreaseTo || profile?.IncreaseTo || '', group.SupplierCode),
                        ReductionTo:normaliseReductionTo(group.ReductionTo || profile?.ReductionTo || '', group.SupplierCode)
                    }
                );
            }
        }

        this.groups =
            result.Products.map
            (
                product =>
                ({
                    Product:product,
                    Lines:result.Lines
                        .filter(x => x.ProductId === product.ProductId)
                        .map(x => toLineRow(x)),
                    Change:priceAdjustmentChange(product.OldMrp, product.NewMrp)
                })
            );

        if
        (
            fresh
        )
        {
            // A product of a single batch opens by itself
            this.groups
                .filter(g => g.Lines.length === 1)
                .forEach(g => this.expanded.add(g.Product.ProductId));
        }

        this.buildSettlement();
    }

    isOpen
    (
        group:
            AnalysisGroup
    ):
        boolean
    {
        return this.expanded.has(group.Product.ProductId);
    }

    toggleOpen
    (
        group:
            AnalysisGroup
    ):
        void
    {
        if
        (
            !group.Lines.length
        )
        {
            return;
        }

        if
        (
            this.expanded.has(group.Product.ProductId)
        )
        {
            this.expanded.delete(group.Product.ProductId);
        }
        else
        {
            this.expanded.add(group.Product.ProductId);
        }

        this.refreshView();
    }

    get allOpen():
        boolean
    {
        const withLines =
            this.groups.filter(g => g.Lines.length);

        return withLines.length > 0 && withLines.every(g => this.expanded.has(g.Product.ProductId));
    }

    toggleAllOpen():
        void
    {
        const open =
            !this.allOpen;

        this.groups
            .filter(g => g.Lines.length)
            .forEach(g => open ? this.expanded.add(g.Product.ProductId) : this.expanded.delete(g.Product.ProductId));

        this.refreshView();
    }

    // A batch's margin % typed : the row previews at once, the
    // server analyses again after a short wait
    onMargin
    (
        line:
            LineRow,
        value:
            string
    ):
        void
    {
        const typed =
            String(value ?? '').trim();

        const margin =
            toNumber(typed);

        if
        (
            !Number.isFinite(margin) || margin >= 100 || margin <= -1000
        )
        {
            this.replaceLine(line.StockBatchId, x => ({ ...x, MarginText:typed, MarginBad:true }));

            this.refreshView();

            return;
        }

        const rounded =
            Math.round(margin * 10000) / 10000;

        this.marginOverrides.set(line.StockBatchId, rounded);

        this.replaceLine
        (
            line.StockBatchId,
            x =>
                ({
                    ...x,
                    ...priceAdjustmentFigures(x, rounded),
                    MarginPercent:rounded,
                    MarginEdited:true,
                    MarginText:rounded.toFixed(2),
                    MarginBad:false
                })
        );

        this.recomputeTotals();

        this.reanalyse();

        this.refreshView();
    }

    // Back to the batch's own margin
    resetMargin
    (
        line:
            LineRow
    ):
        void
    {
        if
        (
            !this.marginOverrides.has(line.StockBatchId)
        )
        {
            return;
        }

        this.marginOverrides.delete(line.StockBatchId);

        this.replaceLine(line.StockBatchId, x => ({ ...x, MarginEdited:false, MarginBad:false }));

        this.reanalyse(0);

        this.refreshView();
    }

    onMarginAll
    (
        value:
            string | number
    ):
        void
    {
        this.marginAllText = String(value ?? '');
    }

    // One margin % for every batch
    applyMarginAll():
        void
    {
        const margin =
            toNumber(this.marginAllText);

        if
        (
            !Number.isFinite(margin) || margin >= 100 || margin <= -1000
        )
        {
            this.analysisError = 'Enter a margin % below 100 to apply to every batch.';

            this.refreshView();

            return;
        }

        const rounded =
            Math.round(margin * 10000) / 10000;

        this.analysisError = '';

        this.groups =
            this.groups.map
            (
                g =>
                ({
                    ...g,
                    Lines:g.Lines.map
                    (
                        x =>
                        {
                            this.marginOverrides.set(x.StockBatchId, rounded);

                            return {
                                ...x,
                                ...priceAdjustmentFigures(x, rounded),
                                MarginPercent:rounded,
                                MarginEdited:true,
                                MarginText:rounded.toFixed(2),
                                MarginBad:false
                            };
                        }
                    )
                })
            );

        this.recomputeTotals();

        this.reanalyse(0);

        this.refreshView();
    }

    // Every batch back to its own margin
    resetAllMargins():
        void
    {
        if
        (
            !this.marginOverrides.size
        )
        {
            return;
        }

        this.marginOverrides.clear();

        this.marginAllText = '';

        this.reanalyse(0);

        this.refreshView();
    }

    get editedMargins():
        number
    {
        return this.marginOverrides.size;
    }

    private replaceLine
    (
        stockBatchId:
            number,
        change:
            (line: LineRow) => LineRow
    ):
        void
    {
        this.groups =
            this.groups.map
            (
                g =>
                    g.Lines.some(x => x.StockBatchId === stockBatchId)
                        ? { ...g, Lines:g.Lines.map(x => x.StockBatchId === stockBatchId ? change(x) : x) }
                        : g
            );
    }

    // Product / supplier / document totals from the batch rows
    // (the preview until the server answers)
    private recomputeTotals():
        void
    {
        const analysis =
            this.analysis;

        if
        (
            !analysis
        )
        {
            return;
        }

        this.groups =
            this.groups.map
            (
                g =>
                    g.Lines.length
                        ? { ...g, Product:{ ...g.Product, Amount:round2(sum(g.Lines.map(x => x.Amount))) } }
                        : g
            );

        const lines =
            this.groups.flatMap(g => g.Lines);

        const suppliers =
            analysis.Suppliers.map
            (
                s =>
                {
                    const own =
                        lines.filter(x => x.SupplierCode === s.SupplierCode);

                    return {
                        ...s,
                        IncreaseAmount:round2(sum(own.filter(x => x.Amount > 0).map(x => x.Amount))),
                        ReductionAmount:round2(sum(own.filter(x => x.Amount < 0).map(x => -x.Amount)))
                    };
                }
            );

        const increase =
            round2(sum(suppliers.map(x => x.IncreaseAmount)));

        const reduction =
            round2(sum(suppliers.map(x => x.ReductionAmount)));

        this.analysis =
            {
                ...analysis,
                Products:this.groups.map(g => g.Product),
                Lines:lines,
                Suppliers:suppliers,
                IncreaseAmount:increase,
                ReductionAmount:reduction,
                NetAmount:round2(increase - reduction)
            };

        this.buildSettlement();
    }

    get lineCount():
        number
    {
        return this.analysis?.Lines.length ?? 0;
    }

    get totalQuantity():
        number
    {
        return sum((this.analysis?.Lines ?? []).map(x => x.Quantity));
    }

    get totalSold():
        number
    {
        return sum((this.analysis?.Lines ?? []).map(x => x.SoldSinceCutOff));
    }

    // Analysed, up to date, not waiting for a re-analysis
    get analysisReady():
        boolean
    {
        return !!this.analysis && !this.analysisStale && !this.reanalysing && !this.hasBadMargin;
    }

    get hasBadMargin():
        boolean
    {
        return this.groups.some(g => g.Lines.some(x => x.MarginBad));
    }


    //===========================================================
    // Settlement
    //===========================================================

    private choiceOf
    (
        supplier:
            PriceAdjustmentSupplier
    ):
        { IncreaseTo:string; ReductionTo:string }
    {
        return this.settlement.get(supplier.SupplierCode)
            ?? {
                IncreaseTo:normaliseIncreaseTo(supplier.IncreaseTo, supplier.SupplierCode),
                ReductionTo:normaliseReductionTo(supplier.ReductionTo, supplier.SupplierCode)
            };
    }

    private buildSettlement():
        void
    {
        const analysis =
            this.analysis;

        if
        (
            !analysis
        )
        {
            this.settleCards = [];

            this.journal = [];

            return;
        }

        this.settleCards =
            analysis.Suppliers.map
            (
                s =>
                {
                    const choice =
                        this.choiceOf(s);

                    const noSupplier =
                        !s.SupplierCode;

                    return {
                        SupplierCode:s.SupplierCode,
                        SupplierName:s.SupplierName || (noSupplier ? PRICE_ADJUSTMENT_NO_SUPPLIER : s.SupplierCode),
                        IncreaseAmount:s.IncreaseAmount,
                        ReductionAmount:s.ReductionAmount,
                        IncreaseTo:normaliseIncreaseTo(choice.IncreaseTo, s.SupplierCode),
                        ReductionTo:normaliseReductionTo(choice.ReductionTo, s.SupplierCode),
                        // "No supplier" (opening stock) : no Supplier option
                        IncreaseItems:PRICE_ADJUSTMENT_INCREASE_TO
                            .filter(x => !(noSupplier && x.value === 'Supplier'))
                            .map(x => ({ value:x.value, text:x.text })),
                        ReductionItems:PRICE_ADJUSTMENT_REDUCTION_TO
                            .filter(x => !(noSupplier && x.value === 'Supplier'))
                            .map(x => ({ value:x.value, text:x.text }))
                    };
                }
            );

        this.journal =
            priceAdjustmentJournal(analysis.Lines, analysis.Suppliers, s => this.choiceOf(s));
    }

    onIncreaseTo
    (
        card:
            SettleCard,
        value:
            any
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

        const current =
            this.settlement.get(card.SupplierCode) ?? { IncreaseTo:card.IncreaseTo, ReductionTo:card.ReductionTo };

        this.settlement.set(card.SupplierCode, { ...current, IncreaseTo:normaliseIncreaseTo(String(value ?? ''), card.SupplierCode) });

        this.buildSettlement();

        this.refreshView();
    }

    onReductionTo
    (
        card:
            SettleCard,
        value:
            any
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

        const current =
            this.settlement.get(card.SupplierCode) ?? { IncreaseTo:card.IncreaseTo, ReductionTo:card.ReductionTo };

        this.settlement.set(card.SupplierCode, { ...current, ReductionTo:normaliseReductionTo(String(value ?? ''), card.SupplierCode) });

        this.buildSettlement();

        this.refreshView();
    }

    settleTitle
    (
        value:
            string,
        increase:
            boolean
    ):
        string
    {
        const list:
            { value:string; title:string }[] =
            increase ? PRICE_ADJUSTMENT_INCREASE_TO : PRICE_ADJUSTMENT_REDUCTION_TO;

        return list.find(x => x.value === value)?.title ?? value;
    }

    get journalDebit():
        number
    {
        return round2(sum(this.journal.map(x => x.Debit)));
    }

    get journalCredit():
        number
    {
        return round2(sum(this.journal.map(x => x.Credit)));
    }

    // Journal dialog : a journal voucher as it posts (preview) or
    // as posted
    openJournal():
        void
    {
        if
        (
            !this.analysis
        )
        {
            return;
        }

        this.journalOpen = true;

        this.refreshView();
    }

    closeJournal():
        void
    {
        this.journalOpen = false;

        this.refreshView();
    }

    // Esc closes the journal dialog
    @HostListener('document:keydown.escape')
    onEscape():
        void
    {
        if
        (
            this.journalOpen
        )
        {
            this.closeJournal();
        }
    }

    get journalPosted():
        boolean
    {
        return this.doc?.Status === 'Posted' || this.doc?.Status === 'Cancelled';
    }

    get journalTitle():
        string
    {
        return this.journalPosted
            ? `Journal · ${this.doc?.AdjustmentNo ?? ''}`
            : 'Journal Voucher — Preview';
    }

    get journalSubtitle():
        string
    {
        if
        (
            this.journalPosted
        )
        {
            const by =
                [this.doc?.PostedByName ?? '', formatAdjustmentDate(this.doc?.PostedDate ?? '')].filter(x => !!x).join(' · ');

            return `Posted${by ? ' : ' + by : ''}${this.doc?.Status === 'Cancelled' ? ' · reversed on cancel' : ''}`;
        }

        return 'What Post writes, from the settlement chosen on this page';
    }

    // Posting date once posted, else the cut-off date
    get journalDate():
        string
    {
        return formatAdjustmentDate(
            this.journalPosted && this.doc?.PostedDate
                ? this.doc.PostedDate
                : (this.analysis?.CutOffDate || this.doc?.CutOffDate || toAdjustmentIso(this.cutOffDate)));
    }

    get journalBalanced():
        boolean
    {
        return this.journalDebit === this.journalCredit;
    }

    get hasRelease():
        boolean
    {
        return this.journal.some(x => x.Kind === 'Release');
    }

    // Posted : the units still to be released by sales
    get remainingQuantity():
        number
    {
        return sum((this.doc?.Lines ?? []).map(x => Math.max(0, x.Quantity - x.ReleasedQuantity)));
    }

    get remainingAmount():
        number
    {
        return round2(sum((this.doc?.Lines ?? []).map(x => Math.max(0, x.Quantity - x.ReleasedQuantity) * x.DifferencePerUnit)));
    }


    //===========================================================
    // Save / Post
    //===========================================================

    private saveProblem():
        string
    {
        const problem =
            this.analyseProblem();

        if
        (
            problem
        )
        {
            return problem;
        }

        if
        (
            !this.analysis
        )
        {
            return 'Press Evaluate first : the stock on the cut-off date is revalued before the price adjustment is saved.';
        }

        if
        (
            this.analysisStale
        )
        {
            return 'The evaluation is out of date (products, new MRPs or the cut-off date changed). Press Evaluate again before saving.';
        }

        if
        (
            this.reanalysing
        )
        {
            return 'The evaluation is being refreshed after a margin change. Try again in a moment.';
        }

        if
        (
            this.hasBadMargin
        )
        {
            return 'A margin % is not valid (it must be below 100). Correct it or reset it.';
        }

        return '';
    }

    private payload():
        CreatePriceAdjustment
    {
        return {
            Type:this.type,
            CircularRef:this.circularRef.trim(),
            CircularDate:this.circularDate ? toAdjustmentIso(this.circularDate) : null,
            CutOffDate:toAdjustmentIso(this.cutOffDate),
            Remarks:this.remarks.trim(),
            Products:this.changedRows.map(x => ({ ProductId:x.ProductId, NewMrp:x.NewMrp })),
            Margins:[...this.marginOverrides.entries()].map(([id, margin]) => ({ StockBatchId:id, MarginPercent:margin })),
            Suppliers:this.settleCards.map(x => ({ SupplierCode:x.SupplierCode, IncreaseTo:x.IncreaseTo, ReductionTo:x.ReductionTo }))
        };
    }

    private get draftId():
        number
    {
        return this.doc?.Id || this.savedId;
    }

    private saveDraft():
        Observable<number>
    {
        const id =
            this.draftId;

        return id > 0
            ? this.service.update(id, this.payload())
            : this.service.create(this.payload());
    }

    save():
        void
    {
        if
        (
            this.saving || this.isView || this.progress.busy
        )
        {
            return;
        }

        const problem =
            this.saveProblem();

        if
        (
            problem
        )
        {
            this.error = problem;

            this.refreshView();

            return;
        }

        this.saving = true;

        this.error = '';

        const updating =
            this.draftId > 0;

        this.progress
            .run(
                updating ? 'Updating Price Adjustment' : 'Saving Price Adjustment',
                updating ? `Please wait while "${this.numberText}" is being updated...` : 'Please wait while the price adjustment is being saved...',
                updating ? 'Price adjustment updated.' : 'Price adjustment saved.',
                this.saveDraft())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.saving = false;

                        this.back();
                    },
                error:
                    err =>
                    {
                        this.saving = false;

                        this.error = errorText(err, 'The price adjustment could not be saved.');

                        this.refreshAll();
                    }
            });
    }

    // Add / edit : save, then post
    post():
        void
    {
        if
        (
            this.saving || this.isView || this.progress.busy
        )
        {
            return;
        }

        const problem =
            this.saveProblem();

        if
        (
            problem
        )
        {
            this.error = problem;

            this.refreshView();

            return;
        }

        this.saving = true;

        this.error = '';

        let saved =
            0;

        const posting =
            this.saveDraft()
                .pipe(
                    switchMap
                    (
                        id =>
                        {
                            saved = id;

                            if
                            (
                                !this.doc && id > 0
                            )
                            {
                                this.savedId = id;
                            }

                            return this.service.post(id);
                        }
                    ));

        this.progress
            .run(
                'Posting Price Adjustment',
                'Please wait while the new MRPs go on the batches and the journal is posted...',
                'Price adjustment posted.',
                posting)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.saving = false;

                        this.back();
                    },
                error:
                    err =>
                    {
                        this.saving = false;

                        this.error =
                            errorText(err, 'The price adjustment could not be posted.')
                            + (saved > 0 ? ' It is saved as a draft : Save or Post again updates that draft.' : '');

                        this.refreshAll();
                    }
            });
    }

    // View of a draft : post it as saved (the server analyses again)
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

        this.error = '';

        this.progress
            .run(
                'Posting Price Adjustment',
                `Please wait while "${doc.AdjustmentNo}" is being posted...`,
                'Price adjustment posted.',
                this.service.post(doc.Id))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.saving = false;

                        this.back();
                    },
                error:
                    err =>
                    {
                        this.saving = false;

                        this.error = errorText(err, 'The price adjustment could not be posted.') + ' Open it for editing to fix it.';

                        this.refreshAll();
                    }
            });
    }

    clear():
        void
    {
        if
        (
            this.isView || this.progress.busy
        )
        {
            return;
        }

        this.rows = [];

        this.brandId = 0;

        this.pickId = 0;

        this.circularRef = '';

        this.circularDate = null;

        this.remarks = '';

        this.error = '';

        this.productError = '';

        this.marginAllText = '';

        this.settlement.clear();

        this.resetAnalysis();

        const today =
            fromAdjustmentIso(this.defaults?.Today ?? '');

        if
        (
            today
        )
        {
            this.cutOffDate = today;
        }

        this.buildPickers();

        this.refreshView();
    }


    //===========================================================
    // Delete (edit of a draft)
    //===========================================================

    openDelete():
        void
    {
        if
        (
            !this.doc || this.doc.Status !== 'Draft'
        )
        {
            return;
        }

        this.deleteOpen = true;

        this.refreshView();
    }

    closeDelete():
        void
    {
        this.deleteOpen = false;

        this.refreshView();
    }

    confirmDelete():
        void
    {
        const doc =
            this.doc;

        if
        (
            !doc || this.saving || this.progress.busy
        )
        {
            return;
        }

        this.saving = true;

        this.deleteOpen = false;

        this.progress
            .run(
                'Deleting Price Adjustment',
                `Please wait while "${doc.AdjustmentNo}" is being deleted...`,
                'Price adjustment deleted.',
                this.service.delete(doc.Id))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.saving = false;

                        this.back();
                    },
                error:
                    err =>
                    {
                        this.saving = false;

                        this.error = errorText(err, 'The draft could not be deleted.');

                        this.refreshAll();
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
                this.router.createUrlTree(['/print-viewer', PRICE_ADJUSTMENT_PRINT_KEY, this.doc.Id])
            );

        const tab =
            window.open(url, '_blank');

        if
        (
            !tab
        )
        {
            this.error = 'The browser blocked the print tab. Allow pop-ups for this site.';

            this.refreshView();
        }
    }

    openCancel():
        void
    {
        this.cancelOpen = true;

        this.cancelReason = '';

        this.cancelError = '';

        this.refreshView();
    }

    closeCancel():
        void
    {
        this.cancelOpen = false;

        this.refreshView();
    }

    onCancelReason
    (
        value:
            any
    ):
        void
    {
        this.cancelReason = String(value ?? '');

        if
        (
            this.cancelError && this.cancelReason.trim().length >= 5
        )
        {
            this.cancelError = '';

            this.refreshView();
        }
    }

    confirmCancel():
        void
    {
        const doc =
            this.doc;

        if
        (
            !doc || this.saving || this.progress.busy
        )
        {
            return;
        }

        if
        (
            this.cancelReason.trim().length < 5
        )
        {
            this.cancelError = 'Write why the price adjustment is cancelled (at least 5 characters).';

            this.refreshView();

            return;
        }

        this.saving = true;

        this.cancelOpen = false;

        this.error = '';

        this.progress
            .run(
                'Cancelling Price Adjustment',
                `Please wait while "${doc.AdjustmentNo}" is being cancelled...`,
                'Price adjustment cancelled.',
                this.service.cancel(doc.Id, this.cancelReason.trim()))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.saving = false;

                        this.back();
                    },
                error:
                    err =>
                    {
                        this.saving = false;

                        this.error = errorText(err, 'The price adjustment could not be cancelled.');

                        this.refreshAll();
                    }
            });
    }

    back():
        void
    {
        this.router.navigate([PRICE_ADJUSTMENT_ROUTE, 'list']);
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
                return 'Add Price Adjustment';

            case 'edit':
                return 'Update Price Adjustment';

            default:
                return 'View Price Adjustment';
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

    get saveTitle():
        string
    {
        const problem =
            this.isView ? '' : this.saveProblem();

        if
        (
            problem
        )
        {
            return `Not ready : ${problem}`;
        }

        return this.mode === 'edit' ? 'Update the draft' : 'Save as a draft (numbered on the first save)';
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
        return formatAdjustmentDate(iso);
    }

    qty
    (
        value:
            number
    ):
        string
    {
        return formatAdjustmentQty(value);
    }

    money
    (
        value:
            number
    ):
        string
    {
        return formatAdjustmentMoney(value);
    }

    // Signed amount : +1,200.00 / −800.00
    signed
    (
        value:
            number
    ):
        string
    {
        const amount =
            round2(value);

        return amount > 0
            ? `+${formatAdjustmentMoney(amount)}`
            : (amount < 0 ? `−${formatAdjustmentMoney(-amount)}` : formatAdjustmentMoney(0));
    }

    cost
    (
        value:
            number
    ):
        string
    {
        return formatAdjustmentCost(value);
    }

    signedCost
    (
        value:
            number
    ):
        string
    {
        return value > 0
            ? `+${formatAdjustmentCost(value)}`
            : (value < 0 ? `−${formatAdjustmentCost(-value)}` : formatAdjustmentCost(0));
    }

    pct
    (
        value:
            number | null
    ):
        string
    {
        return formatAdjustmentPercent(value);
    }

    margin
    (
        value:
            number
    ):
        string
    {
        return formatAdjustmentPercent(value, false);
    }

    // + / − / 0 → up / down / ''
    tone
    (
        value:
            number
    ):
        string
    {
        const amount =
            round2(value);

        return amount > 0 ? 'pa-up' : (amount < 0 ? 'pa-down' : '');
    }
}


//===============================================================
// Helpers
//===============================================================

function makeRow
(
    base:
        Pick<ProductRow, 'ProductId' | 'ProductCode' | 'ProductName' | 'PartNumber' | 'BrandName' | 'LastMrp'>,
    newMrp:
        number
):
    ProductRow
{
    const mrp =
        round2(newMrp);

    const last =
        round2(base.LastMrp);

    const state:
        ProductRow['State'] =
        !(mrp > 0)
            ? 'bad'
            : (mrp === last ? 'same' : (mrp > last ? 'up' : 'down'));

    return {
        ProductId:base.ProductId,
        ProductCode:base.ProductCode,
        ProductName:base.ProductName,
        PartNumber:base.PartNumber,
        BrandName:base.BrandName,
        LastMrp:base.LastMrp,
        NewMrp:mrp,
        NewMrpText:mrp > 0 ? formatAdjustmentMoney(mrp) : '',
        State:state,
        Change:state === 'bad' ? null : priceAdjustmentChange(last, mrp)
    };
}

function toLineRow
(
    line:
        PriceAdjustmentLine
):
    LineRow
{
    return {
        ...line,
        MarginText:(Number(line.MarginPercent) || 0).toFixed(2),
        MarginBad:false
    };
}

function round2
(
    value:
        number
):
    number
{
    return Math.round((Number(value) || 0) * 100) / 100;
}

function sum
(
    values:
        number[]
):
    number
{
    return values.reduce((total, x) => total + (Number(x) || 0), 0);
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
        String(text ?? '').replace(/,/g, '').replace(/%/g, '').trim();

    return clean === '' ? NaN : Number(clean);
}

// The API's message : { message } / a text / the fallback
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

    if
    (
        err?.status === 403
    )
    {
        return body?.message || body?.Message || 'You do not have permission for this action.';
    }

    if
    (
        typeof body === 'string' && body.trim()
    )
    {
        return body.trim();
    }

    return body?.message || body?.Message || body?.title || fallback;
}
