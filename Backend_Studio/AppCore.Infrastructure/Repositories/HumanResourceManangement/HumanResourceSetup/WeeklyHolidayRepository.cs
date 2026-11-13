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
// Weekly Holiday Repository (hand-written page, 2026-11-14;
// NEVER run Code Sync for it)
//
//   HrWeeklyHolidays holds ONE row : the weekly holiday of every
//   employee (Holidays > Weekly Holidays tab). It is edited in
//   place; there is no add and no delete, and the table cannot
//   hold a second row. An Employee Profile may have its own weekly
//   holiday instead. Attendance, leave and payroll read it through
//   HrCalendar. The history goes with the Holidays page.
//===============================================================

public class WeeklyHolidayRepository
    : IWeeklyHolidayRepository
{
    private readonly AppDbContext _context;

    public WeeklyHolidayRepository(
        AppDbContext context)
    {
        _context = context;
    }

    private DbSet<HrWeeklyHolidays> Rows => _context.Set<HrWeeklyHolidays>();

    public async Task<WeeklyHolidayDto> GetAsync()
    {
        HrWeeklyHolidays? row =
            await Rows.AsNoTracking().OrderBy(x => x.WeeklyHolidayId).FirstOrDefaultAsync();

        return new WeeklyHolidayDto
        {
            WeeklyOffDays = row?.WeeklyOffDays ?? string.Empty,
            Remarks = row?.Remarks ?? string.Empty,
            OwnCount =
                await _context.Set<HrEmployees>().AsNoTracking()
                    .CountAsync(x => !x.IsDeleted && x.IsActive && x.WeeklyOffDays != string.Empty)
        };
    }

    public async Task<WeeklyHolidayDto> SaveAsync(WeeklyHolidayDto dto, long userId)
    {
        string days = HrCalendar.CleanOffDays(dto.WeeklyOffDays);

        string remarks =
            string.Join(" ", (dto.Remarks ?? string.Empty).Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries));

        if (remarks.Length > 500)
        {
            throw new InvalidOperationException("Remarks cannot be longer than 500 characters.");
        }

        HrWeeklyHolidays? row =
            await Rows.OrderBy(x => x.WeeklyHolidayId).FirstOrDefaultAsync();

        string before = row?.WeeklyOffDays ?? string.Empty;

        if (row == null)
        {
            row = new HrWeeklyHolidays { CreatedBy = userId, CreatedDate = DateTime.UtcNow };

            Rows.Add(row);
        }
        else
        {
            row.ModifiedBy = userId;
            row.ModifiedDate = DateTime.UtcNow;
        }

        row.WeeklyOffDays = days;
        row.Remarks = remarks;

        await _context.SaveChangesAsync();

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = "Human Resource",
                EntityName = "HrHolidays",
                EntityId = row.WeeklyHolidayId,
                ActivityType = "Update",
                ActivityTitle = "Weekly Holiday Changed",
                ActivityDescription = $"Weekly holiday : {(before.Length == 0 ? "none" : before)} -> {(days.Length == 0 ? "none" : days)}.",
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = DateTime.UtcNow
            });

        await _context.SaveChangesAsync();

        return await GetAsync();
    }
}
