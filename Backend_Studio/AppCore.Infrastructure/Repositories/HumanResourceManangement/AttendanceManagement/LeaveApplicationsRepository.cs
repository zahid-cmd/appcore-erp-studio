//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.HumanResourceManangement.AttendanceManagement;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.HumanResourceManangement.AttendanceManagement;
using AppCore.Domain.Entities.HumanResourceManangement.EmployeeManagement;
using AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup;
using AppCore.Domain.Entities.SecurityPermission.UserManagement;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Leave Applications Repository (hand-written page, 2026-11-13;
// NEVER run Code Sync for it)
//
//   Code LVA-0001 (deleted rows count, never reused).
//   Days = the working days of the range for the employee : the
//   weekly off days of the shift and the holidays are not leave.
//   Pending -> Approved : each working day becomes an LV row of
//   HrAttendance (a mark already on the day is replaced).
//   Approved -> Cancelled : those rows are taken out again.
//   Pending -> Rejected. Only a Pending application is edited;
//   an Approved one is cancelled first, then deleted.
//   Balance of a leave type in a year : Days per Year (0 = no
//   limit) less the LV days on the attendance, less the days of
//   Pending applications. One year only (no carry forward yet).
//===============================================================

public class LeaveApplicationsRepository
    : ILeaveApplicationsRepository
{
    private const string HistoryModule = "Human Resource";

    public const string HistoryEntity = "HrLeaveApplications";

    private const int MaxRangeDays = 120;

    private readonly AppDbContext _context;

    public LeaveApplicationsRepository(
        AppDbContext context)
    {
        _context = context;
    }

    private DbSet<HrLeaveApplications> Applications => _context.Set<HrLeaveApplications>();

    private DbSet<HrAttendance> Attendance => _context.Set<HrAttendance>();


    //===========================================================
    // Helpers
    //===========================================================

    private static string Clean(string? value) =>
        string.Join(" ", (value ?? string.Empty).Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries));

    private static string Limited(string? value, int max, string label)
    {
        string text = Clean(value);

        if (text.Length > max)
        {
            throw new InvalidOperationException($"{label} cannot be longer than {max} characters.");
        }

        return text;
    }

    private static string NextCode(IEnumerable<string> codes)
    {
        int highest = 0;

        foreach (string code in codes)
        {
            string value = (code ?? string.Empty).Trim();

            if (value.StartsWith("LVA-", StringComparison.OrdinalIgnoreCase)
                && int.TryParse(value.Substring(4), out int number)
                && number > highest)
            {
                highest = number;
            }
        }

        return $"LVA-{highest + 1:D4}";
    }

    private void AddHistory(long id, string type, string title, string description, long userId)
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = HistoryEntity,
                EntityId = id,
                ActivityType = type,
                ActivityTitle = title,
                ActivityDescription = description.Length > 1000 ? description.Substring(0, 1000) : description,
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = DateTime.UtcNow
            });
    }

    private async Task<HrLeaveApplications> FindAsync(Guid publicId)
    {
        return await Applications.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The leave application was not found.");
    }

    // The working days of the range for the employee (the weekly
    // holiday, the employee's own or the one of everyone, and the
    // holidays are left out)
    private async Task<List<DateOnly>> WorkingDaysAsync(long employeeId, DateOnly from, DateOnly to)
    {
        string weeklyOff =
            HrCalendar.OffDays(
                await _context.Set<HrEmployees>().AsNoTracking()
                    .Where(e => e.EmployeeId == employeeId)
                    .Select(e => e.WeeklyOffDays)
                    .FirstOrDefaultAsync(),
                await HrCalendar.DefaultOffDaysAsync(_context));

        Dictionary<DateOnly, string> holidays = await HrCalendar.HolidaysAsync(_context, from, to);

        List<DateOnly> days = new();

        for (DateOnly d = from; d <= to; d = d.AddDays(1))
        {
            if (!holidays.ContainsKey(d) && !HrCalendar.IsWeeklyOff(weeklyOff, d))
            {
                days.Add(d);
            }
        }

        return days;
    }

    //===========================================================
    // Read
    //===========================================================

    // Dates are formatted here, not in the database
    private sealed class Row
    {
        public HrLeaveApplications A = null!;
        public string EmployeeCode = string.Empty;
        public string EmployeeName = string.Empty;
        public string DesignationName = string.Empty;
        public string BranchName = string.Empty;
        public string LeaveTypeName = string.Empty;
        public string LeaveShortName = string.Empty;
        public bool IsPaid;
        public string DecidedByName = string.Empty;
    }

    private async Task<List<LeaveApplicationDto>> ReadAsync(IQueryable<HrLeaveApplications> source)
    {
        List<Row> rows =
            await (
                from a in source
                join e in _context.Set<HrEmployees>().AsNoTracking() on a.EmployeeId equals e.EmployeeId
                join t in _context.Set<HrLeaveTypes>().AsNoTracking() on a.LeaveTypeId equals t.LeaveTypeId
                join g in _context.Set<Designation>().AsNoTracking() on e.DesignationId equals g.DesignationId into gj
                from g in gj.DefaultIfEmpty()
                join b in _context.Set<Branches>().AsNoTracking() on e.BranchId equals b.BranchId into bj
                from b in bj.DefaultIfEmpty()
                orderby a.Code descending
                select new Row
                {
                    A = a,
                    EmployeeCode = e.Code,
                    EmployeeName = e.FullName,
                    DesignationName = g != null ? g.DesignationName : string.Empty,
                    BranchName = b != null ? b.BranchName : string.Empty,
                    LeaveTypeName = t.Name,
                    LeaveShortName = t.ShortName,
                    IsPaid = t.IsPaid
                })
            .ToListAsync();

        List<long> deciders =
            rows.Where(x => x.A.DecidedBy != null).Select(x => x.A.DecidedBy!.Value).Distinct().ToList();

        var users =
            await _context.Set<UserProfile>().AsNoTracking()
                .Where(x => deciders.Contains(x.UserProfileId))
                .Select(x => new { x.UserProfileId, x.DisplayName, x.UserName })
                .ToListAsync();

        return rows
            .Select(x =>
            {
                var user = users.FirstOrDefault(u => u.UserProfileId == x.A.DecidedBy);

                return new LeaveApplicationDto
                {
                    PublicId = x.A.PublicId,
                    Code = x.A.Code,
                    EmployeeId = x.A.EmployeeId,
                    EmployeeCode = x.EmployeeCode,
                    EmployeeName = x.EmployeeName,
                    DesignationName = x.DesignationName,
                    BranchName = x.BranchName,
                    LeaveTypeId = x.A.LeaveTypeId,
                    LeaveTypeName = x.LeaveTypeName,
                    LeaveShortName = x.LeaveShortName,
                    IsPaid = x.IsPaid,
                    FromDate = HrCalendar.Day(x.A.FromDate),
                    ToDate = HrCalendar.Day(x.A.ToDate),
                    Days = x.A.Days,
                    Reason = x.A.Reason,
                    Status = x.A.Status,
                    DecidedByName = user == null ? string.Empty : string.IsNullOrWhiteSpace(user.DisplayName) ? user.UserName : user.DisplayName,
                    DecidedDate = x.A.DecidedDate == null ? string.Empty : HrCalendar.Day(DateOnly.FromDateTime(x.A.DecidedDate.Value.AddHours(6))),
                    DecisionNote = x.A.DecisionNote,
                    AppliedDate = HrCalendar.Day(DateOnly.FromDateTime(x.A.CreatedDate.AddHours(6)))
                };
            })
            .ToList();
    }

    public Task<List<LeaveApplicationDto>> GetListAsync() =>
        ReadAsync(Applications.AsNoTracking().Where(x => !x.IsDeleted));

    public async Task<LeaveApplicationDto> GetAsync(Guid publicId)
    {
        return (await ReadAsync(Applications.AsNoTracking().Where(x => x.PublicId == publicId && !x.IsDeleted))).FirstOrDefault()
            ?? throw new KeyNotFoundException("The leave application was not found.");
    }

    public async Task<LeaveApplicationDefaultsDto> GetDefaultsAsync()
    {
        return new LeaveApplicationDefaultsDto
        {
            NextCode = NextCode(await Applications.AsNoTracking().Select(x => x.Code).ToListAsync()),

            Employees =
                await (
                    from e in _context.Set<HrEmployees>().AsNoTracking()
                    where !e.IsDeleted && e.IsActive
                    join g in _context.Set<Designation>().AsNoTracking() on e.DesignationId equals g.DesignationId into gj
                    from g in gj.DefaultIfEmpty()
                    orderby e.Code
                    select new LeaveEmployeeDto
                    {
                        Id = e.EmployeeId,
                        Code = e.Code,
                        Name = e.FullName,
                        Gender = e.Gender,
                        DesignationName = g != null ? g.DesignationName : string.Empty
                    })
                .ToListAsync(),

            LeaveTypes =
                await _context.Set<HrLeaveTypes>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.Code)
                    .Select(x => new LeaveTypeOptionDto
                    {
                        Id = x.LeaveTypeId,
                        Name = x.Name,
                        ShortName = x.ShortName,
                        DaysPerYear = x.DaysPerYear,
                        IsPaid = x.IsPaid,
                        AppliesTo = x.AppliesTo
                    })
                    .ToListAsync()
        };
    }

    public async Task<List<LeaveBalanceDto>> GetBalanceAsync(long employeeId, int year)
    {
        if (year < 2000 || year > 2100)
        {
            year = HrCalendar.Today().Year;
        }

        DateOnly first = new(year, 1, 1);
        DateOnly last = new(year, 12, 31);

        string gender =
            await _context.Set<HrEmployees>().AsNoTracking()
                .Where(x => x.EmployeeId == employeeId)
                .Select(x => x.Gender)
                .FirstOrDefaultAsync() ?? string.Empty;

        var types =
            await _context.Set<HrLeaveTypes>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.Code)
                .Select(x => new { x.LeaveTypeId, x.Name, x.ShortName, x.DaysPerYear, x.AppliesTo })
                .ToListAsync();

        var used =
            await Attendance.AsNoTracking()
                .Where(x => x.EmployeeId == employeeId && x.Status == "LV" && x.AttendanceDate >= first && x.AttendanceDate <= last)
                .GroupBy(x => x.LeaveTypeId)
                .Select(g => new { LeaveTypeId = g.Key, Days = g.Count() })
                .ToListAsync();

        var pending =
            await Applications.AsNoTracking()
                .Where(x => !x.IsDeleted && x.EmployeeId == employeeId && x.Status == "Pending" && x.FromDate >= first && x.FromDate <= last)
                .GroupBy(x => x.LeaveTypeId)
                .Select(g => new { LeaveTypeId = g.Key, Days = g.Sum(x => x.Days) })
                .ToListAsync();

        return types
            .Where(t => t.AppliesTo == "All" || gender.Length == 0 || t.AppliesTo == gender)
            .Select(t =>
            {
                decimal usedDays = used.FirstOrDefault(x => x.LeaveTypeId == t.LeaveTypeId)?.Days ?? 0;
                decimal pendingDays = pending.FirstOrDefault(x => x.LeaveTypeId == t.LeaveTypeId)?.Days ?? 0;

                return new LeaveBalanceDto
                {
                    LeaveTypeId = t.LeaveTypeId,
                    Name = t.Name,
                    ShortName = t.ShortName,
                    Entitled = t.DaysPerYear,
                    Used = usedDays,
                    Pending = pendingDays,
                    Remaining = t.DaysPerYear > 0 ? t.DaysPerYear - usedDays - pendingDays : 0
                };
            })
            .ToList();
    }

    public async Task<LeaveDaysDto> CountDaysAsync(long employeeId, string fromDate, string toDate)
    {
        DateOnly? from = HrCalendar.ParseDay(fromDate);
        DateOnly? to = HrCalendar.ParseDay(toDate) ?? from;

        if (from == null || to == null || to < from || to.Value.DayNumber - from.Value.DayNumber + 1 > MaxRangeDays)
        {
            return new LeaveDaysDto();
        }

        int working = (await WorkingDaysAsync(employeeId, from.Value, to.Value)).Count;

        return new LeaveDaysDto
        {
            Days = working,
            OffDays = to.Value.DayNumber - from.Value.DayNumber + 1 - working
        };
    }


    //===========================================================
    // Check + write
    //===========================================================

    // Checks the form and copies it to the application (Days too)
    private async Task ApplyAsync(HrLeaveApplications entity, SaveLeaveApplicationDto dto)
    {
        var employee =
            await _context.Set<HrEmployees>().AsNoTracking()
                .Where(x => x.EmployeeId == dto.EmployeeId && !x.IsDeleted)
                .Select(x => new { x.EmployeeId, x.Code, x.FullName, x.Gender, x.JoiningDate })
                .FirstOrDefaultAsync()
            ?? throw new InvalidOperationException("Pick the employee.");

        var type =
            await _context.Set<HrLeaveTypes>().AsNoTracking()
                .Where(x => x.LeaveTypeId == dto.LeaveTypeId && !x.IsDeleted)
                .Select(x => new { x.LeaveTypeId, x.Name, x.DaysPerYear, x.AppliesTo })
                .FirstOrDefaultAsync()
            ?? throw new InvalidOperationException("Pick the leave type.");

        if (type.AppliesTo != "All" && employee.Gender.Length > 0 && type.AppliesTo != employee.Gender)
        {
            throw new InvalidOperationException($"{type.Name} is for {type.AppliesTo.ToLowerInvariant()} employees only.");
        }

        DateOnly from =
            HrCalendar.ParseDay(dto.FromDate)
            ?? throw new InvalidOperationException("From Date is required.");

        DateOnly to =
            HrCalendar.ParseDay(string.IsNullOrWhiteSpace(dto.ToDate) ? dto.FromDate : dto.ToDate)
            ?? throw new InvalidOperationException("To Date is not a valid date.");

        if (to < from)
        {
            throw new InvalidOperationException("To Date cannot be before From Date.");
        }

        if (to.DayNumber - from.DayNumber + 1 > MaxRangeDays)
        {
            throw new InvalidOperationException($"A leave application can cover at most {MaxRangeDays} days.");
        }

        if (from < employee.JoiningDate)
        {
            throw new InvalidOperationException($"{employee.FullName} joined on {HrCalendar.Day(employee.JoiningDate)} : the leave starts before that.");
        }

        if (from.Year != to.Year)
        {
            throw new InvalidOperationException("A leave application stays inside one year : make one for each year.");
        }

        string reason = Limited(dto.Reason, 500, "Reason");

        if (reason.Length == 0)
        {
            throw new InvalidOperationException("Reason is required.");
        }

        long selfId = entity.LeaveApplicationId;

        HrLeaveApplications? overlap =
            await Applications.AsNoTracking()
                .Where(x => !x.IsDeleted
                         && x.EmployeeId == employee.EmployeeId
                         && x.LeaveApplicationId != selfId
                         && (x.Status == "Pending" || x.Status == "Approved")
                         && x.FromDate <= to && x.ToDate >= from)
                .OrderBy(x => x.FromDate)
                .FirstOrDefaultAsync();

        if (overlap != null)
        {
            throw new InvalidOperationException($"These dates overlap {overlap.Code} ({HrCalendar.Day(overlap.FromDate)} to {HrCalendar.Day(overlap.ToDate)}, {overlap.Status}).");
        }

        int days = (await WorkingDaysAsync(employee.EmployeeId, from, to)).Count;

        if (days == 0)
        {
            throw new InvalidOperationException("Every day of the range is a weekly off day or a holiday : no leave is needed.");
        }

        // the limit of the year (0 = no limit)
        if (type.DaysPerYear > 0)
        {
            LeaveBalanceDto? balance =
                (await GetBalanceAsync(employee.EmployeeId, from.Year)).FirstOrDefault(x => x.LeaveTypeId == type.LeaveTypeId);

            // this application's own pending days are in the balance
            decimal mine = entity.Status == "Pending" && entity.LeaveTypeId == type.LeaveTypeId && entity.FromDate.Year == from.Year ? entity.Days : 0;

            decimal remaining = (balance?.Remaining ?? type.DaysPerYear) + mine;

            if (days > remaining)
            {
                throw new InvalidOperationException($"{employee.FullName} has {Math.Max(0, remaining):0.##} day(s) of {type.Name} left in {from.Year} : this application needs {days}.");
            }
        }

        entity.EmployeeId = employee.EmployeeId;
        entity.LeaveTypeId = type.LeaveTypeId;
        entity.FromDate = from;
        entity.ToDate = to;
        entity.Days = days;
        entity.Reason = reason;
    }

    private async Task<string> DescribeAsync(HrLeaveApplications a)
    {
        string employee =
            await _context.Set<HrEmployees>().AsNoTracking()
                .Where(x => x.EmployeeId == a.EmployeeId)
                .Select(x => x.Code + " " + x.FullName)
                .FirstOrDefaultAsync() ?? string.Empty;

        string type =
            await _context.Set<HrLeaveTypes>().AsNoTracking()
                .Where(x => x.LeaveTypeId == a.LeaveTypeId)
                .Select(x => x.Name)
                .FirstOrDefaultAsync() ?? string.Empty;

        return $"{a.Code} : {employee}, {type}, {HrCalendar.Day(a.FromDate)} to {HrCalendar.Day(a.ToDate)} ({a.Days:0.##} day(s)).";
    }

    public async Task<LeaveApplicationDto> CreateAsync(SaveLeaveApplicationDto dto, long userId)
    {
        HrLeaveApplications entity = new() { Status = "Pending" };

        // a new application has no days in the balance yet
        entity.Days = 0;

        await ApplyAsync(entity, dto);

        await using var transaction = await _context.Database.BeginTransactionAsync();

        entity.Code = NextCode(await Applications.AsNoTracking().Select(x => x.Code).ToListAsync());
        entity.IsDeleted = false;
        entity.CreatedBy = userId;
        entity.CreatedDate = DateTime.UtcNow;

        Applications.Add(entity);

        await _context.SaveChangesAsync();

        AddHistory(entity.LeaveApplicationId, "Create", "Leave Application Created", await DescribeAsync(entity), userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await GetAsync(entity.PublicId);
    }

    public async Task UpdateAsync(Guid publicId, SaveLeaveApplicationDto dto, long userId)
    {
        HrLeaveApplications entity = await FindAsync(publicId);

        if (entity.Status != "Pending")
        {
            throw new InvalidOperationException($"{entity.Code} is {entity.Status} : only a Pending application can be changed.");
        }

        await ApplyAsync(entity, dto);

        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity.LeaveApplicationId, "Update", "Leave Application Updated", await DescribeAsync(entity), userId);

        await _context.SaveChangesAsync();
    }

    public async Task ApproveAsync(Guid publicId, LeaveDecisionDto dto, long userId)
    {
        HrLeaveApplications entity = await FindAsync(publicId);

        if (entity.Status != "Pending")
        {
            throw new InvalidOperationException($"{entity.Code} is already {entity.Status}.");
        }

        string note = Limited(dto.Note, 500, "Note");

        List<DateOnly> days = await WorkingDaysAsync(entity.EmployeeId, entity.FromDate, entity.ToDate);

        if (days.Count == 0)
        {
            throw new InvalidOperationException("Every day of the range is now a weekly off day or a holiday : reject the application instead.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        List<HrAttendance> marks =
            await Attendance
                .Where(x => x.EmployeeId == entity.EmployeeId && x.AttendanceDate >= entity.FromDate && x.AttendanceDate <= entity.ToDate)
                .ToListAsync();

        foreach (DateOnly day in days)
        {
            HrAttendance? mark = marks.FirstOrDefault(x => x.AttendanceDate == day);

            if (mark == null)
            {
                mark = new HrAttendance
                {
                    EmployeeId = entity.EmployeeId,
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

            // a mark already on the day (e.g. Absent) becomes leave
            mark.Status = "LV";
            mark.InTime = string.Empty;
            mark.OutTime = string.Empty;
            mark.LateMinutes = 0;
            mark.OvertimeHours = 0;
            mark.LeaveTypeId = entity.LeaveTypeId;
            mark.LeaveApplicationId = entity.LeaveApplicationId;
            mark.Remarks = entity.Code;
        }

        entity.Days = days.Count;
        entity.Status = "Approved";
        entity.DecidedBy = userId;
        entity.DecidedDate = DateTime.UtcNow;
        entity.DecisionNote = note;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity.LeaveApplicationId, "Approve", "Leave Application Approved", $"{await DescribeAsync(entity)}{(note.Length > 0 ? $" Note : {note}" : string.Empty)}", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }

    public async Task RejectAsync(Guid publicId, LeaveDecisionDto dto, long userId)
    {
        HrLeaveApplications entity = await FindAsync(publicId);

        if (entity.Status != "Pending")
        {
            throw new InvalidOperationException($"{entity.Code} is already {entity.Status}.");
        }

        string note = Limited(dto.Note, 500, "Note");

        if (note.Length == 0)
        {
            throw new InvalidOperationException("Write why the application is rejected.");
        }

        entity.Status = "Rejected";
        entity.DecidedBy = userId;
        entity.DecidedDate = DateTime.UtcNow;
        entity.DecisionNote = note;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity.LeaveApplicationId, "Reject", "Leave Application Rejected", $"{await DescribeAsync(entity)} Note : {note}", userId);

        await _context.SaveChangesAsync();
    }

    public async Task CancelAsync(Guid publicId, LeaveDecisionDto dto, long userId)
    {
        HrLeaveApplications entity = await FindAsync(publicId);

        if (entity.Status != "Approved")
        {
            throw new InvalidOperationException($"{entity.Code} is {entity.Status} : only an Approved application is cancelled.");
        }

        string note = Limited(dto.Note, 500, "Note");

        if (note.Length == 0)
        {
            throw new InvalidOperationException("Write why the leave is cancelled.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        // its leave days leave the attendance : the days are then
        // not marked and can be marked on Daily Attendance
        Attendance.RemoveRange(
            await Attendance.Where(x => x.LeaveApplicationId == entity.LeaveApplicationId).ToListAsync());

        entity.Status = "Cancelled";
        entity.DecidedBy = userId;
        entity.DecidedDate = DateTime.UtcNow;
        entity.DecisionNote = note;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity.LeaveApplicationId, "Cancel", "Leave Cancelled", $"{await DescribeAsync(entity)} Note : {note}", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }

    public async Task DeleteAsync(Guid publicId, long userId)
    {
        HrLeaveApplications entity = await FindAsync(publicId);

        if (entity.Status == "Approved")
        {
            throw new InvalidOperationException($"{entity.Code} is Approved : cancel the leave first, then delete it.");
        }

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        AddHistory(entity.LeaveApplicationId, "Delete", "Leave Application Deleted", await DescribeAsync(entity), userId);

        await _context.SaveChangesAsync();
    }

    public async Task<string?> RestoreAsync(long userId)
    {
        HrLeaveApplications? entity =
            await Applications.Where(x => x.IsDeleted).OrderByDescending(x => x.DeletedDate).FirstOrDefaultAsync();

        if (entity == null)
        {
            return null;
        }

        // a Pending one must still fit beside the others
        if (entity.Status == "Pending")
        {
            bool overlap =
                await Applications.AsNoTracking()
                    .AnyAsync(x => !x.IsDeleted
                                && x.EmployeeId == entity.EmployeeId
                                && (x.Status == "Pending" || x.Status == "Approved")
                                && x.FromDate <= entity.ToDate && x.ToDate >= entity.FromDate);

            if (overlap)
            {
                throw new InvalidOperationException($"{entity.Code} cannot be restored : its dates now overlap another leave application of the employee.");
            }
        }

        entity.IsDeleted = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity.LeaveApplicationId, "Restore", "Leave Application Restored", await DescribeAsync(entity), userId);

        await _context.SaveChangesAsync();

        return entity.Code;
    }
}
