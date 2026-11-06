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
    ProgressDialogComponent
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';

import
{
    SubMenuSyncWorkspaceFrontendComponent
}
from '../../../../../../shared/components/layout/sub-menu-sync-workspace-frontend/sub-menu-sync-workspace-frontend';

import
{
    SubMenuSyncWorkspaceBackendComponent
}
from '../../../../../../shared/components/layout/sub-menu-sync-workspace-backend/sub-menu-sync-workspace-backend';


//===============================================================
// Models & Services
//===============================================================

import
{
    SubmenuSynchronization
}
from '../../../model/submenu-synchronization.model';

import
{
    SubmenuSynchronizationService
}
from '../../../services/submenu-synchronization.service';

import
{
    ModuleService
}
from '../../../../navigation-management/services/module.service';

import
{
    NavigationModule
}
from '../../../../navigation-management/models/navigation-module.model';

import
{
    NavigationMenuService
}
from '../../../../navigation-management/services/menu.service';

import
{
    MenuSynchronizationService
}
from '../../../services/menu-synchronization.service';

import
{
    NavigationSubmenuService
}
from '../../../../navigation-management/services/submenu.service';

import
{
    ConfirmDialogService
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';

import
{
    ProgressDialogService
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';

import
{
    ModuleSynchronizationService
}
from '../../../services/module-synchronization.service';

import
{
    CodeSynchronizationService
}
from '../../../services/code-synchronization.service';


//===============================================================
// Types
//===============================================================

type FrontendEditingSection =
    | 'none'
    | 'target'
    | 'structure'
    | 'core'
    | 'pages';


type BackendEditingSection =
    | 'none'
    | 'target'
    | 'api'
    | 'application'
    | 'domainInfrastructure';


//===============================================================
// Component
//===============================================================

@Component
({
    selector:'app-submenu-synchronization-form',

    standalone:true,

    imports:
    [
        CommonModule,
        FormsModule,

        PageHeaderComponent,
        PageToolbarComponent,
        CommandCenterComponent,
        ControlTabsComponent,
        SearchDropdownComponent,

        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent,

        SubMenuSyncWorkspaceFrontendComponent,
        SubMenuSyncWorkspaceBackendComponent
    ],

    templateUrl:'./submenu-synchronization-form.html',

    styleUrls:
    [
        './submenu-synchronization-form.css'
    ]
})

export class SubmenuSynchronizationFormComponent
implements OnInit
{
    //===========================================================
    // Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly submenuSynchronizationService =
        inject(SubmenuSynchronizationService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly menuService =
        inject(NavigationMenuService);

    private readonly menuSynchronizationService =
        inject(MenuSynchronizationService);

    private readonly submenuService =
        inject(NavigationSubmenuService);

    private readonly progressDialog =
        inject(ProgressDialogService);

    private readonly moduleService =
        inject(ModuleService);

    private readonly moduleSynchronizationService =
        inject(ModuleSynchronizationService);


    private readonly codeSynchronizationService =
        inject(CodeSynchronizationService);


    //===========================================================
    // State
    //===========================================================

    private originalSynchronization =
        '';

    hasChanges =
        false;


    //===========================================================
    // Mode
    //===========================================================

    mode:'add' | 'edit' | 'view' | 'sync' =
        'add';

    synchronizationId =
        0;


    //===========================================================
    // Header
    //===========================================================

    pageTitle =
        'Submenu Synchronization';

    entityName =
        'Submenu Synchronization';

    selectedTab:
        'frontend' | 'backend' =
        'frontend';


    //===========================================================
    // Navigation
    //===========================================================

    modules:any[] =
        [];

    menus:any[] =
        [];

    submenus:any[] =
        [];

    selectedModuleId:number =
        0;

    selectedMenuId:number =
        0;

    selectedSubmenuId:number =
        0;


    //===========================================================
    // Tabs
    //===========================================================

    tabs:
        ControlTab[] =
        [];


    //===========================================================
    // Model
    //===========================================================

    synchronization:SubmenuSynchronization =
    {
        //=======================================================
        // Primary Key
        //=======================================================

        id:0,


        //=======================================================
        // Navigation
        //=======================================================

        moduleId:0,

        moduleCode:'',

        moduleName:'',

        menuId:0,

        menuCode:'',

        menuName:'',

        submenuId:0,

        submenuCode:'',

        submenuName:'',


        //=======================================================
        // Synchronization Type
        //=======================================================

        synchronizationType:'Frontend',


        //=======================================================
        // Frontend Target Location
        //=======================================================

        frontendSolution:'',

        frontendProject:'',

        frontendSourceFolder:'',

        frontendFeatureFolder:'',

        frontendMenuFolder:'',


        //=======================================================
        // Frontend Submenu Location
        //=======================================================

        frontendSubmenuFolder:'',

        frontendFormFolder:'',

        frontendListFolder:'',


        //=======================================================
        // Frontend Submenu Core Files
        //=======================================================

        frontendSubmenuModelFile:'',

        frontendSubmenuServiceFile:'',

        frontendSubmenuRouteFile:'',


        //=======================================================
        // Frontend Submenu Page Files
        //=======================================================

        frontendSubmenuFormTsFile:'',

        frontendSubmenuFormHtmlFile:'',

        frontendSubmenuFormCssFile:'',

        frontendSubmenuListTsFile:'',

        frontendSubmenuListHtmlFile:'',

        frontendSubmenuListCssFile:'',


        //=======================================================
        // Backend Target Location
        //=======================================================

        backendSolution:'',

        backendApplicationProject:'',

        backendDomainProject:'',

        backendInfrastructureProject:'',


        //=======================================================
        // Backend API
        //=======================================================

        backendControllerFile:'',


        //=======================================================
        // Backend Application
        //=======================================================

        backendApplicationSubMenuFolder:'',

        backendApplicationDtosFolder:'',

        backendApplicationInterfacesFolder:'',

        backendSubMenuDtoFile:'',

        backendCreateSubMenuDtoFile:'',

        backendUpdateSubMenuDtoFile:'',

        backendSubMenuDefaultsDtoFile:'',

        backendSubMenuRepositoryInterfaceFile:'',


        //=======================================================
        // Backend Domain
        //=======================================================

        backendSubMenuEntityFile:'',


        //=======================================================
        // Backend Infrastructure
        //=======================================================

        backendSubMenuConfigurationFile:'',

        backendSubMenuRepositoryFile:'',


        //=======================================================
        // Synchronization
        //=======================================================

        status:'Pending',


        //=======================================================
        // Configuration
        //=======================================================

        remarks:null,


        //=======================================================
        // Last Synchronization
        //=======================================================

        lastSynchronizedBy:null,

        lastSynchronizedDate:null,

        lastSynchronizationResult:'',


        //=======================================================
        // Status
        //=======================================================

        isActive:true,


        //=======================================================
        // Audit
        //=======================================================

        createdBy:0,

        createdDate:new Date(),

        modifiedBy:null,

        modifiedDate:null,

        deletedBy:null,

        deletedDate:null,

        isDeleted:false
    };


    //===========================================================
    // Workspace Editing
    //===========================================================

    frontendEditingSection:
        FrontendEditingSection =
        'none';

    backendEditingSection:
        BackendEditingSection =
        'none';


    //===========================================================
    // Synchronization Name
    //===========================================================

    get synchronizationName():
        string
    {
        return this.selectedTab === 'backend'
            ? 'Backend Submenu Synchronization'
            : 'Frontend Submenu Synchronization';
    }


    //===========================================================
    // Action Name
    //===========================================================

    get actionName():
        string
    {
        switch (this.mode)
        {
            case 'add':
                return 'Add';

            case 'edit':
                return 'Update';

            case 'view':
                return 'View';

            case 'sync':
                return 'Sync';

            default:
                return '';
        }
    }


    //===========================================================
    // Tab Title
    //===========================================================

    get tabTitle():
        string
    {
        return `${this.actionName} ${this.synchronizationName}`;
    }


    //===========================================================
    // Workspace Visibility
    //===========================================================

    get showFrontendWorkspace():
        boolean
    {
        return this.selectedTab === 'frontend';
    }


    get showBackendWorkspace():
        boolean
    {
        return this.selectedTab === 'backend';
    }


    //===========================================================
    // Navigation Readonly
    //===========================================================

    get isNavigationReadonly():
        boolean
    {
        return (
            this.isEditMode
            ||
            this.isViewMode
            ||
            this.isSynchronizationMode
        );
    }


    //===========================================================
    // Frontend Readonly
    //===========================================================

    get isTargetLocationReadonly():
        boolean
    {
        if (this.isViewMode)
        {
            return true;
        }

        return this.frontendEditingSection !== 'target';
    }


    get isStandardStructureReadonly():
        boolean
    {
        if (this.isViewMode)
        {
            return true;
        }

        return this.frontendEditingSection !== 'structure';
    }


    get isCoreFilesReadonly():
        boolean
    {
        if (this.isViewMode)
        {
            return true;
        }

        return this.frontendEditingSection !== 'core';
    }


    get isPageFilesReadonly():
        boolean
    {
        if (this.isViewMode)
        {
            return true;
        }

        return this.frontendEditingSection !== 'pages';
    }


    //===========================================================
    // Backend Readonly
    //===========================================================

    get isBackendTargetLocationReadonly():
        boolean
    {
        if (this.isViewMode)
        {
            return true;
        }

        return this.backendEditingSection !== 'target';
    }


    get isBackendApiReadonly():
        boolean
    {
        if (this.isViewMode)
        {
            return true;
        }

        return this.backendEditingSection !== 'api';
    }


    get isBackendApplicationReadonly():
        boolean
    {
        if (this.isViewMode)
        {
            return true;
        }

        return this.backendEditingSection !== 'application';
    }


    get isBackendDomainInfrastructureReadonly():
        boolean
    {
        if (this.isViewMode)
        {
            return true;
        }

        return this.backendEditingSection !== 'domainInfrastructure';
    }


    //===========================================================
    // Toggle Frontend Editing Section
    //===========================================================

    toggleFrontendEditingSection
    (
        section:FrontendEditingSection
    ):
        void
    {
        this.frontendEditingSection =
            this.frontendEditingSection === section
                ? 'none'
                : section;
    }


    //===========================================================
    // Toggle Backend Editing Section
    //===========================================================

    toggleBackendEditingSection
    (
        section:BackendEditingSection
    ):
        void
    {
        this.backendEditingSection =
            this.backendEditingSection === section
                ? 'none'
                : section;
    }


    //===========================================================
    // Analyze Enabled
    //===========================================================

    get canAnalyze():
        boolean
    {
        return (
            this.isAddMode
            &&
            this.synchronization.submenuId > 0
        );
    }


    //===========================================================
    // Can Synchronize
    //===========================================================

    get canSynchronize():
        boolean
    {
        return this.synchronization.status !== 'Synchronized';
    }


    //===========================================================
    // Can Rollback
    //===========================================================

    get canRollback():
        boolean
    {
        return this.synchronization.status === 'Synchronized';
    }


    //===========================================================
    // Initialize Workspace
    //===========================================================

    private initializeWorkspace():
        void
    {
        this.selectedTab =
            this.router.url
                .toLowerCase()
                .includes('/backend')
                    ? 'backend'
                    : 'frontend';


        this.tabs =
        [
            {
                id:this.selectedTab,

                label:this.tabTitle
            }
        ];


        this.frontendEditingSection =
            'none';

        this.backendEditingSection =
            'none';
    }


    //===========================================================
    // Initialization
    //===========================================================

    ngOnInit():
        void
    {
        this.initializeFormMode();

        this.initializeWorkspace();

        this.loadModules();

        this.initializeData();
    }


    //===========================================================
    // Initialize Form Mode
    //===========================================================

    private initializeFormMode():
        void
    {
        const url =
            this.router.url.toLowerCase();

        this.mode =
            url.includes('/view/')
                ? 'view'
            : url.includes('/edit/')
                ? 'edit'
            : url.includes('/synchronize/')
                ? 'sync'
            : 'add';
    }


    //===========================================================
    // Initialize Data
    //===========================================================

    private initializeData():
        void
    {
        this.synchronizationId =
            Number(
                this.route.snapshot.paramMap.get('id')
            );

        if (this.synchronizationId <= 0)
        {
            this.loadDefaults();

            return;
        }

        this.loadSynchronization();
    }


    //===========================================================
    // Set Synchronization
    //===========================================================

    private setSynchronization
    (
        synchronization:SubmenuSynchronization
    ):
        void
    {
        this.synchronization =
        {
            ...this.synchronization,

            ...synchronization
        };


        this.selectedTab =
            this.router.url
                .toLowerCase()
                .includes('/backend')
                    ? 'backend'
                    : 'frontend';


        this.selectedModuleId =
            this.synchronization.moduleId;

        this.selectedMenuId =
            this.synchronization.menuId;

        this.selectedSubmenuId =
            this.synchronization.submenuId;


        if (this.selectedModuleId > 0)
        {
            this.loadMenus(
                this.selectedModuleId
            );
        }

        if (this.selectedMenuId > 0)
        {
            this.loadSubmenus(
                this.selectedMenuId
            );
        }


        this.initializeWorkspace();


        this.originalSynchronization =
            JSON.stringify(
                this.synchronization
            );

        this.hasChanges =
            false;

        this.cdr.detectChanges();
    }


    //===========================================================
    // Load Synchronization
    //===========================================================

    private loadSynchronization():
        void
    {
        this.submenuSynchronizationService
            .getById(
                this.synchronizationId
            )
            .subscribe(
            {
                next:
                    (
                        synchronization
                    ) =>
                    {
                        this.setSynchronization(
                            synchronization
                        );
                    },

                error:
                    () =>
                    {
                        this.toast.error(
                            'Error',
                            'Failed to load submenu synchronization.'
                        );

                        this.onBackToList();
                    }
            });
    }


    //===========================================================
    // Load Defaults
    //===========================================================

    private loadDefaults():
        void
    {
        const synchronizationType =
            this.router.url
                .toLowerCase()
                .includes('/backend')
                    ? 'Backend'
                    : 'Frontend';


        this.submenuSynchronizationService
            .getDefaults(
                synchronizationType
            )
            .subscribe(
            {
                next:
                    (
                        defaults
                    ) =>
                    {
                        this.setSynchronization
                        ({
                            ...this.synchronization,

                            ...defaults,

                            synchronizationType
                        });
                    },

                error:
                    () =>
                    {
                        this.toast.error(
                            'Error',
                            'Failed to load default values.'
                        );
                    }
            });
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


        this.moduleService

            .getAll()

            .subscribe(
            {
                next:
                    (
                        modules:NavigationModule[]
                    ) =>
                    {
                        this.moduleSynchronizationService

                            .getAll(
                                synchronizationType
                            )

                            .subscribe(
                            {
                                next:
                                    (
                                        synchronizations
                                    ) =>
                                    {
                                        const existingModuleIds =
                                            new Set<number>
                                            (
                                                synchronizations
                                                    .map
                                                    (
                                                        synchronization =>
                                                            synchronization.moduleId
                                                    )
                                            );


                                        this.modules =
                                            modules.filter
                                            (
                                                module =>
                                                    existingModuleIds.has(
                                                        module.id
                                                    )
                                            );


                                        if
                                        (
                                            this.selectedModuleId > 0
                                            &&
                                            !existingModuleIds.has(
                                                this.selectedModuleId
                                            )
                                        )
                                        {
                                            this.selectedModuleId =
                                                0;

                                            this.synchronization.moduleId =
                                                0;

                                            this.synchronization.moduleCode =
                                                '';

                                            this.synchronization.moduleName =
                                                '';

                                            this.selectedMenuId =
                                                0;

                                            this.synchronization.menuId =
                                                0;

                                            this.synchronization.menuCode =
                                                '';

                                            this.synchronization.menuName =
                                                '';

                                            this.selectedSubmenuId =
                                                0;

                                            this.synchronization.submenuId =
                                                0;

                                            this.synchronization.submenuCode =
                                                '';

                                            this.synchronization.submenuName =
                                                '';

                                            this.menus =
                                                [];

                                            this.submenus =
                                                [];
                                        }


                                        this.cdr.detectChanges();
                                    },


                                error:
                                    () =>
                                    {
                                        this.modules =
                                            [];

                                        this.toast.error
                                        (
                                            'Error',

                                            'Failed to load module synchronization records.'
                                        );

                                        this.cdr.detectChanges();
                                    }
                            });
                    },


                error:
                    () =>
                    {
                        this.modules =
                            [];

                        this.toast.error
                        (
                            'Error',

                            'Failed to load modules.'
                        );

                        this.cdr.detectChanges();
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
        this.menus =
            [];

        if
        (
            moduleId <= 0
        )
        {
            return;
        }


        const synchronizationType =
            this.selectedTab === 'backend'
                ? 'Backend'
                : 'Frontend';


        this.menuService
            .getByModule(
                moduleId
            )
            .subscribe
            ({
                next:
                    (
                        menus
                    ) =>
                    {
                        this.menuSynchronizationService
                            .getAll(
                                synchronizationType
                            )
                            .subscribe
                            ({
                                next:
                                    (
                                        synchronizations
                                    ) =>
                                    {
                                        const existingMenuIds =
                                            new Set<number>
                                            (
                                                synchronizations

                                                    .filter
                                                    (
                                                        synchronization =>
                                                            synchronization.moduleId ===
                                                            moduleId
                                                    )

                                                    .map
                                                    (
                                                        synchronization =>
                                                            synchronization.menuId
                                                    )
                                            );


                                        this.menus =
                                            menus.filter
                                            (
                                                menu =>
                                                {
                                                    if
                                                    (
                                                        menu.id ===
                                                        this.synchronization.menuId
                                                    )
                                                    {
                                                        return true;
                                                    }


                                                    return existingMenuIds.has
                                                    (
                                                        menu.id
                                                    );
                                                }
                                            );


                                        this.cdr.detectChanges();
                                    },


                                error:
                                    (
                                        error
                                    ) =>
                                    {
                                        console.error
                                        (
                                            'Menu Synchronization Load Failed',

                                            error
                                        );


                                        this.menus =
                                            [];


                                        this.toast.error
                                        (
                                            'Menu Load Failed',

                                            'Unable to load menu synchronization records.'
                                        );


                                        this.cdr.detectChanges();
                                    }
                            });
                    },


                error:
                    (
                        error
                    ) =>
                    {
                        console.error
                        (
                            'Menu Load Failed',

                            error
                        );


                        this.menus =
                            [];


                        this.toast.error
                        (
                            'Menu Load Failed',

                            'Unable to load menus for the selected module.'
                        );


                        this.cdr.detectChanges();
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
        this.submenus =
            [];

        if
        (
            menuId <= 0
        )
        {
            return;
        }


        const synchronizationType =
            this.selectedTab === 'backend'
                ? 'Backend'
                : 'Frontend';


        this.submenuService
            .getByMenu(
                menuId
            )
            .subscribe
            ({
                next:
                    (
                        submenus
                    ) =>
                    {
                        this.submenuSynchronizationService
                            .getAll(
                                synchronizationType
                            )
                            .subscribe
                            ({
                                next:
                                    (
                                        synchronizations
                                    ) =>
                                    {
                                        const existingSubmenuIds =
                                            new Set<number>
                                            (
                                                synchronizations

                                                    .filter
                                                    (
                                                        synchronization =>
                                                            synchronization.menuId ===
                                                            menuId
                                                    )

                                                    .map
                                                    (
                                                        synchronization =>
                                                            synchronization.submenuId
                                                    )
                                            );


                                        this.submenus =
                                            submenus.filter
                                            (
                                                submenu =>
                                                {
                                                    if
                                                    (
                                                        submenu.id ===
                                                        this.synchronization.submenuId
                                                    )
                                                    {
                                                        return true;
                                                    }


                                                    return !existingSubmenuIds.has
                                                    (
                                                        submenu.id
                                                    );
                                                }
                                            );


                                        this.cdr.detectChanges();
                                    },


                                error:
                                    (
                                        error
                                    ) =>
                                    {
                                        console.error
                                        (
                                            'Submenu Synchronization Load Failed',

                                            error
                                        );


                                        this.submenus =
                                            [];


                                        this.toast.error
                                        (
                                            'Submenu Load Failed',

                                            'Unable to load submenu synchronization records.'
                                        );


                                        this.cdr.detectChanges();
                                    }
                            });
                    },


                error:
                    (
                        error
                    ) =>
                    {
                        console.error(
                            'Submenu Load Failed',

                            error
                        );


                        this.submenus =
                            [];


                        this.toast.error(
                            'Submenu Load Failed',

                            'Unable to load submenus for the selected menu.'
                        );


                        this.cdr.detectChanges();
                    }
            });
    }


    //===========================================================
    // Track Changes
    //===========================================================

    private checkForChanges():
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
    // Module Changed
    //===========================================================

    onModuleChange
    (
        moduleId:number
    ):
        void
    {
        this.selectedModuleId =
            moduleId;

        this.synchronization.moduleId =
            moduleId;


        const module =
            this.modules.find
            (
                x =>
                    x.id === moduleId
                    ||
                    x.moduleId === moduleId
            );


        if (module)
        {
            this.synchronization.moduleCode =
                module.code
                ??
                module.moduleCode
                ??
                '';

            this.synchronization.moduleName =
                module.name
                ??
                module.moduleName
                ??
                '';
        }
        else
        {
            this.synchronization.moduleCode =
                '';

            this.synchronization.moduleName =
                '';
        }


        this.selectedMenuId =
            0;

        this.synchronization.menuId =
            0;

        this.synchronization.menuCode =
            '';

        this.synchronization.menuName =
            '';


        this.selectedSubmenuId =
            0;

        this.synchronization.submenuId =
            0;

        this.synchronization.submenuCode =
            '';

        this.synchronization.submenuName =
            '';


        this.menus =
            [];

        this.submenus =
            [];


        if (moduleId > 0)
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
        menuId:number
    ):
        void
    {
        this.selectedMenuId =
            menuId;

        this.synchronization.menuId =
            menuId;


        const menu =
            this.menus.find
            (
                x =>
                    x.id === menuId
                    ||
                    x.menuId === menuId
            );


        if (menu)
        {
            this.synchronization.menuCode =
                menu.code
                ??
                menu.menuCode
                ??
                '';

            this.synchronization.menuName =
                menu.name
                ??
                menu.menuName
                ??
                '';
        }
        else
        {
            this.synchronization.menuCode =
                '';

            this.synchronization.menuName =
                '';
        }


        this.selectedSubmenuId =
            0;

        this.synchronization.submenuId =
            0;

        this.synchronization.submenuCode =
            '';

        this.synchronization.submenuName =
            '';

        this.submenus =
            [];


        if (menuId > 0)
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
        submenuId:number
    ):
        void
    {
        this.selectedSubmenuId =
            submenuId;

        this.synchronization.submenuId =
            submenuId;


        const submenu =
            this.submenus.find
            (
                x =>
                    x.id === submenuId
            );


        if (submenu)
        {
            this.synchronization.submenuCode =
                submenu.code
                ??
                '';

            this.synchronization.submenuName =
                submenu.name
                ??
                '';
        }
        else
        {
            this.synchronization.submenuCode =
                '';

            this.synchronization.submenuName =
                '';
        }


        this.checkForChanges();
    }


    //===========================================================
    // Analyze
    //===========================================================

    analyze():
        void
    {
        if
        (
            this.synchronization.moduleId <= 0
        )
        {
            this.toast.warning
            (
                'Validation',

                'Please select a module.'
            );

            return;
        }


        if
        (
            this.synchronization.menuId <= 0
        )
        {
            this.toast.warning
            (
                'Validation',

                'Please select a menu.'
            );

            return;
        }


        if
        (
            this.synchronization.submenuId <= 0
        )
        {
            this.toast.warning
            (
                'Validation',

                'Please select a submenu.'
            );

            return;
        }


        const synchronizationType =
            this.selectedTab === 'backend'
                ? 'Backend'
                : 'Frontend';


        this.submenuSynchronizationService
            .analyze
            (
                this.synchronization.moduleId,

                this.synchronization.menuId,

                this.synchronization.submenuId,

                synchronizationType
            )
            .subscribe
            ({
                next:
                    (
                        response
                    ) =>
                    {
                        const selectedSubmenuId =
                            this.selectedSubmenuId;


                        const selectedSubmenuCode =
                            this.synchronization.submenuCode;


                        const selectedSubmenuName =
                            this.synchronization.submenuName;


                        this.synchronization =
                        {
                            ...this.synchronization,

                            ...response
                        };


                        this.synchronization.submenuId =
                            selectedSubmenuId;


                        this.synchronization.submenuCode =
                            selectedSubmenuCode;


                        this.synchronization.submenuName =
                            selectedSubmenuName;


                        this.synchronization.synchronizationType =
                            synchronizationType;


                        this.initializeWorkspace();


                        this.checkForChanges();


                        this.cdr.detectChanges();
                    },


                error:
                    (
                        error
                    ) =>
                    {
                        console.error
                        (
                            'Analyze Failed',

                            error
                        );


                        this.toast.error
                        (
                            'Analyze Failed',

                            'Unable to analyze submenu synchronization.'
                        );
                    }
            });
    }


    //===========================================================
    // Prepare Synchronization
    //===========================================================

    private async prepareSynchronizationAsync():
        Promise<void>
    {
        this.progressDialog.show(
            'Preparing Synchronization',
            'Validate Configuration'
        );

        await this.updateProgressAsync(10);
        await this.updateProgressAsync(20);

        this.progressDialog.update(
            20,
            'Analyze Workspace'
        );

        await this.updateProgressAsync(40);
        await this.updateProgressAsync(80);

        this.progressDialog.update(
            80,
            'Populate All Paths'
        );

        await this.updateProgressAsync(90);
        await this.updateProgressAsync(95);
        await this.updateProgressAsync(100);

        await this.delayAsync(500);
    }


    //===========================================================
    // Prepare Rollback
    //===========================================================

    private async prepareRollbackAsync():
        Promise<void>
    {
        this.progressDialog.show(
            'Rolling Back Synchronization',
            'Validate Rollback'
        );

        await this.updateProgressAsync(10);
        await this.updateProgressAsync(20);

        this.progressDialog.update(
            20,
            'Analyze Generated Files'
        );

        await this.updateProgressAsync(40);
        await this.updateProgressAsync(80);

        this.progressDialog.update(
            80,
            'Restore Previous State'
        );

        await this.updateProgressAsync(90);
        await this.updateProgressAsync(95);
        await this.updateProgressAsync(100);

        await this.delayAsync(500);
    }


    //===========================================================
    // Progress
    //===========================================================

    private async updateProgressAsync
    (
        progress:number
    ):
        Promise<void>
    {
        await this.delayAsync(200);

        this.progressDialog.update(
            progress
        );
    }


    private delayAsync
    (
        milliseconds:number = 1000
    ):
        Promise<void>
    {
        return new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    milliseconds
                )
        );
    }


    //===========================================================
    // Save
    //===========================================================

    async onSave():
        Promise<void>
    {
        if (!this.validateSynchronization())
        {
            return;
        }

        if (this.isSynchronizationMode)
        {
            await this.onSynchronize();

            return;
        }

        await this.prepareSynchronizationAsync();


        if (this.mode === 'add')
        {
            this.createSynchronization();

            return;
        }

        this.updateSynchronization();
    }


    //===========================================================
    // Save Successful
    //===========================================================

    private onSaveSuccess
    (
        message:string
    ):
        void
    {
        this.progressDialog.close();

        this.originalSynchronization =
            JSON.stringify(
                this.synchronization
            );

        this.hasChanges =
            false;

        this.toast.success(
            'Success',
            message
        );

        this.onBackToList();
    }


    //===========================================================
    // Extract Error Message
    //===========================================================

    private getErrorMessage
    (
        error:any,

        fallbackMessage:string
    ):
        string
    {
        //=======================================================
        // Direct String Error
        //=======================================================

        if
        (
            typeof error === 'string'
            &&
            error.trim().length > 0
        )
        {
            return error;
        }


        //=======================================================
        // Angular HttpErrorResponse Error Body
        //=======================================================

        const errorBody =
            error?.error;


        //=======================================================
        // String Error Body
        //=======================================================

        if
        (
            typeof errorBody === 'string'
            &&
            errorBody.trim().length > 0
        )
        {
            return errorBody;
        }


        //=======================================================
        // Backend Message
        //=======================================================

        if
        (
            typeof errorBody?.message === 'string'
            &&
            errorBody.message.trim().length > 0
        )
        {
            return errorBody.message;
        }


        //=======================================================
        // Backend Error
        //=======================================================

        if
        (
            typeof errorBody?.error === 'string'
            &&
            errorBody.error.trim().length > 0
        )
        {
            return errorBody.error;
        }


        //=======================================================
        // Backend Detail
        //=======================================================

        if
        (
            typeof errorBody?.detail === 'string'
            &&
            errorBody.detail.trim().length > 0
        )
        {
            return errorBody.detail;
        }


        //=======================================================
        // Backend Title
        //=======================================================

        if
        (
            typeof errorBody?.title === 'string'
            &&
            errorBody.title.trim().length > 0
        )
        {
            return errorBody.title;
        }


        //=======================================================
        // Angular Error Message
        //=======================================================

        if
        (
            typeof error?.message === 'string'
            &&
            error.message.trim().length > 0
        )
        {
            return error.message;
        }


        //=======================================================
        // Nested Exception Message
        //=======================================================

        if
        (
            typeof errorBody?.exception?.message === 'string'
            &&
            errorBody.exception.message.trim().length > 0
        )
        {
            return errorBody.exception.message;
        }


        //=======================================================
        // Fallback
        //=======================================================

        return fallbackMessage;
    }


    //===========================================================
    // Save Failed
    //===========================================================

    private onSaveFailed
    (
        error:any,

        message:string
    ):
        void
    {
        this.progressDialog.close();

        console.error(
            error
        );


        const errorMessage =
            this.getErrorMessage(
                error,

                message
            );


        this.toast.error(
            'Error',

            errorMessage
        );
    }


    //===========================================================
    // Create Synchronization
    //===========================================================

    private createSynchronization():
        void
    {
        const synchronizationType =
            this.selectedTab === 'backend'
                ? 'Backend'
                : 'Frontend';


        this.synchronization.synchronizationType =
            synchronizationType;


        this.submenuSynchronizationService
            .create(
                this.synchronization,
                synchronizationType
            )
            .subscribe(
            {
                next:() =>
                {
                    this.onSaveSuccess(
                        'Submenu synchronization created successfully.'
                    );
                },

                error:
                    (
                        error
                    ) =>
                    {
                        if
                        (
                            typeof error?.error === 'string'
                            &&
                            error.error
                                .toLowerCase()
                                .includes('already exists')
                        )
                        {
                            this.toast.warning(
                                'Duplicate Synchronization',

                                error.error
                            );

                            return;
                        }


                        if
                        (
                            typeof error?.error?.message === 'string'
                            &&
                            error.error.message
                                .toLowerCase()
                                .includes('already exists')
                        )
                        {
                            this.toast.warning(
                                'Duplicate Synchronization',

                                error.error.message
                            );

                            return;
                        }


                        this.onSaveFailed(
                            error,

                            'Failed to create submenu synchronization.'
                        );
                    }
            });
    }


    //===========================================================
    // Update Synchronization
    //===========================================================

    private updateSynchronization():
        void
    {
        const synchronizationType =
            this.selectedTab === 'backend'
                ? 'Backend'
                : 'Frontend';


        this.synchronization.synchronizationType =
            synchronizationType;


        this.submenuSynchronizationService
            .update(
                this.synchronization
            )
            .subscribe(
            {
                next:() =>
                {
                    this.onSaveSuccess(
                        'Submenu synchronization updated successfully.'
                    );
                },

                error:
                    (
                        error
                    ) =>
                    {
                        this.onSaveFailed(
                            error,

                            'Failed to update submenu synchronization.'
                        );
                    }
            });
    }


    //===========================================================
    // Synchronize
    //===========================================================

    async onSynchronize():
        Promise<void>
    {
        if
        (
            !this.validateSynchronization()
        )
        {
            return;
        }


        if
        (
            this.synchronization.id <= 0
        )
        {
            this.toast.warning(
                'Synchronization',

                'Please save the submenu synchronization configuration before synchronizing.'
            );

            return;
        }


        //=======================================================
        // Validate Parent Menu Synchronization
        //=======================================================

        const synchronizationType =
            this.selectedTab === 'backend'
                ? 'Backend'
                : 'Frontend';


        this.menuSynchronizationService

            .getAll(
                synchronizationType
            )

            .subscribe
            ({
                next:
                    (
                        synchronizations
                    ) =>
                    {
                        const parentMenu =
                            synchronizations.find
                            (
                                synchronization =>
                                    synchronization.moduleId ===
                                        this.synchronization.moduleId
                                    &&
                                    synchronization.menuId ===
                                        this.synchronization.menuId
                                    &&
                                    synchronization.status
                                        ?.toLowerCase() ===
                                        'synchronized'
                            );


                        if
                        (
                            !parentMenu
                        )
                        {
                            this.toast.warning(
                                'Synchronization Blocked',

                                `The parent menu "${this.synchronization.menuName}" is not synchronized. Synchronize the parent menu before synchronizing this submenu.`
                            );

                            return;
                        }


                        //===================================================
                        // Confirmation
                        //===================================================

                        this.confirmDialog.open(
                            'Synchronize Submenu',

                            'This will synchronize the selected submenu. Do you want to continue?',

                            async () =>
                            {
                                await this.prepareSynchronizationAsync();


                                this.submenuSynchronizationService

                                    .synchronize(
                                        this.synchronization.id
                                    )

                                    .subscribe
                                    ({
                                        next:
                                            () =>
                                            {
                                                this.progressDialog.close();

                                                this.hasChanges =
                                                    false;

                                                this.toast.success(
                                                    'Synchronization',

                                                    'Submenu synchronized successfully.'
                                                );

                                                this.onBackToList();
                                            },

                                        error:
                                            (
                                                error
                                            ) =>
                                            {
                                                this.onSaveFailed(
                                                    error,

                                                    'Submenu synchronization failed.'
                                                );
                                            }
                                    });
                            },

                            'Synchronize',

                            'Cancel',

                            'primary'
                        );
                    },

                error:
                    (
                        error
                    ) =>
                    {
                        console.error(
                            'Parent Menu Synchronization Validation Failed',

                            error
                        );


                        this.toast.error(
                            'Synchronization Validation',

                            this.getErrorMessage(
                                error,

                                'Unable to validate parent menu synchronization.'
                            )
                        );
                    }
            });
    }

    //===========================================================
    // Rollback
    //===========================================================

    onRollback():
        void
    {
        //=======================================================
        // Synchronization Record Required
        //=======================================================

        if
        (
            this.synchronization.id <= 0
        )
        {
            return;
        }


        //=======================================================
        // Validate Code Synchronization Status
        //=======================================================

        const synchronizationType =
            this.selectedTab === 'backend'
                ? 'Backend'
                : 'Frontend';


        this.codeSynchronizationService

            .getAll(
                synchronizationType
            )

            .subscribe
            ({
                next:
                    (
                        synchronizations
                    ) =>
                    {
                        const codeSynchronization =
                            synchronizations.find
                            (
                                synchronization =>
                                    synchronization.submenuSynchronizationId ===
                                    this.synchronization.id
                            );


                        if
                        (
                            codeSynchronization?.status
                                ?.toLowerCase() ===
                                'synchronized'
                        )
                        {
                            this.toast.warning(
                                'Rollback Blocked',

                                `The code for "${this.synchronization.submenuName}" is already synchronized. Rollback is not allowed while the code remains synchronized.`
                            );

                            return;
                        }


                        //===================================================
                        // Confirmation
                        //===================================================

                        this.confirmDialog.open
                        (
                            'Rollback Synchronization',

                            'This will rollback the synchronized submenu. Do you want to continue?',

                            async () =>
                            {
                                await this.prepareRollbackAsync();


                                this.submenuSynchronizationService

                                    .rollback
                                    (
                                        this.synchronization.id
                                    )

                                    .subscribe
                                    ({
                                        next:
                                            () =>
                                            {
                                                this.progressDialog.close();

                                                this.hasChanges =
                                                    false;

                                                this.toast.success
                                                (
                                                    'Rollback',

                                                    'Submenu synchronization rolled back successfully.'
                                                );

                                                this.onBackToList();
                                            },

                                        error:
                                            (
                                                error
                                            ) =>
                                            {
                                                this.onSaveFailed
                                                (
                                                    error,

                                                    'Submenu rollback failed.'
                                                );
                                            }
                                    });
                            },

                            'Rollback',

                            'Cancel',

                            'danger'
                        );
                    },

                error:
                    (
                        error
                    ) =>
                    {
                        console.error(
                            'Code Synchronization Validation Failed',

                            error
                        );


                        this.toast.error(
                            'Rollback Validation',

                            this.getErrorMessage(
                                error,

                                'Unable to validate code synchronization status.'
                            )
                        );
                    }
            });
    }

    //===========================================================
    // Validate
    //===========================================================

    private validateSynchronization():
        boolean
    {
        if
        (
            this.synchronization.moduleId <= 0
        )
        {
            this.toast.warning(
                'Validation',

                'Module is required.'
            );

            return false;
        }


        if
        (
            this.synchronization.menuId <= 0
        )
        {
            this.toast.warning(
                'Validation',

                'Menu is required.'
            );

            return false;
        }


        if
        (
            this.synchronization.submenuId <= 0
        )
        {
            this.toast.warning(
                'Validation',

                'Submenu is required.'
            );

            return false;
        }


        return true;
    }


    //===========================================================
    // Clear
    //===========================================================

    onClear():
        void
    {
        this.clearForm();
    }


    //===========================================================
    // Clear Form
    //===========================================================

    private clearForm():
        void
    {
        this.mode =
            'add';

        this.synchronizationId =
            0;


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


        this.synchronization.moduleId =
            0;

        this.synchronization.moduleCode =
            '';

        this.synchronization.moduleName =
            '';

        this.synchronization.menuId =
            0;

        this.synchronization.menuCode =
            '';

        this.synchronization.menuName =
            '';

        this.synchronization.submenuId =
            0;

        this.synchronization.submenuCode =
            '';

        this.synchronization.submenuName =
            '';


        this.frontendEditingSection =
            'none';

        this.backendEditingSection =
            'none';


        this.hasChanges =
            false;


        this.loadDefaults();
    }


    //===========================================================
    // Back To List
    //===========================================================

    onBackToList():
        void
    {
        const route =
            this.selectedTab === 'backend'
                ? '/infrastructure-control/development-management/submenu-synchronization/backend'
                : '/infrastructure-control/development-management/submenu-synchronization/frontend';


        if
        (
            this.isViewMode
            ||
            this.isSynchronizationMode
            ||
            !this.hasChanges
        )
        {
            this.router.navigateByUrl(
                route
            );

            return;
        }


        this.confirmDialog.open(
            'Cancel Changes',

            'Any unsaved changes will be lost. Do you want to leave this page?',

            () =>
            {
                this.router.navigateByUrl(
                    route
                );
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
        if
        (
            this.mode === 'sync'
        )
        {
            return 'Sync';
        }


        return this.mode === 'edit'
            ? 'Update'
            : 'Save';
    }


    //===========================================================
    // Modes
    //===========================================================

    get isViewMode():
        boolean
    {
        return this.mode === 'view';
    }


    get isEditMode():
        boolean
    {
        return this.mode === 'edit';
    }


    get isAddMode():
        boolean
    {
        return this.mode === 'add';
    }


    get isSynchronizationMode():
        boolean
    {
        return this.mode === 'sync';
    }


    //===========================================================
    // Reset Workspace
    //===========================================================

    onResetWorkspace():
        void
    {
        this.resetWorkspace();
    }


    private resetWorkspace():
        void
    {
        const moduleId =
            this.synchronization.moduleId;

        const moduleCode =
            this.synchronization.moduleCode;

        const moduleName =
            this.synchronization.moduleName;

        const menuId =
            this.synchronization.menuId;

        const menuCode =
            this.synchronization.menuCode;

        const menuName =
            this.synchronization.menuName;

        const submenuId =
            this.synchronization.submenuId;

        const submenuCode =
            this.synchronization.submenuCode;

        const submenuName =
            this.synchronization.submenuName;


        const synchronizationType =
            this.router.url
                .toLowerCase()
                .includes('/backend')
                    ? 'Backend'
                    : 'Frontend';


        this.submenuSynchronizationService
            .getDefaults(
                synchronizationType
            )
            .subscribe(
            {
                next:
                    (
                        defaults
                    ) =>
                    {
                        this.setSynchronization
                        ({
                            ...defaults,

                            moduleId,
                            moduleCode,
                            moduleName,

                            menuId,
                            menuCode,
                            menuName,

                            submenuId,
                            submenuCode,
                            submenuName,

                            synchronizationType
                        });
                    },

                error:
                    () =>
                    {
                        this.toast.error(
                            'Error',

                            'Failed to reset workspace.'
                        );
                    }
            });
    }
}