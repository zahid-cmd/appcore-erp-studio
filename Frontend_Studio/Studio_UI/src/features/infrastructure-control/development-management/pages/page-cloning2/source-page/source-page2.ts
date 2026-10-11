//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    NgZone,
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

import
{
    finalize,
    timeout
}
from 'rxjs';


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
from '../../../model/page-cloning2.model';

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
from '../../../services/page-cloning.service2';

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
    selector: 'app-source-page',
    standalone: true,

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

    templateUrl: './source-page2.html',

    styleUrls:
    [
        './source-page2.css'
    ]
})


//===============================================================
// Source Page
//===============================================================

export class SourcePageComponent implements OnInit
{
    //===========================================================
    // Services
    //===========================================================

    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly pageCloningService = inject(PageCloningService);
    private readonly moduleService = inject(ModuleService);
    private readonly menuService = inject(NavigationMenuService);
    private readonly submenuService = inject(NavigationSubmenuService);


    //===========================================================
    // Change Detection
    //===========================================================

    private readonly cdr = inject(ChangeDetectorRef);
    private readonly ngZone = inject(NgZone);


    //===========================================================
    // Page State
    //===========================================================

    pageTitle = 'Source Page Analysis';

    mode: 'add' | 'edit' | 'view' = 'add';

    pageCloningId = 0;

    selectedTab = 'source';

    tabs: ControlTab[] =
    [
        {
            id: 'source',
            label: 'Source Page Details'
        }
    ];


    //===========================================================
    // Source Page Selection
    //===========================================================

    cloneFromModules: NavigationModule[] = [];

    cloneFromMenus: any[] = [];

    cloneFromSubmenus: any[] = [];

    selectedCloneFromModuleId = 0;

    selectedCloneFromMenuId = 0;

    selectedCloneFromSubmenuId = 0;

    analysisError = '';


    //===========================================================
    // Source Analysis
    //===========================================================

    pageCloningFiles: PageCloningSourceFile[] = [];

    sourceModelFields: PageCloningModelField[] = [];

    sourceAnalysis: PageCloningSourceAnalysis | null = null;

    isAnalyzing = false;

    sourceAnalysisReady = false;

    sourceAnalysisFileCount = 0;


    //===========================================================
    // File Search
    //===========================================================

    fileSearchText = '';


    //===========================================================
    // Standard Files
    //===========================================================

    standardFileCount = 15;


    //===========================================================
    // Page Cloning
    //===========================================================

    pageCloning: PageCloning =
    {
        id: 0,

        cloneFromId: 0,
        cloneFromCode: '',
        cloneFromName: '',

        cloneToId: 0,
        cloneToCode: '',
        cloneToName: '',

        cloningType: 'Page',
        numberOfFiles: 15,
        operation: 'Clone',
        status: 'Pending',
        remarks: null,

        lastClonedBy: null,
        lastClonedDate: null,
        lastCloningResult: '',

        isActive: true,
        isDeleted: false,

        createdBy: 0,
        createdDate: new Date(),

        modifiedBy: null,
        modifiedDate: null,

        deletedBy: null,
        deletedDate: null
    };


    //===========================================================
    // Lifecycle
    //===========================================================

    ngOnInit(): void
    {
        this.loadPageMode();
        this.loadModules();
        this.restoreSourcePageState();
    }


    //===========================================================
    // Restore Source Page State
    //===========================================================

    restoreSourcePageState(): void
    {
        const state = this.pageCloningService.getWorkflowState();

        if (!state)
        {
            this.initializeSourcePage();
            return;
        }

        this.pageCloning = state.pageCloning
            ? { ...state.pageCloning }
            : this.pageCloning;

        this.selectedCloneFromModuleId =
            state.selectedCloneFromModuleId ?? 0;

        this.selectedCloneFromMenuId =
            state.selectedCloneFromMenuId ?? 0;

        this.selectedCloneFromSubmenuId =
            state.selectedCloneFromSubmenuId ?? 0;

        this.pageCloningFiles = [...(state.pageCloningFiles ?? [])];

        this.sourceModelFields = [...(state.sourceModelFields ?? [])];

        this.sourceAnalysisFileCount =
            state.sourceAnalysisFileCount ?? 0;

        this.sourceAnalysisReady =
            state.sourceAnalysisReady === true &&
            this.sourceAnalysisFileCount === this.standardFileCount &&
            this.pageCloningFiles.length === this.standardFileCount &&
            this.pageCloningFiles.every(
                file => file.exists && file.action !== 'Missing'
            );

        this.sourceAnalysis =
            state.sourceAnalysis ?? null;

        this.isAnalyzing = false;
        this.analysisError = '';

        // Restore the dependent dropdowns sequentially.
        this.restoreSourceSelections();
    }


