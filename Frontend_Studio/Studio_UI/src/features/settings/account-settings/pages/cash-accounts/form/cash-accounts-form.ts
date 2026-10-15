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

import
{
    BranchesService
}
from '../../../../general-settings/services/branches.service';


//===============================================================
// Constants
//===============================================================

// Cash Accounts are reserved to this Account Sub Group only.
// SUB-003-002-001 - Cash In Hand
const RESERVED_SUB_GROUP_CODE:
    string =
    'SUB-003-002-001';


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


    private readonly branchesService =
        inject(BranchesService);


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
    // AccountSubGroup Items (Reserved Only)
    //===========================================================

    accountSubGroupItems:
        any[] =
    [];


    private reservedSubGroupId:
        number =
        0;



    //===========================================================
    // Status Items
    //===========================================================

    statusItems:
        any[] =
    [
        { label:'Active', value:true },

        { label:'Inactive', value:false }
    ];



    //===========================================================
    // Yes / No Items
    //===========================================================

    yesNoItems:
        any[] =
    [
        { label:'Yes', value:true },

        { label:'No', value:false }
    ];



    //===========================================================
    // Branch Items
    //===========================================================

    branchItems:
        any[] =
    [];


    // BranchName -> Branch Short Name
    private branchShortNames:
        Map<string, string> =
        new Map<string, string>();



    //===========================================================
    // Entity
    //===========================================================

    entity:
        CashAccount =
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


    isLoadingSubGroups:
        boolean =
        false;



    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.loadBranchItems();

        this.loadAccountSubGroups();

        this.initializeMode();
    }



    //===========================================================
    // Empty Entity
    //===========================================================

    private createEmptyEntity():
        CashAccount
    {
        return {
            CashAccountId:0,

            AccountSubGroupsId:0,

            CashAccountCode:'',

            CashAccountName:'',

            Remarks:'',

            Status:true,

            Branch:'',

            DisplayName:'',

            CollectionAccount:false,

            PaymentAccount:false
        };
    }



    //===========================================================
    // Load Branch Items
    //===========================================================

    private loadBranchItems():
        void
    {
        this.branchesService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        any[]
                ):
                    void =>
                {
                    const activeBranches =
                        response
                            .filter(
                                item =>
                                    item.IsActive
                            );


                    this.branchShortNames =
                        new Map<string, string>(
                            activeBranches.map(
                                item =>
                                [
                                    item.BranchName,

                                    (
                                        item.BranchShortName
                                        ??
                                        item.branchShortName
                                        ??
                                        item.ShortName
                                        ??
                                        item.shortName
                                        ??
                                        ''
                                    ).toString().trim()
                                ]
                            )
                        );


                    this.branchItems =
                        activeBranches.map(
                            item =>
                            ({
                                label:
                                    `${item.BranchCode} - ${item.BranchName}`,

                                value:
                                    item.BranchName
                            })
                        );


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
                        'Load Branch Items Error:',

                        error
                    );


                    this.branchItems =
                        [];


                    this.branchShortNames.clear();


                    this.toast.error(
                        'Error',

                        'Failed to load branches.'
                    );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Load Account Sub Groups (Reserved : Cash In Hand)
    //===========================================================

    private loadAccountSubGroups():
        void
    {
        this.isLoadingSubGroups =
            true;


        this.accountSubGroupService
            .getAll()
            .subscribe
            ({
                next:
                (
                    subGroups:
                        AccountSubGroup[]
                ): void =>
                {
                    const reserved =
                        subGroups.find(
                            subGroup =>
                                (subGroup.SubGroupCode ?? '')
                                    .trim()
                                    .toUpperCase()
                                ===
                                RESERVED_SUB_GROUP_CODE
                        );


                    if
                    (
                        !reserved
                    )
                    {
                        this.reservedSubGroupId =
                            0;


                        this.accountSubGroupItems =
                            [];


                        this.isLoadingSubGroups =
                            false;


                        this.toast.error(
                            'Error',

                            `Reserved Account Sub Group ${RESERVED_SUB_GROUP_CODE} (Cash In Hand) was not found.`
                        );


                        this.cdr.detectChanges();


                        return;
                    }


                    this.reservedSubGroupId =
                        Number(
                            reserved.AccountSubGroupId
                        );


                    this.accountSubGroupItems =
                    [
                        {
                            label:
                                `${reserved.SubGroupCode} - ${reserved.SubGroupName}`,

                            value:
                                this.reservedSubGroupId
                        }
                    ];


                    this.isLoadingSubGroups =
                        false;


                    this.applyReservedSubGroup();


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


                    this.reservedSubGroupId =
                        0;


                    this.isLoadingSubGroups =
                        false;


                    this.toast.error(
                        'Error',

                        'Failed to load account sub groups.'
                    );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Apply Reserved Sub Group (Add Mode Only)
    //===========================================================

    private applyReservedSubGroup():
        void
    {
        if
        (
            !this.isAddMode
            ||
            this.reservedSubGroupId <= 0
        )
        {
            return;
        }


        this.entity.AccountSubGroupsId =
            this.reservedSubGroupId;


        // Auto-assigned values are part of the initial state,
        // so they should not count as user changes.
        this.generateCashAccountCode(
            true
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
            this.createEmptyEntity();


        this.setInitialFormState();


        this.applyReservedSubGroup();
    }



    //===========================================================
    // Generate CashAccount Code
    //===========================================================

    private generateCashAccountCode
    (
        resetBaseline:
            boolean =
            false
    ):
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


                    if
                    (
                        resetBaseline
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

                        Status:
                            Boolean(response?.Status ?? response?.status ?? true),

                        Branch:
                            response?.Branch ?? response?.branch ?? '',

                        DisplayName:
                            response?.DisplayName ?? response?.displayName ?? '',

                        CollectionAccount:
                            Boolean(response?.CollectionAccount ?? response?.collectionAccount ?? false),

                        PaymentAccount:
                            Boolean(response?.PaymentAccount ?? response?.paymentAccount ?? false)
                    };


                    this.setInitialFormState();
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
    // Display Name
    //
    // Format : <Cash Account Name> - <Branch Short Name>
    //===========================================================

    private buildDisplayName():
        string
    {
        const cashAccountName =
            (this.entity.CashAccountName ?? '').trim();


        const branchShortName =
            this.branchShortNames.get(
                this.entity.Branch ?? ''
            )
            ??
            '';


        if
        (
            cashAccountName
            &&
            branchShortName
        )
        {
            return `${cashAccountName} - ${branchShortName}`;
        }


        return cashAccountName;
    }


    private updateDisplayName():
        void
    {
        this.entity.DisplayName =
            this.buildDisplayName();
    }



    //===========================================================
    // Branch Changed
    //===========================================================

    onBranchChange():
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }


        this.updateDisplayName();


        this.onValueChange();
    }



    //===========================================================
    // Cash Account Name Changed
    //===========================================================

    onCashAccountNameChange():
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }


        this.updateDisplayName();


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


        //=======================================================
        // Validation
        //=======================================================

        if
        (
            this.reservedSubGroupId <= 0
        )
        {
            this.toast.error(
                'Validation',

                `Reserved Account Sub Group ${RESERVED_SUB_GROUP_CODE} (Cash In Hand) is not available.`
            );

            return;
        }


        if
        (
            this.isAddMode
            &&
            this.entity.AccountSubGroupsId !== this.reservedSubGroupId
        )
        {
            this.entity.AccountSubGroupsId =
                this.reservedSubGroupId;
        }


        if
        (
            !this.entity.Branch?.trim()
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


        // Always save the derived display name
        this.updateDisplayName();


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

            Status:
                this.entity.Status,

            Branch:
                this.entity.Branch?.trim() ?? '',

            DisplayName:
                this.entity.DisplayName?.trim() ?? '',

            CollectionAccount:
                this.entity.CollectionAccount,

            PaymentAccount:
                this.entity.PaymentAccount
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
                    this.setInitialFormState();


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

            Status:
                this.entity.Status,

            Branch:
                this.entity.Branch?.trim() ?? '',

            DisplayName:
                this.entity.DisplayName?.trim() ?? '',

            CollectionAccount:
                this.entity.CollectionAccount,

            PaymentAccount:
                this.entity.PaymentAccount
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
                    this.setInitialFormState();


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
        if
        (
            this.mode === 'edit'
        )
        {
            this.loadEntity();

            return;
        }


        // Re-applies the reserved sub group and a fresh code
        this.initializeEntity();
    }



    //===========================================================
    // Back To List
    //===========================================================

    onBackToList():
        void
    {
        const listRoute =
        [
            '/settings',

            'account-settings',

            'cash-accounts',

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
        return this.mode === 'edit'
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
            this.mode === 'edit'
            ||
            this.mode === 'view'
        )
        {
            this.loadEntity();

            return;
        }


        this.initializeEntity();
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