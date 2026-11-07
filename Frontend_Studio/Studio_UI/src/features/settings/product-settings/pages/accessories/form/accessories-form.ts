//===============================================================
// Accessories Form
//
// Layout (locked) :
//   1. Parent Information   : Category, Sub Category, Brand, Remarks
//   2. Accessory Information: Part Number (optional), Accessory Name,
//                             Unit, Product Code
//   3. Ledgers & Status     : INV / WIP / COGS Ledger Codes, Status
//   4. Stock & Storage      : Re-order / Red / Max Level, Movement
//                             Class, Storage Locations (bins)
//
// Storage locations are added from the page toolbar (Add Location)
// in the shared Form Modal. No image on this form.
//
// A BIN holds ONE item (spare part OR accessory) : the location
// modal (Warehouse → Rack → Shelf → Bin) offers only free bins,
// this item's own bin included (rack map from Rack Management;
// the server checks it again on save). Movement Class (Stock &
// Storage) feeds the allocation plan.
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
    FormsModule
}
from '@angular/forms';

import
{
    Observable,
    defer,
    timer,
    throwError,
    delayWhen,
    catchError,
    switchMap
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


import
{
    FormModalComponent
}
from '../../../../../../shared/components/utilities/form-modal/form-modal';


//===============================================================
// Utilities
//===============================================================

import
{
    ToastComponent
}
from '../../../../../../shared/components/utilities/toast/toast';

import
{
    ToastService
}
from '../../../../../../shared/components/utilities/toast/toast.service';

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


//===============================================================
// Models & Services
//===============================================================

import
{
    Accessories,

    CreateAccessories,

    UpdateAccessories,

    AccessoriesDefaults,

    AccessoryLocation,

    ACCESSORY_UNITS,

    ACCESSORY_USES,

    ACCESSORY_USE_FOR_SALE,

    normalizeAccessoryUse
}
from '../../../models/accessories.model';

import
{
    AccessoriesService
}
from '../../../services/accessories.service';

import
{
    ProductCategoryService
}
from '../../../services/product-category.service';

import
{
    ProductSubCategoryService
}
from '../../../services/product-sub-category.service';

import
{
    RackManagementService
}
from '../../../services/rack-management.service';

import
{
    RackMap
}
from '../../../models/rack-management.model';

import
{
    binCode,

    shelfLabel,

    locationText,

    movementClassInfo,

    MOVEMENT_CLASS_OPTIONS,

    DEFAULT_MOVEMENT_CLASS
}
from '../../../../../../shared/inventory/storage-labels';

import
{
    WarehousesService
}
from '../../../../general-settings/services/warehouses.service';

import
{
    BusinessConfigurationService
}
from '../../../../general-settings/services/business-configuration.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'accessories-form',

    standalone:true,

    imports:
    [
        CommonModule,

        FormsModule,


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

        FormModalComponent,


        //=======================================================
        // Utilities
        //=======================================================

        ToastComponent,

        ConfirmDialogComponent,

        ProgressDialogComponent
    ],


    templateUrl:'./accessories-form.html',


    styleUrls:
    [
        './accessories-form.css'
    ]
})