    //===========================================================
    // Restore Source Selections
    //===========================================================

    private restoreSourceSelections(): void
    {
        const moduleId = this.selectedCloneFromModuleId;
        const menuId = this.selectedCloneFromMenuId;
        const submenuId = this.selectedCloneFromSubmenuId;

        if (moduleId <= 0)
        {
            this.cloneFromMenus = [];
            this.cloneFromSubmenus = [];
            this.cdr.detectChanges();
            return;
        }

        this.menuService.getByModule(moduleId).subscribe(
        {
            next: menus =>
            {
                this.ngZone.run(() =>
                {
                    this.cloneFromMenus = menus ?? [];

                    if (
                        menuId <= 0 ||
                        !this.cloneFromMenus.some(
                            menu => Number(menu.id) === menuId
                        )
                    )
                    {
                        this.selectedCloneFromMenuId = 0;
                        this.selectedCloneFromSubmenuId = 0;
                        this.cloneFromSubmenus = [];
                        this.cdr.detectChanges();
                        return;
                    }

                    this.submenuService.getByMenu(menuId).subscribe(
                    {
                        next: submenus =>
                        {
                            this.ngZone.run(() =>
                            {
                                this.cloneFromSubmenus = submenus ?? [];

                                if (
                                    submenuId > 0 &&
                                    this.cloneFromSubmenus.some(
                                        submenu =>
                                            Number(submenu.id) === submenuId
                                    )
                                )
                                {
                                    this.selectedCloneFromSubmenuId =
                                        submenuId;

                                    this.pageCloning.cloneFromId =
                                        submenuId;

                                    this.setSelectedSourceDetails(
                                        this.cloneFromSubmenus.find(
                                            submenu =>
                                                Number(submenu.id) === submenuId
                                        )
                                    );
                                }
                                else
                                {
                                    this.selectedCloneFromSubmenuId = 0;
                                    this.pageCloning.cloneFromId = 0;
                                    this.pageCloning.cloneFromCode = '';
                                    this.pageCloning.cloneFromName = '';
                                    this.clearSourceAnalysis();
                                }

                                this.cdr.detectChanges();
                            });
                        },

                        error: error =>
                        {
                            console.error(
                                'Failed to restore source submenus.',
                                error
                            );
                        }
                    });

                    this.cdr.detectChanges();
                });
            },

            error: error =>
            {
                console.error(
                    'Failed to restore source menus.',
                    error
                );
            }
        });
    }


    //===========================================================
    // Initialize Source Page
    //===========================================================

    initializeSourcePage(): void
    {
        this.pageCloningFiles = [];
        this.sourceModelFields = [];
        this.sourceAnalysis = null;

        this.sourceAnalysisReady = false;
        this.sourceAnalysisFileCount = 0;

        this.analysisError = '';
        this.isAnalyzing = false;
    }


    //===========================================================
    // Save Source Workflow State
    //===========================================================

    saveSourceWorkflowState(): void
    {
        this.sourceAnalysis =
        {
            submenuId: this.selectedCloneFromSubmenuId,
            submenuCode: this.pageCloning.cloneFromCode,
            submenuName: this.pageCloning.cloneFromName,
            files: [...this.pageCloningFiles],
            modelFields: [...this.sourceModelFields]
        };

        this.pageCloningService.setWorkflowState(
        {
            pageCloning: { ...this.pageCloning },

            selectedCloneFromModuleId:
                this.selectedCloneFromModuleId,

            selectedCloneFromMenuId:
                this.selectedCloneFromMenuId,

            selectedCloneFromSubmenuId:
                this.selectedCloneFromSubmenuId,

            pageCloningFiles: [...this.pageCloningFiles],

            sourceModelFields: [...this.sourceModelFields],

            sourceAnalysis: this.sourceAnalysis,

            sourceAnalysisReady: this.sourceAnalysisReady,

            sourceAnalysisFileCount: this.sourceAnalysisFileCount
        });
    }


