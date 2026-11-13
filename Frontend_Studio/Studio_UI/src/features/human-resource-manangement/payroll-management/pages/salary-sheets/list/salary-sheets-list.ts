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
    PAYROLL_STATUS_COLORS,
    SalarySheetListItem,
    payMoney,
    payMonthText
}
from '../../../models/payroll.model';

import
{
    PayrollService
}
from '../../../services/payroll.service';


type SheetRow =
    SalarySheetListItem
    &
    {
        MonthText:
            string;

        GrossText:
            string;

        DeductionText:
            string;

        NetText:
            string;

        PaidText:
            string;

        StatusColor:
            string;
    };


//===============================================================
// Salary Sheets List (Human Resource > Payroll Management)
//
// One sheet per branch per month. Loaded once, filtered / paged
// in the page. Tabs All / Draft / Approved / Posted; Branch
// filter on the toolbar right; summary line below the canvas.
// Add opens Generate; View / Edit open the sheet.
//===============================================================

@Component(
{
    selector:'salary-sheets-list',
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
    templateUrl:'./salary-sheets-list.html',
    styleUrl:'./salary-sheets-list.css'
})
export class SalarySheetsList
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
        { id:'Draft', label:'Draft' },
        { id:'Approved', label:'Approved' },
        { id:'Posted', label:'Posted' }
    ];

    selectedTab =
        'all';

    branchItems:
        { label: string; value: number }[] =
    [
        { label:'All Branches', value:0 }
    ];

    selectedBranch =
        0;

    searchText =
        '';

    loading =
        false;

    loadFailed =
        false;

    private all:
        SheetRow[] = [];

    rows:
        SheetRow[] = [];

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
        { header:'Month', field:'MonthText', width:'150px', align:'left' },
        { header:'Branch', field:'BranchName', width:'190px', align:'left' },
        { header:'Employees', field:'EmployeeCount', width:'95px', align:'center' },
        { header:'Gross', field:'GrossText', width:'130px', align:'right' },
        { header:'Deductions', field:'DeductionText', width:'125px', align:'right' },
        { header:'Net Pay', field:'NetText', width:'135px', align:'right' },
        { header:'Paid', field:'PaidText', width:'85px', align:'center' },
        { header:'Status', field:'Status', width:'115px', align:'left', dotField:'StatusColor' },
        { header:'Journal', field:'JournalVoucherNo', width:'130px', align:'center' },
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
            .getSheets()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:rows =>
                {
                    this.all =
                        rows.map(x => ({
                            ...x,
                            MonthText:payMonthText(x.Year, x.Month),
                            GrossText:payMoney(x.TotalGross),
                            DeductionText:payMoney(x.TotalDeductions),
                            NetText:payMoney(x.TotalNet),
                            PaidText:x.Status === 'Posted' ? `${x.PaidCount} / ${x.EmployeeCount}` : '',
                            StatusColor:PAYROLL_STATUS_COLORS[x.Status] ?? '#64748b'
                        }));

                    this.branchItems =
                    [
                        { label:'All Branches', value:0 },
                        ...[...new Map(this.all.map(x => [x.BranchId, x.BranchName])).entries()]
                            .map(([value, label]) => ({ label:label || `#${value}`, value }))
                            .sort((a, b) => a.label.localeCompare(b.label))
                    ];

                    if (!this.branchItems.some(x => x.value === this.selectedBranch))
                    {
                        this.selectedBranch = 0;
                    }

                    this.loading = false;
                    this.apply();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.toast.error('Error', error?.error?.message ?? 'Salary sheets could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        // search + branch (the tab is applied after : the summary
        // counts every status)
        const base =
            this.all.filter(x =>
                (!this.selectedBranch || x.BranchId === this.selectedBranch)
                &&
                (!find || [x.Code, x.MonthText, x.BranchName, x.Status, x.JournalVoucherNo]
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

        const posted =
            base.filter(x => x.Status === 'Posted');

        this.summaryItems =
        [
            { label:'Sheets', value:base.length.toLocaleString('en-US'), tone:'' },
            { label:'Draft', value:count('Draft'), tone:'' },
            { label:'Approved', value:count('Approved'), tone:'' },
            { label:'Posted', value:count('Posted'), tone:'ok' },
            { label:'Net Pay Posted', value:`Tk ${payMoney(posted.reduce((sum, x) => sum + x.TotalNet, 0))}`, tone:'' }
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

    onBranchChange(value: any):
        void
    {
        this.selectedBranch = Number(value) || 0;
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
        // Newest month first
    }

    add():
        void
    {
        void this.router.navigate(['../add'], { relativeTo:this.route });
    }

    // View and Edit both open the sheet : what can be done there
    // depends on its status
    open(row: SheetRow):
        void
    {
        void this.router.navigate(['../sheet', row.PublicId], { relativeTo:this.route });
    }

    refresh():
        void
    {
        this.load();
    }

    delete(row: SheetRow):
        void
    {
        if (row.Status !== 'Draft')
        {
            this.toast.error('Salary Sheets', `${row.Code} is ${row.Status} : only a Draft sheet can be deleted. Open it and take it back to Draft first.`);
            return;
        }

        this.confirmDialog.open(
            'Delete Salary Sheet',
            `Delete ${row.Code} : ${row.MonthText}, ${row.BranchName}? The advance installments it took are given back.`,
            () =>
                this.service.deleteSheet(row.PublicId).subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Deleted', `${row.Code} was deleted.`);
                        this.load();
                    },
                    error:error =>
                        this.toast.error('Error', error?.error?.message ?? 'The salary sheet could not be deleted.')
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
            'Restore Salary Sheet',
            'Bring back the most recently deleted salary sheet? It comes back as a Draft, worked out again.',
            () =>
                this.service.restoreSheet().subscribe(
                {
                    next:code =>
                    {
                        this.toast.success('Restored', code ? `${code} was restored as a Draft.` : 'The salary sheet was restored.');
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
            .getSheetHistory()
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
