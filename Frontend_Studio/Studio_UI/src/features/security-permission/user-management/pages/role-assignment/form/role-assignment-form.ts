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
    PageCanvasComponent,
    PageCanvasConfig
}
from '../../../../../../shared/components/layout/page-canvas/page-canvas';

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
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

import
{
    ListTableColumn
}
from '../../../../../../shared/components/layout/list-table/list-table';

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
    ConfirmDialogComponent
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';

import
{
    ConfirmDialogService
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';

import
{
    PaginationComponent
}
from '../../../../../../shared/components/controls/pagination/pagination';

import
{
    RecordCounterComponent
}
from '../../../../../../shared/components/utilities/record-counter/record-counter';

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
    RoleAssignment
}
from '../../../models/role-assignment.model';

import
{
    UserProfileService
}
from '../../../services/user-profile.service';

import
{
    RoleAssignmentService
}
from '../../../services/role-assignment.service';

import
{
    RoleProfileService
}
from '../../../../role-management/services/role-profile.service';

import
{
    RecordCounterSection
}
from '../../../../../../shared/components/utilities/record-counter/record-counter.model';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'app-role-assignment-form',

    standalone:true,

    imports:
    [
        CommonModule,

        FormsModule,

        PageCanvasComponent,

        PageHeaderComponent,

        RecordCounterComponent,

        PageToolbarComponent,

        CommandCenterComponent,

        ControlTabsComponent,

        SearchDropdownComponent,

        ToastComponent,

        ConfirmDialogComponent,

        PaginationComponent,

        ProgressDialogComponent
    ],

    templateUrl:'./role-assignment-form.html',

    styleUrls:
    [
        './role-assignment-form.css'
    ]
})


