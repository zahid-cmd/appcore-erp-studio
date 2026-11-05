//===============================================================
// Imports
//===============================================================

import
{
    ApplicationRef,
    ChangeDetectorRef,
    Component,
    DestroyRef,
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
    CreateMassStoring,
    MASS_STORING_NO_CHANGE,
    MASS_STORING_PRINT_KEY,
    MASS_STORING_ROUTE,
    MASS_STORING_TYPES,
    MASS_STORING_UNPLACED,
    MassStoringDefaults,
    MASS_STORING_RACK_MAP_PRINT_KEY,
    MassStoringBin,
    MassStoringDetail,
    MassStoringLine,
    MassStoringPlaces,
    MassStoringProduct,
    MassStoringRack,
    MassStoringTypeInfo,
    MassStoringWarehouse,
    formatStoringDate,
    formatStoringQty,
    fromStoringIso,
    massStoringStatusNote,
    massStoringType,
    storingLocationText,
    storingWarehouseText,
    toStoringIso,
    win1252Safe
}
from '../../../models/mass-storing.model';

import
{
    MassStoringService
}
from '../../../services/mass-storing.service';

import
{
    binHolder,
    rackBinCode,
    rackShelf,
    shelfBinCount
}
from '../../../models/product-transfer.model';

import
{
    DEFAULT_MOVEMENT_CLASS,
    movementClassInfo,
    rackLetter,
    shelfLabel
}
from '../../../../../../shared/inventory/storage-labels';

import
{
    PlanAssignment,
    PlanProduct,
    PlanRack,
    PlanResult,
    allocateByPlan,
    blockedBins,
    naturalCompare,
    planKey
}
from './rack-allocation';

import
{
    saveRackMapPrintRequest
}
from '../../../print/mass-storing-rack-map.print';


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

// One product of the warehouse (Placements grid)
interface StoringRow
{
    ProductId:number;
    Code:string;
    Name:string;
    PartNumber:string;
    Unit:string;
    BrandId:number;
    CategoryId:number;
    // The Add Products group that brought it
    GroupKey:string;
    // Rack plan / overview
    SubCategoryId:number;
    SubCategoryName:string;
    MovementClass:string;
    MovementRank:number;
    Stock:number;
    // Its location now (0 = Unplaced) : rack / shelf / bin
    CurRackId:number;
    CurShelfNo:number;
    CurBinNo:number;
    CurText:string;
    IsPlaced:boolean;
    // 0 = no change, -1 = Unplaced, else the rack
    NewRackId:number;
    NewShelfNo:number;
    NewBinNo:number;
    NewText:string;
    Notes:string;
    // Ticked for "Fill free shelves"
    Checked:boolean;
    // A valid change (saved as a line)
    Changed:boolean;
    // Why the row cannot be saved ('' = fine)
    Problem:string;
    // Shelves of the new rack with a usable bin, and the usable bins
    // of the new shelf (free or vacated, not targeted by another row)
    ShelfItems:Option[];
    BinItems:Option[];
    // A saved line's product no longer in the list (edit)
    Extra:boolean;
}

// A line on the view
interface ViewRow
{
    ProductId:number;
    Code:string;
    Name:string;
    PartNumber:string;
    Stock:number;
    FromText:string;
    ToText:string;
    IsClear:boolean;
    Notes:string;
}

// Edit : what the form needs besides the document
interface EditData
{
    defaults:MassStoringDefaults;
    products:MassStoringProduct[];
    places:MassStoringPlaces;
}

// The final state : products leaving their bin, and how many rows
// target each "rack:shelf:bin"
interface ShelfState
{
    leaving:Set<number>;
    targets:Map<string, number>;
}

// A group of the grid : the parts of one category › sub category
// added at once (Allocate keeps the add order)
interface AddGroup
{
    Key:string;
    // "Bajaj Spare Parts › Brake"
    Label:string;
    Order:number;
}

// Rack Overview : an item on a bin (own type or the other one)
interface OvItem
{
    Own:boolean;
    ProductId:number;
    Code:string;
    Name:string;
    PartNumber:string;
    SubId:number;
    SubName:string;
    Movement:string;
    Stock:number;
}

// new = placed where it was Unplaced, moved = arrives from another
// bin, vacated = its product moved away, cleared = its product set
// to Unplaced
type OvState =
    'new' | 'moved' | 'vacated' | 'cleared' | 'same' | 'free';

interface OvMove
{
    ProductId:number;
    // "rack:shelf:bin" (null = Unplaced)
    From:string | null;
    To:string | null;
    FromText:string;
    ToText:string;
}

interface OvCell
{
    Key:string;
    RackName:string;
    // A-03-05
    Code:string;
    // The item after the change (vacated / cleared : the one that left)
    Item:OvItem | null;
    Other:boolean;
    State:OvState;
    Color:string;
    // Short code shown in the cell
    Label:string;
    // Matches the search
    Hit:boolean;
    FromText:string;
    ToText:string;
}

interface OvShelf
{
    ShelfNo:number;
    Label:string;
    Prime:boolean;
    // Many bins : colour only
    Narrow:boolean;
    Cells:OvCell[];
}

interface OvRack
{
    Id:number;
    Name:string;
    Code:string;
    Zone:string;
    Assignment:string;
    Used:number;
    Total:number;
    Prime:string;
    Inactive:boolean;
    Changed:boolean;
    Shelves:OvShelf[];
}

interface OvLegend
{
    key:string;
    label:string;
    color:string;
    count:number;
    order:number;
}

// Change colours (premium thin family)
const CHANGE_COLORS:
    Record<OvState, string> =
{
    new:'#047857',
    moved:'#1d4ed8',
    vacated:'#b45309',
    cleared:'#be123c',
    same:'#64748b',
    free:''
};

const CHANGE_LABELS:
    Record<OvState, string> =
{
    new:'New',
    moved:'Moved in',
    vacated:'Vacated',
    cleared:'Cleared',
    same:'Unchanged',
    free:'Free'
};

const CHANGE_ORDER:
    OvState[] =
    ['new', 'moved', 'vacated', 'cleared', 'same', 'free'];

// Sub category colours : a stable palette by the sub category id
const SUB_PALETTE:
    string[] =
    ['#0f766e', '#1d4ed8', '#7c3aed', '#b45309', '#be123c', '#047857', '#0369a1', '#a21caf', '#4d7c0f', '#c2410c', '#4338ca', '#0e7490'];

function subColor
(
    subId:
        number
):
    string
{
    return subId > 0 ? SUB_PALETTE[subId % SUB_PALETTE.length] : '#64748b';
}

// "SP-000055" → "55" (the cell's short code)
function shortCode
(
    code:
        string
):
    string
{
    const text =
        String(code ?? '').trim();

    return text.replace(/^[A-Za-z]+-0*/, '') || text;
}

// Rows drawn at once (Show more adds the next ones)
const ROW_PAGE =
    200;


//===============================================================
// Mass Storing form. Same look as Product Transfer :
//
//   Left   : Storing Information (product type, storing no, date,
//            warehouse); Add Products (category › sub categories
//            → groups of rows; no single products here);
//            Allocate (Zone · Rack · Bin, follow the rack plan :
//            the engine is rack-allocation.ts).
//   Right  : Placements : the Narration, the grid of the added
//            parts : current location → new rack / shelf / bin
//            (free or vacated in this document) or Unplaced;
//            changed rows are counted and saved as lines. Rack
//            Overview : the racks as a map (colour by sub category
//            / movement / change) replacing the area under the
//            header, with Print and Post.
//
//   View   : the document's lines (From → To), Details, the
//            inline Cancel panel for a posted one.
//
//   Save keeps a draft; Post applies every line at once; Cancel
//   puts the previous locations back.
//===============================================================

