//===============================================================
// Imports
//===============================================================

import
{
    Injectable,
    inject
}
from '@angular/core';

import
{
    HttpClient
}
from '@angular/common/http';

import
{
    Observable,
    map
}
from 'rxjs';

import
{
    environment
}
from '../../../../environments/environment';

import
{
    AttendanceLookup,
    DailyAttendance,
    AttendanceMonthRow,
    DailyAttendanceRow,
    EmployeeMonth,
    LeaveApplication,
    LeaveApplicationDefaults,
    LeaveBalance,
    LeaveDays,
    MonthlyAttendance
}
from '../models/attendance.model';


//===============================================================
// Read helpers (PascalCase or camelCase from the API)
//===============================================================

const pick =
    (x: any, name: string): any =>
        x?.[name] ?? x?.[name.charAt(0).toLowerCase() + name.slice(1)];

const text =
    (x: any, name: string): string =>
        String(pick(x, name) ?? '');

const num =
    (x: any, name: string): number =>
        Number(pick(x, name) ?? 0) || 0;

const list =
    (x: any, name: string): any[] =>
    {
        const value = pick(x, name);
        return Array.isArray(value) ? value : [];
    };

const lookups =
    (x: any, name: string): AttendanceLookup[] =>
        list(x, name).map(l => ({ Id:num(l, 'Id'), Name:text(l, 'Name'), Note:text(l, 'Note') }));

function normalizeLeave
(
    x: any
):
    LeaveApplication
{
    return {
        PublicId:text(x, 'PublicId'),
        Code:text(x, 'Code'),
        EmployeeId:num(x, 'EmployeeId'),
        EmployeeCode:text(x, 'EmployeeCode'),
        EmployeeName:text(x, 'EmployeeName'),
        DesignationName:text(x, 'DesignationName'),
        BranchName:text(x, 'BranchName'),
        LeaveTypeId:num(x, 'LeaveTypeId'),
        LeaveTypeName:text(x, 'LeaveTypeName'),
        LeaveShortName:text(x, 'LeaveShortName'),
        IsPaid:pick(x, 'IsPaid') !== false,
        FromDate:text(x, 'FromDate'),
        ToDate:text(x, 'ToDate'),
        Days:num(x, 'Days'),
        Reason:text(x, 'Reason'),
        Status:text(x, 'Status') || 'Pending',
        DecidedByName:text(x, 'DecidedByName'),
        DecidedDate:text(x, 'DecidedDate'),
        DecisionNote:text(x, 'DecisionNote'),
        AppliedDate:text(x, 'AppliedDate')
    };
}


