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
    PageCanvasComponent
}
from '../../../../../../shared/components/layout/page-canvas/page-canvas';

import
{
    FormGridComponent
}
from '../../../../../../shared/components/layout/form-grid/form-grid';

import
{
    FormSectionComponent
}
from '../../../../../../shared/components/layout/form-section/form-section';

import
{
    TextboxComponent
}
from '../../../../../../shared/components/controls/textbox/textbox';

import
{
    TextareaComponent
}
from '../../../../../../shared/components/controls/textarea/textarea';

import
{
    DropdownComponent
}
from '../../../../../../shared/components/controls/dropdown/dropdown';

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
    ConfirmDialogService
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';

import
{
    ConfirmDialogComponent
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';


//===============================================================
// Parent Module Service
//===============================================================

import
{
    ModuleService
}
from '../../../services/module.service';

import
{
    NavigationModule
}
from '../../../models/navigation-module.model';

//===============================================================
// Models & Services
//===============================================================
import
{
    NavigationActivity,
    NavigationActivityDefaults,
    CreateNavigationActivity,
    UpdateNavigationActivity
}
from '../../../models/navigation-activity.model';

import
{
    MasterActivity,
    MasterActivityDefaults,
    CreateMasterActivity,
    UpdateMasterActivity
}
from '../../../models/master-activity.model';

import
{
    NavigationActivityService
}
from '../../../services/activity.service';

import
{
    MasterActivityService
}
from '../../../services/master-activity.service';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'app-navigation-activity-form',

    standalone:true,

    imports:
    [
        CommonModule,

        FormsModule,

        PageHeaderComponent,

        PageToolbarComponent,

        CommandCenterComponent,

        ControlTabsComponent,

        PageCanvasComponent,

        FormGridComponent,

        FormSectionComponent,

        TextboxComponent,

        TextareaComponent,

        DropdownComponent,

        SearchDropdownComponent,
        
        ToastComponent,

        ConfirmDialogComponent
    ],

    templateUrl:'./activity-form.html',

    styleUrls:
    [
        './activity-form.css'
    ]
})

//===============================================================
// Navigation Activity Form Component
//===============================================================

