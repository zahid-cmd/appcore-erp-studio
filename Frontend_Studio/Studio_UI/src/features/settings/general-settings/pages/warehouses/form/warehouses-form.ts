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


//===============================================================
// Models & Services
//===============================================================

import
{
    Warehouses,
    CreateWarehouses,
    UpdateWarehouses
}
from '../../../models/warehouses.model';

import
{
    WarehousesService
}
from '../../../services/warehouses.service';

import
{
    Company
}
from '../../../models/company.model';

import
{
    CompanyService
}
from '../../../services/company.service';

import
{
    Wing
}
from '../../../models/wings.model';

import
{
    WingsService
}
from '../../../services/wings.service';

import
{
    Branches
}
from '../../../models/branches.model';

import
{
    BranchesService
}
from '../../../services/branches.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'warehouses-form',

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

        ConfirmDialogComponent
    ],

    templateUrl:'./warehouses-form.html',

    styleUrls:
    [
        './warehouses-form.css'
    ]
})


export class WarehousesForm
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly warehousesService =
        inject(WarehousesService);

    private readonly companyService =
        inject(CompanyService);

    private readonly wingsService =
        inject(WingsService);

    private readonly branchesService =
        inject(BranchesService);

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
        'Warehouse';

    entityName:
        string =
        'Warehouse';



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
    // Company Items
    //===========================================================

    companyItems:
        any[]
    =
    [];



    //===========================================================
    // Wing Items
    //===========================================================

    wingItems:
        any[]
    =
    [];

    private allWings:
        Wing[]
    =
    [];



    //===========================================================
    // Branch Items
    //===========================================================

    branchItems:
        any[]
    =
    [];

    private allBranches:
        Branches[]
    =
    [];



    //===========================================================
    // Default Items
    //===========================================================

    defaultItems:
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
        Warehouses
    =
    {
        WarehouseId:0,

        CompanyId:0,

        WingId:0,

        BranchId:0,

        WarehouseCode:'',

        WarehouseName:'',

        DisplayName:'',

        Mobile:'',

        Email:'',

        Address:'',

        IsBranchGenerated:false,

        IsDefault:false,

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

    isLoadingCompanies:
        boolean =
        false;



    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.loadCompanies();

        this.loadWings();

        this.loadBranches();

        this.initializeMode();
    }



    //===========================================================
    // Load Companies
    //===========================================================

    private loadCompanies():
        void
    {
        this.isLoadingCompanies =
            true;

        this.companyService
            .getAll()
            .subscribe
            ({
                next:
                (
                    companies:
                        Company[]
                ): void =>
                {
                    this.companyItems =
                        companies.map
                        (
                            company =>
                            ({
                                label:
                                    company.CompanyCode
                                    +
                                    ' - '
                                    +
                                    company.CompanyName,

                                value:
                                    company.CompanyId
                            })
                        );

                    this.isLoadingCompanies =
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
                        'Load Company Error',

                        error
                    );

                    this.companyItems =
                        [];

                    this.isLoadingCompanies =
                        false;

                    this.toast.error(
                        'Error',

                        'Failed to load companies.'
                    );

                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Load Wings
    //===========================================================

    private loadWings():
        void
    {
        this.wingsService
            .getAll()
            .subscribe
            ({
                next:
                (
                    wings:
                        Wing[]
                ): void =>
                {
                    this.allWings =
                        wings;

                    this.updateWingItems();

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Wings Error',

                        error
                    );

                    this.allWings =
                        [];

                    this.wingItems =
                        [];

                    this.toast.error(
                        'Error',

                        'Failed to load wings.'
                    );

                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Load Branches
    //===========================================================

    private loadBranches():
        void
    {
        this.branchesService
            .getAll()
            .subscribe
            ({
                next:
                (
                    branches:
                        Branches[]
                ): void =>
                {
                    this.allBranches =
                        branches;

                    this.updateBranchItems();

                    this.updateDisplayName();

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Branches Error',

                        error
                    );

                    this.allBranches =
                        [];

                    this.branchItems =
                        [];

                    this.toast.error(
                        'Error',

                        'Failed to load branches.'
                    );

                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Update Wing Items
    //===========================================================

    private updateWingItems():
        void
    {
        const companyId =
            Number(
                this.entity.CompanyId
            );

        this.wingItems =
            this.allWings
                .filter(
                    wing =>
                        Number(
                            wing.CompanyId
                        )
                        ===
                        companyId
                )
                .map(
                    wing =>
                    ({
                        label:
                            wing.WingCode
                            +
                            ' - '
                            +
                            wing.WingName,

                        value:
                            wing.WingId
                    })
                );
    }



    //===========================================================
    // Update Branch Items
    //===========================================================

    private updateBranchItems():
        void
    {
        const wingId =
            Number(
                this.entity.WingId
            );

        this.branchItems =
            this.allBranches
                .filter(
                    branch =>
                        Number(
                            branch.WingId
                        )
                        ===
                        wingId
                )
                .map(
                    branch =>
                    ({
                        label:
                            branch.BranchCode
                            +
                            ' - '
                            +
                            branch.BranchName,

                        value:
                            branch.BranchId
                    })
                );
    }



    //===========================================================
    // Update Display Name
    //===========================================================

    private updateDisplayName():
        void
    {
        if
        (
            this.entity.IsBranchGenerated
        )
        {
            this.checkForChanges();

            this.cdr.detectChanges();

            return;
        }

        this.checkForChanges();

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
        this.entity =
        {
            WarehouseId:0,

            CompanyId:0,

            WingId:0,

            BranchId:0,

            WarehouseCode:'',

            WarehouseName:'',

            DisplayName:'',

            Mobile:'',

            Email:'',

            Address:'',

            IsBranchGenerated:false,

            IsDefault:false,

            Remarks:'',

            IsActive:true
        };

        this.updateWingItems();

        this.updateBranchItems();

        this.setInitialFormState();
    }



    //===========================================================
    // Generate Warehouse Code
    //===========================================================

    private generateWarehouseCode():
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
            !this.entity.BranchId
            ||
            this.entity.BranchId <= 0
        )
        {
            this.entity.WarehouseCode =
                '';

            this.checkForChanges();

            this.cdr.detectChanges();

            return;
        }

        this.warehousesService
            .getNextCode(
                this.entity.BranchId
            )
            .subscribe
            ({
                next:
                (
                    code:
                        string
                ): void =>
                {
                    this.entity.WarehouseCode =
                        code;

                    this.checkForChanges();

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Generate Warehouse Code Error',

                        error
                    );

                    this.entity.WarehouseCode =
                        '';

                    this.toast.error(
                        'Error',

                        'Failed to generate Warehouse Code.'
                    );

                    this.checkForChanges();

                    this.cdr.detectChanges();
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
        this.warehousesService
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
                        WarehouseId:
                            Number(
                                response?.WarehouseId
                                ??
                                response?.warehouseId
                                ??
                                0
                            ),

                        CompanyId:
                            Number(
                                response?.CompanyId
                                ??
                                response?.companyId
                                ??
                                0
                            ),

                        WingId:
                            Number(
                                response?.WingId
                                ??
                                response?.wingId
                                ??
                                0
                            ),

                        BranchId:
                            Number(
                                response?.BranchId
                                ??
                                response?.branchId
                                ??
                                0
                            ),

                        WarehouseCode:
                            response?.WarehouseCode
                            ??
                            response?.warehouseCode
                            ??
                            '',

                        WarehouseName:
                            response?.WarehouseName
                            ??
                            response?.warehouseName
                            ??
                            '',

                        DisplayName:
                            response?.DisplayName
                            ??
                            response?.displayName
                            ??
                            '',

                        Mobile:
                            response?.Mobile
                            ??
                            response?.mobile
                            ??
                            '',

                        Email:
                            response?.Email
                            ??
                            response?.email
                            ??
                            '',

                        Address:
                            response?.Address
                            ??
                            response?.address
                            ??
                            '',

                        IsBranchGenerated:
                            Boolean(
                                response?.IsBranchGenerated
                                ??
                                response?.isBranchGenerated
                                ??
                                false
                            ),

                        IsDefault:
                            Boolean(
                                response?.IsDefault
                                ??
                                response?.isDefault
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

                    this.updateWingItems();

                    this.updateBranchItems();

                    this.updateDisplayName();

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
                        'Load Warehouse Error',

                        error
                    );

                    this.toast.error(
                        'Error',

                        'Failed to load Warehouse.'
                    );

                    this.onBackToList();
                }
            });
    }



    //===========================================================
    // Company Changed
    //===========================================================

    onCompanyChange
    (
        companyId:
            number
    ):
        void
    {
        if
        (
            this.isViewMode
            ||
            this.entity.IsBranchGenerated
        )
        {
            return;
        }

        this.entity.CompanyId =
            Number(
                companyId
            );

        this.entity.WingId =
            0;

        this.entity.BranchId =
            0;

        this.entity.WarehouseCode =
            '';

        this.entity.DisplayName =
            '';

        this.updateWingItems();

        this.updateBranchItems();

        this.checkForChanges();

        this.cdr.detectChanges();
    }



    //===========================================================
    // Wing Changed
    //===========================================================

    onWingChange
    (
        wingId:
            number
    ):
        void
    {
        if
        (
            this.isViewMode
            ||
            this.entity.IsBranchGenerated
        )
        {
            return;
        }

        this.entity.WingId =
            Number(
                wingId
            );

        this.entity.BranchId =
            0;

        this.entity.WarehouseCode =
            '';

        this.entity.DisplayName =
            '';

        this.updateBranchItems();

        this.checkForChanges();

        this.cdr.detectChanges();
    }



    //===========================================================
    // Branch Changed
    //===========================================================

    onBranchChange
    (
        branchId:
            number
    ):
        void
    {
        if
        (
            this.isViewMode
            ||
            this.entity.IsBranchGenerated
        )
        {
            return;
        }

        this.entity.BranchId =
            Number(
                branchId
            );

        this.entity.WarehouseCode =
            '';

        this.entity.DisplayName =
            '';

        this.checkForChanges();

        this.cdr.detectChanges();

        if
        (
            this.entity.BranchId > 0
        )
        {
            this.generateWarehouseCode();
        }
    }



    //===========================================================
    // Warehouse Name Changed
    //===========================================================

    onWarehouseNameChange():
        void
    {
        if
        (
            this.isViewMode
            ||
            this.entity.IsBranchGenerated
        )
        {
            return;
        }

        this.onValueChange();
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
        )
        {
            return;
        }

        if
        (
            !this.entity.CompanyId
            ||
            this.entity.CompanyId <= 0
        )
        {
            this.toast.error(
                'Validation',

                'Company is required.'
            );

            return;
        }

        if
        (
            !this.entity.WingId
            ||
            this.entity.WingId <= 0
        )
        {
            this.toast.error(
                'Validation',

                'Wing is required.'
            );

            return;
        }

        if
        (
            !this.entity.BranchId
            ||
            this.entity.BranchId <= 0
        )
        {
            this.toast.error(
                'Validation',

                'Branch is required.'
            );

            return;
        }

        if
        (
            !this.entity.WarehouseCode?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Warehouse Code is required.'
            );

            return;
        }

        if
        (
            !this.entity.WarehouseName?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Warehouse Name is required.'
            );

            return;
        }

        if
        (
            !this.entity.DisplayName?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Display Name is required.'
            );

            return;
        }

        if
        (
            !this.entity.Address?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Address is required.'
            );

            return;
        }

        if
        (
            this.mode === 'add'
        )
        {
            this.saveCreate();

            return;
        }

        this.saveUpdate();
    }



    //===========================================================
    // Create
    //===========================================================

    private saveCreate():
        void
    {
        const model:
            CreateWarehouses =
        {
            CompanyId:
                this.entity.CompanyId,

            WingId:
                this.entity.WingId,

            BranchId:
                this.entity.BranchId,

            WarehouseCode:
                this.entity.WarehouseCode.trim(),

            WarehouseName:
                this.entity.WarehouseName.trim(),

            DisplayName:
                this.entity.DisplayName.trim(),

            Mobile:
                this.entity.Mobile?.trim()
                ??
                '',

            Email:
                this.entity.Email?.trim()
                ??
                '',

            Address:
                this.entity.Address?.trim()
                ??
                '',

            IsBranchGenerated:
                this.entity.IsBranchGenerated,

            IsDefault:
                this.entity.IsDefault,

            Remarks:
                this.entity.Remarks?.trim()
                ??
                '',

            IsActive:
                this.entity.IsActive
        };

        this.warehousesService
            .create(
                model
            )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.originalEntity =
                        JSON.stringify(
                            this.entity
                        );

                    this.hasChanges =
                        false;

                    this.toast.success(
                        'Success',

                        'Warehouse created successfully.'
                    );

                    this.onBackToList();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Create Warehouse Error',

                        error
                    );

                    const message =
                        (error as any)?.error
                        ??
                        'Failed to create Warehouse.';

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
            UpdateWarehouses =
        {
            WarehouseId:
                this.entity.WarehouseId,

            CompanyId:
                this.entity.CompanyId,

            WingId:
                this.entity.WingId,

            BranchId:
                this.entity.BranchId,

            WarehouseCode:
                this.entity.WarehouseCode.trim(),

            WarehouseName:
                this.entity.WarehouseName.trim(),

            DisplayName:
                this.entity.DisplayName.trim(),

            Mobile:
                this.entity.Mobile?.trim()
                ??
                '',

            Email:
                this.entity.Email?.trim()
                ??
                '',

            Address:
                this.entity.Address?.trim()
                ??
                '',

            IsBranchGenerated:
                this.entity.IsBranchGenerated,

            IsDefault:
                this.entity.IsDefault,

            Remarks:
                this.entity.Remarks?.trim()
                ??
                '',

            IsActive:
                this.entity.IsActive
        };

        this.warehousesService
            .update(
                model
            )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.originalEntity =
                        JSON.stringify(
                            this.entity
                        );

                    this.hasChanges =
                        false;

                    this.toast.success(
                        'Success',

                        'Warehouse updated successfully.'
                    );

                    this.onBackToList();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Update Warehouse Error',

                        error
                    );

                    const message =
                        (error as any)?.error
                        ??
                        'Failed to update Warehouse.';

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
        if
        (
            this.mode === 'edit'
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
            !this.hasChanges
        )
        {
            void this.router.navigate
            (
                [
                    '/settings',

                    'general-settings',

                    'warehouses',

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

                        'general-settings',

                        'warehouses',

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