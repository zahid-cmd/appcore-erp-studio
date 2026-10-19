//===============================================================
// Accessories Form
//
// Layout (locked) :
//   1. Parent Information   : Category, Sub Category, Brand, Remarks
//   2. Accessory Information: Part Number (optional), Accessory Name,
//                             Unit, Product Code
//   3. Ledgers & Status     : INV / WIP / COGS Ledger Codes, Status
//   4. Stock & Storage      : Re-order Level, Red Level, Storage Locations
//
// Storage locations are added from the page toolbar (Add Location)
// in the shared Form Modal. No image on this form.
//
// A shelf holds ONE item (spare part OR accessory), once : shelves
// already linked to another item, or to another row of this
// accessory, are not offered in the Shelf list (the server checks
// it again on save).
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
    switchMap,
    forkJoin,
    of
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

    ACCESSORY_UNITS
}
from '../../../models/accessories.model';

import
{
    AccessoriesService
}
from '../../../services/accessories.service';

import
{
    SparePartsService
}
from '../../../services/spare-parts.service';

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
    shelfLabel
}
from '../../../models/rack-management.model';

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


    // Shelves held by spare parts (one item per shelf)
    private readonly sparePartsService =
        inject(SparePartsService);


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


    entityId:
        number =
        0;



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


    // Shelves held by OTHER items (spare parts / accessories) :
    // "rackId:shelfNo" → "SP-001-001-00001 - Brake Pad"
    private takenShelves:
        Map<string, string> =
        new Map<string, string>();


    locationLabels:
        {
            warehouse: string;
            rack: string;
            shelf: string;

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
        ShelfNumber:0
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



    //===========================================================
    // Entity
    //===========================================================

    entity:
        Accessories
    =
    {
        AccessoryId:0,

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

        Remarks:'',

        IsActive:true,

        Locations:[]
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
            id > 0
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
        number
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
                Number(
                    currentRoute.snapshot.paramMap.get('id')
                );


            if
            (
                id > 0
            )
            {
                return id;
            }


            currentRoute =
                currentRoute.parent;
        }


        return 0;
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

            Remarks:'',

            IsActive:true,

            Locations:[]
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


        this.loadTakenShelves();


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
    // One row per warehouse : Warehouse → Rack → Shelf.
    // Added / edited in the modal; warehouses already used by
    // another row are not offered. Inactive warehouses / racks
    // only show when already chosen.
    //===========================================================

    //-----------------------------------------------------------
    // Shelves already used by other items
    //
    // A shelf holds ONE item : a spare part OR an accessory. Read
    // from both lists (each item carries its locations). This
    // accessory's own shelves are not counted, so they stay
    // selectable while editing.
    //-----------------------------------------------------------

    private loadTakenShelves():
        void
    {
        forkJoin
        ({
            spareParts:
                this.sparePartsService
                    .getAll()
                    .pipe(
                        catchError(
                            () =>
                                of([] as any[])
                        )
                    ),

            accessories:
                this.accessoriesService
                    .getAll()
                    .pipe(
                        catchError(
                            () =>
                                of([] as any[])
                        )
                    )
        })
        .subscribe
        ({
            next:
            (
                result:
                    { spareParts: any[]; accessories: any[] }
            ): void =>
            {
                const taken =
                    new Map<string, string>();

                const add =
                    (
                        item: any,
                        name: string
                    ): void =>
                    {
                        for
                        (
                            const location
                            of item?.Locations ?? []
                        )
                        {
                            taken.set(
                                this.shelfKey(
                                    location.RackManagementId,
                                    location.ShelfNumber
                                ),

                                `${item.ProductCode} - ${name}`
                            );
                        }
                    };

                for
                (
                    const part
                    of result.spareParts ?? []
                )
                {
                    add(
                        part,
                        part?.PartName ?? ''
                    );
                }

                for
                (
                    const accessory
                    of result.accessories ?? []
                )
                {
                    // This accessory's own shelves don't block it
                    if
                    (
                        Number(accessory?.AccessoryId) === Number(this.entityId)
                    )
                    {
                        continue;
                    }

                    add(
                        accessory,
                        accessory?.AccessoryName ?? ''
                    );
                }

                this.takenShelves =
                    taken;

                this.buildDraftOptions();
            }
        });
    }


    private shelfKey
    (
        rackId:
            number | string,
        shelfNumber:
            number | string
    ):
        string
    {
        return `${Number(rackId)}:${Number(shelfNumber)}`;
    }


    // A shelf is blocked when another item holds it, or
    // when another row of THIS part already uses it (the row
    // being edited does not block itself)
    private isShelfBlocked
    (
        rackId:
            number | string,
        shelfNumber:
            number | string
    ):
        boolean
    {
        const key =
            this.shelfKey(
                rackId,
                shelfNumber
            );

        if
        (
            this.takenShelves.has(
                key
            )
        )
        {
            return true;
        }

        return (this.entity.Locations ?? [])
            .some(
                (row, i) =>
                    i !== this.editingLocationIndex
                    &&
                    this.shelfKey(
                        row.RackManagementId,
                        row.ShelfNumber
                    ) === key
            );
    }


    // Free shelves of a rack (1 … ShelfCount minus the blocked ones)
    private freeShelfCount
    (
        rack:
            any
    ):
        number
    {
        let free =
            0;

        for
        (
            let shelf = 1;
            shelf <= Number(rack?.ShelfCount ?? 0);
            shelf++
        )
        {
            if
            (
                !this.isShelfBlocked(
                    rack.RackManagementId,
                    shelf
                )
            )
            {
                free++;
            }
        }

        return free;
    }


    // Modal footer : the chosen rack has no free shelf
    get draftRackFull():
        boolean
    {
        return Number(this.locationDraft.RackManagementId) > 0
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
            Number(this.locationDraft.ShelfNumber) > 0;
    }


    // Modal preview of the picked place (labels of the chosen items)
    get draftPreview():
        { warehouse: string; rack: string; shelf: string }
    {
        const labelOf =
            (
                items: any[],
                value: number
            ):
                string =>
                String(
                    items.find(
                        item =>
                            Number(item?.value) === Number(value)
                    )?.label
                    ??
                    ''
                );

        return {
            warehouse:
                labelOf(
                    this.draftWarehouseItems,
                    this.locationDraft.WarehouseId
                ),

            rack:
                labelOf(
                    this.draftRackItems,
                    this.locationDraft.RackManagementId
                ),

            shelf:
                labelOf(
                    this.draftShelfItems,
                    this.locationDraft.ShelfNumber
                )
        };
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
            ShelfNumber:0
        };

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
                Number(row.ShelfNumber)
        };

        this.buildDraftOptions();

        this.locationModalOpened =
            true;

        this.cdr.detectChanges();
    }


    closeLocationModal():
        void
    {
        this.locationModalOpened =
            false;

        this.editingLocationIndex =
            -1;

        this.cdr.detectChanges();
    }


    onDraftWarehouseChange
    (
        value:
            any
    ):
        void
    {
        this.locationDraft.WarehouseId =
            Number(this.unwrapValue(value) ?? 0);

        // A new warehouse clears the rack and shelf
        this.locationDraft.RackManagementId =
            0;

        this.locationDraft.ShelfNumber =
            0;

        this.buildDraftOptions();
    }


    onDraftRackChange
    (
        value:
            any
    ):
        void
    {
        this.locationDraft.RackManagementId =
            Number(this.unwrapValue(value) ?? 0);

        this.locationDraft.ShelfNumber =
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
        this.locationDraft.ShelfNumber =
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
            this.toast.error(
                'Validation',

                'Select the warehouse, rack and shelf.'
            );

            return;
        }

        if
        (
            this.isShelfBlocked(
                this.locationDraft.RackManagementId,
                this.locationDraft.ShelfNumber
            )
        )
        {
            this.toast.error(
                'Validation',

                'This shelf is already used. Choose another shelf.'
            );

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
                Number(this.locationDraft.ShelfNumber)
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

        const warehouseRacks =
            this.racks
                .filter(
                    item =>
                        Number(item?.WarehouseId) === Number(draft.WarehouseId)
                        &&
                        (
                            Boolean(item?.IsActive)
                            ||
                            Number(item?.RackManagementId) === Number(draft.RackManagementId)
                        )
                );

        // A rack with no free shelf is still listed, marked (Full)
        this.draftRackItems =
            warehouseRacks
                .map(
                    item =>
                    ({
                        label:
                            this.freeShelfCount(item) > 0
                                ? `${item.RackCode} - ${item.RackName}`
                                : `${item.RackCode} - ${item.RackName} (Full)`,

                        value:
                            Number(item.RackManagementId)
                    })
                );

        const rack =
            warehouseRacks.find(
                item =>
                    Number(item?.RackManagementId) === Number(draft.RackManagementId)
            );

        // SLF-A-01 … SLF-A-nn, without the shelves held by other
        // accessories or by this part's other rows
        this.draftShelfItems =
            Array.from(
                { length: Number(rack?.ShelfCount ?? 0) },
                (_, i) =>
                    i + 1
            )
            .filter(
                shelf =>
                    !this.isShelfBlocked(
                        Number(draft.RackManagementId),
                        shelf
                    )
            )
            .map(
                shelf =>
                ({
                    label:
                        shelfLabel(
                            rack?.RackName,
                            shelf
                        ),

                    value:
                        shelf
                })
            );

        // A chosen shelf that was taken meanwhile is cleared
        if
        (
            Number(draft.ShelfNumber) > 0
            &&
            !this.draftShelfItems.some(
                item =>
                    Number(item.value) === Number(draft.ShelfNumber)
            )
        )
        {
            draft.ShelfNumber =
                0;
        }

        this.cdr.detectChanges();
    }


    //-----------------------------------------------------------
    // Row labels shown on the form (warehouse / rack / shelf)
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
                            );

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
                                    rack?.RackName,
                                    Number(row.ShelfNumber)
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

        this.loadDefaults();

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
                                        Number(location.ShelfNumber)
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

            Remarks:
                this.entity.Remarks?.trim() ?? '',

            IsActive:
                this.entity.IsActive,

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
                                Number(location.ShelfNumber)
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

            Remarks:
                this.entity.Remarks?.trim() ?? '',

            IsActive:
                this.entity.IsActive,

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
                                Number(location.ShelfNumber)
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