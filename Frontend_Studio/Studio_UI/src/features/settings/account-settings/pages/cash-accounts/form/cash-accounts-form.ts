// PAGE-CLONED : Wings -> Cash Accounts
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
    CashAccount,

    CreateCashAccount,

    UpdateCashAccount
}
from '../../../models/cash-accounts.model';

import
{
    CashAccountsService
}
from '../../../services/cash-accounts.service';

import
{
    AccountSubGroup
}
from '../../../models/account-sub-group.model';

import
{
    AccountSubGroupService
}
from '../../../services/account-sub-group.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'cash-accounts-form',

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

        SearchDropdownComponent,

        TextareaComponent,

        DropdownComponent,


        //=======================================================
        // Utilities
        //=======================================================

        ToastComponent,

        ConfirmDialogComponent
    ],


    templateUrl:'./cash-accounts-form.html',


    styleUrls:
    [
        './cash-accounts-form.css'
    ]
})


export class CashAccountsForm
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);


    private readonly router =
        inject(Router);


    private readonly cashAccountsService =
        inject(CashAccountsService);


    private readonly accountSubGroupService =
        inject(AccountSubGroupService);


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
        'CashAccount';


    entityName:
        string =
        'CashAccount';



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
    // AccountSubGroup Items
    //===========================================================

    accountSubGroupItems:
        any[]
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
        CashAccount
    =
    {
        CashAccountId:0,

        AccountSubGroupsId:0,

        CashAccountCode:'',

        CashAccountName:'',

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


        this.accountSubGroupService
            .getAll()
            .subscribe
            ({
                next:
                (
                    companies:
                        AccountSubGroup[]
                ): void =>
                {
                    this.accountSubGroupItems =
                        companies.map
                        (
                            accountSubGroup =>
                            ({
                                label:
                                    accountSubGroup.SubGroupCode
                                    +
                                    ' - '
                                    +
                                    accountSubGroup.SubGroupName,

                                value:
                                    accountSubGroup.AccountSubGroupId
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
                        'Load AccountSubGroup Error',

                        error
                    );


                    this.accountSubGroupItems =
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
        CashAccountId:0,

        AccountSubGroupsId:0,

        CashAccountCode:'',

        CashAccountName:'',

        Remarks:'',

        IsActive:true
    };


        this.setInitialFormState();
    }



    //===========================================================
    // Generate CashAccount Code
    //===========================================================

    private generateCashAccountCode():
        void
    {
        //=======================================================
        // Existing Record
        //=======================================================

        if
        (
            this.entityId > 0
        )
        {
            return;
        }


        //=======================================================
        // AccountSubGroup Required
        //
        // CashAccount Code is accountSubGroup dependent.
        //=======================================================

        if
        (
            !this.entity.AccountSubGroupsId
            ||
            this.entity.AccountSubGroupsId <= 0
        )
        {
            this.entity.CashAccountCode =
                '';


            this.checkForChanges();


            this.cdr.detectChanges();


            return;
        }


        //=======================================================
        // Backend Generation
        //
        // AccountSubGroupsId is required because CashAccount Code is
        // generated independently for each AccountSubGroup.
        //=======================================================

        this.cashAccountsService
            .getNextCode(
                this.entity.AccountSubGroupsId
            )
            .subscribe
            ({
                next:
                (
                    code:
                        string
                ): void =>
                {
                    this.entity.CashAccountCode =
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
                        'Generate CashAccount Code Error',

                        error
                    );


                    this.entity.CashAccountCode =
                        '';


                    this.toast.error(
                        'Error',

                        'Failed to generate CashAccount Code.'
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
        this.cashAccountsService
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
                    console.log(
                        'CashAccount API Response:',

                        response
                    );


                    this.entity =
                    {
                        CashAccountId:
                            Number(response?.CashAccountId ?? response?.cashAccountId ?? 0),

                        AccountSubGroupsId:
                            Number(response?.AccountSubGroupsId ?? response?.accountSubGroupsId ?? 0),

                        CashAccountCode:
                            response?.CashAccountCode ?? response?.cashAccountCode ?? '',

                        CashAccountName:
                            response?.CashAccountName ?? response?.cashAccountName ?? '',

                        Remarks:
                            response?.Remarks ?? response?.remarks ?? '',

                        IsActive:
                            Boolean(response?.IsActive ?? response?.isActive ?? true)
                    };


                    console.log(
                        'CashAccount Form Entity:',

                        this.entity
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
                        'Load CashAccount Error',

                        error
                    );


                    this.toast.error(
                        'Error',

                        'Failed to load CashAccount.'
                    );


                    this.onBackToList();
                }
            });
    }



    //===========================================================
    // AccountSubGroup Changed
    //===========================================================

    onAccountSubGroupChange
    (
        accountSubGroupsId:
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


        this.entity.AccountSubGroupsId =
            Number(
                accountSubGroupsId
            );


        //=======================================================
        // AccountSubGroup Change Invalidates Current CashAccount Code
        //=======================================================

        this.entity.CashAccountCode =
            '';


        this.checkForChanges();


        this.cdr.detectChanges();


        //=======================================================
        // Backend CashAccount Code Generation
        //=======================================================

        if
        (
            this.entity.AccountSubGroupsId > 0
        )
        {
            this.generateCashAccountCode();
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
            !this.entity.AccountSubGroupsId
            ||
            this.entity.AccountSubGroupsId <= 0
        )
        {
            this.toast.error(
                'Validation',

                'Account Sub Groups Id is required.'
            );

            return;
        }


        if
        (
            !this.entity.CashAccountCode?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Cash Account Code is required.'
            );

            return;
        }


        if
        (
            !this.entity.CashAccountName?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Cash Account Name is required.'
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
            CreateCashAccount =
        {

            AccountSubGroupsId:
                this.entity.AccountSubGroupsId,

            CashAccountCode:
                this.entity.CashAccountCode?.trim() ?? '',

            CashAccountName:
                this.entity.CashAccountName?.trim() ?? '',

            Remarks:
                this.entity.Remarks?.trim() ?? '',

            IsActive:
                this.entity.IsActive
        };


        this.cashAccountsService
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

                        'CashAccount created successfully.'
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
                        'Create CashAccount Error',

                        error
                    );


                    const message =
                        (error as any)?.error
                        ??
                        'Failed to create CashAccount.';


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
            UpdateCashAccount =
        {
            CashAccountId:
                this.entity.CashAccountId,

            AccountSubGroupsId:
                this.entity.AccountSubGroupsId,

            CashAccountCode:
                this.entity.CashAccountCode?.trim() ?? '',

            CashAccountName:
                this.entity.CashAccountName?.trim() ?? '',

            Remarks:
                this.entity.Remarks?.trim() ?? '',

            IsActive:
                this.entity.IsActive
        };


        this.cashAccountsService
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

                        'CashAccount updated successfully.'
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
                        'Update CashAccount Error',

                        error
                    );


                    const message =
                        (error as any)?.error
                        ??
                        'Failed to update CashAccount.';


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

                    'account-settings',

                    'cash-accounts',

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

                        'account-settings',

                        'cash-accounts',

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