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
    SearchBoxComponent
}
from '../../../../../../shared/components/utilities/search-box/search-box';

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
    ToastService
}
from '../../../../../../shared/components/utilities/toast/toast.service';

import
{
    ToastComponent
}
from '../../../../../../shared/components/utilities/toast/toast';

//===============================================================
// Models & Services
//===============================================================

import
{
    CoaLevel,
    CoaClassNode,
    CoaGroupNode,
    CoaSubGroupNode,
    CoaLedgerRow,
    CoaIssue,
    CoaPrintOptions,
    CoaPrintDepth
}
from '../../../models/chart-of-accounts.model';

import
{
    ChartOfAccountsService
}
from '../../../services/chart-of-accounts.service';

//===============================================================
// Constants
//===============================================================

// Shown at the top of every printout.
const PRINT_COMPANY_NAME:
    string =
    'AppCore ERP';

// Remembers the last selected node (per browser, optional).
const STORAGE_KEY:
    string =
    'appcore.chart-of-accounts.selection';

// Remembers which navigator branches are open (per browser, optional).
const EXPANDED_STORAGE_KEY:
    string =
    'appcore.chart-of-accounts.expanded';

// Coming back to the page / browser tab reloads the chart, but
// not more often than this (milliseconds).
const AUTO_RELOAD_MIN_GAP_MS:
    number =
    5000;

//===============================================================
// View Types
//===============================================================

interface CoaSelection
{
    level:
        CoaLevel;

    id:
        number;
}

interface NavSubGroup
{
    node:
        CoaSubGroupNode;

    ledgers:
        number;
}

interface NavGroup
{
    node:
        CoaGroupNode;

    subGroups:
        NavSubGroup[];

    ledgers:
        number;
}

interface NavClass
{
    node:
        CoaClassNode;

    groups:
        NavGroup[];

    subGroupCount:
        number;

    ledgers:
        number;
}

interface PathStep
{
    level:
        CoaLevel | null;

    id:
        number;

    label:
        string;
}

interface PreviewColumn
{
    key:
        string;

    label:
        string;

    align:
        'left' | 'center' | 'right';

    width?:
        string;
}

interface PrintPreviewLine
{
    level:
        number;

    code:
        string;

    name:
        string;

    type:
        string;

    status:
        boolean;

    // "n ledgers" placeholder line (ledger names load at print time)
    summary:
        boolean;

    // printed rows this line stands for
    rows:
        number;
}

interface PreviewRow
{
    level:
        CoaLevel | 'ledger' | 'issue';

    id:
        number;

    code:
        string;

    name:
        string;

    status:
        boolean;

    cells:
        Record<string, string | number>;

    drillable:
        boolean;
}

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'chart-of-accounts-view',

    standalone:true,

    imports:
    [
        CommonModule,
        FormsModule,
        PageHeaderComponent,
        PageToolbarComponent,
        ControlTabsComponent,
        SearchBoxComponent,
        SearchDropdownComponent,
        CommandCenterComponent,
        EmptyStateComponent,
        ToastComponent
    ],

    templateUrl:'./chart-of-accounts-view.html',

    styleUrl:'./chart-of-accounts-view.css'
})

//===============================================================
// Chart of Accounts View
//
// Read-only. Left : navigator tree (Class → Group → Sub Group).
// Right : the direct children of the selected node only.
// Print : full chart or customized.
//
// Independent of the account setting pages: it only reads the
// live tables, and reloads by itself when the user comes back to
// the page or the browser tab, so changes made elsewhere (new
// ledgers, renamed groups, moved / deleted items) show up without
// pressing Refresh. Broken links are listed under "Link Issues".
//===============================================================

