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
// Models & Services
//===============================================================

import
{
    ActivityScope,
    MasterActivity,
    MasterActivityDefaults,
    CreateMasterActivity,
    UpdateMasterActivity
}
from '../../../models/master-activity.model';

import
{
    MasterActivityService
}
from '../../../services/master-activity.service';

import
{
    NavigationSubmenu
}
from '../../../models/navigation-submenu.model';

import
{
    NavigationSubmenuService
}
from '../../../services/submenu.service';

//===============================================================
// Page Option (Used on Pages)
//===============================================================

interface PageOption
{
    code: string;

    // Module › Menu › Submenu (lists)
    label: string;

    // Submenu || Menu (dropdowns)
    pickLabel?: string;
}

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
        ControlTabsComponent,
        CommandCenterComponent,
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
// Master Activity Form Component
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

    private readonly masterActivityService =
        inject(MasterActivityService);

    private readonly submenuService =
        inject(NavigationSubmenuService);

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
        'Master Activity';

    //===========================================================
    // Entity
    //===========================================================

    entityName =
        'Master Activity';

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
    // Scope Tabs (page toolbar)
    //   Common Activity : every page
    //   Page Activity   : only the selected pages
    // The list is rebuilt only when the mode changes (a new array
    // on every check would redraw the tabs).
    //===========================================================

    scopeTabs:
        ControlTab[] =
        [
            { id:'Common', label:'Common Activity' },
            { id:'Page', label:'Page Activity' }
        ];

    private buildScopeTabs():
        ControlTab[]
    {
        const locked =
            this.mode === 'view';

        return [
            {
                id:'Common',
                label:'Common Activity',
                disabled:locked && this.activity.activityScope !== 'Common'
            },
            {
                id:'Page',
                label:'Page Activity',
                disabled:locked && this.activity.activityScope !== 'Page'
            }
        ];
    }

    onScopeTabChange
    (
        id:string
    ):
        void
    {
        if
        (
            this.isViewMode
            ||
            id === this.activity.activityScope
        )
        {
            return;
        }

        this.onScopeChange(
            id as ActivityScope
        );

        this.cdr.detectChanges();
    }

    //===========================================================
    // Scope Dropdowns
    //===========================================================

    scopes =
    [
        {
            value:'Common',
            text:'Common (every page)'
        },
        {
            value:'Page',
            text:'Page (selected pages)'
        }
    ];

    switchPageOptions =
    [
        {
            value:true,
            text:'Yes'
        },
        {
            value:false,
            text:'No'
        }
    ];

    //===========================================================
    // Activity Model
    //===========================================================

    activity: MasterActivity =
        this.emptyActivity();

    //===========================================================
    // Used on Pages
    //===========================================================

    // Every live submenu, as "Module › Menu › Submenu"
    private allPages:
        PageOption[] =
        [];

    // Pages that can still be added (not chosen yet)
    availablePages:
        PageOption[] =
        [];

    // Page picked in the dropdown, waiting for Add
    pickedPageCode:
        string | null =
        null;

    // Pages that have page switches (System Configurations)
    private switchPageCodes:
        string[] =
        [];

    // Number of pages that have page switches (System Configurations)
    // : shown only as information; the server resolves them.
    get isPageScope():
        boolean
    {
        return this.activity.activityScope === 'Page';
    }

    get chosenPages():
        PageOption[]
    {
        return this.activity.pageSubmenuCodes.map
        (
            code =>
                this.allPages.find(x => x.code === code)
                ??
                { code, label: code }
        );
    }

    // Pages with switches (shown when Pages With Switches = Yes),
    // without the ones already added by hand
    get switchPages():
        PageOption[]
    {
        if
        (
            !this.isPageScope
            ||
            !this.activity.linkToSwitchPages
        )
        {
            return [];
        }

        const chosen =
            new Set(this.activity.pageSubmenuCodes);

        return this.switchPageCodes
            .filter(code => !chosen.has(code))
            .map
            (
                code =>
                    this.allPages.find(x => x.code === code)
                    ??
                    { code, label: code }
            );
    }

    // Pickers : one for pages that have switches, one for the rest
    pickedSwitchCode:
        string | null =
        null;

    pickedPlainCode:
        string | null =
        null;

    get availableSwitchPages():
        PageOption[]
    {
        const switches =
            new Set(this.switchPageCodes);

        return this.availablePages.filter(x => switches.has(x.code));
    }

    get availablePlainPages():
        PageOption[]
    {
        const switches =
            new Set(this.switchPageCodes);

        return this.availablePages.filter(x => !switches.has(x.code));
    }

    // Row of the page lists
    private toRow
    (
        page:PageOption,
        auto:boolean
    ):
        { code:string; module:string; page:string; auto:boolean; }
    {
        const parts =
            page.label.split(' › ');

        return {
            code:page.code,
            page:parts[parts.length - 1] ?? page.label,
            module:parts.slice(0, -1).join(' › '),
            auto
        };
    }

    // List 3 : selected pages that have switches (+ automatic ones)
    get switchPageRows():
        { code:string; module:string; page:string; auto:boolean; }[]
    {
        const switches =
            new Set(this.switchPageCodes);

        return [
            ...this.chosenPages
                .filter(x => switches.has(x.code))
                .map(x => this.toRow(x, false)),
            ...this.switchPages
                .map(x => this.toRow(x, true))
        ];
    }

    // List 4 : selected pages without switches
    get plainPageRows():
        { code:string; module:string; page:string; auto:boolean; }[]
    {
        const switches =
            new Set(this.switchPageCodes);

        return this.chosenPages
            .filter(x => !switches.has(x.code))
            .map(x => this.toRow(x, false));
    }

    // Add : the page picked in one dropdown
    addPickedPage
    (
        kind:'switch' | 'plain'
    ):
        void
    {
        const code =
            kind === 'switch'
                ? this.pickedSwitchCode
                : this.pickedPlainCode;

        if (kind === 'switch')
        {
            this.pickedSwitchCode = null;
        }
        else
        {
            this.pickedPlainCode = null;
        }

        if
        (
            !code
            ||
            this.activity.pageSubmenuCodes.includes(code)
        )
        {
            this.cdr.detectChanges();

            return;
        }

        this.activity.pageSubmenuCodes =
        [
            ...this.activity.pageSubmenuCodes,
            code
        ];

        this.refreshAvailablePages();

        this.checkForChanges();

        this.cdr.detectChanges();
    }

    get pagesSummary():
        string
    {
        const count =
            this.activity.pageSubmenuCodes.length
            +
            this.switchPages.length;

        return count === 1
            ? '1 page'
            : `${count} pages`;
    }

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
        this.loadPages();

        this.loadSwitchPages();

        this.initializeMode();
    }

    //===========================================================
    // Empty Activity
    //===========================================================

    private emptyActivity():
        MasterActivity
    {
        return {
            id:0,
            code:'',
            name:'',
            displayOrder:1,
            remarks:'',
            activityScope:'Common',
            linkToSwitchPages:false,
            pageSubmenuCodes:[],
            pageSubmenuIds:[],
            isActive:true
        };
    }

    //===========================================================
    // Load Pages (every live submenu)
    //===========================================================

    private loadPages():
        void
    {
        this.submenuService
            .getAll()
            .subscribe(
            {
                next:(submenus:NavigationSubmenu[]) =>
                {
                    this.allPages =
                        submenus
                            .filter(x => !!x.code)
                            .map
                            (
                                x =>
                                ({
                                    code:x.code,
                                    label:`${x.navigationModuleName} › ${x.navigationMenuName} › ${x.name}`,
                                    pickLabel:`${x.name} || ${x.navigationMenuName}`
                                })
                            )
                            .sort((a, b) => (a.pickLabel ?? a.label).localeCompare(b.pickLabel ?? b.label));

                    this.refreshAvailablePages();

                    this.cdr.detectChanges();
                },

                error:(error) =>
                {
                    console.error(error);

                    this.toast.error(
                        'Error',
                        'Unable to load the pages list.'
                    );
                }
            });
    }

    //===========================================================
    // Load Pages With Switches
    //===========================================================

    private loadSwitchPages():
        void
    {
        this.masterActivityService
            .getSwitchPages()
            .subscribe(
            {
                next:(codes:string[]) =>
                {
                    this.switchPageCodes =
                        codes ?? [];

                    this.cdr.detectChanges();
                },

                error:(error) =>
                {
                    console.error(error);
                }
            });
    }

    //===========================================================
    // Pages not chosen yet
    //===========================================================

    private refreshAvailablePages():
        void
    {
        const chosen =
            new Set(this.activity.pageSubmenuCodes);

        this.availablePages =
            this.allPages.filter(x => !chosen.has(x.code));

        if
        (
            this.pickedPageCode
            &&
            chosen.has(this.pickedPageCode)
        )
        {
            this.pickedPageCode = null;
        }
    }

    //===========================================================
    // Scope Changed
    //===========================================================

    onScopeChange
    (
        value:ActivityScope
    ):
        void
    {
        this.activity.activityScope =
            value;

        if
        (
            value === 'Common'
        )
        {
            this.activity.linkToSwitchPages = false;
            this.activity.pageSubmenuCodes = [];
            this.pickedPageCode = null;
            this.refreshAvailablePages();
        }

        this.checkForChanges();
    }

    onSwitchPagesChange
    (
        value:boolean
    ):
        void
    {
        this.activity.linkToSwitchPages =
            value;

        this.checkForChanges();
    }

    //===========================================================
    // Add / Remove Page
    //===========================================================

    onPagePicked
    (
        code:string | null
    ):
        void
    {
        this.pickedPageCode =
            code;
    }

    addPage():
        void
    {
        const code =
            this.pickedPageCode;

        if
        (
            !code
            ||
            this.activity.pageSubmenuCodes.includes(code)
        )
        {
            return;
        }

        this.activity.pageSubmenuCodes =
        [
            ...this.activity.pageSubmenuCodes,
            code
        ];

        this.pickedPageCode = null;

        this.refreshAvailablePages();

        this.checkForChanges();

        this.cdr.detectChanges();
    }

    removePage
    (
        code:string
    ):
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }

        this.activity.pageSubmenuCodes =
            this.activity.pageSubmenuCodes.filter(x => x !== code);

        this.refreshAvailablePages();

        this.checkForChanges();

        this.cdr.detectChanges();
    }

    trackPage
    (
        index:number,
        page:PageOption
    ):
        string
    {
        return page.code;
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
            this.emptyActivity();

        this.originalActivity =
            JSON.stringify(this.activity);

        this.hasChanges =
            false;

        this.loadDefaults();
    }

    //===========================================================
    // Load Activity
    //===========================================================

    private loadActivity():
        void
    {
        this.masterActivityService
            .getById(this.activityId)
            .subscribe(
            {
                next:(response) =>
                {
                    this.activity =
                    {
                        id:response.id,
                        code:response.code,
                        name:response.name,
                        displayOrder:response.displayOrder,
                        remarks:response.remarks ?? '',
                        activityScope:response.activityScope ?? 'Common',
                        linkToSwitchPages:!!response.linkToSwitchPages,
                        pageSubmenuCodes:[ ...(response.pageSubmenuCodes ?? []) ],
                        pageSubmenuIds:[ ...(response.pageSubmenuIds ?? []) ],
                        isActive:response.isActive
                    };

                    this.refreshAvailablePages();

                    this.scopeTabs =
                        this.buildScopeTabs();

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
    }

    //===========================================================
    // Load Defaults
    //===========================================================

    private loadDefaults():
        void
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
            this.isPageScope
            &&
            this.activity.pageSubmenuCodes.length === 0
            &&
            !this.activity.linkToSwitchPages
        )
        {
            this.toast.warning(
                'Validation',
                'Add at least one page, or set Pages With Switches to Yes.'
            );

            return;
        }

        //=======================================================
        // Create
        //=======================================================

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

                activityScope:
                    this.activity.activityScope,

                linkToSwitchPages:
                    this.isPageScope && this.activity.linkToSwitchPages,

                pageSubmenuCodes:
                    this.isPageScope ? [ ...this.activity.pageSubmenuCodes ] : [],

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

        //=======================================================
        // Update
        //=======================================================

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

            activityScope:
                this.activity.activityScope,

            linkToSwitchPages:
                this.isPageScope && this.activity.linkToSwitchPages,

            pageSubmenuCodes:
                this.isPageScope ? [ ...this.activity.pageSubmenuCodes ] : [],

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
            this.activity.name =
                '';

            this.activity.remarks =
                '';

            this.activity.isActive =
                true;

            this.activity.activityScope =
                'Common';

            this.activity.linkToSwitchPages =
                false;

            this.activity.pageSubmenuCodes =
                [];

            this.refreshAvailablePages();

            this.checkForChanges();

            return;
        }

        //=======================================================
        // Add Mode
        //=======================================================

        const currentCode =
            this.activity.code;

        const currentDisplayOrder =
            this.activity.displayOrder;

        this.activity =
        {
            ...this.emptyActivity(),
            code:currentCode,
            displayOrder:currentDisplayOrder
        };

        this.refreshAvailablePages();

        this.originalActivity =
            JSON.stringify(this.activity);

        this.hasChanges =
            false;

        this.loadDefaults();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Back To List
    //===========================================================

    onBackToList():
        void
    {
        const route =
            '/infrastructure-control/navigation-management/navigation-activities';

        if (!this.hasChanges)
        {
            this.router.navigate(
                [route]
            );

            return;
        }

        this.confirmDialog.open(
            'Cancel Changes',
            'Any unsaved changes will be lost. Do you want to leave this page?',
            () =>
            {
                this.router.navigate(
                    [route]
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