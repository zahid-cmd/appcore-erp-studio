//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    ChangeDetectorRef,
    DestroyRef,
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
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import
{
    Router
}
from '@angular/router';

import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../shared/components/layout/page-canvas/page-canvas';
import { SearchDropdownComponent } from '../../../../shared/components/controls/search-dropdown/search-dropdown';
import { SearchBoxComponent } from '../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../shared/components/utilities/command-center/command-center';
import { PaginationComponent } from '../../../../shared/components/controls/pagination/pagination';
import { ToastComponent } from '../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../shared/components/utilities/toast/toast.service';

import
{
    FA_LIVE_STATUSES,
    FaAsset
}
from '../../shared/fa.models';

import
{
    FaService
}
from '../../shared/fa.service';

import
{
    FA_TAGS_PRINT_KEY,
    openFaPrint,
    saveFaTags
}
from '../../print/fa-print';


interface Choice<T>
{
    label: string;
    value: T;
}

//===============================================================
// Asset Tags (Fixed Assets > Asset Reports)
//
// QR labels to stick on the assets. A tag holds the Asset No only :
// scanning it shows the number, which finds the card on Fixed Asset
// Register.
//
// One page whatever the URL : pick the cards (or take all the ones
// shown) and print the labels, 3 across on A4.
//===============================================================