    //===========================================================
    // Load Page Mode
    //===========================================================

    loadPageMode(): void
    {
        const id = this.route.snapshot.paramMap.get('id');
        const currentRoute = this.router.url;

        if (currentRoute.includes('/view/'))
        {
            this.mode = 'view';
        }
        else if (currentRoute.includes('/edit/'))
        {
            this.mode = 'edit';
        }
        else
        {
            this.mode = 'add';
        }

        if (id)
        {
            const parsedId = Number(id);

            if (Number.isInteger(parsedId) && parsedId > 0)
            {
                this.pageCloningId = parsedId;
                this.loadPageCloning(parsedId);
            }
        }
    }


    //===========================================================
    // Load Modules
    //===========================================================

    loadModules(): void
    {
        this.moduleService.getAll().subscribe(
        {
            next: modules =>
            {
                this.ngZone.run(() =>
                {
                    this.cloneFromModules = modules ?? [];
                    this.cdr.detectChanges();
                });
            },

            error: error =>
            {
                console.error('Failed to load modules.', error);
                this.analysisError = 'Unable to load modules.';
                this.cdr.detectChanges();
            }
        });
    }


    //===========================================================
    // Load Page Cloning
    //===========================================================

    loadPageCloning(id: number): void
    {
        this.pageCloningService.getById(id).subscribe(
        {
            next: result =>
            {
                this.ngZone.run(() =>
                {
                    this.pageCloning = result;

                    this.selectedCloneFromSubmenuId =
                        Number(result.cloneFromId) || 0;

                    this.loadSourceSubmenu(
                        this.selectedCloneFromSubmenuId
                    );

                    this.cdr.detectChanges();
                });
            },

            error: error =>
            {
                console.error('Failed to load page cloning.', error);
                this.analysisError = 'Unable to load Page Cloning record.';
                this.cdr.detectChanges();
            }
        });
    }


    //===========================================================
    // Load Source Submenu
    //===========================================================

    loadSourceSubmenu(submenuId: number): void
    {
        if (submenuId <= 0)
        {
            return;
        }

        this.submenuService.getById(submenuId).subscribe(
        {
            next: submenu =>
            {
                this.ngZone.run(() =>
                {
                    //===================================================
                    // Update Selected Source Submenu
                    //===================================================

                    this.selectedCloneFromSubmenuId = submenuId;

                    this.pageCloning.cloneFromId = submenuId;
                    this.pageCloning.cloneFromCode = submenu.code ?? '';
                    this.pageCloning.cloneFromName = submenu.name ?? '';


                    //===================================================
                    // Restore Menu Selection
                    //===================================================

                    const selectedSubmenu = this.cloneFromSubmenus.find(
                        item => Number(item.id) === submenuId
                    );

                    if (selectedSubmenu)
                    {
                        this.setSelectedSourceDetails(selectedSubmenu);
                    }


                    //===================================================
                    // Restore Dependent Dropdowns
                    //===================================================

                    this.restoreSourceSelections();

                    this.cdr.detectChanges();
                });
            },

            error: error =>
            {
                console.error(
                    'Failed to load source submenu.',
                    error
                );

                this.analysisError =
                    'Unable to load the selected source submenu.';

                this.cdr.detectChanges();
            }
        });
    }



    //===========================================================
    // Clone From Module Changed
    //===========================================================