@Component(
{
    selector:'app-mass-storing-form',
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
    templateUrl:'./mass-storing-form.html',
    styleUrl:'./mass-storing-form.css'
})
export class MassStoringForm
    implements OnInit
{
    private readonly service =
        inject(MassStoringService);

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

    // Progress dialog around save / post / cancel / delete
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
        MassStoringDefaults | null = null;

    doc:
        MassStoringDetail | null = null;

    // A post that failed after its save created the draft : the
    // next Save / Post updates it
    private savedId:
        number = 0;

    type:
        string = 'SP';

    info:
        MassStoringTypeInfo = MASS_STORING_TYPES[0];

    readonly typeSegments:
        ControlSegmentItem[] =
        MASS_STORING_TYPES.map(x => ({ value:x.type, text:x.segment }));

    storingDate:
        Date = new Date();

    warehouseId:
        number = 0;

    warehouseItems:
        Option[] = [];

    remarks:
        string = '';


    //===========================================================
    // Grid : the warehouse's products and racks
    //===========================================================

    rows:
        StoringRow[] = [];

    // After the filters
    shownRows:
        StoringRow[] = [];

    // Drawn (Show more adds ROW_PAGE)
    visibleRows:
        StoringRow[] = [];

    private rowLimit:
        number = ROW_PAGE;

    gridLoading:
        boolean = false;

    gridError:
        string = '';

    racks:
        MassStoringRack[] = [];

    // Every product of the type placed in the warehouse now
    private places:
        MassStoringPlaces['Places'] = [];

    // "rack:shelf:bin" → the item on it now (own = a product of
    // this type, which this document may move away)
    private holders =
        new Map<string, { ProductId:number; Own:boolean }>();

    // New Rack : for a placed product (with Unplaced) / an
    // unplaced one
    rackItemsPlaced:
        Option[] = [];

    rackItemsBare:
        Option[] = [];

    // Incremented per grid load : an older answer is ignored
    private gridCall:
        number = 0;


    //===========================================================
    // Add Products (by category / sub categories) and the grid's
    // find box
    //===========================================================

    // Every product of the type in the warehouse (placed or not,
    // with or without stock) : loaded once per warehouse / type
    private catalog:
        MassStoringProduct[] = [];

    // The groups added, in order (Allocate keeps this order)
    groups:
        AddGroup[] = [];

    addCategoryItems:
        Option[] = [];

    addCategoryId:
        number = 0;

    addSubChips:
        { id:number; label:string; count:number; on:boolean }[] = [];

    addSubIds:
        number[] = [];

    addWithoutStock:
        boolean = false;

    addUnplacedOnly:
        boolean = false;

    addNote:
        string = '';

    addTone:
        'ok' | 'warn' = 'ok';

    // Inline "Remove n rows?" : a group key, '*' = every group
    groupConfirm:
        string = '';

    // Find in grid
    search:
        string = '';

    // The open compact multi-select ('' = none)
    multiOpen:
        '' | 'sub' | 'rack' = '';


    //===========================================================
    // Allocate : Zone · Rack · Bin
    //===========================================================

    readonly allocModeSegments:
        ControlSegmentItem[] =
        [
            { value:'zone', text:'Zone' },
            { value:'rack', text:'Rack' },
            { value:'bin', text:'Bin' }
        ];

    allocMode:
        'zone' | 'rack' | 'bin' = 'zone';

    allocZoneItems:
        Option[] = [];

    allocZone:
        string = '';

    // Zone mode : racks and free bins of the zone (live)
    zoneRackCount:
        number = 0;

    zoneFree:
        number = 0;

    allocRackIds:
        number[] = [];

    allocChips:
        { id:number; label:string; title:string; full:boolean; on:boolean }[] = [];

    // Bin mode : the start bin
    binRackItems:
        Option[] = [];

    binShelfItems:
        Option[] = [];

    binBinItems:
        Option[] = [];

    binRackId:
        number = 0;

    binShelfNo:
        number = 0;

    binBinNo:
        number = 0;

    // Zone / Rack : a part only to the racks its assignment fits
    // (General racks take the rest)
    followPlan:
        boolean = true;

    allocNote:
        string = '';

    allocTone:
        'ok' | 'warn' = 'ok';

    // The last Allocate's leftovers; rows it kept on their own bin
    // (not allocated again until Reset allocation)
    leftoverIds:
        Set<number> = new Set<number>();

    leftoversOnly:
        boolean = false;

    private keptIds:
        Set<number> = new Set<number>();


    //===========================================================
    // Rack Overview (canvas)
    //===========================================================

    overviewOpen:
        boolean = false;

    readonly ovColorSegments:
        ControlSegmentItem[] =
        [
            { value:'sub', text:'Sub Category' },
            { value:'move', text:'Movement' },
            { value:'change', text:'Change' }
        ];

    ovColor:
        'sub' | 'move' | 'change' = 'sub';

    ovZoneItems:
        Option[] = [];

    ovZone:
        string = '';

    ovChangedOnly:
        boolean = false;

    ovSearch:
        string = '';

    ovRacks:
        OvRack[] = [];

    ovLegend:
        OvLegend[] = [];

    ovStats:
        { label:string; value:string; tone:string }[] = [];

    ovHits:
        number = 0;

    ovHover:
        OvCell | null = null;

    ovBusy:
        boolean = false;

    ovError:
        string = '';

    // View : the warehouse's map (loaded on open)
    private ovPlaces:
        MassStoringPlaces | null = null;


    //===========================================================
    // View, cancel, delete (inline : no pop-ups)
    //===========================================================

    facts:
        Fact[] = [];

    viewRows:
        ViewRow[] = [];

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
                    console.error('[Mass Storing] view update failed', error);
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
            console.error('[Mass Storing] view update failed', error);
        }
    }


    //===========================================================
    // Start
    //===========================================================

    ngOnInit():
        void
    {
        const id =
            this.route.snapshot.paramMap.get('id') ?? '';

        const viewing =
            /\/view\//.test(this.router.url);

        if
        (
            id !== ''
        )
        {
            this.mode = viewing ? 'view' : 'edit';

            this.loadDocument(id);

            return;
        }

        const type =
            String(this.route.snapshot.queryParamMap.get('type') ?? '').toUpperCase();

        this.setType(MASS_STORING_TYPES.some(x => x.type === type) ? type : 'SP');

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

        this.info = massStoringType(type);
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
                            fromStoringIso(defaults.Today);

                        if
                        (
                            today && this.mode === 'add'
                        )
                        {
                            this.storingDate = today;
                        }

                        // The login branch's warehouse running the line
                        if
                        (
                            !this.usable(this.warehouseId)
                        )
                        {
                            this.warehouseId =
                                this.usable(defaults.DefaultWarehouseId)
                                    ? defaults.DefaultWarehouseId
                                    : (defaults.Warehouses.find(x => x.BranchId === defaults.CurrentBranchId && x.CanReceiveType && x.IsDefault)?.Id
                                        ?? defaults.Warehouses.find(x => x.BranchId === defaults.CurrentBranchId && x.CanReceiveType)?.Id
                                        ?? 0);
                        }

                        this.buildWarehouseItems();

                        this.refreshAll();

                        this.loadGrid();
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

                        this.error = errorText(err, 'The mass storing defaults could not be loaded.');

                        this.refreshView();
                    }
            });
    }

    private loadDocument
    (
        id:
            string
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

                            this.router.navigate([MASS_STORING_ROUTE, 'view', doc.PublicId], { replaceUrl:true });
                        }

                        if
                        (
                            this.mode !== 'edit'
                        )
                        {
                            return of(null);
                        }

                        // Edit : the defaults, the warehouse's grid
                        // and racks; the saved lines go on top
                        return forkJoin
                        ({
                            defaults:this.service.getDefaults(doc.PageType),
                            products:this.service.getProducts(doc.PageType, doc.WarehouseId, true, { includePlaced:true }),
                            places:this.service.getPlaces(doc.PageType, doc.WarehouseId)
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

                        const doc =
                            this.doc;

                        if
                        (
                            doc
                        )
                        {
                            this.storingDate = fromStoringIso(doc.StoringDate) ?? new Date();

                            this.warehouseId = doc.WarehouseId;

                            this.remarks = doc.Remarks;
                        }

                        if
                        (
                            data && doc
                        )
                        {
                            this.defaults = data.defaults;

                            this.buildWarehouseItems();

                            this.applyRacks(data.places);

                            this.setCatalog(data.products);

                            this.applyLines(doc.Lines);
                        }
                        else
                        {
                            this.buildView();
                        }

                        this.refreshAll();
                    },
                error:
                    err =>
                    {
                        this.loading = false;

                        this.error = errorText(err, 'The mass storing could not be loaded.');

                        this.refreshView();
                    }
            });
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

        this.viewRows =
            doc.Lines.map
            (
                line =>
                ({
                    ProductId:line.ProductId,
                    Code:line.ProductCode,
                    Name:line.ProductName,
                    PartNumber:line.PartNumber,
                    Stock:line.StockQuantity,
                    FromText:storingLocationText(line.FromRackName, line.FromShelfNo, line.FromBinNo, line.FromBinCode),
                    ToText:line.IsClear
                        ? ''
                        : storingLocationText(line.ToRackName, line.ToShelfNo, line.ToBinNo, line.ToBinCode),
                    IsClear:line.IsClear,
                    Notes:line.Notes
                })
            );

        const by =
            (name: string, when: string): string =>
                [name, when ? formatStoringDate(when) : ''].filter(x => !!x).join(' · ');

        this.facts =
            [
                { label:'Status', value:doc.IsDeleted ? 'Deleted' : doc.Status },
                { label:'Lines', value:String(doc.LineCount || doc.Lines.length) },
                { label:'Placed', value:String(doc.PlacedCount) },
                { label:'Cleared', value:String(doc.ClearedCount) },
                { label:'Saved By', value:by(doc.CreatedByName, doc.CreatedDate), wide:true },
                ...(doc.PostedDate || doc.PostedByName
                    ? [{ label:'Posted By', value:by(doc.PostedByName, doc.PostedDate), wide:true }]
                    : []),
                ...(doc.Status === 'Cancelled'
                    ? [
                        { label:'Cancelled By', value:by(doc.CancelledByName, doc.CancelledDate), wide:true },
                        { label:'Cancel Reason', value:doc.CancelReason, wide:true }
                    ]
                    : [])
            ];
    }


    //===========================================================
    // Information
    //===========================================================

    // Any row changed (type and warehouse are locked then)
    get hasChanges():
        boolean
    {
        return this.rows.some(x => x.NewRackId !== MASS_STORING_NO_CHANGE);
    }

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
            this.mode !== 'add' || type === this.type || !MASS_STORING_TYPES.some(x => x.type === type)
        )
        {
            return;
        }

        if
        (
            this.hasChanges
        )
        {
            this.error = 'Clear the changes first : one mass storing is for one product type.';

            this.refreshView();

            return;
        }

        this.setType(type);

        // Nothing of the previous type may stay on screen : its
        // defaults (warehouses, next no) and its grid go now; the
        // warehouse is kept only if the new type's list allows it
        this.defaults = null;

        this.warehouseItems = [];

        this.gridCall++;

        this.gridLoading = false;

        this.rows = [];

        this.groups = [];

        this.catalog = [];

        this.racks = [];

        this.applyFilters();

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
            this.storingDate = value;
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
        return this.doc?.StoringNo || this.defaults?.NextNo || '';
    }


    //===========================================================
    // Warehouse (Business Configuration : the branch runs the
    // type's line)
    //===========================================================

    private warehouseById
    (
        id:
            number
    ):
        MassStoringWarehouse | null
    {
        return id
            ? (this.defaults?.Warehouses ?? []).find(x => x.Id === id) ?? null
            : null;
    }

    private usable
    (
        id:
            number
    ):
        boolean
    {
        return !!this.warehouseById(id)?.CanReceiveType;
    }

    private buildWarehouseItems():
        void
    {
        const all =
            (this.defaults?.Warehouses ?? []).filter(x => x.CanReceiveType || x.Id === this.warehouseId);

        this.warehouseItems =
            all.map(w => ({ label:storingWarehouseText(w.Name, w.BranchName), value:w.Id }));

        // A saved document keeps its own warehouse
        if
        (
            this.doc && this.warehouseId && !all.some(x => x.Id === this.warehouseId)
        )
        {
            this.warehouseItems =
                [
                    { label:storingWarehouseText(this.doc.WarehouseName, this.doc.BranchName), value:this.doc.WarehouseId },
                    ...this.warehouseItems
                ];
        }
    }

    get warehouseText():
        string
    {
        if
        (
            this.doc && (this.isView || this.doc.WarehouseId === this.warehouseId)
        )
        {
            return storingWarehouseText(this.doc.WarehouseName, this.doc.BranchName);
        }

        const w =
            this.warehouseById(this.warehouseId);

        return w ? storingWarehouseText(w.Name, w.BranchName) : '';
    }

    get warehousePlaceholder():
        string
    {
        return this.warehouseItems.length
            ? 'Warehouse to arrange'
            : `No warehouse runs ${this.info.itemLower} here`;
    }

    onWarehouseChange
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
            id === this.warehouseId || this.mode !== 'add'
        )
        {
            return;
        }

        if
        (
            this.hasChanges
        )
        {
            this.error = 'Clear the changes to switch the warehouse : locations belong to one warehouse.';

            this.refreshView();

            return;
        }

        this.warehouseId = id;

        this.allocNote = '';

        this.addNote = '';

        this.refreshView();

        this.loadGrid();
    }


    //===========================================================
    // Grid : load, build, filter
    //===========================================================

    private loadGrid():
        void
    {
        const call =
            ++this.gridCall;

        // A new warehouse / type : the grid starts empty (products
        // are added by category); the allocation notes go
        this.rows = [];

        this.groups = [];

        this.catalog = [];

        this.keptIds = new Set<number>();

        this.leftoverIds = new Set<number>();

        this.leftoversOnly = false;

        this.groupConfirm = '';

        this.gridError = '';

        if
        (
            !this.warehouseId
        )
        {
            this.setCatalog([]);

            this.applyRacks({ Places:[], Racks:[] });

            this.evaluateAll();

            this.refreshView();

            return;
        }

        this.gridLoading = true;

        this.refreshView();

        forkJoin
        ({
            products:this.service.getProducts(this.type, this.warehouseId, true, { includePlaced:true }),
            places:this.service.getPlaces(this.type, this.warehouseId)
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe
        ({
            next:
                (data: { products:MassStoringProduct[]; places:MassStoringPlaces }) =>
                {
                    if
                    (
                        call !== this.gridCall
                    )
                    {
                        return;
                    }

                    this.gridLoading = false;

                    this.applyRacks(data.places);

                    this.setCatalog(data.products);

                    this.evaluateAll();

                    this.refreshAll();
                },
            error:
                (err: any) =>
                {
                    if
                    (
                        call !== this.gridCall
                    )
                    {
                        return;
                    }

                    this.gridLoading = false;

                    this.gridError = errorText(err, 'The products of the warehouse could not be loaded.');

                    this.refreshAll();
                }
        });
    }

    private applyRacks
    (
        places:
            MassStoringPlaces
    ):
        void
    {
        this.racks = places.Racks;

        this.places = places.Places;

        this.buildAllocItems();

        // "rack:shelf:bin" → the item on it now (own = a product of
        // this type, which this document may move away)
        this.holders.clear();

        for
        (
            const rack of this.racks
        )
        {
            for
            (
                const shelf of rack.Shelves
            )
            {
                for
                (
                    const bin of shelf.Bins
                )
                {
                    if
                    (
                        !bin.IsFree
                    )
                    {
                        this.holders.set(`${rack.Id}:${shelf.ShelfNo}:${bin.BinNo}`, { ProductId:bin.IsOwnType ? bin.HeldById : 0, Own:bin.IsOwnType && bin.HeldById > 0 });
                    }
                }
            }
        }

        // The saved places of this type (when the bins say less)
        for
        (
            const place of places.Places
        )
        {
            const key =
                `${place.RackId}:${place.ShelfNo}:${place.BinNo || 1}`;

            if
            (
                !this.holders.get(key)?.Own
            )
            {
                this.holders.set(key, { ProductId:place.ProductId, Own:true });
            }
        }
    }

    // The rack dropdowns (labels, final-state counts of usable bins)
    private buildRackItems
    (
        state:
            ShelfState
    ):
        void
    {
        const racks =
            this.racks.map
            (
                r =>
                {
                    const free =
                        this.availableBins(r, 0, state).length;

                    const name =
                        r.DisplayName.replace(/\s*\(Full\)\s*$/i, '') || r.Name;

                    return {
                        label:free === 0 && r.ShelfCount > 0 ? `${name} (Full)` : name,
                        value:r.Id,
                        count:String(free)
                    };
                }
            );

        this.rackItemsBare =
            [{ label:'No change', value:MASS_STORING_NO_CHANGE }, ...racks];

        this.rackItemsPlaced =
            [
                { label:'No change', value:MASS_STORING_NO_CHANGE },
                { label:'Unplaced (clear the location)', value:MASS_STORING_UNPLACED },
                ...racks
            ];

        this.buildAllocLists(state);
    }

    // The final state of the grid : who leaves a bin, which bins
    // are targeted
    private shelfState():
        ShelfState
    {
        const leaving =
            new Set<number>();

        const targets =
            new Map<string, number>();

        for
        (
            const row of this.rows
        )
        {
            if
            (
                row.NewRackId === MASS_STORING_UNPLACED && row.IsPlaced
            )
            {
                leaving.add(row.ProductId);
            }
            else if
            (
                row.NewRackId > 0 && row.NewShelfNo > 0 && row.NewBinNo > 0
            )
            {
                if
                (
                    row.IsPlaced && !this.isCurrent(row, row.NewRackId, row.NewShelfNo, row.NewBinNo)
                )
                {
                    leaving.add(row.ProductId);
                }

                const key =
                    `${row.NewRackId}:${row.NewShelfNo}:${row.NewBinNo}`;

                targets.set(key, (targets.get(key) ?? 0) + 1);
            }
        }

        return { leaving, targets };
    }

    // The product's own bin now ("already there")
    private isCurrent
    (
        row:
            StoringRow,
        rackId:
            number,
        shelf:
            number,
        bin:
            number
    ):
        boolean
    {
        return row.IsPlaced && row.CurRackId === rackId && row.CurShelfNo === shelf && row.CurBinNo === bin;
    }

    // A bin in the final state, for a product : free now, or its
    // holder (a product of this type) leaves it in this document;
    // and no other row targets it. A bin of the other type, or of
    // an item that stays, is never usable
    private binAvailable
    (
        rack:
            MassStoringRack,
        shelf:
            number,
        bin:
            number,
        productId:
            number,
        state:
            ShelfState,
        ownTarget:
            boolean = false
    ):
        boolean
    {
        const key =
            `${rack.Id}:${shelf}:${bin}`;

        // Targeted by another row (the row's own target counts once)
        if
        (
            (state.targets.get(key) ?? 0) > (ownTarget ? 1 : 0)
        )
        {
            return false;
        }

        const holder =
            this.holders.get(key);

        if
        (
            !holder
        )
        {
            // Not listed as held : free unless the shelf itself is
            // unknown and not free
            return !binHolder(rack, shelf, bin);
        }

        return holder.Own
            && holder.ProductId !== productId
            && state.leaving.has(holder.ProductId);
    }

    // Usable bins of a rack for a product, shelf-then-bin order
    // (shelfNo > 0 : that shelf only)
    private availableBins
    (
        rack:
            MassStoringRack,
        productId:
            number,
        state:
            ShelfState,
        shelfNo:
            number = 0
    ):
        { shelf:number; bin:number }[]
    {
        const out:
            { shelf:number; bin:number }[] = [];

        for
        (
            let shelf = shelfNo || 1;
            shelf <= (shelfNo || rack.ShelfCount);
            shelf++
        )
        {
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
                    this.binAvailable(rack, shelf, bin, productId, state)
                )
                {
                    out.push({ shelf, bin });
                }
            }
        }

        return out;
    }

    // A product of the warehouse as a grid row (its change, when
    // it had one, kept)
    private toRow
    (
        p:
            MassStoringProduct,
        groupKey:
            string
    ):
        StoringRow
    {
        return {
            ProductId:p.ProductId,
            Code:p.Code,
            Name:p.Name,
            PartNumber:p.PartNumber,
            Unit:p.Unit,
            BrandId:p.BrandId,
            CategoryId:p.CategoryId,
            SubCategoryId:p.SubCategoryId,
            SubCategoryName:p.SubCategoryName,
            MovementClass:p.MovementClass,
            MovementRank:p.MovementRank,
            Stock:p.Stock,
            CurRackId:p.RackId ?? 0,
            CurShelfNo:p.ShelfNo ?? 0,
            CurBinNo:p.IsPlaced ? (p.BinNo ?? 1) : 0,
            CurText:p.IsPlaced ? storingLocationText(p.RackName, p.ShelfNo, p.BinNo ?? 1, p.BinCode) : '',
            IsPlaced:p.IsPlaced,
            GroupKey:groupKey,
            NewRackId:MASS_STORING_NO_CHANGE,
            NewShelfNo:0,
            NewBinNo:0,
            NewText:'',
            Notes:'',
            Checked:false,
            Changed:false,
            Problem:'',
            ShelfItems:[],
            BinItems:[],
            Extra:false
        };
    }

    // The warehouse's products (Add Products filters them)
    private setCatalog
    (
        products:
            MassStoringProduct[]
    ):
        void
    {
        this.catalog = products;

        this.buildAddItems();
    }

    // Edit : the saved lines become the grid, grouped by their
    // category › sub category (a line's product no longer in the
    // warehouse's list is kept as it was saved)
    private applyLines
    (
        lines:
            MassStoringLine[]
    ):
        void
    {
        const rows:
            StoringRow[] = [];

        const groups:
            AddGroup[] = [];

        const byId =
            new Map(this.catalog.map(p => [p.ProductId, p] as [number, MassStoringProduct]));

        for
        (
            const line of lines
        )
        {
            if
            (
                rows.some(x => x.ProductId === line.ProductId)
            )
            {
                continue;
            }

            const p =
                byId.get(line.ProductId);

            const key =
                p ? `c:${p.CategoryId}:s:${p.SubCategoryId}` : 'saved';

            if
            (
                !groups.some(x => x.Key === key)
            )
            {
                groups.push
                ({
                    Key:key,
                    Label:p ? `${p.CategoryName} › ${p.SubCategoryName || 'No sub category'}` : 'Saved lines',
                    Order:groups.length
                });
            }

            const change =
                {
                    NewRackId:line.IsClear ? MASS_STORING_UNPLACED : (line.ToRackId ?? MASS_STORING_NO_CHANGE),
                    NewShelfNo:line.IsClear ? 0 : (line.ToShelfNo ?? 0),
                    NewBinNo:line.IsClear ? 0 : (line.ToBinNo ?? (line.ToShelfNo ? 1 : 0)),
                    Notes:line.Notes
                };

            rows.push
            (
                p
                    ? { ...this.toRow(p, key), ...change }
                    : {
                        ProductId:line.ProductId,
                        Code:line.ProductCode,
                        Name:line.ProductName,
                        PartNumber:line.PartNumber,
                        Unit:line.Unit,
                        BrandId:0,
                        CategoryId:0,
                        SubCategoryId:0,
                        SubCategoryName:'',
                        MovementClass:DEFAULT_MOVEMENT_CLASS,
                        MovementRank:5,
                        Stock:line.StockQuantity,
                        CurRackId:line.FromRackId ?? 0,
                        CurShelfNo:line.FromShelfNo ?? 0,
                        CurBinNo:line.FromRackId !== null ? (line.FromBinNo ?? 1) : 0,
                        CurText:storingLocationText(line.FromRackName, line.FromShelfNo, line.FromBinNo, line.FromBinCode),
                        IsPlaced:line.FromRackId !== null,
                        GroupKey:key,
                        ...change,
                        NewText:'',
                        Checked:false,
                        Changed:false,
                        Problem:'',
                        ShelfItems:[],
                        BinItems:[],
                        Extra:true
                    }
            );
        }

        this.groups = groups;

        this.rows = rows;

        this.evaluateAll();
    }

    private rackById
    (
        id:
            number
    ):
        MassStoringRack | null
    {
        return id > 0
            ? this.racks.find(x => x.Id === id) ?? null
            : null;
    }

    // "SLF-A-03" (server label first)
    private shelfLabel
    (
        rack:
            MassStoringRack,
        shelfNo:
            number
    ):
        string
    {
        return rackShelf(rack, shelfNo)?.Label || shelfLabel(rack.Name, shelfNo);
    }

    // Every row checked again on the final state (shelf / bin
    // lists, vacated bins, duplicates, texts) : new row objects, so
    // the grid redraws
    private evaluateAll():
        void
    {
        const state =
            this.shelfState();

        this.rows =
            this.rows.map
            (
                row =>
                {
                    const next =
                        { ...row, Changed:false, Problem:'', NewText:'', ShelfItems:[] as Option[], BinItems:[] as Option[] };

                    if
                    (
                        row.NewRackId === MASS_STORING_UNPLACED
                    )
                    {
                        next.NewText = 'Unplaced';

                        if
                        (
                            !row.IsPlaced
                        )
                        {
                            next.Problem = 'Already unplaced';
                        }
                        else
                        {
                            next.Changed = true;
                        }

                        return next;
                    }

                    if
                    (
                        row.NewRackId === MASS_STORING_NO_CHANGE
                    )
                    {
                        return next;
                    }

                    const rack =
                        this.rackById(row.NewRackId);

                    if
                    (
                        !rack
                    )
                    {
                        next.Problem = 'The rack is no longer in this warehouse';

                        return next;
                    }

                    // Usable bins (not the product's own bin)
                    const usable =
                        this.availableBins(rack, row.ProductId, state)
                            .filter(x => !this.isCurrent(row, rack.Id, x.shelf, x.bin));

                    // Shelves with a usable bin (the picked shelf stays)
                    const shelves =
                        [...new Set(usable.map(x => x.shelf))];

                    if
                    (
                        row.NewShelfNo > 0 && !shelves.includes(row.NewShelfNo)
                    )
                    {
                        shelves.unshift(row.NewShelfNo);
                    }

                    next.ShelfItems =
                        shelves.map
                        (
                            shelf =>
                            {
                                const free =
                                    usable.filter(x => x.shelf === shelf).length;

                                return {
                                    label:free ? this.shelfLabel(rack, shelf) : `${this.shelfLabel(rack, shelf)} (Full)`,
                                    value:shelf,
                                    count:String(free)
                                };
                            }
                        );

                    if
                    (
                        !row.NewShelfNo
                    )
                    {
                        next.Problem = usable.length ? 'Choose the shelf' : `${rack.Name || rack.Code} has no free bin`;

                        return next;
                    }

                    const ok =
                        row.NewBinNo > 0 && this.binAvailable(rack, row.NewShelfNo, row.NewBinNo, row.ProductId, state, true);

                    // Bins of the shelf : usable ones (the picked bin stays)
                    const bins =
                        usable.filter(x => x.shelf === row.NewShelfNo).map(x => x.bin);

                    next.BinItems =
                        [
                            ...(row.NewBinNo > 0 && !bins.includes(row.NewBinNo)
                                ? [{ label:`${rackBinCode(rack, row.NewShelfNo, row.NewBinNo)} (${ok ? 'here' : 'not free'})`, value:row.NewBinNo }]
                                : []),
                            ...bins.map(bin => ({ label:rackBinCode(rack, row.NewShelfNo, bin), value:bin }))
                        ];

                    if
                    (
                        !row.NewBinNo
                    )
                    {
                        next.Problem = bins.length ? 'Choose the bin' : `${this.shelfLabel(rack, row.NewShelfNo)} has no free bin`;

                        return next;
                    }

                    next.NewText = storingLocationText(rack.Name, row.NewShelfNo, row.NewBinNo, rackBinCode(rack, row.NewShelfNo, row.NewBinNo));

                    const key =
                        `${rack.Id}:${row.NewShelfNo}:${row.NewBinNo}`;

                    if
                    (
                        this.isCurrent(row, rack.Id, row.NewShelfNo, row.NewBinNo)
                    )
                    {
                        next.Problem = 'Already there';
                    }
                    else if
                    (
                        (state.targets.get(key) ?? 0) > 1
                    )
                    {
                        next.Problem = 'Another row targets this bin';
                    }
                    else if
                    (
                        !ok
                    )
                    {
                        const holder =
                            this.holders.get(key);

                        next.Problem =
                            holder && !holder.Own
                                ? 'The bin holds an item of the other type'
                                : 'The bin is not free now (its item stays)';
                    }
                    else
                    {
                        next.Changed = true;
                    }

                    return next;
                }
            );

        this.buildRackItems(state);

        this.applyFilters(false);
    }

    // resetLimit : a new filter starts from the first rows again
    private applyFilters
    (
        resetLimit:
            boolean = true
    ):
        void
    {
        const words =
            this.search.trim().toLowerCase().split(/\s+/).filter(x => !!x);

        this.shownRows =
            this.rows.filter
            (
                x =>
                    (!this.leftoversOnly || this.leftoverIds.has(x.ProductId))
                    && words.every(w => `${x.Code} ${x.Name} ${x.PartNumber} ${x.SubCategoryName}`.toLowerCase().includes(w))
            );

        if
        (
            resetLimit
        )
        {
            this.rowLimit = ROW_PAGE;
        }

        this.visibleRows = this.shownRows.slice(0, this.rowLimit);
    }

    get moreCount():
        number
    {
        return Math.max(0, this.shownRows.length - this.visibleRows.length);
    }

    showMore():
        void
    {
        this.rowLimit += ROW_PAGE;

        this.applyFilters(false);

        this.refreshView();
    }

    onSearch
    (
        value:
            string | number
    ):
        void
    {
        this.search = String(value ?? '');

        this.applyFilters();

        this.refreshView();
    }

    //===========================================================
    // Rows : new rack / shelf, notes, reset, check
    //===========================================================

    onRackChange
    (
        row:
            StoringRow,
        value:
            any
    ):
        void
    {
        const rackId =
            Number(value) || 0;

        if
        (
            rackId === row.NewRackId
        )
        {
            return;
        }

        // A rack : its first usable bin (shelf-then-bin), not the
        // product's own
        let shelf = 0;

        let bin = 0;

        const rack =
            this.rackById(rackId);

        if
        (
            rack
        )
        {
            // The final state without this row's own target
            this.rows = this.rows.map(x => x.ProductId === row.ProductId ? { ...x, NewRackId:MASS_STORING_NO_CHANGE, NewShelfNo:0, NewBinNo:0 } : x);

            const first =
                this.availableBins(rack, row.ProductId, this.shelfState())
                    .find(x => !this.isCurrent(row, rack.Id, x.shelf, x.bin));

            shelf = first?.shelf ?? 0;

            bin = first?.bin ?? 0;
        }

        this.setRow(row.ProductId, { NewRackId:rackId, NewShelfNo:shelf, NewBinNo:bin });
    }

    onShelfChange
    (
        row:
            StoringRow,
        value:
            any
    ):
        void
    {
        const shelf =
            Number(value) || 0;

        if
        (
            shelf === row.NewShelfNo
        )
        {
            return;
        }

        const rack =
            this.rackById(row.NewRackId);

        let bin = 0;

        if
        (
            rack && shelf
        )
        {
            this.rows = this.rows.map(x => x.ProductId === row.ProductId ? { ...x, NewShelfNo:0, NewBinNo:0 } : x);

            bin =
                this.availableBins(rack, row.ProductId, this.shelfState(), shelf)
                    .find(x => !this.isCurrent(row, rack.Id, x.shelf, x.bin))
                    ?.bin
                ?? 0;
        }

        this.setRow(row.ProductId, { NewShelfNo:shelf, NewBinNo:bin });
    }

    onBinChange
    (
        row:
            StoringRow,
        value:
            any
    ):
        void
    {
        const bin =
            Number(value) || 0;

        if
        (
            bin === row.NewBinNo
        )
        {
            return;
        }

        this.setRow(row.ProductId, { NewBinNo:bin });
    }

    onRowNotes
    (
        row:
            StoringRow,
        value:
            string
    ):
        void
    {
        this.setRow(row.ProductId, { Notes:String(value ?? '').trim().slice(0, 200) });
    }

    resetRow
    (
        row:
            StoringRow
    ):
        void
    {
        // Allocate may place it again
        this.keptIds.delete(row.ProductId);

        this.setRow(row.ProductId, { NewRackId:MASS_STORING_NO_CHANGE, NewShelfNo:0, NewBinNo:0, Notes:'' });
    }

    toggleRow
    (
        row:
            StoringRow
    ):
        void
    {
        this.rows = this.rows.map(x => x.ProductId === row.ProductId ? { ...x, Checked:!x.Checked } : x);

        this.applyFilters(false);

        this.refreshView();
    }

    get allChecked():
        boolean
    {
        return this.visibleRows.length > 0 && this.visibleRows.every(x => x.Checked);
    }

    // Tick / untick every row shown
    toggleAllRows():
        void
    {
        const value =
            !this.allChecked;

        const shown =
            new Set(this.visibleRows.map(x => x.ProductId));

        this.rows = this.rows.map(x => shown.has(x.ProductId) ? { ...x, Checked:value } : x);

        this.applyFilters(false);

        this.refreshView();
    }

    private setRow
    (
        productId:
            number,
        change:
            Partial<StoringRow>
    ):
        void
    {
        this.rows = this.rows.map(x => x.ProductId === productId ? { ...x, ...change } : x);

        this.allocNote = '';

        this.evaluateAll();

        this.refreshView();
    }

    rackItemsOf
    (
        row:
            StoringRow
    ):
        Option[]
    {
        return row.IsPlaced ? this.rackItemsPlaced : this.rackItemsBare;
    }


    //===========================================================
    // Add Products : by category / sub categories (the catalog is
    // loaded once per warehouse and type; filtered here)
    //===========================================================

    // Categories of the catalog (badge = products)
    private buildAddItems():
        void
    {
        const categories =
            new Map<number, { name:string; count:number }>();

        for
        (
            const p of this.catalog
        )
        {
            if
            (
                p.CategoryId > 0
            )
            {
                const old =
                    categories.get(p.CategoryId);

                categories.set(p.CategoryId, { name:old?.name || p.CategoryName || `Category ${p.CategoryId}`, count:(old?.count ?? 0) + 1 });
            }
        }

        this.addCategoryItems =
            [...categories.entries()]
                .sort((a, b) => naturalCompare(a[1].name, b[1].name))
                .map(([id, c]) => ({ label:c.name, value:id, count:String(c.count) }));

        if
        (
            this.addCategoryId && !categories.has(this.addCategoryId)
        )
        {
            this.addCategoryId = 0;

            this.addSubIds = [];
        }

        this.buildSubChips();
    }

    // Sub categories of the picked category (badge = products)
    private buildSubChips():
        void
    {
        const subs =
            new Map<number, { name:string; count:number }>();

        for
        (
            const p of this.catalog
        )
        {
            if
            (
                p.CategoryId === this.addCategoryId
            )
            {
                const old =
                    subs.get(p.SubCategoryId);

                subs.set(p.SubCategoryId, { name:old?.name || p.SubCategoryName || 'No sub category', count:(old?.count ?? 0) + 1 });
            }
        }

        this.addSubIds = this.addSubIds.filter(x => subs.has(x));

        this.addSubChips =
            [...subs.entries()]
                .sort((a, b) => naturalCompare(a[1].name, b[1].name))
                .map(([id, s]) => ({ id, label:s.name, count:s.count, on:this.addSubIds.includes(id) }));
    }

    onAddCategory
    (
        value:
            any
    ):
        void
    {
        this.addCategoryId = Number(value) || 0;

        this.addSubIds = [];

        this.addNote = '';

        this.buildSubChips();

        this.refreshView();
    }

    toggleAddSub
    (
        id:
            number
    ):
        void
    {
        this.addSubIds =
            this.addSubIds.includes(id)
                ? this.addSubIds.filter(x => x !== id)
                : [...this.addSubIds, id];

        this.buildSubChips();

        this.refreshView();
    }

    clearAddSubs():
        void
    {
        this.addSubIds = [];

        this.buildSubChips();

        this.refreshView();
    }

    // "All sub categories" / "Engine +2"
    get subSummary():
        string
    {
        const on =
            this.addSubChips.filter(x => x.on);

        return on.length
            ? on[0].label + (on.length > 1 ? ` +${on.length - 1}` : '')
            : (this.addCategoryId ? 'All sub categories' : 'Choose the category first');
    }

    // "Rack A · R-001 · … +2" / "Choose racks"
    get rackSummary():
        string
    {
        const on =
            this.allocChips.filter(x => x.on);

        return on.length
            ? on[0].label + (on.length > 1 ? ` +${on.length - 1}` : '')
            : 'Choose racks';
    }

    toggleMulti
    (
        name:
            'sub' | 'rack'
    ):
        void
    {
        this.multiOpen = this.multiOpen === name ? '' : name;

        this.refreshView();
    }

    // A click outside the open multi-select closes it
    @HostListener('document:click', ['$event'])
    onDocumentClick
    (
        event:
            MouseEvent
    ):
        void
    {
        const target =
            event.target as HTMLElement | null;

        if
        (
            this.multiOpen && !target?.closest?.('.ms-multi')
        )
        {
            this.multiOpen = '';

            this.refreshView();
        }
    }

    onAddWithoutStock
    (
        value:
            boolean
    ):
        void
    {
        this.addWithoutStock = !!value;

        this.refreshView();
    }

    onAddUnplacedOnly
    (
        value:
            boolean
    ):
        void
    {
        this.addUnplacedOnly = !!value;

        this.refreshView();
    }

    // Every matching product of the warehouse into the grid : one
    // group per sub category picked ("All sub categories" = one
    // group); products already on the grid stay as they are
    addProducts():
        void
    {
        if
        (
            !this.addCategoryId || this.gridLoading
        )
        {
            return;
        }

        const listed =
            new Set(this.rows.map(x => x.ProductId));

        const category =
            this.addCategoryItems.find(x => x.value === this.addCategoryId)?.label ?? '';

        const subs =
            this.addSubIds.length ? [...this.addSubIds] : [0];

        const added:
            StoringRow[] = [];

        const groups:
            AddGroup[] = [];

        for
        (
            const sub of subs
        )
        {
            const key =
                sub ? `c:${this.addCategoryId}:s:${sub}` : `c:${this.addCategoryId}:all`;

            const products =
                this.catalog.filter
                (
                    p =>
                        p.CategoryId === this.addCategoryId
                        && (!sub || p.SubCategoryId === sub)
                        && (this.addWithoutStock || p.Stock > 0)
                        && (!this.addUnplacedOnly || !p.IsPlaced)
                        && !listed.has(p.ProductId)
                );

            if
            (
                !products.length
            )
            {
                continue;
            }

            products.forEach(p => listed.add(p.ProductId));

            added.push(...products.map(p => this.toRow(p, key)));

            if
            (
                !this.groups.some(x => x.Key === key)
            )
            {
                groups.push
                ({
                    Key:key,
                    Label:`${category} › ${sub ? (this.addSubChips.find(x => x.id === sub)?.label ?? '') : 'All sub categories'}`,
                    Order:this.groups.length + groups.length
                });
            }
        }

        if
        (
            !added.length
        )
        {
            this.addTone = 'warn';

            this.addNote = 'Nothing new : every matching part is on the grid already (or none fits the switches).';

            this.refreshView();

            return;
        }

        this.groups = [...this.groups, ...groups];

        this.rows = [...this.rows, ...added];

        this.addTone = 'ok';

        this.addNote = `Added ${added.length} ${added.length === 1 ? 'part' : 'parts'}.`;

        this.evaluateAll();

        this.refreshView();
    }

    groupCount
    (
        key:
            string
    ):
        number
    {
        return this.rows.filter(x => x.GroupKey === key).length;
    }

    // ✕ / Clear all : asks inline first
    askRemoveGroup
    (
        key:
            string
    ):
        void
    {
        this.groupConfirm = this.groupConfirm === key ? '' : key;

        this.refreshView();
    }

    get confirmCount():
        number
    {
        return this.groupConfirm === '*' ? this.rows.length : this.groupCount(this.groupConfirm);
    }

    // The group's rows leave the grid : their bins are free again
    removeGroup():
        void
    {
        const key =
            this.groupConfirm;

        if
        (
            !key
        )
        {
            return;
        }

        const gone =
            new Set(this.rows.filter(x => key === '*' || x.GroupKey === key).map(x => x.ProductId));

        this.rows = this.rows.filter(x => !gone.has(x.ProductId));

        this.groups =
            key === '*'
                ? []
                : this.groups.filter(x => x.Key !== key);

        gone.forEach(id => { this.keptIds.delete(id); this.leftoverIds.delete(id); });

        this.leftoversOnly = this.leftoversOnly && this.leftoverIds.size > 0;

        this.groupConfirm = '';

        this.addNote = '';

        this.evaluateAll();

        this.refreshView();
    }


    //===========================================================
    // Allocate : Zone · Rack · Bin (only the grid changes; the
    // engine is rack-allocation.ts)
    //===========================================================

    // Zones of the warehouse's racks ("All zones" first)
    private buildAllocItems():
        void
    {
        const zones =
            this.zonesOf(this.racks);

        this.allocZoneItems = this.zoneItems(zones);

        this.ovZoneItems = this.allocZoneItems;

        if
        (
            this.allocZone && !zones.has(this.allocZone)
        )
        {
            this.allocZone = '';
        }

        if
        (
            this.ovZone && !zones.has(this.ovZone)
        )
        {
            this.ovZone = '';
        }

        const ids =
            new Set(this.racks.map(x => x.Id));

        this.allocRackIds = this.allocRackIds.filter(x => ids.has(x));

        if
        (
            !ids.has(this.binRackId)
        )
        {
            this.binRackId = 0;

            this.binShelfNo = 0;

            this.binBinNo = 0;
        }
    }

    // Zone code → label / priority of a set of racks
    private zonesOf
    (
        racks:
            MassStoringRack[]
    ):
        Map<string, { label:string; priority:number }>
    {
        const zones =
            new Map<string, { label:string; priority:number }>();

        for
        (
            const rack of racks
        )
        {
            if
            (
                rack.ZoneCode && !zones.has(rack.ZoneCode)
            )
            {
                zones.set(rack.ZoneCode, { label:rack.ZoneName ? `${rack.ZoneCode} · ${rack.ZoneName}` : rack.ZoneCode, priority:rack.ZonePriority || 999 });
            }
        }

        return zones;
    }

    // "All zones" + the zones in priority order
    private zoneItems
    (
        zones:
            Map<string, { label:string; priority:number }>
    ):
        Option[]
    {
        return [
            { label:'All zones', value:'' },
            ...[...zones.entries()]
                .sort((a, b) => (a[1].priority - b[1].priority) || a[0].localeCompare(b[0]))
                .map(([code, zone]) => ({ label:zone.label, value:code }))
        ];
    }

    // Live lists of the Allocate card (free bins in the final
    // state of the grid) : rack chips, Bin-mode dropdowns, zone
    // figures
    private buildAllocLists
    (
        state:
            ShelfState
    ):
        void
    {
        const free =
            new Map(this.racks.map(r => [r.Id, this.availableBins(r, 0, state)] as [number, { shelf:number; bin:number }[]]));

        this.allocChips =
            this.planRacks()
                .filter(r => r.IsActive)
                .map
                (
                    r =>
                    {
                        const count =
                            free.get(r.Id)?.length ?? 0;

                        return {
                            id:r.Id,
                            label:[r.Name, r.Code, r.ZoneCode].filter(x => !!x).join(' · ') + (count ? ` · ${count} free` : ' (Full)'),
                            title:r.IsGeneral ? 'General rack' : (r.AssignmentText || r.CategoryName || 'General rack'),
                            full:count === 0,
                            on:this.allocRackIds.includes(r.Id)
                        };
                    }
                );

        const zoneRacks =
            this.zoneRacks();

        this.zoneFree = zoneRacks.reduce((sum, r) => sum + (free.get(r.Id)?.length ?? 0), 0);

        this.zoneRackCount = zoneRacks.length;

        this.binRackItems =
            this.allocChips.map(x => ({ label:x.label, value:x.id, count:String(free.get(x.id)?.length ?? 0) }));

        const rack =
            this.rackById(this.binRackId);

        const bins =
            rack ? (free.get(rack.Id) ?? []) : [];

        this.binShelfItems =
            rack
                ? Array.from({ length:rack.ShelfCount }, (_, i) => i + 1)
                    .map
                    (
                        shelf =>
                        {
                            const count =
                                bins.filter(x => x.shelf === shelf).length;

                            const label =
                                this.shelfLabel(rack, shelf);

                            return { label:count ? label : `${label} (Full)`, value:shelf, count:String(count) };
                        }
                    )
                : [];

        this.binBinItems =
            rack && this.binShelfNo
                ? bins
                    .filter(x => x.shelf === this.binShelfNo)
                    .map(x => ({ label:rackBinCode(rack, x.shelf, x.bin), value:x.bin }))
                : [];
    }

    // The active racks of the chosen zone, in plan order
    private zoneRacks():
        MassStoringRack[]
    {
        return this.planRacks().filter(r => r.IsActive && (!this.allocZone || r.ZoneCode === this.allocZone));
    }

    // Racks in plan order : zone priority, letter
    private planRacks():
        MassStoringRack[]
    {
        return [...this.racks].sort
        (
            (a, b) =>
                ((a.ZonePriority || 999) - (b.ZonePriority || 999))
                || a.ZoneCode.localeCompare(b.ZoneCode)
                || naturalCompare(this.letterOf(a), this.letterOf(b))
                || a.Id - b.Id
        );
    }

    private letterOf
    (
        rack:
            MassStoringRack
    ):
        string
    {
        return rack.RackLetter || rackLetter(rack.Name) || rack.Code;
    }

    onAllocMode
    (
        value:
            any
    ):
        void
    {
        const mode =
            String(value ?? '');

        this.allocMode = mode === 'rack' || mode === 'bin' ? mode : 'zone';

        this.multiOpen = '';

        this.allocNote = '';

        this.refreshView();
    }

    onAllocZone
    (
        value:
            any
    ):
        void
    {
        this.allocZone = String(value ?? '');

        this.allocNote = '';

        this.buildAllocLists(this.shelfState());

        this.refreshView();
    }

    toggleAllocRack
    (
        id:
            number
    ):
        void
    {
        this.allocRackIds =
            this.allocRackIds.includes(id)
                ? this.allocRackIds.filter(x => x !== id)
                : [...this.allocRackIds, id];

        this.allocChips = this.allocChips.map(x => x.id === id ? { ...x, on:!x.on } : x);

        this.refreshView();
    }

    onFollowPlan
    (
        value:
            boolean
    ):
        void
    {
        this.followPlan = !!value;

        this.refreshView();
    }

    // Bin mode : the start bin (rack → shelf → bin; the first free
    // one is picked)
    onBinRack
    (
        value:
            any
    ):
        void
    {
        this.binRackId = Number(value) || 0;

        const rack =
            this.rackById(this.binRackId);

        const first =
            rack ? this.availableBins(rack, 0, this.shelfState())[0] : undefined;

        this.binShelfNo = first?.shelf ?? 0;

        this.binBinNo = first?.bin ?? 0;

        this.buildAllocLists(this.shelfState());

        this.refreshView();
    }

    onBinShelf
    (
        value:
            any
    ):
        void
    {
        this.binShelfNo = Number(value) || 0;

        const rack =
            this.rackById(this.binRackId);

        this.binBinNo =
            rack && this.binShelfNo
                ? (this.availableBins(rack, 0, this.shelfState(), this.binShelfNo)[0]?.bin ?? 0)
                : 0;

        this.buildAllocLists(this.shelfState());

        this.refreshView();
    }

    onBinBin
    (
        value:
            any
    ):
        void
    {
        this.binBinNo = Number(value) || 0;

        this.refreshView();
    }

    // Allocate's second row : what the chosen target holds
    get allocInfo():
        string
    {
        switch
        (
            this.allocMode
        )
        {
            case 'rack':
            {
                const free =
                    this.allocChips
                        .filter(x => x.on)
                        .reduce((sum, x) => sum + (Number(this.binRackItems.find(y => y.value === x.id)?.count) || 0), 0);

                return `${this.allocSelectedCount} of ${this.allocChips.length} racks · ${free} free bins`;
            }

            case 'bin':
                return 'Onward from the start bin, this rack only';

            default:
                return `${this.zoneRackCount} ${this.zoneRackCount === 1 ? 'rack' : 'racks'} · ${this.zoneFree} free bins`;
        }
    }

    get allocSelectedCount():
        number
    {
        return this.allocChips.filter(x => x.on).length;
    }

    get checkedCount():
        number
    {
        return this.rows.filter(x => x.Checked).length;
    }

    // The rows Allocate works on : the ticked ones (else every
    // row) with no new bin yet; Unplaced by hand and kept rows are
    // skipped
    private allocCandidates():
        StoringRow[]
    {
        const ticked =
            this.rows.some(x => x.Checked);

        return this.rows.filter
        (
            x =>
                (!ticked || x.Checked)
                && x.NewRackId === MASS_STORING_NO_CHANGE
                && !this.keptIds.has(x.ProductId)
        );
    }

    get allocReady():
        boolean
    {
        if
        (
            !this.rows.length || this.gridLoading
        )
        {
            return false;
        }

        switch
        (
            this.allocMode
        )
        {
            case 'rack':
                return this.allocRackIds.length > 0;

            case 'bin':
                return this.binRackId > 0 && this.binShelfNo > 0 && this.binBinNo > 0;

            default:
                return this.zoneRackCount > 0;
        }
    }

    private toPlanRack
    (
        rack:
            MassStoringRack
    ):
        PlanRack
    {
        return {
            Id:rack.Id,
            Letter:this.letterOf(rack),
            ZonePriority:rack.ZonePriority,
            IsActive:rack.IsActive,
            IsGeneral:rack.IsGeneral,
            CategoryId:rack.ProductCategoryId,
            SubCategoryIds:rack.SubCategoryIds,
            PrimeShelfFrom:rack.PrimeShelfFrom,
            PrimeShelfTo:rack.PrimeShelfTo,
            ShelfCount:rack.ShelfCount,
            Shelves:Array.from({ length:rack.ShelfCount }, (_, i) => ({ ShelfNo:i + 1, BinCount:shelfBinCount(rack, i + 1) }))
        };
    }

    private toPlanProduct
    (
        row:
            StoringRow,
        order:
            Map<string, number>
    ):
        PlanProduct
    {
        return {
            ProductId:row.ProductId,
            Code:row.Code,
            PartNumber:row.PartNumber,
            CategoryId:row.CategoryId,
            SubCategoryId:row.SubCategoryId,
            SubCategoryName:row.SubCategoryName,
            MovementRank:row.MovementRank || 5,
            Order:order.get(row.GroupKey) ?? 999,
            Current:row.IsPlaced ? { RackId:row.CurRackId, ShelfNo:row.CurShelfNo, BinNo:row.CurBinNo || 1 } : null
        };
    }

    // A bin for every candidate row. Already placed rows move (their
    // bins are released first); a placed row that does not fit
    // keeps its bin, which is then never given to another one
    allocate():
        void
    {
        if
        (
            !this.allocReady
        )
        {
            return;
        }

        const racks =
            this.allocMode === 'bin'
                ? this.racks.filter(r => r.Id === this.binRackId)
                : this.allocMode === 'rack'
                    ? this.planRacks().filter(r => r.IsActive && this.allocRackIds.includes(r.Id))
                    : this.zoneRacks();

        const plan =
            racks.map(r => this.toPlanRack(r));

        const order =
            new Map(this.groups.map(g => [g.Key, g.Order] as [string, number]));

        let candidates =
            this.allocCandidates();

        if
        (
            !candidates.length
        )
        {
            this.note('warn', 'Every row has a new bin already (or is kept / Unplaced) : Reset allocation to start again.');

            return;
        }

        const kept =
            new Set<string>();

        let result:
            PlanResult | null = null;

        for
        (
            let round = 0;
            round < 50;
            round++
        )
        {
            const state =
                this.shelfState();

            const leaving =
                new Set(state.leaving);

            candidates.filter(x => x.IsPlaced).forEach(x => leaving.add(x.ProductId));

            const targets =
                new Set([...state.targets.entries()].filter(x => x[1] > 0).map(x => x[0]));

            kept.forEach(x => targets.add(x));

            result =
                allocateByPlan
                ({
                    racks:plan,
                    products:candidates.map(x => this.toPlanProduct(x, order)),
                    mode:this.allocMode === 'bin' ? 'start' : (this.followPlan ? 'plan' : 'order'),
                    start:this.allocMode === 'bin' ? { RackId:this.binRackId, ShelfNo:this.binShelfNo, BinNo:this.binBinNo } : null,
                    blocked:blockedBins(plan, this.holders, leaving, targets)
                });

            const given =
                new Set(result.assignments.map(a => planKey(a.Place.RackId, a.Place.ShelfNo, a.Place.BinNo)));

            const stuck =
                result.leftovers
                    .map(l => candidates.find(x => x.ProductId === l.ProductId))
                    .filter((x): x is StoringRow => !!x && x.IsPlaced && given.has(planKey(x.CurRackId, x.CurShelfNo, x.CurBinNo || 1)));

            if
            (
                !stuck.length
            )
            {
                break;
            }

            stuck.forEach(x => kept.add(planKey(x.CurRackId, x.CurShelfNo, x.CurBinNo || 1)));

            const out =
                new Set(stuck.map(x => x.ProductId));

            candidates = candidates.filter(x => !out.has(x.ProductId));
        }

        if
        (
            !result
        )
        {
            return;
        }

        const byProduct =
            new Map(result.assignments.map(a => [a.ProductId, a] as [number, PlanAssignment]));

        this.rows =
            this.rows.map
            (
                x =>
                {
                    const a =
                        byProduct.get(x.ProductId);

                    return a && !a.Kept
                        ? { ...x, NewRackId:a.Place.RackId, NewShelfNo:a.Place.ShelfNo, NewBinNo:a.Place.BinNo, Checked:false }
                        : (a ? { ...x, Checked:false } : x);
                }
            );

        result.assignments.filter(a => a.Kept).forEach(a => this.keptIds.add(a.ProductId));

        this.leftoverIds = new Set(result.leftovers.map(x => x.ProductId));

        this.leftoversOnly = false;

        this.evaluateAll();

        const left =
            result.leftovers.length;

        const noRack =
            result.leftovers.filter(x => x.NoRack).length;

        this.note
        (
            left > 0 ? 'warn' : 'ok',
            `Allocated ${result.placedCount + result.movedCount} · kept ${result.keptCount}`
                + (left ? ` · ${left} left : ${noRack === left ? 'no rack of the plan fits' : 'no free bin'}` : '')
                + (noRack && noRack < left ? ` (${noRack} fit no rack of the plan)` : '')
                + '.'
        );
    }

    // Reset allocation : the new rack / shelf / bin of the ticked
    // rows (else the rows shown) cleared, so Allocate can run
    // again. Rows set to Unplaced by hand stay.
    resetAllocation():
        void
    {
        const ticked =
            this.rows.some(x => x.Checked);

        const scope =
            new Set((ticked ? this.rows.filter(x => x.Checked) : this.shownRows).map(x => x.ProductId));

        this.rows =
            this.rows.map
            (
                x =>
                    scope.has(x.ProductId) && x.NewRackId > 0
                        ? { ...x, NewRackId:MASS_STORING_NO_CHANGE, NewShelfNo:0, NewBinNo:0 }
                        : x
            );

        scope.forEach(id => { this.keptIds.delete(id); this.leftoverIds.delete(id); });

        this.leftoversOnly = false;

        this.allocNote = '';

        this.evaluateAll();

        this.refreshView();
    }

    private note
    (
        tone:
            'ok' | 'warn',
        text:
            string
    ):
        void
    {
        this.allocTone = tone;

        this.allocNote = text;

        this.refreshView();
    }

    // "Show left" : the grid shows only the rows the last Allocate
    // could not place
    showLeftovers
    (
        on:
            boolean
    ):
        void
    {
        this.leftoversOnly = on && this.leftoverIds.size > 0;

        this.applyFilters();

        this.refreshView();
    }

    get allocatedCount():
        number
    {
        return this.rows.filter(x => x.Changed && x.NewRackId > 0).length;
    }

    // Rows the last Allocate left that still have no new bin
    get leftCount():
        number
    {
        return this.rows.filter(x => this.leftoverIds.has(x.ProductId) && x.NewRackId === MASS_STORING_NO_CHANGE).length;
    }


    //===========================================================
    // Rack Overview : the warehouse's racks as cards, bins
    // coloured by sub category / movement / change (replaces the
    // page area under the header; nothing is a pop-up)
    //===========================================================

    get canOverview():
        boolean
    {
        return this.isView ? !!this.doc : this.racks.length > 0;
    }

    openOverview():
        void
    {
        if
        (
            !this.canOverview
        )
        {
            return;
        }

        this.overviewOpen = true;

        this.ovHover = null;

        this.ovError = '';

        // View : the warehouse's current map is loaded once
        if
        (
            this.isView && this.doc && !this.ovPlaces
        )
        {
            const doc =
                this.doc;

            this.ovBusy = true;

            this.refreshView();

            this.service
                .getPlaces(doc.PageType, doc.WarehouseId)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe
                ({
                    next:
                        places =>
                        {
                            this.ovBusy = false;

                            this.ovPlaces = places;

                            this.ovZoneItems = this.zoneItems(this.zonesOf(places.Racks));

                            this.buildOverview();

                            this.refreshAll();
                        },
                    error:
                        err =>
                        {
                            this.ovBusy = false;

                            this.ovError = errorText(err, 'The racks of the warehouse could not be loaded.');

                            this.refreshAll();
                        }
                });

            return;
        }

        this.buildOverview();

        this.refreshView();
    }

    closeOverview():
        void
    {
        this.overviewOpen = false;

        this.ovHover = null;

        this.refreshView();
    }

    onOvColor
    (
        value:
            any
    ):
        void
    {
        const next =
            String(value ?? '');

        this.ovColor = next === 'move' || next === 'change' ? next : 'sub';

        this.buildOverview();

        this.refreshView();
    }

    onOvZone
    (
        value:
            any
    ):
        void
    {
        this.ovZone = String(value ?? '');

        this.buildOverview();

        this.refreshView();
    }

    onOvChangedOnly
    (
        value:
            boolean
    ):
        void
    {
        this.ovChangedOnly = !!value;

        this.buildOverview();

        this.refreshView();
    }

    onOvSearch
    (
        value:
            string | number
    ):
        void
    {
        this.ovSearch = String(value ?? '');

        this.buildOverview();

        this.refreshView();
    }

    onOvHover
    (
        cell:
            OvCell | null
    ):
        void
    {
        if
        (
            this.ovHover === cell
        )
        {
            return;
        }

        this.ovHover = cell;

        this.refreshView();
    }

    // Post from the canvas : the page's own Post (same rules and
    // progress)
    get ovCanPost():
        boolean
    {
        return this.command2Kind === 'post' && !this.saving;
    }

    ovPost():
        void
    {
        if
        (
            this.ovCanPost
        )
        {
            this.onCommand2();
        }
    }

    // The moves shown : Add / Edit = the valid changed rows; View =
    // the document's lines
    private ovMoves():
        OvMove[]
    {
        if
        (
            this.isView
        )
        {
            return (this.doc?.Lines ?? []).map
            (
                line =>
                ({
                    ProductId:line.ProductId,
                    From:line.FromRackId ? planKey(line.FromRackId, line.FromShelfNo ?? 0, line.FromBinNo || 1) : null,
                    To:!line.IsClear && line.ToRackId ? planKey(line.ToRackId, line.ToShelfNo ?? 0, line.ToBinNo || 1) : null,
                    FromText:storingLocationText(line.FromRackName, line.FromShelfNo, line.FromBinNo, line.FromBinCode),
                    ToText:line.IsClear ? '' : storingLocationText(line.ToRackName, line.ToShelfNo, line.ToBinNo, line.ToBinCode)
                })
            );
        }

        return this.rows
            .filter(x => x.Changed)
            .map
            (
                x =>
                ({
                    ProductId:x.ProductId,
                    From:x.IsPlaced ? planKey(x.CurRackId, x.CurShelfNo, x.CurBinNo || 1) : null,
                    To:x.NewRackId > 0 ? planKey(x.NewRackId, x.NewShelfNo, x.NewBinNo || 1) : null,
                    FromText:x.CurText,
                    ToText:x.NewRackId > 0 ? x.NewText : ''
                })
            );
    }

    // Own products : what the grid / the document knows of them
    private ovInfo
    (
        racks:
            MassStoringRack[]
    ):
        Map<number, OvItem>
    {
        const info =
            new Map<number, OvItem>();

        for
        (
            const rack of racks
        )
        {
            for
            (
                const shelf of rack.Shelves
            )
            {
                for
                (
                    const bin of shelf.Bins
                )
                {
                    if
                    (
                        !bin.IsFree && bin.IsOwnType && bin.HeldById > 0
                    )
                    {
                        info.set(bin.HeldById, this.binItem(bin));
                    }
                }
            }
        }

        for
        (
            const row of this.rows
        )
        {
            const was =
                info.get(row.ProductId);

            info.set
            (
                row.ProductId,
                {
                    Own:true,
                    ProductId:row.ProductId,
                    Code:row.Code,
                    Name:row.Name,
                    PartNumber:row.PartNumber || was?.PartNumber || '',
                    SubId:row.SubCategoryId || was?.SubId || 0,
                    SubName:row.SubCategoryName || was?.SubName || '',
                    Movement:row.SubCategoryId ? row.MovementClass : (was?.Movement || row.MovementClass),
                    Stock:row.Stock
                }
            );
        }

        for
        (
            const line of this.doc?.Lines ?? []
        )
        {
            const was =
                info.get(line.ProductId);

            info.set
            (
                line.ProductId,
                {
                    Own:true,
                    ProductId:line.ProductId,
                    Code:line.ProductCode,
                    Name:line.ProductName,
                    PartNumber:line.PartNumber || was?.PartNumber || '',
                    SubId:was?.SubId ?? 0,
                    SubName:was?.SubName ?? '',
                    Movement:was?.Movement || DEFAULT_MOVEMENT_CLASS,
                    Stock:was ? was.Stock : line.StockQuantity
                }
            );
        }

        return info;
    }

    private binItem
    (
        bin:
            MassStoringBin
    ):
        OvItem
    {
        return {
            Own:bin.IsOwnType,
            ProductId:bin.HeldById,
            Code:bin.HeldByCode,
            Name:bin.HeldByName,
            PartNumber:bin.HeldByPartNumber,
            SubId:bin.HeldBySubCategoryId,
            SubName:bin.HeldBySubCategoryName,
            Movement:bin.HeldByMovementClass || DEFAULT_MOVEMENT_CLASS,
            Stock:bin.HeldByStock
        };
    }

    private buildOverview():
        void
    {
        const racks =
            this.isView ? (this.ovPlaces?.Racks ?? []) : this.racks;

        const info =
            this.ovInfo(racks);

        const moves =
            this.doc?.Status === 'Cancelled' && this.isView ? [] : this.ovMoves();

        const moveOf =
            new Map(moves.map(m => [m.ProductId, m] as [number, OvMove]));

        // The map now (bins with their holder)
        const now =
            new Map<string, OvItem>();

        for
        (
            const rack of racks
        )
        {
            for
            (
                const shelf of rack.Shelves
            )
            {
                for
                (
                    const bin of shelf.Bins
                )
                {
                    if
                    (
                        !bin.IsFree
                    )
                    {
                        const item =
                            this.binItem(bin);

                        now.set(planKey(rack.Id, shelf.ShelfNo, bin.BinNo), item.Own ? (info.get(item.ProductId) ?? item) : item);
                    }
                }
            }
        }

        // Before / after : a posted document is already on the map
        // (its lines are put back for "before"); else the moves go
        // on top of the map
        const posted =
            this.isView && this.doc?.Status === 'Posted';

        const before =
            new Map(now);

        if
        (
            posted
        )
        {
            moves.forEach(m => { if (m.To && before.get(m.To)?.ProductId === m.ProductId && before.get(m.To)?.Own) { before.delete(m.To); } });

            moves.forEach(m => { const item = info.get(m.ProductId); if (m.From && item) { before.set(m.From, item); } });
        }

        const after =
            new Map(before);

        moves.forEach(m => { if (m.From && after.get(m.From)?.Own && after.get(m.From)?.ProductId === m.ProductId) { after.delete(m.From); } });

        moves.forEach(m => { const item = info.get(m.ProductId); if (m.To && item) { after.set(m.To, item); } });

        const words =
            this.ovSearch.trim().toLowerCase().split(/\s+/).filter(x => !!x);

        const legend =
            new Map<string, OvLegend>();

        const stats =
            { placed:0, moved:0, cleared:0, free:0 };

        moves.forEach(m => { if (!m.To) { stats.cleared++; } else if (m.From) { stats.moved++; } else { stats.placed++; } });

        let hits =
            0;

        const cards:
            OvRack[] = [];

        const ordered =
            [...racks].sort
            (
                (a, b) =>
                    ((a.ZonePriority || 999) - (b.ZonePriority || 999))
                    || a.ZoneCode.localeCompare(b.ZoneCode)
                    || naturalCompare(this.letterOf(a), this.letterOf(b))
                    || a.Id - b.Id
            );

        for
        (
            const rack of ordered
        )
        {
            if
            (
                this.ovZone && rack.ZoneCode !== this.ovZone
            )
            {
                continue;
            }

            let used =
                0;

            let total =
                0;

            let changed =
                false;

            const shelves:
                OvShelf[] = [];

            for
            (
                let shelfNo = 1;
                shelfNo <= rack.ShelfCount;
                shelfNo++
            )
            {
                const shelf =
                    rack.Shelves.find(x => x.ShelfNo === shelfNo);

                const count =
                    shelfBinCount(rack, shelfNo);

                const cells:
                    OvCell[] = [];

                for
                (
                    let binNo = 1;
                    binNo <= count;
                    binNo++
                )
                {
                    const key =
                        planKey(rack.Id, shelfNo, binNo);

                    const item =
                        after.get(key) ?? null;

                    const was =
                        before.get(key) ?? null;

                    let state:
                        OvState = 'free';

                    let move:
                        OvMove | undefined;

                    if
                    (
                        item
                    )
                    {
                        move = item.Own ? moveOf.get(item.ProductId) : undefined;

                        state = move && move.To === key ? (move.From ? 'moved' : 'new') : 'same';
                    }
                    else if
                    (
                        was && was.Own && moveOf.has(was.ProductId)
                    )
                    {
                        move = moveOf.get(was.ProductId);

                        state = move?.To ? 'vacated' : 'cleared';
                    }

                    total++;

                    if
                    (
                        item
                    )
                    {
                        used++;
                    }
                    else
                    {
                        stats.free++;
                    }

                    if
                    (
                        state !== 'same' && state !== 'free'
                    )
                    {
                        changed = true;
                    }

                    const shown =
                        item ?? (state === 'vacated' || state === 'cleared' ? was : null);

                    const hit =
                        !!shown && words.length > 0
                        && words.every(w => `${shown.Code} ${shown.Name} ${shown.PartNumber}`.toLowerCase().includes(w));

                    if
                    (
                        hit
                    )
                    {
                        hits++;
                    }

                    const color =
                        this.ovColorOf(item, state);

                    if
                    (
                        item || this.ovColor === 'change'
                    )
                    {
                        const entry =
                            this.ovLegendOf(item, state, color);

                        if
                        (
                            entry
                        )
                        {
                            const old =
                                legend.get(entry.key);

                            legend.set(entry.key, old ? { ...old, count:old.count + 1 } : entry);
                        }
                    }

                    cells.push
                    ({
                        Key:key,
                        RackName:rack.Name,
                        Code:rackBinCode(rack, shelfNo, binNo),
                        Item:shown,
                        Other:!!item && !item.Own,
                        State:state,
                        Color:color,
                        Label:item ? shortCode(item.Code) : '',
                        Hit:hit,
                        FromText:move?.FromText ?? '',
                        ToText:move ? (move.To ? move.ToText : 'Unplaced') : ''
                    });
                }

                shelves.push
                ({
                    ShelfNo:shelfNo,
                    Label:shelf?.Label || shelfLabel(rack.Name, shelfNo),
                    Prime:!!shelf?.IsPrime || (!!rack.PrimeShelfFrom && !!rack.PrimeShelfTo && shelfNo >= rack.PrimeShelfFrom && shelfNo <= rack.PrimeShelfTo),
                    Narrow:count > 8,
                    Cells:cells
                });
            }

            if
            (
                this.ovChangedOnly && !changed
            )
            {
                continue;
            }

            cards.push
            ({
                Id:rack.Id,
                Name:rack.Name || rack.Code,
                Code:rack.Code,
                Zone:rack.ZoneCode ? `${rack.ZoneCode}${rack.ZoneName ? ' · ' + rack.ZoneName : ''}` : '',
                Assignment:rack.IsGeneral ? 'General' : (rack.AssignmentText || rack.CategoryName || 'General'),
                Used:used,
                Total:total,
                Prime:rack.PrimeShelfFrom && rack.PrimeShelfTo
                    ? `${shelfLabel(rack.Name, rack.PrimeShelfFrom)} – ${shelfLabel(rack.Name, rack.PrimeShelfTo)}`
                    : '',
                Inactive:!rack.IsActive,
                Changed:changed,
                Shelves:shelves
            });
        }

        this.ovRacks = cards;

        this.ovHits = hits;

        this.ovLegend =
            [...legend.values()].sort((a, b) => (a.order - b.order) || naturalCompare(a.label, b.label));

        this.ovStats =
            [
                { label:'Placed', value:String(stats.placed), tone:'ok' },
                { label:'Moved', value:String(stats.moved), tone:'info' },
                { label:'Cleared', value:String(stats.cleared), tone:'warn' },
                { label:'Kept', value:this.isView ? '—' : String(this.keptIds.size), tone:'' },
                { label:'Free Bins Left', value:String(stats.free), tone:'' },
                { label:'Leftovers', value:this.isView ? '—' : String(this.leftoverIds.size), tone:this.leftoverIds.size ? 'warn' : '' },
                { label:'Racks Shown', value:`${cards.length} of ${racks.length}`, tone:'' }
            ];

        if
        (
            this.ovHover
        )
        {
            const key =
                this.ovHover.Key;

            this.ovHover = null;

            for (const card of cards) { for (const shelf of card.Shelves) { const cell = shelf.Cells.find(x => x.Key === key); if (cell) { this.ovHover = cell; } } }
        }
    }

    // The fill of a bin by the colour switch
    private ovColorOf
    (
        item:
            OvItem | null,
        state:
            OvState
    ):
        string
    {
        if
        (
            this.ovColor === 'change'
        )
        {
            return CHANGE_COLORS[state];
        }

        if
        (
            !item
        )
        {
            return '';
        }

        if
        (
            !item.Own
        )
        {
            return '#94a3b8';
        }

        return this.ovColor === 'move'
            ? movementClassInfo(item.Movement).color
            : subColor(item.SubId);
    }

    private ovLegendOf
    (
        item:
            OvItem | null,
        state:
            OvState,
        color:
            string
    ):
        OvLegend | null
    {
        if
        (
            this.ovColor === 'change'
        )
        {
            return { key:state, label:CHANGE_LABELS[state], color, count:1, order:CHANGE_ORDER.indexOf(state) };
        }

        if
        (
            !item
        )
        {
            return null;
        }

        if
        (
            !item.Own
        )
        {
            return { key:'other', label:this.type === 'AC' ? 'Spare parts (other type)' : 'Accessories (other type)', color, count:1, order:99 };
        }

        if
        (
            this.ovColor === 'move'
        )
        {
            const move =
                movementClassInfo(item.Movement);

            return { key:move.value, label:move.label, color, count:1, order:move.rank };
        }

        return { key:`sub-${item.SubId}`, label:item.SubName || 'No sub category', color, count:1, order:item.SubId ? 1 : 2 };
    }

    // Shelf map print (landscape) : what the canvas shows
    ovPrint():
        void
    {
        const token =
            saveRackMapPrintRequest
            ({
                Title:`Rack Overview · ${this.info.title}`,
                Type:this.info.title,
                Number:this.numberText,
                Date:this.isView ? this.date(this.doc?.StoringDate ?? '') : formatStoringDate(toStoringIso(this.storingDate)),
                Warehouse:this.warehouseText,
                Status:this.statusText,
                ColorBy:this.ovColorSegments.find(x => x.value === this.ovColor)?.text ?? '',
                Legend:this.ovLegend.map(x => ({ Label:x.label, Color:x.color, Count:x.count })),
                Summary:this.ovStats.map(x => ({ Label:x.label, Value:x.value })),
                Racks:this.ovRacks.map
                (
                    rack =>
                    ({
                        Title:`${rack.Name}${rack.Code ? ' · ' + rack.Code : ''}`,
                        Zone:rack.Zone,
                        Assignment:rack.Assignment,
                        Used:rack.Used,
                        Total:rack.Total,
                        Prime:rack.Prime,
                        Shelves:rack.Shelves.map
                        (
                            shelf =>
                            ({
                                Label:shelf.Label,
                                Prime:shelf.Prime,
                                Cells:shelf.Cells.map(cell => ({ Code:cell.Code, Item:cell.Item ? cell.Item.Code : '', Color:cell.Color, State:cell.State, Other:cell.Other }))
                            })
                        )
                    })
                )
            });

        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(
                    ['/print-viewer', MASS_STORING_RACK_MAP_PRINT_KEY, token],
                    { queryParams:{ doc:'rack-map', orient:'landscape' } }
                )
            );

        const tab =
            window.open(url, '_blank');

        if
        (
            !tab
        )
        {
            this.ovError = 'The browser blocked the print tab. Allow pop-ups for this site.';

            this.refreshView();
        }
    }

    ovStateText
    (
        state:
            OvState
    ):
        string
    {
        return CHANGE_LABELS[state];
    }

    movementLabel
    (
        value:
            string
    ):
        string
    {
        return movementClassInfo(value).label;
    }

    movementColor
    (
        value:
            string
    ):
        string
    {
        return movementClassInfo(value).color;
    }

    movementShort
    (
        value:
            string
    ):
        string
    {
        return movementClassInfo(value).short;
    }


    //===========================================================
    // Counters
    //===========================================================

    get changeCount():
        number
    {
        return this.rows.filter(x => x.Changed).length;
    }

    get problemCount():
        number
    {
        return this.rows.filter(x => !!x.Problem).length;
    }

    // Changed rows the filters hide (still saved)
    get hiddenChangeCount():
        number
    {
        const shown =
            new Set(this.shownRows.map(x => x.ProductId));

        return this.rows.filter(x => x.Changed && !shown.has(x.ProductId)).length;
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
            !this.warehouseId
        )
        {
            return 'Choose the warehouse.';
        }

        const bad =
            this.rows.find(x => !!x.Problem);

        if
        (
            bad
        )
        {
            return `${bad.Code || bad.Name} : ${bad.Problem}.`;
        }

        if
        (
            !this.changeCount
        )
        {
            return 'Change at least one location (a new rack, shelf and bin, or Unplaced).';
        }

        return '';
    }

    private payload():
        CreateMassStoring
    {
        return {
            Type:this.type,
            StoringDate:toStoringIso(this.storingDate),
            WarehouseId:this.warehouseId,
            Remarks:win1252Safe(this.remarks.trim()),
            Lines:this.rows
                .filter(x => x.Changed)
                .map
                (
                    x =>
                    ({
                        ProductId:x.ProductId,
                        ToRackId:x.NewRackId > 0 ? x.NewRackId : null,
                        ToShelfNo:x.NewRackId > 0 && x.NewShelfNo > 0 ? x.NewShelfNo : null,
                        ToBinNo:x.NewRackId > 0 && x.NewShelfNo > 0 && x.NewBinNo > 0 ? x.NewBinNo : null,
                        Notes:win1252Safe(x.Notes)
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
                updating ? 'Updating Mass Storing' : 'Saving Mass Storing',
                updating ? `Please wait while "${this.numberText}" is being updated...` : 'Please wait while the mass storing is being saved...',
                updating ? 'Mass storing updated.' : 'Mass storing saved.',
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

                        this.error = errorText(err, 'The mass storing could not be saved.');

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
                'Posting Mass Storing',
                'Please wait while every location is applied in the warehouse...',
                'Mass storing posted.',
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
                            errorText(err, 'The mass storing could not be posted.')
                            + (saved > 0 ? ' It is saved as a draft : Save or Post again updates that draft.' : '');

                        this.refreshAll();
                    }
            });
    }

    // View of a draft : post it as saved (the server re-reads every
    // product's location)
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

        this.saving = true;

        this.error = '';

        this.progress
            .run(
                'Posting Mass Storing',
                `Please wait while "${doc.StoringNo}" is being posted...`,
                'Mass storing posted.',
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

                        this.error = errorText(err, 'The mass storing could not be posted.') + ' Open it for editing to fix it.';

                        this.refreshAll();
                    }
            });
    }

    // Every change undone (the grid stays)
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

        this.rows =
            this.rows
                .filter(x => !x.Extra)
                .map(x => ({ ...x, NewRackId:MASS_STORING_NO_CHANGE, NewShelfNo:0, NewBinNo:0, Notes:'', Checked:false }));

        this.remarks = '';

        this.error = '';

        this.allocNote = '';

        this.keptIds = new Set<number>();

        this.leftoverIds = new Set<number>();

        this.leftoversOnly = false;

        const today =
            fromStoringIso(this.defaults?.Today ?? '');

        if
        (
            today
        )
        {
            this.storingDate = today;
        }

        this.evaluateAll();

        this.refreshView();
    }


    //===========================================================
    // Delete (edit of a draft; inline confirmation)
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
                'Deleting Mass Storing',
                `Please wait while "${doc.StoringNo}" is being deleted...`,
                'Mass storing deleted.',
                this.service.delete(doc.PublicId ?? ''))
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
    // View : print, cancel (inline reason)
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
                this.router.createUrlTree(['/print-viewer', MASS_STORING_PRINT_KEY, this.doc.PublicId])
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

    get canCancel():
        boolean
    {
        return this.isView && !this.doc?.IsDeleted && this.doc?.Status === 'Posted';
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
            this.cancelError = 'Write why the mass storing is cancelled (at least 5 characters).';

            this.refreshView();

            return;
        }

        this.saving = true;

        this.error = '';

        this.progress
            .run(
                'Cancelling Mass Storing',
                `Please wait while "${doc.StoringNo}" puts the previous locations back...`,
                'Mass storing cancelled.',
                this.service.cancel(doc.Id, win1252Safe(this.cancelReason.trim())))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.saving = false;

                        this.cancelOpen = false;

                        this.back();
                    },
                error:
                    err =>
                    {
                        this.saving = false;

                        this.cancelError = errorText(err, 'The mass storing could not be cancelled.');

                        this.refreshAll();
                    }
            });
    }

    back():
        void
    {
        this.router.navigate([MASS_STORING_ROUTE, 'list']);
    }


    //===========================================================
    // Command center (three buttons, by mode and status)
    //
    //   Add        : Save · Post · Clear
    //   Edit       : Update · Post · Delete
    //   View draft : Print · Post
    //   Posted     : Print · Cancel
    //   Cancelled  : Print
    //===========================================================

    // post / cancel / ''
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

        return this.canCancel ? 'cancel' : '';
    }

    get command2Text():
        string
    {
        return this.command2Kind === 'cancel' ? 'Cancel' : 'Post';
    }

    get command2Icon():
        string
    {
        return this.command2Kind === 'cancel' ? 'fas fa-ban' : 'fas fa-check-double';
    }

    get command2Activity():
        string
    {
        return this.command2Kind === 'cancel' ? 'Cancel' : 'Post';
    }

    get command2Title():
        string
    {
        return this.command2Kind === 'cancel'
            ? 'Cancel : every product goes back to its previous location'
            : 'Post : every change is applied in the warehouse at once';
    }

    onCommand2():
        void
    {
        switch
        (
            this.command2Kind
        )
        {
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

    // clear / delete / ''
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

        return this.mode === 'edit' ? 'delete' : '';
    }

    onCommand3():
        void
    {
        if
        (
            this.command3Kind === 'delete'
        )
        {
            this.openDelete();
        }
        else if
        (
            this.command3Kind === 'clear'
        )
        {
            this.clear();
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
                return 'Add Mass Storing';

            case 'edit':
                return 'Edit Mass Storing';

            default:
                return 'View Mass Storing';
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
        return massStoringStatusNote(this.doc?.Status ?? '');
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
        return formatStoringDate(iso);
    }

    qty
    (
        value:
            number
    ):
        string
    {
        return formatStoringQty(value);
    }
}


//===============================================================
// Helpers
//===============================================================

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
