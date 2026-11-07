//===============================================================
// Enquiry Dashboard (Enquiry Profiles, read only, NO Code Sync)
//
// Sales and service enquiries at a glance for a period (enquiry
// date), a branch and an executive : six headline figures, the
// sales funnel, sources, open interest, the daily trend, top
// models, today's agenda, lost reasons and the executives.
// Follow-ups due and today's test rides / appointments are "now"
// figures (any enquiry date). A figure or an agenda line opens
// the matching list or record.
//===============================================================


//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    DestroyRef,
    OnInit,
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

import
{
    Subscription
}
from 'rxjs';

import
{
    PageHeaderComponent
}
from '../../../../../shared/components/layout/page-header/page-header';

import
{
    PageToolbarComponent
}
from '../../../../../shared/components/layout/page-toolbar/page-toolbar';

import
{
    ControlTabsComponent,
    ControlTab
}
from '../../../../../shared/components/controls/control-tabs/control-tabs';

import
{
    CommandCenterComponent
}
from '../../../../../shared/components/utilities/command-center/command-center';

import
{
    SearchDropdownComponent
}
from '../../../../../shared/components/controls/search-dropdown/search-dropdown';

import
{
    ToastService
}
from '../../../../../shared/components/utilities/toast/toast.service';

import
{
    ToastComponent
}
from '../../../../../shared/components/utilities/toast/toast';

import
{
    EnquiryDashboard,
    EnquiryDashboardAgenda,
    EnquiryDashboardCount,
    EnquiryDashboardFilter
}
from '../../models/enquiry-dashboard.model';

import
{
    EnquiryDashboardService
}
from '../../services/enquiry-dashboard.service';


//===============================================================
// Periods
//===============================================================

type PeriodId =
    'month' | 'last30' | 'year' | 'custom';

const PERIOD_TABS:
    ControlTab[] =
[
    { id:'month', label:'This Month' },
    { id:'last30', label:'Last 30 Days' },
    { id:'year', label:'This Year' },
    { id:'custom', label:'Custom' }
];