@Component(
{
    selector:'asset-tags',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        SearchDropdownComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        PaginationComponent,
        ToastComponent
    ],
    templateUrl:'./asset-tags.html',
    styleUrl:'./asset-tags.css'
})
export class AssetTagsPage
implements OnInit
{
    private readonly service = inject(FaService);

    private readonly toast = inject(ToastService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    private readonly router = inject(Router);

    loading =
        false;

    loadFailed =
        false;

    readonly listConfig:
        PageCanvasConfig =
    {
        mode:'list',
        showHeader:false,
        showFooter:true,
        reserveFooterSpace:true,
        bodyScrollable:true,
        fixedHeight:true,
        visibleRows:10,
        rowHeight:32,
        headerHeight:36,
        footerHeight:56
    };

    //===========================================================
    // The cards
    //===========================================================

    private all:
        FaAsset[] = [];

    // Every card the filters and the search leave
    private matched:
        FaAsset[] = [];

    // The cards of the page shown
    rows:
        FaAsset[] = [];

    // FaAssetId of the cards ticked
    private readonly ticked =
        new Set<number>();

    searchText =
        '';

    currentPage =
        1;

    pageSize =
        10;

    totalRecords =
        0;

    //===========================================================
    // Filters
    //===========================================================

    branchFilter =
        0;

    categoryFilter =
        0;

    locationFilter =
        0;

    // live : still in the company (In Use, Idle, Under Repair)
    statusFilter =
        'live';

    branchItems:
        Choice<number>[] = [{ label:'All Branches', value:0 }];

    categoryItems:
        Choice<number>[] = [{ label:'All Asset Groups', value:0 }];

    locationItems:
        Choice<number>[] = [{ label:'All Locations', value:0 }];

    statusItems:
        Choice<string>[] =
    [
        { label:'Assets in hand', value:'live' },
        { label:'All Statuses', value:'all' }
    ];

    get tickedCount(): number
    {
        return this.ticked.size;
    }

    // Every card shown by the filters is ticked
    get allTicked(): boolean
    {
        return this.matched.length > 0 && this.matched.every(x => this.ticked.has(x.FaAssetId));
    }

    get someTicked(): boolean
    {
        return !this.allTicked && this.matched.some(x => this.ticked.has(x.FaAssetId));
    }

    // What Print Tags will print
    get printText(): string
    {
        return this.ticked.size > 0
            ? `Print Tags prints the ${this.ticked.size.toLocaleString('en-US')} ticked`
            : `Nothing is ticked : Print Tags prints all ${this.matched.length.toLocaleString('en-US')} shown`;
    }

    get serialStart(): number
    {
        return (this.currentPage - 1) * this.pageSize;
    }

    isTicked(row: FaAsset): boolean
    {
        return this.ticked.has(row.FaAssetId);
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.load();
    }

    load():
        void
    {
        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        this.service
            .getTagAssets()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:rows =>
                {
                    this.all = Array.isArray(rows) ? rows : [];

                    // a card that is gone is no longer ticked
                    const ids = new Set(this.all.map(x => x.FaAssetId));

                    for (const id of [...this.ticked])
                    {
                        if (!ids.has(id))
                        {
                            this.ticked.delete(id);
                        }
                    }

                    this.branchItems =
                    [
                        { label:'All Branches', value:0 },
                        ...this.choices(this.all, x => x.BranchId, x => x.BranchName)
                    ];

                    this.categoryItems =
                    [
                        { label:'All Asset Groups', value:0 },
                        ...this.choices(this.all, x => x.FaCategoryId, x => x.CategoryName)
                    ];

                    const live = FA_LIVE_STATUSES;

                    const others =
                        [...new Set(this.all.map(x => x.Status).filter(x => !!x && !live.includes(x)))].sort();

                    this.statusItems =
                    [
                        { label:'Assets in hand', value:'live' },
                        { label:'All Statuses', value:'all' },
                        ...[...live, ...others].map(x => ({ label:x, value:x }))
                    ];

                    this.buildLocations();

                    this.loading = false;
                    this.apply();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.toast.error('Error', error?.error?.message ?? 'The assets could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    // The different values of a list as dropdown items, by name
    private choices(rows: FaAsset[], id: (x: FaAsset) => number, name: (x: FaAsset) => string): Choice<number>[]
    {
        return [...new Map(rows.filter(x => id(x) > 0).map(x => [id(x), name(x)])).entries()]
            .map(([value, label]) => ({ label:label || `#${value}`, value }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }

    // The locations of the branch picked (all, with no branch)
    private buildLocations():
        void
    {
        const cards =
            this.all.filter(x => !this.branchFilter || x.BranchId === this.branchFilter);

        this.locationItems =
        [
            { label:'All Locations', value:0 },
            ...this.choices(cards, x => x.FaLocationId, x => x.LocationName)
        ];

        if (!this.locationItems.some(x => x.value === this.locationFilter))
        {
            this.locationFilter = 0;
        }
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        this.matched =
            this.all.filter(x =>
                (this.statusFilter === 'all'
                    || (this.statusFilter === 'live' ? FA_LIVE_STATUSES.includes(x.Status) : x.Status === this.statusFilter))
                &&
                (!this.branchFilter || x.BranchId === this.branchFilter)
                &&
                (!this.categoryFilter || x.FaCategoryId === this.categoryFilter)
                &&
                (!this.locationFilter || x.FaLocationId === this.locationFilter)
                &&
                (!find || [x.AssetNo, x.Name, x.CategoryName, x.BranchName, x.LocationName, x.CustodianName, x.SerialNo]
                    .some(v => (v ?? '').toLowerCase().includes(find))));

        this.totalRecords = this.matched.length;

        const pages = Math.max(1, Math.ceil(this.matched.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        this.rows = this.matched.slice(this.serialStart, this.serialStart + this.pageSize);

        this.cdr.detectChanges();
    }

    //===========================================================
    // Search, filters, pages
    //===========================================================

    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';
        this.currentPage = 1;
        this.apply();
    }

    onBranchFilter(value: any):
        void
    {
        this.branchFilter = Number(value) || 0;
        this.buildLocations();
        this.currentPage = 1;
        this.apply();
    }

    onCategoryFilter(value: any):
        void
    {
        this.categoryFilter = Number(value) || 0;
        this.currentPage = 1;
        this.apply();
    }

    onLocationFilter(value: any):
        void
    {
        this.locationFilter = Number(value) || 0;
        this.currentPage = 1;
        this.apply();
    }

    onStatusFilter(value: any):
        void
    {
        this.statusFilter = String(value ?? '') || 'live';
        this.currentPage = 1;
        this.apply();
    }

    onPageChange(page: number):
        void
    {
        this.currentPage = page;
        this.apply();
    }

    onPageSizeChange(size: number):
        void
    {
        this.pageSize = size;
        this.currentPage = 1;
        this.apply();
    }

    //===========================================================
    // Ticks
    //===========================================================

    onTick(row: FaAsset, event: Event):
        void
    {
        if ((event.target as HTMLInputElement).checked)
        {
            this.ticked.add(row.FaAssetId);
        }
        else
        {
            this.ticked.delete(row.FaAssetId);
        }

        this.cdr.detectChanges();
    }

    // Ticks (or unticks) every card the filters show, on all pages
    onTickAll(event: Event):
        void
    {
        const on = (event.target as HTMLInputElement).checked;

        for (const row of this.matched)
        {
            if (on)
            {
                this.ticked.add(row.FaAssetId);
            }
            else
            {
                this.ticked.delete(row.FaAssetId);
            }
        }

        this.cdr.detectChanges();
    }

    //===========================================================
    // Print
    //===========================================================

    // The ticked cards; with none ticked, every card shown. Printed
    // through the Print Engine (Print Viewer, new tab : Print, PDF,
    // Excel), A4, 3 across and 7 down.
    printTags():
        void
    {
        const assets =
            (this.ticked.size > 0 ? this.all.filter(x => this.ticked.has(x.FaAssetId)) : this.matched)
                .filter(x => !!x.AssetNo);

        if (assets.length === 0)
        {
            this.toast.info('Asset Tags', 'There is no asset to print a tag for.');
            return;
        }

        const token =
            saveFaTags(
            {
                tags:
                    assets.map(x => ({
                        assetNo:x.AssetNo,
                        name:x.Name ?? '',
                        group:x.CategoryName ?? '',
                        branch:x.BranchName ?? ''
                    }))
            });

        const problem =
            openFaPrint(this.router, FA_TAGS_PRINT_KEY, token, 'Asset Tags');

        if (problem)
        {
            this.toast.error('Print Tags', problem);
        }
    }
}
