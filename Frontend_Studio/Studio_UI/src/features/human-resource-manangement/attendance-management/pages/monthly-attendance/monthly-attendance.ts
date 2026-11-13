//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    ChangeDetectorRef,
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

import { PageHeaderComponent } from '../../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent } from '../../../../../shared/components/layout/page-canvas/page-canvas';
import { EmptyStateComponent } from '../../../../../shared/components/layout/empty-state/empty-state';
import { SearchDropdownComponent } from '../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { SearchBoxComponent } from '../../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../../shared/components/utilities/command-center/command-center';
import { ToastComponent } from '../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../shared/components/utilities/toast/toast.service';

import
{
    ATT_STATUS_NAMES,
    MonthlyAttendance,
    MonthlyAttendanceDay,
    MonthlyAttendanceRow
}
from '../../models/attendance.model';

import
{
    AttendanceService
}
from '../../services/attendance.service';


const MONTH_NAMES =
    ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];


//===============================================================
// Monthly Attendance (Human Resource > Attendance Management)
//
// The month of a branch : every employee, every day, with the
// totals payroll uses. Read only : a click on a day opens Daily
// Attendance on that day. A day without a mark is a holiday, a
// weekly off day or "not marked" (NM). Summary line below the
// canvas.
//===============================================================

@Component(
{
    selector:'monthly-attendance',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        EmptyStateComponent,
        SearchDropdownComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ToastComponent
    ],
    templateUrl:'./monthly-attendance.html',
    styleUrl:'./monthly-attendance.css'
})
export class MonthlyAttendancePage
implements OnInit
{
    private readonly service = inject(AttendanceService);

    private readonly router = inject(Router);

    private readonly toast = inject(ToastService);

    private readonly cdr = inject(ChangeDetectorRef);

    readonly legend =
    [
        { kind:'P', text:'P', name:'Present' },
        { kind:'L', text:'L', name:'Late' },
        { kind:'H', text:'H', name:'Half Day' },
        { kind:'A', text:'A', name:'Absent' },
        { kind:'LV', text:'CL', name:'Leave (short name)' },
        { kind:'WO', text:'WO', name:'Weekly Off' },
        { kind:'HD', text:'HD', name:'Holiday' },
        { kind:'NM', text:'NM', name:'Not marked' }
    ];

    year =
        new Date().getFullYear();

    month =
        new Date().getMonth() + 1;

    branchId =
        0;

    branchItems:
        { label: string; value: number }[] =
    [
        { label:'All Branches', value:0 }
    ];

    days:
        MonthlyAttendanceDay[] = [];

    rows:
        MonthlyAttendanceRow[] = [];

    searchText =
        '';

    loading =
        false;

    loadFailed =
        false;

    // yyyy-MM of the month box
    get monthValue(): string
    {
        return `${this.year}-${String(this.month).padStart(2, '0')}`;
    }

    get monthText(): string
    {
        return `${MONTH_NAMES[this.month - 1]} ${this.year}`;
    }

    get isCurrentMonth(): boolean
    {
        const now = new Date();

        return this.year === now.getFullYear() && this.month === now.getMonth() + 1;
    }

    get visibleRows(): MonthlyAttendanceRow[]
    {
        const find =
            this.searchText.trim().toLowerCase();

        return !find
            ? this.rows
            : this.rows.filter(r =>
                [r.Code, r.FullName, r.DesignationName].some(v => (v ?? '').toLowerCase().includes(find)));
    }

    get summaryItems(): { label: string; value: string; tone: '' | 'ok' | 'bad' | 'warn' }[]
    {
        const sum =
            (pick: (r: MonthlyAttendanceRow) => number): string =>
                this.rows.reduce((total, r) => total + pick(r), 0).toLocaleString('en-US', { maximumFractionDigits:2 });

        return [
            { label:'Employees', value:this.rows.length.toLocaleString('en-US'), tone:'' },
            { label:'Present', value:sum(r => r.Present + r.Late), tone:'ok' },
            { label:'Late', value:sum(r => r.Late), tone:'warn' },
            { label:'Absent', value:sum(r => r.Absent), tone:'bad' },
            { label:'Leave', value:sum(r => r.PaidLeave + r.UnpaidLeave), tone:'' },
            { label:'Not Marked', value:sum(r => r.NotMarked), tone:'warn' },
            { label:'Overtime (h)', value:sum(r => r.OvertimeHours), tone:'' }
        ];
    }

    // The centred state shown instead of the month : loading,
    // failed, no employees, or nothing found by the search
    get emptyState(): { icon: string; title: string; subtitle: string } | null
    {
        if (this.loading)
        {
            return this.rows.length > 0
                ? null
                : { icon:'fas fa-spinner fa-spin', title:'Loading', subtitle:`Loading ${this.monthText}...` };
        }

        if (this.visibleRows.length > 0)
        {
            return null;
        }

        if (this.loadFailed)
        {
            return { icon:'fas fa-triangle-exclamation', title:'Unable to Load Data', subtitle:'An error occurred while loading the attendance. Press Refresh to try again.' };
        }

        if (this.rows.length === 0)
        {
            return { icon:'fas fa-users-slash', title:`No Employees in ${this.monthText}`, subtitle:'Employees who had joined by the end of the month are shown here.' };
        }

        return { icon:'fas fa-magnifying-glass', title:'No Employee Found', subtitle:'No employee matches the search.' };
    }

    number(value: number): string
    {
        return value ? (Number(value) || 0).toLocaleString('en-US', { maximumFractionDigits:2 }) : '';
    }

    cellTitle(row: MonthlyAttendanceRow, index: number): string
    {
        const kind = row.Kinds[index] ?? '';
        const day = this.days[index];

        if (!day || !kind || kind === '-')
        {
            return kind === '-' ? 'Before joining' : '';
        }

        const name =
            kind === 'HD' && day.HolidayName ? `Holiday : ${day.HolidayName}`
            : kind === 'LV' ? `Leave (${row.Cells[index]})`
            : ATT_STATUS_NAMES[kind] ?? kind;

        return `${day.Day} ${MONTH_NAMES[this.month - 1]} : ${name}`;
    }

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
            .getMonthly(this.year, this.month, this.branchId)
            .subscribe(
            {
                next:(sheet: MonthlyAttendance) =>
                {
                    this.year = sheet.Year || this.year;
                    this.month = sheet.Month || this.month;
                    this.days = sheet.Days;
                    this.rows = sheet.Rows;

                    this.branchItems =
                    [
                        { label:'All Branches', value:0 },
                        ...sheet.Branches.map(b => ({ label:b.Name, value:b.Id }))
                    ];

                    this.loading = false;
                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.days = [];
                    this.rows = [];
                    this.toast.error('Error', error?.error?.message ?? 'The attendance of the month could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    onMonthInput(event: Event):
        void
    {
        const m =
            /^(\d{4})-(\d{2})$/.exec((event.target as HTMLInputElement).value ?? '');

        if (!m)
        {
            return;
        }

        this.year = Number(m[1]);
        this.month = Number(m[2]);
        this.load();
    }

    moveMonth(step: number):
        void
    {
        const date =
            new Date(this.year, this.month - 1 + step, 1);

        this.year = date.getFullYear();
        this.month = date.getMonth() + 1;
        this.load();
    }

    thisMonth():
        void
    {
        const now = new Date();

        this.year = now.getFullYear();
        this.month = now.getMonth() + 1;
        this.load();
    }

    onBranchChange(value: any):
        void
    {
        this.branchId = Number(value) || 0;
        this.load();
    }

    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';
        this.cdr.detectChanges();
    }

    refresh():
        void
    {
        this.load();
    }

    // Opens Daily Attendance on the day
    openDay(day: MonthlyAttendanceDay):
        void
    {
        const date =
            `${this.year}-${String(this.month).padStart(2, '0')}-${String(day.Day).padStart(2, '0')}`;

        void this.router.navigate(
            ['/human-resource-manangement/attendance-management/daily-attendance/add'],
            { queryParams:{ date } });
    }
}
