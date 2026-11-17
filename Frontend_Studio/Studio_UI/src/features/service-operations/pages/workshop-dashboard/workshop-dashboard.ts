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
        this.cdr.detectChanges();
    }

    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';
        this.cdr.detectChanges();
    }

    open(job: WorkshopDashboardJob):
        void
    {
        void this.router.navigate(['../job-cards/view', job.PublicId], { relativeTo:this.route });
    }
}
