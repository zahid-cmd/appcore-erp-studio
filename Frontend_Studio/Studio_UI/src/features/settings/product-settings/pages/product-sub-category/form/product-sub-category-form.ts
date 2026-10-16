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
    ProductSubCategory,
    CreateProductSubCategory,
    UpdateProductSubCategory
}
from '../../../models/product-sub-category.model';

import
{
    ProductSubCategoryService
}
from '../../../services/product-sub-category.service';

import
{
    ProductCategoryService
}
from '../../../services/product-category.service';

//===============================================================
// Local Types
//===============================================================

interface ProductCategoryOption
{
    ProductCategoryId:
        number;
    CategoryCode:
        string;
    CategoryName:
        string;
    IsActive:
        boolean;
}

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'product-sub-category-form',

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

    templateUrl:'./product-sub-category-form.html',

    styleUrls:
    [
        './product-sub-category-form.css'
    ]
})

//===============================================================
// Product Sub Category Form
//===============================================================

export class ProductSubCategoryForm
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly productSubCategoryService =
        inject(ProductSubCategoryService);

    private readonly productCategoryService =
        inject(ProductCategoryService);

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
        'Product Sub Category';

    entityName:
        string =
        'Product Sub Category';

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
    // Product Category Items
    //===========================================================

    private productCategories:
        ProductCategoryOption[] =
        [];

    productCategoryItems:
        any[] =
        [
            {
                label:'Select Product Category',
                value:null
            }
        ];

    //===========================================================
    // Sub Category Creation Items
    //===========================================================

    subCategoryCreationItems:
        any[] =
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
    // Status Items
    //===========================================================

    statusItems:
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

    //===========================================================
    // Entity
    //===========================================================

    entity:
        ProductSubCategory =
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

    private lastProductCategoryId:
        number =
        0;

    private defaultsRequestId:
        number =
        0;

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.loadProductCategories();

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
        ProductSubCategory
    {
        return {
            ProductSubCategoryId:0,
            ProductCategoryId:0,
            SubCategoryCode:'',
            SubCategoryName:'',
            InventorySubGroupCode:'',
            WipSubGroupCode:'',
            CogsSubGroupCode:'',
            InventorySubGroupName:'',
            WipSubGroupName:'',
            CogsSubGroupName:'',
            SubCategoryCreationAllowed:true,
            Remarks:'',
            IsActive:true
        };
    }

    //===========================================================
    // Load Product Categories
    //===========================================================

    private loadProductCategories():
        void
    {
        this.productCategoryService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        any
                ):
                    void =>
                {
                    const list:
                        any[] =
                        Array.isArray(response)
                            ? response
                            : [];

                    this.productCategories =
                        list.map
                        (
                            item =>
                            ({
                                ProductCategoryId:
                                    Number(
                                        item?.ProductCategoryId
                                        ??
                                        item?.productCategoryId
                                        ??
                                        0
                                    ),
                                CategoryCode:
                                    item?.CategoryCode
                                    ??
                                    item?.categoryCode
                                    ??
                                    '',
                                CategoryName:
                                    item?.CategoryName
                                    ??
                                    item?.categoryName
                                    ??
                                    '',
                                IsActive:
                                    Boolean(
                                        item?.IsActive
                                        ??
                                        item?.isActive
                                        ??
                                        true
                                    )
                            })
                        );

                    this.buildProductCategoryItems();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Product Categories Error',
                        error
                    );

                    this.productCategories =
                        [];

                    this.buildProductCategoryItems();
                }
            });
    }

    //===========================================================
    // Build Product Category Items
    //
    // Active categories only, plus the currently selected one
    // (so an existing record under an inactive category still
    // shows its category in Edit / View mode).
    //===========================================================

    private buildProductCategoryItems():
        void
    {
        const selectedId =
            this.entity.ProductCategoryId;

        this.productCategoryItems =
        [
            {
                label:'Select Product Category',
                value:null
            },
            ...this.productCategories
                .filter
                (
                    item =>
                        item.IsActive
                        ||
                        item.ProductCategoryId ===
                        selectedId
                )
                .map
                (
                    item =>
                    ({
                        label:
                            `${item.CategoryCode} - ${item.CategoryName}`,
                        value:
                            item.ProductCategoryId
                    })
                )
        ];

        this.cdr.detectChanges();
    }

    //===========================================================
    // Initialize Mode
    //===========================================================

    private initializeMode():
        void
    {
        const url =
            this.router.url.toLowerCase();

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

        const id =
            this.resolveEntityId();

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
        this.defaultsRequestId++;

        this.entity =
            this.createEmptyEntity();

        this.lastProductCategoryId =
            0;

        this.setInitialFormState();
    }

    //===========================================================
    // Clear Generated Codes
    //===========================================================

    private clearGeneratedCodes():
        void
    {
        this.entity.SubCategoryCode =
            '';

        this.entity.InventorySubGroupCode =
            '';

        this.entity.WipSubGroupCode =
            '';

        this.entity.CogsSubGroupCode =
            '';
    }

    //===========================================================
    // Generate Defaults
    //===========================================================

    private generateDefaults():
        void
    {
        if
        (
            this.entityId > 0
            ||
            !this.entity.ProductCategoryId
            ||
            this.entity.ProductCategoryId <= 0
        )
        {
            return;
        }

        //=======================================================
        // Ignore stale responses if the category changes again
        //=======================================================

        const requestId =
            ++this.defaultsRequestId;

        const productCategoryId =
            this.entity.ProductCategoryId;

        this.productSubCategoryService
            .getDefaults(
                productCategoryId
            )
            .subscribe
            ({
                next:
                (
                    response:
                        any
                ):
                    void =>
                {
                    if
                    (
                        requestId !==
                        this.defaultsRequestId
                    )
                    {
                        return;
                    }

                    this.entity.SubCategoryCode =
                        String(
                            response?.Code
                            ??
                            response?.code
                            ??
                            ''
                        ).trim();

                    this.entity.InventorySubGroupCode =
                        String(
                            response?.InventorySubGroupCode
                            ??
                            response?.inventorySubGroupCode
                            ??
                            ''
                        ).trim();

                    this.entity.WipSubGroupCode =
                        String(
                            response?.WipSubGroupCode
                            ??
                            response?.wipSubGroupCode
                            ??
                            ''
                        ).trim();

                    this.entity.CogsSubGroupCode =
                        String(
                            response?.CogsSubGroupCode
                            ??
                            response?.cogsSubGroupCode
                            ??
                            ''
                        ).trim();

                    this.checkForChanges();

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    if
                    (
                        requestId !==
                        this.defaultsRequestId
                    )
                    {
                        return;
                    }

                    console.error(
                        'Generate Product Sub Category Defaults Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to generate Product Sub Category defaults.'
                        )
                    );
                }
            });
    }

    //===========================================================
    // Product Category Change
    //===========================================================

    onProductCategoryChange():
        void
    {
        if
        (
            this.isViewMode
            ||
            this.isEditMode
        )
        {
            return;
        }

        const productCategoryId =
            Number(
                this.entity.ProductCategoryId
                ??
                0
            );

        this.entity.ProductCategoryId =
            productCategoryId;

        if
        (
            productCategoryId !==
            this.lastProductCategoryId
        )
        {
            this.lastProductCategoryId =
                productCategoryId;

            this.defaultsRequestId++;

            this.clearGeneratedCodes();

            if
            (
                productCategoryId > 0
            )
            {
                this.generateDefaults();
            }
        }

        this.checkForChanges();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Sub Category Name Change
    //===========================================================

    onSubCategoryNameChange():
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }

        const subCategoryName =
            this.entity.SubCategoryName?.trim()
            ??
            '';

        //=======================================================
        // Group names are auto-built in Add mode only;
        // they are locked in Edit mode.
        //=======================================================

        if
        (
            this.isAddMode
        )
        {
            this.entity.InventorySubGroupName =
                subCategoryName
                    ? `INV - ${subCategoryName}`
                    : '';

            this.entity.WipSubGroupName =
                subCategoryName
                    ? `WIP - ${subCategoryName}`
                    : '';

            this.entity.CogsSubGroupName =
                subCategoryName
                    ? `COGS - ${subCategoryName}`
                    : '';
        }

        this.checkForChanges();

        this.cdr.detectChanges();
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
        this.productSubCategoryService
            .getById(
                this.entityId
            )
            .subscribe
            ({
                next:
                (
                    response:
                        any
                ):
                    void =>
                {
                    this.entity =
                    {
                        ProductSubCategoryId:
                            Number(
                                response?.ProductSubCategoryId
                                ??
                                response?.productSubCategoryId
                                ??
                                0
                            ),

                        ProductCategoryId:
                            Number(
                                response?.ProductCategoryId
                                ??
                                response?.productCategoryId
                                ??
                                0
                            ),

                        SubCategoryCode:
                            response?.SubCategoryCode
                            ??
                            response?.subCategoryCode
                            ??
                            '',

                        SubCategoryName:
                            response?.SubCategoryName
                            ??
                            response?.subCategoryName
                            ??
                            '',

                        InventorySubGroupCode:
                            response?.InventorySubGroupCode
                            ??
                            response?.inventorySubGroupCode
                            ??
                            '',

                        WipSubGroupCode:
                            response?.WipSubGroupCode
                            ??
                            response?.wipSubGroupCode
                            ??
                            '',

                        CogsSubGroupCode:
                            response?.CogsSubGroupCode
                            ??
                            response?.cogsSubGroupCode
                            ??
                            '',

                        InventorySubGroupName:
                            response?.InventorySubGroupName
                            ??
                            response?.inventorySubGroupName
                            ??
                            '',

                        WipSubGroupName:
                            response?.WipSubGroupName
                            ??
                            response?.wipSubGroupName
                            ??
                            '',

                        CogsSubGroupName:
                            response?.CogsSubGroupName
                            ??
                            response?.cogsSubGroupName
                            ??
                            '',

                        SubCategoryCreationAllowed:
                            Boolean(
                                response?.SubCategoryCreationAllowed
                                ??
                                response?.subCategoryCreationAllowed
                                ??
                                false
                            ),

                        Remarks:
                            response?.Remarks
                            ??
                            response?.remarks
                            ??
                            '',

                        IsActive:
                            Boolean(
                                response?.IsActive
                                ??
                                response?.isActive
                                ??
                                true
                            )
                    };

                    this.lastProductCategoryId =
                        this.entity.ProductCategoryId;

                    this.buildProductCategoryItems();

                    this.setInitialFormState();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Product Sub Category Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Failed to load Product Sub Category.'
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
            !this.entity.ProductCategoryId
            ||
            this.entity.ProductCategoryId <= 0
        )
        {
            this.toast.error(
                'Validation',
                'Product Category is required.'
            );

            return;
        }

        const requiredFields:
            {
                value:
                    string | undefined;
                message:
                    string;
            }[] =
        [
            {
                value:this.entity.SubCategoryCode,
                message:'Sub Category Code is required. Please wait for the code to generate.'
            },
            {
                value:this.entity.SubCategoryName,
                message:'Sub Category Name is required.'
            },
            {
                value:this.entity.InventorySubGroupCode,
                message:'Inventory Sub Group Code is required.'
            },
            {
                value:this.entity.WipSubGroupCode,
                message:'WIP Sub Group Code is required.'
            },
            {
                value:this.entity.CogsSubGroupCode,
                message:'COGS Sub Group Code is required.'
            },
            {
                value:this.entity.InventorySubGroupName,
                message:'Inventory Sub Group Name is required.'
            },
            {
                value:this.entity.WipSubGroupName,
                message:'WIP Sub Group Name is required.'
            },
            {
                value:this.entity.CogsSubGroupName,
                message:'COGS Sub Group Name is required.'
            }
        ];

        for
        (
            const field
            of requiredFields
        )
        {
            if
            (
                !field.value?.trim()
            )
            {
                this.toast.error(
                    'Validation',
                    field.message
                );

                return;
            }
        }

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
        CreateProductSubCategory
    {
        return {
            ProductCategoryId:
                this.entity.ProductCategoryId,

            SubCategoryCode:
                this.entity.SubCategoryCode.trim(),

            SubCategoryName:
                this.entity.SubCategoryName.trim(),

            InventorySubGroupCode:
                this.entity.InventorySubGroupCode.trim(),

            WipSubGroupCode:
                this.entity.WipSubGroupCode.trim(),

            CogsSubGroupCode:
                this.entity.CogsSubGroupCode.trim(),

            InventorySubGroupName:
                this.entity.InventorySubGroupName.trim(),

            WipSubGroupName:
                this.entity.WipSubGroupName.trim(),

            CogsSubGroupName:
                this.entity.CogsSubGroupName.trim(),

            SubCategoryCreationAllowed:
                this.entity.SubCategoryCreationAllowed,

            Remarks:
                this.entity.Remarks?.trim()
                ??
                '',

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
            CreateProductSubCategory =
            this.buildPayload();

        this.isSaving =
            true;

        this.startProgress(
            'Saving Product Sub Category',
            'Creating product sub category and its Inventory, WIP and COGS account sub groups...'
        );

        this.withMinimumDuration(
            this.productSubCategoryService.create(
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
                    'Product Sub Category saved successfully.',
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
                            'Product Sub Category created successfully.'
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
                    'Create Product Sub Category Error',
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
                                'Failed to create Product Sub Category.'
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
            UpdateProductSubCategory =
        {
            ProductSubCategoryId:
                this.entity.ProductSubCategoryId,

            ...this.buildPayload()
        };

        this.isSaving =
            true;

        this.startProgress(
            'Updating Product Sub Category',
            'Updating product sub category and its account sub groups...'
        );

        this.withMinimumDuration(
            this.productSubCategoryService.update(
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
                    'Product Sub Category updated successfully.',
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
                            'Product Sub Category updated successfully.'
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
                    'Update Product Sub Category Error',
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
                                'Failed to update Product Sub Category.'
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
            '/settings',
            'product-settings',
            'product-sub-category',
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
        if
        (
            this.isViewMode
        )
        {
            return;
        }

        this.checkForChanges();

        this.cdr.detectChanges();
    }
}