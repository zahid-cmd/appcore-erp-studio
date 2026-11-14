//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Attendance repository (hand-written pages) : Daily Attendance
// and Monthly Attendance
//===============================================================

public interface IAttendanceRepository
{
    // The day of a branch (0 = every branch) : active employees
    // who had joined, with their mark of the day
    Task<DailyAttendanceDto> GetDailyAsync(string date, long branchId);

    Task<DailyAttendanceSavedDto> SaveDailyAsync(SaveDailyAttendanceDto dto, long userId);

    // One employee, a row for every day of the month
    Task<EmployeeMonthDto> GetEmployeeMonthAsync(int year, int month, long employeeId, long branchId);

    // The list : every employee's month that has marks
    Task<List<AttendanceMonthRowDto>> GetEmployeeMonthsAsync();

    // The marks of the employee's month go (those written by a
    // leave application stay) : how many went
    Task<int> DeleteEmployeeMonthAsync(long employeeId, int year, int month, long userId);

    // The days sent are saved (each as a day of Daily Attendance)
    Task<DailyAttendanceSavedDto> SaveEmployeeMonthAsync(SaveEmployeeMonthDto dto, long userId);

    Task<MonthlyAttendanceDto> GetMonthlyAsync(int year, int month, long branchId);
}


//===============================================================
// Leave Applications repository (hand-written page)
//===============================================================

public interface ILeaveApplicationsRepository
{
    Task<List<LeaveApplicationDto>> GetListAsync();

    Task<LeaveApplicationDto> GetAsync(Guid publicId);

    Task<LeaveApplicationDefaultsDto> GetDefaultsAsync();

    // The balance of the leave year (a financial year) the date is
    // in (yyyy-MM-dd; none : today)
    Task<List<LeaveBalanceDto>> GetBalanceAsync(long employeeId, string? onDate);

    // Working days of a range for an employee
    Task<LeaveDaysDto> CountDaysAsync(long employeeId, string fromDate, string toDate);

    Task<LeaveApplicationDto> CreateAsync(SaveLeaveApplicationDto dto, long userId);

    // Pending applications only
    Task UpdateAsync(Guid publicId, SaveLeaveApplicationDto dto, long userId);

    // Pending -> Approved : the leave days go into the attendance
    Task ApproveAsync(Guid publicId, LeaveDecisionDto dto, long userId);

    // Pending -> Rejected
    Task RejectAsync(Guid publicId, LeaveDecisionDto dto, long userId);

    // Approved -> Cancelled : the leave days leave the attendance
    Task CancelAsync(Guid publicId, LeaveDecisionDto dto, long userId);

    // Pending / Rejected / Cancelled applications only
    Task DeleteAsync(Guid publicId, long userId);

    // The most recently deleted application back : its code; null = none
    Task<string?> RestoreAsync(long userId);
}
