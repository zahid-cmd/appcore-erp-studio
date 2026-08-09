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
    SubmenuSynchronizationService
}
from '../../../services/submenu-synchronization.service';

import
{
    SubmenuSynchronization
}
from '../../../model/submenu-synchronization.model';

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

import
{
    NavigationMenuService
}
from '../../../../navigation-management/services/menu.service';

import
{
    NavigationMenu
}
from '../../../../navigation-management/models/navigation-menu.model';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'app-submenu-synchronization-list',

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

        HistoryDrawerComponent,

        ConfirmDialogComponent,

        ToastComponent
    ],

    templateUrl:'./submenu-synchronization-list.html',

    styleUrl:'./submenu-synchronization-list.css'
})


//===============================================================
// Submenu Synchronization List Component
//===============================================================

export class SubmenuSynchronizationListComponent
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly submenuSynchronizationService =
        inject(SubmenuSynchronizationService);


    private readonly moduleSynchronizationService =
        inject(ModuleSynchronizationService);


    private readonly navigationMenuService =
        inject(NavigationMenuService);


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
    // Module Dropdown
    //===========================================================

    modules:
    {
        text:string;

        value:number;
    }[] =
    [];


    selectedModuleId:
        number =
        0;


    //===========================================================
    // Menu Dropdown
    //===========================================================

    menus:
    {
        text:string;

        value:number;
    }[] =
    [];


    selectedMenuId:
        number =
        0;


    //===========================================================
    // Status Dropdown
    //===========================================================

    statuses:
    {
        text:string;

        value:string;
    }[] =
    [
        {
            text:'All Status',

            value:''
        },

        {
            text:'Synchronized',

            value:'Synchronized'
        },

        {
            text:'Pending',

            value:'Pending'
        },

        {
            text:'Failed',

            value:'Failed'
        }
    ];


    selectedStatus =
        '';


    //===========================================================
    // Data Source
    //===========================================================

    synchronizations: SubmenuSynchronization[] =
    [];


    filteredSynchronizations: SubmenuSynchronization[] =
    [];


    pagedSynchronizations: SubmenuSynchronization[] =
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
        'Submenu Synchronization History';


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
            header:'Submenu',

            field:'menuName',

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


        //=======================================================
        // Determine Synchronization Type From URL
        //=======================================================

        if
        (
            url.includes('/submenu-synchronization/backend')
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

        console.log(
            'Selected Tab:',
            this.selectedTab
        );

        console.log(
            'Current URL:',
            url
        );

        console.log('================================');


        //=======================================================
        // Load Modules
        //=======================================================

        this.loadModules();


        //=======================================================
        // Load Submenu Synchronization
        //=======================================================

        this.loadSubmenuSynchronizations();
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


        //=======================================================
        // Reset Module
        //=======================================================

        this.selectedModuleId =
            0;


        //=======================================================
        // Reset Menu
        //=======================================================

        this.selectedMenuId =
            0;


        this.menus =
        [];


        //=======================================================
        // Reset Status
        //=======================================================

        this.selectedStatus =
            '';


        //=======================================================
        // Reset Pagination
        //=======================================================

        this.currentPage =
            1;


        //=======================================================
        // Backend
        //=======================================================

        if
        (
            tabId === 'backend'
        )
        {
            this.router.navigate(
            [
                '/infrastructure-control/development-management/submenu-synchronization/backend'
            ])
            .then(() =>
            {
                this.loadModules();

                this.loadSubmenuSynchronizations();
            });


            return;
        }


        //=======================================================
        // Frontend
        //=======================================================

        this.router.navigate(
        [
            '/infrastructure-control/development-management/submenu-synchronization/frontend'
        ])
        .then(() =>
        {
            this.loadModules();

            this.loadSubmenuSynchronizations();
        });
    }


    //===========================================================
    // Load Modules
    //===========================================================

    loadModules():
        void
    {
        const synchronizationType =
            this.selectedTab === 'backend'
                ? 'Backend'
                : 'Frontend';


        this.moduleSynchronizationService

            .getAll(
                synchronizationType
            )

            .subscribe(
            {
                next:(response:ModuleSynchronization[]) =>
                {
                    console.log('================================');

                    console.log(
                        'Module Synchronization Type:',
                        synchronizationType
                    );

                    console.log(
                        'Module Response:',
                        response
                    );

                    console.log('================================');


                    const moduleMap =
                        new Map<number,string>();


                    response.forEach(
                        item =>
                        {
                            if
                            (
                                item.moduleId > 0
                                &&
                                !moduleMap.has(
                                    item.moduleId
                                )
                            )
                            {
                                moduleMap.set
                                (
                                    item.moduleId,

                                    item.moduleName
                                );
                            }
                        }
                    );


                    //=======================================================
                    // Module Dropdown Items
                    //=======================================================

                    this.modules =
                    Array.from(
                        moduleMap.entries()
                    )
                    .map(
                        ([value,text]) =>
                        ({
                            value,

                            text
                        })
                    )
                    .sort(
                        (a,b) =>
                            a.text.localeCompare(
                                b.text
                            )
                    );


                    //=======================================================
                    // Validate Selected Module
                    //=======================================================

                    if
                    (
                        this.selectedModuleId > 0
                        &&
                        !moduleMap.has(
                            this.selectedModuleId
                        )
                    )
                    {
                        this.selectedModuleId =
                            0;


                        this.selectedMenuId =
                            0;


                        this.menus =
                        [];
                    }


                    this.cdr.detectChanges();
                },


                error:(error) =>
                {
                    console.error(
                        'Module Load Failed',

                        error
                    );


                    this.modules =
                    [];


                    this.selectedModuleId =
                        0;


                    this.selectedMenuId =
                        0;


                    this.menus =
                    [];


                    this.toast.error(
                        'Module Load Failed',

                        'Unable to load modules.'
                    );


                    this.cdr.detectChanges();
                }
            });
    }


    //===========================================================
    // Load Menus By Module
    //===========================================================

    loadMenus():
        void
    {
        //=======================================================
        // No Module Selected
        //=======================================================

        if
        (
            this.selectedModuleId <= 0
        )
        {
            this.menus =
            [];


            this.selectedMenuId =
                0;


            this.cdr.detectChanges();


            return;
        }


        console.log('================================');

        console.log(
            'Loading Navigation Menus For Module:',
            this.selectedModuleId
        );

        console.log('================================');


        this.navigationMenuService

            .getByModule(
                this.selectedModuleId
            )

            .subscribe(
            {
                next:(response:NavigationMenu[]) =>
                {
                    console.log('================================');

                    console.log(
                        'Navigation Menu Response:',
                        response
                    );

                    console.log('================================');


                    const menuMap =
                        new Map<number,string>();


                    response.forEach(
                        item =>
                        {
                            if
                            (
                                item.id > 0
                                &&
                                !menuMap.has(
                                    item.id
                                )
                            )
                            {
                                menuMap.set(
                                    item.id,

                                    item.name
                                );
                            }
                        }
                    );


                    this.menus =
                    Array.from(
                        menuMap.entries()
                    )
                    .map(
                        ([value,text]) =>
                        ({
                            value,

                            text
                        })
                    )
                    .sort(
                        (a,b) =>
                            a.text.localeCompare(
                                b.text
                            )
                    );


                    //===================================================
                    // Validate Selected Menu
                    //===================================================

                    if
                    (
                        this.selectedMenuId > 0
                        &&
                        !menuMap.has(
                            this.selectedMenuId
                        )
                    )
                    {
                        this.selectedMenuId =
                            0;
                    }


                    this.cdr.detectChanges();
                },


                error:(error) =>
                {
                    console.error(
                        'Menu Load Failed',

                        error
                    );


                    this.menus =
                    [];


                    this.selectedMenuId =
                        0;


                    this.toast.error(
                        'Menu Load Failed',

                        'Unable to load menus for the selected module.'
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
            moduleId ?? 0;


        //=======================================================
        // Reset Menu
        //=======================================================

        this.selectedMenuId =
            0;


        this.menus =
        [];


        //=======================================================
        // Reset Pagination
        //=======================================================

        this.currentPage =
            1;


        //=======================================================
        // Load Menus For Selected Module
        //=======================================================

        this.loadMenus();


        //=======================================================
        // Apply Filters
        //=======================================================

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
            menuId ?? 0;


        this.currentPage =
            1;


        this.applyFilters();
    }


    //===========================================================
    // Status Changed
    //===========================================================

    onStatusChange
    (
        status:string | null
    ):
        void
    {
        this.selectedStatus =
            status ?? '';


        console.log('================================');

        console.log(
            'Selected Status:',
            this.selectedStatus
        );

        console.log('================================');


        this.currentPage =
            1;


        this.applyFilters();
    }


    //===========================================================
    // Load Submenu Synchronization Data
    //===========================================================

    loadSubmenuSynchronizations():
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


        this.submenuSynchronizationService

            .getAll(
                synchronizationType
            )

            .subscribe(
            {
                next:(response) =>
                {
                    console.log('================================');

                    console.log(
                        'Synchronization Type:',
                        synchronizationType
                    );

                    console.log(
                        'Submenu Synchronization Response:',
                        response
                    );

                    console.log(
                        'Total Records:',
                        response.length
                    );

                    console.log('================================');


                    this.synchronizations =
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
                        'Submenu Synchronization Load Failed:',
                        error
                    );


                    this.synchronizations =
                    [];


                    this.filteredSynchronizations =
                    [];


                    this.pagedSynchronizations =
                    [];


                    this.loading =
                        false;


                    this.loadFailed =
                        true;


                    this.toast.error(
                        'Load Failed',

                        'Unable to load submenu synchronization.'
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


        this.filteredSynchronizations =
            this.synchronizations.filter(
                item =>
                {
                    //===================================================
                    // Module Filter
                    //===================================================

                    const moduleMatches =
                        this.selectedModuleId <= 0
                        ||
                        item.moduleId === this.selectedModuleId;


                    if
                    (
                        !moduleMatches
                    )
                    {
                        return false;
                    }


                    //===================================================
                    // Menu Filter
                    //===================================================

                    const menuMatches =
                        this.selectedMenuId <= 0
                        ||
                        item.menuId === this.selectedMenuId;


                    if
                    (
                        !menuMatches
                    )
                    {
                        return false;
                    }


                    //===================================================
                    // Status Filter
                    //===================================================

                    const statusMatches =
                        !this.selectedStatus
                        ||
                        item.status
                            ?.toLowerCase()
                            ===
                        this.selectedStatus
                            .toLowerCase();


                    if
                    (
                        !statusMatches
                    )
                    {
                        return false;
                    }


                    //===================================================
                    // Search Filter
                    //===================================================

                    if
                    (
                        !keyword
                    )
                    {
                        return true;
                    }


                    return (

                        item.menuCode
                            ?.toLowerCase()
                            .includes(keyword)

                        ||

                        item.menuName
                            ?.toLowerCase()
                            .includes(keyword)

                        ||

                        item.remarks
                            ?.toLowerCase()
                            .includes(keyword)
                    );
                }
            );


        //=======================================================
        // Sort
        //=======================================================

        this.filteredSynchronizations.sort(
            (a,b) =>
                a.menuName.localeCompare(
                    b.menuName
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
    // Search Submenu Synchronization
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
    // Sort Submenu Synchronization
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
    // Refresh Submenu Synchronization
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


        this.selectedStatus =
            '';


        this.modules =
        [];


        this.menus =
        [];


        this.currentPage =
            1;


        this.loadModules();


        this.loadSubmenuSynchronizations();
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
    // Add Submenu Synchronization
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
            `/infrastructure-control/development-management/submenu-synchronization/${prefix}/new`
        ]);
    }


    //===========================================================
    // View Submenu Synchronization
    //===========================================================

    view
    (
        item:SubmenuSynchronization
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

            'submenu-synchronization',

            prefix,

            'view',

            item.id
        ]);
    }


    //===========================================================
    // Edit Submenu Synchronization
    //===========================================================

    edit
    (
        item:SubmenuSynchronization
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

            'submenu-synchronization',

            prefix,

            'edit',

            item.id
        ]);
    }


    //===========================================================
    // Synchronize Submenu
    //===========================================================

    synchronize
    (
        item:SubmenuSynchronization
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

            'submenu-synchronization',

            prefix,

            'synchronize',

            item.id
        ]);
    }


    //===========================================================
    // Delete Submenu Synchronization
    //===========================================================

    delete
    (
        item:SubmenuSynchronization
    ):
        void
    {
        //=======================================================
        // Prevent Deleting Synchronized Submenu
        //=======================================================

        if
        (
            item.status?.toLowerCase() === 'synchronized'
        )
        {
            this.toast.warning
            (
                'Delete Not Allowed',

                'This submenu is synchronized. Roll back the synchronization before deleting the submenu.'
            );


            return;
        }


        //=======================================================
        // Confirm Delete
        //=======================================================

        this.confirmDialog.open
        (
            'Delete Submenu Synchronization',

            `Are you sure you want to delete "${item.menuName}" ?`,

            () =>
            {
                this.submenuSynchronizationService

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

                                `${item.menuName} deleted successfully.`
                            );


                            this.loadSubmenuSynchronizations();
                        },


                        error:(error) =>
                        {
                            console.error(
                                error
                            );


                            this.toast.error
                            (
                                'Delete Failed',

                                'Failed to delete submenu synchronization.'
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

            'Restore Submenu Synchronization',

            'Are you sure you want to restore the most recently deleted submenu synchronization configuration?',

            () =>
            {
                this.restoreSubmenuSynchronization();
            },

            'Restore',

            'Cancel',

            'primary'
        );
    }


    //===========================================================
    // Restore Submenu Synchronization
    //===========================================================

    private restoreSubmenuSynchronization():
        void
    {
        const synchronizationType =
            this.selectedTab === 'backend'
                ? 'Backend'
                : 'Frontend';


        this.submenuSynchronizationService

            .restore(
                synchronizationType
            )

            .subscribe(
            {
                next:() =>
                {
                    this.toast.success(

                        'Restore Successful',

                        'The most recently deleted submenu synchronization configuration has been restored.'
                    );


                    this.loadSubmenuSynchronizations();
                },


                error:(error) =>
                {
                    this.toast.error(

                        'Restore Failed',

                        error?.error ??

                        'Failed to restore submenu synchronization configuration.'
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
        this.submenuSynchronizationService

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
                        'Submenu Synchronization History';


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

                        'Failed to load submenu synchronization history.'
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