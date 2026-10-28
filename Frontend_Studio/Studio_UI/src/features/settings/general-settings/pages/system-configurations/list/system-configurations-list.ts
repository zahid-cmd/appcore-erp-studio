//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    inject,
    ChangeDetectorRef
}
from '@angular/core';

import
{
    HttpErrorResponse
}
from '@angular/common/http';

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
    Router
}
from '@angular/router';


//===============================================================
// Models
//===============================================================

import
{
    SystemConfiguration,
    ConfigurationWorkspace,
    ConfigurationRequest,
    ConfigurationChange,
    DEFAULT_MODULE_ICON,
    formatConfigurationState
}
from '../../../models/system-configurations.model';


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
    SearchBoxComponent
}
from '../../../../../../shared/components/utilities/search-box/search-box';

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
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

import
{
    CommandCenterComponent
}
from '../../../../../../shared/components/utilities/command-center/command-center';

import
{
    EmptyStateComponent
}
from '../../../../../../shared/components/layout/empty-state/empty-state';

import
{
    HistoryDrawerComponent
}
from '../../../../../../shared/components/utilities/history-drawer/history-drawer';

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
    ToastService
}
from '../../../../../../shared/components/utilities/toast/toast.service';

import
{
    ToastComponent
}
from '../../../../../../shared/components/utilities/toast/toast';


//===============================================================
// Services
//===============================================================

import
{
    SystemConfigurationsService
}
from '../../../services/system-configurations.service';


//===============================================================
// View models
//===============================================================

type ChipId =
    | 'all'
    | 'on'
    | 'off'
    | 'changed'
    | 'value';

interface StagedChange
{
    IsEnabled: boolean;

    Value: string;
}

interface CardView
{
    item: SystemConfiguration;

    isOn: boolean;

    value: string;

    isStaged: boolean;

    isBlocked: boolean;

    parentName: string;

    isChanged: boolean;

    canReset: boolean;

    hasValue: boolean;

    isText: boolean;

    valueText: string;

    valueLocked: boolean;

    toggleLocked: boolean;

    stateText: string;

    stateClass: string;

    pendingText: string;

    // Live line : the ON / OFF text that is true right now
    isLive: boolean;

    // Page tile (initials + colours)
    abbr: string;

    iconBg: string;

    iconFg: string;

    // Credit-card face
    codeGroups: string[];   // CFG MOD 004 0033 (the "card number")

    holderText: string;     // Menu · Page (the "cardholder" line)

    liveText: string;       // what is true right now (ON or OFF text)

    defaultText: string;    // ON / OFF
}

interface SectionView
{
    key: string;

    title: string;

    subtitle: string;

    isSystem: boolean;

    onCount: number;

    cards: CardView[];

    abbr: string;

    color: string;
}

interface PageLink
{
    key: string;

    name: string;

    total: number;
}

interface ModuleView
{
    id: number;

    name: string;

    icon: string;

    total: number;

    on: number;

    pages: PageLink[];
}

interface ReviewRow
{
    code: string;

    name: string;

    place: string;

    fromText: string;

    toText: string;

    isCritical: boolean;

    goesForApproval: boolean;
}


//===============================================================
// Component
//===============================================================

//===============================================================
// Card style : the remembered choice (Classic by default)
//===============================================================

const CARD_STYLE_KEY =
    'appcore.systemConfigurations.cardStyle';

function readCardStyle():
    'classic' | 'credit'
{
    try
    {
        return localStorage.getItem(CARD_STYLE_KEY) === 'credit'
            ? 'credit'
            : 'classic';
    }
    catch
    {
        return 'classic';
    }
}

@Component(
{
    selector:'system-configurations-list',

    standalone:true,

    imports:
    [
        CommonModule,
        FormsModule,
        PageHeaderComponent,
        PageToolbarComponent,
        ControlTabsComponent,
        SearchDropdownComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        EmptyStateComponent,
        HistoryDrawerComponent,
        ToastComponent,
        ConfirmDialogComponent
    ],

    templateUrl:'./system-configurations-list.html',

    styleUrls:
    [
        './system-configurations-list.css'
    ]
})

//===============================================================
// System Configurations List ("Settings Studio")
//
//   Left panel : every module, then the pages that have switches
//   Main       : switch cards, 3 per row, grouped by page
//   Changes are staged; Review & Apply saves them in one go.
//   Critical switches need a reason; a non-admin's critical
//   change waits for an admin (Pending Approval tab).
//
// What a user sees is filtered on the server; this page only
// arranges it.
//===============================================================

