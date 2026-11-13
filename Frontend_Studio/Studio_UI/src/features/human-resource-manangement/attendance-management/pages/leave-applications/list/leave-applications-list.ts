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

import { PageHeaderComponent } from '../../../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../../../shared/components/layout/page-canvas/page-canvas';
import { ControlTab, ControlTabsComponent } from '../../../../../../shared/components/controls/control-tabs/control-tabs';
import { SearchDropdownComponent } from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { SearchBoxComponent } from '../../../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../../../shared/components/utilities/command-center/command-center';
import { ListTableComponent, ListTableColumn } from '../../../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../../../shared/components/controls/pagination/pagination';
import { HistoryDrawerComponent } from '../../../../../../shared/components/utilities/history-drawer/history-drawer';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogService } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ConfirmDialogComponent } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ProgressDialogComponent } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';

import
{
    LeaveApplication,
    attDayText
}
from '../../../models/attendance.model';

import
{
    AttendanceService
}
from '../../../services/attendance.service';


type LeaveRow =
    LeaveApplication
    &
    {
        EmployeeText:
            string;

        LeaveText:
            string;

        FromText:
            string;

        ToText:
            string;

        DaysText:
            string;

        // Colour of the dot before the status
        StatusColor:
            string;
    };

const STATUS_COLORS:
    Record<string, string> =
{
    Pending:'#b45309',
    Approved:'#047857',
    Rejected:'#be123c',
    Cancelled:'#64748b'
};


//===============================================================
// Leave Applications List (Human Resource > Attendance
// Management)
//
// Loaded once, filtered / paged in the page. Tabs All / Pending /
// Approved / Rejected / Cancelled; Leave Type filter on the
// toolbar right; summary line below the canvas. Approve, reject
// and cancel are on the application's own page (View).
//===============================================================

