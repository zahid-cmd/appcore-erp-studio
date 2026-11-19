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
import { SearchBoxComponent } from '../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../shared/components/utilities/command-center/command-center';
import { ListTableColumn, ListTableComponent } from '../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../shared/components/controls/pagination/pagination';
import { ToastComponent } from '../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../shared/components/utilities/toast/toast.service';
import { hrToDate, hrToText } from '../../../human-resource-manangement/services/hr-date';

import { WsService } from '../../shared/ws.service';
import { openWorkInProgressPrint } from '../../print/work-in-progress.print';

import
{
    WsReport,
    wsDay
}
from '../../shared/ws.models';


//===============================================================
// Model
//===============================================================

interface Option
{
    label: string;
    value: any;
}

interface Words
{
    title: string;
    subtitle: string;
    icon: string;
    search: string;
    empty: string;
    // as of now : the report takes no period
    asOf?: boolean;
    // it has a paper (Print Engine)
    print?: boolean;
}

// What differs between the five reports (the address says which)
const REPORTS:
    Record<string, Words> =
{
    'service-history':
    {
        title:'Service History',
        subtitle:'What was done to a bike or for a customer',
        icon:'fas fa-clock-rotate-left',
        search:'Chassis, registration, mobile, customer, job card...',
        empty:'No job card in the period matches.'
    },
    'job-card-register':
    {
        title:'Job Card Register',
        subtitle:'Every job card of the period with its status and its invoice',
        icon:'fas fa-book',
        search:'Job card, customer, mobile, bike, model...',
        empty:'No job card in the period.'
    },
    'technician-performance':
    {
        title:'Technician Performance',
        subtitle:'Jobs, work entries and time worked in the period',
        icon:'fas fa-user-clock',
        search:'Technician code or name...',
        empty:'No technician worked in the period.'
    },
    'parts-consumption':
    {
        title:'Parts Consumption',
        subtitle:'Parts issued to job cards in the period, less returns, at cost',
        icon:'fas fa-gears',
        search:'Part number or name...',
        empty:'No parts were issued in the period.'
    },
    'service-due-list':
    {
        title:'Service Due List',
        subtitle:'Bikes whose next service falls due in the period',
        icon:'fas fa-calendar-check',
        search:'Customer, mobile, chassis, registration, model...',
        empty:'No service falls due in the period.'
    },
    'work-in-progress':
    {
        title:'Work In Progress',
        subtitle:'As of today : the parts on the jobs not invoiced yet, at their cost',
        icon:'fas fa-hourglass-half',
        search:'Job card, token, customer, part...',
        empty:'No part sits on an open job.',
        asOf:true,
        print:true
    }
};


//===============================================================
// Service Reports (Service Operations > Service Reports)
//
// One component for the five reports. The server sends the columns
// and the rows as ready text; the page filters by period, service
// center and a search text, and shows them. Read-only.
//===============================================================

@Component(
{
    selector:'service-reports',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        SearchDropdownComponent,
        DatepickerComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        ToastComponent
    ],

    templateUrl:'./service-reports.html',

    styleUrl:'./service-reports.css'
})

