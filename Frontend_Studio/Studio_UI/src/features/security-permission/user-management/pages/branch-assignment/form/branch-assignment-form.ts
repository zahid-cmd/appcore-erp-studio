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
    BranchAssignment
}
from '../../../models/branch-assignment.model';

import
{
    UserProfileService
}
from '../../../services/user-profile.service';

import
{
    BranchAssignmentService
}
from '../../../services/branch-assignment.service';

import
{

    Branches

}

from '../../../../../settings/general-settings/models/branches.model';


import
{

    BranchesService

}

from '../../../../../settings/general-settings/services/branches.service';

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
    selector:'app-branch-assignment-form',

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

    templateUrl:'./branch-assignment-form.html',

    styleUrls:
    [
        './branch-assignment-form.css'
    ]
})


export class BranchAssignmentForm
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


    private readonly branchesService =
        inject(BranchesService);


    private readonly branchAssignmentService =
        inject(BranchAssignmentService);


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


    branchAssignmentId:
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
        'Branch Assignment';


    entityName =
        'Branch Assignment';


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
            header:'Branch Code',

            field:'branchCode',

            width:'180px',

            align:'left'
        },

        {
            header:'Branch',

            field:'branchName',

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

            code:'branchCode',

            name:'branchName',

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
    // Branch Collection
    //===========================================================

    branches:
        Branches[] =
    [
    ];



    //===========================================================
    // Selected Values
    //===========================================================

    selectedUserProfileId:
        number | null =
        null;


    selectedBranchId:
        number | null =
        null;



    //===========================================================
    // Assignment Rows
    //===========================================================

    branchAssignmentRows:
        any[] =
    [
    ];


    pagedBranchAssignmentRows:
        any[] =
    [
    ];



    //===========================================================
    // Assignment Entity
    //===========================================================

    branchAssignment:
        BranchAssignment =
    {
        branchAssignmentId:0,

        userProfileId:0,

        userProfileCode:'',

        userProfileName:'',

        branchCount:0,

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

    private originalBranchAssignment =
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

        this.loadBranches();

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
            this.branchAssignmentService
                .getAll()
                .subscribe(
                {
                    next:
                        (
                            assignments:
                                BranchAssignment[]
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
                                    BranchAssignment
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
                                        response
                                            .filter(
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
                                            )
                                            .map(
                                                (
                                                    user:
                                                        any
                                                ):
                                                    any =>
                                                ({
                                                    ...user,

                                                    userProfileId:
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
                                                        ),

                                                    fullName:
                                                        user?.FullName
                                                        ??
                                                        user?.fullName
                                                        ??
                                                        ''
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
                            'Load Branch Assignments Error',

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
                        response.map(
                            (
                                user:
                                    any
                            ):
                                any =>
                            ({
                                ...user,

                                userProfileId:
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
                                    ),

                                fullName:
                                    user?.FullName
                                    ??
                                    user?.fullName
                                    ??
                                    ''
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
    // Load Branches
    //===========================================================

    private loadBranches(): void
    {
        this.branchesService
            .getAll()
            .subscribe({
                next:
                    (
                        response:
                            Branches[]
                    ):
                        void =>
                {
                    this.branches =
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
                        'Load Branches Error',
                        error
                    );

                    this.branches = [];

                    this.toast.error(
                        'Load Failed',
                        'Unable to load branches.'
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
            this.branchAssignmentId =
                id;


            this.loadBranchAssignment();
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
        this.branchAssignment =
        {
            branchAssignmentId:0,

            userProfileId:0,

            userProfileCode:'',

            userProfileName:'',

            branchCount:0,

            isActive:true,

            details:[]
        };


        this.branchAssignmentRows =
        [
        ];


        this.selectedUserProfileId =
            null;


        this.selectedBranchId =
            null;


        this.originalBranchAssignment =
            JSON.stringify(
                this.buildBranchAssignment()
            );


        this.updatePagination();

        this.updateUserProfileLock();

        this.cdr.detectChanges();
    }



    //===========================================================
    // Load Branch Assignment
    //===========================================================

    private loadBranchAssignment():
        void
    {
        this.loading =
            false;


        this.orbitLoading =
            true;


        this.loadFailed =
            false;


        this.branchAssignmentService
            .getById(
                this.branchAssignmentId
            )
            .subscribe(
            {
                next:
                    (
                        response:
                            BranchAssignment
                    ):
                        void =>
                {
                    this.bindBranchAssignment(
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
                        'Load Branch Assignment Error',

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

                        'Unable to load branch assignment.'
                    );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Bind Branch Assignment
    //===========================================================

    private bindBranchAssignment
    (
        data:
            BranchAssignment
    ):
        void
    {
        this.branchAssignment =
        {
            ...data
        };


        this.selectedUserProfileId =
            data.userProfileId
            ??
            null;


        this.branchAssignmentRows =
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
                    branchAssignmentDetailId:
                        detail.branchAssignmentDetailId
                        ??
                        0,

                    branchAssignmentId:
                        detail.branchAssignmentId
                        ??
                        this.branchAssignmentId,

                    branchId:
                        detail.branchId
                        ??
                        0,

                    branchCode:
                        detail.branchCode
                        ??
                        '',

                    branchName:
                        detail.branchName
                        ??
                        '',

                    isActive:
                        detail.isActive
                        ??
                        true
                })
            );


        this.selectedBranchId =
            null;


        this.originalBranchAssignment =
            JSON.stringify(
                this.buildBranchAssignment()
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
            this.buildBranchAssignment();


        this.hasChanges =

            JSON.stringify(
                current
            )
            !==
            this.originalBranchAssignment;
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
            this.branchAssignment.userProfileId =
                0;


            this.branchAssignment.userProfileName =
                '';


            this.branchAssignment.userProfileCode =
                '';


            this.isUserProfileLocked =
                false;


            this.isAddDisabled =
                true;


            this.detectChanges();

            this.cdr.detectChanges();

            return;
        }


        this.branchAssignment.userProfileId =
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
            this.branchAssignment.userProfileName =
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


            this.branchAssignment.userProfileCode =
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
            this.selectedBranchId == null;


        this.updateUserProfileLock();

        this.detectChanges();

        this.cdr.detectChanges();
    }



    //===========================================================
    // Branch Changed
    //===========================================================

    onBranchChanged
    (
        value:
            number | null
    ):
        void
    {
        this.selectedBranchId =
            value;


        this.isAddDisabled =
            this.selectedUserProfileId == null
            ||
            this.selectedBranchId == null;


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
            this.selectedBranchId == null
        )
        {
            return;
        }


        //=======================================================
        // Duplicate Validation
        //=======================================================

        const duplicate =
            this.branchAssignmentRows.some(
                row =>
                    Number(
                        row.branchId
                    )
                    ===
                    Number(
                        this.selectedBranchId
                    )
            );


        if
        (
            duplicate
        )
        {
            this.toast.warning(
                'Already Added',

                'This branch is already assigned to the selected user.'
            );


            return;
        }


        //=======================================================
        // Find Branch
        //=======================================================

        const selectedBranch =
            this.branches.find(
                branch =>
                    Number(
                        branch.BranchId
                    )
                    ===
                    Number(
                        this.selectedBranchId
                    )
            );


        if
        (
            !selectedBranch
        )
        {
            this.toast.error(
                'Error',

                'Unable to find the selected branch.'
            );


            return;
        }


        //=======================================================
        // Add Assignment Row
        //=======================================================

        this.branchAssignmentRows.push(
        {
            branchAssignmentDetailId:0,

            branchAssignmentId:
                this.branchAssignmentId,

            branchId:
                this.selectedBranchId,

            branchCode:
                selectedBranch.BranchCode ?? '',

            branchName:
                selectedBranch.BranchName ?? '',

            isActive:true
        });


        this.branchAssignment.branchCount =
            this.branchAssignmentRows.length;


        this.selectedBranchId =
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


        this.branchAssignmentRows =
            this.branchAssignmentRows.filter(
                item =>
                    Number(
                        item.branchId
                    )
                    !==
                    Number(
                        row.branchId
                    )
            );


        this.branchAssignment.branchCount =
            this.branchAssignmentRows.length;


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

                    this.branchAssignmentRows.length
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


        this.pagedBranchAssignmentRows =

            this.branchAssignmentRows.slice(

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


        this.selectedBranchId =
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


        this.selectedBranchId =
            null;


        this.branchAssignmentRows =
        [
        ];


        this.branchAssignment =
        {
            branchAssignmentId:0,

            userProfileId:0,

            userProfileCode:'',

            userProfileName:'',

            branchCount:0,

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
            this.branchAssignmentRows.length > 0;
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
    // Build Branch Assignment Payload
    //===========================================================

    private buildBranchAssignment():
        BranchAssignment
    {
        return {

            branchAssignmentId:
                this.branchAssignment.branchAssignmentId
                ??
                this.branchAssignmentId,

            userProfileId:
                this.selectedUserProfileId
                ??
                0,

            userProfileCode:
                this.branchAssignment.userProfileCode
                ??
                '',

            userProfileName:
                this.branchAssignment.userProfileName
                ??
                '',

            branchCount:
                this.branchAssignmentRows.length,

            isActive:
                this.branchAssignment.isActive
                ??
                true,

            details:
                this.branchAssignmentRows.map(
                    row =>
                    ({
                        branchAssignmentDetailId:
                            row.branchAssignmentDetailId
                            ??
                            0,

                        branchAssignmentId:
                            row.branchAssignmentId
                            ??
                            this.branchAssignmentId,

                        branchId:
                            row.branchId,

                        branchCode:
                            row.branchCode
                            ??
                            '',

                        branchName:
                            row.branchName
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
            this.buildBranchAssignment();


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
            BranchAssignment
    ):
        void
    {
        this.progressDialog.show(
            'Saving Branch Assignment',

            'Preparing data...',

            false
        );


        this.progressDialog.update(
            20,

            'Preparing data...'
        );


        this.branchAssignmentService
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

                        'Branch assignment saved successfully...'
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

                                'Branch Assignment created successfully.'
                            );


                            this.hasChanges =
                                false;


                            void this.router.navigate(
                            [
                                '/security-permission/user-management/branch-assignment/list'
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
                        'Create Branch Assignment Error',

                        error
                    );


                    this.progressDialog.close();


                    this.toast.error(
                        'Save Failed',

                        'Failed to create branch assignment.'
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
            BranchAssignment
    ):
        void
    {
        this.progressDialog.show(
            'Updating Branch Assignment',

            'Preparing data...',

            false
        );


        this.progressDialog.update(
            20,

            'Preparing data...'
        );


        this.branchAssignmentService
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

                        'Branch assignment updated successfully...'
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

                                'Branch Assignment updated successfully.'
                            );


                            this.hasChanges =
                                false;


                            void this.router.navigate(
                            [
                                '/security-permission/user-management/branch-assignment/list'
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
                        'Update Branch Assignment Error',

                        error
                    );


                    this.progressDialog.close();


                    this.toast.error(
                        'Update Failed',

                        'Failed to update branch assignment.'
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
            this.branchAssignmentId <= 0
        )
        {
            return;
        }


        this.confirmDialog.open(

            'Delete Branch Assignment',

            'Are you sure you want to delete this branch assignment?',


            () =>
            {
                this.branchAssignmentService
                    .delete(
                        this.branchAssignmentId
                    )
                    .subscribe(
                    {
                        next:
                            ():
                                void =>
                        {
                            this.toast.success(
                                'Deleted',

                                'Branch Assignment deleted successfully.'
                            );


                            void this.router.navigate(
                            [
                                '/security-permission/user-management/branch-assignment/list'
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
                                'Delete Branch Assignment Error',

                                error
                            );


                            this.toast.error(
                                'Delete Failed',

                                'Failed to delete branch assignment.'
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

            'Restore Branch Assignment',

            'Are you sure you want to restore this branch assignment?',


            () =>
            {
                this.branchAssignmentService
                    .restore()
                    .subscribe(
                    {
                        next:
                            ():
                                void =>
                        {
                            this.toast.success(
                                'Restored',

                                'Branch Assignment restored successfully.'
                            );


                            this.loadBranchAssignment();
                        },


                        error:
                            (
                                error:
                                    unknown
                            ):
                                void =>
                        {
                            console.error(
                                'Restore Branch Assignment Error',

                                error
                            );


                            this.toast.error(
                                'Restore Failed',

                                'Failed to restore branch assignment.'
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
            '/security-permission/user-management/branch-assignment/list'
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
            this.branchAssignmentRows.length === 0
        )
        {
            this.toast.error(
                'Validation',

                'At least one branch assignment is required.'
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
            '/security-permission/user-management/branch-assignment/list'
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
            '/security-permission/user-management/branch-assignment/list'
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

            this.branchAssignmentRows.length === 0

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

            this.selectedBranchId == null

        );
    }



    //===========================================================
    // Total Branches
    //===========================================================

    get totalBranchCount():
        number
    {
        return this.branchAssignmentRows.length;
    }



    //===========================================================
    // Record Counter
    //===========================================================

    get recordCounterSections():
        RecordCounterSection[]
    {
        return [

            {
                label:'Branches',

                value:this.branchAssignmentRows.length
            },

            {
                label:'Active',

                value:
                    this.branchAssignmentRows.filter(
                        row =>
                            row.isActive !== false
                    ).length
            },

            {
                label:'Inactive',

                value:
                    this.branchAssignmentRows.filter(
                        row =>
                            row.isActive === false
                    ).length
            },

            {
                label:'Total',

                value:this.branchAssignmentRows.length
            }

        ];
    }

}