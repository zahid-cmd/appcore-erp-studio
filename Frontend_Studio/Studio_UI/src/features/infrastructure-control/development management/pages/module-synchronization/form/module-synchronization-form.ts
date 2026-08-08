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
    ModuleSyncWorkspaceFrontendComponent
}
from '../../../../../../shared/components/layout/module-sync-workspace-frontend/module-sync-workspace-frontend';

import
{
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

import
{
    ModuleSyncWorkspaceBackendComponent
}
from '../../../../../../shared/components/layout/module-sync-workspace-backend/module-sync-workspace-backend';

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

//===============================================================
// Models & Services
//===============================================================

import
{
    ModuleSynchronization
}
from '../../../model/module-synchronization.model';

import
{
    ModuleSynchronizationService
}
from '../../../services/module-synchronization.service';

import
{
    ModuleService
}
from '../../../../navigation-management/services/module.service';

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
    MenuSynchronizationService
}
from '../../../services/menu-synchronization.service';

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
    selector:'app-module-synchronization-form',

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

        ModuleSyncWorkspaceFrontendComponent,
        ModuleSyncWorkspaceBackendComponent,

        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./module-synchronization-form.html',

    styleUrls:
    [
        './module-synchronization-form.css'
    ]
})

export class ModuleSynchronizationFormComponent
implements OnInit
{
    //===========================================================
    // Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly moduleSynchronizationService =
        inject(ModuleSynchronizationService);

    private readonly menuSynchronizationService =
        inject(MenuSynchronizationService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly moduleService =
        inject(ModuleService);

    private readonly progressDialog =
        inject(ProgressDialogService);

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
        'Module Synchronization';

    entityName =
        'Module Synchronization';

    selectedTab:
        'frontend' | 'backend' =
        'frontend';

    //===========================================================
    // Navigation
    //===========================================================

    modules:any[] =
    [];

    //===========================================================
    // Tabs
    //===========================================================

    tabs:
        ControlTab[] =
        [];

    //===========================================================
    // Model
    //===========================================================

    synchronization: ModuleSynchronization =
    {
        //=======================================================
        // Primary Key
        //=======================================================

        id: 0,

        //=======================================================
        // Navigation
        //=======================================================

        moduleId: 0,

        moduleCode: '',

        moduleName: '',

        //=======================================================
        // Synchronization Type
        //=======================================================

        synchronizationType: 'Frontend',

        //=======================================================
        // Frontend Target Location
        //=======================================================

        frontendSolution: '',

        frontendProject: '',

        frontendSourceFolder: '',

        frontendFeatureFolder: '',

        //=======================================================
        // Frontend Standard Module Structure
        //=======================================================

        frontendModuleFolder: '',

        frontendRoutesFolder: '',

        frontendModuleRouteFile: '',

        //=======================================================
        // Frontend Application Registration
        //=======================================================

        frontendApplicationRouteFile: '',

        //=======================================================
        // Backend Target Location
        //=======================================================

        backendSolution: '',

        backendApiProject: '',

        backendApplicationProject: '',

        backendDomainProject: '',

        backendInfrastructureProject: '',

        //=======================================================
        // Backend Standard Module Structure
        //=======================================================

        backendControllerFolder: '',

        backendApplicationFolder: '',

        backendInterfaceFolder: '',

        backendEntityFolder: '',

        backendRepositoryFolder: '',

        backendConfigurationFolder: '',

        //=======================================================
        // Backend Application Registration
        //=======================================================

        dependencyInjectionFile: '',

        dbContextFile: '',

        //=======================================================
        // Synchronization
        //=======================================================

        status: 'Pending',

        //=======================================================
        // Configuration
        //=======================================================

        remarks: null,

        //=======================================================
        // Last Synchronization
        //=======================================================

        lastSynchronizedBy: null,

        lastSynchronizedDate: null,

        lastSynchronizationResult: '',

        //=======================================================
        // Status
        //=======================================================

        isActive: true,

        //=======================================================
        // Audit
        //=======================================================

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

            ? 'Backend Module Synchronization'

            : 'Frontend Module Synchronization';
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
        if (this.isViewMode)
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
        if (this.isViewMode)
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
        if (this.isViewMode)
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
            this.synchronization.moduleId > 0
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

    ngOnInit(): void
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
        synchronization: ModuleSynchronization
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
        this.moduleSynchronizationService

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

                            'Failed to load module synchronization.'
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

        this.moduleSynchronizationService

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
        this.moduleService

            .getAll()

            .subscribe(
            {
                next:(modules) =>
                {
                    this.modules =
                        modules;
                },

                error:() =>
                {
                    this.toast.error(
                        'Error',
                        'Failed to load modules.'
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

    onModuleChange(
        moduleId:number
    ):
        void
    {
        this.synchronization.moduleId =
            moduleId;

        const module =
            this.modules.find(
                x => x.id === moduleId
                    ||
                     x.moduleId === moduleId
            );

        if (module)
        {
            this.synchronization.moduleCode =
                module.code ?? module.moduleCode ?? '';

            this.synchronization.moduleName =
                module.name ?? module.moduleName ?? '';
        }

        this.checkForChanges();
    }

    //===========================================================
    // Analyze
    //===========================================================

    analyze():
        void
    {
        if (this.synchronization.moduleId <= 0)
        {
            this.toast.warning(
                'Validation',
                'Please select a module.'
            );

            return;
        }

        const synchronizationType =
            this.selectedTab === 'backend'
                ? 'Backend'
                : 'Frontend';

        console.log('========================================');
        console.log('ANALYZE REQUEST');
        console.log('Module Id :', this.synchronization.moduleId);
        console.log('Type      :', synchronizationType);
        console.log('========================================');

        this.moduleSynchronizationService

            .analyze(
                this.synchronization.moduleId,
                synchronizationType
            )

            .subscribe(
            {
                next: (response) =>
                {
                    console.log('========================================');
                    console.log('ANALYZE RESPONSE');
                    console.log(response);
                    console.log('Returned Id       :', response.id);
                    console.log('Module Id         :', response.moduleId);
                    console.log('Type              :', response.synchronizationType);
                    console.log('Current Mode      :', this.mode);
                    console.log('========================================');

                    this.setSynchronization(
                        response
                    );

                    if (response.id > 0)
                    {
                        this.mode =
                            'edit';

                        this.synchronizationId =
                            response.id;

                        console.log('MODE : EDIT');
                        console.log('Synchronization Id :', this.synchronizationId);

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

                        console.log('MODE : ADD');

                        this.toast.success(
                            'Analyze',
                            'Module analyzed successfully.'
                        );
                    }

                    console.log('FINAL MODE :', this.mode);
                    console.log('========================================');

                    this.initializeWorkspace();

                    this.cdr.detectChanges();
                },

                error: (error) =>
                {
                    console.error('========================================');
                    console.error('ANALYZE FAILED');
                    console.error(error);
                    console.error('========================================');

                    this.toast.error(
                        'Analyze',
                        'Failed to analyze module.'
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
        //=======================================================
        // Open Progress Dialog
        //=======================================================

        this.progressDialog.show
        (
            'Preparing Synchronization',

            'Validate Configuration'
        );

        //=======================================================
        // Validate Configuration
        //=======================================================

        await this.updateProgressAsync(10);

        await this.updateProgressAsync(20);

        //=======================================================
        // Analyze Workspace
        //=======================================================

        this.progressDialog.update
        (
            20,
            'Analyze Workspace'
        );

        await this.updateProgressAsync(40);

        await this.updateProgressAsync(80);

        //=======================================================
        // Populate All Paths
        //=======================================================

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
        //=======================================================
        // Open Progress Dialog
        //=======================================================

        this.progressDialog.show
        (
            'Rolling Back Synchronization',

            'Validate Rollback'
        );

        //=======================================================
        // Validate Rollback
        //=======================================================

        await this.updateProgressAsync(10);

        await this.updateProgressAsync(20);

        //=======================================================
        // Analyze Generated Files
        //=======================================================

        this.progressDialog.update
        (
            20,
            'Analyze Generated Files'
        );

        await this.updateProgressAsync(40);

        await this.updateProgressAsync(80);

        //=======================================================
        // Restore Previous State
        //=======================================================

        this.progressDialog.update
        (
            80,
            'Restore Previous State'
        );

        await this.updateProgressAsync(90);

        await this.updateProgressAsync(95);

        await this.updateProgressAsync(100);

        await this.delayAsync(500);
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
        //=======================================================
        // Validate
        //=======================================================

        if (!this.validateSynchronization())
        {
            return;
        }

        //=======================================================
        // Synchronization Mode
        //=======================================================

        if (this.isSynchronizationMode)
        {
            await this.onSynchronize();

            return;
        }

        //=======================================================
        // Prepare Synchronization
        //=======================================================

        await this.prepareSynchronizationAsync();

        //=======================================================
        // Create
        //=======================================================

        if (this.mode === 'add')
        {
            this.createSynchronization();

            return;
        }

        //=======================================================
        // Update
        //=======================================================

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
        //=======================================================
        // Close Progress Dialog
        //=======================================================

        this.progressDialog.close();

        //=======================================================
        // Reset State
        //=======================================================

        this.originalSynchronization =
            JSON.stringify
            (
                this.synchronization
            );

        this.hasChanges =
            false;

        //=======================================================
        // Success
        //=======================================================

        this.toast.success
        (
            'Success',
            message
        );

        //=======================================================
        // Return To List
        //=======================================================

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
        //=======================================================
        // Close Progress Dialog
        //=======================================================

        this.progressDialog.close();

        //=======================================================
        // Log
        //=======================================================

        console.error
        (
            error
        );

        //=======================================================
        // Error
        //=======================================================

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
        //=======================================================
        // Synchronization Type
        //=======================================================

        this.synchronization.synchronizationType =
            this.selectedTab === 'backend'
                ? 'Backend'
                : 'Frontend';

        //=======================================================
        // Create
        //=======================================================

        this.moduleSynchronizationService

            .create(
                this.synchronization,
                this.synchronization.synchronizationType
            )

            .subscribe(
            {
                next:() =>
                {
                    this.onSaveSuccess(
                        'Module synchronization created successfully.'
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
                        'Failed to create module synchronization.'
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
        //=======================================================
        // Synchronization Type
        //=======================================================

        this.synchronization.synchronizationType =
            this.selectedTab === 'backend'
                ? 'Backend'
                : 'Frontend';

        //=======================================================
        // Update
        //=======================================================

        this.moduleSynchronizationService

            .update(
                this.synchronization
            )

            .subscribe(
            {
                next:() =>
                {
                    this.onSaveSuccess(
                        'Module synchronization updated successfully.'
                    );
                },

                error:(error) =>
                {
                    this.onSaveFailed(
                        error,
                        'Failed to update module synchronization.'
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
        //=======================================================
        // Validate
        //=======================================================

        if (!this.validateSynchronization())
        {
            return;
        }

        //=======================================================
        // Configuration Must Be Saved
        //=======================================================

        if
        (
            this.synchronization.id <= 0
        )
        {
            this.toast.warning
            (
                'Synchronization',

                'Please save the module synchronization configuration before synchronizing.'
            );

            return;
        }

        //=======================================================
        // Confirm
        //=======================================================

        this.confirmDialog.open
        (
            'Synchronize Module',

            'This will synchronize the selected module. Do you want to continue?',

            async () =>
            {
                //===================================================
                // Prepare
                //===================================================

                await this.prepareSynchronizationAsync();

                //===================================================
                // Synchronize
                //===================================================

                this.moduleSynchronizationService

                    .synchronize
                    (
                        this.synchronization.id
                    )

                    .subscribe
                    ({
                        next: () =>
                        {
                            //===================================================
                            // Close Progress
                            //===================================================

                            this.progressDialog.close();

                            //===================================================
                            // Reset State
                            //===================================================

                            this.hasChanges =
                                false;

                            //===================================================
                            // Success
                            //===================================================

                            this.toast.success
                            (
                                'Synchronization',

                                'Module synchronized successfully.'
                            );

                            //===================================================
                            // Return To List
                            //===================================================

                            this.onBackToList();
                        },

                        error: (error) =>
                        {
                            //===================================================
                            // Error
                            //===================================================

                            this.onSaveFailed
                            (
                                error,

                                'Module synchronization failed.'
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

    onRollback():
        void
    {
        //=======================================================
        // Validate Synchronization
        //=======================================================

        if
        (
            this.synchronization.id <= 0
        )
        {
            return;
        }


        //=======================================================
        // Determine Synchronization Type
        //=======================================================

        const synchronizationType =
            this.selectedTab === 'backend'
                ? 'Backend'
                : 'Frontend';


        //=======================================================
        // Check Menu Synchronization
        //=======================================================

        this.menuSynchronizationService

            .getAll(
                synchronizationType
            )

            .subscribe(
            {
                next:(menus) =>
                {
                    //===================================================
                    // Find Synchronized Menus Under This Module
                    //===================================================

                    const synchronizedMenus =
                        menus.filter(
                            menu =>
                                menu.moduleId ===
                                    this.synchronization.moduleId

                                &&

                                menu.status
                                    ?.toLowerCase() ===
                                    'synchronized'
                        );


                    //===================================================
                    // Rollback Blocked
                    //===================================================

                    if
                    (
                        synchronizedMenus.length > 0
                    )
                    {
                        const menuNames =
                            synchronizedMenus
                                .map(
                                    menu =>
                                        menu.menuName
                                )
                                .filter(
                                    name =>
                                        !!name
                                );


                        const menuList =
                            menuNames.length > 0
                                ? menuNames.join(', ')
                                : 'one or more menus';


                        this.toast.warning
                        (
                            'Rollback Not Allowed',

                            `This module cannot be rolled back because the following menu synchronization is still synchronized: ${menuList}. Roll back the menu synchronization first.`
                        );

                        return;
                    }


                    //===================================================
                    // Confirm Rollback
                    //===================================================

                    this.confirmDialog.open
                    (
                        'Rollback Synchronization',

                        'This will rollback the synchronized module. Do you want to continue?',

                        async () =>
                        {
                            //===========================================
                            // Prepare Rollback
                            //===========================================

                            await this.prepareRollbackAsync();


                            //===========================================
                            // Rollback
                            //===========================================

                            this.moduleSynchronizationService

                                .rollback
                                (
                                    this.synchronization.id
                                )

                                .subscribe
                                ({
                                    next: () =>
                                    {
                                        //===================================
                                        // Close Progress
                                        //===================================

                                        this.progressDialog.close();


                                        //===================================
                                        // Reset State
                                        //===================================

                                        this.hasChanges =
                                            false;


                                        //===================================
                                        // Success
                                        //===================================

                                        this.toast.success
                                        (
                                            'Rollback',

                                            'Module synchronization rolled back successfully.'
                                        );


                                        //===================================
                                        // Return To List
                                        //===================================

                                        this.onBackToList();
                                    },


                                    error: (error) =>
                                    {
                                        //===================================
                                        // Error
                                        //===================================

                                        this.onSaveFailed
                                        (
                                            error,

                                            'Module rollback failed.'
                                        );
                                    }
                                });
                        },

                        'Rollback',

                        'Cancel',

                        'danger'
                    );
                },


                error:(error) =>
                {
                    //===================================================
                    // Menu Check Failed
                    //===================================================

                    console.error
                    (
                        'Menu Synchronization Check Failed',

                        error
                    );


                    this.toast.error
                    (
                        'Rollback',

                        'Unable to verify menu synchronization status. Module rollback was not started.'
                    );
                }
            });
    }

    //===========================================================
    // Validate Synchronization
    //===========================================================

    private validateSynchronization():
        boolean
    {
        if (this.synchronization.moduleId <= 0)
        {
            this.toast.warning(
                'Validation',
                'Module is required.'
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
        //=======================================================
        // Mode
        //=======================================================

        this.mode =
            'add';

        this.synchronizationId =
            0;

        //=======================================================
        // Clear Navigation
        //=======================================================

        this.synchronization.moduleId =
            0;

        this.synchronization.moduleCode =
            '';

        this.synchronization.moduleName =
            '';

        //=======================================================
        // Reset Workspace
        //=======================================================

        this.frontendEditingSection =
            'none';

        this.backendEditingSection =
            'none';

        this.hasChanges =
            false;

        //=======================================================
        // Load Defaults
        //=======================================================

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

                ? '/infrastructure-control/development-management/module-synchronization/backend'

                : '/infrastructure-control/development-management/module-synchronization/frontend';

        //=======================================================
        // No Changes
        //=======================================================

        if
        (
            this.isViewMode
            ||
            this.isSynchronizationMode
            ||
            !this.hasChanges
        )
        {
            this.router.navigate(
            [
                route
            ]);

            return;
        }

        //=======================================================
        // Confirm
        //=======================================================

        this.confirmDialog.open(

            'Cancel Changes',

            'Any unsaved changes will be lost. Do you want to leave this page?',

            () =>
            {
                this.router.navigate(
                [
                    route
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
        if (this.mode === 'sync')
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
        const moduleId =
            this.synchronization.moduleId;

        const moduleCode =
            this.synchronization.moduleCode;

        const moduleName =
            this.synchronization.moduleName;

        this.moduleSynchronizationService

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

                            moduleId,

                            moduleCode,

                            moduleName
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
