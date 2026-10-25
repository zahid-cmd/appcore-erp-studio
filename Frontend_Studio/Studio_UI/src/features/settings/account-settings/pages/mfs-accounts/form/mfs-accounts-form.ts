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
    MFSAccount,
    CreateMFSAccount,
    UpdateMFSAccount
}
from '../../../models/mfs-accounts.model';

import
{
    MFSAccountsService
}
from '../../../services/mfs-accounts.service';

import
{
    AccountSubGroupService
}
from '../../../services/account-sub-group.service';

import
{
    BankAccountsService
}
from '../../../services/bank-accounts.service';

import
{
    BranchesService
}
from '../../../../general-settings/services/branches.service';

//===============================================================
// Constants
//===============================================================

// MFS Accounts are reserved to this Account Sub Group only.
const RESERVED_SUB_GROUP_CODE:
    string =
    'SUB-002-002-003';

// Mobile Financial Service providers available in Bangladesh.
// Value is stored in UPPERCASE (used in Display Name).
const MFS_PROVIDERS:
    { label: string; value: string }[] =
[
    { label:'bKash',                     value:'BKASH' },
    { label:'Nagad',                     value:'NAGAD' },
    { label:'Rocket (DBBL)',             value:'ROCKET' },
    { label:'Upay (UCB)',                value:'UPAY' },
    { label:'Tap (Trust Axiata Pay)',    value:'TAP' },
    { label:'mCash (IBBL)',              value:'MCASH' },
    { label:'SureCash',                  value:'SURECASH' },
    { label:'OK Wallet (One Bank)',      value:'OK WALLET' },
    { label:'FirstCash (FSIBL)',         value:'FIRSTCASH' }
];

// MFS Account Types
const ACCOUNT_TYPE_PERSONAL:
    string =
    'Personal';

const ACCOUNT_TYPE_MERCHANT:
    string =
    'Merchant';

const MFS_ACCOUNT_TYPES:
    { label: string; value: string }[] =
[
    { label:'Personal', value:ACCOUNT_TYPE_PERSONAL },
    { label:'Merchant', value:ACCOUNT_TYPE_MERCHANT }
];

// MFS Charges limits (percentage)
const MFS_CHARGES_MAX:
    number =
    100;

//===============================================================
// Case-Insensitive Field Reader
//
// ASP.NET Core camel-cases JSON names ("MFSAccountCode" →
// "mfsAccountCode"). This reads a field regardless of casing.
//===============================================================

function readField
(
    item:
        any,
    name:
        string
):
    any
{
    if
    (
        item == null
        ||
        typeof item !== 'object'
    )
    {
        return undefined;
    }

    if
    (
        name in item
    )
    {
        return item[name];
    }

    const target =
        name.toLowerCase();

    const key =
        Object.keys(item).find
        (
            k =>
                k.toLowerCase() ===
                target
        );

    return key !== undefined
        ? item[key]
        : undefined;
}

//===============================================================
// First Matching Field
//===============================================================

function readFirst
(
    item:
        any,
    candidates:
        string[],
    fallback?:
        (lowerKey: string) => boolean
):
    any
{
    for
    (
        const name
        of candidates
    )
    {
        const value =
            readField(item, name);

        if
        (
            value !== undefined
            &&
            value !== null
            &&
            value !== ''
        )
        {
            return value;
        }
    }

    if
    (
        fallback
        &&
        item
        &&
        typeof item === 'object'
    )
    {
        const key =
            Object.keys(item).find
            (
                k =>
                    fallback(
                        k.toLowerCase()
                    )
            );

        if
        (
            key !== undefined
        )
        {
            return item[key];
        }
    }

    return undefined;
}

//===============================================================
// MFS Account Id / Code Resolvers
//===============================================================

function resolveMfsAccountId
(
    item:
        any
):
    number
{
    const value =
        readFirst
        (
            item,
            [
                'MFSAccountId',
                'MFSAccountsId',
                'MfsAccountId',
                'MfsAccountsId',
                'Id'
            ],
            key =>
                key.includes('mfs')
                &&
                key.endsWith('id')
                &&
                !key.includes('subgroup')
        );

    const id =
        Number(
            value
            ??
            0
        );

    return Number.isFinite(id)
        ? id
        : 0;
}

