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
    MenuSynchronizationService
}
from '../../../services/menu-synchronization.service';

import
{
    MenuSynchronization
}
from '../../../model/menu-synchronization.model';

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
    selector:'app-menu-synchronization-list',

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

    templateUrl:'./menu-synchronization-list.html',

    styleUrl:'./menu-synchronization-list.css'
})


//===============================================================
// Menu Synchronization List Component
//===============================================================

export class MenuSynchronizationListComponent
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly menuSynchronizationService =
        inject(MenuSynchronizationService);


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

    synchronizations: MenuSynchronization[] =
    [];


    filteredSynchronizations: MenuSynchronization[] =
    [];


    pagedSynchronizations: MenuSynchronization[] =
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
        'Menu Synchronization History';


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

            width:'300px',

            align:'left'
        },


        {
            header:'Menu',

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


        if
        (
            url.includes('/menu-synchronization/backend')
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


        this.loadModules();


        this.loadMenuSynchronizations();
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
        // Reset Filters
        //=======================================================

        this.selectedModuleId = 0;


        this.selectedStatus =
            '';


        if
        (
            tabId === 'backend'
        )
        {
            this.router.navigate(
            [
                '/infrastructure-control/development-management/menu-synchronization/backend'
            ])
            .then(() =>
            {
                this.loadModules();

                this.loadMenuSynchronizations();
            });


            return;
        }


        this.router.navigate(
        [
            '/infrastructure-control/development-management/menu-synchronization/frontend'
        ])
        .then(() =>
        {
            this.loadModules();

            this.loadMenuSynchronizations();
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
                    [
                        {
                            text:'All Modules',

                            value:0
                        },


                        ...Array.from(
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
                        )
                    ];


                    this.cdr.detectChanges();
                },


                error:(error) =>
                {
                    console.error(
                        'Module Load Failed',

                        error
                    );


                    this.modules =
                    [
                        {
                            text:'All Modules',

                            value:0
                        }
                    ];


                    this.toast.error(
                        'Module Load Failed',

                        'Unable to load modules.'
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


        console.log('================================');

        console.log(
            'Selected Module Id:',
            this.selectedModuleId
        );

        console.log('================================');


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
    // Load Menu Synchronization Data
    //===========================================================

    loadMenuSynchronizations():
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


        this.menuSynchronizationService

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
                        'Menu Synchronization Response',
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
                    console.error(error);


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

                        'Unable to load menu synchronization.'
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
                        this.selectedModuleId === null
                        ||
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
    // Search Menu Synchronization
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
    // Sort Menu Synchronization
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
    // Refresh Menu Synchronization
    //===========================================================

    refresh():
        void
    {
        this.searchText =
            '';


        this.selectedModuleId =
            0;


        this.selectedStatus =
            '';


        this.currentPage =
            1;


        this.filteredSynchronizations =
        [
            ...this.synchronizations
        ];


        this.loadModules();


        this.loadMenuSynchronizations();
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
    // Add Menu Synchronization
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
            `/infrastructure-control/development-management/menu-synchronization/${prefix}/new`
        ]);
    }


    //===========================================================
    // View Menu Synchronization
    //===========================================================

    view
    (
        item:MenuSynchronization
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

            'menu-synchronization',

            prefix,

            'view',

            item.id
        ]);
    }


    //===========================================================
    // Edit Menu Synchronization
    //===========================================================

    edit
    (
        item:MenuSynchronization
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

            'menu-synchronization',

            prefix,

            'edit',

            item.id
        ]);
    }


    //===========================================================
    // Synchronize Menu
    //===========================================================

    synchronize
    (
        item:MenuSynchronization
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

            'menu-synchronization',

            prefix,

            'synchronize',

            item.id
        ]);
    }


    //===========================================================
    // Delete Menu Synchronization
    //===========================================================

    delete
    (
        item:MenuSynchronization
    ):
        void
    {
        //=======================================================
        // Confirm Delete
        //=======================================================
        //
        // Dependency validation is handled by the backend.
        //
        // Any active dependent Submenu Synchronization blocks
        // deletion regardless of its status.
        //
        //=======================================================

        this.confirmDialog.open
        (
            'Delete Menu Synchronization',

            `Are you sure you want to delete "${item.menuName}" ?`,

            () =>
            {
                this.menuSynchronizationService

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


                            this.loadMenuSynchronizations();
                        },


                        error:(error) =>
                        {
                            console.error(
                                error
                            );


                            //===========================================
                            // Dependency Delete Blocked
                            //===========================================

                            const backendMessage =
                                typeof error?.error === 'string'

                                    ? error.error

                                    : error?.error?.message
                                        ??
                                        error?.message
                                        ??
                                        'Failed to delete menu synchronization.';


                            if
                            (
                                backendMessage
                                    .toLowerCase()
                                    .includes('cannot be deleted')

                                ||

                                backendMessage
                                    .toLowerCase()
                                    .includes('dependent submenu')

                                ||

                                backendMessage
                                    .toLowerCase()
                                    .includes('delete is blocked')

                                ||

                                backendMessage
                                    .toLowerCase()
                                    .includes('deletion is blocked')
                            )
                            {
                                this.toast.warning
                                (
                                    'Delete Blocked',

                                    backendMessage
                                );


                                return;
                            }


                            //===========================================
                            // Genuine Delete Failure
                            //===========================================

                            this.toast.error
                            (
                                'Delete Failed',

                                backendMessage
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

            'Restore Menu Synchronization',

            'Are you sure you want to restore the most recently deleted menu synchronization configuration?',

            () =>
            {
                this.restoreMenuSynchronization();
            },

            'Restore',

            'Cancel',

            'primary'
        );
    }


    //===========================================================
    // Restore Menu Synchronization
    //===========================================================

    private restoreMenuSynchronization():
        void
    {
        const synchronizationType =
            this.selectedTab === 'backend'
                ? 'Backend'
                : 'Frontend';


        this.menuSynchronizationService

            .restore(
                synchronizationType
            )

            .subscribe(
            {
                next:() =>
                {
                    this.toast.success(

                        'Restore Successful',

                        'The most recently deleted menu synchronization configuration has been restored.'
                    );


                    this.loadMenuSynchronizations();
                },


                error:(error) =>
                {
                    this.toast.error(

                        'Restore Failed',

                        error?.error ??

                        'Failed to restore menu synchronization configuration.'
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
        this.menuSynchronizationService

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
                        'Menu Synchronization History';


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

                        'Failed to load menu synchronization history.'
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