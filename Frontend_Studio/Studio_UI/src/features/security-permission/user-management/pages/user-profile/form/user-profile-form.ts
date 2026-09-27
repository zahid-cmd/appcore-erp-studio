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

import
{
    environment
}
from '../../../../../../environments/environment';


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
    DropdownComponent
}
from '../../../../../../shared/components/controls/dropdown/dropdown';

import
{
    ImageHubComponent
}
from '../../../../../../shared/components/controls/image-hub/image-hub';


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
    UserProfile,

    CreateUserProfile,

    UpdateUserProfile,

    UserProfileDefaults
}
from '../../../models/user-profile.model';

import
{
    UserProfileService
}
from '../../../services/user-profile.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'userProfile-form',

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

        DropdownComponent,

        ImageHubComponent,


        //=======================================================
        // Utilities
        //=======================================================

        ToastComponent,

        ConfirmDialogComponent
    ],


    templateUrl:'./user-profile-form.html',


    styleUrls:
    [
        './user-profile-form.css'
    ]
})


export class UserProfileForm
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);


    private readonly router =
        inject(Router);


    private readonly userprofileservice =
        inject(UserProfileService);


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
        'User Profile';


    entityName:
        string =
        'User Profile';



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
        UserProfile
    =
    {
        UserProfileId:0,

        ProfileCode:'',

        UserName:'',

        DisplayName:'',

        FullName:'',

        Email:'',

        MobileNo:'',

        UserPhotoPath:'',

        IsActive:true
    };



    //===========================================================
    // User Profile Photo
    //===========================================================

    selectedUserPhotoFile:
        File | null =
        null;


    userPhotoPreviewUrl:
        string =
        '';


    originalUserPhotoPath:
        string =
        '';



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
        this.revokeUserPhotoPreview();


        this.entity =
        {
            UserProfileId:0,

            ProfileCode:'',

            UserName:'',

            DisplayName:'',

            FullName:'',

            Email:'',

            MobileNo:'',

            UserPhotoPath:'',

            IsActive:true
        };


        this.selectedUserPhotoFile =
            null;


        this.userPhotoPreviewUrl =
            '';


        this.originalUserPhotoPath =
            '';


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

        this.userprofileservice
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    response:
                        UserProfileDefaults
                ): void =>
                {
                    this.entity.ProfileCode =
                        response.Code;


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
                        'Generate User Profile Defaults Error',

                        error
                    );


                    //===================================================
                    // Fallback Code
                    //===================================================

                    this.userprofileservice
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
                                    'Generate User Profile Code Error',

                                    codeError
                                );


                                this.entity.ProfileCode =
                                    'UP-001';


                                this.entity.IsActive =
                                    true;


                                this.setInitialFormState();
                            }
                        });
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
        this.userprofileservice
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
                        'User Profile API Response:',

                        response
                    );


                    const userPhotoPath:
                        string =
                        response?.UserPhotoPath
                        ??
                        response?.userPhotoPath
                        ??
                        '';


                    this.entity =
                    {
                        UserProfileId:
                            Number(
                                response?.UserProfileId
                                ??
                                response?.userProfileId
                                ??
                                0
                            ),

                        ProfileCode:
                            response?.ProfileCode
                            ??
                            response?.profileCode
                            ??
                            '',

                        UserName:
                            response?.UserName
                            ??
                            response?.userName
                            ??
                            '',

                        DisplayName:
                            response?.DisplayName
                            ??
                            response?.displayName
                            ??
                            '',

                        FullName:
                            response?.FullName
                            ??
                            response?.fullName
                            ??
                            '',

                        Email:
                            response?.Email
                            ??
                            response?.email
                            ??
                            '',

                        MobileNo:
                            response?.MobileNo
                            ??
                            response?.mobileNo
                            ??
                            '',

                        UserPhotoPath:
                            userPhotoPath,

                        IsActive:
                            Boolean(
                                response?.IsActive
                                ??
                                response?.isActive
                                ??
                                true
                            )
                    };


                    //===================================================
                    // Reset Selected Photo
                    //===================================================

                    this.selectedUserPhotoFile =
                        null;


                    //===================================================
                    // Store Original Photo Path
                    //===================================================

                    this.originalUserPhotoPath =
                        userPhotoPath;


                    //===================================================
                    // Build Existing Photo Preview
                    //===================================================

                    this.revokeUserPhotoPreview();


                    this.userPhotoPreviewUrl =
                        this.buildUserPhotoUrl(
                            userPhotoPath
                        );


                    console.log(
                        'User Profile Form Entity:',

                        this.entity
                    );


                    console.log(
                        'User Profile Photo URL:',

                        this.userPhotoPreviewUrl
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
                        'Load User Profile Error',

                        error
                    );


                    this.toast.error(
                        'Error',

                        'Failed to load User Profile.'
                    );


                    this.onBackToList();
                }
            });
    }



    //===========================================================
    // Build User Photo URL
    //===========================================================

    private buildUserPhotoUrl(
        photoPath:
            string
    ):
        string
    {
        const path =
            photoPath?.trim()
            ??
            '';


        if
        (
            !path
        )
        {
            return '';
        }


        //=======================================================
        // Absolute URL
        //=======================================================

        if
        (
            path.startsWith('http://')
            ||
            path.startsWith('https://')
            ||
            path.startsWith('data:')
            ||
            path.startsWith('blob:')
        )
        {
            return path;
        }


        //=======================================================
        // API Base URL
        //=======================================================

        const apiBaseUrl =
            environment.apiUrl
                .replace(
                    /\/api\/?$/,
                    ''
                );


        //=======================================================
        // Relative Upload Path
        //=======================================================

        if
        (
            path.startsWith('/')
        )
        {
            return `${apiBaseUrl}${path}`;
        }


        return `${apiBaseUrl}/${path}`;
    }



    //===========================================================
    // User Profile Photo Selected
    //===========================================================

    onUserPhotoChange
    (
        file:
            File | null
    ):
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
        // Remove Photo
        //=======================================================

        if
        (
            !file
        )
        {
            this.revokeUserPhotoPreview();


            this.selectedUserPhotoFile =
                null;


            this.entity.UserPhotoPath =
                '';


            this.userPhotoPreviewUrl =
                '';


            this.checkForChanges();


            this.cdr.detectChanges();


            return;
        }


        //=======================================================
        // Revoke Previous Preview
        //=======================================================

        this.revokeUserPhotoPreview();


        //=======================================================
        // Store Selected File
        //=======================================================

        this.selectedUserPhotoFile =
            file;


        //=======================================================
        // Existing Path Will Be Replaced
        //=======================================================

        this.entity.UserPhotoPath =
            '';


        //=======================================================
        // Create Local Preview
        //=======================================================

        this.userPhotoPreviewUrl =
            URL.createObjectURL(
                file
            );


        //=======================================================
        // Track Changes
        //=======================================================

        this.checkForChanges();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Revoke User Photo Preview
    //===========================================================

    private revokeUserPhotoPreview():
        void
    {
        if
        (
            this.userPhotoPreviewUrl
            &&
            this.userPhotoPreviewUrl.startsWith('blob:')
        )
        {
            URL.revokeObjectURL(
                this.userPhotoPreviewUrl
            );
        }
    }



    //===========================================================
    // Upload User Photo
    //===========================================================

    private uploadUserPhoto():
        void
    {
        if
        (
            !this.selectedUserPhotoFile
            ||
            this.entity.UserProfileId <= 0
        )
        {
            this.completeSave();
            return;
        }


        this.userprofileservice
            .uploadUserPhoto(
                this.entity.UserProfileId,

                this.selectedUserPhotoFile
            )
            .subscribe
            ({
                next:
                (
                    photoPath:
                        string
                ): void =>
                {
                    this.entity.UserPhotoPath =
                        photoPath
                        ??
                        '';


                    this.originalUserPhotoPath =
                        this.entity.UserPhotoPath;


                    this.completeSave();
                },


                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Upload User Profile Photo Error',

                        error
                    );


                    const message =
                        (error as any)?.error
                        ??
                        'User Profile was saved, but the profile photo could not be uploaded.';


                    this.toast.error(
                        'Photo Upload',

                        message
                    );


                    this.completeSave();
                }
            });
    }



    //===========================================================
    // Delete User Photo
    //===========================================================

    private deleteUserPhoto():
        void
    {
        if
        (
            this.entity.UserProfileId <= 0
            ||
            !this.originalUserPhotoPath
        )
        {
            this.completeSave();
            return;
        }


        this.userprofileservice
            .deleteUserPhoto(
                this.entity.UserProfileId
            )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.entity.UserPhotoPath =
                        '';


                    this.originalUserPhotoPath =
                        '';


                    this.completeSave();
                },


                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Delete User Profile Photo Error',

                        error
                    );


                    const message =
                        (error as any)?.error
                        ??
                        'User Profile was updated, but the profile photo could not be removed.';


                    this.toast.error(
                        'Photo Removal',

                        message
                    );


                    this.completeSave();
                }
            });
    }



    //===========================================================
    // Complete Save
    //===========================================================

    private completeSave():
        void
    {
        this.originalEntity =
            JSON.stringify(
                this.entity
            );


        this.hasChanges =
            false;


        this.toast.success(
            'Success',

            this.mode === 'edit'
                ? 'User Profile updated successfully.'
                : 'User Profile created successfully.'
        );


        this.onBackToList();
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
            this.originalEntity
            ||
            this.selectedUserPhotoFile !== null;
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

                'User Profile Code is required.'
            );

            return;
        }


        if
        (
            !this.entity.UserName?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'User Name / Login ID is required.'
            );

            return;
        }


        if
        (
            !this.entity.DisplayName?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Display Name is required.'
            );

            return;
        }


        if
        (
            !this.entity.FullName?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Full Name is required.'
            );

            return;
        }


        if
        (
            !this.entity.Email?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Email is required.'
            );

            return;
        }


        if
        (
            !this.entity.MobileNo?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Mobile No. is required.'
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
            CreateUserProfile =
        {
            ProfileCode:
                this.entity.ProfileCode.trim(),

            UserName:
                this.entity.UserName.trim(),

            DisplayName:
                this.entity.DisplayName.trim(),

            FullName:
                this.entity.FullName.trim(),

            Email:
                this.entity.Email.trim(),

            MobileNo:
                this.entity.MobileNo.trim(),

            UserPhotoPath:
                '',

            IsActive:
                this.entity.IsActive
        };


        this.userprofileservice
            .create(
                model
            )
            .subscribe
            ({
                next:
                (
                    userProfileId:
                        number
                ): void =>
                {
                    this.entity.UserProfileId =
                        Number(
                            userProfileId
                        );


                    //===================================================
                    // Upload Photo After Create
                    //===================================================

                    if
                    (
                        this.selectedUserPhotoFile
                    )
                    {
                        this.uploadUserPhoto();

                        return;
                    }


                    this.completeSave();
                },


                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Create User Profile Error',

                        error
                    );


                    const message =
                        (error as any)?.error
                        ??
                        'Failed to create User Profile.';


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
            UpdateUserProfile =
        {
            UserProfileId:
                this.entity.UserProfileId,

            ProfileCode:
                this.entity.ProfileCode.trim(),

            UserName:
                this.entity.UserName.trim(),

            DisplayName:
                this.entity.DisplayName.trim(),

            FullName:
                this.entity.FullName.trim(),

            Email:
                this.entity.Email.trim(),

            MobileNo:
                this.entity.MobileNo.trim(),

            UserPhotoPath:
                this.entity.UserPhotoPath
                ??
                '',

            IsActive:
                this.entity.IsActive
        };


        this.userprofileservice
            .update(
                model
            )
            .subscribe
            ({
                next:
                (): void =>
                {
                    //===================================================
                    // New Photo Selected
                    //===================================================

                    if
                    (
                        this.selectedUserPhotoFile
                    )
                    {
                        this.uploadUserPhoto();

                        return;
                    }


                    //===================================================
                    // Existing Photo Removed
                    //===================================================

                    if
                    (
                        this.originalUserPhotoPath
                        &&
                        !this.entity.UserPhotoPath
                    )
                    {
                        this.deleteUserPhoto();

                        return;
                    }


                    this.completeSave();
                },


                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Update User Profile Error',

                        error
                    );


                    const message =
                        (error as any)?.error
                        ??
                        'Failed to update User Profile.';


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

                    'user-management',

                    'user-profile',

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

                        'user-management',

                        'user-profile',

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