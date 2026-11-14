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
    ActivatedRoute,
    Router
}
from '@angular/router';

import
{
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../shared/components/layout/page-canvas/page-canvas';
import { SearchDropdownComponent } from '../../../../shared/components/controls/search-dropdown/search-dropdown';
import { CommandCenterComponent } from '../../../../shared/components/utilities/command-center/command-center';
import { ToastComponent } from '../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../shared/components/utilities/toast/toast.service';

import
{
    FA_REPORT_PRINT_KEY,
    openFaPrint,
    saveFaReport
}
from '../../print/fa-print';

import
{
    FaAsset,
    FaSchedule,
    FaScheduleRow,
    faDay,
    faMoney,
    faRuleText
}
from '../../shared/fa.models';

import
{
    FaService
}
from '../../shared/fa.service';


type Choice =
    { label: string; value: number };


//===============================================================
// Depreciation Schedule (Fixed Assets Management > Depreciation)
//
// Read only : one asset, month by month. The months of the posted
// runs, then the months still to come until the asset is fully
// depreciated.
//
// One page whatever the URL says; view/:id opens that asset.
//===============================================================

@Component(
{
    selector:'depreciation-schedule',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        SearchDropdownComponent,
        CommandCenterComponent,
        ToastComponent
    ],
    templateUrl:'./depreciation-schedule.html',
    styleUrl:'./depreciation-schedule.css'
})
export class DepreciationSchedulePage
implements OnInit
{
    private readonly service = inject(FaService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    loading =
        false;

    loadFailed =
        false;

    money(value: number): string
    {
        return faMoney(value);
    }

    day(value: string): string
    {
        return faDay(value);
    }

    readonly canvasConfig:
        PageCanvasConfig =
    {
        mode:'list',
        showHeader:false,
        showFooter:false,
        reserveFooterSpace:false,
        bodyScrollable:true,
        fixedHeight:true
    };

    //===========================================================
    // The asset to show
    //===========================================================

    private assets:
        FaAsset[] = [];

    assetItems:
        { label: string; value: string }[] = [];

    assetId =
        '';

    branchFilter =
        0;

    branchFilterItems:
        Choice[] =
    [
        { label:'All Branches', value:0 }
    ];

    categoryFilter =
        0;

    categoryFilterItems:
        Choice[] =
    [
        { label:'All Asset Groups', value:0 }
    ];

    //===========================================================
    // The schedule
    //===========================================================

    schedule:
        FaSchedule | null = null;

    get asset(): FaAsset | null
    {
        return this.schedule?.Asset ?? null;
    }

    get rows(): FaScheduleRow[]
    {
        return this.schedule?.Rows ?? [];
    }

    get ruleText(): string
    {
        const asset = this.asset;

        return asset ? faRuleText(asset.Method, asset.RatePercent, asset.LifeYears) : '';
    }

    get postedTotal(): number
    {
        return this.rows.filter(x => x.Posted).reduce((sum, x) => sum + (Number(x.Charge) || 0), 0);
    }

    get comingTotal(): number
    {
        return this.rows.filter(x => !x.Posted).reduce((sum, x) => sum + (Number(x.Charge) || 0), 0);
    }

    get emptyText(): string
    {
        return this.loading ? 'Loading the schedule...'
            : this.loadFailed ? 'The schedule could not be loaded.'
            : !this.assetId ? 'Pick an asset above to see its depreciation month by month.'
            : 'This asset has no month to show.';
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        // view/:id (or edit/:id) : the asset to open
        this.assetId =
            this.route.snapshot.paramMap.get('id') ?? '';

        this.loadAssets();

        if (this.assetId)
        {
            this.loadSchedule();
        }
    }

    private loadAssets():
        void
    {
        this.service
            .getScheduleAssets()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:assets =>
                {
                    this.assets = assets ?? [];

                    this.branchFilterItems =
                    [
                        { label:'All Branches', value:0 },
                        ...this.choices(x => [x.BranchId, x.BranchName])
                    ];

                    this.categoryFilterItems =
                    [
                        { label:'All Asset Groups', value:0 },
                        ...this.choices(x => [x.FaCategoryId, x.CategoryName])
                    ];

                    this.applyFilters();
                },
                error:error =>
                {
                    this.toast.error('Error', error?.error?.message ?? 'The assets could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    // The branches / the categories of the assets, by name
    private choices(pick: (asset: FaAsset) => [number, string]): Choice[]
    {
        return [...new Map(this.assets.map(pick)).entries()]
            .filter(([value]) => !!value)
            .map(([value, label]) => ({ label:label || `#${value}`, value }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }

    // The assets the two filters leave (the one on screen stays)
    private applyFilters():
        void
    {
        const shown =
            this.assets.filter(x =>
                (!this.branchFilter || x.BranchId === this.branchFilter)
                &&
                (!this.categoryFilter || x.FaCategoryId === this.categoryFilter));

        const current =
            this.asset && this.asset.PublicId === this.assetId ? this.asset : null;

        if (current && !shown.some(x => x.PublicId === current.PublicId))
        {
            shown.unshift(current);
        }

        this.assetItems =
            shown.map(x => ({ label:`${x.AssetNo}  ${x.Name}`, value:x.PublicId }));

        this.cdr.detectChanges();
    }

    private loadSchedule():
        void
    {
        const id = this.assetId;

        this.schedule = null;

        if (!id)
        {
            this.loading = false;
            this.loadFailed = false;
            this.applyFilters();
            return;
        }

        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        this.service
            .getSchedule(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:schedule =>
                {
                    // An answer for an asset that is no longer picked
                    if (this.assetId !== id)
                    {
                        return;
                    }

                    this.schedule = schedule;
                    this.loading = false;
                    this.applyFilters();
                },
                error:error =>
                {
                    if (this.assetId !== id)
                    {
                        return;
                    }

                    this.loading = false;
                    this.loadFailed = true;
                    this.toast.error('Error', error?.error?.message ?? 'The schedule could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Toolbar
    //===========================================================

    onAsset(value: any):
        void
    {
        const id = String(value ?? '');

        if (id === this.assetId)
        {
            return;
        }

        this.assetId = id;
        this.loadSchedule();
    }

    onBranchFilter(value: any):
        void
    {
        this.branchFilter = Number(value) || 0;
        this.applyFilters();
    }

    onCategoryFilter(value: any):
        void
    {
        this.categoryFilter = Number(value) || 0;
        this.applyFilters();
    }

    refresh():
        void
    {
        this.loadAssets();
        this.loadSchedule();
    }

    // The schedule of the asset (Print Engine)
    print():
        void
    {
        const asset = this.asset;

        const schedule = this.schedule;

        if (!asset || !schedule)
        {
            this.toast.info('Print', 'Pick an asset first.');
            return;
        }

        const rows = schedule.Rows ?? [];

        const token =
            saveFaReport(
            {
                title:'Depreciation Schedule',
                subtitle:`${asset.AssetNo} · ${asset.Name}`,
                meta:
                [
                    { label:'Asset Group', value:asset.CategoryName },
                    { label:'Branch', value:asset.BranchName },
                    { label:'Status', value:asset.Status },
                    { label:'Put to use', value:faDay(asset.UseDate) },
                    { label:'Rule', value:this.ruleText },
                    { label:'Ends in', value:schedule.EndsText }
                ].filter(x => !!x.value),
                band:
                [
                    { label:'Cost', value:faMoney(asset.TotalCost) },
                    { label:'Residual Value', value:faMoney(asset.ResidualValue) },
                    { label:'Depreciation so far', value:faMoney(asset.AccumulatedDepreciation) },
                    { label:'Book Value', value:faMoney(asset.BookValue) },
                    { label:'Months Left', value:String(schedule.MonthsLeft ?? 0) }
                ],
                columns:
                [
                    { header:'Month', kind:'text' },
                    { header:'Depreciation Before', kind:'money' },
                    { header:'Charge', kind:'money', strong:true },
                    { header:'Depreciation After', kind:'money' },
                    { header:'Book Value', kind:'money' },
                    { header:'Status', kind:'center' }
                ],
                rows:rows.map(x =>
                [
                    x.PeriodText,
                    faMoney(x.Opening),
                    faMoney(x.Charge),
                    faMoney(x.Closing),
                    faMoney(x.BookValue),
                    x.Posted ? 'Posted' : 'To come'
                ]),
                footer:[`Total (${rows.length} months)`, '', faMoney(this.postedTotal + this.comingTotal), '', '', ''],
                note:`Posted : ${faMoney(this.postedTotal)}. To come : ${faMoney(this.comingTotal)}. The months to come are an estimate : they change when the asset is improved, moved or disposed of.`
            });

        const problem =
            openFaPrint(this.router, FA_REPORT_PRINT_KEY, token, `Depreciation Schedule ${asset.AssetNo}`, false);

        if (problem)
        {
            this.toast.error('Print', problem);
        }
    }
}
