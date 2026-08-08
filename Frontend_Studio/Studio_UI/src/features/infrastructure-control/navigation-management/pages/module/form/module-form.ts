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
    ControlTabsComponent
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
// Models & Services
//===============================================================

import
{
    NavigationModule,
    NavigationModuleDefaults,
    CreateNavigationModule,
    UpdateNavigationModule
}
from '../../../models/navigation-module.model';

import
{
    ModuleService
}
from '../../../services/module.service';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector: 'app-module-form',

    standalone: true,

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

        ToastComponent,
        ConfirmDialogComponent
    ],

    templateUrl: './module-form.html',

    styleUrls:
    [
        './module-form.css'
    ]
})

export class ModuleFormComponent
implements OnInit
{
    //===========================================================
    // Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

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

    moduleId =
        0;

    //===========================================================
    // Page Header
    //===========================================================

    pageTitle =
        'Navigation Module';


    //===========================================================
    // Entity
    //===========================================================

    entityName =
        'Module';

    //===========================================================
    // Selected Tab
    //===========================================================

    selectedTab =
        'general';

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

    get tabs()
    {
        return [
            {
                id: 'general',
                label: this.tabTitle
            }
        ];
    }

    //===========================================================
    // Status Dropdown
    //===========================================================

    statuses =
    [
        {
            value: true,
            text: 'Active'
        },
        {
            value: false,
            text: 'Inactive'
        }
    ];

    //===========================================================
    // Model
    //===========================================================

    module: NavigationModule =
    {
        id: 0,

        code: '',

        name: '',

        icon: '',

        routeKey: '',

        route: '',

        displayOrder: 1,

        remarks: '',

        isActive: true
    };

    //===========================================================
    // Form State
    //===========================================================

    private originalModule =
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
            JSON.stringify(this.module)
            !==
            this.originalModule;
    }

    //===========================================================
    // Generate Route Key
    //===========================================================

    generateRouteKey():
        void
    {
        this.module.routeKey =
            this.module.name
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');

        this.checkForChanges();
    }

    //===========================================================
    // Module Name Changed
    //===========================================================

    onModuleNameChanged():
        void
    {
        this.generateRouteKey();

        this.checkForChanges();
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit(): void
    {
        this.initializeMode();
    }

    //===========================================================
    // Initialize Mode
    //===========================================================

    private initializeMode(): void
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
            this.moduleId =
                id;

            this.cdr.detectChanges();

            this.loadModule();

            return;
        }

        //=======================================================
        // Add
        //=======================================================

        this.module =
        {
            id: 0,

            code: '',

            name: '',

            icon: '',

            routeKey: '',

            route: '',

            displayOrder: 1,

            remarks: '',

            isActive: true
        };

        this.cdr.detectChanges();

        this.loadDefaults();
    }

    //===========================================================
    // Load Module
    //===========================================================

    private loadModule(): void
    {
        this.moduleService
            .getById(this.moduleId)
            .subscribe({

                next: (response) =>
                {
                    this.module =
                        response;

                    this.originalModule =
                        JSON.stringify(this.module);

                    this.hasChanges =
                        false;

                    this.cdr.detectChanges();
                },

                error: (error) =>
                {
                    console.error(error);

                    this.toast.error(
                        'Error',
                        'Failed to load navigation module.'
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
        this.moduleService
            .getDefaults()
            .subscribe(
            {
                next: (defaults: NavigationModuleDefaults) =>
                {
                    this.module.code =
                        defaults.code;

                    this.module.displayOrder =
                        defaults.displayOrder;

                    this.originalModule =
                        JSON.stringify(this.module);

                    this.hasChanges =
                        false;

                    this.cdr.detectChanges();
                },

                error: (error) =>
                {
                    console.error(
                        'Failed to load module defaults.',
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
        value: boolean
    ): void
    {
        this.module.isActive =
            value;

        this.checkForChanges();
    }

    //===========================================================
    // Active Tab Changed
    //===========================================================

    onTabChange(
        tabId: string
    ): void
    {
        this.selectedTab =
            tabId;
    }

    //===========================================================
    // Save
    //===========================================================

    onSave():
        void
    {
        if (!this.module.name.trim())
        {
            this.toast.warning(
                'Validation',
                'Module name is required.'
            );

            return;
        }

        if (this.mode === 'add')
        {
            const model: CreateNavigationModule =
            {
                name: this.module.name,

                icon: this.module.icon,

                routeKey: this.module.routeKey,

                displayOrder: this.module.displayOrder,

                remarks: this.module.remarks,

                isActive: this.module.isActive
            };

            this.moduleService
                .create(model)
                .subscribe(
                {
                    next: () =>
                    {
                        this.originalModule =
                            JSON.stringify(this.module);

                        this.hasChanges =
                            false;

                        this.toast.success(
                            'Success',
                            'Navigation module created successfully.'
                        );

                        this.onBackToList();
                    },

                    error: (error) =>
                    {
                        console.error(error);

                        const message =
                            error?.error
                            ??
                            'Failed to create navigation module.';

                        this.toast.error(
                            'Validation',
                            message
                        );
                    }
                });

            return;
        }

        const model: UpdateNavigationModule =
        {
            id: this.module.id,

            name: this.module.name,

            icon: this.module.icon,

            routeKey: this.module.routeKey,

            displayOrder: this.module.displayOrder,

            remarks: this.module.remarks,

            isActive: this.module.isActive
        };

        this.moduleService
            .update(model)
            .subscribe(
            {
                next: () =>
                {
                    this.originalModule =
                        JSON.stringify(this.module);

                    this.hasChanges =
                        false;

                    this.toast.success(
                        'Success',
                        'Navigation module updated successfully.'
                    );

                    this.onBackToList();
                },

                error: (error) =>
                {
                    console.error(error);

                    const message =
                        error?.error
                        ??
                        'Failed to update navigation module.';

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

            this.module.name =
                '';

            this.module.icon =
                '';

            this.module.routeKey =
                '';

            this.module.route =
                '';

            this.module.remarks =
                '';

            this.module.isActive =
                true;

            this.checkForChanges();

            return;
        }

        //=======================================================
        // Add Mode
        //=======================================================

        this.module =
        {
            id: 0,

            code: '',

            name: '',

            icon: '',

            routeKey: '',

            route: '',

            displayOrder: 1,

            remarks: '',

            isActive: true
        };

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
        if (!this.hasChanges)
        {
            this.router.navigate(
            [
                '/infrastructure-control/navigation-management/modules'
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
                    '/infrastructure-control/navigation-management/modules'
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

    get saveButtonText(): string
    {
        switch (this.mode)
        {
            case 'add':
                return 'Save';

            case 'edit':
                return 'Update';

            case 'view':
                return 'View';

            default:
                return 'Save';
        }
    }

    //===========================================================
    // View Mode
    //===========================================================

    get isViewMode(): boolean
    {
        return this.mode === 'view';
    }

    //===========================================================
    // Edit Mode
    //===========================================================

    get isEditMode(): boolean
    {
        return this.mode === 'edit';
    }

    //===========================================================
    // Add Mode
    //===========================================================

    get isAddMode(): boolean
    {
        return this.mode === 'add';
    }

    
}