    onCloneFromModuleChange(moduleId: number): void
    {
        this.selectedCloneFromModuleId = Number(moduleId) || 0;

        this.selectedCloneFromMenuId = 0;
        this.selectedCloneFromSubmenuId = 0;

        this.cloneFromMenus = [];
        this.cloneFromSubmenus = [];

        this.pageCloning.cloneFromId = 0;
        this.pageCloning.cloneFromCode = '';
        this.pageCloning.cloneFromName = '';

        this.clearSourceAnalysis();
        this.analysisError = '';

        if (this.selectedCloneFromModuleId <= 0)
        {
            this.saveSourceWorkflowState();
            return;
        }

        this.menuService
            .getByModule(this.selectedCloneFromModuleId)
            .subscribe(
            {
                next: menus =>
                {
                    this.ngZone.run(() =>
                    {
                        this.cloneFromMenus = menus ?? [];
                        this.saveSourceWorkflowState();
                        this.cdr.detectChanges();
                    });
                },

                error: error =>
                {
                    console.error('Failed to load menus.', error);
                    this.analysisError = 'Unable to load menus for this module.';
                    this.cdr.detectChanges();
                }
            });
    }


    //===========================================================
    // Clone From Menu Changed
    //===========================================================

    onCloneFromMenuChange(menuId: number): void
    {
        this.selectedCloneFromMenuId = Number(menuId) || 0;

        this.selectedCloneFromSubmenuId = 0;
        this.cloneFromSubmenus = [];

        this.pageCloning.cloneFromId = 0;
        this.pageCloning.cloneFromCode = '';
        this.pageCloning.cloneFromName = '';

        this.clearSourceAnalysis();
        this.analysisError = '';

        if (this.selectedCloneFromMenuId <= 0)
        {
            this.saveSourceWorkflowState();
            return;
        }

        this.submenuService
            .getByMenu(this.selectedCloneFromMenuId)
            .subscribe(
            {
                next: submenus =>
                {
                    this.ngZone.run(() =>
                    {
                        this.cloneFromSubmenus = submenus ?? [];
                        this.saveSourceWorkflowState();
                        this.cdr.detectChanges();
                    });
                },

                error: error =>
                {
                    console.error('Failed to load submenus.', error);
                    this.analysisError = 'Unable to load submenus for this menu.';
                    this.cdr.detectChanges();
                }
            });
    }


    //===========================================================
    // Clone From Submenu Changed
    //===========================================================

    onCloneFromSubmenuChange(submenuId: number): void
    {
        this.selectedCloneFromSubmenuId = Number(submenuId) || 0;

        this.clearSourceAnalysis();
        this.analysisError = '';

        if (this.selectedCloneFromSubmenuId <= 0)
        {
            this.pageCloning.cloneFromId = 0;
            this.pageCloning.cloneFromCode = '';
            this.pageCloning.cloneFromName = '';

            this.saveSourceWorkflowState();
            this.cdr.detectChanges();
            return;
        }

        const selected = this.cloneFromSubmenus.find(
            submenu =>
                Number(submenu.id ?? submenu.Id) ===
                this.selectedCloneFromSubmenuId
        );

        this.pageCloning.cloneFromId =
            this.selectedCloneFromSubmenuId;

        this.setSelectedSourceDetails(selected);

        this.saveSourceWorkflowState();
        this.cdr.detectChanges();
    }


    //===========================================================
    // Set Selected Source Details
    //===========================================================

    private setSelectedSourceDetails(submenu: any): void
    {
        if (!submenu)
        {
            return;
        }

        this.pageCloning.cloneFromCode =
            submenu.code ?? submenu.Code ?? '';

        this.pageCloning.cloneFromName =
            submenu.name ?? submenu.Name ?? '';
    }


    //===========================================================
    // Analyze Source Page
    //===========================================================