function resolveMfsAccountCode
(
    item:
        any
):
    string
{
    const value =
        readFirst
        (
            item,
            [
                'MFSAccountCode',
                'MFSAccountsCode',
                'MfsAccountCode',
                'MfsAccountsCode',
                'Code'
            ],
            key =>
                key.includes('mfs')
                &&
                key.includes('code')
        );

    return String(
        value
        ??
        ''
    ).trim();
}

//===============================================================
// Local Types
//===============================================================

interface LinkedBankOption
{
    // Bank Accounts → BankAccountCode (the saved value)
    Code:
        string;
    DisplayName:
        string;
    IsActive:
        boolean;
}

interface SubGroupOption
{
    AccountSubGroupId:
        number;
    SubGroupCode:
        string;
    SubGroupName:
        string;
}

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'mfs-accounts-form',

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

    templateUrl:'./mfs-accounts-form.html',

    styleUrls:
    [
        './mfs-accounts-form.css'
    ]
})

//===============================================================
// MFS Accounts Form
//===============================================================

export class MfsAccountsForm
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

    private readonly bankAccountsService =
        inject(BankAccountsService);

    private readonly mFSAccountsService =
        inject(MFSAccountsService);

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
        'MFS Account';

    entityName:
        string =
        'MFS Account';

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
    // Account Sub Group Items
    //
    // Add mode   : reserved sub group only (SUB-002-002-003)
    // Edit / View: reserved + the record's own sub group
    //===========================================================

    private allSubGroups:
        SubGroupOption[] =
        [];

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

    //===========================================================
    // MFS Provider Items (MFS Account Name)
    //===========================================================

    mfsProviderItems:
        any[] =
        [
            ...MFS_PROVIDERS
        ];

    //===========================================================
    // Account Type Items
    //===========================================================

    accountTypeItems:
        any[] =
        [
            ...MFS_ACCOUNT_TYPES
        ];

    //===========================================================
    // Linked Bank Account Items
    // label = Display Name, value = Bank Account CODE (saved)
    //===========================================================

    private bankAccounts:
        LinkedBankOption[] =
        [];

    linkedBankAccountItems:
        any[] =
        [];

    //===========================================================
    // MFS Charges (%) — text bound to the textbox,
    // parsed into entity.MFSCharges
    //===========================================================

    mfsChargesText:
        string =
        '';

    //===========================================================
    // Entity
    //===========================================================

    entity:
        MFSAccount =
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
    // Merchant Account?
    //
    // Merchant  : Linked Bank Account & MFS Charges enabled + required
    // Personal  : both disabled + optional (cleared)
    //===========================================================

    get isMerchant():
        boolean
    {
        return (this.entity.AccountType ?? '')
            .trim()
            .toLowerCase()
            ===
            ACCOUNT_TYPE_MERCHANT.toLowerCase();
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.loadBranchItems();

        this.loadLinkedBankAccounts();

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
    // Helpers
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

    private text
    (
        item:
            any,
        name:
            string
    ):
        string
    {
        return String(
            readField(item, name)
            ??
            ''
        ).trim();
    }

    private bool
    (
        item:
            any,
        name:
            string,
        fallback:
            boolean
    ):
        boolean
    {
        const value =
            readField(item, name);

        return value == null
            ? fallback
            : Boolean(value);
    }

    //===========================================================
    // Format Charges For Display (e.g. 1.5 → "1.50")
    //===========================================================

    private formatCharges
    (
        value:
            number
    ):
        string
    {
        return value > 0
            ? value.toFixed(2)
            : '';
    }

    //===========================================================
    // Empty Entity
    // (Account Type defaults to Personal)
    //===========================================================

    private createEmptyEntity():
        MFSAccount
    {
        return {
            MFSAccountId:0,
            AccountSubGroupsId:0,
            MFSAccountCode:'',
            MFSAccountName:'',
            Remarks:'',
            Status:true,
            Branch:'',
            DisplayName:'',
            CollectionAccount:false,
            PaymentAccount:false,
            LinkedBankAccount:'',
            MFSAccountNumber:'',
            AccountType:ACCOUNT_TYPE_PERSONAL,
            MFSCharges:0,
            BranchExclusive:false
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
                        any
                ):
                    void =>
                {
                    const list:
                        any[] =
                        Array.isArray(response)
                            ? response
                            : [];

                    this.branchItems =
                        list
                            .filter
                            (
                                item =>
                                    this.bool(item, 'IsActive', true)
                            )
                            .map
                            (
                                item =>
                                ({
                                    label:
                                        `${this.text(item, 'BranchCode')} - ${this.text(item, 'BranchName')}`,
                                    value:
                                        this.text(item, 'BranchName')
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
    // Load Linked Bank Accounts (Bank Accounts page)
    //===========================================================

    private loadLinkedBankAccounts():
        void
    {
        this.bankAccountsService
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

                    this.bankAccounts =
                        list
                            .map
                            (
                                item =>
                                ({
                                    Code:
                                        this.text(item, 'BankAccountCode'),

                                    DisplayName:
                                        this.text(item, 'DisplayName'),

                                    IsActive:
                                        this.bool(
                                            item,
                                            'Status',
                                            this.bool(item, 'IsActive', true)
                                        )
                                })
                            )
                            .filter
                            (
                                item =>
                                    !!item.Code
                            );

                    this.adoptLegacyLinkedBank();

                    this.buildLinkedBankAccountItems();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Bank Accounts Error:',
                        error
                    );

                    this.bankAccounts =
                        [];

                    this.buildLinkedBankAccountItems();

                    this.toast.error(
                        'Error',
                        'Failed to load bank accounts.'
                    );
                }
            });
    }

    //===========================================================
    // Legacy Linked Bank (saved by display name before the code
    // rule) : show it as its code; the server stores the code on
    // the next Update. The form baseline is kept, so this alone
    // is not an unsaved change.
    //===========================================================

    private adoptLegacyLinkedBank():
        void
    {
        const saved =
            (this.entity.LinkedBankAccount ?? '').trim();

        if
        (
            !saved
            ||
            this.bankAccounts.some(item => item.Code === saved)
        )
        {
            return;
        }

        const match =
            this.bankAccounts.find
            (
                item =>
                    item.DisplayName ===
                    saved
            );

        if
        (
            !match
        )
        {
            return;
        }

        const pristine =
            !this.hasChanges;

        this.entity.LinkedBankAccount =
            match.Code;

        if
        (
            pristine
        )
        {
            this.setInitialFormState();
        }
    }

    //===========================================================
    // Build Linked Bank Account Items
    //===========================================================

    private buildLinkedBankAccountItems():
        void
    {
        const selected =
            (this.entity.LinkedBankAccount ?? '').trim();

        const items =
            this.bankAccounts
                .filter
                (
                    item =>
                        item.IsActive
                        ||
                        item.Code ===
                        selected
                )
                .map
                (
                    item =>
                    ({
                        label:
                            item.DisplayName || item.Code,
                        value:
                            item.Code
                    })
                );

        if
        (
            selected
            &&
            !items.some
            (
                item =>
                    item.value ===
                    selected
            )
        )
        {
            items.unshift
            ({
                label:
                    selected,
                value:
                    selected
            });
        }

        this.linkedBankAccountItems =
            items;

        this.cdr.detectChanges();
    }

    //===========================================================
    // Ensure MFS Provider Option
    //===========================================================

    private ensureProviderOption():
        void
    {
        const name =
            this.toUpper(
                this.entity.MFSAccountName
            ).trim();

        if
        (
            !name
            ||
            MFS_PROVIDERS.some
            (
                item =>
                    item.value ===
                    name
            )
        )
        {
            this.mfsProviderItems =
            [
                ...MFS_PROVIDERS
            ];

            return;
        }

        this.mfsProviderItems =
        [
            ...MFS_PROVIDERS,
            {
                label:
                    name,
                value:
                    name
            }
        ];
    }

    //===========================================================
    // Normalize Account Type
    //
    // Matches "personal" / "MERCHANT" etc. to the dropdown value.
    // Empty or unknown values fall back to Personal.
    //===========================================================

    private normalizeAccountType
    (
        value:
            string
    ):
        string
    {
        const match =
            MFS_ACCOUNT_TYPES.find
            (
                item =>
                    item.value.toLowerCase() ===
                    (value ?? '').trim().toLowerCase()
            );

        return match
            ? match.value
            : ACCOUNT_TYPE_PERSONAL;
    }

    //===========================================================
    // Load Account Sub Groups
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

                    this.allSubGroups =
                        list.map
                        (
                            item =>
                            ({
                                AccountSubGroupId:
                                    Number(
                                        readField(item, 'AccountSubGroupId')
                                        ??
                                        0
                                    ),
                                SubGroupCode:
                                    this.text(item, 'SubGroupCode'),
                                SubGroupName:
                                    this.text(item, 'SubGroupName')
                            })
                        );

                    const reserved =
                        this.allSubGroups.find
                        (
                            item =>
                                item.SubGroupCode.toUpperCase() ===
                                RESERVED_SUB_GROUP_CODE
                        );

                    this.isLoadingSubGroups =
                        false;

                    this.reservedSubGroupId =
                        reserved
                            ? reserved.AccountSubGroupId
                            : 0;

                    if
                    (
                        !reserved
                    )
                    {
                        this.toast.error(
                            'Error',
                            `Reserved Account Sub Group ${RESERVED_SUB_GROUP_CODE} was not found.`
                        );
                    }

                    this.buildAccountSubGroupItems();

                    this.applyReservedSubGroup();

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
                        'Load AccountSubGroup Error',
                        error
                    );

                    this.allSubGroups =
                        [];

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
    // Build Account Sub Group Items
    //===========================================================

    private buildAccountSubGroupItems():
        void
    {
        const ids =
            new Set<number>();

        if
        (
            this.reservedSubGroupId > 0
        )
        {
            ids.add(
                this.reservedSubGroupId
            );
        }

        if
        (
            !this.isAddMode
            &&
            this.entity.AccountSubGroupsId > 0
        )
        {
            ids.add(
                this.entity.AccountSubGroupsId
            );
        }

        this.accountSubGroupItems =
            this.allSubGroups
                .filter
                (
                    item =>
                        ids.has(
                            item.AccountSubGroupId
                        )
                )
                .map
                (
                    item =>
                    ({
                        label:
                            `${item.SubGroupCode} - ${item.SubGroupName}`,
                        value:
                            item.AccountSubGroupId
                    })
                );

        this.cdr.detectChanges();
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

        this.generateMFSAccountCode(
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
    // Resolve Entity Id (from route)
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

        this.mfsChargesText =
            '';

        this.mfsProviderItems =
        [
            ...MFS_PROVIDERS
        ];

        this.accountTypeItems =
        [
            ...MFS_ACCOUNT_TYPES
        ];

        this.buildLinkedBankAccountItems();

        this.buildAccountSubGroupItems();

        this.setInitialFormState();

        this.applyReservedSubGroup();
    }

    //===========================================================
    // Generate MFS Account Code
    //===========================================================

    private generateMFSAccountCode
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
            this.entity.MFSAccountCode =
                '';

            this.checkForChanges();

            this.cdr.detectChanges();

            return;
        }

        this.mFSAccountsService
            .getNextCode(
                this.entity.AccountSubGroupsId
            )
            .subscribe
            ({
                next:
                (
                    code:
                        any
                ):
                    void =>
                {
                    this.entity.MFSAccountCode =
                        typeof code === 'string'
                            ? code.trim()
                            : resolveMfsAccountCode(code);

                    if
                    (
                        resetBaseline
                        &&
                        !this.hasChanges
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
                ):
                    void =>
                {
                    console.error(
                        'Generate MFS Account Code Error',
                        error
                    );

                    this.entity.MFSAccountCode =
                        '';

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to generate MFS Account Code.'
                        )
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
        this.mFSAccountsService
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
                    const mfsAccountName =
                        this.toUpper(
                            this.text(response, 'MFSAccountName')
                        );

                    const mfsAccountNumber =
                        this.text(response, 'MFSAccountNumber');

                    const savedDisplayName =
                        this.text(response, 'DisplayName');

                    const accountType =
                        this.normalizeAccountType(
                            this.text(response, 'AccountType')
                        );

                    const charges =
                        Number(
                            readField(response, 'MFSCharges')
                            ??
                            0
                        );

                    this.entity =
                    {
                        MFSAccountId:
                            resolveMfsAccountId(response)
                            ||
                            this.entityId,

                        AccountSubGroupsId:
                            Number(
                                readField(response, 'AccountSubGroupsId')
                                ??
                                readField(response, 'AccountSubGroupId')
                                ??
                                0
                            ),

                        MFSAccountCode:
                            resolveMfsAccountCode(response),

                        MFSAccountName:
                            mfsAccountName,

                        Remarks:
                            this.text(response, 'Remarks'),

                        Status:
                            this.bool(response, 'Status', true),

                        Branch:
                            this.text(response, 'Branch'),

                        DisplayName:
                            savedDisplayName
                            ||
                            [mfsAccountName, mfsAccountNumber]
                                .filter(part => !!part)
                                .join(' - '),

                        CollectionAccount:
                            this.bool(response, 'CollectionAccount', false),

                        PaymentAccount:
                            this.bool(response, 'PaymentAccount', false),

                        LinkedBankAccount:
                            this.text(response, 'LinkedBankAccount'),

                        MFSAccountNumber:
                            mfsAccountNumber,

                        AccountType:
                            accountType,

                        MFSCharges:
                            Number.isFinite(charges)
                                ? charges
                                : 0,

                        BranchExclusive:
                            this.bool(response, 'BranchExclusive', false)
                    };

                    this.mfsChargesText =
                        this.formatCharges(
                            this.entity.MFSCharges
                        );

                    this.ensureProviderOption();

                    this.adoptLegacyLinkedBank();

                    this.buildLinkedBankAccountItems();

                    this.buildAccountSubGroupItems();

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
                        'Load MFS Account Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to load MFS Account.'
                        )
                    );

                    this.hasChanges =
                        false;

                    this.onBackToList();
                }
            });
    }

    //===========================================================
    // Display Name
    //
    // Format (UPPERCASE) : <MFS Account Name> - <MFS Account Number>
    //===========================================================

    private buildDisplayName():
        string
    {
        return [
            this.toUpper(this.entity.MFSAccountName).trim(),
            (this.entity.MFSAccountNumber ?? '').trim()
        ]
            .filter
            (
                part =>
                    !!part
            )
            .join(' - ');
    }

    //===========================================================
    // Display Name Part Changed
    //===========================================================

    onDisplayPartChange():
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }

        this.entity.MFSAccountName =
            this.toUpper(
                this.entity.MFSAccountName
            );

        this.entity.DisplayName =
            this.buildDisplayName();

        this.onValueChange();
    }

    //===========================================================
    // Account Type Changed
    //
    // Personal : clear + lock Linked Bank Account & MFS Charges
    // Merchant : unlock both (required on save)
    //===========================================================

    onAccountTypeChange():
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }

        this.entity.AccountType =
            this.normalizeAccountType(
                this.entity.AccountType
            );

        if
        (
            !this.isMerchant
        )
        {
            this.entity.LinkedBankAccount =
                '';

            this.entity.MFSCharges =
                0;

            this.mfsChargesText =
                '';
        }

        this.onValueChange();
    }

    //===========================================================
    // MFS Charges Changed
    //
    // Keeps digits and one decimal point, max 2 decimals,
    // and stores the numeric value in entity.MFSCharges.
    //===========================================================

    onMfsChargesChange():
        void
    {
        if
        (
            this.isViewMode
            ||
            !this.isMerchant
        )
        {
            return;
        }

        let value =
            String(
                this.mfsChargesText
                ??
                ''
            )
            .replace(/[^0-9.]/g, '');

        // Only one decimal point
        const firstDot =
            value.indexOf('.');

        if
        (
            firstDot !== -1
        )
        {
            value =
                value.substring(0, firstDot + 1)
                +
                value
                    .substring(firstDot + 1)
                    .replace(/\./g, '');

            // Max 2 decimals
            const [whole, decimals] =
                value.split('.');

            value =
                `${whole}.${(decimals ?? '').substring(0, 2)}`;
        }

        this.mfsChargesText =
            value;

        const parsed =
            parseFloat(value);

        this.entity.MFSCharges =
            Number.isFinite(parsed)
                ? parsed
                : 0;

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
        // Reserved Sub Group (Add mode)
        //=======================================================

        if
        (
            this.isAddMode
        )
        {
            if
            (
                this.reservedSubGroupId <= 0
            )
            {
                this.toast.error(
                    'Validation',
                    `Reserved Account Sub Group ${RESERVED_SUB_GROUP_CODE} is not available.`
                );

                return;
            }

            this.entity.AccountSubGroupsId =
                this.reservedSubGroupId;
        }

        //=======================================================
        // Edit mode needs a valid id
        //=======================================================

        if
        (
            this.isEditMode
            &&
            !(this.entity.MFSAccountId || this.entityId)
        )
        {
            this.toast.error(
                'Error',
                'MFS Account id is missing. Please reopen the record from the list.'
            );

            return;
        }

        //=======================================================
        // Display Name is always rebuilt before saving
        //=======================================================

        this.entity.MFSAccountName =
            this.toUpper(
                this.entity.MFSAccountName
            ).trim();

        this.entity.DisplayName =
            this.buildDisplayName();

        //=======================================================
        // Required Fields (always)
        //=======================================================

        if
        (
            !this.requireText(this.entity.Branch, 'Branch')
            ||
            !this.requireText(this.entity.MFSAccountName, 'MFS Account Name')
            ||
            !this.requireText(this.entity.MFSAccountCode, 'MFS Account Code')
            ||
            !this.requireText(this.entity.AccountType, 'Account Type')
            ||
            !this.requireText(this.entity.MFSAccountNumber, 'MFS Account Number')
        )
        {
            return;
        }

        //=======================================================
        // Merchant : Linked Bank Account & MFS Charges required
        //=======================================================

        if
        (
            this.isMerchant
        )
        {
            if
            (
                !this.requireText(this.entity.LinkedBankAccount, 'Linked Bank Account')
            )
            {
                return;
            }

            if
            (
                !this.mfsChargesText?.trim()
            )
            {
                this.toast.error(
                    'Validation',
                    'MFS Charges is required for Merchant accounts.'
                );

                return;
            }

            if
            (
                !(this.entity.MFSCharges > 0)
                ||
                this.entity.MFSCharges > MFS_CHARGES_MAX
            )
            {
                this.toast.error(
                    'Validation',
                    `MFS Charges must be greater than 0 and not more than ${MFS_CHARGES_MAX}%.`
                );

                return;
            }
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
    //
    // Personal accounts never send a linked bank account or
    // charges, even if old data had them.
    //===========================================================

    private buildPayload():
        CreateMFSAccount
    {
        const merchant =
            this.isMerchant;

        return {
            AccountSubGroupsId:
                this.entity.AccountSubGroupsId,

            MFSAccountCode:
                this.entity.MFSAccountCode?.trim() ?? '',

            MFSAccountName:
                this.toUpper(this.entity.MFSAccountName).trim(),

            Remarks:
                this.entity.Remarks?.trim() ?? '',

            Status:
                this.entity.Status,

            Branch:
                this.entity.Branch?.trim() ?? '',

            DisplayName:
                this.buildDisplayName(),

            CollectionAccount:
                this.entity.CollectionAccount,

            PaymentAccount:
                this.entity.PaymentAccount,

            LinkedBankAccount:
                merchant
                    ? this.entity.LinkedBankAccount?.trim() ?? ''
                    : '',

            MFSAccountNumber:
                this.entity.MFSAccountNumber?.trim() ?? '',

            AccountType:
                this.normalizeAccountType(
                    this.entity.AccountType
                ),

            MFSCharges:
                merchant
                    ? Math.round(this.entity.MFSCharges * 100) / 100
                    : 0,

            BranchExclusive:
                this.entity.BranchExclusive
        };
    }

    //===========================================================
    // Create
    //===========================================================

    private saveCreate():
        void
    {
        const model:
            CreateMFSAccount =
            this.buildPayload();

        this.startProgress(
            'Saving MFS Account',
            'Please wait while the MFS account is being saved...'
        );

        this.withMinimumDuration(
            this.mFSAccountsService.create(
                model
            )
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'MFS account saved.',
                    () =>
                    {
                        this.setInitialFormState();

                        this.toast.success(
                            'Success',
                            'MFS Account created successfully.'
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
                    'Create MFS Account Error',
                    error
                );

                this.failProgress(
                    () =>
                    {
                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                'Failed to create MFS Account.'
                            )
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
        const id =
            this.entity.MFSAccountId
            ||
            this.entityId;

        const model =
        {
            MFSAccountId:
                id,

            MFSAccountsId:
                id,

            ...this.buildPayload()
        } as UpdateMFSAccount;

        this.startProgress(
            'Updating MFS Account',
            'Please wait while the MFS account is being updated...'
        );

        this.withMinimumDuration(
            this.mFSAccountsService.update(
                model
            )
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'MFS account updated.',
                    () =>
                    {
                        this.setInitialFormState();

                        this.toast.success(
                            'Success',
                            'MFS Account updated successfully.'
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
                    'Update MFS Account Error',
                    error
                );

                this.failProgress(
                    () =>
                    {
                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                'Failed to update MFS Account.'
                            )
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
            this.isEditMode
        )
        {
            this.loadEntity();

            return;
        }

        this.initializeEntity();
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
            'account-settings',
            'mfs-accounts',
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
    }

    //===========================================================
    // Minimum Progress Duration
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