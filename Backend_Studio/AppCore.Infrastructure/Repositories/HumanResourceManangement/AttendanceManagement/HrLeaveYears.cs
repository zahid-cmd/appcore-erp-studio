//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.HumanResourceManangement.AttendanceManagement;


//===============================================================
// The leave year (shared by leave applications, the leave balance
// report and leave encashments)
//
// A leave year IS a financial year (Settings > Financial Years) :
// the entitlement of a leave type is for a financial year, and the
// leave taken, applied for and encashed are counted inside it.
//
//   Year   the number of the leave year : the calendar year its
//          financial year STARTS in (FY 2026-2027 = 2026). This is
//          what HrLeaveEncashments.LeaveYear keeps.
//
// A date outside every financial year (none made yet for it) gets
// a year of the same shape : starting on the day and month the
// financial years start on (1 January when there is none at all).
//===============================================================

public sealed record LeaveYear(int Year, DateOnly First, DateOnly Last, string Name);

public sealed class HrLeaveYears
{
    private readonly List<FinancialYears> _years;

    // The day the financial years start on (1 January : none yet)
    private readonly int _month = 1;

    private readonly int _day = 1;

    private HrLeaveYears(List<FinancialYears> years)
    {
        _years = years;

        if (years.Count > 0)
        {
            DateOnly start = years[^1].StartDate;

            _month = start.Month;

            // (29 February never starts a year here)
            _day = Math.Min(start.Day, 28);
        }
    }

    public static async Task<HrLeaveYears> LoadAsync(AppDbContext context) =>
        new(
            await context.Set<FinancialYears>().AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderBy(x => x.StartDate)
                .ToListAsync());

    private static LeaveYear From(FinancialYears y) =>
        new(
            y.StartDate.Year,
            y.StartDate,
            y.EndDate,
            y.FinancialYearName.Length > 0 ? y.FinancialYearName : y.FinancialYearCode);

    // A year of the same shape, where no financial year is made
    private LeaveYear Shaped(int year)
    {
        DateOnly first = new(year, _month, _day);
        DateOnly last = first.AddYears(1).AddDays(-1);

        return new LeaveYear(year, first, last, first.Year == last.Year ? $"{year}" : $"{first.Year}-{last.Year}");
    }

    // The leave year a date is in
    public LeaveYear Of(DateOnly date)
    {
        FinancialYears? year = _years.FirstOrDefault(x => x.StartDate <= date && date <= x.EndDate);

        if (year != null)
        {
            return From(year);
        }

        LeaveYear shaped = Shaped(date.Year);

        return date < shaped.First ? Shaped(date.Year - 1) : shaped;
    }

    // The leave year of a number (the calendar year it starts in)
    public LeaveYear Get(int year)
    {
        FinancialYears? found = _years.FirstOrDefault(x => x.StartDate.Year == year);

        return found != null ? From(found) : Shaped(year);
    }

    // The leave year before one
    public LeaveYear Before(LeaveYear year) =>
        Of(year.First.AddDays(-1));

    public string NameOf(int year) =>
        Get(year).Name;
}
