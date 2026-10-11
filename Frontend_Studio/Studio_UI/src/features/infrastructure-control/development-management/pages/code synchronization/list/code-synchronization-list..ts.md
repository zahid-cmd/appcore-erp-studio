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
    CodeSynchronizationService
}
from
'../../../services/code-synchronization.service';

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


    selectedCodeSynchronization:
        CodeSynchronization | null =
        null;



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
            }
        ];


        //=======================================================
        // Backend Code Synchronization ID
        //=======================================================

        if
        (
            this.selectedTab === 'backend'
        )
        {
            commonColumns.push(
            {
                header:'ID',

                field:'id',

                width:'5%',

                align:'center'
            });
        }


        //=======================================================
        // Navigation Columns
        //=======================================================

        commonColumns.push(
        {
            header:'Module',

            field:'moduleName',

            width:
                this.selectedTab === 'backend'
                    ? '10%'
                    : '11%',

            align:'left'
        },

        {
            header:'Menu',

            field:'menuName',

            width:
                this.selectedTab === 'backend'
                    ? '12%'
                    : '13%',

            align:'left'
        },

        {
            header:'Submenu',

            field:'submenuName',

            width:
                this.selectedTab === 'backend'
                    ? '12%'
                    : '15%',

            align:'left'
        },

        {
            header:'Last Code Sync',

            field:'lastSynchronizedDate',

            width:
                this.selectedTab === 'backend'
                    ? '13%'
                    : '15%',

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


        //=======================================================
        // Backend Only
        //=======================================================

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


        //=======================================================
        // Common Status
        //=======================================================

        commonColumns.push(
        {
            header:'Status',

            field:'status',

            type:'status',

            width:
                this.selectedTab === 'backend'
                    ? '7%'
                    : '15%',

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
    // Synchronization State Helpers
    //===========================================================

    isSynchronized
    (
        item:CodeSynchronization
    ):
        boolean
    {
        return (
            item?.status
                ?.trim()
                .toLowerCase()
            ===
            'synchronized'
        );
    }



    //===========================================================
    // Registration State
    //===========================================================

    isRegistered
    (
        item:CodeSynchronization
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
    // Migration State
    //
    // NEUTRALIZED:
    //
    // Migration Engine is no longer executed by this page.
    //
    // The state helper remains temporarily so the existing
    // template/model structure does not need to be changed in
    // this neutralization step.
    //===========================================================

    isMigrationCreated
    (
        item:CodeSynchronization
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
            return (
                this.migrationCreatedState.get(
                    item.id
                )
                ===
                true
            );
        }


        return (
            item?.migrationCreated === true
        );
    }



    //===========================================================
    // Set Migration State
    //
    // NEUTRALIZED:
    //
    // No frontend operation calls this method anymore.
    // It remains only for temporary compatibility with the
    // existing component state.
    //===========================================================

    private setMigrationCreated
    (
        item:CodeSynchronization,

        created:boolean
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


        const synchronization =
            this.synchronizations.find(
                current =>
                    current.id === item.id
            );


        if
        (
            synchronization
        )
        {
            synchronization.migrationCreated =
                created;
        }


        this.applyFilters();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Database Created State
    //
    // IMPORTANT:
    //
    // dbStatus represents BACKEND REGISTRATION.
    //
    // databaseCreated represents the actual DATABASE TABLE.
    //
    // The Database Engine updates this state after a successful
    // database create or remove operation.
    //===========================================================

    isDatabaseCreated
    (
        item:CodeSynchronization
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
            return (
                this.databaseCreatedState.get(
                    item.id
                )
                ===
                true
            );
        }


        //=======================================================
        // RESTORE DATABASE STATE FOR THIS SYNCHRONIZATION ID
        //=======================================================

        try
        {
            const storedState =
                localStorage.getItem(
                    `${this.databaseCreatedStorageKey}_${item.id}`
                );


            if
            (
                storedState ===
                'true'
            )
            {
                this.databaseCreatedState.set(
                    item.id,

                    true
                );


                return true;
            }


            if
            (
                storedState ===
                'false'
            )
            {
                this.databaseCreatedState.set(
                    item.id,

                    false
                );


                return false;
            }
        }
        catch
        {
            // Ignore browser storage errors.
        }


        return (
            item?.databaseCreated === true
        );
    }



    //===========================================================
    // Set Database Created State
    //
    // Updates the frontend database state after the backend
    // database create/remove operation succeeds.
    //===========================================================

    private setDatabaseCreated
    (
        item:CodeSynchronization,

        created:boolean
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


        try
        {
            localStorage.setItem(
                `${this.databaseCreatedStorageKey}_${item.id}`,

                created
                    ? 'true'
                    : 'false'
            );
        }
        catch
        {
            // Ignore browser storage errors.
        }


        item.databaseCreated =
            created;


        const synchronization =
            this.synchronizations.find(
                current =>
                    current.id === item.id
            );


        if
        (
            synchronization
        )
        {
            synchronization.databaseCreated =
                created;
        }


        this.applyFilters();


        this.updatePagination();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Database Ready State
    //
    // A synchronized and registered backend is eligible for
    // database operations.
    //===========================================================

    private isDatabaseReady
    (
        item:CodeSynchronization
    ):
        boolean
    {
        return (
            this.isSynchronized(item)
            &&
            this.isRegistered(item)
        );
    }



    //===========================================================
    // Database State
    //===========================================================

    private readonly databaseCreatedState =
        new Map<number, boolean>();


    private readonly databaseCreatedStorageKey =
        'AppCoreERP_DatabaseCreated';



    //===========================================================
    // Migration State
    //===========================================================

    private readonly migrationCreatedState =
        new Map<number, boolean>();



    //===========================================================
    // Global Registration Unlock State
    //
    // This state remains part of the Backend Registration
    // workflow.
    //===========================================================

    private readonly backendRegistrationUnlockStorageKey =
        'AppCoreERP_BackendRegistrationUnlocked';


    private backendRegistrationUnlocked =
        false;



    //===========================================================
    // Any Pending Backend Registration Exists
    //
    // The existing registration lock is preserved.
    //===========================================================

    private hasAnyBackendRegistration():
        boolean
    {
        try
        {
            const persistedUnlockState =
                localStorage.getItem(
                    this.backendRegistrationUnlockStorageKey
                );


            if
            (
                persistedUnlockState ===
                'true'
            )
            {
                this.backendRegistrationUnlocked =
                    true;


                return false;
            }


            if
            (
                persistedUnlockState ===
                'false'
            )
            {
                this.backendRegistrationUnlocked =
                    false;
            }
        }
        catch
        {
            // Continue with runtime state.
        }


        if
        (
            this.backendRegistrationUnlocked
        )
        {
            return false;
        }


        return this.synchronizations.some(
            item =>
                this.isRegistered(item)
                &&
                !this.isDatabaseCreated(item)
        );
    }



    //===========================================================
    // Registration Enabled
    //===========================================================

    canRegister
    (
        item:CodeSynchronization
    ):
        boolean
    {
        if
        (
            this.selectedTab !== 'backend'
        )
        {
            return false;
        }


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
            !this.isSynchronized(item)
        )
        {
            return false;
        }


        if
        (
            this.isRegistered(item)
        )
        {
            return false;
        }


        if
        (
            this.isDatabaseCreated(item)
        )
        {
            return false;
        }


        if
        (
            this.hasAnyBackendRegistration()
        )
        {
            return false;
        }


        return true;
    }



    //===========================================================
    // Deregistration Enabled
    //
    // IMPORTANT:
    //
    // Migration is no longer part of the deregistration
    // prerequisite because the Migration Engine has been
    // neutralized.
    //
    // Database table state remains a protection until the new
    // Database Engine is implemented.
    //===========================================================

    canDeregister
    (
        item:CodeSynchronization
    ):
        boolean
    {
        if
        (
            this.selectedTab !== 'backend'
        )
        {
            return false;
        }


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
            !this.isSynchronized(item)
        )
        {
            return false;
        }


        if
        (
            !this.isRegistered(item)
        )
        {
            return false;
        }


        //=======================================================
        // Database table must NOT exist.
        //
        // The old Database Engine has been neutralized.
        // This protection remains until the new Database Engine
        // is implemented.
        //=======================================================

        if
        (
            this.isDatabaseCreated(item)
        )
        {
            return false;
        }


        return true;
    }



    //===========================================================
    // Registration Control Enabled
    //===========================================================

    canRegistrationAction
    (
        item:CodeSynchronization
    ):
        boolean
    {
        if
        (
            this.selectedTab !== 'backend'
        )
        {
            return false;
        }


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
            this.isRegistered(item)
        )
        {
            return this.canDeregister(item);
        }


        return this.canRegister(item);
    }



    //===========================================================
    // Database Control Enabled
    //===========================================================

    canDatabaseAction
    (
        item:CodeSynchronization
    ):
        boolean
    {
        if
        (
            this.selectedTab !== 'backend'
        )
        {
            return false;
        }


        return (
            this.canCreateDatabase(item)
            ||
            this.canRemoveDatabase(item)
        );
    }



    //===========================================================
    // Can Create Database
    //===========================================================

    private canCreateDatabase
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
            this.selectedTab !== 'backend'
        )
        {
            return false;
        }


        //=======================================================
        // Code Must Be Synchronized
        //=======================================================

        if
        (
            !this.isSynchronized(item)
        )
        {
            return false;
        }


        //=======================================================
        // Backend Must Be Registered
        //=======================================================

        if
        (
            !this.isRegistered(item)
        )
        {
            return false;
        }


        //=======================================================
        // Database Table Must Not Exist
        //=======================================================

        if
        (
            this.isDatabaseCreated(item)
        )
        {
            return false;
        }


        return true;
    }



    //===========================================================
    // Can Remove Database
    //===========================================================

    private canRemoveDatabase
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
            this.selectedTab !== 'backend'
        )
        {
            return false;
        }


        //=======================================================
        // Code Must Be Synchronized
        //=======================================================

        if
        (
            !this.isSynchronized(item)
        )
        {
            return false;
        }


        //=======================================================
        // Backend Must Be Registered
        //=======================================================

        if
        (
            !this.isRegistered(item)
        )
        {
            return false;
        }


        //=======================================================
        // Database Table Must Exist
        //=======================================================

        if
        (
            !this.isDatabaseCreated(item)
        )
        {
            return false;
        }


        return true;
    }



    //===========================================================
    // Database Action Disabled
    //===========================================================

    isDatabaseDisabled
    (
        item:CodeSynchronization
    ):
        boolean
    {
        return !this.canDatabaseAction(item);
    }



    //===========================================================
    // Migration Control Enabled
    //
    // NEUTRALIZED:
    //
    // The EF Migration Engine is no longer available.
    //===========================================================

    canMigrationAction
    (
        item:CodeSynchronization
    ):
        boolean
    {
        return false;
    }



    //===========================================================
    // Migration Create Enabled
    //===========================================================

    canCreateMigration
    (
        item:CodeSynchronization
    ):
        boolean
    {
        return false;
    }



    //===========================================================
    // Migration Remove Enabled
    //===========================================================

    canRemoveMigration
    (
        item:CodeSynchronization
    ):
        boolean
    {
        return false;
    }



    //===========================================================
    // Migration Action Disabled
    //===========================================================

    isMigrationDisabled
    (
        item:CodeSynchronization
    ):
        boolean
    {
        return true;
    }



    //===========================================================
    // Rollback Enabled
    //===========================================================

    canRollback
    (
        item:CodeSynchronization
    ):
        boolean
    {
        if
        (
            !this.isSynchronized(item)
        )
        {
            return false;
        }


        if
        (
            this.selectedTab === 'backend'
            &&
            (
                this.isRegistered(item)
                ||
                this.isDatabaseCreated(item)
            )
        )
        {
            return false;
        }


        return true;
    }



    //===========================================================
    // Operation Enabled
    //===========================================================

    canOperate
    (
        item:CodeSynchronization
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
            this.isSynchronized(item)
        )
        {
            return this.canRollback(item);
        }


        return true;
    }



    //===========================================================
    // Operation Disabled
    //===========================================================

    isOperationDisabled
    (
        item:CodeSynchronization
    ):
        boolean
    {
        return !this.canOperate(item);
    }



    //===========================================================
    // Registration Disabled
    //===========================================================

    isRegistrationDisabled
    (
        item:CodeSynchronization
    ):
        boolean
    {
        return !this.canRegistrationAction(item);
    }



    //===========================================================
    // Prepare Table Rows
    //===========================================================

    private prepareTableRows
    (
        rows:CodeSynchronization[]
    )
    {
        return rows.map(
            item =>
            {
                const row:any =
                    {
                        ...item
                    };


                row.operationDisabled =
                    this.isOperationDisabled(item);


                row.registrationDisabled =
                    this.isRegistrationDisabled(item);


                row.registrationRegistered =
                    this.isRegistered(item);


                row.databaseRegistered =
                    this.isDatabaseCreated(item);


                row.databaseCreated =
                    this.isDatabaseCreated(item);


                //===================================================
                // Database operations are neutralized.
                //===================================================

                row.databaseCreateAllowed =
                    this.canCreateDatabase(item);


                row.databaseRemoveAllowed =
                    this.canRemoveDatabase(item);


                //===================================================
                // Migration operations are neutralized.
                //===================================================

                row.migrationDisabled =
                    true;


                row.migrationCreated =
                    this.isMigrationCreated(item);


                row.migrationCreateAllowed =
                    false;


                row.migrationRemoveAllowed =
                    false;


                row.rollbackAllowed =
                    this.canRollback(item);


                row.synchronizationAllowed =
                    !this.isSynchronized(item);


                return row;
            }
        );
    }



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
            url.includes(
                '/code-synchronization/backend'
            )
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


        this.loadModules();

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
            .then(
                () =>
                {
                    this.loadModules();

                    this.loadCodeSynchronizations();
                }
            );


            return;
        }


        this.router.navigate(
        [
            '/infrastructure-control/development-management/code-synchronization/frontend'
        ])
        .then(
            () =>
            {
                this.loadModules();

                this.loadCodeSynchronizations();
            }
        );
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
                                    item.status?.toLowerCase()
                                    ===
                                    'synchronized'

                                        ? 'Successful'

                                        :
                                        !item.buildStatus
                                        ||
                                        item.buildStatus
                                            .toString()
                                            .trim()
                                            .toLowerCase()
                                        ===
                                        'n/a'

                                            ? 'Pending'

                                            :
                                            item.buildStatus,

                                dbStatus:
                                    item.dbStatus,

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
    // Rebuild
    //===========================================================

    rebuild():
        void
    {
        if
        (
            this.selectedTab === 'backend'
        )
        {
            this.rebuildBackend();

            return;
        }


        this.rebuildFrontend();
    }



    //===========================================================
    // Frontend Rebuild
    //===========================================================

    rebuildFrontend():
        void
    {
        this.progressDialog.show
        (
            'Frontend Rebuild',

            'Restarting Angular development server.'
        );


        this.progressDialog.update
        (
            20,

            'Stopping Angular development server.'
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

                                'Angular development server restarted successfully.'
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
                        'Frontend Rebuild Failed',

                        error
                    );


                    this.progressDialog.close();


                    this.toast.error
                    (
                        'Frontend Rebuild Failed',

                        error?.error?.message
                        ??
                        error?.error
                        ??
                        'Failed to rebuild the frontend.'
                    );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Backend Rebuild
    //===========================================================

    rebuildBackend():
        void
    {
        this.progressDialog.show
        (
            'Backend Rebuild',

            'Rebuilding backend project.'
        );


        this.progressDialog.update
        (
            20,

            'Starting backend rebuild.'
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

                                'Backend project rebuilt successfully.'
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
                        'Backend Rebuild Failed',

                        error
                    );


                    this.progressDialog.close();


                    this.toast.error
                    (
                        'Backend Rebuild Failed',

                        error?.error?.message
                        ??
                        error?.error
                        ??
                        'Failed to rebuild the backend.'
                    );


                    this.cdr.detectChanges();
                }
            });
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
            this.prepareTableRows(
                this.filteredSynchronizations.slice(
                    start,

                    start + this.pageSize
                )
            );
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


        this.codeSynchronizationService

            .getFiles(
                item.id
            )

            .subscribe(
            {
                next:
                (
                    response:any[]
                ) =>
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
                                    ''
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

                        'Unable to load generated code files.'
                    );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Restore All From Code Viewer
    //===========================================================

    onCodeViewerRestoreAll():
        void
    {
        this.restoreCodeViewer();
    }



    //===========================================================
    // Restore File From Code Viewer
    //===========================================================

    onCodeViewerRestoreFile
    (
        file:CodeViewerFile
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

                                error?.error
                                ??
                                'Failed to restore the selected code file.'
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
        item:CodeSynchronization
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

                                error?.error
                                ??
                                'Failed to restore modified generated files.'
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
            this.isSynchronized(item);


        //=======================================================
        // Rollback
        //=======================================================

        if
        (
            isSynchronized
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


        //=======================================================
        // Synchronize
        //=======================================================

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

                                error?.error
                                ??
                                'Failed to synchronize code.'
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
        item:CodeSynchronization
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

                                error?.error
                                ??
                                'Failed to roll back code.'
                            );


                            this.cdr.detectChanges();
                        }
                    });
            },

            1000
        );
    }



    //===========================================================
    // Registration / Unregistration
    //===========================================================

    register
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


        if
        (
            this.selectedTab !== 'backend'
        )
        {
            return;
        }


        if
        (
            !this.isSynchronized(item)
        )
        {
            return;
        }


        //=======================================================
        // Determine the operation from THIS ROW only.
        //=======================================================

        if
        (
            this.isRegistered(item)
        )
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

                `Are you sure you want to unregister the backend for "${item.submenuName}" ?`,

                () =>
                {
                    this.startUnregistration(
                        item
                    );
                },

                'Unregister',

                'Cancel',

                'danger'
            );


            return;
        }


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

            `Are you sure you want to register the backend for "${item.submenuName}" ?`,

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
    }



    //===========================================================
    // Start Backend Registration
    //===========================================================

    private startRegistration
    (
        item:CodeSynchronization
    ):
        void
    {
        if
        (
            !this.canRegister(item)
        )
        {
            return;
        }


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

                    'Registering generated backend structure.'
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
                            this.setBackendRegistrationUnlocked(
                                false
                            );


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

                                error?.error
                                ??
                                'Failed to register backend.'
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
        item:CodeSynchronization
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

                                error?.error?.message
                                ??
                                error?.error
                                ??
                                'Failed to unregister backend.'
                            );


                            this.cdr.detectChanges();
                        }
                    });
            },

            1000
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


        //=======================================================
        // REMOVE DATABASE
        //
        // Database table already exists.
        // The same database button now performs removal.
        //=======================================================

        if
        (
            this.isDatabaseCreated(
                item
            )
        )
        {
            if
            (
                !this.canRemoveDatabase(
                    item
                )
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


        //=======================================================
        // CREATE DATABASE
        //
        // Database table does not exist.
        // The same database button performs creation.
        //=======================================================

        if
        (
            !this.canCreateDatabase(
                item
            )
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

                    'Preparing backend database operation.'
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
                this.executeDatabaseCreate(item);
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
                    response:any
                ) =>
                {
                    this.handleDatabaseCreateSuccess(
                        item,

                        response
                    );
                },


                error:
                (
                    error:any
                ) =>
                {
                    this.handleDatabaseCreateError(
                        error
                    );
                }
            });
    }



    //===========================================================
    // Handle Database Create Success
    //===========================================================

    private handleDatabaseCreateSuccess
    (
        item:
            CodeSynchronization,

        response:any
    ):
        void
    {
        const message =
            typeof response === 'string'
                ?
                response
                :
                response?.message
                ??
                'Database table created successfully.';


        if
        (
            response
            &&
            typeof response !== 'string'
            &&
            response.success === false
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


        //=======================================================
        // Database Creation Succeeded
        //=======================================================

        this.setDatabaseCreated
        (
            item,

            true
        );


        //=======================================================
        // RELEASE GLOBAL REGISTRATION LOCK
        //=======================================================

        this.setBackendRegistrationUnlocked
        (
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
    }



    //===========================================================
    // Handle Database Create Error
    //===========================================================

    private handleDatabaseCreateError
    (
        error:any
    ):
        void
    {
        console.error(
            'Database Creation Failed',

            error
        );


        this.progressDialog.close();


        this.toast.error
        (
            'Database Creation Failed',

            error?.error?.message
            ??
            error?.error
            ??
            'Failed to create the database table.'
        );


        this.cdr.detectChanges();
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
                this.executeDatabaseRemove(item);
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
                    response:any
                ) =>
                {
                    this.handleDatabaseRemoveSuccess(
                        item,

                        response
                    );
                },


                error:
                (
                    error:any
                ) =>
                {
                    this.handleDatabaseRemoveError(
                        error
                    );
                }
            });
    }



    //===========================================================
    // Handle Database Remove Success
    //===========================================================

    private handleDatabaseRemoveSuccess
    (
        item:
            CodeSynchronization,

        response:any
    ):
        void
    {
        const message =
            typeof response === 'string'
                ?
                response
                :
                response?.message
                ??
                'Database table removed successfully.';


        if
        (
            response
            &&
            typeof response !== 'string'
            &&
            response.success === false
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


        //=======================================================
        // Database Removal Succeeded
        //=======================================================

        this.setDatabaseCreated
        (
            item,

            false
        );


        //=======================================================
        // RE-LOCK GLOBAL REGISTRATION
        //
        // The backend remains registered while its database
        // table has been removed.
        //=======================================================

        this.setBackendRegistrationUnlocked(
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
    }



    //===========================================================
    // Handle Database Remove Error
    //===========================================================

    private handleDatabaseRemoveError
    (
        error:any
    ):
        void
    {
        console.error(
            'Database Removal Failed',

            error
        );


        this.progressDialog.close();


        this.toast.error
        (
            'Database Removal Failed',

            error?.error?.message
            ??
            error?.error
            ??
            'Failed to remove the database table.'
        );


        this.cdr.detectChanges();
    }



    //===========================================================
    // Set Global Backend Registration Unlock State
    //
    // This method remains part of the existing Backend
    // Registration workflow.
    //
    // It is no longer changed by Database Create / Remove.
    //===========================================================

    private setBackendRegistrationUnlocked
    (
        unlocked:boolean
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
                    ? 'true'
                    : 'false'
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
    // The old EF Migration Engine is completely disconnected
    // from the frontend.
    //
    // The method is retained only because the existing HTML may
    // still bind to migration().
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
    //
    // NEUTRALIZED
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
    //
    // NEUTRALIZED
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
                next:
                (
                    response:any[]
                ) =>
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


                error:
                (
                    error:any
                ) =>
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