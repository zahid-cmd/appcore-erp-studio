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
    OnDestroy,
    OnInit,
    ViewChild,
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
    DomSanitizer,
    SafeHtml
}
from '@angular/platform-browser';

import
{
    Observable,
    Subscription,
    map,
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
    ControlSegmentComponent,
    ControlSegmentItem
}
from '../../../../../shared/components/utilities/control-segment/control-segment';

import
{
    CheckboxComponent
}
from '../../../../../shared/components/utilities/checkbox/checkbox';

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

import
{
    ProgressDialogComponent
}
from '../../../../../shared/components/utilities/progress-dialog/progress-dialog';

import
{
    ProgressDialogService
}
from '../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';

import
{
    ProgressRunner
}
from '../../../../../shared/components/utilities/progress-dialog/progress-runner';

//===============================================================
// Pricing & Labels
//===============================================================

import
{
    PRODUCT_PRICING_TYPES,
    ProductPricingType,
    ProductPricingTypeInfo,
    formatPricingDate,
    formatPricingQty,
    productPricingType
}
from '../../models/product-pricing.model';

import
{
    BarcodeDocument,
    BarcodeGridRow,
    BarcodeHistoryInput,
    BarcodeRowsFilter,
    BarcodeSettings,
    BarcodeSource,
    BrandAs,
    LABEL_PAPERS,
    LabelOptions,
    LabelPaper,
    LabelPaperCode,
    TAG_PAPER,
    barcodeSource,
    formatLabelMoney,
    gridRowOfBatch,
    gridRowOfUnit,
    labelPaper,
    labelsPerPage,
    pagesNeeded
}
from '../../models/barcode-management.model';

import
{
    BarcodeManagementService
}
from '../../services/barcode-management.service';

import
{
    BARCODE_LABELS_PRINT_KEY,
    BarcodeLabelsPrintRequest,
    LABEL_CSS,
    LabelItem,
    renderLabel,
    saveBarcodeLabelsPrintRequest
}
from '../../print/barcode-labels.print';


//===============================================================
// Option of the dropdowns
//===============================================================

interface Option
{
    label:string;
    value:any;
}

type LabelSwitch =
    'printMrp' | 'showName' | 'showPart' | 'showBrand' | 'showBatch' | 'showDate' | 'showKey' | 'showBattery' | 'cutLines' | 'code128' | 'qr';


//===============================================================
// Barcode Management (utility page : no draft / post)
//
//   Header : product type, paper, labels · Preview / Print / Clear
//   Source : one line : load from Price Change / Purchase /
//            Products / Stock (rows add up; the same batch twice
//            adds its labels)
//   Grid   : one row per batch (Motor Bikes : per bike), the
//            labels to print
//   Right  : Label Setup with the live preview of one label
//
// ?type=MB|SP|AC opens on that product type (default SP).
//===============================================================

@Component(
{
    selector:'barcode-management',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        CommandCenterComponent,
        SearchDropdownComponent,
        ControlSegmentComponent,
        CheckboxComponent,
        OrbitLoaderComponent,
        ToastComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./barcode-management.html',

    styleUrl:'./barcode-management.css'
})

