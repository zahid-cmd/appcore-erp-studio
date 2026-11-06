//===============================================================
// Rack Management Form
//
// Layout :
//   1. Rack Information   : Warehouse · Zone · Rack Code (auto) ·
//                           Rack Name (auto)
//   2. Shelves & Bins     : Number of Shelves · Bins on every
//                           shelf (quick fill) → per-shelf table
//                           (SLF-A-01 · Bins · Prime) and a live
//                           mini rack preview + total bins
//   3. Assignment         : Category → Sub Categories (none = the
//                           whole category; no category = General
//                           rack) · Prime shelves From / To
//   4. Location Details   : Rack Type · Status · Remarks
//      & Status
//
// Warehouse → Zone → Rack → Shelf → Bin; the BIN is the location
// (one item per bin). In edit / view the preview marks the bins
// that hold an item (GET {id}/bins); the server refuses removing
// a shelf / bin that holds one, the form warns first.
//
// No toasts : errors show on the toolbar; after a save the page
// goes back to the list.
//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    OnDestroy,
    ChangeDetectorRef,
    inject
}
from '@angular/core';

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
    Observable
}
from 'rxjs';


//===============================================================
// Shared Components
//===============================================================

import
{
    PageHeaderComponent
}
from '../../../../../../shared/components/layout/page-header/page-header';

import
{
    PageToolbarComponent
}
from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';

import
{
    CommandCenterComponent
}
from '../../../../../../shared/components/utilities/command-center/command-center';

import
{
    ControlTabsComponent,
    ControlTab
}
from '../../../../../../shared/components/controls/control-tabs/control-tabs';

import
{
    PageCanvasComponent
}
from '../../../../../../shared/components/layout/page-canvas/page-canvas';

import
{
    FormGridComponent
}
from '../../../../../../shared/components/layout/form-grid/form-grid';

import
{
    FormSectionComponent
}
from '../../../../../../shared/components/layout/form-section/form-section';


//===============================================================
// Form Controls
//===============================================================

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
    DropdownComponent
}
from '../../../../../../shared/components/controls/dropdown/dropdown';

import
{
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';


//===============================================================
// Utilities
//===============================================================

import
{
    ConfirmDialogService
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';

import
{
    ConfirmDialogComponent
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';

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
    OrbitLoaderComponent
}
from '../../../../../../shared/components/utilities/orbit-loader/orbit-loader';

import
{
    shelfLabel,
    binCode
}
from '../../../../../../shared/inventory/storage-labels';


//===============================================================
// Models & Services
//===============================================================

import
{
    RackManagement,
    CreateRackManagement,
    UpdateRackManagement,
    RackManagementDefaults,
    RackCategoryOption,
    RackSubCategoryOption,
    RackZone,
    RackMap,
    RACK_TYPES,
    RACK_MAX_SHELVES,
    RACK_MAX_BINS_PER_SHELF
}
from '../../../../../settings/product-settings/models/rack-management.model';

import
{
    RackManagementService
}
from '../../../../../settings/product-settings/services/rack-management.service';

// Warehouses live in General Settings
import
{
    WarehousesService
}
from '../../../../../settings/general-settings/services/warehouses.service';

import
{
    BusinessConfigurationService
}
from '../../../../../settings/general-settings/services/business-configuration.service';


//===============================================================
// View rows
//===============================================================

// One row of the per-shelf table
interface ShelfRow
{
    ShelfNumber:number;

    // SLF-A-01
    Label:string;

    // As typed
    BinText:string;

    BinCount:number;

    IsPrime:boolean;

    // Bins holding an item (edit / view)
    Used:number;

    // Highest bin that holds an item (0 = none)
    MinBins:number;

    // "Bin 05 holds SP-… - Brake Pad" when BinCount < MinBins
    Warning:string;
}


// One bin cell of the mini rack preview
interface PreviewBin
{
    BinNumber:number;

    Occupied:boolean;

    // Holds an item but would be removed by the new count
    Lost:boolean;

    Title:string;
}


// One shelf of the mini rack preview
interface PreviewShelf
{
    ShelfNumber:number;

    Short:string;

    IsPrime:boolean;

    // Shelf removed by the new count but holding an item
    Lost:boolean;

    Bins:PreviewBin[];
}


// Sub category choice (thin multi-select)
interface SubCategoryChip
{
    Id:number;

    Code:string;

    Name:string;

    On:boolean;
}


// Holder of one bin (edit / view)
interface HeldBin
{
    BinNumber:number;

    Text:string;
}


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'rackManagement-form',

    standalone:true,

    imports:
    [
        CommonModule,

        //=======================================================
        // Layout
        //=======================================================

        PageHeaderComponent,
        PageToolbarComponent,
        CommandCenterComponent,
        ControlTabsComponent,
        PageCanvasComponent,
        FormGridComponent,
        FormSectionComponent,

        //=======================================================
        // Form Controls
        //=======================================================

        TextboxComponent,
        TextareaComponent,
        DropdownComponent,
        SearchDropdownComponent,

        //=======================================================
        // Utilities
        //=======================================================

        ConfirmDialogComponent,
        ProgressDialogComponent,
        OrbitLoaderComponent
    ],

    templateUrl:'./rack-management-form.html',

    styleUrls:
    [
        './rack-management-form.css'
    ]
})

