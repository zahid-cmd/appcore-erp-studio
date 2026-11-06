//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

using AppCore.Application.Settings.GeneralSettings;
using AppCore.Application.Settings.GeneralSettings.FinancialYears.DTOs;
using AppCore.Infrastructure.Persistence;

using FinancialYearsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.FinancialYears;
using SystemConfigurationsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.GeneralSettings;


//===============================================================
// Financial Year : Auto Create Next
//
// • The base year = the year covering today (Bangladesh time);
//   when none does, the latest year.
// • Next year = the day after the base year ends, 12 months.
// • ON (CFG-MOD-003-0111, Value = days, default 30) : made on
//   base end - days, through the Financial Years repository
//   (same checks and history as the page), Open, active, NOT
//   current. Never closes, locks or changes another year.
// • Nothing is made when any year already covers the next
//   start (made by hand, or earlier) : safe to run any time.
//===============================================================

public class FinancialYearAutoCreateService :
    IFinancialYearAutoCreateService
{
    public const string SwitchCode =
        "CFG-MOD-003-0111";

    // Remarks of an automatic year (also how the bell finds it)
    public const string AutoRemarks =
        "Created automatically by the system (Auto Create Next Financial Year).";

    private const int DefaultDays =
        30;

    private const int MinDays =
        1;

    private const int MaxDays =
        180;

    // The bell starts this many days before the create day
    private const int NotifyAheadDays =
        10;

    private const int YearMonths =
        12;

    // CreatedBy of the automatic year (the first admin, as in the
    // seed scripts); history shows "System"
    private const long SystemUserId =
        1;


    private readonly AppDbContext _context;

    private readonly IFinancialYearsRepository _years;

    private readonly ILogger<FinancialYearAutoCreateService> _logger;


    public FinancialYearAutoCreateService(
        AppDbContext context,
        IFinancialYearsRepository years,
        ILogger<FinancialYearAutoCreateService> logger)
    {
        _context = context;
        _years = years;
        _logger = logger;
    }


    //===========================================================
    // Today in Bangladesh
    //===========================================================

    private static DateOnly BusinessToday()
    {
        TimeZoneInfo zone;

        try
        {
            zone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Dhaka");
        }
        catch
        {
            try
            {
                zone = TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time");
            }
            catch
            {
                return DateOnly.FromDateTime(DateTime.UtcNow.AddHours(6));
            }
        }

        return DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zone));
    }

    // Same rule as the Financial Years page
    private static string YearName(
        DateOnly start,
        DateOnly end) =>
        start.Year == end.Year
            ? $"FY {start.Year}"
            : $"FY {start.Year}-{end.Year}";


    //===========================================================
    // Status
    //===========================================================

    public async Task<FinancialYearAutoStatusDto> GetStatusAsync()
    {
        DateOnly today =
            BusinessToday();

        FinancialYearAutoStatusDto status =
            new()
            {
                Today = today,
                DaysBefore = DefaultDays
            };

        //-------------------------------------------------------
        // The switch (missing = OFF : nothing is made, the bell
        // only warns)
        //-------------------------------------------------------

        var config =
            await _context.Set<SystemConfigurationsEntity>()
                .AsNoTracking()
                .Where(x => x.ConfigurationCode == SwitchCode && !x.IsDeleted)
                .Select(x => new { x.IsEnabled, x.Value })
                .FirstOrDefaultAsync();

        status.AutoCreate =
            config?.IsEnabled ?? false;

        if (config != null
            && int.TryParse((config.Value ?? string.Empty).Trim(), out int days)
            && days >= MinDays
            && days <= MaxDays)
        {
            status.DaysBefore = days;
        }

        //-------------------------------------------------------
        // Base year
        //-------------------------------------------------------

        List<FinancialYearsEntity> years =
            await _context.Set<FinancialYearsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .ToListAsync();

        FinancialYearsEntity? current =
            years.FirstOrDefault(x => x.StartDate <= today && x.EndDate >= today)
            ??
            years.OrderByDescending(x => x.EndDate).FirstOrDefault();

        if (current == null)
        {
            // No year at all : the page's first year is made by
            // onboarding / by hand
            return status;
        }

        status.CurrentYearName = current.FinancialYearName;
        status.CurrentYearEnd = current.EndDate;

        DateOnly nextStart =
            current.EndDate.AddDays(1);

        DateOnly nextEnd =
            nextStart.AddMonths(YearMonths).AddDays(-1);

        status.NextStart = nextStart;
        status.NextEnd = nextEnd;
        status.NextYearName = YearName(nextStart, nextEnd);

        FinancialYearsEntity? next =
            years.FirstOrDefault(x => x.StartDate <= nextStart && x.EndDate >= nextStart);

        status.NextExists = next != null;

        status.CreateOn =
            current.EndDate.AddDays(-status.DaysBefore);

        status.NotifyFrom =
            status.AutoCreate
                ? status.CreateOn.Value.AddDays(-NotifyAheadDays)
                : current.EndDate.AddDays(-(status.DaysBefore + NotifyAheadDays));

        // The year covering today may itself be the automatic one
        // made in the last days of the previous year
        FinancialYearsEntity? recent =
            years
                .Where(x => x.Remarks == AutoRemarks && x.CreatedDate >= DateTime.UtcNow.AddDays(-7))
                .OrderByDescending(x => x.CreatedDate)
                .FirstOrDefault();

        if (recent != null)
        {
            status.RecentlyAutoCreated = true;
            status.NextYearName = recent.FinancialYearName;
            status.NextStart = recent.StartDate;
            status.NextEnd = recent.EndDate;
            status.NextExists = true;
        }

        return status;
    }


    //===========================================================
    // Run (background job)
    //===========================================================

    public async Task<bool> RunIfDueAsync(
        CancellationToken cancellationToken = default)
    {
        FinancialYearAutoStatusDto status =
            await GetStatusAsync();

        if (!status.AutoCreate
            || status.NextExists
            || status.NextStart == null
            || status.NextEnd == null
            || status.CreateOn == null
            || status.Today < status.CreateOn.Value)
        {
            return false;
        }

        cancellationToken.ThrowIfCancellationRequested();

        try
        {
            await _years.CreateAsync(
                new CreateFinancialYearsDto
                {
                    StartDate = status.NextStart.Value,
                    EndDate = status.NextEnd.Value,
                    IsCurrent = false,
                    YearStatus = "Open",
                    Remarks = AutoRemarks,
                    Status = true
                },
                SystemUserId);

            _logger.LogInformation(
                "Financial year {Name} ({Start} to {End}) created automatically.",
                status.NextYearName,
                status.NextStart,
                status.NextEnd);

            return true;
        }
        catch (InvalidOperationException ex)
        {
            // e.g. made by hand a moment ago, or a name clash :
            // nothing is written; the bell keeps telling
            _logger.LogWarning(
                ex,
                "Financial year {Name} was not created automatically : {Message}",
                status.NextYearName,
                ex.Message);

            return false;
        }
    }
}
