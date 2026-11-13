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
    ActivatedRoute,
    Router
}
from '@angular/router';

import { ControlTab, ControlTabsComponent } from '../../../../../shared/components/controls/control-tabs/control-tabs';
import { PageHeaderComponent } from '../../../../../shared/components/layout/page-header/page-header';
import { DatepickerComponent } from '../../../../../shared/components/controls/datepicker/datepicker';
import { hrDateEvent, hrToDate } from '../../../services/hr-date';
import { PageToolbarComponent } from '../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent } from '../../../../../shared/components/layout/page-canvas/page-canvas';
import { EmptyStateComponent } from '../../../../../shared/components/layout/empty-state/empty-state';
import { SearchDropdownComponent } from '../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { SearchBoxComponent } from '../../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../../shared/components/utilities/command-center/command-center';
import { HistoryDrawerComponent } from '../../../../../shared/components/utilities/history-drawer/history-drawer';
import { ToastComponent } from '../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogService } from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ConfirmDialogComponent } from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ProgressDialogComponent } from '../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { HrProgressService } from '../../../services/hr-progress.service';

import
{
    AttendanceLookup,
    DailyAttendance,
    DailyAttendanceRow,
    EmployeeMonth,
    attAddDays,
    attDayText,
    attIsoDay,
    attMinutes
}
from '../../models/attendance.model';

import
{
    AttendanceService
}
from '../../services/attendance.service';


interface StatusButton
{
    code: string;
    label: string;
    title: string;
}


//===============================================================
// Daily Attendance (Human Resource > Attendance Management)
//
// One day of a branch on one screen. Each employee is marked
// Present, Half Day, Absent, Leave or Off; Present with an in
// time after the shift start + grace is saved as Late. A click
// on the status that is already on takes the mark off. A leave
// day written by an approved leave application is fixed here.
// Summary line below the canvas.
//===============================================================

