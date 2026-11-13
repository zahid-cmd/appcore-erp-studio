//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.HumanResourceManangement.HumanResourceSetup;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.HumanResourceManangement.EmployeeManagement;
using AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Overtime Structures Repository (hand-written page, 2026-11-14;
// NEVER run Code Sync for it)
//
//   Code OTS-001 (deleted rows count, never reused). The name is
//   not typed : Overtime Structure - 1 / 2 / 3, from the code.
//   One Default among live, active structures : saving a new
//   Default clears the old one first (same transaction).
//
//   Overtime is paid on two bases (Amount) :
//     extra hours  hours x hour rate x multiplier; the hours on a
//                  weekly holiday / public holiday have their own
//                  multiplier
//     extra days   days worked on a weekly holiday / public
//                  holiday x day rate x multiplier
//   day rate  = base / days in the month (a fixed number, or the
//               real days of the month)
//   hour rate = day rate / hours a day (the working hours of the
//               employee's shift : not typed on the structure)
//   base      = the employee's Basic or Gross salary; Fixed : the
//               hour rate is typed and day rate = that x hours a day
//
//   The Employee Profile picks one structure when Overtime allowed
//   is on. Nothing is copied to the employee : the salary sheet
//   reads the structure when it is worked out.
//===============================================================

public class OvertimeStructuresRepository
    : IOvertimeStructuresRepository
{
    private const string HistoryModule = "Human Resource";

    public const string HistoryEntity = "HrOvertimeStructures";

    public const string BaseBasic = "Basic";

    public const string BaseGross = "Gross";

    public const string BaseFixed = "Fixed";

    public const string DaysFixed = "Fixed";

    public const string DaysActual = "Actual";

    private readonly AppDbContext _context;

    public OvertimeStructuresRepository(
        AppDbContext context)
    {
        _context = context;
    }

    private DbSet<HrOvertimeStructures> Structures => _context.Set<HrOvertimeStructures>();


    //===========================================================
    // For payroll
    //===========================================================

    // The day rate and the hour rate of an employee on a structure.
    // hoursPerDay : the working hours of the employee's shift.
    public static (decimal DayRate, decimal HourRate) Rates(HrOvertimeStructures s, decimal basic, decimal gross, int monthDays, decimal hoursPerDay)
    {
        decimal hours = hoursPerDay;

        if (s.RateBase == BaseFixed)
        {
            return (s.FixedHourRate * hours, s.FixedHourRate);
        }

        decimal days = s.MonthDaysMode == DaysActual ? monthDays : s.MonthDays;

        decimal amount = s.RateBase == BaseGross ? gross : basic;

        decimal dayRate = days > 0 ? amount / days : 0;

        decimal hourRate = hours > 0 ? dayRate / hours : 0;

        return (dayRate, hourRate);
    }

    // The overtime pay of a month : extra hours (normal and on a
    // holiday) and extra days
    public static decimal Amount(
        HrOvertimeStructures s,
        decimal basic,
        decimal gross,
        int monthDays,
        decimal hoursPerDay,
        decimal normalHours,
        decimal holidayHours,
        decimal extraDays)
    {
        (decimal dayRate, decimal hourRate) = Rates(s, basic, gross, monthDays, hoursPerDay);

        decimal amount = 0;

        if (s.PayExtraHours)
        {
            amount += hourRate * (Math.Max(0, normalHours) * s.HourMultiplier + Math.Max(0, holidayHours) * s.HolidayHourMultiplier);
        }

        if (s.PayExtraDays)
        {
            amount += dayRate * Math.Max(0, extraDays) * s.DayMultiplier;
        }

        return Math.Round(amount, 2, MidpointRounding.AwayFromZero);
    }


    //===========================================================
    // Helpers
    //===========================================================

    private static string Clean(string? value) =>
        string.Join(" ", (value ?? string.Empty).Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries));

    private static string NextCode(IEnumerable<string> codes)
    {
        int highest = 0;

        foreach (string code in codes)
        {
            string value = (code ?? string.Empty).Trim();

            if (value.StartsWith("OTS-", StringComparison.OrdinalIgnoreCase)
                && int.TryParse(value.Substring(4), out int number)
                && number > highest)
            {
                highest = number;
            }
        }

        return $"OTS-{highest + 1:D3}";
    }

    // OTS-003 : Overtime Structure - 3 (the name is not typed)
    private static string NameOf(string code) =>
        $"Overtime Structure - {int.Parse(code.Substring(4))}";

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

    private async Task<HrOvertimeStructures> FindAsync(Guid publicId)
    {
        return await Structures.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The overtime structure was not found.");
    }

    private static string Described(HrOvertimeStructures s)
    {
        string rate =
            s.RateBase == BaseFixed
                ? $"Tk {s.FixedHourRate:#,0.##} an hour"
                : $"{s.RateBase} / {(s.MonthDaysMode == DaysActual ? "days of the month" : s.MonthDays + " days")} / shift hours";

        string hours = s.PayExtraHours ? $"extra hours x {s.HourMultiplier:0.###} (holiday x {s.HolidayHourMultiplier:0.###})" : "no extra hours";

        string days = s.PayExtraDays ? $"extra days x {s.DayMultiplier:0.###}" : "no extra days";

        return $"{s.Code} {s.Name} : {rate}; {hours}; {days}{(s.IsDefault ? "; Default" : string.Empty)}.";
    }


    //===========================================================
    // Read
    //===========================================================

    private async Task<List<OvertimeStructureDto>> ReadAsync(IQueryable<HrOvertimeStructures> source)
    {
        List<HrOvertimeStructures> structures = await source.OrderBy(x => x.Code).ToListAsync();

        List<long> ids = structures.Select(x => x.OvertimeStructureId).ToList();

        var employees =
            await _context.Set<HrEmployees>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.OvertimeStructureId != null && ids.Contains(x.OvertimeStructureId.Value))
                .GroupBy(x => x.OvertimeStructureId)
                .Select(g => new { OvertimeStructureId = g.Key, Count = g.Count() })
                .ToListAsync();

        return structures
            .Select(s => new OvertimeStructureDto
            {
                OvertimeStructureId = s.OvertimeStructureId,
                PublicId = s.PublicId,
                Code = s.Code,
                Name = s.Name,
                RateBase = s.RateBase,
                FixedHourRate = s.FixedHourRate,
                MonthDaysMode = s.MonthDaysMode,
                MonthDays = s.MonthDays,
                PayExtraHours = s.PayExtraHours,
                HourMultiplier = s.HourMultiplier,
                HolidayHourMultiplier = s.HolidayHourMultiplier,
                PayExtraDays = s.PayExtraDays,
                DayMultiplier = s.DayMultiplier,
                IsDefault = s.IsDefault && s.IsActive,
                Remarks = s.Remarks,
                IsActive = s.IsActive,
                EmployeeCount = employees.FirstOrDefault(e => e.OvertimeStructureId == s.OvertimeStructureId)?.Count ?? 0
            })
            .ToList();
    }

    public Task<List<OvertimeStructureDto>> GetListAsync() =>
        ReadAsync(Structures.AsNoTracking().Where(x => !x.IsDeleted));

    public async Task<OvertimeStructureDto> GetAsync(Guid publicId)
    {
        return (await ReadAsync(Structures.AsNoTracking().Where(x => x.PublicId == publicId && !x.IsDeleted))).FirstOrDefault()
            ?? throw new KeyNotFoundException("The overtime structure was not found.");
    }

    public async Task<OvertimeStructureDefaultsDto> GetDefaultsAsync()
    {
        var current =
            await Structures.AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && x.IsDefault)
                .Select(x => new { x.Code, x.PublicId })
                .FirstOrDefaultAsync();

        string nextCode = NextCode(await Structures.AsNoTracking().Select(x => x.Code).ToListAsync());

        // the first shift : its working hours are the example's
        // hours a day
        HrShifts? shift =
            await _context.Set<HrShifts>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.Code)
                .FirstOrDefaultAsync();

        return new OvertimeStructureDefaultsDto
        {
            NextCode = nextCode,
            NextName = NameOf(nextCode),
            ShiftName = shift?.Name ?? string.Empty,
            ShiftHours = HrCalendar.ShiftHours(shift?.StartTime, shift?.EndTime, shift?.BreakMinutes ?? 0),
            DefaultCode = current?.Code ?? string.Empty,
            DefaultPublicId = current?.PublicId
        };
    }


    //===========================================================
    // Check + write
    //===========================================================

    private static void Apply(HrOvertimeStructures entity, OvertimeStructureDto dto)
    {
        string rateBase =
            string.Equals(dto.RateBase, BaseFixed, StringComparison.OrdinalIgnoreCase) ? BaseFixed
            : string.Equals(dto.RateBase, BaseGross, StringComparison.OrdinalIgnoreCase) ? BaseGross
            : BaseBasic;

        string daysMode =
            string.Equals(dto.MonthDaysMode, DaysActual, StringComparison.OrdinalIgnoreCase) ? DaysActual : DaysFixed;

        decimal fixedRate = 0;

        int monthDays = dto.MonthDays;

        if (rateBase == BaseFixed)
        {
            fixedRate = Math.Round(dto.FixedHourRate, 2);

            if (fixedRate <= 0)
            {
                throw new InvalidOperationException("Type the fixed rate (Tk an hour).");
            }

            daysMode = DaysFixed;
        }

        if (daysMode == DaysFixed && rateBase != BaseFixed && (monthDays < 1 || monthDays > 31))
        {
            throw new InvalidOperationException("Days in the month must be 1 to 31.");
        }

        if (monthDays < 1 || monthDays > 31)
        {
            monthDays = 26;
        }

        if (!dto.PayExtraHours && !dto.PayExtraDays)
        {
            throw new InvalidOperationException("Switch on Extra hours or Extra days : the structure pays nothing.");
        }

        decimal Multiplier(decimal value, string label)
        {
            decimal number = Math.Round(value, 3);

            if (number <= 0 || number > 10)
            {
                throw new InvalidOperationException($"{label} must be more than 0 and no more than 10.");
            }

            return number;
        }

        entity.RateBase = rateBase;
        entity.FixedHourRate = fixedRate;
        entity.MonthDaysMode = daysMode;
        entity.MonthDays = monthDays;
        entity.PayExtraHours = dto.PayExtraHours;
        entity.HourMultiplier = dto.PayExtraHours ? Multiplier(dto.HourMultiplier, "The multiplier of extra hours") : 1;
        entity.HolidayHourMultiplier = dto.PayExtraHours ? Multiplier(dto.HolidayHourMultiplier, "The multiplier of extra hours on a holiday") : 1;
        entity.PayExtraDays = dto.PayExtraDays;
        entity.DayMultiplier = dto.PayExtraDays ? Multiplier(dto.DayMultiplier, "The multiplier of extra days") : 1;

        string remarks = Clean(dto.Remarks);

        if (remarks.Length > 500)
        {
            throw new InvalidOperationException("Remarks cannot be longer than 500 characters.");
        }

        entity.Remarks = remarks;
        entity.IsActive = dto.IsActive;

        // an inactive structure is never the Default
        entity.IsDefault = dto.IsDefault && dto.IsActive;
    }

    // Clears the other Default (before this one is saved as the
    // Default : the database allows one)
    private async Task ClearOtherDefaultsAsync(long selfId, long userId)
    {
        List<HrOvertimeStructures> others =
            await Structures
                .Where(x => !x.IsDeleted && x.IsDefault && x.OvertimeStructureId != selfId)
                .ToListAsync();

        foreach (HrOvertimeStructures other in others)
        {
            other.IsDefault = false;
            other.ModifiedBy = userId;
            other.ModifiedDate = DateTime.UtcNow;

            AddHistory(other.OvertimeStructureId, "Update", "Overtime Structure Default Moved", $"{other.Code} {other.Name} : no longer the Default.", userId);
        }

        if (others.Count > 0)
        {
            await _context.SaveChangesAsync();
        }
    }

    public async Task<OvertimeStructureDto> CreateAsync(OvertimeStructureDto dto, long userId)
    {
        HrOvertimeStructures entity = new();

        Apply(entity, dto);

        bool isDefault = entity.IsDefault;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        if (isDefault)
        {
            await ClearOtherDefaultsAsync(0, userId);
        }

        entity.Code = NextCode(await Structures.AsNoTracking().Select(x => x.Code).ToListAsync());
        entity.Name = NameOf(entity.Code);
        entity.IsDeleted = false;
        entity.CreatedBy = userId;
        entity.CreatedDate = DateTime.UtcNow;

        Structures.Add(entity);

        await _context.SaveChangesAsync();

        AddHistory(entity.OvertimeStructureId, "Create", "Overtime Structure Created", Described(entity), userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await GetAsync(entity.PublicId);
    }

    public async Task UpdateAsync(Guid publicId, OvertimeStructureDto dto, long userId)
    {
        HrOvertimeStructures entity = await FindAsync(publicId);

        // the Default flag waits : the other Default is cleared first
        bool wasDefault = entity.IsDefault;

        Apply(entity, dto);

        bool isDefault = entity.IsDefault;

        entity.IsDefault = wasDefault && isDefault;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        if (isDefault)
        {
            await ClearOtherDefaultsAsync(entity.OvertimeStructureId, userId);
        }

        entity.IsDefault = isDefault;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity.OvertimeStructureId, "Update", "Overtime Structure Updated", Described(entity), userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }

    public async Task DeleteAsync(Guid publicId, long userId)
    {
        HrOvertimeStructures entity = await FindAsync(publicId);

        int used =
            await _context.Set<HrEmployees>().AsNoTracking()
                .CountAsync(x => !x.IsDeleted && x.OvertimeStructureId == entity.OvertimeStructureId);

        if (used > 0)
        {
            throw new InvalidOperationException($"{entity.Code} {entity.Name} is the overtime structure of {used} employee(s) : move them to another structure first (or make this one Inactive).");
        }

        entity.IsDeleted = true;
        entity.IsDefault = false;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        AddHistory(entity.OvertimeStructureId, "Delete", "Overtime Structure Deleted", $"{entity.Code} {entity.Name}", userId);

        await _context.SaveChangesAsync();
    }

    public async Task<string?> RestoreAsync(long userId)
    {
        HrOvertimeStructures? entity =
            await Structures.Where(x => x.IsDeleted).OrderByDescending(x => x.DeletedDate).FirstOrDefaultAsync();

        if (entity == null)
        {
            return null;
        }

        // comes back as a normal (not Default) structure
        entity.IsDeleted = false;
        entity.IsDefault = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity.OvertimeStructureId, "Restore", "Overtime Structure Restored", $"{entity.Code} {entity.Name}", userId);

        await _context.SaveChangesAsync();

        return entity.Code;
    }
}
