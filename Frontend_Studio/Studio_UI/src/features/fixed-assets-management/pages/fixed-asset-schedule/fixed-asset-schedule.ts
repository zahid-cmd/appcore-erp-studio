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
import { DatepickerComponent } from '../../../../shared/components/controls/datepicker/datepicker';
import { CommandCenterComponent } from '../../../../shared/components/utilities/command-center/command-center';
import { ToastComponent } from '../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../shared/components/utilities/toast/toast.service';
import { hrToDate, hrToText } from '../../../human-resource-manangement/services/hr-date';

import
{
    FA_REPORT_PRINT_KEY,
    openFaPrint,
    saveFaReport
}
from '../../print/fa-print';

import
{
    FaScheduleReport,
    FaScheduleReportRow,
    faDay,
    faMoney
}
from '../../shared/fa.models';

import
{
    FaService
}
from '../../shared/fa.service';


// A line of the table : a group heading, a category, the subtotal
// of a group
interface ShownRow
{
    kind: 'group' | 'row' | 'subtotal';
    // The serial of a category ('' on the other lines)
    serial: string;
    label: string;
    data: FaScheduleReportRow | null;
}

const MONEY_FIELDS:
    (keyof FaScheduleReportRow)[] =
[
    'CostOpening',
    'Additions',
    'Disposals',
    'CostClosing',
    'DepOpening',
    'Charge',
    'DepOnDisposals',
    'DepClosing',
    'NbvOpening',
    'NbvClosing'
];


//===============================================================
// Fixed Asset Schedule (Fixed Assets Management > Asset Reports)
//
// The notes-to-the-accounts table : for every category the cost,
// the depreciation and the book value, from the opening of the
// period to its closing.
//
// One page whatever the URL says. No dates : the server takes the
// financial year of today, to today, and says which dates it used.
//===============================================================