export class RackManagementForm
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly rackManagementService =
        inject(RackManagementService);

    private readonly warehousesService =
        inject(WarehousesService);

    // Business lines each warehouse's branch runs today
    private readonly businessConfigurationService =
        inject(BusinessConfigurationService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    // Progress dialog around Save / Update
    readonly progress =
        new ProgressRunner(
            inject(ProgressDialogService),
            () => this.cdr.detectChanges()
        );

    //===========================================================
    // Mode
    //===========================================================

    mode:
        'add' | 'edit' | 'view' =
        'add';

    // uuid from the address bar (the record is loaded by it)
    routePublicId:
        string =
        '';

    entityId:
        number =
        0;

    // A saved rack is loading (orbit loader)
    loading:
        boolean =
        false;

    // Error shown on the toolbar (no toasts)
    formError:
        string =
        '';

    //===========================================================
    // Page Header
    //===========================================================

    readonly entityName:
        string =
        'Rack';

    get pageTitle():
        string
    {
        switch
        (
            this.mode
        )
        {
            case 'edit':
                return 'Update Rack';

            case 'view':
                return 'View Rack';

            default:
                return 'Add Rack';
        }
    }

    selectedTab:
        string =
        'general';

    tabs:
        ControlTab[] =
    [
        {
            id:'general',
            label:'Rack'
        }
    ];

    //===========================================================
    // Lookups
    //
    // All active warehouses of every branch are offered for a new
    // rack; in edit / view the rack's own (maybe inactive)
    // warehouse, zone and category are kept so they still show.
    //===========================================================

    warehouseItems:
        any[] =
        [];

    zoneItems:
        any[] =
        [];

    categoryItems:
        any[] =
        [];

    primeFromItems:
        any[] =
        [];

    primeToItems:
        any[] =
        [];

    readonly rackTypeItems:
        any[] =
    [
        {
            label:'Not specified',
            value:''
        },

        ...RACK_TYPES.map(
            type =>
            ({
                label:type,
                value:type
            })
        )
    ];

    readonly statusItems:
        any[] =
    [
        {
            label:'Active',
            value:true
        },
        {
            label:'Inactive',
            value:false
        }
    ];

    private warehouses:
        any[] =
        [];

    // WarehouseId → "Spare Parts, Accessories"
    private warehouseLines:
        Map<number, string> =
        new Map<number, string>();

    private zones:
        RackZone[] =
        [];

    private categories:
        RackCategoryOption[] =
        [];

    // The warehouse has an active zone : a zone is required
    zoneRequired:
        boolean =
        false;

    zonesLoaded:
        boolean =
        false;

    //===========================================================
    // Codes (preview in add mode)
    //===========================================================

    // "<Warehouse Code>-R-001"
    fullRackCode:
        string =
        '';

    //===========================================================
    // Shelves & Bins
    //===========================================================

    maxShelves:
        number =
        RACK_MAX_SHELVES;

    maxBins:
        number =
        RACK_MAX_BINS_PER_SHELF;

    shelfCountText:
        string =
        '1';

    // Quick fill : bins on every shelf (also for new shelves)
    binsEveryText:
        string =
        '1';

    shelfRows:
        ShelfRow[] =
        [];

    previewShelves:
        PreviewShelf[] =
        [];

    totalBins:
        number =
        0;

    usedBins:
        number =
        0;

    primeShelfCount:
        number =
        0;

    // Saved occupancy (edit / view) : shelf → held bins
    private held:
        Map<number, HeldBin[]> =
        new Map<number, HeldBin[]>();

    //===========================================================
    // Assignment
    //===========================================================

    subCategoryChips:
        SubCategoryChip[] =
        [];

    selectedSubCount:
        number =
        0;

    //===========================================================
    // Entity
    //===========================================================

    entity:
        RackManagement =
        this.createEmptyEntity();

    private originalEntity:
        string =
        '';

    hasChanges:
        boolean =
        false;

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.loadLookups();

        this.initializeMode();
    }

    ngOnDestroy():
        void
    {
    }

    //===========================================================
    // Create Empty Entity
    //===========================================================

    private createEmptyEntity():
        RackManagement
    {
        return {
            RackManagementId:0,
            BranchId:0,
            WarehouseId:0,
            RackZoneId:null,
            RackCode:'',
            RackName:'',
            ShelfCount:1,
            Shelves:
            [
                {
                    ShelfNumber:1,
                    BinCount:1
                }
            ],
            ZoneAisle:'',
            RackType:'',
            ProductCategoryId:null,
            SubCategoryIds:[],
            PrimeShelfFrom:null,
            PrimeShelfTo:null,
            Remarks:'',
            IsActive:true
        };
    }

    //===========================================================
    // Initialize Mode
    //===========================================================

    private initializeMode():
        void
    {
        const url =
            this.router.url.toLowerCase();

        this.mode =
            url.includes('/view/')
                ? 'view'
                : url.includes('/edit/')
                    ? 'edit'
                    : 'add';

        this.tabs =
        [
            {
                id:'general',
                label:this.pageTitle
            }
        ];

        const id =
            this.resolveEntityId();

        if
        (
            id !== ''
        )
        {
            this.routePublicId =
                id;

            this.loadEntity();

            return;
        }

        this.initializeEntity();
    }

    private resolveEntityId():
        string
    {
        let currentRoute:
            ActivatedRoute | null =
            this.route;

        while
        (
            currentRoute
        )
        {
            const id =
                currentRoute.snapshot.paramMap.get('id')
                ?? '';

            if
            (
                id !== ''
            )
            {
                return id;
            }

            currentRoute =
                currentRoute.parent;
        }

        return '';
    }

    //===========================================================
    // Initialize Entity (add)
    //===========================================================

    private initializeEntity():
        void
    {
        this.entity =
            this.createEmptyEntity();

        this.fullRackCode =
            '';

        this.formError =
            '';

        this.held =
            new Map<number, HeldBin[]>();

        this.binsEveryText =
            '1';

        this.zones =
            [];

        this.zoneRequired =
            false;

        this.zonesLoaded =
            false;

        this.buildZoneItems();

        this.syncShelves();

        this.buildWarehouseItems();

        this.buildSubCategoryChips();

        // Categories do not depend on the warehouse
        this.loadDefaults();

        this.setInitialFormState();
    }

    //===========================================================
    // Load Defaults
    //
    // Add  : next code / name, zones and categories
    // Edit : zones and categories of the rack's warehouse
    //===========================================================

    private loadDefaults():
        void
    {
        const warehouseId =
            Number(this.entity.WarehouseId ?? 0);

        this.rackManagementService
            .getDefaults(
                warehouseId
            )
            .subscribe
            ({
                next:
                (
                    defaults:
                        RackManagementDefaults
                ):
                    void =>
                {
                    // Ignore a late answer for an older choice
                    if
                    (
                        Number(this.entity.WarehouseId ?? 0) !== warehouseId
                    )
                    {
                        return;
                    }

                    this.applyDefaults(
                        defaults
                    );
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Rack Defaults Error',
                        error
                    );

                    this.formError =
                        this.errorText(
                            error,
                            'The rack defaults (code, zones, categories) could not be loaded.'
                        );

                    this.cdr.detectChanges();
                }
            });
    }

    private applyDefaults
    (
        defaults:
            RackManagementDefaults
    ):
        void
    {
        this.maxShelves =
            defaults.MaxShelves || RACK_MAX_SHELVES;

        this.maxBins =
            defaults.MaxBinsPerShelf || RACK_MAX_BINS_PER_SHELF;

        this.categories =
            defaults.Categories ?? [];

        this.zones =
            defaults.Zones ?? [];

        this.zoneRequired =
            Boolean(defaults.ZoneRequired);

        this.zonesLoaded =
            Number(this.entity.WarehouseId) > 0;

        if
        (
            this.isAddMode
        )
        {
            this.entity.RackCode =
                defaults.Code ?? '';

            this.fullRackCode =
                defaults.FullCode ?? '';

            // "Rack A", "Rack B" … (the server assigns it on save)
            this.entity.RackName =
                defaults.Name ?? '';

            // One zone only : take it
            if
            (
                !this.entity.RackZoneId
                &&
                this.zones.length === 1
            )
            {
                this.entity.RackZoneId =
                    this.zones[0].RackZoneId;
            }
        }

        this.buildZoneItems();

        this.buildCategoryItems();

        this.buildSubCategoryChips();

        // Labels follow the rack name
        this.rebuildShelves();

        if
        (
            this.isAddMode
        )
        {
            this.checkForChanges();
        }
        else
        {
            // Edit / view : the lookups don't count as a change
            this.setInitialFormState();
        }

        this.cdr.detectChanges();
    }

    //===========================================================
    // Load Lookups (warehouses, business lines)
    //===========================================================

    private loadLookups():
        void
    {
        // Business lines per warehouse (shown in the dropdown);
        // a failure only hides the lines
        this.businessConfigurationService
            .getAllowedWarehouses()
            .subscribe
            ({
                next:
                (
                    response
                ): void =>
                {
                    this.warehouseLines =
                        new Map<number, string>(
                            (response ?? [])
                                .map(
                                    item =>
                                        [
                                            Number(item.WarehouseId),
                                            (item.ActiveLines ?? []).join(', ')
                                        ] as [number, string]
                                )
                        );

                    this.buildWarehouseItems();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Business Lines Error',
                        error
                    );
                }
            });

        this.warehousesService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        any[]
                ):
                    void =>
                {
                    this.warehouses =
                        (response ?? [])
                            .slice()
                            .sort(
                                (a, b) =>
                                    String(a?.WarehouseCode ?? '')
                                        .localeCompare(
                                            String(b?.WarehouseCode ?? '')
                                        )
                            );

                    this.buildWarehouseItems();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Warehouses Error',
                        error
                    );

                    this.formError =
                        'Failed to load warehouses.';

                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Dropdown Items
    //===========================================================

    private buildWarehouseItems():
        void
    {
        const currentId =
            Number(this.entity.WarehouseId ?? 0);

        this.warehouseItems =
            this.warehouses
                .filter(
                    item =>
                        Boolean(item?.IsActive)
                        ||
                        Number(item?.WarehouseId) === currentId
                )
                .map(
                    item =>
                    ({
                        // "WH-01-02-01-01 - Uttara SC Warehouse (Spare Parts, Services)"
                        label:
                            this.warehouseLines.get(Number(item.WarehouseId))
                                ? `${item.WarehouseCode} - ${item.WarehouseName} (${this.warehouseLines.get(Number(item.WarehouseId))})`
                                : `${item.WarehouseCode} - ${item.WarehouseName}`,

                        value:
                            Number(item.WarehouseId)
                    })
                );

        this.cdr.detectChanges();
    }

    // Zones of the warehouse (priority order); the rack's own
    // (maybe inactive) zone always stays
    private buildZoneItems():
        void
    {
        const items =
            this.zones
                .slice()
                .sort(
                    (a, b) =>
                        (a.Priority - b.Priority)
                        ||
                        a.ZoneCode.localeCompare(b.ZoneCode)
                )
                .map(
                    zone =>
                    ({
                        label:
                            `${zone.ZoneCode} - ${zone.ZoneName} (Priority ${zone.Priority})`,

                        value:
                            zone.RackZoneId
                    })
                );

        const ownId =
            Number(this.entity.RackZoneId ?? 0);

        if
        (
            ownId > 0
            &&
            !items.some(
                item =>
                    item.value === ownId
            )
        )
        {
            items.unshift(
                {
                    label:
                        this.entity.ZoneCode
                            ? `${this.entity.ZoneCode} - ${this.entity.ZoneName}`
                            : `Zone #${ownId}`,

                    value:
                        ownId
                }
            );
        }

        this.zoneItems =
            items;
    }

    // General (no category) + the assignable categories; the
    // rack's own (maybe inactive) category always stays
    private buildCategoryItems():
        void
    {
        const ownId =
            Number(this.entity.ProductCategoryId ?? 0);

        if
        (
            ownId > 0
            &&
            !this.categories.some(
                item =>
                    item.ProductCategoryId === ownId
            )
        )
        {
            this.categories =
            [
                {
                    ProductCategoryId:ownId,
                    CategoryCode:this.entity.CategoryCode ?? '',
                    CategoryName:this.entity.CategoryName ?? `Category #${ownId}`,
                    CategoryType:this.entity.CategoryType ?? '',
                    BrandName:'',
                    SubCategories:this.entity.SubCategories ?? []
                },

                ...this.categories
            ];
        }

        this.categoryItems =
        [
            {
                label:'General (any product)',
                value:0
            },

            ...this.categories.map(
                item =>
                ({
                    label:
                        item.CategoryType
                            ? `${item.CategoryCode} - ${item.CategoryName} (${item.CategoryType})`
                            : `${item.CategoryCode} - ${item.CategoryName}`,

                    value:
                        item.ProductCategoryId
                })
            )
        ];
    }

    private buildSubCategoryChips():
        void
    {
        const category =
            this.categories.find(
                item =>
                    item.ProductCategoryId === Number(this.entity.ProductCategoryId ?? 0)
            );

        const chosen =
            new Set<number>(
                this.entity.SubCategoryIds ?? []
            );

        const subs:
            RackSubCategoryOption[] =
            category?.SubCategories ?? [];

        this.subCategoryChips =
            subs.map(
                sub =>
                ({
                    Id:sub.ProductSubCategoryId,
                    Code:sub.SubCategoryCode,
                    Name:sub.SubCategoryName,
                    On:chosen.has(sub.ProductSubCategoryId)
                })
            );

        this.selectedSubCount =
            this.subCategoryChips
                .filter(
                    chip =>
                        chip.On
                )
                .length;
    }

    //===========================================================
    // Value Unwrap (a dropdown may emit the { label, value } item)
    //===========================================================

    private unwrapValue
    (
        value:
            any
    ):
        any
    {
        return value !== null
            &&
            typeof value === 'object'
            &&
            'value' in value
                ? value.value
                : value;
    }

    //===========================================================
    // Section 1 : Warehouse / Zone
    //===========================================================

    onWarehouseChange
    (
        value?:
            any
    ):
        void
    {
        if
        (
            !this.isAddMode
        )
        {
            return;
        }

        const warehouseId =
            Number(this.unwrapValue(value) ?? 0);

        // Same warehouse (a dropdown may emit it again) : nothing to do
        if
        (
            warehouseId === Number(this.entity.WarehouseId ?? 0)
        )
        {
            return;
        }

        this.entity.WarehouseId =
            warehouseId;

        // A new warehouse clears the code, name and zone
        this.entity.RackCode =
            '';

        this.entity.RackName =
            '';

        this.entity.RackZoneId =
            null;

        this.fullRackCode =
            '';

        this.zones =
            [];

        this.zonesLoaded =
            false;

        this.zoneRequired =
            false;

        this.buildZoneItems();

        this.rebuildShelves();

        this.loadDefaults();

        this.onValueChange();
    }

    onZoneChange
    (
        value:
            any
    ):
        void
    {
        const id =
            Number(this.unwrapValue(value) ?? 0);

        this.entity.RackZoneId =
            id > 0
                ? id
                : null;

        this.onValueChange();
    }

    //===========================================================
    // Section 2 : Shelves & Bins
    //===========================================================

    private toDigits
    (
        value:
            string | number | null | undefined,
        length:
            number
    ):
        string
    {
        return String(value ?? '')
            .replace(/[^0-9]/g, '')
            .replace(/^0+(?=\d)/, '')
            .slice(0, length);
    }

    private quickFillCount():
        number
    {
        const value =
            Number(this.binsEveryText || 0);

        return value >= 1
            ? Math.min(value, this.maxBins)
            : 1;
    }

    // Texts from the entity (load / clear)
    private syncShelves():
        void
    {
        this.shelfCountText =
            String(this.entity.ShelfCount ?? 1);

        const counts =
            (this.entity.Shelves ?? [])
                .map(
                    shelf =>
                        shelf.BinCount
                );

        // Quick fill shows the common count when every shelf has it
        if
        (
            counts.length > 0
            &&
            counts.every(
                count =>
                    count === counts[0]
            )
        )
        {
            this.binsEveryText =
                String(counts[0]);
        }

        this.shelfRows =
            [];

        this.rebuildShelves();
    }

    onShelfCountChange
    (
        value:
            string | number
    ):
        void
    {
        const digits =
            this.toDigits(
                value,
                2
            );

        this.shelfCountText =
            digits;

        this.entity.ShelfCount =
            digits
                ? Number(digits)
                : 0;

        this.rebuildShelves();

        this.onValueChange();
    }

    onBinsEveryChange
    (
        value:
            string | number
    ):
        void
    {
        this.binsEveryText =
            this.toDigits(
                value,
                2
            );

        this.cdr.detectChanges();
    }

    // Quick fill : every shelf gets the same number of bins
    applyQuickFill():
        void
    {
        if
        (
            this.isViewMode
            ||
            this.progress.busy
        )
        {
            return;
        }

        const count =
            this.quickFillCount();

        this.binsEveryText =
            String(count);

        this.shelfRows =
            this.shelfRows.map(
                row =>
                ({
                    ...row,
                    BinText:String(count),
                    BinCount:count
                })
            );

        this.rebuildShelves();

        this.onValueChange();
    }

    onShelfBinsChange
    (
        shelfNumber:
            number,
        value:
            string
    ):
        void
    {
        const digits =
            this.toDigits(
                value,
                2
            );

        this.shelfRows =
            this.shelfRows.map(
                row =>
                    row.ShelfNumber === shelfNumber
                        ? {
                            ...row,
                            BinText:digits,
                            BinCount:digits ? Number(digits) : 0
                        }
                        : row
            );

        this.rebuildShelves();

        this.onValueChange();
    }

    // Steppers next to a shelf's bin count
    stepShelfBins
    (
        shelfNumber:
            number,
        delta:
            number
    ):
        void
    {
        const row =
            this.shelfRows.find(
                item =>
                    item.ShelfNumber === shelfNumber
            );

        if
        (
            !row
            ||
            this.isViewMode
            ||
            this.progress.busy
        )
        {
            return;
        }

        const next =
            Math.min(
                this.maxBins,
                Math.max(
                    1,
                    (row.BinCount || 0) + delta
                )
            );

        this.onShelfBinsChange(
            shelfNumber,
            String(next)
        );
    }

    //-----------------------------------------------------------
    // Prime toggle in the table : the prime shelves are one range
    // (From … To), the toggle grows / shrinks it
    //-----------------------------------------------------------

    togglePrime
    (
        shelfNumber:
            number
    ):
        void
    {
        if
        (
            this.isViewMode
            ||
            this.progress.busy
        )
        {
            return;
        }

        let from =
            Number(this.entity.PrimeShelfFrom ?? 0);

        let to =
            Number(this.entity.PrimeShelfTo ?? 0);

        const inRange =
            from > 0
            &&
            to >= from
            &&
            shelfNumber >= from
            &&
            shelfNumber <= to;

        if
        (
            !(from > 0 && to >= from)
        )
        {
            from = shelfNumber;
            to = shelfNumber;
        }
        else if
        (
            !inRange
        )
        {
            // Grow the range up to this shelf
            from = Math.min(from, shelfNumber);
            to = Math.max(to, shelfNumber);
        }
        else if
        (
            shelfNumber === from
        )
        {
            from++;
        }
        else if
        (
            shelfNumber === to
        )
        {
            to--;
        }
        else
        {
            // Inside : the range ends before this shelf
            to = shelfNumber - 1;
        }

        this.setPrimeRange(
            from,
            to
        );
    }

    private setPrimeRange
    (
        from:
            number,
        to:
            number
    ):
        void
    {
        const valid =
            from >= 1
            &&
            to >= from;

        this.entity.PrimeShelfFrom =
            valid
                ? from
                : null;

        this.entity.PrimeShelfTo =
            valid
                ? to
                : null;

        this.rebuildShelves();

        this.onValueChange();
    }

    onPrimeFromChange
    (
        value:
            any
    ):
        void
    {
        const from =
            Number(this.unwrapValue(value) ?? 0);

        if
        (
            !(from > 0)
        )
        {
            this.setPrimeRange(
                0,
                0
            );

            return;
        }

        const to =
            Number(this.entity.PrimeShelfTo ?? 0);

        this.setPrimeRange(
            from,
            to >= from
                ? to
                : from
        );
    }

    onPrimeToChange
    (
        value:
            any
    ):
        void
    {
        const to =
            Number(this.unwrapValue(value) ?? 0);

        if
        (
            !(to > 0)
        )
        {
            this.setPrimeRange(
                0,
                0
            );

            return;
        }

        const from =
            Number(this.entity.PrimeShelfFrom ?? 0);

        this.setPrimeRange(
            from > 0 && from <= to
                ? from
                : to,
            to
        );
    }

    clearPrime():
        void
    {
        if
        (
            this.isViewMode
            ||
            this.progress.busy
        )
        {
            return;
        }

        this.setPrimeRange(
            0,
            0
        );
    }

    //-----------------------------------------------------------
    // Rebuild the table, the preview, the totals and the prime
    // dropdowns from the shelf count, the rows and the range
    //-----------------------------------------------------------

    private rebuildShelves():
        void
    {
        const count =
            Math.min(
                Math.max(
                    Number(this.entity.ShelfCount ?? 0),
                    0
                ),
                this.maxShelves
            );

        const fill =
            this.quickFillCount();

        // Saved / typed counts by shelf (rows first, then entity)
        const known =
            new Map<number, { text: string; count: number }>();

        for
        (
            const shelf
            of this.entity.Shelves ?? []
        )
        {
            known.set(
                shelf.ShelfNumber,
                {
                    text:String(shelf.BinCount),
                    count:shelf.BinCount
                }
            );
        }

        for
        (
            const row
            of this.shelfRows
        )
        {
            known.set(
                row.ShelfNumber,
                {
                    text:row.BinText,
                    count:row.BinCount
                }
            );
        }

        // A range that no longer fits is trimmed
        let from =
            Number(this.entity.PrimeShelfFrom ?? 0);

        let to =
            Number(this.entity.PrimeShelfTo ?? 0);

        if
        (
            to > count
        )
        {
            to = count;
        }

        if
        (
            !(from >= 1 && to >= from)
        )
        {
            from = 0;
            to = 0;
        }

        if
        (
            count > 0
        )
        {
            this.entity.PrimeShelfFrom =
                from > 0
                    ? from
                    : null;

            this.entity.PrimeShelfTo =
                to > 0
                    ? to
                    : null;
        }

        const rackName =
            this.entity.RackName;

        this.shelfRows =
            Array.from(
                { length:count },
                (_, index) =>
                {
                    const shelfNumber =
                        index + 1;

                    const saved =
                        known.get(shelfNumber);

                    const binCount =
                        saved
                            ? saved.count
                            : fill;

                    const heldBins =
                        this.held.get(shelfNumber) ?? [];

                    const minBins =
                        heldBins.reduce(
                            (max, bin) =>
                                Math.max(max, bin.BinNumber),
                            0
                        );

                    const lost =
                        heldBins
                            .filter(
                                bin =>
                                    bin.BinNumber > binCount
                            );

                    return {
                        ShelfNumber:
                            shelfNumber,

                        Label:
                            shelfLabel(rackName, shelfNumber) || `Shelf ${shelfNumber}`,

                        BinText:
                            saved
                                ? saved.text
                                : String(fill),

                        BinCount:
                            binCount,

                        IsPrime:
                            from > 0
                            &&
                            shelfNumber >= from
                            &&
                            shelfNumber <= to,

                        Used:
                            heldBins.length,

                        MinBins:
                            minBins,

                        Warning:
                            lost.length > 0
                                ? `${lost[0].Text} would lose its bin (needs at least ${minBins} bins).`
                                : ''
                    };
                }
            );

        // Entity follows the rows (payload + change tracking)
        this.entity.Shelves =
            this.shelfRows.map(
                row =>
                ({
                    ShelfNumber:row.ShelfNumber,
                    BinCount:row.BinCount
                })
            );

        this.buildPreview(
            count
        );

        this.buildPrimeItems(
            count
        );
    }

    private buildPreview
    (
        count:
            number
    ):
        void
    {
        const rackName =
            this.entity.RackName;

        const shelves:
            PreviewShelf[] =
            this.shelfRows.map(
                row =>
                {
                    const heldBins =
                        new Map<number, string>(
                            (this.held.get(row.ShelfNumber) ?? [])
                                .map(
                                    bin =>
                                        [bin.BinNumber, bin.Text] as [number, string]
                                )
                        );

                    const visible =
                        Math.max(
                            Math.min(row.BinCount || 0, this.maxBins),
                            0
                        );

                    const bins:
                        PreviewBin[] =
                        Array.from(
                            { length:visible },
                            (_, i) =>
                            {
                                const binNumber =
                                    i + 1;

                                const holder =
                                    heldBins.get(binNumber);

                                const code =
                                    binCode(rackName, row.ShelfNumber, binNumber)
                                    ||
                                    `Bin ${binNumber}`;

                                return {
                                    BinNumber:binNumber,
                                    Occupied:!!holder,
                                    Lost:false,
                                    Title:holder ? `${code} : ${holder}` : `${code} : free`
                                };
                            }
                        );

                    // Bins beyond the new count that hold an item
                    for
                    (
                        const [binNumber, holder]
                        of heldBins
                    )
                    {
                        if
                        (
                            binNumber > visible
                        )
                        {
                            bins.push(
                                {
                                    BinNumber:binNumber,
                                    Occupied:true,
                                    Lost:true,
                                    Title:`${binCode(rackName, row.ShelfNumber, binNumber)} : ${holder} (bin removed by the new count)`
                                }
                            );
                        }
                    }

                    return {
                        ShelfNumber:row.ShelfNumber,
                        Short:String(row.ShelfNumber).padStart(2, '0'),
                        IsPrime:row.IsPrime,
                        Lost:false,
                        Bins:bins
                    };
                }
            );

        // Removed shelves that hold an item
        for
        (
            const [shelfNumber, heldBins]
            of this.held
        )
        {
            if
            (
                shelfNumber > count
                &&
                heldBins.length > 0
            )
            {
                shelves.push(
                    {
                        ShelfNumber:shelfNumber,
                        Short:String(shelfNumber).padStart(2, '0'),
                        IsPrime:false,
                        Lost:true,
                        Bins:heldBins.map(
                            bin =>
                            ({
                                BinNumber:bin.BinNumber,
                                Occupied:true,
                                Lost:true,
                                Title:`${binCode(rackName, shelfNumber, bin.BinNumber)} : ${bin.Text} (shelf removed by the new count)`
                            })
                        )
                    }
                );
            }
        }

        this.previewShelves =
            shelves.sort(
                (a, b) =>
                    a.ShelfNumber - b.ShelfNumber
            );

        this.totalBins =
            this.shelfRows.reduce(
                (sum, row) =>
                    sum + (row.BinCount || 0),
                0
            );

        this.usedBins =
            Array.from(this.held.values())
                .reduce(
                    (sum, bins) =>
                        sum + bins.length,
                    0
                );

        this.primeShelfCount =
            this.shelfRows
                .filter(
                    row =>
                        row.IsPrime
                )
                .length;
    }

    private buildPrimeItems
    (
        count:
            number
    ):
        void
    {
        const shelves =
            Array.from(
                { length:count },
                (_, i) =>
                ({
                    label:
                        shelfLabel(this.entity.RackName, i + 1) || `Shelf ${i + 1}`,

                    value:
                        i + 1
                })
            );

        const key =
            `${count}|${this.entity.RackName}`;

        // Same shelves : keep the arrays (stable items for the dropdowns)
        if
        (
            this.primeItemsKey === key
        )
        {
            return;
        }

        this.primeItemsKey =
            key;

        this.primeFromItems =
        [
            {
                label:'None',
                value:0
            },

            ...shelves
        ];

        this.primeToItems =
        [
            {
                label:'None',
                value:0
            },

            ...shelves
        ];
    }

    private primeItemsKey:
        string =
        '';

    //===========================================================
    // Section 3 : Assignment
    //===========================================================

    onCategoryChange
    (
        value:
            any
    ):
        void
    {
        const id =
            Number(this.unwrapValue(value) ?? 0);

        if
        (
            id === Number(this.entity.ProductCategoryId ?? 0)
        )
        {
            return;
        }

        this.entity.ProductCategoryId =
            id > 0
                ? id
                : null;

        // A new category clears the sub categories
        this.entity.SubCategoryIds =
            [];

        this.buildSubCategoryChips();

        this.onValueChange();
    }

    toggleSubCategory
    (
        id:
            number
    ):
        void
    {
        if
        (
            this.isViewMode
            ||
            this.progress.busy
        )
        {
            return;
        }

        const chosen =
            new Set<number>(
                this.entity.SubCategoryIds ?? []
            );

        if
        (
            chosen.has(id)
        )
        {
            chosen.delete(id);
        }
        else
        {
            chosen.add(id);
        }

        // Keep the category's order
        this.entity.SubCategoryIds =
            this.subCategoryChips
                .map(
                    chip =>
                        chip.Id
                )
                .filter(
                    chipId =>
                        chosen.has(chipId)
                );

        this.buildSubCategoryChips();

        this.onValueChange();
    }

    selectAllSubCategories
    (
        on:
            boolean
    ):
        void
    {
        if
        (
            this.isViewMode
            ||
            this.progress.busy
        )
        {
            return;
        }

        this.entity.SubCategoryIds =
            on
                ? this.subCategoryChips.map(
                    chip =>
                        chip.Id
                )
                : [];

        this.buildSubCategoryChips();

        this.onValueChange();
    }

    get assignmentSummary():
        string
    {
        const categoryId =
            Number(this.entity.ProductCategoryId ?? 0);

        if
        (
            !(categoryId > 0)
        )
        {
            return 'General rack : any spare part or accessory.';
        }

        const category =
            this.categories.find(
                item =>
                    item.ProductCategoryId === categoryId
            );

        const name =
            category?.CategoryName ?? 'the category';

        return this.selectedSubCount > 0
            ? `${name} : ${this.selectedSubCount} sub categor${this.selectedSubCount === 1 ? 'y' : 'ies'}.`
            : `${name} : the whole category.`;
    }

    //===========================================================
    // Section 4 : Rack Type / Status / Remarks
    //===========================================================

    onRackTypeChange
    (
        value:
            any
    ):
        void
    {
        this.entity.RackType =
            String(this.unwrapValue(value) ?? '');

        this.onValueChange();
    }

    onStatusChange
    (
        value:
            any
    ):
        void
    {
        this.entity.IsActive =
            Boolean(this.unwrapValue(value));

        this.onValueChange();
    }

    onRemarksChange
    (
        value:
            string
    ):
        void
    {
        this.entity.Remarks =
            String(value ?? '');

        this.onValueChange();
    }

    //===========================================================
    // Load Entity (edit / view)
    //===========================================================

    private loadEntity():
        void
    {
        this.loading =
            true;

        this.formError =
            '';

        this.cdr.detectChanges();

        this.rackManagementService
            .getById(
                this.routePublicId
            )
            .subscribe
            ({
                next:
                (
                    rack:
                        RackManagement
                ): void =>
                {
                    // Internal id of the loaded record (links use the uuid)
                    this.entityId =
                        Number((rack as any)?.rackManagementId ?? (rack as any)?.RackManagementId ?? 0);

                    this.entity =
                        rack;

                    // Every shelf has a row (missing = 1 bin)
                    this.entity.Shelves =
                        Array.from(
                            { length:Math.max(rack.ShelfCount, 0) },
                            (_, i) =>
                                rack.Shelves.find(
                                    shelf =>
                                        shelf.ShelfNumber === i + 1
                                )
                                ??
                                {
                                    ShelfNumber:i + 1,
                                    BinCount:1
                                }
                        )
                        .map(
                            shelf =>
                            ({
                                ShelfNumber:shelf.ShelfNumber,
                                BinCount:shelf.BinCount
                            })
                        );

                    this.fullRackCode =
                        rack.FullRackCode
                        ||
                        rack.RackCode;

                    this.held =
                        new Map<number, HeldBin[]>();

                    this.primeItemsKey =
                        '';

                    this.syncShelves();

                    this.buildWarehouseItems();

                    this.buildZoneItems();

                    this.buildCategoryItems();

                    this.buildSubCategoryChips();

                    this.loading =
                        false;

                    this.setInitialFormState();

                    // Zones / categories of the warehouse, and the
                    // bins that hold an item
                    this.loadDefaults();

                    this.loadOccupancy();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Rack Error',
                        error
                    );

                    this.loading =
                        false;

                    this.formError =
                        this.errorText(
                            error,
                            'Failed to load the rack.'
                        );

                    this.cdr.detectChanges();
                }
            });
    }

    // Bins that hold an item (marked on the preview)
    private loadOccupancy():
        void
    {
        this.rackManagementService
            .getRackBins(
                this.entityId
            )
            .subscribe
            ({
                next:
                (
                    map:
                        RackMap
                ): void =>
                {
                    const held =
                        new Map<number, HeldBin[]>();

                    for
                    (
                        const shelf
                        of map.Shelves ?? []
                    )
                    {
                        const bins =
                            (shelf.Bins ?? [])
                                .filter(
                                    bin =>
                                        !!bin.Holder
                                )
                                .map(
                                    bin =>
                                    ({
                                        BinNumber:bin.BinNumber,
                                        Text:`${bin.Holder?.ProductCode} - ${bin.Holder?.ItemName}`
                                    })
                                );

                        if
                        (
                            bins.length > 0
                        )
                        {
                            held.set(
                                shelf.ShelfNumber,
                                bins
                            );
                        }
                    }

                    this.held =
                        held;

                    this.rebuildShelves();

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    // The preview only loses its occupied marks
                    console.error(
                        'Load Rack Bins Error',
                        error
                    );
                }
            });
    }

    //===========================================================
    // Track Changes
    //===========================================================

    private setInitialFormState():
        void
    {
        this.originalEntity =
            this.snapshot();

        this.hasChanges =
            false;

        this.cdr.detectChanges();
    }

    // What the user can change
    private snapshot():
        string
    {
        const e =
            this.entity;

        return JSON.stringify(
            [
                e.WarehouseId,
                e.RackZoneId,
                e.ShelfCount,
                e.Shelves,
                e.ProductCategoryId,
                e.SubCategoryIds,
                e.PrimeShelfFrom,
                e.PrimeShelfTo,
                e.RackType,
                e.Remarks,
                e.IsActive
            ]
        );
    }

    checkForChanges():
        void
    {
        this.hasChanges =
            this.snapshot()
            !==
            this.originalEntity;
    }

    onValueChange():
        void
    {
        this.checkForChanges();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Save
    //===========================================================

    // First problem in the form, '' when it can be saved
    private validate():
        string
    {
        const e =
            this.entity;

        if
        (
            !(Number(e.WarehouseId) > 0)
        )
        {
            return 'Warehouse is required.';
        }

        if
        (
            !e.RackCode?.trim()
            ||
            !e.RackName?.trim()
        )
        {
            return 'Rack Code could not be generated. Select the Warehouse again.';
        }

        if
        (
            this.zoneRequired
            &&
            !(Number(e.RackZoneId ?? 0) > 0)
        )
        {
            return 'Zone is required : this warehouse has zones.';
        }

        if
        (
            !(e.ShelfCount >= 1 && e.ShelfCount <= this.maxShelves)
        )
        {
            return `Number of Shelves must be between 1 and ${this.maxShelves}.`;
        }

        for
        (
            const row
            of this.shelfRows
        )
        {
            if
            (
                !(row.BinCount >= 1 && row.BinCount <= this.maxBins)
            )
            {
                return `${row.Label} : bins must be between 1 and ${this.maxBins}.`;
            }

            if
            (
                row.Warning
            )
            {
                return `${row.Label} : ${row.Warning}`;
            }
        }

        // A removed shelf that holds an item
        for
        (
            const [shelfNumber, bins]
            of this.held
        )
        {
            if
            (
                shelfNumber > e.ShelfCount
                &&
                bins.length > 0
            )
            {
                return `Shelf ${shelfNumber} holds ${bins[0].Text}. Move it first, or keep at least ${shelfNumber} shelves.`;
            }
        }

        const from =
            Number(e.PrimeShelfFrom ?? 0);

        const to =
            Number(e.PrimeShelfTo ?? 0);

        if
        (
            (from > 0) !== (to > 0)
            ||
            (from > 0 && !(from <= to && to <= e.ShelfCount))
        )
        {
            return 'Prime shelves : choose both From and To (From ≤ To ≤ Number of Shelves), or none.';
        }

        return '';
    }

    private buildPayload():
        CreateRackManagement
    {
        const e =
            this.entity;

        const categoryId =
            Number(e.ProductCategoryId ?? 0);

        const from =
            Number(e.PrimeShelfFrom ?? 0);

        const to =
            Number(e.PrimeShelfTo ?? 0);

        return {
            WarehouseId:
                Number(e.WarehouseId),

            RackName:
                e.RackName?.trim() ?? '',

            ShelfCount:
                Number(e.ShelfCount ?? 0),

            BinsPerShelf:
                this.quickFillCount(),

            Shelves:
                this.shelfRows.map(
                    row =>
                    ({
                        ShelfNumber:row.ShelfNumber,
                        BinCount:row.BinCount
                    })
                ),

            RackZoneId:
                Number(e.RackZoneId ?? 0) > 0
                    ? Number(e.RackZoneId)
                    : null,

            ProductCategoryId:
                categoryId > 0
                    ? categoryId
                    : null,

            SubCategoryIds:
                categoryId > 0
                    ? [...(e.SubCategoryIds ?? [])]
                    : [],

            PrimeShelfFrom:
                from > 0
                    ? from
                    : null,

            PrimeShelfTo:
                to > 0
                    ? to
                    : null,

            // Legacy text : keep what is saved
            ZoneAisle:
                null,

            RackType:
                e.RackType ?? '',

            Remarks:
                e.Remarks?.trim() ?? '',

            IsActive:
                e.IsActive
        };
    }

    onSave():
        void
    {
        if
        (
            this.isViewMode
            ||
            this.progress.busy
            ||
            this.loading
        )
        {
            return;
        }

        const problem =
            this.validate();

        if
        (
            problem
        )
        {
            this.formError =
                problem;

            this.cdr.detectChanges();

            return;
        }

        this.formError =
            '';

        const payload =
            this.buildPayload();

        const call$:
            Observable<unknown> =
            this.isAddMode
                ? this.rackManagementService.create(
                    payload
                )
                : this.rackManagementService.update(
                    {
                        RackManagementId:this.entity.RackManagementId,
                        ...payload
                    } as UpdateRackManagement
                );

        this.progress
            .run(
                this.isAddMode ? 'Saving Rack' : 'Updating Rack',

                this.isAddMode
                    ? 'Please wait while the rack is being saved...'
                    : 'Please wait while the rack is being updated...',

                this.isAddMode ? 'Rack saved.' : 'Rack updated.',

                call$
            )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.hasChanges =
                        false;

                    this.goToList();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Save Rack Error',
                        error
                    );

                    this.formError =
                        this.errorText(
                            error,
                            this.isAddMode
                                ? 'Failed to create the rack.'
                                : 'Failed to update the rack.'
                        );

                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Server Message ({ message } / a text / the fallback)
    //===========================================================

    private errorText
    (
        error:
            unknown,
        fallback:
            string
    ):
        string
    {
        const err =
            error as any;

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
            typeof body === 'string'
            &&
            body.trim()
        )
        {
            return body.trim();
        }

        return body?.message || body?.Message || body?.title || fallback;
    }

    closeError():
        void
    {
        this.formError =
            '';

        this.cdr.detectChanges();
    }

    //===========================================================
    // Clear
    //===========================================================

    onClear():
        void
    {
        if
        (
            this.progress.busy
        )
        {
            return;
        }

        if
        (
            this.isEditMode
        )
        {
            this.loadEntity();

            return;
        }

        this.initializeEntity();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Back To List
    //===========================================================

    private goToList():
        void
    {
        void this.router.navigate(
            [
                '/inventory-management',
                'store-setup',
                'rack-management',
                'list'
            ]
        );
    }

    onBackToList():
        void
    {
        if
        (
            this.progress.busy
        )
        {
            return;
        }

        if
        (
            !this.hasChanges
            ||
            this.isViewMode
        )
        {
            this.goToList();

            return;
        }

        this.confirmDialog.open(
            'Cancel Changes',
            'Any unsaved changes will be lost. Do you want to leave this page?',
            () =>
            {
                this.goToList();
            },
            'Leave',
            'Stay',
            'primary'
        );
    }

    //===========================================================
    // Mode Helpers
    //===========================================================

    get saveButtonText():
        string
    {
        return this.isEditMode
            ? 'Update'
            : 'Save';
    }

    get saveButtonIcon():
        string
    {
        return this.isEditMode
            ? 'fas fa-pen-to-square'
            : 'fas fa-floppy-disk';
    }

    get isViewMode():
        boolean
    {
        return this.mode === 'view';
    }

    get isEditMode():
        boolean
    {
        return this.mode === 'edit';
    }

    get isAddMode():
        boolean
    {
        return this.mode === 'add';
    }

    // Controls are locked while viewing / saving
    get locked():
        boolean
    {
        return this.isViewMode
            ||
            this.progress.busy;
    }

    get noZoneHint():
        string
    {
        if
        (
            !(Number(this.entity.WarehouseId) > 0)
        )
        {
            return 'Select a warehouse first.';
        }

        if
        (
            this.zonesLoaded
            &&
            this.zoneItems.length === 0
        )
        {
            return 'No active zone in this warehouse : add one on the Zones tab.';
        }

        return 'Manage zones on the Zones tab.';
    }

    close():
        void
    {
        this.onBackToList();
    }
}
