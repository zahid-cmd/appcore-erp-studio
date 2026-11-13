//===============================================================
// Namespaces
//===============================================================

using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using AppCore.Application.HumanResourceManangement.AttendanceManagement;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.HumanResourceManangement.AttendanceManagement;
using AppCore.Domain.Entities.HumanResourceManangement.EmployeeManagement;
using AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.HumanResourceManangement.AttendanceManagement;


//===============================================================
// The HR calendar : today, week days, weekly off days, holidays
// (shared by attendance, leave and later payroll)
//===============================================================

public static class HrCalendar
{
    private static readonly string[] DayCodes = { "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" };

    public static readonly Regex TimeText = new(@"^([01]\d|2[0-3]):[0-5]\d$", RegexOptions.Compiled);

    // The business day (Bangladesh, UTC+6)
    public static DateOnly Today() =>
        DateOnly.FromDateTime(DateTime.UtcNow.AddHours(6));

    public static string Day(DateOnly? date) =>
        date?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty;

    public static DateOnly? ParseDay(string? value)
    {
        string text = (value ?? string.Empty).Trim();

        if (text.Length > 10)
        {
            text = text.Substring(0, 10);
        }

        return DateOnly.TryParseExact(text, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateOnly date)
            ? date
            : null;
    }

    public static string DayCode(DateOnly date) =>
        DayCodes[(int)date.DayOfWeek];

