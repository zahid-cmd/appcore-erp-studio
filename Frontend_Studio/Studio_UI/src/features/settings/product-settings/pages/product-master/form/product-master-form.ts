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
    ProductMaster,
    CreateProductMaster,
    UpdateProductMaster
}
from '../../../models/product-master.model';

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
// Local Types
//===============================================================

interface CategoryOption
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

interface SubCategoryOption
{
    ProductSubCategoryId:
        number;
    ProductCategoryId:
        number;
    SubCategoryCode:
        string;
    SubCategoryName:
        string;
    IsActive:
        boolean;
}

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
        ConfirmDialogComponent,
        ProgressDialogComponent
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
implements OnInit, OnDestroy
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
    // Product Categories
    //===========================================================

    private productCategories:
        CategoryOption[] =
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
    // Product Sub Categories
    //===========================================================

    private allProductSubCategories:
        SubCategoryOption[] =
        [];

    private productSubCategories:
        SubCategoryOption[] =
        [];

    productSubCategoryItems:
        any[] =
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
        ProductMaster =
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

        this.loadAllProductSubCategories();

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
        ProductMaster
    {
        return {
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
    // Load All Product Sub Categories (once)
    //===========================================================

    private loadAllProductSubCategories():
        void
    {
        this.productSubCategoryService
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

                    this.allProductSubCategories =
                        list.map
                        (
                            item =>
                            ({
                                ProductSubCategoryId:
                                    Number(
                                        item?.ProductSubCategoryId
                                        ??
                                        item?.productSubCategoryId
                                        ??
                                        0
                                    ),
                                ProductCategoryId:
                                    Number(
                                        item?.ProductCategoryId
                                        ??
                                        item?.productCategoryId
                                        ??
                                        0
                                    ),
                                SubCategoryCode:
                                    item?.SubCategoryCode
                                    ??
                                    item?.subCategoryCode
                                    ??
                                    '',
                                SubCategoryName:
                                    item?.SubCategoryName
                                    ??
                                    item?.subCategoryName
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

                    this.buildProductSubCategoryItems();
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

                    this.allProductSubCategories =
                        [];

                    this.buildProductSubCategoryItems();

                    this.toast.error(
                        'Error',
                        'Failed to load Product Sub Categories.'
                    );
                }
            });
    }

    //===========================================================
    // Build Product Category Items
    //
    // Active categories, plus the currently selected one so an
    // existing record still shows it in Edit / View mode.
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
    // Build Product Sub Category Items
    //
    // Sub categories of the selected category: active ones, plus
    // the currently selected one in Edit / View mode.
    //===========================================================

    private buildProductSubCategoryItems():
        void
    {
        const categoryId =
            Number(
                this.entity.ProductCategoryId
                ??
                0
            );

        const selectedId =
            Number(
                this.entity.ProductSubCategoryId
                ??
                0
            );

        this.productSubCategories =
            categoryId > 0
                ? this.allProductSubCategories.filter
                (
                    item =>
                        item.ProductCategoryId ===
                        categoryId
                        &&
                        (
                            item.IsActive
                            ||
                            item.ProductSubCategoryId ===
                            selectedId
                        )
                )
                : [];

        this.productSubCategoryItems =
        [
            {
                label:'Select Product Sub Category',
                value:null
            },
            ...this.productSubCategories.map
            (
                item =>
                ({
                    label:
                        `${item.SubCategoryCode} - ${item.SubCategoryName}`,
                    value:
                        item.ProductSubCategoryId
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

        this.buildProductSubCategoryItems();

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
            ||
            this.isEditMode
        )
        {
            return;
        }

        this.entity.ProductCategoryId =
            Number(
                this.entity.ProductCategoryId
                ??
                0
            );

        const category =
            this.productCategories.find
            (
                item =>
                    item.ProductCategoryId ===
                    this.entity.ProductCategoryId
            );

        this.entity.ProductCategoryName =
            category?.CategoryName
            ??
            '';

        //=======================================================
        // Reset Sub Category & Codes
        //=======================================================

        this.defaultsRequestId++;

        this.entity.ProductSubCategoryId =
            0;

        this.entity.ProductSubCategoryName =
            '';

        this.entity.SubCategoryCode =
            '';

        this.clearGeneratedCodes();

        this.buildProductSubCategoryItems();

        this.checkForChanges();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Product Sub Category Change
    //===========================================================

    onProductSubCategoryChange():
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

        const productSubCategoryId =
            Number(
                this.entity.ProductSubCategoryId
                ??
                0
            );

        const selected =
            this.productSubCategories.find
            (
                item =>
                    item.ProductSubCategoryId ===
                    productSubCategoryId
            );

        this.defaultsRequestId++;

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

        this.generateDefaults();

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

        //=======================================================
        // Ignore stale responses if the selection changes again
        //=======================================================

        const requestId =
            ++this.defaultsRequestId;

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
                    if
                    (
                        requestId !==
                        this.defaultsRequestId
                    )
                    {
                        return;
                    }

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
                        'Generate Product Master Defaults Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to generate Product Master defaults.'
                        )
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

        //=======================================================
        // Ledger names are auto-built in Add mode only;
        // they are locked in Edit mode.
        //=======================================================

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

                    this.buildProductCategoryItems();

                    this.buildProductSubCategoryItems();

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
                        'Load Product Master Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Failed to load Product Master.'
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
                'Product Code is required. Please wait for the code to generate.'
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
        CreateProductMaster
    {
        return {
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
    }

    //===========================================================
    // Create
    //===========================================================

    private saveCreate():
        void
    {
        const model:
            CreateProductMaster =
            this.buildPayload();

        this.isSaving =
            true;

        this.startProgress(
            'Saving Product Master',
            'Creating product master and its Inventory, WIP and COGS general ledgers...'
        );

        this.withMinimumDuration(
            this.productMasterService.create(
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
                    'Product Master saved successfully.',
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
                            'Product Master created successfully.'
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
                    'Create Product Master Error',
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
                                'Failed to create Product Master.'
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
            UpdateProductMaster =
        {
            ProductMasterId:
                this.entity.ProductMasterId,

            ...this.buildPayload()
        };

        this.isSaving =
            true;

        this.startProgress(
            'Updating Product Master',
            'Updating product master and its general ledgers...'
        );

        this.withMinimumDuration(
            this.productMasterService.update(
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
                    'Product Master updated successfully.',
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
                            'Product Master updated successfully.'
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
                    'Update Product Master Error',
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
                                'Failed to update Product Master.'
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
            'product-master',
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