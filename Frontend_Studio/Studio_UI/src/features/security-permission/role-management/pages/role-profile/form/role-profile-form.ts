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
    RoleProfile,

    CreateRoleProfile,

    UpdateRoleProfile,

    RoleProfileDefaults
}
from '../../../models/role-profile.model';

import
{
    RoleProfileService
}
from '../../../services/role-profile.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'roleProfile-form',

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


        //=======================================================
        // Utilities
        //=======================================================

        ToastComponent,

        ConfirmDialogComponent
    ],


    templateUrl:'./role-profile-form.html',


    styleUrls:
    [
        './role-profile-form.css'
    ]
})


export class RoleProfileForm
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);


    private readonly router =
        inject(Router);


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
        'Role Profile';


    entityName:
        string =
        'Role Profile';



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
    //===========================================================

    statusItems:
        any[]
    =
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
    // Entity
    //===========================================================

    entity:
        RoleProfile
    =
    {
        RoleProfileId:0,

        ProfileCode:'',

        ProfileName:'',

        DisplayOrder:0,

        IsActive:true,

        Remarks:''
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
    // Initialize Entity
    //===========================================================

    private initializeEntity():
        void
    {
        this.entity =
        {
            RoleProfileId:0,

            ProfileCode:'',

            ProfileName:'',

            DisplayOrder:0,

            IsActive:true,

            Remarks:''
        };


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
        // Get Defaults
        //=======================================================

        this.roleprofileservice
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    response:
                        RoleProfileDefaults
                ): void =>
                {
                    this.entity.ProfileCode =
                        response.Code;


                    this.entity.DisplayOrder =
                        response.DisplayOrder;


                    this.entity.IsActive =
                        true;


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
                        'Generate Role Profile Defaults Error',

                        error
                    );


                    //===================================================
                    // Fallback Code
                    //===================================================

                    this.roleprofileservice
                        .getNextCode()
                        .subscribe
                        ({
                            next:
                            (
                                code:
                                    string
                            ): void =>
                            {
                                this.entity.ProfileCode =
                                    code;


                                this.loadSuggestedDisplayOrder();
                            },


                            error:
                            (
                                codeError:
                                    unknown
                            ): void =>
                            {
                                console.error(
                                    'Generate Role Profile Code Error',

                                    codeError
                                );


                                this.entity.ProfileCode =
                                    'RP-001';


                                this.loadSuggestedDisplayOrder();
                            }
                        });
                }
            });
    }



    //===========================================================
    // Load Suggested Display Order
    //===========================================================

    private loadSuggestedDisplayOrder():
        void
    {
        this.roleprofileservice
            .getSuggestedDisplayOrder()
            .subscribe
            ({
                next:
                (
                    displayOrder:
                        number
                ): void =>
                {
                    this.entity.DisplayOrder =
                        displayOrder;


                    this.entity.IsActive =
                        true;


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
                        'Load Suggested Display Order Error',

                        error
                    );


                    this.entity.DisplayOrder =
                        1;


                    this.entity.IsActive =
                        true;


                    this.originalEntity =
                        JSON.stringify(
                            this.entity
                        );


                    this.hasChanges =
                        false;


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Load Entity
    //===========================================================

    private loadEntity():
        void
    {
        this.roleprofileservice
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
                    console.log(
                        'Role Profile API Response:',

                        response
                    );


                    this.entity =
                    {
                        RoleProfileId:
                            Number(
                                response?.RoleProfileId
                                ??
                                response?.roleProfileId
                                ??
                                0
                            ),

                        ProfileCode:
                            response?.ProfileCode
                            ??
                            response?.profileCode
                            ??
                            '',

                        ProfileName:
                            response?.ProfileName
                            ??
                            response?.profileName
                            ??
                            '',

                        DisplayOrder:
                            Number(
                                response?.DisplayOrder
                                ??
                                response?.displayOrder
                                ??
                                0
                            ),

                        IsActive:
                            Boolean(
                                response?.IsActive
                                ??
                                response?.isActive
                                ??
                                false
                            ),

                        Remarks:
                            response?.Remarks
                            ??
                            response?.remarks
                            ??
                            ''
                    };


                    console.log(
                        'Role Profile Form Entity:',

                        this.entity
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
                        'Load Role Profile Error',

                        error
                    );


                    this.toast.error(
                        'Error',

                        'Failed to load Role Profile.'
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
            !this.entity.ProfileCode?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Profile Code is required.'
            );

            return;
        }


        if
        (
            !this.entity.ProfileName?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Profile Name is required.'
            );

            return;
        }


        if
        (
            this.entity.DisplayOrder == null
            ||
            this.entity.DisplayOrder < 1
        )
        {
            this.toast.error(
                'Validation',

                'Display Order is required.'
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
            CreateRoleProfile =
        {
            ProfileCode:
                this.entity.ProfileCode.trim(),

            ProfileName:
                this.entity.ProfileName.trim(),

            DisplayOrder:
                this.entity.DisplayOrder,

            IsActive:
                this.entity.IsActive,

            Remarks:
                this.entity.Remarks
                ??
                ''
        };


        this.roleprofileservice
            .create(
                model
            )
            .subscribe
            ({
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

                        'Role Profile created successfully.'
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
                        'Create Role Profile Error',

                        error
                    );


                    const message =
                        (error as any)?.error
                        ??
                        'Failed to create Role Profile.';


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
            UpdateRoleProfile =
        {
            RoleProfileId:
                this.entity.RoleProfileId,

            ProfileCode:
                this.entity.ProfileCode.trim(),

            ProfileName:
                this.entity.ProfileName.trim(),

            DisplayOrder:
                this.entity.DisplayOrder,

            IsActive:
                this.entity.IsActive,

            Remarks:
                this.entity.Remarks
                ??
                ''
        };


        this.roleprofileservice
            .update(
                model
            )
            .subscribe
            ({
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

                        'Role Profile updated successfully.'
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
                        'Update Role Profile Error',

                        error
                    );


                    const message =
                        (error as any)?.error
                        ??
                        'Failed to update Role Profile.';


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
                    '/security-permission',

                    'role-management',

                    'role-profile',

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
                        '/security-permission',

                        'role-management',

                        'role-profile',

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