    // weeklyOffDays : "Fri" or "Fri,Sat"
    public static bool IsWeeklyOff(string? weeklyOffDays, DateOnly date) =>
        (weeklyOffDays ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Any(x => string.Equals(x.Trim(), DayCode(date), StringComparison.OrdinalIgnoreCase));

    // The working hours of a shift : its hours less the break (an
    // end before the start = a night shift). 8 when there is no
    // shift or its hours cannot be read.
    public static decimal ShiftHours(string? start, string? end, int breakMinutes)
    {
        if (start == null || end == null || !TimeText.IsMatch(start) || !TimeText.IsMatch(end))
        {
            return 8;
        }

        int span = Minutes(end) - Minutes(start);

        if (span <= 0)
        {
            span += 24 * 60;
        }

        decimal hours = Math.Round(Math.Max(0, span - breakMinutes) / 60m, 2);

        return hours > 0 ? hours : 8;
    }

    // The weekly holiday of everyone (Holidays > Weekly Holidays)
    public static async Task<string> DefaultOffDaysAsync(AppDbContext context) =>
        await context.Set<HrWeeklyHolidays>().AsNoTracking()
            .OrderBy(x => x.WeeklyHolidayId)
            .Select(x => x.WeeklyOffDays)
            .FirstOrDefaultAsync() ?? string.Empty;

    // The employee's own weekly holiday, or the one of everyone
    public static string OffDays(string? own, string everyone) =>
        string.IsNullOrWhiteSpace(own) ? everyone : own;

    // "fri, Sat" : "Fri,Sat" (week order). Not a week day, or the
    // whole week : an error.
    public static string CleanOffDays(string? value)
    {
        HashSet<string> asked =
            (value ?? string.Empty)
                .Split(new[] { ',', ' ', ';' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(x => x.Trim())
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

        string? unknown = asked.FirstOrDefault(x => !DayCodes.Contains(x, StringComparer.OrdinalIgnoreCase));

        if (unknown != null)
        {
            throw new InvalidOperationException($"Weekly holiday \"{unknown}\" is not a week day.");
        }

        if (asked.Count >= 7)
        {
            throw new InvalidOperationException("The week needs at least one working day.");
        }

        return string.Join(",", DayCodes.Where(x => asked.Contains(x)));
    }

    public static int Minutes(string time) =>
        int.Parse(time.Substring(0, 2), CultureInfo.InvariantCulture) * 60
        + int.Parse(time.Substring(3, 2), CultureInfo.InvariantCulture);

    // Every holiday date in the range with the holiday's name
    public static async Task<Dictionary<DateOnly, string>> HolidaysAsync(AppDbContext context, DateOnly from, DateOnly to)
    {
        var holidays =
            await context.Set<HrHolidays>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && x.FromDate <= to && x.ToDate >= from)
                .Select(x => new { x.Name, x.FromDate, x.ToDate })
                .ToListAsync();

        Dictionary<DateOnly, string> days = new();

        foreach (var h in holidays)
        {
            for (DateOnly d = h.FromDate < from ? from : h.FromDate; d <= h.ToDate && d <= to; d = d.AddDays(1))
            {
                days[d] = h.Name;
            }
        }

        return days;
    }
}


//===============================================================
// Attendance Repository (hand-written pages, 2026-11-13; NEVER
// run Code Sync for them)
//
//   Daily Attendance : one row per employee per day.
//     P Present, L Late, H Half Day, A Absent, LV Leave (with a
//     leave type), WO Weekly Off, HD Holiday; '' takes the mark
//     off. Present with an in time after the shift start + grace
//     is saved as Late (minutes from the shift start). A day in
//     the future cannot be marked. A leave day written by an
//     approved leave application is fixed here.
//   Monthly Attendance : a day without a row is a holiday, a
//     weekly off day, or "not marked".
//===============================================================

public class AttendanceRepository
    : IAttendanceRepository
{
    private const string HistoryModule = "Human Resource";

    public const string HistoryEntity = "HrAttendance";

    private static readonly string[] Statuses = { "P", "L", "H", "A", "LV", "WO", "HD" };

    private readonly AppDbContext _context;

    public AttendanceRepository(
        AppDbContext context)
    {
        _context = context;
    }

    private DbSet<HrAttendance> Attendance => _context.Set<HrAttendance>();

    private async Task<List<AttendanceLookupDto>> BranchesAsync()
    {
        return await _context.Set<Branches>().AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsActive)
            .OrderBy(x => x.BranchName)
            .Select(x => new AttendanceLookupDto { Id = x.BranchId, Name = x.BranchName })
            .ToListAsync();
    }


    //===========================================================
    // Daily Attendance
    //===========================================================

    public async Task<DailyAttendanceDto> GetDailyAsync(string date, long branchId)
    {
        DateOnly day = HrCalendar.ParseDay(date) ?? HrCalendar.Today();

        Dictionary<DateOnly, string> holidays = await HrCalendar.HolidaysAsync(_context, day, day);

        string holiday = holidays.TryGetValue(day, out string? name) ? name : string.Empty;

        var employees =
            await (
                from e in _context.Set<HrEmployees>().AsNoTracking()
                where !e.IsDeleted && e.IsActive && e.JoiningDate <= day && (branchId <= 0 || e.BranchId == branchId)
                join g in _context.Set<Designation>().AsNoTracking() on e.DesignationId equals g.DesignationId into gj
                from g in gj.DefaultIfEmpty()
                join s in _context.Set<HrShifts>().AsNoTracking() on e.ShiftId equals s.ShiftId into sj
                from s in sj.DefaultIfEmpty()
                join b in _context.Set<Branches>().AsNoTracking() on e.BranchId equals b.BranchId into bj
                from b in bj.DefaultIfEmpty()
                orderby e.Code
                select new
                {
                    e.EmployeeId,
                    e.Code,
                    e.FullName,
                    e.OvertimeAllowed,
                    DesignationName = g != null ? g.DesignationName : string.Empty,
                    BranchName = b != null ? b.BranchName : string.Empty,
                    ShiftName = s != null ? s.Name : string.Empty,
                    ShiftStart = s != null ? s.StartTime : string.Empty,
                    ShiftEnd = s != null ? s.EndTime : string.Empty,
                    GraceMinutes = s != null ? s.GraceMinutes : 0,
                    e.WeeklyOffDays
                })
            .ToListAsync();

        // the weekly holiday of everyone (an employee may have its own)
        string everyoneOff = await HrCalendar.DefaultOffDaysAsync(_context);

        List<long> ids = employees.Select(x => x.EmployeeId).ToList();

        List<HrAttendance> marks =
            await Attendance.AsNoTracking()
                .Where(x => x.AttendanceDate == day && ids.Contains(x.EmployeeId))
                .ToListAsync();

        List<long> applicationIds =
            marks.Where(x => x.LeaveApplicationId != null).Select(x => x.LeaveApplicationId!.Value).Distinct().ToList();

        var applications =
            await _context.Set<HrLeaveApplications>().AsNoTracking()
                .Where(x => applicationIds.Contains(x.LeaveApplicationId))
                .Select(x => new { x.LeaveApplicationId, x.Code })
                .ToListAsync();

        DailyAttendanceDto sheet = new()
        {
            Date = HrCalendar.Day(day),
            DayName = day.DayOfWeek.ToString(),
            HolidayName = holiday,
            BranchId = branchId <= 0 ? 0 : branchId,
            Branches = await BranchesAsync(),
            LeaveTypes =
                await _context.Set<HrLeaveTypes>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.Code)
                    .Select(x => new AttendanceLookupDto { Id = x.LeaveTypeId, Name = x.Name, Note = x.ShortName })
                    .ToListAsync()
        };

        foreach (var e in employees)
        {
            HrAttendance? mark = marks.FirstOrDefault(x => x.EmployeeId == e.EmployeeId);

            bool weeklyOff = HrCalendar.IsWeeklyOff(HrCalendar.OffDays(e.WeeklyOffDays, everyoneOff), day);

            sheet.Rows.Add(new DailyAttendanceRowDto
            {
                EmployeeId = e.EmployeeId,
                Code = e.Code,
                FullName = e.FullName,
                DesignationName = e.DesignationName,
                BranchName = e.BranchName,
                ShiftName = e.ShiftName,
                ShiftStart = e.ShiftStart,
                ShiftEnd = e.ShiftEnd,
                GraceMinutes = e.GraceMinutes,
                IsWeeklyOff = weeklyOff,
                OvertimeAllowed = e.OvertimeAllowed,
                // not marked yet : a holiday / weekly off day is offered
                Status = mark?.Status ?? (holiday.Length > 0 ? "HD" : weeklyOff ? "WO" : string.Empty),
                InTime = mark?.InTime ?? string.Empty,
                OutTime = mark?.OutTime ?? string.Empty,
                LateMinutes = mark?.LateMinutes ?? 0,
                OvertimeHours = mark?.OvertimeHours ?? 0,
                LeaveTypeId = mark?.LeaveTypeId ?? 0,
                Remarks = mark?.Remarks ?? string.Empty,
                IsSaved = mark != null,
                LeaveApplicationCode =
                    mark?.LeaveApplicationId == null
                        ? string.Empty
                        : applications.FirstOrDefault(a => a.LeaveApplicationId == mark.LeaveApplicationId)?.Code ?? "Leave application"
            });
        }

        return sheet;
    }