export class ServiceReportsPage
implements OnInit
{
    private readonly ws = inject(WsService);
    private readonly router = inject(Router);
    private readonly toast = inject(ToastService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly destroyRef = inject(DestroyRef);

    readonly asDate = hrToDate;

    report =
        'job-card-register';

    words =
        REPORTS['job-card-register'];

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
        // room for the small second line of a cell
        rowHeight:38,
        headerHeight:36,
        footerHeight:56
    };

    readonly listActions =
        { view:false, edit:false, delete:false };

    columns:
        ListTableColumn[] = [];

    private all:
        any[] = [];

    rows:
        any[] = [];

    // The closing figures of the report, as one line
    totalsText =
        '';

    cut =
        false;

    from =
        '';

    to =
        '';

    branchId:
        number | null = null;

    branchItems:
        Option[] = [];

    searchText =
        '';

    private searchTimer:
        any = null;

    currentPage =
        1;

    pageSize =
        10;

    totalRecords =
        0;

    // The last load asked for : an older answer is dropped
    private run =
        0;

    ngOnInit():
        void
    {
        const url =
            this.router.url.toLowerCase().split('?')[0];

        this.report =
            Object.keys(REPORTS).find(x => url.includes('/' + x)) ?? 'job-card-register';

        this.words =
            REPORTS[this.report];

        this.load();
    }

    load():
        void
    {
        const run = ++this.run;

        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        this.ws
            .getReport(this.report, this.from, this.to, this.branchId, this.searchText.trim())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:report =>
                {
                    if (run !== this.run)
                    {
                        return;
                    }

                    this.loading = false;
                    this.show(report);
                },
                error:error =>
                {
                    if (run !== this.run)
                    {
                        return;
                    }

                    this.loading = false;
                    this.loadFailed = true;
                    this.toast.error('Error', error?.error?.message ?? 'The report could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    private show(report: WsReport):
        void
    {
        // the period the server used (its default the first time)
        this.from = (report.From ?? '').substring(0, 10);
        this.to = (report.To ?? '').substring(0, 10);

        if (this.branchItems.length === 0)
        {
            this.branchItems = (report.Branches ?? []).map(x => ({ label:x.Name, value:x.Id }));
        }

        const columns = report.Columns ?? [];

        this.columns =
            [
                { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
                // a column "under" another one is its small second
                // line (more of them : side by side, || between)
                ...columns
                    .map((x, i) =>
                    {
                        const sub = columns.some(y => (y.Under ?? -1) === i && !y.Figure);

                        // a serial token under it : the big figure
                        const figure = columns.findIndex(y => (y.Under ?? -1) === i && !!y.Figure);

                        return {
                            header:x.Header,
                            field:'c' + i,
                            width:x.Width,
                            align:x.Align,
                            ...(sub ? { subField:'s' + i } : {}),
                            ...(figure >= 0 ? { subFigureField:'c' + figure } : {}),
                            own:(x.Under ?? -1) < 0
                        };
                    })
                    .filter(x => x.own)
                    .map(({ own, ...x }) => x as ListTableColumn)
            ];

        this.all =
            (report.Rows ?? []).map(cells =>
            {
                const row: Record<string, string> = {};

                // a date reads 18-Nov-2026
                cells.forEach((value, i) => row['c' + i] = /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') ? wsDay(value) : value);

                // the second line of a column : the texts under it
                columns.forEach((x, i) =>
                {
                    const under = x.Under ?? -1;

                    if (under >= 0 && !x.Figure && row['c' + i])
                    {
                        row['s' + under] = row['s' + under] ? `${row['s' + under]}  ||  ${row['c' + i]}` : row['c' + i];
                    }
                });

                return row;
            });

        this.totalsText =
            (report.Totals ?? [])
                .map((value, i) => !value ? '' : (i === 0 || /[a-z]\)$/i.test(value) ? value : `${columns[i]?.Header ?? ''} ${value}`))
                .filter(x => !!x)
                .join('   |   ');

        this.cut = !!report.Cut;

        this.currentPage = 1;
        this.apply();
    }

    private apply():
        void
    {
        this.totalRecords = this.all.length;

        const start = (this.currentPage - 1) * this.pageSize;

        this.rows = this.all.slice(start, start + this.pageSize);

        this.cdr.detectChanges();
    }

    // The search goes to the server (a moment after typing)
    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';

        clearTimeout(this.searchTimer);

        this.searchTimer = setTimeout(() => this.load(), 500);
    }

    onFrom(date: Date | null):
        void
    {
        this.from = date ? hrToText(date) : '';
        this.load();
    }

    onTo(date: Date | null):
        void
    {
        this.to = date ? hrToText(date) : '';
        this.load();
    }

    onBranch(value: any):
        void
    {
        this.branchId = value ? Number(value) : null;
        this.load();
    }

    // Work In Progress : the paper, job by job, for the service
    // center and the search of the page
    print():
        void
    {
        const problem = openWorkInProgressPrint(this.router, this.branchId, this.searchText.trim());

        if (problem)
        {
            this.toast.error('Print', problem);
        }
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
}
