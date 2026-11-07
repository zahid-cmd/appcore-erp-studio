//===============================================================
// Service Appointments : list (Follow-ups & Appointments)
//
//   Header  : search · Add (book) · Refresh · Restore · Board ·
//             History
//   Toolbar : Upcoming / Today / Past / All · status (with counts)
//             · branch (mine / all)
//   Canvas  : one server page (paged, sorted, searched by the API)
//   Summary : Total / Live / Overdue / Arrived / No-show /
//             Cancelled (period, branch and search applied)
//
// Row buttons : open the day on the board (the enquiry picked) ·
// View · Edit · Delete (closed appointments only; the API answers
// 409 for a live one).
//
// HAND-WRITTEN over the Code Sync baseline (2026-11-06). Never
// run Code Synchronization or its rollback again for this
// submenu.
//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit,
    inject
}
from '@angular/core';

import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { PageHeaderComponent } from '../../../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../../../shared/components/layout/page-canvas/page-canvas';
import { ControlTabsComponent, ControlTab } from '../../../../../../shared/components/controls/control-tabs/control-tabs';
import { SearchBoxComponent } from '../../../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../../../shared/components/utilities/command-center/command-center';
import { ListTableComponent, ListTableColumn, ListTableRowAction, ListTableRowActionEvent } from '../../../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../../../shared/components/controls/pagination/pagination';
import { HistoryDrawerComponent } from '../../../../../../shared/components/utilities/history-drawer/history-drawer';
import { SearchDropdownComponent } from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { ConfirmDialogComponent } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ConfirmDialogService } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ProgressDialogComponent } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { ProgressDialogService } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';
import { ProgressRunner } from '../../../../../../shared/components/utilities/progress-dialog/progress-runner';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';
import { AuthenticationStorageService } from '../../../../../../core/authentication/authentication-storage.service';
import { PagedResult } from '../../../../../../shared/paging/paged-result.model';

import
{
    OVERDUE_COLOR,
    SERVICE_APPOINTMENT_STATUSES,
    ServiceAppointmentPageQuery,
    ServiceAppointmentRow
}
from '../../../models/service-appointments.model';

import { ServiceAppointmentsService } from '../../../services/service-appointments.service';


interface SummaryItem
{
    label:string;
    value:string;
    tone:'' | 'ok' | 'warn' | 'bad';
}


