//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    ChangeDetectorRef,
    inject
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

import
{
    ActivatedRoute,
    Router
}
from '@angular/router';

import
{
    FormsModule
}
from '@angular/forms';


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
    SynchronizationWorkspaceFrontendComponent
}
from '../../../../../../shared/components/synchronization-workspace/frontend/synchronization-workspace-frontend';

import
{
    SynchronizationWorkspaceBackendComponent
}
from '../../../../../../shared/components/synchronization-workspace/backend/synchronization-workspace-backend';

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
    ConfirmDialogComponent
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';

import
{
    ConfirmDialogService
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';


//===============================================================
// Services
//===============================================================

import
{
    ProjectSynchronizationService
}
from '../../../services/project-synchronization.service';


//===============================================================
// Models
//===============================================================

import
{
    ProjectSynchronization
}
from '../../../model/project-synchronization.model';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:
        'app-project-synchronization',

    standalone:
        true,

    imports:
    [
        CommonModule,

        FormsModule,

        PageHeaderComponent,

        PageToolbarComponent,

        CommandCenterComponent,

        ControlTabsComponent,

        SearchDropdownComponent,

        SynchronizationWorkspaceFrontendComponent,

        SynchronizationWorkspaceBackendComponent,

        ToastComponent,

        ConfirmDialogComponent
    ],

    templateUrl:
        './project-synchronization-form.html',

    styleUrls:
    [
        './project-synchronization-form.css'
    ]
})


