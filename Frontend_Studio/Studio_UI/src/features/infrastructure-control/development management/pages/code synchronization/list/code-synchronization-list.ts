//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    inject,
    ChangeDetectorRef,
    ViewChild
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
    CodeSynchronizationService
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
implements OnInit
{

    //===========================================================
    // Code Viewer Reference
    //===========================================================

    @ViewChild(CodeViewerComponent)
    private codeViewer:
        CodeViewerComponent | undefined;



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

    synchronizations: CodeSynchronization[] =
    [];


    filteredSynchronizations: CodeSynchronization[] =
    [];


    pagedSynchronizations: CodeSynchronization[] =
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
    // Code Viewer
    //===========================================================

    codeViewerOpened:
        boolean =
        false;


    codeViewerFiles:
        CodeViewerFile[] =
        [];


    selectedCodeSynchronization:
        CodeSynchronization | null =
        null;



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


        this.selectedModuleId =
            0;


        this.selectedMenuId =
            0;


        this.menus =
        [];


        this.selectedStatus =
            '';


        this.currentPage =
            1;


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
                next:(response:NavigationMenu[]) =>
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
                next:(response:CodeSynchronization[]) =>
                {
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


        this.filteredSynchronizations.sort(
            (a,b) =>
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
        item:CodeSynchronization
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


        this.loadCodeViewerFiles(
            item.id
        );
    }



    //===========================================================
    // Load Code Viewer Files
    //===========================================================

    private loadCodeViewerFiles
    (
        id:number
    ):
        void
    {
        this.codeSynchronizationService

            .getFiles(
                id
            )

            .subscribe(
            {
                next:(response:any[]) =>
                {
                    this.codeViewerFiles =
                        response.map(
                            file =>
                            ({
                                fileName:
                                    file.fileName
                                    ??
                                    file.name
                                    ??
                                    file.path
                                    ??
                                    '--',

                                status:
                                    file.isModified === true
                                    ||
                                    (
                                        (
                                            file.status
                                            ??
                                            ''
                                        )
                                        .toString()
                                        .toLowerCase()
                                        ===
                                        'modified'
                                    )
                                        ?
                                        'Modified'
                                        :
                                        'Clean',

                                lastModified:
                                    file.lastModified
                                    ??
                                    file.modifiedDate
                                    ??
                                    file.lastWriteTime
                                    ??
                                    file.lastWriteTimeUtc
                                    ??
                                    null
                            })
                        );


                    this.cdr.detectChanges();
                },


                error:(error) =>
                {
                    console.error(
                        'Generated Code Files Load Failed',

                        error
                    );


                    this.codeViewerFiles =
                    [];


                    this.toast.error(
                        'Code Viewer',

                        'Unable to load generated code files.'
                    );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Close Code Viewer
    //===========================================================

    closeCodeViewer():
        void
    {
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
    //
    // This is FILE RESTORE.
    //
    // It does NOT call Code Synchronization Rollback.
    //
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
            !this.codeViewerFiles.some(
                file =>
                    file.status === 'Modified'
            )
        )
        {
            return;
        }


        this.confirmDialog.open
        (
            'Restore Modified Files',

            `Are you sure you want to restore all modified files for "${item.submenuName}" to their last synchronized state?`,

            () =>
            {
                this.startRestoreAllFiles(
                    item
                );
            },

            'Restore',

            'Cancel',

            'primary'
        );
    }



    //===========================================================
    // Start Restore All Files
    //===========================================================

    private startRestoreAllFiles
    (
        item:CodeSynchronization
    ):
        void
    {
        this.progressDialog.show
        (
            'Code Restore',

            'Starting file restore.'
        );


        this.progressDialog.update
        (
            20,

            'Checking modified files.'
        );


        setTimeout(
            () =>
            {
                this.progressDialog.update
                (
                    50,

                    'Restoring modified files to their last synchronized state.'
                );
            },

            300
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


                            //================================================
                            // COMPLETE CODE VIEWER RESTORE STATE
                            //================================================

                            this.codeViewer?.completeRestore();


                            setTimeout(
                                () =>
                                {
                                    this.progressDialog.close();


                                    this.loadCodeViewerFiles(
                                        item.id
                                    );


                                    this.toast.success
                                    (
                                        'Code Restore',

                                        `${item.submenuName} modified files were restored successfully.`
                                    );


                                    this.cdr.detectChanges();
                                },

                                300
                            );
                        },


                        error:(error) =>
                        {
                            console.error(
                                'Code Restore Failed',

                                error
                            );


                            //================================================
                            // RESET CODE VIEWER RESTORE STATE ON FAILURE
                            //================================================

                            this.codeViewer?.restoreFailed();


                            this.progressDialog.close();


                            this.toast.error
                            (
                                'Code Restore Failed',

                                this.getErrorMessage(
                                    error,

                                    'Failed to restore modified files.'
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
    // Restore Single File From Code Viewer
    //===========================================================
    //
    // This restores ONLY the selected file.
    //
    // It does NOT call Code Synchronization Rollback.
    //
    //===========================================================

    restoreCodeViewerFile
    (
        file:CodeViewerFile
    ):
        void
    {
        if
        (
            !this.selectedCodeSynchronization
        )
        {
            return;
        }


        if
        (
            file.status !== 'Modified'
        )
        {
            return;
        }


        const item =
            this.selectedCodeSynchronization;


        this.confirmDialog.open
        (
            'Restore File',

            `Are you sure you want to restore "${file.fileName}" to its last synchronized state?`,

            () =>
            {
                this.startRestoreFile(
                    item,

                    file
                );
            },

            'Restore',

            'Cancel',

            'primary'
        );
    }



    //===========================================================
    // Start Restore Single File
    //===========================================================

    private startRestoreFile
    (
        item:CodeSynchronization,

        file:CodeViewerFile
    ):
        void
    {
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
                    //================================================
                    // COMPLETE SINGLE FILE RESTORE STATE
                    //================================================

                    this.codeViewer?.completeFileRestore();


                    this.loadCodeViewerFiles(
                        item.id
                    );


                    this.toast.success
                    (
                        'Code Restore',

                        `${file.fileName} was restored successfully.`
                    );


                    this.cdr.detectChanges();
                },


                error:(error) =>
                {
                    console.error(
                        'File Restore Failed',

                        error
                    );


                    //================================================
                    // RESET SINGLE FILE RESTORE STATE ON FAILURE
                    //================================================

                    this.codeViewer?.fileRestoreFailed();


                    this.toast.error
                    (
                        'File Restore Failed',

                        this.getErrorMessage(
                            error,

                            `Failed to restore ${file.fileName}.`
                        )
                    );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Code Viewer Restore All Event
    //===========================================================

    onCodeViewerRestoreAll():
        void
    {
        this.restoreCodeViewer();
    }



    //===========================================================
    // Code Viewer Restore File Event
    //===========================================================

    onCodeViewerRestoreFile
    (
        file:CodeViewerFile
    ):
        void
    {
        this.restoreCodeViewerFile(
            file
        );
    }



    //===========================================================
    // Error Message
    //===========================================================

    private getErrorMessage
    (
        error:any,

        fallback:string
    ):
        string
    {
        if
        (
            typeof error === 'string'
        )
        {
            return error;
        }


        if
        (
            typeof error?.error === 'string'
        )
        {
            return error.error;
        }


        if
        (
            typeof error?.error?.message === 'string'
        )
        {
            return error.error.message;
        }


        if
        (
            typeof error?.message === 'string'
        )
        {
            return error.message;
        }


        return fallback;
    }



    //===========================================================
    // Synchronize / Rollback Code
    //===========================================================
    //
    // IMPORTANT:
    //
    // This remains the existing synchronization-level
    // Synchronize / Rollback operation.
    //
    // It is completely separate from Code Viewer Restore.
    //
    //===========================================================

    synchronize
    (
        item:CodeSynchronization
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


        const isSynchronized =
            item.status
                ?.toLowerCase()
                ===
            'synchronized';


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
        item:CodeSynchronization
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

                    .synchronize
                    (
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
                                },

                                300
                            );
                        },


                        error:(error) =>
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
                        }
                    });
            },

            1000
        );
    }



    //===========================================================
    // Start Rollback
    //===========================================================
    //
    // Existing synchronization rollback.
    //
    // DO NOT use this for Code Viewer Restore.
    //
    //===========================================================

    private startRollback
    (
        item:CodeSynchronization
    ):
        void
    {
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

                    .rollback
                    (
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
                                },

                                300
                            );
                        },


                        error:(error) =>
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

                                    'Failed to roll back code.'
                                )
                            );
                        }
                    });
            },

            1000
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
        this.codeSynchronizationService

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
                        'Code Synchronization History';


                    this.historyOpened =
                        true;


                    this.cdr.detectChanges();
                },


                error:(error:any) =>
                {
                    console.error(
                        'Code Synchronization History Load Failed',

                        error
                    );


                    this.toast.error(
                        'History',

                        'Failed to load code synchronization history.'
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