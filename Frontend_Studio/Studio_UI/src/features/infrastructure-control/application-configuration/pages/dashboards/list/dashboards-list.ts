//===============================================================
// Imports
//===============================================================

import
{
    AfterViewChecked,
    Component,
    ElementRef,
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
    HttpErrorResponse
}
from '@angular/common/http';

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
    Dashboards
}
from '../../../models/dashboards.model';


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
    DashboardsService
}
from '../../../services/dashboards.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:
        'dashboards-list',

    standalone:
        true,

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

    templateUrl:
        './dashboards-list.html',

    styleUrl:
        './dashboards-list.css'
})


//===============================================================
// Dashboards List Component
//===============================================================

export class DashboardsList
implements
    OnInit,
    AfterViewChecked
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly dashboardsservice =
        inject(DashboardsService);


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


    private readonly elementRef =
        inject(ElementRef);



    //===========================================================
    // Page Tabs
    //===========================================================

    tabs:
        ControlTab[] =
    [
        {
            id:
                'all',

            label:
                'All Dashboards'
        }
    ];


    selectedTab:
        string =
        'all';



    //===========================================================
    // Status Filter
    //===========================================================

    statusItems:
        {
            value:
                boolean | null;

            text:
                string;
        }[] =
    [
        {
            value:
                null,

            text:
                'All Status'
        },

        {
            value:
                true,

            text:
                'Active'
        },

        {
            value:
                false,

            text:
                'Inactive'
        }
    ];


    selectedStatus:
        boolean | null =
        null;



    //===========================================================
    // Data Source
    //===========================================================

    dashboards:
        Dashboards[] =
    [];


    filteredDashboards:
        Dashboards[] =
    [];


    pagedDashboards:
        Dashboards[] =
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
        'Dashboards History';


    historyItems:
        any[] =
    [];



    //===========================================================
    // Page Canvas Configuration
    //===========================================================

    readonly canvasConfig:
        PageCanvasConfig =
    {
        mode:
            'list',

        showHeader:
            false,

        showFooter:
            true,

        reserveFooterSpace:
            true,

        bodyScrollable:
            true,

        fixedHeight:
            true,

        visibleRows:
            10,

        rowHeight:
            32,

        headerHeight:
            36,

        footerHeight:
            56
    };



    //===========================================================
    // Table Columns
    //===========================================================

    readonly columns:
        ListTableColumn[] =
    [
        {
            header:
                '#',

            field:
                'serial',

            type:
                'serial',

            width:
                '60px',

            align:
                'center'
        },

        {
            header:
                'Code',

            field:
                'code',

            width:
                '150px',

            align:
                'center'
        },

        {
            header:
                'Name',

            field:
                'name',

            width:
                '220px',

            align:
                'left'
        },

        {
            header:
                'Dashboard Key',

            field:
                'dashboardKey',

            width:
                '220px',

            align:
                'left'
        },

        {
            header:
                'Dashboard Type',

            field:
                'dashboardType',

            width:
                '180px',

            align:
                'center'
        },

        {
            header:
                'Role Profile',

            field:
                'roleProfileName',

            width:
                '220px',

            align:
                'left'
        },

        {
            header:
                'Status',

            field:
                'status',

            type:
                'status',

            width:
                '180px',

            align:
                'center'
        },

        {
            header:
                'Operation',

            field:
                'operation',

            type:
                'operation',

            width:
                '180px',

            align:
                'center'
        },

        {
            header:
                'Actions',

            field:
                'actions',

            type:
                'actions',

            width:
                '180px',

            align:
                'center'
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
    // PAGE-SPECIFIC OPERATION TOOLTIP
    //
    // The shared ListTableComponent uses "Synchronize".
    //
    // Dashboards uses the same operation button for
    // View.
    //
    // This change is restricted to this page only.
    //===========================================================

    ngAfterViewChecked():
        void
    {
        this.updateDashboardsOperationTooltip();
    }



    //===========================================================
    // DASHBOARDS OPERATION MOUSE OVER
    //
    // This is triggered by the page-specific wrapper in
    // dashboards-list.html.
    //
    // It immediately changes the native browser tooltip
    // from "Synchronize" to "View".
    //===========================================================

    onDashboardsOperationMouseOver
    (
        event:
            MouseEvent
    ):
        void
    {
        if
        (
            !(event.target instanceof HTMLElement)
        )
        {
            return;
        }


        const operationButton =
            event.target.closest(
                '.action-btn.sync'
            );


        if
        (
            !(operationButton instanceof HTMLButtonElement)
        )
        {
            return;
        }


        operationButton.title =
            'View';
    }



    //===========================================================
    // UPDATE DASHBOARDS OPERATION TOOLTIP
    //
    // Page-specific DOM correction.
    //
    // No shared component is modified.
    //===========================================================

    private updateDashboardsOperationTooltip():
        void
    {
        const host =
            this.elementRef.nativeElement as HTMLElement;


        const operationButtons =
            host.querySelectorAll
            (
                '.dashboards-operation-table .action-btn.sync'
            );


        operationButtons.forEach
        (
            (
                button:
                    Element
            ):
                void =>
            {
                if
                (
                    button instanceof HTMLButtonElement
                )
                {
                    button.title =
                        'View';
                }
            }
        );
    }



    //===========================================================
    // Load Dashboards
    //===========================================================

    loadItems():
        void
    {
        this.loading =
            true;


        this.loadFailed =
            false;


        this.dashboardsservice
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        Dashboards[]
                ):
                    void =>
                {
                    this.dashboards =
                    [
                        ...response
                    ];


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
                        'Load Dashboards Error',

                        error
                    );


                    this.dashboards =
                    [];


                    this.filteredDashboards =
                    [];


                    this.pagedDashboards =
                    [];


                    this.loading =
                        false;


                    this.loadFailed =
                        true;


                    this.toast.error
                    (
                        'Load Failed',

                        'Unable to load dashboards.'
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


        this.filteredDashboards =
            this.dashboards
                .filter
                (
                    (
                        x:
                            Dashboards
                    ):
                        boolean =>
                    {
                        const statusMatch =
                            this.selectedStatus === null
                            ||
                            x.status ===
                            this.selectedStatus;


                        const searchMatch =
                            !keyword
                            ||
                            x.code
                                ?.toLowerCase()
                                .includes(keyword)
                            ||
                            x.name
                                ?.toLowerCase()
                                .includes(keyword)
                            ||
                            x.dashboardKey
                                ?.toLowerCase()
                                .includes(keyword)
                            ||
                            x.dashboardType
                                ?.toLowerCase()
                                .includes(keyword)
                            ||
                            x.roleProfileName
                                ?.toLowerCase()
                                .includes(keyword)
                            ||
                            x.remarks
                                ?.toLowerCase()
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
                'asc'
                |
                'desc';
        }
    ):
        void
    {
        this.filteredDashboards =
        [
            ...this.filteredDashboards
        ];


        this.filteredDashboards.sort
        (
            (
                a:
                    Dashboards,

                b:
                    Dashboards
            ):
                number =>
            {
                const valueA:
                    any =
                    a[
                        event.field as keyof Dashboards
                    ];


                const valueB:
                    any =
                    b[
                        event.field as keyof Dashboards
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
                        valueA.localeCompare(
                            valueB
                        )
                        :
                        valueB.localeCompare(
                            valueA
                        );
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


        this.pagedDashboards =
        [
            ...this.filteredDashboards
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
            Dashboards
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',

                item.id
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
            Dashboards
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',

                item.id
            ],

            {
                relativeTo:
                    this.route.parent
            }
        );
    }



    //===========================================================
    // View Dashboard
    //===========================================================

    viewDashboard
    (
        item:
            Dashboards
    ):
        void
    {
        const dashboardType =
            item.dashboardType
                ?.trim()
                .toLowerCase();


        if
        (
            dashboardType ===
            'default'
        )
        {
            void this.router.navigate
            (
                [
                    'dashboard',

                    'default',

                    item.id
                ],

                {
                    relativeTo:
                        this.route.parent
                }
            );


            return;
        }


        if
        (
            dashboardType ===
            'role-based'
        )
        {
            void this.router.navigate
            (
                [
                    'dashboard',

                    'customized',

                    item.id
                ],

                {
                    relativeTo:
                        this.route.parent
                }
            );


            return;
        }
    }



    //===========================================================
    // Delete
    //===========================================================

    delete
    (
        item:
            Dashboards
    ):
        void
    {
        this.confirmDialog.open
        (
            'Delete Dashboard',

            `Are you sure you want to delete "${item.name}" ?`,

            ():
                void =>
            {
                this.dashboardsservice
                    .delete
                    (
                        item.id
                    )
                    .subscribe
                    ({
                        next:
                        ():
                            void =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',

                                `${item.name} deleted successfully.`
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
                                'Delete Dashboard Error',

                                error
                            );


                            this.toast.error
                            (
                                'Delete Failed',

                                'Failed to delete dashboard.'
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
            'Restore Dashboard',

            'Are you sure you want to restore the most recently deleted dashboard.',

            ():
                void =>
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
        this.dashboardsservice
            .restore()
            .subscribe
            ({
                next:
                ():
                    void =>
                {
                    this.toast.success
                    (
                        'Restore Successful',

                        'The most recently deleted dashboard has been restored.'
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
                        'Restore Dashboard Error',

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

                            'There is no deleted dashboard record to restore.'
                        );


                        return;
                    }


                    this.toast.error
                    (
                        'Restore Failed',

                        'Failed to restore dashboard.'
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
        this.dashboardsservice
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
                        'Dashboards Management History';


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
                        'History Load Failed',

                        error
                    );


                    this.toast.error
                    (
                        'History',

                        'Failed to load dashboards history.'
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