export class ChartOfAccountsView
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly chartOfAccountsService =
        inject(ChartOfAccountsService);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    //===========================================================
    // Tabs
    //===========================================================

    tabs:
        ControlTab[] =
    [
        {
            id:'chart',
            label:'Chart of Accounts'
        }
    ];

    selectedTab:
        string =
        'chart';

    //===========================================================
    // Data
    //===========================================================

    private classes:
        CoaClassNode[] =
        [];

    private readonly ledgerCache:
        Map<number, CoaLedgerRow[]> =
        new Map<number, CoaLedgerRow[]>();

    loading:
        boolean =
        false;

    loadFailed:
        boolean =
        false;

    ledgersLoading:
        boolean =
        false;

    //===========================================================
    // Link Issues (from the server's link check)
    //===========================================================

    issues:
        CoaIssue[] =
        [];

    // Preview shows the issues list instead of the tree level
    issuesOpen:
        boolean =
        false;

    //===========================================================
    // Auto Reload
    //===========================================================

    private lastLoadedAt:
        number =
        0;

    private readonly onWindowFocus =
        (): void =>
            this.autoReload();

    private readonly onVisibilityChange =
        (): void =>
        {
            if
            (
                document.visibilityState === 'visible'
            )
            {
                this.autoReload();
            }
        };

    //===========================================================
    // Filters
    //===========================================================

    searchText:
        string =
        '';

    rowFilterText:
        string =
        '';

    statusFilterItems:
        any[] =
    [
        { label:'All Status', value:null },
        { label:'Active', value:true },
        { label:'Inactive', value:false }
    ];

    selectedStatus:
        boolean | null =
        null;

    //===========================================================
    // Tree State
    //===========================================================

    private readonly expanded:
        Set<string> =
        new Set<string>();

    selection:
        CoaSelection | null =
        null;

    allExpanded:
        boolean =
        false;

    //===========================================================
    // View Model (rebuilt by refreshView)
    //===========================================================

    navClasses:
        NavClass[] =
        [];

    path:
        PathStep[] =
        [];

    previewTitle:
        string =
        '';

    previewSubtitle:
        string =
        '';

    previewColumns:
        PreviewColumn[] =
        [];

    previewRows:
        PreviewRow[] =
        [];

    previewEmptyText:
        string =
        '';

    previewIcon:
        string =
        'fas fa-layer-group';

    //===========================================================
    // Counters (scoped to the selection)
    //===========================================================

    countClasses:
        number =
        0;

    countGroups:
        number =
        0;

    countSubGroups:
        number =
        0;

    countLedgers:
        number =
        0;

    scopeLabel:
        string =
        '';

    //===========================================================
    // Print Dialog
    //===========================================================

    printOpen:
        boolean =
        false;

    printing:
        boolean =
        false;

    printOptions:
        CoaPrintOptions =
        this.defaultPrintOptions();

    printDepthItems:
        { value: CoaPrintDepth; label: string; short: string }[] =
    [
        { value:'class', label:'Classes only', short:'Classes' },
        { value:'group', label:'Up to Groups', short:'Groups' },
        { value:'subgroup', label:'Up to Sub Groups', short:'Sub Groups' },
        { value:'ledger', label:'Up to Ledgers (full)', short:'Ledgers' }
    ];

    //===========================================================
    // Print Preview (live paper in the dialog)
    //===========================================================

    readonly printCompanyName:
        string =
        PRINT_COMPANY_NAME;

    printPreviewLines:
        PrintPreviewLine[] =
        [];

    printRowEstimate:
        number =
        0;

    printMoreRows:
        number =
        0;

    printDepthIndex:
        number =
        3;

    printScopeText:
        string =
        'Full Chart';

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.selection =
            this.readStoredSelection();

        this.readStoredExpanded();

        this.loadTree();

        window.addEventListener(
            'focus',
            this.onWindowFocus
        );

        document.addEventListener(
            'visibilitychange',
            this.onVisibilityChange
        );
    }

    //===========================================================
    // Destroy
    //===========================================================

    ngOnDestroy():
        void
    {
        window.removeEventListener(
            'focus',
            this.onWindowFocus
        );

        document.removeEventListener(
            'visibilitychange',
            this.onVisibilityChange
        );
    }

    //===========================================================
    // Auto Reload (page / tab comes back into view)
    //
    // Quiet reload: keeps the current tree on screen while the
    // fresh data loads, then swaps it in.
    //===========================================================

    private autoReload():
        void
    {
        if
        (
            this.loading
            ||
            this.printOpen
            ||
            Date.now() - this.lastLoadedAt < AUTO_RELOAD_MIN_GAP_MS
        )
        {
            return;
        }

        this.loadTree(
            true
        );
    }

    //===========================================================
    // Load Tree
    //===========================================================

    loadTree
    (
        quiet:
            boolean =
            false
    ):
        void
    {
        this.lastLoadedAt =
            Date.now();

        // A quiet reload keeps the current tree on screen
        if
        (
            !quiet
        )
        {
            this.loading =
                true;

            this.loadFailed =
                false;

            // Show the loading state right away
            this.cdr.detectChanges();
        }

        this.chartOfAccountsService
            .getTree()
            .subscribe
            ({
                next:
                (
                    response:
                        CoaClassNode[]
                ):
                    void =>
                {
                    try
                    {
                        this.classes =
                            response ?? [];

                        this.loadFailed =
                            false;

                        // Ledgers are re-read too (they may have changed)
                        this.ledgerCache.clear();

                        // Drop a stored selection that no longer exists
                        if
                        (
                            this.selection
                            &&
                            !this.findNode(this.selection)
                        )
                        {
                            this.selection =
                                null;

                            this.storeSelection();
                        }

                        if
                        (
                            this.selection
                        )
                        {
                            this.expandAncestors(this.selection);
                        }
                    }
                    catch
                    (
                        error
                    )
                    {
                        console.error(
                            'Build Chart of Accounts Error:',
                            error
                        );
                    }
                    finally
                    {
                        // Always leave the loading state, whatever happened above
                        this.loading =
                            false;

                        this.refreshView();
                    }

                    this.ensureLedgers();

                    this.loadIssues();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Chart of Accounts Error:',
                        error
                    );

                    // A failed quiet reload keeps what is on screen
                    if
                    (
                        quiet
                    )
                    {
                        return;
                    }

                    this.classes =
                        [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.refreshView();

                    this.toast.error(
                        'Load Failed',
                        'Unable to load the chart of accounts.'
                    );
                }
            });
    }

    //===========================================================
    // Load Link Issues
    //===========================================================

    private loadIssues():
        void
    {
        this.chartOfAccountsService
            .getIssues()
            .subscribe
            ({
                next:
                (
                    rows:
                        CoaIssue[]
                ):
                    void =>
                {
                    this.issues =
                        rows ?? [];

                    // Nothing left to show
                    if
                    (
                        this.issues.length === 0
                    )
                    {
                        this.issuesOpen =
                            false;
                    }

                    this.refreshView();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    // The chart still works without the check
                    console.error(
                        'Load Chart of Accounts Issues Error:',
                        error
                    );
                }
            });
    }

    //===========================================================
    // Toggle Link Issues (preview)
    //===========================================================

    toggleIssues():
        void
    {
        this.issuesOpen =
            !this.issuesOpen
            &&
            this.issues.length > 0;

        this.rowFilterText =
            '';

        this.refreshView();
    }

    //===========================================================
    // Refresh (header)
    //===========================================================

    refresh():
        void
    {
        this.searchText =
            '';

        this.rowFilterText =
            '';

        this.loadTree();
    }

    //===========================================================
    // Status Helpers
    //===========================================================

    private statusMatches
    (
        status:
            boolean
    ):
        boolean
    {
        return this.selectedStatus === null
            ||
            status === this.selectedStatus;
    }

    private ledgerCountOf
    (
        subGroup:
            CoaSubGroupNode
    ):
        number
    {
        if
        (
            this.selectedStatus === true
        )
        {
            return subGroup.ActiveLedgerCount;
        }

        if
        (
            this.selectedStatus === false
        )
        {
            return Math.max(
                0,
                subGroup.LedgerCount - subGroup.ActiveLedgerCount
            );
        }

        return subGroup.LedgerCount;
    }

    //===========================================================
    // Keys
    //===========================================================

    classKey(id: number): string { return `c:${id}`; }

    groupKey(id: number): string { return `g:${id}`; }

    isExpanded
    (
        key:
            string
    ):
        boolean
    {
        return this.expanded.has(key);
    }

    isSelected
    (
        level:
            CoaLevel,
        id:
            number
    ):
        boolean
    {
        return this.selection?.level === level
            &&
            this.selection?.id === id;
    }

    //===========================================================
    // Build Navigator (status + search filters)
    //===========================================================

    private buildNavigator():
        void
    {
        const keyword =
            this.searchText.trim().toLowerCase();

        const hit =
            (
                code:
                    string,
                name:
                    string
            ):
                boolean =>
                !keyword
                ||
                code.toLowerCase().includes(keyword)
                ||
                name.toLowerCase().includes(keyword);

        const result:
            NavClass[] =
            [];

        for
        (
            const cls
            of this.classes
        )
        {
            if
            (
                !this.statusMatches(cls.Status)
            )
            {
                continue;
            }

            const classHit =
                hit(cls.Code, cls.Name);

            const groups:
                NavGroup[] =
                [];

            for
            (
                const grp
                of cls.Groups
            )
            {
                if
                (
                    !this.statusMatches(grp.Status)
                )
                {
                    continue;
                }

                const groupHit =
                    classHit
                    ||
                    hit(grp.Code, grp.Name);

                const subGroups:
                    NavSubGroup[] =
                    grp.SubGroups
                        .filter
                        (
                            sub =>
                                this.statusMatches(sub.Status)
                                &&
                                (
                                    groupHit
                                    ||
                                    hit(sub.Code, sub.Name)
                                )
                        )
                        .map
                        (
                            sub =>
                            ({
                                node:
                                    sub,

                                ledgers:
                                    this.ledgerCountOf(sub)
                            })
                        );

                if
                (
                    !groupHit
                    &&
                    subGroups.length === 0
                )
                {
                    continue;
                }

                // While searching, open the branches that match
                if
                (
                    keyword
                    &&
                    subGroups.length > 0
                    &&
                    !groupHit
                )
                {
                    this.expanded.add(this.groupKey(grp.Id));
                    this.expanded.add(this.classKey(cls.Id));
                }

                groups.push
                ({
                    node:
                        grp,

                    subGroups,

                    ledgers:
                        subGroups.reduce
                        (
                            (sum, sub) =>
                                sum + sub.ledgers,
                            0
                        )
                });
            }

            if
            (
                !classHit
                &&
                groups.length === 0
            )
            {
                continue;
            }

            if
            (
                keyword
                &&
                groups.length > 0
                &&
                !classHit
            )
            {
                this.expanded.add(this.classKey(cls.Id));
            }

            result.push
            ({
                node:
                    cls,

                groups,

                subGroupCount:
                    groups.reduce
                    (
                        (sum, grp) =>
                            sum + grp.subGroups.length,
                        0
                    ),

                ledgers:
                    groups.reduce
                    (
                        (sum, grp) =>
                            sum + grp.ledgers,
                        0
                    )
            });
        }

        this.navClasses =
            result;
    }

    //===========================================================
    // Find Node (in the full, unfiltered tree)
    //===========================================================

    private findNode
    (
        selection:
            CoaSelection
    ):
        { cls: CoaClassNode; grp?: CoaGroupNode; sub?: CoaSubGroupNode } | null
    {
        for
        (
            const cls
            of this.classes
        )
        {
            if
            (
                selection.level === 'class'
                &&
                cls.Id === selection.id
            )
            {
                return { cls };
            }

            for
            (
                const grp
                of cls.Groups
            )
            {
                if
                (
                    selection.level === 'group'
                    &&
                    grp.Id === selection.id
                )
                {
                    return { cls, grp };
                }

                for
                (
                    const sub
                    of grp.SubGroups
                )
                {
                    if
                    (
                        selection.level === 'subgroup'
                        &&
                        sub.Id === selection.id
                    )
                    {
                        return { cls, grp, sub };
                    }
                }
            }
        }

        return null;
    }

    //===========================================================
    // Find Visible Node (in the filtered navigator)
    //===========================================================

    private findNav
    (
        selection:
            CoaSelection
    ):
        { cls: NavClass; grp?: NavGroup; sub?: NavSubGroup } | null
    {
        for
        (
            const cls
            of this.navClasses
        )
        {
            if
            (
                selection.level === 'class'
                &&
                cls.node.Id === selection.id
            )
            {
                return { cls };
            }

            for
            (
                const grp
                of cls.groups
            )
            {
                if
                (
                    selection.level === 'group'
                    &&
                    grp.node.Id === selection.id
                )
                {
                    return { cls, grp };
                }

                for
                (
                    const sub
                    of grp.subGroups
                )
                {
                    if
                    (
                        selection.level === 'subgroup'
                        &&
                        sub.node.Id === selection.id
                    )
                    {
                        return { cls, grp, sub };
                    }
                }
            }
        }

        return null;
    }

    //===========================================================
    // Expand Ancestors
    //===========================================================

    private expandAncestors
    (
        selection:
            CoaSelection
    ):
        void
    {
        const found =
            this.findNode(selection);

        if
        (
            !found
        )
        {
            return;
        }

        this.expanded.add(this.classKey(found.cls.Id));

        if
        (
            found.grp
        )
        {
            this.expanded.add(this.groupKey(found.grp.Id));
        }
    }

    //===========================================================
    // Refresh View (navigator, counters, path, preview)
    //===========================================================

    refreshView():
        void
    {
        try
        {
            this.buildNavigator();

            this.buildCounters();

            this.buildPath();

            this.buildPreview();

            this.syncAllExpanded();
        }
        catch
        (
            error
        )
        {
            console.error(
                'Chart of Accounts View Error:',
                error
            );
        }
        finally
        {
            this.cdr.detectChanges();
        }
    }

    //===========================================================
    // Counters (scoped)
    //===========================================================

    private buildCounters():
        void
    {
        const found =
            this.selection
                ? this.findNav(this.selection)
                : null;

        if
        (
            found?.sub
        )
        {
            this.countClasses = 1;
            this.countGroups = 1;
            this.countSubGroups = 1;
            this.countLedgers = found.sub.ledgers;
        }
        else if
        (
            found?.grp
        )
        {
            this.countClasses = 1;
            this.countGroups = 1;
            this.countSubGroups = found.grp.subGroups.length;
            this.countLedgers = found.grp.ledgers;
        }
        else if
        (
            found
        )
        {
            this.countClasses = 1;
            this.countGroups = found.cls.groups.length;
            this.countSubGroups = found.cls.subGroupCount;
            this.countLedgers = found.cls.ledgers;
        }
        else
        {
            this.countClasses =
                this.navClasses.length;

            this.countGroups =
                this.navClasses.reduce
                (
                    (sum, cls) =>
                        sum + cls.groups.length,
                    0
                );

            this.countSubGroups =
                this.navClasses.reduce
                (
                    (sum, cls) =>
                        sum + cls.subGroupCount,
                    0
                );

            this.countLedgers =
                this.navClasses.reduce
                (
                    (sum, cls) =>
                        sum + cls.ledgers,
                    0
                );
        }

        this.scopeLabel =
            found
                ? [found.cls.node.Name, found.grp?.node.Name, found.sub?.node.Name]
                    .filter(part => !!part)
                    .join(' › ')
                : '';
    }

    //===========================================================
    // Path Rail
    //===========================================================

    private buildPath():
        void
    {
        const steps:
            PathStep[] =
        [
            {
                level:null,
                id:0,
                label:'All Classes'
            }
        ];

        const found =
            this.selection
                ? this.findNode(this.selection)
                : null;

        if
        (
            found
        )
        {
            steps.push({ level:'class', id:found.cls.Id, label:found.cls.Name });

            if
            (
                found.grp
            )
            {
                steps.push({ level:'group', id:found.grp.Id, label:found.grp.Name });
            }

            if
            (
                found.sub
            )
            {
                steps.push({ level:'subgroup', id:found.sub.Id, label:found.sub.Name });
            }
        }

        this.path =
            steps;
    }

    //===========================================================
    // Preview (direct children of the selection only)
    //===========================================================

    private buildPreview():
        void
    {
        const keyword =
            this.rowFilterText.trim().toLowerCase();

        const keep =
            (
                row:
                    PreviewRow
            ):
                boolean =>
                !keyword
                ||
                row.code.toLowerCase().includes(keyword)
                ||
                row.name.toLowerCase().includes(keyword);

        const found =
            this.selection
                ? this.findNav(this.selection)
                : null;

        //=======================================================
        // Link Issues
        //=======================================================

        if
        (
            this.issuesOpen
        )
        {
            this.previewTitle =
                'Link Issues';

            this.previewIcon =
                'fas fa-triangle-exclamation';

            this.previewColumns =
            [
                { key:'level', label:'Level', align:'left', width:'150px' },
                { key:'code', label:'Code', align:'left', width:'210px' },
                { key:'name', label:'Name', align:'left', width:'220px' },
                { key:'problem', label:'Problem', align:'left' }
            ];

            this.previewRows =
                this.issues
                    .map
                    (
                        (issue, index) =>
                        ({
                            level:'issue' as const,
                            id:index + 1,
                            code:issue.Code,
                            name:issue.Name,
                            status:true,
                            drillable:false,
                            cells:
                            {
                                level:issue.Level,
                                problem:issue.Problem
                            }
                        })
                    )
                    .filter
                    (
                        row =>
                            keep(row)
                            ||
                            String(row.cells['problem']).toLowerCase().includes(keyword)
                    );

            this.previewEmptyText =
                keyword
                    ? 'No issue matches the filter.'
                    : 'No link issues. Everything is linked correctly.';
        }

        //=======================================================
        // Sub Group → Ledgers
        //=======================================================

        else if
        (
            found?.sub
        )
        {
            const sub =
                found.sub.node;

            const ledgers =
                (this.ledgerCache.get(sub.Id) ?? [])
                    .filter
                    (
                        ledger =>
                            this.statusMatches(ledger.Status)
                    );

            this.previewTitle =
                'Ledgers';

            this.previewIcon =
                'fas fa-book';

            this.previewColumns =
            [
                { key:'code', label:'Code', align:'left', width:'210px' },
                { key:'name', label:'Ledger', align:'left' },
                { key:'type', label:'Type', align:'center', width:'110px' },
                { key:'branch', label:'Branch', align:'left', width:'200px' },
                { key:'status', label:'Status', align:'center', width:'110px' }
            ];

            this.previewRows =
                ledgers
                    .map
                    (
                        ledger =>
                        ({
                            level:'ledger' as const,
                            id:ledger.Id,
                            code:ledger.Code,
                            name:ledger.Name,
                            status:ledger.Status,
                            drillable:false,
                            cells:
                            {
                                type:ledger.Type,
                                branch:ledger.Branch || '—'
                            }
                        })
                    )
                    .filter(keep);

            this.previewEmptyText =
                this.ledgersLoading
                    ? 'Loading ledgers…'
                    : keyword
                        ? 'No ledger matches the filter.'
                        : `No ledgers in ${sub.Name}.`;
        }

        //=======================================================
        // Group → Sub Groups
        //=======================================================

        else if
        (
            found?.grp
        )
        {
            const grp =
                found.grp;

            this.previewTitle =
                'Sub Groups';

            this.previewIcon =
                'fas fa-folder-open';

            this.previewColumns =
            [
                { key:'code', label:'Code', align:'left', width:'210px' },
                { key:'name', label:'Sub Group', align:'left' },
                { key:'ledgers', label:'Ledgers', align:'center', width:'120px' },
                { key:'status', label:'Status', align:'center', width:'110px' }
            ];

            this.previewRows =
                grp.subGroups
                    .map
                    (
                        sub =>
                        ({
                            level:'subgroup' as const,
                            id:sub.node.Id,
                            code:sub.node.Code,
                            name:sub.node.Name,
                            status:sub.node.Status,
                            drillable:true,
                            cells:
                            {
                                ledgers:sub.ledgers
                            }
                        })
                    )
                    .filter(keep);

            this.previewEmptyText =
                keyword
                    ? 'No sub group matches the filter.'
                    : `No sub groups in ${grp.node.Name}.`;
        }

        //=======================================================
        // Class → Groups
        //=======================================================

        else if
        (
            found
        )
        {
            const cls =
                found.cls;

            this.previewTitle =
                'Groups';

            this.previewIcon =
                'fas fa-folder-tree';

            this.previewColumns =
            [
                { key:'code', label:'Code', align:'left', width:'210px' },
                { key:'name', label:'Group', align:'left' },
                { key:'subGroups', label:'Sub Groups', align:'center', width:'120px' },
                { key:'ledgers', label:'Ledgers', align:'center', width:'120px' },
                { key:'status', label:'Status', align:'center', width:'110px' }
            ];

            this.previewRows =
                cls.groups
                    .map
                    (
                        grp =>
                        ({
                            level:'group' as const,
                            id:grp.node.Id,
                            code:grp.node.Code,
                            name:grp.node.Name,
                            status:grp.node.Status,
                            drillable:true,
                            cells:
                            {
                                subGroups:grp.subGroups.length,
                                ledgers:grp.ledgers
                            }
                        })
                    )
                    .filter(keep);

            this.previewEmptyText =
                keyword
                    ? 'No group matches the filter.'
                    : `No groups in ${cls.node.Name}.`;
        }

        //=======================================================
        // Nothing → Classes
        //=======================================================

        else
        {
            this.previewTitle =
                'Account Classes';

            this.previewIcon =
                'fas fa-layer-group';

            this.previewColumns =
            [
                { key:'code', label:'Code', align:'left', width:'210px' },
                { key:'name', label:'Class', align:'left' },
                { key:'groups', label:'Groups', align:'center', width:'110px' },
                { key:'subGroups', label:'Sub Groups', align:'center', width:'120px' },
                { key:'ledgers', label:'Ledgers', align:'center', width:'110px' },
                { key:'status', label:'Status', align:'center', width:'110px' }
            ];

            this.previewRows =
                this.navClasses
                    .map
                    (
                        cls =>
                        ({
                            level:'class' as const,
                            id:cls.node.Id,
                            code:cls.node.Code,
                            name:cls.node.Name,
                            status:cls.node.Status,
                            drillable:true,
                            cells:
                            {
                                groups:cls.groups.length,
                                subGroups:cls.subGroupCount,
                                ledgers:cls.ledgers
                            }
                        })
                    )
                    .filter(keep);

            this.previewEmptyText =
                keyword
                    ? 'No class matches the filter.'
                    : 'No account classes found.';
        }

        this.previewSubtitle =
            `${this.previewRows.length} ${this.previewRows.length === 1 ? 'record' : 'records'}`;
    }

    //===========================================================
    // Selection
    //===========================================================

    select
    (
        level:
            CoaLevel,
        id:
            number
    ):
        void
    {
        this.selection =
            { level, id };

        this.issuesOpen =
            false;

        this.rowFilterText =
            '';

        this.expandAncestors(this.selection);

        // Opening a class / group also expands it in the tree
        if
        (
            level === 'class'
        )
        {
            this.expanded.add(this.classKey(id));
        }

        if
        (
            level === 'group'
        )
        {
            this.expanded.add(this.groupKey(id));
        }

        this.storeSelection();

        this.refreshView();

        this.ensureLedgers();
    }

    clearSelection():
        void
    {
        this.selection =
            null;

        this.issuesOpen =
            false;

        this.rowFilterText =
            '';

        this.storeSelection();

        this.refreshView();
    }

    onPathClick
    (
        step:
            PathStep
    ):
        void
    {
        if
        (
            step.level === null
        )
        {
            this.clearSelection();

            return;
        }

        this.select(
            step.level,
            step.id
        );
    }

    onRowClick
    (
        row:
            PreviewRow
    ):
        void
    {
        if
        (
            !row.drillable
            ||
            row.level === 'ledger'
            ||
            row.level === 'issue'
        )
        {
            return;
        }

        this.select(
            row.level,
            row.id
        );
    }

    //===========================================================
    // Toggle Expand
    //===========================================================

    toggle
    (
        key:
            string,
        event?:
            Event
    ):
        void
    {
        event?.stopPropagation();

        if
        (
            this.expanded.has(key)
        )
        {
            this.expanded.delete(key);
        }
        else
        {
            this.expanded.add(key);
        }

        this.syncAllExpanded();

        this.cdr.detectChanges();
    }

    toggleAll():
        void
    {
        this.allExpanded =
            !this.allExpanded;

        this.expanded.clear();

        if
        (
            this.allExpanded
        )
        {
            for
            (
                const cls
                of this.classes
            )
            {
                this.expanded.add(this.classKey(cls.Id));

                for
                (
                    const grp
                    of cls.Groups
                )
                {
                    this.expanded.add(this.groupKey(grp.Id));
                }
            }
        }
        else if
        (
            this.selection
        )
        {
            this.expandAncestors(this.selection);
        }

        this.storeExpanded();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Sync "all expanded" with the tree (and remember it)
    //
    // True when every branch that has children is open.
    //===========================================================

    private syncAllExpanded():
        void
    {
        const keys:
            string[] =
            [];

        for
        (
            const cls
            of this.navClasses
        )
        {
            if
            (
                cls.groups.length
            )
            {
                keys.push(this.classKey(cls.node.Id));
            }

            for
            (
                const grp
                of cls.groups
            )
            {
                if
                (
                    grp.subGroups.length
                )
                {
                    keys.push(this.groupKey(grp.node.Id));
                }
            }
        }

        this.allExpanded =
            keys.length > 0
            &&
            keys.every
            (
                key =>
                    this.expanded.has(key)
            );

        this.storeExpanded();
    }

    //===========================================================
    // Load Ledgers For The Selected Sub Group
    //===========================================================

    private ensureLedgers():
        void
    {
        if
        (
            this.selection?.level !== 'subgroup'
        )
        {
            return;
        }

        const subGroupId =
            this.selection.id;

        if
        (
            this.ledgerCache.has(subGroupId)
        )
        {
            return;
        }

        this.ledgersLoading =
            true;

        this.refreshView();

        this.chartOfAccountsService
            .getSubGroupLedgers(
                subGroupId
            )
            .subscribe
            ({
                next:
                (
                    rows:
                        CoaLedgerRow[]
                ):
                    void =>
                {
                    this.ledgerCache.set(
                        subGroupId,
                        rows ?? []
                    );

                    this.ledgersLoading =
                        false;

                    this.refreshView();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Ledgers Error:',
                        error
                    );

                    this.ledgersLoading =
                        false;

                    this.refreshView();

                    this.toast.error(
                        'Load Failed',
                        'Unable to load ledgers for this sub group.'
                    );
                }
            });
    }

    //===========================================================
    // Filters
    //===========================================================

    onSearch
    (
        value:
            string
    ):
        void
    {
        this.searchText =
            value
            ??
            '';

        this.refreshView();
    }

    onStatusFilterChange
    (
        value:
            boolean | null
    ):
        void
    {
        this.selectedStatus =
            value;

        // Keep the selection only if it is still visible
        if
        (
            this.selection
        )
        {
            this.buildNavigator();

            if
            (
                !this.findNav(this.selection)
            )
            {
                this.selection =
                    null;

                this.storeSelection();
            }
        }

        this.refreshView();
    }

    onRowFilterChange
    (
        value:
            string
    ):
        void
    {
        this.rowFilterText =
            value
            ??
            '';

        this.buildPreview();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Selection Memory (per browser, optional)
    //===========================================================

    private readStoredSelection():
        CoaSelection | null
    {
        try
        {
            const raw =
                window.localStorage.getItem(STORAGE_KEY);

            if
            (
                !raw
            )
            {
                return null;
            }

            const parsed =
                JSON.parse(raw);

            if
            (
                ['class', 'group', 'subgroup'].includes(parsed?.level)
                &&
                Number(parsed?.id) > 0
            )
            {
                return {
                    level:parsed.level,
                    id:Number(parsed.id)
                };
            }
        }
        catch
        {
            // storage unavailable — ignore
        }

        return null;
    }

    private storeSelection():
        void
    {
        try
        {
            if
            (
                this.selection
            )
            {
                window.localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(this.selection)
                );
            }
            else
            {
                window.localStorage.removeItem(STORAGE_KEY);
            }
        }
        catch
        {
            // storage unavailable — ignore
        }
    }

    private readStoredExpanded():
        void
    {
        try
        {
            const raw =
                window.localStorage.getItem(EXPANDED_STORAGE_KEY);

            const keys =
                raw
                    ? JSON.parse(raw)
                    : [];

            if
            (
                Array.isArray(keys)
            )
            {
                for
                (
                    const key
                    of keys
                )
                {
                    if
                    (
                        typeof key === 'string'
                        &&
                        /^[cg]:\d+$/.test(key)
                    )
                    {
                        this.expanded.add(key);
                    }
                }
            }
        }
        catch
        {
            // storage unavailable — ignore
        }
    }

    private storeExpanded():
        void
    {
        try
        {
            window.localStorage.setItem(
                EXPANDED_STORAGE_KEY,
                JSON.stringify(Array.from(this.expanded))
            );
        }
        catch
        {
            // storage unavailable — ignore
        }
    }

    //===========================================================
    // Print : Dialog
    //===========================================================

    private defaultPrintOptions():
        CoaPrintOptions
    {
        return {
            scope:'all',
            depth:'ledger',
            includeInactive:false,
            showType:true,
            showBranch:true,
            showStatus:true,
            landscape:false
        };
    }

    openPrint():
        void
    {
        if
        (
            this.loading
            ||
            this.classes.length === 0
        )
        {
            this.toast.info(
                'Nothing to Print',
                'The chart of accounts is empty.'
            );

            return;
        }

        this.printOptions =
        {
            ...this.defaultPrintOptions(),

            scope:
                this.selection
                    ? 'selection'
                    : 'all'
        };

        this.printOpen =
            true;

        this.updatePrintPreview();
    }

    //===========================================================
    // Print : Option Setters (each one refreshes the preview)
    //===========================================================

    setPrintScope
    (
        scope:
            'all' | 'selection'
    ):
        void
    {
        if
        (
            scope === 'selection'
            &&
            !this.selection
        )
        {
            return;
        }

        this.printOptions.scope =
            scope;

        this.updatePrintPreview();
    }

    setPrintDepth
    (
        depth:
            CoaPrintDepth
    ):
        void
    {
        this.printOptions.depth =
            depth;

        this.updatePrintPreview();
    }

    togglePrintColumn
    (
        key:
            'showType' | 'showBranch' | 'showStatus'
    ):
        void
    {
        this.printOptions[key] =
            !this.printOptions[key];

        this.updatePrintPreview();
    }

    setPrintLandscape
    (
        landscape:
            boolean
    ):
        void
    {
        this.printOptions.landscape =
            landscape;

        this.updatePrintPreview();
    }

    setPrintIncludeInactive
    (
        include:
            boolean
    ):
        void
    {
        this.printOptions.includeInactive =
            !!include;

        this.updatePrintPreview();
    }

    //===========================================================
    // Print : Live Preview
    //
    // Walks the same scope / depth / status rules as the real
    // printout. Ledger names are fetched only when printing, so
    // the preview shows one "n ledgers" line per sub group.
    //===========================================================

    private updatePrintPreview():
        void
    {
        const o =
            this.printOptions;

        const include =
            (
                status:
                    boolean
            ):
                boolean =>
                o.includeInactive
                ||
                status;

        const depthOrder:
            CoaPrintDepth[] =
            ['class', 'group', 'subgroup', 'ledger'];

        const maxDepth =
            depthOrder.indexOf(o.depth) + 1;

        this.printDepthIndex =
            maxDepth - 1;

        const found =
            o.scope === 'selection'
            &&
            this.selection
                ? this.findNode(this.selection)
                : null;

        this.printScopeText =
            found
                ? [found.cls.Name, found.grp?.Name, found.sub?.Name]
                    .filter(part => !!part)
                    .join(' › ')
                : 'Full Chart';

        const classes =
            found
                ? [found.cls]
                : this.classes;

        const lineLimit =
            o.landscape
                ? 9
                : 15;

        const lines:
            PrintPreviewLine[] =
            [];

        let total =
            0;

        const add =
            (
                line:
                    PrintPreviewLine
            ):
                void =>
            {
                total +=
                    line.rows;

                if
                (
                    lines.length < lineLimit
                )
                {
                    lines.push(line);
                }
            };

        for
        (
            const cls
            of classes
        )
        {
            if
            (
                !include(cls.Status)
            )
            {
                continue;
            }

            add({ level:1, code:cls.Code, name:cls.Name, type:'Class', status:cls.Status, summary:false, rows:1 });

            if
            (
                maxDepth < 2
            )
            {
                continue;
            }

            for
            (
                const grp
                of cls.Groups
            )
            {
                if
                (
                    !include(grp.Status)
                    ||
                    (found?.grp && found.grp.Id !== grp.Id)
                )
                {
                    continue;
                }

                add({ level:2, code:grp.Code, name:grp.Name, type:'Group', status:grp.Status, summary:false, rows:1 });

                if
                (
                    maxDepth < 3
                )
                {
                    continue;
                }

                for
                (
                    const sub
                    of grp.SubGroups
                )
                {
                    if
                    (
                        !include(sub.Status)
                        ||
                        (found?.sub && found.sub.Id !== sub.Id)
                    )
                    {
                        continue;
                    }

                    add({ level:3, code:sub.Code, name:sub.Name, type:'Sub Group', status:sub.Status, summary:false, rows:1 });

                    if
                    (
                        maxDepth < 4
                    )
                    {
                        continue;
                    }

                    const ledgers =
                        o.includeInactive
                            ? sub.LedgerCount
                            : sub.ActiveLedgerCount;

                    if
                    (
                        ledgers > 0
                    )
                    {
                        add(
                            {
                                level:4,
                                code:'',
                                name:`${ledgers} ${ledgers === 1 ? 'ledger' : 'ledgers'}`,
                                type:'',
                                status:true,
                                summary:true,
                                rows:ledgers
                            }
                        );
                    }
                }
            }
        }

        this.printPreviewLines =
            lines;

        this.printRowEstimate =
            total;

        // rows not drawn on the preview sheet
        const drawn =
            lines.reduce
            (
                (sum, line) =>
                    sum + line.rows,
                0
            );

        this.printMoreRows =
            Math.max(0, total - drawn);

        this.cdr.detectChanges();
    }

    closePrint():
        void
    {
        if
        (
            this.printing
        )
        {
            return;
        }

        this.printOpen =
            false;

        this.cdr.detectChanges();
    }

    printFullChart():
        void
    {
        this.printOptions =
            this.defaultPrintOptions();

        this.runPrint();
    }

    //===========================================================
    // Print : Run
    //===========================================================

    runPrint():
        void
    {
        if
        (
            this.printing
        )
        {
            return;
        }

        if
        (
            this.printOptions.depth !== 'ledger'
        )
        {
            this.writePrint(new Map<number, CoaLedgerRow[]>());

            return;
        }

        this.printing =
            true;

        this.cdr.detectChanges();

        this.chartOfAccountsService
            .getAllLedgers()
            .subscribe
            ({
                next:
                (
                    rows:
                        CoaLedgerRow[]
                ):
                    void =>
                {
                    const bySubGroup =
                        new Map<number, CoaLedgerRow[]>();

                    for
                    (
                        const row
                        of rows ?? []
                    )
                    {
                        const list =
                            bySubGroup.get(row.SubGroupId) ?? [];

                        list.push(row);

                        bySubGroup.set(row.SubGroupId, list);
                    }

                    this.printing =
                        false;

                    this.writePrint(bySubGroup);
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Print Ledgers Error:',
                        error
                    );

                    this.printing =
                        false;

                    this.cdr.detectChanges();

                    this.toast.error(
                        'Print Failed',
                        'Unable to load ledgers for printing.'
                    );
                }
            });
    }

    //===========================================================
    // Print : Build & Send To Browser Print
    //===========================================================

    private writePrint
    (
        ledgers:
            Map<number, CoaLedgerRow[]>
    ):
        void
    {
        const o =
            this.printOptions;

        const include =
            (
                status:
                    boolean
            ):
                boolean =>
                o.includeInactive
                ||
                status;

        const depthRank:
            Record<CoaPrintDepth, number> =
            { class:1, group:2, subgroup:3, ledger:4 };

        const maxDepth =
            depthRank[o.depth];

        //=======================================================
        // Scope
        //=======================================================

        const found =
            o.scope === 'selection'
            &&
            this.selection
                ? this.findNode(this.selection)
                : null;

        const scopeText =
            found
                ? [found.cls.Name, found.grp?.Name, found.sub?.Name]
                    .filter(part => !!part)
                    .join(' › ')
                : 'Full Chart';

        const classes =
            found
                ? [found.cls]
                : this.classes;

        //=======================================================
        // Rows
        //=======================================================

        const rows:
            string[] =
            [];

        const cell =
            (
                value:
                    string,
                css:
                    string = ''
            ):
                string =>
                `<td class="${css}">${this.escape(value)}</td>`;

        const extraCells =
            (
                type:
                    string,
                branch:
                    string,
                status:
                    boolean
            ):
                string =>
                (o.showType ? cell(type, 'c') : '')
                +
                (o.showBranch ? cell(branch, '') : '')
                +
                (o.showStatus ? cell(status ? 'Active' : 'Inactive', 'c') : '');

        const row =
            (
                level:
                    number,
                code:
                    string,
                name:
                    string,
                type:
                    string,
                branch:
                    string,
                status:
                    boolean
            ):
                void =>
            {
                rows.push(
                    `<tr class="lv${level}">` +
                    cell(code, 'code') +
                    `<td class="name" style="padding-left:${8 + (level - 1) * 18}px">${this.escape(name)}</td>` +
                    extraCells(type, branch, status) +
                    `</tr>`
                );
            };

        for
        (
            const cls
            of classes
        )
        {
            if
            (
                !include(cls.Status)
            )
            {
                continue;
            }

            row(1, cls.Code, cls.Name, 'Class', '', cls.Status);

            if
            (
                maxDepth < 2
            )
            {
                continue;
            }

            for
            (
                const grp
                of cls.Groups
            )
            {
                if
                (
                    !include(grp.Status)
                    ||
                    (found?.grp && found.grp.Id !== grp.Id)
                )
                {
                    continue;
                }

                row(2, grp.Code, grp.Name, 'Group', '', grp.Status);

                if
                (
                    maxDepth < 3
                )
                {
                    continue;
                }

                for
                (
                    const sub
                    of grp.SubGroups
                )
                {
                    if
                    (
                        !include(sub.Status)
                        ||
                        (found?.sub && found.sub.Id !== sub.Id)
                    )
                    {
                        continue;
                    }

                    row(3, sub.Code, sub.Name, 'Sub Group', '', sub.Status);

                    if
                    (
                        maxDepth < 4
                    )
                    {
                        continue;
                    }

                    for
                    (
                        const ledger
                        of ledgers.get(sub.Id) ?? []
                    )
                    {
                        if
                        (
                            !include(ledger.Status)
                        )
                        {
                            continue;
                        }

                        row(4, ledger.Code, ledger.Name, ledger.Type, ledger.Branch, ledger.Status);
                    }
                }
            }
        }

        //=======================================================
        // Document
        //=======================================================

        const head =
            '<th class="code">Code</th><th>Name</th>' +
            (o.showType ? '<th class="c">Type</th>' : '') +
            (o.showBranch ? '<th>Branch</th>' : '') +
            (o.showStatus ? '<th class="c">Status</th>' : '');

        const depthLabel =
            this.printDepthItems.find(item => item.value === o.depth)?.label ?? '';

        const printedAt =
            new Date().toLocaleString();

        const html =
`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Chart of Accounts</title>
<style>
    @page { size: A4 ${o.landscape ? 'landscape' : 'portrait'}; margin: 14mm 12mm 16mm;
            @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 9px Arial, sans-serif; color: #64748b; } }
    * { box-sizing: border-box; }
    body { margin: 0; font: 11px/1.4 Arial, Helvetica, sans-serif; color: #0f172a; }
    .head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 10px; }
    .company { font-size: 16px; font-weight: 700; color: #1e3a8a; }
    .title { font-size: 13px; font-weight: 700; margin-top: 2px; }
    .meta { text-align: right; font-size: 9.5px; color: #475569; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    th { background: #eef2f7; color: #334155; font-size: 9.5px; text-transform: uppercase; letter-spacing: .4px; text-align: left; padding: 6px 8px; border-bottom: 1px solid #cbd5e1; }
    td { padding: 4px 8px; border-bottom: 1px solid #eef2f7; vertical-align: top; }
    .c { text-align: center; }
    .code { width: 150px; white-space: nowrap; font-family: Consolas, monospace; font-size: 10px; }
    tr.lv1 td { background: #f1f5f9; font-weight: 700; border-top: 1px solid #cbd5e1; }
    tr.lv2 td { font-weight: 700; }
    tr.lv3 td { font-weight: 600; color: #1e293b; }
    tr.lv4 td { color: #334155; }
    .empty { padding: 24px; text-align: center; color: #64748b; }
</style>
</head>
<body>
    <div class="head">
        <div>
            <div class="company">${this.escape(PRINT_COMPANY_NAME)}</div>
            <div class="title">Chart of Accounts</div>
        </div>
        <div class="meta">
            Scope: ${this.escape(scopeText)}<br>
            Levels: ${this.escape(depthLabel)} · ${o.includeInactive ? 'Including inactive' : 'Active only'}<br>
            Printed: ${this.escape(printedAt)}
        </div>
    </div>
    <table>
        <thead><tr>${head}</tr></thead>
        <tbody>${rows.length ? rows.join('') : '<tr><td class="empty" colspan="5">Nothing to print for this selection.</td></tr>'}</tbody>
    </table>
</body>
</html>`;

        this.printOpen =
            false;

        this.cdr.detectChanges();

        this.sendToPrinter(html);
    }

    //===========================================================
    // Print Via Hidden Frame
    //===========================================================

    private sendToPrinter
    (
        html:
            string
    ):
        void
    {
        const frame =
            document.createElement('iframe');

        frame.setAttribute('aria-hidden', 'true');

        frame.style.position = 'fixed';
        frame.style.right = '0';
        frame.style.bottom = '0';
        frame.style.width = '0';
        frame.style.height = '0';
        frame.style.border = '0';

        document.body.appendChild(frame);

        const doc =
            frame.contentWindow?.document;

        if
        (
            !doc
            ||
            !frame.contentWindow
        )
        {
            frame.remove();

            this.toast.error(
                'Print Failed',
                'The browser blocked the print window.'
            );

            return;
        }

        doc.open();
        doc.write(html);
        doc.close();

        const win =
            frame.contentWindow;

        window.setTimeout(
            () =>
            {
                win.focus();

                win.print();

                window.setTimeout(
                    () =>
                        frame.remove(),
                    1000
                );
            },
            250
        );
    }

    //===========================================================
    // Escape (print HTML)
    //===========================================================

    private escape
    (
        value:
            string
    ):
        string
    {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}