// yyyy-MM-dd of a local date
function isoDate
(
    date:
        Date
):
    string
{
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const MONTHS =
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// yyyy-MM-dd → dd-MMM-yyyy
function showDate
(
    value:
        string
):
    string
{
    const [y, m, d] =
        (value ?? '').split('-').map(Number);

    return y && m && d
        ? `${String(d).padStart(2, '0')}-${MONTHS[m - 1]}-${y}`
        : value ?? '';
}


// Routes the figures open
const ROUTES =
{
    sales:'/enquiry-management/enquiry-profiles/sales-enquiries',
    service:'/enquiry-management/enquiry-profiles/service-enquiries',
    testRides:'/enquiry-management/follow-ups-appointments/test-rides',
    appointments:'/enquiry-management/follow-ups-appointments/service-appointments'
};


// One bar (sources, interest, models, lost reasons)
type BarRow =
    EnquiryDashboardCount
    &
    {
        Percent:number;
    };

// Trend chart (SVG 640 × 160)
type TrendPoint =
{
    x:number;
    ySales:number;
    yService:number;
    label:string;
    sales:number;
    service:number;
};


@Component({
    selector:'app-enquiry-dashboard',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        ControlTabsComponent,
        CommandCenterComponent,
        SearchDropdownComponent,
        ToastComponent
    ],
    templateUrl:'./enquiry-dashboard.html',
    styleUrl:'./enquiry-dashboard.css'
})
export class EnquiryDashboardPage
    implements OnInit
{
    private readonly service =
        inject(EnquiryDashboardService);

    private readonly toast =
        inject(ToastService);

    private readonly router =
        inject(Router);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly destroyRef =
        inject(DestroyRef);

    private loadSub:
        Subscription | null =
        null;

    //===========================================================
    // Filters
    //===========================================================

    readonly periodTabs =
        PERIOD_TABS;

    period:
        PeriodId =
        'month';

    customFrom:
        string =
        '';

    customTo:
        string =
        '';

    branchId:
        number =
        0;

    executiveId:
        number =
        0;

    branchItems:
        { label:string; value:number }[] =
        [{ label:'All Branches', value:0 }];

    executiveItems:
        { label:string; value:number }[] =
        [{ label:'All Executives', value:0 }];

    //===========================================================
    // Data
    //===========================================================

    loading:
        boolean =
        false;

    failed:
        boolean =
        false;

    data:
        EnquiryDashboard | null =
        null;

    loadedAt:
        string =
        '';

    sources:
        BarRow[] =
        [];

    interest:
        BarRow[] =
        [];

    models:
        BarRow[] =
        [];

    lostReasons:
        BarRow[] =
        [];

    trend:
        TrendPoint[] =
        [];

    trendSalesPath:
        string =
        '';

    trendServicePath:
        string =
        '';

    trendMax:
        number =
        0;

    // Axis labels : first, middle, last
    trendTicks:
        TrendPoint[] =
        [];

    readonly chartWidth =
        640;

    readonly chartHeight =
        160;

    ngOnInit():
        void
    {
        const today =
            new Date();

        this.customFrom =
            isoDate(new Date(today.getFullYear(), today.getMonth(), 1));

        this.customTo =
            isoDate(today);

        this.load();
    }

    //===========================================================
    // Period
    //===========================================================

    private range():
        { From:string; To:string }
    {
        const today =
            new Date();

        switch (this.period)
        {
            case 'last30':
                return {
                    From:isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)),
                    To:isoDate(today)
                };

            case 'year':
                return {
                    From:isoDate(new Date(today.getFullYear(), 0, 1)),
                    To:isoDate(today)
                };

            case 'custom':
                return {
                    From:this.customFrom || isoDate(today),
                    To:this.customTo || isoDate(today)
                };

            default:
                return {
                    From:isoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
                    To:isoDate(today)
                };
        }
    }

    onPeriodChange
    (
        tab:
            any
    ):
        void
    {
        const id =
            (typeof tab === 'string' ? tab : tab?.id) as PeriodId;

        if
        (
            !id
            ||
            id === this.period
        )
        {
            return;
        }

        this.period =
            id;

        this.load();
    }

    onCustomFrom
    (
        value:
            string
    ):
        void
    {
        this.customFrom =
            value;

        if
        (
            value
            &&
            this.customTo
        )
        {
            this.load();
        }
    }

    onCustomTo
    (
        value:
            string
    ):
        void
    {
        this.customTo =
            value;

        if
        (
            value
            &&
            this.customFrom
        )
        {
            this.load();
        }
    }

    onBranchChange
    (
        value:
            any
    ):
        void
    {
        this.branchId =
            Number(value) || 0;

        this.load();
    }

    onExecutiveChange
    (
        value:
            any
    ):
        void
    {
        this.executiveId =
            Number(value) || 0;

        this.load();
    }

    refresh():
        void
    {
        this.load();
    }

    //===========================================================
    // Load
    //===========================================================

    load():
        void
    {
        const filter:
            EnquiryDashboardFilter =
        {
            ...this.range(),
            BranchId:this.branchId,
            ExecutiveId:this.executiveId
        };

        this.loading =
            true;

        this.failed =
            false;

        this.loadSub?.unsubscribe();

        this.loadSub =
            this.service
                .get(filter)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe
                ({
                    next:
                        data =>
                        {
                            this.apply(data);

                            this.loading =
                                false;

                            this.cdr.detectChanges();
                        },

                    error:
                        (error:any) =>
                        {
                            this.loading =
                                false;

                            this.failed =
                                true;

                            this.toast.error(
                                'Dashboard Not Loaded',
                                error?.error?.message || 'The enquiry dashboard could not be loaded.'
                            );

                            this.cdr.detectChanges();
                        }
                });
    }

    private bars
    (
        rows:
            EnquiryDashboardCount[]
    ):
        BarRow[]
    {
        const max =
            Math.max(1, ...rows.map(x => x.Count));

        return rows.map(x => ({ ...x, Percent:Math.max(2, Math.round(x.Count * 100 / max)) }));
    }

    private apply
    (
        data:
            EnquiryDashboard
    ):
        void
    {
        this.data =
            data;

        this.loadedAt =
            new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

        this.branchItems =
        [
            { label:'All Branches', value:0 },
            ...data.Branches.map(x => ({ label:x.Name, value:x.Id }))
        ];

        this.executiveItems =
        [
            { label:'All Executives', value:0 },
            ...data.ExecutiveOptions.map(x => ({ label:x.Name, value:x.Id }))
        ];

        this.sources =
            this.bars(data.Sources);

        this.interest =
            this.bars(data.Interest);

        this.models =
            this.bars(data.Models);

        this.lostReasons =
            this.bars(data.LostReasons);

        this.buildTrend(data);
    }

    //===========================================================
    // Trend chart
    //===========================================================

    private buildTrend
    (
        data:
            EnquiryDashboard
    ):
        void
    {
        const points =
            data.Trend;

        const max =
            Math.max(1, ...points.map(x => Math.max(x.Sales, x.Service)));

        const left = 8;
        const right = this.chartWidth - 8;
        const top = 10;
        const bottom = this.chartHeight - 10;

        const step =
            points.length > 1
                ? (right - left) / (points.length - 1)
                : 0;

        const y =
            (value: number) =>
                Math.round((bottom - (value / max) * (bottom - top)) * 10) / 10;

        this.trendMax =
            max;

        this.trend =
            points.map
            (
                (p, i) =>
                ({
                    x:Math.round((points.length > 1 ? left + i * step : (left + right) / 2) * 10) / 10,
                    ySales:y(p.Sales),
                    yService:y(p.Service),
                    label:p.Label,
                    sales:p.Sales,
                    service:p.Service
                })
            );

        this.trendSalesPath =
            this.trend.map(p => `${p.x},${p.ySales}`).join(' ');

        this.trendServicePath =
            this.trend.map(p => `${p.x},${p.yService}`).join(' ');

        const n =
            this.trend.length;

        this.trendTicks =
            n === 0
                ? []
                : n <= 2
                    ? this.trend
                    : [this.trend[0], this.trend[Math.floor((n - 1) / 2)], this.trend[n - 1]];
    }

    //===========================================================
    // Display
    //===========================================================

    get periodText():
        string
    {
        return this.data
            ? `${showDate(this.data.From)} – ${showDate(this.data.To)}`
            : '';
    }

    get branchText():
        string
    {
        return this.branchItems.find(x => x.value === this.branchId)?.label ?? 'All Branches';
    }

    get executiveText():
        string
    {
        return this.executiveItems.find(x => x.value === this.executiveId)?.label ?? 'All Executives';
    }

    rate
    (
        value:
            number | null
    ):
        string
    {
        return value === null
            ? '–'
            : `${Math.round(value)}%`;
    }

    funnelPercent
    (
        value:
            number
    ):
        number
    {
        const total =
            this.data?.SalesTotal ?? 0;

        return total > 0
            ? Math.max(value > 0 ? 3 : 0, Math.round(value * 100 / total))
            : 0;
    }

    agendaIcon
    (
        line:
            EnquiryDashboardAgenda
    ):
        string
    {
        switch (line.Kind)
        {
            case 'SalesFollowUp':
                return 'fas fa-phone';

            case 'ServiceFollowUp':
                return 'fas fa-headset';

            case 'TestRide':
                return 'fas fa-motorcycle';

            default:
                return 'fas fa-screwdriver-wrench';
        }
    }

    //===========================================================
    // Open
    //===========================================================

    open
    (
        target:
            keyof typeof ROUTES
    ):
        void
    {
        this.router.navigate([ROUTES[target], 'list']);
    }

    openAgenda
    (
        line:
            EnquiryDashboardAgenda
    ):
        void
    {
        if
        (
            !line.PublicId
        )
        {
            return;
        }

        const base =
            line.Kind === 'SalesFollowUp'
                ? ROUTES.sales
                : line.Kind === 'ServiceFollowUp'
                    ? ROUTES.service
                    : line.Kind === 'TestRide'
                        ? ROUTES.testRides
                        : ROUTES.appointments;

        this.router.navigate([base, 'view', line.PublicId]);
    }

    trackByIndex
    (
        index:
            number
    ):
        number
    {
        return index;
    }
}
