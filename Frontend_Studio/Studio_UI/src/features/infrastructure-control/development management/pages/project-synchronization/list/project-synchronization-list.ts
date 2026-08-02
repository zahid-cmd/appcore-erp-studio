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
    CommandCenterComponent
}
from '../../../../../../shared/components/utilities/command-center/command-center';

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
    ListTableComponent,
    ListTableColumn
}
from '../../../../../../shared/components/layout/list-table/list-table';

import
{
    PaginationComponent
}
from '../../../../../../shared/components/controls/pagination/pagination';


//===============================================================
// Model
//===============================================================

import
{
    ProjectSynchronization
}
from '../../../model/project-synchronization.model';

//===============================================================
// Service
//===============================================================

import
{
    ProjectSynchronizationService
}
from '../../../services/project-synchronization.service';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'app-project-synchronization-list',

    standalone:true,

    imports:
    [
        CommonModule,

        PageHeaderComponent,

        PageToolbarComponent,

        ControlTabsComponent,

        CommandCenterComponent,

        PageCanvasComponent,

        ListTableComponent,

        PaginationComponent,

        ConfirmDialogComponent,

        ToastComponent,

        HistoryDrawerComponent
    ],

    templateUrl:'./project-synchronization-list.html',

    styleUrl:'./project-synchronization-list.css'
})


//===============================================================
// Project Synchronization List Component
//===============================================================

