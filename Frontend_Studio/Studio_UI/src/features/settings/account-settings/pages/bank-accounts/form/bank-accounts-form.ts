// PAGE-CLONED : Cash Accounts -> Bank Accounts
// PAGE-CLONED : Wings -> Bank Accounts
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
    BankAccount,

    CreateBankAccount,

    UpdateBankAccount
}
from '../../../models/bank-accounts.model';

import
{
    BankAccountsService
}
from '../../../services/bank-accounts.service';

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

// Bank Accounts are reserved to this Account Sub Group only.
// SUB-003-002-001 - Cash In Hand
const RESERVED_SUB_GROUP_CODE:
    string =
    'SUB-003-002-001';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'bank-accounts-form',

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


    templateUrl:'./bank-accounts-form.html',


    styleUrls:
    [
        './bank-accounts-form.css'
    ]
})


export class BankAccountsForm
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


    private readonly bankAccountsService =
        inject(BankAccountsService);


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
        'BankAccount';


    entityName:
        string =
        'BankAccount';



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
    // Bank Items
    //===========================================================

    bankItems:
        any[] =
    [];


    //===========================================================
    // Entity
    //===========================================================

    entity:
        BankAccount =
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
        BankAccount
    {
        return {
            BankAccountId:0,

            AccountSubGroupsId:0,

            BankAccountCode:'',

            BankAccountName:'',

            Remarks:'',

            Status:true,

            Branch:'',

            DisplayName:'',

            CollectionAccount:false,

            PaymentAccount:false,

            Bank:''
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
        this.generateBankAccountCode(
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
    // Generate BankAccount Code
    //===========================================================

    private generateBankAccountCode
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
            this.entity.BankAccountCode =
                '';


            this.checkForChanges();


            this.cdr.detectChanges();


            return;
        }


        this.bankAccountsService
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
                    this.entity.BankAccountCode =
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
                        'Generate BankAccount Code Error',

                        error
                    );


                    this.entity.BankAccountCode =
                        '';


                    this.toast.error(
                        'Error',

                        'Failed to generate BankAccount Code.'
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
        this.bankAccountsService
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
                        BankAccountId:
                            Number(response?.BankAccountId ?? response?.bankAccountId ?? 0),

                        AccountSubGroupsId:
                            Number(response?.AccountSubGroupsId ?? response?.accountSubGroupsId ?? 0),

                        BankAccountCode:
                            response?.BankAccountCode ?? response?.bankAccountCode ?? '',

                        BankAccountName:
                            response?.BankAccountName ?? response?.bankAccountName ?? '',

                        Remarks:
                            response?.Remarks ?? response?.remarks ?? '',

                        Status:
                            Boolean(response?.Status ?? response?.status ?? false),

                        Branch:
                            response?.Branch ?? response?.branch ?? '',

                        DisplayName:
                            response?.DisplayName ?? response?.displayName ?? '',

                        CollectionAccount:
                            Boolean(response?.CollectionAccount ?? response?.collectionAccount ?? false),

                        PaymentAccount:
                            Boolean(response?.PaymentAccount ?? response?.paymentAccount ?? false),

                        Bank:
                            response?.Bank ?? response?.bank ?? ''
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
                        'Load BankAccount Error',

                        error
                    );


                    this.toast.error(
                        'Error',

                        'Failed to load BankAccount.'
                    );


                    this.onBackToList();
                }
            });
    }



    //===========================================================
    // Display Name
    //
    // Format : <Bank Account Name> - <Branch Short Name>
    //===========================================================

    private buildDisplayName():
        string
    {
        const bankAccountName =
            (this.entity.BankAccountName ?? '').trim();


        const branchShortName =
            this.branchShortNames.get(
                this.entity.Branch ?? ''
            )
            ??
            '';


        if
        (
            bankAccountName
            &&
            branchShortName
        )
        {
            return `${bankAccountName} - ${branchShortName}`;
        }


        return bankAccountName;
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
    // Bank Account Name Changed
    //===========================================================

    onBankAccountNameChange():
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
            !this.entity.BankAccountCode?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Bank Account Code is required.'
            );

            return;
        }


        if
        (
            !this.entity.BankAccountName?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Bank Account Name is required.'
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
            CreateBankAccount =
        {

            AccountSubGroupsId:
                this.entity.AccountSubGroupsId,

            BankAccountCode:
                this.entity.BankAccountCode?.trim() ?? '',

            BankAccountName:
                this.entity.BankAccountName?.trim() ?? '',

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
                this.entity.PaymentAccount,

            Bank:
                this.entity.Bank?.trim() ?? ''
        };


        this.bankAccountsService
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

                        'BankAccount created successfully.'
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
                        'Create BankAccount Error',

                        error
                    );


                    const message =
                        (error as any)?.error
                        ??
                        'Failed to create BankAccount.';


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
            UpdateBankAccount =
        {
            BankAccountId:
                this.entity.BankAccountId,

            AccountSubGroupsId:
                this.entity.AccountSubGroupsId,

            BankAccountCode:
                this.entity.BankAccountCode?.trim() ?? '',

            BankAccountName:
                this.entity.BankAccountName?.trim() ?? '',

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
                this.entity.PaymentAccount,

            Bank:
                this.entity.Bank?.trim() ?? ''
        };


        this.bankAccountsService
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

                        'BankAccount updated successfully.'
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
                        'Update BankAccount Error',

                        error
                    );


                    const message =
                        (error as any)?.error
                        ??
                        'Failed to update BankAccount.';


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

            'bank-accounts',

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