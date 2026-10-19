// PAGE-CLONED : Color Management -> Brand Management
//
// Brand Image : shared Image Hub. The picked file is previewed
// locally and uploaded after the brand is saved (POST
// {api}/{id}/image); removing it calls DELETE {api}/{id}/image.
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
    of,
    map
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
    ImageHubComponent
}
from '../../../../../../shared/components/controls/image-hub/image-hub';


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
    BrandManagement,

    CreateBrandManagement,

    UpdateBrandManagement,

    BrandManagementDefaults
}
from '../../../models/brand-management.model';

import
{
    BrandManagementService
}
from '../../../services/brand-management.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'brand-management-form',

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

        ImageHubComponent,


        //=======================================================
        // Utilities
        //=======================================================

        ToastComponent,

        ConfirmDialogComponent,

        ProgressDialogComponent
    ],


    templateUrl:'./brand-management-form.html',


    styleUrls:
    [
        './brand-management-form.css'
    ]
})


export class BrandManagementForm
implements OnInit, OnDestroy
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);


    private readonly router =
        inject(Router);


    private readonly brandManagementservice =
        inject(BrandManagementService);


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
        'Brand Management';


    entityName:
        string =
        'Brand';



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
    // Entity
    //===========================================================

    entity:
        BrandManagement
    =
    {
        BrandManagementId:0,

        BrandCode:'',

        BrandName:'',

        Remarks:'',

        Status:true,

        BrandImagePath:''
    };



    //===========================================================
    // Brand Image
    //
    // imageFile    : newly picked file, uploaded after save
    // imageRemoved : the saved image should be deleted on save
    // imagePreview : what the Image Hub shows (local preview of
    //                the picked file, or the saved image's URL)
    //===========================================================

    // Allowed image types and the size limit
    private readonly IMAGE_TYPES:
        string[] =
        ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    private readonly IMAGE_MAX_BYTES:
        number =
        2 * 1024 * 1024;

    imageFile:
        File | null =
        null;

    imageRemoved:
        boolean =
        false;

    imagePreview:
        string =
        '';

    private localPreviewUrl:
        string =
        '';

    // Reason of the last failed image upload / delete
    private imageError:
        string =
        '';



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

        this.releaseLocalPreview();


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
            BrandManagementId:0,

            BrandCode:'',

            BrandName:'',

            Remarks:'',

            Status:true,

            BrandImagePath:''
        };


        this.resetImageState(
            ''
        );


        this.setInitialFormState();


        this.loadDefaults();
    }



    //===========================================================
    // Load Defaults (next brand code for a new brand)
    //===========================================================

    private loadDefaults():
        void
    {
        this.brandManagementservice
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    defaults:
                        BrandManagementDefaults
                ): void =>
                {
                    if
                    (
                        this.mode !== 'add'
                    )
                    {
                        return;
                    }


                    this.entity.BrandCode =
                        defaults.Code ?? '';


                    // The generated code is not a user change
                    this.setInitialFormState();
                },


                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    // The server generates the code on save anyway
                    console.error(
                        'Load Brand Defaults Error',

                        error
                    );
                }
            });
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
        this.brandManagementservice
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
                        BrandManagementId:
                            Number(response?.BrandManagementId ?? response?.brandManagementId ?? 0),

                        BrandCode:
                            response?.BrandCode ?? response?.brandCode ?? '',

                        BrandName:
                            response?.BrandName ?? response?.brandName ?? '',

                        Remarks:
                            response?.Remarks ?? response?.remarks ?? '',

                        Status:
                            Boolean(response?.Status ?? response?.status ?? true),

                        BrandImagePath:
                            response?.BrandImagePath ?? response?.brandImagePath ?? ''
                    };


                    this.resetImageState(
                        this.entity.BrandImagePath ?? ''
                    );


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
                        'Load Brand Error',

                        error
                    );


                    this.toast.error(
                        'Error',

                        'Failed to load brand.'
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
            this.originalEntity
            ||
            this.imageFile !== null
            ||
            this.imageRemoved;
    }



    //===========================================================
    // Brand Image : Picked / Removed (Image Hub)
    //===========================================================

    onImageChange
    (
        file:
            File | null
    ):
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }


        //=======================================================
        // Removed
        //=======================================================

        if
        (
            !file
        )
        {
            this.releaseLocalPreview();

            this.imageFile =
                null;

            // Only a saved image needs deleting on the server
            this.imageRemoved =
                !!this.entity.BrandImagePath;

            this.imagePreview =
                '';

            this.onValueChange();

            return;
        }


        //=======================================================
        // Validate
        //=======================================================

        if
        (
            !this.IMAGE_TYPES.includes(
                file.type
            )
        )
        {
            this.toast.error(
                'Validation',

                'Brand Image must be a JPG, PNG, WEBP or GIF file.'
            );

            this.cdr.detectChanges();

            return;
        }

        if
        (
            file.size >
            this.IMAGE_MAX_BYTES
        )
        {
            this.toast.error(
                'Validation',

                'Brand Image cannot be larger than 2 MB.'
            );

            this.cdr.detectChanges();

            return;
        }


        //=======================================================
        // Preview locally; uploaded after save
        //=======================================================

        this.releaseLocalPreview();

        this.localPreviewUrl =
            URL.createObjectURL(
                file
            );

        this.imageFile =
            file;

        this.imageRemoved =
            false;

        this.imagePreview =
            this.localPreviewUrl;

        this.onValueChange();
    }



    //===========================================================
    // Brand Image : Reset (new / loaded record)
    //===========================================================

    private resetImageState
    (
        savedPath:
            string
    ):
        void
    {
        this.releaseLocalPreview();

        this.imageFile =
            null;

        this.imageRemoved =
            false;

        this.imagePreview =
            this.brandManagementservice.getImageUrl(
                savedPath
            );
    }



    //===========================================================
    // Brand Image : Free the local preview URL
    //===========================================================

    private releaseLocalPreview():
        void
    {
        if
        (
            this.localPreviewUrl
        )
        {
            URL.revokeObjectURL(
                this.localPreviewUrl
            );

            this.localPreviewUrl =
                '';
        }
    }



    //===========================================================
    // Brand Image : Save After The Brand Is Saved
    //
    // New file → upload. Removed → delete. Otherwise nothing.
    //
    // Emits true when the image step worked (or had nothing to
    // do), false when it failed. A failed image never fails the
    // brand save itself : the brand is already stored, so a
    // second Save would only hit "code already exists".
    //===========================================================

    private saveImage
    (
        brandId:
            number
    ):
        Observable<boolean>
    {
        return this.runImageStep(
            brandId
        )
            .pipe(
                map(
                    (): boolean =>
                        true
                ),

                catchError(
                    error =>
                    {
                        console.error(
                            'Brand Image Error',

                            error
                        );

                        // Keep the real reason for the message
                        this.imageError =
                            this.describeImageError(
                                error
                            );

                        return of(
                            false
                        );
                    }
                )
            );
    }


    private runImageStep
    (
        brandId:
            number
    ):
        Observable<void>
    {
        if
        (
            this.imageFile
            &&
            brandId > 0
        )
        {
            return this.brandManagementservice
                .uploadImage(
                    brandId,
                    this.imageFile
                )
                .pipe(
                    map(
                        (): void =>
                            undefined
                    )
                );
        }

        if
        (
            this.imageRemoved
            &&
            brandId > 0
        )
        {
            return this.brandManagementservice
                .deleteImage(
                    brandId
                );
        }

        return of(
            undefined
        );
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
            !this.entity.BrandCode?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Brand Code is required.'
            );

            return;
        }


        if
        (
            !this.entity.BrandName?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Brand Name is required.'
            );

            return;
        }


        // Remarks is optional (no check)



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
            CreateBrandManagement =
        {

            BrandCode:
                this.entity.BrandCode?.trim() ?? '',

            BrandName:
                this.entity.BrandName?.trim() ?? '',

            Remarks:
                this.entity.Remarks?.trim() ?? '',

            Status:
                this.entity.Status
        };


        this.startProgress(
            'Saving Brand',

            'Please wait while the brand is being saved...'
        );


        this.withMinimumDuration(
            this.brandManagementservice
                .create(
                    model
                )
                .pipe(
                    // Then upload the picked image to the new brand
                    switchMap(
                        (id: number) =>
                            this.saveImage(
                                Number(id)
                            )
                    )
                )
        )
            .subscribe
            ({
                next:
                (
                    imageSaved:
                        boolean
                ): void =>
                {
                    this.completeProgress(

                        'Brand saved.',

                        () =>
                        {
                            this.resetImageState(
                                ''
                            );

                            this.setInitialFormState();


                            // One message : success, or saved-without-image
                            this.notifySaved(
                                'created',
                                imageSaved
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
                        'Create Brand Error',

                        error
                    );


                    this.failProgress(
                        () =>
                        {
                            const message =
                                (error as any)?.error
                                ??
                                'Failed to create brand.';


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
            UpdateBrandManagement =
        {
            BrandManagementId:
                this.entity.BrandManagementId,

            BrandCode:
                this.entity.BrandCode?.trim() ?? '',

            BrandName:
                this.entity.BrandName?.trim() ?? '',

            Remarks:
                this.entity.Remarks?.trim() ?? '',

            Status:
                this.entity.Status
        };


        this.startProgress(
            'Updating Brand',

            'Please wait while the brand is being updated...'
        );


        this.withMinimumDuration(
            this.brandManagementservice
                .update(
                    model
                )
                .pipe(
                    // Then upload / delete the image
                    switchMap(
                        () =>
                            this.saveImage(
                                this.entity.BrandManagementId
                            )
                    )
                )
        )
            .subscribe
            ({
                next:
                (
                    imageSaved:
                        boolean
                ): void =>
                {
                    this.completeProgress(

                        'Brand updated.',

                        () =>
                        {
                            this.resetImageState(
                                ''
                            );

                            this.setInitialFormState();


                            // One message : success, or saved-without-image
                            this.notifySaved(
                                'updated',
                                imageSaved
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
                        'Update Brand Error',

                        error
                    );


                    this.failProgress(
                        () =>
                        {
                            const message =
                                (error as any)?.error
                                ??
                                'Failed to update brand.';


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
    // Saved Message (one toast only)
    //
    // Image fine      → "Brand created successfully."
    // Image failed    → one error explaining the brand is saved
    //                   but its image is not.
    //===========================================================

    private notifySaved
    (
        verb:
            'created' | 'updated',
        imageSaved:
            boolean
    ):
        void
    {
        if
        (
            imageSaved
        )
        {
            this.toast.success(
                'Success',

                `Brand ${verb} successfully.`
            );

            return;
        }

        this.toast.error(
            'Brand Image Not Saved',

            `The brand was ${verb}, but its image could not be saved. ${this.imageError}`
        );
    }



    //===========================================================
    // Image Error → readable reason (status + server message)
    //===========================================================

    private describeImageError
    (
        error:
            any
    ):
        string
    {
        const status =
            Number(error?.status ?? 0);

        let serverText =
            typeof error?.error === 'string'
                ? error.error
                : (error?.error?.title ?? error?.error?.message ?? '');

        serverText =
            String(serverText ?? '').trim();

        switch
        (
            status
        )
        {
            case 0:
                return 'The API could not be reached (network / CORS).';

            case 404:
                return 'Upload endpoint not found (404): the API is still running the old Brand Management controller. Rebuild and restart the API.';

            case 413:
                return 'The file is too large for the server (413).';

            case 415:
                return 'The server rejected the upload format (415). Check that no HTTP interceptor forces Content-Type: application/json on uploads.';

            default:
                return serverText
                    ? `${serverText} (${status})`
                    : `Server error ${status}. See the API console for details.`;
        }
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

                    'brand-management',

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

                        'brand-management',

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