//===============================================================
// Attendance Service :
// api/human-resource-manangement/attendance-management/...
//   daily-attendance, monthly-attendance, leave-applications
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class AttendanceService
{
    private readonly http =
        inject(HttpClient);

    private readonly baseUrl =
        `${environment.apiUrl}/human-resource-manangement/attendance-management`;

    private readonly dailyUrl =
        `${this.baseUrl}/daily-attendance`;

    private readonly monthlyUrl =
        `${this.baseUrl}/monthly-attendance`;

    private readonly leaveUrl =
        `${this.baseUrl}/leave-applications`;

    //===========================================================
    // Daily Attendance
    //===========================================================

    getDaily(date: string, branchId: number):
        Observable<DailyAttendance>
    {
        const params:
            Record<string, string> =
            { branchId:String(branchId || 0) };

        if (date)
        {
            params['date'] = date;
        }

        return this.http
            .get<any>(this.dailyUrl, { params })
            .pipe(
                map(x => ({
                    Date:text(x, 'Date'),
                    DayName:text(x, 'DayName'),
                    HolidayName:text(x, 'HolidayName'),
                    BranchId:num(x, 'BranchId'),
                    Branches:lookups(x, 'Branches'),
                    LeaveTypes:lookups(x, 'LeaveTypes'),
                    Rows:list(x, 'Rows').map(r => ({
                        EmployeeId:num(r, 'EmployeeId'),
                        Code:text(r, 'Code'),
                        FullName:text(r, 'FullName'),
                        DesignationName:text(r, 'DesignationName'),
                        BranchName:text(r, 'BranchName'),
                        ShiftName:text(r, 'ShiftName'),
                        ShiftStart:text(r, 'ShiftStart'),
                        ShiftEnd:text(r, 'ShiftEnd'),
                        GraceMinutes:num(r, 'GraceMinutes'),
                        IsWeeklyOff:!!pick(r, 'IsWeeklyOff'),
                        OvertimeAllowed:!!pick(r, 'OvertimeAllowed'),
                        Status:text(r, 'Status'),
                        InTime:text(r, 'InTime'),
                        OutTime:text(r, 'OutTime'),
                        LateMinutes:num(r, 'LateMinutes'),
                        OvertimeHours:num(r, 'OvertimeHours'),
                        LeaveTypeId:num(r, 'LeaveTypeId'),
                        Remarks:text(r, 'Remarks'),
                        IsSaved:!!pick(r, 'IsSaved'),
                        LeaveApplicationCode:text(r, 'LeaveApplicationCode')
                    }))
                })));
    }

    // Rows fixed by a leave application are not sent
    saveDaily(date: string, rows: DailyAttendanceRow[]):
        Observable<{ Saved: number; Cleared: number }>
    {
        const body =
        {
            Date:date,
            Rows:rows
                .filter(r => !r.LeaveApplicationCode)
                .map(r => ({
                    EmployeeId:r.EmployeeId,
                    Status:r.Status,
                    InTime:r.InTime,
                    OutTime:r.OutTime,
                    OvertimeHours:Number(r.OvertimeHours) || 0,
                    LeaveTypeId:r.LeaveTypeId,
                    Remarks:r.Remarks
                }))
        };

        return this.http
            .put<any>(this.dailyUrl, body)
            .pipe(map(x => ({ Saved:num(x, 'Saved'), Cleared:num(x, 'Cleared') })));
    }

    //-----------------------------------------------------------
    // The list : every employee's month that has marks
    //-----------------------------------------------------------

    getAttendanceMonths():
        Observable<AttendanceMonthRow[]>
    {
        return this.http
            .get<any[]>(`${this.dailyUrl}/months`)
            .pipe(
                map(rows =>
                    (Array.isArray(rows) ? rows : []).map(x => ({
                        EmployeeId:num(x, 'EmployeeId'),
                        Code:text(x, 'Code'),
                        FullName:text(x, 'FullName'),
                        DesignationName:text(x, 'DesignationName'),
                        BranchId:num(x, 'BranchId'),
                        BranchName:text(x, 'BranchName'),
                        Year:num(x, 'Year'),
                        Month:num(x, 'Month'),
                        Days:num(x, 'Days'),
                        Present:num(x, 'Present'),
                        Late:num(x, 'Late'),
                        HalfDay:num(x, 'HalfDay'),
                        Absent:num(x, 'Absent'),
                        Leave:num(x, 'Leave'),
                        Off:num(x, 'Off'),
                        OvertimeHours:num(x, 'OvertimeHours')
                    }))));
    }

    // The marks of an employee's month go : how many went
    deleteEmployeeMonth(employeeId: number, year: number, month: number):
        Observable<number>
    {
        const params =
            { employeeId:String(employeeId), year:String(year), month:String(month) };

        return this.http
            .delete<any>(`${this.dailyUrl}/month`, { params })
            .pipe(map(x => num(x, 'Deleted')));
    }

    //-----------------------------------------------------------
    // By month : one employee, a row for every day of the month
    //-----------------------------------------------------------

    getEmployeeMonth(year: number, month: number, employeeId: number, branchId: number):
        Observable<EmployeeMonth>
    {
        const params =
        {
            year:String(year),
            month:String(month),
            employeeId:String(employeeId || 0),
            branchId:String(branchId || 0)
        };

        return this.http
            .get<any>(`${this.dailyUrl}/month`, { params })
            .pipe(
                map(x =>
                {
                    // the employee's own fields go on every day
                    const employee =
                    {
                        EmployeeId:num(x, 'EmployeeId'),
                        Code:text(x, 'Code'),
                        FullName:text(x, 'FullName'),
                        DesignationName:text(x, 'DesignationName'),
                        BranchName:text(x, 'BranchName'),
                        ShiftName:text(x, 'ShiftName'),
                        ShiftStart:text(x, 'ShiftStart'),
                        ShiftEnd:text(x, 'ShiftEnd'),
                        GraceMinutes:num(x, 'GraceMinutes'),
                        OvertimeAllowed:!!pick(x, 'OvertimeAllowed')
                    };

                    return {
                        Year:num(x, 'Year'),
                        Month:num(x, 'Month'),
                        BranchId:num(x, 'BranchId'),
                        EmployeeId:employee.EmployeeId,
                        Code:employee.Code,
                        FullName:employee.FullName,
                        DesignationName:employee.DesignationName,
                        BranchName:employee.BranchName,
                        ShiftName:employee.ShiftName,
                        ShiftStart:employee.ShiftStart,
                        ShiftEnd:employee.ShiftEnd,
                        Employees:lookups(x, 'Employees'),
                        Branches:lookups(x, 'Branches'),
                        LeaveTypes:lookups(x, 'LeaveTypes'),
                        Days:list(x, 'Days').map(d => ({
                            ...employee,
                            Date:text(d, 'Date'),
                            DayName:text(d, 'DayName'),
                            HolidayName:text(d, 'HolidayName'),
                            IsWeeklyOff:!!pick(d, 'IsWeeklyOff'),
                            IsFuture:!!pick(d, 'IsFuture'),
                            BeforeJoining:!!pick(d, 'BeforeJoining'),
                            Status:text(d, 'Status'),
                            InTime:text(d, 'InTime'),
                            OutTime:text(d, 'OutTime'),
                            LateMinutes:num(d, 'LateMinutes'),
                            OvertimeHours:num(d, 'OvertimeHours'),
                            LeaveTypeId:num(d, 'LeaveTypeId'),
                            Remarks:text(d, 'Remarks'),
                            IsSaved:!!pick(d, 'IsSaved'),
                            LeaveApplicationCode:text(d, 'LeaveApplicationCode')
                        }))
                    };
                }));
    }

    // Only the days sent are saved
    saveEmployeeMonth(employeeId: number, days: DailyAttendanceRow[]):
        Observable<{ Saved: number; Cleared: number }>
    {
        const body =
        {
            EmployeeId:employeeId,
            Days:days.map(r => ({
                Date:r.Date,
                Status:r.Status,
                InTime:r.InTime,
                OutTime:r.OutTime,
                OvertimeHours:Number(r.OvertimeHours) || 0,
                LeaveTypeId:r.LeaveTypeId,
                Remarks:r.Remarks
            }))
        };

        return this.http
            .put<any>(`${this.dailyUrl}/month`, body)
            .pipe(map(x => ({ Saved:num(x, 'Saved'), Cleared:num(x, 'Cleared') })));
    }

    getDailyHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.dailyUrl}/history`);
    }

    //===========================================================
    // Monthly Attendance
    //===========================================================

    getMonthly(year: number, month: number, branchId: number):
        Observable<MonthlyAttendance>
    {
        const params =
        {
            year:String(year),
            month:String(month),
            branchId:String(branchId || 0)
        };

        return this.http
            .get<any>(this.monthlyUrl, { params })
            .pipe(
                map(x => ({
                    Year:num(x, 'Year'),
                    Month:num(x, 'Month'),
                    BranchId:num(x, 'BranchId'),
                    Branches:lookups(x, 'Branches'),
                    Days:list(x, 'Days').map(d => ({
                        Day:num(d, 'Day'),
                        DayName:text(d, 'DayName'),
                        HolidayName:text(d, 'HolidayName')
                    })),
                    Rows:list(x, 'Rows').map(r => ({
                        EmployeeId:num(r, 'EmployeeId'),
                        Code:text(r, 'Code'),
                        FullName:text(r, 'FullName'),
                        DesignationName:text(r, 'DesignationName'),
                        Cells:list(r, 'Cells').map(c => String(c ?? '')),
                        Kinds:list(r, 'Kinds').map(c => String(c ?? '')),
                        Present:num(r, 'Present'),
                        Late:num(r, 'Late'),
                        HalfDay:num(r, 'HalfDay'),
                        Absent:num(r, 'Absent'),
                        PaidLeave:num(r, 'PaidLeave'),
                        UnpaidLeave:num(r, 'UnpaidLeave'),
                        WeeklyOff:num(r, 'WeeklyOff'),
                        Holiday:num(r, 'Holiday'),
                        NotMarked:num(r, 'NotMarked'),
                        OvertimeHours:num(r, 'OvertimeHours'),
                        PayableDays:num(r, 'PayableDays')
                    }))
                })));
    }

    //===========================================================
    // Leave Applications
    //===========================================================

    getLeaves():
        Observable<LeaveApplication[]>
    {
        return this.http
            .get<any[]>(this.leaveUrl)
            .pipe(map(rows => (Array.isArray(rows) ? rows : []).map(normalizeLeave)));
    }

    getLeave(publicId: string):
        Observable<LeaveApplication>
    {
        return this.http
            .get<any>(`${this.leaveUrl}/${publicId}`)
            .pipe(map(normalizeLeave));
    }

    getLeaveDefaults():
        Observable<LeaveApplicationDefaults>
    {
        return this.http
            .get<any>(`${this.leaveUrl}/defaults`)
            .pipe(
                map(x => ({
                    NextCode:text(x, 'NextCode'),
                    Employees:list(x, 'Employees').map(e => ({
                        Id:num(e, 'Id'),
                        Code:text(e, 'Code'),
                        Name:text(e, 'Name'),
                        Gender:text(e, 'Gender'),
                        DesignationName:text(e, 'DesignationName')
                    })),
                    LeaveTypes:list(x, 'LeaveTypes').map(t => ({
                        Id:num(t, 'Id'),
                        Name:text(t, 'Name'),
                        ShortName:text(t, 'ShortName'),
                        DaysPerYear:num(t, 'DaysPerYear'),
                        IsPaid:pick(t, 'IsPaid') !== false,
                        AppliesTo:text(t, 'AppliesTo') || 'All'
                    }))
                })));
    }

    getLeaveBalance(employeeId: number, year: number):
        Observable<LeaveBalance[]>
    {
        return this.http
            .get<any[]>(`${this.leaveUrl}/balance`, { params:{ employeeId:String(employeeId), year:String(year) } })
            .pipe(
                map(rows =>
                    (Array.isArray(rows) ? rows : []).map(b => ({
                        LeaveTypeId:num(b, 'LeaveTypeId'),
                        Name:text(b, 'Name'),
                        ShortName:text(b, 'ShortName'),
                        Entitled:num(b, 'Entitled'),
                        Used:num(b, 'Used'),
                        Pending:num(b, 'Pending'),
                        Remaining:num(b, 'Remaining')
                    }))));
    }

    countLeaveDays(employeeId: number, from: string, to: string):
        Observable<LeaveDays>
    {
        return this.http
            .get<any>(`${this.leaveUrl}/days`, { params:{ employeeId:String(employeeId), from, to:to || from } })
            .pipe(map(x => ({ Days:num(x, 'Days'), OffDays:num(x, 'OffDays') })));
    }

    private leaveBody(a: LeaveApplication): any
    {
        return {
            EmployeeId:a.EmployeeId,
            LeaveTypeId:a.LeaveTypeId,
            FromDate:a.FromDate,
            ToDate:a.ToDate || a.FromDate,
            Reason:a.Reason
        };
    }

    createLeave(a: LeaveApplication):
        Observable<LeaveApplication>
    {
        return this.http
            .post<any>(this.leaveUrl, this.leaveBody(a))
            .pipe(map(normalizeLeave));
    }

    updateLeave(publicId: string, a: LeaveApplication):
        Observable<void>
    {
        return this.http.put<void>(`${this.leaveUrl}/${publicId}`, this.leaveBody(a));
    }

    // approve / reject / cancel
    decideLeave(publicId: string, decision: 'approve' | 'reject' | 'cancel', note: string):
        Observable<void>
    {
        return this.http.put<void>(`${this.leaveUrl}/${publicId}/${decision}`, { Note:note });
    }

    deleteLeave(publicId: string):
        Observable<void>
    {
        return this.http.delete<void>(`${this.leaveUrl}/${publicId}`);
    }

    restoreLeave():
        Observable<string>
    {
        return this.http
            .put<any>(`${this.leaveUrl}/restore`, {})
            .pipe(map(x => String(x?.Code ?? x?.code ?? '')));
    }

    getLeaveHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.leaveUrl}/history`);
    }
}
