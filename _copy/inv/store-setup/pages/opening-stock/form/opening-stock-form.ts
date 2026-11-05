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
    Observable,
    Subscription,
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
    CheckboxComponent
}
from '../../../../../../shared/components/utilities/checkbox/checkbox';

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
    AuthenticationStorageService
}
from '../../../../../../core/authentication/authentication-storage.service';

import
{
    CreateOpeningStock,
    OPENING_STOCK_PRINT_KEY,
    OPENING_STOCK_ROUTE,
    OPENING_STOCK_TYPES,
    OpeningStock,
    OpeningStockDefaults,
    OpeningStockLine,
    OpeningStockProduct,
    OpeningStockRack,
    OpeningStockSaved,
    OpeningStockTypeInfo,
    OpeningStockUnit,
    costFromMrp,
    formatOpeningCost,
    formatOpeningDate,
    formatOpeningMoney,
    formatOpeningQty,
    fromIsoDate,
    openingStockType,
    toIsoDate,
    vatRuleOn
}
from '../../../models/opening-stock.model';

import
{
    OpeningStockService
}
from '../../../services/opening-stock.service';

import
{
    RackManagementService
}
from '../../../../../settings/product-settings/services/rack-management.service';

import
{
    BinMapRack,
    binItemType,
    binKey,
    mapBinCount,
    mapBinFree,
    mapBinItems,
    mapFirstFree,
    mapFreeBins,
    mapRack,
    mapRackFreeCount,
    mapShelfItems
}
from '../../../../../../shared/inventory/bin-availability';

import
{
    binCode
}
from '../../../../../../shared/inventory/storage-labels';


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

interface UnitRow
{
    ChassisNo:string;
    EngineNo:string;
    KeyNo:string;
    BatteryNo:string;
}

// One product of the document (Opening Summary, right)
interface FormLine
{
    ProductId:number;
    ProductCode:string;
    ProductName:string;
    Unit:string;
    HasLedger:boolean;
    Quantity:number;
    // Excl. VAT (MRP basis : from MRP less margin)
    UnitCost:number;
    // Incl. VAT (= UnitCost when no VAT is carried)
    GrossCost:number;
    // VAT inclusive : MRP is the sale price
    Mrp:number;
    MarginPercent:number;
    RackId:number | null;
    Shelf:number;
    // The bin (the location)
    Bin:number;
    SaveDefault:boolean;
    Notes:string;
    Units:UnitRow[];
}

// Unit Desk (MB) : a working copy; Save writes it back
interface Desk
{
    line:FormLine | null;
    name:string;
    code:string;
    readonly:boolean;
    keys:boolean;
    fields:UnitField[];
    rows:UnitRow[];
}

type UnitField =
    'ChassisNo' | 'EngineNo' | 'KeyNo' | 'BatteryNo';

// Excel import : the rows read, the problems found
interface ImportResult
{
    lines:FormLine[];
    rows:number;
    errors:string[];
}


//===============================================================
// Opening Stock form. Same layout as the Purchase page :
//
//   LEFT  : Opening Information (No, Date, Product Type,
//           Warehouse, Credit Ledger); Add <item> : product,
//           quantity, unit cost, MRP, rack · shelf (SP /
//           AC), notes. Add loads it into the summary on the
//           right (MB : the bikes button on the line opens the
//           Unit Desk for their numbers).
//   RIGHT : Excel Import, Remarks; Opening Summary (double-click
//           a line to edit it).
//
//   Save keeps a draft (numbered on the first save); Post saves
//   and posts : the stock is on hand and the journal is made
//   (Dr Inventory / Cr the credit ledger). A draft can be
//   deleted; a posted one cancelled while untouched.
//===============================================================

@Component(
{
    selector:'app-opening-stock-form',

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
        CheckboxComponent,
        ToastComponent,
        OrbitLoaderComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./opening-stock-form.html',

    styleUrl:'./opening-stock-form.css'
})