export class ProjectSynchronizationComponent
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(
            ActivatedRoute
        );

    private readonly router =
        inject(
            Router
        );

    private readonly projectSynchronizationService =
        inject(
            ProjectSynchronizationService
        );

    private readonly toast =
        inject(
            ToastService
        );

    private readonly confirmDialog =
        inject(
            ConfirmDialogService
        );

    private readonly cdr =
        inject(
            ChangeDetectorRef
        );


    //===========================================================
    // Mode
    //===========================================================

    mode:
        'add'
        | 'edit'
        | 'view' =
            'add';

    synchronizationId =
        0;

    //===========================================================
    // Page Header
    //===========================================================

    pageTitle =
        'Project Synchronization';

    //===========================================================
    // Entity
    //===========================================================

    entityName =
        'Project Synchronization';

    //===========================================================
    // Selected Tab
    //===========================================================

    selectedTab =
        'module';

    //===========================================================
    // Selected Synchronization Target
    //===========================================================

    selectedTarget =
        'frontend';

    //===========================================================
    // Synchronization Targets
    //===========================================================

    synchronizationTargets =
    [
        {
            value:'frontend',

            text:'Frontend'
        },

        {
            value:'backend',

            text:'Backend'
        }
    ];
    
    //===========================================================
    // Tabs
    //===========================================================

    tabs: ControlTab[] =
    [
        {
            id:'module',

            label:'Module'
        },

        {
            id:'menu',

            label:'Menu'
        },

        {
            id:'submenu',

            label:'Submenu'
        }
    ];

    //===========================================================
    // Status Dropdown
    //===========================================================

    statuses =
    [
        {
            value:true,

            text:'Active'
        },

        {
            value:false,

            text:'Inactive'
        }
    ];

    //===========================================================
    // Synchronization Levels
    //===========================================================

    synchronizationLevels =
    [
        {
            value:'module',
            text:'Module'
        },
        {
            value:'menu',
            text:'Menu'
        },
        {
            value:'submenu',
            text:'Submenu'
        }
    ];

    //===========================================================
    // Module Dropdown
    //===========================================================

    modules:any[] =
    [];

    //===========================================================
    // Menu Dropdown
    //===========================================================

    menus:any[] =
    [];

    //===========================================================
    // Submenu Dropdown
    //===========================================================

    submenus:any[] =
    [];

    //===========================================================
    // Frontend Workspace
    //===========================================================

    //-----------------------------------------------------------
    // Target Location
    //-----------------------------------------------------------

    frontendSolution =
        '';

    projectName =
        '';

    sourceFolder =
        '';

    featureFolder =
        '';

    //-----------------------------------------------------------
    // Standard Module Structure
    //-----------------------------------------------------------

    moduleFolder =
        '';

    modelFolder =
        '';

    pagesFolder =
        '';

    routesFolder =
        '';

    servicesFolder =
        '';

    //-----------------------------------------------------------
    // Application Registration
    //-----------------------------------------------------------

    routeFile =
        '';

    applicationRouteFile =
        '';

    routePath =
        '';

    //===========================================================
    // Backend Workspace
    //===========================================================

    //-----------------------------------------------------------
    // Backend Projects
    //-----------------------------------------------------------

    apiProject =
        '';

    applicationProject =
        '';

    domainProject =
        '';

    infrastructureProject =
        '';

    //-----------------------------------------------------------
    // Standard Folder Structure
    //-----------------------------------------------------------

    controllerFolder =
        '';

    dtoFolder =
        '';

    interfaceFolder =
        '';

    entityFolder =
        '';

    repositoryFolder =
        '';

    configurationFolder =
        '';

    //-----------------------------------------------------------
    // Registration & Database
    //-----------------------------------------------------------

    dependencyInjection =
        '';

    dbContext =
        '';

    programRegistration =
        '';

    migrationFolder =
        '';

    databaseProvider =
        '';

    //===========================================================
    // Model
    //===========================================================

    synchronization:
        ProjectSynchronization =
    {
        //=======================================================
        // Identity
        //=======================================================

        id:0,


        //=======================================================
        // Synchronization Level
        //=======================================================

        synchronizationLevel:'module',


        //=======================================================
        // Module
        //=======================================================

        moduleId:null,

        moduleCode:'',

        moduleName:'',


        //=======================================================
        // Menu
        //=======================================================

        menuId:null,

        menuCode:'',

        menuName:'',


        //=======================================================
        // Submenu
        //=======================================================

        submenuId:null,

        submenuCode:'',

        submenuName:'',


        //=======================================================
        // Synchronization
        //=======================================================

        synchronizationTarget:'',

        frontendStatus:'Pending',

        backendStatus:'Pending',

        remarks:'',


        //=======================================================
        // Frontend Configuration
        //=======================================================

        frontendSolution:'',

        frontendProject:'',

        frontendSourceFolder:'',

        frontendFeatureFolder:'',

        frontendModuleFolder:'',

        frontendModelFolder:'',

        frontendPagesFolder:'',

        frontendRoutesFolder:'',

        frontendServicesFolder:'',


        //=======================================================
        // Frontend Application Registration
        //=======================================================

        frontendModuleRouteFile:'',

        frontendParentRouteFile:'',

        frontendRoutePath:'',


        //=======================================================
        // Backend Configuration
        //=======================================================

        backendApiProject:'',

        backendApplicationProject:'',

        backendDomainProject:'',

        backendInfrastructureProject:'',

        backendControllerFolder:'',

        backendDtoFolder:'',

        backendInterfaceFolder:'',

        backendEntityFolder:'',

        backendRepositoryFolder:'',

        backendConfigurationFolder:'',

        backendDependencyInjectionFile:'',

        backendDbContextFile:'',

        backendProgramFile:'',

        backendMigrationFolder:'',

        databaseProvider:'',


        //=======================================================
        // Last Synchronization
        //=======================================================

        lastSynchronizedBy:null,

        lastSynchronizedDate:null,


        //=======================================================
        // Audit
        //=======================================================

        createdBy:0,

        createdDate:'',

        modifiedBy:null,

        modifiedDate:null,

        deletedBy:null,

        deletedDate:null,

        isDeleted:false
    };

    //===========================================================
    // Form State
    //===========================================================

    private originalSynchronization =
        '';

    hasChanges =
        false;


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


        this.synchronization.synchronizationLevel =
            tabId as
                'module'
                | 'menu'
                | 'submenu';


        this.checkForChanges();


        this.cdr.detectChanges();
    }

    //===========================================================
    // Track Form Changes
    //===========================================================

    checkForChanges():
        void
    {
        this.hasChanges =
            JSON.stringify(
                this.synchronization
            )
            !==
            this.originalSynchronization;
    }

    //===========================================================
    // Page Canvas Configuration
    //===========================================================

    readonly canvasConfig =
    {
        mode:'form',

        showHeader:false,

        showFooter:false,

        reserveFooterSpace:false,

        bodyScrollable:true,

        fixedHeight:true,

        visibleRows:10,

        rowHeight:32,

        headerHeight:36,

        footerHeight:56
    };

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.initializeMode();

        this.loadModules();
    }

    //===========================================================
    // Initialize Mode
    //===========================================================

    private initializeMode():
        void
    {
        const id =
            Number(
                this.route.snapshot.paramMap.get('id')
            );

        const url =
            this.router.url.toLowerCase();

        //=======================================================
        // Synchronization Level
        //=======================================================

        const level =
            this.route.snapshot.queryParamMap.get(
                'level'
            );

        if
        (
            level === 'module'
            ||
            level === 'menu'
            ||
            level === 'submenu'
        )
        {
            this.selectedTab =
                level;

            this.synchronization.synchronizationLevel =
                level;
        }

        //=======================================================
        // View Mode
        //=======================================================

        if (url.includes('/view/'))
        {
            this.mode =
                'view';
        }


        //=======================================================
        // Edit Mode
        //=======================================================

        else if (url.includes('/edit/'))
        {
            this.mode =
                'edit';
        }


        //=======================================================
        // Add Mode
        //=======================================================

        else
        {
            this.mode =
                'add';
        }


        //=======================================================
        // Edit / View
        //=======================================================

        if (id > 0)
        {
            this.synchronizationId =
                id;

            //===================================================
            // Wait Until Lookups Are Loaded
            //===================================================

            setTimeout(() =>
            {
                this.loadSynchronization();
            });

            return;
        }


        //=======================================================
        // Add
        //=======================================================

        this.synchronization =
        {
            //===================================================
            // Identity
            //===================================================

            id:0,


            //===================================================
            // Synchronization Level
            //===================================================

            synchronizationLevel:'module',


            //===================================================
            // Module
            //===================================================

            moduleId:null,

            moduleCode:'',

            moduleName:'',


            //===================================================
            // Menu
            //===================================================

            menuId:null,

            menuCode:'',

            menuName:'',


            //===================================================
            // Submenu
            //===================================================

            submenuId:null,

            submenuCode:'',

            submenuName:'',


            //===================================================
            // Synchronization
            //===================================================

            synchronizationTarget:'',

            frontendStatus:'Pending',

            backendStatus:'Pending',

            remarks:'',


            //===================================================
            // Frontend Configuration
            //===================================================

            frontendSolution:'',

            frontendProject:'',

            frontendSourceFolder:'',

            frontendFeatureFolder:'',

            frontendModuleFolder:'',

            frontendModelFolder:'',

            frontendPagesFolder:'',

            frontendRoutesFolder:'',

            frontendServicesFolder:'',


            //===================================================
            // Frontend Application Registration
            //===================================================

            frontendModuleRouteFile:'',

            frontendParentRouteFile:'',

            frontendRoutePath:'',


            //===================================================
            // Backend Configuration
            //===================================================

            backendApiProject:'',

            backendApplicationProject:'',

            backendDomainProject:'',

            backendInfrastructureProject:'',

            backendControllerFolder:'',

            backendDtoFolder:'',

            backendInterfaceFolder:'',

            backendEntityFolder:'',

            backendRepositoryFolder:'',

            backendConfigurationFolder:'',

            backendDependencyInjectionFile:'',

            backendDbContextFile:'',

            backendProgramFile:'',

            backendMigrationFolder:'',

            databaseProvider:'',


            //===================================================
            // Last Synchronization
            //===================================================

            lastSynchronizedBy:null,

            lastSynchronizedDate:null,


            //===================================================
            // Audit
            //===================================================

            createdBy:0,

            createdDate:'',

            modifiedBy:null,

            modifiedDate:null,

            deletedBy:null,

            deletedDate:null,

            isDeleted:false
        };


        this.originalSynchronization =
            JSON.stringify(
                this.synchronization
            );


        this.hasChanges =
            false;
    }

    //===========================================================
    // Load Synchronization
    //===========================================================

    private loadSynchronization():
        void
    {
        this.projectSynchronizationService

            .getById(
                this.synchronizationId
            )

            .subscribe(
            {
                next:(response) =>
                {
                    this.synchronization =
                    {
                        ...response
                    };

                    //================================================
                    // Synchronization Level
                    //================================================

                    this.selectedTab =
                        this.synchronization.synchronizationLevel;

                    //================================================
                    // Restore Frontend Workspace
                    //================================================

                    this.frontendSolution =
                        this.synchronization.frontendSolution ?? '';

                    this.projectName =
                        this.synchronization.frontendProject ?? '';

                    this.sourceFolder =
                        this.synchronization.frontendSourceFolder ?? '';

                    this.featureFolder =
                        this.synchronization.frontendFeatureFolder ?? '';

                    this.moduleFolder =
                        this.synchronization.frontendModuleFolder ?? '';

                    this.modelFolder =
                        this.synchronization.frontendModelFolder ?? '';

                    this.pagesFolder =
                        this.synchronization.frontendPagesFolder ?? '';

                    this.routesFolder =
                        this.synchronization.frontendRoutesFolder ?? '';

                    this.servicesFolder =
                        this.synchronization.frontendServicesFolder ?? '';

                    //================================================
                    // Restore Backend Workspace
                    //================================================

                    this.apiProject =
                        this.synchronization.backendApiProject ?? '';

                    this.applicationProject =
                        this.synchronization.backendApplicationProject ?? '';

                    this.domainProject =
                        this.synchronization.backendDomainProject ?? '';

                    this.infrastructureProject =
                        this.synchronization.backendInfrastructureProject ?? '';

                    this.controllerFolder =
                        this.synchronization.backendControllerFolder ?? '';

                    this.dtoFolder =
                        this.synchronization.backendDtoFolder ?? '';

                    this.interfaceFolder =
                        this.synchronization.backendInterfaceFolder ?? '';

                    this.entityFolder =
                        this.synchronization.backendEntityFolder ?? '';

                    this.repositoryFolder =
                        this.synchronization.backendRepositoryFolder ?? '';

                    this.configurationFolder =
                        this.synchronization.backendConfigurationFolder ?? '';

                    this.dependencyInjection =
                        this.synchronization.backendDependencyInjectionFile ?? '';

                    this.dbContext =
                        this.synchronization.backendDbContextFile ?? '';

                    this.programRegistration =
                        this.synchronization.backendProgramFile ?? '';

                    this.migrationFolder =
                        this.synchronization.backendMigrationFolder ?? '';

                    this.databaseProvider =
                        this.synchronization.databaseProvider ?? '';

                    //================================================
                    // Load Navigation
                    //================================================

                    if (this.synchronization.moduleId !== null)
                    {
                        this.loadMenus(
                            this.synchronization.moduleId
                        );
                    }

                    if (this.synchronization.menuId !== null)
                    {
                        this.loadSubmenus(
                            this.synchronization.menuId
                        );
                    }

                    //================================================
                    // Original State
                    //================================================

                    this.originalSynchronization =
                        JSON.stringify(
                            this.synchronization
                        );

                    this.hasChanges =
                        false;

                    this.cdr.detectChanges();
                },

                error:(error) =>
                {
                    console.error(
                        'Project Synchronization Load Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Failed to load project synchronization.'
                    );

                    this.onBackToList();
                }
            });
    }

    //===========================================================
    // Load Modules
    //===========================================================

    loadModules():
        void
    {
        //=======================================================
        // Debug
        //=======================================================

        console.log('================================');

        console.log(
            'Load Modules'
        );

        console.log(
            'Current Mode:',
            this.mode
        );

        console.log(
            'API:',
            this.mode === 'add'
                ? 'getModules()'
                : 'getAllModules()'
        );

        console.log('================================');


        const request =
            this.mode === 'add'
                ? this.projectSynchronizationService.getModules()
                : this.projectSynchronizationService.getAllModules();


        request.subscribe(
        {
            next:(response) =>
            {
                this.modules =
                [
                    ...response
                ];


                //===================================================
                // Debug
                //===================================================

                console.log(
                    'Modules Loaded:',
                    this.modules
                );

                console.log(
                    'Synchronization ModuleId:',
                    this.synchronization.moduleId
                );

                console.log(
                    'Selected Module:',
                    this.modules.find(
                        module =>
                            module.id ===
                            this.synchronization.moduleId
                    )
                );


                //===================================================
                // Initialize After Modules Are Ready
                //===================================================

                this.initializeMode();


                this.cdr.detectChanges();
            },


            error:(error) =>
            {
                console.error(
                    error
                );
            }
        });
    }


    //===========================================================
    // Load Menus
    //===========================================================

    private loadMenus
    (
        moduleId:number
    ):
        void
    {
        const request =
            this.mode === 'add'
                ? this.projectSynchronizationService.getMenus(moduleId)
                : this.projectSynchronizationService.getAllMenus();


        request.subscribe(
        {
            next:(response) =>
            {
                this.menus =
                [
                    ...response
                ];


                this.cdr.detectChanges();
            },


            error:(error) =>
            {
                console.error(
                    error
                );
            }
        });
    }


    //===========================================================
    // Load Submenus
    //===========================================================

    private loadSubmenus
    (
        menuId:number
    ):
        void
    {
        const request =
            this.mode === 'add'
                ? this.projectSynchronizationService.getSubmenus(menuId)
                : this.projectSynchronizationService.getAllSubmenus();


        request.subscribe(
        {
            next:(response) =>
            {
                this.submenus =
                [
                    ...response
                ];


                this.cdr.detectChanges();
            },


            error:(error) =>
            {
                console.error(
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
        moduleId:number | null
    ):
        void
    {
        const previousModuleId =
            this.synchronization.moduleId;

        this.synchronization.moduleId =
            moduleId;


        //=======================================================
        // Reset Child Selection
        //=======================================================

        if
        (
            previousModuleId !== null
            &&
            previousModuleId !== moduleId
        )
        {
            this.synchronization.menuId =
                null;

            this.synchronization.submenuId =
                null;

            this.menus =
            [];

            this.submenus =
            [];
        }


        //=======================================================
        // Load Menus
        //=======================================================

        if (moduleId !== null)
        {
            this.loadMenus(
                moduleId
            );
        }


        this.checkForChanges();
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
        const previousMenuId =
            this.synchronization.menuId;

        this.synchronization.menuId =
            menuId;


        //=======================================================
        // Reset Child Selection
        //=======================================================

        if
        (
            previousMenuId !== null
            &&
            previousMenuId !== menuId
        )
        {
            this.synchronization.submenuId =
                null;

            this.submenus =
            [];
        }


        //=======================================================
        // Load Submenus
        //=======================================================

        if (menuId !== null)
        {
            this.loadSubmenus(
                menuId
            );
        }


        this.checkForChanges();
    }


    //===========================================================
    // Submenu Changed
    //===========================================================

    onSubmenuChange
    (
        submenuId:number | null
    ):
        void
    {
        this.synchronization.submenuId =
            submenuId;

        this.checkForChanges();
    }

    //===========================================================
    // Save
    //===========================================================

    onSave():
        void
    {
        //=======================================================
        // Sync Selected Target
        //=======================================================

        this.synchronization.synchronizationTarget =
            this.selectedTarget === 'frontend'
                ? 'Frontend'
                : 'Backend';



        //=======================================================
        // Create
        //=======================================================

        if (this.mode === 'add')
        {
            this.projectSynchronizationService

                .create(
                    this.synchronization
                )

                .subscribe(
                {
                    next:() =>
                    {
                        this.originalSynchronization =
                            JSON.stringify(
                                this.synchronization
                            );


                        this.hasChanges =
                            false;


                        this.toast.success(
                            'Success',
                            'Project synchronization created successfully.'
                        );


                        this.onBackToList();
                    },


                    error:(error) =>
                    {
                        console.error(
                            error
                        );


                        const message =
                            error?.error
                            ??
                            'Failed to create project synchronization.';


                        this.toast.error(
                            'Validation',
                            message
                        );
                    }
                });


            return;
        }



        //=======================================================
        // Update
        //=======================================================

        this.projectSynchronizationService

            .update(
                this.synchronization
            )

            .subscribe(
            {
                next:() =>
                {
                    this.originalSynchronization =
                        JSON.stringify(
                            this.synchronization
                        );


                    this.hasChanges =
                        false;


                    this.toast.success(
                        'Success',
                        'Project synchronization updated successfully.'
                    );


                    this.onBackToList();
                },


                error:(error) =>
                {
                    console.error(
                        error
                    );


                    const message =
                        error?.error
                        ??
                        'Failed to update project synchronization.';


                    this.toast.error(
                        'Validation',
                        message
                    );
                }
            });
    }

    //===========================================================
    // Clear
    //===========================================================

    onClear():
        void
    {
        this.synchronization =
        {
            //===================================================
            // Identity
            //===================================================

            id:0,


            //===================================================
            // Synchronization Level
            //===================================================

            synchronizationLevel:'module',


            //===================================================
            // Module
            //===================================================

            moduleId:null,

            moduleCode:'',

            moduleName:'',


            //===================================================
            // Menu
            //===================================================

            menuId:null,

            menuCode:'',

            menuName:'',


            //===================================================
            // Submenu
            //===================================================

            submenuId:null,

            submenuCode:'',

            submenuName:'',


            //===================================================
            // Synchronization
            //===================================================

            synchronizationTarget:'',

            frontendStatus:'Pending',

            backendStatus:'Pending',

            remarks:'',


            //===================================================
            // Frontend Configuration
            //===================================================

            frontendSolution:'',

            frontendProject:'',

            frontendSourceFolder:'',

            frontendFeatureFolder:'',

            frontendModuleFolder:'',

            frontendModelFolder:'',

            frontendPagesFolder:'',

            frontendRoutesFolder:'',

            frontendServicesFolder:'',


            //===================================================
            // Frontend Application Registration
            //===================================================

            frontendModuleRouteFile:'',

            frontendParentRouteFile:'',

            frontendRoutePath:'',


            //===================================================
            // Backend Configuration
            //===================================================

            backendApiProject:'',

            backendApplicationProject:'',

            backendDomainProject:'',

            backendInfrastructureProject:'',

            backendControllerFolder:'',

            backendDtoFolder:'',

            backendInterfaceFolder:'',

            backendEntityFolder:'',

            backendRepositoryFolder:'',

            backendConfigurationFolder:'',

            backendDependencyInjectionFile:'',

            backendDbContextFile:'',

            backendProgramFile:'',

            backendMigrationFolder:'',

            databaseProvider:'',


            //===================================================
            // Last Synchronization
            //===================================================

            lastSynchronizedBy:null,

            lastSynchronizedDate:null,


            //===================================================
            // Audit
            //===================================================

            createdBy:0,

            createdDate:'',

            modifiedBy:null,

            modifiedDate:null,

            deletedBy:null,

            deletedDate:null,

            isDeleted:false
        };


        this.hasChanges =
            false;


        this.cdr.detectChanges();
    }

    //===========================================================
    // Selected Item
    //===========================================================

    getSelectedItemId():
        number | null
    {
        switch (this.selectedTab)
        {
            case 'module':

                return this.synchronization.moduleId;

            case 'menu':

                return this.synchronization.menuId;

            default:

                return this.synchronization.submenuId;
        }
    }

    //===========================================================
    // Selected Item Changed
    //===========================================================

    onSelectedItemChange
    (
        id:number | null
    ):
        void
    {
        switch (this.selectedTab)
        {
            case 'module':

                this.onModuleChange(id);

                break;

            case 'menu':

                this.onMenuChange(id);

                break;

            default:

                this.onSubmenuChange(id);

                break;
        }
    }

    //===========================================================
    // Selected Target Changed
    //===========================================================

    onSelectedTargetChange
    (
        target:string
    ):
        void
    {
        this.selectedTarget =
            target;


        this.synchronization.synchronizationTarget =
            target === 'frontend'
                ? 'Frontend'
                : 'Backend';


        this.checkForChanges();
    }

    //===========================================================
    // Analyze
    //===========================================================

    analyze():
        void
    {
        switch (this.selectedTarget)
        {
            case 'frontend':

                this.analyzeFrontend();

                break;


            case 'backend':

                this.analyzeBackend();

                break;
        }
    }


    //===========================================================
    // Analyze Frontend
    //===========================================================

    private analyzeFrontend():
        void
    {
        if (!this.synchronization.moduleId)
        {
            this.toast.warning(
                'Analyze',
                'Please select a module first.'
            );

            return;
        }


        const module =
            this.modules.find(
                x =>
                x.id ===
                this.synchronization.moduleId
            );


        if (!module)
        {
            this.toast.error(
                'Analyze',
                'Selected module not found.'
            );

            return;
        }


        const moduleFolder =
            module.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-');



        //=======================================================
        // Target Location
        //=======================================================

        this.frontendSolution =
            'Frontend_Studio';


        this.projectName =
            'Studio_UI';


        this.sourceFolder =
            'src';


        this.featureFolder =
            `features/${moduleFolder}`;



        //=======================================================
        // Standard Module Structure
        //=======================================================

        this.moduleFolder =
            `features/${moduleFolder}`;


        this.modelFolder =
            `${this.moduleFolder}/model`;


        this.pagesFolder =
            `${this.moduleFolder}/pages`;


        this.routesFolder =
            `${this.moduleFolder}/routes`;


        this.servicesFolder =
            `${this.moduleFolder}/services`;



        //=======================================================
        // Frontend Application Registration
        //=======================================================

        this.routeFile =
            `${moduleFolder}.routes.ts`;


        this.applicationRouteFile =
            'app.routes.ts';


        this.routePath =
            `/${moduleFolder}`;



        //=======================================================
        // Save Frontend Configuration
        //=======================================================

        this.synchronization.frontendSolution =
            this.frontendSolution;


        this.synchronization.frontendProject =
            this.projectName;


        this.synchronization.frontendSourceFolder =
            this.sourceFolder;


        this.synchronization.frontendFeatureFolder =
            this.featureFolder;


        this.synchronization.frontendModuleFolder =
            this.moduleFolder;


        this.synchronization.frontendModelFolder =
            this.modelFolder;


        this.synchronization.frontendPagesFolder =
            this.pagesFolder;


        this.synchronization.frontendRoutesFolder =
            this.routesFolder;


        this.synchronization.frontendServicesFolder =
            this.servicesFolder;



        //=======================================================
        // Save Frontend Application Registration
        //=======================================================

        this.synchronization.frontendModuleRouteFile =
            this.routeFile;


        this.synchronization.frontendParentRouteFile =
            this.applicationRouteFile;


        this.synchronization.frontendRoutePath =
            this.routePath;



        this.checkForChanges();


        this.cdr.detectChanges();


        this.toast.success(
            'Analyze',
            'Frontend structure analyzed successfully.'
        );
    }



    //===========================================================
    // Analyze Backend
    //===========================================================

    private analyzeBackend():
        void
    {
        if (!this.synchronization.moduleId)
        {
            this.toast.warning(
                'Analyze',
                'Please select a module first.'
            );

            return;
        }


        const module =
            this.modules.find(
                x =>
                x.id ===
                this.synchronization.moduleId
            );


        if (!module)
        {
            this.toast.error(
                'Analyze',
                'Selected module not found.'
            );

            return;
        }


        const moduleFolder =
            module.name
                .replace(
                    /[^a-zA-Z0-9]+/g,
                    ''
                );



        //=======================================================
        // Backend Projects
        //=======================================================

        this.apiProject =
            'AppCore.API';


        this.applicationProject =
            'AppCore.Application';


        this.domainProject =
            'AppCore.Domain';


        this.infrastructureProject =
            'AppCore.Infrastructure';



        //=======================================================
        // Standard Folder Structure
        //=======================================================

        this.controllerFolder =
            `Controllers/${moduleFolder}`;


        this.dtoFolder =
            `DTOs/${moduleFolder}`;


        this.interfaceFolder =
            `Interfaces/${moduleFolder}`;


        this.entityFolder =
            `Entities/${moduleFolder}`;


        this.repositoryFolder =
            `Repositories/${moduleFolder}`;


        this.configurationFolder =
            `Configurations/${moduleFolder}`;



        //=======================================================
        // Registration & Database
        //=======================================================

        this.dependencyInjection =
            'DependencyInjection.cs';


        this.dbContext =
            'AppDbContext.cs';


        this.programRegistration =
            'Program.cs';


        this.migrationFolder =
            'Migrations';


        this.databaseProvider =
            'PostgreSQL';



        //=======================================================
        // Save Backend Configuration
        //=======================================================

        this.synchronization.backendApiProject =
            this.apiProject;


        this.synchronization.backendApplicationProject =
            this.applicationProject;


        this.synchronization.backendDomainProject =
            this.domainProject;


        this.synchronization.backendInfrastructureProject =
            this.infrastructureProject;


        this.synchronization.backendControllerFolder =
            this.controllerFolder;


        this.synchronization.backendDtoFolder =
            this.dtoFolder;


        this.synchronization.backendInterfaceFolder =
            this.interfaceFolder;


        this.synchronization.backendEntityFolder =
            this.entityFolder;


        this.synchronization.backendRepositoryFolder =
            this.repositoryFolder;


        this.synchronization.backendConfigurationFolder =
            this.configurationFolder;


        this.synchronization.backendDependencyInjectionFile =
            this.dependencyInjection;


        this.synchronization.backendDbContextFile =
            this.dbContext;


        this.synchronization.backendProgramFile =
            this.programRegistration;


        this.synchronization.backendMigrationFolder =
            this.migrationFolder;


        this.synchronization.databaseProvider =
            this.databaseProvider;



        this.checkForChanges();


        this.cdr.detectChanges();


        this.toast.success(
            'Analyze',
            'Backend structure analyzed successfully.'
        );
    }
    
    //===========================================================
    // Back To List
    //===========================================================

    onBackToList():
        void
    {
        if (!this.hasChanges)
        {
            this.router.navigate(
            [
                '/infrastructure-control/development-management/project-synchronization'
            ]);

            return;
        }

        this.confirmDialog.open(

            'Cancel Changes',

            'Any unsaved changes will be lost. Do you want to leave this page?',

            () =>
            {
                this.router.navigate(
                [
                    '/infrastructure-control/development-management/project-synchronization'
                ]);
            },

            'Leave',

            'Stay',

            'primary'
        );
    }

    //===========================================================
    // Save Button Text
    //===========================================================

    get saveButtonText():
        string
    {
        return this.mode === 'edit'
            ? 'Update'
            : 'Save';
    }

    //===========================================================
    // View Mode
    //===========================================================

    get isViewMode():
        boolean
    {
        return this.mode === 'view';
    }

    //===========================================================
    // Navigation Readonly
    //===========================================================

    get isNavigationReadonly():
        boolean
    {
        return this.mode !== 'add';
    }


    //===========================================================
    // Synchronization Type Readonly
    //===========================================================

    get isSynchronizationTypeReadonly():
        boolean
    {
        return false;
    }

    //===========================================================
    // Frontend Workspace Value Changed
    //===========================================================

    onFrontendSolutionChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.frontendSolution =
            String(value);

        this.checkForChanges();
    }


    onProjectNameChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.frontendProject =
            String(value);

        this.checkForChanges();
    }


    onSourceFolderChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.frontendSourceFolder =
            String(value);

        this.checkForChanges();
    }


    onFeatureFolderChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.frontendFeatureFolder =
            String(value);

        this.checkForChanges();
    }


    onModuleFolderChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.frontendModuleFolder =
            String(value);

        this.checkForChanges();
    }


    onModelFolderChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.frontendModelFolder =
            String(value);

        this.checkForChanges();
    }


    onPagesFolderChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.frontendPagesFolder =
            String(value);

        this.checkForChanges();
    }


    onRoutesFolderChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.frontendRoutesFolder =
            String(value);

        this.checkForChanges();
    }


    onServicesFolderChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.frontendServicesFolder =
            String(value);

        this.checkForChanges();
    }


    onRouteFileChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.frontendModuleRouteFile =
            String(value);

        this.checkForChanges();
    }


    onApplicationRouteFileChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.frontendParentRouteFile =
            String(value);

        this.checkForChanges();
    }


    onRoutePathChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.frontendRoutePath =
            String(value);

        this.checkForChanges();
    }
    
    //===========================================================
    // Backend Workspace Value Changed
    //===========================================================

    onApiProjectChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.backendApiProject =
            String(value);

        this.checkForChanges();
    }

    onApplicationProjectChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.backendApplicationProject =
            String(value);

        this.checkForChanges();
    }

    onDomainProjectChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.backendDomainProject =
            String(value);

        this.checkForChanges();
    }

    onInfrastructureProjectChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.backendInfrastructureProject =
            String(value);

        this.checkForChanges();
    }

    onControllerFolderChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.backendControllerFolder =
            String(value);

        this.checkForChanges();
    }

    onDtoFolderChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.backendDtoFolder =
            String(value);

        this.checkForChanges();
    }

    onInterfaceFolderChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.backendInterfaceFolder =
            String(value);

        this.checkForChanges();
    }

    onEntityFolderChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.backendEntityFolder =
            String(value);

        this.checkForChanges();
    }

    onRepositoryFolderChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.backendRepositoryFolder =
            String(value);

        this.checkForChanges();
    }

    onConfigurationFolderChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.backendConfigurationFolder =
            String(value);

        this.checkForChanges();
    }

    onDependencyInjectionChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.backendDependencyInjectionFile =
            String(value);

        this.checkForChanges();
    }

    onDbContextChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.backendDbContextFile =
            String(value);

        this.checkForChanges();
    }

    onProgramRegistrationChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.backendProgramFile =
            String(value);

        this.checkForChanges();
    }

    onMigrationFolderChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.backendMigrationFolder =
            String(value);

        this.checkForChanges();
    }

    onDatabaseProviderChange
    (
        value:string | number
    ):
        void
    {
        this.synchronization.databaseProvider =
            String(value);

        this.checkForChanges();
    }

    //===========================================================
    // Analyze Available
    //===========================================================

    get canAnalyze():
        boolean
    {
        return this.mode === 'add';
    }

    //===========================================================
    // Target Location Readonly
    //===========================================================

    get isTargetLocationReadonly():
        boolean
    {
        return (
            this.mode === 'edit'
            ||
            this.mode === 'view'
        );
    }


    //===========================================================
    // Standard Structure Readonly
    //===========================================================

    get isStandardStructureReadonly():
        boolean
    {
        return this.mode === 'view';
    }


    //===========================================================
    // Application Registration Readonly
    //===========================================================

    get isApplicationRegistrationReadonly():
        boolean
    {
        return this.mode === 'view';
    }
    
    //===========================================================
    // Edit Mode
    //===========================================================

    get isEditMode():
        boolean
    {
        return this.mode === 'edit';
    }

    //===========================================================
    // Add Mode
    //===========================================================

    get isAddMode():
        boolean
    {
        return this.mode === 'add';
    }

    //===========================================================
    // Close Form
    //===========================================================

    close():
        void
    {
        this.onBackToList();
    }

    //===========================================================
    // Refresh Form
    //===========================================================

    refresh():
        void
    {
        if
        (
            this.mode === 'edit'
            ||
            this.mode === 'view'
        )
        {
            this.loadSynchronization();

            return;
        }

        this.onClear();
    }

    //===========================================================
    // Value Changed
    //===========================================================

    onValueChange():
        void
    {
        this.checkForChanges();
    }


}