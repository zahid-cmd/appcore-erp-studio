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
    HttpErrorResponse
}
from '@angular/common/http';

import
{
    Observable,
    defer,
    timer,
    throwError
}
from 'rxjs';

import
{
    catchError,
    delayWhen,
    switchMap
}
from 'rxjs/operators';

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
    RackManagement,
    CreateRackManagement,
    UpdateRackManagement,
    RackManagementDefaults,
    RACK_TYPES,
    RACK_MAX_SHELVES,
    shelfLabel
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
// Component
//===============================================================

@Component(
{
    selector:'rackManagement-form',

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

        //=======================================================
        // Utilities
        //=======================================================

        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./rack-management-form.html',

    styleUrls:
    [
        './rack-management-form.css'
    ]
})

//===============================================================
// Rack Management Form
//
// One rack in one warehouse with a number of shelves. Rack Code
// R-nnn is numbered per warehouse by the server (preview here).
// Warehouse is locked after saving.
//===============================================================

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


    // WarehouseId → "Spare Parts, Accessories"
    private warehouseLines:
        Map<number, string> =
        new Map<number, string>();

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly progressDialog =
        inject(ProgressDialogService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    //===========================================================
    // Progress Configuration
    //===========================================================

    private readonly minimumSaveDurationMs:
        number =
        5000;

    private readonly progressCeiling:
        number =
        90;

    private readonly progressEaseFactor:
        number =
        0.05;

    private readonly progressIntervalMs:
        number =
        100;

    private readonly progressCompleteHoldMs:
        number =
        600;

    //===========================================================
    // Progress State
    //===========================================================

    private progressTimer:
        ReturnType<typeof setInterval> | null =
        null;

    private progressValue:
        number =
        0;

    isSaving:
        boolean =
        false;

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
        'Rack Management';

    entityName:
        string =
        'Rack';

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
    // Lookups
    //
    // All active warehouses of every branch are offered for a new
    // rack. In edit / view the rack's own (maybe inactive)
    // warehouse is kept so it still shows. The branch is taken
    // from the warehouse by the server.
    //===========================================================

    warehouseItems:
        any[]
        =
        [];

    rackTypeItems:
        any[]
        =
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

    private warehouses:
        any[]
        =
        [];

    // "<Warehouse Code>-R-001" preview
    fullRackCode:
        string
        =
        '';

    // Shelf count as typed, and the SLF-A-01 … preview
    shelfCountText:
        string
        =
        '1';

    shelfPreview:
        string[]
        =
        [];

    readonly maxShelves:
        number
        =
        RACK_MAX_SHELVES;

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
    // Entity
    //===========================================================

    entity:
        RackManagement
        =
        this.createEmptyEntity();

    //===========================================================
    // Form State
    //===========================================================

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
    // Create Empty Entity
    //===========================================================

    private createEmptyEntity():
        RackManagement
    {
        return {
            RackManagementId:0,
            BranchId:0,
            WarehouseId:0,
            RackCode:'',
            RackName:'',
            ShelfCount:1,
            ZoneAisle:'',
            RackType:'',
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

        //=======================================================
        // Resolve Mode
        //=======================================================

        if
        (
            url.includes('/view/')
        )
        {
            this.mode =
                'view';
        }
        else if
        (
            url.includes('/edit/')
        )
        {
            this.mode =
                'edit';
        }
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
            this.createEmptyEntity();

        this.fullRackCode =
            '';

        this.syncShelves();

        this.buildWarehouseItems();

        this.setInitialFormState();
    }

    //===========================================================
    // Load Defaults (next rack code for the chosen warehouse)
    //===========================================================

    private loadDefaults():
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
            Number(this.entity.WarehouseId ?? 0);

        if
        (
            !(warehouseId > 0)
        )
        {
            this.applyDefaults(
                null
            );

            return;
        }

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
                        !this.isAddMode
                        ||
                        Number(this.entity.WarehouseId) !== warehouseId
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

                    this.applyDefaults(
                        null
                    );

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to generate the Rack Code.'
                        )
                    );
                }
            });
    }

    private applyDefaults
    (
        defaults:
            RackManagementDefaults | null
    ):
        void
    {
        this.entity.RackCode =
            defaults?.Code ?? '';

        this.fullRackCode =
            defaults?.FullCode ?? '';

        // "Rack A", "Rack B" … (the server assigns it on save)
        this.entity.RackName =
            defaults?.Name ?? '';

        this.buildShelfPreview();

        this.checkForChanges();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Load Lookups (warehouses)
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

                    this.toast.error(
                        'Error',
                        'Failed to load warehouses.'
                    );
                }
            });
    }

    //===========================================================
    // Build Dropdown Items
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

        this.updateFullRackCode();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Warehouse Change (add mode only; locked afterwards)
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

    onWarehouseChange
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
            this.entity.WarehouseId =
                Number(this.unwrapValue(value) ?? 0);
        }

        this.loadDefaults();

        this.onValueChange();
    }

    // Edit / view : "<Warehouse Code>-<Rack Code>"
    private updateFullRackCode():
        void
    {
        if
        (
            this.isAddMode
            ||
            !this.entity.RackCode
        )
        {
            return;
        }

        const warehouse =
            this.warehouses.find(
                item =>
                    Number(item?.WarehouseId)
                    ===
                    Number(this.entity.WarehouseId)
            );

        this.fullRackCode =
            warehouse?.WarehouseCode
                ? `${warehouse.WarehouseCode}-${this.entity.RackCode}`
                : this.entity.RackCode;
    }

    //===========================================================
    // Shelves (whole number 1 … max) and the SLF-A-01 … preview
    //===========================================================

    private syncShelves():
        void
    {
        this.shelfCountText =
            String(this.entity.ShelfCount ?? 1);

        this.buildShelfPreview();
    }

    private buildShelfPreview():
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

        this.shelfPreview =
            Array.from(
                { length: count },
                (_, index) =>
                    shelfLabel(
                        this.entity.RackName,
                        index + 1
                    )
            );
    }

    onShelfCountChange
    (
        value:
            string | number
    ):
        void
    {
        const digits =
            String(value ?? '')
                .replace(/[^0-9]/g, '')
                .replace(/^0+(?=\d)/, '')
                .slice(0, 2);

        this.shelfCountText =
            digits;

        this.entity.ShelfCount =
            digits
                ? Number(digits)
                : 0;

        this.buildShelfPreview();

        this.onValueChange();
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
        this.rackManagementService
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
                        this.rackManagementService.normalize(
                            response
                        );

                    this.fullRackCode =
                        this.entity.FullRackCode
                        ||
                        this.entity.RackCode;

                    this.syncShelves();

                    this.buildWarehouseItems();

                    this.setInitialFormState();
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

                    this.toast.error(
                        'Error',
                        'Failed to load Rack.'
                    );

                    this.hasChanges =
                        false;

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
    // Save
    //===========================================================

    onSave():
        void
    {
        //=======================================================
        // Guards
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
                    Number(this.entity.WarehouseId) > 0,

                message:
                    'Warehouse is required.'
            },

            {
                ok:
                    !!this.entity.RackCode?.trim(),

                message:
                    'Rack Code could not be generated. Select the Warehouse again.'
            },

            {
                ok:
                    !!this.entity.RackName?.trim(),

                message:
                    'Rack Name could not be generated. Select the Warehouse again.'
            },

            {
                ok:
                    this.entity.ShelfCount >= 1
                    &&
                    this.entity.ShelfCount <= this.maxShelves,

                message:
                    `Number of Shelves must be between 1 and ${this.maxShelves}.`
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

        //=======================================================
        // Add / Update
        //=======================================================

        if
        (
            this.isAddMode
        )
        {
            this.saveCreate();

            return;
        }

        this.saveUpdate();
    }

    //===========================================================
    // Build Payload
    //===========================================================

    private buildPayload():
        CreateRackManagement
    {
        return {
            WarehouseId:
                Number(this.entity.WarehouseId),

            RackName:
                this.entity.RackName?.trim() ?? '',

            ShelfCount:
                Number(this.entity.ShelfCount ?? 0),

            ZoneAisle:
                this.entity.ZoneAisle?.trim() ?? '',

            RackType:
                this.entity.RackType ?? '',

            Remarks:
                this.entity.Remarks?.trim() ?? '',

            IsActive:
                this.entity.IsActive
        };
    }

    //===========================================================
    // Create
    //===========================================================

    private saveCreate():
        void
    {
        const model:
            CreateRackManagement =
            this.buildPayload();

        this.isSaving =
            true;

        this.startProgress(
            'Saving Rack',
            'Please wait while the rack is being saved...'
        );

        this.withMinimumDuration(
            this.rackManagementService.create(
                model
            ),
            this.minimumSaveDurationMs
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'Rack saved successfully.',
                    ():
                        void =>
                    {
                        this.isSaving =
                            false;

                        this.originalEntity =
                            JSON.stringify(
                                this.entity
                            );

                        this.hasChanges =
                            false;

                        this.toast.success(
                            'Success',
                            'Rack created successfully.'
                        );

                        this.onBackToList();
                    }
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
                    'Create Rack Error',
                    error
                );

                this.failProgress(
                    ():
                        void =>
                    {
                        this.isSaving =
                            false;

                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                'Failed to create Rack.'
                            )
                        );

                        this.cdr.detectChanges();
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
            UpdateRackManagement =
        {
            RackManagementId:
                this.entity.RackManagementId,

            ...this.buildPayload()
        };

        this.isSaving =
            true;

        this.startProgress(
            'Updating Rack',
            'Please wait while the rack is being updated...'
        );

        this.withMinimumDuration(
            this.rackManagementService.update(
                model
            ),
            this.minimumSaveDurationMs
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'Rack updated successfully.',
                    ():
                        void =>
                    {
                        this.isSaving =
                            false;

                        this.originalEntity =
                            JSON.stringify(
                                this.entity
                            );

                        this.hasChanges =
                            false;

                        this.toast.success(
                            'Success',
                            'Rack updated successfully.'
                        );

                        this.onBackToList();
                    }
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
                    'Update Rack Error',
                    error
                );

                this.failProgress(
                    ():
                        void =>
                    {
                        this.isSaving =
                            false;

                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                'Failed to update Rack.'
                            )
                        );

                        this.cdr.detectChanges();
                    }
                );
            }
        });
    }

    //===========================================================
    // Progress : Start (animated easing toward ceiling)
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
        this.clearProgressTimer();

        this.progressValue =
            0;

        this.progressDialog.show(
            title,
            message,
            false
        );

        this.progressDialog.update(
            0,
            message
        );

        this.progressTimer =
            setInterval
            (
                ():
                    void =>
                {
                    const step =
                        Math.max(
                            0.4,
                            (
                                this.progressCeiling -
                                this.progressValue
                            )
                            *
                            this.progressEaseFactor
                        );

                    this.progressValue =
                        Math.min(
                            this.progressCeiling,
                            this.progressValue + step
                        );

                    this.progressDialog.update(
                        Math.round(
                            this.progressValue
                        )
                    );
                },
                this.progressIntervalMs
            );
    }

    //===========================================================
    // Progress : Complete
    //===========================================================

    private completeProgress
    (
        message:
            string,
        callback:
            () => void
    ):
        void
    {
        this.clearProgressTimer();

        this.progressValue =
            100;

        this.progressDialog.update(
            100,
            message
        );

        setTimeout
        (
            ():
                void =>
            {
                this.progressDialog.close();

                callback();
            },
            this.progressCompleteHoldMs
        );
    }

    //===========================================================
    // Progress : Fail
    //===========================================================

    private failProgress
    (
        callback:
            () => void
    ):
        void
    {
        this.clearProgressTimer();

        this.progressDialog.close();

        callback();
    }

    //===========================================================
    // Progress : Clear Timer
    //===========================================================

    private clearProgressTimer():
        void
    {
        if
        (
            this.progressTimer !== null
        )
        {
            clearInterval(
                this.progressTimer
            );

            this.progressTimer =
                null;
        }
    }

    //===========================================================
    // Minimum Duration Wrapper
    //===========================================================

    private withMinimumDuration<T>
    (
        source:
            Observable<T>,
        minimumMs:
            number
    ):
        Observable<T>
    {
        return defer
        (
            ():
                Observable<T> =>
            {
                const startedAt =
                    Date.now();

                const remaining =
                    ():
                        number =>
                        Math.max(
                            0,
                            minimumMs -
                            (
                                Date.now() -
                                startedAt
                            )
                        );

                return source.pipe
                (
                    delayWhen
                    (
                        () =>
                            timer(
                                remaining()
                            )
                    ),

                    catchError
                    (
                        error =>
                            timer(
                                remaining()
                            )
                            .pipe
                            (
                                switchMap
                                (
                                    () =>
                                        throwError(
                                            () => error
                                        )
                                )
                            )
                    )
                );
            }
        );
    }

    //===========================================================
    // Extract Error Message
    //===========================================================

    private extractErrorMessage
    (
        error:
            unknown,
        fallback:
            string
    ):
        string
    {
        if
        (
            error instanceof HttpErrorResponse
        )
        {
            if
            (
                typeof error.error === 'string'
                &&
                error.error.trim()
            )
            {
                return error.error;
            }

            if
            (
                error.error?.message
            )
            {
                return error.error.message;
            }

            if
            (
                error.error?.title
            )
            {
                return error.error.title;
            }
        }

        return fallback;
    }

    //===========================================================
    // Clear
    //===========================================================

    onClear():
        void
    {
        if
        (
            this.isSaving
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

    onBackToList():
        void
    {
        if
        (
            this.isSaving
        )
        {
            return;
        }

        const listRoute =
        [
            '/store-management',
            'store-setup',
            'rack-management',
            'list'
        ];

        if
        (
            !this.hasChanges
        )
        {
            void this.router.navigate(
                listRoute
            );

            return;
        }

        this.confirmDialog.open(
            'Cancel Changes',
            'Any unsaved changes will be lost. Do you want to leave this page?',
            () =>
            {
                void this.router.navigate(
                    listRoute
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
        return this.isEditMode
            ? 'Update'
            : 'Save';
    }

    //===========================================================
    // Mode Helpers
    //===========================================================

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
            this.isSaving
        )
        {
            return;
        }

        if
        (
            this.isEditMode
            ||
            this.isViewMode
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