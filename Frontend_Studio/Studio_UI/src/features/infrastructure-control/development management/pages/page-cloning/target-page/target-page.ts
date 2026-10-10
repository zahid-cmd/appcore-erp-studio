//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    ChangeDetectorRef,
    NgZone,
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

import {
    timeout,
    finalize,
    map,
    switchMap,
    throwError
} from 'rxjs';


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

import
{
    DropdownComponent
}
from '../../../../../../shared/components/controls/dropdown/dropdown';


//===============================================================
// Models
//===============================================================

import
{
    PageCloning,
    PageCloningSourceAnalysis,
    PageCloningSourceFile,
    PageCloningModelField,
    PageCloningTransformation,
    ModelFieldOperation,
    TargetModelField
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
    selector: 'app-target-page',
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
        DropdownComponent,
        ToastComponent,
        ConfirmDialogComponent
    ],

    templateUrl: './target-page.html',

    styleUrls:
    [
        './target-page.css'
    ]
})


//===============================================================
// Target Page
//===============================================================

export class TargetPageComponent implements OnInit
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
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly zone = inject(NgZone);


    //===========================================================
    // Target Analysis
    //===========================================================

    targetAnalysis: PageCloningSourceAnalysis | null = null;

    targetFiles: PageCloningSourceFile[] = [];

    targetModelFields: TargetModelField[] = [];

    isAnalyzingTarget = false;

    targetAnalysisReady = false;


    //===========================================================
    // Page State
    //===========================================================

    pageTitle = 'Target Page Analysis';

    mode: 'add' | 'edit' | 'view' = 'add';

    pageCloningId = 0;

    selectedTab = 'target';

    isLoadingTarget = false;

    isGenerating = false;

    targetPageLoaded = false;


    //===========================================================
    // Tabs
    //===========================================================

    tabs: ControlTab[] =
    [
        {
            id: 'target',
            label: 'Target Page Details'
        }
    ];


    //===========================================================
    // Target Page Selection
    //===========================================================

    cloneToModules: NavigationModule[] = [];

    cloneToMenus: any[] = [];

    cloneToSubmenus: any[] = [];

    selectedCloneToModuleId = 0;

    selectedCloneToMenuId = 0;

    selectedCloneToSubmenuId = 0;


    //===========================================================
    // Page Cloning Configuration
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

        createdBy: 0,
        createdDate: new Date(),

        modifiedBy: null,
        modifiedDate: null,

        deletedBy: null,
        deletedDate: null,

        isDeleted: false
    };


    //===========================================================
    // Model Transformation Options
    //===========================================================

    readonly modelOperationOptions:
        { label: string; value: ModelFieldOperation }[] =
    [
        { label: 'Keep', value: 'Keep' },
        { label: 'Modify', value: 'Modify' },
        { label: 'Add', value: 'Add' },
        { label: 'Exclude', value: 'Exclude' }
    ];


    //===========================================================
    // Model Type Options
    //===========================================================

    readonly modelTypeOptions:
        { label: string; value: string }[] =
    [
        { label: 'string', value: 'string' },
        { label: 'number', value: 'number' },
        { label: 'number | null', value: 'number | null' },
        { label: 'boolean', value: 'boolean' },
        { label: 'Date', value: 'Date' },
        { label: 'Date | null', value: 'Date | null' },
        { label: 'string | null', value: 'string | null' },
        { label: 'number[]', value: 'number[]' },
        { label: 'string[]', value: 'string[]' },
        { label: 'object', value: 'object' }
    ];


    //===========================================================
    // Model Category Options
    //===========================================================

    readonly modelCategoryOptions =
    [
        {
            label: 'Primary & Navigation',
            value: 'Primary & Navigation'
        },
        {
            label: 'Business & Functional',
            value: 'Business & Functional'
        },
        {
            label: 'Audit & System',
            value: 'Audit & System'
        }
    ];


    //===========================================================
    // Model Required Options
    //===========================================================

    readonly modelRequiredOptions =
    [
        { label: 'Yes', value: true },
        { label: 'No', value: false }
    ];


    //===========================================================
    // Lifecycle
    //===========================================================

    ngOnInit(): void
    {
        this.initializeTargetPage();
        this.loadPageMode();
        this.loadModules();
        this.restoreSourceConfiguration();
    }


    //===========================================================
    // Initialize Target Page
    //===========================================================

    initializeTargetPage(): void
    {
        this.cloneToMenus = [];
        this.cloneToSubmenus = [];

        this.selectedCloneToModuleId = 0;
        this.selectedCloneToMenuId = 0;
        this.selectedCloneToSubmenuId = 0;

        this.isLoadingTarget = false;
        this.isAnalyzingTarget = false;
        this.isGenerating = false;

        this.targetPageLoaded = false;
        this.targetAnalysisReady = false;

        this.targetAnalysis = null;
        this.targetFiles = [];
        this.targetModelFields = [];
    }


    //===========================================================
    // Restore Source Configuration
    //===========================================================

    private restoreSourceConfiguration(): void
    {
        const state = this.pageCloningService.getWorkflowState();

        if (!state)
        {
            return;
        }

        if (state.pageCloning)
        {
            this.pageCloning =
            {
                ...this.pageCloning,
                ...state.pageCloning
            };
        }

        this.pageCloning.cloneFromId =
            state.selectedCloneFromSubmenuId ||
            this.pageCloning.cloneFromId;

        this.pageCloningId =
            this.pageCloning.id || this.pageCloningId;
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
            this.pageTitle = 'View Target Page Analysis';
        }
        else if (currentRoute.includes('/edit/'))
        {
            this.mode = 'edit';
            this.pageTitle = 'Edit Target Page Analysis';
        }
        else
        {
            this.mode = 'add';
            this.pageTitle = 'Target Page Analysis';
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
                this.zone.run(() =>
                {
                    this.cloneToModules = modules ?? [];
                    this.cdr.detectChanges();
                });
            },

            error: error =>
            {
                console.error('Failed to load modules.', error);

                this.showError(
                    'Failed to load navigation modules.'
                );
            }
        });
    }


    //===========================================================
    // Load Page Cloning Record
    //===========================================================

    loadPageCloning(id: number): void
    {
        this.pageCloningService.getById(id).subscribe(
        {
            next: result =>
            {
                this.zone.run(() =>
                {
                    this.pageCloning = result;
                    this.pageCloningId = Number(result.id);

                    this.restoreTargetSelection(
                        Number(result.cloneToId)
                    );

                    this.cdr.detectChanges();
                });
            },

            error: error =>
            {
                console.error('Failed to load page cloning.', error);

                this.showError(
                    'Failed to load the page-cloning record.'
                );
            }
        });
    }


    //===========================================================
    // Restore Target Selection
    //===========================================================

    private restoreTargetSelection(submenuId: number): void
    {
        if (submenuId <= 0)
        {
            return;
        }

        this.selectedCloneToSubmenuId = submenuId;
        this.loadTargetSubmenu(submenuId);
    }


    //===========================================================
    // Load Target Submenu
    //===========================================================

    loadTargetSubmenu(submenuId: number): void
    {
        if (submenuId <= 0)
        {
            this.targetPageLoaded = false;
            this.isLoadingTarget = false;
            this.cdr.detectChanges();
            return;
        }

        this.isLoadingTarget = true;
        this.targetPageLoaded = false;

        this.cdr.detectChanges();

        this.submenuService.getById(submenuId)
            .pipe(
                timeout(10000),

                finalize(() =>
                {
                    this.zone.run(() =>
                    {
                        this.isLoadingTarget = false;
                        this.cdr.detectChanges();
                    });
                })
            )
            .subscribe(
            {
                next: submenu =>
                {
                    this.zone.run(() =>
                    {
                        this.pageCloning.cloneToId =
                            Number(submenu.id);

                        this.pageCloning.cloneToCode =
                            submenu.code ?? '';

                        this.pageCloning.cloneToName =
                            submenu.name ?? '';

                        this.selectedCloneToSubmenuId =
                            Number(submenu.id);

                        this.targetPageLoaded = true;

                        this.restoreTargetDropdowns();

                        this.cdr.detectChanges();
                    });
                },

                error: error =>
                {
                    this.zone.run(() =>
                    {
                        this.targetPageLoaded = false;

                        console.error(
                            'Target submenu request failed:',
                            error
                        );

                        this.showError(
                            'Unable to load the selected target submenu.'
                        );

                        this.cdr.detectChanges();
                    });
                }
            });
    }


    //===========================================================
    // Restore Target Dropdowns
    //===========================================================

    private restoreTargetDropdowns(): void
    {
        const submenuId = this.selectedCloneToSubmenuId;

        const selected = this.cloneToSubmenus.find(
            submenu => Number(submenu.id) === submenuId
        );

        if (!selected)
        {
            return;
        }

        // Use the selected submenu's known parent from the
        // already-loaded submenu list. Do not assume fields
        // that are not declared in NavigationSubmenu.
        const menuId = Number(
            selected.menuId ?? selected.navigationMenuId ?? 0
        );

        if (menuId <= 0)
        {
            return;
        }

        this.selectedCloneToMenuId = menuId;

        this.submenuService.getByMenu(menuId).subscribe(
        {
            next: submenus =>
            {
                this.zone.run(() =>
                {
                    this.cloneToSubmenus = submenus ?? [];
                    this.cdr.detectChanges();
                });
            },

            error: error =>
            {
                console.error(
                    'Failed to restore target submenus.',
                    error
                );
            }
        });
    }


    //===========================================================
    // Submit Target Page
    //===========================================================

    onSubmitTarget(): void
    {
        const targetSubmenuId =
            Number(this.selectedCloneToSubmenuId);

        const workflowState =
            this.pageCloningService.getWorkflowState();

        const sourceSubmenuId = Number(
            workflowState?.selectedCloneFromSubmenuId ||
            workflowState?.pageCloning?.cloneFromId ||
            this.pageCloning.cloneFromId
        );

        if (
            targetSubmenuId <= 0 ||
            this.isLoadingTarget ||
            this.isAnalyzingTarget ||
            this.isGenerating
        )
        {
            return;
        }

        if (sourceSubmenuId <= 0)
        {
            this.showError(
                'Please select and analyze the source page first.'
            );

            return;
        }

        if (sourceSubmenuId === targetSubmenuId)
        {
            this.showError(
                'Source and target pages must be different.'
            );

            return;
        }

        this.isAnalyzingTarget = true;
        this.targetAnalysisReady = false;
        this.targetAnalysis = null;
        this.targetFiles = [];
        this.targetModelFields = [];

        this.cdr.detectChanges();

        this.pageCloningService
            .analyzeTarget(targetSubmenuId)
            .pipe(
                timeout(30000),

                finalize(() =>
                {
                    this.zone.run(() =>
                    {
                        this.isAnalyzingTarget = false;
                        this.cdr.detectChanges();
                    });
                })
            )
            .subscribe(
            {
                next: result =>
                {
                    this.zone.run(() =>
                    {
                        this.applyTargetAnalysis(result);

                        if (!this.targetAnalysisReady)
                        {
                            this.showError(
                                'Target analysis is incomplete. Verify that all 15 registered target files exist.'
                            );
                        }

                        this.cdr.detectChanges();
                    });
                },

                error: error =>
                {
                    this.zone.run(() =>
                    {
                        this.targetPageLoaded = false;
                        this.targetAnalysisReady = false;
                        this.targetAnalysis = null;
                        this.targetFiles = [];
                        this.targetModelFields = [];

                        console.error(
                            'Target analysis failed:',
                            error
                        );

                        this.showError(
                            this.getErrorMessage(
                                error,
                                'Target analysis failed.'
                            )
                        );

                        this.cdr.detectChanges();
                    });
                }
            });
    }


    //===========================================================
    // Apply Target Analysis
    //===========================================================

    private applyTargetAnalysis(
        result: PageCloningSourceAnalysis
    ): void
    {
        this.targetAnalysis = result;

        this.targetFiles = (result.files ?? []).map(file =>
        ({
            ...file,
            id: Number(file.id),
            exists: file.exists === true,
            action: file.action ?? 'Missing',
            path: file.path ?? ''
        }));

        const state = this.pageCloningService.getWorkflowState();

        const sourceFields =
            state?.sourceModelFields ?? [];

        this.targetModelFields = sourceFields.map(
            (field: PageCloningModelField): TargetModelField =>
            ({
                inputModel: field.inputModel ?? '',
                sourceField: field.sourceField ?? field.name ?? '',
                name: field.name ?? '',
                type: field.type ?? 'string',
                category: field.category ?? 'Business & Functional',
                required: field.required ?? false,
                operation: field.operation ?? 'Keep',
                description: field.description,
                defaultValue: field.defaultValue
            })
        );

        this.pageCloning.cloneToId =
            Number(result.submenuId);

        this.pageCloning.cloneToCode =
            result.submenuCode ?? '';

        this.pageCloning.cloneToName =
            result.submenuName ?? '';

        this.selectedCloneToSubmenuId =
            Number(result.submenuId);

        this.pageCloning.numberOfFiles =
            this.targetFiles.length;

        this.targetAnalysisReady =
            this.targetFiles.length === 15 &&
            this.targetFiles.every(
                file =>
                    file.exists &&
                    file.action !== 'Missing' &&
                    !!file.path
            );

        this.targetPageLoaded =
            this.targetAnalysisReady;
    }


    //===========================================================
    // Clone To Module Changed
    //===========================================================

    onCloneToModuleChange(moduleId: number): void
    {
        this.selectedCloneToModuleId =
            Number(moduleId) || 0;

        this.selectedCloneToMenuId = 0;
        this.selectedCloneToSubmenuId = 0;

        this.cloneToMenus = [];
        this.cloneToSubmenus = [];

        this.resetTargetAnalysis();

        this.pageCloning.cloneToId = 0;
        this.pageCloning.cloneToCode = '';
        this.pageCloning.cloneToName = '';

        if (this.selectedCloneToModuleId <= 0)
        {
            return;
        }

        this.menuService
            .getByModule(this.selectedCloneToModuleId)
            .subscribe(
            {
                next: menus =>
                {
                    this.zone.run(() =>
                    {
                        this.cloneToMenus = menus ?? [];
                        this.cdr.detectChanges();
                    });
                },

                error: error =>
                {
                    console.error(
                        'Failed to load target menus.',
                        error
                    );

                    this.showError(
                        'Failed to load menus for the selected module.'
                    );
                }
            });
    }


    //===========================================================
    // Clone To Menu Changed
    //===========================================================

    onCloneToMenuChange(menuId: number): void
    {
        this.selectedCloneToMenuId =
            Number(menuId) || 0;

        this.selectedCloneToSubmenuId = 0;
        this.cloneToSubmenus = [];

        this.resetTargetAnalysis();

        this.pageCloning.cloneToId = 0;
        this.pageCloning.cloneToCode = '';
        this.pageCloning.cloneToName = '';

        if (this.selectedCloneToMenuId <= 0)
        {
            return;
        }

        this.submenuService
            .getByMenu(this.selectedCloneToMenuId)
            .subscribe(
            {
                next: submenus =>
                {
                    this.zone.run(() =>
                    {
                        this.cloneToSubmenus = submenus ?? [];
                        this.cdr.detectChanges();
                    });
                },

                error: error =>
                {
                    console.error(
                        'Failed to load target submenus.',
                        error
                    );

                    this.showError(
                        'Failed to load submenus for the selected menu.'
                    );
                }
            });
    }


    //===========================================================
    // Clone To Submenu Changed
    //===========================================================

    onCloneToSubmenuChange(submenuId: number): void
    {
        this.selectedCloneToSubmenuId =
            Number(submenuId) || 0;

        this.resetTargetAnalysis();

        if (this.selectedCloneToSubmenuId <= 0)
        {
            this.pageCloning.cloneToId = 0;
            this.pageCloning.cloneToCode = '';
            this.pageCloning.cloneToName = '';
            return;
        }

        const selected = this.cloneToSubmenus.find(
            submenu =>
                Number(submenu.id) ===
                this.selectedCloneToSubmenuId
        );

        this.pageCloning.cloneToId =
            this.selectedCloneToSubmenuId;

        this.pageCloning.cloneToCode =
            selected?.code ?? '';

        this.pageCloning.cloneToName =
            selected?.name ?? '';

        this.cdr.detectChanges();
    }


    //===========================================================
    // Reset Target Analysis
    //===========================================================

    private resetTargetAnalysis(): void
    {
        this.targetPageLoaded = false;
        this.targetAnalysis = null;
        this.targetFiles = [];
        this.targetModelFields = [];
        this.targetAnalysisReady = false;

        this.cdr.detectChanges();
    }


    //===========================================================
    // Model Operation Changed
    //===========================================================

    onModelOperationChange(
        field: TargetModelField,
        operation: ModelFieldOperation
    ): void
    {
        const validOperations: ModelFieldOperation[] =
        [
            'Keep',
            'Modify',
            'Add',
            'Exclude'
        ];

        if (!validOperations.includes(operation))
        {
            return;
        }

        if (operation === 'Add')
        {
            field.operation = 'Add';
            field.sourceField = '';
            field.inputModel = '';
            field.name = '';
            field.type = field.type || 'string';

            this.cdr.detectChanges();
            return;
        }

        if (operation === 'Modify')
        {
            if (!String(field.sourceField ?? '').trim())
            {
                this.showError(
                    'A source field is required for the Modify operation.'
                );

                return;
            }

            field.operation = 'Modify';
            this.cdr.detectChanges();
            return;
        }

        if (operation === 'Keep')
        {
            field.operation = 'Keep';
            field.name = field.sourceField;

            this.cdr.detectChanges();
            return;
        }

        if (operation === 'Exclude')
        {
            field.operation = 'Exclude';
            this.cdr.detectChanges();
        }
    }


    //===========================================================
    // Add Model Type
    //===========================================================

    onAddModelType(value: string): void
    {
        const type = String(value ?? '').trim();

        if (!type)
        {
            return;
        }

        const exists = this.modelTypeOptions.some(
            option => option.value === type
        );

        if (!exists)
        {
            this.modelTypeOptions.push(
            {
                label: type,
                value: type
            });
        }
    }


    //===========================================================
    // Add Target Model Field
    //===========================================================

    onAddField(): void
    {
        if (
            this.isViewMode ||
            this.isGenerating ||
            !this.targetPageLoaded
        )
        {
            return;
        }

        const newField: TargetModelField =
        {
            inputModel: '',
            sourceField: '',
            name: '',
            type: 'string',
            category: 'Business & Functional',
            required: false,
            operation: 'Add'
        };

        this.targetModelFields =
        [
            ...this.targetModelFields,
            newField
        ];

        this.cdr.detectChanges();
    }


    //===========================================================
    // Remove Target Model Field
    //===========================================================

    onRemoveField(index: number): void
    {
        if (
            this.isViewMode ||
            this.isGenerating ||
            index < 0 ||
            index >= this.targetModelFields.length
        )
        {
            return;
        }

        this.targetModelFields =
            this.targetModelFields.filter(
                (_, fieldIndex) => fieldIndex !== index
            );

        this.cdr.detectChanges();
    }


    //===========================================================
    // Validate Model Fields
    //===========================================================

    private validateModelFields(): string | null
    {
        const activeFields = this.targetModelFields.filter(
            field => field.operation !== 'Exclude'
        );

        for (const field of activeFields)
        {
            const targetName =
                String(field.name ?? '').trim();

            const sourceName =
                String(field.sourceField ?? '').trim();

            const type =
                String(field.type ?? '').trim();

            if (!targetName)
            {
                return 'Every included target field must have a field name.';
            }

            if (!type)
            {
                return `Field '${targetName}' must have a data type.`;
            }

            if (
                field.operation !== 'Add' &&
                !sourceName
            )
            {
                return `Field '${targetName}' must have a source field.`;
            }
        }

        const normalizedNames = activeFields.map(
            field => String(field.name ?? '').trim().toLowerCase()
        );

        const duplicateName = normalizedNames.find(
            (name, index) =>
                normalizedNames.indexOf(name) !== index
        );

        if (duplicateName)
        {
            return `Duplicate target field name: ${duplicateName}`;
        }

        return null;
    }


    //===========================================================
    // Build Transformation Configuration
    //===========================================================

    private buildTransformationConfiguration():
        PageCloningTransformation
    {
        return {
            sourceSubmenuId: this.pageCloning.cloneFromId,
            targetSubmenuId: this.pageCloning.cloneToId,

            modelFields: this.targetModelFields.map(field =>
            ({
                ...field,
                inputModel: field.inputModel ?? '',
                sourceField: field.sourceField ?? '',
                operation: field.operation ?? 'Keep'
            })),

            renameIdentifiers: true,
            updateRoutes: true,
            updateApiReferences: true,
            updateModelReferences: true,
            preserveTargetFilePaths: true
        };
    }


    //===========================================================
    // Generate
    //===========================================================

    onGenerate(): void
    {
        if (this.isViewMode || this.isGenerating)
        {
            return;
        }

        const workflowState =
            this.pageCloningService.getWorkflowState();

        const sourceSubmenuId = Number(
            workflowState?.selectedCloneFromSubmenuId ||
            workflowState?.pageCloning?.cloneFromId ||
            this.pageCloning.cloneFromId
        );

        const targetSubmenuId =
            Number(this.selectedCloneToSubmenuId);

        if (sourceSubmenuId <= 0)
        {
            this.showError(
                'Source page is missing. Please select the source page first.'
            );

            return;
        }

        if (targetSubmenuId <= 0)
        {
            this.showError('Please select a target submenu.');
            return;
        }

        if (sourceSubmenuId === targetSubmenuId)
        {
            this.showError(
                'Source and target pages must be different.'
            );

            return;
        }

        if (
            !this.targetPageLoaded ||
            !this.targetAnalysisReady
        )
        {
            this.showError(
                'Please analyze the target page before generating.'
            );

            return;
        }

        if (this.targetFiles.length !== 15)
        {
            this.showError(
                'Generate requires exactly 15 registered target files.'
            );

            return;
        }

        const invalidFiles = this.targetFiles.filter(
            file =>
                !file.exists ||
                file.action === 'Missing' ||
                !file.path
        );

        if (invalidFiles.length > 0)
        {
            this.showError(
                `${invalidFiles.length} target file(s) are missing or have invalid paths.`
            );

            return;
        }

        const fieldError = this.validateModelFields();

        if (fieldError)
        {
            this.showError(fieldError);
            return;
        }

        const sourceConfiguration =
            workflowState?.pageCloning;

        this.pageCloning =
        {
            ...this.pageCloning,
            ...(sourceConfiguration ?? {}),

            id:
                this.pageCloningId ||
                this.pageCloning.id ||
                0,

            cloneFromId: sourceSubmenuId,

            cloneFromCode:
                sourceConfiguration?.cloneFromCode ??
                this.pageCloning.cloneFromCode,

            cloneFromName:
                sourceConfiguration?.cloneFromName ??
                this.pageCloning.cloneFromName,

            cloneToId: targetSubmenuId,

            cloneToCode:
                this.targetAnalysis?.submenuCode ??
                this.pageCloning.cloneToCode,

            cloneToName:
                this.targetAnalysis?.submenuName ??
                this.pageCloning.cloneToName,

            cloningType: 'Page',
            numberOfFiles: this.targetFiles.length,
            operation: 'Clone',
            status: 'Pending',
            lastCloningResult: ''
        };

        const transformation =
            this.buildTransformationConfiguration();

        this.isGenerating = true;
        this.cdr.detectChanges();

        const saveConfiguration$ =
            this.pageCloning.id > 0
                ? this.pageCloningService
                    .update(this.pageCloning)
                    .pipe(
                        map(() => this.pageCloning.id)
                    )
                : this.pageCloningService
                    .create(this.pageCloning);

        saveConfiguration$
            .pipe(
                switchMap(id =>
                    this.pageCloningService.clone(
                        id,
                        this.pageCloning,
                        transformation
                    ).pipe(
                        switchMap(cloneResult => {
                            if (
                                String(cloneResult.status).toLowerCase() === 'failed'
                            ) {
                                return throwError(
                                    () => new Error(
                                        cloneResult.message ||
                                        'The backend reported that cloning failed.'
                                    )
                                );
                            }

                            return this.pageCloningService.getById(id);
                        })
                    )
                ),

                timeout(120000),

                finalize(() =>
                {
                    this.zone.run(() =>
                    {
                        this.isGenerating = false;
                        this.cdr.detectChanges();
                    });
                })
            )
            .subscribe(
            {
                next: result =>
                {
                    this.zone.run(() =>
                    {
                        this.pageCloning = result;
                        this.pageCloningId = Number(result.id);

                        if (
                            String(result.status).toLowerCase() === 'failed'
                        )
                        {
                            this.showError(
                                `Cloning failed: ${result.lastCloningResult || 'The backend reported a failure.'}`
                            );
                        }
                        else
                        {
                            this.showSuccess(
                                `Cloning request finished. Backend status: ${result.status}. Verify the target files before using the page.`
                            );
                        }

                        this.cdr.detectChanges();
                    });
                },

                error: error =>
                {
                    this.zone.run(() =>
                    {
                        console.error(
                            'Page cloning failed:',
                            error
                        );

                        this.showError(
                            this.getErrorMessage(
                                error,
                                'Page cloning failed.'
                            )
                        );

                        this.cdr.detectChanges();
                    });
                }
            });
    }


    //===========================================================
    // Back To Source
    //===========================================================

    onBackToSource(): void
    {
        if (this.isGenerating)
        {
            return;
        }

        this.router.navigate(
        [
            '/infrastructure-control',
            'development-management',
            'page-cloning',
            'source',
            'new'
        ]);
    }


    //===========================================================
    // Clear
    //===========================================================

    onClear(): void
    {
        if (
            this.isViewMode ||
            this.isGenerating
        )
        {
            return;
        }

        this.selectedCloneToModuleId = 0;
        this.selectedCloneToMenuId = 0;
        this.selectedCloneToSubmenuId = 0;

        this.cloneToMenus = [];
        this.cloneToSubmenus = [];

        this.resetTargetAnalysis();

        this.pageCloning =
        {
            ...this.pageCloning,

            cloneToId: 0,
            cloneToCode: '',
            cloneToName: '',

            numberOfFiles: 15,
            status: 'Pending',
            lastCloningResult: ''
        };

        this.cdr.detectChanges();
    }


    //===========================================================
    // Error Message
    //===========================================================

    private getErrorMessage(
        error: any,
        fallback: string
    ): string
    {
        if (error?.name === 'TimeoutError')
        {
            return 'The request timed out. Check the backend status before retrying.';
        }

        if (error?.status === 0)
        {
            return 'Cannot connect to the API. Check the backend and browser Network tab.';
        }

        return (
            error?.error?.message ??
            error?.error?.title ??
            error?.message ??
            fallback
        );
    }


    //===========================================================
    // Show Error
    //===========================================================

    private showError(message: string): void
    {
        console.error(message);
        alert(message);
    }


    //===========================================================
    // Show Success
    //===========================================================

    private showSuccess(message: string): void
    {
        alert(message);
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

    get generateButtonText(): string
    {
        return this.isGenerating
            ? 'Generating...'
            : 'Generate';
    }
}