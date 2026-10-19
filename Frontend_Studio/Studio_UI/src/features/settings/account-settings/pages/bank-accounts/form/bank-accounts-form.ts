// PAGE-CLONED : Cash Accounts -> Bank Accounts
// PAGE-CLONED : Wings -> Bank Accounts
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
    finalize,
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
    BankSetup
}
from '../../../models/bank-setup.model';

import
{
    BankSetupService
}
from '../../../services/bank-setup.service';

import
{
    BranchesService
}
from '../../../../general-settings/services/branches.service';


//===============================================================
// Constants
//===============================================================

// Bank Accounts may only use these two Account Sub Groups.
// The server enforces the same rule.
//   SUB-002-002-002 - Cash At Banks          → BNK-002-002-002-00001 …
//   SUB-003-002-002 - Liability For Finance  → BNK-003-002-002-00001 …
const CASH_AT_BANKS_SUB_GROUP_CODE:
    string =
    'SUB-002-002-002';

const LIABILITY_FOR_FINANCE_SUB_GROUP_CODE:
    string =
    'SUB-003-002-002';

const ALLOWED_SUB_GROUP_CODES:
    string[] =
[
    CASH_AT_BANKS_SUB_GROUP_CODE,
    LIABILITY_FOR_FINANCE_SUB_GROUP_CODE
];


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

        ConfirmDialogComponent,

        ProgressDialogComponent
    ],


    templateUrl:'./bank-accounts-form.html',


    styleUrls:
    [
        './bank-accounts-form.css'
    ]
})