@Component(
{
    selector:'service-appointments-list',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        ControlTabsComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        SearchDropdownComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent,
        ToastComponent
    ],
    templateUrl:'./service-appointments-list.html',
    styleUrl:'./service-appointments-list.css'
})
export class ServiceAppointmentsList
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependencies
    //===========================================================

    private readonly service = inject(ServiceAppointmentsService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly toast = inject(ToastService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly auth = inject(AuthenticationStorageService);

    readonly progress =
        new ProgressRunner(
            inject(ProgressDialogService),
            () => this.cdr.detectChanges());


    //===========================================================
    // Tabs : the period
    //===========================================================

    readonly tabs: ControlTab[] =
    [
        { id:'upcoming', label:'Upcoming' },
        { id:'today',    label:'Today' },
        { id:'past',     label:'Past' },
        { id:'all',      label:'All' }
    ];

    selectedTab = 'upcoming';


    //===========================================================
    // Filters
    //===========================================================

    // Status (the counts come with every page)
    statusItems: any[] = [];

    selectedStatus: string = '';

    private readonly myBranchId =
        Number(this.auth.getUser()?.branchId ?? 0);

    private readonly myBranchName =
        String(this.auth.getUser()?.branchName ?? '');

    readonly branchItems: any[] =
    [
        { label:this.myBranchName ? `My Branch (${this.myBranchName})` : 'My Branch', value:'mine' },
        { label:'All Branches', value:'all' }
    ];

    selectedBranch: string =
        this.myBranchId > 0 ? 'mine' : 'all';


    //===========================================================
    // Data
    //===========================================================

    rows: ServiceAppointmentRow[] = [];

    totalRecords = 0;

    summaryItems: SummaryItem[] = [];

    loading = false;

    loadFailed = false;

    searchText = '';

    currentPage = 1;

    pageSize = 10;

    // Auto page size (page canvas across monitors) : as many rows
    // as the canvas holds; the pager's "Auto (n)" choice. The
    // first page loads with 10 and is reloaded once the rows
    // that fit are known (only when that number differs).
    autoPageSize = true;

    autoRows = 0;

    private sortField = '';

    private sortDirection: 'asc' | 'desc' = 'asc';

    private searchTimer?: number;

    private loadSubscription?: Subscription;


    //===========================================================
    // History
    //===========================================================

    historyOpened = false;

    historyTitle = 'Service Appointments History';

    historyItems: any[] = [];


    //===========================================================
    // Canvas + table
    //===========================================================

    readonly canvasConfig: PageCanvasConfig =
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

    readonly columns: ListTableColumn[] =
    [
        { header:'#',          field:'serial',       type:'serial', width:'50px',  align:'center' },
        { header:'Date',       field:'DateText',     width:'140px', align:'center' },
        { header:'Time',       field:'SlotText',     width:'170px', align:'center' },
        { header:'Enquiry No', field:'EnquiryNo',    width:'140px', align:'center', priority:2 },
        { header:'Customer',   field:'CustomerText', width:'230px', align:'left' },
        { header:'Bike',       field:'BikeText',     width:'190px', align:'left', priority:2 },
        { header:'Request',    field:'RequestSummary', width:'220px', align:'left', priority:3 },
        { header:'Advisor',    field:'AdvisorName',  width:'150px', align:'left', priority:3 },
        { header:'Moved',      field:'MovedText',    width:'80px',  align:'center', priority:3 },
        { header:'Status',     field:'StatusText',   width:'170px', align:'left', dotField:'StatusColor' },
        { header:'Actions',    field:'actions',      type:'actions', width:'130px', align:'center' }
    ];

    // Table column → the API's sort key ('' = date + time)
    private readonly SORT_KEYS: Record<string, string> =
    {
        DateText:'AppointmentDate',
        SlotText:'AppointmentDate',
        EnquiryNo:'EnquiryNo',
        AdvisorName:'AdvisorName',
        MovedText:'RescheduleCount',
        StatusText:'Status'
    };

    readonly rowActions: ListTableRowAction[] =
    [
        {
            key:'board',
            icon:'fas fa-table-cells-large',
            title:'Open the day on the board',
            tone:'primary'
        },
        {
            key:'enquiry',
            icon:'fas fa-screwdriver-wrench',
            title:'Open the service enquiry'
        }
    ];


    //===========================================================
    // Life cycle
    //===========================================================

    ngOnInit(): void
    {
        this.buildStatusItems({});

        this.loadItems();
    }


    ngOnDestroy(): void
    {
        this.clearSearchTimer();

        this.loadSubscription?.unsubscribe();
    }


    //===========================================================
    // Load one page
    //===========================================================

    loadItems(): void
    {
        this.loadSubscription?.unsubscribe();

        this.loading = true;

        this.loadFailed = false;

        this.cdr.detectChanges();

        const query: ServiceAppointmentPageQuery =
        {
            page:this.currentPage,
            pageSize:this.pageSize,
            search:this.searchText.trim(),
            sort:this.sortField,
            dir:this.sortDirection,
            period:this.selectedTab,
            status:this.selectedStatus,
            branchId:this.selectedBranch === 'mine' ? this.myBranchId : 0
        };

        this.loadSubscription =
            this.service
                .getPaged(query)
                .subscribe
                ({
                    next:(response: PagedResult<ServiceAppointmentRow>): void =>
                    {
                        this.rows = response.items;

                        this.totalRecords = response.totalCount;

                        this.currentPage = response.page;

                        this.buildStatusItems(response.counts);

                        this.buildSummary(response.counts);

                        this.loading = false;

                        this.cdr.detectChanges();
                    },

                    error:(error: unknown): void =>
                    {
                        console.error('Load Service Appointments Error:', error);

                        this.rows = [];

                        this.totalRecords = 0;

                        this.loading = false;

                        this.loadFailed = true;

                        this.toast.error('Load Failed', this.errorText(error, 'Unable to load the service appointments.'));

                        this.cdr.detectChanges();
                    }
                });
    }


    private reload(): void
    {
        this.currentPage = 1;

        this.loadItems();
    }


    private buildStatusItems(counts: Record<string, number>): void
    {
        const n =
            (key: string): number =>
                Number(counts[key] ?? 0);

        this.statusItems =
        [
            { label:'All Status', value:'', count:n('Total'), color:'' },
            { label:'Live (Booked + Confirmed)', value:'Live', count:n('Live'), color:'#1D4ED8' },
            { label:'Overdue', value:'Overdue', count:n('Overdue'), color:OVERDUE_COLOR },
            ...SERVICE_APPOINTMENT_STATUSES.map(s => ({ label:s.label, value:s.value, count:n(s.value), color:s.color }))
        ];
    }


    private buildSummary(counts: Record<string, number>): void
    {
        const value =
            (key: string): string =>
                Number(counts[key] ?? 0).toLocaleString('en-US');

        this.summaryItems =
        [
            { label:'Total',     value:value('Total'),     tone:'' },
            { label:'Live',      value:value('Live'),      tone:'' },
            { label:'Overdue',   value:value('Overdue'),   tone:'bad' },
            { label:'Arrived',   value:value('Arrived'),   tone:'ok' },
            { label:'No-show',   value:value('NoShow'),    tone:'warn' },
            { label:'Cancelled', value:value('Cancelled'), tone:'bad' }
        ];
    }


    get summaryNote(): string
    {
        const period =
            this.tabs.find(x => x.id === this.selectedTab)?.label ?? '';

        return `${period}, ${this.selectedBranch === 'mine' ? 'my branch' : 'all branches'} and the search`;
    }


    //===========================================================
    // Toolbar
    //===========================================================

    onTabChange(value: string): void
    {
        this.selectedTab = value;

        this.reload();
    }


    onStatusChange(value: any): void
    {
        this.selectedStatus = value ? String(value) : '';

        this.reload();
    }


    onBranchChange(value: any): void
    {
        this.selectedBranch = value === 'all' ? 'all' : 'mine';

        this.reload();
    }


    onSearch(value: string): void
    {
        this.searchText = value ?? '';

        this.clearSearchTimer();

        this.searchTimer =
            window.setTimeout(
                () =>
                {
                    this.searchTimer = undefined;

                    this.reload();
                },
                300);
    }


    private clearSearchTimer(): void
    {
        if (this.searchTimer)
        {
            clearTimeout(this.searchTimer);

            this.searchTimer = undefined;
        }
    }


    onSort(event: { field: string; direction: 'asc' | 'desc' }): void
    {
        this.sortField = this.SORT_KEYS[event.field] ?? '';

        this.sortDirection = event.direction === 'desc' ? 'desc' : 'asc';

        this.reload();
    }


    onPageChange(page: number): void
    {
        this.currentPage = page;

        this.loadItems();
    }


    onPageSizeChange(size: number): void
    {
        // 0 = Auto (the rows that fit the canvas)
        this.autoPageSize = size === 0;

        this.pageSize =
            size === 0
                ? (this.autoRows > 0 ? this.autoRows : this.pageSize)
                : size;

        this.reload();
    }


    // The list table measured how many rows fit
    onFitRows(rows: number): void
    {
        this.autoRows = rows;

        if (!this.autoPageSize || rows === this.pageSize)
        {
            this.cdr.detectChanges();

            return;
        }

        // Keep the first record on screen in view
        const first =
            (this.currentPage - 1) * this.pageSize;

        this.pageSize = rows;

        this.currentPage = Math.floor(first / rows) + 1;

        this.loadItems();
    }


    refresh(): void
    {
        this.clearSearchTimer();

        this.searchText = '';

        this.selectedTab = 'upcoming';

        this.selectedStatus = '';

        this.selectedBranch = this.myBranchId > 0 ? 'mine' : 'all';

        this.sortField = '';

        this.sortDirection = 'asc';

        this.reload();
    }


    //===========================================================
    // Navigation
    //===========================================================

    add(): void
    {
        void this.router.navigate(['add'], { relativeTo:this.route.parent });
    }


    view(row: ServiceAppointmentRow): void
    {
        void this.router.navigate(['view', row.PublicId], { relativeTo:this.route.parent });
    }


    edit(row: ServiceAppointmentRow): void
    {
        void this.router.navigate(['edit', row.PublicId], { relativeTo:this.route.parent });
    }


    openBoard(): void
    {
        void this.router.navigate(['board'], { relativeTo:this.route.parent });
    }


    onRowAction(event: ListTableRowActionEvent): void
    {
        const row = event.row as ServiceAppointmentRow;

        if (event.key === 'board')
        {
            void this.router.navigate(
                ['board'],
                {
                    relativeTo:this.route.parent,
                    queryParams:{ enquiry:row.ServiceEnquiryId, date:row.AppointmentDate }
                });

            return;
        }

        if (event.key === 'enquiry')
        {
            void this.router.navigate(['/enquiry-management/enquiry-profiles/service-enquiries/view', row.ServiceEnquiryId]);
        }
    }


    //===========================================================
    // Delete (closed only) / Restore (latest deleted)
    //===========================================================

    delete(row: ServiceAppointmentRow): void
    {
        if (this.progress.busy)
        {
            return;
        }

        if (row.IsLive)
        {
            this.toast.info(
                'Delete Blocked',
                `${row.EnquiryNo} ${row.DateText} is still ${row.Status === 'Confirmed' ? 'confirmed' : 'booked'}. Cancel it first (Edit › Status).`);

            return;
        }

        this.confirmDialog.open(
            'Delete Appointment',
            `Are you sure you want to delete the ${row.StatusText.toLowerCase()} appointment of ${row.EnquiryNo} on ${row.DateText}?`,
            (): void =>
            {
                setTimeout(() => this.deleteItem(row));
            });
    }


    private deleteItem(row: ServiceAppointmentRow): void
    {
        this.progress
            .run<void>(
                'Deleting Appointment',
                `Please wait while ${row.EnquiryNo} ${row.DateText} is deleted...`,
                'Appointment deleted.',
                this.service.delete(row.PublicId))
            .subscribe
            ({
                next:(): void =>
                {
                    this.toast.success('Delete Successful', `${row.EnquiryNo} ${row.DateText} deleted.`);

                    this.loadItems();
                },

                error:(error: unknown): void =>
                {
                    if (error instanceof HttpErrorResponse && error.status === 409)
                    {
                        this.toast.info('Delete Blocked', this.errorText(error, 'This appointment cannot be deleted.'));

                        return;
                    }

                    this.toast.error('Delete Failed', this.errorText(error, 'Failed to delete the appointment.'));
                }
            });
    }


    restore(): void
    {
        if (this.progress.busy)
        {
            return;
        }

        this.confirmDialog.open(
            'Restore Appointment',
            'Are you sure you want to restore the most recently deleted appointment?',
            (): void =>
            {
                setTimeout(() => this.restoreItem());
            },
            'Restore',
            'Cancel',
            'primary');
    }


    private restoreItem(): void
    {
        this.progress
            .run<void>(
                'Restoring Appointment',
                'Please wait while the most recently deleted appointment is restored...',
                'Appointment restored.',
                this.service.restore())
            .subscribe
            ({
                next:(): void =>
                {
                    this.toast.success('Restore Successful', 'The most recently deleted appointment has been restored.');

                    this.loadItems();
                },

                error:(error: unknown): void =>
                {
                    if (error instanceof HttpErrorResponse && error.status === 404)
                    {
                        this.toast.info('No Data to Restore', 'There is no deleted appointment to restore.');

                        return;
                    }

                    if (error instanceof HttpErrorResponse && error.status === 409)
                    {
                        this.toast.info('Restore Blocked', this.errorText(error, 'The appointment cannot be restored.'));

                        return;
                    }

                    this.toast.error('Restore Failed', this.errorText(error, 'Failed to restore the appointment.'));
                }
            });
    }


    //===========================================================
    // History
    //===========================================================

    openHistory(): void
    {
        this.service
            .getHistory()
            .subscribe
            ({
                next:(response: any[]): void =>
                {
                    this.historyItems =
                        (response ?? []).map(
                            h =>
                            ({
                                title:h.activityTitle ?? h.ActivityTitle,
                                description:h.activityDescription ?? h.ActivityDescription,
                                user:h.performedByName ?? h.PerformedByName ?? 'System',
                                dateTime:new Date(h.performedDate ?? h.PerformedDate).toLocaleString(),
                                badge:h.activityType ?? h.ActivityType
                            }));

                    this.historyTitle = 'Service Appointments History';

                    this.historyOpened = true;

                    this.cdr.detectChanges();
                },

                error:(error: unknown): void =>
                {
                    console.error('History Load Failed:', error);

                    this.toast.error('History', 'Failed to load the appointment history.');
                }
            });
    }


    closeHistory(): void
    {
        this.historyOpened = false;

        this.cdr.detectChanges();
    }


    //===========================================================
    // Error text : { message } from the API
    //===========================================================

    private errorText(error: unknown, fallback: string): string
    {
        if (error instanceof HttpErrorResponse)
        {
            if (typeof error.error === 'string' && error.error.trim())
            {
                return error.error;
            }

            return error.error?.message ?? error.error?.title ?? fallback;
        }

        return fallback;
    }
}
