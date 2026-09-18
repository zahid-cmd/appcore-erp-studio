//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    inject,
    ChangeDetectorRef
}
from '@angular/core';

import
{
    HttpErrorResponse
}
from '@angular/common/http';

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


//===============================================================
// Models
//===============================================================

import
{
    UserProfile
}
from '../../../models/user-profile.model';


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
    PageCanvasComponent,
    PageCanvasConfig
}
from '../../../../../../shared/components/layout/page-canvas/page-canvas';

import
{
    ControlTabsComponent,
    ControlTab
}
from '../../../../../../shared/components/controls/control-tabs/control-tabs';

import
{
    SearchBoxComponent
}
from '../../../../../../shared/components/utilities/search-box/search-box';

import
{
    CommandCenterComponent
}
from '../../../../../../shared/components/utilities/command-center/command-center';

import
{
    ListTableComponent,
    ListTableColumn
}
from '../../../../../../shared/components/layout/list-table/list-table';

import
{
    PaginationComponent
}
from '../../../../../../shared/components/controls/pagination/pagination';

import
{
    HistoryDrawerComponent
}
from '../../../../../../shared/components/utilities/history-drawer/history-drawer';

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
    ToastService
}
from '../../../../../../shared/components/utilities/toast/toast.service';

import
{
    ToastComponent
}
from '../../../../../../shared/components/utilities/toast/toast';


//===============================================================
// Service
//===============================================================

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
    selector:'userProfile-list',

    standalone:true,

    imports:
    [
        CommonModule,

        PageHeaderComponent,

        PageToolbarComponent,

        ControlTabsComponent,

        SearchBoxComponent,

        CommandCenterComponent,

        PageCanvasComponent,

        ListTableComponent,

        PaginationComponent,

        HistoryDrawerComponent,

        ConfirmDialogComponent,

        ToastComponent
    ],

    templateUrl:'./user-profile-list.html',

    styleUrl:'./user-profile-list.css'
})


//===============================================================
// User Profile List
//===============================================================

