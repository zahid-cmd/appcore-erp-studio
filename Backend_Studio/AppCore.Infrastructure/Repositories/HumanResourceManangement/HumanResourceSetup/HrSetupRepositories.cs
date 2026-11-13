//===============================================================
// Namespaces
//===============================================================

using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using AppCore.Application.HumanResourceManangement.HumanResourceSetup;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.HumanResourceManangement.EmployeeManagement;
using AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup;
using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Human Resource Setup repositories (hand-written pages,
// 2026-11-13; NEVER run Code Sync for them)
//
//   HrShiftsRepository        SFT-001
//   HrHolidaysRepository      HOL-0001
//   HrLeaveTypesRepository    LVT-001
//   HrSalaryHeadsRepository   SLH-001
//
// The base does what the four pages share : the code (deleted
// rows count, never reused), the unique name, soft delete,
// restore of the latest deleted row and the history. Each page
// checks and copies its own fields in ApplyAsync.
//===============================================================

public abstract class HrSetupRepositoryBase<TEntity, TDto>
    : IHrSetupRepository<TDto>
    where TEntity : class, IHrSetupEntity, new()
    where TDto : HrSetupDto
{
    protected const string HistoryModule = "Human Resource";

    protected readonly AppDbContext Context;

    protected HrSetupRepositoryBase(
        AppDbContext context)
    {
        Context = context;
    }

    protected DbSet<TEntity> Rows => Context.Set<TEntity>();


    //===========================================================
    // The page
    //===========================================================

    public abstract string HistoryEntity { get; }

    // "Shift", "Holiday" ... (messages and history titles)
    protected abstract string Label { get; }

    protected abstract string CodePrefix { get; }

    protected abstract int CodeDigits { get; }

    protected abstract int NameMax { get; }

    // false : the name may repeat (a holiday comes every year)
    protected virtual bool NameIsUnique => true;

    protected abstract long IdOf(TEntity entity);

    protected abstract TDto ToDto(TEntity entity);

    // Checks the page's own fields and copies them to the entity
    // (InvalidOperationException = a rule message for the user)
    protected abstract Task ApplyAsync(TEntity entity, TDto dto);

    protected virtual Task CheckDeleteAsync(TEntity entity) => Task.CompletedTask;

    protected virtual Task CheckRestoreAsync(TEntity entity) => Task.CompletedTask;

    protected virtual IQueryable<TEntity> Ordered(IQueryable<TEntity> query) => query.OrderBy(x => x.Code);

    protected virtual string Summary(TEntity entity) => string.Empty;


    //===========================================================
    // Helpers
    //===========================================================

    protected static string Clean(string? value) =>
        string.Join(" ", (value ?? string.Empty).Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries));

    protected static string Limited(string? value, int max, string label)
    {
        string text = Clean(value);

        if (text.Length > max)
        {
            throw new InvalidOperationException($"{label} cannot be longer than {max} characters.");
        }

        return text;
    }

    protected static string OneOf(string? value, string[] allowed, string label)
    {
        string text = Clean(value);

        return allowed.FirstOrDefault(x => string.Equals(x, text, StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException($"Pick the {label}.");
    }

    private string NextCode(IEnumerable<string> codes)
    {
        int highest = 0;

        foreach (string code in codes)
        {
            string value = (code ?? string.Empty).Trim();

            if (value.StartsWith(CodePrefix, StringComparison.OrdinalIgnoreCase)
                && int.TryParse(value.Substring(CodePrefix.Length), out int number)
                && number > highest)
            {
                highest = number;
            }
        }

        return CodePrefix + (highest + 1).ToString(new string('0', CodeDigits));
    }

    private async Task<string> NextCodeAsync() =>
        NextCode(await Rows.AsNoTracking().Select(x => x.Code).ToListAsync());

    protected void AddHistory(long id, string type, string title, string description, long userId)
    {
        Context.ActivityHistories.Add(
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

    private async Task<TEntity> FindAsync(Guid publicId)
    {
        return await Rows.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException($"The {Label.ToLowerInvariant()} was not found.");
    }

    private async Task<string> CheckNameAsync(TDto dto, Guid self)
    {
        string name = Limited(dto.Name, NameMax, "Name");

        if (name.Length == 0)
        {
            throw new InvalidOperationException("Name is required.");
        }

        if (NameIsUnique)
        {
            string lower = name.ToLower();

            bool taken =
                await Rows.AsNoTracking()
                    .AnyAsync(x => !x.IsDeleted && x.Name.ToLower() == lower && x.PublicId != self);

            if (taken)
            {
                throw new InvalidOperationException($"A {Label.ToLowerInvariant()} named \"{name}\" already exists.");
            }
        }

        return name;
    }

    private string Described(TEntity entity)
    {
        string summary = Summary(entity);

        return summary.Length == 0
            ? $"{entity.Code} {entity.Name}"
            : $"{entity.Code} {entity.Name} : {summary}";
    }


    //===========================================================
    // Read
    //===========================================================

    public async Task<List<TDto>> GetListAsync()
    {
        List<TEntity> rows =
            await Ordered(Rows.AsNoTracking().Where(x => !x.IsDeleted)).ToListAsync();

        return rows.Select(ToDto).ToList();
    }

    public async Task<TDto> GetAsync(Guid publicId)
    {
        TEntity entity =
            await Rows.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException($"The {Label.ToLowerInvariant()} was not found.");

        return ToDto(entity);
    }

    public async Task<HrSetupDefaultsDto> GetDefaultsAsync() =>
        new() { NextCode = await NextCodeAsync() };


    //===========================================================
    // Write
    //===========================================================

    public async Task<TDto> CreateAsync(TDto dto, long userId)
    {
        TEntity entity = new();

        entity.Name = await CheckNameAsync(dto, Guid.Empty);
        entity.IsActive = dto.IsActive;

        await ApplyAsync(entity, dto);

        entity.Code = await NextCodeAsync();
        entity.IsDeleted = false;
        entity.CreatedBy = userId;
        entity.CreatedDate = DateTime.UtcNow;

        await using var transaction = await Context.Database.BeginTransactionAsync();

        Rows.Add(entity);

        await Context.SaveChangesAsync();

        AddHistory(IdOf(entity), "Create", $"{Label} Created", Described(entity), userId);

        await Context.SaveChangesAsync();

        await transaction.CommitAsync();

        return ToDto(entity);
    }

    public async Task UpdateAsync(Guid publicId, TDto dto, long userId)
    {
        TEntity entity = await FindAsync(publicId);

        entity.Name = await CheckNameAsync(dto, entity.PublicId);
        entity.IsActive = dto.IsActive;

        await ApplyAsync(entity, dto);

        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(IdOf(entity), "Update", $"{Label} Updated", Described(entity), userId);

        await Context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid publicId, long userId)
    {
        TEntity entity = await FindAsync(publicId);

        await CheckDeleteAsync(entity);

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        AddHistory(IdOf(entity), "Delete", $"{Label} Deleted", $"{entity.Code} {entity.Name}", userId);

        await Context.SaveChangesAsync();
    }

    public async Task<string?> RestoreAsync(long userId)
    {
        TEntity? entity =
            await Rows.Where(x => x.IsDeleted).OrderByDescending(x => x.DeletedDate).FirstOrDefaultAsync();

        if (entity == null)
        {
            return null;
        }

        if (NameIsUnique)
        {
            string lower = entity.Name.ToLower();

            bool taken =
                await Rows.AsNoTracking().AnyAsync(x => !x.IsDeleted && x.Name.ToLower() == lower);

            if (taken)
            {
                throw new InvalidOperationException($"{entity.Code} cannot be restored : a {Label.ToLowerInvariant()} named \"{entity.Name}\" already exists.");
            }
        }

        await CheckRestoreAsync(entity);

        entity.IsDeleted = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(IdOf(entity), "Restore", $"{Label} Restored", $"{entity.Code} {entity.Name}", userId);

        await Context.SaveChangesAsync();

        return entity.Code;
    }
}


//===============================================================
// Shifts
//===============================================================

public class HrShiftsRepository
    : HrSetupRepositoryBase<HrShifts, HrShiftDto>
{
    private static readonly Regex TimeText = new(@"^([01]\d|2[0-3]):[0-5]\d$", RegexOptions.Compiled);

    public HrShiftsRepository(AppDbContext context) : base(context) { }

    public override string HistoryEntity => "HrShifts";

    protected override string Label => "Shift";

    protected override string CodePrefix => "SFT-";

    protected override int CodeDigits => 3;

    protected override int NameMax => 100;

    protected override long IdOf(HrShifts entity) => entity.ShiftId;

    private static int Minutes(string time) =>
        int.Parse(time.Substring(0, 2), CultureInfo.InvariantCulture) * 60
        + int.Parse(time.Substring(3, 2), CultureInfo.InvariantCulture);

    // Minutes on duty (an end before the start runs past midnight)
    private static int DutyMinutes(HrShifts s)
    {
        if (!TimeText.IsMatch(s.StartTime) || !TimeText.IsMatch(s.EndTime))
        {
            return 0;
        }

        int span = Minutes(s.EndTime) - Minutes(s.StartTime);

        return span > 0 ? span : span + 24 * 60;
    }

    protected override HrShiftDto ToDto(HrShifts s) =>
        new()
        {
            PublicId = s.PublicId,
            Code = s.Code,
            Name = s.Name,
            StartTime = s.StartTime,
            EndTime = s.EndTime,
            GraceMinutes = s.GraceMinutes,
            BreakMinutes = s.BreakMinutes,
            Hours = $"{s.StartTime} - {s.EndTime}",
            WorkingHours = Math.Round(Math.Max(0, DutyMinutes(s) - s.BreakMinutes) / 60m, 2),
            Remarks = s.Remarks,
            IsActive = s.IsActive
        };

    protected override string Summary(HrShifts s) =>
        $"{s.StartTime} - {s.EndTime}, grace {s.GraceMinutes} min, break {s.BreakMinutes} min.";

    protected override Task ApplyAsync(HrShifts entity, HrShiftDto dto)
    {
        string start = Clean(dto.StartTime);
        string end = Clean(dto.EndTime);

        if (!TimeText.IsMatch(start))
        {
            throw new InvalidOperationException("Start Time is required (24 hours, e.g. 09:00).");
        }

        if (!TimeText.IsMatch(end))
        {
            throw new InvalidOperationException("End Time is required (24 hours, e.g. 18:00).");
        }

        if (start == end)
        {
            throw new InvalidOperationException("Start Time and End Time cannot be the same.");
        }

        if (dto.GraceMinutes < 0 || dto.GraceMinutes > 180)
        {
            throw new InvalidOperationException("Grace Time must be 0 to 180 minutes.");
        }

        if (dto.BreakMinutes < 0 || dto.BreakMinutes > 240)
        {
            throw new InvalidOperationException("Break must be 0 to 240 minutes.");
        }

        entity.StartTime = start;
        entity.EndTime = end;
        entity.GraceMinutes = dto.GraceMinutes;
        entity.BreakMinutes = dto.BreakMinutes;
        entity.Remarks = Limited(dto.Remarks, 500, "Remarks");

        if (DutyMinutes(entity) <= entity.BreakMinutes)
        {
            throw new InvalidOperationException("The break cannot be as long as the shift.");
        }

        return Task.CompletedTask;
    }

    protected override async Task CheckDeleteAsync(HrShifts entity)
    {
        int used =
            await Context.Set<HrEmployees>().AsNoTracking()
                .CountAsync(x => !x.IsDeleted && x.ShiftId == entity.ShiftId);

        if (used > 0)
        {
            throw new InvalidOperationException($"{entity.Code} {entity.Name} is the shift of {used} employee(s) : move them to another shift first (or make the shift Inactive).");
        }
    }
}


//===============================================================
// Holidays
//===============================================================

public class HrHolidaysRepository
    : HrSetupRepositoryBase<HrHolidays, HrHolidayDto>
{
    public static readonly string[] HolidayTypes = { "Public", "Festival", "Company" };

    private const int MaxDays = 60;

    public HrHolidaysRepository(AppDbContext context) : base(context) { }

    public override string HistoryEntity => "HrHolidays";

    protected override string Label => "Holiday";

    protected override string CodePrefix => "HOL-";

    protected override int CodeDigits => 4;

    protected override int NameMax => 150;

    // Eid, Victory Day ... come every year
    protected override bool NameIsUnique => false;

    protected override long IdOf(HrHolidays entity) => entity.HolidayId;

    protected override IQueryable<HrHolidays> Ordered(IQueryable<HrHolidays> query) =>
        query.OrderByDescending(x => x.FromDate).ThenBy(x => x.Code);

    private static string Day(DateOnly date) =>
        date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static DateOnly ParseDay(string? value, string label)
    {
        return DateOnly.TryParseExact((value ?? string.Empty).Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateOnly date)
            ? date
            : throw new InvalidOperationException($"{label} is required.");
    }

    protected override HrHolidayDto ToDto(HrHolidays h) =>
        new()
        {
            PublicId = h.PublicId,
            Code = h.Code,
            Name = h.Name,
            HolidayType = h.HolidayType,
            FromDate = Day(h.FromDate),
            ToDate = Day(h.ToDate),
            Days = h.ToDate.DayNumber - h.FromDate.DayNumber + 1,
            Year = h.FromDate.Year,
            Remarks = h.Remarks,
            IsActive = h.IsActive
        };

    protected override string Summary(HrHolidays h) =>
        h.FromDate == h.ToDate
            ? $"{h.HolidayType}, {Day(h.FromDate)}."
            : $"{h.HolidayType}, {Day(h.FromDate)} to {Day(h.ToDate)} ({h.ToDate.DayNumber - h.FromDate.DayNumber + 1} days).";

    private async Task CheckOverlapAsync(HrHolidays entity)
    {
        DateOnly from = entity.FromDate;
        DateOnly to = entity.ToDate;
        Guid self = entity.PublicId;

        HrHolidays? other =
            await Rows.AsNoTracking()
                .Where(x => !x.IsDeleted && x.PublicId != self && x.FromDate <= to && x.ToDate >= from)
                .OrderBy(x => x.FromDate)
                .FirstOrDefaultAsync();

        if (other != null)
        {
            throw new InvalidOperationException($"These dates overlap {other.Code} {other.Name} ({Day(other.FromDate)} to {Day(other.ToDate)}).");
        }
    }

    protected override async Task ApplyAsync(HrHolidays entity, HrHolidayDto dto)
    {
        entity.HolidayType = OneOf(dto.HolidayType, HolidayTypes, "holiday type");
        entity.FromDate = ParseDay(dto.FromDate, "From Date");
        entity.ToDate = ParseDay(string.IsNullOrWhiteSpace(dto.ToDate) ? dto.FromDate : dto.ToDate, "To Date");
        entity.Remarks = Limited(dto.Remarks, 500, "Remarks");

        if (entity.ToDate < entity.FromDate)
        {
            throw new InvalidOperationException("To Date cannot be before From Date.");
        }

        if (entity.ToDate.DayNumber - entity.FromDate.DayNumber + 1 > MaxDays)
        {
            throw new InvalidOperationException($"A holiday can be at most {MaxDays} days long.");
        }

        await CheckOverlapAsync(entity);
    }

    protected override Task CheckRestoreAsync(HrHolidays entity) =>
        CheckOverlapAsync(entity);
}


//===============================================================
// Leave Types
//===============================================================

public class HrLeaveTypesRepository
    : HrSetupRepositoryBase<HrLeaveTypes, HrLeaveTypeDto>
{
    public static readonly string[] AppliesToList = { "All", "Male", "Female" };

    public HrLeaveTypesRepository(AppDbContext context) : base(context) { }

    public override string HistoryEntity => "HrLeaveTypes";

    protected override string Label => "Leave Type";

    protected override string CodePrefix => "LVT-";

    protected override int CodeDigits => 3;

    protected override int NameMax => 100;

    protected override long IdOf(HrLeaveTypes entity) => entity.LeaveTypeId;

    protected override HrLeaveTypeDto ToDto(HrLeaveTypes l) =>
        new()
        {
            PublicId = l.PublicId,
            Code = l.Code,
            Name = l.Name,
            ShortName = l.ShortName,
            DaysPerYear = l.DaysPerYear,
            IsPaid = l.IsPaid,
            CarryForward = l.CarryForward,
            MaxCarryDays = l.MaxCarryDays,
            AppliesTo = l.AppliesTo,
            Remarks = l.Remarks,
            IsActive = l.IsActive
        };

    protected override string Summary(HrLeaveTypes l) =>
        $"{l.ShortName}, {l.DaysPerYear:0.##} day(s) a year, {(l.IsPaid ? "paid" : "unpaid")}{(l.CarryForward ? $", carry forward up to {l.MaxCarryDays:0.##}" : string.Empty)}.";

    protected override async Task ApplyAsync(HrLeaveTypes entity, HrLeaveTypeDto dto)
    {
        string shortName = Limited(dto.ShortName, 10, "Short Name").ToUpperInvariant();

        if (shortName.Length == 0)
        {
            throw new InvalidOperationException("Short Name is required (e.g. CL).");
        }

        Guid self = entity.PublicId;

        bool taken =
            await Rows.AsNoTracking()
                .AnyAsync(x => !x.IsDeleted && x.ShortName == shortName && x.PublicId != self);

        if (taken)
        {
            throw new InvalidOperationException($"Short Name \"{shortName}\" is already used by another leave type.");
        }

        if (dto.DaysPerYear < 0 || dto.DaysPerYear > 366)
        {
            throw new InvalidOperationException("Days per Year must be 0 to 366.");
        }

        if (dto.MaxCarryDays < 0 || dto.MaxCarryDays > 366)
        {
            throw new InvalidOperationException("Maximum Carry Forward must be 0 to 366 days.");
        }

        entity.ShortName = shortName;
        entity.DaysPerYear = Math.Round(dto.DaysPerYear, 2);
        entity.IsPaid = dto.IsPaid;
        entity.CarryForward = dto.CarryForward;
        entity.MaxCarryDays = dto.CarryForward ? Math.Round(dto.MaxCarryDays, 2) : 0;
        entity.AppliesTo = OneOf(dto.AppliesTo, AppliesToList, "\"Applies To\" value");
        entity.Remarks = Limited(dto.Remarks, 500, "Remarks");
    }
}


//===============================================================
// Salary Heads
//===============================================================

public class HrSalaryHeadsRepository
    : HrSetupRepositoryBase<HrSalaryHeads, HrSalaryHeadDto>
{
    public static readonly string[] HeadTypes = { "Earning", "Deduction" };

    public static readonly string[] CalcTypes = { "Fixed", "Percent" };

    public const string BasicKey = "BASIC";

    public HrSalaryHeadsRepository(AppDbContext context) : base(context) { }

    public override string HistoryEntity => "HrSalaryHeads";

    protected override string Label => "Salary Head";

    protected override string CodePrefix => "SLH-";

    protected override int CodeDigits => 3;

    protected override int NameMax => 100;

    protected override long IdOf(HrSalaryHeads entity) => entity.SalaryHeadId;

    protected override IQueryable<HrSalaryHeads> Ordered(IQueryable<HrSalaryHeads> query) =>
        query.OrderBy(x => x.HeadType == "Earning" ? 0 : 1).ThenBy(x => x.DisplayOrder).ThenBy(x => x.Code);

    protected override HrSalaryHeadDto ToDto(HrSalaryHeads h) =>
        new()
        {
            SalaryHeadId = h.SalaryHeadId,
            PublicId = h.PublicId,
            Code = h.Code,
            Name = h.Name,
            HeadType = h.HeadType,
            CalcType = h.CalcType,
            DefaultValue = h.DefaultValue,
            SystemKey = h.SystemKey,
            IsProrated = h.IsProrated,
            DisplayOrder = h.DisplayOrder,
            Remarks = h.Remarks,
            IsActive = h.IsActive
        };

    protected override string Summary(HrSalaryHeads h) =>
        h.SystemKey.Length > 0 && h.SystemKey != BasicKey
            ? $"{h.HeadType}, worked out by payroll."
            : $"{h.HeadType}, {(h.CalcType == "Percent" ? $"{h.DefaultValue:0.##} % of Basic" : $"fixed Tk {h.DefaultValue:0.##}")}.";

    protected override Task ApplyAsync(HrSalaryHeads entity, HrSalaryHeadDto dto)
    {
        if (dto.DisplayOrder < 0 || dto.DisplayOrder > 9999)
        {
            throw new InvalidOperationException("Display Order must be 0 to 9999.");
        }

        entity.DisplayOrder = dto.DisplayOrder;
        entity.Remarks = Limited(dto.Remarks, 500, "Remarks");

        if (entity.SystemKey.Length > 0)
        {
            // A system head : its type and calculation are fixed and
            // payroll needs it, so it stays active. Only the name,
            // order and remarks change.
            if (!dto.IsActive)
            {
                throw new InvalidOperationException($"{entity.Name} is used by payroll and cannot be made Inactive.");
            }

            return Task.CompletedTask;
        }

        string headType = OneOf(dto.HeadType, HeadTypes, "head type (Earning or Deduction)");
        string calcType = OneOf(dto.CalcType, CalcTypes, "calculation (Fixed or Percent)");

        if (dto.DefaultValue < 0)
        {
            throw new InvalidOperationException("Default Value cannot be negative.");
        }

        if (calcType == "Percent" && dto.DefaultValue > 500)
        {
            throw new InvalidOperationException("A percent of Basic cannot be more than 500.");
        }

        entity.HeadType = headType;
        entity.CalcType = calcType;
        entity.DefaultValue = Math.Round(dto.DefaultValue, 2);
        entity.IsProrated = dto.IsProrated;

        return Task.CompletedTask;
    }

    protected override async Task CheckDeleteAsync(HrSalaryHeads entity)
    {
        if (entity.SystemKey.Length > 0)
        {
            throw new InvalidOperationException($"{entity.Name} is used by payroll and cannot be deleted.");
        }

        long id = entity.SalaryHeadId;

        int structures =
            await (
                from line in Context.Set<HrSalaryStructureLines>().AsNoTracking()
                join structure in Context.Set<HrSalaryStructures>().AsNoTracking() on line.SalaryStructureId equals structure.SalaryStructureId
                where line.SalaryHeadId == id && !structure.IsDeleted
                select line.SalaryStructureId)
            .Distinct()
            .CountAsync();

        if (structures > 0)
        {
            throw new InvalidOperationException($"{entity.Code} {entity.Name} is on {structures} salary structure(s) : remove it there first (or make the head Inactive).");
        }

        int used =
            await (
                from line in Context.Set<HrEmployeeSalaryLines>().AsNoTracking()
                join employee in Context.Set<HrEmployees>().AsNoTracking() on line.EmployeeId equals employee.EmployeeId
                where line.SalaryHeadId == id && !employee.IsDeleted
                select line.EmployeeId)
            .Distinct()
            .CountAsync();

        if (used > 0)
        {
            throw new InvalidOperationException($"{entity.Code} {entity.Name} is on the salary structure of {used} employee(s) : remove it there first (or make the head Inactive).");
        }
    }
}
