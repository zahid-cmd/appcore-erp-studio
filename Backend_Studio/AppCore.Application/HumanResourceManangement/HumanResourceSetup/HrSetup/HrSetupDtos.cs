//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Human Resource Setup (hand-written pages) : Shifts, Holidays,
// Leave Types, Salary Heads. One DTO per page, used to read and
// to save (PublicId and Code are ignored on save).
//===============================================================

public abstract class HrSetupDto
{
    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}


public class HrShiftDto : HrSetupDto
{
    // HH:mm (24 hours)
    public string StartTime { get; set; } = string.Empty;

    public string EndTime { get; set; } = string.Empty;

    public int GraceMinutes { get; set; }

    public int BreakMinutes { get; set; }

    // Read only : 09:00 - 18:00
    public string Hours { get; set; } = string.Empty;

    // Read only : hours on duty less the break
    public decimal WorkingHours { get; set; }
}


public class HrHolidayDto : HrSetupDto
{
    // Public / Festival / Company
    public string HolidayType { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string FromDate { get; set; } = string.Empty;

    public string ToDate { get; set; } = string.Empty;

    // Read only
    public int Days { get; set; }

    public int Year { get; set; }
}


public class HrLeaveTypeDto : HrSetupDto
{
    public string ShortName { get; set; } = string.Empty;

    public decimal DaysPerYear { get; set; }

    public bool IsPaid { get; set; } = true;

    public bool CarryForward { get; set; }

    public decimal MaxCarryDays { get; set; }

    // All / Male / Female
    public string AppliesTo { get; set; } = "All";
}


public class HrSalaryHeadDto : HrSetupDto
{
    public long SalaryHeadId { get; set; }

    // Earning / Deduction
    public string HeadType { get; set; } = string.Empty;

    // Fixed (Tk) / Percent (% of Basic)
    public string CalcType { get; set; } = "Fixed";

    public decimal DefaultValue { get; set; }

    // Read only : BASIC / OVERTIME / ABSENT / LATE / ADVANCE
    public string SystemKey { get; set; } = string.Empty;

    public bool IsProrated { get; set; } = true;

    public int DisplayOrder { get; set; }
}


public class HrSetupDefaultsDto
{
    public string NextCode { get; set; } = string.Empty;
}


//===============================================================
// The weekly holiday (Holidays > Weekly Holidays tab) : one record,
// edited in place
//===============================================================

public class WeeklyHolidayDto
{
    // Sun,Mon,Tue,Wed,Thu,Fri,Sat (comma separated)
    public string WeeklyOffDays { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    // Read only : employees with their own weekly holiday
    public int OwnCount { get; set; }
}
