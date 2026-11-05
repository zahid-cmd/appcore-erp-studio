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
    catchError,
    forkJoin,
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
    CreateProductTransfer,
    PRODUCT_TRANSFER_PRINT_KEY,
    PRODUCT_TRANSFER_QTY_DECIMALS,
    PRODUCT_TRANSFER_ROUTE,
    PRODUCT_TRANSFER_TYPES,
    ProductTransferAllocation,
    ProductTransferDefaults,
    ProductTransferDetail,
    ProductTransferJournalLine,
    ProductTransferPlaces,
    ProductTransferRack,
    ProductTransferStockProduct,
    ProductTransferStockUnit,
    ProductTransferTypeInfo,
    ProductTransferWarehouse,
    fifoAllocate,
    fifoBatches,
    formatTransferCost,
    formatTransferDate,
    formatTransferMoney,
    formatTransferQty,
    fromTransferIso,
    placeText,
    rackBinCode,
    rackShelf,
    binHolder,
    shelfBinCount,
    productTransferJournal,
    productTransferStatusNote,
    productTransferType,
    round2,
    roundQty,
    toTransferIso,
    unitAllocate,
    warehouseText
}
from '../../../models/product-transfer.model';

import
{
    shelfLabel
}
from '../../../../../../shared/inventory/storage-labels';

import
{
    ProductTransferService
}
from '../../../services/product-transfer.service';


//===============================================================
// Form rows
//===============================================================

interface Option
{
    label:string;
    value:any;
    // The counter at the right of the option row (badgeField)
    count?:string;
}

interface Fact
{
    label:string;
    value:string;
    wide?:boolean;
}

// One product of the transfer (Transfer Summary grid)
interface TransferRow
{
    ProductId:number;
    ProductCode:string;
    ProductName:string;
    PartNumber:string;
    BrandName:string;
    Unit:string;
    // On hand in the From warehouse (add / edit)
    Available:number;
    Quantity:number;
    // The quantity box text while typed
    QtyText:string;
    // ok / bad (no valid quantity) / short (more than on hand) /
    // gone (a bike is no longer in the From warehouse)
    State:'ok' | 'bad' | 'short' | 'gone';
    // Motor bikes : the bikes picked by chassis
    Units:ProductTransferStockUnit[];
    // FIFO preview (add / edit) or the batches taken (view)
    Batches:ProductTransferAllocation[];
    Value:number;
    // Destination place in the To warehouse (0 = none)
    RackId:number;
    RackName:string;
    ShelfNo:number;
    ShelfLabel:string;
    BinNo:number;
    // A-03-05
    BinCode:string;
    PlaceText:string;
    SavePlace:boolean;
    Notes:string;
}

// Edit : what the form needs besides the document
interface EditData
{
    defaults:ProductTransferDefaults;
    stock:ProductTransferStockProduct[];
    places:ProductTransferPlaces;
}

// The empty racks / places answer
const NO_PLACES:
    ProductTransferPlaces =
    { Places:[], Racks:[] };


//===============================================================
// Product Transfer form. Same look as Price Adjustment :
//
//   Left   : Transfer Information (product type, transfer no,
//            date, From / To warehouse, same branch or
//            inter-branch chip), then Add <item> to the bottom :
//            brand → product (stock in the From warehouse) →
//            available / batches → quantity (SP / AC) or the
//            bikes by chassis (MB) → rack / shelf in the To
//            warehouse + Save this place (SP / AC) → notes → Add.
//   Right  : Transfer Summary (count pills, Journal preview for
//            inter-branch), the one-line Narration, the grid
//            (Enter → next row's quantity; sticky totals).
//
//   View   : read only; batches per line open under it; the
//            status banner (In Transit : waiting for the To
//            branch); the Receive panel for the To branch;
//            Cancel for a posted one.
//
//   Save keeps a draft; Post (same branch : moves at once) / Send
//   (inter-branch : into transit with the TRF journal); Receive
//   (the To branch) puts it on hand in the To warehouse.
//===============================================================

