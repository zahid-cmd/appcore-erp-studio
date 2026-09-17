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
    RoleProfile
}
from '../../../models/role-profile.model';


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
// Service
//===============================================================

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
    selector:'roleProfile-list',

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

    templateUrl:'./role-profile-list.html',

    styleUrl:'./role-profile-list.css'
})


//===============================================================
// Role Profile List
//===============================================================

export class RoleProfileList
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly roleprofileservice =
        inject(RoleProfileService);


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

            label:'All Role Profiles'
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
    // Data
    //===========================================================

    roleprofiles:
        RoleProfile[] =
    [];


    filteredRoleProfiles:
        RoleProfile[] =
    [];


    pagedRoleProfiles:
        RoleProfile[] =
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
        'Role Profile History';


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
            header:'Profile Code',

            field:'ProfileCode',

            width:'180px',

            align:'center'
        },

        {
            header:'Profile Name',

            field:'ProfileName',

            align:'left'
        },

        {
            header:'Display Order',

            field:'DisplayOrder',

            width:'120px',

            align:'center'
        },

        {
            header:'Status',

            field:'IsActive',

            type:'status',

            width:'120px',

            align:'center'
        },

        {
            header:'Actions',

            field:'actions',

            type:'actions',

            width:'180px',

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

    private normalizeRoleProfile
    (
        item:
            any
    ):
        RoleProfile
    {
        return {
            RoleProfileId:
                Number
                (
                    item?.RoleProfileId
                    ??
                    item?.roleProfileId
                    ??
                    0
                ),

            ProfileCode:
                item?.ProfileCode
                ??
                item?.profileCode
                ??
                '',

            ProfileName:
                item?.ProfileName
                ??
                item?.profileName
                ??
                '',

            DisplayOrder:
                Number
                (
                    item?.DisplayOrder
                    ??
                    item?.displayOrder
                    ??
                    0
                ),

            IsActive:
                Boolean
                (
                    item?.IsActive
                    ??
                    item?.isActive
                    ??
                    false
                ),

            Remarks:
                item?.Remarks
                ??
                item?.remarks
                ??
                ''
        };
    }



    //===========================================================
    // Normalize API Response List
    //===========================================================

    private normalizeRoleProfiles
    (
        response:
            any
    ):
        RoleProfile[]
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
                this.normalizeRoleProfile(
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


        this.roleprofileservice
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        RoleProfile[]
                ):
                    void =>
                {
                    console.log
                    (
                        'Role Profile API Response:',
                        response
                    );


                    this.roleprofiles =
                        this.normalizeRoleProfiles(
                            response
                        );


                    console.log
                    (
                        'Normalized Role Profiles:',
                        this.roleprofiles
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
                        'Load Role Profiles Error:',
                        error
                    );


                    this.roleprofiles =
                        [];


                    this.filteredRoleProfiles =
                        [];


                    this.pagedRoleProfiles =
                        [];


                    this.loading =
                        false;


                    this.loadFailed =
                        true;


                    this.toast.error
                    (
                        'Load Failed',

                        'Unable to load role profiles.'
                    );


                    this.cdr.detectChanges();
                }
            });
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


        this.filteredRoleProfiles =
            this.roleprofiles.filter
            (
                (
                    item:
                        RoleProfile
                ):
                    boolean =>
                {
                    const statusMatch =
                        this.selectedStatus === null
                        ||
                        item.IsActive ===
                        this.selectedStatus;


                    const profileCode =
                        item.ProfileCode
                        ??
                        '';


                    const profileName =
                        item.ProfileName
                        ??
                        '';


                    const remarks =
                        item.Remarks
                        ??
                        '';


                    const searchMatch =
                        !keyword
                        ||
                        profileCode
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        profileName
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        remarks
                            .toLowerCase()
                            .includes(keyword);


                    return statusMatch && searchMatch;
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
        this.filteredRoleProfiles =
        [
            ...this.filteredRoleProfiles
        ];


        this.filteredRoleProfiles.sort
        (
            (
                a:
                    RoleProfile,

                b:
                    RoleProfile
            ):
                number =>
            {
                const valueA:
                    any =
                    a[
                        event.field as keyof RoleProfile
                    ];


                const valueB:
                    any =
                    b[
                        event.field as keyof RoleProfile
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


        this.pagedRoleProfiles =
        [
            ...this.filteredRoleProfiles.slice
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
            RoleProfile
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',

                item.RoleProfileId
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
            RoleProfile
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',

                item.RoleProfileId
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
            RoleProfile
    ):
        void
    {
        this.confirmDialog.open
        (
            'Delete Role Profile',

            `Are you sure you want to delete "${item.ProfileName}" ?`,

            (): void =>
            {
                this.roleprofileservice
                    .delete
                    (
                        item.RoleProfileId
                    )
                    .subscribe
                    ({
                        next:
                        (): void =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',

                                `${item.ProfileName} deleted successfully.`
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
                                'Delete Role Profile Error:',
                                error
                            );


                            this.toast.error
                            (
                                'Delete Failed',

                                'Failed to delete role profile.'
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
            'Restore Role Profile',

            'Are you sure you want to restore the most recently deleted role profile?',

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
        this.roleprofileservice
            .restore()
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.toast.success
                    (
                        'Restore Successful',

                        'The most recently deleted role profile has been restored.'
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
                        'Restore Role Profile Error',

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

                            'There is no deleted role profile record to restore.'
                        );


                        return;
                    }


                    this.toast.error
                    (
                        'Restore Failed',

                        'Failed to restore role profile.'
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
        this.roleprofileservice
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
                        'Role Profile Management History';


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

                        'Failed to load role profile history.'
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