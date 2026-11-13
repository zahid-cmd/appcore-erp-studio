//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.HrReports;


//===============================================================
// HR Reports repository (hand-written page; read only)
//===============================================================

public interface IHrReportsRepository
{
    Task<HrReportLookupsDto> GetLookupsAsync();

    // status : all / active / inactive; 0 = every branch / department
    Task<List<StaffListRowDto>> GetStaffListAsync(long branchId, long departmentId, string status);

    // Active employees : the leave days on the attendance of the
    // year against the leave types
    Task<LeaveBalanceReportDto> GetLeaveBalanceAsync(int year, long branchId);

    // The net pay of each month from the salary sheets of the
    // year; postedOnly leaves Draft and Approved sheets out
    Task<SalaryRegisterReportDto> GetSalaryRegisterAsync(int year, long branchId, bool postedOnly);
}
