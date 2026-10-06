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
    AccountSubGroup,
    CreateAccountSubGroup,
    UpdateAccountSubGroup
}
from '../../../models/account-sub-group.model';

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
    AccountSubGroupService
}
from '../../../services/account-sub-group.service';

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

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'account-sub-group-form',

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

    templateUrl:'./account-sub-group-form.html',

    styleUrls:
    [
        './account-sub-group-form.css'
    ]
})

//===============================================================
// Account Sub Group Form
//===============================================================

export class AccountSubGroupForm
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly accountSubGroupService =
        inject(AccountSubGroupService);

    private readonly accountClassService =
        inject(AccountClassService);

    private readonly accountGroupService =
        inject(AccountGroupService);

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
        'Account Sub Group';

    entityName:
        string =
        'Account Sub Group';

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
    // Manual Ledger Items
    //===========================================================

    manualLedgerItems:
        any[]
        =
        [
            {
                label:'Yes',
                value:true
            },
            {
                label:'No',
                value:false
            }
        ];

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
            AccountSubGroup
            =
            {
                AccountSubGroupId:0,
                AccountClassId:0,
                AccountClassName:'',
                AccountGroupId:0,
                AccountGroupName:'',
                ClassCode:'',
                Mode:'',
                GroupCode:'',
                SubGroupCode:'',
                SubGroupName:'',
                AllowManualLedger:false,
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
                    this.accountClasses =
                        (response ?? [])
                            .filter
                            (
                                (
                                    item:
                                        AccountClass
                                ): boolean =>
                                {
                                    return (
                                        item.IsActive
                                        &&
                                        item.AllowManualGroupCreation
                                    );
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
    // Load Account Groups
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
                                    return (
                                        item.IsActive
                                        &&
                                        item.AccountClassId ===
                                        Number(accountClassId)
                                    );
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
    // Initialize Entity
    //===========================================================

    private initializeEntity():
        void
    {
        this.entity =
        {
            AccountSubGroupId:0,
            AccountClassId:0,
            AccountClassName:'',
            AccountGroupId:0,
            AccountGroupName:'',
            ClassCode:'',
            Mode:'',
            GroupCode:'',
            SubGroupCode:'',
            SubGroupName:'',
            AllowManualLedger:true,
            Remarks:'',
            IsActive:true
        };

        this.accountGroups =
            [];

        this.accountGroupItems =
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

            this.entity.SubGroupCode =
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

            this.entity.SubGroupCode =
                '';

            this.accountGroups =
                [];

            this.accountGroupItems =
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

        this.entity.SubGroupCode =
            '';

        this.loadAccountGroups(
            accountClassId
        );

        this.checkForChanges();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Account Group Change
    //===========================================================

    onAccountGroupChange
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

        if
        (
            !selectedGroup
        )
        {
            this.entity.GroupCode =
                '';

            this.entity.SubGroupCode =
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

        this.entity.SubGroupCode =
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
        const accountGroupId =
            Number(
                this.entity.AccountGroupId
            );

        if
        (
            !accountGroupId
            ||
            accountGroupId <= 0
        )
        {
            this.entity.SubGroupCode =
                '';

            return;
        }

        this.accountSubGroupService
            .getNextCode(
                accountGroupId
            )
            .subscribe
            ({
                next:
                (
                    code:
                        string
                ): void =>
                {
                    if
                    (
                        !code?.trim()
                    )
                    {
                        console.error(
                            'Generate Account Sub Group Code Error',
                            'Empty code returned from server.'
                        );

                        this.toast.error(
                            'Error',
                            'Failed to generate Account Sub Group code.'
                        );

                        return;
                    }

                    this.entity.SubGroupCode =
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
                        'Generate Account Sub Group Code Error',
                        codeError
                    );

                    this.toast.error(
                        'Error',
                        'Failed to generate Account Sub Group code.'
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
    // Load Entity
    //===========================================================

    private loadEntity():
        void
    {
        this.accountSubGroupService
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
                        AccountSubGroupId:
                            Number(
                                response?.AccountSubGroupId
                                ??
                                response?.accountSubGroupId
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

                        SubGroupName:
                            response?.SubGroupName
                            ??
                            response?.subGroupName
                            ??
                            '',

                        AllowManualLedger:
                            Boolean(
                                response?.AllowManualLedger
                                ??
                                response?.allowManualLedger
                                ??
                                false
                            ),

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

                    this.loadAccountGroups(
                        this.entity.AccountClassId,
                        this.entity.AccountGroupId
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
                        'Load Account Sub Group Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Failed to load Account Sub Group.'
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
            !this.entity.SubGroupCode?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Sub Group Code is required.'
            );

            return;
        }

        if
        (
            !this.entity.SubGroupName?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Sub Group Name is required.'
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
            CreateAccountSubGroup =
        {
            AccountClassId:
                this.entity.AccountClassId,

            AccountGroupId:
                this.entity.AccountGroupId,

            ClassCode:
                this.entity.ClassCode.trim(),

            Mode:
                this.entity.Mode,

            GroupCode:
                this.entity.GroupCode.trim(),

            SubGroupCode:
                this.entity.SubGroupCode.trim(),

            SubGroupName:
                this.entity.SubGroupName.trim(),

            AllowManualLedger:
                this.entity.AllowManualLedger,

            Remarks:
                this.entity.Remarks?.trim()
                ??
                '',

            IsActive:
                this.entity.IsActive
        };

        this.accountSubGroupService
            .create(
                model
            )
            .subscribe
            ({
                next:
                ():
                    void =>
                {
                    this.originalEntity =
                        JSON.stringify(
                            this.entity
                        );

                    this.hasChanges =
                        false;

                    this.toast.success(
                        'Success',
                        'Account Sub Group created successfully.'
                    );

                    this.onBackToList();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Create Account Sub Group Error',
                        error
                    );

                    const message =
                        (error as any)?.error
                        ??
                        'Failed to create Account Sub Group.';

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
            UpdateAccountSubGroup =
        {
            AccountSubGroupId:
                this.entity.AccountSubGroupId,

            AccountClassId:
                this.entity.AccountClassId,

            AccountGroupId:
                this.entity.AccountGroupId,

            ClassCode:
                this.entity.ClassCode.trim(),

            Mode:
                this.entity.Mode,

            GroupCode:
                this.entity.GroupCode.trim(),

            SubGroupCode:
                this.entity.SubGroupCode.trim(),

            SubGroupName:
                this.entity.SubGroupName.trim(),

            AllowManualLedger:
                this.entity.AllowManualLedger,

            Remarks:
                this.entity.Remarks?.trim()
                ??
                '',

            IsActive:
                this.entity.IsActive
        };

        this.accountSubGroupService
            .update(
                model
            )
            .subscribe
            ({
                next:
                ():
                    void =>
                {
                    this.originalEntity =
                        JSON.stringify(
                            this.entity
                        );

                    this.hasChanges =
                        false;

                    this.toast.success(
                        'Success',
                        'Account Sub Group updated successfully.'
                    );

                    this.onBackToList();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Update Account Sub Group Error',
                        error
                    );

                    const message =
                        (error as any)?.error
                        ??
                        'Failed to update Account Sub Group.';

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
                    'account-sub-group',
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
                        'account-sub-group',
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