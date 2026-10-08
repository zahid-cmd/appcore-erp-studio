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
    PageCloning,
    PageCloningModelField,
    PageCloningSourceAnalysis,
    PageCloningSourceFile
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
// Source Page Component
//===============================================================

@Component
({
    selector:'app-source-page',

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

    templateUrl:'./source-page.html',

    styleUrls:
    [
        './source-page.css'
    ]
})


//===============================================================
// Source Page
//===============================================================

export class SourcePageComponent
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
        'Source Page Analysis';

    mode:
        'add' |
        'edit' |
        'view' =
        'add';

    pageCloningId =
        0;

    selectedTab =
        'source';


    tabs:
        ControlTab[] =
        [
            {
                id:'source',
                label:'Source Page Details'
            }
        ];


    //===========================================================
    // Source Page Selection
    //===========================================================

    cloneFromModules:
        NavigationModule[] =
        [];

    cloneFromMenus:
        any[] =
        [];

    cloneFromSubmenus:
        any[] =
        [];

    selectedCloneFromModuleId =
        0;

    selectedCloneFromMenuId =
        0;

    selectedCloneFromSubmenuId =
        0;


    //===========================================================
    // Source Analysis
    //===========================================================

    pageCloningFiles:
        PageCloningSourceFile[] =
        [];

    sourceModelFields:
        PageCloningModelField[] =
        [];

    isAnalyzing =
        false;

    sourceAnalysisReady =
        false;

    sourceAnalysisFileCount =
        0;


    //===========================================================
    // File Search
    //===========================================================

    fileSearchText =
        '';


    //===========================================================
    // Standard Files
    //===========================================================

    standardFileCount =
        15;


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

            modifiedBy:null,
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

        this.initializeSourcePage();
    }


    //===========================================================
    // Initialize Source Page
    //===========================================================

    initializeSourcePage():
        void
    {
        this.pageCloningFiles =
            [];

        this.sourceModelFields =
            [];

        this.sourceAnalysisReady =
            false;

        this.sourceAnalysisFileCount =
            0;
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
                        this.cloneFromModules =
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

                        this.selectedCloneFromSubmenuId =
                            result.cloneFromId;

                        this.loadSourceSubmenu
                        (
                            result.cloneFromId
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
    // Load Source Submenu
    //===========================================================

    loadSourceSubmenu
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
                        const selected =
                            this.cloneFromSubmenus.find
                            (
                                item =>
                                    Number(item.id) ===
                                    submenuId
                            );

                        if
                        (
                            selected
                        )
                        {
                            this.pageCloning.cloneFromCode =
                                selected.code ??
                                '';

                            this.pageCloning.cloneFromName =
                                selected.name ??
                                '';
                        }
                    },

                error:
                    error =>
                    {
                        console.error
                        (
                            'Failed to load source submenu.',
                            error
                        );
                    }
            });
    }


    //===========================================================
    // Clone From Module Changed
    //===========================================================

    onCloneFromModuleChange
    (
        moduleId:number
    ):
        void
    {
        this.selectedCloneFromModuleId =
            Number(moduleId);

        this.selectedCloneFromMenuId =
            0;

        this.selectedCloneFromSubmenuId =
            0;

        this.cloneFromMenus =
            [];

        this.cloneFromSubmenus =
            [];

        this.pageCloning.cloneFromId =
            0;

        this.pageCloning.cloneFromCode =
            '';

        this.pageCloning.cloneFromName =
            '';

        this.clearSourceAnalysis();

        if
        (
            this.selectedCloneFromModuleId <= 0
        )
        {
            return;
        }

        this.menuService
            .getByModule
            (
                this.selectedCloneFromModuleId
            )
            .subscribe
            ({
                next:
                    menus =>
                    {
                        this.cloneFromMenus =
                            menus;
                    },

                error:
                    error =>
                    {
                        console.error
                        (
                            'Failed to load menus.',
                            error
                        );
                    }
            });
    }


    //===========================================================
    // Clone From Menu Changed
    //===========================================================

    onCloneFromMenuChange
    (
        menuId:number
    ):
        void
    {
        this.selectedCloneFromMenuId =
            Number(menuId);

        this.selectedCloneFromSubmenuId =
            0;

        this.cloneFromSubmenus =
            [];

        this.pageCloning.cloneFromId =
            0;

        this.pageCloning.cloneFromCode =
            '';

        this.pageCloning.cloneFromName =
            '';

        this.clearSourceAnalysis();

        if
        (
            this.selectedCloneFromMenuId <= 0
        )
        {
            return;
        }

        this.submenuService
            .getByMenu
            (
                this.selectedCloneFromMenuId
            )
            .subscribe
            ({
                next:
                    submenus =>
                    {
                        this.cloneFromSubmenus =
                            submenus;
                    },

                error:
                    error =>
                    {
                        console.error
                        (
                            'Failed to load submenus.',
                            error
                        );
                    }
            });
    }


    //===========================================================
    // Clone From Submenu Changed
    //===========================================================

    onCloneFromSubmenuChange
    (
        submenuId:number
    ):
        void
    {
        this.selectedCloneFromSubmenuId =
            Number(submenuId);

        this.clearSourceAnalysis();

        if
        (
            this.selectedCloneFromSubmenuId <= 0
        )
        {
            this.pageCloning.cloneFromId =
                0;

            this.pageCloning.cloneFromCode =
                '';

            this.pageCloning.cloneFromName =
                '';

            return;
        }

        const selected =
            this.cloneFromSubmenus.find
            (
                submenu =>
                    Number(submenu.id) ===
                    this.selectedCloneFromSubmenuId
            );

        this.pageCloning.cloneFromId =
            this.selectedCloneFromSubmenuId;

        this.pageCloning.cloneFromCode =
            selected?.code ??
            '';

        this.pageCloning.cloneFromName =
            selected?.name ??
            '';
    }


    //===========================================================
    // Analyze Source Page
    //===========================================================

    onAnalyze():
        void
    {
        if
        (
            this.isViewMode ||
            this.isAnalyzing
        )
        {
            return;
        }

        if
        (
            this.selectedCloneFromSubmenuId <= 0
        )
        {
            return;
        }

        this.isAnalyzing =
            true;

        this.pageCloningService
            .analyzeSource
            (
                this.selectedCloneFromSubmenuId
            )
            .subscribe
            ({
                next:
                    result =>
                    {
                        this.applySourceAnalysis
                        (
                            result
                        );

                        this.isAnalyzing =
                            false;
                    },

                error:
                    error =>
                    {
                        console.error
                        (
                            'Source analysis failed.',
                            error
                        );

                        this.isAnalyzing =
                            false;
                    }
            });
    }


    //===========================================================
    // Apply Source Analysis
    //===========================================================

    applySourceAnalysis
    (
        result:PageCloningSourceAnalysis
    ):
        void
    {
        this.pageCloningFiles =
            result.files ??
            [];

        this.sourceModelFields =
            result.modelFields ??
            [];

        this.sourceAnalysisFileCount =
            this.pageCloningFiles.length;

        this.sourceAnalysisReady =
            this.sourceAnalysisFileCount ===
            this.standardFileCount;

        this.pageCloning.numberOfFiles =
            this.sourceAnalysisFileCount;

        this.pageCloning.status =
            this.sourceAnalysisReady
                ? 'Ready'
                : 'Pending';
    }


    //===========================================================
    // Clear Source Analysis
    //===========================================================

    clearSourceAnalysis():
        void
    {
        this.pageCloningFiles =
            [];

        this.sourceModelFields =
            [];

        this.sourceAnalysisFileCount =
            0;

        this.sourceAnalysisReady =
            false;
    }


    //===========================================================
    // Continue To Target Page
    //===========================================================

    onContinue():
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }

        this.router.navigate
        (
            [
                '/infrastructure-control',
                'development-management',
                'page-cloning',
                'target',
                'new'
            ]
        );
    }

    //===========================================================
    // Back To List
    //===========================================================

    onBackToList():
        void
    {
        this.router.navigate
        (
            [
                '/infrastructure-control',
                'development-management',
                'page-cloning',
                'list'
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

        this.selectedCloneFromModuleId =
            0;

        this.selectedCloneFromMenuId =
            0;

        this.selectedCloneFromSubmenuId =
            0;

        this.cloneFromMenus =
            [];

        this.cloneFromSubmenus =
            [];

        this.pageCloning =
        {
            ...this.pageCloning,

            cloneFromId:0,
            cloneFromCode:'',
            cloneFromName:''
        };

        this.clearSourceAnalysis();
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

    get continueButtonText():
        string
    {
        return 'Continue';
    }


    //===========================================================
    // Filtered Files
    //===========================================================

    get filteredPageCloningFiles():
        PageCloningSourceFile[]
    {
        const search =
            this.fileSearchText
                .trim()
                .toLowerCase();

        if
        (
            !search
        )
        {
            return this.pageCloningFiles;
        }

        return this.pageCloningFiles.filter
        (
            file =>
                file.fileType
                    .toLowerCase()
                    .includes(search)

                ||

                file.fileName
                    .toLowerCase()
                    .includes(search)

                ||

                file.location
                    .toLowerCase()
                    .includes(search)

                ||

                file.category
                    .toLowerCase()
                    .includes(search)
        );
    }


    //===========================================================
    // Primary & Navigation Fields
    //===========================================================

    get primaryNavigationFields():
        PageCloningModelField[]
    {
        return this.sourceModelFields.filter
        (
            field =>
                field.category ===
                'Primary & Navigation'
        );
    }


    //===========================================================
    // Business & Functional Fields
    //===========================================================

    get businessFunctionalFields():
        PageCloningModelField[]
    {
        return this.sourceModelFields.filter
        (
            field =>
                field.category ===
                'Business & Functional'
        );
    }


    //===========================================================
    // Audit & System Fields
    //===========================================================

    get auditSystemFields():
        PageCloningModelField[]
    {
        return this.sourceModelFields.filter
        (
            field =>
                field.category ===
                'Audit & System'
        );
    }

}