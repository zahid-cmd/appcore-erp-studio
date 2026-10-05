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
    PageCanvasComponent,
    PageCanvasConfig
}
from '../../../../../../shared/components/layout/page-canvas/page-canvas';

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
// Models & Services
//===============================================================

import
{
    MasterActivityService
}
from '../../../services/master-activity.service';

import
{
    MasterActivity
}
from '../../../models/master-activity.model';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'app-navigation-activity-list',

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

    templateUrl:
        './activity-list.html',

    styleUrl:
        './activity-list.css'
})

//===============================================================
// Master Activity List Component
//===============================================================

export class NavigationActivityListComponent
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly masterActivityService =
        inject(MasterActivityService);

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

    tabs:
        ControlTab[] =
    [
        {
            id:'master',
            label:'Master Activities'
        }
    ];

    selectedTab =
        'master';

    //===========================================================
    // Data Source
    //===========================================================

    activities:
        MasterActivity[] =
        [];

    filteredActivities:
        MasterActivity[] =
        [];

    pagedActivities:
        MasterActivity[] =
        [];

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
        'Master Activity Management History';

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
            header:'Code',
            field:'code',
            width:'260px',
            align:'center'
        },
        {
            header:'Activity Name',
            field:'name',
            align:'left'
        },
        {
            header:'Order',
            field:'displayOrder',
            width:'220px',
            align:'center'
        },
        {
            header:'Status',
            field:'isActive',
            type:'status',
            width:'220px',
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
    // Component Initialization
    //===========================================================

    ngOnInit():
        void
    {
        this.loadMasterActivities();
    }

    //===========================================================
    // Load Master Activities
    //===========================================================

    loadMasterActivities():
        void
    {
        this.loading =
            true;

        this.loadFailed =
            false;

        this.masterActivityService
            .getAll()
            .subscribe(
            {
                next:
                    (
                        response
                    ) =>
                    {
                        this.activities =
                        [
                            ...response
                        ];

                        this.filteredActivities =
                        [
                            ...this.activities
                        ].sort(
                            (
                                a,
                                b
                            ) =>
                                a.code.localeCompare(
                                    b.code
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
                    },

                error:
                    (
                        error
                    ) =>
                    {
                        console.error(
                            error
                        );

                        this.activities =
                            [];

                        this.filteredActivities =
                            [];

                        this.pagedActivities =
                            [];

                        this.loading =
                            false;

                        this.loadFailed =
                            true;

                        this.toast.error(
                            'Load Failed',
                            'Unable to load master activities.'
                        );

                        this.cdr.detectChanges();
                    }
            });
    }

    //===========================================================
    // Search Master Activities
    //===========================================================

    onSearch(
        value:
            string
    ):
        void
    {
        this.searchText =
            value;

        const keyword =
            value
                .trim()
                .toLowerCase();

        if
        (
            !keyword
        )
        {
            this.filteredActivities =
            [
                ...this.activities
            ];
        }
        else
        {
            this.filteredActivities =
                this.activities.filter(
                    activity =>
                        activity.code
                            .toLowerCase()
                            .includes(
                                keyword
                            )

                        ||

                        activity.name
                            .toLowerCase()
                            .includes(
                                keyword
                            )

                        ||

                        (
                            activity.remarks
                            ??
                            ''
                        )
                            .toLowerCase()
                            .includes(
                                keyword
                            )
                );
        }

        this.filteredActivities.sort(
            (
                a,
                b
            ) =>
                a.code.localeCompare(
                    b.code
                )
        );

        this.currentPage =
            1;

        this.updatePagination();
    }

    //===========================================================
    // Sort Master Activities
    //===========================================================

    onSort(
        event:
        {
            field:
                string;

            direction:
                'asc'
                |
                'desc';
        }
    ):
        void
    {
        this.filteredActivities =
        [
            ...this.filteredActivities
        ];

        this.filteredActivities.sort(
            (
                a:
                    any,

                b:
                    any
            ) =>
            {
                const valueA =
                    a[
                        event.field
                    ];

                const valueB =
                    b[
                        event.field
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
                        ? valueA.localeCompare(
                            valueB
                        )
                        : valueB.localeCompare(
                            valueA
                        );
                }

                if
                (
                    valueA < valueB
                )
                {
                    return event.direction === 'asc'
                        ? -1
                        : 1;
                }

                if
                (
                    valueA > valueB
                )
                {
                    return event.direction === 'asc'
                        ? 1
                        : -1;
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

        this.loadMasterActivities();
    }

    //===========================================================
    // Update Pagination
    //===========================================================

    updatePagination():
        void
    {
        const start =
            (
                this.currentPage
                -
                1
            )
            *
            this.pageSize;

        this.pagedActivities =
        [
            ...this.filteredActivities.slice(
                start,
                start +
                this.pageSize
            )
        ];
    }

    //===========================================================
    // Page Change
    //===========================================================

    onPageChange(
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

    onPageSizeChange(
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
    // Add Master Activity
    //===========================================================

    add():
        void
    {
        this.router.navigate(
        [
            '/infrastructure-control/navigation-management/navigation-activities/add'
        ]);
    }

    //===========================================================
    // View Master Activity
    //===========================================================

    view(
        item:
            MasterActivity
    ):
        void
    {
        this.router.navigate(
        [
            '/infrastructure-control/navigation-management/navigation-activities/view',
            item.id
        ]);
    }

    //===========================================================
    // Edit Master Activity
    //===========================================================

    edit(
        item:
            MasterActivity
    ):
        void
    {
        this.router.navigate(
        [
            '/infrastructure-control/navigation-management/navigation-activities/edit',
            item.id
        ]);
    }

    //===========================================================
    // Delete Master Activity
    //===========================================================

    delete(
        item:
            MasterActivity
    ):
        void
    {
        this.confirmDialog.open(
            'Delete Master Activity',
            `Are you sure you want to delete "${item.name}" ?`,
            () =>
            {
                this.masterActivityService
                    .delete(
                        item.id
                    )
                    .subscribe(
                    {
                        next:() =>
                        {
                            this.toast.success(
                                'Delete Successful',
                                `${item.name} deleted successfully.`
                            );

                            this.loadMasterActivities();
                        },

                        error:
                            (
                                error
                            ) =>
                            {
                                console.error(
                                    error
                                );

                                this.toast.error(
                                    'Delete Failed',
                                    'Failed to delete master activity.'
                                );
                            }
                    });
            }
        );
    }

    //===========================================================
    // Restore Master Activity
    //===========================================================

    restore():
        void
    {
        this.confirmDialog.open(
            'Restore Master Activity',
            'Are you sure you want to restore the most recently deleted master activity?',
            () =>
            {
                this.restoreMasterActivity();
            },
            'Restore',
            'Cancel',
            'primary'
        );
    }

    //===========================================================
    // Restore Master Activity
    //===========================================================

    private restoreMasterActivity():
        void
    {
        this.masterActivityService
            .restore()
            .subscribe(
            {
                next:() =>
                {
                    this.toast.success(
                        'Restore Successful',
                        'The most recently deleted master activity has been restored.'
                    );

                    this.loadMasterActivities();
                },

                error:
                    (
                        error
                    ) =>
                    {
                        this.toast.error(
                            'Restore Failed',
                            error?.error
                            ??
                            'Failed to restore master activity.'
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
        this.masterActivityService
            .getHistory()
            .subscribe(
            {
                next:
                    (
                        response:
                            any[]
                    ) =>
                    {
                        this.historyItems =
                            response.map(
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
                                        new Date(
                                            history.performedDate
                                        )
                                        .toLocaleString(),

                                    badge:
                                        history.activityType
                                })
                            );

                        this.historyTitle =
                            'Master Activity Management History';

                        this.historyOpened =
                            true;

                        this.cdr.detectChanges();
                    },

                error:
                    (
                        error:
                            any
                    ) =>
                    {
                        console.error(
                            'History Load Failed',
                            error
                        );

                        this.toast.error(
                            'History',
                            'Failed to load master activity history.'
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
}
