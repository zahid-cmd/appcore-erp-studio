// PAGE-CLONED : Color Management -> Motor Bike Management
//
// Motor Bike Image : shared Image Hub. The picked file is previewed
// locally and uploaded after the motor bike is saved (POST
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
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

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
    MotorBikes,

    CreateMotorBikes,

    UpdateMotorBikes,

    MotorBikesDefaults
}
from '../../../models/motor-bikes.model';

import
{
    MotorBikesService
}
from '../../../services/motor-bikes.service';

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
    ColorManagementService
}
from '../../../services/color-management.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'motorBikes-form',

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

        ImageHubComponent,


        //=======================================================
        // Utilities
        //=======================================================

        ToastComponent,

        ConfirmDialogComponent,

        ProgressDialogComponent
    ],


    templateUrl:'./motor-bikes-form.html',


    styleUrls:
    [
        './motor-bikes-form.css'
    ]
})


export class MotorBikesForm
implements OnInit, OnDestroy
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);


    private readonly router =
        inject(Router);


    private readonly motorBikesService =
        inject(MotorBikesService);


    private readonly productCategoryService =
        inject(ProductCategoryService);


    private readonly productSubCategoryService =
        inject(ProductSubCategoryService);


    private readonly colorService =
        inject(ColorManagementService);


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
        'Motor Bikes';


    entityName:
        string =
        'Motor Bike';



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
    // Categories : active, Category Type = Motor Bikes
    // Sub Cats   : active, under the chosen category
    // Colors     : active
    // In edit / view the record's own (maybe inactive) choices
    // are kept so they still show.
    //===========================================================

    categoryItems:
        any[] =
    [];


    subCategoryItems:
        any[] =
    [];


    colorItems:
        any[] =
    [];


    private categories:
        any[] =
    [];


    private subCategories:
        any[] =
    [];


    private colors:
        any[] =
    [];


    // Motor Bike of the chosen category (display only)
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
        MotorBikes
    =
    {
        MotorBikeId:0,

        ProductCategoryId:0,

        ProductSubCategoryId:0,

        ColorManagementId:0,

        ProductCode:'',

        ProductName:'',

        InventoryLedgerCode:'',

        WipLedgerCode:'',

        CogsLedgerCode:'',

        ReorderLevel:0,

        RedLevel:0,

        ImagePath:'',

        Remarks:'',

        IsActive:true
    };



    //===========================================================
    // Motor Bike Image
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
            MotorBikeId:0,

            ProductCategoryId:0,

            ProductSubCategoryId:0,

            ColorManagementId:0,

            ProductCode:'',

            ProductName:'',

            InventoryLedgerCode:'',

            WipLedgerCode:'',

            CogsLedgerCode:'',

            ReorderLevel:0,

            RedLevel:0,

            ImagePath:'',

            Remarks:'',

            IsActive:true
        };


        this.brandName =
            '';


        this.syncLevelTexts();


        this.buildSubCategoryItems();


        this.resetImageState(
            ''
        );


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

        this.motorBikesService
            .getDefaults(
                subCategoryId
            )
            .subscribe
            ({
                next:
                (
                    defaults:
                        MotorBikesDefaults
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
                        'Load Motor Bike Defaults Error',

                        error
                    );


                    this.applyDefaults(
                        null
                    );


                    this.toast.error(
                        'Error',

                        this.extractMessage(
                            error,
                            'Failed to generate Motor Bike codes.'
                        )
                    );
                }
            });
    }


    private applyDefaults
    (
        defaults:
            MotorBikesDefaults | null
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
    // Load Lookups (categories, sub categories, colors)
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
                                    'motor bikes'
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


        this.colorService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        any[]
                ): void =>
                {
                    this.colors =
                        (response ?? [])
                            .slice()
                            .sort(
                                (a, b) =>
                                    String(a?.ColorName ?? '')
                                        .localeCompare(
                                            String(b?.ColorName ?? '')
                                        )
                            );

                    this.buildColorItems();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Colors Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Failed to load colors.'
                    );
                }
            });
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


    private buildColorItems():
        void
    {
        const currentId =
            Number(this.entity.ColorManagementId ?? 0);

        this.colorItems =
            this.colors
                .filter(
                    item =>
                        Boolean(item?.Status)
                        ||
                        Number(item?.ColorManagementId) === currentId
                )
                .map(
                    item =>
                    ({
                        label:
                            item.Status
                                ? item.ColorName
                                : `${item.ColorName} (Inactive)`,

                        value:
                            Number(item.ColorManagementId)
                    })
                );

        this.updateProductName();

        this.cdr.detectChanges();
    }



    //===========================================================
    // Parent / Color Changes (add mode only; locked afterwards)
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

        this.updateProductName();

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

        this.updateProductName();

        this.loadDefaults();

        this.onValueChange();
    }


    onColorChange
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
            this.entity.ColorManagementId =
                Number(this.unwrapValue(value) ?? 0);
        }

        this.updateProductName();

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


    // Preview of "<Sub Category Name> - <Color Name>"
    // (the server builds the same name on save)
    private updateProductName():
        void
    {
        if
        (
            this.mode !== 'add'
        )
        {
            return;
        }

        const subCategory =
            this.subCategories.find(
                item =>
                    Number(item?.ProductSubCategoryId)
                    ===
                    Number(this.entity.ProductSubCategoryId)
            );

        const color =
            this.colors.find(
                item =>
                    Number(item?.ColorManagementId)
                    ===
                    Number(this.entity.ColorManagementId)
            );

        const subCategoryName =
            String(subCategory?.SubCategoryName ?? '').trim();

        const colorName =
            String(color?.ColorName ?? '').trim();

        this.entity.ProductName =
            subCategoryName && colorName
                ? `${subCategoryName} - ${colorName}`
                : '';
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
        this.motorBikesService
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
                        this.motorBikesService.normalize(
                            response
                        );


                    this.syncLevelTexts();


                    this.buildCategoryItems();

                    this.buildSubCategoryItems();

                    this.buildColorItems();


                    this.resetImageState(
                        this.entity.ImagePath ?? ''
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
                        'Load Motor Bike Error',

                        error
                    );


                    this.toast.error(
                        'Error',

                        'Failed to load motor bike.'
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
    // Motor Bike Image : Picked / Removed (Image Hub)
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
                !!this.entity.ImagePath;

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

                'Motor Bike Image must be a JPG, PNG, WEBP or GIF file.'
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

                'Motor Bike Image cannot be larger than 2 MB.'
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
    // Motor Bike Image : Reset (new / loaded record)
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
            this.motorBikesService.getImageUrl(
                savedPath
            );
    }



    //===========================================================
    // Motor Bike Image : Free the local preview URL
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
    // Motor Bike Image : Save After The Motor Bike Is Saved
    //
    // New file → upload. Removed → delete. Otherwise nothing.
    //
    // Emits true when the image step worked (or had nothing to
    // do), false when it failed. A failed image never fails the
    // motor bike save itself : the motor bike is already stored, so a
    // second Save would only hit "code already exists".
    //===========================================================

    private saveImage
    (
        motorBikeId:
            number
    ):
        Observable<boolean>
    {
        return this.runImageStep(
            motorBikeId
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
                            'Motor Bike Image Error',

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
        motorBikeId:
            number
    ):
        Observable<void>
    {
        if
        (
            this.imageFile
            &&
            motorBikeId > 0
        )
        {
            return this.motorBikesService
                .uploadImage(
                    motorBikeId,
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
            motorBikeId > 0
        )
        {
            return this.motorBikesService
                .deleteImage(
                    motorBikeId
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
                    Number(this.entity.ColorManagementId) > 0,

                message:
                    'Color is required.'
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


        // Remarks and image are optional



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
            CreateMotorBikes =
        {
            ProductCategoryId:
                Number(this.entity.ProductCategoryId),

            ProductSubCategoryId:
                Number(this.entity.ProductSubCategoryId),

            ColorManagementId:
                Number(this.entity.ColorManagementId),

            ReorderLevel:
                Number(this.entity.ReorderLevel ?? 0),

            RedLevel:
                Number(this.entity.RedLevel ?? 0),

            Remarks:
                this.entity.Remarks?.trim() ?? '',

            IsActive:
                this.entity.IsActive
        };


        this.startProgress(
            'Saving Motor Bike',

            'Please wait while the motor bike is being saved...'
        );


        this.withMinimumDuration(
            this.motorBikesService
                .create(
                    model
                )
                .pipe(
                    // Then upload the picked image to the new motor bike
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

                        'Motor Bike saved.',

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
                        'Create Motor Bike Error',

                        error
                    );


                    this.failProgress(
                        () =>
                        {
                            const message =
                                (error as any)?.error
                                ??
                                'Failed to create motor bike.';


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
            UpdateMotorBikes =
        {
            MotorBikeId:
                this.entity.MotorBikeId,

            ProductCategoryId:
                Number(this.entity.ProductCategoryId),

            ProductSubCategoryId:
                Number(this.entity.ProductSubCategoryId),

            ColorManagementId:
                Number(this.entity.ColorManagementId),

            ReorderLevel:
                Number(this.entity.ReorderLevel ?? 0),

            RedLevel:
                Number(this.entity.RedLevel ?? 0),

            Remarks:
                this.entity.Remarks?.trim() ?? '',

            IsActive:
                this.entity.IsActive
        };


        this.startProgress(
            'Updating Motor Bike',

            'Please wait while the motor bike is being updated...'
        );


        this.withMinimumDuration(
            this.motorBikesService
                .update(
                    model
                )
                .pipe(
                    // Then upload / delete the image
                    switchMap(
                        () =>
                            this.saveImage(
                                this.entity.MotorBikeId
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

                        'Motor Bike updated.',

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
                        'Update Motor Bike Error',

                        error
                    );


                    this.failProgress(
                        () =>
                        {
                            const message =
                                (error as any)?.error
                                ??
                                'Failed to update motor bike.';


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
    // Image fine      → "Motor Bike created successfully."
    // Image failed    → one error explaining the motor bike is saved
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

                `Motor Bike ${verb} successfully.`
            );

            return;
        }

        this.toast.error(
            'Motor Bike Image Not Saved',

            `The motor bike was ${verb}, but its image could not be saved. ${this.imageError}`
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
                return 'Upload endpoint not found (404): the API is still running the old Motor Bikes controller. Rebuild and restart the API.';

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

                    'motor-bikes',

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

                        'motor-bikes',

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