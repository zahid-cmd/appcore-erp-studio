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
import { ControlTab, ControlTabsComponent } from '../../../../shared/components/controls/control-tabs/control-tabs';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../shared/components/layout/page-canvas/page-canvas';
import { ListTableColumn, ListTableComponent } from '../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../shared/components/controls/pagination/pagination';
import { SearchDropdownComponent } from '../../../../shared/components/controls/search-dropdown/search-dropdown';
import { SearchBoxComponent } from '../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../shared/components/utilities/command-center/command-center';
import { ToastComponent } from '../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../shared/components/utilities/toast/toast.service';

import { WsService } from '../../shared/ws.service';

import
{
    WorkshopDashboard,
    WorkshopDashboardJob,
    WorkshopQueue,
    WorkshopRamp,
    WsTile,
    wsDay,
    wsDateTime,
    wsStatusColor
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


//===============================================================
// Workshop Dashboard (Service Operations > Workshop Management)
//
// The workshop now : the bikes that are in it, by status, who works
// on them, the bays, and the money of today. Read-only; a click on
// a bike opens its job card.
//===============================================================

@Component(
{
    selector:'workshop-dashboard',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        ControlTabsComponent,
        PageCanvasComponent,
        ListTableComponent,
        PaginationComponent,
        SearchDropdownComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ToastComponent
    ],

    templateUrl:'./workshop-dashboard.html',

    styleUrl:'../service-reports/service-reports.css'
})

