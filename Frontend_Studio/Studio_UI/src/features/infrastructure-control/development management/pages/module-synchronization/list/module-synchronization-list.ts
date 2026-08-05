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
    Router,
    ActivatedRoute
}
from '@angular/router';

import
{
    CommonModule
}
from '@angular/common';

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
    ModuleSynchronizationService
}
from '../../../services/module-synchronization.service';

import
{
    ModuleSynchronization
}
from '../../../model/module-synchronization.model';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'app-module-synchronization-list',

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

    templateUrl:'./module-synchronization-list.html',

    styleUrl:'./module-synchronization-list.css'
})


//===============================================================
// Module Synchronization List Component
//===============================================================

export class ModuleSynchronizationListComponent
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly moduleSynchronizationService =
        inject(ModuleSynchronizationService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly router =
        inject(Router);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly route =
        inject(ActivatedRoute);

    //===========================================================
    // Page Tabs
    //===========================================================

    tabs: ControlTab[] =
    [
        {
            id:'frontend',

            label:'Frontend'
        },

        {
            id:'backend',

            label:'Backend'
        }
    ];

    selectedTab =
        'frontend';

    //===========================================================
    // Data Source
    //===========================================================

    synchronizations: ModuleSynchronization[] =
    [];

    filteredSynchronizations: ModuleSynchronization[] =
    [];

    pagedSynchronizations: ModuleSynchronization[] =
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
        'Module Synchronization History';

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
            header:'Module',
            field:'moduleName',
            align:'left'
        },

        {
            header:'Created',
            field:'createdDate',
            width:'250px',
            align:'center'
        },

        {
            header:'Last Sync',
            field:'lastSynchronizedDate',
            width:'250px',
            align:'center'
        },

        {
            header:'Result',
            field:'lastSynchronizationResult',
            width:'450px',
            align:'center'
        },

        {
            header:'Operation',
            field:'operation',
            type:'operation',
            width:'110px',
            align:'center'
        },

        {
            header:'Status',
            field:'status',
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
    // Component Initialization
    //===========================================================

    ngOnInit():
        void
    {
        const url =
            this.router.url.toLowerCase();

        if
        (
            url.includes('/module-synchronization/backend')
        )
        {
            this.selectedTab =
                'backend';
        }
        else
        {
            this.selectedTab =
                'frontend';
        }

        console.log('================================');
        console.log('Selected Tab:', this.selectedTab);
        console.log('Current URL:', url);
        console.log('================================');

        this.loadModuleSynchronizations();
    }

    //===========================================================
    // Selected Tab Changed
    //===========================================================

    onSelectedTabChange
    (
        tabId:string
    ):
        void
    {
        this.selectedTab =
            tabId;

        if (tabId === 'backend')
        {
            this.router.navigate(
            [
                '/infrastructure-control/development-management/module-synchronization/backend'
            ])
            .then(() =>
            {
                this.loadModuleSynchronizations();
            });

            return;
        }

        this.router.navigate(
        [
            '/infrastructure-control/development-management/module-synchronization/frontend'
        ])
        .then(() =>
        {
            this.loadModuleSynchronizations();
        });
    }

    //===========================================================
    // Load Module Synchronization Data
    //===========================================================

    loadModuleSynchronizations():
        void
    {
        this.loading =
            true;

        this.loadFailed =
            false;

        const synchronizationType =
            this.selectedTab === 'backend'
                ? 'Backend'
                : 'Frontend';

        this.moduleSynchronizationService
            .getAll(synchronizationType)

            .subscribe(
            {
                next:(response) =>
                {
                    console.log('================================');
                    console.log('Synchronization Type:', synchronizationType);
                    console.log('Module Synchronization Response');
                    console.log(response);
                    console.log('Total Records:', response.length);
                    console.log('================================');

                    this.synchronizations =
                    [
                        ...response
                    ];

                    this.filteredSynchronizations =
                    [
                        ...response
                    ].sort(
                        (a,b)=>
                            a.moduleName.localeCompare(b.moduleName)
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

                error:(error)=>
                {
                    console.error(error);

                    this.synchronizations = [];

                    this.filteredSynchronizations = [];

                    this.pagedSynchronizations = [];

                    this.loading = false;

                    this.loadFailed = true;

                    this.toast.error(
                        'Load Failed',
                    'Unable to load module synchronization.'
                );

                this.cdr.detectChanges();
            }
        });
}

    //===========================================================
    // Search Module Synchronization
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
            this.filteredSynchronizations =
            [
                ...this.synchronizations
            ];
        }
        else
        {
            this.filteredSynchronizations =
                this.synchronizations.filter(x =>

                    x.moduleCode
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    x.moduleName
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    x.remarks
                        ?.toLowerCase()
                        .includes(keyword)
                );
        }

        this.filteredSynchronizations.sort(
            (a, b) =>
                a.moduleName.localeCompare(b.moduleName)
        );

        this.currentPage =
            1;

        this.updatePagination();
    }

    //===========================================================
    // Sort Module Synchronization
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
        this.filteredSynchronizations =
        [
            ...this.filteredSynchronizations
        ];

        this.filteredSynchronizations.sort(
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
    // Refresh Module Synchronization
    //===========================================================

    refresh():
        void
    {
        this.searchText =
            '';

        this.currentPage =
            1;

        this.filteredSynchronizations =
        [
            ...this.synchronizations
        ];

        this.loadModuleSynchronizations();
    }

    //===========================================================
    // Update Pagination
    //===========================================================

    updatePagination():
        void
    {
        const start =
            (this.currentPage - 1)
            *
            this.pageSize;

        this.pagedSynchronizations =
        [
            ...this.filteredSynchronizations.slice(
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
    // Add Module Synchronization
    //===========================================================

    add():
        void
    {
        const prefix =
            this.selectedTab === 'backend'
                ? 'backend'
                : 'frontend';

        this.router.navigate(
        [
            `/infrastructure-control/development-management/module-synchronization/${prefix}/new`
        ]);
    }

    //===========================================================
    // View Module Synchronization
    //===========================================================

    view
    (
        item: ModuleSynchronization
    ):
        void
    {
        const prefix =
            this.selectedTab === 'backend'
                ? 'backend'
                : 'frontend';

        this.router.navigate(
        [
            '/infrastructure-control',
            'development-management',
            'module-synchronization',
            prefix,
            'view',
            item.id
        ]);
    }

    //===========================================================
    // Edit Module Synchronization
    //===========================================================

    edit
    (
        item: ModuleSynchronization
    ):
        void
    {
        const prefix =
            this.selectedTab === 'backend'
                ? 'backend'
                : 'frontend';

        this.router.navigate(
        [
            '/infrastructure-control',
            'development-management',
            'module-synchronization',
            prefix,
            'edit',
            item.id
        ]);
    }

    //===========================================================
    // Synchronize Module
    //===========================================================

    synchronize
    (
        item: ModuleSynchronization
    ):
        void
    {
        const prefix =
            this.selectedTab === 'backend'
                ? 'backend'
                : 'frontend';

        this.router.navigate(
        [
            '/infrastructure-control',
            'development-management',
            'module-synchronization',
            prefix,
            'synchronize',
            item.id
        ]);
    }


    //===========================================================
    // Delete Module Synchronization
    //===========================================================

    delete
    (
        item: ModuleSynchronization
    ):
        void
    {
        this.confirmDialog.open(

            'Delete Module Synchronization',

            `Are you sure you want to delete "${item.moduleName}" ?`,

            () =>
            {
                this.moduleSynchronizationService
                    .delete(item.id)
                    .subscribe(
                    {
                        next:() =>
                        {
                            this.toast.success(

                                'Delete Successful',

                                `${item.moduleName} deleted successfully.`
                            );

                            this.loadModuleSynchronizations();
                        },

                        error:(error) =>
                        {
                            console.error(error);

                            this.toast.error(

                                'Delete Failed',

                                'Failed to delete module synchronization.'
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

            'Restore Module Synchronization',

            'Are you sure you want to restore the most recently deleted module synchronization configuration?',

            () =>
            {
                this.restoreModuleSynchronization();
            },

            'Restore',

            'Cancel',

            'primary'
        );
    }

    //===========================================================
    // Restore Module Synchronization
    //===========================================================

    private restoreModuleSynchronization():
        void
    {
        const synchronizationType =
            this.selectedTab === 'backend'
                ? 'Backend'
                : 'Frontend';

        this.moduleSynchronizationService

            .restore(
                synchronizationType
            )

            .subscribe(
            {
                next:() =>
                {
                    this.toast.success(

                        'Restore Successful',

                        'The most recently deleted module synchronization configuration has been restored.'
                    );

                    this.loadModuleSynchronizations();
                },

                error:(error) =>
                {
                    this.toast.error(

                        'Restore Failed',

                        error?.error ??

                        'Failed to restore module synchronization configuration.'
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
        this.moduleSynchronizationService
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
                        'Module Synchronization History';

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
                        'Failed to load module synchronization history.'
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