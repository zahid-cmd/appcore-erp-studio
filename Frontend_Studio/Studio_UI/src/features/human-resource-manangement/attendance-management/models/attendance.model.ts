//===============================================================
// Attendance and leave (Human Resource > Attendance Management,
// hand-written pages : NEVER run Code Sync for them). Dates are
// yyyy-MM-dd, times HH:mm (24 hours; '' = not noted).
//
// Attendance status : P Present, L Late, H Half Day, A Absent,
// LV Leave, WO Weekly Off, HD Holiday, '' not marked.
//===============================================================

export interface AttendanceLookup
{
    Id: number;
    Name: string;
    // Leave types : the short name (CL, SL ...)
    Note: string;
}

//---------------------------------------------------------------
// Daily Attendance
//---------------------------------------------------------------

export interface DailyAttendanceRow
{
    EmployeeId: number;
    Code: string;
    FullName: string;
    DesignationName: string;
    BranchName: string;
    ShiftName: string;
    ShiftStart: string;
    ShiftEnd: string;
    GraceMinutes: number;
    IsWeeklyOff: boolean;
    OvertimeAllowed: boolean;
    Status: string;
    InTime: string;
    OutTime: string;
    LateMinutes: number;
    OvertimeHours: number;
    LeaveTypeId: number;
    Remarks: string;
    IsSaved: boolean;
    // Written by an approved leave application : fixed on the page
    LeaveApplicationCode: string;

    // By month (one employee, a row for every day) : the day of
    // the row
    Date?: string;
    DayName?: string;
    HolidayName?: string;
    // A day still to come, or before the joining date : not marked
    IsFuture?: boolean;
    BeforeJoining?: boolean;
}

// The Daily Attendance list : an employee's month that has marks
export interface AttendanceMonthRow
{
    EmployeeId: number;
    Code: string;
    FullName: string;
    DesignationName: string;
    BranchId: number;
    BranchName: string;
    Year: number;
    Month: number;
    Days: number;
    Present: number;
    Late: number;
    HalfDay: number;
    Absent: number;
    Leave: number;
    Off: number;
    OvertimeHours: number;
}

// Daily Attendance by month : one employee, every day of a month
export interface EmployeeMonth
{
    Year: number;
    Month: number;
    BranchId: number;
    // 0 = the branch has no employee
    EmployeeId: number;
    Code: string;
    FullName: string;
    DesignationName: string;
    BranchName: string;
    ShiftName: string;
    ShiftStart: string;
    ShiftEnd: string;
    Employees: AttendanceLookup[];
    Branches: AttendanceLookup[];
    LeaveTypes: AttendanceLookup[];
    // A row for every day (the employee's own fields on each)
    Days: DailyAttendanceRow[];
}

export interface DailyAttendance
{
    Date: string;
    DayName: string;
    HolidayName: string;
    BranchId: number;
    Branches: AttendanceLookup[];
    LeaveTypes: AttendanceLookup[];
    Rows: DailyAttendanceRow[];
}

//---------------------------------------------------------------
// Monthly Attendance
//---------------------------------------------------------------

export interface MonthlyAttendanceDay
{
    Day: number;
    DayName: string;
    HolidayName: string;
}

export interface MonthlyAttendanceRow
{
    EmployeeId: number;
    Code: string;
    FullName: string;
    DesignationName: string;
    // One per day : the text of the cell and its kind (colour)
    Cells: string[];
    Kinds: string[];
    Present: number;
    Late: number;
    HalfDay: number;
    Absent: number;
    PaidLeave: number;
    UnpaidLeave: number;
    WeeklyOff: number;
    Holiday: number;
    NotMarked: number;
    OvertimeHours: number;
    PayableDays: number;
}

export interface MonthlyAttendance
{
    Year: number;
    Month: number;
    BranchId: number;
    Branches: AttendanceLookup[];
    Days: MonthlyAttendanceDay[];
    Rows: MonthlyAttendanceRow[];
}

//---------------------------------------------------------------
// Leave Applications
//---------------------------------------------------------------

export interface LeaveApplication
{
    PublicId: string;
    Code: string;
    EmployeeId: number;
    EmployeeCode: string;
    EmployeeName: string;
    DesignationName: string;
    BranchName: string;
    LeaveTypeId: number;
    LeaveTypeName: string;
    LeaveShortName: string;
    IsPaid: boolean;
    FromDate: string;
    ToDate: string;
    Days: number;
    Reason: string;
    // Pending / Approved / Rejected / Cancelled
    Status: string;
    DecidedByName: string;
    DecidedDate: string;
    DecisionNote: string;
    AppliedDate: string;
}

export interface LeaveEmployee
{
    Id: number;
    Code: string;
    Name: string;
    Gender: string;
    DesignationName: string;
}

export interface LeaveTypeOption
{
    Id: number;
    Name: string;
    ShortName: string;
    DaysPerYear: number;
    IsPaid: boolean;
    // All / Male / Female
    AppliesTo: string;
}

export interface LeaveApplicationDefaults
{
    NextCode: string;
    Employees: LeaveEmployee[];
    LeaveTypes: LeaveTypeOption[];
}

export interface LeaveBalance
{
    LeaveTypeId: number;
    Name: string;
    ShortName: string;
    // 0 = no limit
    Entitled: number;
    Used: number;
    Pending: number;
    Remaining: number;
}

export interface LeaveDays
{
    Days: number;
    OffDays: number;
}

export function emptyLeaveApplication(): LeaveApplication
{
    return {
        PublicId:'',
        Code:'',
        EmployeeId:0,
        EmployeeCode:'',
        EmployeeName:'',
        DesignationName:'',
        BranchName:'',
        LeaveTypeId:0,
        LeaveTypeName:'',
        LeaveShortName:'',
        IsPaid:true,
        FromDate:'',
        ToDate:'',
        Days:0,
        Reason:'',
        Status:'Pending',
        DecidedByName:'',
        DecidedDate:'',
        DecisionNote:'',
        AppliedDate:''
    };
}


//===============================================================
// Helpers
//===============================================================

const MONTHS =
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// yyyy-MM-dd -> 13 Nov 2026
export function attDayText(value: string): string
{
    const m =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

    return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : '';
}

// A Date -> yyyy-MM-dd (local)
export function attIsoDay(date: Date): string
{
    const two =
        (value: number): string => String(value).padStart(2, '0');

    return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

// yyyy-MM-dd plus days
export function attAddDays(value: string, days: number): string
{
    const m =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

    if (!m)
    {
        return value;
    }

    const date =
        new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days);

    return attIsoDay(date);
}

// HH:mm -> minutes; -1 when it is not a time
export function attMinutes(value: string): number
{
    const m =
        /^(\d{2}):(\d{2})$/.exec(value ?? '');

    return m ? Number(m[1]) * 60 + Number(m[2]) : -1;
}

export const ATT_STATUS_NAMES:
    Record<string, string> =
{
    P:'Present',
    L:'Late',
    H:'Half Day',
    A:'Absent',
    LV:'Leave',
    WO:'Weekly Off',
    HD:'Holiday',
    NM:'Not marked'
};
