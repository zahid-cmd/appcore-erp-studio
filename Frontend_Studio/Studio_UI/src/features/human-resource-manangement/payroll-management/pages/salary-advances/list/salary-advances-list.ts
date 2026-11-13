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
    PAYROLL_STATUS_COLORS,
    SalaryAdvance,
    payDayText,
    payMoney
}
from '../../../models/payroll.model';

import
{
    PayrollService
}
from '../../../services/payroll.service';


type AdvanceRow =
    SalaryAdvance
    &
    {
        EmployeeText:
            string;

        DateText:
            string;

        AmountText:
            string;

        InstallmentText:
            string;

        RecoveredText:
            string;

        BalanceText:
            string;

        StatusColor:
            string;
    };


//===============================================================
// Salary Advances List (Human Resource > Payroll Management)
//
// Loaded once, filtered / paged in the page. Tabs All / Running /
// Recovered / Closed; summary line below the canvas.
//===============================================================

@Component(
{
    selector:'salary-advances-list',
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
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./salary-advances-list.html',
    styleUrl:'./salary-advances-list.css'
})
export class SalaryAdvancesList
implements OnInit
{
    private readonly service = inject(PayrollService);

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
        { id:'Running', label:'Running' },
        { id:'Recovered', label:'Recovered' },
        { id:'Closed', label:'Closed' }
    ];

    selectedTab =
        'all';

    searchText =
        '';

    loading =
        false;

    loadFailed =
        false;

    private all:
        AdvanceRow[] = [];

    rows:
        AdvanceRow[] = [];

    totalRecords =
        0;

    currentPage =
        1;

    pageSize =
        10;

    summaryItems:
        { label: string; value: string; tone: '' | 'ok' | 'bad' }[] = [];

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
        { header:'Employee', field:'EmployeeText', width:'250px', align:'left' },
        { header:'Type', field:'AdvanceType', width:'90px', align:'center' },
        { header:'Date', field:'DateText', width:'115px', align:'center' },
        { header:'Amount', field:'AmountText', width:'120px', align:'right' },
        { header:'Per Month', field:'InstallmentText', width:'110px', align:'right' },
        { header:'Recovered', field:'RecoveredText', width:'120px', align:'right' },
        { header:'Balance', field:'BalanceText', width:'120px', align:'right' },
        { header:'Status', field:'Status', width:'120px', align:'left', dotField:'StatusColor' },
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
            .getAdvances()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:rows =>
                {
                    this.all =
                        rows.map(x => ({
                            ...x,
                            EmployeeText:`${x.EmployeeCode}  ${x.EmployeeName}`,
                            DateText:payDayText(x.AdvanceDate),
                            AmountText:payMoney(x.Amount),
                            InstallmentText:payMoney(x.InstallmentAmount),
                            RecoveredText:payMoney(x.Recovered),
                            BalanceText:payMoney(x.Balance),
                            StatusColor:PAYROLL_STATUS_COLORS[x.Status] ?? '#64748b'
                        }));

                    this.loading = false;
                    this.apply();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.toast.error('Error', error?.error?.message ?? 'Salary advances could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        // search (the tab is applied after : the summary counts
        // every status)
        const base =
            this.all.filter(x =>
                !find || [x.Code, x.EmployeeCode, x.EmployeeName, x.DesignationName, x.BranchName, x.AdvanceType, x.DateText, x.Status, x.Reason, x.VoucherNo]
                    .some(v => (v ?? '').toLowerCase().includes(find)));

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

        const sum =
            (pick: (x: AdvanceRow) => number): string =>
                `Tk ${payMoney(base.reduce((total, x) => total + pick(x), 0))}`;

        this.summaryItems =
        [
            { label:'Total', value:base.length.toLocaleString('en-US'), tone:'' },
            { label:'Running', value:base.filter(x => x.Status === 'Running').length.toLocaleString('en-US'), tone:'' },
            { label:'Given', value:sum(x => x.Amount), tone:'' },
            { label:'Recovered', value:sum(x => x.Recovered), tone:'ok' },
            { label:'Balance', value:sum(x => x.Balance), tone:'bad' }
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
        // Newest advance first
    }

    add():
        void
    {
        void this.router.navigate(['../add'], { relativeTo:this.route });
    }

    view(row: AdvanceRow):
        void
    {
        void this.router.navigate(['../view', row.PublicId], { relativeTo:this.route });
    }

    edit(row: AdvanceRow):
        void
    {
        void this.router.navigate(['../edit', row.PublicId], { relativeTo:this.route });
    }

    refresh():
        void
    {
        this.load();
    }

    delete(row: AdvanceRow):
        void
    {
        if (row.Recovered > 0)
        {
            this.toast.error('Salary Advances', `${row.Code} is on a salary sheet : it cannot be deleted. Close it (Edit) to stop the recovery.`);
            return;
        }

        this.confirmDialog.open(
            'Delete Salary Advance',
            `Delete ${row.Code} : ${row.EmployeeName}, Tk ${row.AmountText}?`,
            () =>
                this.service.deleteAdvance(row.PublicId).subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Deleted', `${row.Code} was deleted.`);
                        this.load();
                    },
                    error:error =>
                        this.toast.error('Error', error?.error?.message ?? 'The salary advance could not be deleted.')
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
            'Restore Salary Advance',
            'Bring back the most recently deleted salary advance?',
            () =>
                this.service.restoreAdvance().subscribe(
                {
                    next:code =>
                    {
                        this.toast.success('Restored', code ? `${code} was restored.` : 'The salary advance was restored.');
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
            .getAdvanceHistory()
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
