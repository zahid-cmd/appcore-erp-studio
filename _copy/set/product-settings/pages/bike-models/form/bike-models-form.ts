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
    BikeModels,
    CreateBikeModels,
    UpdateBikeModels,
    BikeModelsDefaults
}
from '../../../models/bike-models.model';

import
{
    BikeModelsService
}
from '../../../services/bike-models.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'bike-models-form',

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


        //=======================================================
        // Utilities
        //=======================================================

        ToastComponent,

        ConfirmDialogComponent,

        ProgressDialogComponent
    ],


    templateUrl:'./bike-models-form.html',


    styleUrls:
    [
        './bike-models-form.css'
    ]
})


export class BikeModelsForm
implements OnInit, OnDestroy
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);


    private readonly router =
        inject(Router);


    private readonly bikeModelsService =
        inject(BikeModelsService);


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
        string =
        '';



    //===========================================================
    // Page Header
    //===========================================================

    pageTitle:
        string =
        'Bike Models';


    entityName:
        string =
        'Bike Model';



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
    // Yes / No (website switches)
    //===========================================================

    yesNoItems:
        any[]
    =
    [
        {
            label:'Yes',
            value:true
        },
        {
            label:'No',
            value:false
        }
    ];


    //===========================================================
    // Brands and Bike Types (from Defaults)
    //===========================================================

    brandItems:
        any[] =
        [];

    bikeTypeItems:
        any[] =
        [];

    private defaults:
        BikeModelsDefaults | null =
        null;


    //===========================================================
    // Entity
    //===========================================================

    entity:
        BikeModels
    =
    {
            BikeModelId:0,

            ModelCode:'',

            BrandManagementId:null,

            ModelName:'',

            BikeType:'',

            ShowOnWebsite:false,

            IsFeatured:false,

            Tagline:'',

            Description:'',

            DisplayOrder:0,

            Remarks:'',

            Status:true
        };


    // Display Order as typed (digits only)
    displayOrderText:
        string =
        '0';



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
            !!id
        )
        {
            this.entityId =
                id;

            this.loadEntity();

            this.loadDefaults();

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
            const id =
                (currentRoute.snapshot.paramMap.get('id') ?? '').trim();


            if
            (
                !!id
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
            BikeModelId:0,

            ModelCode:'',

            BrandManagementId:null,

            ModelName:'',

            BikeType:'',

            ShowOnWebsite:false,

            IsFeatured:false,

            Tagline:'',

            Description:'',

            DisplayOrder:0,

            Remarks:'',

            Status:true
        };

        this.displayOrderText =
            '0';


        this.setInitialFormState();


        this.loadDefaults();
    }



    //===========================================================
    // Load Defaults (next model code, brands, bike types)
    //===========================================================

    private loadDefaults():
        void
    {
        this.bikeModelsService
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    defaults:
                        BikeModelsDefaults
                ): void =>
                {
                    this.defaults =
                        defaults;

                    this.bikeTypeItems =
                        (defaults.BikeTypes ?? [])
                            .map(
                                x =>
                                ({
                                    label:x,
                                    value:x
                                })
                            );

                    this.buildBrandItems();

                    if
                    (
                        this.mode === 'add'
                    )
                    {
                        this.entity.ModelCode =
                            defaults.Code ?? '';

                        // Same type as the last saved model (editable)
                        if
                        (
                            !this.entity.BikeType
                            &&
                            this.bikeTypeItems.some(x => x.value === defaults.LastBikeType)
                        )
                        {
                            this.entity.BikeType =
                                defaults.LastBikeType;
                        }

                        // The generated code is not a user change
                        this.setInitialFormState();

                        return;
                    }

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Bike Model Defaults Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Failed to load the brands and bike types.'
                    );
                }
            });
    }


    //===========================================================
    // Brand items : active brands, plus the record's own brand
    // when it has become inactive
    //===========================================================

    private buildBrandItems():
        void
    {
        const brands =
            this.defaults?.Brands ?? [];

        const items =
            brands.map(
                x =>
                ({
                    label:x.BrandName,
                    value:x.BrandManagementId
                })
            );

        const ownId =
            Number(this.entity.BrandManagementId ?? 0);

        if
        (
            ownId > 0
            &&
            !items.some(x => x.value === ownId)
        )
        {
            items.push(
                {
                    label:`${this.entity.BrandName || 'Brand'} (Inactive)`,
                    value:ownId
                }
            );
        }

        this.brandItems =
            items;
    }


    //===========================================================
    // Display Order : digits only
    //===========================================================

    onDisplayOrderChange
    (
        value:
            string | number
    ):
        void
    {
        const digits =
            String(value ?? '')
                .replace(/\D/g, '')
                .slice(0, 4);

        this.displayOrderText =
            digits;

        this.entity.DisplayOrder =
            digits ? Number(digits) : 0;

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
        this.bikeModelsService
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
                    {
                        BikeModelId:
                            Number(response?.BikeModelId ?? response?.bikeModelId ?? 0),

                        ModelCode:
                            response?.ModelCode ?? response?.modelCode ?? '',

                        BrandManagementId:
                            Number(response?.BrandManagementId ?? response?.brandManagementId ?? 0) || null,

                        BrandCode:
                            response?.BrandCode ?? response?.brandCode ?? '',

                        BrandName:
                            response?.BrandName ?? response?.brandName ?? '',

                        ModelName:
                            response?.ModelName ?? response?.modelName ?? '',

                        BikeType:
                            response?.BikeType ?? response?.bikeType ?? '',

                        ShowOnWebsite:
                            Boolean(response?.ShowOnWebsite ?? response?.showOnWebsite ?? false),

                        IsFeatured:
                            Boolean(response?.IsFeatured ?? response?.isFeatured ?? false),

                        Tagline:
                            response?.Tagline ?? response?.tagline ?? '',

                        Description:
                            response?.Description ?? response?.description ?? '',

                        DisplayOrder:
                            Number(response?.DisplayOrder ?? response?.displayOrder ?? 0),

                        Remarks:
                            response?.Remarks ?? response?.remarks ?? '',

                        Status:
                            Boolean(response?.Status ?? response?.status ?? true)
                    };


                    this.displayOrderText =
                        String(this.entity.DisplayOrder ?? 0);

                    this.buildBrandItems();

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
                        'Load Bike Model Error',

                        error
                    );


                    this.toast.error(
                        'Error',

                        'Failed to load the bike model.'
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

        if
        (
            !(Number(this.entity.BrandManagementId) > 0)
        )
        {
            this.toast.error(
                'Validation',
                'Brand is required.'
            );

            return;
        }

        if
        (
            !this.entity.ModelName?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Model Name is required.'
            );

            return;
        }

        if
        (
            !this.entity.BikeType
        )
        {
            this.toast.error(
                'Validation',
                'Bike Type is required.'
            );

            return;
        }


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
            CreateBikeModels =
        {
            BrandManagementId:
                Number(this.entity.BrandManagementId ?? 0),

            ModelName:
                this.entity.ModelName?.trim() ?? '',

            BikeType:
                this.entity.BikeType ?? '',

            ShowOnWebsite:
                this.entity.ShowOnWebsite,

            IsFeatured:
                this.entity.IsFeatured,

            Tagline:
                this.entity.Tagline?.trim() ?? '',

            Description:
                this.entity.Description?.trim() ?? '',

            DisplayOrder:
                Number(this.entity.DisplayOrder ?? 0),

            Remarks:
                this.entity.Remarks?.trim() ?? '',

            Status:
                this.entity.Status
        };


        this.startProgress(
            'Saving Bike Model',

            'Please wait while the bike model is being saved...'
        );


        this.withMinimumDuration(
            this.bikeModelsService.create(
                model
            )
        )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.completeProgress(

                        'Bike model saved.',

                        () =>
                        {
                            this.setInitialFormState();


                            this.toast.success(
                                'Success',

                                'Bike model created successfully.'
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
                        'Create Bike Model Error',

                        error
                    );


                    this.failProgress(
                        () =>
                        {
                            const message =
                                (error as any)?.error
                                ??
                                'Failed to create the bike model.';


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
            UpdateBikeModels =
        {
            BikeModelId:
                this.entity.BikeModelId,

            BrandManagementId:
                Number(this.entity.BrandManagementId ?? 0),

            ModelName:
                this.entity.ModelName?.trim() ?? '',

            BikeType:
                this.entity.BikeType ?? '',

            ShowOnWebsite:
                this.entity.ShowOnWebsite,

            IsFeatured:
                this.entity.IsFeatured,

            Tagline:
                this.entity.Tagline?.trim() ?? '',

            Description:
                this.entity.Description?.trim() ?? '',

            DisplayOrder:
                Number(this.entity.DisplayOrder ?? 0),

            Remarks:
                this.entity.Remarks?.trim() ?? '',

            Status:
                this.entity.Status
        };


        this.startProgress(
            'Updating Bike Model',

            'Please wait while the bike model is being updated...'
        );


        this.withMinimumDuration(
            this.bikeModelsService.update(
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

                        'Bike model updated.',

                        () =>
                        {
                            this.setInitialFormState();


                            this.toast.success(
                                'Success',

                                'Bike model updated successfully.'
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
                        'Update Bike Model Error',

                        error
                    );


                    this.failProgress(
                        () =>
                        {
                            const message =
                                (error as any)?.error
                                ??
                                'Failed to update the bike model.';


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

                    'bike-models',

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

                        'bike-models',

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