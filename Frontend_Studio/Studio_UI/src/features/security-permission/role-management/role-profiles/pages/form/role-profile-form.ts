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
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

import
{
    DropdownComponent
}
from '../../../../../../shared/components/controls/dropdown/dropdown';

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
    RoleProfile
}
from '../../models/role-profile.model';

import
{
    RoleProfileService
}
from '../../services/role-profile.service';

import
{
    Designation
}
from '../../../../../human-resource/human-resource-setup/models/designation.model';

import
{
    DesignationService
}
from '../../../../../human-resource/human-resource-setup/services/designation.service';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'app-role-profile-form',

    standalone:true,

    imports:
    [
        CommonModule,
        FormsModule,

        PageHeaderComponent,
        PageToolbarComponent,
        CommandCenterComponent,
        ControlTabsComponent,
        PageCanvasComponent,
        FormGridComponent,
        FormSectionComponent,

        TextboxComponent,
        TextareaComponent,
        SearchDropdownComponent,
        DropdownComponent,
        ToastComponent,
        ConfirmDialogComponent
    ],

    templateUrl:'./role-profile-form.html',

    styleUrls:
    [
        './role-profile-form.css'
    ]
})

export class RoleProfileFormComponent
implements OnInit
{
    //===========================================================
    // Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly roleProfileService =
        inject(RoleProfileService);

    private readonly designationService =
        inject(DesignationService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    //===========================================================
    // Mode
    //===========================================================

    mode:'add' | 'edit' | 'view' = 'add';

    roleProfileId = 0;

    //===========================================================
    // Header
    //===========================================================

    pageTitle = 'Role Profile';

    entityName = 'Role Profile';

    selectedTab = 'general';

    //===========================================================
    // Tabs
    //===========================================================

    get tabTitle(): string
    {
        switch (this.mode)
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

    get tabs(): ControlTab[]
    {
        return [
            {
                id:'general',
                label:this.tabTitle
            }
        ];
    }

    //===========================================================
    // Dropdowns
    //===========================================================

    designations:
    {
        value:number;
        text:string;
    }[] = [];

    statuses =
    [
        {
            value:true,
            text:'Active'
        },
        {
            value:false,
            text:'Inactive'
        }
    ];

    //===========================================================
    // Model
    //===========================================================

    roleProfile:RoleProfile =
    {
        roleProfileId:0,

        profileCode:'',

        profileName:'',

        displayName:'',

        profileTypeId:0,

        profileTypeName:'',

        remarks:'',

        displayOrder:1,

        isSystemRole:false,

        isDefaultRole:false,

        isActive:true
    };

    //===========================================================
    // State
    //===========================================================

    private originalRoleProfile = '';

    hasChanges = false;

    //===========================================================
    // Init
    //===========================================================

    ngOnInit():
        void
    {
        this.initializeMode();

        this.loadDesignations();
    }

    //===========================================================
    // Initialize Mode
    //===========================================================

    private initializeMode():
        void
    {
        const id =
            Number(
                this.route.snapshot.paramMap.get('id')
            );

        const url =
            this.router.url.toLowerCase();

        if (url.includes('/view/'))
        {
            this.mode = 'view';
        }
        else if (url.includes('/edit/'))
        {
            this.mode = 'edit';
        }
        else
        {
            this.mode = 'add';
        }

        if (id > 0)
        {
            this.roleProfileId = id;

            this.loadRoleProfile();

            return;
        }

        this.loadDefaults();
    }

    //===========================================================
    // Load Role Profile
    //===========================================================

    private loadRoleProfile():
        void
    {
        this.roleProfileService
            .getById(this.roleProfileId)
            .subscribe(
            {
                next:(response) =>
                {
                    this.roleProfile =
                    {
                        ...response
                    };

                    this.updateDisplayName();

                    this.originalRoleProfile =
                        JSON.stringify(this.roleProfile);

                    this.hasChanges =
                        false;

                    this.cdr.detectChanges();
                },

                error:() =>
                {
                    this.toast.error(
                        'Error',
                        'Failed to load role profile.'
                    );

                    this.onBackToList();
                }
            });
    }

    //===========================================================
    // Load Designations
    //===========================================================

    private loadDesignations():
        void
    {
        this.designationService
            .getAll()
            .subscribe(
            {
                next:(response:Designation[]) =>
                {
                    this.designations =
                        response.map(
                            designation =>
                            ({
                                value:designation.id,
                                text:designation.name
                            })
                        );

                    this.updateDisplayName();

                    this.cdr.detectChanges();
                },

                error:() =>
                {
                    this.toast.error(
                        'Error',
                        'Failed to load designations.'
                    );
                }
            });
    }

    //===========================================================
    // Load Defaults
    //===========================================================

    private loadDefaults():
        void
    {
        this.roleProfileService
            .getDefaults()
            .subscribe(
            {
                next:(defaults) =>
                {
                    this.roleProfile.profileCode =
                        defaults.profileCode;

                    this.roleProfile.displayOrder =
                        defaults.displayOrder;

                    this.roleProfile.isSystemRole =
                        defaults.isSystemRole;

                    this.roleProfile.isDefaultRole =
                        defaults.isDefaultRole;

                    this.roleProfile.isActive =
                        defaults.isActive;

                    this.originalRoleProfile =
                        JSON.stringify(this.roleProfile);

                    this.hasChanges =
                        false;

                    this.cdr.detectChanges();
                }
            });
    }
    //===========================================================
    // Track Form Changes
    //===========================================================

    checkForChanges():
        void
    {
        this.hasChanges =
            JSON.stringify(this.roleProfile)
            !==
            this.originalRoleProfile;
    }

    //===========================================================
    // Update Display Name
    //===========================================================

    private updateDisplayName():
        void
    {
        const profileName =
            this.roleProfile.profileName
                ?.trim() ?? '';

        const designation =
            this.designations.find(
                x => x.value === this.roleProfile.profileTypeId
            )?.text ?? '';

        if (!profileName || !designation)
        {
            this.roleProfile.displayName = '';

            this.checkForChanges();

            return;
        }

        this.roleProfile.displayName =
            `${profileName} - ${designation}`;

        this.checkForChanges();
    }

    //===========================================================
    // Designation Changed
    //===========================================================

    onDesignationChange(
        designationId:number
    ):
        void
    {
        this.roleProfile.profileTypeId =
            designationId;

        this.updateDisplayName();
    }

    //===========================================================
    // Profile Name Changed
    //===========================================================

    onProfileNameChange():
        void
    {
        this.updateDisplayName();
    }

    //===========================================================
    // Status Changed
    //===========================================================

    onStatusChange(
        value:boolean
    ):
        void
    {
        this.roleProfile.isActive =
            value;

        this.checkForChanges();
    }

    //===========================================================
    // Active Tab Changed
    //===========================================================

    onTabChange(
        tabId:string
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
        if (!this.roleProfile.profileName.trim())
        {
            this.toast.warning(
                'Validation',
                'Role profile name is required.'
            );

            return;
        }

        if (!this.roleProfile.profileTypeId)
        {
            this.toast.warning(
                'Validation',
                'Designation is required.'
            );

            return;
        }

        this.updateDisplayName();

        if (!this.roleProfile.displayName.trim())
        {
            this.toast.warning(
                'Validation',
                'Display name is required.'
            );

            return;
        }

        if (this.mode === 'add')
        {
            this.roleProfileService
                .create(this.roleProfile)
                .subscribe(
                {
                    next:() =>
                    {
                        this.originalRoleProfile =
                            JSON.stringify(this.roleProfile);

                        this.hasChanges =
                            false;

                        this.toast.success(
                            'Success',
                            'Role profile created successfully.'
                        );

                        this.onBackToList();
                    },

                    error:(error) =>
                    {
                        console.error(error);

                        this.toast.error(
                            'Error',
                            error?.error ??
                            'Failed to create role profile.'
                        );
                    }
                });

            return;
        }

        this.roleProfileService
            .update(this.roleProfile)
            .subscribe(
            {
                next:() =>
                {
                    this.originalRoleProfile =
                        JSON.stringify(this.roleProfile);

                    this.hasChanges =
                        false;

                    this.toast.success(
                        'Success',
                        'Role profile updated successfully.'
                    );

                    this.onBackToList();
                },

                error:(error) =>
                {
                    console.error(error);

                    this.toast.error(
                        'Error',
                        error?.error ??
                        'Failed to update role profile.'
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
        if (this.mode === 'edit')
        {
            this.loadRoleProfile();

            return;
        }

        this.roleProfile =
        {
            roleProfileId:0,

            profileCode:this.roleProfile.profileCode,

            profileName:'',

            displayName:'',

            profileTypeId:0,

            profileTypeName:'',

            remarks:'',

            displayOrder:this.roleProfile.displayOrder,

            isSystemRole:this.roleProfile.isSystemRole,

            isDefaultRole:this.roleProfile.isDefaultRole,

            isActive:true
        };

        this.checkForChanges();
    }

    //===========================================================
    // Back To List
    //===========================================================

    onBackToList():
        void
    {
        //=======================================================
        // View Mode
        //=======================================================

        if (this.isViewMode)
        {
            this.router.navigate(
            [
                '/security-permission/role-management/role-profiles'
            ]);

            return;
        }

        //=======================================================
        // No Changes
        //=======================================================

        if (!this.hasChanges)
        {
            this.router.navigate(
            [
                '/security-permission/role-management/role-profiles'
            ]);

            return;
        }

        //=======================================================
        // Confirm
        //=======================================================

        this.confirmDialog.open(
            'Cancel Changes',

            'Any unsaved changes will be lost. Do you want to leave this page?',

            () =>
            {
                this.router.navigate(
                [
                    '/security-permission/role-management/role-profiles'
                ]);
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
}