@Component(
{
    selector:'app-product-transfer-form',
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
        CheckboxComponent,
        OrbitLoaderComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./product-transfer-form.html',
    styleUrl:'./product-transfer-form.css'
})
export class ProductTransferForm
    implements OnInit
{
    private readonly service =
        inject(ProductTransferService);

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

    private readonly host =
        inject(ElementRef);

    // Progress dialog around save / post / receive / cancel / delete
    private readonly progress =
        new ProgressRunner(inject(ProgressDialogService), () => this.refreshView());


    //===========================================================
    // State
    //===========================================================

    // add / edit (draft) / view (any status)
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
        ProductTransferDefaults | null = null;

    doc:
        ProductTransferDetail | null = null;

    // A post that failed after its save created the draft : the
    // next Save / Post updates it
    private savedId:
        number = 0;

    type:
        string = 'SP';

    info:
        ProductTransferTypeInfo = PRODUCT_TRANSFER_TYPES[1];

    readonly typeSegments:
        ControlSegmentItem[] =
        PRODUCT_TRANSFER_TYPES.map(x => ({ value:x.type, text:x.segment }));

    transferDate:
        Date = new Date();

    fromWarehouseId:
        number = 0;

    toWarehouseId:
        number = 0;

    fromItems:
        Option[] = [];

    toItems:
        Option[] = [];

    remarks:
        string = '';


    //===========================================================
    // Stock in the From warehouse, places in the To warehouse
    //===========================================================

    stock:
        ProductTransferStockProduct[] = [];

    stockLoading:
        boolean = false;

    stockError:
        string = '';

    // Racks of the To warehouse
    racks:
        ProductTransferRack[] = [];

    // ProductId → its saved place in the To warehouse
    private readonly savedPlaces =
        new Map<number, { RackId:number; ShelfNo:number; ShelfLabel:string; BinNo:number; BinCode:string }>();

    // Incremented per places call : an older answer is ignored
    private placesCall:
        number = 0;

    // "<type>:<From warehouse>:<product>" → the product's saved
    // location in the From warehouse ('' = not placed there)
    private readonly fromPlaces =
        new Map<string, string>();

    private fromPlaceCall:
        number = 0;

    private stockCall:
        number = 0;


    //===========================================================
    // Grid
    //===========================================================

    rows:
        TransferRow[] = [];

    // Rows opened to their batches / bikes
    private readonly expanded =
        new Set<number>();


    //===========================================================
    // Add card
    //===========================================================

    brandItems:
        Option[] = [];

    productItems:
        Option[] = [];

    // 0 = every brand
    brandId:
        number = 0;

    pickId:
        number = 0;

    pickQty:
        string = '';

    // Motor bikes : the picked bike (-1 = every bike of the model
    // not on the summary yet) and its options "chassis || engine"
    pickUnitId:
        number = 0;

    unitItems:
        Option[] = [];

    rackItems:
        Option[] = [];

    shelfItems:
        Option[] = [];

    pickRackId:
        number = 0;

    pickShelfNo:
        number = 0;

    // The bin (the location) : free bins of the shelf only
    binItems:
        Option[] = [];

    pickBinNo:
        number = 0;

    pickSave:
        boolean = false;

    pickNotes:
        string = '';

    pickError:
        string = '';

    // A row opened in the Add card (its ProductId; 0 = adding)
    editingId:
        number = 0;


    //===========================================================
    // View
    //===========================================================

    facts:
        Fact[] = [];

    receiveDate:
        Date = new Date();

    receiveError:
        string = '';


    //===========================================================
    // Dialogs : journal, cancel, delete
    //===========================================================

    journalOpen:
        boolean = false;

    journal:
        ProductTransferJournalLine[] = [];

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
                    console.error('[Product Transfer] view update failed', error);
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
            console.error('[Product Transfer] view update failed', error);
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

        this.setType(PRODUCT_TRANSFER_TYPES.some(x => x.type === type) ? type : 'SP');

        this.loadDefaults();
    }

    get isView():
        boolean
    {
        return this.mode === 'view';
    }

    get isBikes():
        boolean
    {
        return this.info.bikes;
    }

    get hasPlaces():
        boolean
    {
        return this.info.hasPlaces;
    }

    private setType
    (
        type:
            string
    ):
        void
    {
        this.type = type;

        this.info = productTransferType(type);
    }

    // Incremented per defaults call : only the answer of the LAST
    // call (the type shown now) is used; an older one is ignored
    private defaultsCall:
        number = 0;

    private loadDefaults():
        void
    {
        const call =
            ++this.defaultsCall;

        const type =
            this.type;

        this.loading = true;

        this.error = '';

        this.refreshView();

        this.service
            .getDefaults(type)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    defaults =>
                    {
                        // A stale answer (the type changed meanwhile) or
                        // an answer for another type is never applied
                        if
                        (
                            call !== this.defaultsCall
                            ||
                            type !== this.type
                            ||
                            (!!defaults.PageType && defaults.PageType.toUpperCase() !== type)
                        )
                        {
                            return;
                        }

                        this.loading = false;

                        this.defaults = defaults;

                        const today =
                            fromTransferIso(defaults.Today);

                        if
                        (
                            today && this.mode === 'add'
                        )
                        {
                            this.transferDate = today;
                        }

                        // A warehouse kept from the previous product type
                        // must still be allowed for this one (Business
                        // Configuration)
                        if
                        (
                            this.fromWarehouseId
                            &&
                            !defaults.Warehouses.some(x => x.Id === this.fromWarehouseId && this.fromAllowed(x))
                        )
                        {
                            this.fromWarehouseId = 0;
                        }

                        if
                        (
                            this.toWarehouseId
                            &&
                            !defaults.Warehouses.some(x => x.Id === this.toWarehouseId && this.toAllowed(x))
                        )
                        {
                            this.toWarehouseId = 0;
                        }

                        // From : a warehouse of the user's branch that
                        // runs the line (its default one first)
                        if
                        (
                            !this.fromWarehouseId
                        )
                        {
                            const own =
                                defaults.Warehouses
                                    .filter(x => x.BranchId === defaults.CurrentBranchId && x.CanReceiveType)
                                    .sort((a, b) => Number(!!b.IsDefault) - Number(!!a.IsDefault))[0];

                            this.fromWarehouseId = own?.Id ?? 0;
                        }

                        if
                        (
                            this.toWarehouseId === this.fromWarehouseId
                        )
                        {
                            this.toWarehouseId = 0;
                        }

                        this.buildWarehouseItems();

                        this.buildPickers();

                        this.refreshAll();

                        this.loadStock();

                        this.loadPlaces();
                    },
                error:
                    err =>
                    {
                        if
                        (
                            call !== this.defaultsCall
                        )
                        {
                            return;
                        }

                        this.loading = false;

                        this.error = errorText(err, 'The product transfer defaults could not be loaded.');

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
                    (doc): Observable<EditData | null> =>
                    {
                        this.doc = doc;

                        this.setType(doc.PageType);

                        if
                        (
                            (doc.Status !== 'Draft' || doc.IsDeleted) && this.mode === 'edit'
                        )
                        {
                            this.mode = 'view';

                            this.router.navigate([PRODUCT_TRANSFER_ROUTE, 'view', doc.Id], { replaceUrl:true });
                        }

                        if
                        (
                            this.mode !== 'edit'
                        )
                        {
                            return of(null);
                        }

                        // Edit : the defaults, the stock of the From
                        // warehouse and the places in the To one
                        return forkJoin
                        ({
                            defaults:this.service.getDefaults(doc.PageType),
                            stock:this.service.getStock(doc.PageType, doc.FromWarehouseId),
                            places:this.service
                                .getPlaces(doc.PageType, doc.ToWarehouseId, doc.Lines.map(x => x.ProductId))
                                .pipe(catchError(() => of(NO_PLACES)))
                        }) as Observable<EditData>;
                    }
                ),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe
            ({
                next:
                    data =>
                    {
                        this.loading = false;

                        if
                        (
                            data
                        )
                        {
                            this.defaults = data.defaults;

                            this.stock = data.stock;

                            this.applyRacks(data.places);
                        }

                        this.fillFromDoc();

                        this.refreshAll();
                    },
                error:
                    err =>
                    {
                        this.loading = false;

                        this.error = errorText(err, 'The product transfer could not be loaded.');

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

        this.transferDate = fromTransferIso(doc.TransferDate) ?? new Date();

        this.fromWarehouseId = doc.FromWarehouseId;

        this.toWarehouseId = doc.ToWarehouseId;

        this.remarks = doc.Remarks;

        if
        (
            this.mode === 'edit'
        )
        {
            this.rows =
                doc.Lines.map
                (
                    line =>
                    {
                        const product =
                            this.stockOf(line.ProductId);

                        // The bikes still on hand there (one gone →
                        // the row says so)
                        const units =
                            line.Units.map
                            (
                                u =>
                                    product?.Units.find(x => x.MotorBikeUnitId === u.MotorBikeUnitId)
                                    ?? { MotorBikeUnitId:u.MotorBikeUnitId, ChassisNo:u.ChassisNo, EngineNo:u.EngineNo, Color:'', StockBatchId:u.StockBatchId }
                            );

                        const gone =
                            line.Units.some(u => !product?.Units.some(x => x.MotorBikeUnitId === u.MotorBikeUnitId));

                        const row =
                            this.makeRow
                            (
                                {
                                    ProductId:line.ProductId,
                                    ProductCode:line.ProductCode || product?.Code || '',
                                    ProductName:line.ProductName || product?.Name || '',
                                    PartNumber:line.PartNumber || product?.PartNumber || '',
                                    BrandName:product?.BrandName ?? '',
                                    Unit:line.Unit || product?.Unit || ''
                                },
                                this.isBikes ? units.length : line.Quantity,
                                units,
                                {
                                    RackId:line.ToRackId ?? 0,
                                    ShelfNo:line.ToShelfNo ?? 0,
                                    ShelfLabel:line.ToShelfLabel,
                                    BinNo:line.ToBinNo ?? 0,
                                    BinCode:line.ToBinCode,
                                    RackName:line.ToRackName
                                },
                                line.SavePlace,
                                line.Notes
                            );

                        return gone ? { ...row, State:'gone' as const } : row;
                    }
                );

            this.buildWarehouseItems();

            this.buildPickers();

            this.buildRackItems();
        }
        else
        {
            this.rows =
                doc.Lines.map
                (
                    line =>
                    ({
                        ProductId:line.ProductId,
                        ProductCode:line.ProductCode,
                        ProductName:line.ProductName,
                        PartNumber:line.PartNumber,
                        BrandName:'',
                        Unit:line.Unit,
                        Available:0,
                        Quantity:line.Quantity,
                        QtyText:formatTransferQty(line.Quantity),
                        State:'ok' as const,
                        Units:line.Units.map(u => ({ MotorBikeUnitId:u.MotorBikeUnitId, ChassisNo:u.ChassisNo, EngineNo:u.EngineNo, Color:'', StockBatchId:u.StockBatchId })),
                        Batches:line.Batches.map(b => ({ ...b })),
                        Value:line.Value || round2(line.Batches.reduce((total, b) => total + b.Value, 0)),
                        RackId:line.ToRackId ?? 0,
                        RackName:line.ToRackName,
                        ShelfNo:line.ToShelfNo ?? 0,
                        ShelfLabel:line.ToShelfLabel,
                        BinNo:line.ToBinNo ?? 0,
                        BinCode:line.ToBinCode,
                        PlaceText:placeText(line.ToRackName, line.ToShelfNo, line.ToBinNo, line.ToBinCode),
                        SavePlace:line.SavePlace,
                        Notes:line.Notes
                    })
                );

            const today =
                new Date();

            const sent =
                fromTransferIso(doc.TransferDate);

            this.receiveMin = sent;

            this.receiveDate = sent && sent > today ? sent : today;

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
                [name, when ? formatTransferDate(when) : ''].filter(x => !!x).join(' · ');

        this.facts =
            [
                { label:'Status', value:doc.IsDeleted ? 'Deleted' : doc.Status },
                { label:'Kind', value:doc.IsInterBranch ? 'Inter-branch' : 'Same branch' },
                { label:'Lines', value:String(doc.LineCount || doc.Lines.length) },
                { label:this.isBikes ? 'Bikes' : 'Quantity', value:formatTransferQty(doc.TotalQuantity || this.totalQuantity) },
                { label:'Value', value:formatTransferMoney(doc.TotalValue || this.totalValue) },
                { label:'Saved By', value:by(doc.CreatedByName, doc.CreatedDate) },
                ...(doc.PostedDate || doc.PostedByName
                    ? [{ label:doc.IsInterBranch ? 'Sent By' : 'Posted By', value:by(doc.PostedByName, doc.PostedDate) }]
                    : []),
                ...(doc.Status === 'Received' || doc.ReceiveDate
                    ? [{ label:'Received By', value:[doc.ReceivedByName, doc.ReceiveDate ? formatTransferDate(doc.ReceiveDate) : formatTransferDate(doc.ReceivedDate)].filter(x => !!x).join(' · ') }]
                    : []),
                ...(doc.Status === 'Cancelled'
                    ? [{ label:'Cancelled By', value:by(doc.CancelledByName, doc.CancelledDate) }]
                    : []),
                {
                    label:'Journal',
                    value:!doc.IsInterBranch
                        ? 'None : same branch'
                        : (doc.VoucherNo
                            ? `TRF · ${doc.VoucherNo}${doc.Status === 'Cancelled' ? ' (reversed)' : ''}`
                            : 'On send'),
                    wide:true
                }
            ];
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
            this.mode !== 'add' || type === this.type || !PRODUCT_TRANSFER_TYPES.some(x => x.type === type)
        )
        {
            return;
        }

        if
        (
            this.rows.length
        )
        {
            this.pickError = 'Clear the lines first : one transfer is for one product type.';

            this.refreshView();

            return;
        }

        this.setType(type);

        // Nothing of the previous type may stay on screen : its
        // defaults (warehouses, next no), stock and racks go now;
        // the warehouses are kept only if the new type allows them
        this.defaults = null;

        this.fromItems = [];

        this.toItems = [];

        this.stockCall++;

        this.placesCall++;

        this.stockLoading = false;

        this.resetPick();

        this.brandId = 0;

        this.stock = [];

        this.racks = [];

        this.savedPlaces.clear();

        this.loadDefaults();
    }

    onDateChange
    (
        value:
            Date
    ):
        void
    {
        if
        (
            value instanceof Date && !isNaN(value.getTime())
        )
        {
            this.transferDate = value;
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
        return this.doc?.TransferNo || this.defaults?.NextNo || '';
    }


    //===========================================================
    // Warehouses
    //===========================================================

    private warehouseById
    (
        id:
            number
    ):
        ProductTransferWarehouse | null
    {
        return id
            ? (this.defaults?.Warehouses ?? []).find(x => x.Id === id) ?? null
            : null;
    }

    private buildWarehouseItems():
        void
    {
        const all =
            this.defaults?.Warehouses ?? [];

        // A warehouse whose branch no longer runs the line (stock
        // left over, or a saved document) is marked
        const option =
            (w: ProductTransferWarehouse): Option =>
                ({
                    label:
                        warehouseText(w.Name, w.BranchName, w.IsCentral)
                        + (w.CanReceiveType ? '' : ' · no access'),
                    value:w.Id
                });

        this.fromItems =
            all.filter(x => x.Id !== this.toWarehouseId && this.fromAllowed(x)).map(option);

        this.toItems =
            all.filter(x => x.Id !== this.fromWarehouseId && this.toAllowed(x)).map(option);
    }

    // Business Configuration : only branches running the type's
    // business line (wing core line or active grant) take part,
    // on both sides. A saved document keeps its own warehouses.
    private fromAllowed
    (
        w:
            ProductTransferWarehouse
    ):
        boolean
    {
        return !!w.CanReceiveType
            || (this.mode !== 'add' && w.Id === this.doc?.FromWarehouseId);
    }

    private toAllowed
    (
        w:
            ProductTransferWarehouse
    ):
        boolean
    {
        return !!w.CanReceiveType
            || (this.mode !== 'add' && w.Id === this.doc?.ToWarehouseId);
    }

    get fromWarehouse():
        ProductTransferWarehouse | null
    {
        return this.warehouseById(this.fromWarehouseId);
    }

    get toWarehouse():
        ProductTransferWarehouse | null
    {
        return this.warehouseById(this.toWarehouseId);
    }

    get fromBranchName():
        string
    {
        return this.doc && this.isView
            ? this.doc.FromBranchName
            : (this.fromWarehouse?.BranchName ?? '');
    }

    get toBranchName():
        string
    {
        return this.doc && this.isView
            ? this.doc.ToBranchName
            : (this.toWarehouse?.BranchName ?? '');
    }

    // Both warehouses known
    get routeKnown():
        boolean
    {
        return this.isView
            ? !!this.doc
            : !!this.fromWarehouse && !!this.toWarehouse;
    }

    get isInterBranch():
        boolean
    {
        if
        (
            this.isView
        )
        {
            return !!this.doc?.IsInterBranch;
        }

        const from =
            this.fromWarehouse;

        const to =
            this.toWarehouse;

        return !!from && !!to && from.BranchId !== to.BranchId;
    }

    // Post (same branch) / Send (inter-branch)
    get postText():
        string
    {
        return this.isInterBranch ? 'Send' : 'Post';
    }

    get fromText():
        string
    {
        if
        (
            this.isView
        )
        {
            return this.doc ? warehouseText(this.doc.FromWarehouseName, this.doc.FromBranchName) : '';
        }

        const w =
            this.fromWarehouse;

        return w ? warehouseText(w.Name, w.BranchName, w.IsCentral) : '';
    }

    get toText():
        string
    {
        if
        (
            this.isView
        )
        {
            return this.doc ? warehouseText(this.doc.ToWarehouseName, this.doc.ToBranchName) : '';
        }

        const w =
            this.toWarehouse;

        return w ? warehouseText(w.Name, w.BranchName, w.IsCentral) : '';
    }

    onFromChange
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
            id === this.fromWarehouseId
        )
        {
            return;
        }

        if
        (
            this.rows.length
        )
        {
            this.pickError = 'Clear the lines first : they are taken from the stock of the From warehouse.';

            this.refreshView();

            return;
        }

        this.fromWarehouseId = id;

        if
        (
            this.toWarehouseId === id
        )
        {
            this.toWarehouseId = 0;
        }

        this.resetPick();

        this.buildWarehouseItems();

        this.refreshView();

        this.loadStock();
    }

    onToChange
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
            id === this.toWarehouseId
        )
        {
            return;
        }

        this.toWarehouseId = id;

        this.savedPlaces.clear();

        this.buildWarehouseItems();

        // The places belong to the old warehouse : back to the
        // saved place in the new one
        this.pickRackId = 0;

        this.pickShelfNo = 0;

        this.pickBinNo = 0;

        this.pickSave = false;

        this.refreshView();

        this.loadPlaces(true);
    }


    //===========================================================
    // Stock of the From warehouse
    //===========================================================

    private loadStock():
        void
    {
        const call =
            ++this.stockCall;

        this.stock = [];

        this.stockError = '';

        if
        (
            !this.fromWarehouseId
        )
        {
            this.buildPickers();

            this.refreshView();

            return;
        }

        this.stockLoading = true;

        this.buildPickers();

        this.refreshView();

        this.service
            .getStock(this.type, this.fromWarehouseId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    stock =>
                    {
                        if
                        (
                            call !== this.stockCall
                        )
                        {
                            return;
                        }

                        this.stockLoading = false;

                        this.stock = stock.filter(x => x.Available > 0 || x.Units.length > 0);

                        this.buildPickers();

                        this.refreshAll();
                    },
                error:
                    err =>
                    {
                        if
                        (
                            call !== this.stockCall
                        )
                        {
                            return;
                        }

                        this.stockLoading = false;

                        this.stockError = errorText(err, 'The stock of the From warehouse could not be loaded.');

                        this.refreshAll();
                    }
            });
    }

    private stockOf
    (
        productId:
            number
    ):
        ProductTransferStockProduct | undefined
    {
        return this.stock.find(x => x.ProductId === productId);
    }


    //===========================================================
    // Places in the To warehouse (SP / AC)
    //===========================================================

    // resetRows : the To warehouse changed, every row back to the
    // product's saved place there
    private loadPlaces
    (
        resetRows:
            boolean = false
    ):
        void
    {
        if
        (
            !this.hasPlaces
        )
        {
            return;
        }

        const call =
            ++this.placesCall;

        if
        (
            !this.toWarehouseId
        )
        {
            this.applyRacks(NO_PLACES);

            if
            (
                resetRows
            )
            {
                this.rows = this.rows.map(x => this.withPlace(x, 0, 0, 0, '', false));
            }

            this.buildRackItems();

            this.refreshView();

            return;
        }

        const ids =
            [...new Set([...this.rows.map(x => x.ProductId), this.pickId].filter(x => x > 0))];

        this.service
            .getPlaces(this.type, this.toWarehouseId, ids)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    places =>
                    {
                        if
                        (
                            call !== this.placesCall
                        )
                        {
                            return;
                        }

                        this.applyRacks(places);

                        if
                        (
                            resetRows
                        )
                        {
                            this.rows =
                                this.rows.map
                                (
                                    x =>
                                    {
                                        const saved =
                                            this.savedPlaces.get(x.ProductId);

                                        return saved
                                            ? this.withPlace(x, saved.RackId, saved.ShelfNo, saved.BinNo, saved.BinCode, false)
                                            : this.withPlace(x, 0, 0, 0, '', false);
                                    }
                                );
                        }

                        this.prefillPickPlace();

                        this.buildRackItems();

                        this.refreshAll();
                    },
                error:
                    () =>
                    {
                        if
                        (
                            call !== this.placesCall
                        )
                        {
                            return;
                        }

                        // No racks : the place is left empty
                        this.applyRacks(NO_PLACES);

                        this.buildRackItems();

                        this.refreshAll();
                    }
            });
    }

    // The racks of the To warehouse; the saved places merged (a
    // later answer for one product adds to the earlier ones)
    private applyRacks
    (
        places:
            ProductTransferPlaces
    ):
        void
    {
        if
        (
            places.Racks.length || !places.Places.length
        )
        {
            this.racks = places.Racks;
        }

        places.Places.forEach
        (
            p =>
                this.savedPlaces.set(p.ProductId, { RackId:p.RackId, ShelfNo:p.ShelfNo, ShelfLabel:p.ShelfLabel, BinNo:p.BinNo || 1, BinCode:p.BinCode })
        );
    }

    private rackById
    (
        id:
            number
    ):
        ProductTransferRack | null
    {
        return id
            ? this.racks.find(x => x.Id === id) ?? null
            : null;
    }

    // A bin of the To warehouse for a product : free now, or the
    // product's own saved bin there; and no other line of this
    // transfer is placed on it
    private binFree
    (
        rack:
            ProductTransferRack,
        shelf:
            number,
        bin:
            number,
        productId:
            number
    ):
        boolean
    {
        if
        (
            this.rows.some(x => x.ProductId !== productId && x.RackId === rack.Id && x.ShelfNo === shelf && x.BinNo === bin)
        )
        {
            return false;
        }

        const saved =
            this.savedPlaces.get(productId);

        if
        (
            saved && saved.RackId === rack.Id && saved.ShelfNo === shelf && saved.BinNo === bin
        )
        {
            return true;
        }

        const holder =
            binHolder(rack, shelf, bin);

        return !holder || (holder.IsOwnType && holder.HeldById === productId);
    }

    // Free bins of a shelf for a product (in order)
    private freeBins
    (
        rack:
            ProductTransferRack,
        shelf:
            number,
        productId:
            number
    ):
        number[]
    {
        const out:
            number[] = [];

        const count =
            shelfBinCount(rack, shelf);

        for
        (
            let bin = 1;
            bin <= count;
            bin++
        )
        {
            if
            (
                this.binFree(rack, shelf, bin, productId)
            )
            {
                out.push(bin);
            }
        }

        return out;
    }

    // Racks : one with no free bin is still listed, marked (Full);
    // the badge counts its free bins
    private buildRackItems():
        void
    {
        const productId =
            this.editingId || this.pickId;

        this.rackItems =
            this.racks.map
            (
                rack =>
                {
                    let free = 0;

                    for
                    (
                        let shelf = 1;
                        shelf <= rack.ShelfCount;
                        shelf++
                    )
                    {
                        free += this.freeBins(rack, shelf, productId).length;
                    }

                    const name =
                        rack.DisplayName.replace(/\s*\(Full\)\s*$/i, '') || rack.Name;

                    return {
                        label:free > 0 || rack.ShelfCount === 0 ? name : `${name} (Full)`,
                        value:rack.Id,
                        count:String(free)
                    };
                }
            );

        this.buildShelfItems();
    }

    // Shelves of the picked rack (SLF-A-03); a shelf with no free
    // bin is marked (Full); the badge counts its free bins
    private buildShelfItems():
        void
    {
        const rack =
            this.rackById(this.pickRackId);

        const productId =
            this.editingId || this.pickId;

        this.shelfItems =
            rack
                ? Array.from
                (
                    { length:rack.ShelfCount },
                    (_, i) =>
                    {
                        const free =
                            this.freeBins(rack, i + 1, productId).length;

                        const label =
                            rackShelf(rack, i + 1)?.Label || shelfLabel(rack.Name, i + 1);

                        return {
                            label:free > 0 ? label : `${label} (Full)`,
                            value:i + 1,
                            count:String(free)
                        };
                    }
                )
                : [];

        this.buildBinItems();
    }

    // Free bins of the picked shelf (A-03-05); the picked bin stays
    // listed
    private buildBinItems():
        void
    {
        const rack =
            this.rackById(this.pickRackId);

        const productId =
            this.editingId || this.pickId;

        if
        (
            !rack || !this.pickShelfNo
        )
        {
            this.binItems = [];

            return;
        }

        const free =
            this.freeBins(rack, this.pickShelfNo, productId);

        const bins =
            this.pickBinNo && !free.includes(this.pickBinNo)
                ? [this.pickBinNo, ...free]
                : free;

        this.binItems =
            bins.map
            (
                bin =>
                ({
                    label:free.includes(bin) ? rackBinCode(rack, this.pickShelfNo, bin) : `${rackBinCode(rack, this.pickShelfNo, bin)} (in use)`,
                    value:bin
                })
            );
    }

    // The picked product's saved place in the To warehouse
    private prefillPickPlace():
        void
    {
        if
        (
            !this.hasPlaces || !this.pickId || this.editingId || this.pickRackId
        )
        {
            return;
        }

        const saved =
            this.savedPlaces.get(this.pickId);

        if
        (
            saved && this.rackById(saved.RackId)
        )
        {
            this.pickRackId = saved.RackId;

            this.pickShelfNo = saved.ShelfNo;

            this.pickBinNo = saved.BinNo || 1;
        }
    }

    //===========================================================
    // Current location : the picked product's saved rack / shelf
    // in the From warehouse (SP / AC)
    //===========================================================

    private fromPlaceKey
    (
        productId:
            number
    ):
        string
    {
        return `${this.type}:${this.fromWarehouseId}:${productId}`;
    }

    private loadFromPlace
    (
        productId:
            number
    ):
        void
    {
        if
        (
            !productId || !this.hasPlaces || !this.fromWarehouseId
        )
        {
            return;
        }

        const key =
            this.fromPlaceKey(productId);

        if
        (
            this.fromPlaces.has(key)
        )
        {
            return;
        }

        const call =
            ++this.fromPlaceCall;

        this.service
            .getPlaces(this.type, this.fromWarehouseId, [productId])
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    places =>
                    {
                        const place =
                            (places?.Places ?? []).find(x => x.ProductId === productId);

                        this.fromPlaces.set(
                            key,
                            place ? placeText(place.RackName, place.ShelfNo, place.BinNo, place.BinCode) : '');

                        if
                        (
                            call === this.fromPlaceCall
                        )
                        {
                            this.refreshView();
                        }
                    },
                error:
                    () =>
                    {
                        // Only a hint : nothing to show
                    }
            });
    }

    // undefined while loading (or no product)
    get currentPlaceText():
        string | undefined
    {
        const id =
            this.editingId || this.pickId;

        return id && this.hasPlaces && this.fromWarehouseId
            ? this.fromPlaces.get(this.fromPlaceKey(id))
            : undefined;
    }

    get savedPlaceText():
        string
    {
        const saved =
            this.savedPlaces.get(this.editingId || this.pickId);

        if
        (
            !saved
        )
        {
            return '';
        }

        return placeText(this.rackById(saved.RackId)?.Name ?? '', saved.ShelfNo, saved.BinNo, saved.BinCode);
    }

    onPickRackChange
    (
        value:
            any
    ):
        void
    {
        this.pickRackId = Number(value) || 0;

        // The first shelf with a free bin, and its first free bin
        const rack =
            this.rackById(this.pickRackId);

        const productId =
            this.editingId || this.pickId;

        this.pickShelfNo = 0;

        this.pickBinNo = 0;

        for
        (
            let shelf = 1;
            rack && shelf <= rack.ShelfCount && !this.pickShelfNo;
            shelf++
        )
        {
            const free =
                this.freeBins(rack, shelf, productId);

            if
            (
                free.length
            )
            {
                this.pickShelfNo = shelf;

                this.pickBinNo = free[0];
            }
        }

        if
        (
            !this.pickRackId
        )
        {
            this.pickSave = false;
        }

        this.buildShelfItems();

        this.pickError = '';

        this.refreshView();
    }

    onPickShelfChange
    (
        value:
            any
    ):
        void
    {
        this.pickShelfNo = Number(value) || 0;

        const rack =
            this.rackById(this.pickRackId);

        this.pickBinNo =
            rack && this.pickShelfNo
                ? (this.freeBins(rack, this.pickShelfNo, this.editingId || this.pickId)[0] ?? 0)
                : 0;

        this.buildBinItems();

        this.pickError = '';

        this.refreshView();
    }

    onPickBinChange
    (
        value:
            any
    ):
        void
    {
        this.pickBinNo = Number(value) || 0;

        this.buildBinItems();

        this.pickError = '';

        this.refreshView();
    }

    onPickSave
    (
        value:
            boolean
    ):
        void
    {
        this.pickSave = !!value;

        this.pickError = '';

        this.refreshView();
    }


    //===========================================================
    // Add card : brand → product → quantity / bikes → place
    //===========================================================

    private buildPickers():
        void
    {
        const products =
            this.stock;

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

        // A product is on the list once (motor bikes : a model
        // stays while it has bikes not on the summary)
        const used =
            new Set(
                this.rows
                    .filter(x => x.ProductId !== this.editingId)
                    .filter(x => !this.isBikes || this.remainingUnits(x.ProductId).length === 0)
                    .map(x => x.ProductId));

        this.productItems =
            products
                .filter(x => !used.has(x.ProductId) && (!this.brandId || x.BrandId === this.brandId || x.ProductId === this.editingId))
                .map
                (
                    x =>
                    ({
                        label:[x.Code, x.Name, !this.isBikes && x.PartNumber && x.PartNumber !== x.Name ? x.PartNumber : '']
                            .filter(t => !!t)
                            .join(' · '),
                        value:x.ProductId,
                        // Bikes still to add / quantity on hand
                        count:formatTransferQty(this.isBikes ? this.remainingUnits(x.ProductId).length : x.Available)
                    })
                );

        if
        (
            this.pickId && !this.productItems.some(x => x.value === this.pickId)
        )
        {
            this.resetPick();
        }

        this.buildUnitItems();
    }

    // Motor bikes : the model's bikes in the From warehouse not on
    // the summary yet
    private remainingUnits
    (
        productId:
            number
    ):
        ProductTransferStockUnit[]
    {
        const taken =
            new Set((this.rows.find(x => x.ProductId === productId)?.Units ?? []).map(x => x.MotorBikeUnitId));

        return (this.stockOf(productId)?.Units ?? []).filter(x => !taken.has(x.MotorBikeUnitId));
    }

    // Motor bikes : "★ All bikes of the model" (2+), then each bike
    // as "CHASSIS || ENGINE"
    private buildUnitItems():
        void
    {
        if
        (
            !this.isBikes || !this.pickId
        )
        {
            this.unitItems = [];

            this.pickUnitId = 0;

            return;
        }

        const remaining =
            this.remainingUnits(this.pickId);

        this.unitItems =
            [
                ...(remaining.length > 1
                    ? [{ label:'★ All bikes of the model', value:-1, count:String(remaining.length) }]
                    : []),
                ...remaining.map(u => ({ label:`${u.ChassisNo} || ${u.EngineNo || '—'}`, value:u.MotorBikeUnitId }))
            ];

        if
        (
            this.pickUnitId && !this.unitItems.some(x => x.value === this.pickUnitId)
        )
        {
            this.pickUnitId = 0;
        }
    }

    onPickUnitChange
    (
        value:
            any
    ):
        void
    {
        this.pickUnitId = Number(value) || 0;

        this.pickError = '';

        this.refreshView();
    }

    get unitPlaceholder():
        string
    {
        if
        (
            !this.pick
        )
        {
            return 'Pick the model first';
        }

        return this.unitItems.length
            ? 'Search chassis or engine no'
            : 'Every bike is on the summary';
    }

    get pick():
        ProductTransferStockProduct | null
    {
        return this.pickId ? this.stockOf(this.pickId) ?? null : null;
    }

    get productPlaceholder():
        string
    {
        if
        (
            !this.fromWarehouseId
        )
        {
            return 'Choose the From warehouse first';
        }

        if
        (
            this.stockLoading
        )
        {
            return 'Loading the stock…';
        }

        return this.productItems.length
            ? 'Search code, name or part number'
            : (this.stock.length ? 'Every product is on the list' : 'No stock in this warehouse');
    }

    // Available in the From warehouse (less nothing : one row per
    // product)
    get pickAvailable():
        number
    {
        const pick =
            this.pick;

        return pick
            ? (this.isBikes ? this.remainingUnits(pick.ProductId).length : pick.Available)
            : 0;
    }

    // Batches oldest first : "B-0012 · 5 · 12-Oct-2026"
    get pickBatches():
        { BatchNo:string; Available:number; UnitCost:number; Date:string }[]
    {
        return fifoBatches(this.pick?.Batches ?? [])
            .map(x => ({ BatchNo:x.BatchNo, Available:x.Available, UnitCost:x.UnitCost, Date:formatTransferDate(x.SourceDate) }));
    }

    // The FIFO split of the typed quantity (preview)
    get pickSplit():
        ProductTransferAllocation[]
    {
        const pick =
            this.pick;

        if
        (
            !pick || this.isBikes
        )
        {
            return [];
        }

        const quantity =
            toNumber(this.pickQty);

        return Number.isFinite(quantity) && quantity > 0
            ? fifoAllocate(pick.Batches, quantity).Allocations
            : [];
    }

    onBrandChange
    (
        value:
            any
    ):
        void
    {
        const brandId =
            Number(value) || 0;

        if
        (
            brandId === this.brandId
        )
        {
            return;
        }

        this.brandId = brandId;

        if
        (
            !this.editingId
        )
        {
            this.resetPick();
        }

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
        const id =
            Number(value) || 0;

        if
        (
            this.editingId || id === this.pickId
        )
        {
            return;
        }

        this.resetPick();

        this.pickId = id;

        this.buildUnitItems();

        this.refreshView();

        this.loadFromPlace(id);

        if
        (
            !id
        )
        {
            return;
        }

        if
        (
            this.hasPlaces && this.toWarehouseId
        )
        {
            if
            (
                this.savedPlaces.has(id)
            )
            {
                this.prefillPickPlace();

                this.buildRackItems();

                this.refreshView();
            }
            else
            {
                this.loadPlaces();
            }
        }
        else
        {
            this.buildRackItems();
        }
    }

    onPickQty
    (
        value:
            string | number
    ):
        void
    {
        this.pickQty = String(value ?? '');

        this.pickError = '';

        this.refreshView();
    }

    onPickNotes
    (
        value:
            string | number
    ):
        void
    {
        this.pickNotes = String(value ?? '');
    }

    private resetPick():
        void
    {
        this.pickId = 0;

        this.pickQty = '';

        this.pickUnitId = 0;

        this.unitItems = [];

        this.pickRackId = 0;

        this.pickShelfNo = 0;

        this.pickSave = false;

        this.pickNotes = '';

        this.pickError = '';

        this.editingId = 0;

        this.shelfItems = [];

        this.pickBinNo = 0;

        this.binItems = [];
    }

    get addText():
        string
    {
        return this.editingId ? 'Update' : 'Add';
    }

    get addDisabled():
        boolean
    {
        return !this.defaults || !this.pickId || (this.isBikes && !this.pickUnitId);
    }

    // The Add card's quantity : a number, not more than on hand,
    // whole bikes, 2 decimals
    private pickQuantity
    (
        pick:
            ProductTransferStockProduct
    ):
        number | string
    {
        if
        (
            this.isBikes
        )
        {
            return this.pickedUnits(pick).length
                ? this.pickedUnits(pick).length
                : 'Choose a bike (chassis || engine) or ★ All bikes of the model.';
        }

        const value =
            toNumber(this.pickQty);

        if
        (
            !Number.isFinite(value) || value <= 0
        )
        {
            return 'Enter the quantity to transfer.';
        }

        if
        (
            roundQty(value) !== Math.round(value * 100) / 100
        )
        {
            return `The quantity takes at most ${PRODUCT_TRANSFER_QTY_DECIMALS} decimals.`;
        }

        if
        (
            value > pick.Available
        )
        {
            return `Only ${formatTransferQty(pick.Available)} ${pick.Unit} on hand in the From warehouse.`;
        }

        return roundQty(value);
    }

    // Motor bikes : the bike chosen, or every bike still to add
    private pickedUnits
    (
        pick:
            ProductTransferStockProduct
    ):
        ProductTransferStockUnit[]
    {
        const remaining =
            this.remainingUnits(pick.ProductId);

        return this.pickUnitId === -1
            ? remaining
            : remaining.filter(x => x.MotorBikeUnitId === this.pickUnitId);
    }

    addLine():
        void
    {
        if
        (
            this.isView || !this.defaults
        )
        {
            return;
        }

        const pick =
            this.pick;

        if
        (
            !pick
        )
        {
            this.pickError = `Pick a ${this.info.item.toLowerCase()} first.`;

            this.refreshView();

            return;
        }

        const quantity =
            this.pickQuantity(pick);

        if
        (
            typeof quantity === 'string'
        )
        {
            this.pickError = quantity;

            this.refreshView();

            return;
        }

        // A place (SP / AC) : rack + shelf + a free bin, or none
        if
        (
            this.hasPlaces && (this.pickRackId || this.pickSave)
        )
        {
            const rack =
                this.rackById(this.pickRackId);

            if
            (
                !rack || !this.pickShelfNo || !this.pickBinNo
            )
            {
                this.pickError = this.pickSave
                    ? 'Choose the rack, shelf and bin to save this location.'
                    : 'Choose the shelf and bin (or no rack).';

                this.refreshView();

                return;
            }

            if
            (
                !this.binFree(rack, this.pickShelfNo, this.pickBinNo, pick.ProductId)
            )
            {
                this.pickError = `Bin ${rackBinCode(rack, this.pickShelfNo, this.pickBinNo)} holds another item (one item per bin) or another line uses it. Choose a free bin.`;

                this.refreshView();

                return;
            }
        }

        // Motor bikes : added to the model's line when it has one
        const existing =
            this.isBikes ? this.rows.find(x => x.ProductId === pick.ProductId) : undefined;

        const units =
            this.isBikes
                ? [...(existing?.Units ?? []), ...this.pickedUnits(pick)]
                : [];

        const notes =
            this.pickNotes.trim() || existing?.Notes || '';

        const rack =
            this.rackById(this.pickRackId);

        const row =
            this.makeRow
            (
                {
                    ProductId:pick.ProductId,
                    ProductCode:pick.Code,
                    ProductName:pick.Name,
                    PartNumber:pick.PartNumber,
                    BrandName:pick.BrandName,
                    Unit:pick.Unit
                },
                quantity,
                units,
                {
                    RackId:this.hasPlaces && rack ? rack.Id : 0,
                    ShelfNo:this.hasPlaces && rack ? this.pickShelfNo : 0,
                    ShelfLabel:'',
                    BinNo:this.hasPlaces && rack ? this.pickBinNo : 0,
                    BinCode:this.hasPlaces && rack ? rackBinCode(rack, this.pickShelfNo, this.pickBinNo) : '',
                    RackName:rack?.Name ?? ''
                },
                this.hasPlaces && !!rack && this.pickSave,
                notes
            );

        let index =
            this.rows.findIndex(x => x.ProductId === (existing ? existing.ProductId : this.editingId));

        if
        (
            index >= 0
        )
        {
            this.rows = this.rows.map((x, i) => i === index ? row : x);
        }
        else
        {
            this.rows = [...this.rows, row];

            index = this.rows.length - 1;
        }

        const model =
            pick.ProductId;

        this.resetPick();

        this.buildPickers();

        // Motor bikes : the model stays picked while it has bikes
        // to add
        if
        (
            this.isBikes && this.productItems.some(x => x.value === model)
        )
        {
            this.pickId = model;

            this.buildUnitItems();
        }

        this.buildRackItems();

        this.refreshView();

        // Ready to type : the loaded row's quantity
        if
        (
            !this.isBikes
        )
        {
            this.focusQty(index);
        }
    }

    // A row back into the Add card (its place, bikes, notes)
    editRow
    (
        row:
            TransferRow
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

        this.resetPick();

        this.editingId = row.ProductId;

        this.pickId = row.ProductId;

        this.pickQty = this.isBikes ? '' : String(row.Quantity);

        this.pickRackId = row.RackId;

        this.pickShelfNo = row.ShelfNo;

        this.pickBinNo = row.BinNo;

        this.pickSave = row.SavePlace;

        this.pickNotes = row.Notes;

        this.buildPickers();

        this.buildRackItems();

        this.refreshView();
    }

    cancelEdit():
        void
    {
        this.resetPick();

        this.buildPickers();

        this.buildRackItems();

        this.refreshView();
    }


    //===========================================================
    // Grid
    //===========================================================

    // A row with its FIFO preview, value and state
    private makeRow
    (
        base:
            Pick<TransferRow, 'ProductId' | 'ProductCode' | 'ProductName' | 'PartNumber' | 'BrandName' | 'Unit'>,
        quantity:
            number,
        units:
            ProductTransferStockUnit[],
        place:
            { RackId:number; ShelfNo:number; ShelfLabel:string; BinNo:number; BinCode:string; RackName:string },
        savePlace:
            boolean,
        notes:
            string
    ):
        TransferRow
    {
        const product =
            this.stockOf(base.ProductId);

        const batches =
            product?.Batches ?? [];

        const available =
            this.isBikes
                ? (product?.Units.length ?? 0)
                : (product?.Available ?? 0);

        const qty =
            this.isBikes ? units.length : roundQty(quantity);

        let state:
            TransferRow['State'] = 'ok';

        let allocations:
            ProductTransferAllocation[] = [];

        let value = 0;

        if
        (
            this.isBikes
        )
        {
            const split =
                unitAllocate(batches, units);

            allocations = split.Allocations;

            value = split.Value;

            state = qty > 0 ? 'ok' : 'bad';
        }
        else if
        (
            !(qty > 0)
        )
        {
            state = 'bad';
        }
        else
        {
            const split =
                fifoAllocate(batches, qty);

            allocations = split.Allocations;

            value = split.Value;

            state = qty > available ? 'short' : 'ok';
        }

        const rackName =
            this.rackById(place.RackId)?.Name || place.RackName || '';

        return {
            ...base,
            Available:available,
            Quantity:qty,
            QtyText:qty > 0 ? formatTransferQty(qty) : '',
            State:state,
            Units:units,
            Batches:allocations,
            Value:value,
            RackId:place.RackId,
            RackName:rackName,
            ShelfNo:place.ShelfNo,
            ShelfLabel:place.ShelfLabel,
            BinNo:place.RackId > 0 ? (place.BinNo || 1) : 0,
            BinCode:place.BinCode,
            PlaceText:place.RackId > 0 ? placeText(rackName, place.ShelfNo, place.BinNo || 1, place.BinCode) : '',
            SavePlace:savePlace && place.RackId > 0,
            Notes:notes
        };
    }

    private withPlace
    (
        row:
            TransferRow,
        rackId:
            number,
        shelfNo:
            number,
        binNo:
            number,
        code:
            string,
        savePlace:
            boolean
    ):
        TransferRow
    {
        const rackName =
            this.rackById(rackId)?.Name ?? '';

        const known =
            rackId > 0 && !!rackName;

        return {
            ...row,
            RackId:known ? rackId : 0,
            RackName:known ? rackName : '',
            ShelfNo:known ? shelfNo : 0,
            ShelfLabel:known ? (rackShelf(this.rackById(rackId), shelfNo)?.Label || shelfLabel(rackName, shelfNo)) : '',
            BinNo:known ? (binNo || 1) : 0,
            BinCode:known ? code : '',
            PlaceText:known ? placeText(rackName, shelfNo, binNo || 1, code) : '',
            SavePlace:known && savePlace
        };
    }

    focusQty
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
                        .querySelector<HTMLInputElement>(`input[data-qty-index="${index}"]`);

                input?.focus();

                input?.select();
            },
            0
        );
    }

    // Enter in a quantity box : take the value, go to the next row
    onQtyEnter
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
            this.onRowQty(row, input.value);
        }

        this.focusQty(index + 1 < this.rows.length ? index + 1 : index);
    }

    onRowQty
    (
        row:
            TransferRow,
        value:
            string
    ):
        void
    {
        const typed =
            String(value ?? '').trim();

        const parsed =
            toNumber(typed);

        const qty =
            Number.isFinite(parsed) && parsed > 0
                ? Math.round(parsed * 100) / 100
                : 0;

        // New objects : the grid redraws the row
        this.rows =
            this.rows.map
            (
                x =>
                    x.ProductId === row.ProductId
                        ? {
                            ...this.makeRow(x, qty, x.Units, { RackId:x.RackId, ShelfNo:x.ShelfNo, ShelfLabel:x.ShelfLabel, BinNo:x.BinNo, BinCode:x.BinCode, RackName:x.RackName }, x.SavePlace, x.Notes),
                            QtyText:qty > 0 ? formatTransferQty(qty) : typed
                        }
                        : x
            );

        this.refreshView();
    }

    onRowNotes
    (
        row:
            TransferRow,
        value:
            string
    ):
        void
    {
        const notes =
            String(value ?? '').trim().slice(0, 200);

        this.rows = this.rows.map(x => x.ProductId === row.ProductId ? { ...x, Notes:notes } : x);

        this.refreshView();
    }

    removeRow
    (
        row:
            TransferRow
    ):
        void
    {
        this.rows = this.rows.filter(x => x.ProductId !== row.ProductId);

        this.expanded.delete(row.ProductId);

        if
        (
            this.editingId === row.ProductId
        )
        {
            this.resetPick();
        }

        this.buildPickers();

        this.refreshView();
    }

    // Motor bikes : one bike off a row (the last one : the row)
    removeUnit
    (
        row:
            TransferRow,
        unit:
            ProductTransferStockUnit
    ):
        void
    {
        const units =
            row.Units.filter(x => x.MotorBikeUnitId !== unit.MotorBikeUnitId);

        if
        (
            !units.length
        )
        {
            this.removeRow(row);

            return;
        }

        const stillThere =
            units.every(u => this.stockOf(row.ProductId)?.Units.some(x => x.MotorBikeUnitId === u.MotorBikeUnitId));

        this.rows =
            this.rows.map
            (
                x =>
                {
                    if
                    (
                        x.ProductId !== row.ProductId
                    )
                    {
                        return x;
                    }

                    const next =
                        this.makeRow(x, units.length, units, { RackId:x.RackId, ShelfNo:x.ShelfNo, ShelfLabel:x.ShelfLabel, BinNo:x.BinNo, BinCode:x.BinCode, RackName:x.RackName }, x.SavePlace, x.Notes);

                    return stillThere ? next : { ...next, State:'gone' as const };
                }
            );

        // The bike is free to pick again
        this.buildPickers();

        this.refreshView();
    }

    isOpen
    (
        row:
            TransferRow
    ):
        boolean
    {
        return this.expanded.has(row.ProductId);
    }

    toggleOpen
    (
        row:
            TransferRow
    ):
        void
    {
        if
        (
            this.expanded.has(row.ProductId)
        )
        {
            this.expanded.delete(row.ProductId);
        }
        else
        {
            this.expanded.add(row.ProductId);
        }

        this.refreshView();
    }

    get allOpen():
        boolean
    {
        return this.rows.length > 0 && this.rows.every(x => this.expanded.has(x.ProductId));
    }

    toggleAll():
        void
    {
        if
        (
            this.allOpen
        )
        {
            this.expanded.clear();
        }
        else
        {
            this.rows.forEach(x => this.expanded.add(x.ProductId));
        }

        this.refreshView();
    }

    get totalQuantity():
        number
    {
        return roundQty(this.rows.reduce((total, x) => total + x.Quantity, 0));
    }

    get totalValue():
        number
    {
        return round2(this.rows.reduce((total, x) => total + x.Value, 0));
    }

    get batchCount():
        number
    {
        return this.rows.reduce((total, x) => total + x.Batches.length, 0);
    }

    get problemCount():
        number
    {
        return this.rows.filter(x => x.State !== 'ok').length;
    }

    get placedCount():
        number
    {
        return this.rows.filter(x => x.RackId > 0).length;
    }

    // Columns of the grid (the empty row's colspan)
    get columnCount():
        number
    {
        return 6 + (this.hasPlaces ? 1 : 0) + 1 + (this.isView ? 0 : 1);
    }

    rowTitle
    (
        row:
            TransferRow
    ):
        string
    {
        switch
        (
            row.State
        )
        {
            case 'bad':
                return 'Enter a quantity';

            case 'short':
                return `Only ${formatTransferQty(row.Available)} on hand in the From warehouse`;

            case 'gone':
                return 'A bike of this line is no longer in the From warehouse : remove it';

            default:
                return '';
        }
    }


    //===========================================================
    // Journal preview (inter-branch)
    //===========================================================

    openJournal():
        void
    {
        this.journal =
            productTransferJournal(
                this.info.title,
                this.fromBranchName,
                this.toBranchName,
                this.isView && this.doc ? (this.doc.TotalValue || this.totalValue) : this.totalValue);

        this.journalOpen = true;

        this.refreshView();
    }

    closeJournal():
        void
    {
        this.journalOpen = false;

        this.refreshView();
    }

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
        else if
        (
            this.cancelOpen && !this.saving
        )
        {
            this.closeCancel();
        }
        else if
        (
            this.deleteOpen && !this.saving
        )
        {
            this.closeDelete();
        }
    }

    get journalDebit():
        number
    {
        return round2(this.journal.reduce((total, x) => total + x.Debit, 0));
    }

    get journalCredit():
        number
    {
        return round2(this.journal.reduce((total, x) => total + x.Credit, 0));
    }

    get journalBalanced():
        boolean
    {
        return this.journalDebit === this.journalCredit;
    }

    get journalPosted():
        boolean
    {
        return this.isView && !!this.doc?.VoucherNo;
    }

    get journalTitle():
        string
    {
        return this.journalPosted
            ? `Journal TRF · ${this.doc?.VoucherNo}`
            : 'Journal on Send (preview)';
    }

    get journalSubtitle():
        string
    {
        return `${this.fromBranchName || 'From branch'} → ${this.toBranchName || 'To branch'} · inventory at batch cost`;
    }


    //===========================================================
    // Save / Post
    //===========================================================

    private saveProblem():
        string
    {
        if
        (
            !this.defaults
        )
        {
            return 'The defaults are not loaded yet.';
        }

        if
        (
            !this.fromWarehouseId
        )
        {
            return 'Choose the From warehouse.';
        }

        if
        (
            !this.toWarehouseId
        )
        {
            return 'Choose the To warehouse.';
        }

        if
        (
            this.fromWarehouseId === this.toWarehouseId
        )
        {
            return 'From and To must be different warehouses.';
        }

        if
        (
            !this.rows.length
        )
        {
            return `Add at least one ${this.info.item.toLowerCase()}.`;
        }

        const bad =
            this.rows.find(x => x.State !== 'ok');

        if
        (
            bad
        )
        {
            return `${bad.ProductCode || bad.ProductName} : ${this.rowTitle(bad)}.`;
        }

        return '';
    }

    private payload():
        CreateProductTransfer
    {
        return {
            Type:this.type,
            TransferDate:toTransferIso(this.transferDate),
            FromWarehouseId:this.fromWarehouseId,
            ToWarehouseId:this.toWarehouseId,
            Remarks:this.remarks.trim(),
            Lines:this.rows.map
            (
                x =>
                ({
                    ProductId:x.ProductId,
                    Quantity:x.Quantity,
                    UnitIds:this.isBikes ? x.Units.map(u => u.MotorBikeUnitId) : [],
                    ToRackId:this.hasPlaces && x.RackId ? x.RackId : null,
                    ToShelfNo:this.hasPlaces && x.RackId && x.ShelfNo ? x.ShelfNo : null,
                    ToBinNo:this.hasPlaces && x.RackId && x.ShelfNo ? (x.BinNo || 1) : null,
                    SavePlace:this.hasPlaces && !!x.RackId && x.SavePlace,
                    Notes:x.Notes
                })
            )
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
                updating ? 'Updating Product Transfer' : 'Saving Product Transfer',
                updating ? `Please wait while "${this.numberText}" is being updated...` : 'Please wait while the product transfer is being saved...',
                updating ? 'Product transfer updated.' : 'Product transfer saved.',
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

                        this.error = errorText(err, 'The product transfer could not be saved.');

                        this.refreshAll();
                    }
            });
    }

    // Add / edit : save, then post (same branch) / send
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

        const sending =
            this.isInterBranch;

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
                sending ? 'Sending Product Transfer' : 'Posting Product Transfer',
                sending
                    ? 'Please wait while the stock goes into transit and the journal is posted...'
                    : 'Please wait while the stock moves to the To warehouse...',
                sending ? 'Product transfer sent.' : 'Product transfer posted.',
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
                            errorText(err, `The product transfer could not be ${sending ? 'sent' : 'posted'}.`)
                            + (saved > 0 ? ' It is saved as a draft : Save or Post again updates that draft.' : '');

                        this.refreshAll();
                    }
            });
    }

    // View of a draft : post / send it as saved (the server checks
    // the stock again)
    postDraft():
        void
    {
        const doc =
            this.doc;

        if
        (
            !doc || doc.Status !== 'Draft' || doc.IsDeleted || this.saving || this.progress.busy
        )
        {
            return;
        }

        const sending =
            doc.IsInterBranch;

        this.saving = true;

        this.error = '';

        this.progress
            .run(
                sending ? 'Sending Product Transfer' : 'Posting Product Transfer',
                `Please wait while "${doc.TransferNo}" is being ${sending ? 'sent' : 'posted'}...`,
                sending ? 'Product transfer sent.' : 'Product transfer posted.',
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

                        this.error = errorText(err, `The product transfer could not be ${sending ? 'sent' : 'posted'}.`) + ' Open it for editing to fix it.';

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

        this.expanded.clear();

        this.brandId = 0;

        this.remarks = '';

        this.error = '';

        this.resetPick();

        const today =
            fromTransferIso(this.defaults?.Today ?? '');

        if
        (
            today
        )
        {
            this.transferDate = today;
        }

        this.buildPickers();

        this.buildRackItems();

        this.refreshView();
    }


    //===========================================================
    // Receive (view of an In Transit transfer, the To branch)
    //===========================================================

    get canReceive():
        boolean
    {
        return this.isView && this.doc?.Status === 'In Transit' && !!this.doc?.CanReceive;
    }

    // Not before the transfer date (set with the document)
    receiveMin:
        Date | null = null;

    onReceiveDate
    (
        value:
            Date
    ):
        void
    {
        if
        (
            value instanceof Date && !isNaN(value.getTime())
        )
        {
            this.receiveDate = value;

            this.receiveError = '';
        }

        this.refreshView();
    }

    receive():
        void
    {
        const doc =
            this.doc;

        if
        (
            !doc || !this.canReceive || this.saving || this.progress.busy
        )
        {
            return;
        }

        const min =
            this.receiveMin;

        if
        (
            min && toTransferIso(this.receiveDate) < toTransferIso(min)
        )
        {
            this.receiveError = `The receive date cannot be before the transfer date (${formatTransferDate(doc.TransferDate)}).`;

            this.refreshView();

            return;
        }

        this.saving = true;

        this.error = '';

        this.receiveError = '';

        this.progress
            .run(
                'Receiving Product Transfer',
                `Please wait while "${doc.TransferNo}" goes on hand in ${doc.ToWarehouseName || 'the To warehouse'}...`,
                'Product transfer received.',
                this.service.receive(doc.Id, toTransferIso(this.receiveDate)))
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

                        this.receiveError = errorText(err, 'The product transfer could not be received.');

                        this.refreshAll();
                    }
            });
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
                'Deleting Product Transfer',
                `Please wait while "${doc.TransferNo}" is being deleted...`,
                'Product transfer deleted.',
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
                this.router.createUrlTree(['/print-viewer', PRODUCT_TRANSFER_PRINT_KEY, this.doc.Id])
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

    // A posted transfer (the server decides whether the stock is
    // still where it went)
    get canCancel():
        boolean
    {
        const status =
            this.doc?.Status ?? '';

        return this.isView
            && !this.doc?.IsDeleted
            && (status === 'Completed' || status === 'In Transit' || status === 'Received');
    }

    get cancelNote():
        string
    {
        switch
        (
            this.doc?.Status
        )
        {
            case 'In Transit':
                return 'The stock goes back on hand in the From warehouse and the TRF journal is reversed.';

            case 'Received':
                return 'Refused unless every moved quantity (and every bike) is still on hand in the To warehouse. The receive and send movements and the TRF journal are reversed.';

            default:
                return 'Refused unless every moved quantity (and every bike) is still on hand in the To warehouse. The stock movements are reversed.';
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
            this.cancelError = 'Write why the transfer is cancelled (at least 5 characters).';

            this.refreshView();

            return;
        }

        this.saving = true;

        this.cancelOpen = false;

        this.error = '';

        this.progress
            .run(
                'Cancelling Product Transfer',
                `Please wait while "${doc.TransferNo}" is being cancelled...`,
                'Product transfer cancelled.',
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

                        this.error = errorText(err, 'The product transfer could not be cancelled.');

                        this.refreshAll();
                    }
            });
    }

    back():
        void
    {
        this.router.navigate([PRODUCT_TRANSFER_ROUTE, 'list']);
    }


    //===========================================================
    // Command center (three buttons, by mode and status)
    //
    //   Add        : Save · Post / Send · Clear
    //   Edit       : Update · Post / Send · Delete
    //   View draft : Print · Post / Send
    //   In Transit : Print · Receive (To branch) · Cancel
    //   Completed / Received : Print · Cancel
    //   Cancelled  : Print
    //===========================================================

    // post / receive / cancel / ''
    get command2Kind():
        string
    {
        if
        (
            !this.isView
        )
        {
            return 'post';
        }

        if
        (
            !this.doc || this.doc.IsDeleted
        )
        {
            return '';
        }

        if
        (
            this.doc.Status === 'Draft'
        )
        {
            return 'post';
        }

        if
        (
            this.canReceive
        )
        {
            return 'receive';
        }

        return this.canCancel ? 'cancel' : '';
    }

    // clear / delete / cancel / ''
    get command3Kind():
        string
    {
        if
        (
            this.mode === 'add'
        )
        {
            return 'clear';
        }

        if
        (
            this.mode === 'edit'
        )
        {
            return 'delete';
        }

        return this.canReceive && this.canCancel ? 'cancel' : '';
    }

    get command2Text():
        string
    {
        switch
        (
            this.command2Kind
        )
        {
            case 'receive':
                return 'Receive';

            case 'cancel':
                return 'Cancel';

            default:
                return this.postText;
        }
    }

    get command2Icon():
        string
    {
        switch
        (
            this.command2Kind
        )
        {
            case 'receive':
                return 'fas fa-dolly';

            case 'cancel':
                return 'fas fa-ban';

            default:
                return this.isInterBranch ? 'fas fa-truck-fast' : 'fas fa-check-double';
        }
    }

    get command2Activity():
        string
    {
        switch
        (
            this.command2Kind
        )
        {
            case 'receive':
                return 'Receive';

            case 'cancel':
                return 'Cancel';

            default:
                return 'Post';
        }
    }

    get command2Title():
        string
    {
        switch
        (
            this.command2Kind
        )
        {
            case 'receive':
                return `Receive into ${this.doc?.ToWarehouseName || 'the To warehouse'}`;

            case 'cancel':
                return 'Cancel the transfer : the stock movements are reversed';

            default:
                return this.isInterBranch
                    ? 'Send : the stock goes into transit to the To branch with one TRF journal; the To branch receives it'
                    : 'Post : the stock moves to the To warehouse at once (same branch, no journal)';
        }
    }

    onCommand2():
        void
    {
        switch
        (
            this.command2Kind
        )
        {
            case 'receive':
                this.receive();
                break;

            case 'cancel':
                this.openCancel();
                break;

            case 'post':
                if
                (
                    this.isView
                )
                {
                    this.postDraft();
                }
                else
                {
                    this.post();
                }
                break;
        }
    }

    get command3Text():
        string
    {
        switch
        (
            this.command3Kind
        )
        {
            case 'delete':
                return 'Delete';

            case 'cancel':
                return 'Cancel';

            default:
                return 'Clear';
        }
    }

    get command3Icon():
        string
    {
        switch
        (
            this.command3Kind
        )
        {
            case 'delete':
                return 'fas fa-trash-can';

            case 'cancel':
                return 'fas fa-ban';

            default:
                return 'fas fa-broom';
        }
    }

    get command3Activity():
        string
    {
        switch
        (
            this.command3Kind
        )
        {
            case 'delete':
                return 'Delete';

            case 'cancel':
                return 'Cancel';

            default:
                return '';
        }
    }

    onCommand3():
        void
    {
        switch
        (
            this.command3Kind
        )
        {
            case 'delete':
                this.openDelete();
                break;

            case 'cancel':
                this.openCancel();
                break;

            case 'clear':
                this.clear();
                break;
        }
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
                return 'Add Product Transfer';

            case 'edit':
                return 'Update Product Transfer';

            default:
                return 'View Product Transfer';
        }
    }

    get statusText():
        string
    {
        if
        (
            this.mode === 'add'
        )
        {
            return 'New';
        }

        return this.doc?.IsDeleted ? 'Deleted' : (this.doc?.Status ?? '');
    }

    get statusClass():
        string
    {
        const status =
            this.mode === 'add' ? 'new' : (this.statusText || 'new');

        return `pof-status pof-status-${status.toLowerCase().replace(/\s+/g, '-')}`;
    }

    get statusNote():
        string
    {
        return productTransferStatusNote(this.doc?.Status ?? '', this.doc?.ToBranchName ?? '');
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
        return formatTransferDate(iso);
    }

    qty
    (
        value:
            number
    ):
        string
    {
        return formatTransferQty(value);
    }

    money
    (
        value:
            number
    ):
        string
    {
        return formatTransferMoney(value);
    }

    // A date → yyyy-MM-dd
    isoOf
    (
        value:
            Date
    ):
        string
    {
        return value instanceof Date && !isNaN(value.getTime()) ? toTransferIso(value) : '';
    }

    cost
    (
        value:
            number
    ):
        string
    {
        return formatTransferCost(value);
    }
}


//===============================================================
// Helpers
//===============================================================

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