export class SystemConfigurationsList
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly router =
        inject(Router);

    private readonly service =
        inject(SystemConfigurationsService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly CONFIRM_CLOSE_DELAY_MS:
        number =
        200;


    //===========================================================
    // Data
    //===========================================================

    workspace:
        ConfigurationWorkspace | null =
        null;

    loading:
        boolean =
        true;

    loadFailed:
        boolean =
        false;

    private switchByCode:
        Map<string, SystemConfiguration> =
        new Map();


    //===========================================================
    // Filters
    //===========================================================

    // 0 = All Modules
    selectedModuleId:
        number =
        0;

    // '' = every menu
    selectedMenuCode:
        string =
        '';

    // '' = every submenu (page)
    selectedSubmenuCode:
        string =
        '';

    chip:
        ChipId =
        'all';

    searchText:
        string =
        '';

    view:
        'settings' | 'pending' =
        'settings';

    private readonly chipDefs:
        { id: ChipId; label: string; }[] =
    [
        { id:'all', label:'All' },
        { id:'on', label:'ON' },
        { id:'off', label:'OFF' },
        { id:'changed', label:'Changed' },
        { id:'value', label:'Has value' }
    ];

    // Chips with counts (after module / menu / search filters)
    chips:
        { id: ChipId; label: string; count: number; }[] =
        [];

    // Toolbar dropdowns
    moduleItems:
        { label: string; value: number; }[] =
        [];

    menuItems:
        { label: string; value: string; }[] =
        [];

    submenuItems:
        { label: string; value: string; }[] =
        [];

    // Switches left after module / menu / submenu / search
    baseCount:
        number =
        0;

    // Switches shown after every filter
    shownCount:
        number =
        0;

    // Critical switches left after module / menu / submenu / search
    criticalCount:
        number =
        0;


    //===========================================================
    // Staged changes (code → new state) + reasons
    //===========================================================

    staged:
        Record<string, StagedChange> =
        {};

    reasons:
        Record<string, string> =
        {};

    reviewOpen:
        boolean =
        false;

    applying:
        boolean =
        false;


    //===========================================================
    // Pending approvals (admin)
    //===========================================================

    requests:
        ConfigurationRequest[] =
        [];

    requestsLoading:
        boolean =
        false;

    decidingId:
        number =
        0;


    //===========================================================
    // Built views
    //===========================================================

    modules:
        ModuleView[] =
        [];

    sections:
        SectionView[] =
        [];

    reviewRows:
        ReviewRow[] =
        [];

    totalCount:
        number =
        0;

    onCount:
        number =
        0;

    changedCount:
        number =
        0;


    //===========================================================
    // History drawer
    //===========================================================

    historyOpened:
        boolean =
        false;

    historyTitle:
        string =
        'System Configuration History';

    historyItems:
        any[] =
        [];

    // Recently changed popover
    recentOpen:
        boolean =
        false;

    //===========================================================
    // Page tile palette (soft background / strong text)
    //===========================================================

    private readonly palette:
        [string, string][] =
    [
        ['#e6f4ec', '#1f7a45'],
        ['#fdecea', '#b4382c'],
        ['#ece9fb', '#4b3aa8'],
        ['#e6f0fb', '#1e5a8a'],
        ['#fff3e0', '#9a5a00'],
        ['#fde8f3', '#a12a6b'],
        ['#e5f6f7', '#167077'],
        ['#eef0f6', '#3d4566']
    ];


    //===========================================================
    // Init
    //===========================================================

    ngOnInit():
        void
    {
        this.load();
    }


    //===========================================================
    // Getters
    //===========================================================

    get canManage():
        boolean
    {
        return !!this.workspace?.CanManage;
    }

    get hasAccess():
        boolean
    {
        return this.canManage
               ||
               (this.workspace?.Switches.length ?? 0) > 0;
    }

    get pendingCount():
        number
    {
        return this.workspace?.PendingCount ?? 0;
    }

    get stagedCount():
        number
    {
        return Object.keys(this.staged).length;
    }

    get stagedSummary():
        string
    {
        return this.reviewRows
            .map(x => `${x.name}: ${x.fromText} → ${x.toText}`)
            .join('  ·  ');
    }

    get needsReason():
        boolean
    {
        return this.reviewRows.some
        (
            x =>
                x.isCritical
                &&
                !(this.reasons[x.code] ?? '').trim()
        );
    }

    get anyGoesForApproval():
        boolean
    {
        return this.reviewRows.some(x => x.goesForApproval);
    }

    get applyText():
        string
    {
        if
        (
            this.anyGoesForApproval
        )
        {
            return 'Apply & Send for Approval';
        }

        return this.stagedCount === 1
            ? 'Apply 1 change'
            : `Apply ${this.stagedCount} changes`;
    }

    get subtitle():
        string
    {
        if
        (
            !this.workspace
        )
        {
            return 'Turn module features on or off';
        }

        return this.canManage
            ? 'You manage every switch : system switches, page switches and approvals'
            : 'You can change the switches of your pages · critical ones need approval';
    }

    get emptyIcon():
        string
    {
        return this.selectedModuleId > 0 && this.moduleTotal(this.selectedModuleId) === 0
            ? 'fas fa-sliders'
            : 'fas fa-filter-circle-xmark';
    }

    get emptyTitle():
        string
    {
        return this.selectedModuleId > 0 && this.moduleTotal(this.selectedModuleId) === 0
            ? 'No Switches In This Module Yet'
            : 'Nothing Matches';
    }

    get emptyText():
        string
    {
        if
        (
            this.selectedModuleId > 0
            &&
            this.moduleTotal(this.selectedModuleId) === 0
        )
        {
            return this.canManage
                ? 'Use Add to create the first switch for this module.'
                : 'You have no switches to change here.';
        }

        return 'Try another search or filter.';
    }

    trackCard
    (
        _index:
            number,
        card:
            CardView
    ):
        string
    {
        return card.item.ConfigurationCode;
    }


    //===========================================================
    // Toolbar tabs : Settings / Pending Approval (count)
    //===========================================================

    // The tab list is kept as the same array until its text
    // changes. A new array on every check made Angular redraw
    // the tabs and miss the first update of the Pending view.
    private tabsCache:
        ControlTab[] = [];

    private tabsKey =
        '';

    get tabs():
        ControlTab[]
    {
        const key =
            `${this.canManage}|${this.pendingCount}`;

        if
        (
            key === this.tabsKey
        )
        {
            return this.tabsCache;
        }

        const tabs:
            ControlTab[] =
        [
            { id:'settings', label:'Configurations' }
        ];

        if
        (
            this.canManage
        )
        {
            tabs.push(
            {
                id:'pending',
                label:
                    this.pendingCount > 0
                        ? `Pending Approval (${this.pendingCount})`
                        : 'Pending Approval'
            });
        }

        this.tabsKey = key;
        this.tabsCache = tabs;

        return tabs;
    }

    onTabChange
    (
        id:
            string
    ):
        void
    {
        if
        (
            id === 'pending'
        )
        {
            this.showPending();
            return;
        }

        this.showSettings();
    }


    toggleRecent():
        void
    {
        this.recentOpen = !this.recentOpen;
        this.cdr.detectChanges();
    }

    closeRecent():
        void
    {
        if
        (
            this.recentOpen
        )
        {
            this.recentOpen = false;
            this.cdr.detectChanges();
        }
    }


    //===========================================================
    // Page tile : initials of the page / menu / module name and
    // a colour picked from its code (same page = same colour)
    //===========================================================

    private tileFor
    (
        item:
            SystemConfiguration
    ):
        { abbr: string; bg: string; fg: string; }
    {
        const name =
            item.ScopeType === 'Submenu'
                ? (item.SubmenuName || item.NavigationSubmenuCode)
                : item.ScopeType === 'Menu'
                    ? (item.MenuName || item.NavigationMenuCode)
                    : item.ModuleName;

        const words =
            String(name ?? '')
                .replace(/[^A-Za-z0-9 ]/g, ' ')
                .split(' ')
                .filter(x => x.length > 0);

        const abbr =
            words.length >= 2
                ? (words[0][0] + words[1][0]).toUpperCase()
                : String(words[0] ?? '?').slice(0, 2).toUpperCase();

        const key =
            this.pageKey(item) + item.NavigationModuleId;

        let hash =
            0;

        for
        (
            let i = 0;
            i < key.length;
            i++
        )
        {
            hash =
                (hash * 31 + key.charCodeAt(i)) >>> 0;
        }

        const [bg, fg] =
            this.palette[hash % this.palette.length];

        return { abbr, bg, fg };
    }


    //===========================================================
    // Load
    //===========================================================

    load():
        void
    {
        this.loading =
            true;

        this.loadFailed =
            false;

        this.cdr.detectChanges();

        this.service
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
                    this.workspace =
                        workspace;

                    this.switchByCode =
                        new Map(
                            workspace.Switches.map
                            (
                                x =>
                                    [x.ConfigurationCode, x] as [string, SystemConfiguration]
                            )
                        );

                    // Drop staged changes for switches no longer here
                    for
                    (
                        const code of Object.keys(this.staged)
                    )
                    {
                        if
                        (
                            !this.switchByCode.has(code)
                        )
                        {
                            delete this.staged[code];
                        }
                    }

                    if
                    (
                        !workspace.CanManage
                        &&
                        this.view === 'pending'
                    )
                    {
                        this.view =
                            'settings';
                    }

                    this.loading =
                        false;

                    this.rebuild();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Configurations Error',
                        error
                    );

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Card style : Classic / Credit Card (remembered per browser)
    //===========================================================

    cardStyle:
        'classic' | 'credit' =
        readCardStyle();

    setCardStyle
    (
        style:
            'classic' | 'credit'
    ):
        void
    {
        this.cardStyle =
            style;

        try
        {
            localStorage.setItem(
                CARD_STYLE_KEY,
                style
            );
        }
        catch
        {
            // storage blocked : the choice lasts for this visit only
        }

        this.cdr.detectChanges();
    }

    refresh():
        void
    {
        // Back to the default view : everything, no filter
        this.selectedModuleId = 0;
        this.selectedMenuCode = '';
        this.selectedSubmenuCode = '';
        this.chip = 'all';
        this.searchText = '';

        this.load();

        if
        (
            this.view === 'pending'
        )
        {
            this.loadRequests();
        }
    }


    //===========================================================
    // Effective state (staged or saved)
    //===========================================================

    private effective
    (
        item:
            SystemConfiguration
    ):
        StagedChange
    {
        return this.staged[item.ConfigurationCode]
               ??
               {
                   IsEnabled:
                       item.IsEnabled,

                   Value:
                       item.Value
               };
    }

    private isChangedFromDefault
    (
        item:
            SystemConfiguration,
        state:
            StagedChange
    ):
        boolean
    {
        if
        (
            state.IsEnabled !== item.DefaultEnabled
        )
        {
            return true;
        }

        return item.ValueType !== 'None'
               &&
               (state.Value ?? '') !== (item.DefaultValue ?? '');
    }

    private stateText
    (
        item:
            SystemConfiguration,
        isEnabled:
            boolean,
        value:
            string
    ):
        string
    {
        return formatConfigurationState(
            isEnabled,
            value,
            item.ValueType,
            item.ValueUnit,
            item.ValueEmptyText
        );
    }

    private moduleTotal
    (
        moduleId:
            number
    ):
        number
    {
        return this.workspace?.Switches
            .filter(x => x.NavigationModuleId === moduleId)
            .length ?? 0;
    }


    //===========================================================
    // Page key / title of a switch
    //===========================================================

    private pageKey
    (
        item:
            SystemConfiguration
    ):
        string
    {
        if
        (
            item.ScopeType === 'Submenu'
        )
        {
            return `S:${item.NavigationSubmenuCode}`;
        }

        if
        (
            item.ScopeType === 'Menu'
        )
        {
            return `M:${item.NavigationMenuCode}`;
        }

        return 'MODULE';
    }

    private pageName
    (
        item:
            SystemConfiguration
    ):
        string
    {
        if
        (
            item.ScopeType === 'Submenu'
        )
        {
            return item.SubmenuName || item.NavigationSubmenuCode;
        }

        if
        (
            item.ScopeType === 'Menu'
        )
        {
            return `${item.MenuName || item.NavigationMenuCode} (menu-wide)`;
        }

        return 'Module-wide';
    }

    private pageOrder
    (
        item:
            SystemConfiguration
    ):
        number
    {
        if
        (
            item.ScopeType === 'Module'
        )
        {
            return -2;
        }

        if
        (
            item.ScopeType === 'Menu'
        )
        {
            return -1;
        }

        const submenus =
            this.workspace?.Submenus ?? [];

        const index =
            submenus.findIndex(x => x.Code === item.NavigationSubmenuCode);

        return index < 0
            ? 9999
            : index;
    }


    //===========================================================
    // Rebuild every view from the data + filters
    //===========================================================

    rebuild():
        void
    {
        const workspace =
            this.workspace;

        if
        (
            !workspace
        )
        {
            this.modules = [];
            this.sections = [];
            this.reviewRows = [];
            this.cdr.detectChanges();
            return;
        }

        const switches =
            workspace.Switches;

        //=======================================================
        // Counters (everything this user can see)
        //=======================================================

        this.totalCount =
            switches.length;

        this.onCount =
            switches.filter(x => this.effective(x).IsEnabled).length;

        this.changedCount =
            switches.filter(x => this.isChangedFromDefault(x, this.effective(x))).length;

        //=======================================================
        // Left panel : every module, pages of the open module
        //=======================================================

        this.modules =
            workspace.Modules.map
            (
                module =>
                {
                    const mine =
                        switches.filter(x => x.NavigationModuleId === module.NavigationModuleId);

                    const pageMap =
                        new Map<string, PageLink & { order: number }>();

                    for
                    (
                        const item of mine
                    )
                    {
                        const key =
                            this.pageKey(item);

                        const link =
                            pageMap.get(key);

                        if
                        (
                            link
                        )
                        {
                            link.total++;
                        }
                        else
                        {
                            pageMap.set(
                                key,
                                {
                                    key,
                                    name: this.pageName(item),
                                    total: 1,
                                    order: this.pageOrder(item)
                                });
                        }
                    }

                    return {
                        id: module.NavigationModuleId,
                        name: module.Name,
                        icon: module.Icon || DEFAULT_MODULE_ICON,
                        total: mine.length,
                        on: mine.filter(x => this.effective(x).IsEnabled).length,
                        pages:
                            [...pageMap.values()]
                                .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
                                .map(x => ({ key: x.key, name: x.name, total: x.total }))
                    };
                }
            );

        //=======================================================
        // Cards : filters → groups by page
        //=======================================================

        const search =
            this.searchText.trim().toLowerCase();

        const moduleOrder =
            new Map(
                workspace.Modules.map
                (
                    (x, i) =>
                        [x.NavigationModuleId, i] as [number, number]
                )
            );

        //=======================================================
        // Toolbar dropdowns : modules (all) / menus of the module
        //=======================================================

        this.moduleItems =
        [
            { label:`All Modules (${switches.length})`, value:0 },
            ...workspace.Modules.map
            (
                module =>
                {
                    const count =
                        switches.filter(x => x.NavigationModuleId === module.NavigationModuleId).length;

                    return {
                        label: `${module.Name} (${count})`,
                        value: module.NavigationModuleId
                    };
                }
            )
        ];

        const menuCounts =
            new Map<string, number>();

        for
        (
            const item of switches
        )
        {
            if
            (
                item.NavigationMenuCode
                &&
                (this.selectedModuleId === 0 || item.NavigationModuleId === this.selectedModuleId)
            )
            {
                menuCounts.set(
                    item.NavigationMenuCode,
                    (menuCounts.get(item.NavigationMenuCode) ?? 0) + 1);
            }
        }

        this.menuItems =
        [
            { label:'All Menus', value:'' },
            ...workspace.Menus
                .filter(x => menuCounts.has(x.Code))
                .map
                (
                    menu =>
                    ({
                        label: `${menu.Name} (${menuCounts.get(menu.Code)})`,
                        value: menu.Code
                    })
                )
        ];

        if
        (
            this.selectedMenuCode
            &&
            !menuCounts.has(this.selectedMenuCode)
        )
        {
            this.selectedMenuCode = '';
        }

        //=======================================================
        // Submenus (pages) of the chosen module / menu
        //=======================================================

        const submenuCounts =
            new Map<string, number>();

        for
        (
            const item of switches
        )
        {
            if
            (
                item.ScopeType === 'Submenu'
                &&
                item.NavigationSubmenuCode
                &&
                (this.selectedModuleId === 0 || item.NavigationModuleId === this.selectedModuleId)
                &&
                (!this.selectedMenuCode || item.NavigationMenuCode === this.selectedMenuCode)
            )
            {
                submenuCounts.set(
                    item.NavigationSubmenuCode,
                    (submenuCounts.get(item.NavigationSubmenuCode) ?? 0) + 1);
            }
        }

        this.submenuItems =
        [
            { label:'All Submenus', value:'' },
            ...workspace.Submenus
                .filter(x => submenuCounts.has(x.Code))
                .map
                (
                    submenu =>
                    ({
                        label: `${submenu.Name} (${submenuCounts.get(submenu.Code)})`,
                        value: submenu.Code
                    })
                )
        ];

        if
        (
            this.selectedSubmenuCode
            &&
            !submenuCounts.has(this.selectedSubmenuCode)
        )
        {
            this.selectedSubmenuCode = '';
        }

        //=======================================================
        // Module / menu / search, then the chip
        //=======================================================

        const base =
            switches.filter
            (
                item =>
                {
                    if (this.selectedModuleId > 0 && item.NavigationModuleId !== this.selectedModuleId) return false;

                    if (this.selectedMenuCode && item.NavigationMenuCode !== this.selectedMenuCode) return false;

                    if (this.selectedSubmenuCode && item.NavigationSubmenuCode !== this.selectedSubmenuCode) return false;

                    if
                    (
                        search
                        &&
                        !`${item.ConfigurationName} ${item.ConfigurationCode} ${item.OnDescription} ${item.OffDescription} ${item.SubmenuName} ${item.MenuName}`
                            .toLowerCase()
                            .includes(search)
                    )
                    {
                        return false;
                    }

                    return true;
                }
            );

        this.baseCount =
            base.length;

        const chipCount =
            (id: ChipId): number =>
                base.filter
                (
                    item =>
                    {
                        const state =
                            this.effective(item);

                        switch (id)
                        {
                            case 'on': return state.IsEnabled;
                            case 'off': return !state.IsEnabled;
                            case 'changed': return this.isChangedFromDefault(item, state);
                            case 'value': return item.ValueType !== 'None';
                            default: return true;
                        }
                    }
                ).length;

        this.chips =
            this.chipDefs.map
            (
                c =>
                ({
                    id: c.id,
                    label: c.label,
                    count: chipCount(c.id)
                })
            );

        const filtered =
            base.filter
            (
                item =>
                {
                    const state =
                        this.effective(item);

                    if (this.chip === 'on' && !state.IsEnabled) return false;

                    if (this.chip === 'off' && state.IsEnabled) return false;

                    if (this.chip === 'changed' && !this.isChangedFromDefault(item, state)) return false;

                    if (this.chip === 'value' && item.ValueType === 'None') return false;

                    return true;
                }
            );

        this.shownCount =
            filtered.length;

        this.criticalCount =
            base.filter(x => x.IsCritical).length;

        const groups =
            new Map<string, { order: number[]; items: SystemConfiguration[] }>();

        for
        (
            const item of filtered
        )
        {
            const key =
                `${item.NavigationModuleId}|${this.pageKey(item)}`;

            const group =
                groups.get(key);

            if
            (
                group
            )
            {
                group.items.push(item);
            }
            else
            {
                groups.set(
                    key,
                    {
                        order:
                            [
                                moduleOrder.get(item.NavigationModuleId) ?? 999,
                                this.pageOrder(item)
                            ],
                        items:
                            [item]
                    });
            }
        }

        this.sections =
            [...groups.entries()]
                .sort
                (
                    (a, b) =>
                        a[1].order[0] - b[1].order[0]
                        ||
                        a[1].order[1] - b[1].order[1]
                )
                .map
                (
                    ([key, group]) =>
                    {
                        const first =
                            group.items[0];

                        const cards =
                            group.items
                                .sort((a, b) => a.DisplayOrder - b.DisplayOrder || a.ConfigurationCode.localeCompare(b.ConfigurationCode))
                                .map(item => this.buildCard(item));

                        const tile =
                            this.tileFor(first);

                        return {
                            key,
                            abbr: tile.abbr,
                            color: tile.fg,
                            title: `${first.ModuleName} · ${this.pageName(first)}`,
                            subtitle: first.ScopeType === 'Submenu' ? 'Page switches' : 'System · admin only',
                            isSystem: first.ScopeType !== 'Submenu',
                            onCount: cards.filter(x => x.isOn).length,
                            cards
                        };
                    }
                );

        //=======================================================
        // Review rows (staged changes)
        //=======================================================

        this.reviewRows =
            Object.keys(this.staged)
                .map(code => this.switchByCode.get(code))
                .filter((x): x is SystemConfiguration => !!x)
                .map
                (
                    item =>
                    {
                        const change =
                            this.staged[item.ConfigurationCode];

                        return {
                            code: item.ConfigurationCode,
                            name: item.ConfigurationName,
                            place: `${item.ModuleName} · ${this.pageName(item)}`,
                            fromText: this.stateText(item, item.IsEnabled, item.Value),
                            toText: this.stateText(item, change.IsEnabled, change.Value),
                            isCritical: item.IsCritical,
                            goesForApproval: item.IsCritical && !this.canManage
                        };
                    }
                );

        this.cdr.detectChanges();
    }


    //===========================================================
    // One card
    //===========================================================

    private buildCard
    (
        item:
            SystemConfiguration
    ):
        CardView
    {
        const state =
            this.effective(item);

        const parent =
            item.ParentConfigurationCode
                ? this.switchByCode.get(item.ParentConfigurationCode)
                : undefined;

        const isBlocked =
            !!parent
            &&
            !this.effective(parent).IsEnabled;

        const isChanged =
            this.isChangedFromDefault(item, state);

        const hasValue =
            item.ValueType !== 'None';

        const tile =
            this.tileFor(item);

        const valueText =
            !hasValue
                ? ''
                : (state.Value ?? '').trim()
                    ? `${state.Value} ${this.unitFor(state.Value, item.ValueUnit)}`.trim()
                    : (item.ValueEmptyText || 'Not set');

        return {
            item,
            isOn: state.IsEnabled,
            value: state.Value,
            isStaged: !!this.staged[item.ConfigurationCode],
            isBlocked,
            parentName: parent?.ConfigurationName ?? '',
            isChanged,
            canReset: isChanged && !item.IsPending && !isBlocked,
            hasValue,
            isText: item.ValueType === 'Text',
            valueText,
            valueLocked: !state.IsEnabled || isBlocked || item.IsPending,
            toggleLocked: (isBlocked && !state.IsEnabled) || item.IsPending,
            stateText: isBlocked ? 'Inactive' : state.IsEnabled ? 'Enabled' : 'Disabled',
            stateClass: isBlocked ? 'sc-state-blocked' : state.IsEnabled ? 'sc-state-on' : 'sc-state-off',
            isLive: isBlocked ? false : state.IsEnabled,
            abbr: tile.abbr,
            iconBg: tile.bg,
            iconFg: tile.fg,
            codeGroups: String(item.ConfigurationCode ?? '').split('-').filter(x => !!x),
            holderText:
                item.ScopeType === 'Submenu'
                    ? `${item.MenuName} · ${item.SubmenuName}`
                    : item.ScopeType === 'Menu'
                        ? `${item.ModuleName} · ${item.MenuName}`
                        : `${item.ModuleName} · Module-wide`,
            liveText:
                (isBlocked ? false : state.IsEnabled)
                    ? (item.OnDescription || 'ON')
                    : (item.OffDescription || 'OFF'),
            defaultText: item.DefaultEnabled ? 'ON' : 'OFF',
            pendingText:
                item.IsPending
                    ? `Pending approval → ${this.stateText(item, item.PendingEnabled, item.PendingValue)}`
                    : ''
        };
    }


    //===========================================================
    // Stage a change (back to saved = unstaged)
    //===========================================================

    private stage
    (
        item:
            SystemConfiguration,
        isEnabled:
            boolean,
        value:
            string
    ):
        void
    {
        const clean =
            String(value ?? '');

        if
        (
            isEnabled === item.IsEnabled
            &&
            clean === (item.Value ?? '')
        )
        {
            delete this.staged[item.ConfigurationCode];

            delete this.reasons[item.ConfigurationCode];
        }
        else
        {
            this.staged[item.ConfigurationCode] =
            {
                IsEnabled:
                    isEnabled,

                Value:
                    clean
            };
        }

        this.rebuild();
    }

    toggle
    (
        card:
            CardView
    ):
        void
    {
        if
        (
            card.toggleLocked
        )
        {
            return;
        }

        this.stage(
            card.item,
            !card.isOn,
            card.value
        );
    }

    stepValue
    (
        card:
            CardView,
        step:
            number
    ):
        void
    {
        if
        (
            card.valueLocked
        )
        {
            return;
        }

        const item =
            card.item;

        const min =
            item.ValueMin ?? 0;

        const max =
            item.ValueMax ?? 9999;

        const raw =
            (card.value ?? '').trim();

        let next:
            string;

        if
        (
            !raw
        )
        {
            next =
                step > 0
                    ? String(Math.max(min, 1))
                    : '';
        }
        else
        {
            const current =
                Number(raw);

            const value =
                (Number.isFinite(current) ? current : min) + step;

            if
            (
                value < min
            )
            {
                // Below the minimum : empty when allowed
                next =
                    item.ValueEmptyText
                        ? ''
                        : String(min);
            }
            else
            {
                next =
                    String(Math.min(max, value));
            }
        }

        if
        (
            next === '' && !item.ValueEmptyText
        )
        {
            return;
        }

        this.stage(
            item,
            card.isOn,
            next
        );
    }

    onTextValue
    (
        card:
            CardView,
        value:
            string
    ):
        void
    {
        this.stage(
            card.item,
            card.isOn,
            String(value ?? '').slice(0, 100)
        );
    }

    reset
    (
        card:
            CardView
    ):
        void
    {
        const item =
            card.item;

        this.stage(
            item,
            item.DefaultEnabled,
            item.ValueType === 'None'
                ? item.Value
                : item.DefaultValue
        );
    }

    discard():
        void
    {
        this.staged = {};
        this.reasons = {};
        this.reviewOpen = false;
        this.rebuild();
    }


    //===========================================================
    // Filters
    //===========================================================

    onModuleFilter
    (
        value:
            any
    ):
        void
    {
        this.selectedModuleId = Number(value) || 0;
        this.selectedMenuCode = '';
        this.selectedSubmenuCode = '';
        this.rebuild();
    }

    onMenuFilter
    (
        value:
            any
    ):
        void
    {
        this.selectedMenuCode = String(value ?? '');
        this.selectedSubmenuCode = '';
        this.rebuild();
    }

    onSubmenuFilter
    (
        value:
            any
    ):
        void
    {
        this.selectedSubmenuCode = String(value ?? '');
        this.rebuild();
    }

    //===========================================================
    // "1 working day" / "2 working days"
    //===========================================================

    private unitFor
    (
        value:
            string,
        unit:
            string
    ):
        string
    {
        const clean =
            String(unit ?? '').trim();

        return String(value ?? '').trim() === '1' && /[^s]s$/i.test(clean)
            ? clean.slice(0, -1)
            : clean;
    }

    pickChip
    (
        chip:
            ChipId
    ):
        void
    {
        this.chip = chip;
        this.rebuild();
    }

    // Clears the filters without reloading from the server
    clearFilters():
        void
    {
        this.selectedModuleId = 0;
        this.selectedMenuCode = '';
        this.selectedSubmenuCode = '';
        this.chip = 'all';
        this.searchText = '';
        this.rebuild();
    }


    //===========================================================
    // Status rail : summary
    //===========================================================

    chipTitle
    (
        id:
            ChipId
    ):
        string
    {
        switch (id)
        {
            case 'on': return 'Switches that are ON';
            case 'off': return 'Switches that are OFF';
            case 'changed': return 'Switches changed from their default';
            case 'value': return 'Switches that also hold a value';
            default: return 'Every switch';
        }
    }

    private chipTotal
    (
        id:
            ChipId
    ):
        number
    {
        return this.chips.find(x => x.id === id)?.count ?? 0;
    }

    get viewOnCount():
        number
    {
        return this.chipTotal('on');
    }

    get viewOffCount():
        number
    {
        return this.chipTotal('off');
    }

    get viewChangedCount():
        number
    {
        return this.chipTotal('changed');
    }

    get onPercent():
        number
    {
        return this.baseCount > 0
            ? Math.round(this.viewOnCount * 100 / this.baseCount)
            : 0;
    }

    get shownPercent():
        number
    {
        return this.totalCount > 0
            ? Math.round(this.shownCount * 100 / this.totalCount)
            : 0;
    }

    get isFiltered():
        boolean
    {
        return this.selectedModuleId > 0
            || !!this.selectedMenuCode
            || !!this.selectedSubmenuCode
            || this.chip !== 'all'
            || !!this.searchText.trim();
    }

    onSearch
    (
        value:
            string
    ):
        void
    {
        this.searchText = value ?? '';
        this.rebuild();
    }

    showSettings():
        void
    {
        this.view = 'settings';
        this.cdr.detectChanges();
    }

    showPending():
        void
    {
        this.view = 'pending';
        this.cdr.markForCheck();
        this.loadRequests();
    }


    //===========================================================
    // Review & Apply
    //===========================================================

    openReview():
        void
    {
        if
        (
            this.stagedCount === 0
        )
        {
            return;
        }

        this.reviewOpen = true;
        this.cdr.detectChanges();
    }

    closeReview():
        void
    {
        if
        (
            this.applying
        )
        {
            return;
        }

        this.reviewOpen = false;
        this.cdr.detectChanges();
    }

    setReason
    (
        code:
            string,
        value:
            string
    ):
        void
    {
        this.reasons[code] =
            String(value ?? '').slice(0, 500);
    }

    apply():
        void
    {
        if
        (
            this.applying
            ||
            this.stagedCount === 0
        )
        {
            return;
        }

        if
        (
            this.needsReason
        )
        {
            this.toast.error(
                'Reason needed',
                'Give a reason for each critical change.'
            );

            return;
        }

        const changes:
            ConfigurationChange[] =
            Object.entries(this.staged).map
            (
                ([code, change]) =>
                ({
                    ConfigurationCode: code,
                    IsEnabled: change.IsEnabled,
                    Value: change.Value,
                    Reason: (this.reasons[code] ?? '').trim()
                })
            );

        this.applying = true;
        this.cdr.detectChanges();

        this.service
            .apply(
                changes
            )
            .subscribe
            ({
                next:
                (
                    result
                ):
                    void =>
                {
                    this.applying = false;
                    this.reviewOpen = false;
                    this.staged = {};
                    this.reasons = {};
                    this.reviewRows = [];

                    // Close the dialog and clear the bar before anything else
                    this.cdr.markForCheck();
                    this.cdr.detectChanges();

                    const parts:
                        string[] =
                        [];

                    if (result.Applied > 0) parts.push(`${result.Applied} applied`);

                    if (result.SentForApproval > 0) parts.push(`${result.SentForApproval} sent for approval`);

                    this.toast.success(
                        'Configurations',
                        parts.length ? parts.join(' · ') + '.' : 'Nothing to change.'
                    );

                    this.load();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    this.applying = false;

                    this.cdr.markForCheck();

                    this.toast.error(
                        'Not applied',
                        this.errorMessage(
                            error,
                            'The changes could not be applied.'
                        )
                    );

                    this.cdr.detectChanges();
                }
            });
    }


    //===========================================================
    // Pending approvals (admin)
    //===========================================================

    loadRequests():
        void
    {
        if
        (
            !this.canManage
        )
        {
            return;
        }

        this.requestsLoading = true;
        this.cdr.detectChanges();

        this.service
            .getRequests()
            .subscribe
            ({
                next:
                (
                    requests:
                        ConfigurationRequest[]
                ):
                    void =>
                {
                    this.requests = requests;
                    this.requestsLoading = false;
                    this.cdr.markForCheck();
                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    this.requestsLoading = false;

                    this.toast.error(
                        'Pending Approval',
                        this.errorMessage(error, 'Requests could not be loaded.')
                    );

                    this.cdr.detectChanges();
                }
            });
    }

    requestFrom
    (
        request:
            ConfigurationRequest
    ):
        string
    {
        const item =
            this.switchByCode.get(request.ConfigurationCode);

        return item
            ? this.stateText(item, request.FromEnabled, request.FromValue)
            : (request.FromEnabled ? 'ON' : 'OFF');
    }

    requestTo
    (
        request:
            ConfigurationRequest
    ):
        string
    {
        const item =
            this.switchByCode.get(request.ConfigurationCode);

        return item
            ? this.stateText(item, request.ToEnabled, request.ToValue)
            : (request.ToEnabled ? 'ON' : 'OFF');
    }

    approve
    (
        request:
            ConfigurationRequest
    ):
        void
    {
        if
        (
            this.decidingId
        )
        {
            return;
        }

        this.confirmDialog.open
        (
            'Approve Change',
            `Apply "${request.ConfigurationName}" : ${this.requestFrom(request)} → ${this.requestTo(request)}?`,
            ():
                void =>
            {
                setTimeout
                (
                    () =>
                        this.decide(request, true),
                    this.CONFIRM_CLOSE_DELAY_MS
                );
            },
            'Approve',
            'Cancel',
            'primary'
        );
    }

    reject
    (
        request:
            ConfigurationRequest
    ):
        void
    {
        if
        (
            this.decidingId
        )
        {
            return;
        }

        this.confirmDialog.open
        (
            'Reject Change',
            `Reject the request to change "${request.ConfigurationName}"?`,
            ():
                void =>
            {
                setTimeout
                (
                    () =>
                        this.decide(request, false),
                    this.CONFIRM_CLOSE_DELAY_MS
                );
            },
            'Reject',
            'Cancel',
            'danger'
        );
    }

    private decide
    (
        request:
            ConfigurationRequest,
        approve:
            boolean
    ):
        void
    {
        this.decidingId =
            request.SystemConfigurationRequestId;

        this.cdr.detectChanges();

        const call$ =
            approve
                ? this.service.approve(request.SystemConfigurationRequestId)
                : this.service.reject(request.SystemConfigurationRequestId);

        call$.subscribe
        ({
            next:
            ():
                void =>
            {
                this.decidingId = 0;

                this.toast.success(
                    approve ? 'Approved' : 'Rejected',
                    approve
                        ? `"${request.ConfigurationName}" changed.`
                        : 'The request was rejected.'
                );

                this.loadRequests();
                this.load();
            },

            error:
            (
                error:
                    unknown
            ):
                void =>
            {
                this.decidingId = 0;

                this.toast.error(
                    approve ? 'Not approved' : 'Not rejected',
                    this.errorMessage(error, 'The request could not be updated.')
                );

                // A stale / cancelled request was closed by the server
                this.loadRequests();
                this.load();
            }
        });
    }


    //===========================================================
    // Admin : add / edit / delete / restore
    //===========================================================

    add():
        void
    {
        if
        (
            !this.canManage
        )
        {
            return;
        }

        void this.router.navigate(
            ['/settings/general-settings/system-configurations/add'],
            {
                queryParams:
                    this.selectedModuleId > 0
                        ? { moduleId: this.selectedModuleId }
                        : {}
            }
        );
    }

    edit
    (
        card:
            CardView
    ):
        void
    {
        void this.router.navigate(
            ['/settings/general-settings/system-configurations/edit', card.item.SystemConfigurationId]
        );
    }

    delete
    (
        card:
            CardView
    ):
        void
    {
        const item =
            card.item;

        this.confirmDialog.open
        (
            'Delete Configuration',
            `Are you sure you want to delete "${item.ConfigurationName}"?`,
            ():
                void =>
            {
                setTimeout
                (
                    () =>
                        this.service
                            .delete(item.SystemConfigurationId)
                            .subscribe
                            ({
                                next:
                                ():
                                    void =>
                                {
                                    this.toast.success('Deleted', `"${item.ConfigurationName}" deleted.`);
                                    this.load();
                                },

                                error:
                                (
                                    error:
                                        unknown
                                ):
                                    void =>
                                {
                                    this.toast.error('Not deleted', this.errorMessage(error, 'The configuration could not be deleted.'));
                                }
                            }),
                    this.CONFIRM_CLOSE_DELAY_MS
                );
            }
        );
    }

    restore():
        void
    {
        if
        (
            !this.canManage
        )
        {
            return;
        }

        this.confirmDialog.open
        (
            'Restore Configuration',
            'Restore the most recently deleted configuration?',
            ():
                void =>
            {
                setTimeout
                (
                    () =>
                        this.service
                            .restore()
                            .subscribe
                            ({
                                next:
                                ():
                                    void =>
                                {
                                    this.toast.success('Restored', 'Configuration restored.');
                                    this.load();
                                },

                                error:
                                (
                                    error:
                                        unknown
                                ):
                                    void =>
                                {
                                    this.toast.info('Restore', this.errorMessage(error, 'Nothing to restore.'));
                                }
                            }),
                    this.CONFIRM_CLOSE_DELAY_MS
                );
            },
            'Restore',
            'Cancel',
            'primary'
        );
    }


    //===========================================================
    // History
    //===========================================================

    openHistory():
        void
    {
        this.service
            .getHistory()
            .subscribe
            ({
                next:
                (
                    response:
                        any[]
                ):
                    void =>
                {
                    const read =
                        (item: any, name: string): any =>
                            item?.[name] ?? item?.[name.charAt(0).toLowerCase() + name.slice(1)];

                    this.historyItems =
                        (response ?? []).map
                        (
                            history =>
                            ({
                                title: read(history, 'ActivityTitle'),
                                description: read(history, 'ActivityDescription'),
                                user: read(history, 'PerformedByName') ?? 'System',
                                dateTime: new Date(read(history, 'PerformedDate')).toLocaleString(),
                                badge: read(history, 'ActivityType')
                            })
                        );

                    this.historyOpened = true;
                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error('History Load Failed:', error);

                    this.toast.error('History', 'Failed to load configuration history.');
                }
            });
    }

    closeHistory():
        void
    {
        this.historyOpened = false;
        this.cdr.detectChanges();
    }

    recentWhen
    (
        value:
            string
    ):
        string
    {
        const date =
            new Date(value);

        return Number.isNaN(date.getTime())
            ? ''
            : date.toLocaleString(
                undefined,
                {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                });
    }


    //===========================================================
    // Error text from the API
    //===========================================================

    private errorMessage
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
            if (typeof error.error === 'string' && error.error.trim()) return error.error;

            if (error.error?.message) return error.error.message;

            if (error.error?.title) return error.error.title;

            if (error.status === 403) return 'You do not have permission for this.';
        }

        return fallback;
    }
}