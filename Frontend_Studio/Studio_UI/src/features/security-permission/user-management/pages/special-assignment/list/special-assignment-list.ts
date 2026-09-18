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
    HttpErrorResponse
}
from '@angular/common/http';


//===============================================================
// Models
//===============================================================

import
{
    SpecialAssignment
}
from '../../../models/special-assignment.model';


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
    DropdownComponent
}
from '../../../../../../shared/components/controls/dropdown/dropdown';

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
// Services
//===============================================================

import
{
    SpecialAssignmentService
}
from '../../../services/special-assignment.service';

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
    selector:'specialAssignment-list',

    standalone:true,

    imports:
    [
        CommonModule,

        PageHeaderComponent,

        PageToolbarComponent,

        ControlTabsComponent,

        SearchBoxComponent,

        DropdownComponent,

        CommandCenterComponent,

        PageCanvasComponent,

        ListTableComponent,

        PaginationComponent,

        HistoryDrawerComponent,

        ConfirmDialogComponent,

        ToastComponent
    ],

    templateUrl:'./special-assignment-list.html',

    styleUrl:'./special-assignment-list.css'
})


//===============================================================
// Special Assignment List Component
//===============================================================

export class SpecialAssignmentList
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly specialassignmentservice =
        inject(SpecialAssignmentService);


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

            label:'All Special Assignments'
        }
    ];


    selectedTab:
        string =
        'all';



    //===========================================================
    // Status Filter
    //===========================================================

    statusItems:
        any[] =
    [
        {
            value:null,

            text:'All Status'
        },

        {
            value:true,

            text:'Active'
        },

        {
            value:false,

            text:'Inactive'
        }
    ];


    selectedStatus:
        boolean | null =
        null;



    //===========================================================
    // Data Source
    //===========================================================

    specialassignments:
        SpecialAssignment[] =
    [];


    filteredSpecialAssignments:
        SpecialAssignment[] =
    [];


    pagedSpecialAssignments:
        SpecialAssignment[] =
    [];



    //===========================================================
    // User Profiles
    //===========================================================

    private userProfiles:
        any[] =
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
        'Special Assignment History';


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

            width:'60px',

            align:'center'
        },

        {
            header:'User Profile Code',

            field:'userProfileCode',

            width:'180px',

            align:'left'
        },

        {
            header:'Display Name',

            field:'displayName',

            width:'200px',

            align:'left'
        },

        {
            header:'Full Name',

            field:'fullName',

            width:'240px',

            align:'left'
        },

        {
            header:'Submenus',

            field:'pageCount',

            width:'180px',

            align:'center'
        },

        {
            header:'Master Activities',

            field:'masterActivityCount',

            width:'200px',

            align:'center'
        },

        {
            header:'Special Activities',

            field:'specialActivityCount',

            width:'200px',

            align:'center'
        },

        {
            header:'Status',

            field:'isActive',

            type:'status',

            width:'150px',

            align:'center'
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
    // Initialization
    //===========================================================

    ngOnInit():
        void
    {
        this.loadItems();
    }



    //===========================================================
    // Load Special Assignments
    //===========================================================

    loadItems():
        void
    {
        this.loading =
            true;


        this.loadFailed =
            false;


        this.specialassignmentservice
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        SpecialAssignment[]
                ): void =>
                {
                    this.loadUserProfiles(
                        response
                    );
                },


                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error
                    (
                        'Load Special Assignments Error',

                        error
                    );


                    this.specialassignments =
                    [];


                    this.filteredSpecialAssignments =
                    [];


                    this.pagedSpecialAssignments =
                    [];


                    this.loading =
                        false;


                    this.loadFailed =
                        true;


                    this.toast.error
                    (
                        'Load Failed',

                        'Unable to load special assignments.'
                    );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Load User Profiles
    //===========================================================

    private loadUserProfiles
    (
        response:
            SpecialAssignment[]
    ):
        void
    {
        this.userprofileservice
            .getAll()
            .subscribe
            ({
                next:
                (
                    userProfiles:
                        any[]
                ): void =>
                {
                    this.userProfiles =
                    [
                        ...userProfiles
                    ];


                    this.specialassignments =
                        response.map
                        (
                            assignment =>
                                this.normalizeSpecialAssignment(
                                    assignment
                                )
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
                ): void =>
                {
                    console.error
                    (
                        'Load User Profiles For Special Assignments Error',

                        error
                    );


                    this.userProfiles =
                    [];


                    this.specialassignments =
                        response.map
                        (
                            assignment =>
                                this.normalizeSpecialAssignment(
                                    assignment
                                )
                        );


                    this.applyFilters();


                    this.loading =
                        false;


                    this.loadFailed =
                        false;


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Normalize Special Assignment
    //===========================================================

    private normalizeSpecialAssignment
    (
        assignment:
            SpecialAssignment
    ):
        SpecialAssignment &
        {
            userProfileCode:
                string;

            displayName:
                string;

            fullName:
                string;
        }
    {
        //=======================================================
        // User Profile
        //=======================================================

        const userProfile =
            this.getUserProfile(
                assignment.userProfileId
            );


        //=======================================================
        // User Profile Code
        //=======================================================

        const userProfileCode =
            userProfile?.profileCode
            ??
            userProfile?.ProfileCode
            ??
            userProfile?.code
            ??
            userProfile?.Code
            ??
            '';


        //=======================================================
        // Display Name
        //=======================================================

        const displayName =
            userProfile?.displayName
            ??
            userProfile?.DisplayName
            ??
            '';


        //=======================================================
        // Full Name
        //=======================================================

        const fullName =
            userProfile?.fullName
            ??
            userProfile?.FullName
            ??
            '';


        //=======================================================
        // User Profile Name
        //=======================================================

        const userProfileName =
            displayName
            ||
            fullName
            ||
            userProfileCode
            ||
            `User Profile ${assignment.userProfileId}`;


        //=======================================================
        // Details
        //=======================================================

        const details =
            Array.isArray(
                assignment?.details
            )
                ?
                assignment.details
                    .filter(
                        detail =>
                            detail != null
                    )
                :
                [];


        //=======================================================
        // Page / Submenu Count
        //=======================================================

        const pageCount =
            details.length;


        //=======================================================
        // Permissions
        //=======================================================

        const permissions =
            details

                .flatMap(
                    detail =>
                        Array.isArray(
                            detail.specialAssignmentPermissions
                        )
                            ?
                            detail.specialAssignmentPermissions
                            :
                            []
                )

                .filter(
                    permission =>
                        permission != null
                );


        //=======================================================
        // Master Activity Count
        //=======================================================

        const masterActivityCount =
            permissions

                .filter(
                    permission =>
                        permission.masterActivityId != null
                )

                .length;


        //=======================================================
        // Special Activity Count
        //=======================================================

        const specialActivityCount =
            permissions

                .filter(
                    permission =>
                        permission.navigationActivityId != null
                )

                .length;


        //=======================================================
        // Total Activity Count
        //=======================================================

        const totalActivityCount =
            masterActivityCount
            +
            specialActivityCount;


        //=======================================================
        // Return Normalized Record
        //=======================================================

        return {
            ...assignment,

            userProfileCode,

            displayName,

            fullName,

            userProfileName,

            pageCount,

            masterActivityCount,

            specialActivityCount,

            totalActivityCount,

            isActive:
                assignment.isActive !== false
        };
    }



    //===========================================================
    // Get User Profile
    //===========================================================

    private getUserProfile
    (
        userProfileId:
            number
    ):
        any
    {
        const id =
            Number(
                userProfileId
            );


        if
        (
            id <= 0
        )
        {
            return null;
        }


        return this.userProfiles.find
        (
            item =>
                Number(
                    item?.userProfileId
                    ??
                    item?.UserProfileId
                    ??
                    item?.id
                    ??
                    item?.Id
                )
                ===
                id
        )
        ??
        null;
    }



    //===========================================================
    // Get User Profile Name
    //===========================================================

    private getUserProfileName
    (
        userProfileId:
            number
    ):
        string
    {
        const userProfile =
            this.getUserProfile(
                userProfileId
            );


        if
        (
            !userProfile
        )
        {
            return '';
        }


        return (
            userProfile?.displayName
            ??
            userProfile?.DisplayName
            ??
            userProfile?.fullName
            ??
            userProfile?.FullName
            ??
            userProfile?.userName
            ??
            userProfile?.UserName
            ??
            userProfile?.profileCode
            ??
            userProfile?.ProfileCode
            ??
            userProfile?.code
            ??
            userProfile?.Code
            ??
            ''
        );
    }



    //===========================================================
    // Status Filter Changed
    //===========================================================

    onStatusFilterChange
    (
        value:
            boolean | null
    ):
        void
    {
        this.selectedStatus =
            value;


        this.applyFilters();
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


        this.filteredSpecialAssignments =
            this.specialassignments
                .filter
                (
                    (
                        x:
                            SpecialAssignment
                    ):
                        boolean =>
                    {
                        const statusMatch =
                            this.selectedStatus === null
                            ||
                            x.isActive ===
                            this.selectedStatus;


                        const userProfileName =
                            x.userProfileName
                            ??
                            '';


                        const userProfileCode =
                            (
                                x as
                                SpecialAssignment &
                                {
                                    userProfileCode:
                                        string;
                                }
                            )
                            .userProfileCode
                            ??
                            '';


                        const displayName =
                            (
                                x as
                                SpecialAssignment &
                                {
                                    displayName:
                                        string;
                                }
                            )
                            .displayName
                            ??
                            '';


                        const fullName =
                            (
                                x as
                                SpecialAssignment &
                                {
                                    fullName:
                                        string;
                                }
                            )
                            .fullName
                            ??
                            '';


                        const searchMatch =
                            !keyword
                            ||
                            userProfileName
                                .toLowerCase()
                                .includes(keyword)
                            ||
                            userProfileCode
                                .toLowerCase()
                                .includes(keyword)
                            ||
                            displayName
                                .toLowerCase()
                                .includes(keyword)
                            ||
                            fullName
                                .toLowerCase()
                                .includes(keyword);


                        return statusMatch
                            &&
                            searchMatch;
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
            value;


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
        this.filteredSpecialAssignments =
        [
            ...this.filteredSpecialAssignments
        ];


        this.filteredSpecialAssignments.sort
        (
            (
                a:
                    SpecialAssignment,

                b:
                    SpecialAssignment
            ):
                number =>
            {
                const valueA:
                    any =
                    a[
                        event.field as keyof SpecialAssignment
                    ];


                const valueB:
                    any =
                    b[
                        event.field as keyof SpecialAssignment
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


        this.selectedStatus =
            null;


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


        this.pagedSpecialAssignments =
        [
            ...this.filteredSpecialAssignments
                .slice
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
            SpecialAssignment
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',

                item.specialAssignmentId
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
            SpecialAssignment
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',

                item.specialAssignmentId
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
            SpecialAssignment
    ):
        void
    {
        this.confirmDialog.open
        (
            'Delete Special Assignment',

            `Are you sure you want to delete "${item.userProfileName}" ?`,

            (): void =>
            {
                this.specialassignmentservice
                    .delete
                    (
                        item.specialAssignmentId
                    )
                    .subscribe
                    ({
                        next:
                        (): void =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',

                                `${item.userProfileName} deleted successfully.`
                            );


                            this.loadItems();
                        },


                        error:
                        (
                            error:
                                unknown
                        ): void =>
                        {
                            console.error
                            (
                                'Delete Special Assignment Error',

                                error
                            );


                            this.toast.error
                            (
                                'Delete Failed',

                                'Failed to delete special assignment.'
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
            'Restore Special Assignment',

            'Are you sure you want to restore the most recently deleted special assignment?',

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
        this.specialassignmentservice
            .restore()
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.toast.success
                    (
                        'Restore Successful',

                        'The most recently deleted special assignment has been restored.'
                    );


                    this.loadItems();
                },


                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error
                    (
                        'Restore Special Assignment Error',

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

                            'There is no deleted special assignment record to restore.'
                        );


                        return;
                    }


                    this.toast.error
                    (
                        'Restore Failed',

                        'Failed to restore special assignment.'
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
        this.specialassignmentservice
            .getHistory()
            .subscribe
            ({
                next:
                (
                    response:
                        any[]
                ): void =>
                {
                    this.historyItems =
                        response.map
                        (
                            history =>
                            ({
                                title:
                                    history.activityTitle,


                                description:
                                    history.activityDescription,


                                user:
                                    history.performedByName
                                    ??
                                    'System',


                                dateTime:
                                    new Date
                                    (
                                        history.performedDate
                                    )
                                    .toLocaleString(),


                                badge:
                                    history.activityType
                            })
                        );


                    this.historyTitle =
                        'Special Assignment Management History';


                    this.historyOpened =
                        true;


                    this.cdr.detectChanges();
                },


                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error
                    (
                        'History Load Failed',

                        error
                    );


                    this.toast.error
                    (
                        'History',

                        'Failed to load special assignment history.'
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