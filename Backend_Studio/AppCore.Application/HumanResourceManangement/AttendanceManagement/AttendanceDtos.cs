//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Attendance and leave (Human Resource > Attendance Management,
// hand-written pages). Dates travel as yyyy-MM-dd, times as
// HH:mm (24 hours; '' = not noted).
//
// Attendance status : P Present, L Late, H Half Day, A Absent,
// LV Leave, WO Weekly Off, HD Holiday, '' not marked.
//===============================================================

public class AttendanceLookupDto
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    // Leave types : the short name (CL, SL ...)
    public string Note { get; set; } = string.Empty;
}


//---------------------------------------------------------------
// Daily Attendance
//---------------------------------------------------------------

public class DailyAttendanceRowDto
{
    public long EmployeeId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string DesignationName { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public string ShiftName { get; set; } = string.Empty;

    public string ShiftStart { get; set; } = string.Empty;

    public string ShiftEnd { get; set; } = string.Empty;

    public int GraceMinutes { get; set; }

    // The day is a weekly off day of the employee's shift
    public bool IsWeeklyOff { get; set; }

    public bool OvertimeAllowed { get; set; }

    // '' = not marked yet
    public string Status { get; set; } = string.Empty;

    public string InTime { get; set; } = string.Empty;

    public string OutTime { get; set; } = string.Empty;

    public int LateMinutes { get; set; }

    public decimal OvertimeHours { get; set; }

    public long LeaveTypeId { get; set; }

    public string Remarks { get; set; } = string.Empty;

    // A row is saved for the day
    public bool IsSaved { get; set; }

    // The leave application that wrote the row ('' = none) : the
    // row is then fixed on this page
    public string LeaveApplicationCode { get; set; } = string.Empty;
}


public class DailyAttendanceDto
{
    public string Date { get; set; } = string.Empty;

    // Friday, Saturday ...
    public string DayName { get; set; } = string.Empty;

    // '' = not a holiday
    public string HolidayName { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public List<AttendanceLookupDto> Branches { get; set; } = new();

    public List<AttendanceLookupDto> LeaveTypes { get; set; } = new();

    public List<DailyAttendanceRowDto> Rows { get; set; } = new();
}


public class SaveDailyAttendanceRowDto
{
    public long EmployeeId { get; set; }

    // P / L / H / A / LV / WO / HD; '' = take the mark off
    public string Status { get; set; } = string.Empty;

    public string InTime { get; set; } = string.Empty;

    public string OutTime { get; set; } = string.Empty;

    public decimal OvertimeHours { get; set; }

    public long LeaveTypeId { get; set; }

    public string Remarks { get; set; } = string.Empty;
}


public class SaveDailyAttendanceDto
{
    public string Date { get; set; } = string.Empty;

    public List<SaveDailyAttendanceRowDto> Rows { get; set; } = new();
}


public class DailyAttendanceSavedDto
{
    public int Saved { get; set; }

    public int Cleared { get; set; }
}


//---------------------------------------------------------------
// Daily Attendance by month : one employee, a row for every day
// of the month
//---------------------------------------------------------------

public class EmployeeMonthDayDto
{
    // yyyy-MM-dd
    public string Date { get; set; } = string.Empty;

    // Friday, Saturday ...
    public string DayName { get; set; } = string.Empty;

    // '' = not a holiday
    public string HolidayName { get; set; } = string.Empty;

    // A weekly holiday of the employee (own, or the one of everyone)
    public bool IsWeeklyOff { get; set; }

    // A day still to come, or before the joining date : not marked
    public bool IsFuture { get; set; }

    public bool BeforeJoining { get; set; }

    // '' = not marked yet (a holiday / weekly off is offered)
    public string Status { get; set; } = string.Empty;

    public string InTime { get; set; } = string.Empty;

    public string OutTime { get; set; } = string.Empty;

    public int LateMinutes { get; set; }

    public decimal OvertimeHours { get; set; }

    public long LeaveTypeId { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsSaved { get; set; }

    public string LeaveApplicationCode { get; set; } = string.Empty;
}

public class EmployeeMonthDto
{
    public int Year { get; set; }

    public int Month { get; set; }

    public long BranchId { get; set; }

    // 0 = the branch has no employee
    public long EmployeeId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string DesignationName { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public string ShiftName { get; set; } = string.Empty;

    public string ShiftStart { get; set; } = string.Empty;

    public string ShiftEnd { get; set; } = string.Empty;

    public int GraceMinutes { get; set; }

    public bool OvertimeAllowed { get; set; }

    // The employees of the branch (the dropdown)
    public List<AttendanceLookupDto> Employees { get; set; } = new();

    public List<AttendanceLookupDto> Branches { get; set; } = new();

    public List<AttendanceLookupDto> LeaveTypes { get; set; } = new();

    public List<EmployeeMonthDayDto> Days { get; set; } = new();
}

public class SaveEmployeeMonthDayDto
    : SaveDailyAttendanceRowDto
{
    // yyyy-MM-dd
    public string Date { get; set; } = string.Empty;
}

// The Daily Attendance list : an employee's month that has marks
public class AttendanceMonthRowDto
{
    public long EmployeeId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string DesignationName { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public int Year { get; set; }

    public int Month { get; set; }

    // Days with a mark, and how they are marked
    public int Days { get; set; }

    public int Present { get; set; }

    public int Late { get; set; }

    public int HalfDay { get; set; }

    public int Absent { get; set; }

    public int Leave { get; set; }

    public int Off { get; set; }

    public decimal OvertimeHours { get; set; }
}

// Only the days that are sent are saved
public class SaveEmployeeMonthDto
{
    public long EmployeeId { get; set; }

