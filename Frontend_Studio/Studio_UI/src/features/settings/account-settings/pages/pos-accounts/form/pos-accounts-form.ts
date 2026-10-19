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
    POSAccount,
    CreatePOSAccount,
    UpdatePOSAccount
}
from '../../../models/pos-accounts.model';

import
{
    POSAccountsService
}
from '../../../services/pos-accounts.service';

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

// POS Accounts are reserved to this Account Sub Group only.
const RESERVED_SUB_GROUP_CODE:
    string =
    'SUB-002-002-004';

// Fixed prefix of the generated POS Account Name.
const POS_NAME_PREFIX:
    string =
    'POS';

//===============================================================
// Case-Insensitive Field Reader
//
// ASP.NET Core camel-cases JSON names ("POSAccountCode" →
// "posAccountCode"). This reads a field regardless of casing.
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

interface BankOption
{
    BankName:
        string;
    ShortName:
        string;
    IsActive:
        boolean;
}

interface LinkedBankOption
{
    DisplayName:
        string;
    Bank:
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
    selector:'pos-accounts-form',

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

    templateUrl:'./pos-accounts-form.html',

    styleUrls:
    [
        './pos-accounts-form.css'
    ]
})

//===============================================================
// POS Accounts Form
//===============================================================

export class PosAccountsForm
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

    private readonly bankSetupService =
        inject(BankSetupService);

    private readonly posAccountsService =
        inject(POSAccountsService);

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
        'POS Account';

    entityName:
        string =
        'POS Account';

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
    // Add mode   : reserved sub group only
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

    isLoadingSubGroups:
        boolean =
        false;

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
    // Linked Bank Account Items (Bank Accounts → Display Name)
    //
    // The settlement bank account the POS terminal pays into.
    //===========================================================

    private bankAccounts:
        LinkedBankOption[] =
        [];

    linkedBankAccountItems:
        any[] =
        [];

    //===========================================================
    // Bank Short Names (Bank Setup)
    //
    // KEY  : Bank Name (UPPERCASE)
    // VALUE: Short Name (falls back to Bank Name)
    //===========================================================

    private bankShortNames:
        Map<string, string> =
        new Map<string, string>();

    //===========================================================
    // Issuing Bank Items (Bank Setup → Bank Name)
    //
    // Any active bank + the saved one (even if inactive)
    //===========================================================

    private banks:
        BankOption[] =
        [];

    issuingBankItems:
        any[] =
        [];

    //===========================================================
    // Entity
    //===========================================================

    entity:
        POSAccount =
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

        this.loadBanks();

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
        POSAccount
    {
        return {
            POSAccountId:0,
            AccountSubGroupsId:0,
            POSAccountCode:'',
            POSAccountName:'',
            IssuingBank:'',
            TerminalNumber:'',
            LinkedBankAccount:'',
            Branch:'',
            CollectionAccount:false,
            PaymentAccount:false,
            BranchExclusive:false,
            Remarks:'',
            Status:true
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
    // Load Banks (Bank Setup)
    //
    // Feeds both the Issuing Bank dropdown and the short-name
    // lookup used by the generated POS Account Name.
    //===========================================================

    private loadBanks():
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

                    this.banks =
                        list
                            .map
                            (
                                bank =>
                                ({
                                    BankName:
                                        this.text(bank, 'BankName'),

                                    ShortName:
                                        this.text(bank, 'ShortName'),

                                    IsActive:
                                        this.bool(
                                            bank,
                                            'Status',
                                            this.bool(bank, 'IsActive', true)
                                        )
                                })
                            )
                            .filter
                            (
                                bank =>
                                    !!bank.BankName
                            );

                    this.bankShortNames =
                        new Map<string, string>(
                            this.banks.map
                            (
                                bank =>
                                    [
                                        bank.BankName.toUpperCase(),
                                        bank.ShortName || bank.BankName
                                    ] as [string, string]
                            )
                        );

                    this.buildIssuingBankItems();

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

                    this.banks =
                        [];

                    this.bankShortNames =
                        new Map<string, string>();

                    this.buildIssuingBankItems();

                    this.toast.error(
                        'Error',
                        'Failed to load banks from Bank Setup.'
                    );
                }
            });
    }

    //===========================================================
    // Build Issuing Bank Items
    //
    // Active banks + the saved one (even if inactive / deleted)
    //===========================================================

    private buildIssuingBankItems():
        void
    {
        const selected =
            (this.entity.IssuingBank ?? '').trim();

        const selectedKey =
            selected.toUpperCase();

        const items =
            this.banks
                .filter
                (
                    bank =>
                        bank.IsActive
                        ||
                        bank.BankName.toUpperCase() ===
                        selectedKey
                )
                .sort
                (
                    (a, b) =>
                        a.BankName.localeCompare(b.BankName)
                )
                .map
                (
                    bank =>
                    ({
                        label:
                            bank.BankName,
                        value:
                            bank.BankName
                    })
                );

        if
        (
            selected
            &&
            !items.some
            (
                item =>
                    item.value.toUpperCase() ===
                    selectedKey
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

        this.issuingBankItems =
            items;

        this.cdr.detectChanges();
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
                                    !!item.DisplayName
                            );

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
    // Build Linked Bank Account Items
    //
    // Active bank accounts + the saved one (even if inactive)
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
                        item.DisplayName ===
                        selected
                )
                .map
                (
                    item =>
                    ({
                        label:
                            item.DisplayName,
                        value:
                            item.DisplayName
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
    // Short Name Of A Bank
    //
    // Bank Name → Bank Setup.ShortName (or Bank Name)
    //===========================================================

    private shortNameOf
    (
        bankName:
            string | null | undefined
    ):
        string
    {
        const name =
            (bankName ?? '').trim();

        if
        (
            !name
        )
        {
            return '';
        }

        return (
            this.bankShortNames.get(
                name.toUpperCase()
            )
            ??
            name
        ).trim();
    }

    //===========================================================
    // Resolve Issuing Bank Short Name
    //===========================================================

    private resolveIssuingBankShortName():
        string
    {
        return this.shortNameOf(
            this.entity.IssuingBank
        );
    }

    //===========================================================
    // Resolve Linked Bank Short Name
    //
    // Linked Bank Account (Display Name)
    //   → Bank Account.Bank (Bank Name)
    //   → Bank Setup.ShortName (or Bank Name)
    //===========================================================

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

        const account =
            this.bankAccounts.find
            (
                item =>
                    item.DisplayName ===
                    linked
            );

        return this.shortNameOf(
            account?.Bank
        );
    }

    //===========================================================
    // Build POS Account Name
    //
    // Format (UPPERCASE) :
    // POS - <Issuing Bank Short> - <Terminal> - <Linked Bank Short>
    //
    // Returns '' until all three parts are available.
    //===========================================================

    private buildPOSAccountName():
        string
    {
        const issuingShortName =
            this.toUpper(
                this.resolveIssuingBankShortName()
            );

        const terminal =
            this.toUpper(
                this.entity.TerminalNumber
            ).trim();

        const linkedShortName =
            this.toUpper(
                this.resolveLinkedBankShortName()
            );

        if
        (
            !issuingShortName
            ||
            !terminal
            ||
            !linkedShortName
        )
        {
            return '';
        }

        return `${POS_NAME_PREFIX} - ${issuingShortName} - ${terminal} - ${linkedShortName}`;
    }

    //===========================================================
    // Refresh Generated Name
    //
    // Called when Bank Setup / Bank Accounts finish loading.
    // View mode keeps the saved name. If the form has no user
    // changes yet, the baseline is reset so the user is not
    // warned about "unsaved changes" they did not make.
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
            this.buildPOSAccountName();

        if
        (
            !name
            ||
            name === this.entity.POSAccountName
        )
        {
            return;
        }

        const pristine =
            !this.hasChanges;

        this.entity.POSAccountName =
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
    // Name Part Changed
    // (Issuing Bank / Terminal Number / Linked Bank Account)
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

        this.entity.POSAccountName =
            this.buildPOSAccountName();

        this.onValueChange();
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
                                    this.num(item, 'AccountSubGroupId'),
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

        this.generatePOSAccountCode(
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

        this.buildIssuingBankItems();

        this.buildLinkedBankAccountItems();

        this.buildAccountSubGroupItems();

        this.setInitialFormState();

        this.applyReservedSubGroup();
    }

    //===========================================================
    // Generate POS Account Code
    //===========================================================

    private generatePOSAccountCode
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
            this.entity.POSAccountCode =
                '';

            this.checkForChanges();

            this.cdr.detectChanges();

            return;
        }

        this.posAccountsService
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
                    this.entity.POSAccountCode =
                        typeof code === 'string'
                            ? code.trim().replace(/^"+|"+$/g, '')
                            : this.text(code, 'POSAccountCode');

                    // Auto-generated code is part of the initial state
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
                        'Generate POS Account Code Error',
                        error
                    );

                    this.entity.POSAccountCode =
                        '';

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to generate POS Account Code.'
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
        this.posAccountsService
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
                        POSAccountId:
                            this.num(response, 'POSAccountId')
                            ||
                            this.entityId,

                        AccountSubGroupsId:
                            this.num(response, 'AccountSubGroupsId'),

                        POSAccountCode:
                            this.text(response, 'POSAccountCode'),

                        POSAccountName:
                            this.toUpper(
                                this.text(response, 'POSAccountName')
                            ),

                        IssuingBank:
                            this.text(response, 'IssuingBank'),

                        TerminalNumber:
                            this.text(response, 'TerminalNumber'),

                        LinkedBankAccount:
                            this.text(response, 'LinkedBankAccount'),

                        Branch:
                            this.text(response, 'Branch'),

                        CollectionAccount:
                            this.bool(response, 'CollectionAccount', false),

                        PaymentAccount:
                            this.bool(response, 'PaymentAccount', false),

                        BranchExclusive:
                            this.bool(response, 'BranchExclusive', false),

                        Remarks:
                            this.text(response, 'Remarks'),

                        Status:
                            this.bool(response, 'Status', true)
                    };

                    this.buildIssuingBankItems();

                    this.buildLinkedBankAccountItems();

                    this.buildAccountSubGroupItems();

                    this.setInitialFormState();

                    // Bring the saved name in line with the rule
                    // if the bank lists are already loaded.
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
                        'Load POS Account Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to load POS Account.'
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
        // Required Fields
        //=======================================================

        if
        (
            !this.requireText(this.entity.Branch, 'Branch')
            ||
            !this.requireText(this.entity.POSAccountCode, 'POS Account Code')
            ||
            !this.requireText(this.entity.IssuingBank, 'Issuing Bank')
            ||
            !this.requireText(this.entity.TerminalNumber, 'Terminal Number')
            ||
            !this.requireText(this.entity.LinkedBankAccount, 'Linked Bank Account')
        )
        {
            return;
        }

        //=======================================================
        // POS Account Name is always rebuilt before saving
        //=======================================================

        this.entity.TerminalNumber =
            this.entity.TerminalNumber.trim();

        this.entity.POSAccountName =
            this.buildPOSAccountName();

        if
        (
            !this.entity.POSAccountName
        )
        {
            this.toast.error(
                'Validation',
                'POS Account Name could not be generated. Check that the Issuing Bank and the bank of the Linked Bank Account exist in Bank Setup.'
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
        CreatePOSAccount
    {
        return {
            AccountSubGroupsId:
                this.entity.AccountSubGroupsId,

            POSAccountCode:
                this.entity.POSAccountCode?.trim() ?? '',

            POSAccountName:
                this.buildPOSAccountName(),

            IssuingBank:
                this.entity.IssuingBank?.trim() ?? '',

            TerminalNumber:
                this.entity.TerminalNumber?.trim() ?? '',

            LinkedBankAccount:
                this.entity.LinkedBankAccount?.trim() ?? '',

            Branch:
                this.entity.Branch?.trim() ?? '',

            CollectionAccount:
                this.entity.CollectionAccount,

            PaymentAccount:
                this.entity.PaymentAccount,

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
            CreatePOSAccount =
            this.buildPayload();

        this.startProgress(
            'Saving POS Account',
            'Please wait while the POS account is being saved...'
        );

        this.withMinimumDuration(
            this.posAccountsService.create(
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
                    'POS account saved.',
                    () =>
                    {
                        this.setInitialFormState();

                        this.toast.success(
                            'Success',
                            'POS Account created successfully.'
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
                    'Create POS Account Error',
                    error
                );

                this.failProgress(
                    () =>
                    {
                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                'Failed to create POS Account.'
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
            this.entity.POSAccountId
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
                'Invalid POS Account. Please reload the page and try again.'
            );

            return;
        }

        const model:
            UpdatePOSAccount =
        {
            POSAccountId:
                id,

            ...this.buildPayload()
        };

        this.startProgress(
            'Updating POS Account',
            'Please wait while the POS account is being updated...'
        );

        this.withMinimumDuration(
            this.posAccountsService.update(
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
                    'POS account updated.',
                    () =>
                    {
                        this.setInitialFormState();

                        this.toast.success(
                            'Success',
                            'POS Account updated successfully.'
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
                    'Update POS Account Error',
                    error
                );

                this.failProgress(
                    () =>
                    {
                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                'Failed to update POS Account.'
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
            'pos-accounts',
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