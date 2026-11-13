//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Overtime Structures (Human Resource Setup, hand-written page :
// NEVER run Code Sync for it; table made by
// HumanResource_OvertimeStructures_Engine.sql)
//
//   HrOvertimeStructures  OTS-001  how overtime is paid; one
//                                  structure is the Default
//
// Two bases :
//   extra hours  hours x hour rate x multiplier (another one for
//                hours on a weekly holiday / public holiday)
//   extra days   days worked on a weekly holiday / public holiday
//                x day rate x multiplier
//   day rate = base / days in the month; hour rate = day rate /
//   hours a day; base = the employee's Basic or Gross salary (or a
//   fixed Tk an hour).
//
// Picked on the Employee Profile when Overtime allowed is on.
//===============================================================

public class HrOvertimeStructures
{
    public long OvertimeStructureId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // Basic / Gross / Fixed
    public string RateBase { get; set; } = "Basic";

    // Tk an hour (RateBase Fixed)
    public decimal FixedHourRate { get; set; }

    // Fixed (MonthDays) / Actual (the real days of the month)
    public string MonthDaysMode { get; set; } = "Fixed";

    public int MonthDays { get; set; } = 26;

    // Not typed any more : the hours a day are the working hours of
    // the employee's shift (the column stays, unused)
    public decimal HoursPerDay { get; set; } = 8;

    // 1. extra hours
    public bool PayExtraHours { get; set; } = true;

    public decimal HourMultiplier { get; set; } = 1;

    public decimal HolidayHourMultiplier { get; set; } = 1;

    // 2. extra days
    public bool PayExtraDays { get; set; } = true;

    public decimal DayMultiplier { get; set; } = 1;

    // The structure an Employee Profile starts with (one only)
    public bool IsDefault { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
