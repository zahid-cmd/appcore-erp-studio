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
import { ListTableComponent, ListTableColumn, ListTableRowAction, ListTableRowActionEvent } from '../../../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../../../shared/components/controls/pagination/pagination';
import { HistoryDrawerComponent } from '../../../../../../shared/components/utilities/history-drawer/history-drawer';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogService } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ConfirmDialogComponent } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ProgressDialogComponent } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';

import
{
    AttendanceMonthRow,
    DailyAttendanceRow,
    attDayText,
    attMinutes
}
from '../../../models/attendance.model';

import
{
    AttendanceService
}
from '../../../services/attendance.service';

import
{
    HR_REPORT_PRINT_KEY,
    openHrPrint,
    saveHrReport
}
from '../../../../print/hr-print';


const MONTHS =
    ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type ListRow =
    AttendanceMonthRow
    &
    {
        // 3-2026-11 : the employee and the month (the link of the sheet)
        Key: string;
        MonthKey: string;
        MonthText: string;
        EmployeeText: string;
        PresentText: string;
        OvertimeText: string;
    };

const STATUS:
    Record<string, string> =
    { P:'Present', L:'Late', H:'Half Day', A:'Absent', LV:'Leave', WO:'Weekly Off', HD:'Holiday' };


//===============================================================
// Daily Attendance List (Human Resource > Attendance Management)
//
// A row for every employee's month that has attendance : the
// month, the employee and how the days are marked.
//   Add     opens the attendance sheet (By Month / By Day)
//   View    the employee's month, read only
//   Edit    the employee's month
//   Delete  the marks of that employee's month (days written by a
//           leave application stay)
//   Print   the attendance sheet of the employee's month, by the
//           Print Engine
//===============================================================