export class AccessoriesForm
implements OnInit, OnDestroy
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);


    private readonly router =
        inject(Router);


    private readonly accessoriesService =
        inject(AccessoriesService);


    private readonly productCategoryService =
        inject(ProductCategoryService);


    private readonly productSubCategoryService =
        inject(ProductSubCategoryService);


    private readonly warehousesService =
        inject(WarehousesService);


    private readonly rackManagementService =
        inject(RackManagementService);


    // Which warehouses run the Accessories business today
    private readonly businessConfigurationService =
        inject(BusinessConfigurationService);


    private readonly confirmDialog =
        inject(ConfirmDialogService);


    private readonly progressDialog =
        inject(ProgressDialogService);


    private readonly toast =
        inject(ToastService);


    private readonly cdr =
        inject(ChangeDetectorRef);



    //===========================================================
    // Mode
    //===========================================================

    mode:
        'add' | 'edit' | 'view' =
        'add';


    // The row's Public Id (from the link)
    entityId:
        string =
        '';



    //===========================================================
    // Page Header
    //===========================================================

    pageTitle:
        string =
        'Accessories';


    entityName:
        string =
        'Accessory';



    //===========================================================
    // Selected Tab
    //===========================================================

    selectedTab:
        string =
        'general';



    //===========================================================
    // Tabs
    //===========================================================

    get tabs():
        ControlTab[]
    {
        return [
            {
                id:'general',

                label:this.tabTitle
            }
        ];
    }



    //===========================================================
    // Tab Title
    //===========================================================

    get tabTitle():
        string
    {
        switch
        (
            this.mode
        )
        {
            case 'add':

                return `Add ${this.entityName}`;


            case 'edit':

                return `Update ${this.entityName}`;


            case 'view':

                return `View ${this.entityName}`;


            default:

                return this.entityName;
        }
    }



    //===========================================================
    // Status Items
    //===========================================================

    statusItems:
        any[]
    =
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



    //===========================================================
    // Lookups
    //
    // Categories : active, Category Type = Accessories
    // Sub Cats   : active, under the chosen category
    // Units      : fixed list
    // In edit / view the record's own (maybe inactive) choices
    // are kept so they still show.
    //===========================================================

    categoryItems:
        any[] =
    [];


    subCategoryItems:
        any[] =
    [];


    //===========================================================
    // Storage Locations
    //
    // entity.Locations holds the rows (one per warehouse);
    // locationLabels[i] is what row i shows on the form.
    // Rows are added / edited in the Storage Location modal,
    // opened from the page toolbar.
    //===========================================================

    private warehouses:
        any[] =
    [];


    private racks:
        any[] =
    [];


    // Rack maps of the warehouses opened in the modal :
    // WarehouseId → racks → shelves → bins (with holders)
    private warehouseMaps:
        Map<number, RackMap[]> =
        new Map<number, RackMap[]>();


    locationLabels:
        {
            warehouse: string;
            rack: string;
            shelf: string;

            // A-03-05
            bin: string;

            // "Rack A · SLF-A-03 · Bin 05"
            title: string;

            // The warehouse's branch no longer runs the business
            revoked: boolean;
        }[] =
    [];


    //-----------------------------------------------------------
    // Business Configuration : warehouses whose branch runs the
    // Accessories business today (core line or an active grant).
    // Only these are offered for NEW locations; saved rows in
    // other warehouses stay and are marked "access revoked".
    //-----------------------------------------------------------

    private allowedWarehouseIds:
        Set<number> =
        new Set<number>();


    private allowedWarehousesLoaded:
        boolean =
        false;


    //-----------------------------------------------------------
    // Storage Location modal
    //-----------------------------------------------------------

    locationModalOpened:
        boolean =
        false;


    // -1 : adding a new row; otherwise the row being edited
    editingLocationIndex:
        number =
        -1;


    locationDraft:
        AccessoryLocation =
    {
        WarehouseId:0,
        RackManagementId:0,
        ShelfNumber:0,
        BinNumber:0
    };


    draftWarehouseItems:
        any[] =
    [];


    draftRackItems:
        any[] =
    [];


    draftShelfItems:
        any[] =
    [];


    draftBinItems:
        any[] =
    [];


    // The warehouse's rack map is loading
    draftLoading:
        boolean =
        false;


    // Shown in the modal footer (no toast)
    draftError:
        string =
        '';



    //===========================================================
    // Movement Class (Stock & Storage) : stable items
    //===========================================================

    // Accessory Use : For Sale / Additional / Promotional
    readonly accessoryUseItems:
        any[] =
        ACCESSORY_USES.map(
            use =>
            ({
                label:use,
                value:use
            })
        );

    readonly movementClassItems:
        any[] =
        MOVEMENT_CLASS_OPTIONS.map(
            item =>
            ({
                ...item
            })
        );



    unitItems:
        any[] =
        ACCESSORY_UNITS.map(
            unit =>
            ({
                label:unit,
                value:unit
            })
        );


    private categories:
        any[] =
    [];


    private subCategories:
        any[] =
    [];


    // Brand of the chosen category (display only)
    brandName:
        string =
        '';



    //===========================================================
    // Stock Levels (text shown in the textboxes)
    //===========================================================

    reorderLevelText:
        string =
        '0';


    redLevelText:
        string =
        '0';


    maxStockLevelText:
        string =
        '0';



    //===========================================================
    // Entity
    //===========================================================

    entity:
        Accessories
    =
    {
        AccessoryId:0,

        PublicId:'',

        ProductCategoryId:0,

        ProductSubCategoryId:0,

        PartNumber:'',

        AccessoryName:'',

        Unit:'Pcs',

        ProductCode:'',

        InventoryLedgerCode:'',

        WipLedgerCode:'',

        CogsLedgerCode:'',

        ReorderLevel:0,

        RedLevel:0,

        MaxStockLevel:0,

        MovementClass:DEFAULT_MOVEMENT_CLASS,

        AccessoryUse:ACCESSORY_USE_FOR_SALE,

        Remarks:'',

        IsActive:true,

        Locations:[],

        FitSubCategoryIds:[]
    };



    //===========================================================
    // Form State
    //===========================================================

    private originalEntity:
        string =
        '';


    hasChanges:
        boolean =
        false;


    // Prevents double submit while Save / Update is running
    isSaving:
        boolean =
        false;



    //===========================================================
    // Progress Dialog Settings
    //===========================================================

    // Minimum time the dialog stays open
    private readonly MIN_PROGRESS_MS:
        number =
        5000;


    // Animation tick
    private readonly PROGRESS_TICK_MS:
        number =
        100;


    // Highest % reached before the server answers
    private readonly PROGRESS_CEILING:
        number =
        90;


    // How long 100% is shown before closing
    private readonly PROGRESS_COMPLETE_HOLD_MS:
        number =
        600;


    private progressTimer?:
        number;


    private progressValue:
        number =
        0;



    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.loadLookups();

        this.initializeMode();
    }



    //===========================================================
    // Destroy
    //===========================================================

    ngOnDestroy():
        void
    {
        this.clearProgressTimer();


        if
        (
            this.isSaving
        )
        {
            this.progressDialog.close();
        }
    }



    //===========================================================
    // Initialize Mode
    //===========================================================

    private initializeMode():
        void
    {
        const url =
            this.router.url.toLowerCase();


        //=======================================================
        // View Mode
        //=======================================================

        if
        (
            url.includes('/view/')
        )
        {
            this.mode =
                'view';
        }


        //=======================================================
        // Edit Mode
        //=======================================================

        else if
        (
            url.includes('/edit/')
        )
        {
            this.mode =
                'edit';
        }


        //=======================================================
        // Add Mode
        //=======================================================

        else
        {
            this.mode =
                'add';
        }


        //=======================================================
        // Resolve Entity Id
        //=======================================================

        const id =
            this.resolveEntityId();


        //=======================================================
        // Existing Entity
        //=======================================================

        if
        (
            id
        )
        {
            this.entityId =
                id;


            this.loadEntity();


            return;
        }


        //=======================================================
        // New Entity
        //=======================================================

        this.initializeEntity();
    }



    //===========================================================
    // Resolve Entity Id
    //===========================================================

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
            // The Public Id (uuid) of the link
            const id =
                (currentRoute.snapshot.paramMap.get('id') ?? '').trim();


            if
            (
                id
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
    // Initialize Entity
    //===========================================================

    private initializeEntity():
        void
    {
        this.entity =
        {
            AccessoryId:0,

            PublicId:'',

            ProductCategoryId:0,

            ProductSubCategoryId:0,

            PartNumber:'',

            AccessoryName:'',

            Unit:'Pcs',

            ProductCode:'',

            InventoryLedgerCode:'',

            WipLedgerCode:'',

            CogsLedgerCode:'',

            ReorderLevel:0,

            RedLevel:0,

            MaxStockLevel:0,

            MovementClass:DEFAULT_MOVEMENT_CLASS,

            AccessoryUse:ACCESSORY_USE_FOR_SALE,

            Remarks:'',

            IsActive:true,

            Locations:[],

            FitSubCategoryIds:[]
        };


        this.brandName =
            '';


        this.syncLevelTexts();


        this.buildSubCategoryItems();


        this.buildLocationOptions();


        this.setInitialFormState();
    }



    //===========================================================
    // Load Defaults (code preview for the chosen sub category)
    //===========================================================

    private loadDefaults():
        void
    {
        if
        (
            this.mode !== 'add'
        )
        {
            return;
        }

        const subCategoryId =
            Number(
                this.entity.ProductSubCategoryId
                ??
                0
            );

        if
        (
            !(subCategoryId > 0)
        )
        {
            this.applyDefaults(
                null
            );

            return;
        }

        this.accessoriesService
            .getDefaults(
                subCategoryId
            )
            .subscribe
            ({
                next:
                (
                    defaults:
                        AccessoriesDefaults
                ): void =>
                {
                    // Ignore a late answer for an older choice
                    if
                    (
                        this.mode !== 'add'
                        ||
                        Number(this.entity.ProductSubCategoryId) !== subCategoryId
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
                ): void =>
                {
                    console.error(
                        'Load Accessory Defaults Error',

                        error
                    );


                    this.applyDefaults(
                        null
                    );


                    this.toast.error(
                        'Error',

                        this.extractMessage(
                            error,
                            'Failed to generate Accessory codes.'
                        )
                    );
                }
            });
    }


    private applyDefaults
    (
        defaults:
            AccessoriesDefaults | null
    ):
        void
    {
        this.entity.ProductCode =
            defaults?.Code ?? '';

        this.entity.InventoryLedgerCode =
            defaults?.InventoryLedgerCode ?? '';

        this.entity.WipLedgerCode =
            defaults?.WipLedgerCode ?? '';

        this.entity.CogsLedgerCode =
            defaults?.CogsLedgerCode ?? '';

        this.entity.SalesLedgerCode =
            defaults?.SalesLedgerCode ?? '';

        this.checkForChanges();

        this.cdr.detectChanges();
    }



    //===========================================================
    // Load Lookups (categories, sub categories)
    //===========================================================

    private loadLookups():
        void
    {
        this.productCategoryService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        any[]
                ): void =>
                {
                    this.categories =
                        (response ?? [])
                            .filter(
                                item =>
                                    String(item?.CategoryType ?? '')
                                        .trim()
                                        .toLowerCase()
                                    ===
                                    'accessories'
                            );

                    this.buildCategoryItems();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Product Categories Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Failed to load product categories.'
                    );
                }
            });


        this.productSubCategoryService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        any[]
                ): void =>
                {
                    this.subCategories =
                        response ?? [];

                    this.buildSubCategoryItems();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Product Sub Categories Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Failed to load product sub categories.'
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
                ): void =>
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

                    this.buildLocationOptions();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Warehouses Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Failed to load warehouses.'
                    );
                }
            });


        this.businessConfigurationService
            .getAllowedWarehouses(
                'Accessories'
            )
            .subscribe
            ({
                next:
                (
                    response
                ): void =>
                {
                    this.allowedWarehouseIds =
                        new Set<number>(
                            (response ?? [])
                                .map(
                                    item =>
                                        Number(item.WarehouseId)
                                )
                        );

                    this.allowedWarehousesLoaded =
                        true;

                    this.buildLocationOptions();

                    this.buildDraftOptions();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Business Configuration Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Failed to load the business configuration (allowed warehouses).'
                    );
                }
            });


        this.rackManagementService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        any[]
                ): void =>
                {
                    this.racks =
                        response ?? [];

                    this.buildLocationOptions();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Racks Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Failed to load racks.'
                    );
                }
            });
    }



    //===========================================================
    // Storage Locations
    //
    // One row per warehouse : Warehouse → Rack → Shelf → Bin.
    // The bin is the location and holds ONE item (spare part OR
    // accessory). The modal reads the warehouse's rack map
    // (GET rack-management/bins) : only free bins are offered;
    // this item's own saved bin counts as free. Inactive racks
    // only show when already chosen. The server checks it all
    // again on save.
    //===========================================================

    //-----------------------------------------------------------
    // Rack map of a warehouse (cached while the page is open)
    //-----------------------------------------------------------

    private loadWarehouseMap
    (
        warehouseId:
            number
    ):
        void
    {
        if
        (
            !(warehouseId > 0)
            ||
            this.warehouseMaps.has(warehouseId)
        )
        {
            this.buildDraftOptions();

            return;
        }

        this.draftLoading =
            true;

        this.draftError =
            '';

        this.buildDraftOptions();

        this.rackManagementService
            .getWarehouseBins(
                warehouseId,
                {
                    accessoryId:
                        Number(this.entity?.AccessoryId) || 0
                }
            )
            .subscribe
            ({
                next:
                (
                    maps:
                        RackMap[]
                ): void =>
                {
                    this.warehouseMaps.set(
                        warehouseId,
                        maps ?? []
                    );

                    this.draftLoading =
                        false;

                    this.buildDraftOptions();

                    this.buildLocationOptions();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Rack Bins Error',
                        error
                    );

                    this.draftLoading =
                        false;

                    this.draftError =
                        this.extractMessage(
                            error,
                            'The racks of this warehouse could not be loaded.'
                        );

                    this.buildDraftOptions();
                }
            });
    }


    private findRack
    (
        warehouseId:
            number,
        rackId:
            number
    ):
        RackMap | undefined
    {
        return (this.warehouseMaps.get(Number(warehouseId)) ?? [])
            .find(
                rack =>
                    rack.RackManagementId === Number(rackId)
            );
    }


    // A bin is free when nobody holds it (this item's own saved
    // bin is free) and no other row of this item uses it
    private isBinFree
    (
        rack:
            RackMap | undefined,
        shelfNumber:
            number,
        binNumber:
            number
    ):
        boolean
    {
        const shelf =
            rack?.Shelves.find(
                item =>
                    item.ShelfNumber === Number(shelfNumber)
            );

        const bin =
            shelf?.Bins.find(
                item =>
                    item.BinNumber === Number(binNumber)
            );

        if
        (
            !rack
            ||
            !bin
            ||
            !bin.IsFree
        )
        {
            return false;
        }

        return !(this.entity.Locations ?? [])
            .some(
                (row, i) =>
                    i !== this.editingLocationIndex
                    &&
                    Number(row.RackManagementId) === rack.RackManagementId
                    &&
                    Number(row.ShelfNumber) === Number(shelfNumber)
                    &&
                    (Number(row.BinNumber) || 1) === Number(binNumber)
            );
    }


    private freeBinsOfShelf
    (
        rack:
            RackMap | undefined,
        shelfNumber:
            number
    ):
        number[]
    {
        const shelf =
            rack?.Shelves.find(
                item =>
                    item.ShelfNumber === Number(shelfNumber)
            );

        return (shelf?.Bins ?? [])
            .map(
                bin =>
                    bin.BinNumber
            )
            .filter(
                binNumber =>
                    this.isBinFree(
                        rack,
                        shelfNumber,
                        binNumber
                    )
            );
    }


    private freeBinCount
    (
        rack:
            RackMap
    ):
        number
    {
        return rack.Shelves
            .reduce(
                (sum, shelf) =>
                    sum
                    +
                    this.freeBinsOfShelf(
                        rack,
                        shelf.ShelfNumber
                    ).length,
                0
            );
    }


    // Modal footer : the chosen rack / shelf has no free bin
    get draftRackFull():
        boolean
    {
        return Number(this.locationDraft.RackManagementId) > 0
            &&
            !this.draftLoading
            &&
            this.draftShelfItems.length === 0;
    }


    get locationModalTitle():
        string
    {
        return this.editingLocationIndex >= 0
            ? `Edit Storage Location ${this.editingLocationIndex + 1}`
            : 'Add Storage Location';
    }


    get canSaveLocation():
        boolean
    {
        return Number(this.locationDraft.WarehouseId) > 0
            &&
            Number(this.locationDraft.RackManagementId) > 0
            &&
            Number(this.locationDraft.ShelfNumber) > 0
            &&
            Number(this.locationDraft.BinNumber) > 0;
    }


    // Modal preview of the picked place
    get draftPreview():
        { warehouse: string; rack: string; shelf: string; bin: string; outsidePlan: string }
    {
        const draft =
            this.locationDraft;

        const rack =
            this.findRack(
                draft.WarehouseId,
                draft.RackManagementId
            );

        const warehouse =
            this.warehouses.find(
                item =>
                    Number(item?.WarehouseId) === Number(draft.WarehouseId)
            );

        return {
            warehouse:
                warehouse
                    ? `${warehouse.WarehouseCode} - ${warehouse.WarehouseName}`
                    : '',

            rack:
                rack
                    ? `${rack.RackCode} - ${rack.RackName}`
                    : '',

            shelf:
                shelfLabel(
                    rack?.RackName,
                    Number(draft.ShelfNumber)
                ),

            bin:
                binCode(
                    rack?.RackName,
                    Number(draft.ShelfNumber),
                    Number(draft.BinNumber)
                ),

            outsidePlan:
                this.outsidePlanNote(
                    rack
                )
        };
    }


    // "Outside the rack plan" : the rack is assigned to another
    // category / sub category (a hint only; placement is allowed)
    private outsidePlanNote
    (
        rack:
            RackMap | undefined
    ):
        string
    {
        if
        (
            !rack
            ||
            rack.IsGeneral
            ||
            !rack.ProductCategoryId
        )
        {
            return '';
        }

        const fits =
            rack.ProductCategoryId === Number(this.entity.ProductCategoryId)
            &&
            (
                rack.SubCategoryIds.length === 0
                ||
                rack.SubCategoryIds.includes(
                    Number(this.entity.ProductSubCategoryId)
                )
            );

        return fits
            ? ''
            : `Outside the rack plan : ${rack.RackName} is assigned to ${rack.AssignmentText || rack.CategoryName}.`;
    }


    // Page toolbar : Add Location
    openAddLocation():
        void
    {
        if
        (
            this.isViewMode
            ||
            this.isSaving
        )
        {
            return;
        }

        this.editingLocationIndex =
            -1;

        this.locationDraft =
        {
            WarehouseId:0,
            RackManagementId:0,
            ShelfNumber:0,
            BinNumber:0
        };

        this.draftError =
            '';

        this.buildDraftOptions();

        if
        (
            this.draftWarehouseItems.length ===
            0
        )
        {
            this.toast.info(
                'Storage Locations',

                (this.entity.Locations ?? []).length > 0
                    ? 'Every warehouse that runs the Accessories business already has a location for this accessory.'
                    : 'No warehouse runs the Accessories business. Grant it to a branch in Business Configuration.'
            );

            return;
        }

        this.locationModalOpened =
            true;

        this.cdr.detectChanges();
    }


    openEditLocation
    (
        index:
            number
    ):
        void
    {
        const row =
            this.entity.Locations?.[index];

        if
        (
            !row
            ||
            this.isViewMode
            ||
            this.isSaving
        )
        {
            return;
        }

        this.editingLocationIndex =
            index;

        this.locationDraft =
        {
            WarehouseId:
                Number(row.WarehouseId),

            RackManagementId:
                Number(row.RackManagementId),

            ShelfNumber:
                Number(row.ShelfNumber),

            BinNumber:
                Number(row.BinNumber) || 1
        };

        this.draftError =
            '';

        this.locationModalOpened =
            true;

        this.loadWarehouseMap(
            Number(row.WarehouseId)
        );

        this.cdr.detectChanges();
    }


    closeLocationModal():
        void
    {
        this.locationModalOpened =
            false;

        this.editingLocationIndex =
            -1;

        this.draftError =
            '';

        this.cdr.detectChanges();
    }


    onDraftWarehouseChange
    (
        value:
            any
    ):
        void
    {
        const warehouseId =
            Number(this.unwrapValue(value) ?? 0);

        if
        (
            warehouseId === Number(this.locationDraft.WarehouseId)
        )
        {
            return;
        }

        this.locationDraft.WarehouseId =
            warehouseId;

        // A new warehouse clears the rack, shelf and bin
        this.locationDraft.RackManagementId =
            0;

        this.locationDraft.ShelfNumber =
            0;

        this.locationDraft.BinNumber =
            0;

        this.draftError =
            '';

        this.loadWarehouseMap(
            warehouseId
        );
    }


    onDraftRackChange
    (
        value:
            any
    ):
        void
    {
        const rackId =
            Number(this.unwrapValue(value) ?? 0);

        if
        (
            rackId === Number(this.locationDraft.RackManagementId)
        )
        {
            return;
        }

        this.locationDraft.RackManagementId =
            rackId;

        this.locationDraft.ShelfNumber =
            0;

        this.locationDraft.BinNumber =
            0;

        this.buildDraftOptions();
    }


    onDraftShelfChange
    (
        value:
            any
    ):
        void
    {
        const shelfNumber =
            Number(this.unwrapValue(value) ?? 0);

        if
        (
            shelfNumber === Number(this.locationDraft.ShelfNumber)
        )
        {
            return;
        }

        this.locationDraft.ShelfNumber =
            shelfNumber;

        // The first free bin of the shelf is proposed
        const rack =
            this.findRack(
                this.locationDraft.WarehouseId,
                this.locationDraft.RackManagementId
            );

        this.locationDraft.BinNumber =
            this.freeBinsOfShelf(
                rack,
                shelfNumber
            )[0]
            ??
            0;

        this.buildDraftOptions();
    }


    onDraftBinChange
    (
        value:
            any
    ):
        void
    {
        this.locationDraft.BinNumber =
            Number(this.unwrapValue(value) ?? 0);

        this.cdr.detectChanges();
    }


    // Modal Save : add or replace the row
    saveLocation():
        void
    {
        if
        (
            !this.canSaveLocation
        )
        {
            this.draftError =
                'Select the warehouse, rack, shelf and bin.';

            this.cdr.detectChanges();

            return;
        }

        const rack =
            this.findRack(
                this.locationDraft.WarehouseId,
                this.locationDraft.RackManagementId
            );

        if
        (
            !this.isBinFree(
                rack,
                this.locationDraft.ShelfNumber,
                this.locationDraft.BinNumber
            )
        )
        {
            this.draftError =
                'This bin is already used. Choose another bin.';

            this.cdr.detectChanges();

            return;
        }

        const row:
            AccessoryLocation =
        {
            WarehouseId:
                Number(this.locationDraft.WarehouseId),

            RackManagementId:
                Number(this.locationDraft.RackManagementId),

            ShelfNumber:
                Number(this.locationDraft.ShelfNumber),

            BinNumber:
                Number(this.locationDraft.BinNumber)
        };

        const rows =
            [
                ...(this.entity.Locations ?? [])
            ];

        if
        (
            this.editingLocationIndex >= 0
        )
        {
            rows[this.editingLocationIndex] =
                row;
        }
        else
        {
            rows.push(
                row
            );
        }

        this.entity.Locations =
            rows;

        this.buildLocationOptions();

        this.closeLocationModal();

        this.onValueChange();
    }


    removeLocation
    (
        index:
            number
    ):
        void
    {
        if
        (
            this.isViewMode
            ||
            this.isSaving
        )
        {
            return;
        }

        this.entity.Locations =
            (this.entity.Locations ?? [])
                .filter(
                    (_, i) =>
                        i !== index
                );

        this.buildLocationOptions();

        this.onValueChange();
    }


    //-----------------------------------------------------------
    // Modal dropdown items
    //-----------------------------------------------------------

    private buildDraftOptions():
        void
    {
        const draft =
            this.locationDraft;

        // Warehouses used by the other rows are not offered
        const usedElsewhere =
            (this.entity.Locations ?? [])
                .filter(
                    (_, i) =>
                        i !== this.editingLocationIndex
                )
                .map(
                    row =>
                        Number(row.WarehouseId)
                );

        this.draftWarehouseItems =
            this.warehouses
                .filter(
                    item =>
                        !usedElsewhere.includes(
                            Number(item?.WarehouseId)
                        )
                        &&
                        (
                            // The row's own warehouse always stays
                            Number(item?.WarehouseId) === Number(draft.WarehouseId)
                            ||
                            (
                                Boolean(item?.IsActive)
                                &&
                                // Branch runs the Accessories business today
                                this.allowedWarehouseIds.has(
                                    Number(item?.WarehouseId)
                                )
                            )
                        )
                )
                .map(
                    item =>
                    ({
                        label:
                            `${item.WarehouseCode} - ${item.WarehouseName}`,

                        value:
                            Number(item.WarehouseId)
                    })
                );

        // Racks of the warehouse (zone priority order from the
        // server); inactive only when already chosen
        const warehouseRacks =
            (this.warehouseMaps.get(Number(draft.WarehouseId)) ?? [])
                .filter(
                    rack =>
                        rack.IsActive
                        ||
                        rack.RackManagementId === Number(draft.RackManagementId)
                );

        // A rack with no free bin is still listed, marked (Full)
        this.draftRackItems =
            warehouseRacks
                .map(
                    rack =>
                    {
                        const free =
                            this.freeBinCount(
                                rack
                            );

                        const zone =
                            rack.ZoneCode
                                ? ` · ${rack.ZoneCode}`
                                : '';

                        return {
                            label:
                                free > 0
                                    ? `${rack.RackCode} - ${rack.RackName}${zone} (${free} free)`
                                    : `${rack.RackCode} - ${rack.RackName}${zone} (Full)`,

                            value:
                                rack.RackManagementId
                        };
                    }
                );

        const rack =
            warehouseRacks.find(
                item =>
                    item.RackManagementId === Number(draft.RackManagementId)
            );

        // SLF-A-01 … : shelves with at least one free bin
        this.draftShelfItems =
            (rack?.Shelves ?? [])
                .map(
                    shelf =>
                    ({
                        shelf,

                        free:
                            this.freeBinsOfShelf(
                                rack,
                                shelf.ShelfNumber
                            ).length
                    })
                )
                .filter(
                    item =>
                        item.free > 0
                )
                .map(
                    item =>
                    ({
                        label:
                            `${shelfLabel(rack?.RackName, item.shelf.ShelfNumber)}${item.shelf.IsPrime ? ' · Prime' : ''} (${item.free} free)`,

                        value:
                            item.shelf.ShelfNumber
                    })
                );

        // A chosen shelf that is full meanwhile is cleared
        if
        (
            Number(draft.ShelfNumber) > 0
            &&
            !this.draftLoading
            &&
            !this.draftShelfItems.some(
                item =>
                    Number(item.value) === Number(draft.ShelfNumber)
            )
        )
        {
            draft.ShelfNumber =
                0;

            draft.BinNumber =
                0;
        }

        // A-03-01 … : only the free bins of the chosen shelf
        // (this item's own bin included)
        const ownBin =
            (this.entity.Locations ?? [])[this.editingLocationIndex];

        this.draftBinItems =
            this.freeBinsOfShelf(
                rack,
                Number(draft.ShelfNumber)
            )
            .map(
                binNumber =>
                ({
                    label:
                        ownBin
                        &&
                        Number(ownBin.RackManagementId) === Number(draft.RackManagementId)
                        &&
                        Number(ownBin.ShelfNumber) === Number(draft.ShelfNumber)
                        &&
                        (Number(ownBin.BinNumber) || 1) === binNumber
                            ? `${binCode(rack?.RackName, Number(draft.ShelfNumber), binNumber)} (current)`
                            : binCode(rack?.RackName, Number(draft.ShelfNumber), binNumber),

                    value:
                        binNumber
                })
            );

        // A chosen bin that was taken meanwhile is cleared
        if
        (
            Number(draft.BinNumber) > 0
            &&
            !this.draftLoading
            &&
            !this.draftBinItems.some(
                item =>
                    Number(item.value) === Number(draft.BinNumber)
            )
        )
        {
            draft.BinNumber =
                0;
        }

        this.cdr.detectChanges();
    }


    //-----------------------------------------------------------
    // Row labels shown on the form (warehouse / rack / bin)
    //-----------------------------------------------------------

    private buildLocationOptions():
        void
    {
        this.locationLabels =
            (this.entity.Locations ?? [])
                .map(
                    row =>
                    {
                        const warehouse =
                            this.warehouses.find(
                                item =>
                                    Number(item?.WarehouseId) === Number(row.WarehouseId)
                            );

                        const rack =
                            this.racks.find(
                                item =>
                                    Number(item?.RackManagementId) === Number(row.RackManagementId)
                            )
                            ??
                            this.findRack(
                                row.WarehouseId,
                                row.RackManagementId
                            );

                        const rackName =
                            rack?.RackName
                            ??
                            row.RackName
                            ??
                            '';

                        return {
                            warehouse:
                                warehouse
                                    ? `${warehouse.WarehouseCode} - ${warehouse.WarehouseName}`
                                    : `Warehouse #${row.WarehouseId}`,

                            rack:
                                rack
                                    ? `${rack.RackCode} - ${rack.RackName}`
                                    : `Rack #${row.RackManagementId}`,

                            shelf:
                                shelfLabel(
                                    rackName,
                                    Number(row.ShelfNumber)
                                ),

                            bin:
                                binCode(
                                    rackName,
                                    Number(row.ShelfNumber),
                                    Number(row.BinNumber) || 1
                                ),

                            title:
                                locationText(
                                    rackName,
                                    Number(row.ShelfNumber),
                                    Number(row.BinNumber) || 1
                                ),

                            revoked:
                                this.allowedWarehousesLoaded
                                &&
                                !this.allowedWarehouseIds.has(
                                    Number(row.WarehouseId)
                                )
                        };
                    }
                );

        this.cdr.detectChanges();
    }


    //===========================================================
    // Build Dropdown Items
    //===========================================================

    private buildCategoryItems():
        void
    {
        const currentId =
            Number(this.entity.ProductCategoryId ?? 0);

        this.categoryItems =
            this.categories
                .filter(
                    item =>
                        Boolean(item?.IsActive)
                        ||
                        Number(item?.ProductCategoryId) === currentId
                )
                .map(
                    item =>
                    ({
                        label:
                            `${item.CategoryCode} - ${item.CategoryName}`,

                        value:
                            Number(item.ProductCategoryId)
                    })
                );

        this.updateBrandName();

        this.cdr.detectChanges();
    }


    private buildSubCategoryItems():
        void
    {
        const categoryId =
            Number(this.entity.ProductCategoryId ?? 0);

        const currentId =
            Number(this.entity.ProductSubCategoryId ?? 0);

        this.subCategoryItems =
            categoryId > 0
                ? this.subCategories
                    .filter(
                        item =>
                            Number(item?.ProductCategoryId) === categoryId
                            &&
                            (
                                Boolean(item?.IsActive)
                                ||
                                Number(item?.ProductSubCategoryId) === currentId
                            )
                    )
                    .map(
                        item =>
                        ({
                            label:
                                `${item.SubCategoryCode} - ${item.SubCategoryName}`,

                            value:
                                Number(item.ProductSubCategoryId)
                        })
                    )
                : [];

        this.cdr.detectChanges();
    }


    //===========================================================
    // Parent Changes (add mode only; locked afterwards)
    //===========================================================

    // A dropdown may emit the value or the whole { label, value } item
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


    onCategoryChange
    (
        value?:
            any
    ):
        void
    {
        if
        (
            value !== undefined
        )
        {
            this.entity.ProductCategoryId =
                Number(this.unwrapValue(value) ?? 0);
        }

        // A new category clears the sub category and its codes
        this.entity.ProductSubCategoryId =
            0;

        // Fits Models belong to the category too
        this.entity.FitSubCategoryIds =
            [];

        this.buildSubCategoryItems();

        this.updateBrandName();

        this.loadDefaults();

        this.onValueChange();
    }


    onSubCategoryChange
    (
        value?:
            any
    ):
        void
    {
        if
        (
            value !== undefined
        )
        {
            this.entity.ProductSubCategoryId =
                Number(this.unwrapValue(value) ?? 0);
        }

        // The home model is never a "fits" link
        this.entity.FitSubCategoryIds =
            (this.entity.FitSubCategoryIds ?? [])
                .filter(x => x !== Number(this.entity.ProductSubCategoryId));

        this.loadDefaults();

        this.onValueChange();
    }


    //===========================================================
    // Fits Models : other sub categories (models) of the same
    // category this item also fits. Its stock, price and ledgers
    // stay with its home sub category.
    //===========================================================

    // Bound to the "add" dropdown; cleared after each pick
    fitPickValue:
        number | null =
        null;

    // Cached so the bindings keep the same array between checks
    private fitCacheKey =
        '';

    private fitItemsCache:
        any[] =
        [];

    private fitChipsCache:
        { id: number; name: string; title: string; home: boolean }[] =
        [];

    private refreshFitCache():
        void
    {
        const key =
            [
                this.entity.ProductCategoryId,
                this.entity.ProductSubCategoryId,
                (this.entity.FitSubCategoryIds ?? []).join(','),
                this.subCategories.length,
                (this.entity.Fits ?? []).length
            ].join('|');

        if
        (
            key === this.fitCacheKey
        )
        {
            return;
        }

        this.fitCacheKey = key;

        this.fitItemsCache = this.buildFitItems();

        this.fitChipsCache = this.buildFitChips();
    }

    get fitItems():
        any[]
    {
        this.refreshFitCache();

        return this.fitItemsCache;
    }

    get fitChips():
        { id: number; name: string; title: string; home: boolean }[]
    {
        this.refreshFitCache();

        return this.fitChipsCache;
    }

    // Sub categories that can still be added
    private buildFitItems():
        any[]
    {
        const categoryId =
            Number(this.entity.ProductCategoryId ?? 0);

        const homeId =
            Number(this.entity.ProductSubCategoryId ?? 0);

        const chosen =
            new Set<number>(this.entity.FitSubCategoryIds ?? []);

        return categoryId > 0
            ? this.subCategories
                .filter(
                    item =>
                        Number(item?.ProductCategoryId) === categoryId
                        &&
                        Number(item?.ProductSubCategoryId) !== homeId
                        &&
                        !chosen.has(Number(item?.ProductSubCategoryId))
                        &&
                        Boolean(item?.IsActive)
                )
                .map(
                    item =>
                    ({
                        label:
                            `${item.SubCategoryCode} - ${item.SubCategoryName}`,

                        value:
                            Number(item.ProductSubCategoryId)
                    })
                )
            : [];
    }

    // Chips : the home model first, then the linked ones
    private buildFitChips():
        { id: number; name: string; title: string; home: boolean }[]
    {
        const find =
            (id: number): any =>
                this.subCategories.find(x => Number(x?.ProductSubCategoryId) === id)
                ??
                (this.entity.Fits ?? []).find(x => Number(x.ProductSubCategoryId) === id);

        const chip =
            (id: number, home: boolean) =>
            {
                const sub: any =
                    find(id);

                const full =
                    String(sub?.SubCategoryName ?? '');

                return {
                    id,
                    home,
                    name: this.shortModelName(full) || String(sub?.SubCategoryCode ?? id),
                    title: sub ? `${sub.SubCategoryCode} - ${full}` : String(id)
                };
            };

        const homeId =
            Number(this.entity.ProductSubCategoryId ?? 0);

        return [
            ...(homeId > 0 ? [chip(homeId, true)] : []),
            ...(this.entity.FitSubCategoryIds ?? []).map(id => chip(id, false))
        ];
    }

    // "Spare Parts - REVOO - A04" -> "A04"
    private shortModelName
    (
        name:
            string
    ):
        string
    {
        const parts =
            String(name ?? '').split(' - ').map(x => x.trim()).filter(x => !!x);

        return parts.length > 0 ? parts[parts.length - 1] : '';
    }

    onAddFit
    (
        value:
            any
    ):
        void
    {
        const id =
            Number(this.unwrapValue(value) ?? 0);

        this.fitPickValue =
            id || null;

        if
        (
            id > 0
            &&
            id !== Number(this.entity.ProductSubCategoryId)
            &&
            !(this.entity.FitSubCategoryIds ?? []).includes(id)
        )
        {
            this.entity.FitSubCategoryIds =
                [...(this.entity.FitSubCategoryIds ?? []), id];

            this.onValueChange();
        }

        // Ready for the next pick
        setTimeout(
            () =>
            {
                this.fitPickValue = null;

                this.cdr.detectChanges();
            });
    }

    removeFit
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
            this.isSaving
        )
        {
            return;
        }

        this.entity.FitSubCategoryIds =
            (this.entity.FitSubCategoryIds ?? []).filter(x => x !== id);

        this.onValueChange();
    }


    private updateBrandName():
        void
    {
        const category =
            this.categories.find(
                item =>
                    Number(item?.ProductCategoryId)
                    ===
                    Number(this.entity.ProductCategoryId)
            );

        this.brandName =
            category?.BrandName ?? '';
    }


    //===========================================================
    // Stock Levels (whole numbers only)
    //===========================================================

    private syncLevelTexts():
        void
    {
        this.reorderLevelText =
            String(this.entity.ReorderLevel ?? 0);

        this.redLevelText =
            String(this.entity.RedLevel ?? 0);

        this.maxStockLevelText =
            String(this.entity.MaxStockLevel ?? 0);
    }


    private toWholeNumber
    (
        value:
            string | number | null | undefined
    ):
        { text: string; number: number }
    {
        const digits =
            String(value ?? '')
                .replace(/[^0-9]/g, '')
                .replace(/^0+(?=\d)/, '')
                .slice(0, 9);

        return {
            text:
                digits,

            number:
                digits
                    ? Number(digits)
                    : 0
        };
    }


    onReorderLevelChange
    (
        value:
            string | number
    ):
        void
    {
        const result =
            this.toWholeNumber(
                value
            );

        this.reorderLevelText =
            result.text;

        this.entity.ReorderLevel =
            result.number;

        this.onValueChange();
    }


    onRedLevelChange
    (
        value:
            string | number
    ):
        void
    {
        const result =
            this.toWholeNumber(
                value
            );

        this.redLevelText =
            result.text;

        this.entity.RedLevel =
            result.number;

        this.onValueChange();
    }


    onMaxStockLevelChange
    (
        value:
            string | number
    ):
        void
    {
        const result =
            this.toWholeNumber(
                value
            );

        this.maxStockLevelText =
            result.text;

        this.entity.MaxStockLevel =
            result.number;

        this.onValueChange();
    }



    //===========================================================
    // Accessory Use (default For Sale)
    //===========================================================

    onAccessoryUseChange
    (
        value:
            any
    ):
        void
    {
        this.entity.AccessoryUse =
            normalizeAccessoryUse(
                this.unwrapValue(
                    value
                )
            );

        this.onValueChange();
    }

    // Free with bikes : shown on Motor Bike Stock › Accessories
    get isBikeAccessory():
        boolean
    {
        return normalizeAccessoryUse(this.entity.AccessoryUse) !== ACCESSORY_USE_FOR_SALE;
    }


    //===========================================================
    // Movement Class (default Slow Moving)
    //===========================================================

    onMovementClassChange
    (
        value:
            any
    ):
        void
    {
        this.entity.MovementClass =
            movementClassInfo(
                this.unwrapValue(
                    value
                )
            ).value;

        this.onValueChange();
    }



    //===========================================================
    // Server Message
    //===========================================================

    private extractMessage
    (
        error:
            any,
        fallback:
            string
    ):
        string
    {
        if
        (
            typeof error?.error === 'string'
            &&
            error.error.trim()
        )
        {
            return error.error;
        }

        return error?.error?.message
            ??
            error?.error?.title
            ??
            fallback;
    }



    //===========================================================
    // Set Initial Form State
    //===========================================================

    private setInitialFormState():
        void
    {
        this.originalEntity =
            JSON.stringify(
                this.entity
            );


        this.hasChanges =
            false;


        this.cdr.detectChanges();
    }



    //===========================================================
    // Load Entity
    //===========================================================

    private loadEntity():
        void
    {
        this.accessoriesService
            .getById(
                this.entityId
            )
            .subscribe
            ({
                next:
                (
                    response:
                        any
                ): void =>
                {
                    this.entity =
                        this.accessoriesService.normalize(
                            response
                        );


                    // Fits Models : only the ids are edited
                    this.entity.FitSubCategoryIds =
                        (this.entity.Fits ?? [])
                            .map(x => Number(x.ProductSubCategoryId))
                            .filter(x => x > 0);

                    // Only the editable values; names come from lookups
                    this.entity.Locations =
                        (this.entity.Locations ?? [])
                            .map(
                                location =>
                                ({
                                    WarehouseId:
                                        Number(location.WarehouseId),

                                    RackManagementId:
                                        Number(location.RackManagementId),

                                    ShelfNumber:
                                        Number(location.ShelfNumber),

                                    BinNumber:
                                        Number(location.BinNumber) || 1
                                })
                            );


                    this.buildLocationOptions();


                    this.syncLevelTexts();


                    this.buildCategoryItems();

                    this.buildSubCategoryItems();


                    this.originalEntity =
                        JSON.stringify(
                            this.entity
                        );


                    this.hasChanges =
                        false;


                    this.cdr.detectChanges();
                },


                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Accessory Error',

                        error
                    );


                    this.toast.error(
                        'Error',

                        'Failed to load accessory.'
                    );


                    this.onBackToList();
                }
            });
    }



    //===========================================================
    // Track Changes
    //===========================================================

    checkForChanges():
        void
    {
        this.hasChanges =
            JSON.stringify(
                this.entity
            )
            !==
            this.originalEntity;
    }



    //===========================================================
    // Tab Change
    //===========================================================

    onTabChange
    (
        tabId:
            string
    ):
        void
    {
        this.selectedTab =
            tabId;
    }



    //===========================================================
    // Progress Dialog (Animated)
    //
    // The bar eases from 0% toward 90% while the request runs,
    // then jumps to 100% on success before closing.
    //===========================================================

    private startProgress
    (
        title:
            string,

        message:
            string
    ):
        void
    {
        this.isSaving =
            true;


        this.progressValue =
            0;


        // Determinate : we drive the percentage ourselves
        this.progressDialog.show(
            title,

            message,

            false
        );


        this.clearProgressTimer();


        this.progressTimer =
            window.setInterval(
                () =>
                {
                    // Ease-out : big steps first, smaller near the ceiling
                    const step =
                        Math.max(
                            0.4,
                            (this.PROGRESS_CEILING - this.progressValue) * 0.05
                        );


                    this.progressValue =
                        Math.min(
                            this.PROGRESS_CEILING,
                            this.progressValue + step
                        );


                    this.progressDialog.update(
                        Math.round(
                            this.progressValue
                        )
                    );
                },

                this.PROGRESS_TICK_MS
            );


        this.cdr.detectChanges();
    }


    //-----------------------------------------------------------
    // Success : show 100%, pause briefly, then close
    //-----------------------------------------------------------

    private completeProgress
    (
        message:
            string,

        done:
            () => void
    ):
        void
    {
        this.clearProgressTimer();


        this.progressDialog.update(
            100,

            message
        );


        window.setTimeout(
            () =>
            {
                this.progressDialog.close();


                this.isSaving =
                    false;


                this.cdr.detectChanges();


                done();
            },

            this.PROGRESS_COMPLETE_HOLD_MS
        );
    }


    //-----------------------------------------------------------
    // Error : close immediately, then report
    //-----------------------------------------------------------

    private failProgress
    (
        done:
            () => void
    ):
        void
    {
        this.clearProgressTimer();


        this.progressDialog.close();


        this.isSaving =
            false;


        this.cdr.detectChanges();


        done();
    }


    private clearProgressTimer():
        void
    {
        if
        (
            this.progressTimer
        )
        {
            clearInterval(
                this.progressTimer
            );


            this.progressTimer =
                undefined;
        }
    }



    //===========================================================
    // Minimum Progress Duration
    //
    // Keeps the progress dialog visible for at least
    // MIN_PROGRESS_MS, on both success and error.
    //===========================================================

    private withMinimumDuration<T>
    (
        source$:
            Observable<T>
    ):
        Observable<T>
    {
        return defer(
            () =>
            {
                const startedAt:
                    number =
                    Date.now();


                const remaining =
                    (): number =>
                        Math.max(
                            0,
                            this.MIN_PROGRESS_MS - (Date.now() - startedAt)
                        );


                return source$.pipe(

                    delayWhen(
                        () =>
                            timer(remaining())
                    ),

                    catchError(
                        error =>
                            timer(remaining()).pipe(
                                switchMap(
                                    () =>
                                        throwError(() => error)
                                )
                            )
                    )
                );
            }
        );
    }



    //===========================================================
    // Save
    //===========================================================

    onSave():
        void
    {
        //=======================================================
        // View Mode / Already Saving
        //=======================================================

        if
        (
            this.isViewMode
            ||
            this.isSaving
        )
        {
            return;
        }


        //=======================================================
        // Validation
        //=======================================================

        const required:
            { ok: boolean; message: string }[] =
        [
            {
                ok:
                    Number(this.entity.ProductCategoryId) > 0,

                message:
                    'Product Category is required.'
            },

            {
                ok:
                    Number(this.entity.ProductSubCategoryId) > 0,

                message:
                    'Product Sub Category is required.'
            },

            {
                ok:
                    !!this.entity.AccessoryName?.trim(),

                message:
                    'Accessory Name is required.'
            },

            {
                ok:
                    !!this.entity.Unit?.trim(),

                message:
                    'Unit is required.'
            },

            {
                ok:
                    !!this.entity.ProductCode?.trim(),

                message:
                    'Product Code could not be generated. Select the Product Sub Category again.'
            }
        ];


        for
        (
            const field
            of required
        )
        {
            if
            (
                !field.ok
            )
            {
                this.toast.error(
                    'Validation',

                    field.message
                );

                return;
            }
        }


        // Red Level below Re-order Level (both 0 is allowed)
        if
        (
            !(this.entity.ReorderLevel === 0 && this.entity.RedLevel === 0)
            &&
            this.entity.RedLevel >= this.entity.ReorderLevel
        )
        {
            this.toast.error(
                'Validation',

                'Red Level must be lower than Re-order Level.'
            );

            return;
        }


        // Max Stock Level above Re-order Level (0 = not set)
        if
        (
            this.entity.MaxStockLevel > 0
            &&
            this.entity.MaxStockLevel <= this.entity.ReorderLevel
        )
        {
            this.toast.error(
                'Validation',

                'Max Stock Level must be higher than Re-order Level.'
            );

            return;
        }


        //=======================================================
        // Storage Locations : complete rows, one per warehouse
        //=======================================================

        const locations:
            AccessoryLocation[] =
            this.entity.Locations ?? [];

        for
        (
            let i = 0;
            i < locations.length;
            i++
        )
        {
            const row =
                locations[i];

            if
            (
                !(Number(row.WarehouseId) > 0)
                ||
                !(Number(row.RackManagementId) > 0)
                ||
                !(Number(row.ShelfNumber) > 0)
                ||
                !(Number(row.BinNumber) > 0)
            )
            {
                this.toast.error(
                    'Validation',

                    `Storage Location ${i + 1} is incomplete. Edit it or remove it.`
                );

                return;
            }
        }


        // Remarks and locations are optional



        //=======================================================
        // Add
        //=======================================================

        if
        (
            this.mode === 'add'
        )
        {
            this.saveCreate();

            return;
        }


        //=======================================================
        // Update
        //=======================================================

        this.saveUpdate();
    }



    //===========================================================
    // Create
    //===========================================================

    private saveCreate():
        void
    {
        const model:
            CreateAccessories =
        {
            ProductCategoryId:
                Number(this.entity.ProductCategoryId),

            ProductSubCategoryId:
                Number(this.entity.ProductSubCategoryId),

            PartNumber:
                this.entity.PartNumber?.trim() ?? '',

            AccessoryName:
                this.entity.AccessoryName?.trim() ?? '',

            Unit:
                this.entity.Unit ?? '',

            ReorderLevel:
                Number(this.entity.ReorderLevel ?? 0),

            RedLevel:
                Number(this.entity.RedLevel ?? 0),


            MaxStockLevel:
                Number(this.entity.MaxStockLevel ?? 0),

            MovementClass:
                movementClassInfo(
                    this.entity.MovementClass
                ).value,

            AccessoryUse:
                normalizeAccessoryUse(
                    this.entity.AccessoryUse
                ),

            Remarks:
                this.entity.Remarks?.trim() ?? '',

            IsActive:
                this.entity.IsActive,

            // Fits Models (replaces the saved links)
            FitSubCategoryIds:
                [...(this.entity.FitSubCategoryIds ?? [])],

            Locations:
                (this.entity.Locations ?? [])
                    .map(
                        location =>
                        ({
                            WarehouseId:
                                Number(location.WarehouseId),

                            RackManagementId:
                                Number(location.RackManagementId),

                            ShelfNumber:
                                Number(location.ShelfNumber),

                            BinNumber:
                                Number(location.BinNumber) || 1
                        })
                    )
        };


        this.startProgress(
            'Saving Accessory',

            'Please wait while the accessory is being saved...'
        );


        this.withMinimumDuration(
            this.accessoriesService
                .create(
                    model
                )
        )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.completeProgress(

                        'Accessory saved.',

                        () =>
                        {
                            this.setInitialFormState();


                            this.toast.success(
                                'Success',

                                'Accessory created successfully.'
                            );


                            this.onBackToList();
                        }
                    );
                },


                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Create Accessory Error',

                        error
                    );


                    this.failProgress(
                        () =>
                        {
                            const message =
                                (error as any)?.error
                                ??
                                'Failed to create accessory.';


                            this.toast.error(
                                'Validation',

                                message
                            );
                        }
                    );
                }
            });
    }



    //===========================================================
    // Update
    //===========================================================

    private saveUpdate():
        void
    {
        const model:
            UpdateAccessories =
        {
            AccessoryId:
                this.entity.AccessoryId,

            ProductCategoryId:
                Number(this.entity.ProductCategoryId),

            ProductSubCategoryId:
                Number(this.entity.ProductSubCategoryId),

            PartNumber:
                this.entity.PartNumber?.trim() ?? '',

            AccessoryName:
                this.entity.AccessoryName?.trim() ?? '',

            Unit:
                this.entity.Unit ?? '',

            ReorderLevel:
                Number(this.entity.ReorderLevel ?? 0),

            RedLevel:
                Number(this.entity.RedLevel ?? 0),


            MaxStockLevel:
                Number(this.entity.MaxStockLevel ?? 0),

            MovementClass:
                movementClassInfo(
                    this.entity.MovementClass
                ).value,

            AccessoryUse:
                normalizeAccessoryUse(
                    this.entity.AccessoryUse
                ),

            Remarks:
                this.entity.Remarks?.trim() ?? '',

            IsActive:
                this.entity.IsActive,

            // Fits Models (replaces the saved links)
            FitSubCategoryIds:
                [...(this.entity.FitSubCategoryIds ?? [])],

            Locations:
                (this.entity.Locations ?? [])
                    .map(
                        location =>
                        ({
                            WarehouseId:
                                Number(location.WarehouseId),

                            RackManagementId:
                                Number(location.RackManagementId),

                            ShelfNumber:
                                Number(location.ShelfNumber),

                            BinNumber:
                                Number(location.BinNumber) || 1
                        })
                    )
        };


        this.startProgress(
            'Updating Accessory',

            'Please wait while the accessory is being updated...'
        );


        this.withMinimumDuration(
            this.accessoriesService
                .update(
                    this.entityId,

                    model
                )
        )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.completeProgress(

                        'Accessory updated.',

                        () =>
                        {
                            this.setInitialFormState();


                            this.toast.success(
                                'Success',

                                'Accessory updated successfully.'
                            );


                            this.onBackToList();
                        }
                    );
                },


                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Update Accessory Error',

                        error
                    );


                    this.failProgress(
                        () =>
                        {
                            const message =
                                (error as any)?.error
                                ??
                                'Failed to update accessory.';


                            this.toast.error(
                                'Validation',

                                message
                            );
                        }
                    );
                }
            });
    }



    //===========================================================
    // Clear
    //===========================================================

    onClear():
        void
    {
        //=======================================================
        // Saving In Progress
        //=======================================================

        if
        (
            this.isSaving
        )
        {
            return;
        }


        //=======================================================
        // Edit Mode
        //=======================================================

        if
        (
            this.mode === 'edit'
        )
        {
            this.loadEntity();


            return;
        }


        //=======================================================
        // Add Mode
        //=======================================================

        this.initializeEntity();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Back To List
    //===========================================================

    onBackToList():
        void
    {
        if
        (
            !this.hasChanges
        )
        {
            void this.router.navigate
            (
                [
                    '/settings',

                    'product-settings',

                    'accessories',

                    'list'
                ]
            );


            return;
        }


        this.confirmDialog.open(

            'Cancel Changes',

            'Any unsaved changes will be lost. Do you want to leave this page?',


            () =>
            {
                void this.router.navigate
                (
                    [
                        '/settings',

                        'product-settings',

                        'accessories',

                        'list'
                    ]
                );
            },


            'Leave',

            'Stay',

            'primary'
        );
    }



    //===========================================================
    // Save Button Text
    //===========================================================

    get saveButtonText():
        string
    {
        return this.mode === 'edit'
            ? 'Update'
            : 'Save';
    }



    //===========================================================
    // View Mode
    //===========================================================

    get isViewMode():
        boolean
    {
        return this.mode === 'view';
    }



    //===========================================================
    // Edit Mode
    //===========================================================

    get isEditMode():
        boolean
    {
        return this.mode === 'edit';
    }



    //===========================================================
    // Add Mode
    //===========================================================

    get isAddMode():
        boolean
    {
        return this.mode === 'add';
    }



    //===========================================================
    // Close
    //===========================================================

    close():
        void
    {
        this.onBackToList();
    }



    //===========================================================
    // Refresh
    //===========================================================

    refresh():
        void
    {
        if
        (
            this.mode === 'edit'
            ||
            this.mode === 'view'
        )
        {
            this.loadEntity();

            return;
        }


        this.initializeEntity();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Value Changed
    //===========================================================

    onValueChange():
        void
    {
        this.checkForChanges();


        this.cdr.detectChanges();
    }

}