    public List<SaveEmployeeMonthDayDto> Days { get; set; } = new();
}


//---------------------------------------------------------------
// Monthly Attendance
//---------------------------------------------------------------

public class MonthlyAttendanceDayDto
{
    public int Day { get; set; }

    // Fri, Sat ...
    public string DayName { get; set; } = string.Empty;

    public string HolidayName { get; set; } = string.Empty;
}


public class MonthlyAttendanceRowDto
{
    public long EmployeeId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string DesignationName { get; set; } = string.Empty;

    // One cell per day of the month : P / L / H / A / WO / HD,
    // a leave short name (CL ...), NM = not marked, '' = a day
    // still to come, '-' = before joining
    public List<string> Cells { get; set; } = new();

    // P / L / H / A / LV / WO / HD / NM / '' / '-' (colours)
    public List<string> Kinds { get; set; } = new();

    public int Present { get; set; }

    public int Late { get; set; }

    public int HalfDay { get; set; }

    public int Absent { get; set; }

    public decimal PaidLeave { get; set; }

    public decimal UnpaidLeave { get; set; }

    public int WeeklyOff { get; set; }

    public int Holiday { get; set; }

    public int NotMarked { get; set; }

    public decimal OvertimeHours { get; set; }

    // The part of OvertimeHours on a weekly holiday / public holiday
    public decimal HolidayOvertimeHours { get; set; }

    // Days worked on a weekly holiday / public holiday (present or
    // late 1, half day 0.5) : the days attended above the working
    // days of the month
    public decimal ExtraDays { get; set; }

    // Days the salary is paid for : present, late, half day (0.5),
    // paid leave, weekly off, holiday
    public decimal PayableDays { get; set; }
}


public class MonthlyAttendanceDto
{
    public int Year { get; set; }

    public int Month { get; set; }

    public long BranchId { get; set; }

    public List<AttendanceLookupDto> Branches { get; set; } = new();

    public List<MonthlyAttendanceDayDto> Days { get; set; } = new();

    public List<MonthlyAttendanceRowDto> Rows { get; set; } = new();
}


//---------------------------------------------------------------
// Leave Applications
//---------------------------------------------------------------

public class LeaveApplicationDto
{
    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public long EmployeeId { get; set; }

    public string EmployeeCode { get; set; } = string.Empty;

    public string EmployeeName { get; set; } = string.Empty;

    public string DesignationName { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public long LeaveTypeId { get; set; }

    public string LeaveTypeName { get; set; } = string.Empty;

    public string LeaveShortName { get; set; } = string.Empty;

    public bool IsPaid { get; set; }

    public string FromDate { get; set; } = string.Empty;

    public string ToDate { get; set; } = string.Empty;

    public decimal Days { get; set; }

    public string Reason { get; set; } = string.Empty;

    // Pending / Approved / Rejected / Cancelled
    public string Status { get; set; } = "Pending";

    public string DecidedByName { get; set; } = string.Empty;

    public string DecidedDate { get; set; } = string.Empty;

    public string DecisionNote { get; set; } = string.Empty;

    public string AppliedDate { get; set; } = string.Empty;
}


public class SaveLeaveApplicationDto
{
    public long EmployeeId { get; set; }

    public long LeaveTypeId { get; set; }

    public string FromDate { get; set; } = string.Empty;

    public string ToDate { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;
}


public class LeaveDecisionDto
{
    public string Note { get; set; } = string.Empty;
}


public class LeaveEmployeeDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Gender { get; set; } = string.Empty;

    public string DesignationName { get; set; } = string.Empty;
}


public class LeaveTypeOptionDto
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string ShortName { get; set; } = string.Empty;

    public decimal DaysPerYear { get; set; }

    public bool IsPaid { get; set; }

    // All / Male / Female
    public string AppliesTo { get; set; } = "All";
}


public class LeaveApplicationDefaultsDto
{
    public string NextCode { get; set; } = string.Empty;

    public List<LeaveEmployeeDto> Employees { get; set; } = new();

    public List<LeaveTypeOptionDto> LeaveTypes { get; set; } = new();
}


// One leave type of an employee in a year
public class LeaveBalanceDto
{
    public long LeaveTypeId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string ShortName { get; set; } = string.Empty;

    // 0 = no limit
    public decimal Entitled { get; set; }

    // Leave days on the attendance of the year
    public decimal Used { get; set; }

    // Days of applications waiting for a decision
    public decimal Pending { get; set; }

    public decimal Remaining { get; set; }
}


// What a date range comes to for an employee (before saving)
public class LeaveDaysDto
{
    public decimal Days { get; set; }

    // Dates in the range that are weekly off days or holidays
    public int OffDays { get; set; }
}
