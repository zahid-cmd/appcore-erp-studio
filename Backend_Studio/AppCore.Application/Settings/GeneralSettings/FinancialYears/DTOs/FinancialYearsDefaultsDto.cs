//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings.FinancialYears.DTOs;


//===============================================================
// Financial Years Defaults DTO
//
// Suggested values for a new financial year:
//   Code      : next FY-0000 code
//   StartDate : day after the latest year's End Date, otherwise
//               1 July of the running financial year
//   EndDate   : StartDate + 12 months − 1 day
//   IsCurrent : true when no year is current yet
//===============================================================

public class FinancialYearsDefaultsDto
{
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public DateOnly StartDate { get; set; }

    public DateOnly EndDate { get; set; }

    public bool IsCurrent { get; set; }
}