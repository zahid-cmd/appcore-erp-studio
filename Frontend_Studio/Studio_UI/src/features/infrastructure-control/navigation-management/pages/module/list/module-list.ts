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
    ModuleService
}
from '../../../services/module.service';

import
{
    NavigationModule
}
from '../../../models/navigation-module.model';

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
// Component
//===============================================================

@Component(
{
    selector:'app-module-list',

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

    templateUrl:'./module-list.html',

    styleUrl:'./module-list.css'
})

//===============================================================
// Module List Component
//===============================================================

export class ModuleListComponent
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly moduleService =
        inject(ModuleService);

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

            label:'All Modules'
        }
    ];

    selectedTab =
        'all';

    //===========================================================
    // Data Source
    //===========================================================

    modules: NavigationModule[] =
    [];

    filteredModules: NavigationModule[] =
    [];

    pagedModules: NavigationModule[] =
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
        'Module Management History';

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
            header:'Code',
            field:'code',
            width:'280px',
            align:'center'
        },

        {
            header:'Module Name',
            field:'name',
            align:'left'
        },

        {
            header:'Icon',
            field:'icon',
            width:'280px',
            align:'left'
        },

        {
            header:'Order',
            field:'displayOrder',
            width:'180px',
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
        this.loadModules();
    }

    //===========================================================
    // Load Module Data
    //===========================================================

    loadModules():
        void
    {
        this.loading =
            true;

        this.loadFailed =
            false;

        this.moduleService
            .getAll()
            .subscribe(
            {
                next:(response) =>
                {
                    console.log('================================');
                    console.log('Navigation Modules Response');
                    console.log(response);
                    console.log('Total Records:', response.length);
                    console.log('================================');

                    this.modules =
                    [
                        ...response
                    ];

                    this.filteredModules =
                    [
                        ...response
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

                    console.log('Change Detection Triggered');
                },

                error:(error) =>
                {
                    console.error('Load Modules Error');
                    console.error(error);

                    this.modules =
                    [];

                    this.filteredModules =
                    [];

                    this.pagedModules =
                    [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.toast.error(
                        'Load Failed',
                        'Unable to load navigation modules.'
                    );

                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Search Modules
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
            this.filteredModules =
            [
                ...this.modules
            ];
        }
        else
        {
            this.filteredModules =
                this.modules.filter(x =>

                    x.code
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    x.name
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    x.remarks
                        ?.toLowerCase()
                        .includes(keyword)

                );
        }

        this.filteredModules.sort(
            (a, b) =>
                a.code.localeCompare(b.code)
        );

        this.currentPage =
            1;

        this.updatePagination();
    }



    //===========================================================
    // Sort Module List
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
        this.filteredModules =
        [
            ...this.filteredModules
        ];

        this.filteredModules.sort(
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
    // Refresh Module List
    //===========================================================

    refresh():
        void
    {
        this.searchText =
            '';

        this.currentPage =
            1;

        this.loadModules();
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

        this.pagedModules =
        [
            ...this.filteredModules.slice(
                start,
                start + this.pageSize
            )
        ];

        console.log('========================');
        console.log('Paged Modules');
        console.log(this.pagedModules);
        console.log('Paged Length:', this.pagedModules.length);
        console.log('========================');
    }

    //===========================================================
    // Page Change Event
    //===========================================================

    onPageChange(
        page: number
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
        size: number
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
    // Add Module
    //===========================================================

    add():
        void
    {
        this.router.navigate(
        [
            '/infrastructure-control/navigation-management/modules/add'
        ]);
    }

    //===========================================================
    // View Module
    //===========================================================

    view(
        item: NavigationModule
    ):
        void
    {
        this.router.navigate(
        [
            '/infrastructure-control/navigation-management/modules/view',

            item.id
        ]);
    }

    //===========================================================
    // Edit Module
    //===========================================================

    edit(
        item: NavigationModule
    ):
        void
    {
        this.router.navigate(
        [
            '/infrastructure-control/navigation-management/modules/edit',

            item.id
        ]);
    }

    //===========================================================
    // Delete Module
    //===========================================================

    delete(
        item: NavigationModule
    ):
    void
    {
        this.confirmDialog.open(

            'Delete Module',

            `Are you sure you want to delete "${item.name}" ?`,

            () =>
            {
                this.moduleService
                    .delete(item.id)
                    .subscribe(
                    {
                        next: () =>
                        {
                            this.toast.success(
                                'Delete Successful',
                                `${item.name} deleted successfully.`
                            );

                            this.loadModules();
                        },


                        error:(error)=>
                        {
                            console.error(error);

                            this.toast.error(
                                'Delete Failed',
                                'Failed to delete module.'
                            );
                        }
                    });
            }
        );
    }

    //===========================================================
    // Delete Module From Database
    //===========================================================

    private deleteModule(
        item: NavigationModule
    ):
        void
    {
        this.moduleService
            .delete(item.id)
            .subscribe(
            {
                next: () =>
                {
                    this.toast.success(
                        'Success',
                        'Navigation module deleted successfully.'
                    );

                    this.loadModules();
                },

                error: (error) =>
                {
                    this.toast.error(
                        'Error',
                        'Unable to delete navigation module.'
                    );

                    console.error(
                        'Failed to delete navigation module.',
                        error
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
        this.moduleService
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
                        'Navigation Menu Management History';


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
                        'Failed to load navigation menu history.'
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
    // Restore
    //===========================================================

    restore():
        void
    {
        this.confirmDialog.open(

            'Restore Navigation Module',

            'Are you sure you want to restore the most recently deleted navigation module?',

            () =>
            {
                this.restoreSelectedModules();
            },

            'Restore',

            'Cancel',

            'primary'
        );
    }

    //===========================================================
    // Restore Selected Modules
    //===========================================================

    private restoreSelectedModules():
        void
    {
        this.moduleService
            .restore()
            .subscribe(
            {
                next: () =>
                {
                    this.toast.success(
                        'Restore Successful',
                        'Navigation module restored successfully.'
                    );

                    this.loadModules();
                },

                error: (error) =>
                {
                    console.error(error);

                    this.toast.error(
                        'Restore Failed',
                        error?.error ??
                        'Failed to restore navigation module.'
                    );
                }
            });
    }
}