    public async Task<DailyAttendanceSavedDto> SaveDailyAsync(SaveDailyAttendanceDto dto, long userId)
    {
        DateOnly day =
            HrCalendar.ParseDay(dto.Date)
            ?? throw new InvalidOperationException("The attendance date is required.");

        if (day > HrCalendar.Today())
        {
            throw new InvalidOperationException("Attendance cannot be marked for a day that has not come yet.");
        }

        List<SaveDailyAttendanceRowDto> asked = dto.Rows ?? new();

        if (asked.Count == 0)
        {
            throw new InvalidOperationException("There is nothing to save.");
        }

        if (asked.GroupBy(x => x.EmployeeId).Any(g => g.Count() > 1))
        {
            throw new InvalidOperationException("An employee is on the sheet twice.");
        }

        List<long> ids = asked.Select(x => x.EmployeeId).ToList();

        var employees =
            await (
                from e in _context.Set<HrEmployees>().AsNoTracking()
                where !e.IsDeleted && ids.Contains(e.EmployeeId)
                join s in _context.Set<HrShifts>().AsNoTracking() on e.ShiftId equals s.ShiftId into sj
                from s in sj.DefaultIfEmpty()
                select new
                {
                    e.EmployeeId,
                    e.Code,
                    e.FullName,
                    e.JoiningDate,
                    e.OvertimeAllowed,
                    ShiftStart = s != null ? s.StartTime : string.Empty,
                    GraceMinutes = s != null ? s.GraceMinutes : 0
                })
            .ToListAsync();

        List<long> leaveTypeIds =
            await _context.Set<HrLeaveTypes>().AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select(x => x.LeaveTypeId)
                .ToListAsync();

        List<HrAttendance> marks =
            await Attendance.Where(x => x.AttendanceDate == day && ids.Contains(x.EmployeeId)).ToListAsync();

        DailyAttendanceSavedDto result = new();

        Dictionary<string, int> counts = new();

        foreach (SaveDailyAttendanceRowDto row in asked)
        {
            var employee =
                employees.FirstOrDefault(x => x.EmployeeId == row.EmployeeId)
                ?? throw new InvalidOperationException("An employee on the sheet was not found : refresh the page.");

            string who = $"{employee.Code} {employee.FullName}";

            HrAttendance? mark = marks.FirstOrDefault(x => x.EmployeeId == row.EmployeeId);

            // written by an approved leave application : fixed here
            if (mark?.LeaveApplicationId != null)
            {
                continue;
            }

            string status = (row.Status ?? string.Empty).Trim().ToUpperInvariant();

            if (status.Length == 0)
            {
                if (mark != null)
                {
                    Attendance.Remove(mark);
                    result.Cleared++;
                }

                continue;
            }

            if (!Statuses.Contains(status))
            {
                throw new InvalidOperationException($"{who} : \"{status}\" is not an attendance status.");
            }

            if (employee.JoiningDate > day)
            {
                throw new InvalidOperationException($"{who} joined on {HrCalendar.Day(employee.JoiningDate)} : the day is before that.");
            }

            long? leaveTypeId = null;

            if (status == "LV")
            {
                if (!leaveTypeIds.Contains(row.LeaveTypeId))
                {
                    throw new InvalidOperationException($"{who} : pick the leave type.");
                }

                leaveTypeId = row.LeaveTypeId;
            }

            bool worked = status is "P" or "L" or "H";

            string inTime = worked ? (row.InTime ?? string.Empty).Trim() : string.Empty;
            string outTime = worked ? (row.OutTime ?? string.Empty).Trim() : string.Empty;

            if (inTime.Length > 0 && !HrCalendar.TimeText.IsMatch(inTime))
            {
                throw new InvalidOperationException($"{who} : the In Time is not a time (24 hours, e.g. 09:05).");
            }

            if (outTime.Length > 0 && !HrCalendar.TimeText.IsMatch(outTime))
            {
                throw new InvalidOperationException($"{who} : the Out Time is not a time (24 hours, e.g. 18:00).");
            }

            int lateMinutes = 0;

            // Present / Late with an in time : the shift decides
            if (status is "P" or "L" && inTime.Length > 0 && HrCalendar.TimeText.IsMatch(employee.ShiftStart))
            {
                int late = HrCalendar.Minutes(inTime) - HrCalendar.Minutes(employee.ShiftStart);

                // a night shift : an in time after midnight
                if (late < -12 * 60)
                {
                    late += 24 * 60;
                }

                if (late > employee.GraceMinutes)
                {
                    status = "L";
                    lateMinutes = late;
                }
                else
                {
                    status = "P";
                }
            }

            decimal overtime = 0;

            if (worked && employee.OvertimeAllowed)
            {
                if (row.OvertimeHours < 0 || row.OvertimeHours > 24)
                {
                    throw new InvalidOperationException($"{who} : Overtime must be 0 to 24 hours.");
                }

                overtime = Math.Round(row.OvertimeHours, 2);
            }

            string remarks = string.Join(" ", (row.Remarks ?? string.Empty).Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries));

            if (remarks.Length > 200)
            {
                throw new InvalidOperationException($"{who} : Remarks cannot be longer than 200 characters.");
            }

            if (mark == null)
            {
                mark = new HrAttendance
                {
                    EmployeeId = row.EmployeeId,
                    AttendanceDate = day,
                    CreatedBy = userId,
                    CreatedDate = DateTime.UtcNow
                };

                Attendance.Add(mark);
            }
            else
            {
                mark.ModifiedBy = userId;
                mark.ModifiedDate = DateTime.UtcNow;
            }

            mark.Status = status;
            mark.InTime = inTime;
            mark.OutTime = outTime;
            mark.LateMinutes = lateMinutes;
            mark.OvertimeHours = overtime;
            mark.LeaveTypeId = leaveTypeId;
            mark.Remarks = remarks;

            result.Saved++;

            counts[status] = counts.TryGetValue(status, out int n) ? n + 1 : 1;
        }