@Component(
{
    selector:'fixed-asset-schedule',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        SearchDropdownComponent,
        DatepickerComponent,
        CommandCenterComponent,
        ToastComponent
    ],
    templateUrl:'./fixed-asset-schedule.html',
    styleUrl:'./fixed-asset-schedule.css'
})
export class FixedAssetSchedulePage
implements OnInit
{
    private readonly service = inject(FaService);

    private readonly router = inject(Router);

    private readonly toast = inject(ToastService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    loading =
        false;

    loadFailed =
        false;

    readonly asDate = hrToDate;

    readonly fields = MONEY_FIELDS;

    money(value: any): string
    {
        return faMoney(Number(value) || 0);
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
    // Filters
    //===========================================================

    // yyyy-MM-dd ('' : the server decides)
    fromDate =
        '';

    toDate =
        '';

    branchId =
        0;

    branchItems:
        { label: string; value: number }[] =
    [
        { label:'All Branches', value:0 }
    ];

    //===========================================================
    // The report
    //===========================================================

    report:
        FaScheduleReport | null = null;

    shown:
        ShownRow[] = [];

    get periodText(): string
    {
        return this.report ? `${faDay(this.report.FromDate)} to ${faDay(this.report.ToDate)}` : '';
    }

    get branchText(): string
    {
        return this.report ? (this.report.BranchName || 'All Branches') : '';
    }

    get emptyText(): string
    {
        return this.loading ? 'Loading the schedule...'
            : this.loadFailed ? 'The schedule could not be loaded.'
            : 'There is no fixed asset in this period.';
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.service
            .getLookups()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:lookups =>
                {
                    this.branchItems =
                    [
                        { label:'All Branches', value:0 },
                        ...(lookups.Branches ?? []).map(x => ({ label:x.Name, value:x.Id }))
                    ];

                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.toast.error('Error', error?.error?.message ?? 'The branches could not be loaded.');
                    this.cdr.detectChanges();
                }
            });

        this.load();
    }

    load():
        void
    {
        if (this.fromDate && this.toDate && this.fromDate > this.toDate)
        {
            this.toast.error('Fixed Asset Schedule', 'The From date is after the To date.');
            return;
        }

        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        this.service
            .getScheduleReport(this.fromDate, this.toDate, this.branchId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:report =>
                {
                    this.report = report;

                    // The dates the server used
                    this.fromDate = (report.FromDate ?? '').substring(0, 10);
                    this.toDate = (report.ToDate ?? '').substring(0, 10);

                    this.shown = this.arrange(report.Rows ?? []);
                    this.loading = false;
                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.report = null;
                    this.shown = [];
                    this.loading = false;
                    this.loadFailed = true;
                    this.toast.error('Error', error?.error?.message ?? 'The schedule could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    // The categories without a group first, then every group : its
    // heading, its categories, its subtotal
    private arrange(rows: FaScheduleReportRow[]): ShownRow[]
    {
        const shown: ShownRow[] = [];

        let serial = 0;

        const category =
            (row: FaScheduleReportRow): ShownRow =>
                ({ kind:'row', serial:String(++serial), label:row.CategoryName, data:row });

        rows.filter(x => !(x.GroupName ?? '').trim()).forEach(x => shown.push(category(x)));

        const groups =
            [...new Set(rows.map(x => (x.GroupName ?? '').trim()).filter(x => !!x))];

        for (const group of groups)
        {
            const members =
                rows.filter(x => (x.GroupName ?? '').trim() === group);

            shown.push({ kind:'group', serial:'', label:group, data:null });

            members.forEach(x => shown.push(category(x)));

            shown.push({ kind:'subtotal', serial:'', label:`Total ${group}`, data:this.sum(group, members) });
        }

        return shown;
    }

    private sum(group: string, rows: FaScheduleReportRow[]): FaScheduleReportRow
    {
        const total: any =
            { GroupName:group, CategoryName:`Total ${group}` };

        for (const field of MONEY_FIELDS)
        {
            total[field] = rows.reduce((value, x) => value + (Number(x[field]) || 0), 0);
        }

        return total as FaScheduleReportRow;
    }

    //===========================================================
    // Toolbar
    //===========================================================

    onFrom(date: Date | null):
        void
    {
        this.fromDate = hrToText(date);
        this.cdr.detectChanges();
    }

    onTo(date: Date | null):
        void
    {
        this.toDate = hrToText(date);
        this.cdr.detectChanges();
    }

    onBranch(value: any):
        void
    {
        this.branchId = Number(value) || 0;
        this.load();
    }

    // The schedule as it is on screen (Print Engine)
    print():
        void
    {
        const report = this.report;

        if (!report || this.shown.length === 0)
        {
            this.toast.info('Print', 'There is nothing to print.');
            return;
        }

        const cells =
            (label: string, data: FaScheduleReportRow | null): string[] =>
                [label, ...MONEY_FIELDS.map(field => data ? faMoney(Number(data[field]) || 0) : '')];

        const token =
            saveFaReport(
            {
                title:'Fixed Asset Schedule',
                subtitle:`${this.periodText} · ${this.branchText}`,
                meta:
                [
                    { label:'From', value:faDay(report.FromDate) },
                    { label:'To', value:faDay(report.ToDate) },
                    { label:'Branch', value:this.branchText }
                ],
                band:
                [
                    { label:'Cost Closing', value:faMoney(report.Total?.CostClosing) },
                    { label:'Depreciation Closing', value:faMoney(report.Total?.DepClosing) },
                    { label:'Book Value Closing', value:faMoney(report.Total?.NbvClosing) }
                ],
                columns:
                [
                    { header:'Asset Group', kind:'text' },
                    { header:'Cost Opening', kind:'money' },
                    { header:'Additions', kind:'money' },
                    { header:'Disposals', kind:'money' },
                    { header:'Cost Closing', kind:'money', strong:true },
                    { header:'Dep Opening', kind:'money' },
                    { header:'Charge', kind:'money' },
                    { header:'Dep On Disposals', kind:'money' },
                    { header:'Dep Closing', kind:'money', strong:true },
                    { header:'Book Value Opening', kind:'money' },
                    { header:'Book Value Closing', kind:'money', strong:true }
                ],
                rows:this.shown.map(x => cells(x.kind === 'group' ? x.label.toUpperCase() : x.label, x.data)),
                footer:cells('Total', report.Total ?? null),
                note:'Additions are the assets bought in the period. Charge is the depreciation runs of the period. A branch shows the assets that are in it now.',
                landscape:true
            });

        const problem =
            openFaPrint(this.router, FA_REPORT_PRINT_KEY, token, `Fixed Asset Schedule ${this.periodText}`, true);

        if (problem)
        {
            this.toast.error('Print', problem);
        }
    }
}
