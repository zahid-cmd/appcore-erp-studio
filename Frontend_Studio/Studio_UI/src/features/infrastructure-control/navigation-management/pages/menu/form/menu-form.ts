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

import
{
    ModuleService
}
from '../../../services/module.service';

//===============================================================
// Models & Services
//===============================================================

import
{
    NavigationMenu,
    NavigationMenuDefaults,
    CreateNavigationMenu,
    UpdateNavigationMenu
}
from '../../../models/navigation-menu.model';

import
{
    NavigationMenuService
}
from '../../../services/menu.service';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector: 'app-navigation-menu-form',

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
        SearchDropdownComponent,
        ToastComponent,
        ConfirmDialogComponent
    ],

    templateUrl: './menu-form.html',

    styleUrls:
    [
        './menu-form.css'
    ]
})

export class NavigationMenuFormComponent
implements OnInit
{

    //===========================================================
    // Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly navigationMenuService =
        inject(NavigationMenuService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly moduleService =
        inject(ModuleService);

    //===========================================================
    // Mode
    //===========================================================

    mode:
        'add' | 'edit' | 'view' = 'add';

    menuId =
        0;

    //===========================================================
    // Page Header
    //===========================================================

    pageTitle =
        'Navigation Menu';

    //===========================================================
    // Entity
    //===========================================================

    entityName =
        'Menu';

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

    get tabs(): ControlTab[]
    {
        return [
            {
                id:'general',

                label:this.tabTitle
            }
        ];
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
    // Navigation Modules Dropdown
    //===========================================================

    modules:any[] =
    [];

    //===========================================================
    // Model
    //===========================================================

    menu: NavigationMenu =
    {
        id:0,

        navigationModuleId:0,

        navigationModuleCode:'',

        navigationModuleName:'',

        code:'',

        name:'',

        icon:'',

        routeKey:'',

        route:'',

        displayOrder:1,

        remarks:'',

        isActive:true
    };

    //===========================================================
    // Form State
    //===========================================================

    private originalMenu =
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
            JSON.stringify(this.menu)
            !==
            this.originalMenu;
    }

    //===========================================================
    // Generate Route Key
    //===========================================================

    generateRouteKey():
        void
    {
        this.menu.routeKey =
            this.menu.name
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');

        this.generateRoute();

        this.checkForChanges();
    }

    //===========================================================
    // Menu Name Changed
    //===========================================================

    onMenuNameChanged():
        void
    {
        this.generateRouteKey();
    }
    
    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.loadModules();

        this.initializeMode();
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
            this.menuId =
                id;

            this.loadMenu();

            return;
        }

        //=======================================================
        // Add
        //=======================================================

        this.menu =
        {
            id: 0,

            navigationModuleId: 0,

            navigationModuleCode: '',

            navigationModuleName: '',

            code: '',

            name: '',

            icon: '',

            routeKey: '',

            route: '',

            displayOrder: 1,

            remarks: '',

            isActive: true
        };

        //=======================================================
        // Defaults will load after Navigation Module selection
        //=======================================================

        this.originalMenu =
            JSON.stringify(this.menu);

        this.hasChanges =
            false;
    }

    //===========================================================
    // Load Navigation Modules
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
                        response.map(
                            item =>
                            ({
                                value: item.id,

                                text: item.name,

                                routeKey: item.routeKey
                            })
                        );

                    this.cdr.detectChanges();
                },

                error:(error) =>
                {
                    console.error(
                        'Failed to load navigation modules.',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Unable to load navigation modules.'
                    );
                }
            });
    }

    //===========================================================
    // Load Menu
    //===========================================================

    private loadMenu():
        void
    {
        this.navigationMenuService
            .getById(this.menuId)
            .subscribe(
            {
                next:(response) =>
                {
                    this.menu =
                        response;

                    this.originalMenu =
                        JSON.stringify(this.menu);

                    this.hasChanges =
                        false;

                    this.cdr.detectChanges();
                },

                error:(error) =>
                {
                    console.error(error);

                    this.toast.error(
                        'Error',
                        'Failed to load navigation menu.'
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
        this.navigationMenuService
            .getDefaults(
                this.menu.navigationModuleId
            )
            .subscribe(
            {
                next:(defaults: NavigationMenuDefaults) =>
                {
                    this.menu.code =
                        defaults.code;

                    this.menu.displayOrder =
                        defaults.displayOrder;


                    this.originalMenu =
                        JSON.stringify(this.menu);


                    this.hasChanges =
                        false;


                    this.cdr.detectChanges();
                },


                error:(error) =>
                {
                    console.error(
                        'Failed to load menu defaults.',
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
        this.menu.isActive =
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
    }

    //===========================================================
    // Save
    //===========================================================

    onSave():
        void
    {
        if (!this.menu.name.trim())
        {
            this.toast.warning(
                'Validation',
                'Menu name is required.'
            );

            return;
        }


        if (!this.menu.navigationModuleId)
        {
            this.toast.warning(
                'Validation',
                'Navigation module is required.'
            );

            return;
        }


        if (!this.menu.routeKey.trim())
        {
            this.toast.warning(
                'Validation',
                'Route Key is required.'
            );

            return;
        }


        //=======================================================
        // Create
        //=======================================================

        if (this.mode === 'add')
        {
            const model: CreateNavigationMenu =
            {
                navigationModuleId:
                    this.menu.navigationModuleId,

                name:
                    this.menu.name,

                icon:
                    this.menu.icon,

                routeKey:
                    this.menu.routeKey,

                displayOrder:
                    this.menu.displayOrder,

                remarks:
                    this.menu.remarks,

                isActive:
                    this.menu.isActive
            };


            this.navigationMenuService
                .create(model)
                .subscribe(
                {
                    next: () =>
                    {
                        this.originalMenu =
                            JSON.stringify(this.menu);

                        this.hasChanges =
                            false;


                        this.toast.success(
                            'Success',
                            'Navigation menu created successfully.'
                        );


                        this.onBackToList();
                    },


                    error:(error) =>
                    {
                        console.error(error);


                        const message =
                            error?.error
                            ??
                            'Failed to create navigation menu.';


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

        const model: UpdateNavigationMenu =
        {
            id:
                this.menu.id,

            navigationModuleId:
                this.menu.navigationModuleId,

            name:
                this.menu.name,

            icon:
                this.menu.icon,

            routeKey:
                this.menu.routeKey,

            displayOrder:
                this.menu.displayOrder,

            remarks:
                this.menu.remarks,

            isActive:
                this.menu.isActive
        };


        this.navigationMenuService
            .update(model)
            .subscribe(
            {
                next: () =>
                {
                    this.originalMenu =
                        JSON.stringify(this.menu);

                    this.hasChanges =
                        false;


                    this.toast.success(
                        'Success',
                        'Navigation menu updated successfully.'
                    );


                    this.onBackToList();
                },


                error:(error) =>
                {
                    console.error(error);


                    const message =
                        error?.error
                        ??
                        'Failed to update navigation menu.';


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
            // - Navigation Module
            // - Code
            // - Display Order

            this.menu.name =
                '';

            this.menu.icon =
                '';

            this.menu.routeKey =
                '';

            this.menu.route =
                '';

            this.menu.remarks =
                '';

            this.menu.isActive =
                true;

            this.checkForChanges();

            return;
        }

        //=======================================================
        // Add Mode
        //=======================================================

        this.menu =
        {
            id: 0,

            navigationModuleId: 0,

            navigationModuleCode: '',

            navigationModuleName: '',

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

        //=======================================================
        // Load Defaults only after Navigation Module selected
        //=======================================================

        if (this.menu.navigationModuleId > 0)
        {
            this.loadDefaults();
        }
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
                '/infrastructure-control/navigation-management/navigation-menus'
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
                    '/infrastructure-control/navigation-management/navigation-menus'
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

        if (
            this.mode === 'edit'
            ||
            this.mode === 'view'
        )
        {
            this.loadMenu();

            return;
        }


        //=======================================================
        // Add Mode
        //=======================================================

        if (
            this.menu.navigationModuleId > 0
        )
        {
            this.loadDefaults();

            return;
        }


        //=======================================================
        // No Module Selected
        // Keep Empty State
        //=======================================================

        this.menu.code =
            '';

        this.menu.displayOrder =
            1;


        this.cdr.detectChanges();
    }


    //===========================================================
    // Navigation Module Changed
    //===========================================================

    onModuleChange(
        moduleId: number
    ):
        void
    {
        this.menu.navigationModuleId =
            moduleId;

        const selected =
            this.modules.find(
                x => x.value === moduleId
            );

        if (selected)
        {
            this.menu.navigationModuleName =
                selected.text;
        }

        if (
            this.mode === 'add'
            &&
            moduleId > 0
        )
        {
            this.navigationMenuService
                .getDefaults(moduleId)
                .subscribe(
                {
                    next: (defaults: NavigationMenuDefaults) =>
                    {
                        this.menu.code =
                            defaults.code;

                        this.menu.displayOrder =
                            defaults.displayOrder;

                        this.generateRoute();

                        this.checkForChanges();

                        this.cdr.detectChanges();
                    },

                    error: (error) =>
                    {
                        console.error(
                            'Failed to load menu defaults.',
                            error
                        );
                    }
                });

            return;
        }

        this.generateRoute();

        this.checkForChanges();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Generate Route
    //===========================================================

    private generateRoute():
        void
    {
        const selectedModule =
            this.modules.find(
                x => x.value === this.menu.navigationModuleId
            );

        if (!selectedModule)
        {
            this.menu.route = '';

            return;
        }

        const moduleRouteKey =
            (selectedModule.routeKey ?? '')
                .trim()
                .toLowerCase();

        const menuRouteKey =
            (this.menu.routeKey ?? '')
                .trim()
                .toLowerCase();

        if (
            moduleRouteKey === ''
            ||
            menuRouteKey === ''
        )
        {
            this.menu.route = '';

            return;
        }

        this.menu.route =
            `/${moduleRouteKey}/${menuRouteKey}`;
    }

    //===========================================================
    // Code Changed
    //===========================================================

    onValueChange():
        void
    {
        this.checkForChanges();
    }

    //===========================================================
    // Route Key Changed
    //===========================================================

    onRouteKeyChange():
        void
    {
        this.generateRoute();

        this.checkForChanges();

        this.cdr.detectChanges();
    }

}