export class OpeningStockForm
    implements OnInit
{
    private readonly service =
        inject(OpeningStockService);

    // The warehouse's rack map (free / held bins)
    private readonly rackService =
        inject(RackManagementService);

    private binMap:
        BinMapRack[] = [];

    // The warehouse the map belongs to (0 = none loaded)
    private binMapOf:
        number = 0;

    private binCall:
        number = 0;

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly toast =
        inject(ToastService);

    private readonly authStorage =
        inject(AuthenticationStorageService);

    // Progress dialog around save / post / delete / cancel
    private readonly progress =
        new ProgressRunner(inject(ProgressDialogService), () => this.refreshView());

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly destroyRef =
        inject(DestroyRef);

    //===========================================================
    // State
    //===========================================================

    // add / edit (draft) / view (posted, cancelled)
    mode:
        'add' | 'edit' | 'view' = 'add';

    loading:
        boolean = false;

    saving:
        boolean = false;

    error:
        string = '';

    defaults:
        OpeningStockDefaults | null = null;

    // The saved document (edit / view)
    doc:
        OpeningStock | null = null;

    //===========================================================
    // Header
    //===========================================================

    type:
        string = 'MB';

    info:
        OpeningStockTypeInfo = OPENING_STOCK_TYPES[0];

    openingDate:
        Date = new Date();

    // The receiving branch (its code is in the number)
    branchId:
        number = 0;

    warehouseId:
        number = 0;

    // Cost (typed, excl. VAT) / MRP (SP / AC : MRP less margin)
    costBasis:
        'Cost' | 'MRP' = 'Cost';

    ledgerCode:
        string = '';

    remarks:
        string = '';

    lines:
        FormLine[] = [];

    // Items built once per change (not getters)
    readonly typeItems:
        Option[] =
        OPENING_STOCK_TYPES.map(x => ({ label:x.title, value:x.type }));

    branchItems:
        Option[] = [];

    warehouseItems:
        Option[] = [];

    readonly costBasisItems:
        Option[] =
        [
            { label:'Unit Cost (typed)', value:'Cost' },
            { label:'MRP less Margin %', value:'MRP' }
        ];

    ledgerItems:
        Option[] = [];

    rackItems:
        Option[] = [];

    shelfItems:
        Option[] = [];

    // Free bins of the picked shelf
    binItems:
        Option[] = [];

    productItems:
        Option[] = [];

    facts:
        Fact[] = [];

    details:
        Fact[] = [];

    maxDate:
        Date = new Date();

    //===========================================================
    // Add card
    //===========================================================

    pickId:
        number = 0;

    pickQty:
        string = '';

    pickCost:
        string = '';

    pickMrp:
        string = '';

    pickMargin:
        string = '';

    pickRackId:
        number = 0;

    pickShelf:
        number = 0;

    pickBin:
        number = 0;

    pickDefault:
        boolean = false;

    pickNotes:
        string = '';

    // The product in the Add card for Update (double-click)
    editingId:
        number = 0;

    lineError:
        string = '';

    //===========================================================
    // Cancel / Delete / Import / Unit Desk
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

    importResult:
        ImportResult | null = null;

    desk:
        Desk | null = null;

    readonly unitFields:
        UnitField[] =
        ['ChassisNo', 'EngineNo', 'KeyNo', 'BatteryNo'];

    readonly unitPlaceholders:
        Record<UnitField, string> =
        { ChassisNo:'Chassis', EngineNo:'Engine', KeyNo:'Key', BatteryNo:'Battery' };

    // Live bike-number check (MB)
    taken:
        Map<string, string> = new Map();

    checking:
        boolean = false;

    private checkTimer?:
        ReturnType<typeof setTimeout>;

    private checkRequest?:
        Subscription;

    private defaultsRequest?:
        Subscription;

    //===========================================================
    // View refresh
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
            console.error('[Opening Stock] view update failed', error);
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

        // view/:id or edit/:id
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

        this.setType(OPENING_STOCK_TYPES.some(x => x.type === type) ? type : 'MB');

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
        return this.type === 'MB';
    }

    // Key & Battery Required (System Configuration, MB)
    get keyBattery():
        boolean
    {
        return !!this.defaults?.UnitsRequired;
    }

    private setType
    (
        type:
            string
    ):
        void
    {
        this.type = type;

        this.info = openingStockType(type);

        if
        (
            type === 'MB'
        )
        {
            this.costBasis = 'Cost';
        }
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

                        // A posted / cancelled document opens to view
                        if
                        (
                            doc.Status !== 'Draft' && this.mode === 'edit'
                        )
                        {
                            this.mode = 'view';

                            this.router.navigate([OPENING_STOCK_ROUTE, 'view', doc.OpeningStockId], { replaceUrl:true });
                        }

                        // Edit needs the products; view (MB) the bike rules
                        return this.mode === 'edit' || this.isBikes
                            ? this.service.getDefaults(doc.PageType)
                            : of(null);
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

                        if
                        (
                            defaults
                        )
                        {
                            this.applyDefaults(defaults, false);
                        }

                        if
                        (
                            this.mode === 'edit'
                        )
                        {
                            this.fillFromDoc();
                        }
                        else
                        {
                            this.buildViewFacts();
                        }

                        this.refreshView();
                    },

                error:
                    err =>
                    {
                        this.loading = false;

                        this.error = errorText(err, 'The opening stock could not be loaded.');

                        this.refreshView();
                    }
            });
    }

    private loadDefaults():
        void
    {
        this.defaultsRequest?.unsubscribe();

        this.loading = true;

        this.refreshView();

        this.defaultsRequest =
            this.service
                .getDefaults(this.type)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe
                ({
                    next:
                        defaults =>
                        {
                            this.loading = false;

                            this.applyDefaults(defaults, true);

                            this.refreshView();
                        },

                    error:
                        err =>
                        {
                            this.loading = false;

                            this.error = errorText(err, 'The opening stock defaults could not be loaded.');

                            this.refreshView();
                        }
                });
    }

    private applyDefaults
    (
        defaults:
            OpeningStockDefaults,
        fresh:
            boolean
    ):
        void
    {
        this.defaults = defaults;

        const today =
            fromIsoDate(defaults.Today);

        if
        (
            today
        )
        {
            this.maxDate = today;

            if
            (
                fresh
            )
            {
                this.openingDate = today;
            }
        }

        this.branchItems =
            defaults.Branches.map(x => ({ label:`${x.Name} · ${x.Code}`, value:x.Id }));

        this.ledgerItems =
            defaults.Ledgers.map(x => ({ label:`${x.Name} · ${x.Code}`, value:x.Code }));

        if
        (
            fresh
        )
        {
            // The login branch when it has a warehouse
            if
            (
                !defaults.Branches.some(x => x.Id === this.branchId)
            )
            {
                const own =
                    Number((this.authStorage.getUser() as any)?.branchId) || 0;

                this.branchId =
                    (defaults.Branches.find(x => x.Id === own) ?? defaults.Branches[0])?.Id ?? 0;
            }

            this.pickBranchWarehouse();

            if
            (
                !this.ledgerCode
            )
            {
                this.ledgerCode = defaults.DefaultLedgerCode;
            }
        }

        // Locked : always the Posting Setup ledger
        if
        (
            defaults.LedgerLocked && this.mode !== 'view'
        )
        {
            this.ledgerCode = defaults.DefaultLedgerCode;
        }

        this.buildWarehouseItems();

        this.buildRackItems();

        this.resetPick();

        this.buildLists();
    }

    // Warehouses of the branch
    private buildWarehouseItems():
        void
    {
        this.warehouseItems =
            (this.defaults?.Warehouses ?? [])
                .filter(x => x.BranchId === this.branchId)
                .map(x => ({ label:x.Name, value:x.Id }));
    }

    // The branch's default warehouse, unless one of it is chosen
    private pickBranchWarehouse():
        void
    {
        const own =
            (this.defaults?.Warehouses ?? []).filter(x => x.BranchId === this.branchId);

        if
        (
            !own.some(x => x.Id === this.warehouseId)
        )
        {
            this.warehouseId =
                (own.find(x => x.IsDefault) ?? own[0])?.Id ?? 0;
        }
    }

    // Edit : the saved draft into the form
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

        this.openingDate = fromIsoDate(doc.OpeningDate) ?? this.openingDate;

        this.branchId = doc.BranchId;

        this.warehouseId = doc.WarehouseId;

        this.costBasis = doc.CostBasis === 'MRP' ? 'MRP' : 'Cost';

        this.ledgerCode =
            this.ledgerLocked ? (this.defaults?.DefaultLedgerCode ?? '') : doc.LedgerCode;

        this.remarks = doc.Remarks;

        this.lines =
            doc.Lines.map
            (
                x =>
                {
                    const product =
                        this.productById(x.ProductId);

                    return {
                        ProductId:x.ProductId,
                        ProductCode:x.ProductCode,
                        ProductName:x.ProductName,
                        Unit:x.Unit,
                        HasLedger:product?.HasLedger ?? true,
                        Quantity:x.Quantity,
                        UnitCost:x.UnitCost,
                        GrossCost:x.GrossUnitCost || x.UnitCost,
                        Mrp:x.Mrp,
                        MarginPercent:x.MarginPercent,
                        RackId:x.RackManagementId,
                        Shelf:x.ShelfNumber,
                        Bin:x.RackManagementId ? (x.BinNumber || 1) : 0,
                        SaveDefault:x.SaveAsDefault,
                        Notes:x.ShortNotes,
                        Units:
                            doc.Units
                                .filter(u => u.ProductId === x.ProductId)
                                .map(u => ({ ChassisNo:u.ChassisNo, EngineNo:u.EngineNo, KeyNo:u.KeyNo, BatteryNo:u.BatteryNo }))
                    };
                }
            );

        this.lines.forEach(x => this.fitUnits(x));

        this.buildWarehouseItems();

        this.buildRackItems();

        this.buildLists();

        this.scheduleCheck(0);
    }

    //===========================================================
    // Header changes
    //===========================================================

    onTypeChange
    (
        value:
            any
    ):
        void
    {
        const next =
            String(value ?? '').toUpperCase();

        if
        (
            !next || next === this.type || this.lines.length > 0 || this.mode !== 'add'
        )
        {
            return;
        }

        this.setType(next);

        this.taken = new Map();

        this.loadDefaults();
    }

    onDateChange
    (
        date:
            Date
    ):
        void
    {
        this.openingDate = date;

        // MRP basis : the cost follows the Purchase VAT rule of the date
        this.recostLines();
    }

    onBranchChange
    (
        value:
            any
    ):
        void
    {
        const next =
            Number(value) || 0;

        if
        (
            next === this.branchId || this.mode !== 'add'
        )
        {
            return;
        }

        this.branchId = next;

        this.buildWarehouseItems();

        const before =
            this.warehouseId;

        this.pickBranchWarehouse();

        if
        (
            this.warehouseId !== before
        )
        {
            const chosen =
                this.warehouseId;

            this.warehouseId = before;

            this.onWarehouseChange(chosen);

            return;
        }

        this.refreshView();
    }

    get branchNextNumber():
        string
    {
        return this.defaults?.Branches.find(x => x.Id === this.branchId)?.NextNumber ?? '';
    }

    onCostBasisChange
    (
        value:
            any
    ):
        void
    {
        if
        (
            this.lines.length > 0 || this.isBikes
        )
        {
            return;
        }

        this.costBasis = value === 'MRP' ? 'MRP' : 'Cost';

        this.lineError = '';

        this.refreshView();
    }

    get mrpBasis():
        boolean
    {
        return this.costBasis === 'MRP' && !this.isBikes;
    }

    //===========================================================
    // VAT : cost excl. VAT; MRP / sale price incl. VAT
    //===========================================================

    // Purchase VAT taken out of an MRP-basis cost : null = the
    // rule of the date is missing
    purchaseVatRate
    (
        vatType:
            string
    ):
        number | null
    {
        if
        (
            !this.defaults || !this.defaults.PurchaseVatApplicable
        )
        {
            return 0;
        }

        const rule =
            vatRuleOn(this.defaults.PurchaseVatRules, vatType, toIsoDate(this.openingDate));

        return rule
            ? (rule.InputCreditAllowed ? rule.Rate : 0)
            : null;
    }

    // Sales VAT inside the sale price : null = no rule of the date
    salesVatRate
    (
        vatType:
            string
    ):
        number | null
    {
        if
        (
            !this.defaults || !this.defaults.SalesVatApplicable
        )
        {
            return 0;
        }

        const rule =
            vatRuleOn(this.defaults.SalesVatRules, vatType, toIsoDate(this.openingDate));

        return rule ? rule.Rate : null;
    }

    // Sale price without its VAT
    saleNet
    (
        salePrice:
            number,
        vatType:
            string
    ):
        number
    {
        const rate =
            this.salesVatRate(vatType) ?? 0;

        return Math.round(salePrice / (1 + rate / 100) * 100) / 100;
    }

    // Profit % On Sale Price switch : true = on the net sale
    get profitOnSale():
        boolean
    {
        return !!this.defaults?.ProfitOnSale;
    }

    // Profit (%) of the net sale (MRP excl. sales VAT) over the cost:
    // on cost (markup, default) or on the net sale (switch) ;
    // null = no price
    profitPercent
    (
        salePrice:
            number,
        unitCost:
            number,
        vatType:
            string
    ):
        number | null
    {
        const net =
            this.saleNet(salePrice, vatType);

        if
        (
            !(net > 0 && unitCost > 0)
        )
        {
            return null;
        }

        const base =
            this.profitOnSale ? net : unitCost;

        return Math.round((net - unitCost) / base * 10000) / 100;
    }

    lineProfit
    (
        line:
            FormLine
    ):
        number | null
    {
        return this.profitPercent(line.Mrp, line.UnitCost, this.productById(line.ProductId)?.VatType ?? '');
    }

    // MRP basis : the lines' cost again (date / rule changed)
    private recostLines():
        void
    {
        if
        (
            !this.mrpBasis && !this.vatIncluded
        )
        {
            return;
        }

        for (const line of this.lines)
        {
            const rate =
                this.purchaseVatRate(this.productById(line.ProductId)?.VatType ?? '');

            if
            (
                rate === null
            )
            {
                continue;
            }

            if
            (
                this.mrpBasis && line.Mrp > 0
            )
            {
                line.UnitCost = costFromMrp(line.Mrp, line.MarginPercent, rate);

                line.GrossCost = this.vatIncluded
                    ? Math.round(line.Mrp * (1 - line.MarginPercent / 100) * 10000) / 10000
                    : line.UnitCost;
            }
            else if
            (
                this.vatIncluded && line.GrossCost > 0
            )
            {
                line.UnitCost = netOf(line.GrossCost, rate);
            }
        }

        this.refreshView();
    }

    onWarehouseChange
    (
        value:
            any
    ):
        void
    {
        const next =
            Number(value) || 0;

        if
        (
            next === this.warehouseId
        )
        {
            return;
        }

        this.warehouseId = next;

        this.buildRackItems();

        // Racks belong to a warehouse : every place goes back to
        // the product's default in the new warehouse
        if
        (
            this.info.hasShelves
        )
        {
            for (const line of this.lines)
            {
                this.placeDefault(line);
            }

            if
            (
                this.pickId
            )
            {
                this.onPickChange(this.pickId);
            }
        }

        this.refreshView();
    }

    onLedgerChange
    (
        value:
            any
    ):
        void
    {
        if
        (
            this.ledgerLocked
        )
        {
            return;
        }

        this.ledgerCode = String(value ?? '');
    }

    private buildRackItems():
        void
    {
        const taken =
            this.takenBins(this.pickId);

        this.rackItems =
            (this.defaults?.Racks ?? [])
                .filter(x => x.WarehouseId === this.warehouseId)
                .map
                (
                    x =>
                    ({
                        label:`${x.Code}${x.Name && x.Name !== x.Code ? ' · ' + x.Name : ''}${x.ZoneCode ? ' · ' + x.ZoneCode : ''}`,
                        value:x.Id,
                        count:String(mapRackFreeCount(this.binRack(x.Id), this.itemType, this.pickId, taken))
                    })
                );

        this.loadBinMap();
    }

    // The rack map of the warehouse (who holds which bin), once
    // per warehouse
    private loadBinMap():
        void
    {
        if
        (
            !this.info.hasShelves || !this.warehouseId || this.binMapOf === this.warehouseId
        )
        {
            return;
        }

        const call =
            ++this.binCall;

        const warehouseId =
            this.warehouseId;

        this.binMapOf = warehouseId;

        this.binMap = [];

        this.rackService
            .getWarehouseBins(warehouseId, { activeOnly:true })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    map =>
                    {
                        if
                        (
                            call !== this.binCall
                        )
                        {
                            return;
                        }

                        this.binMap = map;

                        this.buildRackItems();

                        this.buildShelfItems();

                        this.refreshView();
                    },
                error:
                    () =>
                    {
                        // No map : every bin is offered; the server
                        // checks on save
                        if
                        (
                            call === this.binCall
                        )
                        {
                            this.binMapOf = 0;
                        }
                    }
            });
    }

    // The item type of the page (BinOccupancy names)
    private get itemType():
        string
    {
        return binItemType(this.info.type);
    }

    // A rack of the map, or (map not loaded) the defaults' rack
    // with every bin free
    private binRack
    (
        rackId:
            number | null
    ):
        BinMapRack | null
    {
        const fromMap =
            mapRack(this.binMap, rackId ?? 0);

        if
        (
            fromMap
        )
        {
            return fromMap;
        }

        const rack =
            this.rackById(rackId);

        return rack
            ? {
                RackManagementId:rack.Id,
                RackName:rack.Name,
                ShelfCount:rack.ShelfCount,
                Shelves:rack.Shelves.map(x => ({ ShelfNumber:x.ShelfNumber, ShelfLabel:x.ShelfLabel, BinCount:x.BinCount, Bins:[] }))
            }
            : null;
    }

    // Bins the OTHER lines of the document take
    private takenBins
    (
        exceptProductId:
            number
    ):
        Set<string>
    {
        return new Set(
            this.lines
                .filter(x => x.ProductId !== exceptProductId && !!x.RackId && x.Shelf > 0 && x.Bin > 0)
                .map(x => binKey(x.RackId ?? 0, x.Shelf, x.Bin)));
    }

    private buildShelfItems():
        void
    {
        const rack =
            this.binRack(this.pickRackId);

        const taken =
            this.takenBins(this.pickId);

        this.shelfItems =
            mapShelfItems(rack, this.rackById(this.pickRackId)?.Name ?? '', this.itemType, this.pickId, taken);

        this.buildBinItems();
    }

    private buildBinItems():
        void
    {
        this.binItems =
            mapBinItems(
                this.binRack(this.pickRackId),
                this.rackById(this.pickRackId)?.Name ?? '',
                this.pickShelf,
                this.itemType,
                this.pickId,
                this.takenBins(this.pickId),
                this.pickBin);
    }

    // Product dropdown : products not yet on the list (and the
    // one being edited)
    private buildLists():
        void
    {
        const added =
            new Set(this.lines.map(x => x.ProductId));

        this.productItems =
            (this.defaults?.Products ?? [])
                .filter(x => !added.has(x.Id) || x.Id === this.editingId)
                .map
                (
                    x =>
                    ({
                        label:`${x.Name} · ${x.Code}${x.HasLedger ? '' : ' (no Inventory ledger)'}`,
                        value:x.Id
                    })
                );
    }

    private productById
    (
        id:
            number
    ):
        OpeningStockProduct | null
    {
        return (this.defaults?.Products ?? []).find(x => x.Id === id) ?? null;
    }

    private rackById
    (
        id:
            number | null
    ):
        OpeningStockRack | null
    {
        return id
            ? (this.defaults?.Racks ?? []).find(x => x.Id === id) ?? null
            : null;
    }

    // The product's default rack · shelf in this warehouse
    private placeDefault
    (
        line:
            FormLine
    ):
        void
    {
        const shelf =
            this.productById(line.ProductId)?.Shelves.find(x => x.WarehouseId === this.warehouseId);

        line.RackId = shelf ? shelf.RackManagementId : null;

        line.Shelf = shelf ? shelf.ShelfNumber : 0;

        line.Bin = shelf ? (shelf.BinNumber || 1) : 0;

        line.SaveDefault = false;
    }

    defaultShelfText
    (
        productId:
            number
    ):
        string
    {
        const shelf =
            this.productById(productId)?.Shelves.find(x => x.WarehouseId === this.warehouseId);

        const rack =
            shelf ? this.rackById(shelf.RackManagementId) : null;

        return rack && shelf
            ? (shelf.BinCode || binCode(rack.Name, shelf.ShelfNumber, shelf.BinNumber || 1))
            : '';
    }

    rackText
    (
        line:
            FormLine
    ):
        string
    {
        const rack =
            this.rackById(line.RackId);

        return rack
            ? (binCode(rack.Name, line.Shelf, line.Bin) || rack.Code)
            : '—';
    }

    //===========================================================
    // Add card
    //===========================================================

    get pick():
        OpeningStockProduct | null
    {
        return this.productById(this.pickId);
    }

    // The Add card's unit cost : typed, or (MRP basis) from MRP
    // less margin with the Purchase VAT out; 0 = not known yet
    get pickUnitCost():
        number
    {
        if
        (
            !this.mrpBasis
        )
        {
            const cost =
                toNumber(this.pickCost);

            if
            (
                !(cost > 0)
            )
            {
                return 0;
            }

            // Typed incl. VAT : the net cost takes it out
            if
            (
                this.vatIncluded
            )
            {
                const vat =
                    this.purchaseVatRate(this.pick?.VatType ?? '');

                return vat === null ? 0 : netOf(cost, vat);
            }

            return cost;
        }

        const mrp =
            toNumber(this.pickMrp);

        const margin =
            this.pickMargin.trim() === '' ? 0 : toNumber(this.pickMargin);

        const rate =
            this.purchaseVatRate(this.pick?.VatType ?? '');

        return mrp > 0 && margin >= 0 && margin < 100 && rate !== null
            ? costFromMrp(mrp, margin, rate)
            : 0;
    }

    // The Add card's cost incl. VAT (typed, or MRP less margin)
    get pickGrossCost():
        number
    {
        if
        (
            !this.vatIncluded
        )
        {
            return this.pickUnitCost;
        }

        if
        (
            !this.mrpBasis
        )
        {
            const cost =
                toNumber(this.pickCost);

            return cost > 0 ? cost : 0;
        }

        const mrp =
            toNumber(this.pickMrp);

        const margin =
            this.pickMargin.trim() === '' ? 0 : toNumber(this.pickMargin);

        return mrp > 0 && margin >= 0 && margin < 100
            ? Math.round(mrp * (1 - margin / 100) * 10000) / 10000
            : 0;
    }

    // The VAT carried by the Add card's quantity
    get pickVat():
        number
    {
        const quantity =
            toNumber(this.pickQty);

        return this.vatIncluded && quantity > 0 && this.pickUnitCost > 0
            ? vatOf(quantity, this.pickGrossCost, this.pickUnitCost)
            : 0;
    }

    get pickValue():
        number
    {
        const quantity =
            toNumber(this.pickQty);

        const cost =
            this.pickUnitCost;

        return quantity > 0 && cost > 0
            ? Math.round(quantity * cost * 100) / 100
            : 0;
    }

    // The sale price : the MRP (single source of truth)
    get pickSale():
        number
    {
        const mrp =
            toNumber(this.pickMrp);

        return mrp > 0 ? mrp : 0;
    }

    get pickProfit():
        number | null
    {
        return this.pick
            ? this.profitPercent(this.pickSale, this.pickUnitCost, this.pick.VatType)
            : null;
    }

    // One line : the VAT behind the figures of the Add card
    get pickVatText():
        string
    {
        const product =
            this.pick;

        if
        (
            !product
        )
        {
            return '';
        }

        const parts:
            string[] = [];

        const sales =
            this.salesVatRate(product.VatType);

        parts.push(
            !this.defaults?.SalesVatApplicable
                ? 'Sales VAT not applicable'
                : sales === null
                    ? `No Sales VAT rule for ${product.VatType} on this date`
                    : `Sales VAT ${sales}% (${product.VatType}) inside the MRP (the sale price)`);

        if
        (
            this.pickSale > 0
        )
        {
            parts.push(`net sale ${formatOpeningMoney(this.saleNet(this.pickSale, product.VatType))}`);
        }

        if
        (
            this.mrpBasis
        )
        {
            const purchase =
                this.purchaseVatRate(product.VatType);

            parts.push(
                purchase === null
                    ? `No Purchase VAT rule for ${product.VatType} on this date : add or extend it to cost from MRP`
                    : purchase > 0
                        ? `cost = MRP − margin, less Purchase VAT ${purchase}%`
                        : 'cost = MRP − margin (no purchase VAT to take out)');
        }

        if
        (
            this.vatIncluded
        )
        {
            const purchase =
                this.purchaseVatRate(product.VatType);

            parts.push(
                purchase === null
                    ? `No Purchase VAT rule for ${product.VatType} on this date`
                    : purchase > 0
                        ? `cost incl. VAT : ${purchase}% goes to the VAT Current Account${this.pickVat > 0 ? ' (' + formatOpeningMoney(this.pickVat) + ')' : ''}`
                        : 'no input VAT to carry (credit not allowed or VAT not applicable)');
        }

        return parts.join(' · ');
    }

    private resetPick():
        void
    {
        this.pickId = 0;
        this.pickQty = '';
        this.pickCost = '';
        this.pickMrp = '';
        this.pickMargin = '';
        this.pickRackId = 0;
        this.pickShelf = 0;
        this.pickBin = 0;
        this.pickDefault = false;
        this.pickNotes = '';
        this.editingId = 0;
        this.lineError = '';
        this.shelfItems = [];
        this.binItems = [];
    }

    onPickChange
    (
        value:
            any
    ):
        void
    {
        const product =
            this.productById(Number(value) || 0);

        this.lineError = '';

        if
        (
            !product
        )
        {
            this.resetPick();

            this.buildLists();

            return;
        }

        const line =
            this.lines.find(x => x.ProductId === product.Id);

        this.pickId = product.Id;

        if
        (
            line
        )
        {
            this.pickQty = String(line.Quantity);
            this.pickCost = String(this.vatIncluded ? line.GrossCost : line.UnitCost);
            this.pickMrp = line.Mrp ? String(line.Mrp) : '';
            this.pickMargin = this.mrpBasis ? String(line.MarginPercent) : '';
            this.pickRackId = line.RackId ?? 0;
            this.pickShelf = line.Shelf;
            this.pickBin = line.Bin;
            this.pickDefault = line.SaveDefault;
            this.pickNotes = line.Notes;
        }
        else
        {
            const shelf =
                product.Shelves.find(x => x.WarehouseId === this.warehouseId);

            if
            (
                this.editingId !== product.Id
            )
            {
                this.pickQty = '';
                this.pickCost = product.LastCost > 0 ? String(product.LastCost) : '';
                this.pickMrp = product.LastMrp > 0 ? String(product.LastMrp) : '';
                this.pickMargin = '';
                this.pickNotes = '';
            }

            this.pickRackId = shelf ? shelf.RackManagementId : 0;
            this.pickShelf = shelf ? shelf.ShelfNumber : 0;
            this.pickBin = shelf ? (shelf.BinNumber || 1) : 0;
            this.pickDefault = false;
        }

        this.buildRackItems();

        this.buildShelfItems();

        this.refreshView();
    }

    onPickRackChange
    (
        value:
            any
    ):
        void
    {
        this.pickRackId = Number(value) || 0;

        // The first free bin of the rack (shelf-then-bin)
        const first =
            mapFirstFree(this.binRack(this.pickRackId), this.itemType, this.pickId, this.takenBins(this.pickId));

        this.pickShelf = first?.shelf ?? 0;

        this.pickBin = first?.bin ?? 0;

        if
        (
            !this.pickRackId
        )
        {
            this.pickDefault = false;
        }

        this.buildShelfItems();
    }

    onPickShelfChange
    (
        value:
            any
    ):
        void
    {
        this.pickShelf = Number(value) || 0;

        this.pickBin =
            mapFreeBins(this.binRack(this.pickRackId), this.pickShelf, this.itemType, this.pickId, this.takenBins(this.pickId))[0] ?? 0;

        this.buildBinItems();
    }

    onPickBinChange
    (
        value:
            any
    ):
        void
    {
        this.pickBin = Number(value) || 0;

        this.buildBinItems();
    }

    // The Add card's figures checked : a message, or the values
    private pickFigures():
        string | { quantity:number; cost:number; gross:number; mrp:number; margin:number }
    {
        const quantity =
            toNumber(this.pickQty);

        const mrp =
            this.pickMrp.trim() === '' ? 0 : toNumber(this.pickMrp);

        const margin =
            this.pickMargin.trim() === '' ? 0 : toNumber(this.pickMargin);

        if
        (
            !(quantity > 0)
        )
        {
            return 'Enter the quantity in stock.';
        }

        if
        (
            this.info.wholeUnits && !Number.isInteger(quantity)
        )
        {
            return 'Bikes are counted in whole units.';
        }

        if
        (
            !Number.isFinite(mrp) || mrp < 0
        )
        {
            return 'MRP is a number (or empty).';
        }

        if
        (
            this.mrpBasis
        )
        {
            if
            (
                !(mrp > 0)
            )
            {
                return 'Enter the MRP : the cost is MRP less the margin.';
            }

            if
            (
                !Number.isFinite(margin) || margin < 0 || margin >= 100
            )
            {
                return 'The margin is 0 to below 100 %.';
            }

            if
            (
                this.purchaseVatRate(this.pick?.VatType ?? '') === null
            )
            {
                return `No Purchase VAT rule for ${this.pick?.VatType} on this date. Extend or add the rule first.`;
            }
        }
        else if
        (
            this.vatIncluded && this.purchaseVatRate(this.pick?.VatType ?? '') === null
        )
        {
            return `No Purchase VAT rule for ${this.pick?.VatType} on this date : the VAT cannot be taken out of the cost. Extend or add the rule first.`;
        }

        const cost =
            this.pickUnitCost;

        if
        (
            !(cost > 0)
        )
        {
            return 'Enter the unit cost, excluding VAT (what one unit cost the business).';
        }

        // MRP (the sale price) is never below the cost : equal or more
        const floor =
            this.vatIncluded ? this.pickGrossCost : cost;

        if
        (
            mrp > 0 && mrp < Math.round(floor * 100) / 100
        )
        {
            return `The MRP ${formatOpeningMoney(mrp)} is below the cost ${formatOpeningCost(floor)}. MRP must be equal to or more than the cost.`;
        }

        return {
            quantity:Math.round(quantity * 100) / 100,
            cost:Math.round(cost * 10000) / 10000,
            gross:Math.round((this.vatIncluded ? this.pickGrossCost : cost) * 10000) / 10000,
            mrp:Math.round(mrp * 100) / 100,
            margin:this.mrpBasis ? Math.round(margin * 10000) / 10000 : 0
        };
    }

    onAddLine():
        void
    {
        const product =
            this.pick;

        if
        (
            !product
        )
        {
            this.lineError = `Select the ${this.info.item.toLowerCase()}.`;

            this.refreshView();

            return;
        }

        const figures =
            this.pickFigures();

        if
        (
            typeof figures === 'string'
        )
        {
            this.lineError = figures;

            this.refreshView();

            return;
        }

        // A place : rack + shelf + a free bin (one item per bin)
        if
        (
            this.info.hasShelves && this.pickRackId
        )
        {
            const rack =
                this.binRack(this.pickRackId);

            if
            (
                !rack || !this.pickShelf || !this.pickBin
            )
            {
                this.lineError = 'Choose the shelf and bin (or no rack).';

                this.refreshView();

                return;
            }

            if
            (
                !mapBinFree(rack, this.pickShelf, this.pickBin, this.itemType, product.Id, this.takenBins(product.Id))
            )
            {
                this.lineError = `Bin ${binCode(rack.RackName, this.pickShelf, this.pickBin)} holds another item or another line uses it (one item per bin). Choose a free bin.`;

                this.refreshView();

                return;
            }
        }

        let line =
            this.lines.find(x => x.ProductId === product.Id);

        if
        (
            !line
        )
        {
            line =
            {
                ProductId:product.Id,
                ProductCode:product.Code,
                ProductName:product.Name,
                Unit:product.Unit,
                HasLedger:product.HasLedger,
                Quantity:0,
                UnitCost:0,
                GrossCost:0,
                Mrp:0,
                MarginPercent:0,
                RackId:null,
                Shelf:0,
                Bin:0,
                SaveDefault:false,
                Notes:'',
                Units:[]
            };

            this.lines.push(line);
        }

        line.Quantity = figures.quantity;
        line.UnitCost = figures.cost;
        line.GrossCost = figures.gross;
        line.Mrp = figures.mrp;
        line.MarginPercent = figures.margin;
        line.RackId = this.info.hasShelves && this.pickRackId ? this.pickRackId : null;
        line.Shelf = line.RackId ? this.pickShelf : 0;
        line.Bin = line.RackId ? this.pickBin : 0;
        line.SaveDefault = !!line.RackId && this.pickDefault;
        line.Notes = this.pickNotes.trim();

        this.fitUnits(line);

        this.resetPick();

        this.buildLists();

        // Bikes : their numbers from the bikes button on the line
        // in the summary (the Unit Desk does not open here)
        this.scheduleCheck(0);

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
            this.saving || this.isView
        )
        {
            return;
        }

        this.editingId = line.ProductId;

        this.buildLists();

        this.onPickChange(line.ProductId);
    }

    cancelEdit():
        void
    {
        this.resetPick();

        this.buildLists();
    }

    removeLine
    (
        line:
            FormLine
    ):
        void
    {
        this.lines = this.lines.filter(x => x !== line);

        if
        (
            this.editingId === line.ProductId
        )
        {
            this.resetPick();
        }

        this.buildLists();

        this.scheduleCheck(0);
    }

    get rowCount():
        number
    {
        return this.isView
            ? (this.doc?.Lines.length ?? 0)
            : this.lines.length;
    }

    get totalQuantity():
        number
    {
        return this.isView
            ? (this.doc?.TotalQuantity ?? 0)
            : this.lines.reduce((t, x) => t + x.Quantity, 0);
    }

    get totalValue():
        number
    {
        return this.isView
            ? (this.doc?.TotalValue ?? 0)
            : this.lines.reduce((t, x) => t + lineValue(x), 0);
    }

    get totalSale():
        number
    {
        return this.isView
            ? (this.doc?.Lines ?? []).reduce((t, x) => t + x.Mrp * x.Quantity, 0)
            : this.lines.reduce((t, x) => t + x.Mrp * x.Quantity, 0);
    }

    // View : profit on the net sale price (MRP) of a saved line
    viewProfit
    (
        line:
            OpeningStockLine
    ):
        number | null
    {
        return this.profitPercent(line.Mrp, line.UnitCost, this.productById(line.ProductId)?.VatType ?? '');
    }

    pct
    (
        value:
            number | null
    ):
        string
    {
        return value === null ? '—' : `${value.toFixed(2)}%`;
    }

    value
    (
        line:
            FormLine
    ):
        number
    {
        return lineValue(line);
    }

    //===========================================================
    // View facts
    //===========================================================

    private buildViewFacts():
        void
    {
        const d =
            this.doc;

        if
        (
            !d
        )
        {
            return;
        }

        this.facts =
        [
            { label:'Debit', value:`Inventory · ${this.info.title}`, wide:true },
            { label:'Credit', value:`${d.LedgerName} · ${d.LedgerCode}`, wide:true },
            { label:'Journal No', value:d.JournalNo },
            { label:'Value', value:formatOpeningMoney(d.TotalValue) },
            ...(d.TotalVat > 0 ? [{ label:'VAT Carried', value:formatOpeningMoney(d.TotalVat) }] : []),
            { label:'Posted On', value:formatOpeningDate(d.PostedDate) },
            { label:'Branch', value:d.BranchName }
        ];

        this.details =
        [
            { label:'Status', value:d.Status },
            { label:'Cost Basis', value:d.CostBasis === 'MRP' ? 'MRP less Margin' : 'Unit Cost' },
            { label:'Lines', value:String(d.Lines.length) },
            { label:'Quantity', value:formatOpeningQty(d.TotalQuantity) },
            { label:'Warehouse', value:d.WarehouseName, wide:true },
            { label:'Saved On', value:formatOpeningDate(d.CreatedDate) },
            ...(d.Status === 'Cancelled'
                ? [
                    { label:'Cancelled On', value:formatOpeningDate(d.CancelledDate) },
                    { label:'Reason', value:d.CancelReason, wide:true }
                ]
                : [])
        ];
    }

    //===========================================================
    // Unit Desk (MB) : one row per bike
    //===========================================================

    private fieldsOf
    (
        keys:
            boolean
    ):
        UnitField[]
    {
        return keys
            ? ['ChassisNo', 'EngineNo', 'KeyNo', 'BatteryNo']
            : ['ChassisNo', 'EngineNo'];
    }

    private fitUnits
    (
        line:
            FormLine
    ):
        void
    {
        if
        (
            !this.isBikes
        )
        {
            line.Units = [];

            return;
        }

        const count =
            Math.max(0, Math.floor(line.Quantity));

        while (line.Units.length < count)
        {
            line.Units.push({ ChassisNo:'', EngineNo:'', KeyNo:'', BatteryNo:'' });
        }

        if
        (
            line.Units.length > count
        )
        {
            line.Units.length = count;
        }
    }

    openUnits
    (
        line:
            FormLine
    ):
        void
    {
        this.desk =
        {
            line,
            name:line.ProductName,
            code:line.ProductCode,
            readonly:false,
            keys:this.keyBattery,
            fields:this.fieldsOf(this.keyBattery),
            rows:line.Units.map(x => ({ ...x }))
        };

        this.scheduleCheck(0);
    }

    openViewUnits
    (
        line:
            OpeningStockLine
    ):
        void
    {
        const rows =
            this.unitsOfProduct(line.ProductId).map(x => ({ ChassisNo:x.ChassisNo, EngineNo:x.EngineNo, KeyNo:x.KeyNo, BatteryNo:x.BatteryNo }));

        const keys =
            this.keyBattery || rows.some(x => !!x.KeyNo || !!x.BatteryNo);

        this.desk =
        {
            line:null,
            name:line.ProductName,
            code:line.ProductCode,
            readonly:true,
            keys,
            fields:this.fieldsOf(keys),
            rows
        };
    }

    closeUnits():
        void
    {
        this.desk = null;

        this.scheduleCheck(0);
    }

    saveUnits():
        void
    {
        const desk =
            this.desk;

        if
        (
            !desk?.line
        )
        {
            this.desk = null;

            return;
        }

        desk.line.Units =
            desk.rows.map
            (
                x =>
                ({
                    ChassisNo:x.ChassisNo.trim().toUpperCase(),
                    EngineNo:x.EngineNo.trim().toUpperCase(),
                    KeyNo:desk.keys ? x.KeyNo.trim().toUpperCase() : '',
                    BatteryNo:desk.keys ? x.BatteryNo.trim().toUpperCase() : ''
                })
            );

        this.desk = null;

        this.scheduleCheck(0);
    }

    unitsEntered
    (
        line:
            FormLine
    ):
        number
    {
        return line.Units.filter(x => x.ChassisNo.trim() && x.EngineNo.trim()).length;
    }

    unitsComplete
    (
        line:
            FormLine
    ):
        boolean
    {
        return line.Units.length > 0 && line.Units.every(x => this.unitComplete(x));
    }

    private unitComplete
    (
        unit:
            UnitRow
    ):
        boolean
    {
        return !!unit.ChassisNo.trim()
            && !!unit.EngineNo.trim()
            && (!this.keyBattery || (!!unit.KeyNo.trim() && !!unit.BatteryNo.trim()));
    }

    // Typed but not whole : only one of chassis / engine
    private unitHalf
    (
        unit:
            UnitRow
    ):
        boolean
    {
        return !!unit.ChassisNo.trim() !== !!unit.EngineNo.trim()
            || (!unit.ChassisNo.trim() && !unit.EngineNo.trim() && (!!unit.KeyNo.trim() || !!unit.BatteryNo.trim()));
    }

    onUnitChange
    (
        unit:
            UnitRow,
        field:
            UnitField,
        value:
            string | number
    ):
        void
    {
        unit[field] = String(value ?? '').toUpperCase();

        this.scheduleCheck();
    }

    // Paste from Excel : Chassis / Engine / Key / Battery columns,
    // from this bike down (a header row is skipped)
    onUnitPaste
    (
        event:
            ClipboardEvent,
        index:
            number,
        start:
            number
    ):
        void
    {
        const desk =
            this.desk;

        const text =
            event.clipboardData?.getData('text') ?? '';

        if
        (
            !desk || !/[\t\n]/.test(text.trim())
        )
        {
            return;
        }

        event.preventDefault();

        const rows =
            text
                .replace(/\r/g, '')
                .split('\n')
                .map(x => x.split('\t').map(v => v.trim().toUpperCase()))
                .filter(x => x.some(v => !!v))
                .filter(x => !/chassis|engine/i.test(x.join(' ')));

        rows.forEach
        (
            (cells, r) =>
            {
                const unit =
                    desk.rows[index + r];

                if
                (
                    !unit
                )
                {
                    return;
                }

                cells.forEach
                (
                    (value, c) =>
                    {
                        const target =
                            desk.fields[start + c];

                        if
                        (
                            target
                        )
                        {
                            unit[target] = value;
                        }
                    }
                );
            }
        );

        // New row objects so the textboxes show the pasted values
        desk.rows = desk.rows.map(x => ({ ...x }));

        this.scheduleCheck(0);

        this.refreshView();
    }

    clearUnit
    (
        unit:
            UnitRow
    ):
        void
    {
        unit.ChassisNo = '';
        unit.EngineNo = '';
        unit.KeyNo = '';
        unit.BatteryNo = '';

        if
        (
            this.desk
        )
        {
            this.desk.rows = this.desk.rows.map(x => ({ ...x }));
        }

        this.scheduleCheck(0);
    }

    // Every bike on this document : the desk's working rows in
    // place of its line's saved ones
    private everyUnit():
        { line:FormLine; unit:UnitRow }[]
    {
        const result:
            { line:FormLine; unit:UnitRow }[] = [];

        for (const line of this.lines)
        {
            const rows =
                this.desk && this.desk.line === line
                    ? this.desk.rows
                    : line.Units;

            rows.forEach(unit => result.push({ line, unit }));
        }

        return result;
    }

    // Red : repeated on this document or already on a bike
    unitProblem
    (
        unit:
            UnitRow,
        field:
            UnitField
    ):
        string
    {
        const value =
            unit[field].trim().toUpperCase();

        if
        (
            !value
        )
        {
            return '';
        }

        const repeatable =
            (field === 'KeyNo' && !this.defaults?.UniqueKeyNo)
            ||
            (field === 'BatteryNo' && !this.defaults?.UniqueBatteryNo);

        if
        (
            !repeatable
        )
        {
            const count =
                this.everyUnit()
                    .filter(x => x.unit[field].trim().toUpperCase() === value)
                    .length;

            if
            (
                count > 1
            )
            {
                return `${value} is entered twice.`;
            }
        }

        return this.taken.get(`${field}|${value}`) ?? '';
    }

    // Bikes with a number typed (empty rows are left out)
    private typedUnits():
        OpeningStockUnit[]
    {
        return this.everyUnit()
            .map
            (
                x =>
                ({
                    ProductId:x.line.ProductId,
                    ChassisNo:x.unit.ChassisNo.trim().toUpperCase(),
                    EngineNo:x.unit.EngineNo.trim().toUpperCase(),
                    KeyNo:this.keyBattery ? x.unit.KeyNo.trim().toUpperCase() : '',
                    BatteryNo:this.keyBattery ? x.unit.BatteryNo.trim().toUpperCase() : ''
                })
            )
            .filter(x => !!(x.ChassisNo || x.EngineNo || x.KeyNo || x.BatteryNo));
    }

    private scheduleCheck
    (
        delay:
            number = 400
    ):
        void
    {
        if
        (
            !this.isBikes || this.isView
        )
        {
            return;
        }

        clearTimeout(this.checkTimer);

        this.checkTimer =
            setTimeout(() => this.checkUnits(), delay);
    }

    private checkUnits():
        void
    {
        const units =
            this.typedUnits();

        this.checkRequest?.unsubscribe();

        if
        (
            units.length === 0
        )
        {
            this.taken = new Map();

            this.refreshView();

            return;
        }

        this.checking = true;

        this.refreshView();

        this.checkRequest =
            this.service
                .checkUnits(this.type, this.doc?.OpeningStockId ?? 0, units)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe
                ({
                    next:
                        rows =>
                        {
                            this.taken =
                                new Map(rows.map(x => [`${x.Field}|${x.Value.toUpperCase()}`, x.Message] as [string, string]));

                            this.checking = false;

                            this.refreshView();
                        },

                    error:
                        () =>
                        {
                            this.checking = false;

                            this.refreshView();
                        }
                });
    }

    unitsOfProduct
    (
        productId:
            number
    ):
        OpeningStockUnit[]
    {
        return (this.doc?.Units ?? []).filter(x => x.ProductId === productId);
    }

    //===========================================================
    // Excel import : paste rows or a CSV file
    //===========================================================

    get importColumns():
        string[]
    {
        return this.isBikes
            ? ['Product Code', 'Unit Cost', 'MRP', 'Chassis No', 'Engine No', 'Key No', 'Battery No']
            : this.mrpBasis
                ? ['Product Code', 'Quantity', 'MRP', 'Margin %', 'Rack Code', 'Shelf', 'Bin', 'Notes']
                : ['Product Code', 'Quantity', 'Unit Cost', 'MRP', 'Rack Code', 'Shelf', 'Bin', 'Notes'];
    }

    openImport():
        void
    {
        if
        (
            !this.defaults || this.saving
        )
        {
            return;
        }

        this.importOpen = true;

        this.importText = '';

        this.importFile = '';

        this.importResult = null;
    }

    closeImport():
        void
    {
        this.importOpen = false;

        this.importResult = null;
    }

    // The template : the columns and one example row, as CSV
    downloadTemplate():
        void
    {
        const example =
            this.isBikes
                ? ['MB-0001', '125000', '150000', 'CH12345', 'EN12345', 'K-01', 'B-01']
                : this.mrpBasis
                    ? ['SP-0001', '10', '320', '18', 'R-01', '2', '']
                    : ['SP-0001', '10', '250.50', '320', 'R-01', '2', ''];

        const csv =
            [this.importColumns, example]
                .map(row => row.map(csvCell).join(','))
                .join('\r\n');

        const blob =
            new Blob(['﻿' + csv], { type:'text/csv;charset=utf-8' });

        const url =
            URL.createObjectURL(blob);

        const link =
            document.createElement('a');

        link.href = url;

        link.download = `Opening Stock - ${this.info.title} - Template.csv`;

        document.body.appendChild(link);

        link.click();

        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
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

        if
        (
            !file
        )
        {
            return;
        }

        const reader =
            new FileReader();

        reader.onload =
            () =>
            {
                this.importText = String(reader.result ?? '');

                this.importFile = file.name;

                this.readImport();
            };

        reader.readAsText(file);

        // The same file can be chosen again
        input.value = '';
    }

    onImportText
    (
        value:
            string
    ):
        void
    {
        this.importText = value;

        this.importFile = '';

        this.importResult = null;
    }

    // Rows → lines : products by code (or part number), racks by
    // code in the warehouse; MB : one row per bike
    readImport():
        void
    {
        const all =
            parseRows(this.importText)
                .filter(x => x.some(v => !!v.trim()));

        // A heading row (not a product) : columns are read by their
        // names, so an older file with extra columns (e.g. the old
        // "Sale Price") still reads right; no heading : template order
        const heading =
            all.length > 0 && /product|code/i.test(all[0][0] ?? '') && !this.findProduct(all[0][0] ?? '');

        const rows =
            heading ? all.slice(1) : all;

        const known =
            this.importColumns;

        const columns =
            heading
                ? all[0].map(x => known.find(k => k.toLowerCase() === x.trim().toLowerCase()) ?? '')
                : known;

        const errors:
            string[] = [];

        const lines =
            new Map<number, FormLine>();

        rows.forEach
        (
            (cells, index) =>
            {
                const at =
                    `Row ${index + 1}`;

                // A column by its name (-1 = not on this template)
                const cell =
                    (name: string) =>
                    {
                        const n =
                            columns.indexOf(name);

                        return n < 0 ? '' : (cells[n] ?? '').trim();
                    };

                const amount =
                    (name: string) =>
                        cell(name) === '' ? 0 : toNumber(cell(name));

                const product =
                    this.findProduct(cell('Product Code'));

                if
                (
                    !product
                )
                {
                    errors.push(`${at} : product "${cell('Product Code')}" was not found in ${this.info.title}.`);

                    return;
                }

                const quantity =
                    this.isBikes ? 1 : toNumber(cell('Quantity'));

                const mrp =
                    amount('MRP');

                const margin =
                    amount('Margin %');

                let cost =
                    amount('Unit Cost');

                if
                (
                    !(quantity > 0) || Math.round(quantity * 100) / 100 !== quantity
                )
                {
                    errors.push(`${at} : ${product.Code} needs a quantity (at most 2 decimals).`);

                    return;
                }

                if
                (
                    !Number.isFinite(mrp) || mrp < 0
                )
                {
                    errors.push(`${at} : ${product.Code} has a wrong MRP.`);

                    return;
                }

                if
                (
                    this.mrpBasis
                )
                {
                    const rate =
                        this.purchaseVatRate(product.VatType);

                    if
                    (
                        !(mrp > 0) || !Number.isFinite(margin) || margin < 0 || margin >= 100
                    )
                    {
                        errors.push(`${at} : ${product.Code} needs the MRP and a margin of 0 to below 100 %.`);

                        return;
                    }

                    if
                    (
                        rate === null
                    )
                    {
                        errors.push(`${at} : no Purchase VAT rule for ${product.VatType} on this date; extend or add it first.`);

                        return;
                    }

                    cost = costFromMrp(mrp, margin, rate);
                }

                // Cost incl. VAT (VAT carried) : typed, or MRP less margin
                let gross =
                    this.mrpBasis
                        ? Math.round(mrp * (1 - margin / 100) * 10000) / 10000
                        : cost;

                if
                (
                    this.vatIncluded && !this.mrpBasis && cost > 0
                )
                {
                    const rate =
                        this.purchaseVatRate(product.VatType);

                    if
                    (
                        rate === null
                    )
                    {
                        errors.push(`${at} : no Purchase VAT rule for ${product.VatType} on this date; the VAT cannot be taken out of the cost.`);

                        return;
                    }

                    cost = netOf(cost, rate);
                }

                if
                (
                    !this.vatIncluded
                )
                {
                    gross = cost;
                }

                if
                (
                    !(cost > 0)
                )
                {
                    errors.push(`${at} : ${product.Code} needs the unit cost (excluding VAT).`);

                    return;
                }

                // MRP (the sale price) is never below the cost
                if
                (
                    mrp > 0 && mrp < Math.round((this.vatIncluded ? gross : cost) * 100) / 100
                )
                {
                    errors.push(`${at} : ${product.Code} MRP ${formatOpeningMoney(mrp)} is below its cost ${formatOpeningCost(this.vatIncluded ? gross : cost)}.`);

                    return;
                }

                let line =
                    lines.get(product.Id);

                if
                (
                    line && !this.isBikes
                )
                {
                    errors.push(`${at} : ${product.Code} is on the list twice; put its whole quantity on one row.`);

                    return;
                }

                if
                (
                    line && (Math.abs(line.UnitCost - cost) > 0.00005 || line.Mrp !== Math.round(mrp * 100) / 100)
                )
                {
                    errors.push(`${at} : ${product.Code} has another cost or MRP than its first bike; one model has one cost and MRP on a document.`);

                    return;
                }

                if
                (
                    !line
                )
                {
                    line =
                    {
                        ProductId:product.Id,
                        ProductCode:product.Code,
                        ProductName:product.Name,
                        Unit:product.Unit,
                        HasLedger:product.HasLedger,
                        Quantity:0,
                        UnitCost:Math.round(cost * 10000) / 10000,
                        GrossCost:Math.round(gross * 10000) / 10000,
                        Mrp:Math.round(mrp * 100) / 100,
                        MarginPercent:this.mrpBasis ? Math.round(margin * 10000) / 10000 : 0,
                        RackId:null,
                        Shelf:0,
                        Bin:0,
                        SaveDefault:false,
                        Notes:'',
                        Units:[]
                    };

                    lines.set(product.Id, line);
                }

                if
                (
                    this.isBikes
                )
                {
                    const chassis =
                        cell('Chassis No').toUpperCase();

                    const engine =
                        cell('Engine No').toUpperCase();

                    if
                    (
                        !chassis || !engine
                    )
                    {
                        errors.push(`${at} : ${product.Code} needs the Chassis No and Engine No.`);

                        if
                        (
                            line.Quantity === 0
                        )
                        {
                            lines.delete(product.Id);
                        }

                        return;
                    }

                    line.Quantity += 1;

                    line.Units.push
                    ({
                        ChassisNo:chassis,
                        EngineNo:engine,
                        KeyNo:this.keyBattery ? cell('Key No').toUpperCase() : '',
                        BatteryNo:this.keyBattery ? cell('Battery No').toUpperCase() : ''
                    });

                    return;
                }

                line.Quantity = quantity;

                line.Notes = cell('Notes').slice(0, 200);

                const rackCode =
                    cell('Rack Code');

                if
                (
                    rackCode
                )
                {
                    const rack =
                        (this.defaults?.Racks ?? [])
                            .find(x => x.WarehouseId === this.warehouseId && x.Code.toUpperCase() === rackCode.toUpperCase());

                    const shelf =
                        Math.floor(toNumber(cell('Shelf')) || 0);

                    if
                    (
                        !rack
                    )
                    {
                        errors.push(`${at} : rack ${rackCode} is not in this warehouse; ${product.Code} is loaded without a place.`);
                    }
                    else if
                    (
                        rack.ShelfCount > 0 && (shelf < 1 || shelf > rack.ShelfCount)
                    )
                    {
                        errors.push(`${at} : rack ${rack.Code} has shelves 1 to ${rack.ShelfCount}; ${product.Code} is loaded without a place.`);
                    }
                    else
                    {
                        // Bin : 1 when the column is empty (old sheets)
                        const bin =
                            Math.floor(toNumber(cell('Bin')) || 0) || 1;

                        const map =
                            this.binRack(rack.Id);

                        const taken =
                            new Set(
                                [...this.lines, ...lines.values()]
                                    .filter(x => x.ProductId !== product.Id && !!x.RackId && x.Shelf > 0 && x.Bin > 0)
                                    .map(x => binKey(x.RackId ?? 0, x.Shelf, x.Bin)));

                        if
                        (
                            bin > mapBinCount(map, shelf)
                        )
                        {
                            errors.push(`${at} : shelf ${shelf} of rack ${rack.Code} has bins 1 to ${mapBinCount(map, shelf)}; ${product.Code} is loaded without a place.`);
                        }
                        else if
                        (
                            map && !mapBinFree(map, shelf, bin, this.itemType, product.Id, taken)
                        )
                        {
                            errors.push(`${at} : bin ${binCode(rack.Name, shelf, bin)} holds another item (one item per bin); ${product.Code} is loaded without a place.`);
                        }
                        else
                        {
                            line.RackId = rack.Id;

                            line.Shelf = rack.ShelfCount > 0 ? shelf : 0;

                            line.Bin = line.Shelf ? bin : 0;
                        }
                    }
                }
                else
                {
                    this.placeDefault(line);
                }
            }
        );

        this.importResult =
        {
            lines:[...lines.values()],
            rows:rows.length,
            errors
        };

        this.refreshView();
    }

    private findProduct
    (
        text:
            string
    ):
        OpeningStockProduct | null
    {
        const key =
            text.trim().toUpperCase();

        if
        (
            !key
        )
        {
            return null;
        }

        const products =
            this.defaults?.Products ?? [];

        return products.find(x => x.Code.toUpperCase() === key)
            ?? products.find(x => x.Name.toUpperCase().split(' - ')[0].trim() === key)
            ?? products.find(x => x.Name.toUpperCase() === key)
            ?? null;
    }

    // Imported lines in : a product already on the list is replaced
    applyImport():
        void
    {
        const result =
            this.importResult;

        if
        (
            !result || result.lines.length === 0
        )
        {
            return;
        }

        for (const line of result.lines)
        {
            this.fitUnits(line);

            const index =
                this.lines.findIndex(x => x.ProductId === line.ProductId);

            if
            (
                index >= 0
            )
            {
                this.lines[index] = line;
            }
            else
            {
                this.lines.push(line);
            }
        }

        this.lines = [...this.lines];

        this.importOpen = false;

        this.importResult = null;

        this.resetPick();

        this.buildLists();

        this.scheduleCheck(0);

        this.toast.success('Imported', `${result.lines.length} ${result.lines.length === 1 ? 'line' : 'lines'} loaded into the summary.`);

        this.refreshView();
    }

    //===========================================================
    // Save / Post / Delete
    //===========================================================

    // First problem the page can see (the server checks again)
    private problem
    (
        posting:
            boolean
    ):
        string
    {
        if
        (
            !this.branchId
        )
        {
            return 'Choose the branch receiving the stock.';
        }

        if
        (
            !this.warehouseId
        )
        {
            return 'Choose the warehouse the stock is in.';
        }

        if
        (
            !this.ledgerCode
        )
        {
            return this.ledgerLocked
                ? 'Set the Opening Stock ledger on Settings › Account Settings › Posting Setup (the ledger is locked to it).'
                : 'Choose the credit ledger (Opening Stock), or set it on Posting Setup.';
        }

        if
        (
            this.lines.length === 0
        )
        {
            return `Add at least one ${this.info.item.toLowerCase()} : pick it on the left and press Add, or import from Excel.`;
        }

        if
        (
            this.isBikes
        )
        {
            for (const line of this.lines)
            {
                const half =
                    line.Units.find(x => this.unitHalf(x));

                if
                (
                    half
                )
                {
                    return `${line.ProductName} : a bike has only some of its numbers. Enter its Chassis No and Engine No, or clear the row.`;
                }

                if
                (
                    posting && !this.unitsComplete(line)
                )
                {
                    return this.keyBattery
                        ? `${line.ProductName} : enter Chassis, Engine, Key and Battery No of every bike.`
                        : `${line.ProductName} : enter Chassis No and Engine No of every bike.`;
                }

                for (const unit of line.Units)
                {
                    for (const field of this.unitFields)
                    {
                        const message =
                            this.unitProblem(unit, field);

                        if
                        (
                            message
                        )
                        {
                            return message;
                        }
                    }
                }
            }
        }

        if
        (
            posting
        )
        {
            const noLedger =
                this.lines.find(x => !x.HasLedger);

            if
            (
                noLedger
            )
            {
                return `${noLedger.ProductName} has no Inventory ledger. Set it on the product first.`;
            }

            const unpriced =
                this.lines.find(x => !(x.Mrp > 0));

            if
            (
                unpriced
            )
            {
                return `${unpriced.ProductName} : enter the MRP, which is the sale price (double-click the line). An unpriced batch cannot be sold.`;
            }
        }

        return '';
    }

    private payload():
        CreateOpeningStock
    {
        return {
            PageType:this.type,
            OpeningDate:toIsoDate(this.openingDate),
            BranchId:this.branchId,
            WarehouseId:this.warehouseId,
            CostBasis:this.mrpBasis ? 'MRP' : 'Cost',
            LedgerCode:this.ledgerCode,
            Remarks:this.remarks.trim(),
            Lines:this.lines.map
            (
                x =>
                ({
                    ProductId:x.ProductId,
                    Quantity:x.Quantity,
                    // Typed cost : incl. VAT when the type carries VAT
                    UnitCost:this.vatIncluded && !this.mrpBasis ? x.GrossCost : x.UnitCost,
                    Mrp:x.Mrp,
                    MarginPercent:this.mrpBasis ? x.MarginPercent : 0,
                    RackManagementId:this.info.hasShelves ? x.RackId : null,
                    ShelfNumber:this.info.hasShelves && x.RackId ? x.Shelf : 0,
                    BinNumber:this.info.hasShelves && x.RackId && x.Shelf ? (x.Bin || 1) : 0,
                    SaveAsDefault:this.info.hasShelves && !!x.RackId && x.SaveDefault,
                    ShortNotes:x.Notes.trim()
                })
            ),
            Units:this.isBikes ? this.typedUnits() : []
        };
    }

    private saveDraft():
        Observable<OpeningStockSaved>
    {
        const id =
            this.doc?.OpeningStockId ?? 0;

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
            this.problem(false);

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
            !!this.doc?.OpeningStockId;

        this.progress
            .run(
                updating ? 'Updating Opening Stock' : 'Saving Opening Stock',
                updating ? `Please wait while "${this.doc?.OpeningNo}" is being updated...` : 'Please wait while the opening stock is being saved...',
                updating ? 'Opening stock updated.' : 'Opening stock saved.',
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
                            `${saved.OpeningNo} ${updating ? 'updated' : 'saved as a draft'}. Post it when the count is final.`);

                        // After every action : back to the list
                        this.back();
                    },

                error:
                    err =>
                    {
                        this.saving = false;

                        this.toast.error('Not Saved', errorText(err, 'The opening stock could not be saved.'));

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
            this.problem(true);

        if
        (
            problem
        )
        {
            // Only the message : the bikes' numbers are entered from
            // the bikes button on the line in the summary
            this.toast.error('Not Posted', problem);

            return;
        }

        this.saving = true;

        this.refreshView();

        let savedNo =
            '';

        const posting =
            this.saveDraft()
                .pipe(
                switchMap
                (
                    saved =>
                    {
                        savedNo = saved.OpeningNo;

                        // Saved : a failed post stays an editable draft
                        if
                        (
                            !this.doc
                        )
                        {
                            this.doc = { OpeningStockId:saved.OpeningStockId } as OpeningStock;
                        }

                        return this.service.post(saved.OpeningStockId);
                    }
                ));

        this.progress
            .run(
                'Posting Opening Stock',
                'Please wait while the stock is put on hand and the journal is made...',
                'Opening stock posted.',
                posting)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    posted =>
                    {
                        this.saving = false;

                        this.toast.success('Posted', `${posted.OpeningNo || savedNo} posted : the stock is on hand and the journal is made.`);

                        this.back();
                    },

                error:
                    err =>
                    {
                        this.saving = false;

                        this.toast.error(
                            'Not Posted',
                            errorText(err, 'The opening stock could not be posted.')
                            + (savedNo ? ` It is saved as draft ${savedNo}.` : ''));

                        if
                        (
                            this.mode === 'add' && this.doc?.OpeningStockId
                        )
                        {
                            this.router.navigate([OPENING_STOCK_ROUTE, 'edit', this.doc.OpeningStockId], { replaceUrl:true });

                            return;
                        }

                        this.refreshView();
                    }
            });
    }

    // View : a posted document gets Cancel; a draft gets Post
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
                'Posting Opening Stock',
                `Please wait while "${doc.OpeningNo}" is put on hand and its journal is made...`,
                'Opening stock posted.',
                this.service.post(doc.OpeningStockId))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.saving = false;

                        this.toast.success('Posted', `${doc.OpeningNo} posted : the stock is on hand and the journal is made.`);

                        this.back();
                    },

                error:
                    err =>
                    {
                        this.saving = false;

                        this.toast.error('Not Posted', errorText(err, 'The opening stock could not be posted.') + ' Open it for editing to fix it.');

                        this.refreshView();
                    }
            });
    }

    clear():
        void
    {
        this.lines = [];
        this.remarks = '';
        this.error = '';
        this.taken = new Map();
        this.desk = null;
        this.resetPick();
        this.buildLists();
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
                'Deleting Opening Stock',
                `Please wait while "${doc.OpeningNo}" is being deleted...`,
                'Opening stock deleted.',
                this.service.delete(doc.OpeningStockId))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.saving = false;

                        this.deleteOpen = false;

                        this.toast.success('Deleted', `Draft ${doc.OpeningNo} deleted.`);

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
                this.router.createUrlTree(['/print-viewer', OPENING_STOCK_PRINT_KEY, this.doc.OpeningStockId])
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
            this.toast.error('Reason Needed', 'Write why the opening stock is cancelled.');

            return;
        }

        this.saving = true;

        this.cancelOpen = false;

        this.progress
            .run(
                'Cancelling Opening Stock',
                `Please wait while "${doc.OpeningNo}" is being cancelled...`,
                'Opening stock cancelled.',
                this.service.cancel(doc.OpeningStockId, this.cancelReason.trim()))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.saving = false;

                        this.cancelOpen = false;

                        this.toast.success('Cancelled', `${doc.OpeningNo} cancelled : the stock and the journal are reversed.`);

                        this.back();
                    },

                error:
                    err =>
                    {
                        this.saving = false;

                        this.toast.error('Not Cancelled', errorText(err, 'The opening stock could not be cancelled.'));

                        this.refreshView();
                    }
            });
    }

    back():
        void
    {
        this.router.navigate([OPENING_STOCK_ROUTE, 'list']);
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
                return 'Add Opening Stock';

            case 'edit':
                return 'Update Opening Stock';

            default:
                return 'View Opening Stock';
        }
    }

    get warehouseText():
        string
    {
        return this.isView
            ? (this.doc?.WarehouseName || '—')
            : (this.defaults?.Warehouses.find(x => x.Id === this.warehouseId)?.Name || 'Not set');
    }

    // Saved : its number ; new : the branch's next one
    get openingNoText():
        string
    {
        return this.doc?.OpeningNo || this.branchNextNumber;
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

    // Includes Unclaimed VAT : view = as saved; add / edit = switch
    get vatIncluded():
        boolean
    {
        return this.isView
            ? !!this.doc?.VatIncluded
            : !!this.defaults?.VatIncluded;
    }

    lineVat
    (
        line:
            FormLine
    ):
        number
    {
        return this.vatIncluded
            ? vatOf(line.Quantity, line.GrossCost, line.UnitCost)
            : 0;
    }

    get totalVat():
        number
    {
        return this.isView
            ? (this.doc?.TotalVat ?? 0)
            : this.lines.reduce((t, x) => t + this.lineVat(x), 0);
    }

    // Lock Opening Stock Ledger ON : the Posting Setup ledger only
    get ledgerLocked():
        boolean
    {
        return !!this.defaults?.LedgerLocked;
    }

    get ledgerMissing():
        boolean
    {
        return !this.isView && !!this.defaults && !this.defaults.DefaultLedgerCode;
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
        return formatOpeningDate(iso);
    }

    qty
    (
        value:
            number
    ):
        string
    {
        return formatOpeningQty(value);
    }

    money
    (
        value:
            number
    ):
        string
    {
        return formatOpeningMoney(value);
    }

    cost
    (
        value:
            number
    ):
        string
    {
        return formatOpeningCost(value);
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

// Cost without its VAT (4 decimals, as the server)
function netOf
(
    gross:
        number,
    rate:
        number
):
    number
{
    return rate > 0
        ? Math.round(gross / (1 + rate / 100) * 10000) / 10000
        : gross;
}

// A line's VAT : gross value − net value (each to the paisa)
function vatOf
(
    quantity:
        number,
    gross:
        number,
    net:
        number
):
    number
{
    return Math.round(quantity * gross * 100) / 100 - Math.round(quantity * net * 100) / 100;
}

function lineValue
(
    line:
        { Quantity:number; UnitCost:number }
):
    number
{
    return Math.round(line.Quantity * line.UnitCost * 100) / 100;
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
