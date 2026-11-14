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
    qrSvg
}
from './qr';


interface Choice<T>
{
    label: string;
    value: T;
}

// The labels of one A4 page : 3 across, 7 down
const LABELS_PER_PAGE =
    21;

function escapeHtml(value: string | null | undefined): string
{
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const TAG_CSS = `
@page { size: A4; margin: 8mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #ffffff; color: #000000; font-family: Arial, Helvetica, sans-serif; }
.sheet { display: grid; grid-template-columns: repeat(3, 63mm); grid-auto-rows: 34mm; gap: 2mm; width: 193mm; margin: 0 auto; page-break-after: always; break-after: page; }
.sheet:last-child { page-break-after: auto; break-after: auto; }
.tag { display: flex; align-items: center; gap: 2mm; width: 63mm; height: 34mm; padding: 2mm; border: 0.2mm solid #555555; border-radius: 1.5mm; overflow: hidden; page-break-inside: avoid; break-inside: avoid; }
.tag-qr { flex: 0 0 26mm; width: 26mm; height: 26mm; }
.tag-qr svg { display: block; width: 26mm; height: 26mm; }
.tag-text { flex: 1 1 auto; min-width: 0; line-height: 1.2; }
.tag-no { font-size: 8.5pt; font-weight: 700; overflow-wrap: anywhere; }
.tag-name { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; max-height: 2.4em; margin-top: 1mm; overflow: hidden; font-size: 7pt; overflow-wrap: anywhere; }
.tag-small { margin-top: 0.8mm; overflow: hidden; font-size: 6pt; color: #333333; white-space: nowrap; text-overflow: ellipsis; }
@media screen { body { padding: 8mm 0; } }
`;


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

    private tagHtml(asset: FaAsset): string
    {
        return '<div class="tag">'
            + `<div class="tag-qr">${qrSvg(asset.AssetNo, 100)}</div>`
            + '<div class="tag-text">'
            + `<div class="tag-no">${escapeHtml(asset.AssetNo)}</div>`
            + `<div class="tag-name">${escapeHtml(asset.Name)}</div>`
            + `<div class="tag-small">${escapeHtml(asset.CategoryName)}</div>`
            + `<div class="tag-small">${escapeHtml(asset.BranchName)}</div>`
            + '</div>'
            + '</div>';
    }

    // The ticked cards; with none ticked, every card shown
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

        const sheets: string[] = [];

        for (let i = 0; i < assets.length; i += LABELS_PER_PAGE)
        {
            sheets.push(`<div class="sheet">${assets.slice(i, i + LABELS_PER_PAGE).map(x => this.tagHtml(x)).join('')}</div>`);
        }

        const html =
            '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'
            + `<title>Asset Tags (${assets.length})</title>`
            + `<style>${TAG_CSS}</style>`
            + `</head><body>${sheets.join('')}</body></html>`;

        const tab =
            window.open('', '_blank');

        if (!tab)
        {
            this.toast.error('Print Tags', 'The browser blocked the print window. Allow pop-ups for this site, then press Print Tags again.');
            return;
        }

        tab.document.open();
        tab.document.write(html);
        tab.document.close();

        // once, when the labels are on the page
        let printed = false;

        const print =
            (): void =>
            {
                if (printed || tab.closed)
                {
                    return;
                }

                printed = true;

                tab.focus();
                tab.print();
            };

        tab.onload = print;

        setTimeout(print, 600);
    }
}
