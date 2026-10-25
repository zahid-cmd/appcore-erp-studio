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
    EmiAccounts,
    CreateEmiAccounts,
    UpdateEmiAccounts,
    EmiAccountsDefaults
}
from '../../../models/emi-accounts.model';

import
{
    EmiAccountsService
}
from '../../../services/emi-accounts.service';

import
{
    BankAccountsService
}
from '../../../services/bank-accounts.service';

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

// Fixed prefix of the generated EMI Account Name.
const EMI_NAME_PREFIX:
    string =
    'EMI';

//===============================================================
// Case-Insensitive Field Reader
//
// ASP.NET Core may camel-case JSON names ("DisplayName" →
// "displayName"). This reads a field regardless of casing.
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
// Local Types
//===============================================================

interface LinkedBankOption
{
    // Bank Account Code : what the EMI account saves
    Code:
        string;
    DisplayName:
        string;
    Bank:
        string;
    IsActive:
        boolean;
}

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'emi-accounts-form',

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

    templateUrl:'./emi-accounts-form.html',

    styleUrls:
    [
        './emi-accounts-form.css'
    ]
})

//===============================================================
// EMI Accounts Form
//===============================================================

export class EmiAccountsForm
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly emiAccountsService =
        inject(EmiAccountsService);

    private readonly bankAccountsService =
        inject(BankAccountsService);

    private readonly bankSetupService =
        inject(BankSetupService);

    private readonly branchesService =
        inject(BranchesService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly progressDialog =
        inject(ProgressDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    //===========================================================
    // Progress Configuration
    //===========================================================

    private readonly MIN_PROGRESS_MS:
        number =
        5000;

    private readonly PROGRESS_TICK_MS:
        number =
        100;

    private readonly PROGRESS_CEILING:
        number =
        90;

    private readonly PROGRESS_COMPLETE_HOLD_MS:
        number =
        600;

    private progressTimer?:
        number;

    private progressValue:
        number =
        0;

    // Prevents double submit while Save / Update is running
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
        'EMI Account';

    entityName:
        string =
        'EMI Account';

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
    // Defaults (reserved sub group SUB-002-002-005)
    //===========================================================

    private defaults:
        EmiAccountsDefaults | null =
        null;

    // Shown when SUB-002-002-005 is missing
    subGroupMessage:
        string =
        '';

    //===========================================================
    // Dropdown Items
    //===========================================================

    statusItems:
        any[] =
    [
        { label:'Active', value:true },
        { label:'Inactive', value:false }
    ];

    yesNoItems:
        any[] =
    [
        { label:'Yes', value:true },
        { label:'No', value:false }
    ];

    // All platforms, in display order
    private readonly allPlatforms:
        string[] =
    [
        'SSLCommerz',
        'ShurjoPay',
        'POS',
        'QR',
        'Online'
    ];

    // One EMI account per platform : platforms already used by
    // another live EMI account are left out (the record's own
    // platform always stays).
    private usedPlatforms:
        Set<string> =
        new Set<string>();

    platformItems:
        any[] =
        [];

    // Shown when every platform already has an EMI account
    noPlatformLeft:
        boolean =
        false;

    branchItems:
        any[] =
        [];

    // Bank Accounts : active accounts + the saved one
    private bankAccounts:
        LinkedBankOption[] =
        [];

    linkedBankAccountItems:
        any[] =
        [];

    // Bank Setup : Bank Name (UPPERCASE) → Short Name
    private bankShortNames:
        Map<string, string> =
        new Map<string, string>();

    //===========================================================
    // Entity
    //===========================================================

    entity:
        EmiAccounts =
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

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.loadBranchItems();

        this.loadBankSetup();

        this.loadLinkedBankAccounts();

        this.initializeMode();

        this.loadUsedPlatforms();
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

    private num
    (
        item:
            any,
        name:
            string
    ):
        number
    {
        const value =
            Number(
                readField(item, name)
                ??
                0
            );

        return Number.isFinite(value)
            ? value
            : 0;
    }

    //===========================================================
    // Empty Entity
    //===========================================================

    private createEmptyEntity():
        EmiAccounts
    {
        return {
            EmiAccountId:0,
            AccountSubGroupsId:0,
            SubGroupCode:'',
            SubGroupName:'',
            EmiAccountCode:'',
            EmiAccountName:'',
            Platform:'',
            LinkedBankAccount:'',
            LinkedBankAccountName:'',
            Branch:'',
            CollectionAccount:true,
            PaymentAccount:false,
            BranchExclusive:false,
            Remarks:'',
            Status:true
        };
    }

    //===========================================================
    // Account Sub Group Label (read-only box)
    //===========================================================

    get subGroupLabel():
        string
    {
        return this.entity.SubGroupCode
            ? `${this.entity.SubGroupCode} - ${this.entity.SubGroupName}`
            : '';
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

                    const items =
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

                    // Keep the saved branch even if it is inactive now
                    const saved =
                        (this.entity.Branch ?? '').trim();

                    if
                    (
                        saved
                        &&
                        !items.some
                        (
                            item =>
                                item.value === saved
                        )
                    )
                    {
                        items.unshift
                        ({
                            label:
                                saved,
                            value:
                                saved
                        });
                    }

                    this.branchItems =
                        items;

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
    // Load Used Platforms (other live EMI accounts)
    //===========================================================

    private loadUsedPlatforms():
        void
    {
        this.emiAccountsService
            .getAll()
            .subscribe
            ({
                next:
                (
                    accounts:
                        EmiAccounts[]
                ):
                    void =>
                {
                    this.usedPlatforms =
                        new Set<string>(
                            (accounts ?? [])
                                .filter
                                (
                                    account =>
                                        account.EmiAccountId !==
                                        this.entityId
                                )
                                .map
                                (
                                    account =>
                                        account.Platform
                                )
                        );

                    this.buildPlatformItems();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load EMI Accounts Error:',
                        error
                    );

                    // The server still blocks a second account
                    // per platform
                    this.usedPlatforms =
                        new Set<string>();

                    this.buildPlatformItems();
                }
            });
    }

    //===========================================================
    // Build Platform Items
    //
    // Free platforms (+ the record's own platform in Edit / View).
    // In Add mode the first free platform is pre-selected.
    //===========================================================

    private buildPlatformItems():
        void
    {
        const own =
            (this.entity.Platform ?? '').trim();

        this.platformItems =
            this.allPlatforms
                .filter
                (
                    platform =>
                        !this.usedPlatforms.has(platform)
                        ||
                        (
                            // Edit / View keep the record's own
                            // platform; Add never shows a used one
                            !this.isAddMode
                            &&
                            platform === own
                        )
                )
                .map
                (
                    platform =>
                    ({
                        label:
                            platform,
                        value:
                            platform
                    })
                );

        this.noPlatformLeft =
            this.isAddMode
            &&
            this.platformItems.length === 0;

        if
        (
            this.isAddMode
            &&
            !this.isSaving
        )
        {
            const stillFree =
                this.platformItems.some
                (
                    item =>
                        item.value === own
                );

            if
            (
                !stillFree
            )
            {
                const pristine =
                    !this.hasChanges;

                this.entity.Platform =
                    this.platformItems.length > 0
                        ? this.platformItems[0].value
                        : '';

                this.entity.EmiAccountName =
                    this.buildEmiAccountName();

                if
                (
                    pristine
                )
                {
                    this.setInitialFormState();
                }
                else
                {
                    this.checkForChanges();
                }
            }
        }

        this.cdr.detectChanges();
    }

    //===========================================================
    // Load Bank Setup (short names)
    //===========================================================

    private loadBankSetup():
        void
    {
        this.bankSetupService
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

                    this.bankShortNames =
                        new Map<string, string>(
                            list
                                .map
                                (
                                    bank =>
                                    [
                                        this.text(bank, 'BankName').toUpperCase(),
                                        this.text(bank, 'ShortName')
                                        ||
                                        this.text(bank, 'BankName')
                                    ] as [string, string]
                                )
                                .filter
                                (
                                    pair =>
                                        !!pair[0]
                                )
                        );

                    this.refreshGeneratedName();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Bank Setup Error:',
                        error
                    );

                    this.bankShortNames =
                        new Map<string, string>();

                    this.toast.error(
                        'Error',
                        'Failed to load banks from Bank Setup.'
                    );
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

                                    Bank:
                                        this.text(item, 'Bank'),

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
                                    &&
                                    !!item.DisplayName
                            );

                    this.adoptLegacyLinkedBank();

                    this.buildLinkedBankAccountItems();

                    this.refreshGeneratedName();
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
    //
    // Active bank accounts + the saved one (even if inactive)
    // label = Display Name, value = Bank Account CODE (saved)
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
                            item.DisplayName,
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
    // Short Names
    //===========================================================

    // Linked Bank Account → its Bank → Bank Setup Short Name
    private resolveLinkedBankShortName():
        string
    {
        const linked =
            (this.entity.LinkedBankAccount ?? '').trim();

        if
        (
            !linked
        )
        {
            return '';
        }

        // By code (or a legacy display name)
        const account =
            this.bankAccounts.find
            (
                item =>
                    item.Code ===
                    linked
                    ||
                    item.DisplayName ===
                    linked
            );

        const bankName =
            (account?.Bank ?? '').trim();

        if
        (
            !bankName
        )
        {
            return '';
        }

        return (
            this.bankShortNames.get(
                bankName.toUpperCase()
            )
            ??
            bankName
        ).trim();
    }

    //===========================================================
    // Build EMI Account Name
    //
    // EMI - <Platform> - <Linked Bank Short>
    // (UPPERCASE). Returns '' until both parts are known.
    //===========================================================

    private buildEmiAccountName():
        string
    {
        const platform =
            (this.entity.Platform ?? '').trim();

        const bank =
            this.resolveLinkedBankShortName();

        if
        (
            !platform
            ||
            !bank
        )
        {
            return '';
        }

        return `${EMI_NAME_PREFIX} - ${platform} - ${bank}`
            .toUpperCase();
    }

    //===========================================================
    // Refresh Generated Name
    //
    // Called when a lookup list finishes loading. View mode keeps
    // the saved name. If the user has not changed anything yet,
    // the baseline is reset so no false "unsaved changes".
    //===========================================================

    private refreshGeneratedName():
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

        const name =
            this.buildEmiAccountName();

        if
        (
            !name
            ||
            name === this.entity.EmiAccountName
        )
        {
            return;
        }

        const pristine =
            !this.hasChanges;

        this.entity.EmiAccountName =
            name;

        if
        (
            pristine
        )
        {
            this.setInitialFormState();

            return;
        }

        this.onValueChange();
    }

    //===========================================================
    // Name Part Changed (Platform / Linked Bank Account)
    //===========================================================

    onNamePartChange():
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }

        this.entity.EmiAccountName =
            this.buildEmiAccountName();

        this.onValueChange();
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
    // Initialize Entity (Add)
    //===========================================================

    private initializeEntity():
        void
    {
        this.entity =
            this.createEmptyEntity();

        this.buildLinkedBankAccountItems();

        this.buildPlatformItems();

        this.setInitialFormState();

        this.loadDefaults();
    }

    //===========================================================
    // Load Defaults (reserved sub group + next code)
    //===========================================================

    private loadDefaults():
        void
    {
        this.emiAccountsService
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    defaults:
                        EmiAccountsDefaults
                ):
                    void =>
                {
                    this.defaults =
                        defaults;

                    this.subGroupMessage =
                        defaults.Message;

                    if
                    (
                        defaults.Message
                    )
                    {
                        this.toast.error(
                            'Account Sub Group',
                            defaults.Message
                        );
                    }

                    const pristine =
                        !this.hasChanges;

                    this.entity.AccountSubGroupsId =
                        defaults.AccountSubGroupsId;

                    this.entity.SubGroupCode =
                        defaults.SubGroupCode;

                    this.entity.SubGroupName =
                        defaults.SubGroupName;

                    this.entity.EmiAccountCode =
                        defaults.Code;

                    // Auto values are part of the initial state
                    if
                    (
                        pristine
                    )
                    {
                        this.setInitialFormState();

                        return;
                    }

                    this.onValueChange();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load EMI Account Defaults Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to generate the EMI Account Code.'
                        )
                    );
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
    // Load Entity (Edit / View)
    //===========================================================

    private loadEntity():
        void
    {
        this.emiAccountsService
            .getById(
                this.entityId
            )
            .subscribe
            ({
                next:
                (
                    response:
                        EmiAccounts
                ):
                    void =>
                {
                    this.entity =
                    {
                        ...response,

                        EmiAccountId:
                            response.EmiAccountId
                            ||
                            this.entityId
                    };

                    this.buildLinkedBankAccountItems();

                    this.buildPlatformItems();

                    this.setInitialFormState();

                    this.adoptLegacyLinkedBank();

                    this.buildLinkedBankAccountItems();

                    // Bring the saved name in line with the rule if
                    // the lookup lists are already loaded.
                    this.refreshGeneratedName();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load EMI Account Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to load EMI Account.'
                        )
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
    // Progress Dialog (Animated)
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
            this.PROGRESS_COMPLETE_HOLD_MS
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
    // Minimum Progress Duration
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
        // Reserved Sub Group (Add mode)
        //=======================================================

        if
        (
            this.isAddMode
            &&
            !(this.entity.AccountSubGroupsId > 0)
        )
        {
            this.toast.error(
                'Validation',
                this.subGroupMessage
                ||
                'Account Sub Group SUB-002-002-005 (Cash With EMI) is not available.'
            );

            return;
        }

        //=======================================================
        // One EMI account per platform
        //=======================================================

        if
        (
            this.noPlatformLeft
        )
        {
            this.toast.error(
                'Validation',
                'Every platform already has an EMI account. Edit an existing one instead.'
            );

            return;
        }

        //=======================================================
        // Required Fields
        //=======================================================

        if
        (
            !this.requireText(this.entity.Branch, 'Branch')
        )
        {
            return;
        }

        if
        (
            !this.requireText(this.entity.Platform, 'Platform')
            ||
            !this.requireText(this.entity.LinkedBankAccount, 'Linked Bank Account')
        )
        {
            return;
        }

        //=======================================================
        // EMI Account Name is always rebuilt before saving
        // (the server builds it again from the same parts)
        //=======================================================

        this.entity.EmiAccountName =
            this.buildEmiAccountName();

        if
        (
            !this.entity.EmiAccountName
        )
        {
            this.toast.error(
                'Validation',
                'EMI Account Name could not be generated. Check that the bank of the Linked Bank Account exists in Bank Setup.'
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
        CreateEmiAccounts
    {
        return {
            Platform:
                this.entity.Platform?.trim() ?? '',

            LinkedBankAccount:
                this.entity.LinkedBankAccount?.trim() ?? '',

            Branch:
                this.entity.Branch?.trim() ?? '',

            BranchExclusive:
                this.entity.BranchExclusive,

            Remarks:
                this.entity.Remarks?.trim() ?? '',

            Status:
                this.entity.Status
        };
    }

    //===========================================================
    // Create
    //===========================================================

    private saveCreate():
        void
    {
        const model:
            CreateEmiAccounts =
            this.buildPayload();

        this.startProgress(
            'Saving EMI Account',
            'Please wait while the EMI account is being saved...'
        );

        this.withMinimumDuration(
            this.emiAccountsService.create(
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
                    'EMI account saved.',
                    () =>
                    {
                        this.setInitialFormState();

                        this.toast.success(
                            'Success',
                            'EMI Account created successfully.'
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
                    'Create EMI Account Error',
                    error
                );

                this.failProgress(
                    () =>
                    {
                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                'Failed to create EMI Account.'
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
        const id:
            number =
            this.entity.EmiAccountId
            ||
            this.entityId;

        if
        (
            !id
            ||
            id <= 0
        )
        {
            this.toast.error(
                'Validation',
                'Invalid EMI Account. Please reload the page and try again.'
            );

            return;
        }

        const model:
            UpdateEmiAccounts =
        {
            EmiAccountId:
                id,

            ...this.buildPayload()
        };

        this.startProgress(
            'Updating EMI Account',
            'Please wait while the EMI account is being updated...'
        );

        this.withMinimumDuration(
            this.emiAccountsService.update(
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
                    'EMI account updated.',
                    () =>
                    {
                        this.setInitialFormState();

                        this.toast.success(
                            'Success',
                            'EMI Account updated successfully.'
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
                    'Update EMI Account Error',
                    error
                );

                this.failProgress(
                    () =>
                    {
                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                'Failed to update EMI Account.'
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
            'emi-accounts',
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
    // Value Changed
    //===========================================================

    onValueChange():
        void
    {
        this.checkForChanges();

        this.cdr.detectChanges();
    }
}