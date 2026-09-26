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
    Dashboards,

    CreateDashboards,

    UpdateDashboards,

    DashboardsDefaults
}
from '../../../models/dashboards.model';

import
{
    DashboardsService
}
from '../../../services/dashboards.service';

import
{
    RoleProfileService
}
from '../../../../../security-permission/role-management/services/role-profile.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'dashboards-form',

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


    templateUrl:'./dashboards-form.html',


    styleUrls:
    [
        './dashboards-form.css'
    ]
})


//===============================================================
// Dashboards Form Component
//===============================================================

export class DashboardsForm
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);


    private readonly router =
        inject(Router);


    private readonly dashboardsservice =
        inject(DashboardsService);


    private readonly roleprofileservice =
        inject(RoleProfileService);


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
        'Dashboards';


    entityName:
        string =
        'Dashboard';



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
    // Status Items
    //
    // Status uses the standard DropdownComponent.
    //===========================================================

    statusItems:
        {
            text:
                string;

            value:
                boolean;
        }[] =
    [
        {
            text:'Active',

            value:true
        },

        {
            text:'Inactive',

            value:false
        }
    ];



    //===========================================================
    // Dashboard Type Items
    //
    // Dashboard Type uses SearchDropdownComponent.
    //===========================================================

    dashboardTypeItems:
        {
            text:
                string;

            value:
                string;
        }[] =
    [
        {
            text:'Default',

            value:'default'
        },

        {
            text:'Role Based',

            value:'role-based'
        }
    ];



    //===========================================================
    // Role Profile Items
    //
    // Role Profile uses SearchDropdownComponent.
    //
    // Only active Role Profiles are available for a new
    // Dashboard assignment.
    //===========================================================

    roleProfileItems:
        {
            text:
                string;

            value:
                number;
        }[] =
    [];



    //===========================================================
    // Entity
    //===========================================================

    entity:
        Dashboards =
    {
        id:0,

        code:'',

        name:'',

        dashboardKey:'',

        dashboardType:'',

        roleProfileId:null,

        roleProfileName:'',

        status:true,

        remarks:''
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
    // Dashboard Key Read Only
    //===========================================================

    get isDashboardKeyReadonly():
        boolean
    {
        return true;
    }



    //===========================================================
    // Role Profile Disabled
    //===========================================================

    get isRoleProfileDisabled():
        boolean
    {
        return (
            this.isViewMode
            ||
            this.entity.dashboardType !==
            'role-based'
        );
    }



    //===========================================================
    // Status Disabled
    //
    // Status is editable in Add and Edit mode.
    // Status is locked only in View mode.
    //===========================================================

    get isStatusDisabled():
        boolean
    {
        return this.isViewMode;
    }



    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.loadRoleProfiles();

        this.initializeMode();
    }



    //===========================================================
    // Load Role Profiles
    //===========================================================

    private loadRoleProfiles():
        void
    {
        this.roleprofileservice
            .getAll()
            .subscribe(
            {
                next:
                (
                    response:
                        any[]
                ):
                    void =>
                {
                    this.roleProfileItems =
                        response

                            .filter
                            (
                                profile =>
                                    profile.status
                                    !==
                                    false
                            )

                            .map
                            (
                                profile =>
                                ({
                                    text:
                                        profile.displayName
                                        ??
                                        profile.profileName
                                        ??
                                        profile.roleName
                                        ??
                                        '',

                                    value:
                                        Number(
                                            profile.roleProfileId
                                        )
                                })
                            )

                            .filter
                            (
                                profile =>
                                    profile.value >
                                    0
                                    &&
                                    profile.text
                                    .trim()
                                    .length >
                                    0
                            );


                    //================================================
                    // Preserve Existing Role Profile
                    //
                    // If an existing Dashboard references an
                    // inactive Role Profile, keep that profile
                    // available while editing/viewing it.
                    //================================================

                    if
                    (
                        this.entity.roleProfileId
                        !==
                        null
                        &&
                        this.entity.roleProfileId >
                        0
                    )
                    {
                        const existingRoleProfile =
                            this.roleProfileItems.find
                            (
                                profile =>
                                    profile.value ===
                                    this.entity.roleProfileId
                            );


                        if
                        (
                            !existingRoleProfile
                            &&
                            this.entity.roleProfileName
                        )
                        {
                            this.roleProfileItems =
                            [
                                {
                                    text:
                                        this.entity.roleProfileName,

                                    value:
                                        this.entity.roleProfileId
                                },

                                ...this.roleProfileItems
                            ];
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
                        'Load Role Profiles Error',

                        error
                    );


                    this.roleProfileItems =
                        [];


                    this.toast.error(
                        'Role Profiles',

                        'Failed to load role profiles.'
                    );


                    this.cdr.detectChanges();
                }
            });
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
    // Initialize Entity
    //===========================================================

    private initializeEntity():
        void
    {
        this.entity =
        {
            id:0,

            code:'',

            name:'',

            dashboardKey:'',

            dashboardType:'',

            roleProfileId:null,

            roleProfileName:'',

            status:true,

            remarks:''
        };


        this.originalEntity =
            JSON.stringify(
                this.entity
            );


        this.hasChanges =
            false;


        //=======================================================
        // Load Next Code
        //=======================================================

        this.loadNextCode();
    }



    //===========================================================
    // Load Next Code
    //===========================================================

    private loadNextCode():
        void
    {
        this.dashboardsservice
            .getDefaults()
            .subscribe(
            {
                next:
                (
                    response:
                        DashboardsDefaults
                ):
                    void =>
                {
                    this.entity.code =
                        response.code;


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
                ):
                    void =>
                {
                    console.error(
                        'Load Dashboard Defaults Error',

                        error
                    );


                    this.toast.error(
                        'Error',

                        'Failed to generate dashboard code.'
                    );
                }
            });
    }



    //===========================================================
    // Load Entity
    //===========================================================

    private loadEntity():
        void
    {
        this.dashboardsservice
            .getById(
                this.entityId
            )
            .subscribe(
            {
                next:
                (
                    response:
                        Dashboards
                ):
                    void =>
                {
                    this.entity =
                        response;


                    //================================================
                    // Ensure Dashboard Key Matches Name
                    //================================================

                    this.generateDashboardKey();


                    //================================================
                    // Ensure Role Profile Is Available
                    //================================================

                    if
                    (
                        this.entity.roleProfileId
                        !==
                        null
                        &&
                        this.entity.roleProfileId >
                        0
                    )
                    {
                        const existingRoleProfile =
                            this.roleProfileItems.find
                            (
                                profile =>
                                    profile.value ===
                                    this.entity.roleProfileId
                            );


                        if
                        (
                            !existingRoleProfile
                            &&
                            this.entity.roleProfileName
                        )
                        {
                            this.roleProfileItems =
                            [
                                {
                                    text:
                                        this.entity.roleProfileName,

                                    value:
                                        this.entity.roleProfileId
                                },

                                ...this.roleProfileItems
                            ];
                        }
                    }


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
                ):
                    void =>
                {
                    console.error(
                        'Load Dashboard Error',

                        error
                    );


                    this.toast.error(
                        'Error',

                        'Failed to load dashboard.'
                    );


                    this.navigateToList();
                }
            });
    }



    //===========================================================
    // Generate Dashboard Key
    //===========================================================

    private generateDashboardKey():
        void
    {
        const name =
            this.entity.name?.trim()
            ??
            '';


        if
        (
            !name
        )
        {
            this.entity.dashboardKey =
                '';

            return;
        }


        this.entity.dashboardKey =
            name
                .toLowerCase()
                .replace(
                    /\s+/g,
                    '-'
                );
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
        // Generate Dashboard Key
        //=======================================================

        this.generateDashboardKey();


        //=======================================================
        // Validation
        //=======================================================

        if
        (
            !this.entity.name?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Name is required.'
            );

            return;
        }


        if
        (
            !this.entity.dashboardKey?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Dashboard Key could not be generated.'
            );

            return;
        }


        if
        (
            !this.entity.dashboardType?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Dashboard Type is required.'
            );

            return;
        }


        //=======================================================
        // Role Profile Validation
        //=======================================================

        if
        (
            this.entity.dashboardType ===
            'role-based'
            &&
            (
                this.entity.roleProfileId ===
                null
                ||
                this.entity.roleProfileId <=
                0
            )
        )
        {
            this.toast.error(
                'Validation',

                'Role Profile is required for a Role Based Dashboard.'
            );

            return;
        }


        //=======================================================
        // Default Dashboard
        //=======================================================

        if
        (
            this.entity.dashboardType ===
            'default'
        )
        {
            this.entity.roleProfileId =
                null;

            this.entity.roleProfileName =
                '';
        }


        //=======================================================
        // Create
        //=======================================================

        if
        (
            this.mode === 'add'
        )
        {
            const model:
                CreateDashboards =
            {
                name:
                    this.entity.name,

                dashboardKey:
                    this.entity.dashboardKey,

                dashboardType:
                    this.entity.dashboardType,

                roleProfileId:
                    this.entity.roleProfileId,

                status:
                    this.entity.status,

                remarks:
                    this.entity.remarks
            };


            this.dashboardsservice
                .create(
                    model
                )
                .subscribe(
                {
                    next:
                    (): void =>
                    {
                        this.originalEntity =
                            JSON.stringify(
                                this.entity
                            );


                        this.hasChanges =
                            false;


                        this.toast.success(
                            'Success',

                            'Dashboard created successfully.'
                        );


                        this.navigateToList();
                    },


                    error:
                    (
                        error:
                            unknown
                    ):
                        void =>
                    {
                        console.error(
                            'Create Dashboard Error',

                            error
                        );


                        const message =
                            (error as any)?.error?.message
                            ??
                            (error as any)?.error
                            ??
                            'Failed to create dashboard.';


                        this.toast.error(
                            'Validation',

                            message
                        );
                    }
                });


            return;
        }


        //=======================================================
        // Update
        //=======================================================

        const model:
            UpdateDashboards =
        {
            id:
                this.entity.id,

            name:
                this.entity.name,

            dashboardKey:
                this.entity.dashboardKey,

            dashboardType:
                this.entity.dashboardType,

            roleProfileId:
                this.entity.roleProfileId,

            status:
                this.entity.status,

            remarks:
                this.entity.remarks
        };


        this.dashboardsservice
            .update(
                model
            )
            .subscribe(
            {
                next:
                (): void =>
                {
                    this.originalEntity =
                        JSON.stringify(
                            this.entity
                        );


                    this.hasChanges =
                        false;


                    this.toast.success(
                        'Success',

                        'Dashboard updated successfully.'
                    );


                    this.navigateToList();
                },


                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Update Dashboard Error',

                        error
                    );


                    const message =
                        (error as any)?.error?.message
                        ??
                        (error as any)?.error
                        ??
                        'Failed to update dashboard.';


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
            this.navigateToList();


            return;
        }


        this.confirmDialog.open(

            'Cancel Changes',

            'Any unsaved changes will be lost. Do you want to leave this page?',


            (): void =>
            {
                this.navigateToList();
            },


            'Leave',

            'Stay',

            'primary'
        );
    }



    //===========================================================
    // Navigate To List
    //===========================================================

    private navigateToList():
        void
    {
        void this.router.navigate(
        [
            'list'
        ],
        {
            relativeTo:
                this.route.parent
        });
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
        //=======================================================
        // Generate Dashboard Key From Name
        //=======================================================

        this.generateDashboardKey();


        //=======================================================
        // Track Changes
        //=======================================================

        this.checkForChanges();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Dashboard Type Changed
    //===========================================================

    onDashboardTypeChange():
        void
    {
        if
        (
            this.entity.dashboardType !==
            'role-based'
        )
        {
            this.entity.roleProfileId =
                null;

            this.entity.roleProfileName =
                '';
        }


        this.checkForChanges();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Role Profile Changed
    //===========================================================

    onRoleProfileChange():
        void
    {
        const selectedRoleProfile =
            this.roleProfileItems.find
            (
                profile =>
                    profile.value ===
                    this.entity.roleProfileId
            );


        this.entity.roleProfileName =
            selectedRoleProfile?.text
            ??
            '';


        this.checkForChanges();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Status Changed
    //===========================================================

    onStatusChange():
        void
    {
        this.checkForChanges();


        this.cdr.detectChanges();
    }

}