export class NavigationActivityFormComponent
implements OnInit
{
    //===========================================================
    // Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly navigationActivityService =
        inject(NavigationActivityService);

    private readonly masterActivityService =
        inject(MasterActivityService);

    private readonly moduleService =
        inject(ModuleService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    //===========================================================
    // Mode
    //===========================================================

    mode:
        'add' | 'edit' | 'view' = 'add';

    activityId =
        0;

    //===========================================================
    // Page Header
    //===========================================================

    pageTitle =
        'Navigation Activity';

    //===========================================================
    // Entity
    //===========================================================

    entityName =
        'Activity';

    //===========================================================
    // Tab Title
    //===========================================================

    get tabTitle(): string
    {
        switch (this.mode)
        {
            case 'add':
                return `Add ${this.entityName}`;

            case 'edit':
                return `Update ${this.entityName}`;

            case 'view':
                return `View ${this.entityName}`;

            default:
                return this.entityName;
        }
    }

    //===========================================================
    // Tabs
    //===========================================================

    tabs: ControlTab[] =
    [
        {
            id:'master',

            label:'Master Activities'
        },

        {
            id:'navigation',

            label:'Navigation Activities'
        }
    ];

    selectedTab =
        'master';

    get isMasterMode(): boolean
    {
        return this.selectedTab === 'master';
    }

    get isNavigationMode(): boolean
    {
        return this.selectedTab === 'navigation';
    }

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
    // Modules Dropdown
    //===========================================================

    modules:
        NavigationModule[] =
    [
    ];

    //===========================================================
    // Activity Model (Shared Form Model)
    //===========================================================

    activity: NavigationActivity =
    {
        id:0,

        navigationModuleId:0,

        navigationModuleName:'',

        code:'',

        name:'',

        displayOrder:1,

        remarks:'',

        isActive:true
    };

    //===========================================================
    // Form State
    //===========================================================

    private originalActivity =
        '';

    hasChanges =
        false;

    //===========================================================
    // Track Form Changes
    //===========================================================

    checkForChanges():
        void
    {
        this.hasChanges =
            JSON.stringify(this.activity)
            !==
            this.originalActivity;
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        const tab =
            this.route.snapshot.queryParamMap.get('tab');

        if
        (
            tab === 'master'
            ||
            tab === 'navigation'
        )
        {
            this.selectedTab =
                tab;
        }

        this.loadModules();

        this.initializeMode();

        this.onTabChange(
            this.selectedTab
        );
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
            this.activityId =
                id;

            this.loadActivity();

            return;
        }

        //=======================================================
        // Add
        //=======================================================

        this.activity =
        {
            id:0,

            navigationModuleId:0,

            navigationModuleName:'',

            code:'',

            name:'',

            displayOrder:1,

            remarks:'',

            isActive:true
        };

        this.originalActivity =
            JSON.stringify(this.activity);

        this.hasChanges =
            false;

        this.loadDefaults();
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
                next:(response) =>
                {
                    this.modules =
                    [
                        ...response
                    ];

                    this.cdr.detectChanges();
                },

                error:(error) =>
                {
                    console.error(
                        'Failed to load modules.',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Unable to load modules.'
                    );
                }
            });
    }


    //===========================================================
    // Load Activity
    //===========================================================

    private loadActivity():
        void
    {
        //=======================================================
        // Master Activity
        //=======================================================

        if (this.isMasterMode)
        {
            this.masterActivityService
                .getById(this.activityId)
                .subscribe(
                {
                    next:(response) =>
                    {
                        this.activity.id =
                            response.id;

                        this.activity.navigationModuleId =
                            0;

                        this.activity.navigationModuleName =
                            '';

                        this.activity.code =
                            response.code;

                        this.activity.name =
                            response.name;

                        this.activity.displayOrder =
                            response.displayOrder;

                        this.activity.remarks =
                            response.remarks;

                        this.activity.isActive =
                            response.isActive;

                        this.originalActivity =
                            JSON.stringify(this.activity);

                        this.hasChanges =
                            false;

                        this.cdr.detectChanges();
                    },

                    error:(error) =>
                    {
                        console.error(error);

                        this.toast.error(
                            'Error',
                            'Failed to load master activity.'
                        );

                        this.onBackToList();
                    }
                });

            return;
        }

        //=======================================================
        // Navigation Activity
        //=======================================================

        this.navigationActivityService
            .getById(this.activityId)
            .subscribe(
            {
                next:(response) =>
                {
                    this.activity =
                        response;

                    this.originalActivity =
                        JSON.stringify(this.activity);

                    this.hasChanges =
                        false;

                    this.cdr.detectChanges();
                },

                error:(error) =>
                {
                    console.error(error);

                    this.toast.error(
                        'Error',
                        'Failed to load navigation activity.'
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
        //=======================================================
        // Master Activity
        //=======================================================

        if (this.isMasterMode)
        {
            this.masterActivityService
                .getDefaults()
                .subscribe(
                {
                    next:(defaults:MasterActivityDefaults) =>
                    {
                        console.log(
                            'Master Activity Defaults:',
                            defaults
                        );

                        this.activity.code =
                            defaults.code;

                        this.activity.displayOrder =
                            defaults.displayOrder;

                        this.activity.isActive =
                            defaults.isActive;

                        this.activity.navigationModuleId =
                            0;

                        this.activity.navigationModuleName =
                            '';

                        this.originalActivity =
                            JSON.stringify(this.activity);

                        this.hasChanges =
                            false;

                        this.cdr.detectChanges();
                    },

                    error:(error) =>
                    {
                        console.error(
                            'Failed to load master activity defaults.',
                            error
                        );

                        this.toast.error(
                            'Error',
                            'Unable to load default values.'
                        );
                    }
                });

            return;
        }

        //=======================================================
        // Navigation Activity
        //=======================================================

        if (this.activity.navigationModuleId <= 0)
        {
            return;
        }

        this.navigationActivityService
            .getDefaults(
                this.activity.navigationModuleId
            )
            .subscribe(
            {
                next:(defaults:NavigationActivityDefaults) =>
                {
                    console.log(
                        'Navigation Activity Defaults:',
                        defaults
                    );

                    this.activity.code =
                        defaults.code;

                    this.activity.displayOrder =
                        defaults.displayOrder;

                    this.activity.isActive =
                        defaults.isActive;

                    this.activity.navigationModuleId =
                        defaults.navigationModuleId;

                    this.activity.navigationModuleName =
                        defaults.navigationModuleName;

                    this.originalActivity =
                        JSON.stringify(this.activity);

                    this.hasChanges =
                        false;

                    this.cdr.detectChanges();
                },

                error:(error) =>
                {
                    console.error(
                        'Failed to load navigation activity defaults.',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Unable to load default values.'
                    );
                }
            });
    }

        //===========================================================
        // Status Changed
        //===========================================================

        onStatusChange(
            value:boolean
        ):
            void
        {
            this.activity.isActive =
                value;

            this.checkForChanges();
        }

    //===========================================================
    // Active Tab Changed
    //===========================================================

    onTabChange(
        tabId:string
    ):
        void
    {
        this.selectedTab =
            tabId;

        this.entityName =
            this.isMasterMode
                ? 'Master Activity'
                : 'Navigation Activity';

        this.pageTitle =
            this.entityName;

        //=======================================================
        // Add Mode Only
        //=======================================================

        if (this.mode === 'add')
        {
            this.activity =
            {
                id:0,

                navigationModuleId:0,

                navigationModuleName:'',

                code:'',

                name:'',

                displayOrder:1,

                remarks:'',

                isActive:true
            };

            this.originalActivity =
                JSON.stringify(this.activity);

            this.hasChanges =
                false;

            this.loadDefaults();
        }

        this.cdr.detectChanges();
    }

    //===========================================================
    // Module Changed
    //===========================================================

    onModuleChange(
        moduleId:number
    ):
        void
    {
        this.activity.navigationModuleId =
            moduleId;

        const selected =
            this.modules.find(
                x =>
                    x.id === moduleId
            );

        if (selected)
        {
            this.activity.navigationModuleName =
                selected.name;
        }

        this.checkForChanges();

        if
        (
            this.mode === 'add'
            &&
            moduleId > 0
        )
        {
            this.loadDefaults();
        }
    }
    
    //===========================================================
    // Save
    //===========================================================

    onSave():
        void
    {
        if (!this.activity.name.trim())
        {
            this.toast.warning(
                'Validation',
                'Activity name is required.'
            );

            return;
        }

        if
        (
            this.isNavigationMode
            &&
            !this.activity.navigationModuleId
        )
        {
            this.toast.warning(
                'Validation',
                'Navigation module is required.'
            );

            return;
        }

        //=======================================================
        // Master Activity
        //=======================================================

        if (this.isMasterMode)
        {
            if (this.mode === 'add')
            {
                const model:CreateMasterActivity =
                {
                    name:
                        this.activity.name,

                    displayOrder:
                        this.activity.displayOrder,

                    remarks:
                        this.activity.remarks,

                    isActive:
                        this.activity.isActive
                };

                this.masterActivityService
                    .create(model)
                    .subscribe(
                    {
                        next:() =>
                        {
                            this.originalActivity =
                                JSON.stringify(this.activity);

                            this.hasChanges =
                                false;

                            this.toast.success(
                                'Success',
                                'Master activity created successfully.'
                            );

                            this.onBackToList();
                        },

                        error:(error) =>
                        {
                            console.error(error);

                            const message =
                                error?.error
                                ??
                                'Failed to create master activity.';

                            this.toast.error(
                                'Validation',
                                message
                            );
                        }
                    });

                return;
            }

            const model:UpdateMasterActivity =
            {
                id:
                    this.activity.id,

                name:
                    this.activity.name,

                displayOrder:
                    this.activity.displayOrder,

                remarks:
                    this.activity.remarks,

                isActive:
                    this.activity.isActive
            };

            this.masterActivityService
                .update(model)
                .subscribe(
                {
                    next:() =>
                    {
                        this.originalActivity =
                            JSON.stringify(this.activity);

                        this.hasChanges =
                            false;

                        this.toast.success(
                            'Success',
                            'Master activity updated successfully.'
                        );

                        this.onBackToList();
                    },

                    error:(error) =>
                    {
                        console.error(error);

                        const message =
                            error?.error
                            ??
                            'Failed to update master activity.';

                        this.toast.error(
                            'Validation',
                            message
                        );
                    }
                });

            return;
        }

        //=======================================================
        // Navigation Activity
        //=======================================================

        if (this.mode === 'add')
        {
            const model:CreateNavigationActivity =
            {
                navigationModuleId:
                    this.activity.navigationModuleId,

                name:
                    this.activity.name,

                displayOrder:
                    this.activity.displayOrder,

                remarks:
                    this.activity.remarks,

                isActive:
                    this.activity.isActive
            };

            this.navigationActivityService
                .create(model)
                .subscribe(
                {
                    next:() =>
                    {
                        this.originalActivity =
                            JSON.stringify(this.activity);

                        this.hasChanges =
                            false;

                        this.toast.success(
                            'Success',
                            'Navigation activity created successfully.'
                        );

                        this.onBackToList();
                    },

                    error:(error) =>
                    {
                        console.error(error);

                        const message =
                            error?.error
                            ??
                            'Failed to create navigation activity.';

                        this.toast.error(
                            'Validation',
                            message
                        );
                    }
                });

            return;
        }

        const model:UpdateNavigationActivity =
        {
            id:
                this.activity.id,

            navigationModuleId:
                this.activity.navigationModuleId,

            name:
                this.activity.name,

            displayOrder:
                this.activity.displayOrder,

            remarks:
                this.activity.remarks,

            isActive:
                this.activity.isActive
        };

        this.navigationActivityService
            .update(model)
            .subscribe(
            {
                next:() =>
                {
                    this.originalActivity =
                        JSON.stringify(this.activity);

                    this.hasChanges =
                        false;

                    this.toast.success(
                        'Success',
                        'Navigation activity updated successfully.'
                    );

                    this.onBackToList();
                },

                error:(error) =>
                {
                    console.error(error);

                    const message =
                        error?.error
                        ??
                        'Failed to update navigation activity.';

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
        //=======================================================
        // Edit Mode
        //=======================================================

        if (this.mode === 'edit')
        {
            // Keep:
            // - Code
            // - Display Order
            // - Navigation Module (Navigation Mode only)

            this.activity.name =
                '';

            this.activity.remarks =
                '';

            this.activity.isActive =
                true;

            this.checkForChanges();

            return;
        }

        //=======================================================
        // Add Mode
        //=======================================================

        this.activity =
        {
            id:0,

            navigationModuleId:
                this.isNavigationMode
                    ? 0
                    : 0,

            navigationModuleName:'',

            code:
                this.activity.code,

            name:'',

            displayOrder:
                this.activity.displayOrder,

            remarks:'',

            isActive:true
        };

        this.originalActivity =
            JSON.stringify(this.activity);

        this.hasChanges =
            false;

        if (this.isMasterMode)
        {
            this.loadDefaults();
        }

        this.cdr.detectChanges();
    }

    //===========================================================
    // Back To List
    //===========================================================

    onBackToList():
        void
    {
        const tab =
            this.selectedTab;

        const route =
            '/infrastructure-control/navigation-management/navigation-activities';

        const navigation =
        {
            queryParams:
            {
                tab:tab
            }
        };

        if (!this.hasChanges)
        {
            this.router.navigate(
                [route],
                navigation
            );

            return;
        }

        this.confirmDialog.open(

            'Cancel Changes',

            'Any unsaved changes will be lost. Do you want to leave this page?',

            () =>
            {
                this.router.navigate(
                    [route],
                    navigation
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
        //=======================================================
        // Edit / View Mode
        //=======================================================

        if
        (
            this.mode === 'edit'
            ||
            this.mode === 'view'
        )
        {
            this.loadActivity();

            return;
        }

        //=======================================================
        // Add Mode
        //=======================================================

        this.loadDefaults();

        this.cdr.detectChanges();
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