export class BarcodeManagementPage
    implements OnInit, OnDestroy
{
    private readonly service =
        inject(BarcodeManagementService);

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

    private readonly sanitizer =
        inject(DomSanitizer);

    // Progress dialog around the loads and the print
    readonly progress =
        new ProgressRunner(inject(ProgressDialogService), () => this.refreshView());

    readonly title =
        'Barcode Management';

    readonly subtitle =
        'Barcode labels of the stock batches (Code-128 and QR) and hang-tags of the motor bikes';

    readonly icon =
        'fa-solid fa-barcode';


    //===========================================================
    // State
    //===========================================================

    type:
        ProductPricingType = 'SP';

    settings:
        BarcodeSettings | null = null;

    settingsLoading:
        boolean = false;

    settingsError:
        string = '';

    // Source bar
    source:
        BarcodeSource = 'purchase';

    documents:
        BarcodeDocument[] = [];

    documentsLoading:
        boolean = false;

    documentsError:
        string = '';

    docId:
        number = 0;

    brandId:
        number = 0;

    categoryId:
        number = 0;

    productId:
        number = 0;

    // Grid
    rows:
        BarcodeGridRow[] = [];

    selectedKey:
        string = '';

    // Document numbers of the loads ('pricechange:12' → PC-SP-0012)
    private readonly loadedDocs =
        new Map<string, string>();

    // Label setup (from the switches; changed per print)
    paperCode:
        LabelPaperCode = 'A4-3x8';

    startAt:
        number = 1;

    nudgeX:
        number = 0;

    nudgeY:
        number = 0;

    printMrp:
        boolean = true;

    mrpFormat:
        string = 'MRP {0}';

    showName:
        boolean = true;

    showPart:
        boolean = true;

    showBrand:
        boolean = true;

    brandAs:
        BrandAs = 'Name';

    showBatch:
        boolean = false;

    showDate:
        boolean = false;

    // Hang-tag : key / battery no (this page only, ON by default)
    showKey:
        boolean = true;

    showBattery:
        boolean = true;

    // Dotted cut lines with a gap round each label (this page
    // only; not on rolls)
    cutLines:
        boolean = true;

    // Hang-tag design (this page only)
    tagStyle:
        'Classic' | 'Premium' = 'Classic';

    readonly tagStyleItems:
        ControlSegmentItem[] =
        [
            { value:'Classic', text:'Classic' },
            { value:'Premium', text:'Premium' }
        ];

    onTagStyle
    (
        value:
            any
    ):
        void
    {
        this.tagStyle =
            value === 'Premium'
                ? 'Premium'
                : 'Classic';

        this.buildPreview();

        this.refreshView();
    }

    code128:
        boolean = true;

    qr:
        boolean = true;

    // Live preview
    previewHtml:
        SafeHtml | null = null;

    previewWidth:
        number = 0;

    previewHeight:
        number = 0;

    previewTransform:
        string = 'scale(1)';

    previewCaption:
        string = '';

    // Totals (rebuilt on every change)
    tickedCount:
        number = 0;

    labelCount:
        number = 0;

    sheetCount:
        number = 0;

    blockedCount:
        number = 0;

    unpricedCount:
        number = 0;

    private settingsRequest?:
        Subscription;

    private documentsRequest?:
        Subscription;



    //===========================================================
    // View refresh
    //===========================================================

    // After an async result (the progress dialog closing) : this
    // view now, then the whole app once the dialog has gone
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
                    console.error('[Barcode Management] view update failed', error);
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
            console.error('[Barcode Management] view update failed', error);
        }
    }


    //===========================================================
    // Start / end
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

        this.buildSourceItems();

        this.recompute();

        this.loadSettings();
    }

    // The Print Viewer tab stays open when the page is left
    ngOnDestroy():
        void
    {
        this.stageObserver?.disconnect();

        this.stageObserver = undefined;
    }

    // The preview stage : the label is scaled to the room it has
    // (the card's free height), measured as it changes
    private stageObserver?:
        ResizeObserver;

    private stageWidth =
        300;

    private stageHeight =
        300;

    @ViewChild('pvStage')
    set pvStage
    (
        ref:
            ElementRef<HTMLElement> | undefined
    )
    {
        this.stageObserver?.disconnect();

        this.stageObserver = undefined;

        if
        (
            !ref
            ||
            typeof ResizeObserver === 'undefined'
        )
        {
            return;
        }

        this.stageObserver =
            new ResizeObserver
            (
                entries =>
                {
                    const rect =
                        entries[0]?.contentRect;

                    if
                    (
                        !rect
                    )
                    {
                        return;
                    }

                    const width =
                        Math.max(80, Math.floor(rect.width));

                    const height =
                        Math.max(80, Math.floor(rect.height));

                    if
                    (
                        Math.abs(width - this.stageWidth) < 2
                        &&
                        Math.abs(height - this.stageHeight) < 2
                    )
                    {
                        return;
                    }

                    this.stageWidth =
                        width;

                    this.stageHeight =
                        height;

                    this.buildPreview();

                    this.refreshView();
                }
            );

        this.stageObserver.observe(ref.nativeElement);
    }

    // Switches of the page and the pickers of the type
    loadSettings():
        void
    {
        this.settingsRequest?.unsubscribe();

        this.settingsLoading = true;

        this.settingsError = '';

        const type =
            this.type;

        this.refreshView();

        this.settingsRequest =
            this.service
                .getSettings(type)
                .pipe(timeout(REQUEST_TIMEOUT), takeUntilDestroyed(this.destroyRef))
                .subscribe
                (
                    {
                        next:
                            settings =>
                            {
                                if
                                (
                                    type !== this.type
                                )
                                {
                                    return;
                                }

                                this.settings = settings;

                                this.settingsLoading = false;

                                this.applyDefaults(settings);

                                this.buildPickers();

                                if
                                (
                                    this.usesDocument
                                )
                                {
                                    this.loadDocuments();
                                }

                                this.recompute();

                                this.refreshView();
                            },

                        error:
                            err =>
                            {
                                this.settingsLoading = false;

                                this.settingsError = errorText(err, 'The barcode settings could not be loaded.');

                                this.refreshView();
                            }
                    }
                );
    }

    // The switches become the label setup of this page
    private applyDefaults
    (
        s:
            BarcodeSettings
    ):
        void
    {
        this.printMrp = s.PrintMrp;

        this.mrpFormat = s.MrpFormat || 'MRP {0}';

        this.showName = s.ShowName;

        this.showPart = s.ShowPartNumber;

        this.showBrand = s.ShowBrand;

        this.brandAs = s.BrandAs;

        this.showBatch = s.ShowBatch;

        this.showDate = s.ShowDate;

        this.code128 = s.ShowCode128;

        this.qr = s.ShowQr;

        // Spare parts / accessories : one code per label (both
        // switches ON or both OFF : the barcode)
        if
        (
            !this.isMotorBikes && this.code128 === this.qr
        )
        {
            this.code128 = true;

            this.qr = false;
        }

        this.paperCode = s.DefaultPaper;

        this.startAt = 1;

        this.nudgeX = 0;

        this.nudgeY = 0;
    }


    //===========================================================
    // Product type
    //===========================================================

    readonly typeItems:
        ControlSegmentItem[] =
        PRODUCT_PRICING_TYPES.map(x => ({ value:x.type, text:x.type === 'SP' ? 'Spare Parts & Lub.' : x.title }));

    get info():
        ProductPricingTypeInfo
    {
        return productPricingType(this.type);
    }

    get isMotorBikes():
        boolean
    {
        return this.type === 'MB';
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

        this.documentsRequest?.unsubscribe();

        this.type = type as ProductPricingType;

        this.settings = null;

        this.documents = [];

        this.docItems = [];

        this.docId = 0;

        this.brandId = 0;

        this.categoryId = 0;

        this.productId = 0;

        this.rows = [];

        this.selectedKey = '';

        this.loadedDocs.clear();

        this.buildSourceItems();

        this.buildPickers();

        this.recompute();

        this.loadSettings();
    }


    //===========================================================
    // Source bar
    //===========================================================

    sourceItems:
        ControlSegmentItem[] = [];

    // Items are built once per change (not getters) : a new
    // array on every check made the dropdowns lose the first
    // click
    docItems:
        Option[] = [];

    brandItems:
        Option[] = [];

    categoryItems:
        Option[] = [];

    productItems:
        Option[] = [];

    get usesDocument():
        boolean
    {
        return this.source === 'pricechange' || this.source === 'purchase';
    }

    get docPlaceholder():
        string
    {
        if
        (
            this.documentsLoading
        )
        {
            return 'Loading…';
        }

        if
        (
            this.documents.length === 0
        )
        {
            return this.source === 'pricechange'
                ? 'No posted price change with stock'
                : 'No received purchase with priced batches';
        }

        return this.source === 'pricechange'
            ? 'Choose the price change'
            : 'Choose the purchase';
    }

    get canLoad():
        boolean
    {
        if
        (
            !this.settings || this.progress.busy
        )
        {
            return false;
        }

        if
        (
            this.usesDocument
        )
        {
            return this.docId > 0;
        }

        if
        (
            this.source === 'products'
        )
        {
            return this.brandId !== 0 || this.categoryId > 0 || this.productId > 0;
        }

        return true;
    }

    private buildSourceItems():
        void
    {
        this.sourceItems =
            [
                { value:'pricechange', text:'Price Change' },
                { value:'purchase', text:this.isMotorBikes ? 'Purchase (bikes)' : 'Purchase / Receiving' },
                { value:'products', text:this.isMotorBikes ? 'Models' : 'Products' },
                { value:'stock', text:'Stock' }
            ];
    }

    onSourceChange
    (
        value:
            any
    ):
        void
    {
        const source =
            String(value ?? '') as BarcodeSource;

        if
        (
            source === this.source
            ||
            !['pricechange', 'purchase', 'products', 'stock'].includes(source)
        )
        {
            return;
        }

        this.documentsRequest?.unsubscribe();

        this.source = source;

        this.docId = 0;

        this.documents = [];

        this.docItems = [];

        this.documentsLoading = false;

        this.documentsError = '';

        this.brandId = 0;

        this.categoryId = 0;

        this.productId = 0;

        this.buildPickers();

        if
        (
            this.usesDocument
        )
        {
            this.loadDocuments();
        }

        this.refreshView();
    }

    // Posted price changes / purchases with stock behind them
    loadDocuments():
        void
    {
        this.documentsRequest?.unsubscribe();

        this.documentsLoading = true;

        this.documentsError = '';

        const type =
            this.type;

        const source =
            this.source;

        this.documentsRequest =
            this.service
                .getDocuments(type, source)
                .pipe(timeout(REQUEST_TIMEOUT), takeUntilDestroyed(this.destroyRef))
                .subscribe
                (
                    {
                        next:
                            documents =>
                            {
                                if
                                (
                                    type !== this.type || source !== this.source
                                )
                                {
                                    return;
                                }

                                this.documents = documents;

                                this.documentsLoading = false;

                                this.docItems =
                                    documents.map
                                    (
                                        x =>
                                        ({
                                            label:this.documentText(x),
                                            value:x.Id
                                        })
                                    );

                                if
                                (
                                    !documents.some(x => x.Id === this.docId)
                                )
                                {
                                    this.docId = 0;
                                }

                                this.refreshView();
                            },

                        error:
                            err =>
                            {
                                this.documentsLoading = false;

                                this.documentsError = errorText(err, 'The documents could not be loaded.');

                                this.toast.error('Not Loaded', this.documentsError);

                                this.refreshView();
                            }
                    }
                );
    }

    private documentText
    (
        doc:
            BarcodeDocument
    ):
        string
    {
        // Purchases : "3 of 5 priced" when some lines wait for a price
        const count =
            this.isMotorBikes && this.source === 'purchase'
                ? `${doc.Units} priced ${doc.Units === 1 ? 'bike' : 'bikes'}`
                : this.source === 'purchase' && doc.TotalLines > doc.Lines
                    ? `${doc.Lines} of ${doc.TotalLines} priced`
                    : `${doc.Lines} ${doc.Lines === 1 ? 'batch' : 'batches'}`;

        return [doc.No, formatPricingDate(doc.Date), doc.Party, count]
            .filter(x => !!x)
            .join(' · ');
    }

    // Brand › Category › Product, each filtered by the one above
    private buildPickers():
        void
    {
        const s =
            this.settings;

        const brands =
            s?.Brands ?? [];

        const categories =
            (s?.Categories ?? []).filter(x => !this.brandId || x.BrandId === this.brandId);

        const products =
            (s?.Products ?? [])
                .filter(x => !this.brandId || x.BrandId === this.brandId)
                .filter(x => !this.categoryId || x.CategoryId === this.categoryId);

        this.brandItems =
        [
            { label:'All Brands', value:0 },
            ...brands.map(x => ({ label:x.Name, value:x.Id }))
        ];

        this.categoryItems =
        [
            { label:'All Categories', value:0 },
            ...categories.map(x => ({ label:x.Name, value:x.Id }))
        ];

        this.productItems =
        [
            { label:this.isMotorBikes ? 'All Models' : 'All Products', value:0 },
            ...products.map
            (
                x =>
                ({
                    label:[x.Code, x.PartNumber, x.Name].filter(t => !!t).join(' · ') + ` (${formatPricingQty(x.Stock)})`,
                    value:x.Id
                })
            )
        ];
    }

    onDocChange
    (
        value:
            any
    ):
        void
    {
        this.docId = Number(value) || 0;

        this.refreshView();
    }

    onBrandChange
    (
        value:
            any
    ):
        void
    {
        this.brandId = Number(value) || 0;

        const s =
            this.settings;

        if
        (
            this.categoryId
            &&
            this.brandId
            &&
            !(s?.Categories ?? []).some(x => x.Id === this.categoryId && x.BrandId === this.brandId)
        )
        {
            this.categoryId = 0;
        }

        if
        (
            this.productId
            &&
            this.brandId
            &&
            !(s?.Products ?? []).some(x => x.Id === this.productId && x.BrandId === this.brandId)
        )
        {
            this.productId = 0;
        }

        this.buildPickers();

        this.refreshView();
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
            (this.settings?.Categories ?? []).find(x => x.Id === this.categoryId);

        if
        (
            category && this.brandId && category.BrandId !== this.brandId
        )
        {
            this.brandId = category.BrandId;
        }

        if
        (
            this.productId
            &&
            this.categoryId
            &&
            !(this.settings?.Products ?? []).some(x => x.Id === this.productId && x.CategoryId === this.categoryId)
        )
        {
            this.productId = 0;
        }

        this.buildPickers();

        this.refreshView();
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
            (this.settings?.Products ?? []).find(x => x.Id === this.productId);

        if
        (
            product
        )
        {
            if
            (
                this.brandId && product.BrandId !== this.brandId
            )
            {
                this.brandId = product.BrandId;
            }

            if
            (
                this.categoryId && product.CategoryId !== this.categoryId
            )
            {
                this.categoryId = product.CategoryId;
            }
        }

        this.buildPickers();

        this.refreshView();
    }


    //===========================================================
    // Load : the rows of the source join the grid (the same batch
    // again adds its labels; a bike already there is kept)
    //===========================================================

    load():
        void
    {
        if
        (
            !this.canLoad
        )
        {
            this.toast.error(
                'Not Loaded',
                this.usesDocument
                    ? `Choose the ${this.source === 'pricechange' ? 'price change' : 'purchase'} first.`
                    : 'Choose a brand, a category or a product first.');

            return;
        }

        const type =
            this.type;

        const source =
            this.source;

        const filter:
            BarcodeRowsFilter =
            {
                Type:type,
                Source:source,
                Id:this.usesDocument ? this.docId : 0,
                BrandId:this.usesDocument ? 0 : this.brandId,
                CategoryId:this.usesDocument ? 0 : this.categoryId,
                ProductId:source === 'products' ? this.productId : 0
            };

        const doc =
            this.usesDocument
                ? this.documents.find(x => x.Id === this.docId)
                : undefined;

        const request$:
            Observable<BarcodeGridRow[]> =
            this.isMotorBikes
                ? (
                    source === 'purchase'
                        ? this.service.getUnitsByPurchase(filter.Id)
                        : this.service.getUnits(filter)
                  )
                  .pipe(map(units => units.map(x => gridRowOfUnit(x, source, filter.Id))))
                : this.service
                    .getRows(filter)
                    .pipe(map(rows => rows.map(x => gridRowOfBatch(x, source, filter.Id))));

        const what =
            this.isMotorBikes ? 'motor bikes' : 'batches';

        this.progress
            .run(
                this.isMotorBikes ? 'Loading Motor Bikes' : 'Loading Batches',
                `Please wait while the ${what} of ${doc ? doc.No : barcodeSource(source).title.toLowerCase()} are being loaded...`,
                this.isMotorBikes ? 'Motor bikes loaded.' : 'Batches loaded.',
                request$.pipe(timeout(REQUEST_TIMEOUT)))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    (rows: BarcodeGridRow[]) =>
                    {
                        if
                        (
                            type !== this.type
                        )
                        {
                            return;
                        }

                        if
                        (
                            rows.length === 0
                        )
                        {
                            this.toast.error(
                                'Nothing Loaded',
                                this.isMotorBikes
                                    ? 'No priced motor bike on hand behind this selection. Price it in Product Pricing first.'
                                    : 'No priced batch with stock behind this selection. Price it in Product Pricing first.');

                            this.refreshAll();

                            return;
                        }

                        if
                        (
                            doc
                        )
                        {
                            this.loadedDocs.set(`${source}:${doc.Id}`, doc.No);
                        }

                        this.addRows(rows);

                        this.refreshAll();
                    },
                error:
                    err =>
                    {
                        this.toast.error('Not Loaded', errorText(err, `The ${what} could not be loaded.`));

                        this.refreshAll();
                    }
            });
    }

    private addRows
    (
        incoming:
            BarcodeGridRow[]
    ):
        void
    {
        const byKey =
            new Map(this.rows.map(x => [x.Key, x] as [string, BarcodeGridRow]));

        const added:
            BarcodeGridRow[] = [];

        incoming.forEach
        (
            row =>
            {
                const existing =
                    byKey.get(row.Key);

                if
                (
                    !existing
                )
                {
                    byKey.set(row.Key, row);

                    added.push(row);

                    return;
                }

                // Same batch again : its labels add up
                if
                (
                    existing.Kind === 'batch'
                )
                {
                    existing.Qty = Math.min(MAX_LABELS_PER_ROW, existing.Qty + row.Qty);

                    existing.Ticked = existing.Ticked || row.Ticked;
                }
            }
        );

        this.rows = [...this.rows, ...added];

        if
        (
            !this.rows.some(x => x.Key === this.selectedKey)
        )
        {
            this.selectedKey = (added[0] ?? this.rows[0])?.Key ?? '';
        }

        this.recompute();
    }


    //===========================================================
    // Grid
    //===========================================================

    get allTicked():
        boolean
    {
        return this.rows.length > 0 && this.rows.every(x => x.Ticked);
    }

    toggleAll():
        void
    {
        const tick =
            !this.allTicked;

        this.rows.forEach(x => x.Ticked = tick);

        this.recompute();

        this.refreshView();
    }

    toggleRow
    (
        row:
            BarcodeGridRow
    ):
        void
    {
        row.Ticked = !row.Ticked;

        if
        (
            row.Ticked && row.Qty <= 0
        )
        {
            row.Qty = 1;
        }

        this.recompute();

        this.refreshView();
    }

    onQty
    (
        row:
            BarcodeGridRow,
        value:
            any
    ):
        void
    {
        const qty =
            Math.min(MAX_LABELS_PER_ROW, Math.max(0, Math.floor(Number(String(value ?? '').replace(/,/g, '')) || 0)));

        row.Qty = qty;

        row.Ticked = qty > 0;

        this.recompute();

        this.refreshView();
    }

    removeRow
    (
        row:
            BarcodeGridRow
    ):
        void
    {
        this.rows = this.rows.filter(x => x.Key !== row.Key);

        if
        (
            this.selectedKey === row.Key
        )
        {
            this.selectedKey = this.rows[0]?.Key ?? '';
        }

        this.recompute();

        this.refreshView();
    }

    selectRow
    (
        row:
            BarcodeGridRow
    ):
        void
    {
        if
        (
            this.selectedKey === row.Key
        )
        {
            return;
        }

        this.selectedKey = row.Key;

        this.buildPreview();

        this.refreshView();
    }

    clear():
        void
    {
        this.rows = [];

        this.selectedKey = '';

        this.loadedDocs.clear();

        this.recompute();

        this.refreshView();
    }

    // Unpriced batch : no MRP, not saleable
    unpriced
    (
        row:
            BarcodeGridRow
    ):
        boolean
    {
        return !(row.Mrp > 0);
    }

    // Left out of the print : no MRP (labels only for priced
    // batches, MRP printed or not)
    blocked
    (
        row:
            BarcodeGridRow
    ):
        boolean
    {
        return this.unpriced(row);
    }


    //===========================================================
    // Label setup
    //===========================================================

    readonly paperItems:
        Option[] =
        LABEL_PAPERS.map(x => ({ label:x.title, value:x.code }));

    // "{0}" in a template label would read as an ICU expression
    readonly mrpFormatLabel =
        'MRP text ({0} = the amount)';

    readonly brandAsItems:
        ControlSegmentItem[] =
        [
            { value:'Name', text:'Name' },
            { value:'Logo', text:'Logo' }
        ];

    // Spare parts / accessories : barcode or QR (one per label)
    readonly codeItems:
        ControlSegmentItem[] =
        [
            { value:'Barcode', text:'Barcode' },
            { value:'QR', text:'QR code' }
        ];

    get codeKind():
        'Barcode' | 'QR'
    {
        return this.qr && !this.code128
            ? 'QR'
            : 'Barcode';
    }

    onCodeKind
    (
        value:
            any
    ):
        void
    {
        this.qr =
            value === 'QR';

        this.code128 =
            !this.qr;

        this.recompute();

        this.buildPreview();

        this.refreshView();
    }

    get paper():
        LabelPaper
    {
        return this.isMotorBikes
            ? TAG_PAPER
            : labelPaper(this.paperCode);
    }

    get perPage():
        number
    {
        return labelsPerPage(this.paper);
    }

    // The switch "Print MRP on Labels" is OFF : never printed
    get mrpLocked():
        boolean
    {
        return !!this.settings && !this.settings.PrintMrp;
    }

    get options():
        LabelOptions
    {
        return {
            printMrp:this.printMrp && !this.mrpLocked,
            mrpFormat:this.mrpFormat,
            showName:this.showName,
            showPart:this.showPart && !this.isMotorBikes,
            showBrand:this.showBrand,
            brandAs:this.brandAs,
            showBatch:this.showBatch,
            showDate:this.showDate,
            showKey:this.isMotorBikes && this.showKey,
            showBattery:this.isMotorBikes && this.showBattery,
            tagStyle:this.tagStyle,
            cutLines:this.cutLines,
            // Hang-tags : both codes; stickers : one of them
            code128:this.isMotorBikes ? this.code128 : this.codeKind === 'Barcode',
            qr:this.isMotorBikes ? this.qr : this.codeKind === 'QR'
        };
    }

    onPaper
    (
        value:
            any
    ):
        void
    {
        this.paperCode = labelPaper(String(value ?? '')).code;

        this.startAt = Math.min(this.startAt, labelsPerPage(this.paper));

        this.recompute();

        this.refreshView();
    }

    onStartAt
    (
        value:
            any
    ):
        void
    {
        this.startAt =
            Math.min(this.perPage, Math.max(1, Math.floor(Number(value) || 1)));

        this.recompute();

        this.refreshView();
    }

    onNudge
    (
        axis:
            'x' | 'y',
        value:
            any
    ):
        void
    {
        const mm =
            Math.min(10, Math.max(-10, Math.round((Number(value) || 0) * 10) / 10));

        if
        (
            axis === 'x'
        )
        {
            this.nudgeX = mm;
        }
        else
        {
            this.nudgeY = mm;
        }

        this.refreshView();
    }

    onSwitch
    (
        name:
            LabelSwitch,
        value:
            boolean
    ):
        void
    {
        if
        (
            name === 'printMrp' && this.mrpLocked
        )
        {
            return;
        }

        this[name] = !!value;

        this.recompute();

        this.refreshView();
    }

    onBrandAs
    (
        value:
            any
    ):
        void
    {
        this.brandAs =
            value === 'Logo'
                ? 'Logo'
                : 'Name';

        this.buildPreview();

        this.refreshView();
    }

    onMrpFormat
    (
        value:
            any
    ):
        void
    {
        const text =
            String(value ?? '').slice(0, 40);

        this.mrpFormat = text.trim() ? text : 'MRP {0}';

        this.buildPreview();

        this.refreshView();
    }

    // Back to the System Configuration switches
    resetSetup():
        void
    {
        if
        (
            this.settings
        )
        {
            this.applyDefaults(this.settings);
        }

        this.showKey =
            true;

        this.showBattery =
            true;

        this.tagStyle =
            'Classic';

        this.cutLines =
            true;

        this.recompute();

        this.refreshView();
    }


    //===========================================================
    // Totals + preview (after every change)
    //===========================================================

    private recompute():
        void
    {
        const printable =
            this.printableRows();

        this.tickedCount =
            this.rows.filter(x => x.Ticked).length;

        this.labelCount =
            printable.reduce((sum, x) => sum + x.Qty, 0);

        this.sheetCount =
            pagesNeeded(this.paper, this.labelCount, this.startAt);

        this.unpricedCount =
            this.rows.filter(x => this.unpriced(x)).length;

        this.blockedCount =
            this.rows.filter(x => x.Ticked && x.Qty > 0 && this.unpriced(x)).length;

        this.buildPreview();
    }

    // Ticked, with labels, and priced while the MRP is printed
    private printableRows():
        BarcodeGridRow[]
    {
        // Only priced batches get labels
        return this.rows.filter(x => x.Ticked && x.Qty > 0 && x.Mrp > 0);
    }

    get selectedRow():
        BarcodeGridRow | undefined
    {
        return this.rows.find(x => x.Key === this.selectedKey)
            ?? this.rows.find(x => x.Ticked)
            ?? this.rows[0];
    }

    private buildPreview():
        void
    {
        const paper =
            this.paper;

        const row =
            this.selectedRow;

        const item =
            row
                ? itemOf(row)
                : sampleItem(this.isMotorBikes, this.settings?.Today ?? '');

        this.previewCaption =
            row
                ? `${row.Kind === 'unit' ? row.ChassisNo : row.BatchNo} · ${row.Name}`
                : 'Sample label : load the batches to see yours';

        const px =
            96 / 25.4;

        const width =
            paper.labelWidth * px;

        const height =
            paper.labelHeight * px;

        // Fits the stage (its measured room, less a small margin)
        const scale =
            Math.max(0.1, Math.min(2.2, (this.stageWidth - 4) / width, (this.stageHeight - 4) / height));

        this.previewWidth = Math.round(width * scale);

        this.previewHeight = Math.round(height * scale);

        this.previewTransform = `scale(${Math.round(scale * 1000) / 1000})`;

        this.previewHtml =
            this.sanitizer.bypassSecurityTrustHtml(
                `<style>${LABEL_CSS}</style>${renderLabel(item, paper, this.options)}`);
    }


    //===========================================================
    // Preview / Print (a window of its own; see the renderer)
    //===========================================================

    get paperText():
        string
    {
        const paper =
            this.paper;

        return paper.kind === 'tag'
            ? 'Hang-tag · 4 per A4'
            : paper.kind === 'roll'
                ? `Roll ${paper.labelWidth} × ${paper.labelHeight} mm`
                : `A4 ${paper.cols} × ${paper.rows} · ${paper.labelWidth} × ${paper.labelHeight} mm`;
    }

    get sheetText():
        string
    {
        const paper =
            this.paper;

        if
        (
            paper.kind === 'roll'
        )
        {
            return `${this.labelCount} roll ${this.labelCount === 1 ? 'label' : 'labels'}`;
        }

        return `${this.sheetCount} ${this.sheetCount === 1 ? 'sheet' : 'sheets'}`;
    }

    // Opens the labels in the Print Viewer to look at (its Print
    // button prints; no history)
    preview():
        void
    {
        const request =
            this.printRequest();

        if
        (
            !request
        )
        {
            return;
        }

        const tab =
            this.openTab();

        if
        (
            tab
        )
        {
            this.showInViewer(tab, request);
        }
    }

    // History first (it checks the "Print" permission; stored only
    // while the switch is ON), then the labels open in the Print
    // Viewer. The tab is opened on the click (a tab opened after
    // an answer is blocked as a pop-up) and filled after.
    print():
        void
    {
        if
        (
            this.progress.busy
        )
        {
            return;
        }

        const request =
            this.printRequest();

        if
        (
            !request
        )
        {
            return;
        }

        const tab =
            this.openTab();

        if
        (
            !tab
        )
        {
            return;
        }

        const count =
            request.items.length;

        const history =
            this.historyInput();

        this.progress
            .run(
                'Printing Labels',
                `Please wait while ${count} ${count === 1 ? 'label is' : 'labels are'} being prepared...`,
                'Labels ready to print.',
                this.service.saveHistory(history).pipe(timeout(REQUEST_TIMEOUT)))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.showInViewer(tab, request);

                        this.refreshAll();
                    },
                error:
                    err =>
                    {
                        // No permission : nothing is printed
                        if
                        (
                            err?.status === 401 || err?.status === 403
                        )
                        {
                            if
                            (
                                !tab.closed
                            )
                            {
                                tab.close();
                            }

                            this.toast.error('Print Not Allowed', errorText(err, 'You do not have the "Print" permission on Barcode Management.'));
                        }
                        else
                        {
                            this.showInViewer(tab, request);

                            this.toast.error('History Not Saved', `${errorText(err, 'The print history could not be saved.')} The labels were opened to print.`);
                        }

                        this.refreshAll();
                    }
            });
    }

    // The labels to print, one per copy (null + message : none)
    private checkPrintable():
        LabelItem[] | null
    {
        if
        (
            this.rows.length === 0
        )
        {
            this.toast.error(
                'Nothing to Print',
                this.isMotorBikes ? 'Load the motor bikes first.' : 'Load the batches first.');

            return null;
        }

        const rows =
            this.printableRows();

        if
        (
            rows.length === 0
        )
        {
            this.toast.error(
                'Nothing to Print',
                this.blockedCount > 0
                    ? 'The ticked batches have no MRP. Price them in Product Pricing first.'
                    : 'Tick the rows to print and give them a number of labels.');

            return null;
        }

        const items:
            LabelItem[] = [];

        rows.forEach
        (
            row =>
            {
                const item =
                    itemOf(row);

                for
                (
                    let i = 0;
                    i < row.Qty;
                    i++
                )
                {
                    items.push(item);
                }
            }
        );

        if
        (
            items.length > MAX_LABELS_PER_PRINT
        )
        {
            this.toast.error(
                'Too Many Labels',
                `${items.length} labels : at most ${MAX_LABELS_PER_PRINT} in one print. Untick some rows or lower the quantities.`);

            return null;
        }

        return items;
    }

    // A new tab for the Print Viewer (not "noopener" : it keeps
    // this session's login and is pointed at the viewer after)
    private openTab():
        Window | null
    {
        const tab =
            window.open('', '_blank');

        if
        (
            !tab
        )
        {
            this.toast.error(
                'Print Failed',
                'The browser blocked the print tab. Allow pop-ups for this site.');

            return null;
        }

        try
        {
            tab.document.write(
                `<!doctype html><html><head><meta charset="utf-8"><title>Barcode Labels</title></head>`
                + `<body style="margin:0;font:600 15px 'Segoe UI',Arial,sans-serif;color:#334155;display:flex;align-items:center;justify-content:center;height:100vh;background:#f1f5f9">`
                + `Preparing the labels…</body></html>`);

            tab.document.close();
        }
        catch
        {
            // ignore : the viewer replaces it
        }

        return tab;
    }

    // Saves the labels under a token and points the tab at the
    // Print Viewer
    private showInViewer
    (
        tab:
            Window,
        request:
            BarcodeLabelsPrintRequest
    ):
        void
    {
        if
        (
            tab.closed
        )
        {
            this.toast.error('Print Cancelled', 'The print tab was closed before the labels opened.');

            return;
        }

        const token =
            saveBarcodeLabelsPrintRequest(request);

        if
        (
            !token
        )
        {
            tab.close();

            this.toast.error(
                'Print Failed',
                'The browser storage is blocked or full, so the labels cannot reach the print viewer.');

            return;
        }

        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(
                    ['/print-viewer', BARCODE_LABELS_PRINT_KEY, token],
                    {
                        queryParams:
                        {
                            doc:'labels'
                        }
                    }
                )
            );

        tab.location.href =
            new URL(url, window.location.origin).href;

        tab.focus();
    }

    // The print request of the ticked rows (null + message : none)
    private printRequest():
        BarcodeLabelsPrintRequest | null
    {
        const items =
            this.checkPrintable();

        if
        (
            !items
        )
        {
            return null;
        }

        const paper =
            this.paper;

        const perPage =
            labelsPerPage(paper);

        const skip =
            paper.kind === 'sheet'
                ? Math.min(perPage - 1, Math.max(0, Math.floor(this.startAt) - 1))
                : 0;

        const pages =
            paper.kind === 'roll'
                ? items.length
                : Math.ceil((items.length + skip) / perPage);

        const caption =
            [
                this.info.title,
                paper.kind === 'tag'
                    ? 'Hang-tags'
                    : paper.kind === 'roll'
                        ? `Roll ${paper.labelWidth} x ${paper.labelHeight} mm`
                        : `A4 ${paper.cols} x ${paper.rows}`,
                `${items.length} ${items.length === 1 ? 'label' : 'labels'}`,
                paper.kind === 'roll' ? '' : `${pages} ${pages === 1 ? 'page' : 'pages'}`,
                skip > 0 ? `from label ${skip + 1}` : ''
            ]
            .filter(x => !!x)
            .join(' · ');

        return {
            title:this.isMotorBikes ? 'Motor Bike Hang-Tags' : 'Barcode Labels',
            caption,
            items,
            paper,
            options:{ ...this.options },
            startAt:this.startAt,
            nudgeX:this.nudgeX,
            nudgeY:this.nudgeY
        };
    }

    private historyInput():
        BarcodeHistoryInput
    {
        const rows =
            this.printableRows();

        const sources =
            [...new Set(rows.map(x => `${x.Source}:${x.SourceId}`))];

        const single =
            sources.length === 1
                ? rows[0]
                : undefined;

        return {
            Type:this.type,
            LabelKind:this.isMotorBikes ? 'HangTag' : 'Label',
            Paper:this.paper.code,
            Source:single ? barcodeSource(single.Source).history : 'Mixed',
            SourceId:single ? single.SourceId : 0,
            SourceNo:single ? this.loadedDocs.get(`${single.Source}:${single.SourceId}`) ?? '' : '',
            StartAt:this.paper.kind === 'sheet' ? this.startAt : 1,
            PrintMrp:this.options.printMrp,
            SheetCount:pagesNeeded(this.paper, this.labelCount, this.startAt),
            Lines:rows.map
            (
                x =>
                ({
                    StockBatchId:x.StockBatchId,
                    UnitId:x.UnitId,
                    Quantity:x.Qty
                })
            )
        };
    }


    //===========================================================
    // Formatting
    //===========================================================

    money
    (
        value:
            number
    ):
        string
    {
        return formatLabelMoney(value);
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

    date
    (
        iso:
            string
    ):
        string
    {
        return formatPricingDate(iso);
    }
}


