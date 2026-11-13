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
    EmployeeListItem
}
from '../../../models/employees.model';

import
{
    EmployeesService
}
from '../../../services/employees.service';


type EmployeeRow =
    EmployeeListItem
    &
    {
        JoiningText:
            string;

        GrossText:
            string;

        LoginText:
            string;
    };

const MONTHS =
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// yyyy-MM-dd -> 13 Nov 2026
function dayText(value: string): string
{
    const m =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

    return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : '';
}


//===============================================================
// Employee Profiles List (Human Resource > Employee Management)
//
// Loaded once, filtered / paged in the page. Tabs All / Active /
// Inactive; Branch and Department filters on the toolbar right;
// summary line below the canvas.
//===============================================================

@Component(
{
    selector:'employees-list',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
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
    templateUrl:'./employees-list.html',
    styleUrl:'./employees-list.css'
})
export class EmployeesList
implements OnInit
{
    private readonly service = inject(EmployeesService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    readonly statusItems =
    [
        { label:'All Status', value:'all' },
        { label:'Active', value:'active' },
        { label:'Inactive', value:'inactive' }
    ];

    selectedTab =
        'all';

    branchItems:
        { label: string; value: number }[] =
    [
        { label:'All Branches', value:0 }
    ];

    departmentItems:
        { label: string; value: number }[] =
    [
        { label:'All Departments', value:0 }
    ];

    selectedBranch =
        0;

    selectedDepartment =
        0;

    searchText =
        '';

    loading =
        false;

    loadFailed =
        false;

    private all:
        EmployeeRow[] = [];

    rows:
        EmployeeRow[] = [];

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

    historyTitle =
        'Employee Profile History';

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
        { header:'Employee Name', field:'FullName', width:'220px', align:'left' },
        { header:'Mobile', field:'MobileNo', width:'130px', align:'center' },
        { header:'Designation', field:'DesignationName', width:'170px', align:'left' },
        { header:'Department', field:'DepartmentName', width:'160px', align:'left' },
        { header:'Branch', field:'BranchName', width:'160px', align:'left' },
        { header:'Joined', field:'JoiningText', width:'120px', align:'center' },
        { header:'Gross Salary', field:'GrossText', width:'130px', align:'right' },
        { header:'Status', field:'IsActive', type:'status', width:'110px', align:'center' },
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
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:rows =>
                {
                    this.all =
                        rows.map(x => ({
                            ...x,
                            JoiningText:dayText(x.JoiningDate),
                            GrossText:x.GrossSalary.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }),
                            LoginText:x.HasLogin ? 'login' : ''
                        }));

                    this.buildFilters();

                    this.loading = false;
                    this.apply();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.toast.error('Error', error?.error?.message ?? 'Employee profiles could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    // Branches and departments that have employees
    private buildFilters():
        void
    {
        const distinct =
            (id: (x: EmployeeRow) => number, name: (x: EmployeeRow) => string) =>
                [...new Map(this.all.filter(x => id(x) > 0).map(x => [id(x), name(x)])).entries()]
                    .map(([value, label]) => ({ label:label || `#${value}`, value }))
                    .sort((a, b) => a.label.localeCompare(b.label));

        this.branchItems =
        [
            { label:'All Branches', value:0 },
            ...distinct(x => x.BranchId, x => x.BranchName)
        ];

        this.departmentItems =
        [
            { label:'All Departments', value:0 },
            ...distinct(x => x.DepartmentId, x => x.DepartmentName)
        ];

        if (!this.branchItems.some(x => x.value === this.selectedBranch))
        {
            this.selectedBranch = 0;
        }

        if (!this.departmentItems.some(x => x.value === this.selectedDepartment))
        {
            this.selectedDepartment = 0;
        }
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        // search + branch + department (the tab is applied after :
        // the summary counts all statuses)
        const base =
            this.all.filter(x =>
                (!this.selectedBranch || x.BranchId === this.selectedBranch)
                &&
                (!this.selectedDepartment || x.DepartmentId === this.selectedDepartment)
                &&
                (!find || [x.Code, x.FullName, x.MobileNo, x.DesignationName, x.DepartmentName, x.BranchName, x.ShiftName, x.EmploymentType, x.JoiningText]
                    .some(v => (v ?? '').toLowerCase().includes(find))));

        const matched =
            base.filter(x =>
                this.selectedTab === 'all' || (this.selectedTab === 'active') === x.IsActive);

        this.totalRecords = matched.length;

        const pages = Math.max(1, Math.ceil(matched.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        const start = (this.currentPage - 1) * this.pageSize;

        this.rows = matched.slice(start, start + this.pageSize);

        const count =
            (value: number): string => value.toLocaleString('en-US');

        const active =
            base.filter(x => x.IsActive);

        this.summaryItems =
        [
            { label:'Total', value:count(base.length), tone:'' },
            { label:'Active', value:count(active.length), tone:'ok' },
            { label:'Inactive', value:count(base.length - active.length), tone:'bad' },
            { label:'With Login', value:count(base.filter(x => x.HasLogin).length), tone:'' },
            {
                label:'Monthly Gross (active)',
                value:`Tk ${active.reduce((sum, x) => sum + x.GrossSalary, 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}`,
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

    onBranchChange(value: any):
        void
    {
        this.selectedBranch = Number(value) || 0;
        this.currentPage = 1;
        this.apply();
    }

    onDepartmentChange(value: any):
        void
    {
        this.selectedDepartment = Number(value) || 0;
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
        // The list stays in code order
    }

    add():
        void
    {
        void this.router.navigate(['../add'], { relativeTo:this.route });
    }

    view(row: EmployeeRow):
        void
    {
        void this.router.navigate(['../view', row.PublicId], { relativeTo:this.route });
    }

    edit(row: EmployeeRow):
        void
    {
        void this.router.navigate(['../edit', row.PublicId], { relativeTo:this.route });
    }

    refresh():
        void
    {
        this.load();
    }

    delete(row: EmployeeRow):
        void
    {
        this.confirmDialog.open(
            'Delete Employee Profile',
            `Delete ${row.Code} ${row.FullName}? For someone who has left, make the employee Inactive instead : the record is then kept for old salary sheets.`,
            () =>
                this.service.delete(row.PublicId).subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Deleted', `${row.Code} was deleted.`);
                        this.load();
                    },
                    error:error =>
                        this.toast.error('Error', error?.error?.message ?? 'The employee could not be deleted.')
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
            'Restore Employee Profile',
            'Bring back the most recently deleted employee?',
            () =>
                this.service.restore().subscribe(
                {
                    next:code =>
                    {
                        this.toast.success('Restored', code ? `${code} was restored.` : 'The employee was restored.');
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
            .getHistory()
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
