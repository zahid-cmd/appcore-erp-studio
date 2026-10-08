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
    Router
}
from '@angular/router';

import
{
    CommonModule
}
from '@angular/common';


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
    ControlTabsComponent,
    ControlTab
}
from '../../../../../../shared/components/controls/control-tabs/control-tabs';

import
{
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

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


//===============================================================
// Models
//===============================================================

import
{
    PageCloning
}
from '../../../model/page-cloning.model';

import
{
    NavigationModule
}
from '../../../../navigation-management/models/navigation-module.model';


//===============================================================
// Services
//===============================================================

import
{
    PageCloningService
}
from '../../../services/page-cloning.service';

import
{
    ModuleService
}
from '../../../../navigation-management/services/module.service';

import
{
    NavigationMenuService
}
from '../../../../navigation-management/services/menu.service';

import
{
    NavigationSubmenuService
}
from '../../../../navigation-management/services/submenu.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'app-page-cloning-list',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ControlTabsComponent,
        SearchDropdownComponent,
        PageCanvasComponent,
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        ConfirmDialogComponent,
        ToastComponent
    ],

    templateUrl:'./page-cloning-list.html',

    styleUrl:'./page-cloning-list.css'
})


//===============================================================
// Page Cloning List Component
//===============================================================

export class PageCloningListComponent
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly pageCloningService =
        inject(PageCloningService);

    private readonly moduleService =
        inject(ModuleService);

    private readonly menuService =
        inject(NavigationMenuService);

    private readonly submenuService =
        inject(NavigationSubmenuService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly router =
        inject(Router);

    private readonly cdr =
        inject(ChangeDetectorRef);


    //===========================================================
    // Data Source
    //===========================================================

    pageClonings:PageCloning[] =
        [];

    filteredPageClonings:PageCloning[] =
        [];

    pagedPageClonings:PageCloning[] =
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
    // Toolbar
    //===========================================================

    tabs:ControlTab[] =
    [
        {
            id:'page-cloning',
            label:'Page Cloning'
        }
    ];

    selectedTab =
        'page-cloning';


    modules:NavigationModule[] =
        [];

    menus:any[] =
        [];

    submenus:any[] =
        [];

    selectedModuleId =
        0;

    selectedMenuId =
        0;

    selectedSubmenuId =
        0;


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
        'Page Cloning History';

    historyItems:any[] =
        [];


    //===========================================================
    // Page Canvas Configuration
    //===========================================================

    readonly canvasConfig:PageCanvasConfig =
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

    readonly columns:ListTableColumn[] =
    [
        {
            header:'#',

            field:'serial',

            type:'serial',

            width:'60px',

            align:'center'
        },

        {
            header:'Clone From',

            field:'cloneFromName',

            width:'250px',

            align:'left'
        },

        {
            header:'Clone To',

            field:'cloneToName',

            width:'250px',

            align:'left'
        },

        {
            header:'Files',

            field:'numberOfFiles',

            width:'100px',

            align:'center'
        },

        {
            header:'Operation',

            field:'operation',

            type:'operation',

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
        this.loadModules();

        this.loadPageClonings();
    }


    //===========================================================
    // Load Modules
    //===========================================================

    loadModules():
        void
    {
        this.moduleService
            .getAll()
            .subscribe
            ({
                next:
                    modules =>
                    {
                        this.modules =
                            modules;
                    },

                error:
                    error =>
                    {
                        console.error
                        (
                            'Failed to load modules.',
                            error
                        );
                    }
            });
    }


    //===========================================================
    // Module Changed
    //===========================================================

    onModuleChange
    (
        moduleId:number
    ):
        void
    {
        this.selectedModuleId =
            Number(moduleId);

        this.selectedMenuId =
            0;

        this.selectedSubmenuId =
            0;

        this.menus =
            [];

        this.submenus =
            [];

        if
        (
            this.selectedModuleId <= 0
        )
        {
            this.applyFilters();

            return;
        }

        this.menuService
            .getByModule
            (
                this.selectedModuleId
            )
            .subscribe
            ({
                next:
                    menus =>
                    {
                        this.menus =
                            menus;

                        this.applyFilters();
                    },

                error:
                    error =>
                    {
                        console.error
                        (
                            'Failed to load menus.',
                            error
                        );

                        this.applyFilters();
                    }
            });
    }


    //===========================================================
    // Menu Changed
    //===========================================================

    onMenuChange
    (
        menuId:number
    ):
        void
    {
        this.selectedMenuId =
            Number(menuId);

        this.selectedSubmenuId =
            0;

        this.submenus =
            [];

        if
        (
            this.selectedMenuId <= 0
        )
        {
            this.applyFilters();

            return;
        }

        this.submenuService
            .getByMenu
            (
                this.selectedMenuId
            )
            .subscribe
            ({
                next:
                    submenus =>
                    {
                        this.submenus =
                            submenus;

                        this.applyFilters();
                    },

                error:
                    error =>
                    {
                        console.error
                        (
                            'Failed to load submenus.',
                            error
                        );

                        this.applyFilters();
                    }
            });
    }


    //===========================================================
    // Submenu Changed
    //===========================================================

    onSubmenuChange
    (
        submenuId:number
    ):
        void
    {
        this.selectedSubmenuId =
            Number(submenuId);

        this.applyFilters();
    }


    //===========================================================
    // Load Page Cloning
    //===========================================================

    loadPageClonings():
        void
    {
        this.loading =
            true;

        this.loadFailed =
            false;

        this.pageCloningService
            .getAll()
            .subscribe(
            {
                next:(response:PageCloning[]) =>
                {
                    console.log('================================');

                    console.log(
                        'Page Cloning Response:',
                        response
                    );

                    console.log(
                        'Total Records:',
                        response.length
                    );

                    console.log('================================');

                    this.pageClonings =
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

                error:(error) =>
                {
                    console.error(
                        'Page Cloning Load Failed:',
                        error
                    );

                    this.pageClonings =
                        [];

                    this.filteredPageClonings =
                        [];

                    this.pagedPageClonings =
                        [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.toast.error(
                        'Load Failed',

                        'Unable to load page cloning records.'
                    );

                    this.cdr.detectChanges();
                }
            });
    }


    //===========================================================
    // Apply Filters
    //===========================================================

    private applyFilters():
        void
    {
        const keyword =
            this.searchText
                .trim()
                .toLowerCase();

        this.filteredPageClonings =
            this.pageClonings.filter(
                item =>
                {
                    if
                    (
                        keyword
                        &&
                        !(
                            item.cloneFromCode
                                ?.toLowerCase()
                                .includes(keyword)

                            ||

                            item.cloneFromName
                                ?.toLowerCase()
                                .includes(keyword)

                            ||

                            item.cloneToCode
                                ?.toLowerCase()
                                .includes(keyword)

                            ||

                            item.cloneToName
                                ?.toLowerCase()
                                .includes(keyword)

                            ||

                            item.operation
                                ?.toLowerCase()
                                .includes(keyword)

                            ||

                            item.remarks
                                ?.toLowerCase()
                                .includes(keyword)
                        )
                    )
                    {
                        return false;
                    }

                    if
                    (
                        this.selectedSubmenuId > 0
                    )
                    {
                        return (
                            item.cloneFromId ===
                                this.selectedSubmenuId

                            ||

                            item.cloneToId ===
                                this.selectedSubmenuId
                        );
                    }

                    return true;
                }
            );


        //=======================================================
        // Sort
        //=======================================================

        this.filteredPageClonings.sort(
            (a,b) =>
                a.cloneFromName.localeCompare(
                    b.cloneFromName
                )
        );


        //=======================================================
        // Pagination
        //=======================================================

        this.currentPage =
            1;

        this.updatePagination();
    }


    //===========================================================
    // Search
    //===========================================================

    onSearch
    (
        value:string
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
            field:string;

            direction:'asc' | 'desc';
        }
    ):
        void
    {
        this.filteredPageClonings =
        [
            ...this.filteredPageClonings
        ];

        this.filteredPageClonings.sort(
            (a:any,b:any) =>
            {
                const valueA =
                    a[event.field];

                const valueB =
                    b[event.field];

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

        this.selectedModuleId =
            0;

        this.selectedMenuId =
            0;

        this.selectedSubmenuId =
            0;

        this.menus =
            [];

        this.submenus =
            [];

        this.currentPage =
            1;

        this.loadPageClonings();
    }


    //===========================================================
    // Update Pagination
    //===========================================================

    updatePagination():
        void
    {
        const start =
            (
                this.currentPage - 1
            )
            *
            this.pageSize;

        this.pagedPageClonings =
        [
            ...this.filteredPageClonings.slice(
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
    // Add Page Cloning
    //===========================================================

    add():
        void
    {
        this.router.navigate
        (
            [
                '/infrastructure-control',
                'development-management',
                'page-cloning',
                'source',
                'new'
            ]
        );
    }


    //===========================================================
    // View Page Cloning
    //===========================================================

    view
    (
        item:PageCloning
    ):
        void
    {
        this.router.navigate
        (
            [
                '/infrastructure-control',
                'development-management',
                'page-cloning',
                'source',
                'view',
                item.id
            ]
        );
    }


    //===========================================================
    // Edit Page Cloning
    //===========================================================

    edit
    (
        item:PageCloning
    ):
        void
    {
        this.router.navigate
        (
            [
                '/infrastructure-control',
                'development-management',
                'page-cloning',
                'source',
                'edit',
                item.id
            ]
        );
    }


    //===========================================================
    // Clone Page
    //===========================================================

    clone
    (
        item:PageCloning
    ):
        void
    {
        this.router.navigate
        (
            [
                '/infrastructure-control',
                'development-management',
                'page-cloning',
                'source',
                'edit',
                item.id
            ]
        );
    }


    //===========================================================
    // Delete Page Cloning
    //===========================================================

    delete
    (
        item:PageCloning
    ):
        void
    {
        this.confirmDialog.open
        (
            'Delete Page Cloning',

            `Are you sure you want to delete "${item.cloneFromName} → ${item.cloneToName}" ?`,

            () =>
            {
                this.pageCloningService
                    .delete(
                        item.id
                    )
                    .subscribe(
                    {
                        next:() =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',

                                `${item.cloneFromName} → ${item.cloneToName} deleted successfully.`
                            );

                            this.loadPageClonings();
                        },

                        error:(error) =>
                        {
                            console.error(
                                error
                            );

                            this.toast.error
                            (
                                'Delete Failed',

                                'Failed to delete page cloning record.'
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
            'Restore Page Cloning',

            'Are you sure you want to restore the most recently deleted page cloning record.',

            () =>
            {
                this.restorePageCloning();
            },

            'Restore',

            'Cancel',

            'primary'
        );
    }


    //===========================================================
    // Restore Page Cloning
    //===========================================================

    private restorePageCloning():
        void
    {
        this.pageCloningService
            .restore()
            .subscribe(
            {
                next:() =>
                {
                    this.toast.success
                    (
                        'Restore Successful',

                        'The most recently deleted page cloning record has been restored.'
                    );

                    this.loadPageClonings();
                },

                error:(error) =>
                {
                    this.toast.error
                    (
                        'Restore Failed',

                        error?.error ??

                        'Failed to restore page cloning record.'
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
        this.pageCloningService
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
                        'Page Cloning History';

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

                    this.toast.error
                    (
                        'History',

                        'Failed to load page cloning history.'
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