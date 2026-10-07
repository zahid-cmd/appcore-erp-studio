//===============================================================
// Imports
//===============================================================
import
{
    Component,
    OnInit,
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
    ProductCategory
}
from '../../../models/product-category.model';
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
        ConfirmDialogComponent
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
implements OnInit
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
    productCategoryItems:
        any[]
        =
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
        ProductSubCategory
        =
        {
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
                        ProductCategory[]
                ):
                    void =>
                {
                    this.productCategoryItems =
                    [
                        {
                            label:'Select Product Category',
                            value:null
                        },
                        ...response
                            .filter(
                                item =>
                                    item.IsActive
                            )
                            .map
                            (
                                (
                                    item:
                                        ProductCategory
                                ) =>
                                ({
                                    label:
                                        `${item.CategoryCode} - ${item.CategoryName}`,
                                    value:
                                        item.ProductCategoryId
                                })
                            )
                    ];
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
                        'Load Product Categories Error',
                        error
                    );
                    this.productCategoryItems =
                    [
                        {
                            label:'Select Product Category',
                            value:null
                        }
                    ];
                }
            });
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
    // Generate Defaults
    //===========================================================
    private generateDefaults():
        void
    {
        if
        (
            this.entityId > 0
        )
        {
            return;
        }
        if
        (
            !this.entity.ProductCategoryId
            ||
            this.entity.ProductCategoryId <=
            0
        )
        {
            return;
        }
        this.productSubCategoryService
            .getDefaults(
                this.entity.ProductCategoryId
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
                        'Generate Product Sub Category Defaults Error',
                        error
                    );
                    this.toast.error(
                        'Error',
                        'Failed to generate Product Sub Category defaults.'
                    );
                }
            });
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
        // View Mode
        //=======================================================
        if
        (
            this.isViewMode
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
        )
        {
            this.toast.error(
                'Validation',
                'Product Category is required.'
            );
            return;
        }
        if
        (
            !this.entity.SubCategoryCode?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Sub Category Code is required.'
            );
            return;
        }
        if
        (
            !this.entity.SubCategoryName?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Sub Category Name is required.'
            );
            return;
        }
        if
        (
            !this.entity.InventorySubGroupCode?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Inventory Sub Group Code is required.'
            );
            return;
        }
        if
        (
            !this.entity.WipSubGroupCode?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'WIP Sub Group Code is required.'
            );
            return;
        }
        if
        (
            !this.entity.CogsSubGroupCode?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'COGS Sub Group Code is required.'
            );
            return;
        }
        if
        (
            !this.entity.InventorySubGroupName?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Inventory Sub Group Name is required.'
            );
            return;
        }
        if
        (
            !this.entity.WipSubGroupName?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'WIP Sub Group Name is required.'
            );
            return;
        }
        if
        (
            !this.entity.CogsSubGroupName?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'COGS Sub Group Name is required.'
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
            CreateProductSubCategory =
        {
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
        this.productSubCategoryService
            .create(
                model
            )
            .subscribe
            ({
                next:
                ():
                    void =>
                {
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
                    const message =
                        (error as any)?.error
                        ??
                        'Failed to create Product Sub Category.';
                    this.toast.error(
                        'Validation',
                        message
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
        this.productSubCategoryService
            .update(
                model
            )
            .subscribe
            ({
                next:
                ():
                    void =>
                {
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
                    const message =
                        (error as any)?.error
                        ??
                        'Failed to update Product Sub Category.';
                    this.toast.error(
                        'Validation',
                        message
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
                    'product-sub-category',
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
                        'product-sub-category',
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
        if
        (
            this.isViewMode
        )
        {
            return;
        }
        if
        (
            this.entity.ProductCategoryId !==
            this.lastProductCategoryId
        )
        {
            this.lastProductCategoryId =
                this.entity.ProductCategoryId;
            this.entity.SubCategoryCode =
                '';
            this.entity.InventorySubGroupCode =
                '';
            this.entity.WipSubGroupCode =
                '';
            this.entity.CogsSubGroupCode =
                '';
            if
            (
                this.entity.ProductCategoryId > 0
            )
            {
                this.generateDefaults();
                return;
            }
        }
        this.checkForChanges();
        this.cdr.detectChanges();
    }
}
