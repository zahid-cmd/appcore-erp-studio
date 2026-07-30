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
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

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
    NavigationActivityService
}
from '../../../services/activity.service';

import
{
    NavigationActivity
}
from '../../../models/navigation-activity.model';

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

import
{
    ModuleService
}
from '../../../services/module.service';

import
{
    NavigationModule
}
from '../../../models/navigation-module.model';

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

        SearchDropdownComponent,

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

    templateUrl:'./activity-list.html',

    styleUrl:'./activity-list.css'
})

//===============================================================
// Navigation Activity List Component
//===============================================================

export class NavigationActivityListComponent
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly navigationActivityService =
        inject(NavigationActivityService);

    private readonly masterActivityService =
        inject(MasterActivityService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly route =
        inject(ActivatedRoute);
        
    private readonly router =
        inject(Router);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly moduleService =
        inject(ModuleService);

    //===========================================================
    // Page Tabs
    //===========================================================

    tabs: ControlTab[] =
    [
        {
            id:'master',
            label:'Master Activities'
        },

        {
            id:'navigation',
            label:'Navigation Activities'
        }
    ];

    selectedTab =
        'master';

    //===========================================================
    // Current Mode
    //===========================================================

    get isMasterMode(): boolean
    {
        return this.selectedTab === 'master';
    }

    //===========================================================
    // Data Source
    //===========================================================

    activities: NavigationActivity[] =
    [];

    filteredActivities: NavigationActivity[] =
    [];

    pagedActivities: NavigationActivity[] =
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
    // Module Filter
    //===========================================================

    modules:
        NavigationModule[] =
    [
    ];

    selectedModuleId:
        number =
            0;

    //===========================================================
    // History Drawer
    //===========================================================

    historyOpened =
        false;

    historyTitle =
        'Navigation Activity History';

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
    // Table Columns Definition
    //===========================================================

    get columns(): ListTableColumn[]
    {
        const columns: ListTableColumn[] =
        [
            {
                header:'#',
                field:'serial',
                type:'serial',
                width:'60px',
                align:'center'
            }
        ];

        if (!this.isMasterMode)
        {
            columns.push(

            {
                header:'Module',
                field:'navigationModuleName',
                width:'320px',
                align:'left'
            },
        );
        }

        columns.push(

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
        );

        return columns;
    }

    //===========================================================
    // Component Initialization
    //===========================================================

    ngOnInit():
        void
    {
        const tab =
            this.route.snapshot.queryParamMap.get('tab');

        if
        (
            tab === 'master'
            ||
            tab === 'navigation'
        )
        {
            this.selectedTab =
                tab;
        }

        //=======================================================
        // Load Module Filter
        //=======================================================

        this.loadModules();

        //=======================================================
        // Load Activities
        //=======================================================

        this.loadActivities();
    }

    //===========================================================
    // Tab Changed
    //===========================================================

    onTabChange(
        tabId: string
    ):
        void
    {
        this.selectedTab =
            tabId;

        this.searchText =
            '';

        this.currentPage =
            1;

        this.loadActivities();
    }

    //===========================================================
    // Load Modules
    //===========================================================

    private loadModules():
        void
    {
        this.moduleService

            .getAll()

            .subscribe(
            {
                next:(response) =>
                {
                    this.modules =
                    [
                        {
                            id:0,
                            code:'',
                            name:'All Modules',
                            icon:'',
                            routeKey:'',
                            route:'',
                            displayOrder:0,
                            remarks:'',
                            isActive:true
                        },

                        ...response
                    ];
                },

                error:(error) =>
                {
                    console.error(error);

                    this.toast.error(
                        'Load Failed',
                        'Unable to load modules.'
                    );
                }
            });
    }

    //===========================================================
    // Module Changed
    //===========================================================

    onModuleChanged
    (
        value:number
    ):
        void
    {
        this.selectedModuleId =
            value;

        this.loadActivities();
    }

    //===========================================================
    // Load Activity Data
    //===========================================================

    loadActivities():
        void
    {
        if (this.isMasterMode)
        {
            this.loadMasterActivities();
        }
        else
        {
            this.loadNavigationActivities();
        }
    }

    //===========================================================
    // Load Navigation Activities
    //===========================================================

    loadNavigationActivities():
        void
    {
        this.loading =
            true;

        this.loadFailed =
            false;

        this.navigationActivityService

            .getAll(
                this.selectedModuleId > 0
                    ? this.selectedModuleId
                    : undefined
            )

            .subscribe(
            {
                next:(response) =>
                {
                    console.log('================================');

                    console.log('Navigation Activities Response');

                    console.log(response);

                    console.log(
                        'Total Records:',
                        response.length
                    );

                    console.log('================================');

                    this.activities =
                    [
                        ...response
                    ];

                    this.filteredActivities =
                    [
                        ...response
                    ].sort(
                        (a, b) =>
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

                    console.log(
                        'Change Detection Triggered'
                    );
                },

                error:(error) =>
                {
                    console.error(
                        'Load Activities Error'
                    );

                    console.error(
                        error
                    );

                    this.activities =
                    [
                    ];

                    this.filteredActivities =
                    [
                    ];

                    this.pagedActivities =
                    [
                    ];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.toast.error(
                        'Load Failed',
                        'Unable to load navigation activities.'
                    );

                    this.cdr.detectChanges();
                }
            });
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
                next:(response) =>
                {
                    console.log('================================');

                    console.log('Master Activities Response');

                    console.log(response);

                    console.log(
                        'Total Records:',
                        response.length
                    );

                    console.log('================================');

                    this.activities =
                    [
                        ...(response as any[])
                    ];

                    this.filteredActivities =
                    [
                        ...this.activities
                    ].sort(
                        (a, b) =>
                            a.code.localeCompare(b.code)
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

                error:(error) =>
                {
                    console.error(
                        'Load Master Activities Error'
                    );

                    console.error(error);

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
    // Search Activities
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
            this.filteredActivities =
            [
                ...this.activities
            ];
        }
        else
        {
            this.filteredActivities =
                this.activities.filter(x =>

                    x.code
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    x.name
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    (
                        ((x as any).navigationModuleName ?? '')
                            .toLowerCase()
                            .includes(keyword)
                    )

                    ||

                    (
                        (x.remarks ?? '')
                            .toLowerCase()
                            .includes(keyword)
                    )

                );
        }

        this.filteredActivities.sort(
            (a, b) =>
                a.code.localeCompare(b.code)
        );

        this.currentPage =
            1;

        this.updatePagination();
    }


    //===========================================================
    // Sort Activity List
    //===========================================================

    onSort
    (
        event:
        {
            field:string;
            direction:'asc' | 'desc';
        }
    ):
        void
    {
        this.filteredActivities =
        [
            ...this.filteredActivities
        ];

        this.filteredActivities.sort(
            (a:any, b:any) =>
            {
                const valueA =
                    a[event.field];

                const valueB =
                    b[event.field];

                if (valueA == null && valueB == null)
                {
                    return 0;
                }

                if (valueA == null)
                {
                    return -1;
                }

                if (valueB == null)
                {
                    return 1;
                }

                if
                (
                    typeof valueA === 'string' &&
                    typeof valueB === 'string'
                )
                {
                    return event.direction === 'asc'
                        ? valueA.localeCompare(valueB)
                        : valueB.localeCompare(valueA);
                }

                if (valueA < valueB)
                {
                    return event.direction === 'asc'
                        ? -1
                        : 1;
                }

                if (valueA > valueB)
                {
                    return event.direction === 'asc'
                        ? 1
                        : -1;
                }

                return 0;
            });

        this.currentPage =
            1;

        this.updatePagination();
    }



    //===========================================================
    // Refresh Activity List
    //===========================================================

    refresh():
        void
    {
        this.searchText =
            '';

        this.selectedModuleId =
            0;

        this.currentPage =
            1;

        this.loadActivities();
    }

    //===========================================================
    // Update Pagination Data
    //===========================================================

    updatePagination():
        void
    {
        const start =
            (this.currentPage - 1)
            *
            this.pageSize;

        this.pagedActivities =
        [
            ...this.filteredActivities.slice(
                start,
                start + this.pageSize
            )
        ];

        console.log('========================');

        console.log('Paged Activities');

        console.log(this.pagedActivities);

        console.log(
            'Paged Length:',
            this.pagedActivities.length
        );

        console.log('========================');
    }


    //===========================================================
    // Page Change Event
    //===========================================================

    onPageChange(
        page:number
    ):
        void
    {
        this.currentPage =
            page;

        this.updatePagination();
    }



    //===========================================================
    // Page Size Change Event
    //===========================================================

    onPageSizeChange(
        size:number
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
    // Add Activity
    //===========================================================

    add():
        void
    {
        this.router.navigate(
        [
            '/infrastructure-control/navigation-management/navigation-activities/add'
        ],
        {
            queryParams:
            {
                tab:this.selectedTab
            }
        });
    }

    //===========================================================
    // View Activity
    //===========================================================

    view(
        item:any
    ):
        void
    {
        this.router.navigate(
        [
            '/infrastructure-control/navigation-management/navigation-activities/view',

            item.id
        ],
        {
            queryParams:
            {
                tab:this.selectedTab
            }
        });
    }

    //===========================================================
    // Edit Activity
    //===========================================================

    edit(
        item:any
    ):
        void
    {
        this.router.navigate(
        [
            '/infrastructure-control/navigation-management/navigation-activities/edit',

            item.id
        ],
        {
            queryParams:
            {
                tab:this.selectedTab
            }
        });
    }

    //===========================================================
    // Delete Activity
    //===========================================================

    delete(
        item:any
    ):
        void
    {
        this.confirmDialog.open(

            this.isMasterMode
                ? 'Delete Master Activity'
                : 'Delete Navigation Activity',

            `Are you sure you want to delete "${item.name}" ?`,

            () =>
            {
                const request =
                    this.isMasterMode
                        ? this.masterActivityService.delete(item.id)
                        : this.navigationActivityService.delete(item.id);

                request.subscribe(
                {
                    next:() =>
                    {
                        this.toast.success(
                            'Delete Successful',
                            `${item.name} deleted successfully.`
                        );

                        this.loadActivities();
                    },

                    error:(error) =>
                    {
                        console.error(error);

                        this.toast.error(
                            'Delete Failed',
                            'Failed to delete activity.'
                        );
                    }
                });
            }
        );
    }

    //===========================================================
    // Restore Activity
    //===========================================================

    restore():
        void
    {
        this.confirmDialog.open(

            this.isMasterMode
                ? 'Restore Master Activity'
                : 'Restore Navigation Activity',

            this.isMasterMode
                ? 'Are you sure you want to restore the most recently deleted master activity?'
                : 'Are you sure you want to restore the most recently deleted navigation activity?',

            () =>
            {
                this.restoreActivity();
            },

            'Restore',

            'Cancel',

            'primary'
        );
    }

    //===========================================================
    // Restore Activity
    //===========================================================

    private restoreActivity():
        void
    {
        const request =
            this.isMasterMode
                ? this.masterActivityService.restore()
                : this.navigationActivityService.restore();

        request.subscribe(
        {
            next:() =>
            {
                this.toast.success(
                    'Restore Successful',

                    this.isMasterMode
                        ? 'The most recently deleted master activity has been restored.'
                        : 'The most recently deleted navigation activity has been restored.'
                );

                this.loadActivities();
            },

            error:(error) =>
            {
                this.toast.error(
                    'Restore Failed',

                    error?.error ??

                    (
                        this.isMasterMode
                            ? 'Failed to restore master activity.'
                            : 'Failed to restore navigation activity.'
                    )
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
        const request =
            this.isMasterMode
                ? this.masterActivityService.getHistory()
                : this.navigationActivityService.getHistory();

        request.subscribe(
        {
            next:(response:any[]) =>
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
                    this.isMasterMode
                        ? 'Master Activity Management History'
                        : 'Navigation Activity Management History';

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
                    this.isMasterMode
                        ? 'Failed to load master activity history.'
                        : 'Failed to load navigation activity history.'
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