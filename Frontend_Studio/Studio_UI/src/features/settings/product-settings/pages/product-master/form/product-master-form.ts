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
    ProductMaster,
    CreateProductMaster,
    UpdateProductMaster
}
from '../../../models/product-master.model';
import
{
    ProductCategory
}
from '../../../models/product-category.model';
import
{
    ProductSubCategory
}
from '../../../models/product-sub-category.model';
import
{
    ProductMasterService
}
from '../../../services/product-master.service';
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
//===============================================================
// Component
//===============================================================
@Component(
{
    selector:'product-master-form',
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
    templateUrl:'./product-master-form.html',
    styleUrls:
    [
        './product-master-form.css'
    ]
})
//===============================================================
// Product Master Form
//===============================================================
export class ProductMasterForm
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================
    private readonly route =
        inject(ActivatedRoute);
    private readonly router =
        inject(Router);
    private readonly productMasterService =
        inject(ProductMasterService);
    private readonly productCategoryService =
        inject(ProductCategoryService);
    private readonly productSubCategoryService =
        inject(ProductSubCategoryService);
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
        'Product Master';
    entityName:
        string =
        'Product Master';
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
    // Product Sub Categories
    //===========================================================
    productSubCategories:
        ProductSubCategory[]
        = [];
    productSubCategoryItems:
        any[]
        =
        [
            {
                label:'Select Product Sub Category',
                value:null
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
        ProductMaster
        =
        {
            ProductMasterId:0,
            ProductCategoryId:0,
            ProductCategoryName:'',
            ProductSubCategoryId:0,
            ProductSubCategoryName:'',
            SubCategoryCode:'',
            ProductCode:'',
            ProductName:'',
            InventoryLedgerCode:'',
            WipLedgerCode:'',
            CogsLedgerCode:'',
            InventoryLedgerName:'',
            WipLedgerName:'',
            CogsLedgerName:'',
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
                        ...(response ?? [])
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
    // Load Product Sub Categories
    //===========================================================
    private loadProductSubCategories
    (
        productCategoryId:
            number,
        selectedSubCategoryId:
            number = 0
    ):
        void
    {
        if
        (
            !productCategoryId
        )
        {
            this.productSubCategories =
                [];
            this.productSubCategoryItems =
            [
                {
                    label:'Select Product Sub Category',
                    value:null
                }
            ];
            return;
        }
        this.productSubCategoryService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        ProductSubCategory[]
                ):
                    void =>
                {
                    this.productSubCategories =
                        (response ?? [])
                            .filter
                            (
                                (
                                    item:
                                        ProductSubCategory
                                ):
                                    boolean =>
                                    (
                                        item.IsActive
                                        &&
                                        item.ProductCategoryId ===
                                        Number(productCategoryId)
                                    )
                            );
                    this.productSubCategoryItems =
                    [
                        {
                            label:'Select Product Sub Category',
                            value:null
                        },
                        ...this.productSubCategories.map
                        (
                            (
                                item:
                                    ProductSubCategory
                            ) =>
                            ({
                                label:
                                    `${item.SubCategoryCode} - ${item.SubCategoryName}`,
                                value:
                                    item.ProductSubCategoryId
                            })
                        )
                    ];
                    //===================================================
                    // Restore Existing Product Sub Category
                    //===================================================
                    if
                    (
                        selectedSubCategoryId > 0
                    )
                    {
                        const selected =
                            this.productSubCategories.find
                            (
                                (
                                    item:
                                        ProductSubCategory
                                ):
                                    boolean =>
                                    item.ProductSubCategoryId ===
                                    Number(selectedSubCategoryId)
                            );
                        if
                        (
                            selected
                        )
                        {
                            this.entity.ProductSubCategoryId =
                                selected.ProductSubCategoryId;
                            this.entity.SubCategoryCode =
                                selected.SubCategoryCode;
                            this.entity.ProductSubCategoryName =
                                selected.SubCategoryName;
                        }
                    }
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
                        'Load Product Sub Categories Error',
                        error
                    );
                    this.productSubCategories =
                        [];
                    this.productSubCategoryItems =
                    [
                        {
                            label:'Select Product Sub Category',
                            value:null
                        }
                    ];
                    this.toast.error(
                        'Error',
                        'Failed to load Product Sub Categories.'
                    );
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
            ProductMasterId:0,
            ProductCategoryId:0,
            ProductCategoryName:'',
            ProductSubCategoryId:0,
            ProductSubCategoryName:'',
            SubCategoryCode:'',
            ProductCode:'',
            ProductName:'',
            InventoryLedgerCode:'',
            WipLedgerCode:'',
            CogsLedgerCode:'',
            InventoryLedgerName:'',
            WipLedgerName:'',
            CogsLedgerName:'',
            Remarks:'',
            IsActive:true
        };
        this.productSubCategories =
            [];
        this.productSubCategoryItems =
        [
            {
                label:'Select Product Sub Category',
                value:null
            }
        ];
        this.setInitialFormState();
    }
    //===========================================================
    // Clear Generated Codes
    //===========================================================
    private clearGeneratedCodes():
        void
    {
        this.entity.ProductCode =
            '';
        this.entity.InventoryLedgerCode =
            '';
        this.entity.WipLedgerCode =
            '';
        this.entity.CogsLedgerCode =
            '';
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
        this.entity.ProductSubCategoryId =
            0;
        this.entity.ProductSubCategoryName =
            '';
        this.entity.SubCategoryCode =
            '';
        this.clearGeneratedCodes();
        this.loadProductSubCategories(
            productCategoryId
        );
        this.checkForChanges();
        this.cdr.detectChanges();
    }
    //===========================================================
    // Product Sub Category Change
    //===========================================================
    onProductSubCategoryChange
    (
        updateCode:
            boolean = true
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
        const productSubCategoryId =
            Number(
                this.entity.ProductSubCategoryId
                ??
                0
            );
        const selected =
            this.productSubCategories.find
            (
                (
                    item:
                        ProductSubCategory
                ):
                    boolean =>
                    item.ProductSubCategoryId ===
                    productSubCategoryId
            );
        this.clearGeneratedCodes();
        if
        (
            !selected
        )
        {
            this.entity.ProductSubCategoryId =
                0;
            this.entity.ProductSubCategoryName =
                '';
            this.entity.SubCategoryCode =
                '';
            this.checkForChanges();
            this.cdr.detectChanges();
            return;
        }
        this.entity.ProductSubCategoryId =
            selected.ProductSubCategoryId;
        this.entity.ProductSubCategoryName =
            selected.SubCategoryName;
        this.entity.SubCategoryCode =
            selected.SubCategoryCode;
        if
        (
            updateCode
        )
        {
            this.generateDefaults();
        }
        this.checkForChanges();
        this.cdr.detectChanges();
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
        const productSubCategoryId =
            Number(
                this.entity.ProductSubCategoryId
            );
        if
        (
            !productSubCategoryId
            ||
            productSubCategoryId <= 0
        )
        {
            return;
        }
        this.productMasterService
            .getDefaults(
                productSubCategoryId
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
                    this.entity.ProductCode =
                        String(
                            response?.Code
                            ??
                            response?.code
                            ??
                            ''
                        ).trim();
                    this.entity.InventoryLedgerCode =
                        String(
                            response?.InventoryLedgerCode
                            ??
                            response?.inventoryLedgerCode
                            ??
                            ''
                        ).trim();
                    this.entity.WipLedgerCode =
                        String(
                            response?.WipLedgerCode
                            ??
                            response?.wipLedgerCode
                            ??
                            ''
                        ).trim();
                    this.entity.CogsLedgerCode =
                        String(
                            response?.CogsLedgerCode
                            ??
                            response?.cogsLedgerCode
                            ??
                            ''
                        ).trim();
                    this.entity.IsActive =
                        true;
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
                        'Generate Product Master Defaults Error',
                        error
                    );
                    this.toast.error(
                        'Error',
                        'Failed to generate Product Master defaults.'
                    );
                }
            });
    }
    //===========================================================
    // Product Name Change
    //===========================================================
    onProductNameChange():
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
            this.isAddMode
        )
        {
            const productName =
                this.entity.ProductName?.trim()
                ??
                '';
            this.entity.InventoryLedgerName =
                productName
                    ? `INV - ${productName}`
                    : '';
            this.entity.WipLedgerName =
                productName
                    ? `WIP - ${productName}`
                    : '';
            this.entity.CogsLedgerName =
                productName
                    ? `COGS - ${productName}`
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
        this.productMasterService
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
                        ProductMasterId:
                            Number(
                                response?.ProductMasterId
                                ??
                                response?.productMasterId
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
                        ProductCategoryName:
                            response?.ProductCategoryName
                            ??
                            response?.productCategoryName
                            ??
                            '',
                        ProductSubCategoryId:
                            Number(
                                response?.ProductSubCategoryId
                                ??
                                response?.productSubCategoryId
                                ??
                                0
                            ),
                        ProductSubCategoryName:
                            response?.ProductSubCategoryName
                            ??
                            response?.productSubCategoryName
                            ??
                            '',
                        SubCategoryCode:
                            response?.SubCategoryCode
                            ??
                            response?.subCategoryCode
                            ??
                            '',
                        ProductCode:
                            response?.ProductCode
                            ??
                            response?.productCode
                            ??
                            '',
                        ProductName:
                            response?.ProductName
                            ??
                            response?.productName
                            ??
                            '',
                        InventoryLedgerCode:
                            response?.InventoryLedgerCode
                            ??
                            response?.inventoryLedgerCode
                            ??
                            '',
                        WipLedgerCode:
                            response?.WipLedgerCode
                            ??
                            response?.wipLedgerCode
                            ??
                            '',
                        CogsLedgerCode:
                            response?.CogsLedgerCode
                            ??
                            response?.cogsLedgerCode
                            ??
                            '',
                        InventoryLedgerName:
                            response?.InventoryLedgerName
                            ??
                            response?.inventoryLedgerName
                            ??
                            '',
                        WipLedgerName:
                            response?.WipLedgerName
                            ??
                            response?.wipLedgerName
                            ??
                            '',
                        CogsLedgerName:
                            response?.CogsLedgerName
                            ??
                            response?.cogsLedgerName
                            ??
                            '',
                        // TODO: Map Product Master specific configuration fields here
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
                    this.loadProductSubCategories(
                        this.entity.ProductCategoryId,
                        this.entity.ProductSubCategoryId
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
                ):
                    void =>
                {
                    console.error(
                        'Load Product Master Error',
                        error
                    );
                    this.toast.error(
                        'Error',
                        'Failed to load Product Master.'
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
            !this.entity.ProductSubCategoryId
        )
        {
            this.toast.error(
                'Validation',
                'Product Sub Category is required.'
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
            !this.entity.ProductCode?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Product Code is required.'
            );
            return;
        }
        if
        (
            !this.entity.ProductName?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Product Name is required.'
            );
            return;
        }
        if
        (
            !this.entity.InventoryLedgerCode?.trim()
            ||
            !this.entity.WipLedgerCode?.trim()
            ||
            !this.entity.CogsLedgerCode?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Inventory, WIP and COGS Ledger Codes are required.'
            );
            return;
        }
        if
        (
            !this.entity.InventoryLedgerName?.trim()
            ||
            !this.entity.WipLedgerName?.trim()
            ||
            !this.entity.CogsLedgerName?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Inventory, WIP and COGS Ledger Names are required.'
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
            CreateProductMaster =
        {
            ProductCategoryId:
                this.entity.ProductCategoryId,
            ProductSubCategoryId:
                this.entity.ProductSubCategoryId,
            SubCategoryCode:
                this.entity.SubCategoryCode.trim(),
            ProductCode:
                this.entity.ProductCode.trim(),
            ProductName:
                this.entity.ProductName.trim(),
            InventoryLedgerCode:
                this.entity.InventoryLedgerCode.trim(),
            WipLedgerCode:
                this.entity.WipLedgerCode.trim(),
            CogsLedgerCode:
                this.entity.CogsLedgerCode.trim(),
            InventoryLedgerName:
                this.entity.InventoryLedgerName.trim(),
            WipLedgerName:
                this.entity.WipLedgerName.trim(),
            CogsLedgerName:
                this.entity.CogsLedgerName.trim(),
            Remarks:
                this.entity.Remarks?.trim()
                ??
                '',
            IsActive:
                this.entity.IsActive
        };
        this.productMasterService
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
                        'Product Master created successfully.'
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
                        'Create Product Master Error',
                        error
                    );
                    const message =
                        (error as any)?.error
                        ??
                        'Failed to create Product Master.';
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
            UpdateProductMaster =
        {
            ProductMasterId:
                this.entity.ProductMasterId,
            ProductCategoryId:
                this.entity.ProductCategoryId,
            ProductSubCategoryId:
                this.entity.ProductSubCategoryId,
            SubCategoryCode:
                this.entity.SubCategoryCode.trim(),
            ProductCode:
                this.entity.ProductCode.trim(),
            ProductName:
                this.entity.ProductName.trim(),
            InventoryLedgerCode:
                this.entity.InventoryLedgerCode.trim(),
            WipLedgerCode:
                this.entity.WipLedgerCode.trim(),
            CogsLedgerCode:
                this.entity.CogsLedgerCode.trim(),
            InventoryLedgerName:
                this.entity.InventoryLedgerName.trim(),
            WipLedgerName:
                this.entity.WipLedgerName.trim(),
            CogsLedgerName:
                this.entity.CogsLedgerName.trim(),
            Remarks:
                this.entity.Remarks?.trim()
                ??
                '',
            IsActive:
                this.entity.IsActive
        };
        this.productMasterService
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
                        'Product Master updated successfully.'
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
                        'Update Product Master Error',
                        error
                    );
                    const message =
                        (error as any)?.error
                        ??
                        'Failed to update Product Master.';
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
                    'product-master',
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
                        'product-master',
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
        this.checkForChanges();
        this.cdr.detectChanges();
    }
}