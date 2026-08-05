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
    SyncWorkspaceFrontendComponent
}
from '../../../../../../shared/components/layout/sync-workspace-frontend/sync-workspace-frontend';

import
{
    SyncWorkspaceBackendComponent
}
from '../../../../../../shared/components/layout/sync-workspace-backend/sync-workspace-backend';

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

        SyncWorkspaceFrontendComponent,
        SyncWorkspaceBackendComponent,

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
    // Tabs
    //===========================================================

    get tabTitle():
        string
    {
        switch (this.mode)
        {
            case 'add':

                return `Add ${this.entityName}`;

            case 'edit':

                return `Update ${this.entityName}`;

            case 'view':

                return `View ${this.entityName}`;

            case 'sync':

                return `Sync ${this.entityName}`;

            default:

                return this.entityName;
        }
    }

    //===========================================================
    // Navigation
    //===========================================================

    modules:any[] =
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

        frontendModelFolder: '',

        frontendPagesFolder: '',

        frontendRoutesFolder: '',

        frontendServicesFolder: '',

        frontendModuleRouteFile: '',

        //=======================================================
        // Frontend Application Registration
        //=======================================================

        frontendApplicationRouteFile: '',

        frontendRoutePath: '',

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
    // State
    //===========================================================

    private originalSynchronization =
        '';

    hasChanges =
        false;

    //===========================================================
    // Workspace Editing
    //===========================================================

    frontendEditingSection:
        'none'
        | 'target'
        | 'structure'
        | 'registration'
        = 'none';

    backendEditingSection:
        'none'
        | 'target'
        | 'structure'
        | 'registration'
        = 'none';
        
    //===========================================================
    // Tabs
    //===========================================================

    tabs:
        ControlTab[] =
        [];

    //===========================================================
    // Show Frontend Workspace
    //===========================================================

    get showFrontendWorkspace():
        boolean
    {
        return this.selectedTab === 'frontend';
    }


    //===========================================================
    // Show Backend Workspace
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
        section:
            'target'
            | 'structure'
            | 'registration'
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
        section:
            'target'
            | 'structure'
            | 'registration'
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
        const url =
            this.router.url.toLowerCase();

        this.selectedTab =

            url.includes('/backend')

                ? 'backend'

                : 'frontend';

        this.tabs =
        [
            {
                id:this.selectedTab,

                label:this.tabTitle
            }
        ];
    }

    //===========================================================
    // Initialization
    //===========================================================

    ngOnInit():
        void
    {
        this.initializeWorkspace();

        this.initializeFormMode();

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

        if (url.includes('/view/'))
        {
            this.mode =
                'view';
        }
        else if (url.includes('/edit/'))
        {
            this.mode =
                'edit';
        }
        else if (url.includes('/synchronize/'))
        {
            this.mode =
                'sync';
        }
        else
        {
            this.mode =
                'add';
        }
    }


    //===========================================================
    // Initialize Data
    //===========================================================

    private initializeData():
        void
    {
        const id =
            Number(
                this.route.snapshot.paramMap.get('id')
            );

        //=======================================================
        // Existing Synchronization
        //=======================================================

        if (id > 0)
        {
            this.synchronizationId =
                id;

            this.loadSynchronization();

            return;
        }

        //=======================================================
        // Default Synchronization
        //=======================================================

        this.loadDefaults();
    }


    //===========================================================
    // Set Synchronization
    //===========================================================

    private setSynchronization(
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
                next:(response) =>
                {
                    this.setSynchronization(
                        response
                    );
                },

                error:() =>
                {
                    this.toast.error(
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
                next:(defaults) =>
                {
                    this.setSynchronization(
                    {
                        ...this.synchronization,
                        ...defaults
                    });
                },

                error:() =>
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

        await this.updateProgressAsync(99);

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
        await this.delayAsync(1500);

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
        // Prepare
        //=======================================================

        await this.prepareSynchronizationAsync();

        //=======================================================
        // Synchronize
        //=======================================================

        this.moduleSynchronizationService

            .synchronize
            (
                this.synchronization.id
            )

            .subscribe
            ({
                next:() =>
                {
                    //===================================================
                    // Close Progress
                    //===================================================

                    this.progressDialog.close();

                    //===================================================
                    // Refresh Synchronization
                    //===================================================

                    this.loadSynchronization();

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
                },

                error:(error) =>
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
    }
    
    //===========================================================
    // Rollback
    //===========================================================

    onRollback():
        void
    {
        //=======================================================
        // Validate
        //=======================================================

        if
        (
            this.synchronization.id <= 0
        )
        {
            return;
        }

        //=======================================================
        // Confirm
        //=======================================================

        this.confirmDialog.open
        (
            'Rollback Synchronization',

            'This will rollback the synchronized module. Do you want to continue?',

            () =>
            {
                this.moduleSynchronizationService

                    .rollback
                    (
                        this.synchronization.id
                    )

                    .subscribe
                    ({
                        next:() =>
                        {
                            this.loadSynchronization();

                            this.toast.success
                            (
                                'Rollback',

                                'Module synchronization rolled back successfully.'
                            );
                        },

                        error:(error) =>
                        {
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
        this.resetSynchronization();
    }

    //===========================================================
    // Reset Synchronization
    //===========================================================

    private resetSynchronization():
        void
    {
        if (this.isEditMode)
        {
            this.loadSynchronization();

            return;
        }

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

}