@Component(
{
    selector:'daily-attendance',
    standalone:true,
    imports:
    [
        CommonModule,
        DatepickerComponent,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        EmptyStateComponent,
        SearchDropdownComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        HistoryDrawerComponent,
        ControlTabsComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./daily-attendance.html',
    styleUrl:'./daily-attendance.css'
})
export class DailyAttendancePage
implements OnInit
{
    // The shared date picker works with a Date; the page keeps
    // yyyy-MM-dd text
    readonly asDate = hrToDate;

    readonly dateEvent = hrDateEvent;

    private readonly service = inject(AttendanceService);

    private readonly route = inject(ActivatedRoute);

    private readonly router = inject(Router);

    // add (the list's Add), edit / view (an employee's month from
    // the list)
    mode:
        'add' | 'edit' | 'view' =
        'add';

    get isViewMode(): boolean
    {
        return this.mode === 'view';
    }

    get pageTitle(): string
    {
        return this.mode === 'add' ? 'Daily Attendance'
            : `${this.mode === 'edit' ? 'Update' : 'View'} Attendance`;
    }

    private goToList():
        void
    {
        void this.router.navigate(['/human-resource-manangement/attendance-management/daily-attendance/list']);
    }

    onBackToList():
        void
    {
        if (this.isSaving)
        {
            return;
        }

        if (this.isViewMode)
        {
            this.goToList();
            return;
        }

        this.leave(() => this.goToList());
    }

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progressDialog = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    readonly today =
        attIsoDay(new Date());

    //===========================================================
    // Two views
    //   By Month  one employee, a row for every day of the month :
    //             the whole month is typed in one go
    //   By Day    one day, a row for every employee
    //===========================================================

    readonly viewTabs:
        ControlTab[] =
    [
        { id:'month', label:'By Month' },
        { id:'day', label:'By Day' }
    ];

    view:
        'month' | 'day' =
        'month';

    get isMonth(): boolean
    {
        return this.view === 'month';
    }

    // By Month : the employee of the sheet
    employeeId =
        0;

    employeeItems:
        { label: string; value: number }[] = [];

    // What the server holds of each day (by date) : a day is sent
    // when it differs from this, or was never saved
    private serverDays =
        new Map<string, string>();

    onView(value: string):
        void
    {
        const view =
            value === 'day' ? 'day' : 'month';

        if (view === this.view)
        {
            return;
        }

        this.leave(() =>
        {
            this.view = view;
            this.rows = [];
            this.load();
        });
    }

    onEmployee(value: any):
        void
    {
        const employeeId =
            Number(value) || 0;

        if (!employeeId || employeeId === this.employeeId)
        {
            return;
        }

        this.leave(() =>
        {
            this.employeeId = employeeId;
            this.load();
        });
    }

    //===========================================================
    // In / Out from the shift : a tick on the column header fills
    // the In (or Out) time of every worked row that has none with
    // the start (or end) of the employee's shift. A row can still
    // be changed. The tick off takes back the times it filled.
    //===========================================================

    fillIn =
        false;

    fillOut =
        false;

    // The time the tick fills : the shift of the sheet's employee
    // (By Month); By Day each row has its own shift
    fillText(field: 'InTime' | 'OutTime'): string
    {
        if (!this.isMonth)
        {
            return 'shift';
        }

        const row = this.rows[0];

        return (field === 'InTime' ? row?.ShiftStart : row?.ShiftEnd) || 'shift';
    }

    private shiftTime(row: DailyAttendanceRow, field: 'InTime' | 'OutTime'): string
    {
        const time =
            field === 'InTime' ? row.ShiftStart : row.ShiftEnd;

        return /^\d{2}:\d{2}$/.test(time ?? '') ? time : '';
    }

    // Fills one row from the shift when its tick is on
    private fillRow(row: DailyAttendanceRow):
        void
    {
        if (!this.isWorked(row) || this.isLocked(row))
        {
            return;
        }

        if (this.fillIn && !row.InTime)
        {
            row.InTime = this.shiftTime(row, 'InTime');
        }

        if (this.fillOut && !row.OutTime)
        {
            row.OutTime = this.shiftTime(row, 'OutTime');
        }
    }

    onFill(field: 'InTime' | 'OutTime', event: Event):
        void
    {
        const on =
            (event.target as HTMLInputElement).checked;

        if (field === 'InTime')
        {
            this.fillIn = on;
        }
        else
        {
            this.fillOut = on;
        }

        for (const row of this.rows)
        {
            if (!this.isWorked(row) || this.isLocked(row))
            {
                continue;
            }

            if (on)
            {
                if (!row[field])
                {
                    row[field] = this.shiftTime(row, field);
                }
            }
            else if (row[field] === this.shiftTime(row, field) && !this.wasSaved(row, field))
            {
                // off : the times the tick filled go (a time that is
                // saved stays)
                row[field] = '';
            }
        }

        this.changed();
    }

    // The time of the row is what the server holds
    private wasSaved(row: DailyAttendanceRow, field: 'InTime' | 'OutTime'): boolean
    {
        const before =
            this.loadedTimes.get(this.rowKey(row));

        return !!before && before[field] === row[field] && !!row[field];
    }

    // The In / Out of each row as loaded
    private loadedTimes =
        new Map<string, { InTime: string; OutTime: string }>();

    // The key of a row : the day (By Month) or the employee
    rowKey(row: DailyAttendanceRow): string
    {
        return row.Date || String(row.EmployeeId);
    }

    // 2026-11-07 : 07 Nov
    dayLabel(row: DailyAttendanceRow): string
    {
        return attDayText(row.Date ?? '');
    }

    // Enter in an In / Out box goes to the next box (In, Out, the
    // next row's In ...), so a month is typed without the mouse
    nextBox(event: Event):
        void
    {
        event.preventDefault();

        const box =
            event.target as HTMLInputElement;

        const boxes =
            Array.from(document.querySelectorAll<HTMLInputElement>('.da-table input.da-time:not(:disabled)'));

        const next =
            boxes[boxes.indexOf(box) + 1];

        // the value typed is taken first
        box.dispatchEvent(new Event('change'));

        if (next)
        {
            next.focus();
            next.scrollIntoView({ block:'nearest' });
        }
        else
        {
            box.blur();
        }
    }

    date =
        this.today;

    branchId =
        0;

    branchItems:
        { label: string; value: number }[] =
    [
        { label:'All Branches', value:0 }
    ];

    leaveTypes:
        AttendanceLookup[] = [];

    dayName =
        '';

    holidayName =
        '';

    rows:
        DailyAttendanceRow[] = [];

    searchText =
        '';

    loading =
        false;

    loadFailed =
        false;

    isSaving =
        false;

    hasChanges =
        false;

    private initialJson =
        '';

    historyOpened =
        false;

    historyItems:
        any[] = [];

    get dateText(): string
    {
        return attDayText(this.date);
    }

    //===========================================================
    // The month : a dropdown on the toolbar picks it, and a strip
    // under the toolbar shows its days (a click opens that day)
    //===========================================================

    // yyyy-MM of the day on screen
    get month(): string
    {
        return this.date.substring(0, 7);
    }

    // This month and the 23 before it, newest first (and the month
    // on screen when it is older)
    get monthItems(): { label: string; value: string }[]
    {
        const names =
            ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        const year = Number(this.today.substring(0, 4));

        const month = Number(this.today.substring(5, 7));

        const items:
            { label: string; value: string }[] = [];

        for (let i = 0; i < 24; i++)
        {
            const index = year * 12 + (month - 1) - i;

            const y = Math.floor(index / 12);

            const m = index % 12;

            items.push({ label:`${names[m]} ${y}`, value:`${y}-${String(m + 1).padStart(2, '0')}` });
        }

        if (!items.some(x => x.value === this.month))
        {
            const y = Number(this.month.substring(0, 4));

            const m = Number(this.month.substring(5, 7));

            items.push({ label:`${names[m - 1] ?? ''} ${y}`, value:this.month });
        }

        return items;
    }

    // The days of the month on screen
    get monthDays(): { date: string; day: number; week: string; future: boolean }[]
    {
        const weeks =
            ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        const y = Number(this.month.substring(0, 4));

        const m = Number(this.month.substring(5, 7));

        const count =
            new Date(y, m, 0).getDate();

        const days:
            { date: string; day: number; week: string; future: boolean }[] = [];

        for (let d = 1; d <= count; d++)
        {
            const date =
                `${this.month}-${String(d).padStart(2, '0')}`;

            days.push({ date, day:d, week:weeks[new Date(y, m - 1, d).getDay()], future:date > this.today });
        }

        return days;
    }

    // Another month : today when it is this month, otherwise the
    // first day of the month
    onMonth(value: any):
        void
    {
        const month =
            String(value ?? '');

        if (!/^\d{4}-\d{2}$/.test(month) || month === this.month)
        {
            return;
        }

        this.goToDate(month === this.today.substring(0, 7) ? this.today : `${month}-01`);
    }

    get isFuture(): boolean
    {
        return this.date > this.today;
    }

    // The buttons of a row. Off is a holiday or the weekly off of
    // that day. Leave is not marked here : it comes from an
    // approved Leave Application.
    buttonsOf(row: DailyAttendanceRow): StatusButton[]
    {
        const holiday =
            this.isMonth ? row.HolidayName ?? '' : this.holidayName;

        return [
            { code:'P', label:'Present', title:'Present (an in time after the grace time makes it Late)' },
            { code:'H', label:'Half Day', title:'Half day : half of the day is paid' },
            { code:'A', label:'Absent', title:'Absent : the day is cut from the salary' },
            { code:holiday ? 'HD' : 'WO', label:'Off', title:holiday ? `Holiday : ${holiday}` : 'Weekly off day' }
        ];
    }

    get visibleRows(): DailyAttendanceRow[]
    {
        const find =
            this.searchText.trim().toLowerCase();

        return !find
            ? this.rows
            : this.rows.filter(r =>
                [r.Code, r.FullName, r.DesignationName, r.BranchName, r.ShiftName, r.Date, r.DayName, r.HolidayName]
                    .some(v => (v ?? '').toLowerCase().includes(find)));
    }

    get summaryItems(): { label: string; value: string; tone: '' | 'ok' | 'bad' | 'warn' }[]
    {
        const count =
            (test: (r: DailyAttendanceRow) => boolean): string =>
                this.rows.filter(test).length.toLocaleString('en-US');

        return [
            { label:this.isMonth ? 'Days' : 'Employees', value:this.rows.length.toLocaleString('en-US'), tone:'' },
            { label:'Present', value:count(r => r.Status === 'P' || r.Status === 'L'), tone:'ok' },
            { label:'Late', value:count(r => this.lateMinutes(r) > 0), tone:'warn' },
            { label:'Half Day', value:count(r => r.Status === 'H'), tone:'' },
            { label:'Absent', value:count(r => r.Status === 'A'), tone:'bad' },
            { label:'Leave', value:count(r => r.Status === 'LV'), tone:'' },
            { label:'Off', value:count(r => r.Status === 'WO' || r.Status === 'HD'), tone:'' },
            { label:'Overtime Days', value:this.rows.reduce((sum, r) => sum + this.otDay(r), 0).toLocaleString('en-US'), tone:'ok' },
            { label:'Not Marked', value:count(r => !r.Status), tone:'warn' }
        ];
    }

    // The centred state shown instead of the sheet : loading,
    // failed, no employees, or nothing found by the search
    get emptyState(): { icon: string; title: string; subtitle: string } | null
    {
        if (this.loading)
        {
            return this.rows.length > 0
                ? null
                : { icon:'fas fa-spinner fa-spin', title:'Loading', subtitle:'Loading the attendance of the day...' };
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
            return { icon:'fas fa-users-slash', title:`No Employees on ${this.dateText}`, subtitle:'Add active employees on Employee Management > Employee Profiles (joined on or before this day).' };
        }

        return { icon:'fas fa-magnifying-glass', title:'No Employee Found', subtitle:'No employee matches the search.' };
    }

    get unmarkedCount(): number
    {
        return this.rows.filter(r => !r.Status).length;
    }

    ngOnInit():
        void
    {
        const url =
            this.router.url.toLowerCase();

        this.mode =
            url.includes('/view/') ? 'view' : url.includes('/edit/') ? 'edit' : 'add';

        // edit / view : <employee id>-<yyyy>-<MM> from the list
        const id =
            /^(\d+)-(\d{4})-(\d{2})$/.exec(this.route.snapshot.paramMap.get('id') ?? '');

        if (id)
        {
            this.view = 'month';
            this.employeeId = Number(id[1]);

            const month = `${id[2]}-${id[3]}`;

            this.date = month === this.today.substring(0, 7) ? this.today : `${month}-01`;
        }

        const asked =
            this.route.snapshot.queryParamMap.get('date') ?? '';

        if (/^\d{4}-\d{2}-\d{2}$/.test(asked))
        {
            // a day asked for (Monthly Attendance) : that day, By Day
            this.date = asked;
            this.view = 'day';
        }

        this.load();
    }

    //===========================================================
    // Load
    //===========================================================

    // By Month : one employee, a row for every day of the month.
    // A working day not marked yet comes up as Present; a holiday /
    // weekly holiday (from the database) as Off.
    private loadMonth():
        void
    {
        this.service
            .getEmployeeMonth(Number(this.date.substring(0, 4)), Number(this.date.substring(5, 7)), this.employeeId, this.branchId)
            .subscribe(
            {
                next:(sheet: EmployeeMonth) =>
                {
                    this.leaveTypes = sheet.LeaveTypes;
                    this.holidayName = '';
                    this.dayName = '';

                    this.branchItems =
                    [
                        { label:'All Branches', value:0 },
                        ...sheet.Branches.map(b => ({ label:b.Name, value:b.Id }))
                    ];

                    this.employeeId = sheet.EmployeeId;

                    this.employeeItems =
                        sheet.Employees.map(e => ({ label:e.Note ? `${e.Name}  -  ${e.Note}` : e.Name, value:e.Id }));

                    this.serverDays =
                        new Map(sheet.Days.map(d => [d.Date ?? '', JSON.stringify(d)]));

                    // Present is picked for a working day with no mark yet
                    for (const day of sheet.Days)
                    {
                        if (!day.Status && !day.IsSaved && !day.IsFuture && !day.BeforeJoining)
                        {
                            day.Status = 'P';
                        }
                    }

                    this.rows = sheet.Days;
                    this.loading = false;

                    this.loaded();

                    this.initialJson = JSON.stringify(this.rows);

                    this.changed();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.rows = [];
                    this.toast.error('Error', error?.error?.message ?? 'The attendance of the month could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    // By Month : the days to save (changed, or never saved)
    private get monthDaysToSave(): DailyAttendanceRow[]
    {
        return this.rows.filter(r =>
            !r.IsFuture
            && !r.BeforeJoining
            && !r.LeaveApplicationCode
            && (r.Status || r.IsSaved)
            && (!r.IsSaved || JSON.stringify(r) !== this.serverDays.get(r.Date ?? '')));
    }

    private load():
        void
    {
        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        if (this.isMonth)
        {
            this.loadMonth();
            return;
        }

        this.service
            .getDaily(this.date, this.branchId)
            .subscribe(
            {
                next:(sheet: DailyAttendance) =>
                {
                    this.date = sheet.Date || this.date;
                    this.dayName = sheet.DayName;
                    this.holidayName = sheet.HolidayName;
                    this.leaveTypes = sheet.LeaveTypes;

                    this.branchItems =
                    [
                        { label:'All Branches', value:0 },
                        ...sheet.Branches.map(b => ({ label:b.Name, value:b.Id }))
                    ];

                    this.rows = sheet.Rows;
                    this.loading = false;

                    this.loaded();

                    this.initialJson = JSON.stringify(this.rows);

                    this.changed();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.rows = [];
                    this.toast.error('Error', error?.error?.message ?? 'The attendance of the day could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    // A sheet just loaded : the ticks are off, the times as loaded
    // are remembered
    private loaded():
        void
    {
        this.fillIn = false;
        this.fillOut = false;

        this.loadedTimes =
            new Map(this.rows.map(r => [this.rowKey(r), { InTime:r.InTime, OutTime:r.OutTime }]));
    }

    private changed():
        void
    {
        this.hasChanges = JSON.stringify(this.rows) !== this.initialJson;
        this.cdr.detectChanges();
    }

    // Leaves the sheet (another day / branch) : asks when there
    // are unsaved marks
    private leave(action: () => void):
        void
    {
        if (!this.hasChanges || (!this.isMonth && this.isFuture))
        {
            action();
            return;
        }

        this.confirmDialog.open(
            'Unsaved Attendance',
            this.isMonth ? 'The marks of this month are not saved. Leave without saving?' : `The marks of ${this.dateText} are not saved. Leave without saving?`,
            action,
            'Leave',
            'Stay',
            'primary');
    }

    goToDate(value: string):
        void
    {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value === this.date)
        {
            return;
        }

        this.leave(() =>
        {
            this.date = value;
            this.load();
        });
    }

    onDateInput(event: Event):
        void
    {
        const input =
            event.target as HTMLInputElement;

        const value =
            input.value;

        // the box shows the day of the sheet until the move is agreed
        input.value = this.date;

        this.goToDate(value);
    }

    moveDay(step: number):
        void
    {
        this.goToDate(attAddDays(this.date, step));
    }

    onBranchChange(value: any):
        void
    {
        const branchId =
            Number(value) || 0;

        if (branchId === this.branchId)
        {
            return;
        }

        this.leave(() =>
        {
            this.branchId = branchId;
            this.load();
        });
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
        this.leave(() => this.load());
    }

    //===========================================================
    // Marks
    //===========================================================

    isLocked(row: DailyAttendanceRow): boolean
    {
        return this.isSaving
            || this.isViewMode
            || !!row.LeaveApplicationCode
            || (this.isMonth ? !!row.IsFuture || !!row.BeforeJoining : this.isFuture);
    }

    // The row's day is a weekly holiday or a public holiday
    isOffDay(row: DailyAttendanceRow): boolean
    {
        return row.IsWeeklyOff || !!(this.isMonth ? row.HolidayName : this.holidayName);
    }

    // Overtime day : an employee who is allowed overtime worked on
    // a weekly holiday / public holiday (present or late 1, half day
    // 0.5). The same rule as payroll : it is worked out, never typed.
    otDay(row: DailyAttendanceRow): number
    {
        if (!row.OvertimeAllowed || !this.isOffDay(row))
        {
            return 0;
        }

        return row.Status === 'P' || row.Status === 'L' ? 1
            : row.Status === 'H' ? 0.5
            : 0;
    }

    isWorked(row: DailyAttendanceRow): boolean
    {
        return row.Status === 'P' || row.Status === 'L' || row.Status === 'H';
    }

    // The button that is on (Late shows as Present)
    isOn(row: DailyAttendanceRow, code: string): boolean
    {
        return row.Status === code || (code === 'P' && row.Status === 'L');
    }

    // Minutes late by the in time (the same rule as the server);
    // a saved Late without an in time keeps its minutes
    lateMinutes(row: DailyAttendanceRow): number
    {
        if (row.Status !== 'P' && row.Status !== 'L')
        {
            return 0;
        }

        const start = attMinutes(row.ShiftStart);
        const arrived = attMinutes(row.InTime);

        if (start < 0 || arrived < 0)
        {
            return row.Status === 'L' ? Math.max(row.LateMinutes, 1) : 0;
        }

        let late = arrived - start;

        if (late < -12 * 60)
        {
            late += 24 * 60;
        }

        return late > row.GraceMinutes ? late : 0;
    }

    setStatus(row: DailyAttendanceRow, code: string):
        void
    {
        if (this.isLocked(row))
        {
            return;
        }

        // a click on the status that is on takes the mark off
        row.Status = this.isOn(row, code) ? '' : code;

        if (!this.isWorked(row))
        {
            row.InTime = '';
            row.OutTime = '';
            row.OvertimeHours = 0;
            row.LateMinutes = 0;
        }

        // (leave is never picked here : it comes from Leave Applications)
        row.LeaveTypeId = 0;

        // a tick on the In / Out header fills the row too
        this.fillRow(row);

        this.changed();
    }

    onTime(row: DailyAttendanceRow, field: 'InTime' | 'OutTime', event: Event):
        void
    {
        row[field] = (event.target as HTMLInputElement).value ?? '';

        if (field === 'OutTime')
        {
            this.overtimeFromOut(row);
        }

        this.changed();
    }

    // Overtime hours from the Out time : what the employee stayed
    // after the end of the shift (only for an employee allowed
    // overtime). An Out time at or before the end of the shift is 0.
    // The box can still be typed over afterwards.
    private overtimeFromOut(row: DailyAttendanceRow):
        void
    {
        if (!row.OvertimeAllowed || !this.isWorked(row))
        {
            return;
        }

        const end = attMinutes(row.ShiftEnd);

        const left = attMinutes(row.OutTime);

        if (end < 0 || left < 0)
        {
            row.OvertimeHours = 0;
            return;
        }

        let extra = left - end;

        // past midnight (a late shift) : the Out time is the next day
        if (extra < -12 * 60)
        {
            extra += 24 * 60;
        }

        row.OvertimeHours =
            extra > 0 ? Math.min(24, Math.round(extra / 60 * 100) / 100) : 0;
    }

    onOvertime(row: DailyAttendanceRow, event: Event):
        void
    {
        const value =
            Number((event.target as HTMLInputElement).value);

        row.OvertimeHours =
            Number.isFinite(value) && value > 0 ? Math.min(24, Math.round(value * 100) / 100) : 0;

        this.changed();
    }

    onLeaveType(row: DailyAttendanceRow, event: Event):
        void
    {
        row.LeaveTypeId = Number((event.target as HTMLSelectElement).value) || 0;
        this.changed();
    }

    onRemarks(row: DailyAttendanceRow, event: Event):
        void
    {
        row.Remarks = (event.target as HTMLInputElement).value ?? '';
        this.changed();
    }

    // Everyone not marked yet becomes Present
    markAllPresent():
        void
    {
        if (this.isViewMode || (!this.isMonth && this.isFuture))
        {
            return;
        }

        let marked = 0;

        for (const row of this.rows)
        {
            if (!row.Status && !this.isLocked(row))
            {
                row.Status = 'P';
                marked++;
            }
        }

        if (marked === 0)
        {
            this.toast.info('Daily Attendance', 'Everyone is marked already.');
        }

        this.changed();
    }

    //===========================================================
    // Save
    //===========================================================

    save():
        void
    {
        if (this.isSaving || this.loading || this.isViewMode)
        {
            return;
        }

        if (this.isMonth)
        {
            this.saveMonth();
            return;
        }

        if (this.isFuture)
        {
            this.toast.error('Daily Attendance', 'Attendance cannot be marked for a day that has not come yet.');
            return;
        }

        if (this.rows.length === 0)
        {
            this.toast.error('Daily Attendance', 'There are no employees on the sheet.');
            return;
        }

        const noType =
            this.rows.find(r => r.Status === 'LV' && !r.LeaveTypeId);

        if (noType)
        {
            this.toast.error('Validation', `${noType.Code} ${noType.FullName} : pick the leave type.`);
            return;
        }

        const run =
            () =>
            {
                this.isSaving = true;

                this.progressDialog.show('Saving', `Saving the attendance of ${this.dateText}...`, false);

                this.service
                    .saveDaily(this.date, this.rows)
                    .subscribe(
                    {
                        next:result =>
                        {
                            this.progressDialog.finish(() =>
                            {
                                this.isSaving = false;
                                this.hasChanges = false;
                                this.toast.success('Saved', `${this.dateText} : ${result.Saved} marked${result.Cleared > 0 ? `, ${result.Cleared} cleared` : ''}.`);
                                this.goToList();
                            });
                        },
                        error:error =>
                        {
                            this.progressDialog.fail();
                            this.isSaving = false;
                            this.toast.error('Error', error?.error?.message ?? 'The attendance could not be saved.');
                            this.cdr.detectChanges();
                        }
                    });
            };

        const unmarked =
            this.unmarkedCount;

        if (unmarked > 0)
        {
            this.confirmDialog.open(
                'Not Everyone Is Marked',
                `${unmarked} employee(s) have no mark for ${this.dateText}. Save the others now? A day without a mark shows as "not marked" on the month and payroll treats it as absent.`,
                run,
                'Save',
                'Cancel',
                'primary');
            return;
        }

        run();
    }

    // By Month : the changed days of the employee, in one go
    private saveMonth():
        void
    {
        const days =
            this.monthDaysToSave;

        if (!this.employeeId || this.rows.length === 0)
        {
            this.toast.error('Daily Attendance', 'There is no employee on the sheet.');
            return;
        }

        if (days.length === 0)
        {
            this.toast.info('Daily Attendance', 'Nothing is changed.');
            return;
        }

        const who =
            this.rows[0]?.FullName ?? 'the employee';

        const month =
            this.monthItems.find(x => x.value === this.month)?.label ?? this.month;

        this.confirmDialog.open(
            'Save Attendance',
            `Save ${days.length} day(s) of ${month} for ${who}?`,
            () =>
            {
                this.isSaving = true;

                this.progressDialog.show('Saving', `Saving the attendance of ${month}...`, false);

                this.service
                    .saveEmployeeMonth(this.employeeId, days)
                    .subscribe(
                    {
                        next:result =>
                        {
                            this.progressDialog.finish(() =>
                            {
                                this.isSaving = false;
                                this.hasChanges = false;
                                this.toast.success('Saved', `${who}, ${month} : ${result.Saved} day(s) marked${result.Cleared > 0 ? `, ${result.Cleared} cleared` : ''}.`);
                                this.goToList();
                            });
                        },
                        error:error =>
                        {
                            this.progressDialog.fail();
                            this.isSaving = false;
                            this.toast.error('Error', error?.error?.message ?? 'The attendance could not be saved.');
                            this.cdr.detectChanges();
                        }
                    });
            },
            'Save',
            'Cancel',
            'primary');
    }

    //===========================================================
    // History
    //===========================================================

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