@Component(
{
    selector:'leave-applications-list',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        ControlTabsComponent,
        SearchDropdownComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./leave-applications-list.html',
    styleUrl:'./leave-applications-list.css'
})
export class LeaveApplicationsList
implements OnInit
{
    private readonly service = inject(AttendanceService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    readonly tabs:
        ControlTab[] =
    [
        { id:'all', label:'All' },
        { id:'Pending', label:'Pending' },
        { id:'Approved', label:'Approved' },
        { id:'Rejected', label:'Rejected' },
        { id:'Cancelled', label:'Cancelled' }
    ];

    selectedTab =
        'all';

    typeItems:
        { label: string; value: number }[] =
    [
        { label:'All Leave Types', value:0 }
    ];

    selectedType =
        0;

    searchText =
        '';

    loading =
        false;

    loadFailed =
        false;

    private all:
        LeaveRow[] = [];

    rows:
        LeaveRow[] = [];

    totalRecords =
        0;

    currentPage =
        1;

    pageSize =
        10;

    summaryItems:
        { label: string; value: string; tone: '' | 'ok' | 'bad' | 'warn' }[] = [];

    historyOpened =
        false;

    historyItems:
        any[] = [];

    readonly canvasConfig:
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

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Code', field:'Code', width:'100px', align:'center' },
        { header:'Employee', field:'EmployeeText', width:'260px', align:'left' },
        { header:'Leave', field:'LeaveText', width:'190px', align:'left' },
        { header:'From', field:'FromText', width:'120px', align:'center' },
        { header:'To', field:'ToText', width:'120px', align:'center' },
        { header:'Days', field:'DaysText', width:'70px', align:'center' },
        { header:'Status', field:'Status', width:'130px', align:'left', dotField:'StatusColor' },
        { header:'Actions', field:'actions', type:'actions', width:'120px', align:'center' }
    ];

    ngOnInit():
        void
    {
        this.load();
    }

    private load():
        void
    {
        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        this.service
            .getLeaves()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:rows =>
                {
                    this.all =
                        rows.map(x => ({
                            ...x,
                            EmployeeText:`${x.EmployeeCode}  ${x.EmployeeName}`,
                            LeaveText:`${x.LeaveTypeName}${x.IsPaid ? '' : ' (unpaid)'}`,
                            FromText:attDayText(x.FromDate),
                            ToText:attDayText(x.ToDate),
                            DaysText:x.Days.toLocaleString('en-US', { maximumFractionDigits:2 }),
                            StatusColor:STATUS_COLORS[x.Status] ?? '#64748b'
                        }));

                    this.typeItems =
                    [
                        { label:'All Leave Types', value:0 },
                        ...[...new Map(this.all.map(x => [x.LeaveTypeId, x.LeaveTypeName])).entries()]
                            .map(([value, label]) => ({ label, value }))
                            .sort((a, b) => a.label.localeCompare(b.label))
                    ];

                    if (!this.typeItems.some(x => x.value === this.selectedType))
                    {
                        this.selectedType = 0;
                    }

                    this.loading = false;
                    this.apply();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.toast.error('Error', error?.error?.message ?? 'Leave applications could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        // search + leave type (the tab is applied after : the
        // summary counts every status)
        const base =
            this.all.filter(x =>
                (!this.selectedType || x.LeaveTypeId === this.selectedType)
                &&
                (!find || [x.Code, x.EmployeeCode, x.EmployeeName, x.DesignationName, x.BranchName, x.LeaveTypeName, x.FromText, x.ToText, x.Status, x.Reason]
                    .some(v => (v ?? '').toLowerCase().includes(find))));

        const matched =
            base.filter(x => this.selectedTab === 'all' || x.Status === this.selectedTab);

        this.totalRecords = matched.length;

        const pages = Math.max(1, Math.ceil(matched.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        const start = (this.currentPage - 1) * this.pageSize;

        this.rows = matched.slice(start, start + this.pageSize);

        const count =
            (status: string): string => base.filter(x => x.Status === status).length.toLocaleString('en-US');

        this.summaryItems =
        [
            { label:'Total', value:base.length.toLocaleString('en-US'), tone:'' },
            { label:'Pending', value:count('Pending'), tone:'warn' },
            { label:'Approved', value:count('Approved'), tone:'ok' },
            { label:'Rejected', value:count('Rejected'), tone:'bad' },
            { label:'Cancelled', value:count('Cancelled'), tone:'' },
            {
                label:'Approved Days',
                value:base.filter(x => x.Status === 'Approved').reduce((sum, x) => sum + x.Days, 0).toLocaleString('en-US', { maximumFractionDigits:2 }),
                tone:''
            }
        ];

        this.cdr.detectChanges();
    }

    onTabChange(value: string):
        void
    {
        this.selectedTab = value || 'all';
        this.currentPage = 1;
        this.apply();
    }

    onTypeChange(value: any):
        void
    {
        this.selectedType = Number(value) || 0;
        this.currentPage = 1;
        this.apply();
    }

    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';
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

    onSort(_event: any):
        void
    {
        // Newest application first
    }

    add():
        void
    {
        void this.router.navigate(['../add'], { relativeTo:this.route });
    }

    view(row: LeaveRow):
        void
    {
        void this.router.navigate(['../view', row.PublicId], { relativeTo:this.route });
    }

    // Only a Pending application is changed : the others open to
    // view (approve / cancel are there)
    edit(row: LeaveRow):
        void
    {
        if (row.Status !== 'Pending')
        {
            this.toast.info('Leave Applications', `${row.Code} is ${row.Status} : it opens to view.`);
            this.view(row);
            return;
        }

        void this.router.navigate(['../edit', row.PublicId], { relativeTo:this.route });
    }

    refresh():
        void
    {
        this.load();
    }

    delete(row: LeaveRow):
        void
    {
        if (row.Status === 'Approved')
        {
            this.toast.error('Leave Applications', `${row.Code} is Approved : open it and cancel the leave first.`);
            return;
        }

        this.confirmDialog.open(
            'Delete Leave Application',
            `Delete ${row.Code} of ${row.EmployeeName} (${row.Status})?`,
            () =>
                this.service.deleteLeave(row.PublicId).subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Deleted', `${row.Code} was deleted.`);
                        this.load();
                    },
                    error:error =>
                        this.toast.error('Error', error?.error?.message ?? 'The leave application could not be deleted.')
                }),
            'Delete',
            'Keep',
            'danger'
        );
    }

    restore():
        void
    {
        this.confirmDialog.open(
            'Restore Leave Application',
            'Bring back the most recently deleted leave application?',
            () =>
                this.service.restoreLeave().subscribe(
                {
                    next:code =>
                    {
                        this.toast.success('Restored', code ? `${code} was restored.` : 'The leave application was restored.');
                        this.load();
                    },
                    error:error =>
                        this.toast.error('Restore', error?.error?.message ?? 'Nothing was restored.')
                }),
            'Restore',
            'Cancel',
            'primary'
        );
    }

    openHistory():
        void
    {
        this.service
            .getLeaveHistory()
            .subscribe(
            {
                next:items =>
                {
                    this.historyItems =
                        (Array.isArray(items) ? items : []).map(h => ({
                            title:h.ActivityTitle ?? h.activityTitle,
                            description:h.ActivityDescription ?? h.activityDescription,
                            user:h.PerformedByName ?? h.performedByName ?? 'System',
                            dateTime:new Date(h.PerformedDate ?? h.performedDate).toLocaleString(),
                            badge:h.ActivityType ?? h.activityType
                        }));
                    this.historyOpened = true;
                    this.cdr.detectChanges();
                },
                error:() =>
                    this.toast.error('Error', 'The history could not be loaded.')
            });
    }

    closeHistory():
        void
    {
        this.historyOpened = false;
        this.cdr.detectChanges();
    }
}