export class WorkshopDashboardPage
implements OnInit
{
    private readonly ws = inject(WsService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly toast = inject(ToastService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly destroyRef = inject(DestroyRef);

    readonly dateTime = wsDateTime;
    readonly color = wsStatusColor;
    readonly day = wsDay;

    // the tabs (owner 2026-11-19) : the service ramps first
    readonly tabs:
        ControlTab[] =
    [
        { id:'ramps', label:'Service Ramps' },
        { id:'bikes', label:'Bikes in Workshop' },
        { id:'technicians', label:'Technicians' },
        { id:'figures', label:'Figures' }
    ];

    tab =
        'ramps';

    //-----------------------------------------------------------
    // Bikes in Workshop : the shared list table (owner 2026-11-19)
    //-----------------------------------------------------------

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

    // read only : no view, edit or delete on a row
    readonly listActions =
    {
        view:false,
        edit:false,
        delete:false
    };

    readonly bikeColumns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Job Card', field:'JobCardNo', width:'230px', align:'left', link:true, linkTitle:'Open the job card', subField:'JobType' },
        { header:'Customer', field:'CustomerName', width:'220px', align:'left', subField:'Mobile' },
        { header:'Bike', field:'BikeNo', width:'230px', align:'left', subField:'ModelName' },
        { header:'Status', field:'Status', width:'150px', align:'left', dotField:'StatusColor' },
        { header:'Checked In', field:'CheckInText', width:'180px', align:'left' },
        { header:'Promised', field:'PromisedText', width:'180px', align:'left', flagField:'IsLate', flagText:'Late', flagTitleField:'LateTitle' },
        { header:'Working Now', field:'WorkingText', width:'200px', align:'left', subField:'Bays' }
    ];

    currentPage =
        1;

    pageSize =
        10;

    // the bikes of the page
    get bikeRows(): any[]
    {
        const start = (this.currentPage - 1) * this.pageSize;

        return this.jobs.slice(start, start + this.pageSize).map(x => ({
            ...x,
            StatusColor:wsStatusColor(x.Status),
            CheckInText:wsDateTime(x.CheckInAt),
            PromisedText:wsDateTime(x.PromisedAt) || '-',
            LateTitle:'The promised time is over',
            WorkingText:x.Technicians || '-'
        }));
    }

    onPageChange(page: number):
        void
    {
        this.currentPage = page;
        this.cdr.detectChanges();
    }

    onPageSizeChange(size: number):
        void
    {
        this.pageSize = size;
        this.currentPage = 1;
        this.cdr.detectChanges();
    }

    // the job card no of a row : its job card
    onBikeCell(event: { field: string; row: any }):
        void
    {
        if (event?.row?.PublicId)
        {
            this.open(event.row);
        }
    }

    onTab(value: string):
        void
    {
        this.tab = value || 'ramps';
        this.cdr.detectChanges();
    }

    // the ramps : the search finds a ramp by its name or its jobs
    get ramps(): WorkshopRamp[]
    {
        const find = this.searchText.trim().toLowerCase();

        return (this.data?.Ramps ?? []).filter(x =>
            !find
            || [x.Name, x.BranchName, ...x.Jobs.flatMap(j => [j.JobCardNo, j.CustomerName, j.BikeNo, j.ModelName, j.TechnicianName, j.Status])]
                .some(v => String(v ?? '').toLowerCase().includes(find)));
    }

    // the technicians : the search finds one by the name or the jobs
    get queues(): WorkshopQueue[]
    {
        const find = this.searchText.trim().toLowerCase();

        return (this.data?.Queues ?? []).filter(x =>
            !find
            || [x.TechnicianName, ...[x.InHand, ...x.Waiting].flatMap(j => [j.JobCardNo, j.CustomerName, j.Status])]
                .some(v => String(v ?? '').toLowerCase().includes(find)));
    }

    get queuesWaiting(): number
    {
        return this.queues.filter(x => x.Waiting.length > 0).length;
    }

    // the figures : the money ones apart (they are amounts : 0.00)
    get workTiles(): WsTile[]
    {
        return (this.data?.Tiles ?? []).filter(x => !isMoney(x));
    }

    get moneyTiles(): WsTile[]
    {
        return (this.data?.Tiles ?? []).filter(x => isMoney(x));
    }

    // the bar of a status : its share of the biggest one
    barWidth(value: string): number
    {
        const most = Math.max(1, ...(this.data?.Statuses ?? []).map(x => Number(x.Value) || 0));

        return Math.round(((Number(value) || 0) / most) * 100);
    }

    // a bar : the bikes of that status
    showStatus(status: string):
        void
    {
        this.status = status;
        this.currentPage = 1;
        this.tab = 'bikes';
        this.cdr.detectChanges();
    }

    get rampsBusy(): number
    {
        return this.ramps.filter(x => x.Jobs.length > 0).length;
    }

    get rampsWaiting(): number
    {
        return this.ramps.reduce((sum, x) => sum + Math.max(0, x.Jobs.length - 1), 0);
    }

    loading =
        false;

    data:
        WorkshopDashboard | null = null;

    branchId:
        number | null = null;

    branchItems:
        Option[] = [];

    // '' : every status
    status =
        '';

    searchText =
        '';

    get jobs(): WorkshopDashboardJob[]
    {
        const find = this.searchText.trim().toLowerCase();

        return (this.data?.Jobs ?? []).filter(x =>
            (!this.status || x.Status === this.status)
            && (!find
                || [x.JobCardNo, x.CustomerName, x.Mobile, x.ModelName, x.BikeNo, x.JobType, x.Technicians, x.Status]
                    .some(v => String(v ?? '').toLowerCase().includes(find))));
    }

    ngOnInit():
        void
    {
        // back from a job card : the tab it was opened from
        const tab = this.route.snapshot.queryParamMap.get('tab') ?? '';

        if (this.tabs.some(x => x.id === tab))
        {
            this.tab = tab;
        }

        this.load();
    }

    load():
        void
    {
        this.loading = true;
        this.cdr.detectChanges();

        this.ws
            .getDashboard(this.branchId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:data =>
                {
                    this.loading = false;
                    this.data = data;

                    if (this.branchItems.length === 0)
                    {
                        this.branchItems = (data.Branches ?? []).map(x => ({ label:x.Name, value:x.Id }));
                    }

                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.loading = false;
                    this.toast.error('Error', error?.error?.message ?? 'The workshop dashboard could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    onBranch(value: any):
        void
    {
        this.branchId = value ? Number(value) : null;
        this.load();
    }

    onStatus(status: string):
        void
    {
        this.status = this.status === status ? '' : status;
        this.currentPage = 1;
        this.cdr.detectChanges();
    }

    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';
        this.currentPage = 1;
        this.cdr.detectChanges();
    }

    // the jobs that wait for their technician
    get waitingCount(): number
    {
        return this.queues.reduce((sum, x) => sum + x.Waiting.length, 0);
    }

    open(job: { PublicId: string }):
        void
    {
        // the Back of the job card returns here, on this tab
        void this.router.navigate(['../job-cards/view', job.PublicId], { relativeTo:this.route, queryParams:{ from:'dashboard', tab:this.tab } });
    }
}


// A figure that is an amount ("1,250.00"), not a count
function isMoney(tile: { Value: string }): boolean
{
    return String(tile.Value ?? '').includes('.');
}
