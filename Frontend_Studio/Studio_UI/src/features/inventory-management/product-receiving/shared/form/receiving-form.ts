//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    DestroyRef,
    Input,
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
    Subscription
}
from 'rxjs';

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
    DatepickerComponent
}
from '../../../../../shared/components/controls/datepicker/datepicker';

import
{
    TextboxComponent
}
from '../../../../../shared/components/controls/textbox/textbox';

import
{
    TextareaComponent
}
from '../../../../../shared/components/controls/textarea/textarea';

import
{
    CheckboxComponent
}
from '../../../../../shared/components/utilities/checkbox/checkbox';

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
    AuthenticationStorageService
}
from '../../../../../core/authentication/authentication-storage.service';

import
{
    Receiving,
    ReceivingDefaults,
    ReceivingLine,
    ReceivingPageConfig,
    ReceivingPurchase,
    ReceivingRack,
    ReceivingShelf,
    ReceivingUnit,
    formatReceivingDate,
    formatReceivingQty,
    fromIsoDate,
    receivingConfig,
    toIsoDate
}
from '../receiving.model';

import
{
    ReceivingService
}
from '../receiving.service';

import
{
    RackManagementService
}
from '../../../../settings/product-settings/services/rack-management.service';

import
{
    BinMapRack,
    binItemType,
    binKey,
    mapBinFree,
    mapBinItems,
    mapFirstFree,
    mapFreeBins,
    mapRack,
    mapRackFreeCount,
    mapShelfItems
}
from '../../../../../shared/inventory/bin-availability';

import
{
    binCode
}
from '../../../../../shared/inventory/storage-labels';


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

// One line of the purchase still in transit; Added = in the
// Receiving Summary (right)
interface FormLine
{
    PurchaseLineId:number;
    LineNo:number;
    ProductId:number;
    ProductCode:string;
    ProductName:string;
    Unit:string;
    BatchNo:string;
    Purchased:number;
    ReceivedBefore:number;
    Pending:number;
    Added:boolean;
    Quantity:number;
    RackId:number | null;
    Shelf:number;
    // The bin (the location)
    Bin:number;
    SaveDefault:boolean;
    Notes:string;
    Units:UnitRow[];
    // Default place (rack · shelf · bin) of the product per warehouse
    Shelves:ReceivingShelf[];
}

// Unit Desk (MB) : a working copy; Save writes it back
interface Desk
{
    line:FormLine | null;
    name:string;
    code:string;
    readonly:boolean;
    // Key / Battery columns : Key & Battery Required ON (view :
    // also when a bike has them)
    keys:boolean;
    // The columns typed / pasted into, left to right
    fields:UnitField[];
    rows:UnitRow[];
}

type UnitField =
    'ChassisNo' | 'EngineNo' | 'KeyNo' | 'BatteryNo';


//===============================================================
// Product Receiving form : one page type (wrapper gives it).
// Same layout as the Purchase page :
//
//   LEFT  : Receiving Information (No, Date, Warehouse, Purchase
//           Invoice, Received By); Add <item> : a line of the
//           invoice still in transit, the quantity received now,
//           rack · shelf · bin (SP / AC), notes. Add loads it into the
//           summary on the right (MB : the bikes button on the
//           line opens the Unit Desk for their numbers).
//   RIGHT : Purchase Invoice facts, Remarks; Receiving Summary
//           (double-click a line to edit it).
//
//   Post saves and posts (no draft). View : Print, Cancel.
//===============================================================

@Component(
{
    selector:'receiving-form',

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
        ToastComponent
    ],

    templateUrl:'./receiving-form.html',

    styleUrl:'./receiving-form.css'
})

