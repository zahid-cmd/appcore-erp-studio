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
    MenuSyncWorkspaceFrontendComponent
}
from '../../../../../../shared/components/layout/menu-sync-workspace-frontend/menu-sync-workspace-frontend';

import
{
    MenuSyncWorkspaceBackendComponent
}
from '../../../../../../shared/components/layout/menu-sync-workspace-backend/menu-sync-workspace-backend';


//===============================================================
// Models & Services
//===============================================================

import
{
    MenuSynchronization
}
from '../../../model/menu-synchronization.model';

import
{
    MenuSynchronizationService
}
from '../../../services/menu-synchronization.service';

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


//===============================================================
// Types
//===============================================================

type EditingSection =
    | 'none'
    | 'target'
    | 'structure'
    | 'registration';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'app-menu-synchronization-form',

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

        MenuSyncWorkspaceFrontendComponent,
        MenuSyncWorkspaceBackendComponent
    ],

    templateUrl:'./menu-synchronization-form.html',

    styleUrls:
    [
        './menu-synchronization-form.css'
    ]
})

export class MenuSynchronizationFormComponent
implements OnInit
{

    //===========================================================
    // Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly menuSynchronizationService =
        inject(MenuSynchronizationService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly menuService =
        inject(NavigationMenuService);

    private readonly progressDialog =
        inject(ProgressDialogService);

    private readonly moduleService =
        inject(ModuleService);

    private readonly moduleSynchronizationService =
        inject(ModuleSynchronizationService);

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
        'Menu Synchronization';

    entityName =
        'Menu Synchronization';

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

    selectedModuleId:number =
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

    synchronization: MenuSynchronization =
    {
        id: 0,

        moduleId: 0,

        moduleCode: '',

        moduleName: '',

        menuId: 0,

        menuCode: '',

        menuName: '',

        synchronizationType: 'Frontend',

        frontendSolution: '',

        frontendProject: '',

        frontendSourceFolder: '',

        frontendFeatureFolder: '',

        frontendMenuFolder: '',

        frontendModelsFolder: '',

        frontendServicesFolder: '',

        frontendPagesFolder: '',

        frontendRoutesFolder: '',

        frontendMenuRouteFile: '',

        frontendModuleRouteFile: '',

        frontendApplicationRouteFile: '',

        backendSolution: '',

        backendApplicationProject: '',

        backendDomainProject: '',

        backendInfrastructureProject: '',

        backendControllerFolder: '',

        backendApplicationFolder: '',

        backendDomainFolder: '',

        backendRepositoryFolder: '',

        backendConfigurationFolder: '',

        status: 'Pending',

        remarks: null,

        lastSynchronizedBy: null,

        lastSynchronizedDate: null,

        lastSynchronizationResult: '',

        isActive: true,

        createdBy: 0,

        createdDate: new Date(),

        modifiedBy: null,

        modifiedDate: null,

        deletedBy: null,

        deletedDate: null,

        isDeleted: false
    };


    //===========================================================
    // Workspace Editing
    //===========================================================

    frontendEditingSection: EditingSection =
        'none';

    backendEditingSection: EditingSection =
        'none';


    //===========================================================
    // Synchronization Name
    //===========================================================

    get synchronizationName():
        string
    {
        return this.selectedTab === 'backend'

            ? 'Backend Menu Synchronization'

            : 'Frontend Menu Synchronization';
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
    // Frontend Workspace Visibility
    //===========================================================

    get showFrontendWorkspace():
        boolean
    {
        return this.selectedTab === 'frontend';
    }


    //===========================================================
    // Backend Workspace Visibility
    //===========================================================

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
    // Target Location Readonly
    //===========================================================

    get isTargetLocationReadonly():
        boolean
    {
        if
        (
            this.isViewMode
        )
        {
            return true;
        }

        return this.selectedTab === 'frontend'

            ? this.frontendEditingSection !== 'target'

            : this.backendEditingSection !== 'target';
    }


    //===========================================================
    // Standard Structure Readonly
    //===========================================================

    get isStandardStructureReadonly():
        boolean
    {
        if
        (
            this.isViewMode
        )
        {
            return true;
        }

        return this.selectedTab === 'frontend'

            ? this.frontendEditingSection !== 'structure'

            : this.backendEditingSection !== 'structure';
    }


    //===========================================================
    // Application Registration Readonly
    //===========================================================

    get isApplicationRegistrationReadonly():
        boolean
    {
        if
        (
            this.isViewMode
        )
        {
            return true;
        }

        return this.selectedTab === 'frontend'

            ? this.frontendEditingSection !== 'registration'

            : this.backendEditingSection !== 'registration';
    }


    //===========================================================
    // Toggle Frontend Editing Section
    //===========================================================

    toggleFrontendEditingSection
    (
        section: EditingSection
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
        section: EditingSection
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
            this.synchronization.menuId > 0
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
                id: this.selectedTab,

                label: this.tabTitle
            }
        ];
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

        if
        (
            this.synchronizationId <= 0
        )
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
        synchronization: MenuSynchronization
    ):
        void
    {
        this.synchronization =
        {
            ...this.synchronization,

            ...synchronization
        };

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
        this.menuSynchronizationService

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
                        this.toast.error
                        (
                            'Error',

                            'Failed to load menu synchronization.'
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
            this.selectedTab === 'backend'

                ? 'Backend'

                : 'Frontend';

        this.menuSynchronizationService

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

                            ...defaults
                        });
                    },

                error:
                    () =>
                    {
                        this.toast.error
                        (
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
        //===========================================================
        // Synchronization Type
        //===========================================================
        //
        // Frontend and Backend are completely independent.
        //
        //===========================================================

        const synchronizationType =
            this.selectedTab === 'backend'

                ? 'Backend'

                : 'Frontend';


        //===========================================================
        // Load All Navigation Modules
        //===========================================================

        this.moduleService

            .getAll()

            .subscribe(
            {
                next:(modules:NavigationModule[]) =>
                {
                    //=======================================================
                    // Load Existing Module Synchronizations
                    //=======================================================
                    //
                    // IMPORTANT:
                    //
                    // A module is available in the Menu dropdown ONLY when
                    // a Module Synchronization record already exists for
                    // the selected synchronization type.
                    //
                    // Status does NOT matter.
                    //
                    // Pending
                    // Ready
                    // Synchronized
                    // Any other status
                    //
                    // All count as an existing synchronization record.
                    //
                    //=======================================================

                    this.moduleSynchronizationService

                        .getAll
                        (
                            synchronizationType
                        )

                        .subscribe(
                        {
                            next:(synchronizations) =>
                            {
                                //===================================================
                                // Existing Synchronized Module IDs
                                //===================================================
                                //
                                // Keep only Module IDs that already have a
                                // synchronization record.
                                //
                                //===================================================

                                const existingModuleIds =
                                    new Set
                                    (
                                        synchronizations

                                            .map
                                            (
                                                synchronization =>
                                                    synchronization.moduleId
                                            )
                                    );


                                //===================================================
                                // Filter Module Dropdown
                                //===================================================
                                //
                                // Only modules already registered in the
                                // Module Synchronization table for this
                                // Frontend / Backend type are available.
                                //
                                //===================================================

                                this.modules =
                                    modules.filter
                                    (
                                        module =>
                                            existingModuleIds.has
                                            (
                                                module.id
                                            )
                                    );


                                //===================================================
                                // Keep Current Module During Edit / View / Sync
                                //===================================================
                                //
                                // When editing/viewing an existing Menu
                                // Synchronization, keep its current module
                                // available even if the synchronization
                                // collection changes while the page is open.
                                //
                                //===================================================

                                if
                                (
                                    this.synchronization.moduleId > 0

                                    &&

                                    !this.modules.some
                                    (
                                        module =>
                                            module.id ===
                                            this.synchronization.moduleId
                                    )
                                )
                                {
                                    const currentModule =
                                        modules.find
                                        (
                                            module =>
                                                module.id ===
                                                this.synchronization.moduleId
                                        );


                                    if
                                    (
                                        currentModule
                                    )
                                    {
                                        this.modules =
                                        [
                                            currentModule,

                                            ...this.modules
                                        ];
                                    }
                                }


                                //===================================================
                                // Change Detection
                                //===================================================

                                this.cdr.detectChanges();
                            },


                            error:() =>
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


                error:() =>
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
        if
        (
            moduleId <= 0
        )
        {
            this.menus =
                [];

            return;
        }


        //===========================================================
        // Load All Menus For Selected Module
        //===========================================================

        this.menuService

            .getByModule(moduleId)

            .subscribe(
            {
                next:(menus) =>
                {
                    //=======================================================
                    // Synchronization Type
                    //=======================================================
                    //
                    // Frontend and Backend are completely independent.
                    //
                    //=======================================================

                    const synchronizationType =
                        this.selectedTab === 'backend'

                            ? 'Backend'

                            : 'Frontend';


                    //=======================================================
                    // Load Existing Synchronizations
                    //=======================================================

                    this.menuSynchronizationService

                        .getAll
                        (
                            synchronizationType
                        )

                        .subscribe(
                        {
                            next:(synchronizations) =>
                            {
                                //===================================================
                                // Existing Menu IDs
                                //===================================================
                                //
                                // Block menus already synchronized for THIS
                                // synchronization type only.
                                //
                                // The current synchronization is excluded so
                                // Edit / View / Sync can still display its menu.
                                //
                                //===================================================

                                const existingMenuIds =
                                    new Set
                                    (
                                        synchronizations

                                            .filter
                                            (
                                                synchronization =>

                                                    synchronization.id !==
                                                    this.synchronizationId
                                            )

                                            .map
                                            (
                                                synchronization =>

                                                    synchronization.menuId
                                            )
                                    );


                                //===================================================
                                // Filter Menu Dropdown
                                //===================================================
                                //
                                // NavigationMenu uses "id".
                                // MenuSynchronization uses "menuId".
                                //
                                //===================================================

                                this.menus =
                                    menus.filter
                                    (
                                        menu =>
                                            !existingMenuIds.has
                                            (
                                                menu.id
                                            )
                                    );


                                //===================================================
                                // Keep Current Menu During Edit / View / Sync
                                //===================================================

                                if
                                (
                                    this.synchronization.menuId > 0
                                    &&
                                    !this.menus.some
                                    (
                                        menu =>
                                            menu.id ===
                                            this.synchronization.menuId
                                    )
                                )
                                {
                                    const currentMenu =
                                        menus.find
                                        (
                                            menu =>
                                                menu.id ===
                                                this.synchronization.menuId
                                        );


                                    if
                                    (
                                        currentMenu
                                    )
                                    {
                                        this.menus =
                                        [
                                            currentMenu,

                                            ...this.menus
                                        ];
                                    }
                                }
                            },


                            error:() =>
                            {
                                this.toast.error
                                (
                                    'Error',

                                    'Failed to load menu synchronization records.'
                                );
                            }
                        });
                },


                error:() =>
                {
                    this.toast.error
                    (
                        'Error',

                        'Failed to load menus.'
                    );
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

        if
        (
            module
        )
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

        this.synchronization.menuId =
            0;

        this.synchronization.menuCode =
            '';

        this.synchronization.menuName =
            '';

        this.menus =
            [];

        if
        (
            moduleId > 0
        )
        {
            this.loadMenus
            (
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
        this.synchronization.menuId =
            menuId;

        const menu =
            this.menus.find(
                x =>
                    x.id === menuId
                    ||
                    x.menuId === menuId
            );

        if
        (
            menu
        )
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
            this.toast.warning(
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
            this.toast.warning(
                'Validation',
                'Please select a menu.'
            );

            return;
        }

        const synchronizationType =
            this.selectedTab === 'backend'
                ? 'Backend'
                : 'Frontend';

        this.menuSynchronizationService

            .analyze
            (
                this.synchronization.moduleId,

                this.synchronization.menuId,

                synchronizationType
            )

            .subscribe
            ({
                next: (response) =>
                {
                    this.setSynchronization
                    (
                        response
                    );

                    if
                    (
                        response.id > 0
                    )
                    {
                        this.mode =
                            'edit';

                        this.synchronizationId =
                            response.id;

                        this.toast.success(
                            'Analyze',
                            'Existing synchronization loaded.'
                        );
                    }
                    else
                    {
                        this.mode =
                            'add';

                        this.synchronizationId =
                            0;

                        this.toast.success(
                            'Analyze',
                            'Menu analyzed successfully.'
                        );
                    }

                    this.initializeWorkspace();

                    this.cdr.detectChanges();
                },

                error: (error) =>
                {
                    console.error(
                        'ANALYZE FAILED',
                        error
                    );

                    this.toast.error(
                        'Analyze',
                        'Failed to analyze menu.'
                    );
                }
            });
    }


    //===========================================================
    // Populate Frontend Workspace
    //===========================================================

    private populateFrontendWorkspace():
        void
    {

    }


    //===========================================================
    // Prepare Synchronization
    //===========================================================

    private async prepareSynchronizationAsync():
        Promise<void>
    {
        this.progressDialog.show
        (
            'Preparing Synchronization',

            'Validate Configuration'
        );

        await this.updateProgressAsync(10);

        await this.updateProgressAsync(20);

        this.progressDialog.update
        (
            20,
            'Analyze Workspace'
        );

        await this.updateProgressAsync(40);

        await this.updateProgressAsync(80);

        this.progressDialog.update
        (
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
        this.progressDialog.show
        (
            'Rolling Back Synchronization',

            'Restore Previous State'
        );

        await this.updateRollbackProgressAsync
        (
            20
        );

        this.progressDialog.update
        (
            20,

            'Validate Previous State'
        );

        await this.updateRollbackProgressAsync
        (
            40
        );

        this.progressDialog.update
        (
            40,

            'Restore Previous Files'
        );

        await this.updateRollbackProgressAsync
        (
            60
        );

        this.progressDialog.update
        (
            60,

            'Restore Route Registration'
        );

        await this.updateRollbackProgressAsync
        (
            80
        );

        this.progressDialog.update
        (
            80,

            'Finalize Rollback'
        );

        await this.updateRollbackProgressAsync
        (
            100
        );

        await this.delayAsync
        (
            500
        );
    }


    //===========================================================
    // Update Rollback Progress
    //===========================================================

    private async updateRollbackProgressAsync
    (
        progress:number
    ):
        Promise<void>
    {
        await this.delayAsync
        (
            200
        );

        this.progressDialog.update
        (
            progress
        );
    }


    //===========================================================
    // Update Progress
    //===========================================================

    private async updateProgressAsync
    (
        progress:number
    ):
        Promise<void>
    {
        await this.delayAsync(200);

        this.progressDialog.update
        (
            progress
        );
    }


    //===========================================================
    // Delay
    //===========================================================

    private delayAsync
    (
        milliseconds:number = 1000
    ):
        Promise<void>
    {
        return new Promise
        (
            resolve =>
                setTimeout
                (
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
        if
        (
            !this.validateSynchronization()
        )
        {
            return;
        }

        if
        (
            this.isSynchronizationMode
        )
        {
            await this.onSynchronize();

            return;
        }

        await this.prepareSynchronizationAsync();

        if
        (
            this.mode === 'add'
        )
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
            JSON.stringify
            (
                this.synchronization
            );

        this.hasChanges =
            false;

        this.toast.success
        (
            'Success',
            message
        );

        this.onBackToList();
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

        console.error
        (
            error
        );

        this.toast.error
        (
            'Error',

            error?.error ??
            message
        );
    }


    //===========================================================
    // Create Synchronization
    //===========================================================

    private createSynchronization():
        void
    {
        this.synchronization.synchronizationType =
            this.selectedTab === 'backend'
                ? 'Backend'
                : 'Frontend';

        this.menuSynchronizationService

            .create(
                this.synchronization,
                this.synchronization.synchronizationType
            )

            .subscribe(
            {
                next:() =>
                {
                    this.onSaveSuccess(
                        'Menu synchronization created successfully.'
                    );
                },

                error:(error) =>
                {
                    if
                    (
                        error?.error
                            ?.toString()
                            .includes('already exists')
                    )
                    {
                        this.toast.warning(
                            'Duplicate Synchronization',
                            error.error
                        );

                        return;
                    }

                    this.onSaveFailed(
                        error,
                        'Failed to create menu synchronization.'
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
        this.synchronization.synchronizationType =
            this.selectedTab === 'backend'
                ? 'Backend'
                : 'Frontend';

        this.menuSynchronizationService

            .update(
                this.synchronization
            )

            .subscribe(
            {
                next:() =>
                {
                    this.onSaveSuccess(
                        'Menu synchronization updated successfully.'
                    );
                },

                error:(error) =>
                {
                    this.onSaveFailed(
                        error,
                        'Failed to update menu synchronization.'
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
            this.toast.warning
            (
                'Synchronization',

                'Please save the menu synchronization configuration before synchronizing.'
            );

            return;
        }

        this.confirmDialog.open
        (
            'Synchronize Menu',

            'This will synchronize the selected menu. Do you want to continue?',

            async () =>
            {
                await this.prepareSynchronizationAsync();

                this.menuSynchronizationService

                    .synchronize
                    (
                        this.synchronization.id
                    )

                    .subscribe
                    ({
                        next: () =>
                        {
                            this.progressDialog.close();

                            this.hasChanges =
                                false;

                            this.toast.success
                            (
                                'Synchronization',

                                'Menu synchronized successfully.'
                            );

                            this.onBackToList();
                        },

                        error: (error) =>
                        {
                            this.onSaveFailed
                            (
                                error,

                                'Menu synchronization failed.'
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
    // Rollback
    //===========================================================
    //
    // Required flow:
    //
    // Rollback Button
    //       ↓
    // Validate Rollback
    //       ↓
    // Dependency Exists?
    //       ↓
    //    YES → Rollback Blocked Toast → STOP
    //       ↓
    //    NO
    //       ↓
    // Confirm Dialog
    //       ↓
    // Confirm
    //       ↓
    // Progress Dialog
    //       ↓
    // Execute Rollback
    //
    //===========================================================

    onRollback():
        void
    {
        //=======================================================
        // Validate Synchronization Id
        //=======================================================

        if
        (
            this.synchronization.id <= 0
        )
        {
            this.toast.warning
            (
                'Rollback',

                'Menu synchronization configuration was not found.'
            );

            return;
        }


        //=======================================================
        // Validate Synchronization Status
        //=======================================================

        if
        (
            !this.canRollback
        )
        {
            this.toast.warning
            (
                'Rollback',

                'Only synchronized menu data can be rolled back.'
            );

            return;
        }


        //=======================================================
        // Validate Rollback Dependency
        //=======================================================

        this.menuSynchronizationService

            .validateRollback
            (
                this.synchronization.id
            )

            .subscribe
            ({
                next: (validation) =>
                {
                    const message =
                        (
                            validation?.message
                            ??
                            ''
                        ).trim();


                    //=============================================
                    // Rollback Blocked
                    //=============================================
                    //
                    // The backend validation is authoritative.
                    //
                    // If a dependent Submenu Synchronization is
                    // synchronized, the confirmation dialog MUST
                    // NOT open.
                    //
                    //=============================================

                    if
                    (
                        validation?.canRollback !== true
                    )
                    {
                        this.toast.warning
                        (
                            'Rollback Blocked',

                            message
                            ||
                            'Menu rollback is blocked because a dependent Submenu Synchronization has already been successfully synchronized. Roll back the dependent Submenu Synchronization first.'
                        );

                        return;
                    }


                    //=============================================
                    // Rollback Allowed
                    //=============================================

                    this.openRollbackConfirmation();
                },


                //=================================================
                // Validation Request Failed
                //=================================================

                error: (error) =>
                {
                    console.error
                    (
                        'ROLLBACK VALIDATION FAILED',

                        error
                    );


                    const serverMessage =
                        typeof error?.error === 'string'

                            ? error.error

                            : error?.error?.message
                                ??
                              error?.message
                                ??
                              'Unable to validate menu rollback.';


                    this.toast.error
                    (
                        'Rollback Validation',

                        serverMessage
                    );
                }
            });
    }


    //===========================================================
    // Open Rollback Confirmation
    //===========================================================

    private openRollbackConfirmation():
        void
    {
        this.confirmDialog.open
        (
            'Rollback Synchronization',

            'This will rollback the synchronized menu. Do you want to continue?',

            async () =>
            {
                //===============================================
                // Prepare Rollback
                //===============================================

                await this.prepareRollbackAsync();


                //===============================================
                // Execute Rollback
                //===============================================

                this.menuSynchronizationService

                    .rollback
                    (
                        this.synchronization.id
                    )

                    .subscribe
                    ({
                        //=========================================
                        // Success
                        //=========================================

                        next: () =>
                        {
                            this.progressDialog.close();

                            this.hasChanges =
                                false;

                            this.toast.success
                            (
                                'Rollback',

                                'Menu synchronization rolled back successfully.'
                            );

                            this.onBackToList();
                        },


                        //=========================================
                        // Failure
                        //=========================================

                        error: (error) =>
                        {
                            this.progressDialog.close();


                            const backendMessage =
                                typeof error?.error === 'string'

                                    ? error.error

                                    : error?.error?.message
                                        ??
                                      error?.message
                                        ??
                                      'Menu rollback failed.';


                            this.toast.error
                            (
                                'Rollback',

                                backendMessage
                            );
                        }
                    });
            },

            'Rollback',

            'Cancel',

            'danger'
        );
    }


    //===========================================================
    // Validate Synchronization
    //===========================================================

    private validateSynchronization():
        boolean
    {
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

        this.synchronization.menuId =
            0;

        this.synchronization.menuCode =
            '';

        this.synchronization.menuName =
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

                ? '/infrastructure-control/development-management/menu-synchronization/backend'

                : '/infrastructure-control/development-management/menu-synchronization/frontend';


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
    // View Mode
    //===========================================================

    get isViewMode():
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
    // Synchronization Mode
    //===========================================================

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


    //===========================================================
    // Reset Workspace
    //===========================================================

    private resetWorkspace():
        void
    {
        const menuId =
            this.synchronization.menuId;

        const menuCode =
            this.synchronization.menuCode;

        const menuName =
            this.synchronization.menuName;

        this.menuSynchronizationService

            .getDefaults
            (
                this.selectedTab === 'backend'

                    ? 'Backend'

                    : 'Frontend'
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

                            menuId,

                            menuCode,

                            menuName
                        });
                    },

                error:
                    () =>
                    {
                        this.toast.error
                        (
                            'Error',

                            'Failed to reset workspace.'
                        );
                    }
            });
    }

}