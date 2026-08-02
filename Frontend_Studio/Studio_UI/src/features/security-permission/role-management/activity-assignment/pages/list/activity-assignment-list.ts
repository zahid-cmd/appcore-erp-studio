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
    Router
}
from '@angular/router';

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
    ActivityAssignmentService
}
from '../../services/activity-assignment.service';

import
{
    ActivityAssignment
}
from '../../models/activity-assignment.model';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'app-activity-assignment-list',

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

        ConfirmDialogComponent,

        ToastComponent,

        HistoryDrawerComponent
    ],

    templateUrl:'./activity-assignment-list.html',

    styleUrl:'./activity-assignment-list.css'
})

//===============================================================
// Activity Assignment List Component
//===============================================================

export class ActivityAssignmentListComponent
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly activityAssignmentService =
        inject(ActivityAssignmentService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly router =
        inject(Router);

    private readonly cdr =
        inject(ChangeDetectorRef);
    //===========================================================
    // Page Tabs
    //===========================================================

    tabs: ControlTab[] =
    [
        {
            id:'all',

            label:'All Activity Assignments'
        }
    ];

    selectedTab =
        'all';

    //===========================================================
    // Data Source
    //===========================================================

    activityAssignments: ActivityAssignment[] =
    [];

    filteredActivityAssignments: ActivityAssignment[] =
    [];

    pagedActivityAssignments: ActivityAssignment[] =
    [];

    //===========================================================
    // Selected Activity Assignment
    //===========================================================

    selectedActivityAssignment:
        ActivityAssignment | null =
            null;

    //===========================================================
    // Search & Loading
    //===========================================================

    searchText =
        '';

    loading =
        false;

    loadFailed =
        false;

    //===========================================================
    // Pagination
    //===========================================================

    currentPage =
        1;

    pageSize =
        10;

    //===========================================================
    // History Drawer
    //===========================================================

    historyOpened =
        false;

    historyTitle =
        'Activity Assignment Management History';

    historyItems:any[] =
    [];

    //===========================================================
    // Page Canvas Configuration
    //===========================================================

    readonly canvasConfig: PageCanvasConfig =
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

    readonly columns: ListTableColumn[] =
    [
        {
            header:'#',
            field:'serial',
            type:'serial',
            width:'60px',
            align:'center'
        },

        {
            header:'Role Profile',
            field:'roleProfileName',
            align:'left',
            width:'260px'
        },

        {
            header:'Submenus Assigned',
            field:'pageCount',
            width:'150px',
            align:'center'
        },

        {
            header:'Master Assignments',
            field:'masterActivityCount',
            width:'170px',
            align:'center'
        },

        {
            header:'Special Assignments',
            field:'specialActivityCount',
            width:'170px',
            align:'center'
        },

        {
            header:'Total Assignments',
            field:'totalActivityCount',
            width:'150px',
            align:'center'
        },

        {
            header:'Status',
            field:'isActive',
            type:'status',
            width:'120px',
            align:'center'
        },

        {
            header:'Actions',
            field:'actions',
            type:'actions',
            width:'100px',
            align:'center'
        }
    ];

    //===========================================================
    // Component Initialization
    //===========================================================

    ngOnInit():
        void
    {
        this.loadActivityAssignments();
    }

    //===========================================================
    // Load Activity Assignment Data
    //===========================================================

    loadActivityAssignments():
        void
    {
        this.loading =
            true;

        this.loadFailed =
            false;

        this.activityAssignmentService
            .getAll()
            .subscribe(
            {
                next:(response) =>
                {
                    console.log('================================');
                    console.log('Activity Assignments Response');
                    console.log(response);
                    console.log('Total Records:', response.length);
                    console.log('================================');

                    this.activityAssignments =
                    [
                        ...response
                    ];

                    this.filteredActivityAssignments =
                    [
                        ...response
                    ].sort(
                        (a, b) =>
                            a.roleProfileName.localeCompare(
                                b.roleProfileName
                            )
                    );

                    this.currentPage =
                        1;

                    this.updatePagination();

                    this.loading =
                        false;

                    this.loadFailed =
                        false;

                    this.cdr.detectChanges();

                    console.log(
                        'Change Detection Triggered'
                    );
                },

                error:(error) =>
                {
                    console.error(
                        'Load Activity Assignments Error'
                    );

                    console.error(error);

                    this.activityAssignments =
                    [];

                    this.filteredActivityAssignments =
                    [];

                    this.pagedActivityAssignments =
                    [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.toast.error(
                        'Load Failed',
                        'Unable to load activity assignments.'
                    );

                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Search Activity Assignments
    //===========================================================

    onSearch
    (
        value:string
    ):
        void
    {
        this.searchText =
            value;

        const keyword =
            value
                .trim()
                .toLowerCase();

        if (!keyword)
        {
            this.filteredActivityAssignments =
            [
                ...this.activityAssignments
            ];
        }
        else
        {
            this.filteredActivityAssignments =
                this.activityAssignments.filter(x =>

                    x.roleProfileName
                        .toLowerCase()
                        .includes(keyword)

                );
        }

        this.filteredActivityAssignments.sort(
            (a, b) =>
                a.roleProfileName.localeCompare(
                    b.roleProfileName
                )
        );

        this.currentPage =
            1;

        this.updatePagination();
    }

    //===========================================================
    // Sort
    //===========================================================

    onSort
    (
        event:any
    ):
        void
    {
        if (!event)
        {
            return;
        }

        const
        {
            field,
            direction
        }
        =
        event;

        this.filteredActivityAssignments.sort(
            (a:any, b:any) =>
            {
                const valueA =
                    a[field];

                const valueB =
                    b[field];

                if (valueA == null)
                {
                    return 1;
                }

                if (valueB == null)
                {
                    return -1;
                }

                if (typeof valueA === 'string')
                {
                    return direction === 'asc'
                        ? valueA.localeCompare(valueB)
                        : valueB.localeCompare(valueA);
                }

                return direction === 'asc'
                    ? valueA - valueB
                    : valueB - valueA;
            });

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

        this.loadActivityAssignments();
    }

    //===========================================================
    // Pagination
    //===========================================================

    updatePagination():
        void
    {
        const start =
            (this.currentPage - 1)
            *
            this.pageSize;

        this.pagedActivityAssignments =
            this.filteredActivityAssignments.slice(
                start,
                start + this.pageSize
            );
    }

    //===========================================================
    // Page Change
    //===========================================================

    onPageChange
    (
        page:number
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
        pageSize:number
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
    // Add
    //===========================================================

    add():
        void
    {
        this.router.navigate(
        [
            '/security-permission/role-management/activity-assignment/new'
        ]);
    }

    //===========================================================
    // Edit
    //===========================================================

    edit
    (
        item:ActivityAssignment
    ):
        void
    {
        this.router.navigate(
        [
            '/security-permission/role-management/activity-assignment/edit',
            item.activityAssignmentId
        ]);
    }

    //===========================================================
    // View
    //===========================================================

    view
    (
        item:ActivityAssignment
    ):
        void
    {
        this.router.navigate(
        [
            '/security-permission/role-management/activity-assignment/view',
            item.activityAssignmentId
        ]);
    }

    //===========================================================
    // Delete Activity Assignment
    //===========================================================

    delete
    (
        item:ActivityAssignment
    ):
        void
    {
        this.confirmDialog.open(

            'Delete Activity Assignment',

            `Are you sure you want to delete "${item.roleProfileName}" ?`,

            () =>
            {
                this.activityAssignmentService
                    .delete(item.activityAssignmentId)
                    .subscribe(
                    {
                        next:() =>
                        {
                            this.toast.success(
                                'Delete Successful',
                                `${item.roleProfileName} deleted successfully.`
                            );

                            this.loadActivityAssignments();
                        },

                        error:(error) =>
                        {
                            console.error(error);

                            this.toast.error(
                                'Delete Failed',
                                'Failed to delete activity assignment.'
                            );
                        }
                    });
            }
        );
    }

    //===========================================================
    // Row Selected
    //===========================================================

    onRowSelected
    (
        item:ActivityAssignment
    ):
        void
    {
        this.selectedActivityAssignment =
            item;
    }
    
    //===========================================================
    // Restore
    //===========================================================

    restore():
        void
    {
        this.confirmDialog.open(

            'Restore Activity Assignment',

            'Are you sure you want to restore the last deleted activity assignment?',

            () =>
            {
                this.restoreActivityAssignment();
            },

            'Restore',

            'Cancel',

            'primary'
        );
    }

    //===========================================================
    // Restore Activity Assignment
    //===========================================================

    private restoreActivityAssignment():
        void
    {
        this.activityAssignmentService

            .restore()

            .subscribe(
            {
                next:() =>
                {
                    this.toast.success(
                        'Restore Successful',
                        'Activity assignment has been restored.'
                    );

                    this.loadActivityAssignments();
                },

                error:(error) =>
                {
                    this.toast.error(
                        'Restore Failed',
                        error?.error ??
                        'Failed to restore activity assignment.'
                    );
                }
            });
    }

    //===========================================================
    // Open History Drawer
    //===========================================================

    openHistory():
        void
    {
        this.activityAssignmentService
            .getHistory()

            .subscribe(
            {
                next:(response:any[]) =>
                {
                    this.historyItems =
                        response.map(
                            item =>
                            ({
                                title:
                                    item.activityTitle,

                                description:
                                    item.activityDescription,

                                user:
                                    item.performedByName
                                    ??
                                    'System',

                                dateTime:
                                    new Date(
                                        item.performedDate
                                    )
                                    .toLocaleString(),

                                badge:
                                    item.activityType
                            })
                        );

                    this.historyTitle =
                        'Activity Assignment Management History';

                    this.historyOpened =
                        true;

                    this.cdr.detectChanges();
                },

                error:(error:any) =>
                {
                    console.error(
                        'History Load Failed',
                        error
                    );

                    this.toast.error(
                        'History',
                        'Failed to load activity assignment history.'
                    );
                }
            });
    }

    //===========================================================
    // Close History Drawer
    //===========================================================

    closeHistory():
        void
    {
        this.historyOpened =
            false;
    }

    //===========================================================
    // Entity History
    //===========================================================

    openEntityHistory
    (
        item:ActivityAssignment
    ):
        void
    {
        this.historyTitle =
            `History - ${item.roleProfileName}`;

        this.historyOpened =
            true;

        this.activityAssignmentService
            .getEntityHistory(item.activityAssignmentId)
            .subscribe(
            {
                next:(response:any[]) =>
                {
                    this.historyItems =
                        response;
                },

                error:() =>
                {
                    this.toast.error(
                        'History',
                        'Unable to load activity assignment history.'
                    );
                }
            });
    }
}