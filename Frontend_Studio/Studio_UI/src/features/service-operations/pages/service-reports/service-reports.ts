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

import
{
    WsReport
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
}

// What differs between the five reports (the address says which)
const REPORTS:
    Record<string, Words> =
{
    'service-history':
    {
        title:'Service History',
        subtitle:'What was done to a bike or for a customer : find it by chassis, registration, mobile or name',
        icon:'fas fa-clock-rotate-left',
        search:'Chassis, registration, mobile, customer, job card...',
        empty:'No job card in the period matches.'
    },
    'job-card-register':
    {
        title:'Job Card Register',
        subtitle:'Every job card of the period with its status, its labour, its parts and its invoice',
        icon:'fas fa-book',
        search:'Job card, customer, mobile, bike, model...',
        empty:'No job card in the period.'
    },
    'technician-performance':
    {
        title:'Technician Performance',
        subtitle:'The time stamps of the technicians : jobs, work entries and time worked in the period',
        icon:'fas fa-user-clock',
        search:'Technician code or name...',
        empty:'No technician worked in the period.'
    },
    'parts-consumption':
    {
        title:'Parts Consumption',
        subtitle:'The parts issued to job cards in the period, less what came back, at their cost',
        icon:'fas fa-gears',
        search:'Part number or name...',
        empty:'No parts were issued in the period.'
    },
    'service-due-list':
    {
        title:'Service Due List',
        subtitle:'The bikes whose next scheduled service falls due in the period : call them in',
        icon:'fas fa-calendar-check',
        search:'Customer, mobile, chassis, registration, model...',
        empty:'No service falls due in the period.'
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
        rowHeight:32,
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
                ...columns.map((x, i) => ({ header:x.Header, field:'c' + i, width:x.Width, align:x.Align } as ListTableColumn))
            ];

        this.all =
            (report.Rows ?? []).map(cells =>
            {
                const row: Record<string, string> = {};

                cells.forEach((value, i) => row['c' + i] = value);

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
