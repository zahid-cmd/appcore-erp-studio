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
    BranchAssignment
}
from '../../../models/branch-assignment.model';


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
    BranchAssignmentService
}
from '../../../services/branch-assignment.service';

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
    selector:'branchAssignment-list',

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

    templateUrl:'./branch-assignment-list.html',

    styleUrl:'./branch-assignment-list.css'
})


//===============================================================
// Branch Assignment List Component
//===============================================================

export class BranchAssignmentList
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly branchassignmentservice =
        inject(BranchAssignmentService);


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

            label:'All Branch Assignments'
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

    branchassignments:
        BranchAssignment[] =
    [];


    filteredBranchAssignments:
        BranchAssignment[] =
    [];


    pagedBranchAssignments:
        BranchAssignment[] =
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
        'Branch Assignment History';


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
            header:'Default Branch',

            field:'defaultBranchName',

            width:'220px',

            align:'left'
        },

        {
            header:'Branches',

            field:'branchCount',

            width:'150px',

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
    // Load Branch Assignments
    //===========================================================

    loadItems():
        void
    {
        this.loading =
            true;


        this.loadFailed =
            false;


        this.branchassignmentservice
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        BranchAssignment[]
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
                        'Load Branch Assignments Error',

                        error
                    );


                    this.branchassignments =
                    [];


                    this.filteredBranchAssignments =
                    [];


                    this.pagedBranchAssignments =
                    [];


                    this.loading =
                        false;


                    this.loadFailed =
                        true;


                    this.toast.error
                    (
                        'Load Failed',

                        'Unable to load branch assignments.'
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
            BranchAssignment[]
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


                    this.branchassignments =
                        response.map
                        (
                            assignment =>
                                this.normalizeBranchAssignment(
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
                        'Load User Profiles For Branch Assignments Error',

                        error
                    );


                    this.userProfiles =
                    [];


                    this.branchassignments =
                        response.map
                        (
                            assignment =>
                                this.normalizeBranchAssignment(
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
    // Normalize Branch Assignment
    //===========================================================

    private normalizeBranchAssignment
    (
        assignment:
            BranchAssignment
    ):
        BranchAssignment
    {
        //=======================================================
        // User Profile
        //=======================================================

        const userProfile =
            this.getUserProfile(
                assignment.userProfileId
            );


        //=======================================================
        // Display Name
        //=======================================================

        const displayName =
            userProfile?.displayName
            ??
            userProfile?.DisplayName
            ??
            assignment.displayName
            ??
            'Not Assigned';


        //=======================================================
        // Full Name
        //=======================================================

        const fullName =
            userProfile?.fullName
            ??
            userProfile?.FullName
            ??
            assignment.fullName
            ??
            'Not Assigned';


        //=======================================================
        // User Profile Code
        //=======================================================

        const userProfileCode =
            assignment.userProfileCode
            ??
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
        // User Profile Name
        //=======================================================

        const userProfileName =
            assignment.userProfileName
            ??
            displayName
            ??
            '';


        //=======================================================
        // Default Branch
        //=======================================================

        const defaultBranchName =
            assignment.defaultBranchName
            ??
            'Not Assigned';


        //=======================================================
        // Branch Count
        //=======================================================

        const branchCount =
            Number(
                assignment.branchCount
                ??
                0
            );


        //=======================================================
        // Return Normalized Record
        //=======================================================

        return {

            ...assignment,

            userProfileCode,

            displayName,

            fullName,

            userProfileName,

            defaultBranchName,

            branchCount,

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


        const userProfile =
            this.userProfiles.find
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
            );


        return userProfile
            ??
            null;
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


        this.filteredBranchAssignments =
            this.branchassignments
                .filter
                (
                    (
                        x:
                            BranchAssignment
                    ):
                        boolean =>
                    {
                        //===================================================
                        // Status
                        //===================================================

                        const statusMatch =
                            this.selectedStatus === null
                            ||
                            x.isActive ===
                            this.selectedStatus;


                        //===================================================
                        // Display Name
                        //===================================================

                        const displayName =
                            (
                                x.displayName
                                ??
                                ''
                            )
                            .toLowerCase();


                        //===================================================
                        // Full Name
                        //===================================================

                        const fullName =
                            (
                                x.fullName
                                ??
                                ''
                            )
                            .toLowerCase();


                        //===================================================
                        // Default Branch
                        //===================================================

                        const defaultBranchName =
                            (
                                x.defaultBranchName
                                ??
                                'Not Assigned'
                            )
                            .toLowerCase();


                        //===================================================
                        // User Profile Name
                        //===================================================

                        const userProfileName =
                            (
                                x.userProfileName
                                ??
                                ''
                            )
                            .toLowerCase();


                        //===================================================
                        // User Profile Code
                        //===================================================

                        const userProfileCode =
                            (
                                x.userProfileCode
                                ??
                                ''
                            )
                            .toLowerCase();


                        //===================================================
                        // Search
                        //===================================================

                        const searchMatch =
                            !keyword
                            ||
                            displayName
                                .includes(keyword)
                            ||
                            fullName
                                .includes(keyword)
                            ||
                            defaultBranchName
                                .includes(keyword)
                            ||
                            userProfileName
                                .includes(keyword)
                            ||
                            userProfileCode
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
        this.filteredBranchAssignments =
        [
            ...this.filteredBranchAssignments
        ];


        this.filteredBranchAssignments.sort
        (
            (
                a:
                    BranchAssignment,

                b:
                    BranchAssignment
            ):
                number =>
            {
                const valueA:
                    any =
                    a[
                        event.field as keyof BranchAssignment
                    ];


                const valueB:
                    any =
                    b[
                        event.field as keyof BranchAssignment
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


        this.pagedBranchAssignments =
        [
            ...this.filteredBranchAssignments
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
            BranchAssignment
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',

                item.branchAssignmentId
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
            BranchAssignment
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',

                item.branchAssignmentId
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
            BranchAssignment
    ):
        void
    {
        this.confirmDialog.open
        (
            'Delete Branch Assignment',

            `Are you sure you want to delete "${item.userProfileName}" ?`,

            (): void =>
            {
                this.branchassignmentservice
                    .delete
                    (
                        item.branchAssignmentId
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
                                'Delete Branch Assignment Error',

                                error
                            );


                            this.toast.error
                            (
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
        this.confirmDialog.open
        (
            'Restore Branch Assignment',

            'Are you sure you want to restore the most recently deleted branch assignment?',

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
        this.branchassignmentservice
            .restore()
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.toast.success
                    (
                        'Restore Successful',

                        'The most recently deleted branch assignment has been restored.'
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
                        'Restore Branch Assignment Error',

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

                            'There is no deleted branch assignment record to restore.'
                        );


                        return;
                    }


                    this.toast.error
                    (
                        'Restore Failed',

                        'Failed to restore branch assignment.'
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
        this.branchassignmentservice
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
                        'Branch Assignment Management History';


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

                        'Failed to load branch assignment history.'
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