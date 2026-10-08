//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
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
    FormsModule
}
from '@angular/forms';

import
{
    ActivatedRoute,
    Router
}
from '@angular/router';


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
    CommandCenterComponent
}
from '../../../../../../shared/components/utilities/command-center/command-center';

import
{
    PageToolbarComponent
}
from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';

import
{
    ControlTabsComponent,
    ControlTab
}
from '../../../../../../shared/components/controls/control-tabs/control-tabs';

import
{
    ToastComponent
}
from '../../../../../../shared/components/utilities/toast/toast';

import
{
    ConfirmDialogComponent
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';

import
{
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';


//===============================================================
// Models
//===============================================================

import
{
    PageCloning
}
from '../../../model/page-cloning.model';

import
{
    NavigationModule
}
from '../../../../navigation-management/models/navigation-module.model';


//===============================================================
// Services
//===============================================================

import
{
    PageCloningService
}
from '../../../services/page-cloning.service';

import
{
    ModuleService
}
from '../../../../navigation-management/services/module.service';

import
{
    NavigationMenuService
}
from '../../../../navigation-management/services/menu.service';

import
{
    NavigationSubmenuService
}
from '../../../../navigation-management/services/submenu.service';


//===============================================================
// Target Page Component
//===============================================================

@Component
({
    selector:'app-target-page',

    standalone:true,

    imports:
    [
        CommonModule,
        FormsModule,
        PageHeaderComponent,
        CommandCenterComponent,
        PageToolbarComponent,
        ControlTabsComponent,
        SearchDropdownComponent,
        ToastComponent,
        ConfirmDialogComponent
    ],

    templateUrl:'./target-page.html',

    styleUrls:
    [
        './target-page.css'
    ]
})


//===============================================================
// Target Page
//===============================================================

export class TargetPageComponent
implements OnInit
{

    //===========================================================
    // Services
    //===========================================================

    private router =
        inject(Router);

    private route =
        inject(ActivatedRoute);

    private pageCloningService =
        inject(PageCloningService);

    private moduleService =
        inject(ModuleService);

    private menuService =
        inject(NavigationMenuService);

    private submenuService =
        inject(NavigationSubmenuService);


    //===========================================================
    // Page State
    //===========================================================

    pageTitle =
        'Target Page Analysis';

    mode:
        'add' |
        'edit' |
        'view' =
        'add';

    pageCloningId =
        0;

    selectedTab =
        'target';

    isLoadingTarget =
        false;

    targetPageLoaded =
        false;


    tabs:
        ControlTab[] =
        [
            {
                id:'target',
                label:'Target Page Details'
            }
        ];


    //===========================================================
    // Target Page Selection
    //===========================================================

    cloneToModules:
        NavigationModule[] =
        [];

    cloneToMenus:
        any[] =
        [];

    cloneToSubmenus:
        any[] =
        [];

    selectedCloneToModuleId =
        0;

    selectedCloneToMenuId =
        0;

    selectedCloneToSubmenuId =
        0;


    //===========================================================
    // Page Cloning
    //===========================================================

    pageCloning:
        PageCloning =
        {
            id:0,

            cloneFromId:0,
            cloneFromCode:'',
            cloneFromName:'',

            cloneToId:0,
            cloneToCode:'',
            cloneToName:'',

            cloningType:'Page',

            numberOfFiles:15,

            operation:'Clone',

            status:'Pending',

            remarks:null,

            lastClonedBy:null,
            lastClonedDate:null,
            lastCloningResult:'',

            isActive:true,

            createdBy:0,
            createdDate:new Date(),

            modifiedBy:0,
            modifiedDate:null,

            deletedBy:null,
            deletedDate:null,

            isDeleted:false
        };


    //===========================================================
    // Lifecycle
    //===========================================================

    ngOnInit():
        void
    {
        this.loadPageMode();

        this.loadModules();

        this.initializeTargetPage();
    }


    //===========================================================
    // Initialize Target Page
    //===========================================================

    initializeTargetPage():
        void
    {
        this.cloneToMenus =
            [];

        this.cloneToSubmenus =
            [];

        this.selectedCloneToModuleId =
            0;

        this.selectedCloneToMenuId =
            0;

        this.selectedCloneToSubmenuId =
            0;

        this.isLoadingTarget =
            false;

        this.targetPageLoaded =
            false;
    }


    //===========================================================
    // Load Page Mode
    //===========================================================

    loadPageMode():
        void
    {
        const id =
            this.route.snapshot.paramMap.get
            (
                'id'
            );

        const currentRoute =
            this.router.url;

        if
        (
            currentRoute.includes('/view/')
        )
        {
            this.mode =
                'view';
        }
        else if
        (
            currentRoute.includes('/edit/')
        )
        {
            this.mode =
                'edit';
        }
        else
        {
            this.mode =
                'add';
        }

        if
        (
            id
        )
        {
            this.pageCloningId =
                Number(id);

            this.loadPageCloning
            (
                this.pageCloningId
            );
        }
    }


    //===========================================================
    // Load Modules
    //===========================================================

    loadModules():
        void
    {
        this.moduleService
            .getAll()
            .subscribe
            ({
                next:
                    modules =>
                    {
                        this.cloneToModules =
                            modules;
                    },

                error:
                    error =>
                    {
                        console.error
                        (
                            'Failed to load modules.',
                            error
                        );
                    }
            });
    }


    //===========================================================
    // Load Page Cloning
    //===========================================================

    loadPageCloning
    (
        id:number
    ):
        void
    {
        this.pageCloningService
            .getById(id)
            .subscribe
            ({
                next:
                    result =>
                    {
                        this.pageCloning =
                            result;

                        this.selectedCloneToSubmenuId =
                            result.cloneToId;

                        this.loadTargetSubmenu
                        (
                            result.cloneToId
                        );
                    },

                error:
                    error =>
                    {
                        console.error
                        (
                            'Failed to load page cloning.',
                            error
                        );
                    }
            });
    }


    //===========================================================
    // Load Target Submenu
    //===========================================================

    loadTargetSubmenu
    (
        submenuId:number
    ):
        void
    {
        if
        (
            submenuId <= 0
        )
        {
            return;
        }

        this.isLoadingTarget =
            true;

        this.submenuService
            .getById
            (
                submenuId
            )
            .subscribe
            ({
                next:
                    submenu =>
                    {
                        this.pageCloning.cloneToId =
                            Number(submenu.id);

                        this.pageCloning.cloneToCode =
                            submenu.code ??
                            '';

                        this.pageCloning.cloneToName =
                            submenu.name ??
                            '';

                        this.targetPageLoaded =
                            true;

                        this.isLoadingTarget =
                            false;
                    },

                error:
                    error =>
                    {
                        console.error
                        (
                            'Failed to load target submenu.',
                            error
                        );

                        this.targetPageLoaded =
                            false;

                        this.isLoadingTarget =
                            false;
                    }
            });
    }


    //===========================================================
    // Clone To Module Changed
    //===========================================================

    onCloneToModuleChange
    (
        moduleId:number
    ):
        void
    {
        this.selectedCloneToModuleId =
            Number(moduleId);

        this.selectedCloneToMenuId =
            0;

        this.selectedCloneToSubmenuId =
            0;

        this.cloneToMenus =
            [];

        this.cloneToSubmenus =
            [];

        this.pageCloning.cloneToId =
            0;

        this.pageCloning.cloneToCode =
            '';

        this.pageCloning.cloneToName =
            '';

        this.targetPageLoaded =
            false;

        if
        (
            this.selectedCloneToModuleId <= 0
        )
        {
            return;
        }

        this.menuService
            .getByModule
            (
                this.selectedCloneToModuleId
            )
            .subscribe
            ({
                next:
                    menus =>
                    {
                        this.cloneToMenus =
                            menus;
                    },

                error:
                    error =>
                    {
                        console.error
                        (
                            'Failed to load target menus.',
                            error
                        );
                    }
            });
    }


    //===========================================================
    // Clone To Menu Changed
    //===========================================================

    onCloneToMenuChange
    (
        menuId:number
    ):
        void
    {
        this.selectedCloneToMenuId =
            Number(menuId);

        this.selectedCloneToSubmenuId =
            0;

        this.cloneToSubmenus =
            [];

        this.pageCloning.cloneToId =
            0;

        this.pageCloning.cloneToCode =
            '';

        this.pageCloning.cloneToName =
            '';

        this.targetPageLoaded =
            false;

        if
        (
            this.selectedCloneToMenuId <= 0
        )
        {
            return;
        }

        this.submenuService
            .getByMenu
            (
                this.selectedCloneToMenuId
            )
            .subscribe
            ({
                next:
                    submenus =>
                    {
                        this.cloneToSubmenus =
                            submenus;
                    },

                error:
                    error =>
                    {
                        console.error
                        (
                            'Failed to load target submenus.',
                            error
                        );
                    }
            });
    }


    //===========================================================
    // Clone To Submenu Changed
    //===========================================================

    onCloneToSubmenuChange
    (
        submenuId:number
    ):
        void
    {
        this.selectedCloneToSubmenuId =
            Number(submenuId);

        this.targetPageLoaded =
            false;

        if
        (
            this.selectedCloneToSubmenuId <= 0
        )
        {
            this.pageCloning.cloneToId =
                0;

            this.pageCloning.cloneToCode =
                '';

            this.pageCloning.cloneToName =
                '';

            return;
        }

        const selected =
            this.cloneToSubmenus.find
            (
                submenu =>
                    Number(submenu.id) ===
                    this.selectedCloneToSubmenuId
            );

        this.pageCloning.cloneToId =
            this.selectedCloneToSubmenuId;

        this.pageCloning.cloneToCode =
            selected?.code ??
            '';

        this.pageCloning.cloneToName =
            selected?.name ??
            '';
    }


    //===========================================================
    // Submit Target Page
    //===========================================================

    onSubmitTarget():
        void
    {
        if
        (
            this.isViewMode ||
            this.selectedCloneToSubmenuId <= 0 ||
            this.isLoadingTarget
        )
        {
            return;
        }

        this.loadTargetSubmenu
        (
            this.selectedCloneToSubmenuId
        );
    }

    //===========================================================
    // Add Target Model Field
    //===========================================================

    onAddField():
        void
    {
        if
        (
            this.isViewMode ||
            !this.targetPageLoaded
        )
        {
            return;
        }

        console.log
        (
            'Add target model field.'
        );
    }

    //===========================================================
    // Generate
    //===========================================================

    onGenerate():
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }

        if
        (
            !this.targetPageLoaded ||
            this.selectedCloneToSubmenuId <= 0
        )
        {
            return;
        }

        console.log
        (
            'Target page selected.',
            this.pageCloning
        );
    }


    //===========================================================
    // Back To Source
    //===========================================================

    onBackToSource():
        void
    {
        this.router.navigate
        (
            [
                '/infrastructure-control',
                'development-management',
                'page-cloning',
                'source',
                'new'
            ]
        );
    }


    //===========================================================
    // Clear
    //===========================================================

    onClear():
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }

        this.selectedCloneToModuleId =
            0;

        this.selectedCloneToMenuId =
            0;

        this.selectedCloneToSubmenuId =
            0;

        this.cloneToMenus =
            [];

        this.cloneToSubmenus =
            [];

        this.targetPageLoaded =
            false;

        this.pageCloning =
        {
            ...this.pageCloning,

            cloneToId:0,
            cloneToCode:'',
            cloneToName:''
        };
    }


    //===========================================================
    // Mode Getters
    //===========================================================

    get isViewMode():
        boolean
    {
        return this.mode ===
            'view';
    }


    //===========================================================
    // Page Button Text
    //===========================================================

    get generateButtonText():
        string
    {
        return 'Generate';
    }

}