    onAnalyze(): void
    {
        if (this.isViewMode || this.isAnalyzing)
        {
            return;
        }

        if (this.selectedCloneFromSubmenuId <= 0)
        {
            this.analysisError = 'Please select a source submenu.';
            this.cdr.detectChanges();
            return;
        }

        const submenuId = this.selectedCloneFromSubmenuId;

        this.isAnalyzing = true;
        this.analysisError = '';

        this.clearSourceAnalysis();
        this.cdr.detectChanges();

        this.pageCloningService
            .analyzeSource(submenuId)
            .pipe(
                timeout(30000),

                finalize(() =>
                {
                    this.ngZone.run(() =>
                    {
                        this.isAnalyzing = false;
                        this.cdr.detectChanges();
                    });
                })
            )
            .subscribe(
            {
                next: result =>
                {
                    this.ngZone.run(() =>
                    {
                        this.applySourceAnalysis(result);

                        if (this.pageCloningFiles.length === 0)
                        {
                            this.analysisError =
                                'The API returned no source files.';
                        }
                        else if (!this.sourceAnalysisReady)
                        {
                            this.analysisError =
                                `Source analysis returned ${this.sourceAnalysisFileCount} files. ` +
                                `All ${this.standardFileCount} required files must exist before continuing.`;
                        }

                        this.saveSourceWorkflowState();
                        this.cdr.detectChanges();
                    });
                },

                error: error =>
                {
                    this.ngZone.run(() =>
                    {
                        console.error(
                            'Page Cloning: Source analysis failed.',
                            error
                        );

                        this.clearSourceAnalysis();

                        this.analysisError =
                            error?.name === 'TimeoutError'
                                ? 'Source analysis timed out after 30 seconds. Check the backend API.'
                                : typeof error?.error === 'string'
                                    ? error.error
                                    : error?.error?.message ??
                                      error?.message ??
                                      'Unable to analyze source files. Check the API and server logs.';

                        this.cdr.detectChanges();
                    });
                }
            });
    }


    //===========================================================
    // Apply Source Analysis
    //===========================================================

    applySourceAnalysis(result: any): void
    {
        const files = result?.files ?? result?.Files ?? [];

        const modelFields =
            result?.modelFields ?? result?.ModelFields ?? [];

        const submenuId = Number(
            result?.submenuId ??
            result?.SubmenuId ??
            this.selectedCloneFromSubmenuId
        );

        const submenuCode =
            result?.submenuCode ??
            result?.SubmenuCode ??
            this.pageCloning.cloneFromCode;

        const submenuName =
            result?.submenuName ??
            result?.SubmenuName ??
            this.pageCloning.cloneFromName;

        this.pageCloningFiles = Array.isArray(files)
            ? files.map((file: any) =>
            ({
                ...file,

                id: Number(file.id ?? file.Id ?? 0),

                category:
                    file.category ?? file.Category ?? '',

                fileType:
                    file.fileType ?? file.FileType ?? '',

                fileName:
                    file.fileName ?? file.FileName ?? '',

                location:
                    file.location ?? file.Location ?? '',

                path:
                    file.path ?? file.Path ?? '',

                exists:
                    (file.exists ?? file.Exists) === true,

                action:
                    file.action ?? file.Action ?? 'Missing'
            }))
            : [];

        this.sourceModelFields = Array.isArray(modelFields)
            ? modelFields.map((field: any) =>
            ({
                ...field,

                inputModel:
                    field.inputModel ??
                    field.InputModel ??
                    '',

                sourceField:
                    field.sourceField ??
                    field.SourceField ??
                    field.name ??
                    field.Name ??
                    '',

                name:
                    field.name ??
                    field.Name ??
                    '',

                type:
                    field.type ??
                    field.Type ??
                    'unknown',

                category:
                    field.category ??
                    field.Category ??
                    'Business & Functional',

                required:
                    (field.required ??
                    field.Required ??
                    false) === true,

                operation:
                    field.operation ??
                    field.Operation ??
                    'Keep',

                description:
                    field.description ??
                    field.Description,

                defaultValue:
                    field.defaultValue ??
                    field.DefaultValue
            }))
            : [];

        this.sourceAnalysisFileCount =
            this.pageCloningFiles.length;

        this.sourceAnalysis =
        {
            submenuId,
            submenuCode,
            submenuName,
            files: [...this.pageCloningFiles],
            modelFields: [...this.sourceModelFields]
        };

        this.sourceAnalysisReady =
            submenuId === this.selectedCloneFromSubmenuId &&
            this.sourceAnalysisFileCount === this.standardFileCount &&
            this.pageCloningFiles.every(
                file => file.exists && file.action !== 'Missing'
            );

        this.pageCloning.numberOfFiles =
            this.sourceAnalysisFileCount;

        this.pageCloning.status =
            this.sourceAnalysisReady ? 'Ready' : 'Pending';
    }


