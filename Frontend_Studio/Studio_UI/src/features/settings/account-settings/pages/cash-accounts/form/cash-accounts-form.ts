// PAGE-CLONED : Wings -> Cash Accounts
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
    Observable,
    defer,
    timer,
    throwError,
    delayWhen,
    catchError,
    switchMap
}
from 'rxjs';


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
// SUB-002-002-001 - Cash In Hand (fixed). The server enforces it too.
// Codes : CSH-002-002-001-00001, CSH-002-002-001-00002 …
const RESERVED_SUB_GROUP_CODE:
    string =
    'SUB-002-002-001';


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

        ConfirmDialogComponent,

        ProgressDialogComponent
    ],


    templateUrl:'./cash-accounts-form.html',


    styleUrls:
    [
        './cash-accounts-form.css'
    ]
})


export class CashAccountsForm
implements OnInit, OnDestroy
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


    private readonly progressDialog =
        inject(ProgressDialogService);


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
        'Cash Account';


    entityName:
        string =
        'Cash Account';



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


    // Prevents double submit while Save / Update is running
    isSaving:
        boolean =
        false;



    //===========================================================
    // Progress Dialog Settings
    //===========================================================

    // Minimum time the dialog stays open
    private readonly MIN_PROGRESS_MS:
        number =
        5000;


    // Animation tick
    private readonly PROGRESS_TICK_MS:
        number =
        100;


    // Highest % reached before the server answers
    private readonly PROGRESS_CEILING:
        number =
        90;


    // How long 100% is shown before closing
    private readonly PROGRESS_COMPLETE_HOLD_MS:
        number =
        600;


    private progressTimer?:
        number;


    private progressValue:
        number =
        0;



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

                            `Reserved Account Sub Group ${RESERVED_SUB_GROUP_CODE} (Cash In Hand) was not found. Create it first.`
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


                    const message =
                        typeof (error as any)?.error === 'string'
                        &&
                        (error as any).error.trim()
                            ? (error as any).error
                            : 'Failed to generate Cash Account Code.';


                    this.toast.error(
                        'Error',

                        message
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

                        'Failed to load Cash Account.'
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
    // Progress Dialog (Animated)
    //
    // The bar eases from 0% toward 90% while the request runs,
    // then jumps to 100% on success before closing.
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
        this.isSaving =
            true;


        this.progressValue =
            0;


        // Determinate : we drive the percentage ourselves
        this.progressDialog.show(
            title,

            message,

            false
        );


        this.clearProgressTimer();


        this.progressTimer =
            window.setInterval(
                () =>
                {
                    // Ease-out : big steps first, smaller near the ceiling
                    const step =
                        Math.max(
                            0.4,
                            (this.PROGRESS_CEILING - this.progressValue) * 0.05
                        );


                    this.progressValue =
                        Math.min(
                            this.PROGRESS_CEILING,
                            this.progressValue + step
                        );


                    this.progressDialog.update(
                        Math.round(
                            this.progressValue
                        )
                    );
                },

                this.PROGRESS_TICK_MS
            );


        this.cdr.detectChanges();
    }


    //-----------------------------------------------------------
    // Success : show 100%, pause briefly, then close
    //-----------------------------------------------------------

    private completeProgress
    (
        message:
            string,

        done:
            () => void
    ):
        void
    {
        this.clearProgressTimer();


        this.progressDialog.update(
            100,

            message
        );


        window.setTimeout(
            () =>
            {
                this.progressDialog.close();


                this.isSaving =
                    false;


                this.cdr.detectChanges();


                done();
            },

            this.PROGRESS_COMPLETE_HOLD_MS
        );
    }


    //-----------------------------------------------------------
    // Error : close immediately, then report
    //-----------------------------------------------------------

    private failProgress
    (
        done:
            () => void
    ):
        void
    {
        this.clearProgressTimer();


        this.progressDialog.close();


        this.isSaving =
            false;


        this.cdr.detectChanges();


        done();
    }


    private clearProgressTimer():
        void
    {
        if
        (
            this.progressTimer
        )
        {
            clearInterval(
                this.progressTimer
            );


            this.progressTimer =
                undefined;
        }
    }



    //===========================================================
    // Minimum Progress Duration
    //
    // Keeps the progress dialog visible for at least
    // MIN_PROGRESS_MS, on both success and error.
    //===========================================================

    private withMinimumDuration<T>
    (
        source$:
            Observable<T>
    ):
        Observable<T>
    {
        return defer(
            () =>
            {
                const startedAt:
                    number =
                    Date.now();


                const remaining =
                    (): number =>
                        Math.max(
                            0,
                            this.MIN_PROGRESS_MS - (Date.now() - startedAt)
                        );


                return source$.pipe(

                    delayWhen(
                        () =>
                            timer(remaining())
                    ),

                    catchError(
                        error =>
                            timer(remaining()).pipe(
                                switchMap(
                                    () =>
                                        throwError(() => error)
                                )
                            )
                    )
                );
            }
        );
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


        // In add mode the server assigns the final code on save
        if
        (
            !this.isAddMode
            &&
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


        this.startProgress(
            'Saving Cash Account',

            'Please wait while the cash account is being saved...'
        );


        this.withMinimumDuration(
            this.cashAccountsService.create(
                model
            )
        )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.completeProgress(

                        'Cash account saved.',

                        () =>
                        {
                            this.setInitialFormState();


                            this.toast.success(
                                'Success',

                                'Cash Account created successfully.'
                            );


                            this.onBackToList();
                        }
                    );
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


                    this.failProgress(
                        () =>
                        {
                            const message =
                                (error as any)?.error
                                ??
                                'Failed to create Cash Account.';


                            this.toast.error(
                                'Validation',

                                message
                            );
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


        this.startProgress(
            'Updating Cash Account',

            'Please wait while the cash account is being updated...'
        );


        this.withMinimumDuration(
            this.cashAccountsService.update(
                model
            )
        )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.completeProgress(

                        'Cash account updated.',

                        () =>
                        {
                            this.setInitialFormState();


                            this.toast.success(
                                'Success',

                                'Cash Account updated successfully.'
                            );


                            this.onBackToList();
                        }
                    );
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


                    this.failProgress(
                        () =>
                        {
                            const message =
                                (error as any)?.error
                                ??
                                'Failed to update Cash Account.';


                            this.toast.error(
                                'Validation',

                                message
                            );
                        }
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
            this.isSaving
        )
        {
            return;
        }


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