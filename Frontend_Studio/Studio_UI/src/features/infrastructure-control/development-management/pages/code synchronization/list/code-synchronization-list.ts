//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    OnDestroy,
    ViewChild,
    inject,
    ChangeDetectorRef
}
from '@angular/core';

import
{
    Observable
}
from 'rxjs';

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
    ProgressDialogComponent
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';

import
{
    ProgressDialogService
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';

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
// Code Viewer
//===============================================================

import
{
    CodeViewerComponent,
    CodeViewerFile
}
from '../code-viewer/code-viewer';


//===============================================================
// Services
//===============================================================

import
{
    CodeSynchronizationService,
    CodeSynchronizationFile
}
from '../../../services/code-synchronization.service';

import
{
    CodeSynchronization
}
from '../../../model/code-synchronization.model';

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

        ProgressDialogComponent,

        ToastComponent,

        CodeViewerComponent
    ],

    templateUrl:'./code-synchronization-list.html',

    styleUrl:'./code-synchronization-list.css'
})


//===============================================================
// Code Synchronization List Component
//===============================================================

export class CodeSynchronizationListComponent
implements OnInit, OnDestroy
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


    private readonly progressDialog =
        inject(ProgressDialogService);


    private readonly toast =
        inject(ToastService);


    private readonly router =
        inject(Router);


    private readonly cdr =
        inject(ChangeDetectorRef);



    //===========================================================
    // Page Tabs
    //===========================================================

    tabs:ControlTab[] =
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

    synchronizations:
        CodeSynchronization[] =
        [];


    filteredSynchronizations:
        CodeSynchronization[] =
        [];


    pagedSynchronizations:
        CodeSynchronization[] =
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


    historyItems:
        any[] =
        [];



    //===========================================================
    // Code Viewer
    //===========================================================

    codeViewerOpened:
        boolean =
        false;


    codeViewerFiles:
        CodeViewerFile[] =
        [];


    private codeViewerRefreshTimer:
        ReturnType<typeof setInterval> | null =
        null;


    private codeViewerRefreshInProgress =
        false;


    private readonly codeViewerRefreshInterval =
        1000;


    selectedCodeSynchronization:
        CodeSynchronization | null =
        null;


    @ViewChild(
        CodeViewerComponent
    )
    private codeViewer:
        CodeViewerComponent | undefined;



    //===========================================================
    // Backend Registration Unlock
    //===========================================================

    backendRegistrationUnlocked =
        false;


    private readonly backendRegistrationUnlockStorageKey =
        'appcore-code-synchronization-backend-registration-unlocked';



    //===========================================================
    // Migration State
    //===========================================================

    private readonly migrationCreatedState =
        new Map<number,boolean>();



    //===========================================================
    // Database State
    //===========================================================

    private readonly databaseCreatedState =
        new Map<number,boolean>();



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
    // Table Columns 
    //=========================================================== 
    
    get columns(): 
        ListTableColumn[] 
    { 
        const commonColumns: 
            ListTableColumn[] = 
        [ 
            { 
                header:'#', 
    
                field:'serial', 
    
                type:'serial', 
    
                width:'5%', 
    
                align:'center' 
            }, 
    
            { 
                header:'ID', 
    
                field:'id', 
    
                width:'5%', 
    
                align:'center' 
            } 
        ]; 
    
    
        commonColumns.push( 
        { 
            header:'Module', 
    
            field:'moduleName', 
    
            width: 
                this.selectedTab === 'backend' 
                    ? '10%' 
                    : '10%', 
    
            align:'left' 
        }, 
    
        { 
            header:'Menu', 
    
            field:'menuName', 
    
            width: 
                this.selectedTab === 'backend' 
                    ? '12%' 
                    : '12%', 
    
            align:'left' 
        }, 
    
        { 
            header:'Submenu', 
    
            field:'submenuName', 
    
            width: 
                this.selectedTab === 'backend' 
                    ? '12%' 
                    : '13%', 
    
            align:'left' 
        }, 
    
        { 
            header:'Last Code Sync', 
    
            field:'lastSynchronizedDate', 
    
            width: 
                this.selectedTab === 'backend' 
                    ? '13%' 
                    : '13%', 
    
            align:'center' 
        }, 
    
        { 
            header:'Operation', 
    
            field:'codeOperation', 
    
            type:'operation', 
    
            width:'9%', 
    
            align:'center' 
        }, 
    
        { 
            header:'Build Status', 
    
            field:'buildStatus', 
    
            type:'status', 
    
            width: 
                this.selectedTab === 'backend' 
                    ? '9%' 
                    : '11%', 
    
            align:'center' 
        }); 
    
    
        if 
        ( 
            this.selectedTab === 'backend' 
        ) 
        { 
            commonColumns.push( 
            { 
                header:'DB Status', 
    
                field:'dbStatus', 
    
                type:'status', 
    
                width:'14%', 
    
                align:'center' 
            }); 
        } 
    
    
        commonColumns.push( 
        { 
            header:'Status', 
    
            field:'status', 
    
            type:'status', 
    
            width: 
                this.selectedTab === 'backend' 
                    ? '7%' 
                    : '14%', 
    
            align:'center' 
        }, 
    
        { 
            header:'Actions', 
    
            field:'actions', 
    
            type:'actions', 
    
            width: 
                this.selectedTab === 'backend' 
                    ? '6%' 
                    : '8%', 
    
            align:'center' 
        }); 
    
    
        return commonColumns; 
    }

    //===========================================================
    // Lifecycle
    //===========================================================

    ngOnInit():
        void
    {
        this.loadBackendRegistrationUnlockState();

        this.loadModules();

        this.loadCodeSynchronizations();
    }



    //===========================================================
    // Lifecycle Destroy
    //===========================================================

    ngOnDestroy():
        void
    {
        this.stopCodeViewerRefresh();
    }



    //===========================================================
    // Tab Changed
    //===========================================================

    onTabChange
    (
        tab:
            string
    ):
        void
    {
        if
        (
            tab !== 'frontend'
            &&
            tab !== 'backend'
        )
        {
            return;
        }


        this.selectedTab =
            tab;


        this.searchText =
            '';

        this.selectedModuleId =
            0;

        this.selectedMenuId =
            0;

        this.selectedStatus =
            '';

        this.currentPage =
            1;


        this.modules =
        [];


        this.menus =
        [];


        this.loadModules();

        this.loadCodeSynchronizations();

        this.applyFilters();

        this.cdr.detectChanges();
    }



    //===========================================================
    // Selected Tab Changed
    //===========================================================

    onSelectedTabChange
    (
        tabId:
            string
    ):
        void
    {
        this.onTabChange(
            tabId
        );
    }



    //===========================================================
    // Load Modules
    //===========================================================

    private loadModules():
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
                next:
                (
                    response:
                        ModuleSynchronization[]
                ) =>
                {
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
                                moduleMap.set(
                                    item.moduleId,

                                    item.moduleName
                                );
                            }
                        }
                    );


                    this.modules =
                    Array.from(
                        moduleMap.entries()
                    )
                    .map(
                        (
                            [value,text]
                        ) =>
                        ({
                            value,

                            text
                        })
                    )
                    .sort(
                        (
                            a,
                            b
                        ) =>
                            a.text.localeCompare(
                                b.text
                            )
                    );


                    this.cdr.detectChanges();
                },

                error:
                (
                    error
                ) =>
                {
                    console.error(
                        'Module Load Failed',

                        error
                    );


                    this.modules =
                    [];


                    this.toast.error(
                        'Module Load Failed',

                        this.getErrorMessage(
                            error,

                            'Unable to load modules.'
                        )
                    );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Load Menus
    //===========================================================

    private loadMenus():
        void
    {
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


        this.navigationMenuService

            .getByModule(
                this.selectedModuleId
            )

            .subscribe(
            {
                next:
                (
                    response:
                        NavigationMenu[]
                ) =>
                {
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
                        (
                            [value,text]
                        ) =>
                        ({
                            value,

                            text
                        })
                    )
                    .sort(
                        (
                            a,
                            b
                        ) =>
                            a.text.localeCompare(
                                b.text
                            )
                    );


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


                error:
                (
                    error
                ) =>
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

                        this.getErrorMessage(
                            error,

                            'Unable to load menus for the selected module.'
                        )
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
        moduleId:
            number | null
    ):
        void
    {
        this.selectedModuleId =
            moduleId ?? 0;


        this.selectedMenuId =
            0;


        this.menus =
        [];


        this.currentPage =
            1;


        this.loadMenus();

        this.applyFilters();
    }



    //===========================================================
    // Menu Changed
    //===========================================================

    onMenuChange
    (
        menuId:
            number | null
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
        status:
            string | null
    ):
        void
    {
        this.selectedStatus =
            status ?? '';


        this.currentPage =
            1;


        this.applyFilters();
    }



    //===========================================================
    // Load Code Synchronizations
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
                next:
                (
                    response:
                        CodeSynchronization[]
                ) =>
                {
                    this.synchronizations =
                        response.map(
                            (
                                item
                            ):CodeSynchronization =>
                            ({
                                ...item,

                                buildStatus:
                                    item.buildStatus
                                    ??
                                    (
                                        item.status
                                            ?.toLowerCase()
                                        ===
                                        'synchronized'
                                            ?
                                            'Successful'
                                            :
                                            item.buildStatus
                                            ??
                                            'Pending'
                                    ),

                                dbStatus:
                                    item.dbStatus
                                    ??
                                    (
                                        synchronizationType === 'Backend'
                                            ?
                                            'Pending'
                                            :
                                            'N/A'
                                    ),

                                migrationCreated:
                                    this.isMigrationCreated(item),

                                databaseCreated:
                                    this.isDatabaseCreated(item)
                            })
                        );


                    this.applyFilters();


                    this.loading =
                        false;


                    this.loadFailed =
                        false;


                    this.cdr.detectChanges();
                },


                error:
                (
                    error
                ) =>
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

                        this.getErrorMessage(
                            error,

                            'Unable to load code synchronization.'
                        )
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
                    const moduleMatches =
                        this.selectedModuleId <= 0
                        ||
                        item.moduleId ===
                            this.selectedModuleId;


                    if
                    (
                        !moduleMatches
                    )
                    {
                        return false;
                    }


                    const menuMatches =
                        this.selectedMenuId <= 0
                        ||
                        item.menuId ===
                            this.selectedMenuId;


                    if
                    (
                        !menuMatches
                    )
                    {
                        return false;
                    }


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
                            .includes(
                                keyword
                            )

                        ||

                        item.moduleName
                            ?.toLowerCase()
                            .includes(
                                keyword
                            )

                        ||

                        item.menuCode
                            ?.toLowerCase()
                            .includes(
                                keyword
                            )

                        ||

                        item.menuName
                            ?.toLowerCase()
                            .includes(
                                keyword
                            )

                        ||

                        item.submenuCode
                            ?.toLowerCase()
                            .includes(
                                keyword
                            )

                        ||

                        item.submenuName
                            ?.toLowerCase()
                            .includes(
                                keyword
                            )

                        ||

                        item.remarks
                            ?.toLowerCase()
                            .includes(
                                keyword
                            )
                    );
                }
            );


        this.filteredSynchronizations.sort(
            (
                a,
                b
            ) =>
                a.submenuName.localeCompare(
                    b.submenuName
                )
        );


        this.currentPage =
            1;


        this.updatePagination();
    }



    //===========================================================
    // Search Code Synchronization
    //===========================================================

    onSearch
    (
        value:
            string
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
            field:
                string;

            direction:
                'asc'
                |
                'desc';
        }
    ):
        void
    {
        this.filteredSynchronizations =
        [
            ...this.filteredSynchronizations
        ];


        this.filteredSynchronizations.sort(
            (
                a:any,

                b:any
            ) =>
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
                        ?
                        valueA.localeCompare(
                            valueB
                        )
                        :
                        valueB.localeCompare(
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

    private updatePagination():
        void
    {
        const start =
            (
                this.currentPage -
                1
            ) *
            this.pageSize;


        const end =
            start +
            this.pageSize;


        this.pagedSynchronizations =
            this.filteredSynchronizations.slice(
                start,

                end
            );


        this.cdr.detectChanges();
    }



    //===========================================================
    // Page Changed
    //===========================================================

    onPageChange
    (
        page:
            number
    ):
        void
    {
        if
        (
            page < 1
        )
        {
            return;
        }


        this.currentPage =
            page;


        this.updatePagination();
    }



    //===========================================================
    // Page Size Changed
    //===========================================================

    onPageSizeChange
    (
        size:
            number
    ):
        void
    {
        if
        (
            size <= 0
        )
        {
            return;
        }


        this.pageSize =
            size;


        this.currentPage =
            1;


        this.updatePagination();
    }



    //===========================================================
    // File Viewer
    //===========================================================

    view
    (
        item:
            CodeSynchronization
    ):
        void
    {
        if
        (
            !item
            ||
            item.id <= 0
        )
        {
            return;
        }


        this.selectedCodeSynchronization =
            item;


        this.codeViewerFiles =
        [];


        this.codeViewerOpened =
            true;


        this.cdr.detectChanges();


        this.startCodeViewerRefresh();


        this.codeSynchronizationService

            .getFiles(
                item.id
            )

            .subscribe(
            {
                next:
                (
                    response:
                        CodeSynchronizationFile[]
                ) =>
                {
                    this.codeViewerFiles =
                        response.map(
                            (
                                file:
                                    CodeSynchronizationFile
                            ):CodeViewerFile =>
                            ({
                                fileName:
                                    file.fileName,

                                status:
                                    this.resolveCodeFileStatus(
                                        file
                                    ),

                                lastModified:
                                    file.lastModified,

                                canInitialize:
                                    this.canInitializeCodeFile(
                                        this.resolveCodeFileStatus(
                                            file
                                        )
                                    ),

                                canRestore:
                                    this.canRestoreCodeFile(
                                        file
                                    )
                            })
                        );


                    this.cdr.detectChanges();
                },


                error:
                (
                    error
                ) =>
                {
                    console.error(
                        'Generated Code Files Load Failed',

                        error
                    );


                    this.codeViewerFiles =
                    [];


                    this.toast.error(
                        'Code Viewer',

                        this.getErrorMessage(
                            error,

                            'Unable to load generated code files.'
                        )
                    );


                    this.cdr.detectChanges();
                }
            });
    } 


    //===========================================================
    // Start Code Viewer Refresh
    //===========================================================

    private startCodeViewerRefresh():
        void
    {
        this.stopCodeViewerRefresh();


        this.codeViewerRefreshTimer =
            setInterval(
                () =>
                {
                    this.refreshCodeViewerFiles();
                },

                this.codeViewerRefreshInterval
            );
    }



    //===========================================================
    // Stop Code Viewer Refresh
    //===========================================================

    private stopCodeViewerRefresh():
        void
    {
        if
        (
            this.codeViewerRefreshTimer !== null
        )
        {
            clearInterval(
                this.codeViewerRefreshTimer
            );


            this.codeViewerRefreshTimer =
                null;
        }


        this.codeViewerRefreshInProgress =
            false;
    }



    //===========================================================
    // Refresh Code Viewer Files
    //===========================================================

    private refreshCodeViewerFiles():
        void
    {
        if
        (
            !this.codeViewerOpened
            ||
            !this.selectedCodeSynchronization
            ||
            this.selectedCodeSynchronization.id <= 0
            ||
            this.codeViewerRefreshInProgress
        )
        {
            return;
        }


        const item =
            this.selectedCodeSynchronization;


        this.codeViewerRefreshInProgress =
            true;


        this.codeSynchronizationService

            .getFiles(
                item.id
            )

            .subscribe(
            {
                next:
                (
                    response:
                        CodeSynchronizationFile[]
                ) =>
                {
                    if
                    (
                        !this.codeViewerOpened
                        ||
                        !this.selectedCodeSynchronization
                        ||
                        this.selectedCodeSynchronization.id !==
                            item.id
                    )
                    {
                        this.codeViewerRefreshInProgress =
                            false;


                        return;
                    }


                    this.codeViewerFiles =
                        response.map(
                            (
                                file:
                                    CodeSynchronizationFile
                            ):CodeViewerFile =>
                            {
                                const status =
                                    this.resolveCodeFileStatus(
                                        file
                                    );


                                return (
                                {
                                    fileName:
                                        file.fileName,

                                    status:
                                        status,

                                    lastModified:
                                        file.lastModified,

                                    canInitialize:
                                        this.canInitializeCodeFile(
                                            status
                                        ),

                                    canRestore:
                                        this.canRestoreCodeFile(
                                            file
                                        )
                                }
                                );
                            }
                        );


                    this.codeViewerRefreshInProgress =
                        false;


                    this.cdr.detectChanges();
                },


                error:
                (
                    error
                ) =>
                {
                    console.error(
                        'Generated Code Files Refresh Failed',

                        error
                    );


                    this.codeViewerRefreshInProgress =
                        false;


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Resolve Code File Status
    //===========================================================
    //
    // The backend is the authoritative source for the file state.
    // It compares the existing source file against the protected
    // baseline in the synchronization engine's configured backup
    // location.
    //
    // Do NOT use the source file timestamp against
    // LastSynchronizedDate here. Initializing a file writes the
    // baseline contents to the source file, and the resulting file
    // timestamp can be newer even though the file is clean.
    //===========================================================

    private resolveCodeFileStatus
    (
        file:
            CodeSynchronizationFile
    ):
        'Clean' | 'Modified'
    {
        return this.normalizeFileStatus(
            file.status
        );
    }



    //===========================================================
    // Normalize File Status
    //===========================================================

    private normalizeFileStatus
    (
        status:
            string | null | undefined
    ):
        'Clean' | 'Modified'
    {
        return String(
                status
                ??
                'Clean'
            )
            .trim()
            .toLowerCase()
            ===
            'modified'
                ?
                'Modified'
                :
                'Clean';
    }



    //===========================================================
    // Can Initialize Code File
    //===========================================================

    private canInitializeCodeFile
    (
        status:
            'Clean' | 'Modified'
    ):
        boolean
    {
        return status ===
               'Modified';
    }



    //===========================================================
    // Can Restore Code File
    //===========================================================

    private canRestoreCodeFile
    (
        file:
            CodeSynchronizationFile
    ):
        boolean
    {
        return this.resolveCodeFileStatus(
                file
            ) ===
            'Modified';
    }



    //===========================================================
    // Code Viewer Restore All
    //===========================================================

    onCodeViewerRestoreAll():
        void
    {
        this.restoreCodeViewer();
    }



    //===========================================================
    // Code Viewer Restore File
    //===========================================================

    onCodeViewerRestoreFile
    (
        file:
            CodeViewerFile
    ):
        void
    {
        if
        (
            !this.selectedCodeSynchronization
            ||
            !file
            ||
            !file.fileName
        )
        {
            return;
        }


        const item =
            this.selectedCodeSynchronization;


        this.confirmDialog.open
        (
            'Restore Code File',

            `Are you sure you want to restore "${file.fileName}" ?`,

            () =>
            {
                this.progressDialog.show
                (
                    'Code File Restore',

                    'Restoring selected generated file.'
                );


                this.progressDialog.update
                (
                    30,

                    'Preparing file restore.'
                );


                this.codeSynchronizationService

                    .restoreFile
                    (
                        item.id,

                        file.fileName
                    )

                    .subscribe(
                    {
                        next:() =>
                        {
                            this.progressDialog.update
                            (
                                100,

                                'File restore completed.'
                            );


                            setTimeout(
                                () =>
                                {
                                    this.progressDialog.close();


                                    this.toast.success
                                    (
                                        'Code File Restore',

                                        `${file.fileName} restored successfully.`
                                    );


                                    this.view(
                                        item
                                    );


                                    this.cdr.detectChanges();
                                },

                                300
                            );
                        },


                        error:
                        (
                            error
                        ) =>
                        {
                            console.error(
                                'Code File Restore Failed',

                                error
                            );


                            this.progressDialog.close();


                            this.toast.error
                            (
                                'Code File Restore Failed',

                                this.getErrorMessage(
                                    error,

                                    'Failed to restore the selected code file.'
                                )
                            );


                            this.cdr.detectChanges();
                        }
                    });
            },

            'Restore',

            'Cancel',

            'primary'
        );
    }



    //===========================================================
    // Code Viewer Initialize All
    //===========================================================

    onCodeViewerInitializeAll():
        void
    {
        this.initializeCodeViewer();
    }



    //===========================================================
    // Code Viewer Initialize File
    //===========================================================

    onCodeViewerInitializeFile
    (
        file:
            CodeViewerFile
    ):
        void
    {
        if
        (
            !this.selectedCodeSynchronization
            ||
            !file
            ||
            !file.fileName
        )
        {
            return;
        }


        const item =
            this.selectedCodeSynchronization;


        this.confirmDialog.open
        (
            'Initialize Code File',

            `Are you sure you want to initialize "${file.fileName}" from its original baseline?`,

            () =>
            {
                this.startInitializeCodeFile(
                    item,

                    file
                );
            },

            'Initialize',

            'Cancel',

            'primary'
        );
    }



    //===========================================================
    // Initialize Code Viewer
    //===========================================================

    initializeCodeViewer():
        void
    {
        if
        (
            !this.selectedCodeSynchronization
        )
        {
            return;
        }


        const item =
            this.selectedCodeSynchronization;


        if
        (
            !this.codeViewerFiles.some
            (
                file =>
                    file.status ===
                    'Modified'
            )
        )
        {
            return;
        }


        this.confirmDialog.open
        (
            'Initialize Modified Code',

            `Are you sure you want to initialize all modified generated files for "${item.submenuName}" from their original baseline?`,

            () =>
            {
                this.startInitializeAllFromCodeViewer(
                    item
                );
            },

            'Initialize',

            'Cancel',

            'primary'
        );
    }



    //===========================================================
    // Start Initialize Single Code File
    //===========================================================

    private startInitializeCodeFile
    (
        item:
            CodeSynchronization,

        file:
            CodeViewerFile
    ):
        void
    {
        if
        (
            !file
            ||
            !file.fileName
        )
        {
            return;
        }


        this.codeViewer?.beginFileInitialize(
            file
        );


        this.progressDialog.show
        (
            'Code File Initialize',

            'Initializing selected generated file from baseline.'
        );


        this.progressDialog.update
        (
            30,

            'Preparing baseline initialization.'
        );


        setTimeout(
            () =>
            {
                this.progressDialog.update
                (
                    60,

                    'Restoring the original baseline file.'
                );
            },

            300
        );


        setTimeout(
            () =>
            {
                this.codeSynchronizationService

                    .initializeFile
                    (
                        item.id,

                        file.fileName
                    )

                    .subscribe(
                    {
                        next:() =>
                        {
                            this.progressDialog.update
                            (
                                100,

                                'File initialization completed.'
                            );


                            this.codeViewer?.completeFileInitialize();


                            setTimeout(
                                () =>
                                {
                                    this.progressDialog.close();


                                    this.toast.success
                                    (
                                        'Code File Initialize',

                                        `${file.fileName} initialized successfully from its original baseline.`
                                    );


                                    this.view(
                                        item
                                    );


                                    this.cdr.detectChanges();
                                },

                                300
                            );
                        },


                        error:
                        (
                            error
                        ) =>
                        {
                            console.error(
                                'Code File Initialize Failed',

                                error
                            );


                            this.codeViewer?.fileInitializeFailed();


                            this.progressDialog.close();


                            this.toast.error
                            (
                                'Code File Initialize Failed',

                                this.getErrorMessage(
                                    error,

                                    'Failed to initialize the selected code file.'
                                )
                            );


                            this.cdr.detectChanges();
                        }
                    });
            },

            700
        );
    }



    //===========================================================
    // Start Initialize All From Code Viewer
    //===========================================================

    private startInitializeAllFromCodeViewer
    (
        item:
            CodeSynchronization
    ):
        void
    {
        this.codeViewer?.beginInitialize();


        this.progressDialog.show
        (
            'Code File Initialize',

            'Initializing all modified generated files from baseline.'
        );


        this.progressDialog.update
        (
            10,

            'Preparing baseline initialization.'
        );


        setTimeout(
            () =>
            {
                this.progressDialog.update
                (
                    30,

                    'Checking modified generated files.'
                );
            },

            300
        );


        setTimeout(
            () =>
            {
                this.progressDialog.update
                (
                    60,

                    'Restoring original baseline files.'
                );
            },

            700
        );


        setTimeout(
            () =>
            {
                this.codeSynchronizationService

                    .initializeAll(
                        item.id
                    )

                    .subscribe(
                    {
                        next:() =>
                        {
                            this.progressDialog.update
                            (
                                100,

                                'All file initialization completed.'
                            );


                            this.codeViewer?.completeInitialize();


                            setTimeout(
                                () =>
                                {
                                    this.progressDialog.close();


                                    this.toast.success
                                    (
                                        'Code File Initialize',

                                        `${item.submenuName} modified generated files initialized successfully from their original baseline.`
                                    );


                                    this.view(
                                        item
                                    );


                                    this.cdr.detectChanges();
                                },

                                300
                            );
                        },


                        error:
                        (
                            error
                        ) =>
                        {
                            console.error(
                                'Code File Initialize Failed',

                                error
                            );


                            this.codeViewer?.initializeFailed();


                            this.progressDialog.close();


                            this.toast.error
                            (
                                'Code File Initialize Failed',

                                this.getErrorMessage(
                                    error,

                                    'Failed to initialize modified generated files.'
                                )
                            );


                            this.cdr.detectChanges();
                        }
                    });
            },

            1000
        );
    }



    //===========================================================
    // Close Code Viewer
    //===========================================================

    closeCodeViewer():
        void
    {
        this.stopCodeViewerRefresh();


        this.codeViewerOpened =
            false;


        this.selectedCodeSynchronization =
            null;


        this.codeViewerFiles =
        [];


        this.cdr.detectChanges();
    }



    //===========================================================
    // Restore From Code Viewer
    //===========================================================

    restoreCodeViewer():
        void
    {
        if
        (
            !this.selectedCodeSynchronization
        )
        {
            return;
        }


        const item =
            this.selectedCodeSynchronization;


        if
        (
            !this.codeViewerFiles.some
            (
                file =>
                    file.status ===
                    'Modified'
            )
        )
        {
            return;
        }


        this.confirmDialog.open
        (
            'Restore Modified Code',

            `Are you sure you want to restore all modified generated files for "${item.submenuName}" ?`,

            () =>
            {
                this.startRestoreAllFromCodeViewer(
                    item
                );
            },

            'Restore',

            'Cancel',

            'primary'
        );
    }



    //===========================================================
    // Start Restore All From Code Viewer
    //===========================================================

    private startRestoreAllFromCodeViewer
    (
        item:
            CodeSynchronization
    ):
        void
    {
        this.progressDialog.show
        (
            'Code File Restore',

            'Starting restore of modified generated files.'
        );


        this.progressDialog.update
        (
            10,

            'Preparing modified generated files.'
        );


        setTimeout(
            () =>
            {
                this.progressDialog.update
                (
                    30,

                    'Checking generated files.'
                );
            },

            300
        );


        setTimeout(
            () =>
            {
                this.progressDialog.update
                (
                    60,

                    'Restoring modified generated files.'
                );
            },

            700
        );


        setTimeout(
            () =>
            {
                this.codeSynchronizationService

                    .restoreAll(
                        item.id
                    )

                    .subscribe(
                    {
                        next:() =>
                        {
                            this.progressDialog.update
                            (
                                100,

                                'File restore completed.'
                            );


                            setTimeout(
                                () =>
                                {
                                    this.progressDialog.close();


                                    this.toast.success
                                    (
                                        'Code File Restore',

                                        `${item.submenuName} modified generated files restored successfully.`
                                    );


                                    this.view(
                                        item
                                    );


                                    this.cdr.detectChanges();
                                },

                                300
                            );
                        },


                        error:
                        (
                            error
                        ) =>
                        {
                            console.error(
                                'Code File Restore Failed',

                                error
                            );


                            this.progressDialog.close();


                            this.toast.error
                            (
                                'Code File Restore Failed',

                                this.getErrorMessage(
                                    error,

                                    'Failed to restore modified generated files.'
                                )
                            );


                            this.cdr.detectChanges();
                        }
                    });
            },

            1000
        );
    }



    //===========================================================
    // Synchronize / Rollback Code
    //===========================================================

    synchronize
    (
        item:
            CodeSynchronization
    ):
        void
    {
        if
        (
            !item
            ||
            item.id <= 0
        )
        {
            return;
        }


        if
        (
            this.isSynchronized(item)
        )
        {
            if
            (
                !this.canRollback(item)
            )
            {
                return;
            }


            this.confirmDialog.open
            (
                'Rollback Code',

                `Are you sure you want to rollback code synchronization for "${item.submenuName}" ?`,

                () =>
                {
                    this.startRollback(
                        item
                    );
                },

                'Rollback',

                'Cancel',

                'primary'
            );


            return;
        }


        this.confirmDialog.open
        (
            'Synchronize Code',

            `Are you sure you want to generate code for "${item.submenuName}" ?`,

            () =>
            {
                this.startSynchronization(
                    item
                );
            },

            'Synchronize',

            'Cancel',

            'primary'
        );
    }



    //===========================================================
    // Start Synchronization
    //===========================================================

    private startSynchronization
    (
        item:
            CodeSynchronization
    ):
        void
    {
        this.progressDialog.show
        (
            'Code Synchronization',

            'Starting code synchronization.'
        );


        this.progressDialog.update
        (
            10,

            'Preparing code synchronization.'
        );


        setTimeout(
            () =>
            {
                this.progressDialog.update
                (
                    30,

                    'Generating code.'
                );
            },

            300
        );


        setTimeout(
            () =>
            {
                this.progressDialog.update
                (
                    60,

                    'Synchronizing generated files.'
                );
            },

            700
        );


        setTimeout(
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
                            this.progressDialog.update
                            (
                                100,

                                'Synchronization completed.'
                            );


                            setTimeout(
                                () =>
                                {
                                    this.progressDialog.close();


                                    this.toast.success
                                    (
                                        'Code Synchronization',

                                        `${item.submenuName} code synchronized successfully.`
                                    );


                                    this.loadCodeSynchronizations();


                                    this.cdr.detectChanges();
                                },

                                300
                            );
                        },


                        error:
                        (
                            error
                        ) =>
                        {
                            console.error(
                                'Code Synchronization Failed',

                                error
                            );


                            this.progressDialog.close();


                            this.toast.error
                            (
                                'Code Synchronization Failed',

                                this.getErrorMessage(
                                    error,

                                    'Failed to synchronize code.'
                                )
                            );


                            this.cdr.detectChanges();
                        }
                    });
            },

            1000
        );
    }



    //===========================================================
    // Start Rollback
    //===========================================================

    private startRollback
    (
        item:
            CodeSynchronization
    ):
        void
    {
        if
        (
            !this.canRollback(item)
        )
        {
            return;
        }


        this.progressDialog.show
        (
            'Code Rollback',

            'Starting code rollback.'
        );


        this.progressDialog.update
        (
            10,

            'Preparing code rollback.'
        );


        setTimeout(
            () =>
            {
                this.progressDialog.update
                (
                    30,

                    'Preparing generated files for rollback.'
                );
            },

            300
        );


        setTimeout(
            () =>
            {
                this.progressDialog.update
                (
                    60,

                    'Removing generated files.'
                );
            },

            700
        );


        setTimeout(
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
                            this.progressDialog.update
                            (
                                100,

                                'Rollback completed.'
                            );


                            setTimeout(
                                () =>
                                {
                                    this.progressDialog.close();


                                    this.toast.success
                                    (
                                        'Code Rollback',

                                        `${item.submenuName} code rolled back successfully.`
                                    );


                                    this.loadCodeSynchronizations();


                                    this.cdr.detectChanges();
                                },

                                300
                            );
                        },


                        error:
                        (
                            error
                        ) =>
                        {
                            console.error(
                                'Code Rollback Failed',

                                error
                            );


                            this.progressDialog.close();


                            this.toast.error
                            (
                                'Code Rollback Failed',

                                this.getErrorMessage(
                                    error,

                                    'Failed to rollback code.'
                                )
                            );


                            this.cdr.detectChanges();
                        }
                    });
            },

            1000
        );
    }



    //===========================================================
    // Synchronization State
    //===========================================================

    isSynchronized
    (
        item:
            CodeSynchronization
    ):
        boolean
    {
        return (
            item?.status
                ?.toString()
                .trim()
                .toLowerCase()
            ===
            'synchronized'
        );
    }



    //===========================================================
    // Can Rollback
    //===========================================================

    canRollback
    (
        item:
            CodeSynchronization
    ):
        boolean
    {
        return (
            this.isSynchronized(item)
            &&
            item.id > 0
        );
    }



    //===========================================================
    // Registration State
    //===========================================================

    isRegistered
    (
        item:
            CodeSynchronization
    ):
        boolean
    {
        return (
            item?.dbStatus
                ?.toString()
                .trim()
                .toLowerCase()
            ===
            'registered'
        );
    }

    //===========================================================
    // Can Register
    //===========================================================

    canRegister
    (
        item:
            CodeSynchronization
    ):
        boolean
    {
        //=======================================================
        // REGISTER IS AVAILABLE ONLY FOR BACKEND
        //=======================================================

        if
        (
            this.selectedTab !== 'backend'
        )
        {
            return false;
        }


        //=======================================================
        // CODE MUST BE SYNCHRONIZED BEFORE REGISTRATION
        //=======================================================

        if
        (
            !this.isSynchronized(item)
        )
        {
            return false;
        }


        //=======================================================
        // CURRENT RECORD MUST NOT ALREADY BE REGISTERED
        //=======================================================

        if
        (
            this.isRegistered(item)
        )
        {
            return false;
        }


        //=======================================================
        // GLOBAL REGISTRATION LOCK
        //
        // Registration is blocked ONLY when another record is:
        //
        //     Synchronized
        //     +
        //     Registered
        //     +
        //     Database NOT Created
        //
        // Migration state is completely independent.
        //
        // backendRegistrationUnlocked is intentionally NOT used
        // here.
        //=======================================================

        const pendingRegistration =
            this.filteredSynchronizations.some(
                (
                    currentItem:
                        CodeSynchronization
                ) =>
                {
                    //=================================================
                    // Ignore the current record.
                    //=================================================

                    if
                    (
                        currentItem === item
                    )
                    {
                        return false;
                    }


                    //=================================================
                    // Also ignore the current record when the object
                    // instance was refreshed/replaced.
                    //=================================================

                    if
                    (
                        currentItem?.id !== undefined
                        &&
                        currentItem?.id !== null
                        &&
                        item?.id !== undefined
                        &&
                        item?.id !== null
                        &&
                        currentItem.id === item.id
                    )
                    {
                        return false;
                    }


                    //=================================================
                    // Another registered backend record with no
                    // database created yet holds the registration lock.
                    //=================================================

                    return (
                        this.isSynchronized(
                            currentItem
                        )
                        &&
                        this.isRegistered(
                            currentItem
                        )
                        &&
                        currentItem.databaseCreated !== true
                    );
                }
            );


        return !pendingRegistration;
    }



    //===========================================================
    // Can Deregister
    //===========================================================

    canDeregister
    (
        item:
            CodeSynchronization
    ):
        boolean
    {
        return (
            this.selectedTab === 'backend'
            &&
            this.isSynchronized(item)
            &&
            this.isRegistered(item)
            &&
            item.databaseCreated !== true
        );
    }



    //===========================================================
    // Backend Register / Unregister
    //===========================================================

    register
    (
        item:
            CodeSynchronization
    ):
        void
    {
        if
        (
            !item
        )
        {
            return;
        }


        //=======================================================
        // REGISTER
        //=======================================================

        if
        (
            !this.isRegistered(item)
        )
        {
            if
            (
                !this.canRegister(item)
            )
            {
                return;
            }


            this.confirmDialog.open
            (
                'Backend Registration',

                `Are you sure you want to register backend code for "${item.submenuName}" ?`,

                () =>
                {
                    this.startRegistration(
                        item
                    );
                },

                'Register',

                'Cancel',

                'primary'
            );


            return;
        }


        //=======================================================
        // DEREGISTER
        //
        // A registered record remains clickable until its
        // database has been successfully created.
        //=======================================================

        if
        (
            !this.canDeregister(item)
        )
        {
            return;
        }


        this.confirmDialog.open
        (
            'Backend Unregistration',

            `Are you sure you want to unregister backend code for "${item.submenuName}" ?`,

            () =>
            {
                this.startUnregistration(
                    item
                );
            },

            'Unregister',

            'Cancel',

            'primary'
        );
    }



    //===========================================================
    // Backend Unregister
    //===========================================================

    unregister
    (
        item:
            CodeSynchronization
    ):
        void
    {
        if
        (
            !this.canDeregister(item)
        )
        {
            return;
        }


        this.confirmDialog.open
        (
            'Backend Unregistration',

            `Are you sure you want to unregister backend code for "${item.submenuName}" ?`,

            () =>
            {
                this.startUnregistration(
                    item
                );
            },

            'Unregister',

            'Cancel',

            'primary'
        );
    }



    //===========================================================
    // Start Backend Registration
    //===========================================================

    private startRegistration
    (
        item:
            CodeSynchronization
    ):
        void
    {
        this.progressDialog.show
        (
            'Backend Registration',

            'Starting backend registration.'
        );


        this.progressDialog.update
        (
            10,

            'Preparing backend registration.'
        );


        setTimeout(
            () =>
            {
                this.progressDialog.update
                (
                    30,

                    'Generating backend registration code.'
                );
            },

            300
        );


        setTimeout(
            () =>
            {
                this.progressDialog.update
                (
                    60,

                    'Updating backend registration.'
                );
            },

            700
        );


        setTimeout(
            () =>
            {
                this.codeSynchronizationService

                    .register(
                        item.id
                    )

                    .subscribe(
                    {
                        next:() =>
                        {
                            this.progressDialog.update
                            (
                                100,

                                'Backend registration completed.'
                            );


                            setTimeout(
                                () =>
                                {
                                    this.progressDialog.close();


                                    this.toast.success
                                    (
                                        'Backend Registration',

                                        `${item.submenuName} backend registered successfully.`
                                    );


                                    this.loadCodeSynchronizations();


                                    this.cdr.detectChanges();
                                },

                                300
                            );
                        },


                        error:
                        (
                            error
                        ) =>
                        {
                            console.error(
                                'Backend Registration Failed',

                                error
                            );


                            this.progressDialog.close();


                            this.toast.error
                            (
                                'Backend Registration Failed',

                                this.getErrorMessage(
                                    error,

                                    'Failed to register backend.'
                                )
                            );


                            this.cdr.detectChanges();
                        }
                    });
            },

            1000
        );
    }



    //===========================================================
    // Start Backend Unregistration
    //===========================================================

    private startUnregistration
    (
        item:
            CodeSynchronization
    ):
        void
    {
        if
        (
            !this.canDeregister(item)
        )
        {
            return;
        }


        this.progressDialog.show
        (
            'Backend Unregistration',

            'Starting backend unregistration.'
        );


        this.progressDialog.update
        (
            10,

            'Preparing backend unregistration.'
        );


        setTimeout(
            () =>
            {
                this.progressDialog.update
                (
                    30,

                    'Preparing backend unregistration.'
                );
            },

            300
        );


        setTimeout(
            () =>
            {
                this.progressDialog.update
                (
                    60,

                    'Removing backend database registration.'
                );
            },

            700
        );


        setTimeout(
            () =>
            {
                this.codeSynchronizationService

                    .rollbackRegistration(
                        item.id
                    )

                    .subscribe(
                    {
                        next:() =>
                        {
                            this.progressDialog.update
                            (
                                100,

                                'Backend unregistration completed.'
                            );


                            setTimeout(
                                () =>
                                {
                                    this.progressDialog.close();


                                    this.toast.success
                                    (
                                        'Backend Unregistration',

                                        `${item.submenuName} backend unregistered successfully.`
                                    );


                                    this.loadCodeSynchronizations();


                                    this.cdr.detectChanges();
                                },

                                300
                            );
                        },


                        error:
                        (
                            error
                        ) =>
                        {
                            console.error(
                                'Backend Unregistration Failed',

                                error
                            );


                            this.progressDialog.close();


                            this.toast.error
                            (
                                'Backend Unregistration Failed',

                                this.getErrorMessage(
                                    error,

                                    'Failed to unregister backend.'
                                )
                            );


                            this.cdr.detectChanges();
                        }
                    });
            },

            1000
        );
    }


    //===========================================================
    // Database State
    //===========================================================

    isDatabaseCreated
    (
        item:
            CodeSynchronization
    ):
        boolean
    {
        if
        (
            !item
            ||
            item.id <= 0
        )
        {
            return false;
        }


        if
        (
            this.databaseCreatedState.has(
                item.id
            )
        )
        {
            return this.databaseCreatedState.get(
                    item.id
                )
                ===
                true;
        }


        return item.databaseCreated === true;
    }



    //===========================================================
    // Set Database State
    //===========================================================

    private setDatabaseCreated
    (
        item:
            CodeSynchronization,

        created:
            boolean
    ):
        void
    {
        if
        (
            !item
            ||
            item.id <= 0
        )
        {
            return;
        }


        this.databaseCreatedState.set(
            item.id,

            created
        );


        item.databaseCreated =
            created;


        this.applyFilters();

        this.updatePagination();

        this.cdr.detectChanges();
    }



    //===========================================================
    // Can Create Database
    //===========================================================

    canCreateDatabase
    (
        item:
            CodeSynchronization
    ):
        boolean
    {
        return (
            this.selectedTab === 'backend'
            &&
            this.isSynchronized(item)
            &&
            !this.isDatabaseCreated(item)
        );
    }



    //===========================================================
    // Can Remove Database
    //===========================================================

    canRemoveDatabase
    (
        item:
            CodeSynchronization
    ):
        boolean
    {
        return (
            this.selectedTab === 'backend'
            &&
            this.isDatabaseCreated(item)
        );
    }



    //===========================================================
    // Database Create / Remove
    //===========================================================

    database
    (
        item:
            CodeSynchronization
    ):
        void
    {
        if
        (
            !item
            ||
            item.id <= 0
            ||
            this.selectedTab !== 'backend'
        )
        {
            return;
        }


        if
        (
            this.isDatabaseCreated(item)
        )
        {
            if
            (
                !this.canRemoveDatabase(item)
            )
            {
                return;
            }


            this.confirmDialog.open
            (
                'Remove Database Table',

                `Are you sure you want to remove the database table for "${item.submenuName}"?`,

                () =>
                {
                    this.startDatabaseRemove(
                        item
                    );
                },

                'Remove',

                'Cancel',

                'danger'
            );


            return;
        }


        if
        (
            !this.canCreateDatabase(item)
        )
        {
            return;
        }


        this.confirmDialog.open
        (
            'Create Database Table',

            `Are you sure you want to create the database table for "${item.submenuName}"?`,

            () =>
            {
                this.startDatabaseCreate(
                    item
                );
            },

            'Create',

            'Cancel',

            'primary'
        );
    }



    //===========================================================
    // Start Database Create
    //===========================================================

    private startDatabaseCreate
    (
        item:
            CodeSynchronization
    ):
        void
    {
        if
        (
            !this.canCreateDatabase(item)
        )
        {
            return;
        }


        this.progressDialog.show
        (
            'Create Database Table',

            'Starting database table creation.'
        );


        this.progressDialog.update
        (
            10,

            'Preparing database creation.'
        );


        setTimeout(
            () =>
            {
                this.progressDialog.update
                (
                    30,

                    'Preparing database migration.'
                );
            },

            300
        );


        setTimeout(
            () =>
            {
                this.progressDialog.update
                (
                    60,

                    'Creating database table.'
                );
            },

            700
        );


        setTimeout(
            () =>
            {
                this.executeDatabaseCreate(
                    item
                );
            },

            1000
        );
    }



    //===========================================================
    // Execute Database Create
    //===========================================================

    private executeDatabaseCreate
    (
        item:
            CodeSynchronization
    ):
        void
    {
        this.codeSynchronizationService

            .createDatabase(
                item.id
            )

            .subscribe(
            {
                next:
                (
                    response
                ) =>
                {
                    const message =
                        response?.message
                        ??
                        'Database table created successfully.';


                    if
                    (
                        response?.success === false
                    )
                    {
                        this.progressDialog.close();


                        this.toast.error
                        (
                            'Database Creation Failed',

                            message
                        );


                        this.cdr.detectChanges();


                        return;
                    }


                    this.setDatabaseCreated(
                        item,

                        true
                    );


                    this.progressDialog.update
                    (
                        100,

                        message
                    );


                    setTimeout(
                        () =>
                        {
                            this.progressDialog.close();


                            this.toast.success
                            (
                                'Database Table',

                                message
                            );


                            this.loadCodeSynchronizations();


                            this.cdr.detectChanges();
                        },

                        300
                    );
                },


                error:
                (
                    error
                ) =>
                {
                    console.error(
                        'Database Creation Failed',

                        error
                    );


                    this.progressDialog.close();


                    this.toast.error
                    (
                        'Database Creation Failed',

                        this.getErrorMessage(
                            error,

                            'Failed to create the database table.'
                        )
                    );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Start Database Remove
    //===========================================================

    private startDatabaseRemove
    (
        item:
            CodeSynchronization
    ):
        void
    {
        if
        (
            !this.canRemoveDatabase(item)
        )
        {
            return;
        }


        this.progressDialog.show
        (
            'Remove Database Table',

            'Starting database table removal.'
        );


        this.progressDialog.update
        (
            10,

            'Preparing database removal.'
        );


        setTimeout(
            () =>
            {
                this.progressDialog.update
                (
                    30,

                    'Preparing database rollback.'
                );
            },

            300
        );


        setTimeout(
            () =>
            {
                this.progressDialog.update
                (
                    60,

                    'Removing database table.'
                );
            },

            700
        );


        setTimeout(
            () =>
            {
                this.executeDatabaseRemove(
                    item
                );
            },

            1000
        );
    }



    //===========================================================
    // Execute Database Remove
    //===========================================================

    private executeDatabaseRemove
    (
        item:
            CodeSynchronization
    ):
        void
    {
        this.codeSynchronizationService

            .removeDatabase(
                item.id
            )

            .subscribe(
            {
                next:
                (
                    response
                ) =>
                {
                    const message =
                        response?.message
                        ??
                        'Database table removed successfully.';


                    if
                    (
                        response?.success === false
                    )
                    {
                        this.progressDialog.close();


                        this.toast.error
                        (
                            'Database Removal Failed',

                            message
                        );


                        this.cdr.detectChanges();


                        return;
                    }


                    this.setDatabaseCreated(
                        item,

                        false
                    );


                    this.progressDialog.update
                    (
                        100,

                        message
                    );


                    setTimeout(
                        () =>
                        {
                            this.progressDialog.close();


                            this.toast.success
                            (
                                'Database Table',

                                message
                            );


                            this.loadCodeSynchronizations();


                            this.cdr.detectChanges();
                        },

                        300
                    );
                },


                error:
                (
                    error
                ) =>
                {
                    console.error(
                        'Database Removal Failed',

                        error
                    );


                    this.progressDialog.close();


                    this.toast.error
                    (
                        'Database Removal Failed',

                        this.getErrorMessage(
                            error,

                            'Failed to remove the database table.'
                        )
                    );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Set Backend Registration Unlock State
    //===========================================================

    private setBackendRegistrationUnlocked
    (
        unlocked:
            boolean
    ):
        void
    {
        this.backendRegistrationUnlocked =
            unlocked;


        try
        {
            localStorage.setItem(
                this.backendRegistrationUnlockStorageKey,

                unlocked
                    ?
                    'true'
                    :
                    'false'
            );
        }
        catch
        {
            // Ignore browser storage errors.
        }


        this.applyFilters();

        this.updatePagination();

        this.cdr.detectChanges();
    }



    //===========================================================
    // Migration Create / Remove
    //
    // NEUTRALIZED
    //
    // The old EF Migration Engine is disconnected from the
    // frontend workflow. The methods remain only for compatibility
    // with the existing HTML/template.
    //===========================================================

    migration
    (
        item:
            CodeSynchronization
    ):
        void
    {
        if
        (
            !item
            ||
            item.id <= 0
        )
        {
            return;
        }


        if
        (
            this.selectedTab !== 'backend'
        )
        {
            return;
        }


        this.toast.warning
        (
            'Migration Engine',

            'EF Core migration operations are permanently disabled for this workflow.'
        );
    }



    //===========================================================
    // Start Migration Create
    //===========================================================

    private startMigrationCreate
    (
        item:
            CodeSynchronization
    ):
        void
    {
        return;
    }



    //===========================================================
    // Start Migration Remove
    //===========================================================

    private startMigrationRemove
    (
        item:
            CodeSynchronization
    ):
        void
    {
        return;
    }



    //===========================================================
    // Restore
    //===========================================================

    restore():
        void
    {
        this.confirmDialog.open
        (
            'Restore Code Synchronization',

            'Are you sure you want to restore the most recently deleted code synchronization record.',

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
                ?
                'Backend'
                :
                'Frontend';


        this.toast.warning
        (
            'Not Available',

            `Restore for Code Synchronization (${synchronizationType}) is not implemented yet.`
        );
    }



    //===========================================================
    // Initialize Database
    //===========================================================

    initializeDatabase
    (
        item:
            CodeSynchronization
    ):
        void
    {
        if
        (
            !item
            ||
            item.id <= 0
            ||
            this.selectedTab !== 'backend'
        )
        {
            return;
        }


        if
        (
            !this.isDatabaseCreated(item)
        )
        {
            return;
        }


        this.confirmDialog.open
        (
            'Initialize Database',

            `Are you sure you want to initialize the database for "${item.submenuName}"?`,

            () =>
            {
                this.startDatabaseInitialize(
                    item
                );
            },

            'Initialize',

            'Cancel',

            'primary'
        );
    }



    //===========================================================
    // Start Database Initialize
    //===========================================================

    private startDatabaseInitialize
    (
        item:
            CodeSynchronization
    ):
        void
    {
        this.progressDialog.show
        (
            'Initialize Database',

            'Starting database initialization.'
        );


        this.progressDialog.update
        (
            30,

            'Checking database initialization state.'
        );


        setTimeout(
            () =>
            {
                this.progressDialog.update
                (
                    60,

                    'Applying database initialization.'
                );
            },

            500
        );


        setTimeout(
            () =>
            {
                this.codeSynchronizationService

                    .initializeDatabase(
                        item.id
                    )

                    .subscribe(
                    {
                        next:
                        (
                            response
                        ) =>
                        {
                            const message =
                                response?.message
                                ??
                                'Database initialization completed successfully.';


                            if
                            (
                                response?.success === false
                            )
                            {
                                this.progressDialog.close();


                                this.toast.error
                                (
                                    'Database Initialization Failed',

                                    message
                                );


                                this.cdr.detectChanges();


                                return;
                            }


                            this.setDatabaseCreated(
                                item,

                                true
                            );


                            this.progressDialog.update
                            (
                                100,

                                message
                            );


                            setTimeout(
                                () =>
                                {
                                    this.progressDialog.close();


                                    this.toast.success
                                    (
                                        'Database Initialized',

                                        message
                                    );


                                    this.loadCodeSynchronizations();


                                    this.cdr.detectChanges();
                                },

                                300
                            );
                        },


                        error:
                        (
                            error
                        ) =>
                        {
                            console.error(
                                'Database Initialization Failed',

                                error
                            );


                            this.progressDialog.close();


                            this.toast.error
                            (
                                'Database Initialization Failed',

                                this.getErrorMessage(
                                    error,

                                    'Failed to initialize the database.'
                                )
                            );


                            this.cdr.detectChanges();
                        }
                    });
            },

            1000
        );
    }



    //===========================================================
    // Backend Rebuild
    //===========================================================

    rebuildBackend():
        void
    {
        if
        (
            this.selectedTab !== 'backend'
        )
        {
            return;
        }


        this.progressDialog.show
        (
            'Backend Rebuild',

            'Starting backend rebuild.'
        );


        this.progressDialog.update
        (
            20,

            'Preparing backend rebuild.'
        );


        this.codeSynchronizationService

            .rebuildBackend()

            .subscribe(
            {
                next:() =>
                {
                    this.progressDialog.update
                    (
                        100,

                        'Backend rebuild completed.'
                    );


                    setTimeout(
                        () =>
                        {
                            this.progressDialog.close();


                            this.toast.success
                            (
                                'Backend Rebuild',

                                'Backend rebuild completed successfully.'
                            );


                            this.loadCodeSynchronizations();


                            this.cdr.detectChanges();
                        },

                        300
                    );
                },


                error:
                (
                    error
                ) =>
                {
                    console.error(
                        'Backend Rebuild Failed',

                        error
                    );


                    this.progressDialog.close();


                    this.toast.error
                    (
                        'Backend Rebuild Failed',

                        this.getErrorMessage(
                            error,

                            'Backend rebuild failed.'
                        )
                    );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Frontend Rebuild
    //===========================================================

    rebuildFrontend():
        void
    {
        if
        (
            this.selectedTab !== 'frontend'
        )
        {
            return;
        }


        this.progressDialog.show
        (
            'Frontend Rebuild',

            'Starting frontend rebuild.'
        );


        this.progressDialog.update
        (
            20,

            'Preparing frontend rebuild.'
        );


        this.codeSynchronizationService

            .rebuildFrontend()

            .subscribe(
            {
                next:() =>
                {
                    this.progressDialog.update
                    (
                        100,

                        'Frontend rebuild completed.'
                    );


                    setTimeout(
                        () =>
                        {
                            this.progressDialog.close();


                            this.toast.success
                            (
                                'Frontend Rebuild',

                                'Frontend rebuild completed successfully.'
                            );


                            this.loadCodeSynchronizations();


                            this.cdr.detectChanges();
                        },

                        300
                    );
                },


                error:
                (
                    error
                ) =>
                {
                    console.error(
                        'Frontend Rebuild Failed',

                        error
                    );


                    this.progressDialog.close();


                    this.toast.error
                    (
                        'Frontend Rebuild Failed',

                        this.getErrorMessage(
                            error,

                            'Frontend rebuild failed.'
                        )
                    );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // History
    //===========================================================

    openHistory():
        void
    {
        this.historyOpened =
            true;


        this.codeSynchronizationService

            .getHistory()

            .subscribe(
            {
                next:
                (
                    response:
                        any[]
                ) =>
                {
                    this.historyItems =
                        response
                        ??
                        [];


                    this.cdr.detectChanges();
                },


                error:
                (
                    error
                ) =>
                {
                    console.error(
                        'History Load Failed',

                        error
                    );


                    this.historyItems =
                    [];


                    this.toast.error(
                        'History',

                        this.getErrorMessage(
                            error,

                            'Unable to load code synchronization history.'
                        )
                    );


                    this.cdr.detectChanges();
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


        this.cdr.detectChanges();
    }



    //===========================================================
    // Load Backend Registration Unlock State
    //===========================================================

    private loadBackendRegistrationUnlockState():
        void
    {
        try
        {
            this.backendRegistrationUnlocked =
                localStorage.getItem(
                    this.backendRegistrationUnlockStorageKey
                )
                ===
                'true';
        }
        catch
        {
            this.backendRegistrationUnlocked =
                false;
        }
    }



    //===========================================================
    // Set Migration State
    //
    // Retained only for compatibility with the existing
    // component state.
    //===========================================================

    private setMigrationCreated
    (
        item:
            CodeSynchronization,

        created:
            boolean
    ):
        void
    {
        if
        (
            !item
            ||
            item.id <= 0
        )
        {
            return;
        }


        this.migrationCreatedState.set(
            item.id,

            created
        );


        item.migrationCreated =
            created;


        this.applyFilters();

        this.updatePagination();

        this.cdr.detectChanges();
    }



    //===========================================================
    // Is Migration Created
    //===========================================================

    isMigrationCreated
    (
        item:
            CodeSynchronization
    ):
        boolean
    {
        if
        (
            !item
            ||
            item.id <= 0
        )
        {
            return false;
        }


        if
        (
            this.migrationCreatedState.has(
                item.id
            )
        )
        {
            return this.migrationCreatedState.get(
                    item.id
                )
                ===
                true;
        }


        return item.migrationCreated === true;
    }



    //===========================================================
    // Get Serial Number
    //===========================================================

    getSerialNumber
    (
        index:
            number
    ):
        number
    {
        return (
            (
                this.currentPage -
                1
            ) *
            this.pageSize
        ) +
        index +
        1;
    }



    //===========================================================
    // Format Date
    //===========================================================

    formatDate
    (
        value:
            string | Date | null | undefined
    ):
        string
    {
        if
        (
            !value
        )
        {
            return '--';
        }


        const date =
            value instanceof Date
                ?
                value
                :
                new Date(value);


        if
        (
            Number.isNaN(
                date.getTime()
            )
        )
        {
            return '--';
        }


        return date.toLocaleString();
    }



    //===========================================================
    // Get Operation Label
    //===========================================================

    getCodeOperation
    (
        item:
            CodeSynchronization
    ):
        string
    {
        return this.isSynchronized(item)
            ?
            'Rollback'
            :
            'Synchronize';
    }



    //===========================================================
    // Get Database Operation Label
    //===========================================================

    getDatabaseOperation
    (
        item:
            CodeSynchronization
    ):
        string
    {
        return this.isDatabaseCreated(item)
            ?
            'Remove'
            :
            'Create';
    }



    //===========================================================
    // Get Error Message
    //===========================================================
    //
    // Prevents backend error objects from being passed directly
    // to the toast component and appearing as "[object Object]".
    //===========================================================

    private getErrorMessage
    (
        error:
            any,

        fallback:
            string
    ):
        string
    {
        if
        (
            typeof error?.error === 'string'
        )
        {
            return error.error;
        }


        const responseError =
            error?.error;


        if
        (
            typeof responseError?.message === 'string'
            &&
            responseError.message.trim()
        )
        {
            return responseError.message;
        }


        if
        (
            typeof responseError?.detail === 'string'
            &&
            responseError.detail.trim()
        )
        {
            return responseError.detail;
        }


        if
        (
            typeof responseError?.title === 'string'
            &&
            responseError.title.trim()
        )
        {
            return responseError.title;
        }


        const validationErrors =
            responseError?.errors;


        if
        (
            validationErrors
            &&
            typeof validationErrors === 'object'
        )
        {
            for
            (
                const key of Object.keys(
                    validationErrors
                )
            )
            {
                const messages =
                    validationErrors[key];


                if
                (
                    Array.isArray(messages)
                )
                {
                    const message =
                        messages.find(
                            (
                                value
                            ) =>
                                typeof value === 'string'
                                &&
                                value.trim()
                        );


                    if
                    (
                        message
                    )
                    {
                        return message;
                    }
                }


                if
                (
                    typeof messages === 'string'
                    &&
                    messages.trim()
                )
                {
                    return messages;
                }
            }
        }


        if
        (
            typeof error?.message === 'string'
            &&
            error.message.trim()
        )
        {
            return error.message;
        }


        return fallback;
    }



    //===========================================================
    // Navigation
    //===========================================================

    edit
    (
        item:
            CodeSynchronization
    ):
        void
    {
        if
        (
            !item
            ||
            item.id <= 0
        )
        {
            return;
        }


        this.router.navigate(
        [
            '/infrastructure-control/development-management/code-synchronization/form',

            item.id
        ]);
    }

}