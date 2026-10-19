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
    GeneralLedger,
    CreateGeneralLedger,
    UpdateGeneralLedger
}
from '../../../models/general-ledgers.model';

import
{
    AccountClass
}
from '../../../models/account-class.model';

import
{
    AccountGroup
}
from '../../../models/account-group.model';

import
{
    AccountSubGroup
}
from '../../../models/account-sub-group.model';

import
{
    GeneralLedgerService
}
from '../../../services/general-ledgers.service';

import
{
    AccountClassService
}
from '../../../services/account-class.service';

import
{
    AccountGroupService
}
from '../../../services/account-group.service';

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
    selector:'general-ledgers-form',

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
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./general-ledgers-form.html',

    styleUrls:
    [
        './general-ledgers-form.css'
    ]
})

//===============================================================
// General Ledgers Form
//===============================================================

export class GeneralLedgersForm
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly generalLedgerService =
        inject(GeneralLedgerService);

    private readonly accountClassService =
        inject(AccountClassService);

    private readonly accountGroupService =
        inject(AccountGroupService);

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
        'General Ledger';

    entityName:
        string =
        'General Ledger';

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
    // Account Classes
    //===========================================================

    // Every class from the server (unfiltered)
    allAccountClasses:
        AccountClass[]
        = [];

    // Classes a ledger can be created under
    accountClasses:
        AccountClass[]
        = [];

    accountClassItems:
        any[]
        = [];

    //===========================================================
    // Account Groups
    //===========================================================

    accountGroups:
        AccountGroup[]
        = [];

    accountGroupItems:
        any[]
        = [];

    //===========================================================
    // Account Sub Groups
    //===========================================================

    accountSubGroups:
        AccountSubGroup[]
        = [];

    accountSubGroupItems:
        any[]
        = [];

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
        GeneralLedger
        =
        {
            GeneralLedgerId:0,
            AccountClassId:0,
            AccountClassName:'',
            AccountGroupId:0,
            AccountGroupName:'',
            AccountSubGroupId:0,
            AccountSubGroupName:'',
            ClassCode:'',
            Mode:'',
            GroupCode:'',
            SubGroupCode:'',
            LedgerCode:'',
            LedgerName:'',
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
        this.loadAccountClasses();
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
    // Load Account Classes
    //===========================================================

    private loadAccountClasses():
        void
    {
        this.accountClassService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        AccountClass[]
                ): void =>
                {
                    this.allAccountClasses =
                        response ?? [];

                    this.buildAccountClassItems();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Account Classes Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Failed to load Account Classes.'
                    );
                }
            });
    }

    //===========================================================
    // Build Account Class Items
    //
    // Only active 'Account' type classes. Inventory / WIP / COGS
    // ledgers are the products themselves. In edit / view mode
    // the ledger's own class is always kept so its label still
    // shows.
    //===========================================================

    private buildAccountClassItems():
        void
    {
        const currentClassId =
            Number(
                this.entity?.AccountClassId
                ??
                0
            );

        this.accountClasses =
            this.allAccountClasses
                .filter
                (
                    (
                        item:
                            AccountClass
                    ): boolean =>
                    {
                        const selectable =
                            item.ClassType === 'Account'
                            &&
                            item.IsActive;

                        const isCurrent =
                            !this.isAddMode
                            &&
                            currentClassId > 0
                            &&
                            Number(item.AccountClassId) ===
                            currentClassId;

                        return selectable || isCurrent;
                    }
                );

        this.accountClassItems =
            this.accountClasses.map
            (
                (
                    item:
                        AccountClass
                ) =>
                ({
                    label:
                        `${item.ClassCode} - ${item.ClassName}`,

                    value:
                        item.AccountClassId
                })
            );

        this.cdr.detectChanges();
    }

    //===========================================================
    // Load Account Groups
    //
    // Active groups of the class. In edit / view mode the
    // ledger's own group is always kept.
    //===========================================================

    private loadAccountGroups
    (
        accountClassId:
            number,
        selectedGroupId:
            number = 0
    ):
        void
    {
        if
        (
            !accountClassId
        )
        {
            this.accountGroups = [];

            this.accountGroupItems = [];

            return;
        }


        this.accountGroupService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        AccountGroup[]
                ):
                    void =>
                {
                    this.accountGroups =
                        (response ?? [])
                            .filter
                            (
                                (
                                    item:
                                        AccountGroup
                                ):
                                    boolean =>
                                {
                                    if
                                    (
                                        Number(item.AccountClassId) !==
                                        Number(accountClassId)
                                    )
                                    {
                                        return false;
                                    }

                                    const isCurrent =
                                        !this.isAddMode
                                        &&
                                        Number(selectedGroupId) > 0
                                        &&
                                        Number(item.AccountGroupId) ===
                                        Number(selectedGroupId);

                                    return item.IsActive || isCurrent;
                                }
                            );


                    this.accountGroupItems =
                        this.accountGroups.map
                        (
                            (
                                item:
                                    AccountGroup
                            ) =>
                            ({
                                label:
                                    `${item.GroupCode} - ${item.GroupName}`,

                                value:
                                    item.AccountGroupId
                            })
                        );


                    //===================================================
                    // Restore Existing Account Group
                    //===================================================

                    if
                    (
                        selectedGroupId
                        &&
                        selectedGroupId > 0
                    )
                    {
                        const selectedGroup =
                            this.accountGroups.find
                            (
                                (
                                    item:
                                        AccountGroup
                                ):
                                    boolean =>
                                {
                                    return item.AccountGroupId ===
                                        Number(selectedGroupId);
                                }
                            );


                        if
                        (
                            selectedGroup
                        )
                        {
                            this.entity.AccountGroupId =
                                selectedGroup.AccountGroupId;

                            this.entity.GroupCode =
                                selectedGroup.GroupCode;

                            this.entity.ClassCode =
                                selectedGroup.ClassCode;

                            this.entity.Mode =
                                selectedGroup.Mode;
                        }
                    }


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
                        'Load Account Groups Error',
                        error
                    );

                    this.accountGroups = [];

                    this.accountGroupItems = [];

                    this.toast.error(
                        'Error',
                        'Failed to load Account Groups.'
                    );
                }
            });
    }

    //===========================================================
    // Load Account Sub Groups
    //===========================================================

    private loadAccountSubGroups
    (
        accountGroupId:
            number,
        selectedSubGroupId:
            number = 0
    ):
        void
    {
        if
        (
            !accountGroupId
        )
        {
            this.accountSubGroups = [];

            this.accountSubGroupItems = [];

            return;
        }


        this.accountSubGroupService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        AccountSubGroup[]
                ):
                    void =>
                {
                    this.accountSubGroups =
                        (response ?? [])
                            .filter
                            (
                                (
                                    item:
                                        AccountSubGroup
                                ):
                                    boolean =>
                                {
                                    if
                                    (
                                        Number(item.AccountGroupId) !==
                                        Number(accountGroupId)
                                    )
                                    {
                                        return false;
                                    }

                                    const selectable =
                                        item.IsActive
                                        &&
                                        item.AllowManualLedger;

                                    const isCurrent =
                                        !this.isAddMode
                                        &&
                                        Number(selectedSubGroupId) > 0
                                        &&
                                        Number(item.AccountSubGroupId) ===
                                        Number(selectedSubGroupId);

                                    return selectable || isCurrent;
                                }
                            );


                    this.accountSubGroupItems =
                        this.accountSubGroups.map
                        (
                            (
                                item:
                                    AccountSubGroup
                            ) =>
                            ({
                                label:
                                    `${item.SubGroupCode} - ${item.SubGroupName}`,

                                value:
                                    item.AccountSubGroupId
                            })
                        );


                    //===================================================
                    // Restore Existing Account Sub Group
                    //===================================================

                    if
                    (
                        selectedSubGroupId
                        &&
                        selectedSubGroupId > 0
                    )
                    {
                        const selectedSubGroup =
                            this.accountSubGroups.find
                            (
                                (
                                    item:
                                        AccountSubGroup
                                ):
                                    boolean =>
                                {
                                    return item.AccountSubGroupId ===
                                        Number(selectedSubGroupId);
                                }
                            );


                        if
                        (
                            selectedSubGroup
                        )
                        {
                            this.entity.AccountSubGroupId =
                                selectedSubGroup.AccountSubGroupId;

                            this.entity.SubGroupCode =
                                selectedSubGroup.SubGroupCode;

                            this.entity.GroupCode =
                                selectedSubGroup.GroupCode;

                            this.entity.ClassCode =
                                selectedSubGroup.ClassCode;

                            this.entity.Mode =
                                selectedSubGroup.Mode;
                        }
                    }


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
                        'Load Account Sub Groups Error',
                        error
                    );

                    this.accountSubGroups = [];

                    this.accountSubGroupItems = [];

                    this.toast.error(
                        'Error',
                        'Failed to load Account Sub Groups.'
                    );
                }
            });
    }

    //===========================================================
    // Initialize Entity
    //===========================================================

    private initializeEntity():
        void
    {
        this.entity =
        {
            GeneralLedgerId:0,
            AccountClassId:0,
            AccountClassName:'',
            AccountGroupId:0,
            AccountGroupName:'',
            AccountSubGroupId:0,
            AccountSubGroupName:'',
            ClassCode:'',
            Mode:'',
            GroupCode:'',
            SubGroupCode:'',
            LedgerCode:'',
            LedgerName:'',
            Remarks:'',
            IsActive:true
        };

        this.accountGroups =
            [];

        this.accountGroupItems =
            [];

        this.accountSubGroups =
            [];

        this.accountSubGroupItems =
            [];

        this.generateDefaults();
    }

    //===========================================================
    // Generate Defaults
    //===========================================================

    private generateDefaults():
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
        // No Account Class Selected
        //=======================================================

        if
        (
            !this.entity.AccountClassId
            ||
            this.entity.AccountClassId <= 0
        )
        {
            this.entity.ClassCode =
                '';

            this.entity.Mode =
                '';

            this.entity.AccountGroupId =
                0;

            this.entity.GroupCode =
                '';

            this.entity.AccountSubGroupId =
                0;

            this.entity.SubGroupCode =
                '';

            this.entity.LedgerCode =
                '';

            this.setInitialFormState();

            return;
        }

        //=======================================================
        // Load Groups
        //=======================================================

        this.loadAccountGroups(
            this.entity.AccountClassId
        );
    }

    //===========================================================
    // Account Class Change
    //===========================================================

    onAccountClassChange():
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }

        const accountClassId =
            Number(
                this.entity.AccountClassId
            );

        const selectedClass =
            this.accountClasses.find
            (
                (
                    item:
                        AccountClass
                ): boolean =>
                {
                    return item.AccountClassId ===
                        accountClassId;
                }
            );

        if
        (
            !selectedClass
        )
        {
            this.entity.ClassCode =
                '';

            this.entity.Mode =
                '';

            this.entity.AccountGroupId =
                0;

            this.entity.GroupCode =
                '';

            this.entity.AccountSubGroupId =
                0;

            this.entity.SubGroupCode =
                '';

            this.entity.LedgerCode =
                '';

            this.accountGroups =
                [];

            this.accountGroupItems =
                [];

            this.accountSubGroups =
                [];

            this.accountSubGroupItems =
                [];

            this.checkForChanges();

            this.cdr.detectChanges();

            return;
        }

        this.entity.ClassCode =
            selectedClass.ClassCode
            ??
            '';

        this.entity.Mode =
            selectedClass.Mode
            ??
            '';

        this.entity.AccountGroupId =
            0;

        this.entity.GroupCode =
            '';

        this.entity.AccountSubGroupId =
            0;

        this.entity.SubGroupCode =
            '';

        this.entity.LedgerCode =
            '';

        this.accountSubGroups =
            [];

        this.accountSubGroupItems =
            [];

        this.loadAccountGroups(
            accountClassId
        );

        this.checkForChanges();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Account Group Change
    //===========================================================

    onAccountGroupChange():
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }

        const accountGroupId =
            Number(
                this.entity.AccountGroupId
            );

        const selectedGroup =
            this.accountGroups.find
            (
                (
                    item:
                        AccountGroup
                ): boolean =>
                {
                    return item.AccountGroupId ===
                        accountGroupId;
                }
            );

        this.entity.AccountSubGroupId =
            0;

        this.entity.SubGroupCode =
            '';

        this.entity.LedgerCode =
            '';

        this.accountSubGroups =
            [];

        this.accountSubGroupItems =
            [];

        if
        (
            !selectedGroup
        )
        {
            this.entity.GroupCode =
                '';

            this.checkForChanges();

            this.cdr.detectChanges();

            return;
        }

        this.entity.GroupCode =
            selectedGroup.GroupCode
            ??
            '';

        this.entity.ClassCode =
            selectedGroup.ClassCode
            ??
            this.entity.ClassCode;

        this.entity.Mode =
            selectedGroup.Mode
            ??
            this.entity.Mode;

        this.loadAccountSubGroups(
            accountGroupId
        );

        this.checkForChanges();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Account Sub Group Change
    //===========================================================

    onAccountSubGroupChange
    (
        updateCode:
            boolean = true
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

        const accountSubGroupId =
            Number(
                this.entity.AccountSubGroupId
            );

        const selectedSubGroup =
            this.accountSubGroups.find
            (
                (
                    item:
                        AccountSubGroup
                ): boolean =>
                {
                    return item.AccountSubGroupId ===
                        accountSubGroupId;
                }
            );

        if
        (
            !selectedSubGroup
        )
        {
            this.entity.SubGroupCode =
                '';

            this.entity.LedgerCode =
                '';

            this.checkForChanges();

            this.cdr.detectChanges();

            return;
        }

        this.entity.SubGroupCode =
            selectedSubGroup.SubGroupCode
            ??
            '';

        this.entity.GroupCode =
            selectedSubGroup.GroupCode
            ??
            this.entity.GroupCode;

        this.entity.ClassCode =
            selectedSubGroup.ClassCode
            ??
            this.entity.ClassCode;

        this.entity.Mode =
            selectedSubGroup.Mode
            ??
            this.entity.Mode;

        this.entity.LedgerCode =
            '';

        if
        (
            updateCode
        )
        {
            this.generateNextCode();
        }

        this.checkForChanges();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Generate Next Code
    //===========================================================

    private generateNextCode():
        void
    {
        const accountSubGroupId =
            Number(
                this.entity.AccountSubGroupId
            );

        if
        (
            !accountSubGroupId
            ||
            accountSubGroupId <= 0
        )
        {
            this.entity.LedgerCode =
                '';

            return;
        }

        this.generalLedgerService
            .getNextCode(
                accountSubGroupId
            )
            .subscribe
            ({
                next:
                (
                    code:
                        string
                ): void =>
                {
                    // Ignore a late reply for a sub group no longer selected
                    if
                    (
                        Number(this.entity.AccountSubGroupId) !==
                        accountSubGroupId
                    )
                    {
                        return;
                    }

                    if
                    (
                        !code?.trim()
                    )
                    {
                        console.error(
                            'Generate General Ledger Code Error',
                            'Empty code returned from server.'
                        );

                        this.toast.error(
                            'Error',
                            'Failed to generate General Ledger code.'
                        );

                        return;
                    }

                    this.entity.LedgerCode =
                        code.trim();

                    this.entity.IsActive =
                        true;

                    this.setInitialFormState();
                },

                error:
                (
                    codeError:
                        unknown
                ): void =>
                {
                    console.error(
                        'Generate General Ledger Code Error',
                        codeError
                    );

                    this.entity.LedgerCode =
                        '';

                    const message =
                        typeof (codeError as any)?.error === 'string'
                        &&
                        (codeError as any).error.trim()
                            ? (codeError as any).error
                            : 'Failed to generate General Ledger code.';

                    this.toast.error(
                        'Error',
                        message
                    );

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
        this.generalLedgerService
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
                        GeneralLedgerId:
                            Number(
                                response?.GeneralLedgerId
                                ??
                                response?.generalLedgerId
                                ??
                                0
                            ),

                        AccountClassId:
                            Number(
                                response?.AccountClassId
                                ??
                                response?.accountClassId
                                ??
                                0
                            ),

                        AccountClassName:
                            response?.AccountClassName
                            ??
                            response?.accountClassName
                            ??
                            '',

                        AccountGroupId:
                            Number(
                                response?.AccountGroupId
                                ??
                                response?.accountGroupId
                                ??
                                0
                            ),

                        AccountGroupName:
                            response?.AccountGroupName
                            ??
                            response?.accountGroupName
                            ??
                            '',

                        AccountSubGroupId:
                            Number(
                                response?.AccountSubGroupId
                                ??
                                response?.accountSubGroupId
                                ??
                                0
                            ),

                        AccountSubGroupName:
                            response?.AccountSubGroupName
                            ??
                            response?.accountSubGroupName
                            ??
                            '',

                        ClassCode:
                            response?.ClassCode
                            ??
                            response?.classCode
                            ??
                            '',

                        Mode:
                            response?.Mode
                            ??
                            response?.mode
                            ??
                            '',

                        GroupCode:
                            response?.GroupCode
                            ??
                            response?.groupCode
                            ??
                            '',

                        SubGroupCode:
                            response?.SubGroupCode
                            ??
                            response?.subGroupCode
                            ??
                            '',

                        LedgerCode:
                            response?.LedgerCode
                            ??
                            response?.ledgerCode
                            ??
                            '',

                        LedgerName:
                            response?.LedgerName
                            ??
                            response?.ledgerName
                            ??
                            '',

                        // TODO: Map General Ledger specific configuration fields here

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

                    // Keep this ledger's class in the dropdown
                    this.buildAccountClassItems();

                    this.loadAccountGroups(
                        this.entity.AccountClassId,
                        this.entity.AccountGroupId
                    );

                    this.loadAccountSubGroups(
                        this.entity.AccountGroupId,
                        this.entity.AccountSubGroupId
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
                        'Load General Ledger Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Failed to load General Ledger.'
                    );

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
        //=======================================================
        // View Mode / Already Saving
        //=======================================================

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
            !this.entity.AccountClassId
            ||
            this.entity.AccountClassId <= 0
        )
        {
            this.toast.error(
                'Validation',
                'Account Class is required.'
            );

            return;
        }

        if
        (
            !this.entity.ClassCode?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Class Code is required.'
            );

            return;
        }

        if
        (
            !this.entity.Mode?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Mode is required.'
            );

            return;
        }

        if
        (
            !this.entity.AccountGroupId
            ||
            this.entity.AccountGroupId <= 0
        )
        {
            this.toast.error(
                'Validation',
                'Account Group is required.'
            );

            return;
        }

        if
        (
            !this.entity.GroupCode?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Group Code is required.'
            );

            return;
        }

        if
        (
            !this.entity.AccountSubGroupId
            ||
            this.entity.AccountSubGroupId <= 0
        )
        {
            this.toast.error(
                'Validation',
                'Account Sub Group is required.'
            );

            return;
        }

        if
        (
            !this.entity.SubGroupCode?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Sub Group Code is required.'
            );

            return;
        }

        // In add mode the server assigns the final code on save
        if
        (
            !this.isAddMode
            &&
            !this.entity.LedgerCode?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Ledger Code is required.'
            );

            return;
        }

        if
        (
            !this.entity.LedgerName?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Ledger Name is required.'
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
            CreateGeneralLedger =
        {
            AccountClassId:
                this.entity.AccountClassId,

            AccountGroupId:
                this.entity.AccountGroupId,

            AccountSubGroupId:
                this.entity.AccountSubGroupId,

            ClassCode:
                this.entity.ClassCode.trim(),

            Mode:
                this.entity.Mode,

            GroupCode:
                this.entity.GroupCode.trim(),

            SubGroupCode:
                this.entity.SubGroupCode.trim(),

            LedgerCode:
                this.entity.LedgerCode.trim(),

            LedgerName:
                this.entity.LedgerName.trim(),

            Remarks:
                this.entity.Remarks?.trim()
                ??
                '',

            IsActive:
                this.entity.IsActive
        };

        this.startProgress(
            'Saving General Ledger',
            'Please wait while the general ledger is being saved...'
        );

        this.withMinimumDuration(
            this.generalLedgerService.create(
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

                        'General ledger saved.',

                        () =>
                        {
                            this.setInitialFormState();

                            this.toast.success(
                                'Success',
                                'General Ledger created successfully.'
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
                        'Create General Ledger Error',
                        error
                    );

                    this.failProgress(
                        () =>
                        {
                            const message =
                                (error as any)?.error
                                ??
                                'Failed to create General Ledger.';

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
            UpdateGeneralLedger =
        {
            GeneralLedgerId:
                this.entity.GeneralLedgerId,

            AccountClassId:
                this.entity.AccountClassId,

            AccountGroupId:
                this.entity.AccountGroupId,

            AccountSubGroupId:
                this.entity.AccountSubGroupId,

            ClassCode:
                this.entity.ClassCode.trim(),

            Mode:
                this.entity.Mode,

            GroupCode:
                this.entity.GroupCode.trim(),

            SubGroupCode:
                this.entity.SubGroupCode.trim(),

            LedgerCode:
                this.entity.LedgerCode.trim(),

            LedgerName:
                this.entity.LedgerName.trim(),

            Remarks:
                this.entity.Remarks?.trim()
                ??
                '',

            IsActive:
                this.entity.IsActive
        };

        this.startProgress(
            'Updating General Ledger',
            'Please wait while the general ledger is being updated...'
        );

        this.withMinimumDuration(
            this.generalLedgerService.update(
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

                        'General ledger updated.',

                        () =>
                        {
                            this.setInitialFormState();

                            this.toast.success(
                                'Success',
                                'General Ledger updated successfully.'
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
                        'Update General Ledger Error',
                        error
                    );

                    this.failProgress(
                        () =>
                        {
                            const message =
                                (error as any)?.error
                                ??
                                'Failed to update General Ledger.';

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
        //=======================================================
        // Saving In Progress
        //=======================================================

        if
        (
            this.isSaving
        )
        {
            return;
        }

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
                    'general-ledgers',
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
                        'general-ledgers',
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