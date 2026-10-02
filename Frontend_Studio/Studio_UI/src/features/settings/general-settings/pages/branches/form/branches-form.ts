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
    Branches,
    CreateBranches,
    UpdateBranches
}
from '../../../models/branches.model';

import
{
    BranchesService
}
from '../../../services/branches.service';

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


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'branches-form',

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

    templateUrl:'./branches-form.html',

    styleUrls:
    [
        './branches-form.css'
    ]
})

export class BranchesForm
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly branchesService =
        inject(BranchesService);

    private readonly companyService =
        inject(CompanyService);

    private readonly wingsService =
        inject(WingsService);

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
        'Branch';

    entityName:
        string =
        'Branch';



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
        Branches
    =
    {
        BranchId:0,

        CompanyId:0,

        WingId:0,

        BranchCode:'',

        ShortName:'',

        BranchName:'',

        Mobile:'',

        Email:'',

        Address:'',

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
            BranchId:0,

            CompanyId:0,

            WingId:0,

            BranchCode:'',

            ShortName:'',

            BranchName:'',

            Mobile:'',

            Email:'',

            Address:'',

            Remarks:'',

            IsActive:true
        };

        this.updateWingItems();

        this.setInitialFormState();
    }



    //===========================================================
    // Generate Branch Code
    //===========================================================

    private generateBranchCode():
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
            !this.entity.WingId
            ||
            this.entity.WingId <= 0
        )
        {
            this.entity.BranchCode =
                '';

            this.checkForChanges();

            this.cdr.detectChanges();

            return;
        }

        this.branchesService
            .getNextCode(
                this.entity.WingId
            )
            .subscribe
            ({
                next:
                (
                    code:
                        string
                ): void =>
                {
                    this.entity.BranchCode =
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
                        'Generate Branch Code Error',

                        error
                    );

                    this.entity.BranchCode =
                        '';

                    this.toast.error(
                        'Error',

                        'Failed to generate Branch Code.'
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
        this.branchesService
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
                        BranchId:
                            Number(
                                response?.BranchId
                                ??
                                response?.branchId
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

                        BranchCode:
                            response?.BranchCode
                            ??
                            response?.branchCode
                            ??
                            '',

                        ShortName:
                            response?.ShortName
                            ??
                            response?.shortName
                            ??
                            '',

                        BranchName:
                            response?.BranchName
                            ??
                            response?.branchName
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
                        'Load Branch Error',

                        error
                    );

                    this.toast.error(
                        'Error',

                        'Failed to load Branch.'
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

        this.entity.BranchCode =
            '';

        this.updateWingItems();

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
        )
        {
            return;
        }

        this.entity.WingId =
            Number(
                wingId
            );

        this.entity.BranchCode =
            '';

        this.checkForChanges();

        this.cdr.detectChanges();

        if
        (
            this.entity.WingId > 0
        )
        {
            this.generateBranchCode();
        }
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
            !this.entity.BranchCode?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Branch Code is required.'
            );

            return;
        }

        if
        (
            !this.entity.ShortName?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Short Name is required.'
            );

            return;
        }

        if
        (
            !this.entity.BranchName?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Branch Name is required.'
            );

            return;
        }

        if
        (
            !this.entity.Mobile?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Mobile is required.'
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
            CreateBranches =
        {
            CompanyId:
                this.entity.CompanyId,

            WingId:
                this.entity.WingId,

            BranchCode:
                this.entity.BranchCode.trim(),

            ShortName:
                this.entity.ShortName.trim(),

            BranchName:
                this.entity.BranchName.trim(),

            Mobile:
                this.entity.Mobile.trim(),

            Email:
                this.entity.Email?.trim()
                ??
                '',

            Address:
                this.entity.Address.trim(),

            Remarks:
                this.entity.Remarks?.trim()
                ??
                '',

            IsActive:
                this.entity.IsActive
        };

        this.branchesService
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

                        'Branch created successfully.'
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
                        'Create Branch Error',

                        error
                    );

                    const message =
                        (error as any)?.error
                        ??
                        'Failed to create Branch.';

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
            UpdateBranches =
        {
            BranchId:
                this.entity.BranchId,

            CompanyId:
                this.entity.CompanyId,

            WingId:
                this.entity.WingId,

            BranchCode:
                this.entity.BranchCode.trim(),

            ShortName:
                this.entity.ShortName.trim(),

            BranchName:
                this.entity.BranchName.trim(),

            Mobile:
                this.entity.Mobile.trim(),

            Email:
                this.entity.Email?.trim()
                ??
                '',

            Address:
                this.entity.Address.trim(),

            Remarks:
                this.entity.Remarks?.trim()
                ??
                '',

            IsActive:
                this.entity.IsActive
        };

        this.branchesService
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

                        'Branch updated successfully.'
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
                        'Update Branch Error',

                        error
                    );

                    const message =
                        (error as any)?.error
                        ??
                        'Failed to update Branch.';

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

                    'branches',

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

                        'branches',

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