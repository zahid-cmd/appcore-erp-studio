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
// Parent Menu Service
//===============================================================

import
{
    NavigationMenuService
}
from '../../../services/menu.service';


//===============================================================
// Models & Services
//===============================================================

import
{
    NavigationSubmenu,
    NavigationSubmenuDefaults,
    CreateNavigationSubmenu,
    UpdateNavigationSubmenu
}
from '../../../models/navigation-submenu.model';

import
{
    NavigationSubmenuService
}
from '../../../services/submenu.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'app-navigation-submenu-form',

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


    templateUrl:'./sub-menu-form.html',


    styleUrls:
    [
        './sub-menu-form.css'
    ]
})


export class NavigationSubmenuFormComponent
implements OnInit
{


    //===========================================================
    // Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);


    private readonly router =
        inject(Router);


    private readonly navigationSubmenuService =
        inject(NavigationSubmenuService);


    private readonly navigationMenuService =
        inject(NavigationMenuService);


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


    submenuId =
        0;



    //===========================================================
    // Page Header
    //===========================================================

    pageTitle =
        'Navigation Submenu';



    //===========================================================
    // Entity
    //===========================================================

    entityName =
        'Submenu';



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
    // Navigation Menus Dropdown
    //===========================================================

    menus:any[] =
    [];



    //===========================================================
    // Model
    //===========================================================

    submenu: NavigationSubmenu =
    {
        id:0,

        navigationModuleId:0,

        navigationModuleCode:'',

        navigationModuleName:'',

        navigationMenuId:0,

        navigationMenuCode:'',

        navigationMenuName:'',

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

    private originalSubmenu =
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
            JSON.stringify(this.submenu)
            !==
            this.originalSubmenu;
    }

    //===========================================================
    // Generate Route Key
    //===========================================================

    private generateRouteKey():
        void
    {
        if
        (
            this.mode !== 'add'
        )
        {
            return;
        }

        this.submenu.routeKey =
            (this.submenu.name ?? '')
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

        this.generateRoute();
    }

    //===========================================================
    // Route Key Changed
    //===========================================================

    onRouteKeyChange():
        void
    {
        this.submenu.routeKey =
            (this.submenu.routeKey ?? '')
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

        this.generateRoute();

        this.checkForChanges();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.loadMenus();

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
            this.submenuId =
                id;

            this.loadSubmenu();

            return;
        }

        //=======================================================
        // Add
        //=======================================================

        this.submenu =
        {
            id:0,

            navigationModuleId:0,

            navigationModuleCode:'',

            navigationModuleName:'',

            navigationMenuId:0,

            navigationMenuCode:'',

            navigationMenuName:'',

            code:'',

            name:'',

            icon:'',

            routeKey:'',

            route:'',

            displayOrder:1,

            remarks:'',

            isActive:true
        };

        this.originalSubmenu =
            JSON.stringify(this.submenu);

        this.hasChanges =
            false;
    }

    //===========================================================
    // Load Navigation Menus
    //===========================================================

    private loadMenus():
        void
    {
        this.navigationMenuService
            .getAll()
            .subscribe(
            {
                next:(response) =>
                {
                    this.menus =
                        response.map(
                            item =>
                            ({
                                value:item.id,

                                text:item.name,

                                route:item.route
                            })
                        );

                    //===================================================
                    // Generate Route After Menu Load
                    //===================================================

                    if (this.submenu.navigationMenuId > 0)
                    {
                        this.generateRoute();
                    }

                    this.cdr.detectChanges();
                },

                error:(error) =>
                {
                    console.error(
                        'Failed to load navigation menus.',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Unable to load navigation menus.'
                    );
                }
            });
    }
    
    //===========================================================
    // Load Submenu
    //===========================================================

    private loadSubmenu():
        void
    {
        this.navigationSubmenuService
            .getById(this.submenuId)
            .subscribe(
            {
                next:(response) =>
                {
                    this.submenu =
                        response;


                    this.originalSubmenu =
                        JSON.stringify(this.submenu);


                    this.hasChanges =
                        false;


                    this.cdr.detectChanges();
                },


                error:(error) =>
                {
                    console.error(error);


                    this.toast.error(
                        'Error',
                        'Failed to load navigation submenu.'
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
        if(this.submenu.navigationMenuId <= 0)
        {
            return;
        }


        this.navigationSubmenuService
            .getDefaults(
                this.submenu.navigationMenuId
            )
            .subscribe(
            {
                next:(defaults: NavigationSubmenuDefaults) =>
                {
                    this.submenu.code =
                        defaults.code;


                    this.submenu.displayOrder =
                        defaults.displayOrder;


                    this.originalSubmenu =
                        JSON.stringify(this.submenu);


                    this.hasChanges =
                        false;


                    this.cdr.detectChanges();
                },


                error:(error) =>
                {
                    console.error(
                        'Failed to load submenu defaults.',
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
    // Generate Route
    //===========================================================

    generateRoute():
        void
    {
        const selectedMenu =
            this.menus.find(
                x =>
                    x.value ===
                    this.submenu.navigationMenuId
            );


        if (!selectedMenu)
        {
            this.submenu.route =
                '';

            return;
        }


        this.submenu.routeKey =
            (this.submenu.routeKey ?? '')
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');


        this.submenu.route =
            this.submenu.routeKey
                ? `${selectedMenu.route}/${this.submenu.routeKey}`
                : selectedMenu.route;
    }

    //===========================================================
    // Status Changed
    //===========================================================

    onStatusChange(
        value:boolean
    ):
        void
    {
        this.submenu.isActive =
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
    // Navigation Menu Changed
    //===========================================================

    onMenuChange(
        menuId:number
    ):
        void
    {
        this.submenu.navigationMenuId =
            menuId;


        const selected =
            this.menus.find(
                x =>
                    x.value === menuId
            );


        if (selected)
        {
            this.submenu.navigationMenuName =
                selected.text;
        }

        this.generateRoute();

        this.checkForChanges();

        //=======================================================
        // Load Defaults After Parent Menu Selection
        //=======================================================

        if
        (
            this.mode === 'add'
            &&
            menuId > 0
        )
        {
            this.navigationSubmenuService
                .getDefaults(menuId)
                .subscribe(
                {
                    next:(defaults:NavigationSubmenuDefaults) =>
                    {
                        this.submenu.code =
                            defaults.code;


                        this.submenu.displayOrder =
                            defaults.displayOrder;


                        this.originalSubmenu =
                            JSON.stringify(this.submenu);


                        this.hasChanges =
                            false;


                        this.cdr.detectChanges();
                    },


                    error:(error) =>
                    {
                        console.error(
                            'Failed to load submenu defaults.',
                            error
                        );


                        this.toast.error(
                            'Error',
                            'Unable to load submenu defaults.'
                        );
                    }
                });
        }
    }

    //===========================================================
    // Save
    //===========================================================

    onSave():
        void
    {
        if (!this.submenu.name.trim())
        {
            this.toast.warning(
                'Validation',
                'Submenu name is required.'
            );

            return;
        }

        if (!this.submenu.navigationMenuId)
        {
            this.toast.warning(
                'Validation',
                'Navigation menu is required.'
            );

            return;
        }

        //=======================================================
        // Create
        //=======================================================

        if (this.mode === 'add')
        {
            const model:CreateNavigationSubmenu =
            {
                navigationMenuId:
                    this.submenu.navigationMenuId,


                name:
                    this.submenu.name,


                icon:
                    this.submenu.icon,


                routeKey:
                    this.submenu.routeKey,


                displayOrder:
                    this.submenu.displayOrder,


                remarks:
                    this.submenu.remarks,


                isActive:
                    this.submenu.isActive
            };

            this.navigationSubmenuService
                .create(model)
                .subscribe(
                {
                    next:() =>
                    {
                        this.originalSubmenu =
                            JSON.stringify(this.submenu);


                        this.hasChanges =
                            false;


                        this.toast.success(
                            'Success',
                            'Navigation submenu created successfully.'
                        );


                        this.onBackToList();
                    },


                    error:(error) =>
                    {
                        console.error(error);


                        const message =
                            error?.error
                            ??
                            'Failed to create navigation submenu.';



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

        const model:UpdateNavigationSubmenu =
        {
            id:
                this.submenu.id,


            navigationMenuId:
                this.submenu.navigationMenuId,


            name:
                this.submenu.name,


            icon:
                this.submenu.icon,


            routeKey:
                this.submenu.routeKey,


            displayOrder:
                this.submenu.displayOrder,


            remarks:
                this.submenu.remarks,


            isActive:
                this.submenu.isActive
        };

        this.navigationSubmenuService
            .update(model)
            .subscribe(
            {
                next:() =>
                {
                    this.originalSubmenu =
                        JSON.stringify(this.submenu);


                    this.hasChanges =
                        false;


                    this.toast.success(
                        'Success',
                        'Navigation submenu updated successfully.'
                    );


                    this.onBackToList();
                },

                error:(error) =>
                {
                    console.error(error);


                    const message =
                        error?.error
                        ??
                        'Failed to update navigation submenu.';



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
            // - Navigation Menu
            // - Code
            // - Display Order

            this.submenu.name =
                '';

            this.submenu.icon =
                '';

            this.submenu.route =
                '';

            this.submenu.remarks =
                '';

            this.submenu.isActive =
                true;

            this.checkForChanges();

            return;
        }

        //=======================================================
        // Add Mode Reset
        //=======================================================

        this.submenu =
        {
            id:0,

            navigationModuleId:0,

            navigationModuleCode:'',

            navigationModuleName:'',

            navigationMenuId:0,

            navigationMenuCode:'',

            navigationMenuName:'',

            code:'',

            name:'',

            icon:'',

            routeKey:'',

            route:'',

            displayOrder:1,

            remarks:'',

            isActive:true
        };

        this.hasChanges =
            false;

        //=======================================================
        // Do not call defaults without parent menu
        //=======================================================

        this.cdr.detectChanges();
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
                '/infrastructure-control/navigation-management/navigation-submenus'
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
                    '/infrastructure-control/navigation-management/navigation-submenus'
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
        if
        (
            this.mode === 'edit'
            ||
            this.mode === 'view'
        )
        {
            this.loadSubmenu();

            return;
        }


        this.loadDefaults();
    }


    //===========================================================
    // Value Changed
    //===========================================================

    onValueChange():
        void
    {
        this.generateRouteKey();

        this.checkForChanges();

        this.cdr.detectChanges();
    }

}