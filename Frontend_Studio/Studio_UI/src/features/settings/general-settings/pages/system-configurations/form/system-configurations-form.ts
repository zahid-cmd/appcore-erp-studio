//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    OnDestroy,
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

import
{
    HttpErrorResponse
}
from '@angular/common/http';

import
{
    Observable,
    defer,
    timer,
    throwError,
    delayWhen,
    catchError,
    switchMap
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

//===============================================================
// Form Controls
//===============================================================

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

//===============================================================
// Utilities
//===============================================================

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
    ProgressDialogComponent
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';

import
{
    ProgressDialogService
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';

//===============================================================
// Models & Services
//===============================================================

import
{
    SystemConfiguration,
    CreateSystemConfiguration,
    UpdateSystemConfiguration,
    ConfigurationWorkspace,
    ConfigurationScope,
    ConfigurationValueType
}
from '../../../models/system-configurations.model';

import
{
    SystemConfigurationsService
}
from '../../../services/system-configurations.service';

import
{
    ModuleService
}
from '../../../../../infrastructure-control/navigation-management/services/module.service';

//===============================================================
// Constants
//===============================================================

const NAME_MAX_LENGTH:
    number =
    200;

const REMARKS_MAX_LENGTH:
    number =
    1000;

const VALUE_MAX_LENGTH:
    number =
    100;

const TEXT_MAX_LENGTH:
    number =
    300;

const REASON_MAX_LENGTH:
    number =
    500;

//===============================================================
// Case-Insensitive Field Reader
//
// The Navigation Module API camel-cases its fields.
//===============================================================

function readField
(
    item:
        any,
    name:
        string
):
    any
{
    if
    (
        item == null
        ||
        typeof item !== 'object'
    )
    {
        return undefined;
    }

    if
    (
        name in item
    )
    {
        return item[name];
    }

    const target =
        name.toLowerCase();

    const key =
        Object.keys(item).find
        (
            k =>
                k.toLowerCase() ===
                target
        );

    return key !== undefined
        ? item[key]
        : undefined;
}

//===============================================================
// Module Option (Navigation Module)
//===============================================================

interface ModuleOption
{
    id:
        number;

    code:
        string;

    name:
        string;

    displayOrder:
        number;

    isActive:
        boolean;
}

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'system-configurations-form',

    standalone:true,

    imports:
    [
        CommonModule,
        FormsModule,

        //=======================================================
        // Layout
        //=======================================================

        PageHeaderComponent,
        PageToolbarComponent,
        CommandCenterComponent,
        ControlTabsComponent,
        PageCanvasComponent,
        FormGridComponent,
        FormSectionComponent,

        //=======================================================
        // Form Controls
        //=======================================================

        TextboxComponent,
        TextareaComponent,
        DropdownComponent,
        SearchDropdownComponent,

        //=======================================================
        // Utilities
        //=======================================================

        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./system-configurations-form.html',

    styleUrls:
    [
        './system-configurations-form.css'
    ]
})

//===============================================================
// System Configurations Form
//===============================================================

export class SystemConfigurationsForm
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly systemConfigurationsService =
        inject(SystemConfigurationsService);

    private readonly moduleService =
        inject(ModuleService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly progressDialog =
        inject(ProgressDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    //===========================================================
    // Progress Configuration
    //===========================================================

    private readonly MIN_PROGRESS_MS:
        number =
        5000;

    private readonly PROGRESS_TICK_MS:
        number =
        100;

    private readonly PROGRESS_CEILING:
        number =
        90;

    private readonly PROGRESS_COMPLETE_HOLD_MS:
        number =
        600;

    private progressTimer?:
        number;

    private progressValue:
        number =
        0;

    // Prevents double submit while Save / Update is running
    isSaving:
        boolean =
        false;

    //===========================================================
    // Mode
    //===========================================================

    mode:
        'add' | 'edit' | 'view' =
        'add';

    entityId:
        number =
        0;

    //===========================================================
    // Page Header
    //===========================================================

    pageTitle:
        string =
        'System Configuration';

    entityName:
        string =
        'Configuration';

    //===========================================================
    // Selected Tab
    //===========================================================

    selectedTab:
        string =
        'general';

    // Toolbar tabs = Value Type : the form arranges its four
    // sections for the chosen type. Kept as the same array until
    // the mode or type changes (a new array on every check would
    // redraw the tabs). In View mode only the record's tab is open.
    private tabsCache:
        ControlTab[] = [];

    private tabsKey =
        '';

    get tabs():
        ControlTab[]
    {
        const key =
            `${this.mode}|${this.entity?.ValueType}`;

        if
        (
            key === this.tabsKey
        )
        {
            return this.tabsCache;
        }

        const locked =
            this.mode === 'view';

        const type =
            this.entity?.ValueType ?? 'None';

        this.tabsKey = key;

        this.tabsCache =
        [
            { id:'None', label:'On / Off', disabled:locked && type !== 'None' },
            { id:'Number', label:'Whole Number', disabled:locked && type !== 'Number' },
            { id:'Text', label:'Short Text', disabled:locked && type !== 'Text' }
        ];

        return this.tabsCache;
    }

    onValueTabChange
    (
        id:string
    ):
        void
    {
        if
        (
            this.isViewMode
            ||
            this.isSaving
            ||
            id === this.entity.ValueType
        )
        {
            return;
        }

        this.entity.ValueType =
            id as ConfigurationValueType;

        this.onValueTypeChange();

        this.cdr.detectChanges();
    }

    get tabTitle():
        string
    {
        switch
        (
            this.mode
        )
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
    // Dropdown Items
    //===========================================================

    // Navigation Modules (DB driven)
    private modules:
        ModuleOption[] =
        [];

    private modulesLoaded:
        boolean =
        false;

    moduleItems:
        any[] =
        [];

    enabledItems:
        any[] =
    [
        { label:'Enabled', value:true },
        { label:'Disabled', value:false }
    ];

    // Who may change it
    scopeItems:
        any[] =
    [
        { label:'Page (submenu) : page users with permission', value:'Submenu' },
        { label:'Menu-wide : admin only', value:'Menu' },
        { label:'Module-wide : admin only', value:'Module' }
    ];

    valueTypeItems:
        any[] =
    [
        { label:'No value (ON / OFF only)', value:'None' },
        { label:'Whole number', value:'Number' },
        { label:'Short text', value:'Text' }
    ];

    yesNoItems:
        any[] =
    [
        { label:'Yes', value:true },
        { label:'No', value:false }
    ];

    //===========================================================
    // Workspace (menus, pages, switches; admin only)
    //===========================================================

    private workspace:
        ConfigurationWorkspace | null =
        null;

    // ON / OFF and Value as saved (a critical change needs a
    // reason on Update)
    private savedEnabled:
        boolean =
        false;

    private savedValue:
        string =
        '';

    // Reason for a critical ON / OFF / Value change (Update)
    reason:
        string =
        '';

    get menuItems():
        any[]
    {
        const moduleId =
            Number(this.entity.NavigationModuleId) || 0;

        return (this.workspace?.Menus ?? [])
            .filter(x => x.NavigationModuleId === moduleId)
            .map(x => ({ label: `${x.Name} (${x.Code})`, value: x.Code }));
    }

    get submenuItems():
        any[]
    {
        const moduleId =
            Number(this.entity.NavigationModuleId) || 0;

        const menus =
            new Map(
                (this.workspace?.Menus ?? []).map(x => [x.Code, x.Name] as [string, string])
            );

        return (this.workspace?.Submenus ?? [])
            .filter(x => x.NavigationModuleId === moduleId)
            .map(x => ({ label: `${menus.get(x.MenuCode) ?? x.MenuCode} › ${x.Name}`, value: x.Code }));
    }

    get parentItems():
        any[]
    {
        const moduleId =
            Number(this.entity.NavigationModuleId) || 0;

        const items =
            (this.workspace?.Switches ?? [])
                .filter
                (
                    x =>
                        x.NavigationModuleId === moduleId
                        &&
                        x.ConfigurationCode !== this.entity.ConfigurationCode
                        &&
                        x.ValueType === 'None'
                )
                .map
                (
                    x =>
                    ({
                        label: `${x.ConfigurationName}${x.SubmenuName ? ' · ' + x.SubmenuName : ''} (${x.ConfigurationCode})`,
                        value: x.ConfigurationCode
                    })
                );

        return [{ label:'No parent', value:'' }, ...items];
    }

    get isMenuScope():
        boolean
    {
        return this.entity.ScopeType === 'Menu';
    }

    get isSubmenuScope():
        boolean
    {
        return this.entity.ScopeType === 'Submenu';
    }

    get hasValueType():
        boolean
    {
        return this.entity.ValueType !== 'None';
    }

    get isNumberType():
        boolean
    {
        return this.entity.ValueType === 'Number';
    }

    // Reason box : Update of a critical switch whose ON / OFF or
    // Value changed
    get needsReason():
        boolean
    {
        return !this.isAddMode
               &&
               this.entity.IsCritical
               &&
               (
                   this.entity.IsEnabled !== this.savedEnabled
                   ||
                   String(this.entity.Value ?? '').trim() !== this.savedValue
               );
    }

    // Min / Max / Order as text for the textboxes
    get valueMinText():
        string
    {
        return this.entity.ValueMin === null || this.entity.ValueMin === undefined
            ? ''
            : String(this.entity.ValueMin);
    }

    set valueMinText
    (
        value:
            string
    )
    {
        this.entity.ValueMin =
            this.toOptionalInt(value);
    }

    get valueMaxText():
        string
    {
        return this.entity.ValueMax === null || this.entity.ValueMax === undefined
            ? ''
            : String(this.entity.ValueMax);
    }

    set valueMaxText
    (
        value:
            string
    )
    {
        this.entity.ValueMax =
            this.toOptionalInt(value);
    }

    get displayOrderText():
        string
    {
        return String(this.entity.DisplayOrder ?? 0);
    }

    set displayOrderText
    (
        value:
            string
    )
    {
        this.entity.DisplayOrder =
            this.toOptionalInt(value) ?? 0;
    }

    private toOptionalInt
    (
        value:
            string | number | null | undefined
    ):
        number | null
    {
        const text =
            String(value ?? '').trim();

        if
        (
            !text
        )
        {
            return null;
        }

        const number =
            Number(text);

        return Number.isFinite(number)
            ? Math.trunc(number)
            : null;
    }

    //===========================================================
    // Code Request Guard
    //
    // Only the reply for the latest selected module is used.
    //===========================================================

    private codeRequestModuleId:
        number =
        0;

    //===========================================================
    // Entity
    //===========================================================

    entity:
        SystemConfiguration =
        this.createEmptyEntity();

    //===========================================================
    // Form State
    //===========================================================

    private originalEntity:
        string =
        '';

    hasChanges:
        boolean =
        false;

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.initializeMode();

        this.loadModules();

        this.loadWorkspace();
    }

    //===========================================================
    // Destroy
    //===========================================================

    ngOnDestroy():
        void
    {
        this.clearProgressTimer();

        if
        (
            this.isSaving
        )
        {
            this.progressDialog.close();
        }
    }

    //===========================================================
    // Empty Entity
    //===========================================================

    private createEmptyEntity():
        SystemConfiguration
    {
        return {
            SystemConfigurationId:0,
            NavigationModuleId:0,
            ModuleCode:'',
            ModuleName:'',
            ModuleIcon:'',
            ScopeType:'Submenu',
            NavigationMenuCode:'',
            MenuName:'',
            NavigationSubmenuCode:'',
            SubmenuName:'',
            ConfigurationCode:'',
            ConfigurationName:'',
            OnDescription:'',
            OffDescription:'',
            IsEnabled:false,
            Value:'',
            ValueType:'None',
            ValueUnit:'',
            ValueMin:null,
            ValueMax:null,
            ValueEmptyText:'',
            DefaultEnabled:false,
            DefaultValue:'',
            ParentConfigurationCode:'',
            IsCritical:false,
            IsSystemDefined:false,
            DisplayOrder:0,
            Remarks:'',
            CanChange:true,
            IsPending:false,
            PendingEnabled:false,
            PendingValue:'',
            PendingByName:''
        };
    }

    //===========================================================
    // Initialize Mode
    //===========================================================

    private initializeMode():
        void
    {
        const url =
            this.router.url.toLowerCase();

        if
        (
            url.includes('/view/')
        )
        {
            this.mode =
                'view';
        }
        else if
        (
            url.includes('/edit/')
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

        const id =
            this.resolveEntityId();

        if
        (
            id > 0
        )
        {
            this.entityId =
                id;

            this.loadEntity();

            return;
        }

        this.initializeEntity();
    }

    //===========================================================
    // Resolve Entity Id (from route)
    //===========================================================

    private resolveEntityId():
        number
    {
        let currentRoute:
            ActivatedRoute | null =
            this.route;

        while
        (
            currentRoute
        )
        {
            const id =
                Number(
                    currentRoute.snapshot.paramMap.get('id')
                );

            if
            (
                id > 0
            )
            {
                return id;
            }

            currentRoute =
                currentRoute.parent;
        }

        return 0;
    }

    //===========================================================
    // Load Workspace (menus / pages / switches; admin only)
    //===========================================================

    private loadWorkspace():
        void
    {
        this.systemConfigurationsService
            .getWorkspace()
            .subscribe
            ({
                next:
                (
                    workspace:
                        ConfigurationWorkspace
                ):
                    void =>
                {
                    if
                    (
                        !workspace.CanManage
                        &&
                        !this.isViewMode
                    )
                    {
                        this.toast.error(
                            'Permission',
                            "Only users with 'Manage Configurations' can add or edit switches."
                        );

                        this.hasChanges =
                            false;

                        this.onBackToList();

                        return;
                    }

                    this.workspace =
                        workspace;

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Configuration Workspace Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Failed to load menus and pages.'
                    );
                }
            });
    }

    //===========================================================
    // Scope / value type changed
    //===========================================================

    onScopeChange():
        void
    {
        if
        (
            this.entity.ScopeType !== 'Menu'
        )
        {
            this.entity.NavigationMenuCode =
                '';
        }

        if
        (
            this.entity.ScopeType !== 'Submenu'
        )
        {
            this.entity.NavigationSubmenuCode =
                '';
        }

        this.onValueChange();
    }

    onValueTypeChange():
        void
    {
        if
        (
            this.entity.ValueType === 'None'
        )
        {
            this.entity.ValueUnit = '';
            this.entity.ValueMin = null;
            this.entity.ValueMax = null;
            this.entity.ValueEmptyText = '';
            this.entity.DefaultValue = '';
            this.entity.Value = '';
        }
        else if
        (
            this.entity.ValueType === 'Text'
        )
        {
            this.entity.ValueMin = null;
            this.entity.ValueMax = null;
            this.entity.ValueEmptyText = '';
        }

        this.onValueChange();
    }

    //===========================================================
    // Load Navigation Modules
    //===========================================================

    private loadModules():
        void
    {
        this.moduleService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        any
                ):
                    void =>
                {
                    this.modules =
                        (Array.isArray(response) ? response : [])
                            .map
                            (
                                (item: any):
                                    ModuleOption =>
                                ({
                                    id:
                                        Number(readField(item, 'id') ?? 0) || 0,

                                    code:
                                        String(readField(item, 'code') ?? '').trim(),

                                    name:
                                        String(readField(item, 'name') ?? '').trim(),

                                    displayOrder:
                                        Number(readField(item, 'displayOrder') ?? 0) || 0,

                                    isActive:
                                        readField(item, 'isActive') == null
                                            ? true
                                            : Boolean(readField(item, 'isActive'))
                                })
                            )
                            .filter
                            (
                                module =>
                                    module.id > 0
                            );

                    this.modulesLoaded =
                        true;

                    this.buildModuleItems();

                    this.applyPresetModule();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Navigation Modules Error',
                        error
                    );

                    this.modules =
                        [];

                    this.buildModuleItems();

                    this.toast.error(
                        'Error',
                        'Failed to load modules from Navigation Management.'
                    );
                }
            });
    }

    //===========================================================
    // Build Module Items
    //
    // Active modules (by Display Order) + the saved module,
    // even if it has since been made inactive.
    //===========================================================

    private buildModuleItems():
        void
    {
        const selectedId =
            Number(this.entity.NavigationModuleId) || 0;

        const items:
            any[] =
            this.modules
                .filter
                (
                    module =>
                        module.isActive
                        ||
                        module.id === selectedId
                )
                .sort
                (
                    (a, b) =>
                        a.displayOrder - b.displayOrder
                        ||
                        a.name.localeCompare(b.name)
                )
                .map
                (
                    module =>
                    ({
                        label:
                            module.isActive
                                ? module.name
                                : `${module.name} (Inactive)`,

                        value:
                            module.id
                    })
                );

        if
        (
            selectedId > 0
            &&
            !items.some
            (
                item =>
                    item.value === selectedId
            )
        )
        {
            items.unshift
            ({
                label:
                    this.entity.ModuleName || `Module #${selectedId}`,

                value:
                    selectedId
            });
        }

        this.moduleItems =
            items;

        this.cdr.detectChanges();
    }

    //===========================================================
    // Preset Module (?moduleId=3 from a panel "+")
    //===========================================================

    private applyPresetModule():
        void
    {
        if
        (
            !this.isAddMode
            ||
            this.entity.NavigationModuleId > 0
            ||
            this.hasChanges
        )
        {
            return;
        }

        const requested =
            Number(this.route.snapshot.queryParamMap.get('moduleId') ?? 0);

        const module =
            this.modules.find
            (
                item =>
                    item.id === requested
                    &&
                    item.isActive
            );

        if
        (
            !module
        )
        {
            return;
        }

        this.entity.NavigationModuleId =
            module.id;

        this.entity.ModuleName =
            module.name;

        this.setInitialFormState();

        this.generateCode(
            true
        );
    }

    //===========================================================
    // Initialize Entity
    //===========================================================

    private initializeEntity():
        void
    {
        this.entity =
            this.createEmptyEntity();

        this.setInitialFormState();

        if
        (
            this.modulesLoaded
        )
        {
            this.buildModuleItems();

            this.applyPresetModule();
        }
    }

    //===========================================================
    // Module Changed (Add mode only)
    //===========================================================

    onModuleChange():
        void
    {
        if
        (
            !this.isAddMode
        )
        {
            return;
        }

        const module =
            this.modules.find
            (
                item =>
                    item.id === Number(this.entity.NavigationModuleId)
            );

        this.entity.NavigationModuleId =
            module?.id ?? 0;

        this.entity.ModuleName =
            module?.name ?? '';

        this.entity.NavigationMenuCode =
            '';

        this.entity.NavigationSubmenuCode =
            '';

        this.entity.ParentConfigurationCode =
            '';

        this.generateCode(
            false
        );

        this.onValueChange();
    }

    //===========================================================
    // Generate Configuration Code (per module)
    //===========================================================

    private generateCode
    (
        resetBaseline:
            boolean
    ):
        void
    {
        const moduleId =
            Number(this.entity.NavigationModuleId) || 0;

        this.codeRequestModuleId =
            moduleId;

        if
        (
            moduleId <= 0
        )
        {
            this.entity.ConfigurationCode =
                '';

            this.checkForChanges();

            this.cdr.detectChanges();

            return;
        }

        this.systemConfigurationsService
            .getNextCode(
                moduleId
            )
            .subscribe
            ({
                next:
                (
                    code:
                        string
                ):
                    void =>
                {
                    // Ignore a late reply for a module no longer selected
                    if
                    (
                        this.codeRequestModuleId !== moduleId
                    )
                    {
                        return;
                    }

                    this.entity.ConfigurationCode =
                        code;

                    if
                    (
                        resetBaseline
                        &&
                        !this.hasChanges
                    )
                    {
                        this.setInitialFormState();

                        return;
                    }

                    this.checkForChanges();

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Generate Configuration Code Error',
                        error
                    );

                    this.entity.ConfigurationCode =
                        '';

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to generate Configuration Code.'
                        )
                    );

                    this.checkForChanges();

                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Set Initial Form State
    //===========================================================

    private setInitialFormState():
        void
    {
        this.originalEntity =
            JSON.stringify(
                this.entity
            );

        this.hasChanges =
            false;

        this.cdr.detectChanges();
    }

    //===========================================================
    // Load Entity
    //===========================================================

    private loadEntity():
        void
    {
        this.systemConfigurationsService
            .getById(
                this.entityId
            )
            .subscribe
            ({
                next:
                (
                    response:
                        SystemConfiguration
                ):
                    void =>
                {
                    this.entity =
                    {
                        ...response,

                        SystemConfigurationId:
                            response.SystemConfigurationId
                            ||
                            this.entityId
                    };

                    this.savedEnabled =
                        this.entity.IsEnabled;

                    this.savedValue =
                        String(this.entity.Value ?? '').trim();

                    this.reason =
                        '';

                    // Saved module stays selectable even if inactive
                    this.buildModuleItems();

                    this.setInitialFormState();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Configuration Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to load Configuration.'
                        )
                    );

                    this.hasChanges =
                        false;

                    this.onBackToList();
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
                this.entity
            )
            !==
            this.originalEntity;
    }

    //===========================================================
    // Validate
    //===========================================================

    private fail
    (
        message:
            string
    ):
        false
    {
        this.toast.error(
            'Validation',
            message
        );

        return false;
    }

    private validate():
        boolean
    {
        if
        (
            !(Number(this.entity.NavigationModuleId) > 0)
        )
        {
            return this.fail('Module is required.');
        }

        if
        (
            !this.entity.ConfigurationCode?.trim()
        )
        {
            return this.fail('Configuration Code is required.');
        }

        const name =
            this.entity.ConfigurationName?.trim() ?? '';

        if
        (
            !name
        )
        {
            return this.fail('Configuration Name is required.');
        }

        if
        (
            name.length > NAME_MAX_LENGTH
        )
        {
            return this.fail(`Configuration Name cannot be longer than ${NAME_MAX_LENGTH} characters.`);
        }

        if
        (
            (String(this.entity.Value ?? '').trim().length) > VALUE_MAX_LENGTH
        )
        {
            return this.fail(`Value cannot be longer than ${VALUE_MAX_LENGTH} characters.`);
        }

        if
        (
            (this.entity.Remarks?.trim().length ?? 0) > REMARKS_MAX_LENGTH
        )
        {
            return this.fail(`Remarks cannot be longer than ${REMARKS_MAX_LENGTH} characters.`);
        }

        if
        (
            this.entity.ScopeType === 'Menu'
            &&
            !this.entity.NavigationMenuCode
        )
        {
            return this.fail('Choose the menu.');
        }

        if
        (
            this.entity.ScopeType === 'Submenu'
            &&
            !this.entity.NavigationSubmenuCode
        )
        {
            return this.fail('Choose the page (submenu).');
        }

        if
        (
            (this.entity.OnDescription?.trim().length ?? 0) > TEXT_MAX_LENGTH
            ||
            (this.entity.OffDescription?.trim().length ?? 0) > TEXT_MAX_LENGTH
        )
        {
            return this.fail(`ON / OFF texts cannot be longer than ${TEXT_MAX_LENGTH} characters.`);
        }

        if
        (
            this.entity.ValueType === 'Number'
            &&
            this.entity.ValueMin !== null
            &&
            this.entity.ValueMax !== null
            &&
            this.entity.ValueMin > this.entity.ValueMax
        )
        {
            return this.fail('Value Min cannot be more than Value Max.');
        }

        if
        (
            this.needsReason
            &&
            !this.reason.trim()
        )
        {
            return this.fail('Give a reason for changing this critical switch.');
        }

        if
        (
            this.reason.trim().length > REASON_MAX_LENGTH
        )
        {
            return this.fail(`Reason cannot be longer than ${REASON_MAX_LENGTH} characters.`);
        }

        return true;
    }

    //===========================================================
    // Extract Error Message
    //===========================================================

    private extractErrorMessage
    (
        error:
            unknown,
        fallback:
            string
    ):
        string
    {
        if
        (
            error instanceof HttpErrorResponse
        )
        {
            if
            (
                typeof error.error === 'string'
                &&
                error.error.trim()
            )
            {
                return error.error;
            }

            if
            (
                error.error?.message
            )
            {
                return error.error.message;
            }

            if
            (
                error.error?.title
            )
            {
                return error.error.title;
            }
        }

        return fallback;
    }

    //===========================================================
    // Progress Dialog (Animated)
    //===========================================================

    private startProgress
    (
        title:
            string,
        message:
            string
    ):
        void
    {
        this.isSaving =
            true;

        this.progressValue =
            0;

        this.progressDialog.show(
            title,
            message,
            false
        );

        this.clearProgressTimer();

        this.progressTimer =
            window.setInterval(
                () =>
                {
                    const step =
                        Math.max(
                            0.4,
                            (this.PROGRESS_CEILING - this.progressValue) * 0.05
                        );

                    this.progressValue =
                        Math.min(
                            this.PROGRESS_CEILING,
                            this.progressValue + step
                        );

                    this.progressDialog.update(
                        Math.round(
                            this.progressValue
                        )
                    );
                },
                this.PROGRESS_TICK_MS
            );

        this.cdr.detectChanges();
    }

    private completeProgress
    (
        message:
            string,
        done:
            () => void
    ):
        void
    {
        this.clearProgressTimer();

        this.progressDialog.update(
            100,
            message
        );

        window.setTimeout(
            () =>
            {
                this.progressDialog.close();

                this.isSaving =
                    false;

                this.cdr.detectChanges();

                done();
            },
            this.PROGRESS_COMPLETE_HOLD_MS
        );
    }

    private failProgress
    (
        done:
            () => void
    ):
        void
    {
        this.clearProgressTimer();

        this.progressDialog.close();

        this.isSaving =
            false;

        this.cdr.detectChanges();

        done();
    }

    private clearProgressTimer():
        void
    {
        if
        (
            this.progressTimer
        )
        {
            clearInterval(
                this.progressTimer
            );

            this.progressTimer =
                undefined;
        }
    }

    //===========================================================
    // Minimum Progress Duration
    //===========================================================

    private withMinimumDuration<T>
    (
        source$:
            Observable<T>
    ):
        Observable<T>
    {
        return defer(
            () =>
            {
                const startedAt:
                    number =
                    Date.now();

                const remaining =
                    (): number =>
                        Math.max(
                            0,
                            this.MIN_PROGRESS_MS - (Date.now() - startedAt)
                        );

                return source$.pipe(
                    delayWhen(
                        () =>
                            timer(remaining())
                    ),

                    catchError(
                        error =>
                            timer(remaining()).pipe(
                                switchMap(
                                    () =>
                                        throwError(() => error)
                                )
                            )
                    )
                );
            }
        );
    }

    //===========================================================
    // Save
    //===========================================================

    onSave():
        void
    {
        if
        (
            this.isViewMode
            ||
            this.isSaving
            ||
            !this.validate()
        )
        {
            return;
        }

        if
        (
            this.isAddMode
        )
        {
            this.saveCreate();

            return;
        }

        this.saveUpdate();
    }

    //===========================================================
    // Build Payload
    //===========================================================

    private buildPayload():
        CreateSystemConfiguration
    {
        const valueType:
            ConfigurationValueType =
            this.entity.ValueType ?? 'None';

        const scope:
            ConfigurationScope =
            this.entity.ScopeType ?? 'Submenu';

        return {
            NavigationModuleId:
                Number(this.entity.NavigationModuleId) || 0,
            ConfigurationCode:
                this.entity.ConfigurationCode?.trim() ?? '',
            ConfigurationName:
                this.entity.ConfigurationName?.trim() ?? '',
            ScopeType:
                scope,
            NavigationMenuCode:
                scope === 'Menu' ? (this.entity.NavigationMenuCode || null) : null,
            NavigationSubmenuCode:
                scope === 'Submenu' ? (this.entity.NavigationSubmenuCode || null) : null,
            OnDescription:
                this.entity.OnDescription?.trim() ?? '',
            OffDescription:
                this.entity.OffDescription?.trim() ?? '',
            IsEnabled:
                this.entity.IsEnabled,
            Value:
                valueType === 'None' ? '' : String(this.entity.Value ?? '').trim(),
            ValueType:
                valueType,
            ValueUnit:
                valueType === 'None' ? '' : (this.entity.ValueUnit?.trim() ?? ''),
            ValueMin:
                valueType === 'Number' ? this.entity.ValueMin : null,
            ValueMax:
                valueType === 'Number' ? this.entity.ValueMax : null,
            ValueEmptyText:
                valueType === 'Number' ? (this.entity.ValueEmptyText?.trim() ?? '') : '',
            DefaultEnabled:
                this.entity.DefaultEnabled,
            DefaultValue:
                valueType === 'None' ? '' : String(this.entity.DefaultValue ?? '').trim(),
            ParentConfigurationCode:
                this.entity.ParentConfigurationCode || null,
            IsCritical:
                this.entity.IsCritical,
            DisplayOrder:
                Number(this.entity.DisplayOrder) || 0,
            Remarks:
                this.entity.Remarks?.trim() ?? ''
        };
    }

    //===========================================================
    // Create
    //===========================================================

    private saveCreate():
        void
    {
        const model:
            CreateSystemConfiguration =
            this.buildPayload();

        this.startProgress(
            'Saving Configuration',
            'Please wait while the configuration is being saved...'
        );

        this.withMinimumDuration(
            this.systemConfigurationsService.create(
                model
            )
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'Configuration saved.',
                    () =>
                    {
                        this.setInitialFormState();

                        this.toast.success(
                            'Success',
                            'Configuration created successfully.'
                        );

                        this.onBackToList();
                    }
                );
            },

            error:
            (
                error:
                    unknown
            ):
                void =>
            {
                console.error(
                    'Create Configuration Error',
                    error
                );

                this.failProgress(
                    () =>
                    {
                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                'Failed to create Configuration.'
                            )
                        );
                    }
                );
            }
        });
    }

    //===========================================================
    // Update
    //===========================================================

    private saveUpdate():
        void
    {
        const id:
            number =
            this.entity.SystemConfigurationId
            ||
            this.entityId;

        if
        (
            !id
            ||
            id <= 0
        )
        {
            this.toast.error(
                'Validation',
                'Invalid Configuration. Please reload the page and try again.'
            );

            return;
        }

        const model:
            UpdateSystemConfiguration =
        {
            SystemConfigurationId:
                id,

            Reason:
                this.reason.trim(),

            ...this.buildPayload()
        };

        this.startProgress(
            'Updating Configuration',
            'Please wait while the configuration is being updated...'
        );

        this.withMinimumDuration(
            this.systemConfigurationsService.update(
                model
            )
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'Configuration updated.',
                    () =>
                    {
                        this.setInitialFormState();

                        this.toast.success(
                            'Success',
                            'Configuration updated successfully.'
                        );

                        this.onBackToList();
                    }
                );
            },

            error:
            (
                error:
                    unknown
            ):
                void =>
            {
                console.error(
                    'Update Configuration Error',
                    error
                );

                this.failProgress(
                    () =>
                    {
                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                'Failed to update Configuration.'
                            )
                        );
                    }
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
        if
        (
            this.isSaving
        )
        {
            return;
        }

        if
        (
            this.isEditMode
        )
        {
            this.loadEntity();

            return;
        }

        this.initializeEntity();
    }

    //===========================================================
    // Back To List
    //===========================================================

    onBackToList():
        void
    {
        if
        (
            this.isSaving
        )
        {
            return;
        }

        const listRoute =
        [
            '/settings',
            'general-settings',
            'system-configurations',
            'list'
        ];

        if
        (
            !this.hasChanges
        )
        {
            void this.router.navigate(
                listRoute
            );

            return;
        }

        this.confirmDialog.open(
            'Cancel Changes',
            'Any unsaved changes will be lost. Do you want to leave this page?',
            () =>
            {
                void this.router.navigate(
                    listRoute
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
        return this.isEditMode
            ? 'Update'
            : 'Save';
    }

    //===========================================================
    // Mode Helpers
    //===========================================================

    get isViewMode():
        boolean
    {
        return this.mode === 'view';
    }

    get isEditMode():
        boolean
    {
        return this.mode === 'edit';
    }

    get isAddMode():
        boolean
    {
        return this.mode === 'add';
    }

    //===========================================================
    // Value Changed
    //===========================================================

    onValueChange():
        void
    {
        this.checkForChanges();

        this.cdr.detectChanges();
    }
}