@Component(
{
    selector:'daily-attendance-list',
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
    templateUrl:'./daily-attendance-list.html',
    styleUrl:'./daily-attendance-list.css'
})
export class DailyAttendanceList
implements OnInit
{
    private readonly service = inject(AttendanceService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Month', field:'MonthText', width:'150px', align:'left' },
        { header:'Employee', field:'EmployeeText', width:'260px', align:'left' },
        { header:'Designation', field:'DesignationName', width:'190px', align:'left' },
        { header:'Branch', field:'BranchName', width:'170px', align:'left' },
        { header:'Days', field:'Days', width:'80px', align:'center' },
        { header:'Present', field:'PresentText', width:'120px', align:'center' },
        { header:'Half Day', field:'HalfDay', width:'90px', align:'center' },
        { header:'Absent', field:'Absent', width:'90px', align:'center' },
        { header:'Leave', field:'Leave', width:'80px', align:'center' },
        { header:'Off', field:'Off', width:'70px', align:'center' },
        { header:'OT (h)', field:'OvertimeText', width:'90px', align:'center' },
        { header:'Actions', field:'actions', type:'actions', width:'160px', align:'center' }
    ];

    readonly rowActions:
        ListTableRowAction[] =
    [
        { key:'print', icon:'fas fa-print', title:'Print the attendance sheet', tone:'primary' }
    ];

    //===========================================================
    // Tabs : the sheets of every month, of this month or of last
    // month (they set the Month dropdown; picking another month
    // there leaves no tab on)
    //===========================================================

    readonly tabs:
        ControlTab[] =
    [
        { id:'all', label:'All Attendance Sheets' },
        { id:'this', label:'This Month' },
        { id:'last', label:'Last Month' }
    ];

    // yyyy-MM of this month (0) or of the month before (-1)
    private monthOf(step: number): string
    {
        const now = new Date();

        const date = new Date(now.getFullYear(), now.getMonth() + step, 1);

        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    get selectedTab(): string
    {
        return !this.selectedMonth ? 'all'
            : this.selectedMonth === this.monthOf(0) ? 'this'
            : this.selectedMonth === this.monthOf(-1) ? 'last'
            : '';
    }

    onTab(value: string):
        void
    {
        this.selectedMonth =
            value === 'this' ? this.monthOf(0)
            : value === 'last' ? this.monthOf(-1)
            : '';

        this.currentPage = 1;
        this.apply();
    }

    monthItems:
        { label: string; value: string }[] =
    [
        { label:'All Months', value:'' }
    ];

    selectedMonth =
        '';

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
        ListRow[] = [];

    rows:
        ListRow[] = [];

    totalRecords =
        0;

    currentPage =
        1;

    pageSize =
        10;

    summaryItems:
        { label: string; value: string }[] = [];

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
            .getAttendanceMonths()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:rows =>
                {
                    this.all =
                        rows.map(x =>
                        {
                            const monthKey =
                                `${x.Year}-${String(x.Month).padStart(2, '0')}`;

                            return {
                                ...x,
                                Key:`${x.EmployeeId}-${monthKey}`,
                                MonthKey:monthKey,
                                MonthText:`${MONTHS[x.Month - 1] ?? ''} ${x.Year}`,
                                EmployeeText:`${x.Code}  ${x.FullName}`,
                                PresentText:x.Late > 0 ? `${x.Present + x.Late}  (${x.Late} late)` : String(x.Present),
                                OvertimeText:x.OvertimeHours ? String(x.OvertimeHours) : ''
                            };
                        });

                    const months =
                        [...new Map(this.all.map(x => [x.MonthKey, x.MonthText])).entries()];

                    this.monthItems =
                    [
                        { label:'All Months', value:'' },
                        ...months.map(([value, label]) => ({ label, value }))
                    ];

                    const branches =
                        [...new Map(this.all.filter(x => x.BranchId).map(x => [x.BranchId, x.BranchName])).entries()];

                    this.branchItems =
                    [
                        { label:'All Branches', value:0 },
                        ...branches.map(([value, label]) => ({ label, value }))
                    ];

                    // this month and last month are always on the list
                    for (const step of [0, -1])
                    {
                        const key = this.monthOf(step);

                        if (!this.monthItems.some(x => x.value === key))
                        {
                            this.monthItems.push({ label:`${MONTHS[Number(key.substring(5, 7)) - 1]} ${key.substring(0, 4)}`, value:key });
                        }
                    }

                    this.monthItems =
                    [
                        this.monthItems[0],
                        ...this.monthItems.slice(1).sort((a, b) => b.value.localeCompare(a.value))
                    ];

                    if (!this.monthItems.some(x => x.value === this.selectedMonth))
                    {
                        this.selectedMonth = '';
                    }

                    this.loading = false;
                    this.apply();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.toast.error('Error', error?.error?.message ?? 'The attendance list could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        const matched =
            this.all.filter(x =>
                (!this.selectedMonth || x.MonthKey === this.selectedMonth)
                && (!this.selectedBranch || x.BranchId === this.selectedBranch)
                && (!find || [x.Code, x.FullName, x.DesignationName, x.BranchName, x.MonthText].some(v => (v ?? '').toLowerCase().includes(find))));

        this.totalRecords = matched.length;

        const pages = Math.max(1, Math.ceil(matched.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        const start = (this.currentPage - 1) * this.pageSize;

        this.rows = matched.slice(start, start + this.pageSize);

        const sum =
            (field: 'Days' | 'Present' | 'Late' | 'Absent' | 'OvertimeHours'): string =>
                matched.reduce((total, x) => total + (Number(x[field]) || 0), 0).toLocaleString('en-US');

        this.summaryItems =
        [
            { label:'Sheets', value:matched.length.toLocaleString('en-US') },
            { label:'Days Marked', value:sum('Days') },
            { label:'Present', value:(matched.reduce((total, x) => total + x.Present + x.Late, 0)).toLocaleString('en-US') },
            { label:'Absent', value:sum('Absent') },
            { label:'Overtime Hours', value:sum('OvertimeHours') }
        ];

        this.cdr.detectChanges();
    }

    onMonth(value: any):
        void
    {
        this.selectedMonth = String(value ?? '');
        this.currentPage = 1;
        this.apply();
    }

    onBranch(value: any):
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
        // The newest month stays first
    }

    add():
        void
    {
        void this.router.navigate(['../add'], { relativeTo:this.route });
    }

    view(row: ListRow):
        void
    {
        void this.router.navigate(['../view', row.Key], { relativeTo:this.route });
    }

    edit(row: ListRow):
        void
    {
        void this.router.navigate(['../edit', row.Key], { relativeTo:this.route });
    }

    refresh():
        void
    {
        this.load();
    }

    delete(row: ListRow):
        void
    {
        this.confirmDialog.open(
            'Delete Attendance',
            `Delete the attendance of ${row.FullName} for ${row.MonthText} (${row.Days} day(s))? Days written by a leave application stay. Payroll treats a day without a mark as absent.`,
            () =>
                this.service.deleteEmployeeMonth(row.EmployeeId, row.Year, row.Month).subscribe(
                {
                    next:deleted =>
                    {
                        this.toast.success('Deleted', `${row.FullName}, ${row.MonthText} : ${deleted} day(s) deleted.`);
                        this.load();
                    },
                    error:error =>
                        this.toast.error('Error', error?.error?.message ?? 'The attendance could not be deleted.')
                }),
            'Delete',
            'Keep',
            'danger'
        );
    }

    onRowAction(event: ListTableRowActionEvent):
        void
    {
        if (event.key === 'print')
        {
            this.print(event.row as ListRow);
        }
    }

    // The attendance sheet of the employee's month : the Print
    // Engine viewer (company header, PDF, Excel)
    private print(row: ListRow):
        void
    {
        this.service
            .getEmployeeMonth(row.Year, row.Month, row.EmployeeId, 0)
            .subscribe(
            {
                next:sheet =>
                {
                    const offDay =
                        (d: DailyAttendanceRow): boolean => d.IsWeeklyOff || !!d.HolidayName;

                    const otDay =
                        (d: DailyAttendanceRow): number =>
                            !d.OvertimeAllowed || !offDay(d) ? 0
                            : d.Status === 'P' || d.Status === 'L' ? 1
                            : d.Status === 'H' ? 0.5
                            : 0;

                    const time =
                        (value: string): string =>
                        {
                            const minutes = attMinutes(value);

                            if (minutes < 0)
                            {
                                return '';
                            }

                            const h = Math.floor(minutes / 60);

                            return `${String(h % 12 || 12).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
                        };

                    const days =
                        sheet.Days.filter(d => d.IsSaved);

                    const token =
                        saveHrReport(
                        {
                            title:'Attendance Sheet',
                            subtitle:`${row.MonthText} · ${row.EmployeeText}`,
                            meta:
                            [
                                { label:'Designation', value:sheet.DesignationName },
                                { label:'Branch', value:sheet.BranchName },
                                { label:'Shift', value:`${sheet.ShiftName}  ${sheet.ShiftStart} - ${sheet.ShiftEnd}` }
                            ],
                            band:
                            [
                                { label:'Days Marked', value:String(row.Days) },
                                { label:'Present', value:row.PresentText },
                                { label:'Half Day', value:String(row.HalfDay) },
                                { label:'Absent', value:String(row.Absent) },
                                { label:'Leave', value:String(row.Leave) },
                                { label:'Off', value:String(row.Off) },
                                { label:'OT Hours', value:String(row.OvertimeHours || 0) },
                                { label:'OT Days', value:String(days.reduce((total, d) => total + otDay(d), 0)) }
                            ],
                            columns:
                            [
                                { header:'Date', kind:'center' },
                                { header:'Day', kind:'text' },
                                { header:'Status', kind:'text' },
                                { header:'In', kind:'center' },
                                { header:'Out', kind:'center' },
                                { header:'Late (min)', kind:'num' },
                                { header:'OT (h)', kind:'num' },
                                { header:'OT Day', kind:'num' },
                                { header:'Remarks', kind:'text' }
                            ],
                            rows:sheet.Days.map(d =>
                            [
                                attDayText(d.Date ?? ''),
                                (d.DayName ?? '') + (d.HolidayName ? `  (${d.HolidayName})` : d.IsWeeklyOff ? '  (weekly holiday)' : ''),
                                d.IsSaved ? STATUS[d.Status] ?? d.Status : 'Not marked',
                                d.IsSaved ? time(d.InTime) : '',
                                d.IsSaved ? time(d.OutTime) : '',
                                d.IsSaved && d.LateMinutes ? String(d.LateMinutes) : '',
                                d.IsSaved && d.OvertimeHours ? String(d.OvertimeHours) : '',
                                d.IsSaved && otDay(d) ? String(otDay(d)) : '',
                                d.IsSaved ? d.Remarks : ''
                            ]),
                            footer:null,
                            note:'Not marked : no attendance is saved for the day (payroll treats it as absent).'
                        });

                    const problem =
                        openHrPrint(this.router, HR_REPORT_PRINT_KEY, token, 'report');

                    if (problem)
                    {
                        this.toast.error('Print', problem);
                    }
                },
                error:error =>
                    this.toast.error('Print', error?.error?.message ?? 'The attendance sheet could not be loaded.')
            });
    }

    openHistory():
        void
    {
        this.service
            .getDailyHistory()
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