export class ProjectSynchronizationListComponent
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly router =
        inject(Router);

    private readonly toast =
        inject(ToastService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly service =
        inject(ProjectSynchronizationService);

    //===========================================================
    // Tabs
    //===========================================================

    tabs: ControlTab[] =
    [
        {
            id:'module',

            label:'Module'
        },

        {
            id:'menu',

            label:'Menu'
        },

        {
            id:'submenu',

            label:'Submenu'
        }
    ];

    selectedTab =
        'module';


    //===========================================================
    // Table Columns
    //===========================================================

    get columns():
        ListTableColumn[]
    {
        const columns:ListTableColumn[] =
        [
            //=======================================================
            // Serial
            //=======================================================

            {
                header:'#',
                field:'serial',
                type:'serial',
                width:'60px',
                align:'center'
            },

            //=======================================================
            // Module (Always Visible)
            //=======================================================

            {
                header:'Module',
                field:'moduleName',
                align:'left'
            }
        ];


        //=======================================================
        // Menu (Menu & Submenu Tabs)
        //=======================================================

        if
        (
            this.selectedTab === 'menu'
            ||
            this.selectedTab === 'submenu'
        )
        {
            columns.push(
            {
                header:'Menu',
                field:'menuName',
                align:'left'
            });
        }


        //=======================================================
        // Submenu (Submenu Tab Only)
        //=======================================================

        if
        (
            this.selectedTab === 'submenu'
        )
        {
            columns.push(
            {
                header:'Submenu',
                field:'submenuName',
                align:'left'
            });
        }


        //=======================================================
        // Frontend Status
        //=======================================================

        columns.push(
        {
            header:'Frontend',
            field:'frontendStatus',
            type:'status',
            width:'220px',
            align:'center'
        });


        //=======================================================
        // Backend Status
        //=======================================================

        columns.push(
        {
            header:'Backend',
            field:'backendStatus',
            type:'status',
            width:'220px',
            align:'center'
        });


        //=======================================================
        // Actions
        //=======================================================

        columns.push(
        {
            header:'Actions',
            field:'actions',
            type:'actions',
            width:'120px',
            align:'center'
        });


        return columns;
    }

    //===========================================================
    // List Data
    //===========================================================

    synchronizations:
        ProjectSynchronization[] =
    [];

    filteredSynchronizations:
        ProjectSynchronization[] =
    [];

    pagedSynchronizations:
        ProjectSynchronization[] =
    [];

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
        'Project Synchronization History';

    historyItems:any[] =
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

        this.applyTabFilter();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Component Initialization
    //===========================================================

    ngOnInit():
        void
    {
        this.loadData();
    }

    //===========================================================
    // Load Data
    //===========================================================

    loadData():
        void
    {
        this.loading =
            true;

        this.loadFailed =
            false;


        this.service

            .getAll()

            .subscribe(
            {
                next:(response) =>
                {
                    console.log(
                        'Project Synchronization Response',
                        response
                    );


                    this.synchronizations =
                    [
                        ...response
                    ];


                    //===================================================
                    // Apply Selected Tab Filter
                    //===================================================

                    this.applyTabFilter();


                    //===================================================
                    // Reset Pagination
                    //===================================================

                    this.currentPage =
                        1;


                    this.updatePagination();


                    //===================================================
                    // Complete
                    //===================================================

                    this.loading =
                        false;


                    this.loadFailed =
                        false;


                    this.cdr.detectChanges();
                },


                error:(error) =>
                {
                    console.error(
                        'Project Synchronization Load Failed',
                        error
                    );


                    this.synchronizations =
                    [];


                    this.filteredSynchronizations =
                    [];


                    this.pagedSynchronizations =
                    [];


                    this.currentPage =
                        1;


                    this.loading =
                        false;


                    this.loadFailed =
                        true;


                    this.toast.error(
                        'Load Failed',
                        'Unable to load project synchronization.'
                    );


                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Apply Tab Filter
    //===========================================================

    private applyTabFilter():
        void
    {
        console.table(
            this.synchronizations.map(
                x =>
                ({
                    id:
                        x.id,

                    level:
                        x.synchronizationLevel,

                    module:
                        x.moduleName,

                    menu:
                        x.menuName,

                    submenu:
                        x.submenuName
                })
            )
        );

        console.log(
            'Selected Tab:',
            this.selectedTab
        );


        switch (this.selectedTab)
        {
            //=======================================================
            // Module
            //=======================================================

            case 'module':

                this.filteredSynchronizations =
                    this.synchronizations.filter(
                        x =>
                            x.synchronizationLevel?.toLowerCase() ===
                            'module'
                    );

                break;


            //=======================================================
            // Menu
            //=======================================================

            case 'menu':

                this.filteredSynchronizations =
                    this.synchronizations.filter(
                        x =>
                            x.synchronizationLevel?.toLowerCase() ===
                            'menu'
                    );

                break;


            //=======================================================
            // Submenu
            //=======================================================

            case 'submenu':

                this.filteredSynchronizations =
                    this.synchronizations.filter(
                        x =>
                            x.synchronizationLevel?.toLowerCase() ===
                            'submenu'
                    );

                break;


            //=======================================================
            // Default
            //=======================================================

            default:

                this.filteredSynchronizations =
                [
                    ...this.synchronizations
                ];

                break;
        }


        console.log(
            'Filtered Count:',
            this.filteredSynchronizations.length
        );


        this.currentPage =
            1;


        this.updatePagination();
    }

    //=========================================================
    // Add
    //===========================================================

    add():
        void
    {
        this.router.navigate(
        [
            '/infrastructure-control/development-management/project-synchronization/add'
        ],
        {
            queryParams:
            {
                level:
                    this.selectedTab
            }
        });
    }


    //===========================================================
    // View
    //===========================================================

    view
    (
        item: ProjectSynchronization
    ):
        void
    {
        this.router.navigate(
        [
            '/infrastructure-control/development-management/project-synchronization/view',
            item.id
        ],
        {
            queryParams:
            {
                level:
                    this.selectedTab
            }
        });
    }


    //===========================================================
    // Edit
    //===========================================================

    edit
    (
        item: ProjectSynchronization
    ):
        void
    {
        this.router.navigate(
        [
            '/infrastructure-control/development-management/project-synchronization/edit',
            item.id
        ],
        {
            queryParams:
            {
                level:
                    this.selectedTab
            }
        });
    }

    //===========================================================
    // Delete
    //===========================================================

    delete(
        item: ProjectSynchronization
    ):
        void
    {
        this.confirmDialog.open(

            'Delete Project Synchronization',

            'Are you sure you want to delete this synchronization record?',

            () =>
            {
                this.service
                    .delete(
                        item.id
                    )
                    .subscribe(
                    {
                        next:() =>
                        {
                            this.toast.success(
                                'Delete Successful',
                                'Synchronization deleted successfully.'
                            );

                            this.loadData();
                        },

                        error:(error) =>
                        {
                            console.error(
                                error
                            );

                            this.toast.error(
                                'Delete Failed',
                                'Unable to delete synchronization.'
                            );
                        }
                    });
            }
        );
    }

    //===========================================================
    // Refresh
    //===========================================================

    refresh():
        void
    {
        this.loadData();

        this.toast.success(

            'Refresh',

            'Page refreshed successfully.'
        );
    }

    //===========================================================
    // Restore
    //===========================================================

    restore():
        void
    {
        this.confirmDialog.open(

            'Restore',

            'Do you want to restore the last deleted synchronization record?',

            () =>
            {
                this.service

                    .restore()

                    .subscribe({

                        next:() =>
                        {
                            this.loadData();

                            this.toast.success(

                                'Restore',

                                'Synchronization record restored successfully.'
                            );
                        },

                        error:() =>
                        {
                            this.toast.error(

                                'Restore',

                                'Failed to restore the synchronization record.'
                            );
                        }
                    });
            },

            'Restore',

            'Cancel',

            'primary'
        );
    }

    //===========================================================
    // History
    //===========================================================

    openHistory():
        void
    {
        this.service

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
                        'Project Synchronization History';

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
                        'Failed to load project synchronization history.'
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
    // Page Changed
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
    // Page Size Changed
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



}