export class BankAccountsForm
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


    private readonly bankSetupService =
        inject(BankSetupService);


    private readonly bankAccountsService =
        inject(BankAccountsService);


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
        'Bank Account';


    entityName:
        string =
        'Bank Account';



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
    // (Cash At Banks / Liability For Finance only)
    //===========================================================

    accountSubGroupItems:
        any[] =
    [];


    // The two allowed sub groups, as loaded from the server
    private allowedSubGroups:
        AccountSubGroup[] =
    [];


    //===========================================================
    // Sanction Limit (text shown in the textbox)
    //===========================================================

    sanctionLimitText:
        string =
        '';



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



    //===========================================================
    // Bank Items
    //===========================================================

    bankItems:
        any[] =
    [];


    // BankName -> Bank Short Name (stored in UPPERCASE)
    private bankShortNames:
        Map<string, string> =
        new Map<string, string>();



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


    // Prevents double submit while Save / Update is running
    isSaving:
        boolean =
        false;



    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.loadBranchItems();

        this.loadBankItems();

        this.loadAccountSubGroups();

        this.initializeMode();
    }



    //===========================================================
    // Uppercase Helper
    //===========================================================

    private toUpper
    (
        value:
            string | null | undefined
    ):
        string
    {
        return (value ?? '').toUpperCase();
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

            Bank:'',

            FullAccountNumber:'',

            ShortAccountName:'',

            ShortAccountNumber:'',

            ShortBranchName:'',

            SwiftCode:'',

            RoutingNumber:'',

            BranchExclusive:false,

            BankBranchName:'',

            SanctionLimit:null
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
                    this.branchItems =
                        response
                            .filter(
                                item =>
                                    item.IsActive
                            )
                            .map(
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


                    this.toast.error(
                        'Error',

                        'Failed to load branches.'
                    );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Load Bank Items (Bank Setup)
    //===========================================================

    private loadBankItems():
        void
    {
        this.bankSetupService
            .getAll()
            .subscribe
            ({
                next:
                (
                    banks:
                        BankSetup[]
                ):
                    void =>
                {
                    const activeBanks =
                        banks
                            .filter(
                                bank =>
                                    bank.Status
                            );


                    this.bankShortNames =
                        new Map<string, string>(
                            activeBanks.map(
                                bank =>
                                [
                                    bank.BankName,

                                    this.toUpper(bank.ShortName).trim()
                                ]
                            )
                        );


                    this.bankItems =
                        activeBanks.map(
                            bank =>
                            ({
                                label:
                                    `${bank.BankCode} - ${bank.BankName}`,

                                value:
                                    bank.BankName
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
                        'Load Bank Items Error:',

                        error
                    );


                    this.bankItems =
                        [];


                    this.bankShortNames.clear();


                    this.toast.error(
                        'Error',

                        'Failed to load banks.'
                    );


                    this.cdr.detectChanges();
                }
            });
    }


    //===========================================================
    // Load Account Sub Groups (Reserved : SUB-003-002-002)
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
                    // Keep the allowed codes in their fixed order
                    this.allowedSubGroups =
                        ALLOWED_SUB_GROUP_CODES
                            .map(
                                code =>
                                    (subGroups ?? []).find(
                                        subGroup =>
                                            (subGroup.SubGroupCode ?? '')
                                                .trim()
                                                .toUpperCase()
                                            ===
                                            code
                                    )
                            )
                            .filter(
                                (subGroup): subGroup is AccountSubGroup =>
                                    !!subGroup
                            );


                    this.accountSubGroupItems =
                        this.allowedSubGroups.map(
                            subGroup =>
                            ({
                                label:
                                    `${subGroup.SubGroupCode} - ${subGroup.SubGroupName}`,

                                value:
                                    Number(subGroup.AccountSubGroupId)
                            })
                        );


                    this.isLoadingSubGroups =
                        false;


                    if
                    (
                        this.allowedSubGroups.length <
                        ALLOWED_SUB_GROUP_CODES.length
                    )
                    {
                        const missing =
                            ALLOWED_SUB_GROUP_CODES
                                .filter(
                                    code =>
                                        !this.allowedSubGroups.some(
                                            subGroup =>
                                                (subGroup.SubGroupCode ?? '')
                                                    .trim()
                                                    .toUpperCase()
                                                ===
                                                code
                                        )
                                )
                                .join(', ');

                        this.toast.error(
                            'Error',

                            `Account Sub Group ${missing} was not found.`
                        );
                    }


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


                    this.allowedSubGroups =
                        [];


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
    // Account Sub Group Change (Add Mode Only)
    //
    // Each sub group numbers on its own, so the code is
    // regenerated. Sanction Limit is cleared unless Liability
    // For Finance is chosen.
    //===========================================================

    onAccountSubGroupChange():
        void
    {
        if
        (
            !this.isAddMode
        )
        {
            return;
        }


        if
        (
            !this.isLiabilityForFinance
        )
        {
            this.entity.SanctionLimit =
                null;

            this.sanctionLimitText =
                '';
        }


        this.entity.BankAccountCode =
            '';


        this.generateBankAccountCode();
    }



    //===========================================================
    // Selected Sub Group Code
    //===========================================================

    private get selectedSubGroupCode():
        string
    {
        const selected =
            this.allowedSubGroups.find(
                subGroup =>
                    Number(subGroup.AccountSubGroupId)
                    ===
                    Number(this.entity?.AccountSubGroupsId ?? 0)
            );

        return (selected?.SubGroupCode ?? '')
            .trim()
            .toUpperCase();
    }



    //===========================================================
    // Liability For Finance Selected
    //
    // Shows / unlocks the Sanction Limit field.
    //===========================================================

    get isLiabilityForFinance():
        boolean
    {
        return this.selectedSubGroupCode ===
            LIABILITY_FOR_FINANCE_SUB_GROUP_CODE;
    }



    //===========================================================
    // Sanction Limit Text Change
    //
    // Digits and one decimal point, at most 2 decimals.
    //===========================================================

    onSanctionLimitTextChange
    (
        value:
            string | number
    ):
        void
    {
        let text =
            String(value ?? '')
                .replace(/,/g, '')
                .replace(/[^0-9.]/g, '');


        const dot =
            text.indexOf('.');

        if
        (
            dot >= 0
        )
        {
            text =
                text.substring(0, dot + 1)
                +
                text.substring(dot + 1)
                    .replace(/\./g, '')
                    .substring(0, 2);
        }


        this.entity.SanctionLimit =
            text === '' || text === '.'
                ? null
                : Number(text);


        // Show with thousands separators (10,000,000.50)
        this.sanctionLimitText =
            this.formatWithCommas(
                text
            );


        this.onValueChange();
    }



    //===========================================================
    // Format With Commas (comma style)
    //
    // Groups the whole-number part in thousands and keeps the
    // decimal part exactly as typed, so typing is not disturbed:
    //   10000000    → 10,000,000
    //   10000000.5  → 10,000,000.5
    //   1234.       → 1,234.
    //===========================================================

    private formatWithCommas
    (
        text:
            string
    ):
        string
    {
        if
        (
            !text
        )
        {
            return '';
        }


        const dot =
            text.indexOf('.');

        const wholePart =
            dot >= 0
                ? text.substring(0, dot)
                : text;

        const decimalPart =
            dot >= 0
                ? text.substring(dot)
                : '';


        // Drop leading zeros but keep a single 0 (e.g. 0.50)
        const cleanWhole =
            wholePart.replace(/^0+(?=\d)/, '');

        const groupedWhole =
            cleanWhole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');


        return groupedWhole + decimalPart;
    }



    //===========================================================
    // Sanction Limit → Display Text (comma style, 2 decimals)
    //===========================================================

    private formatSanctionLimit
    (
        value:
            number | null
    ):
        string
    {
        if
        (
            value === null
            ||
            value === undefined
            ||
            isNaN(value)
        )
        {
            return '';
        }

        return value.toLocaleString(
            'en-US',
            {
                minimumFractionDigits:2,
                maximumFractionDigits:2
            }
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


        this.sanctionLimitText =
            '';


        this.setInitialFormState();
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


                    const message =
                        typeof (error as any)?.error === 'string'
                        &&
                        (error as any).error.trim()
                            ? (error as any).error
                            : 'Failed to generate Bank Account Code.';


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
                            Boolean(response?.Status ?? response?.status ?? true),

                        Branch:
                            response?.Branch ?? response?.branch ?? '',

                        DisplayName:
                            response?.DisplayName ?? response?.displayName ?? '',

                        CollectionAccount:
                            Boolean(response?.CollectionAccount ?? response?.collectionAccount ?? false),

                        PaymentAccount:
                            Boolean(response?.PaymentAccount ?? response?.paymentAccount ?? false),

                        Bank:
                            response?.Bank ?? response?.bank ?? '',

                        FullAccountNumber:
                            response?.FullAccountNumber ?? response?.fullAccountNumber ?? '',

                        ShortAccountName:
                            response?.ShortAccountName ?? response?.shortAccountName ?? '',

                        ShortAccountNumber:
                            response?.ShortAccountNumber ?? response?.shortAccountNumber ?? '',

                        ShortBranchName:
                            response?.ShortBranchName ?? response?.shortBranchName ?? '',

                        SwiftCode:
                            response?.SwiftCode ?? response?.swiftCode ?? '',

                        RoutingNumber:
                            response?.RoutingNumber ?? response?.routingNumber ?? '',

                        BranchExclusive:
                            Boolean(response?.BranchExclusive ?? response?.branchExclusive ?? false),

                        BankBranchName:
                            response?.BankBranchName ?? response?.bankBranchName ?? '',

                        SanctionLimit:
                            (response?.SanctionLimit ?? response?.sanctionLimit ?? null) === null
                                ? null
                                : Number(response?.SanctionLimit ?? response?.sanctionLimit)
                    };


                    this.sanctionLimitText =
                        this.formatSanctionLimit(
                            this.entity.SanctionLimit
                        );


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
    // Format (UPPERCASE) :
    // <Short Account Name> - <Short Account Number> - <Bank Short Name> - <Short Branch Name>
    //
    // Empty parts are skipped so there are no dangling hyphens.
    //===========================================================

    private buildDisplayName():
        string
    {
        const bankShortName =
            this.bankShortNames.get(
                this.entity.Bank ?? ''
            )
            ??
            '';


        return [
            this.entity.ShortAccountName,

            this.entity.ShortAccountNumber,

            bankShortName,

            this.entity.ShortBranchName
        ]
        .map(
            part =>
                this.toUpper(part).trim()
        )
        .filter(
            part =>
                part.length > 0
        )
        .join(' - ');
    }


    private updateDisplayName():
        void
    {
        this.entity.DisplayName =
            this.buildDisplayName();
    }



    //===========================================================
    // Bank Account Name Changed (Auto Uppercase)
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


        this.entity.BankAccountName =
            this.toUpper(
                this.entity.BankAccountName
            );


        this.onValueChange();
    }



    //===========================================================
    // Display Name Part Changed
    //
    // Bank, Short Account Name, Short Account Number,
    // Short Branch Name
    //
    // Short Account Name & Short Branch Name are uppercased.
    //===========================================================

    onDisplayNamePartChange():
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }


        this.entity.ShortAccountName =
            this.toUpper(
                this.entity.ShortAccountName
            );


        this.entity.ShortBranchName =
            this.toUpper(
                this.entity.ShortBranchName
            );


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
    // Required Field Check
    //===========================================================

    private requireText
    (
        value:
            string | null | undefined,

        label:
            string
    ):
        boolean
    {
        if
        (
            !value?.trim()
        )
        {
            this.toast.error(
                'Validation',

                `${label} is required.`
            );

            return false;
        }


        return true;
    }


    //===========================================================
    // Progress Dialog (Animated)
    //
    // The bar eases from 0% toward 90% while the request runs,
    // then jumps to 100% on success before closing.
    //===========================================================

    private progressTimer?:
        number;


    private progressValue:
        number =
        0;


    private readonly PROGRESS_TICK_MS:
        number =
        100;


    private readonly PROGRESS_CEILING:
        number =
        90;


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

            600
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
        // Account Sub Group (Cash At Banks / Liability For Finance)
        //=======================================================

        if
        (
            !this.selectedSubGroupCode
        )
        {
            this.toast.error(
                'Validation',

                'Account Sub Group is required.'
            );

            return;
        }


        //=======================================================
        // Sanction Limit (Liability For Finance only)
        //=======================================================

        if
        (
            !this.isLiabilityForFinance
        )
        {
            this.entity.SanctionLimit =
                null;
        }
        else if
        (
            this.entity.SanctionLimit !== null
            &&
            (
                isNaN(this.entity.SanctionLimit)
                ||
                this.entity.SanctionLimit < 0
            )
        )
        {
            this.toast.error(
                'Validation',

                'Sanction Limit must be a valid amount (0 or more).'
            );

            return;
        }


        //=======================================================
        // Required Fields
        //=======================================================

        if
        (
            !this.requireText(this.entity.Branch, 'Branch')
            ||
            !this.requireText(this.entity.BankAccountName, 'Bank Account Name')
            ||
            !this.requireText(this.entity.FullAccountNumber, 'Full Account Number')
            ||
            !this.requireText(this.entity.BankBranchName, 'Bank Branch Name')
            ||
            // In add mode the server assigns the final code on save
            (!this.isAddMode && !this.requireText(this.entity.BankAccountCode, 'Bank Account Code'))
            ||
            !this.requireText(this.entity.Bank, 'Bank')
            ||
            !this.requireText(this.entity.ShortAccountName, 'Short Account Name')
            ||
            !this.requireText(this.entity.ShortAccountNumber, 'Short Account Number')
            ||
            !this.requireText(this.entity.ShortBranchName, 'Short Branch Name')
        )
        {
            return;
        }


        // Always save the derived (uppercase) display name
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
    // Build Payload
    //
    // Uppercase fields are enforced here as well, so older
    // records are corrected on their next save.
    //===========================================================

    private buildPayload():
        CreateBankAccount
    {
        return {
            AccountSubGroupsId:
                this.entity.AccountSubGroupsId,

            BankAccountCode:
                this.entity.BankAccountCode?.trim() ?? '',

            BankAccountName:
                this.toUpper(this.entity.BankAccountName).trim(),

            Remarks:
                this.entity.Remarks?.trim() ?? '',

            Status:
                this.entity.Status,

            Branch:
                this.entity.Branch?.trim() ?? '',

            DisplayName:
                this.toUpper(this.entity.DisplayName).trim(),

            CollectionAccount:
                this.entity.CollectionAccount,

            PaymentAccount:
                this.entity.PaymentAccount,

            Bank:
                this.entity.Bank?.trim() ?? '',

            FullAccountNumber:
                this.entity.FullAccountNumber?.trim() ?? '',

            ShortAccountName:
                this.toUpper(this.entity.ShortAccountName).trim(),

            ShortAccountNumber:
                this.entity.ShortAccountNumber?.trim() ?? '',

            ShortBranchName:
                this.toUpper(this.entity.ShortBranchName).trim(),

            SwiftCode:
                this.entity.SwiftCode?.trim() ?? '',

            RoutingNumber:
                this.entity.RoutingNumber?.trim() ?? '',

            BranchExclusive:
                this.entity.BranchExclusive,

            BankBranchName:
                this.entity.BankBranchName?.trim() ?? '',

            SanctionLimit:
                this.isLiabilityForFinance
                    ? this.entity.SanctionLimit
                    : null
        };
    }


    //===========================================================
    // Create
    //===========================================================

    private saveCreate():
        void
    {
        const model:
            CreateBankAccount =
            this.buildPayload();


        this.startProgress(
            'Saving Bank Account',

            'Please wait while the bank account is being saved...'
        );


        this.withMinimumDuration(
            this.bankAccountsService.create(
                model
            )
        )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.completeProgress(

                        'Bank account saved.',

                        () =>
                        {
                            this.setInitialFormState();


                            this.toast.success(
                                'Success',

                                'BankAccount created successfully.'
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
                        'Create BankAccount Error',

                        error
                    );


                    this.failProgress(
                        () =>
                        {
                            const message =
                                (error as any)?.error
                                ??
                                'Failed to create BankAccount.';


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
            UpdateBankAccount =
        {
            BankAccountId:
                this.entity.BankAccountId,

            ...this.buildPayload()
        };


        this.startProgress(
            'Updating Bank Account',

            'Please wait while the bank account is being updated...'
        );


        this.withMinimumDuration(
            this.bankAccountsService.update(
                model
            )
        )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.completeProgress(

                        'Bank account updated.',

                        () =>
                        {
                            this.setInitialFormState();


                            this.toast.success(
                                'Success',

                                'BankAccount updated successfully.'
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
                        'Update BankAccount Error',

                        error
                    );


                    this.failProgress(
                        () =>
                        {
                            const message =
                                (error as any)?.error
                                ??
                                'Failed to update BankAccount.';


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


        // Back to an empty form (sub group is chosen again)
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
    // Minimum Progress Duration
    //
    // Keeps the progress dialog visible for at least
    // MIN_PROGRESS_MS, on both success and error.
    //===========================================================

    private readonly MIN_PROGRESS_MS:
        number =
        5000;


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
    // Value Changed
    //===========================================================

    onValueChange():
        void
    {
        this.checkForChanges();


        this.cdr.detectChanges();
    }

}