        string summary =
            string.Join(", ", Statuses.Where(counts.ContainsKey).Select(s => $"{s} {counts[s]}"));

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = HistoryEntity,
                EntityId = day.DayNumber,
                ActivityType = "Update",
                ActivityTitle = "Attendance Saved",
                ActivityDescription = $"{HrCalendar.Day(day)} : {result.Saved} marked{(summary.Length > 0 ? $" ({summary})" : string.Empty)}{(result.Cleared > 0 ? $", {result.Cleared} cleared" : string.Empty)}.",
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = DateTime.UtcNow
            });

        await _context.SaveChangesAsync();

        return result;
    }


    //===========================================================
    // Daily Attendance by month : one employee, every day
    //===========================================================

    public async Task<EmployeeMonthDto> GetEmployeeMonthAsync(int year, int month, long employeeId, long branchId)
    {
        DateOnly today = HrCalendar.Today();

        if (year < 2000 || year > 2100 || month < 1 || month > 12)
        {
            year = today.Year;
            month = today.Month;
        }

        DateOnly first = new(year, month, 1);

        DateOnly last = first.AddMonths(1).AddDays(-1);

        // the employees of the branch who had joined by the end of
        // the month
        var employees =
            await (
                from e in _context.Set<HrEmployees>().AsNoTracking()
                where !e.IsDeleted && e.IsActive && e.JoiningDate <= last && (branchId <= 0 || e.BranchId == branchId)
                join g in _context.Set<Designation>().AsNoTracking() on e.DesignationId equals g.DesignationId into gj
                from g in gj.DefaultIfEmpty()
                join s in _context.Set<HrShifts>().AsNoTracking() on e.ShiftId equals s.ShiftId into sj
                from s in sj.DefaultIfEmpty()
                join b in _context.Set<Branches>().AsNoTracking() on e.BranchId equals b.BranchId into bj
                from b in bj.DefaultIfEmpty()
                orderby e.Code
                select new
                {
                    e.EmployeeId,
                    e.Code,
                    e.FullName,
                    e.JoiningDate,
                    e.OvertimeAllowed,
                    e.WeeklyOffDays,
                    DesignationName = g != null ? g.DesignationName : string.Empty,
                    BranchName = b != null ? b.BranchName : string.Empty,
                    ShiftName = s != null ? s.Name : string.Empty,
                    ShiftStart = s != null ? s.StartTime : string.Empty,
                    ShiftEnd = s != null ? s.EndTime : string.Empty,
                    GraceMinutes = s != null ? s.GraceMinutes : 0
                })
            .ToListAsync();

        EmployeeMonthDto sheet = new()
        {
            Year = year,
            Month = month,
            BranchId = branchId <= 0 ? 0 : branchId,
            Branches = await BranchesAsync(),
            Employees =
                employees
                    .Select(x => new AttendanceLookupDto { Id = x.EmployeeId, Name = x.Code + "  " + x.FullName, Note = x.DesignationName })
                    .ToList(),
            LeaveTypes =
                await _context.Set<HrLeaveTypes>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.Code)
                    .Select(x => new AttendanceLookupDto { Id = x.LeaveTypeId, Name = x.Name, Note = x.ShortName })
                    .ToListAsync()
        };

        // the employee asked for, or the first of the branch
        var employee =
            employees.FirstOrDefault(x => x.EmployeeId == employeeId) ?? employees.FirstOrDefault();

        if (employee == null)
        {
            return sheet;
        }

        sheet.EmployeeId = employee.EmployeeId;
        sheet.Code = employee.Code;
        sheet.FullName = employee.FullName;
        sheet.DesignationName = employee.DesignationName;
        sheet.BranchName = employee.BranchName;
        sheet.ShiftName = employee.ShiftName;
        sheet.ShiftStart = employee.ShiftStart;
        sheet.ShiftEnd = employee.ShiftEnd;
        sheet.GraceMinutes = employee.GraceMinutes;
        sheet.OvertimeAllowed = employee.OvertimeAllowed;

        Dictionary<DateOnly, string> holidays = await HrCalendar.HolidaysAsync(_context, first, last);

        // the weekly holiday : the employee's own, or the one of everyone
        string offDays = HrCalendar.OffDays(employee.WeeklyOffDays, await HrCalendar.DefaultOffDaysAsync(_context));

        List<HrAttendance> marks =
            await Attendance.AsNoTracking()
                .Where(x => x.EmployeeId == employee.EmployeeId && x.AttendanceDate >= first && x.AttendanceDate <= last)
                .ToListAsync();

        List<long> applicationIds =
            marks.Where(x => x.LeaveApplicationId != null).Select(x => x.LeaveApplicationId!.Value).Distinct().ToList();

        var applications =
            await _context.Set<HrLeaveApplications>().AsNoTracking()
                .Where(x => applicationIds.Contains(x.LeaveApplicationId))
                .Select(x => new { x.LeaveApplicationId, x.Code })
                .ToListAsync();

        for (DateOnly day = first; day <= last; day = day.AddDays(1))
        {
            HrAttendance? mark = marks.FirstOrDefault(x => x.AttendanceDate == day);

            string holiday = holidays.TryGetValue(day, out string? name) ? name : string.Empty;

            bool weeklyOff = HrCalendar.IsWeeklyOff(offDays, day);

            sheet.Days.Add(new EmployeeMonthDayDto
            {
                Date = HrCalendar.Day(day),
                DayName = day.DayOfWeek.ToString(),
                HolidayName = holiday,
                IsWeeklyOff = weeklyOff,
                IsFuture = day > today,
                BeforeJoining = day < employee.JoiningDate,
                // not marked yet : a holiday / weekly off day is offered
                Status = mark?.Status ?? (holiday.Length > 0 ? "HD" : weeklyOff ? "WO" : string.Empty),
                InTime = mark?.InTime ?? string.Empty,
                OutTime = mark?.OutTime ?? string.Empty,
                LateMinutes = mark?.LateMinutes ?? 0,
                OvertimeHours = mark?.OvertimeHours ?? 0,
                LeaveTypeId = mark?.LeaveTypeId ?? 0,
                Remarks = mark?.Remarks ?? string.Empty,
                IsSaved = mark != null,
                LeaveApplicationCode =
                    mark?.LeaveApplicationId == null
                        ? string.Empty
                        : applications.FirstOrDefault(a => a.LeaveApplicationId == mark.LeaveApplicationId)?.Code ?? "Leave application"
            });
        }

        return sheet;
    }

    // The list : every employee's month that has marks, newest
    // month first
    public async Task<List<AttendanceMonthRowDto>> GetEmployeeMonthsAsync()
    {
        var marks =
            await Attendance.AsNoTracking()
                .Select(x => new { x.EmployeeId, x.AttendanceDate, x.Status, x.OvertimeHours })
                .ToListAsync();

        List<long> ids = marks.Select(x => x.EmployeeId).Distinct().ToList();

        var employees =
            await (
                from e in _context.Set<HrEmployees>().AsNoTracking()
                where ids.Contains(e.EmployeeId)
                join g in _context.Set<Designation>().AsNoTracking() on e.DesignationId equals g.DesignationId into gj
                from g in gj.DefaultIfEmpty()
                join b in _context.Set<Branches>().AsNoTracking() on e.BranchId equals b.BranchId into bj
                from b in bj.DefaultIfEmpty()
                select new
                {
                    e.EmployeeId,
                    e.Code,
                    e.FullName,
                    e.BranchId,
                    DesignationName = g != null ? g.DesignationName : string.Empty,
                    BranchName = b != null ? b.BranchName : string.Empty
                })
            .ToListAsync();

        return marks
            .GroupBy(x => new { x.EmployeeId, x.AttendanceDate.Year, x.AttendanceDate.Month })
            .Select(g =>
            {
                var e = employees.FirstOrDefault(x => x.EmployeeId == g.Key.EmployeeId);

                return new AttendanceMonthRowDto
                {
                    EmployeeId = g.Key.EmployeeId,
                    Code = e?.Code ?? string.Empty,
                    FullName = e?.FullName ?? string.Empty,
                    DesignationName = e?.DesignationName ?? string.Empty,
                    BranchId = e?.BranchId ?? 0,
                    BranchName = e?.BranchName ?? string.Empty,
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    Days = g.Count(),
                    Present = g.Count(x => x.Status == "P"),
                    Late = g.Count(x => x.Status == "L"),
                    HalfDay = g.Count(x => x.Status == "H"),
                    Absent = g.Count(x => x.Status == "A"),
                    Leave = g.Count(x => x.Status == "LV"),
                    Off = g.Count(x => x.Status == "WO" || x.Status == "HD"),
                    OvertimeHours = g.Sum(x => x.OvertimeHours)
                };
            })
            .OrderByDescending(x => x.Year).ThenByDescending(x => x.Month).ThenBy(x => x.Code)
            .ToList();
    }

    public async Task<int> DeleteEmployeeMonthAsync(long employeeId, int year, int month, long userId)
    {
        if (year < 2000 || year > 2100 || month < 1 || month > 12)
        {
            throw new InvalidOperationException("The month is not valid.");
        }

        DateOnly first = new(year, month, 1);

        DateOnly last = first.AddMonths(1).AddDays(-1);

        List<HrAttendance> marks =
            await Attendance
                .Where(x => x.EmployeeId == employeeId && x.AttendanceDate >= first && x.AttendanceDate <= last)
                .ToListAsync();

        // a day written by an approved leave application stays : it
        // is changed on Leave Applications
        List<HrAttendance> mine = marks.Where(x => x.LeaveApplicationId == null).ToList();

        if (mine.Count == 0)
        {
            throw new InvalidOperationException(
                marks.Count > 0
                    ? "Every mark of the month comes from a leave application : change it on Leave Applications."
                    : "The employee has no attendance in that month.");
        }

        string who =
            await _context.Set<HrEmployees>().AsNoTracking()
                .Where(x => x.EmployeeId == employeeId)
                .Select(x => x.Code + " " + x.FullName)
                .FirstOrDefaultAsync() ?? "Employee";

        Attendance.RemoveRange(mine);

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = HistoryEntity,
                EntityId = first.DayNumber,
                ActivityType = "Delete",
                ActivityTitle = "Attendance Deleted",
                ActivityDescription = $"{who} : {mine.Count} day(s) of {first:MMMM yyyy} deleted{(marks.Count > mine.Count ? $"; {marks.Count - mine.Count} leave day(s) stay" : string.Empty)}.",
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = DateTime.UtcNow
            });

        await _context.SaveChangesAsync();

        return mine.Count;
    }

    // Every day sent is saved as a day of Daily Attendance (the same
    // checks), all of them or none
    public async Task<DailyAttendanceSavedDto> SaveEmployeeMonthAsync(SaveEmployeeMonthDto dto, long userId)
    {
        List<SaveEmployeeMonthDayDto> days = dto.Days ?? new();

        if (dto.EmployeeId <= 0 || days.Count == 0)
        {
            throw new InvalidOperationException("There is nothing to save.");
        }

        if (days.GroupBy(x => x.Date).Any(g => g.Count() > 1))
        {
            throw new InvalidOperationException("A day is on the sheet twice.");
        }

        DailyAttendanceSavedDto total = new();

        await using var transaction = await _context.Database.BeginTransactionAsync();

        foreach (SaveEmployeeMonthDayDto day in days.OrderBy(x => x.Date))
        {
            DailyAttendanceSavedDto saved =
                await SaveDailyAsync(
                    new SaveDailyAttendanceDto
                    {
                        Date = day.Date,
                        Rows =
                            new List<SaveDailyAttendanceRowDto>
                            {
                                new()
                                {
                                    EmployeeId = dto.EmployeeId,
                                    Status = day.Status,
                                    InTime = day.InTime,
                                    OutTime = day.OutTime,
                                    OvertimeHours = day.OvertimeHours,
                                    LeaveTypeId = day.LeaveTypeId,
                                    Remarks = day.Remarks
                                }
                            }
                    },
                    userId);

            total.Saved += saved.Saved;
            total.Cleared += saved.Cleared;
        }

        await transaction.CommitAsync();

        return total;
    }


    //===========================================================
    // Monthly Attendance
    //===========================================================

    public async Task<MonthlyAttendanceDto> GetMonthlyAsync(int year, int month, long branchId)
    {
        DateOnly today = HrCalendar.Today();

        if (year < 2000 || year > 2100 || month < 1 || month > 12)
        {
            year = today.Year;
            month = today.Month;
        }

        DateOnly first = new(year, month, 1);
        DateOnly last = first.AddMonths(1).AddDays(-1);

        Dictionary<DateOnly, string> holidays = await HrCalendar.HolidaysAsync(_context, first, last);

        List<HrAttendance> marks =
            await Attendance.AsNoTracking()
                .Where(x => x.AttendanceDate >= first && x.AttendanceDate <= last)
                .ToListAsync();

        HashSet<long> marked = marks.Select(x => x.EmployeeId).ToHashSet();

        // active employees who had joined by the month's end, and
        // anyone with a mark in the month (left since)
        var employees =
            (await (
                from e in _context.Set<HrEmployees>().AsNoTracking()
                where !e.IsDeleted && e.JoiningDate <= last && (branchId <= 0 || e.BranchId == branchId)
                join g in _context.Set<Designation>().AsNoTracking() on e.DesignationId equals g.DesignationId into gj
                from g in gj.DefaultIfEmpty()
                join s in _context.Set<HrShifts>().AsNoTracking() on e.ShiftId equals s.ShiftId into sj
                from s in sj.DefaultIfEmpty()
                orderby e.Code
                select new
                {
                    e.EmployeeId,
                    e.Code,
                    e.FullName,
                    e.IsActive,
                    e.JoiningDate,
                    DesignationName = g != null ? g.DesignationName : string.Empty,
                    e.WeeklyOffDays
                })
            .ToListAsync())
            .Where(e => e.IsActive || marked.Contains(e.EmployeeId))
            .ToList();

        // the weekly holiday of everyone (an employee may have its own)
        string everyoneOff = await HrCalendar.DefaultOffDaysAsync(_context);

        var leaveTypes =
            await _context.Set<HrLeaveTypes>().AsNoTracking()
                .Select(x => new { x.LeaveTypeId, x.ShortName, x.IsPaid })
                .ToListAsync();

        MonthlyAttendanceDto sheet = new()
        {
            Year = year,
            Month = month,
            BranchId = branchId <= 0 ? 0 : branchId,
            Branches = await BranchesAsync()
        };

        for (DateOnly d = first; d <= last; d = d.AddDays(1))
        {
            sheet.Days.Add(new MonthlyAttendanceDayDto
            {
                Day = d.Day,
                DayName = HrCalendar.DayCode(d),
                HolidayName = holidays.TryGetValue(d, out string? name) ? name : string.Empty
            });
        }

        ILookup<long, HrAttendance> byEmployee = marks.ToLookup(x => x.EmployeeId);

        foreach (var e in employees)
        {
            Dictionary<DateOnly, HrAttendance> mine = byEmployee[e.EmployeeId].ToDictionary(x => x.AttendanceDate);

            MonthlyAttendanceRowDto row = new()
            {
                EmployeeId = e.EmployeeId,
                Code = e.Code,
                FullName = e.FullName,
                DesignationName = e.DesignationName
            };

            for (DateOnly d = first; d <= last; d = d.AddDays(1))
            {
                string cell;
                string kind;

                if (d < e.JoiningDate)
                {
                    cell = "-";
                    kind = "-";
                }
                else if (mine.TryGetValue(d, out HrAttendance? mark))
                {
                    kind = mark.Status;
                    cell = mark.Status;

                    switch (mark.Status)
                    {
                        case "P":
                            row.Present++;
                            break;

                        case "L":
                            row.Late++;
                            break;

                        case "H":
                            row.HalfDay++;
                            break;

                        case "A":
                            row.Absent++;
                            break;

                        case "WO":
                            row.WeeklyOff++;
                            break;

                        case "HD":
                            row.Holiday++;
                            break;

                        case "LV":
                            var type = leaveTypes.FirstOrDefault(x => x.LeaveTypeId == mark.LeaveTypeId);

                            cell = string.IsNullOrWhiteSpace(type?.ShortName) ? "LV" : type!.ShortName;

                            if (type == null || type.IsPaid)
                            {
                                row.PaidLeave++;
                            }
                            else
                            {
                                row.UnpaidLeave++;
                            }

                            break;
                    }

                    row.OvertimeHours += mark.OvertimeHours;

                    // worked on a weekly holiday / public holiday : an
                    // extra day, and its overtime hours are holiday hours
                    if (holidays.ContainsKey(d)
                        || HrCalendar.IsWeeklyOff(HrCalendar.OffDays(e.WeeklyOffDays, everyoneOff), d))
                    {
                        row.HolidayOvertimeHours += mark.OvertimeHours;

                        row.ExtraDays +=
                            mark.Status == "P" || mark.Status == "L" ? 1
                            : mark.Status == "H" ? 0.5m
                            : 0;
                    }
                }
                else if (holidays.ContainsKey(d))
                {
                    cell = "HD";
                    kind = "HD";

                    if (d <= today)
                    {
                        row.Holiday++;
                    }
                }
                else if (HrCalendar.IsWeeklyOff(HrCalendar.OffDays(e.WeeklyOffDays, everyoneOff), d))
                {
                    cell = "WO";
                    kind = "WO";

                    if (d <= today)
                    {
                        row.WeeklyOff++;
                    }
                }
                else if (d > today)
                {
                    cell = string.Empty;
                    kind = string.Empty;
                }
                else
                {
                    cell = "NM";
                    kind = "NM";
                    row.NotMarked++;
                }

                row.Cells.Add(cell);
                row.Kinds.Add(kind);
            }

            row.PayableDays =
                row.Present + row.Late + row.HalfDay * 0.5m + row.PaidLeave + row.WeeklyOff + row.Holiday;

            sheet.Rows.Add(row);
        }

        return sheet;
    }
}
