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
    ServiceSubCategory,
    CreateServiceSubCategory,
    UpdateServiceSubCategory,
    ServiceSubCategoryDefaults,
    ServiceSubCategoryCategoryOption,
    SERVICE_SUB_CATEGORY_TYPES
}
from '../../../models/service-sub-category.model';

import
{
    ServiceSubCategoryService
}
from '../../../services/service-sub-category.service';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'service-sub-category-form',

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

    templateUrl:'./service-sub-category-form.html',

    styleUrls:
    [
        './service-sub-category-form.css'
    ]
})

//===============================================================
// Service Sub Category Form
//===============================================================

export class ServiceSubCategoryForm
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly serviceSubCategoryService =
        inject(ServiceSubCategoryService);

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
        'Service Sub Category';

    entityName:
        string =
        'Service Sub Category';

    //===========================================================
    // Tabs
    //===========================================================

    selectedTab:
        string =
        'general';

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
    // Dropdown Items
    //===========================================================

    categoryItems:
        any[]
        =
        [];

    subCategoryTypeItems:
        any[]
        =
        [];

    itemCreationItems:
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
    // Service Categories (from the defaults call)
    //===========================================================

    private categories:
        ServiceSubCategoryCategoryOption[]
        =
        [];

    // Category and type as saved on the server (edit / view)
    private savedCategoryId:
        number =
        0;

    private savedSubCategoryType:
        string =
        '';

    //===========================================================
    // Display Only (follow the selected category)
    //===========================================================

    categoryTypeDisplay:
        string =
        '';

    incomeClassDisplay:
        string =
        '';

    incomeGroupDisplay:
        string =
        '';

    //===========================================================
    // Entity
    //===========================================================

    entity:
        ServiceSubCategory
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
        this.initializeMode();

        this.loadDefaults();
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
        ServiceSubCategory
    {
        return {
            ServiceSubCategoryId:0,
            SubCategoryCode:'',
            ServiceCategoryId:0,
            SubCategoryType:'',
            SubCategoryName:'',
            IncomeSubGroupCode:'',
            IncomeSubGroupName:'',
            ItemCreationAllowed:true,
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
    // Initialize Entity (Add mode)
    //===========================================================

    private initializeEntity():
        void
    {
        this.entity =
            this.createEmptyEntity();

        this.applyCategory();

        this.setInitialFormState();
    }

    //===========================================================
    // Load Defaults
    //
    // Every live Service Category with its income account and the
    // next Sub Category Code / Sub Group Code under it (preview).
    //===========================================================

    private loadDefaults():
        void
    {
        this.serviceSubCategoryService
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    response:
                        ServiceSubCategoryDefaults
                ):
                    void =>
                {
                    this.categories =
                        response.Categories ?? [];

                    this.buildCategoryItems();

                    // Displays and previews only; the user's
                    // choices are kept
                    const touched =
                        this.hasChanges;

                    this.applyCategory();

                    if
                    (
                        this.isAddMode
                        &&
                        !touched
                    )
                    {
                        this.setInitialFormState();

                        return;
                    }

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
                    console.error(
                        'Load Service Sub Category Defaults Error',
                        error
                    );

                    this.categoryItems =
                        [];

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to load service categories.'
                        )
                    );

                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Build Category Items
    //
    // Add : active categories that allow sub categories.
    // Edit / View : the row's own category only (locked).
    //===========================================================

    private buildCategoryItems():
        void
    {
        this.categoryItems =
            this.categories
                .filter(
                    item =>
                        this.isAddMode
                            ? item.IsActive
                              &&
                              item.SubCategoryCreationAllowed
                            : Number(item.ServiceCategoryId) ===
                              Number(this.savedCategoryId || this.entity.ServiceCategoryId)
                )
                .map(
                    item =>
                    ({
                        label:
                            `${item.CategoryCode} - ${item.CategoryName}`
                            +
                            (item.IsActive ? '' : ' (Inactive)'),

                        value:
                            Number(item.ServiceCategoryId)
                    })
                );

        this.cdr.detectChanges();
    }

    //===========================================================
    // Selected Category
    //===========================================================

    get selectedCategory():
        ServiceSubCategoryCategoryOption | undefined
    {
        return this.categories.find(
            item =>
                Number(item.ServiceCategoryId) ===
                Number(this.entity.ServiceCategoryId)
        );
    }

    get isBrandServices():
        boolean
    {
        return (this.selectedCategory?.CategoryType ?? '')
            .trim()
            .toLowerCase()
            ===
            'brand services';
    }

    get isDifferentialServices():
        boolean
    {
        return (this.selectedCategory?.CategoryType ?? '')
            .trim()
            .toLowerCase()
            ===
            'differential services';
    }

    get namePlaceholder():
        string
    {
        if
        (
            !this.selectedCategory
        )
        {
            return 'Select a service category';
        }

        if
        (
            this.isDifferentialServices
        )
        {
            return 'Enter sub category name (e.g. Wash Packages)';
        }

        return 'Select a sub category type';
    }

    //===========================================================
    // Category Change
    //===========================================================

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
            this.entity.ServiceCategoryId =
                Number(this.unwrapValue(value) ?? 0);
        }

        // A type of the other category kind is no longer valid
        if
        (
            !this.allowedTypes().includes(
                this.entity.SubCategoryType
            )
        )
        {
            this.entity.SubCategoryType =
                '';
        }

        this.applyCategory();

        this.checkForChanges();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Sub Category Type Change
    //===========================================================

    onSubCategoryTypeChange
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
            this.entity.SubCategoryType =
                String(this.unwrapValue(value) ?? '');
        }

        this.applyName();

        this.checkForChanges();

        this.cdr.detectChanges();
    }

    // Differential Services : the typed name changed
    onSubCategoryNameChange():
        void
    {
        if
        (
            this.isBrandServices
            ||
            this.isViewMode
        )
        {
            return;
        }

        this.refreshSubGroupName();

        this.checkForChanges();

        this.cdr.detectChanges();
    }

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

    //===========================================================
    // Types allowed for the selected category
    //===========================================================

    private allowedTypes():
        string[]
    {
        const categoryType =
            this.selectedCategory?.CategoryType ?? '';

        return [
            ...(SERVICE_SUB_CATEGORY_TYPES[categoryType] ?? [])
        ];
    }

    //===========================================================
    // Apply Category
    //
    // Fills the displays, the type list and (Add mode) the code
    // previews from the selected category. Saved codes never
    // change.
    //===========================================================

    private applyCategory():
        void
    {
        const category =
            this.selectedCategory;

        this.categoryTypeDisplay =
            category?.CategoryType ?? '';

        this.incomeClassDisplay =
            category
                ? [
                    category.IncomeClassCode,
                    category.IncomeClassName
                  ]
                  .filter(value => !!value)
                  .join(' - ')
                : '';

        this.incomeGroupDisplay =
            category
                ? [
                    category.IncomeGroupCode,
                    category.IncomeGroupName
                  ]
                  .filter(value => !!value)
                  .join(' - ')
                : '';

        //=======================================================
        // Type list : Brand Services offers only the types the
        // category does not have yet (one per type)
        //=======================================================

        const used =
            new Set<string>(
                this.isBrandServices
                    ? (category?.UsedSubCategoryTypes ?? [])
                    : []
            );

        this.subCategoryTypeItems =
            this.allowedTypes()
                .filter(
                    type =>
                        !used.has(type)
                        ||
                        (
                            !this.isAddMode
                            &&
                            type === this.savedSubCategoryType
                        )
                )
                .map(
                    type =>
                    ({
                        label:type,
                        value:type
                    })
                );

        if
        (
            this.isAddMode
            &&
            this.entity.SubCategoryType
            &&
            !this.subCategoryTypeItems.some(
                item =>
                    item.value === this.entity.SubCategoryType
            )
        )
        {
            this.entity.SubCategoryType =
                '';
        }

        //=======================================================
        // Add mode : previews of the next codes
        //=======================================================

        if
        (
            this.isAddMode
        )
        {
            this.entity.SubCategoryCode =
                category?.NextSubCategoryCode ?? '';

            this.entity.IncomeSubGroupCode =
                category?.NextSubGroupCode ?? '';

            this.applyName();
        }
    }

    //===========================================================
    // Apply Name
    //
    //   Brand Services        : "<Type> - <Brand>" (read-only)
    //   Differential Services : typed (a built name is cleared)
    // The Income Sub Group Name always equals the name.
    // The server builds the same values; these are a preview.
    //===========================================================

    private applyName():
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }

        if
        (
            this.isBrandServices
        )
        {
            const brandName =
                (this.selectedCategory?.BrandName ?? '').trim();

            this.entity.SubCategoryName =
                brandName && this.entity.SubCategoryType
                    ? `${this.entity.SubCategoryType} - ${brandName}`
                    : '';
        }
        else if
        (
            this.isAddMode
            &&
            !this.isDifferentialServices
        )
        {
            this.entity.SubCategoryName =
                '';
        }
        else if
        (
            this.isAddMode
            &&
            this.isBuiltName(
                this.entity.SubCategoryName
            )
        )
        {
            // Switched from a brand category : drop the built name
            this.entity.SubCategoryName =
                '';
        }

        this.refreshSubGroupName();
    }

    // A name built for a brand category ("<Type> - <Brand>")
    private isBuiltName
    (
        name:
            string
    ):
        boolean
    {
        const value =
            (name ?? '').trim();

        return !!value
            &&
            this.categories.some(
                category =>
                    !!category.BrandName
                    &&
                    (SERVICE_SUB_CATEGORY_TYPES['Brand Services'] ?? []).some(
                        type =>
                            `${type} - ${category.BrandName.trim()}` === value
                    )
            );
    }

    private refreshSubGroupName():
        void
    {
        this.entity.IncomeSubGroupName =
            (this.entity.SubCategoryName ?? '')
                .replace(/\s+/g, ' ')
                .trim();
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
        this.serviceSubCategoryService
            .getById(
                this.entityId
            )
            .subscribe
            ({
                next:
                (
                    response:
                        ServiceSubCategory
                ): void =>
                {
                    this.entity =
                    {
                        ServiceSubCategoryId:
                            response.ServiceSubCategoryId,

                        SubCategoryCode:
                            response.SubCategoryCode,

                        ServiceCategoryId:
                            Number(response.ServiceCategoryId ?? 0),

                        SubCategoryType:
                            response.SubCategoryType,

                        SubCategoryName:
                            response.SubCategoryName,

                        IncomeSubGroupCode:
                            response.IncomeSubGroupCode,

                        IncomeSubGroupName:
                            response.IncomeSubGroupName,

                        ItemCreationAllowed:
                            response.ItemCreationAllowed,

                        Remarks:
                            response.Remarks,

                        IsActive:
                            response.IsActive
                    };

                    this.savedCategoryId =
                        this.entity.ServiceCategoryId;

                    this.savedSubCategoryType =
                        this.entity.SubCategoryType;

                    this.buildCategoryItems();

                    this.applyCategory();

                    this.setInitialFormState();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Service Sub Category Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Failed to load Service Sub Category.'
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

        const category =
            this.selectedCategory;

        if
        (
            !category
        )
        {
            this.toast.error(
                'Validation',
                'Service Category is required.'
            );

            return;
        }

        if
        (
            !this.entity.SubCategoryType?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Sub Category Type is required.'
            );

            return;
        }

        if
        (
            this.entity.IsActive
            &&
            !category.IsActive
        )
        {
            this.toast.error(
                'Validation',
                `Service Category '${category.CategoryName}' is inactive. Activate the category first.`
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
                message:'Sub Category Code is required.'
            },
            {
                value:this.entity.SubCategoryName,
                message:
                    this.isBrandServices
                        ? 'Sub Category Name could not be built. Select the Sub Category Type again.'
                        : 'Sub Category Name is required.'
            },
            {
                value:this.entity.IncomeSubGroupCode,
                message:'Income Sub Group Code is required.'
            },
            {
                value:this.entity.IncomeSubGroupName,
                message:'Income Sub Group Name is required.'
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
        CreateServiceSubCategory
    {
        return {
            SubCategoryCode:
                this.entity.SubCategoryCode.trim(),

            ServiceCategoryId:
                Number(this.entity.ServiceCategoryId),

            SubCategoryType:
                this.entity.SubCategoryType.trim(),

            SubCategoryName:
                this.entity.SubCategoryName.trim(),

            IncomeSubGroupCode:
                this.entity.IncomeSubGroupCode.trim(),

            IncomeSubGroupName:
                this.entity.IncomeSubGroupName.trim(),

            ItemCreationAllowed:
                this.entity.ItemCreationAllowed,

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
            CreateServiceSubCategory =
            this.buildPayload();

        this.isSaving =
            true;

        this.startProgress(
            'Saving Service Sub Category',
            'Creating service sub category and its Income account sub group...'
        );

        this.withMinimumDuration(
            this.serviceSubCategoryService.create(
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
                    'Service Sub Category saved successfully.',
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
                            'Service Sub Category created successfully.'
                        );

                        this.cdr.detectChanges();

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
                    'Create Service Sub Category Error',
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
                                'Failed to create Service Sub Category.'
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
            UpdateServiceSubCategory =
        {
            ServiceSubCategoryId:
                this.entity.ServiceSubCategoryId,

            ...this.buildPayload()
        };

        this.isSaving =
            true;

        this.startProgress(
            'Updating Service Sub Category',
            'Updating service sub category and its Income account sub group...'
        );

        this.withMinimumDuration(
            this.serviceSubCategoryService.update(
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
                    'Service Sub Category updated successfully.',
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
                            'Service Sub Category updated successfully.'
                        );

                        this.cdr.detectChanges();

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
                    'Update Service Sub Category Error',
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
                                'Failed to update Service Sub Category.'
                            )
                        );

                        this.cdr.detectChanges();
                    }
                );
            }
        });
    }

    //===========================================================
    // Progress : Start
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

        this.cdr.detectChanges();
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
            'service-settings',
            'service-sub-category',
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

    // Category and Sub Category Type are locked once saved
    get isCategoryLocked():
        boolean
    {
        return !this.isAddMode;
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