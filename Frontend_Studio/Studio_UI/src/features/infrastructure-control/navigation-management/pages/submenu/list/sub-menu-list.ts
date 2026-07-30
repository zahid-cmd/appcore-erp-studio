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
    NavigationModule
}
from '../../../models/navigation-module.model';


import
{
    NavigationMenu
}
from '../../../models/navigation-menu.model';

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
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

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
    NavigationSubmenuService
}
from '../../../services/submenu.service';

import
{
    ModuleService
}
from '../../../services/module.service';

import
{
    NavigationMenuService
}
from '../../../services/menu.service';

import
{
    NavigationSubmenu
}
from '../../../models/navigation-submenu.model';

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
    selector:'app-navigation-submenu-list',

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

        SearchDropdownComponent,

        HistoryDrawerComponent
    ],

    templateUrl:'./sub-menu-list.html',

    styleUrl:'./sub-menu-list.css'
})


//===============================================================
// Navigation Submenu List Component
//===============================================================

export class NavigationSubmenuListComponent
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly navigationSubmenuService =
        inject(NavigationSubmenuService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly router =
        inject(Router);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly moduleService =
        inject(ModuleService);

    private readonly navigationMenuService =
        inject(NavigationMenuService);

    //===========================================================
    // Page Tabs
    //===========================================================

    tabs: ControlTab[] =
    [
        {
            id:'all',

            label:'All Submenus'
        }
    ];


    selectedTab =
        'all';


    //===========================================================
    // Toolbar Filters
    //===========================================================

    modules:any[] =
    [
        {
            value:null,
            text:'All Modules'
        }
    ];


    menus:any[] =
    [
        {
            value:null,
            text:'All Menus'
        }
    ];


    selectedModuleId:number | null =
        null;


    selectedMenuId:number | null =
        null;

    //===========================================================
    // Data Source
    //===========================================================

    submenus: NavigationSubmenu[] =
    [];


    filteredSubmenus: NavigationSubmenu[] =
    [];


    pagedSubmenus: NavigationSubmenu[] =
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
        'Navigation Submenu History';


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
            width:'180px',
            align:'center'
        },

        {
            header:'Submenu Name',
            field:'name',
            align:'left'
        },

        {
            header:'Icon',
            field:'icon',
            width:'180px',
            align:'left'
        },

        {
            header:'Route',
            field:'route',
            width:'530px',
            align:'left'
        },

        {
            header:'Order',
            field:'displayOrder',
            width:'100px',
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

        this.loadSubmenus();
    }

    //===========================================================
    // Load Modules
    //===========================================================

    loadModules():
        void
    {
        this.moduleService
            .getAll()
            .subscribe(
            {
                next:(response:NavigationModule[]) =>
                {
                    this.modules =
                    [
                        {
                            value:null,
                            text:'All Modules'
                        },

                        ...response.map(
                            (module:NavigationModule) =>
                            ({
                                value:module.id,
                                text:module.name
                            })
                        )
                    ];
                },


                error:(error:any) =>
                {
                    console.error(
                        'Load Modules Error',
                        error
                    );

                    this.modules =
                    [
                        {
                            value:null,
                            text:'All Modules'
                        }
                    ];
                }
            });
    }

    //===========================================================
    // Load Menus
    //===========================================================

    loadMenus
    (
        moduleId:number | null
    ):
        void
    {
        this.menus =
        [
            {
                value:null,
                text:'All Menus'
            }
        ];


        this.navigationMenuService
            .getAll()
            .subscribe(
            {
                next:(response:NavigationMenu[]) =>
                {
                    this.menus =
                    [
                        {
                            value:null,
                            text:'All Menus'
                        },

                        ...response
                            .filter(
                                x =>
                                    !moduleId
                                    ||
                                    x.navigationModuleId === moduleId
                            )
                            .map(
                                x =>
                                ({
                                    value:x.id,
                                    text:x.name
                                })
                            )
                    ];
                },


                error:(error:any) =>
                {
                    console.error(
                        'Load Menus Error',
                        error
                    );
                }
            });
    }

    //===========================================================
    // Load Submenu Data
    //===========================================================

    loadSubmenus():
        void
    {
        this.loading =
            true;


        this.loadFailed =
            false;


        this.navigationSubmenuService
            .getAll()
            .subscribe(
            {
                next:(response) =>
                {
                    console.log('================================');
                    console.log('Navigation Submenus Response');
                    console.log(response);
                    console.log('Total Records:', response.length);
                    console.log('================================');


                    this.submenus =
                    [
                        ...response
                    ];


                    this.filteredSubmenus =
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
                    console.error('Load Submenus Error');
                    console.error(error);


                    this.submenus =
                    [];


                    this.filteredSubmenus =
                    [];


                    this.pagedSubmenus =
                    [];


                    this.loading =
                        false;


                    this.loadFailed =
                        true;


                    this.toast.error(
                        'Load Failed',
                        'Unable to load navigation submenus.'
                    );


                    this.cdr.detectChanges();
                }
            });
    }


    //===========================================================
    // Module Changed
    //===========================================================

    onModuleChange
    (
        moduleId:number | null
    ):
        void
    {
        this.selectedModuleId =
            moduleId;


        this.selectedMenuId =
            null;


        this.loadMenus(moduleId);


        this.applyFilters();
    }

    //===========================================================
    // Menu Changed
    //===========================================================

    onMenuChange
    (
        menuId:number | null
    ):
        void
    {
        this.selectedMenuId =
            menuId;


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


        this.filteredSubmenus =
            this.submenus.filter(x =>
            {
                const moduleMatch =
                    !this.selectedModuleId ||
                    x.navigationModuleId === this.selectedModuleId;


                const menuMatch =
                    !this.selectedMenuId ||
                    x.navigationMenuId === this.selectedMenuId;


                const searchMatch =
                    !keyword ||

                    x.code.toLowerCase().includes(keyword) ||

                    x.name.toLowerCase().includes(keyword) ||

                    x.navigationMenuName.toLowerCase().includes(keyword) ||

                    x.navigationModuleName.toLowerCase().includes(keyword) ||

                    x.route.toLowerCase().includes(keyword) ||

                    x.remarks?.toLowerCase().includes(keyword);


                return moduleMatch &&
                    menuMatch &&
                    searchMatch;
            });


        this.currentPage =
            1;


        this.updatePagination();
    }

    //===========================================================
    // Search Submenus
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
    // Sort Submenu List
    //===========================================================

    onSort
    (
        event:
        {
            field: string;
            direction: 'asc' | 'desc';
        }
    ):
        void
    {
        this.filteredSubmenus =
        [
            ...this.filteredSubmenus
        ];


        this.filteredSubmenus.sort(
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
    // Refresh Submenu List
    //===========================================================

    refresh():
        void
    {
        this.searchText =
            '';


        this.selectedModuleId =
            null;


        this.selectedMenuId =
            null;


        this.loadModules();


        this.loadSubmenus();
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


        this.pagedSubmenus =
        [
            ...this.filteredSubmenus.slice(
                start,
                start + this.pageSize
            )
        ];


        console.log('========================');

        console.log('Paged Submenus');

        console.log(this.pagedSubmenus);

        console.log('Paged Length:',
            this.pagedSubmenus.length);

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
    // Add Submenu
    //===========================================================

    add():
        void
    {
        this.router.navigate(
        [
            '/infrastructure-control/navigation-management/navigation-submenus/add'
        ]);
    }



    //===========================================================
    // View Submenu
    //===========================================================

    view(
        item:NavigationSubmenu
    ):
        void
    {
        this.router.navigate(
        [
            '/infrastructure-control/navigation-management/navigation-submenus/view',

            item.id
        ]);
    }



    //===========================================================
    // Edit Submenu
    //===========================================================

    edit(
        item:NavigationSubmenu
    ):
        void
    {
        this.router.navigate(
        [
            '/infrastructure-control/navigation-management/navigation-submenus/edit',

            item.id
        ]);
    }



    //===========================================================
    // Delete Submenu
    //===========================================================

    delete(
        item:NavigationSubmenu
    ):
        void
    {
        this.confirmDialog.open(

            'Delete Submenu',

            `Are you sure you want to delete "${item.name}" ?`,

            () =>
            {
                this.navigationSubmenuService
                    .delete(item.id)
                    .subscribe(
                    {
                        next:() =>
                        {
                            this.toast.success(
                                'Delete Successful',
                                `${item.name} deleted successfully.`
                            );


                            this.loadSubmenus();
                        },


                        error:(error) =>
                        {
                            console.error(error);


                            this.toast.error(
                                'Delete Failed',
                                'Failed to delete submenu.'
                            );
                        }
                    });
            }
        );
    }

    //===========================================================
    // Restore Submenu
    //===========================================================

    restore():
        void
    {
        this.confirmDialog.open(

            'Restore Navigation Submenu',

            'Are you sure you want to restore the most recently deleted navigation submenu?',

            () =>
            {
                this.restoreSubmenu();
            },

            'Restore',

            'Cancel',

            'primary'
        );
    }

    //===========================================================
    // Restore Submenu
    //===========================================================

    private restoreSubmenu():
        void
    {
        this.navigationSubmenuService
            .restore()

            .subscribe(
            {
                next: () =>
                {
                    this.toast.success(
                        'Restore Successful',
                        'The most recently deleted navigation submenu has been restored.'
                    );

                    this.loadSubmenus();
                },

                error: (error) =>
                {
                    this.toast.error(
                        'Restore Failed',
                        error?.error ??
                        'Failed to restore navigation submenu.'
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
        this.navigationSubmenuService
            .getHistory()
            .subscribe(
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
                        'Navigation Submenu Management History';


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
                        'Failed to load navigation submenu history.'
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