export class ReceivingForm
    implements OnInit
{
    private readonly service =
        inject(ReceivingService);

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

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly destroyRef =
        inject(DestroyRef);

    // MB / SP / AC (page wrapper)
    @Input({ required:true })
    type!:
        string;

    page!:
        ReceivingPageConfig;

    //===========================================================
    // State
    //===========================================================

    isView:
        boolean = false;

    loading:
        boolean = false;

    saving:
        boolean = false;

    error:
        string = '';

    defaults:
        ReceivingDefaults | null = null;

    purchases:
        ReceivingPurchase[] = [];

    purchasesLoaded:
        boolean = false;

    // View mode : the saved receiving
    receiving:
        Receiving | null = null;

    //===========================================================
    // Header
    //===========================================================

    receivingDate:
        Date = new Date();

    branchId:
        number = 0;

    warehouseId:
        number = 0;

    purchaseId:
        number = 0;

    receivedBy:
        string = '';

    remarks:
        string = '';

    // Every line of the purchase still in transit
    lines:
        FormLine[] = [];

    // Items built once per change (not getters)
    warehouseItems:
        Option[] = [];

    purchaseItems:
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

    addedLines:
        FormLine[] = [];

    facts:
        Fact[] = [];

    details:
        Fact[] = [];

    invoiceStatus:
        string = '';

    invoiceTone:
        string = '';

    //===========================================================
    // Add card
    //===========================================================

    pickId:
        number = 0;

    pickQty:
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

    // The line in the Add card for Update (double-click)
    editingId:
        number = 0;

    lineError:
        string = '';

    //===========================================================
    // Cancel (view) / Unit Desk (MB)
    //===========================================================

    cancelOpen:
        boolean = false;

    cancelReason:
        string = '';

    desk:
        Desk | null = null;

    readonly unitFields:
        UnitField[] =
        ['ChassisNo', 'EngineNo', 'KeyNo', 'BatteryNo'];

    readonly unitPlaceholders:
        Record<UnitField, string> =
        { ChassisNo:'Chassis', EngineNo:'Engine', KeyNo:'Key', BatteryNo:'Battery' };

    // Key & Battery Required (System Configuration, MB) : ON =
    // asked and required; OFF = not kept (columns hidden)
    get keyBattery():
        boolean
    {
        return !!this.defaults?.UnitsRequired;
    }

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

    // Live bike-number check (MB)
    taken:
        Map<string, string> = new Map();

    checking:
        boolean = false;

    private checkTimer?:
        ReturnType<typeof setTimeout>;

    private checkRequest?:
        Subscription;

    // Date limits (kept in fields : a new Date on every check
    // would make the datepicker redraw)
    minDate:
        Date | null = null;

    maxDate:
        Date = new Date();

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
            console.error('[Receiving] view update failed', error);
        }
    }

    //===========================================================
    // Start
    //===========================================================

    ngOnInit():
        void
    {
        this.page =
            receivingConfig(this.type);

        const user =
            this.authStorage.getUser() as any;

        this.branchId =
            Number(user?.branchId) || 0;

        this.receivedBy =
            String(user?.fullName || user?.displayName || '');

        const id =
            this.route.snapshot.paramMap.get('id') ?? '';

        if
        (
            id !== ''
        )
        {
            this.isView = true;

            this.loadReceiving(id);

            return;
        }

        this.loadDefaults();

        this.loadPurchases();
    }

    private loadReceiving
    (
        id:
            string
    ):
        void
    {
        this.loading = true;

        this.service
            .getById(this.page.path, id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    receiving =>
                    {
                        this.receiving = receiving;

                        this.loading = false;

                        this.buildViewFacts();

                        this.refreshView();
                    },

                error:
                    err =>
                    {
                        this.loading = false;

                        this.error = errorText(err, 'The receiving could not be loaded.');

                        this.refreshView();
                    }
            });

        // Bike rules (Key / Battery required) for the Unit Desk
        if
        (
            this.page.type === 'MB' && !this.defaults
        )
        {
            this.service
                .getDefaults(this.page.path, this.branchId, toIsoDate(new Date()))
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe
                ({
                    next:
                        defaults =>
                        {
                            this.defaults = defaults;

                            this.refreshView();
                        },

                    error:
                        () => {}
                });
        }
    }

    private loadDefaults():
        void
    {
        this.service
            .getDefaults(this.page.path, this.branchId, toIsoDate(this.receivingDate))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    defaults =>
                    {
                        this.defaults = defaults;

                        const today =
                            fromIsoDate(defaults.Today);

                        if
                        (
                            today && !this.purchaseId
                        )
                        {
                            this.receivingDate = today;
                        }

                        this.warehouseItems =
                            defaults.Warehouses.map(x => ({ label:x.Name, value:x.Id }));

                        if
                        (
                            !this.warehouseId
                        )
                        {
                            this.warehouseId =
                                (defaults.Warehouses.find(x => x.IsDefault) ?? defaults.Warehouses[0])?.Id ?? 0;
                        }

                        this.buildRackItems();

                        this.lines.forEach(x => { if (!x.Added) { this.placeDefault(x); } });

                        this.updateDateLimits();

                        this.refreshView();
                    },

                error:
                    err =>
                    {
                        this.error = errorText(err, 'The receiving defaults could not be loaded.');

                        this.refreshView();
                    }
            });
    }

    private loadPurchases():
        void
    {
        this.loading = true;

        this.service
            .getPendingPurchases(this.page.path, this.branchId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    purchases =>
                    {
                        this.purchases = purchases;

                        this.purchasesLoaded = true;

                        this.purchaseItems =
                            purchases.map
                            (
                                x =>
                                ({
                                    label:`${x.PurchaseNo} · ${x.SupplierName} · ${formatReceivingQty(x.PendingQuantity)} in transit${x.ReceivingStatus === 'Partly Received' ? ' (partly received)' : ''}`,
                                    value:x.PurchaseId
                                })
                            );

                        this.loading = false;

                        this.refreshView();
                    },

                error:
                    err =>
                    {
                        this.loading = false;

                        this.purchasesLoaded = true;

                        this.error = errorText(err, 'The purchases to receive could not be loaded.');

                        this.refreshView();
                    }
            });
    }

    //===========================================================
    // Header changes
    //===========================================================

    get purchase():
        ReceivingPurchase | null
    {
        return this.purchases.find(x => x.PurchaseId === this.purchaseId) ?? null;
    }

    private updateDateLimits():
        void
    {
        const today =
            fromIsoDate(this.defaults?.Today ?? '') ?? new Date();

        let min:
            Date | null =
            this.defaults && !this.defaults.BackDatedAllowed
                ? today
                : this.defaults && this.defaults.BackDatedDays > 0
                    ? new Date(today.getFullYear(), today.getMonth(), today.getDate() - this.defaults.BackDatedDays)
                    : null;

        const bought =
            fromIsoDate(this.purchase?.PurchaseDate ?? '');

        if
        (
            bought && (!min || bought > min)
        )
        {
            min = bought;
        }

        this.minDate = min;

        this.maxDate = today;

        if
        (
            min && this.receivingDate < min
        )
        {
            this.receivingDate = min;
        }

        if
        (
            this.receivingDate > today
        )
        {
            this.receivingDate = today;
        }
    }

    onDateChange
    (
        date:
            Date
    ):
        void
    {
        this.receivingDate = date;
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
        for (const line of this.lines)
        {
            this.placeDefault(line);
        }

        if
        (
            this.pick
        )
        {
            this.loadPick(this.pick);
        }

        this.buildLists();
    }

    onPurchaseChange
    (
        value:
            any
    ):
        void
    {
        this.purchaseId = Number(value) || 0;

        this.error = '';

        this.taken = new Map();

        this.lines =
            (this.purchase?.Lines ?? [])
                .filter(x => x.PendingQuantity > 0)
                .map
                (
                    x =>
                    ({
                        PurchaseLineId:x.PurchaseLineId,
                        LineNo:x.LineNo,
                        ProductId:x.ProductId,
                        ProductCode:x.ProductCode,
                        ProductName:x.ProductName,
                        Unit:x.Unit,
                        BatchNo:x.BatchNo,
                        Purchased:x.PurchasedQuantity,
                        ReceivedBefore:x.ReceivedBefore,
                        Pending:x.PendingQuantity,
                        Added:false,
                        Quantity:0,
                        RackId:null,
                        Shelf:0,
                        Bin:0,
                        SaveDefault:false,
                        Notes:'',
                        Units:[],
                        Shelves:x.Shelves
                    })
                );

        this.lines.forEach(x => this.placeDefault(x));

        this.resetPick();

        this.buildLists();

        this.buildPurchaseFacts();

        this.updateDateLimits();
    }

    // Racks of the warehouse; badge = free bins for the picked
    // product
    private buildRackItems():
        void
    {
        const taken =
            this.takenBins(this.pick);

        const productId =
            this.pick?.ProductId ?? 0;

        this.rackItems =
            (this.defaults?.Racks ?? [])
                .filter(x => x.WarehouseId === this.warehouseId)
                .map
                (
                    x =>
                    ({
                        label:`${x.Code}${x.Name && x.Name !== x.Code ? ' · ' + x.Name : ''}${x.ZoneCode ? ' · ' + x.ZoneCode : ''}`,
                        value:x.Id,
                        count:String(mapRackFreeCount(this.binRack(x.Id), this.itemType, productId, taken))
                    })
                );

        this.loadBinMap();
    }

    // The rack map of the warehouse (who holds which bin), once
    // per warehouse; a late answer of an older warehouse is
    // ignored
    private loadBinMap():
        void
    {
        if
        (
            !this.page.hasShelves || !this.warehouseId || this.binMapOf === this.warehouseId
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
                        // checks on post
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
        return binItemType(this.page.type);
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

    // Bins the added lines of OTHER products take (two lines of
    // one product may share its bin)
    private takenBins
    (
        line:
            FormLine | null
    ):
        Set<string>
    {
        return new Set(
            this.lines
                .filter
                (
                    x =>
                        x.Added
                        && x !== line
                        && x.ProductId !== (line?.ProductId ?? 0)
                        && !!x.RackId
                        && x.Shelf > 0
                        && x.Bin > 0
                )
                .map(x => binKey(x.RackId ?? 0, x.Shelf, x.Bin)));
    }

    private buildShelfItems():
        void
    {
        this.shelfItems =
            mapShelfItems(
                this.binRack(this.pickRackId),
                this.rackById(this.pickRackId)?.Name ?? '',
                this.itemType,
                this.pick?.ProductId ?? 0,
                this.takenBins(this.pick));

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
                this.pick?.ProductId ?? 0,
                this.takenBins(this.pick),
                this.pickBin);
    }

    // Product dropdown : lines not yet added; summary : added
    private buildLists():
        void
    {
        this.addedLines =
            this.lines
                .filter(x => x.Added)
                .sort((a, b) => a.LineNo - b.LineNo);

        this.productItems =
            this.lines
                .filter(x => !x.Added || x.PurchaseLineId === this.editingId)
                .map
                (
                    x =>
                    ({
                        label:`${x.ProductName} · ${x.ProductCode} · ${formatReceivingQty(x.Pending)} ${x.Unit}`,
                        value:x.PurchaseLineId
                    })
                );
    }

    private rackById
    (
        id:
            number | null
    ):
        ReceivingRack | null
    {
        return id
            ? (this.defaults?.Racks ?? []).find(x => x.Id === id) ?? null
            : null;
    }

    // The product's default rack · shelf · bin in this warehouse
    private placeDefault
    (
        line:
            FormLine
    ):
        void
    {
        if
        (
            !this.page.hasShelves
        )
        {
            return;
        }

        const shelf =
            line.Shelves.find(x => x.WarehouseId === this.warehouseId);

        line.RackId = shelf ? shelf.RackManagementId : null;

        line.Shelf = shelf ? shelf.ShelfNumber : 0;

        line.Bin = shelf ? (shelf.BinNumber || 1) : 0;

        line.SaveDefault = false;
    }

    defaultShelfText
    (
        line:
            FormLine
    ):
        string
    {
        const shelf =
            line.Shelves.find(x => x.WarehouseId === this.warehouseId);

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
        FormLine | null
    {
        return this.lines.find(x => x.PurchaseLineId === this.pickId) ?? null;
    }

    private resetPick():
        void
    {
        this.pickId = 0;

        this.pickQty = '';

        this.pickRackId = 0;

        this.pickShelf = 0;

        this.pickBin = 0;

        this.pickDefault = false;

        this.pickNotes = '';

        this.editingId = 0;

        this.lineError = '';

        this.shelfItems = [];

        this.binItems = [];

        this.buildRackItems();
    }

    // The line's values into the Add card
    private loadPick
    (
        line:
            FormLine
    ):
        void
    {
        this.pickId = line.PurchaseLineId;

        this.pickQty = line.Added ? String(line.Quantity) : String(line.Pending);

        this.pickRackId = line.RackId ?? 0;

        this.pickShelf = line.Shelf;

        this.pickBin = line.Bin;

        this.pickDefault = line.SaveDefault;

        this.pickNotes = line.Notes;

        this.lineError = '';

        this.buildRackItems();

        this.buildShelfItems();
    }

    onPickChange
    (
        value:
            any
    ):
        void
    {
        const line =
            this.lines.find(x => x.PurchaseLineId === (Number(value) || 0));

        if
        (
            !line
        )
        {
            this.resetPick();

            this.buildLists();

            return;
        }

        this.loadPick(line);
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
            mapFirstFree(this.binRack(this.pickRackId), this.itemType, this.pick?.ProductId ?? 0, this.takenBins(this.pick));

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
            mapFreeBins(this.binRack(this.pickRackId), this.pickShelf, this.itemType, this.pick?.ProductId ?? 0, this.takenBins(this.pick))[0] ?? 0;

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

    // Quantity typed in the Add card : a number, not more than
    // in transit, whole units for bikes
    private pickQuantity
    (
        line:
            FormLine
    ):
        number | string
    {
        const text =
            this.pickQty.replace(/,/g, '').trim();

        const value =
            text === '' ? line.Pending : Number(text);

        if
        (
            !Number.isFinite(value) || value <= 0
        )
        {
            return 'Enter the quantity received now.';
        }

        if
        (
            this.page.wholeUnits && !Number.isInteger(value)
        )
        {
            return 'Bikes are received in whole units.';
        }

        if
        (
            value > line.Pending
        )
        {
            return `Only ${formatReceivingQty(line.Pending)} ${line.Unit} is in transit.`;
        }

        return Math.round(value * 100) / 100;
    }

    onAddLine():
        void
    {
        const line =
            this.pick;

        if
        (
            !line
        )
        {
            this.lineError = this.purchase ? 'Select a line of the invoice.' : 'Select the purchase invoice first.';

            this.refreshView();

            return;
        }

        const quantity =
            this.pickQuantity(line);

        if
        (
            typeof quantity === 'string'
        )
        {
            this.lineError = quantity;

            this.refreshView();

            return;
        }

        if
        (
            this.page.hasShelves && this.defaults?.ShelfRequired && !this.pickRackId
        )
        {
            this.lineError = 'Choose the rack, shelf and bin (System Configuration : shelf required).';

            this.refreshView();

            return;
        }

        // A place : rack + shelf + a free bin (one item per bin)
        if
        (
            this.page.hasShelves && this.pickRackId
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
                !mapBinFree(rack, this.pickShelf, this.pickBin, this.itemType, line.ProductId, this.takenBins(line))
            )
            {
                this.lineError = `Bin ${binCode(rack.RackName, this.pickShelf, this.pickBin)} holds another item or another line uses it (one item per bin). Choose a free bin.`;

                this.refreshView();

                return;
            }
        }

        line.Added = true;

        line.Quantity = quantity;

        line.RackId = this.page.hasShelves && this.pickRackId ? this.pickRackId : null;

        line.Shelf = line.RackId ? this.pickShelf : 0;

        line.Bin = line.RackId ? this.pickBin : 0;

        line.SaveDefault = !!line.RackId && this.pickDefault;

        line.Notes = this.pickNotes.trim();

        this.fitUnits(line);

        this.resetPick();

        this.buildLists();

        // Bikes : their numbers from the bikes button on the line
        // in the summary (the Unit Desk does not open here)

        this.refreshView();
    }

    addAll():
        void
    {
        for (const line of this.lines)
        {
            if
            (
                line.Added
            )
            {
                continue;
            }

            line.Added = true;

            line.Quantity = line.Pending;

            this.fitUnits(line);
        }

        this.resetPick();

        this.buildLists();

        if
        (
            this.page.hasShelves && this.defaults?.ShelfRequired
        )
        {
            const missing =
                this.addedLines.find(x => !x.RackId);

            if
            (
                missing
            )
            {
                this.toast.warning('Rack Needed', `${missing.ProductName} has no default place here : double-click it to choose the rack, shelf and bin.`);
            }
        }
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
            this.saving
        )
        {
            return;
        }

        this.editingId = line.PurchaseLineId;

        this.loadPick(line);

        this.buildLists();
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
        line.Added = false;

        line.Quantity = 0;

        line.Units = [];

        line.Notes = '';

        this.placeDefault(line);

        this.buildLists();

        this.scheduleCheck(0);
    }

    get rowCount():
        number
    {
        return this.isView
            ? (this.receiving?.Lines.length ?? 0)
            : this.addedLines.length;
    }

    get totalQuantity():
        number
    {
        return this.isView
            ? (this.receiving?.TotalQuantity ?? 0)
            : this.addedLines.reduce((t, x) => t + x.Quantity, 0);
    }

    get totalPurchased():
        number
    {
        return this.isView
            ? (this.receiving?.Lines ?? []).reduce((t, x) => t + x.PurchasedQuantity, 0)
            : this.addedLines.reduce((t, x) => t + x.Purchased, 0);
    }

    get totalBefore():
        number
    {
        return this.isView
            ? (this.receiving?.Lines ?? []).reduce((t, x) => t + x.ReceivedBefore, 0)
            : this.addedLines.reduce((t, x) => t + x.ReceivedBefore, 0);
    }

    //===========================================================
    // Facts (right top) / details (view, left)
    //===========================================================

    private buildPurchaseFacts():
        void
    {
        const p =
            this.purchase;

        if
        (
            !p
        )
        {
            this.facts = [];

            this.invoiceStatus = '';

            return;
        }

        this.facts =
        [
            { label:'Supplier', value:p.SupplierName, wide:true },
            { label:'Purchase Date', value:formatReceivingDate(p.PurchaseDate) },
            { label:'Invoice No', value:p.SupplierInvoiceNo },
            { label:'Mushak 6.3', value:p.MushakNo },
            { label:'DO Reference', value:p.DoReference },
            { label:'Gate Pass', value:p.GatePassNo },
            { label:'In Transit', value:`${formatReceivingQty(p.PendingQuantity)} of ${formatReceivingQty(p.PurchasedQuantity)}` }
        ];

        this.invoiceStatus = p.ReceivingStatus;

        this.invoiceTone = p.ReceivingStatus === 'Partly Received' ? 'amber' : 'blue';
    }

    private buildViewFacts():
        void
    {
        const r =
            this.receiving;

        if
        (
            !r
        )
        {
            return;
        }

        this.facts =
        [
            { label:'Supplier', value:r.SupplierName, wide:true },
            { label:'Purchase Date', value:formatReceivingDate(r.PurchaseDate) },
            { label:'Invoice No', value:r.SupplierInvoiceNo },
            { label:'Mushak 6.3', value:r.MushakNo },
            { label:'DO Reference', value:r.DoReference },
            { label:'Gate Pass', value:r.GatePassNo },
            { label:'Branch', value:r.BranchName }
        ];

        this.invoiceStatus = r.PurchaseNo;

        this.invoiceTone = 'blue';

        this.details =
        [
            { label:'Status', value:r.Status },
            { label:'Lines', value:String(r.Lines.length) },
            { label:'Quantity', value:formatReceivingQty(r.TotalQuantity) },
            { label:'Posted On', value:formatReceivingDate(r.CreatedDate) },
            { label:'Received By', value:r.ReceivedBy },
            { label:'Warehouse', value:r.WarehouseName },
            ...(r.Status === 'Cancelled'
                ? [
                    { label:'Cancelled On', value:formatReceivingDate(r.CancelledDate) },
                    { label:'Reason', value:r.CancelReason, wide:true }
                ]
                : [])
        ];
    }

    //===========================================================
    // Unit Desk (MB) : one row per bike received
    //===========================================================

    get isBikes():
        boolean
    {
        return this.page?.type === 'MB';
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
            ReceivingLine
    ):
        void
    {
        const rows =
            this.unitsOfLine(line.PurchaseLineId).map(x => ({ ChassisNo:x.ChassisNo, EngineNo:x.EngineNo, KeyNo:x.KeyNo, BatteryNo:x.BatteryNo }));

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
        const required =
            !!this.defaults?.UnitsRequired;

        return !!unit.ChassisNo.trim()
            && !!unit.EngineNo.trim()
            && (!required || (!!unit.KeyNo.trim() && !!unit.BatteryNo.trim()));
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

    // Every bike on this receiving : the desk's working rows in
    // place of its line's saved ones
    private everyUnit():
        { line:FormLine; unit:UnitRow }[]
    {
        const result:
            { line:FormLine; unit:UnitRow }[] = [];

        for (const line of this.addedLines)
        {
            const rows =
                this.desk && this.desk.line === line
                    ? this.desk.rows
                    : line.Units;

            rows.forEach(unit => result.push({ line, unit }));
        }

        return result;
    }

    // Red : repeated on this receiving or already on a bike
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

    private allUnits():
        ReceivingUnit[]
    {
        return this.everyUnit()
            .map
            (
                x =>
                ({
                    PurchaseLineId:x.line.PurchaseLineId,
                    ChassisNo:x.unit.ChassisNo.trim().toUpperCase(),
                    EngineNo:x.unit.EngineNo.trim().toUpperCase(),
                    KeyNo:this.keyBattery ? x.unit.KeyNo.trim().toUpperCase() : '',
                    BatteryNo:this.keyBattery ? x.unit.BatteryNo.trim().toUpperCase() : ''
                })
            );
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
            this.allUnits().filter(x => x.ChassisNo || x.EngineNo || x.KeyNo || x.BatteryNo);

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
                .checkUnits(this.page.path, units)
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

    //===========================================================
    // Post
    //===========================================================

    // First problem the page can see (the server checks again)
    private problem():
        { text:string; line?:FormLine }
    {
        if
        (
            !this.purchaseId
        )
        {
            return { text:'Choose the purchase invoice to receive.' };
        }

        if
        (
            !this.warehouseId
        )
        {
            return { text:'Choose the warehouse to receive into.' };
        }

        const lines =
            this.addedLines;

        if
        (
            lines.length === 0
        )
        {
            return { text:'Add at least one line : pick it on the left and press Add (or All).' };
        }

        if
        (
            this.page.hasShelves && this.defaults?.ShelfRequired
        )
        {
            const missing =
                lines.find(x => !x.RackId);

            if
            (
                missing
            )
            {
                return { text:`${missing.ProductName} : choose the rack, shelf and bin (double-click the line).` };
            }
        }

        // One item per bin : two products never on one bin
        if
        (
            this.page.hasShelves
        )
        {
            const seen =
                new Map<string, FormLine>();

            for (const x of lines)
            {
                if
                (
                    !x.RackId || !x.Shelf
                )
                {
                    continue;
                }

                const key =
                    binKey(x.RackId, x.Shelf, x.Bin || 1);

                const other =
                    seen.get(key);

                if
                (
                    other && other.ProductId !== x.ProductId
                )
                {
                    return { text:`${x.ProductName} and ${other.ProductName} are on one bin ${this.rackText(x)} (one item per bin) : double-click a line to move it.` };
                }

                seen.set(key, x);
            }
        }

        if
        (
            this.isBikes
        )
        {
            for (const line of lines)
            {
                if
                (
                    !this.unitsComplete(line)
                )
                {
                    return {
                        text:this.defaults?.UnitsRequired
                            ? `${line.ProductName} : enter Chassis, Engine, Key and Battery No of every bike.`
                            : `${line.ProductName} : enter Chassis No and Engine No of every bike.`,
                        line
                    };
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
                            return { text:message, line };
                        }
                    }
                }
            }
        }

        return { text:'' };
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
            problem.text
        )
        {
            // Only the message : the bikes' numbers are entered from
            // the bikes button on the line in the summary
            this.toast.error('Not Posted', problem.text);

            this.refreshView();

            return;
        }

        this.error = '';

        this.saving = true;

        this.refreshView();

        this.service
            .create(
                this.page.path,
                {
                    ReceivingDate:toIsoDate(this.receivingDate),
                    BranchId:this.purchase?.BranchId ?? this.branchId,
                    WarehouseId:this.warehouseId,
                    PurchaseId:this.purchaseId,
                    ReceivedBy:this.receivedBy.trim(),
                    Remarks:this.remarks.trim(),
                    Lines:this.addedLines.map
                    (
                        x =>
                        ({
                            PurchaseLineId:x.PurchaseLineId,
                            Quantity:x.Quantity,
                            RackManagementId:this.page.hasShelves ? x.RackId : null,
                            ShelfNumber:this.page.hasShelves && x.RackId ? x.Shelf : 0,
                            BinNumber:this.page.hasShelves && x.RackId && x.Shelf ? (x.Bin || 1) : 0,
                            SaveAsDefault:this.page.hasShelves && !!x.RackId && x.SaveDefault,
                            ShortNotes:x.Notes.trim()
                        })
                    ),
                    Units:this.isBikes ? this.allUnits() : []
                }
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    saved =>
                    {
                        this.saving = false;

                        this.toast.success('Received', `${saved.ReceivingNo} posted : the stock is on hand.`);

                        // After an action the form closes : back to the list
                        this.router.navigate([this.page.route, 'list']);
                    },

                error:
                    err =>
                    {
                        this.saving = false;

                        this.toast.error('Not Posted', errorText(err, 'The receiving could not be posted.'));

                        this.refreshView();
                    }
            });
    }

    clear():
        void
    {
        this.purchaseId = 0;

        this.lines = [];

        this.remarks = '';

        this.error = '';

        this.taken = new Map();

        this.desk = null;

        this.facts = [];

        this.invoiceStatus = '';

        this.resetPick();

        this.buildLists();

        this.updateDateLimits();
    }

    //===========================================================
    // View : print, cancel
    //===========================================================

    print():
        void
    {
        if
        (
            !this.receiving
        )
        {
            return;
        }

        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(['/print-viewer', this.page.printKey, this.receiving.PublicId])
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
        const receiving =
            this.receiving;

        if
        (
            !receiving || this.saving
        )
        {
            return;
        }

        if
        (
            !this.cancelReason.trim()
        )
        {
            this.toast.error('Reason Needed', 'Write why the receiving is cancelled.');

            return;
        }

        this.saving = true;

        this.service
            .cancel(this.page.path, receiving.ReceivingId, this.cancelReason.trim())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.saving = false;

                        this.cancelOpen = false;

                        this.toast.success('Cancelled', `${receiving.ReceivingNo} cancelled : the stock is back in transit.`);

                        // After an action the form closes : back to the list
                        this.router.navigate([this.page.route, 'list']);
                    },

                error:
                    err =>
                    {
                        this.saving = false;

                        this.toast.error('Not Cancelled', errorText(err, 'The receiving could not be cancelled.'));

                        this.refreshView();
                    }
            });
    }

    unitsOfLine
    (
        purchaseLineId:
            number
    ):
        ReceivingUnit[]
    {
        return (this.receiving?.Units ?? []).filter(x => x.PurchaseLineId === purchaseLineId);
    }

    back():
        void
    {
        this.router.navigate([this.page.route, 'list']);
    }

    //===========================================================
    // Header texts
    //===========================================================

    get pageTitle():
        string
    {
        return this.isView
            ? (this.receiving?.ReceivingNo || this.page.title)
            : `${this.page.title} · New`;
    }

    get branchText():
        string
    {
        return (this.isView ? this.receiving?.BranchName : this.defaults?.BranchName) || 'Not set';
    }

    get warehouseText():
        string
    {
        return this.isView
            ? (this.receiving?.WarehouseName || '—')
            : (this.defaults?.Warehouses.find(x => x.Id === this.warehouseId)?.Name || 'Not set');
    }

    get receivingNoText():
        string
    {
        return this.isView
            ? (this.receiving?.ReceivingNo ?? '')
            : (this.defaults?.NextNumber ?? '');
    }

    get statusText():
        string
    {
        return this.isView
            ? (this.receiving?.Status ?? '')
            : 'New';
    }

    get statusClass():
        string
    {
        const status =
            this.isView ? (this.receiving?.Status || 'new') : 'new';

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
        return formatReceivingDate(iso);
    }

    qty
    (
        value:
            number
    ):
        string
    {
        return formatReceivingQty(value);
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
