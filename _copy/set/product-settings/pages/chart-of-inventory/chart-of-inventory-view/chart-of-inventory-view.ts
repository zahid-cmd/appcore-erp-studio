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
    CoiLevel,
    CoiTypeNode,
    CoiCategoryNode,
    CoiSubCategoryNode,
    CoiProductRow,
    CoiIssue,
    CoiPrintOptions,
    CoiPrintDepth
}
from '../../../models/chart-of-inventory.model';

import
{
    ChartOfInventoryService
}
from '../../../services/chart-of-inventory.service';

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
    'appcore.chart-of-inventory.selection';

// Remembers which navigator branches are open (per browser, optional).
const EXPANDED_STORAGE_KEY:
    string =
    'appcore.chart-of-inventory.expanded';

// Coming back to the page / browser tab reloads the chart, but
// not more often than this (milliseconds).
const AUTO_RELOAD_MIN_GAP_MS:
    number =
    5000;

//===============================================================
// View Types
//===============================================================

interface CoiSelection
{
    level:
        CoiLevel;

    id:
        number;
}

interface NavSubCategory
{
    node:
        CoiSubCategoryNode;

    products:
        number;
}

interface NavCategory
{
    node:
        CoiCategoryNode;

    subCategories:
        NavSubCategory[];

    products:
        number;
}

interface NavType
{
    node:
        CoiTypeNode;

    categories:
        NavCategory[];

    subCategoryCount:
        number;

    products:
        number;
}

interface PathStep
{
    level:
        CoiLevel | null;

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

    // "n products" placeholder line (product names load at print time)
    summary:
        boolean;

    // printed rows this line stands for
    rows:
        number;
}

interface PreviewRow
{
    level:
        CoiLevel | 'product' | 'issue';

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
    selector:'chart-of-inventory-view',

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

    templateUrl:'./chart-of-inventory-view.html',

    styleUrl:'./chart-of-inventory-view.css'
})

//===============================================================
// Chart of Inventory View
//
// Read-only. Left : navigator tree (Type → Category → Sub Category).
// Right : the direct children of the selected node only.
// Print : full chart or customized.
//
// Independent of the product setting pages: it only reads the
// live tables, and reloads by itself when the user comes back to
// the page or the browser tab, so changes made elsewhere (new
// products, renamed categories, moved / deleted items) show up without
// pressing Refresh. Broken links are listed under "Link Issues".
//===============================================================