export class RoleAssignmentForm
implements OnInit
{

    //===========================================================
    // Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);


    private readonly router =
        inject(Router);


    private readonly userProfileService =
        inject(UserProfileService);


    private readonly roleProfileService =
        inject(RoleProfileService);


    private readonly roleAssignmentService =
        inject(RoleAssignmentService);


    private readonly confirmDialog =
        inject(ConfirmDialogService);


    private readonly toast =
        inject(ToastService);


    private readonly cdr =
        inject(ChangeDetectorRef);


    private readonly progressDialog =
        inject(ProgressDialogService);



    //===========================================================
    // Mode
    //===========================================================

    mode:
        'add' | 'edit' | 'view'
        =
        'add';


    roleAssignmentId:
        number =
        0;



    //===========================================================
    // Save Button Text
    //===========================================================

    get saveButtonText():
        string
    {
        return this.mode === 'edit'
            ?
            'Update'
            :
            'Save';
    }



    //===========================================================
    // Header
    //===========================================================

    pageTitle =
        'Role Assignment';


    entityName =
        'Role Assignment';


    selectedTab =
        'general';



    //===========================================================
    // Tab Change
    //===========================================================

    onTabChange
    (
        tab:
            string
    ):
        void
    {
        this.selectedTab =
            tab;
    }



    //===========================================================
    // Tab Title
    //===========================================================

    get tabTitle():
        string
    {
        switch(this.mode)
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
    // Pagination
    //===========================================================

    currentPage:
        number =
        1;


    pageSize:
        number =
        10;



    //===========================================================
    // Loading State
    //===========================================================

    loading:
        boolean =
        false;


    orbitLoading:
        boolean =
        false;


    loadFailed:
        boolean =
        false;



    //===========================================================
    // Page Canvas Configuration
    //===========================================================

    readonly canvasConfig:
        PageCanvasConfig =
    {
        mode:'list',

        showHeader:false,

        showFooter:true,

        reserveFooterSpace:true,

        bodyScrollable:true,

        fixedHeight:true,

        visibleRows:10,

        rowHeight:32,

        headerHeight:36,

        footerHeight:56
    };


    //===========================================================
    // Table Columns
    //===========================================================

    readonly columns:
        ListTableColumn[] =
    [
        {
            header:'#',

            field:'serial',

            type:'serial',

            width:'60px',

            align:'center'
        },

        {
            header:'Role Profile Code',

            field:'roleProfileCode',

            width:'180px',

            align:'left'
        },

        {
            header:'Role Profile',

            field:'roleProfileName',

            align:'left'
        },

        {
            header:'Actions',

            field:'actions',

            type:'actions',

            width:'120px',

            align:'center'
        }
    ];


    //===========================================================
    // Table Column Width
    //===========================================================
    // Compatibility helper for the current HTML.
    // This will be removed when the HTML is changed to consume
    // the ListTableColumn configuration directly.
    //===========================================================

    getColumnWidth
    (
        column:
            'serial'
            |
            'code'
            |
            'name'
            |
            'status'
            |
            'action'
    ):
        number | null
    {
        const fieldMap:
        {
            serial:
                string;

            code:
                string;

            name:
                string;

            status:
                string;

            action:
                string;
        } =
        {
            serial:'serial',

            code:'roleProfileCode',

            name:'roleProfileName',

            status:'isActive',

            action:'actions'
        };


        const selectedField =
            fieldMap[column];


        const selectedColumn =
            this.columns.find(
                item =>
                    item.field ===
                    selectedField
            );


        if
        (
            !selectedColumn
            ||
            !selectedColumn.width
        )
        {
            return null;
        }


        return Number(
            String(
                selectedColumn.width
            ).replace(
                'px',

                ''
            )
        );
    }



    //===========================================================
    // User Profile Collection
    //===========================================================

    userProfiles:
        any[] =
    [
    ];



    //===========================================================
    // Role Profile Collection
    //===========================================================

    roleProfiles:
        any[] =
    [
    ];



    //===========================================================
    // Selected Values
    //===========================================================

    selectedUserProfileId:
        number | null =
        null;


    selectedRoleProfileId:
        number | null =
        null;



    //===========================================================
    // Assignment Rows
    //===========================================================

    roleAssignmentRows:
        any[] =
    [
    ];


    pagedRoleAssignmentRows:
        any[] =
    [
    ];



    //===========================================================
    // Assignment Entity
    //===========================================================

    roleAssignment:
        RoleAssignment =
    {
        roleAssignmentId:0,

        userProfileId:0,

        userProfileCode:'',

        userProfileName:'',

        roleProfileCount:0,

        isActive:true,

        details:[]
    };



    //===========================================================
    // Selection State
    //===========================================================

    isAddDisabled:
        boolean =
        true;



    //===========================================================
    // State
    //===========================================================

    private originalRoleAssignment =
        '';


    hasChanges:
        boolean =
        false;



    //===========================================================
    // User Profile Lock
    //===========================================================

    isUserProfileLocked:
        boolean =
        false;



    //===========================================================
    // Init
    //===========================================================

    ngOnInit():
        void
    {
        this.initializeMode();

        this.loadUserProfiles();

        this.loadRoleProfiles();

        this.updatePagination();

        this.updateUserProfileLock();
    }


    //===========================================================
    // Load User Profiles
    //===========================================================

    private loadUserProfiles():
        void
    {
        //===========================================================
        // Clear Collection First
        //===========================================================

        this.userProfiles =
        [
        ];


        //===========================================================
        // Add Mode
        //===========================================================

        if
        (
            this.mode === 'add'
        )
        {
            this.roleAssignmentService
                .getAll()
                .subscribe(
                {
                    next:
                        (
                            assignments:
                                RoleAssignment[]
                        ):
                            void =>
                    {
                        //=======================================================
                        // Existing User Profile Ids
                        //=======================================================

                        const configuredUserProfileIds =
                            new Set<number>();


                        assignments.forEach(
                            (
                                assignment:
                                    RoleAssignment
                            ):
                                void =>
                            {
                                const userProfileId =
                                    Number(
                                        assignment.userProfileId
                                    );


                                if
                                (
                                    userProfileId > 0
                                )
                                {
                                    configuredUserProfileIds.add(
                                        userProfileId
                                    );
                                }
                            }
                        );


                        //=======================================================
                        // Load User Profiles
                        //=======================================================

                        this.userProfileService
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
                                    this.userProfiles =
                                        response.filter(
                                            (
                                                user:
                                                    any
                                            ):
                                                boolean =>
                                            {
                                                const userProfileId =
                                                    Number(
                                                        user?.userProfileId
                                                        ??
                                                        user?.UserProfileId
                                                        ??
                                                        user?.id
                                                        ??
                                                        user?.Id
                                                        ??
                                                        0
                                                    );


                                                return (
                                                    userProfileId > 0
                                                    &&
                                                    !configuredUserProfileIds.has(
                                                        userProfileId
                                                    )
                                                );
                                            }
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
                                        'Load User Profiles Error',

                                        error
                                    );


                                    this.userProfiles =
                                    [
                                    ];


                                    this.toast.error(
                                        'Load Failed',

                                        'Unable to load user profiles.'
                                    );


                                    this.cdr.detectChanges();
                                }
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
                            'Load Role Assignments Error',

                            error
                        );


                        this.userProfiles =
                        [
                        ];


                        this.toast.error(
                            'Load Failed',

                            'Unable to determine available user profiles.'
                        );


                        this.cdr.detectChanges();
                    }
                }
            );


            return;
        }


        //===========================================================
        // Edit / View Mode
        //===========================================================

        this.userProfileService
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
                    this.userProfiles =
                    [
                        ...response
                    ];


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
                        'Load User Profiles Error',

                        error
                    );


                    this.userProfiles =
                    [
                    ];


                    this.toast.error(
                        'Load Failed',

                        'Unable to load user profiles.'
                    );


                    this.cdr.detectChanges();
                }
            }
        );
    }


    //===========================================================
    // Load Role Profiles
    //===========================================================

    private loadRoleProfiles():
        void
    {
        this.roleProfileService
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
                    this.roleProfiles =
                    [
                        ...response
                    ];


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


                    this.roleProfiles =
                    [
                    ];


                    this.toast.error(
                        'Load Failed',

                        'Unable to load role profiles.'
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
        const url =
            this.router.url;


        if
        (
            url.includes('/edit/')
        )
        {
            this.mode =
                'edit';
        }
        else if
        (
            url.includes('/view/')
        )
        {
            this.mode =
                'view';
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
            this.roleAssignmentId =
                id;


            this.loadRoleAssignment();
        }
        else
        {
            this.loadDefaults();
        }
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
                    currentRoute.snapshot.paramMap.get(
                        'id'
                    )
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
    // Load Defaults
    //===========================================================

    private loadDefaults():
        void
    {
        this.roleAssignment =
        {
            roleAssignmentId:0,

            userProfileId:0,

            userProfileCode:'',

            userProfileName:'',

            roleProfileCount:0,

            isActive:true,

            details:[]
        };


        this.roleAssignmentRows =
        [
        ];


        this.selectedUserProfileId =
            null;


        this.selectedRoleProfileId =
            null;


        this.originalRoleAssignment =
            JSON.stringify(
                this.buildRoleAssignment()
            );


        this.updatePagination();

        this.updateUserProfileLock();

        this.cdr.detectChanges();
    }



    //===========================================================
    // Load Role Assignment
    //===========================================================

    private loadRoleAssignment():
        void
    {
        this.loading =
            false;


        this.orbitLoading =
            true;


        this.loadFailed =
            false;


        this.roleAssignmentService
            .getById(
                this.roleAssignmentId
            )
            .subscribe(
            {
                next:
                    (
                        response:
                            RoleAssignment
                    ):
                        void =>
                {
                    this.bindRoleAssignment(
                        response
                    );


                    this.orbitLoading =
                        false;


                    this.loading =
                        false;


                    this.loadFailed =
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
                        'Load Role Assignment Error',

                        error
                    );


                    this.orbitLoading =
                        false;


                    this.loading =
                        false;


                    this.loadFailed =
                        true;


                    this.toast.error(
                        'Load Failed',

                        'Unable to load role assignment.'
                    );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Bind Role Assignment
    //===========================================================

    private bindRoleAssignment
    (
        data:
            RoleAssignment
    ):
        void
    {
        this.roleAssignment =
        {
            ...data
        };


        this.selectedUserProfileId =
            data.userProfileId
            ??
            null;


        this.roleAssignmentRows =
            (
                data.details
                ??
                []
            )
            .map(
                (
                    detail:
                        any
                ) =>
                ({
                    roleAssignmentDetailId:
                        detail.roleAssignmentDetailId
                        ??
                        0,

                    roleAssignmentId:
                        detail.roleAssignmentId
                        ??
                        this.roleAssignmentId,

                    roleProfileId:
                        detail.roleProfileId
                        ??
                        0,

                    roleProfileCode:
                        detail.roleProfileCode
                        ??
                        '',

                    roleProfileName:
                        detail.roleProfileName
                        ??
                        '',

                    isActive:
                        detail.isActive
                        ??
                        true
                })
            );


        this.selectedRoleProfileId =
            null;


        this.originalRoleAssignment =
            JSON.stringify(
                this.buildRoleAssignment()
            );


        this.updatePagination();

        this.updateUserProfileLock();

        this.detectChanges();

        this.cdr.detectChanges();
    }



    //===========================================================
    // Detect Changes
    //===========================================================

    private detectChanges():
        void
    {
        const current =
            this.buildRoleAssignment();


        this.hasChanges =

            JSON.stringify(
                current
            )
            !==
            this.originalRoleAssignment;
    }



    //===========================================================
    // User Profile Changed
    //===========================================================

    onUserProfileChanged
    (
        value:
            number | null
    ):
        void
    {
        this.selectedUserProfileId =
            value;


        if
        (
            this.selectedUserProfileId
            ==
            null
        )
        {
            this.roleAssignment.userProfileId =
                0;


            this.roleAssignment.userProfileName =
                '';


            this.roleAssignment.userProfileCode =
                '';


            this.isUserProfileLocked =
                false;


            this.isAddDisabled =
                true;


            this.detectChanges();

            this.cdr.detectChanges();

            return;
        }


        this.roleAssignment.userProfileId =
            this.selectedUserProfileId;


        const selectedUser =
            this.userProfiles.find(
                user =>
                    Number(
                        user.userProfileId
                        ??
                        user.UserProfileId
                        ??
                        user.id
                        ??
                        user.Id
                    )
                    ===
                    Number(
                        this.selectedUserProfileId
                    )
            );


        if
        (
            selectedUser
        )
        {
            this.roleAssignment.userProfileName =
                selectedUser.displayName
                ??
                selectedUser.DisplayName
                ??
                selectedUser.fullName
                ??
                selectedUser.FullName
                ??
                selectedUser.userName
                ??
                selectedUser.UserName
                ??
                '';


            this.roleAssignment.userProfileCode =
                selectedUser.userProfileCode
                ??
                selectedUser.UserProfileCode
                ??
                selectedUser.code
                ??
                selectedUser.Code
                ??
                '';
        }


        this.isAddDisabled =
            this.selectedRoleProfileId == null;


        this.updateUserProfileLock();

        this.detectChanges();

        this.cdr.detectChanges();
    }



    //===========================================================
    // Role Profile Changed
    //===========================================================

    onRoleProfileChanged
    (
        value:
            number | null
    ):
        void
    {
        this.selectedRoleProfileId =
            value;


        this.isAddDisabled =
            this.selectedUserProfileId == null
            ||
            this.selectedRoleProfileId == null;


        this.detectChanges();

        this.cdr.detectChanges();
    }



    //===========================================================
    // Add Selection
    //===========================================================

    onAddSelection():
        void
    {
        if
        (
            this.selectedUserProfileId == null
            ||
            this.selectedRoleProfileId == null
        )
        {
            return;
        }


        //=======================================================
        // Duplicate Validation
        //=======================================================

        const duplicate =
            this.roleAssignmentRows.some(
                row =>
                    Number(
                        row.roleProfileId
                    )
                    ===
                    Number(
                        this.selectedRoleProfileId
                    )
            );


        if
        (
            duplicate
        )
        {
            this.toast.warning(
                'Already Added',

                'This role profile is already assigned to the selected user.'
            );


            return;
        }


        //=======================================================
        // Find Role Profile
        //=======================================================

        const selectedRoleProfile =
            this.roleProfiles.find(
                roleProfile =>
                    Number(
                        roleProfile.roleProfileId
                        ??
                        roleProfile.RoleProfileId
                        ??
                        roleProfile.id
                        ??
                        roleProfile.Id
                    )
                    ===
                    Number(
                        this.selectedRoleProfileId
                    )
            );


        if
        (
            !selectedRoleProfile
        )
        {
            this.toast.error(
                'Error',

                'Unable to find the selected role profile.'
            );


            return;
        }


        //=======================================================
        // Add Assignment Row
        //=======================================================

        this.roleAssignmentRows.push(
        {
            roleAssignmentDetailId:0,

            roleAssignmentId:
                this.roleAssignmentId,

            roleProfileId:
                this.selectedRoleProfileId,

            roleProfileCode:
                selectedRoleProfile.profileCode
                ??
                selectedRoleProfile.ProfileCode
                ??
                selectedRoleProfile.roleProfileCode
                ??
                selectedRoleProfile.RoleProfileCode
                ??
                selectedRoleProfile.code
                ??
                selectedRoleProfile.Code
                ??
                '',

            roleProfileName:
                selectedRoleProfile.profileName
                ??
                selectedRoleProfile.ProfileName
                ??
                selectedRoleProfile.roleProfileName
                ??
                selectedRoleProfile.RoleProfileName
                ??
                selectedRoleProfile.displayName
                ??
                selectedRoleProfile.DisplayName
                ??
                '',

            isActive:true
        });


        this.roleAssignment.roleProfileCount =
            this.roleAssignmentRows.length;


        this.selectedRoleProfileId =
            null;


        this.isAddDisabled =
            true;


        this.updatePagination();

        this.updateUserProfileLock();

        this.detectChanges();

        this.cdr.detectChanges();
    }



    //===========================================================
    // Remove Assignment
    //===========================================================

    onRemoveAssignment
    (
        row:
            any
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


        this.roleAssignmentRows =
            this.roleAssignmentRows.filter(
                item =>
                    Number(
                        item.roleProfileId
                    )
                    !==
                    Number(
                        row.roleProfileId
                    )
            );


        this.roleAssignment.roleProfileCount =
            this.roleAssignmentRows.length;


        this.updatePagination();

        this.updateUserProfileLock();

        this.detectChanges();

        this.cdr.detectChanges();
    }



    //===========================================================
    // Update Pagination
    //===========================================================

    updatePagination():
        void
    {
        const totalPages =

            Math.max(

                1,

                Math.ceil(

                    this.roleAssignmentRows.length
                    /
                    this.pageSize

                )
            );


        if
        (
            this.currentPage > totalPages
        )
        {
            this.currentPage =
                totalPages;
        }


        const start =

            (
                this.currentPage - 1
            )
            *
            this.pageSize;


        this.pagedRoleAssignmentRows =

            this.roleAssignmentRows.slice(

                start,

                start + this.pageSize
            );
    }



    //===========================================================
    // Page Change
    //===========================================================

    onPageChange
    (
        page:
            number
    ):
        void
    {
        this.currentPage =
            page;


        this.updatePagination();
    }



    //===========================================================
    // Page Size Change
    //===========================================================

    onPageSizeChange
    (
        pageSize:
            number
    ):
        void
    {
        this.pageSize =
            pageSize;


        this.currentPage =
            1;


        this.updatePagination();
    }



    //===========================================================
    // Reset Selection
    //===========================================================

    onResetSelection():
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }


        this.selectedRoleProfileId =
            null;


        this.isAddDisabled =
            this.selectedUserProfileId == null;


        this.detectChanges();

        this.cdr.detectChanges();
    }



    //===========================================================
    // Clear
    //===========================================================

    clear():
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }


        this.selectedUserProfileId =
            null;


        this.selectedRoleProfileId =
            null;


        this.roleAssignmentRows =
        [
        ];


        this.roleAssignment =
        {
            roleAssignmentId:0,

            userProfileId:0,

            userProfileCode:'',

            userProfileName:'',

            roleProfileCount:0,

            isActive:true,

            details:[]
        };


        this.currentPage =
            1;


        this.isAddDisabled =
            true;


        this.updateUserProfileLock();

        this.updatePagination();

        this.detectChanges();

        this.cdr.detectChanges();
    }



    //===========================================================
    // Update User Profile Lock
    //===========================================================

    private updateUserProfileLock():
        void
    {
        this.isUserProfileLocked =
            this.mode !== 'add'
            ||
            this.roleAssignmentRows.length > 0;
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
    // Build Role Assignment Payload
    //===========================================================

    private buildRoleAssignment():
        RoleAssignment
    {
        return {

            roleAssignmentId:
                this.roleAssignment.roleAssignmentId
                ??
                this.roleAssignmentId,

            userProfileId:
                this.selectedUserProfileId
                ??
                0,

            userProfileCode:
                this.roleAssignment.userProfileCode
                ??
                '',

            userProfileName:
                this.roleAssignment.userProfileName
                ??
                '',

            roleProfileCount:
                this.roleAssignmentRows.length,

            isActive:
                this.roleAssignment.isActive
                ??
                true,

            details:
                this.roleAssignmentRows.map(
                    row =>
                    ({
                        roleAssignmentDetailId:
                            row.roleAssignmentDetailId
                            ??
                            0,

                        roleAssignmentId:
                            row.roleAssignmentId
                            ??
                            this.roleAssignmentId,

                        roleProfileId:
                            row.roleProfileId,

                        roleProfileCode:
                            row.roleProfileCode
                            ??
                            '',

                        roleProfileName:
                            row.roleProfileName
                            ??
                            '',

                        isActive:
                            row.isActive
                            ??
                            true
                    })
                )
        };
    }



    //===========================================================
    // Save
    //===========================================================

    save():
        void
    {
        const payload =
            this.buildRoleAssignment();


        if
        (
            this.mode === 'add'
        )
        {
            this.create(
                payload
            );
        }
        else
        {
            this.update(
                payload
            );
        }
    }



    //===========================================================
    // Create
    //===========================================================

    private create
    (
        payload:
            RoleAssignment
    ):
        void
    {
        this.progressDialog.show(
            'Saving Role Assignment',

            'Preparing data...',

            false
        );


        this.progressDialog.update(
            20,

            'Preparing data...'
        );


        this.roleAssignmentService
            .create(
                payload
            )
            .subscribe(
            {
                next:
                    (
                        id:
                            number
                    ):
                        void =>
                {
                    this.progressDialog.update(
                        80,

                        'Role assignment saved successfully...'
                    );


                    this.progressDialog.update(
                        100,

                        'Finalizing...'
                    );


                    setTimeout(
                        () =>
                        {
                            this.progressDialog.close();


                            this.toast.success(
                                'Success',

                                'Role Assignment created successfully.'
                            );


                            this.hasChanges =
                                false;


                            void this.router.navigate(
                            [
                                '/security-permission/user-management/role-assignment/list'
                            ]);
                        },

                        300
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
                        'Create Role Assignment Error',

                        error
                    );


                    this.progressDialog.close();


                    this.toast.error(
                        'Save Failed',

                        'Failed to create role assignment.'
                    );
                }
            });
    }



    //===========================================================
    // Update
    //===========================================================

    private update
    (
        payload:
            RoleAssignment
    ):
        void
    {
        this.progressDialog.show(
            'Updating Role Assignment',

            'Preparing data...',

            false
        );


        this.progressDialog.update(
            20,

            'Preparing data...'
        );


        this.roleAssignmentService
            .update(
                payload
            )
            .subscribe(
            {
                next:
                    ():
                        void =>
                {
                    this.progressDialog.update(
                        80,

                        'Role assignment updated successfully...'
                    );


                    this.progressDialog.update(
                        100,

                        'Finalizing...'
                    );


                    setTimeout(
                        () =>
                        {
                            this.progressDialog.close();


                            this.toast.success(
                                'Success',

                                'Role Assignment updated successfully.'
                            );


                            this.hasChanges =
                                false;


                            void this.router.navigate(
                            [
                                '/security-permission/user-management/role-assignment/list'
                            ]);
                        },

                        300
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
                        'Update Role Assignment Error',

                        error
                    );


                    this.progressDialog.close();


                    this.toast.error(
                        'Update Failed',

                        'Failed to update role assignment.'
                    );
                }
            });
    }



    //===========================================================
    // Delete
    //===========================================================

    delete():
        void
    {
        if
        (
            this.roleAssignmentId <= 0
        )
        {
            return;
        }


        this.confirmDialog.open(

            'Delete Role Assignment',

            'Are you sure you want to delete this role assignment?',


            () =>
            {
                this.roleAssignmentService
                    .delete(
                        this.roleAssignmentId
                    )
                    .subscribe(
                    {
                        next:
                            ():
                                void =>
                        {
                            this.toast.success(
                                'Deleted',

                                'Role Assignment deleted successfully.'
                            );


                            void this.router.navigate(
                            [
                                '/security-permission/user-management/role-assignment/list'
                            ]);
                        },


                        error:
                            (
                                error:
                                    unknown
                            ):
                                void =>
                        {
                            console.error(
                                'Delete Role Assignment Error',

                                error
                            );


                            this.toast.error(
                                'Delete Failed',

                                'Failed to delete role assignment.'
                            );
                        }
                    });
            }
        );
    }



    //===========================================================
    // Restore
    //===========================================================

    restore():
        void
    {
        this.confirmDialog.open(

            'Restore Role Assignment',

            'Are you sure you want to restore this role assignment?',


            () =>
            {
                this.roleAssignmentService
                    .restore()
                    .subscribe(
                    {
                        next:
                            ():
                                void =>
                        {
                            this.toast.success(
                                'Restored',

                                'Role Assignment restored successfully.'
                            );


                            this.loadRoleAssignment();
                        },


                        error:
                            (
                                error:
                                    unknown
                            ):
                                void =>
                        {
                            console.error(
                                'Restore Role Assignment Error',

                                error
                            );


                            this.toast.error(
                                'Restore Failed',

                                'Failed to restore role assignment.'
                            );
                        }
                    });
            }
        );
    }



    //===========================================================
    // Cancel
    //===========================================================

    cancel():
        void
    {
        void this.router.navigate(
        [
            '/security-permission/user-management/role-assignment/list'
        ]);
    }



    //===========================================================
    // Save Command
    //===========================================================

    onSave():
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }


        if
        (
            this.selectedUserProfileId == null
        )
        {
            this.toast.error(
                'Validation',

                'User Profile is required.'
            );


            return;
        }


        if
        (
            this.roleAssignmentRows.length === 0
        )
        {
            this.toast.error(
                'Validation',

                'At least one role profile assignment is required.'
            );


            return;
        }


        this.save();
    }



    //===========================================================
    // Clear Command
    //===========================================================

    onClear():
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }


        this.clear();
    }



    //===========================================================
    // Back To List
    //===========================================================

    onBackToList():
        void
    {
        void this.router.navigate(
        [
            '/security-permission/user-management/role-assignment/list'
        ]);
    }



    //===========================================================
    // Back
    //===========================================================

    back():
        void
    {
        void this.router.navigate(
        [
            '/security-permission/user-management/role-assignment/list'
        ]);
    }



    //===========================================================
    // Save Disabled
    //===========================================================

    get saveDisabled():
        boolean
    {
        return (

            this.isViewMode

            ||

            this.selectedUserProfileId == null

            ||

            this.roleAssignmentRows.length === 0

        );
    }



    //===========================================================
    // Add Disabled
    //===========================================================

    get addDisabled():
        boolean
    {
        return (

            this.isViewMode

            ||

            this.selectedUserProfileId == null

            ||

            this.selectedRoleProfileId == null

        );
    }



    //===========================================================
    // Total Role Profiles
    //===========================================================

    get totalRoleProfileCount():
        number
    {
        return this.roleAssignmentRows.length;
    }



    //===========================================================
    // Record Counter
    //===========================================================

    get recordCounterSections():
        RecordCounterSection[]
    {
        return [

            {
                label:'Role Profiles',

                value:this.roleAssignmentRows.length
            },

            {
                label:'Active',

                value:
                    this.roleAssignmentRows.filter(
                        row =>
                            row.isActive !== false
                    ).length
            },

            {
                label:'Inactive',

                value:
                    this.roleAssignmentRows.filter(
                        row =>
                            row.isActive === false
                    ).length
            },

            {
                label:'Total',

                value:this.roleAssignmentRows.length
            }

        ];
    }

}