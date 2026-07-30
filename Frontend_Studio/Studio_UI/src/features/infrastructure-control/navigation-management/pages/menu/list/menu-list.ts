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
    NavigationMenuService
}
from '../../../services/menu.service';

import
{
    NavigationMenu
}
from '../../../models/navigation-menu.model';

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
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

import
{
    ModuleService
}
from '../../../services/module.service';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'app-navigation-menu-list',

    standalone:true,

    imports:
    [
        CommonModule,

        PageHeaderComponent,

        PageToolbarComponent,

        ControlTabsComponent,

        SearchBoxComponent,

        SearchDropdownComponent,

        CommandCenterComponent,

        PageCanvasComponent,

        ListTableComponent,

        PaginationComponent,

        ConfirmDialogComponent,

        ToastComponent,

        HistoryDrawerComponent
    ],

    templateUrl:'./menu-list.html',

    styleUrl:'./menu-list.css'
})

//===============================================================
// Navigation Menu List Component
//===============================================================

export class NavigationMenuListComponent
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly navigationMenuService =
        inject(NavigationMenuService);

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

            label:'All Menus'
        }
    ];

    selectedTab =
        'all';

    //===========================================================
    // Data Source
    //===========================================================

    menus: NavigationMenu[] =
    [];

    filteredMenus: NavigationMenu[] =
    [];

    pagedMenus: NavigationMenu[] =
    [];

    //===========================================================
    // Module Filter
    //===========================================================

    modules:any[] =
    [];

    selectedModuleId:number | null =
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
        'Navigation Menu History';

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
            header:'Module',
            field:'navigationModuleName',
            width:'200px',
            align:'left'
        },

        {
            header:'Code',
            field:'code',
            width:'180px',
            align:'center'
        },

        {
            header:'Menu Name',
            field:'name',
            align:'left'
        },

        {
            header:'Icon',
            field:'icon',
            width:'200px',
            align:'left'
        },

        {
            header:'Route',
            field:'route',
            width:'380px',
            align:'left'
        },

        {
            header:'Order',
            field:'displayOrder',
            width:'120px',
            align:'center'
        },

        {
            header:'Status',
            field:'isActive',
            type:'status',
            width:'140px',
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

        this.loadMenus();
    }

    //===========================================================
    // Load Menu Data
    //===========================================================

    loadMenus():
        void
    {
        this.loading =
            true;

        this.loadFailed =
            false;

        this.navigationMenuService
            .getAll()
            .subscribe(
            {
                next:(response) =>
                {
                    console.log('================================');
                    console.log('Navigation Menus Response');
                    console.log(response);
                    console.log('Total Records:', response.length);
                    console.log('================================');

                    this.menus =
                    [
                        ...response
                    ];

                    const keyword =
                        this.searchText
                            .trim()
                            .toLowerCase();

                    this.filteredMenus =
                        this.menus.filter(menu =>
                        {
                            const matchesSearch =

                                keyword === ''

                                ||

                                menu.code
                                    .toLowerCase()
                                    .includes(keyword)

                                ||

                                menu.name
                                    .toLowerCase()
                                    .includes(keyword)

                                ||

                                menu.navigationModuleName
                                    .toLowerCase()
                                    .includes(keyword)

                                ||

                                menu.route
                                    .toLowerCase()
                                    .includes(keyword)

                                ||

                                menu.remarks
                                    ?.toLowerCase()
                                    .includes(keyword);


                            const matchesModule =

                                this.selectedModuleId == null

                                ||

                                menu.navigationModuleId ===
                                this.selectedModuleId;


                            return (
                                matchesSearch
                                &&
                                matchesModule
                            );
                        });

                    this.filteredMenus.sort(
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
                    console.error('Load Menus Error');
                    console.error(error);

                    this.menus =
                    [];

                    this.filteredMenus =
                    [];

                    this.pagedMenus =
                    [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.toast.error(
                        'Load Failed',
                        'Unable to load navigation menus.'
                    );

                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Load Navigation Modules
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
                        response.map(
                            item =>
                            ({
                                value:item.id,

                                text:item.name
                            })
                        );

                    this.cdr.detectChanges();
                },

                error:(error) =>
                {
                    console.error(
                        'Failed to load navigation modules.',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Unable to load navigation modules.'
                    );
                }
            });
    }

    //===========================================================
    // Search Menus
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
            this.searchText
                .trim()
                .toLowerCase();

        this.filteredMenus =
            this.menus.filter(menu =>
            {
                const matchesSearch =

                    keyword === ''

                    ||

                    menu.code
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    menu.name
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    menu.navigationModuleName
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    menu.route
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    menu.remarks
                        ?.toLowerCase()
                        .includes(keyword);


                const matchesModule =

                    this.selectedModuleId == null

                    ||

                    menu.navigationModuleId ===
                    this.selectedModuleId;


                return (
                    matchesSearch
                    &&
                    matchesModule
                );
            });

        this.filteredMenus.sort(
            (a, b) =>
                a.code.localeCompare(b.code)
        );

        this.currentPage =
            1;

        this.updatePagination();
    }

    //===========================================================
    // Sort Menu List
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
        this.filteredMenus =
        [
            ...this.filteredMenus
        ];

        this.filteredMenus.sort(
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
    // Refresh Menu List
    //===========================================================

    refresh():
        void
    {
        this.searchText =
            '';

        this.selectedModuleId =
            null;

        this.currentPage =
            1;

        this.loadMenus();
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

        this.pagedMenus =
        [
            ...this.filteredMenus.slice(
                start,
                start + this.pageSize
            )
        ];

        console.log('========================');
        console.log('Paged Menus');
        console.log(this.pagedMenus);
        console.log('Paged Length:', this.pagedMenus.length);
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
    // Add Menu
    //===========================================================

    add():
        void
    {
        this.router.navigate(
        [
            '/infrastructure-control/navigation-management/navigation-menus/add'
        ]);
    }

    //===========================================================
    // View Menu
    //===========================================================

    view(
        item: NavigationMenu
    ):
        void
    {
        this.router.navigate(
        [
            '/infrastructure-control/navigation-management/navigation-menus/view',

            item.id
        ]);
    }

    //===========================================================
    // Edit Menu
    //===========================================================

    edit(
        item: NavigationMenu
    ):
        void
    {
        this.router.navigate(
        [
            '/infrastructure-control/navigation-management/navigation-menus/edit',

            item.id
        ]);
    }

    //===========================================================
    // Delete Menu
    //===========================================================

    delete(
        item: NavigationMenu
    ):
        void
    {
        this.confirmDialog.open(

            'Delete Menu',

            `Are you sure you want to delete "${item.name}" ?`,

            () =>
            {
                this.navigationMenuService
                    .delete(item.id)
                    .subscribe(
                    {
                        next: () =>
                        {
                            this.toast.success(
                                'Delete Successful',
                                `${item.name} deleted successfully.`
                            );

                            this.loadMenus();
                        },

                        error:(error)=>
                        {
                            console.error(error);

                            this.toast.error(
                                'Delete Failed',
                                'Failed to delete menu.'
                            );
                        }
                    });
            }
        );
    }

    //===========================================================
    // Delete Menu From Database
    //===========================================================

    private deleteMenu(
        item: NavigationMenu
    ):
        void
    {
        this.navigationMenuService
            .delete(item.id)
            .subscribe(
            {
                next: () =>
                {
                    this.toast.success(
                        'Success',
                        'Navigation menu deleted successfully.'
                    );

                    this.loadMenus();
                },

                error: (error) =>
                {
                    this.toast.error(
                        'Error',
                        'Unable to delete navigation menu.'
                    );

                    console.error(
                        'Failed to delete navigation menu.',
                        error
                    );
                }
            });
    }

    //===========================================================
    // Restore Menu
    //===========================================================

    restore():
        void
    {
        this.confirmDialog.open(

            'Restore Navigation Menu',

            'Are you sure you want to restore the most recently deleted navigation menu?',

            () =>
            {
                this.restoreMenu();
            },

            'Restore',

            'Cancel',

            'primary'
        );
    }

    //===========================================================
    // Restore Menu
    //===========================================================

    private restoreMenu():
        void
    {
        this.navigationMenuService
            .restore()

            .subscribe(
            {
                next:() =>
                {
                    this.toast.success(
                        'Restore Successful',
                        'The most recently deleted navigation menu has been restored.'
                    );

                    this.loadMenus();
                },

                error:(error) =>
                {
                    this.toast.error(
                        'Restore Failed',
                        error?.error ??
                        'Failed to restore navigation menu.'
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
        this.navigationMenuService
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
    // Module Changed
    //===========================================================

    onModuleChange(
        moduleId:number | null
    ):
        void
    {
        this.selectedModuleId =
            moduleId;

        this.applyFilters();
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

        this.filteredMenus =
            this.menus.filter(menu =>
            {
                const matchesSearch =
                    keyword === ''

                    ||

                    menu.code
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    menu.name
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    menu.navigationModuleName
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    menu.route
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    menu.remarks
                        ?.toLowerCase()
                        .includes(keyword);

                const matchesModule =
                    this.selectedModuleId == null

                    ||

                    menu.navigationModuleId ===
                    this.selectedModuleId;

                return (
                    matchesSearch
                    &&
                    matchesModule
                );
            });

        this.filteredMenus.sort(
            (a,b)=>
                a.code.localeCompare(b.code)
        );

        this.currentPage =
            1;

        this.updatePagination();
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