export class ChartOfInventoryView
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly chartOfInventoryService =
        inject(ChartOfInventoryService);

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
            label:'Chart of Inventory'
        }
    ];

    selectedTab:
        string =
        'chart';

    //===========================================================
    // Data
    //===========================================================

    private types:
        CoiTypeNode[] =
        [];

    private readonly productCache:
        Map<number, CoiProductRow[]> =
        new Map<number, CoiProductRow[]>();

    loading:
        boolean =
        false;

    loadFailed:
        boolean =
        false;

    productsLoading:
        boolean =
        false;

    //===========================================================
    // Link Issues (from the server's link check)
    //===========================================================

    issues:
        CoiIssue[] =
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
        CoiSelection | null =
        null;

    allExpanded:
        boolean =
        false;

    //===========================================================
    // View Model (rebuilt by refreshView)
    //===========================================================

    navTypes:
        NavType[] =
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

    countTypes:
        number =
        0;

    countCategories:
        number =
        0;

    countSubCategories:
        number =
        0;

    countProducts:
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
        CoiPrintOptions =
        this.defaultPrintOptions();

    printDepthItems:
        { value: CoiPrintDepth; label: string; short: string }[] =
    [
        { value:'type', label:'Category Types only', short:'Types' },
        { value:'category', label:'Up to Categories', short:'Categories' },
        { value:'subcategory', label:'Up to Sub Categories', short:'Sub Categories' },
        { value:'product', label:'Up to Products (full)', short:'Products' }
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

        this.chartOfInventoryService
            .getTree()
            .subscribe
            ({
                next:
                (
                    response:
                        CoiTypeNode[]
                ):
                    void =>
                {
                    try
                    {
                        this.types =
                            response ?? [];

                        this.loadFailed =
                            false;

                        // Products are re-read too (they may have changed)
                        this.productCache.clear();

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
                            'Build Chart of Inventory Error:',
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

                    this.ensureProducts();

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
                        'Load Chart of Inventory Error:',
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

                    this.types =
                        [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.refreshView();

                    this.toast.error(
                        'Load Failed',
                        'Unable to load the chart of inventory.'
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
        this.chartOfInventoryService
            .getIssues()
            .subscribe
            ({
                next:
                (
                    rows:
                        CoiIssue[]
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
                        'Load Chart of Inventory Issues Error:',
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

    private productCountOf
    (
        subCategory:
            CoiSubCategoryNode
    ):
        number
    {
        if
        (
            this.selectedStatus === true
        )
        {
            return subCategory.ActiveProductCount;
        }

        if
        (
            this.selectedStatus === false
        )
        {
            return Math.max(
                0,
                subCategory.ProductCount - subCategory.ActiveProductCount
            );
        }

        return subCategory.ProductCount;
    }

    //===========================================================
    // Keys
    //===========================================================

    typeKey(id: number): string { return `c:${id}`; }

    categoryKey(id: number): string { return `g:${id}`; }

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
            CoiLevel,
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
            NavType[] =
            [];

        for
        (
            const cls
            of this.types
        )
        {
            if
            (
                !this.statusMatches(cls.Status)
            )
            {
                continue;
            }

            const typeHit =
                hit(cls.Code, cls.Name);

            const categories:
                NavCategory[] =
                [];

            for
            (
                const grp
                of cls.Categories
            )
            {
                if
                (
                    !this.statusMatches(grp.Status)
                )
                {
                    continue;
                }

                const categoryHit =
                    typeHit
                    ||
                    hit(grp.Code, grp.Name);

                const subCategories:
                    NavSubCategory[] =
                    grp.SubCategories
                        .filter
                        (
                            sub =>
                                this.statusMatches(sub.Status)
                                &&
                                (
                                    categoryHit
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

                                products:
                                    this.productCountOf(sub)
                            })
                        );

                if
                (
                    !categoryHit
                    &&
                    subCategories.length === 0
                )
                {
                    continue;
                }

                // While searching, open the branches that match
                if
                (
                    keyword
                    &&
                    subCategories.length > 0
                    &&
                    !categoryHit
                )
                {
                    this.expanded.add(this.categoryKey(grp.Id));
                    this.expanded.add(this.typeKey(cls.Id));
                }

                categories.push
                ({
                    node:
                        grp,

                    subCategories,

                    products:
                        subCategories.reduce
                        (
                            (sum, sub) =>
                                sum + sub.products,
                            0
                        )
                });
            }

            if
            (
                !typeHit
                &&
                categories.length === 0
            )
            {
                continue;
            }

            if
            (
                keyword
                &&
                categories.length > 0
                &&
                !typeHit
            )
            {
                this.expanded.add(this.typeKey(cls.Id));
            }

            result.push
            ({
                node:
                    cls,

                categories,

                subCategoryCount:
                    categories.reduce
                    (
                        (sum, grp) =>
                            sum + grp.subCategories.length,
                        0
                    ),

                products:
                    categories.reduce
                    (
                        (sum, grp) =>
                            sum + grp.products,
                        0
                    )
            });
        }

        this.navTypes =
            result;
    }

    //===========================================================
    // Find Node (in the full, unfiltered tree)
    //===========================================================

    private findNode
    (
        selection:
            CoiSelection
    ):
        { cls: CoiTypeNode; grp?: CoiCategoryNode; sub?: CoiSubCategoryNode } | null
    {
        for
        (
            const cls
            of this.types
        )
        {
            if
            (
                selection.level === 'type'
                &&
                cls.Id === selection.id
            )
            {
                return { cls };
            }

            for
            (
                const grp
                of cls.Categories
            )
            {
                if
                (
                    selection.level === 'category'
                    &&
                    grp.Id === selection.id
                )
                {
                    return { cls, grp };
                }

                for
                (
                    const sub
                    of grp.SubCategories
                )
                {
                    if
                    (
                        selection.level === 'subcategory'
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
            CoiSelection
    ):
        { cls: NavType; grp?: NavCategory; sub?: NavSubCategory } | null
    {
        for
        (
            const cls
            of this.navTypes
        )
        {
            if
            (
                selection.level === 'type'
                &&
                cls.node.Id === selection.id
            )
            {
                return { cls };
            }

            for
            (
                const grp
                of cls.categories
            )
            {
                if
                (
                    selection.level === 'category'
                    &&
                    grp.node.Id === selection.id
                )
                {
                    return { cls, grp };
                }

                for
                (
                    const sub
                    of grp.subCategories
                )
                {
                    if
                    (
                        selection.level === 'subcategory'
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
            CoiSelection
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

        this.expanded.add(this.typeKey(found.cls.Id));

        if
        (
            found.grp
        )
        {
            this.expanded.add(this.categoryKey(found.grp.Id));
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
                'Chart of Inventory View Error:',
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
            this.countTypes = 1;
            this.countCategories = 1;
            this.countSubCategories = 1;
            this.countProducts = found.sub.products;
        }
        else if
        (
            found?.grp
        )
        {
            this.countTypes = 1;
            this.countCategories = 1;
            this.countSubCategories = found.grp.subCategories.length;
            this.countProducts = found.grp.products;
        }
        else if
        (
            found
        )
        {
            this.countTypes = 1;
            this.countCategories = found.cls.categories.length;
            this.countSubCategories = found.cls.subCategoryCount;
            this.countProducts = found.cls.products;
        }
        else
        {
            this.countTypes =
                this.navTypes.length;

            this.countCategories =
                this.navTypes.reduce
                (
                    (sum, cls) =>
                        sum + cls.categories.length,
                    0
                );

            this.countSubCategories =
                this.navTypes.reduce
                (
                    (sum, cls) =>
                        sum + cls.subCategoryCount,
                    0
                );

            this.countProducts =
                this.navTypes.reduce
                (
                    (sum, cls) =>
                        sum + cls.products,
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
                label:'All Category Types'
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
            steps.push({ level:'type', id:found.cls.Id, label:found.cls.Name });

            if
            (
                found.grp
            )
            {
                steps.push({ level:'category', id:found.grp.Id, label:found.grp.Name });
            }

            if
            (
                found.sub
            )
            {
                steps.push({ level:'subcategory', id:found.sub.Id, label:found.sub.Name });
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
        // Sub Category → Products
        //=======================================================

        else if
        (
            found?.sub
        )
        {
            const sub =
                found.sub.node;

            const products =
                (this.productCache.get(sub.Id) ?? [])
                    .filter
                    (
                        product =>
                            this.statusMatches(product.Status)
                    );

            this.previewTitle =
                'Products';

            this.previewIcon =
                'fas fa-box';

            this.previewColumns =
            [
                { key:'code', label:'Code', align:'left', width:'210px' },
                { key:'name', label:'Product', align:'left' },
                { key:'type', label:'Unit', align:'center', width:'110px' },
                { key:'branch', label:'Inventory Ledger', align:'left', width:'200px' },
                { key:'status', label:'Status', align:'center', width:'110px' }
            ];

            this.previewRows =
                products
                    .map
                    (
                        product =>
                        ({
                            level:'product' as const,
                            id:product.Id,
                            code:product.Code,
                            name:product.Name,
                            status:product.Status,
                            drillable:false,
                            cells:
                            {
                                type:product.Unit,
                                branch:product.InventoryLedger || '—'
                            }
                        })
                    )
                    .filter(keep);

            this.previewEmptyText =
                this.productsLoading
                    ? 'Loading products…'
                    : keyword
                        ? 'No product matches the filter.'
                        : `No products in ${sub.Name}.`;
        }

        //=======================================================
        // Category → Sub Categories
        //=======================================================

        else if
        (
            found?.grp
        )
        {
            const grp =
                found.grp;

            this.previewTitle =
                'Sub Categories';

            this.previewIcon =
                'fas fa-folder-open';

            this.previewColumns =
            [
                { key:'code', label:'Code', align:'left', width:'210px' },
                { key:'name', label:'Sub Category', align:'left' },
                { key:'products', label:'Products', align:'center', width:'120px' },
                { key:'status', label:'Status', align:'center', width:'110px' }
            ];

            this.previewRows =
                grp.subCategories
                    .map
                    (
                        sub =>
                        ({
                            level:'subcategory' as const,
                            id:sub.node.Id,
                            code:sub.node.Code,
                            name:sub.node.Name,
                            status:sub.node.Status,
                            drillable:true,
                            cells:
                            {
                                products:sub.products
                            }
                        })
                    )
                    .filter(keep);

            this.previewEmptyText =
                keyword
                    ? 'No sub category matches the filter.'
                    : `No sub categories in ${grp.node.Name}.`;
        }

        //=======================================================
        // Type → Categories
        //=======================================================

        else if
        (
            found
        )
        {
            const cls =
                found.cls;

            this.previewTitle =
                'Categories';

            this.previewIcon =
                'fas fa-folder-tree';

            this.previewColumns =
            [
                { key:'code', label:'Code', align:'left', width:'210px' },
                { key:'name', label:'Category', align:'left' },
                { key:'subCategories', label:'Sub Categories', align:'center', width:'120px' },
                { key:'products', label:'Products', align:'center', width:'120px' },
                { key:'status', label:'Status', align:'center', width:'110px' }
            ];

            this.previewRows =
                cls.categories
                    .map
                    (
                        grp =>
                        ({
                            level:'category' as const,
                            id:grp.node.Id,
                            code:grp.node.Code,
                            name:grp.node.Name,
                            status:grp.node.Status,
                            drillable:true,
                            cells:
                            {
                                subCategories:grp.subCategories.length,
                                products:grp.products
                            }
                        })
                    )
                    .filter(keep);

            this.previewEmptyText =
                keyword
                    ? 'No category matches the filter.'
                    : `No categories in ${cls.node.Name}.`;
        }

        //=======================================================
        // Nothing → Types
        //=======================================================

        else
        {
            this.previewTitle =
                'Category Types';

            this.previewIcon =
                'fas fa-layer-group';

            this.previewColumns =
            [
                { key:'code', label:'Code', align:'left', width:'210px' },
                { key:'name', label:'Category Type', align:'left' },
                { key:'categories', label:'Categories', align:'center', width:'110px' },
                { key:'subCategories', label:'Sub Categories', align:'center', width:'120px' },
                { key:'products', label:'Products', align:'center', width:'110px' },
                { key:'status', label:'Status', align:'center', width:'110px' }
            ];

            this.previewRows =
                this.navTypes
                    .map
                    (
                        cls =>
                        ({
                            level:'type' as const,
                            id:cls.node.Id,
                            code:cls.node.Code,
                            name:cls.node.Name,
                            status:cls.node.Status,
                            drillable:true,
                            cells:
                            {
                                categories:cls.categories.length,
                                subCategories:cls.subCategoryCount,
                                products:cls.products
                            }
                        })
                    )
                    .filter(keep);

            this.previewEmptyText =
                keyword
                    ? 'No category type matches the filter.'
                    : 'No category types found.';
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
            CoiLevel,
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

        // Opening a category type / category also expands it in the tree
        if
        (
            level === 'type'
        )
        {
            this.expanded.add(this.typeKey(id));
        }

        if
        (
            level === 'category'
        )
        {
            this.expanded.add(this.categoryKey(id));
        }

        this.storeSelection();

        this.refreshView();

        this.ensureProducts();
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
            row.level === 'product'
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
                of this.types
            )
            {
                this.expanded.add(this.typeKey(cls.Id));

                for
                (
                    const grp
                    of cls.Categories
                )
                {
                    this.expanded.add(this.categoryKey(grp.Id));
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
            of this.navTypes
        )
        {
            if
            (
                cls.categories.length
            )
            {
                keys.push(this.typeKey(cls.node.Id));
            }

            for
            (
                const grp
                of cls.categories
            )
            {
                if
                (
                    grp.subCategories.length
                )
                {
                    keys.push(this.categoryKey(grp.node.Id));
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
    // Load Products For The Selected Sub Category
    //===========================================================

    private ensureProducts():
        void
    {
        if
        (
            this.selection?.level !== 'subcategory'
        )
        {
            return;
        }

        const subCategoryId =
            this.selection.id;

        if
        (
            this.productCache.has(subCategoryId)
        )
        {
            return;
        }

        this.productsLoading =
            true;

        this.refreshView();

        this.chartOfInventoryService
            .getSubCategoryProducts(
                subCategoryId
            )
            .subscribe
            ({
                next:
                (
                    rows:
                        CoiProductRow[]
                ):
                    void =>
                {
                    this.productCache.set(
                        subCategoryId,
                        rows ?? []
                    );

                    this.productsLoading =
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
                        'Load Products Error:',
                        error
                    );

                    this.productsLoading =
                        false;

                    this.refreshView();

                    this.toast.error(
                        'Load Failed',
                        'Unable to load products for this sub category.'
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
        CoiSelection | null
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
                ['type', 'category', 'subcategory'].includes(parsed?.level)
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
        CoiPrintOptions
    {
        return {
            scope:'all',
            depth:'product',
            includeInactive:false,
            showUnit:true,
            showLedger:true,
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
            this.types.length === 0
        )
        {
            this.toast.info(
                'Nothing to Print',
                'The chart of inventory is empty.'
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
            CoiPrintDepth
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
            'showUnit' | 'showLedger' | 'showStatus'
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
    // printout. Product names are fetched only when printing, so
    // the preview shows one "n products" line per sub category.
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
            CoiPrintDepth[] =
            ['type', 'category', 'subcategory', 'product'];

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

        const types =
            found
                ? [found.cls]
                : this.types;

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
            of types
        )
        {
            if
            (
                !include(cls.Status)
            )
            {
                continue;
            }

            add({ level:1, code:cls.Code, name:cls.Name, type:'', status:cls.Status, summary:false, rows:1 });

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
                of cls.Categories
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

                add({ level:2, code:grp.Code, name:grp.Name, type:'', status:grp.Status, summary:false, rows:1 });

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
                    of grp.SubCategories
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

                    add({ level:3, code:sub.Code, name:sub.Name, type:'', status:sub.Status, summary:false, rows:1 });

                    if
                    (
                        maxDepth < 4
                    )
                    {
                        continue;
                    }

                    const products =
                        o.includeInactive
                            ? sub.ProductCount
                            : sub.ActiveProductCount;

                    if
                    (
                        products > 0
                    )
                    {
                        add(
                            {
                                level:4,
                                code:'',
                                name:`${products} ${products === 1 ? 'product' : 'products'}`,
                                type:'',
                                status:true,
                                summary:true,
                                rows:products
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
            this.printOptions.depth !== 'product'
        )
        {
            this.writePrint(new Map<number, CoiProductRow[]>());

            return;
        }

        this.printing =
            true;

        this.cdr.detectChanges();

        this.chartOfInventoryService
            .getAllProducts()
            .subscribe
            ({
                next:
                (
                    rows:
                        CoiProductRow[]
                ):
                    void =>
                {
                    const bySubCategory =
                        new Map<number, CoiProductRow[]>();

                    for
                    (
                        const row
                        of rows ?? []
                    )
                    {
                        const list =
                            bySubCategory.get(row.SubCategoryId) ?? [];

                        list.push(row);

                        bySubCategory.set(row.SubCategoryId, list);
                    }

                    this.printing =
                        false;

                    this.writePrint(bySubCategory);
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Print Products Error:',
                        error
                    );

                    this.printing =
                        false;

                    this.cdr.detectChanges();

                    this.toast.error(
                        'Print Failed',
                        'Unable to load products for printing.'
                    );
                }
            });
    }

    //===========================================================
    // Print : Build & Send To Browser Print
    //===========================================================

    private writePrint
    (
        products:
            Map<number, CoiProductRow[]>
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
            Record<CoiPrintDepth, number> =
            { type:1, category:2, subcategory:3, product:4 };

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

        const types =
            found
                ? [found.cls]
                : this.types;

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
                invLedger:
                    string,
                status:
                    boolean
            ):
                string =>
                (o.showUnit ? cell(type, 'c') : '')
                +
                (o.showLedger ? cell(invLedger, '') : '')
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
                invLedger:
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
                    extraCells(type, invLedger, status) +
                    `</tr>`
                );
            };

        for
        (
            const cls
            of types
        )
        {
            if
            (
                !include(cls.Status)
            )
            {
                continue;
            }

            row(1, cls.Code, cls.Name, '', '', cls.Status);

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
                of cls.Categories
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

                row(2, grp.Code, grp.Name, '', '', grp.Status);

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
                    of grp.SubCategories
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

                    row(3, sub.Code, sub.Name, '', '', sub.Status);

                    if
                    (
                        maxDepth < 4
                    )
                    {
                        continue;
                    }

                    for
                    (
                        const product
                        of products.get(sub.Id) ?? []
                    )
                    {
                        if
                        (
                            !include(product.Status)
                        )
                        {
                            continue;
                        }

                        row(4, product.Code, product.Name, product.Unit, product.InventoryLedger, product.Status);
                    }
                }
            }
        }

        //=======================================================
        // Document
        //=======================================================

        const head =
            '<th class="code">Code</th><th>Name</th>' +
            (o.showUnit ? '<th class="c">Unit</th>' : '') +
            (o.showLedger ? '<th>Inventory Ledger</th>' : '') +
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
<title>Chart of Inventory</title>
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
    thead { display: table-header-category; }
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
            <div class="title">Chart of Inventory</div>
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