    //===========================================================
    // Clear Source Analysis
    //===========================================================

    clearSourceAnalysis(): void
    {
        this.pageCloningFiles = [];
        this.sourceModelFields = [];
        this.sourceAnalysis = null;

        this.sourceAnalysisFileCount = 0;
        this.sourceAnalysisReady = false;

        this.pageCloning.numberOfFiles = this.standardFileCount;

        if (this.pageCloning.status === 'Ready')
        {
            this.pageCloning.status = 'Pending';
        }
    }


    //===========================================================
    // Continue To Target Page
    //===========================================================

    onContinue(): void
    {
        if (this.isViewMode || this.isAnalyzing)
        {
            return;
        }

        if (this.selectedCloneFromSubmenuId <= 0)
        {
            this.analysisError = 'Please select a source submenu.';
            this.cdr.detectChanges();
            return;
        }

        if (!this.sourceAnalysisReady)
        {
            this.analysisError =
                `Analyze the source page and verify all ${this.standardFileCount} required files before continuing.`;

            this.cdr.detectChanges();
            return;
        }

        this.saveSourceWorkflowState();

        this.router.navigate(
        [
            '/infrastructure-control',
            'development-management',
            'page-cloning',
            'target',
            'new'
        ]);
    }


    //===========================================================
    // Back To List
    //===========================================================

    onBackToList(): void
    {
        this.router.navigate(
        [
            '/infrastructure-control',
            'development-management',
            'page-cloning',
            'list'
        ]);
    }


    //===========================================================
    // Clear
    //===========================================================

    onClear(): void
    {
        if (this.isViewMode || this.isAnalyzing)
        {
            return;
        }

        this.selectedCloneFromModuleId = 0;
        this.selectedCloneFromMenuId = 0;
        this.selectedCloneFromSubmenuId = 0;

        this.cloneFromMenus = [];
        this.cloneFromSubmenus = [];

        this.pageCloning =
        {
            ...this.pageCloning,

            cloneFromId: 0,
            cloneFromCode: '',
            cloneFromName: '',

            numberOfFiles: this.standardFileCount,
            status: 'Pending'
        };

        this.clearSourceAnalysis();

        this.analysisError = '';
        this.fileSearchText = '';

        this.pageCloningService.clearWorkflowState();

        this.cdr.detectChanges();
    }


    //===========================================================
    // Mode Getters
    //===========================================================

    get isViewMode(): boolean
    {
        return this.mode === 'view';
    }


    //===========================================================
    // Page Button Text
    //===========================================================

    get continueButtonText(): string
    {
        return 'Continue';
    }


    //===========================================================
    // Filtered Files
    //===========================================================

    get filteredPageCloningFiles(): PageCloningSourceFile[]
    {
        const search = this.fileSearchText.trim().toLowerCase();

        if (!search)
        {
            return this.pageCloningFiles;
        }

        return this.pageCloningFiles.filter(file =>
            (file.fileType ?? '').toLowerCase().includes(search) ||
            (file.fileName ?? '').toLowerCase().includes(search) ||
            (file.location ?? '').toLowerCase().includes(search) ||
            (file.category ?? '').toLowerCase().includes(search)
        );
    }


    //===========================================================
    // Primary & Navigation Fields
    //===========================================================

    get primaryNavigationFields(): PageCloningModelField[]
    {
        return this.sourceModelFields.filter(
            field => field.category === 'Primary & Navigation'
        );
    }


    //===========================================================
    // Business & Functional Fields
    //===========================================================

    get businessFunctionalFields(): PageCloningModelField[]
    {
        return this.sourceModelFields.filter(
            field => field.category === 'Business & Functional'
        );
    }


    //===========================================================
    // Audit & System Fields
    //===========================================================

    get auditSystemFields(): PageCloningModelField[]
    {
        return this.sourceModelFields.filter(
            field => field.category === 'Audit & System'
        );
    }
}