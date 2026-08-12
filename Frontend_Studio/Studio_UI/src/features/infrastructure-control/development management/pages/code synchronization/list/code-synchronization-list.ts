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
    CodeSynchronizationService
}
from '../../../services/code-synchronization.service';

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
    selector:'app-code-synchronization-list',

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

    templateUrl:'./code-synchronization-list.html',

    styleUrl:'./code-synchronization-list.css'
})


//===============================================================
// Code Synchronization List Component
//===============================================================

export class CodeSynchronizationListComponent
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly codeSynchronizationService =
        inject(CodeSynchronizationService);


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
            text:'Ready',

            value:'Ready'
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
        'Code Synchronization History';


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

            width:'200px',

            align:'left'
        },


        {
            header:'Menu',

            field:'menuName',

            width:'200px',

            align:'left'
        },


        {
            header:'Submenu',

            field:'submenuName',

            align:'left'
        },


        {
            header:'Created',

            field:'createdDate',

            width:'250px',

            align:'center'
        },


        {
            header:'Last Code Sync',

            field:'lastSynchronizedDate',

            width:'250px',

            align:'center'
        },


        {
            header:'Operation',

            field:'codeOperation',

            type:'operation',

            width:'110px',

            align:'center'
        },


        {
            header:'Status',

            field:'status',

            type:'status',

            width:'150px',

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
            url.includes('/code-synchronization/backend')
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
        // Load Code Synchronization
        //=======================================================

        this.loadCodeSynchronizations();
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
                '/infrastructure-control/development-management/code-synchronization/backend'
            ])
            .then(() =>
            {
                this.loadModules();

                this.loadCodeSynchronizations();
            });


            return;
        }


        //=======================================================
        // Frontend
        //=======================================================

        this.router.navigate(
        [
            '/infrastructure-control/development-management/code-synchronization/frontend'
        ])
        .then(() =>
        {
            this.loadModules();

            this.loadCodeSynchronizations();
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
    // Load Code Synchronization Data
    //===========================================================

    loadCodeSynchronizations():
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


        this.codeSynchronizationService

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
                        'Code Synchronization Response:',
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
                        'Code Synchronization Load Failed:',
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

                        'Unable to load code synchronization.'
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

                        item.moduleCode
                            ?.toLowerCase()
                            .includes(keyword)

                        ||

                        item.moduleName
                            ?.toLowerCase()
                            .includes(keyword)

                        ||

                        item.menuCode
                            ?.toLowerCase()
                            .includes(keyword)

                        ||

                        item.menuName
                            ?.toLowerCase()
                            .includes(keyword)

                        ||

                        item.submenuCode
                            ?.toLowerCase()
                            .includes(keyword)

                        ||

                        item.submenuName
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
                a.submenuName.localeCompare(
                    b.submenuName
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
    // Search Code Synchronization
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
    // Sort Code Synchronization
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
    // Refresh Code Synchronization
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


        this.loadCodeSynchronizations();
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
    // View Code Synchronization
    //===========================================================

    view
    (
        item:SubmenuSynchronization
    ):
        void
    {
        //=======================================================
        // Code Files View Popup
        //=======================================================
        //
        // The reusable Code Files View popup will be opened
        // from this action.
        //
        //=======================================================

        console.log(
            'VIEW CODE SYNCHRONIZATION',
            item
        );
    }


    //===========================================================
    // Synchronize / Rollback Code
    //===========================================================

    synchronize
    (
        item:SubmenuSynchronization
    ):
        void
    {
        //=======================================================
        // Validate Item
        //=======================================================

        if
        (
            !item
            ||
            item.id <= 0
        )
        {
            return;
        }


        //=======================================================
        // Determine Current Status
        //=======================================================

        const isSynchronized =
            item.status
                ?.toLowerCase()
                ===
            'synchronized';


        //=======================================================
        // Rollback
        //=======================================================

        if
        (
            isSynchronized
        )
        {
            this.confirmDialog.open
            (
                'Rollback Code',

                `Are you sure you want to roll back the generated code for "${item.submenuName}" ?`,

                () =>
                {
                    this.codeSynchronizationService

                        .rollback(
                            item.id
                        )

                        .subscribe(
                        {
                            next:() =>
                            {
                                this.toast.success
                                (
                                    'Code Rollback',

                                    `${item.submenuName} code rolled back successfully.`
                                );


                                this.loadCodeSynchronizations();
                            },


                            error:(error) =>
                            {
                                console.error(
                                    'Code Rollback Failed',

                                    error
                                );


                                this.toast.error
                                (
                                    'Code Rollback Failed',

                                    error?.error
                                    ??
                                    'Failed to roll back code.'
                                );
                            }
                        });
                },

                'Rollback',

                'Cancel',

                'primary'
            );


            return;
        }


        //=======================================================
        // Synchronize
        //=======================================================

        this.confirmDialog.open
        (
            'Synchronize Code',

            `Are you sure you want to generate code for "${item.submenuName}" ?`,

            () =>
            {
                this.codeSynchronizationService

                    .synchronize(
                        item.id
                    )

                    .subscribe(
                    {
                        next:() =>
                        {
                            this.toast.success
                            (
                                'Code Synchronization',

                                `${item.submenuName} code synchronized successfully.`
                            );


                            this.loadCodeSynchronizations();
                        },


                        error:(error) =>
                        {
                            console.error(
                                'Code Synchronization Failed',

                                error
                            );


                            this.toast.error
                            (
                                'Code Synchronization Failed',

                                error?.error
                                ??
                                'Failed to synchronize code.'
                            );
                        }
                    });
            },

            'Synchronize',

            'Cancel',

            'primary'
        );
    }


    //===========================================================
    // Restore
    //===========================================================

    restore():
        void
    {
        this.confirmDialog.open(

            'Restore Code Synchronization',

            'Are you sure you want to restore the most recently deleted code synchronization record?',

            () =>
            {
                this.restoreCodeSynchronization();
            },

            'Restore',

            'Cancel',

            'primary'
        );
    }


    //===========================================================
    // Restore Code Synchronization
    //===========================================================

    private restoreCodeSynchronization():
        void
    {
        const synchronizationType =
            this.selectedTab === 'backend'
                ? 'Backend'
                : 'Frontend';


        this.toast.warning
        (
            'Not Available',

            `Restore for Code Synchronization (${synchronizationType}) is not implemented yet.`
        );
    }


    //===========================================================
    // Open History Drawer
    //===========================================================

    openHistory():
        void
    {
        this.toast.warning
        (
            'Not Available',

            'Code Synchronization history is not implemented yet.'
        );
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