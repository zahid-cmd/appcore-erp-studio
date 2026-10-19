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
    ServiceCategory,
    CreateServiceCategory,
    UpdateServiceCategory,
    ServiceCategoryDefaults,
    SERVICE_CATEGORY_TYPES,
    SERVICE_SUB_CATEGORY_TYPES
}
from '../../../models/service-category.model';

import
{
    ServiceCategoryService
}
from '../../../services/service-category.service';

import
{
    BrandManagement
}
from '../../../../product-settings/models/brand-management.model';

import
{
    BrandManagementService
}
from '../../../../product-settings/services/brand-management.service';

import
{
    ServicePolicy
}
from '../../../models/service-policy.model';

import
{
    ServicePolicyService
}
from '../../../services/service-policy.service';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'service-category-form',

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

    templateUrl:'./service-category-form.html',

    styleUrls:
    [
        './service-category-form.css'
    ]
})

//===============================================================
// Service Category Form
//===============================================================

export class ServiceCategoryForm
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly serviceCategoryService =
        inject(ServiceCategoryService);

    private readonly brandService =
        inject(BrandManagementService);

    private readonly servicePolicyService =
        inject(ServicePolicyService);

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
        'Service Category';

    entityName:
        string =
        'Service Category';

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

    categoryTypeItems:
        any[]
        =
        SERVICE_CATEGORY_TYPES.map(
            type =>
            ({
                label:type,
                value:type
            })
        );

    subCategoryCreationItems:
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
    // Brand Items
    //
    // Active brands that do not have a Brand Services category
    // yet, plus the category's own brand (even if inactive).
    //===========================================================

    brandItems:
        any[]
        =
        [];

    private brands:
        BrandManagement[]
        =
        [];

    // Brand ids already used by other Brand Services categories
    private usedBrandIds:
        Set<number>
        =
        new Set<number>();

    // Brand ids with an active Service Policy (policies come first;
    // only these brands can get a Brand Services category)
    private policyBrandIds:
        Set<number>
        =
        new Set<number>();

    //===========================================================
    // Income Class (display only : "CLS-005 - Income")
    //===========================================================

    incomeClassDisplay:
        string =
        '';

    // Add mode : next Category Code per Category Type (preview)
    private nextBrandServicesCode:
        string =
        '';

    private nextDifferentialServicesCode:
        string =
        '';

    // Category Type as saved on the server ('' for new rows)
    private savedCategoryType:
        string
        =
        '';

    //===========================================================
    // Entity
    //===========================================================

    entity:
        ServiceCategory
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

    // The last name this form generated (to tell a typed name from a built one)
    private lastAutoName:
        string =
        '';

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.loadBrands();

        this.loadUsedBrands();

        this.loadPolicyBrands();

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
        ServiceCategory
    {
        return {
            ServiceCategoryId:0,
            CategoryCode:'',
            CategoryName:'',
            CategoryType:'',
            BrandManagementId:0,
            IncomeGroupCode:'',
            IncomeGroupName:'',
            SubCategoryCreationAllowed:true,
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

            // Income class label only (codes stay as saved)
            this.loadDefaults();

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
        this.entity =
            this.createEmptyEntity();

        this.lastAutoName =
            '';

        this.setInitialFormState();

        this.loadDefaults();
    }

    //===========================================================
    // Load Defaults
    //
    // Add mode : next Category Code per type (BRS-nnn /
    // DRS-nnn) and Income Group Code (GRP-ccc-ggg) as a preview. Every mode : the Income
    // class label.
    //===========================================================

    private loadDefaults():
        void
    {
        this.serviceCategoryService
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    response:
                        ServiceCategoryDefaults
                ):
                    void =>
                {
                    this.incomeClassDisplay =
                        [
                            response.IncomeClassCode,
                            response.IncomeClassName
                        ]
                        .filter(
                            value =>
                                !!value
                        )
                        .join(' - ');

                    if
                    (
                        !this.isAddMode
                    )
                    {
                        this.cdr.detectChanges();

                        return;
                    }

                    this.nextBrandServicesCode =
                        String(response.BrandServicesCode ?? '').trim();

                    this.nextDifferentialServicesCode =
                        String(response.DifferentialServicesCode ?? '').trim();

                    this.applyCategoryCode();

                    this.entity.IncomeGroupCode =
                        String(response.IncomeGroupCode ?? '').trim();

                    // Auto-filled values are the new baseline,
                    // unless the user has already started typing
                    if
                    (
                        !this.entity.CategoryType
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
                        'Load Service Category Defaults Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to load Service Category defaults.'
                        )
                    );

                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Load Brands
    //===========================================================

    private loadBrands():
        void
    {
        this.brandService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        BrandManagement[]
                ):
                    void =>
                {
                    this.brands =
                        (response ?? [])
                            .slice()
                            .sort(
                                (a, b) =>
                                    (a.BrandName ?? '')
                                        .localeCompare(
                                            b.BrandName ?? ''
                                        )
                            );

                    this.buildBrandItems();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Brands Error',
                        error
                    );

                    this.brandItems =
                        [];

                    this.toast.error(
                        'Error',
                        'Failed to load brands.'
                    );

                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Load Used Brands (one Brand Services category per brand)
    //===========================================================

    private loadUsedBrands():
        void
    {
        this.serviceCategoryService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        ServiceCategory[]
                ):
                    void =>
                {
                    this.usedBrandIds =
                        new Set<number>(
                            (response ?? [])
                                .filter(
                                    item =>
                                        Number(item.BrandManagementId) > 0
                                        &&
                                        Number(item.ServiceCategoryId) !==
                                        Number(this.entityId)
                                )
                                .map(
                                    item =>
                                        Number(item.BrandManagementId)
                                )
                        );

                    this.buildBrandItems();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    // Not critical : the server checks it again
                    console.error(
                        'Load Service Categories Error',
                        error
                    );
                }
            });
    }

    //===========================================================
    // Load Policy Brands (brands with an active Service Policy)
    //===========================================================

    private loadPolicyBrands():
        void
    {
        this.servicePolicyService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        ServicePolicy[]
                ):
                    void =>
                {
                    this.policyBrandIds =
                        new Set<number>(
                            (response ?? [])
                                .filter(
                                    item =>
                                        item.IsActive
                                )
                                .map(
                                    item =>
                                        Number(item.BrandManagementId)
                                )
                        );

                    this.buildBrandItems();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    // Not critical : the server checks it again
                    console.error(
                        'Load Service Policies Error',
                        error
                    );
                }
            });
    }

    //===========================================================
    // Build Brand Items
    //
    // Brands with an active Service Policy and no Brand Services
    // category yet, plus the category's own brand.
    //===========================================================

    private buildBrandItems():
        void
    {
        const currentId =
            Number(
                this.entity.BrandManagementId
                ??
                0
            );

        this.brandItems =
            this.brands
                .filter(
                    brand =>
                    {
                        const id =
                            Number(brand.BrandManagementId);

                        if
                        (
                            id === currentId
                        )
                        {
                            return true;
                        }

                        return brand.Status
                            &&
                            this.policyBrandIds.has(id)
                            &&
                            !this.usedBrandIds.has(id);
                    }
                )
                .map(
                    brand =>
                    ({
                        label:
                            brand.Status
                                ? brand.BrandName
                                : `${brand.BrandName} (Inactive)`,

                        value:
                            Number(brand.BrandManagementId)
                    })
                );

        this.cdr.detectChanges();
    }

    //===========================================================
    // Category Type Helpers
    //===========================================================

    get isBrandServices():
        boolean
    {
        return (this.entity.CategoryType ?? '')
            .trim()
            .toLowerCase()
            ===
            'brand services';
    }

    get isDifferentialServices():
        boolean
    {
        return (this.entity.CategoryType ?? '')
            .trim()
            .toLowerCase()
            ===
            'differential services';
    }

    // "Labor Chart, Scheduled Services" / "Customized Services, Membership Services"
    get allowedSubCategoryTypes():
        string
    {
        const type =
            SERVICE_CATEGORY_TYPES.find(
                item =>
                    item.toLowerCase() ===
                    (this.entity.CategoryType ?? '')
                        .trim()
                        .toLowerCase()
            );

        return type
            ? (SERVICE_SUB_CATEGORY_TYPES[type] ?? []).join(', ')
            : '';
    }

    get namePlaceholder():
        string
    {
        if
        (
            this.isDifferentialServices
        )
        {
            return 'Enter category name (e.g. General Services)';
        }

        if
        (
            this.isBrandServices
        )
        {
            return 'Select a brand';
        }

        return 'Select a category type';
    }

    //===========================================================
    // Category Type Change
    //===========================================================

    onCategoryTypeChange
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
            this.entity.CategoryType =
                String(this.unwrapValue(value) ?? '');
        }

        // Differential Services : no brand
        if
        (
            !this.isBrandServices
        )
        {
            this.entity.BrandManagementId =
                0;
        }

        this.applyCategoryCode();

        this.onNameSourceChange();
    }

    //===========================================================
    // Category Code (Add mode only; saved codes never change)
    //
    //   Brand Services        : BRS-nnn
    //   Differential Services : DRS-nnn
    //   No type selected      : empty
    //===========================================================

    private applyCategoryCode():
        void
    {
        if
        (
            !this.isAddMode
        )
        {
            return;
        }

        const type =
            (this.entity.CategoryType ?? '').trim();

        if
        (
            type === SERVICE_CATEGORY_TYPES[0]
        )
        {
            this.entity.CategoryCode =
                this.nextBrandServicesCode;
        }
        else if
        (
            type === SERVICE_CATEGORY_TYPES[1]
        )
        {
            this.entity.CategoryCode =
                this.nextDifferentialServicesCode;
        }
        else
        {
            this.entity.CategoryCode =
                '';
        }
    }

    //===========================================================
    // Brand Change
    //===========================================================

    onBrandChange
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
            this.entity.BrandManagementId =
                Number(this.unwrapValue(value) ?? 0);
        }

        this.onNameSourceChange();
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
    // Name Source Change
    //
    //   Brand Services  : "Service Charges - <Brand Name>" (read-only)
    //   Differential Services : typed; a name built for a brand is
    //                     cleared once
    // The Income Group Name always equals the Category Name.
    // The server builds the same values; these are a preview.
    //===========================================================

    private onNameSourceChange():
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
            !this.isBrandServices
        )
        {
            if
            (
                this.entity.CategoryName
                &&
                this.entity.CategoryName === this.lastAutoName
            )
            {
                this.entity.CategoryName =
                    '';
            }

            this.lastAutoName =
                '';

            this.refreshGroupName();

            return;
        }

        const brandName =
            this.brands
                .find(
                    brand =>
                        Number(brand.BrandManagementId) ===
                        Number(this.entity.BrandManagementId)
                )
                ?.BrandName
                ?.trim()
            ??
            '';

        const categoryName =
            brandName
                ? `Service Charges - ${brandName}`
                : '';

        this.entity.CategoryName =
            categoryName;

        this.lastAutoName =
            categoryName;

        this.refreshGroupName();
    }

    // Differential Services : the typed Category Name changed
    onCategoryNameChange():
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

        this.refreshGroupName();
    }

    private refreshGroupName():
        void
    {
        this.entity.IncomeGroupName =
            (this.entity.CategoryName ?? '')
                .replace(/\s+/g, ' ')
                .trim();

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
        this.serviceCategoryService
            .getById(
                this.entityId
            )
            .subscribe
            ({
                next:
                (
                    response:
                        ServiceCategory
                ): void =>
                {
                    this.entity =
                    {
                        ServiceCategoryId:
                            response.ServiceCategoryId,

                        CategoryCode:
                            response.CategoryCode,

                        CategoryName:
                            response.CategoryName,

                        CategoryType:
                            response.CategoryType,

                        BrandManagementId:
                            Number(response.BrandManagementId ?? 0),

                        IncomeGroupCode:
                            response.IncomeGroupCode,

                        IncomeGroupName:
                            response.IncomeGroupName,

                        SubCategoryCreationAllowed:
                            response.SubCategoryCreationAllowed,

                        Remarks:
                            response.Remarks,

                        IsActive:
                            response.IsActive
                    };

                    this.savedCategoryType =
                        this.entity.CategoryType;

                    this.lastAutoName =
                        this.isBrandServices
                            ? this.entity.CategoryName
                            : '';

                    this.buildBrandItems();

                    this.setInitialFormState();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Service Category Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Failed to load Service Category.'
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

        if
        (
            !this.entity.CategoryType?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Category Type is required.'
            );

            return;
        }

        if
        (
            this.isBrandServices
            &&
            !(Number(this.entity.BrandManagementId) > 0)
        )
        {
            this.toast.error(
                'Validation',
                'Brand is required for Brand Services.'
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
                value:this.entity.CategoryCode,
                message:'Category Code is required.'
            },
            {
                value:this.entity.CategoryName,
                message:
                    this.isBrandServices
                        ? 'Category Name could not be built. Select the Brand again.'
                        : 'Category Name is required.'
            },
            {
                value:this.entity.IncomeGroupCode,
                message:'Income Group Code is required.'
            },
            {
                value:this.entity.IncomeGroupName,
                message:'Income Group Name is required.'
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
        CreateServiceCategory
    {
        return {
            CategoryCode:
                this.entity.CategoryCode.trim(),

            CategoryName:
                this.entity.CategoryName.trim(),

            CategoryType:
                this.entity.CategoryType.trim(),

            BrandManagementId:
                this.isBrandServices
                    ? Number(this.entity.BrandManagementId)
                    : null,

            IncomeGroupCode:
                this.entity.IncomeGroupCode.trim(),

            IncomeGroupName:
                this.entity.IncomeGroupName.trim(),

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
            CreateServiceCategory =
            this.buildPayload();

        this.isSaving =
            true;

        this.startProgress(
            'Saving Service Category',
            'Creating service category and its Income account group...'
        );

        this.withMinimumDuration(
            this.serviceCategoryService.create(
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
                    'Service Category saved successfully.',
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
                            'Service Category created successfully.'
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
                    'Create Service Category Error',
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
                                'Failed to create Service Category.'
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
            UpdateServiceCategory =
        {
            ServiceCategoryId:
                this.entity.ServiceCategoryId,

            ...this.buildPayload()
        };

        this.isSaving =
            true;

        this.startProgress(
            'Updating Service Category',
            'Updating service category and its Income account group...'
        );

        this.withMinimumDuration(
            this.serviceCategoryService.update(
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
                    'Service Category updated successfully.',
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
                            'Service Category updated successfully.'
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
                    'Update Service Category Error',
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
                                'Failed to update Service Category.'
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
            'service-category',
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

    // Category Type is locked once saved
    get isCategoryTypeLocked():
        boolean
    {
        return !this.isAddMode
            &&
            !!this.savedCategoryType;
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