//===============================================================
// Helpers
//===============================================================

// An answer slower than this ends the wait with a message
const REQUEST_TIMEOUT =
    90000;

const MAX_LABELS_PER_ROW =
    1000;

const MAX_LABELS_PER_PRINT =
    5000;

function itemOf
(
    row:
        BarcodeGridRow
):
    LabelItem
{
    return {
        kind:row.Kind === 'unit' ? 'tag' : 'label',
        name:row.Name,
        partNumber:row.PartNumber,
        code:row.Code,
        brandName:row.BrandName,
        brandLogo:row.BrandLogo,
        mrp:row.Mrp,
        batchNo:row.BatchNo,
        date:row.BatchDate,
        barcode:row.BarcodeValue,
        qrText:row.QrValue || row.BarcodeValue,
        color:row.Color,
        chassisNo:row.ChassisNo,
        engineNo:row.EngineNo,
        keyNo:row.KeyNo,
        batteryNo:row.BatteryNo
    };
}

// Before anything is loaded : the setup shows on a sample
function sampleItem
(
    motorBike:
        boolean,
    today:
        string
):
    LabelItem
{
    return motorBike
        ? {
            kind:'tag',
            name:'Sample Model 125 Disc',
            partNumber:'',
            code:'MB-001-001-00001',
            brandName:'Brand',
            brandLogo:'',
            mrp:185000,
            batchNo:'BT-000001',
            date:today,
            barcode:'MB00100100001B1',
            qrText:'MB00100100001B1|CHASSIS0000001',
            color:'Black',
            chassisNo:'CHASSIS0000001',
            engineNo:'ENGINE0000001',
            keyNo:'K-1234',
            batteryNo:'BAT0000001'
        }
        : {
            kind:'label',
            name:'Sample Part Name',
            partNumber:'06450-K44-V01',
            code:'SP-001-001-00002',
            brandName:'Brand',
            brandLogo:'',
            mrp:600,
            batchNo:'BT-001234',
            date:today,
            barcode:'SP00100100002B1234',
            qrText:'SP00100100002B1234',
            color:'',
            chassisNo:'',
            engineNo:''
        };
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
        return 'The server took too long to answer. Try again.';
    }

    const body =
        err?.error;

    return typeof body === 'string' && body.trim()
        ? body.trim()
        : fallback;
}
