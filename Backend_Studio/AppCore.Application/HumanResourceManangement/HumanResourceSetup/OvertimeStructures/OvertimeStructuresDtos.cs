//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Overtime Structures (Human Resource Setup, hand-written page) :
// how overtime is paid, on two bases (extra hours, extra days).
// One structure is the Default. Picked on the Employee Profile
// when Overtime allowed is on.
//===============================================================

// Read and save (PublicId, Code, Name and EmployeeCount are
// ignored on save)
public class OvertimeStructureDto
{
    public long OvertimeStructureId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    // Overtime Structure - 1 / 2 / 3 (not typed)
    public string Name { get; set; } = string.Empty;

    // Basic / Gross / Fixed
    public string RateBase { get; set; } = "Basic";

    // Tk an hour (RateBase Fixed)
    public decimal FixedHourRate { get; set; }

    // Fixed (MonthDays) / Actual (the real days of the month)
    public string MonthDaysMode { get; set; } = "Fixed";

    public int MonthDays { get; set; } = 26;

    // 1. extra hours
    public bool PayExtraHours { get; set; } = true;

    public decimal HourMultiplier { get; set; } = 1;

    public decimal HolidayHourMultiplier { get; set; } = 1;

    // 2. extra days (worked on a weekly holiday / public holiday)
    public bool PayExtraDays { get; set; } = true;

    public decimal DayMultiplier { get; set; } = 1;

    public bool IsDefault { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    // Live employees on the structure
    public int EmployeeCount { get; set; }
}


public class OvertimeStructureDefaultsDto
{
    public string NextCode { get; set; } = string.Empty;

    public string NextName { get; set; } = string.Empty;

    // The hours a day come from the employee's shift. For the
    // example on the form : the first shift and its working hours.
    public string ShiftName { get; set; } = string.Empty;

    public decimal ShiftHours { get; set; }

    // The Default structure now ('' = none) and its id
    public string DefaultCode { get; set; } = string.Empty;

    public Guid? DefaultPublicId { get; set; }
}
