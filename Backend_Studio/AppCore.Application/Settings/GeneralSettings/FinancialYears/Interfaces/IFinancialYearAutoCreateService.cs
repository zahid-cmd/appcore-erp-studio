//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings;


//===============================================================
// Financial Year : Auto Create Next
//
// Switch CFG-MOD-003-0111 "Auto Create Next Financial Year"
// (Financial Years page). Value = days before the current year
// ends (default 30). ON : the next year (12 months, from the day
// after the current one ends) is created automatically on that
// day, Open, not current; nothing else changes (no closing, no
// balances, the selected year stays). The bell tells from 10
// days before, every day, until it is made.
//===============================================================

public interface IFinancialYearAutoCreateService
{
    // What is due and what the bell should say (nothing written)
    Task<FinancialYearAutoStatusDto> GetStatusAsync();

    // Creates the next year when the switch is ON and the day has
    // come. True when a year was created now.
    Task<bool> RunIfDueAsync(
        CancellationToken cancellationToken = default);
}


public class FinancialYearAutoStatusDto
{
    // The switch (missing = OFF)
    public bool AutoCreate { get; set; }

    // Days before the current year ends (default 30)
    public int DaysBefore { get; set; }

    // The year the next one follows ('' when there is none)
    public string CurrentYearName { get; set; } = string.Empty;

    public DateOnly? CurrentYearEnd { get; set; }

    // The next year
    public string NextYearName { get; set; } = string.Empty;

    public DateOnly? NextStart { get; set; }

    public DateOnly? NextEnd { get; set; }

    public bool NextExists { get; set; }

    // The day it is (to be) created automatically
    public DateOnly? CreateOn { get; set; }

    // The bell shows from this day (CreateOn - 10, or for OFF :
    // year end - (days + 10))
    public DateOnly? NotifyFrom { get; set; }

    // The next year was made automatically in the last 7 days
    public bool RecentlyAutoCreated { get; set; }

    public DateOnly Today { get; set; }
}