export class UserProfileList
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly userprofileservice =
        inject(UserProfileService);


    private readonly confirmDialog =
        inject(ConfirmDialogService);


    private readonly toast =
        inject(ToastService);


    private readonly router =
        inject(Router);


    private readonly route =
        inject(ActivatedRoute);


    private readonly cdr =
        inject(ChangeDetectorRef);



    //===========================================================
    // Page Tabs
    //===========================================================

    tabs:
        ControlTab[] =
    [
        {
            id:'all',

            label:'All User Profiles'
        }
    ];


    selectedTab:
        string =
        'all';



    //===========================================================
    // Data
    //===========================================================

    userprofiles:
        UserProfile[] =
    [];


    filteredUserProfiles:
        UserProfile[] =
    [];


    pagedUserProfiles:
        UserProfile[] =
    [];



    //===========================================================
    // Search & Loading
    //===========================================================

    searchText:
        string =
        '';


    loading:
        boolean =
        false;


    loadFailed:
        boolean =
        false;



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
    // History
    //===========================================================

    historyOpened:
        boolean =
        false;


    historyTitle:
        string =
        'User Profile History';


    historyItems:
        any[] =
    [];



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

            width:'50px',

            align:'center'
        },

        {
            header:'User Profile Code',

            field:'ProfileCode',

            width:'180px',

            align:'center'
        },

        {
            header:'User Name / Login ID',

            field:'UserName',

            width:'180px',

            align:'left'
        },

        {
            header:'Display Name',

            field:'DisplayName',

            width:'150px',

            align:'left'
        },

        {
            header:'Full Name',

            field:'FullName',

            width:'230px',

            align:'left'
        },

        {
            header:'Primary Role',

            field:'PrimaryRoleName',

            width:'180px',

            align:'left'
        },

        {
            header:'Email',

            field:'Email',

            width:'250px',

            align:'left'
        },

        {
            header:'Mobile No.',

            field:'MobileNo',

            width:'180px',

            align:'center'
        },

        {
            header:'Status',

            field:'IsActive',

            width:'120px',

            align:'center',

            type:'status'
        },

        {
            header:'Actions',

            field:'actions',

            type:'actions',

            width:'150px',

            align:'center'
        }
    ];



    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.loadItems();
    }



    //===========================================================
    // Normalize API Response
    //===========================================================

    private normalizeUserProfile
    (
        item:
            any
    ):
        UserProfile
    {
        const primaryRoleName =
            item?.PrimaryRoleName
            ??
            item?.primaryRoleName
            ??
            '';


        return {
            UserProfileId:
                Number
                (
                    item?.UserProfileId
                    ??
                    item?.userProfileId
                    ??
                    0
                ),

            ProfileCode:
                item?.ProfileCode
                ??
                item?.profileCode
                ??
                '',

            UserName:
                item?.UserName
                ??
                item?.userName
                ??
                '',

            DisplayName:
                item?.DisplayName
                ??
                item?.displayName
                ??
                '',

            FullName:
                item?.FullName
                ??
                item?.fullName
                ??
                '',

            Email:
                item?.Email
                ??
                item?.email
                ??
                '',

            MobileNo:
                item?.MobileNo
                ??
                item?.mobileNo
                ??
                '',

            HasRoleAssignment:
                Boolean
                (
                    item?.HasRoleAssignment
                    ??
                    item?.hasRoleAssignment
                    ??
                    false
                ),

            RoleProfileCount:
                Number
                (
                    item?.RoleProfileCount
                    ??
                    item?.roleProfileCount
                    ??
                    0
                ),

            PrimaryRoleName:
                primaryRoleName
                ||
                'Not Assigned',

            IsActive:
                Boolean
                (
                    item?.IsActive
                    ??
                    item?.isActive
                    ??
                    true
                )
        };
    }



    //===========================================================
    // Normalize API Response List
    //===========================================================

    private normalizeUserProfiles
    (
        response:
            any
    ):
        UserProfile[]
    {
        if
        (
            !Array.isArray(response)
        )
        {
            return [];
        }


        return response.map
        (
            item =>
                this.normalizeUserProfile(
                    item
                )
        );
    }



    //===========================================================
    // Load Items
    //===========================================================

    loadItems():
        void
    {
        this.loading =
            true;


        this.loadFailed =
            false;


        this.userprofileservice
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        UserProfile[]
                ):
                    void =>
                {
                    console.log
                    (
                        'User Profile API Response:',
                        response
                    );


                    this.userprofiles =
                        this.normalizeUserProfiles(
                            response
                        );


                    console.log
                    (
                        'Normalized User Profiles:',
                        this.userprofiles
                    );


                    this.applyFilters();


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
                    console.error
                    (
                        'Load User Profiles Error:',
                        error
                    );


                    this.userprofiles =
                        [];


                    this.filteredUserProfiles =
                        [];


                    this.pagedUserProfiles =
                        [];


                    this.loading =
                        false;


                    this.loadFailed =
                        true;


                    this.toast.error
                    (
                        'Load Failed',

                        'Unable to load user profiles.'
                    );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Apply Filters
    //===========================================================

    applyFilters():
        void
    {
        const keyword =
            this.searchText
                .trim()
                .toLowerCase();


        this.filteredUserProfiles =
            this.userprofiles.filter
            (
                (
                    item:
                        UserProfile
                ):
                    boolean =>
                {
                    const profileCode =
                        item.ProfileCode
                        ??
                        '';


                    const userName =
                        item.UserName
                        ??
                        '';


                    const displayName =
                        item.DisplayName
                        ??
                        '';


                    const fullName =
                        item.FullName
                        ??
                        '';


                    const primaryRoleName =
                        item.PrimaryRoleName
                        ??
                        'Not Assigned';


                    const email =
                        item.Email
                        ??
                        '';


                    const mobileNo =
                        item.MobileNo
                        ??
                        '';


                    const status =
                        item.IsActive
                            ? 'active'
                            : 'inactive';


                    const searchMatch =
                        !keyword
                        ||
                        profileCode
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        userName
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        displayName
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        fullName
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        primaryRoleName
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        email
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        mobileNo
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        status
                            .includes(keyword);


                    return searchMatch;
                }
            );


        this.currentPage =
            1;


        this.updatePagination();
    }



    //===========================================================
    // Search
    //===========================================================

    onSearch
    (
        value:
            string
    ):
        void
    {
        this.searchText =
            value
            ??
            '';


        this.applyFilters();
    }



    //===========================================================
    // Sort
    //===========================================================

    onSort
    (
        event:
        {
            field:
                string;

            direction:
                'asc' | 'desc';
        }
    ):
        void
    {
        this.filteredUserProfiles =
        [
            ...this.filteredUserProfiles
        ];


        this.filteredUserProfiles.sort
        (
            (
                a:
                    UserProfile,

                b:
                    UserProfile
            ):
                number =>
            {
                const valueA:
                    any =
                    a[
                        event.field as keyof UserProfile
                    ];


                const valueB:
                    any =
                    b[
                        event.field as keyof UserProfile
                    ];


                if
                (
                    valueA == null
                    &&
                    valueB == null
                )
                {
                    return 0;
                }


                if
                (
                    valueA == null
                )
                {
                    return -1;
                }


                if
                (
                    valueB == null
                )
                {
                    return 1;
                }


                if
                (
                    typeof valueA === 'string'
                    &&
                    typeof valueB === 'string'
                )
                {
                    return event.direction === 'asc'
                        ?
                        valueA.localeCompare(valueB)
                        :
                        valueB.localeCompare(valueA);
                }


                if
                (
                    valueA < valueB
                )
                {
                    return event.direction === 'asc'
                        ?
                        -1
                        :
                        1;
                }


                if
                (
                    valueA > valueB
                )
                {
                    return event.direction === 'asc'
                        ?
                        1
                        :
                        -1;
                }


                return 0;
            }
        );


        this.currentPage =
            1;


        this.updatePagination();
    }



    //===========================================================
    // Refresh
    //===========================================================

    refresh():
        void
    {
        this.searchText =
            '';


        this.currentPage =
            1;


        this.loadItems();
    }



    //===========================================================
    // Update Pagination
    //===========================================================

    updatePagination():
        void
    {
        const start:
            number =
            (
                this.currentPage - 1
            )
            *
            this.pageSize;


        this.pagedUserProfiles =
        [
            ...this.filteredUserProfiles.slice
            (
                start,

                start + this.pageSize
            )
        ];
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
        size:
            number
    ):
        void
    {
        this.pageSize =
            size;


        this.currentPage =
            1;


        this.updatePagination();
    }



    //===========================================================
    // Add
    //===========================================================

    add():
        void
    {
        void this.router.navigate
        (
            [
                'add'
            ],

            {
                relativeTo:
                    this.route.parent
            }
        );
    }



    //===========================================================
    // View
    //===========================================================

    view
    (
        item:
            UserProfile
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',

                item.UserProfileId
            ],

            {
                relativeTo:
                    this.route.parent
            }
        );
    }



    //===========================================================
    // Edit
    //===========================================================

    edit
    (
        item:
            UserProfile
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',

                item.UserProfileId
            ],

            {
                relativeTo:
                    this.route.parent
            }
        );
    }



    //===========================================================
    // Delete
    //===========================================================

    delete
    (
        item:
            UserProfile
    ):
        void
    {
        this.confirmDialog.open
        (
            'Delete User Profile',

            `Are you sure you want to delete "${item.DisplayName}" ?`,

            (): void =>
            {
                this.userprofileservice
                    .delete
                    (
                        item.UserProfileId
                    )
                    .subscribe
                    ({
                        next:
                        (): void =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',

                                `${item.DisplayName} deleted successfully.`
                            );


                            this.loadItems();
                        },


                        error:
                        (
                            error:
                                unknown
                        ):
                            void =>
                        {
                            console.error
                            (
                                'Delete User Profile Error:',
                                error
                            );


                            //===================================================
                            // Deletion Blocked
                            //===================================================

                            if
                            (
                                error instanceof HttpErrorResponse
                                &&
                                error.status === 409
                            )
                            {
                                let message =
                                    'User Profile cannot be deleted because it is already configured.';


                                if
                                (
                                    typeof error.error === 'string'
                                    &&
                                    error.error.trim()
                                )
                                {
                                    message =
                                        error.error;
                                }
                                else if
                                (
                                    error.error?.message
                                )
                                {
                                    message =
                                        error.error.message;
                                }
                                else if
                                (
                                    error.error?.title
                                )
                                {
                                    message =
                                        error.error.title;
                                }


                                this.toast.info
                                (
                                    'Delete Blocked',

                                    message
                                );


                                return;
                            }


                            //===================================================
                            // Delete Failed
                            //===================================================

                            this.toast.error
                            (
                                'Delete Failed',

                                'Failed to delete user profile.'
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
        this.confirmDialog.open
        (
            'Restore User Profile',

            'Are you sure you want to restore the most recently deleted user profile?',

            (): void =>
            {
                this.restoreItem();
            },

            'Restore',

            'Cancel',

            'primary'
        );
    }



    //===========================================================
    // Restore Item
    //===========================================================

    private restoreItem():
        void
    {
        this.userprofileservice
            .restore()
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.toast.success
                    (
                        'Restore Successful',

                        'The most recently deleted user profile has been restored.'
                    );


                    this.loadItems();
                },


                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error
                    (
                        'Restore User Profile Error',

                        error
                    );


                    if
                    (
                        error instanceof HttpErrorResponse
                        &&
                        error.status === 404
                    )
                    {
                        this.toast.info
                        (
                            'No Data to Restore',

                            'There is no deleted user profile record to restore.'
                        );


                        return;
                    }


                    this.toast.error
                    (
                        'Restore Failed',

                        'Failed to restore user profile.'
                    );
                }
            });
    }



    //===========================================================
    // Open History
    //===========================================================

    openHistory():
        void
    {
        this.userprofileservice
            .getHistory()
            .subscribe
            ({
                next:
                (
                    response:
                        any[]
                ):
                    void =>
                {
                    this.historyItems =
                        response.map
                        (
                            history =>
                            ({
                                title:
                                    history.activityTitle
                                    ??
                                    history.ActivityTitle,


                                description:
                                    history.activityDescription
                                    ??
                                    history.ActivityDescription,


                                user:
                                    history.performedByName
                                    ??
                                    history.PerformedByName
                                    ??
                                    'System',


                                dateTime:
                                    new Date
                                    (
                                        history.performedDate
                                        ??
                                        history.PerformedDate
                                    )
                                    .toLocaleString(),


                                badge:
                                    history.activityType
                                    ??
                                    history.ActivityType
                            })
                        );


                    this.historyTitle =
                        'User Profile Management History';


                    this.historyOpened =
                        true;


                    this.cdr.detectChanges();
                },


                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error
                    (
                        'History Load Failed:',
                        error
                    );


                    this.toast.error
                    (
                        'History',

                        'Failed to load user profile history.'
                    );
                }
            });
    }



    //===========================================================
    // Close History
    //===========================================================

    closeHistory():
        void
    {
        this.historyOpened =
            false;
    }

}