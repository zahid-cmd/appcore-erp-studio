//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.HumanResourceManangement.HrReports;
using AppCore.Domain.Entities.HumanResourceManangement.AttendanceManagement;
using AppCore.Domain.Entities.HumanResourceManangement.EmployeeManagement;
using AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup;
using AppCore.Domain.Entities.HumanResourceManangement.PayrollManagement;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.HumanResourceManangement.HrReports;


//===============================================================
// HR Reports Repository (hand-written page, 2026-11-13; NEVER run
// Code Sync for it). Read only.
//
//   Staff List       employees with their job and salary
//   Leave Balance    active employees : the leave (LV) days on
//                    the attendance of the year by leave type,
//                    against Days per Year (0 = no limit)
//   Salary Register  the net pay of each month from the live
//                    salary sheets of the year, by employee
//===============================================================

public class HrReportsRepository
    : IHrReportsRepository
{
    private readonly AppDbContext _context;

    public HrReportsRepository(
        AppDbContext context)
    {
        _context = context;
    }

    private static string Clean(string? value) =>
        string.Join(" ", (value ?? string.Empty).Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries));

    public async Task<HrReportLookupsDto> GetLookupsAsync()
    {
        int thisYear = HrCalendar.Today().Year;

        List<int> sheetYears =
            await _context.Set<HrSalarySheets>().AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select(x => x.Year)
                .Distinct()
                .ToListAsync();

        DateOnly? firstMark =
            await _context.Set<HrAttendance>().AsNoTracking()
                .OrderBy(x => x.AttendanceDate)
                .Select(x => (DateOnly?)x.AttendanceDate)
                .FirstOrDefaultAsync();

        HashSet<int> years = new(sheetYears) { thisYear };

        for (int y = firstMark?.Year ?? thisYear; y <= thisYear; y++)
        {
            years.Add(y);
        }

        return new HrReportLookupsDto
        {
            Branches =
                await _context.Set<Branches>().AsNoTracking()
                    .Where(x => !x.IsDeleted)
                    .OrderBy(x => x.BranchName)
                    .Select(x => new HrReportLookupDto { Id = x.BranchId, Name = x.BranchName })
                    .ToListAsync(),

            Departments =
                await _context.Set<Department>().AsNoTracking()
                    .Where(x => !x.IsDeleted)
                    .OrderBy(x => x.DepartmentName)
                    .Select(x => new HrReportLookupDto { Id = x.DepartmentId, Name = x.DepartmentName })
                    .ToListAsync(),

            Years = years.OrderByDescending(x => x).ToList()
        };
    }


    //===========================================================
    // Staff List
    //===========================================================

    public async Task<List<StaffListRowDto>> GetStaffListAsync(long branchId, long departmentId, string status)
    {
        string wanted = (status ?? string.Empty).Trim().ToLowerInvariant();

        var rows =
            await (
                from e in _context.Set<HrEmployees>().AsNoTracking()
                where !e.IsDeleted
                   && (branchId <= 0 || e.BranchId == branchId)
                   && (departmentId <= 0 || e.DepartmentId == departmentId)
                   && (wanted != "active" || e.IsActive)
                   && (wanted != "inactive" || !e.IsActive)
                join b in _context.Set<Branches>().AsNoTracking() on e.BranchId equals b.BranchId into bj
                from b in bj.DefaultIfEmpty()
                join d in _context.Set<Department>().AsNoTracking() on e.DepartmentId equals d.DepartmentId into dj
                from d in dj.DefaultIfEmpty()
                join g in _context.Set<Designation>().AsNoTracking() on e.DesignationId equals g.DesignationId into gj
                from g in gj.DefaultIfEmpty()
                join s in _context.Set<HrShifts>().AsNoTracking() on e.ShiftId equals s.ShiftId into sj
                from s in sj.DefaultIfEmpty()
                orderby e.Code
                select new
                {
                    E = e,
                    BranchName = b != null ? b.BranchName : string.Empty,
                    DepartmentName = d != null ? d.DepartmentName : string.Empty,
                    DesignationName = g != null ? g.DesignationName : string.Empty,
                    ShiftName = s != null ? s.Name : string.Empty
                })
            .ToListAsync();

        return rows
            .Select(x => new StaffListRowDto
            {
                Code = x.E.Code,
                FullName = x.E.FullName,
                DesignationName = x.DesignationName,
                DepartmentName = x.DepartmentName,
                BranchName = x.BranchName,
                ShiftName = x.ShiftName,
                EmploymentType = x.E.EmploymentType,
                JoiningDate = HrCalendar.Day(x.E.JoiningDate),
                ConfirmationDate = HrCalendar.Day(x.E.ConfirmationDate),
                Gender = x.E.Gender,
                DateOfBirth = HrCalendar.Day(x.E.DateOfBirth),
                BloodGroup = x.E.BloodGroup,
                MobileNo = x.E.MobileNo,
                NationalId = x.E.NationalId,
                PaymentMode = x.E.PaymentMode,
                PaymentAccount =
                    x.E.PaymentMode == "Bank" ? Clean($"{x.E.BankName} {x.E.BankAccountNo}")
                    : x.E.PaymentMode == "MFS" ? Clean($"{x.E.MfsName} {x.E.MfsNo}")
                    : string.Empty,
                GrossSalary = x.E.GrossSalary,
                IsActive = x.E.IsActive
            })
            .ToList();
    }


    //===========================================================
    // Leave Balance
    //===========================================================

    public async Task<LeaveBalanceReportDto> GetLeaveBalanceAsync(int year, long branchId)
    {
        if (year < 2000 || year > 2100)
        {
            year = HrCalendar.Today().Year;
        }

        DateOnly first = new(year, 1, 1);
        DateOnly last = new(year, 12, 31);

        var types =
            await _context.Set<HrLeaveTypes>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.Code)
                .Select(x => new { x.LeaveTypeId, x.Name, x.ShortName, x.DaysPerYear, x.AppliesTo })
                .ToListAsync();

        var employees =
            await (
                from e in _context.Set<HrEmployees>().AsNoTracking()
                where !e.IsDeleted && e.IsActive && e.JoiningDate <= last && (branchId <= 0 || e.BranchId == branchId)
                join g in _context.Set<Designation>().AsNoTracking() on e.DesignationId equals g.DesignationId into gj
                from g in gj.DefaultIfEmpty()
                orderby e.Code
                select new
                {
                    e.EmployeeId,
                    e.Code,
                    e.FullName,
                    e.Gender,
                    DesignationName = g != null ? g.DesignationName : string.Empty
                })
            .ToListAsync();

        List<long> ids = employees.Select(x => x.EmployeeId).ToList();

        var used =
            await _context.Set<HrAttendance>().AsNoTracking()
                .Where(x => x.Status == "LV" && x.AttendanceDate >= first && x.AttendanceDate <= last && ids.Contains(x.EmployeeId))
                .GroupBy(x => new { x.EmployeeId, x.LeaveTypeId })
                .Select(g => new { g.Key.EmployeeId, g.Key.LeaveTypeId, Days = g.Count() })
                .ToListAsync();

        LeaveBalanceReportDto report = new()
        {
            Year = year,
            LeaveTypes =
                types
                    .Select(t => new LeaveBalanceTypeDto { LeaveTypeId = t.LeaveTypeId, Name = t.Name, ShortName = t.ShortName, DaysPerYear = t.DaysPerYear })
                    .ToList()
        };

        foreach (var e in employees)
        {
            LeaveBalanceRowDto row = new()
            {
                Code = e.Code,
                FullName = e.FullName,
                DesignationName = e.DesignationName
            };

            foreach (var t in types)
            {
                bool applies = t.AppliesTo == "All" || e.Gender.Length == 0 || t.AppliesTo == e.Gender;

                decimal days =
                    used.FirstOrDefault(x => x.EmployeeId == e.EmployeeId && x.LeaveTypeId == t.LeaveTypeId)?.Days ?? 0;

                row.Cells.Add(new LeaveBalanceCellDto
                {
                    Applies = applies || days > 0,
                    Used = days,
                    Remaining = t.DaysPerYear > 0 ? t.DaysPerYear - days : 0
                });

                row.TotalUsed += days;
            }

            report.Rows.Add(row);
        }

        return report;
    }


    //===========================================================
    // Salary Register
    //===========================================================

    public async Task<SalaryRegisterReportDto> GetSalaryRegisterAsync(int year, long branchId, bool postedOnly)
    {
        if (year < 2000 || year > 2100)
        {
            year = HrCalendar.Today().Year;
        }

        var sheets =
            await _context.Set<HrSalarySheets>().AsNoTracking()
                .Where(x => !x.IsDeleted
                         && x.Year == year
                         && (branchId <= 0 || x.BranchId == branchId)
                         && (!postedOnly || x.Status == "Posted"))
                .Select(x => new { x.SalarySheetId, x.Month, x.Status })
                .ToListAsync();

        List<long> sheetIds = sheets.Select(x => x.SalarySheetId).ToList();

        var lines =
            await _context.Set<HrSalarySheetLines>().AsNoTracking()
                .Where(x => sheetIds.Contains(x.SalarySheetId))
                .Select(x => new
                {
                    x.SalarySheetId,
                    x.EmployeeId,
                    x.EmployeeCode,
                    x.EmployeeName,
                    x.DesignationName,
                    x.GrossSalary,
                    x.EarnedSalary,
                    x.StructureDeduction,
                    x.OtherDeduction,
                    x.AdvanceDeduction,
                    x.NetPay
                })
                .ToListAsync();

        SalaryRegisterReportDto report = new() { Year = year };

        for (int month = 1; month <= 12; month++)
        {
            List<string> statuses = sheets.Where(x => x.Month == month).Select(x => x.Status).Distinct().ToList();

            report.MonthStatus.Add(statuses.Count == 0 ? string.Empty : statuses.Count == 1 ? statuses[0] : "Mixed");
        }

        Dictionary<long, int> monthOf = sheets.ToDictionary(x => x.SalarySheetId, x => x.Month);

        foreach (var group in lines.GroupBy(x => x.EmployeeId))
        {
            // the name as on the latest sheet of the year
            var latest = group.OrderByDescending(x => monthOf[x.SalarySheetId]).First();

            SalaryRegisterRowDto row = new()
            {
                Code = latest.EmployeeCode,
                FullName = latest.EmployeeName,
                DesignationName = latest.DesignationName,
                Net = Enumerable.Repeat(0m, 12).ToList()
            };

            foreach (var line in group)
            {
                row.Net[monthOf[line.SalarySheetId] - 1] += line.NetPay;
                row.TotalGross += line.GrossSalary;
                row.TotalEarned += line.EarnedSalary;
                row.TotalDeductions += line.StructureDeduction + line.OtherDeduction + line.AdvanceDeduction;
                row.TotalNet += line.NetPay;
            }

            report.Rows.Add(row);
        }

        report.Rows = report.Rows.OrderBy(x => x.Code).ToList();

        return report;
    }
}
