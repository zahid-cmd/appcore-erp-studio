//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Human Resource Setup (hand-written pages : NEVER run Code Sync
// for them; tables made by HumanResource_Phase1_Engine.sql)
//
//   HrShifts        SFT-001   working hours, grace, weekly off
//   HrHolidays      HOL-0001  a holiday (one day or a range)
//   HrLeaveTypes    LVT-001   days per year, paid / unpaid
//   HrSalaryHeads   SLH-001   earnings and deductions
//===============================================================

// What the four setup tables share (code, name, status, soft
// delete, audit) : one repository base serves them all
public interface IHrSetupEntity
{
    Guid PublicId { get; set; }

    string Code { get; set; }

    string Name { get; set; }

    bool IsActive { get; set; }

    bool IsDeleted { get; set; }

    long? DeletedBy { get; set; }

    DateTime? DeletedDate { get; set; }

    long CreatedBy { get; set; }

    DateTime CreatedDate { get; set; }

    long? ModifiedBy { get; set; }

    DateTime? ModifiedDate { get; set; }
}


public class HrShifts : IHrSetupEntity
{
    public long ShiftId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // HH:mm (24 hours); an end before the start = a night shift
    public string StartTime { get; set; } = string.Empty;

    public string EndTime { get; set; } = string.Empty;

    // Minutes after the start that still count as on time
    public int GraceMinutes { get; set; }

    public int BreakMinutes { get; set; }

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


public class HrHolidays : IHrSetupEntity
{
    public long HolidayId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // Public / Festival / Company
    public string HolidayType { get; set; } = string.Empty;

    public DateOnly FromDate { get; set; }

    public DateOnly ToDate { get; set; }

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


public class HrLeaveTypes : IHrSetupEntity
{
    public long LeaveTypeId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // CL / SL / AL ... (attendance sheet)
    public string ShortName { get; set; } = string.Empty;

    public decimal DaysPerYear { get; set; }

    public bool IsPaid { get; set; } = true;

    public bool CarryForward { get; set; }

    public decimal MaxCarryDays { get; set; }

    // The days not taken can be paid as money (Leave Encashments)
    public bool IsEncashable { get; set; }

    // All / Male / Female
    public string AppliesTo { get; set; } = "All";

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


public class HrSalaryHeads : IHrSetupEntity
{
    public long SalaryHeadId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // Earning / Deduction
    public string HeadType { get; set; } = string.Empty;

    // Fixed (Tk) / Percent (% of Basic)
    public string CalcType { get; set; } = "Fixed";

    public decimal DefaultValue { get; set; }

    // '' = a normal head; BASIC = the basic salary; OVERTIME /
    // ABSENT / LATE / ADVANCE = worked out by payroll (not on an
    // employee's salary structure; cannot be deleted)
    public string SystemKey { get; set; } = string.Empty;

    // Falls with unpaid days (absence / unpaid leave)
    public bool IsProrated { get; set; } = true;

    // A deduction head : the ledger it is credited to when a
    // salary sheet is posted ('' : Payroll - Deductions Payable)
    public string PayableLedgerCode { get; set; } = string.Empty;

    public int DisplayOrder { get; set; }

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


//===============================================================
// The weekly holiday : ONE row (Holidays > Weekly Holidays tab;
// HumanResource_WeeklyHoliday_Engine.sql). The weekly off days of
// every employee, unless the Employee Profile has its own.
//===============================================================

public class HrWeeklyHolidays
{
    public long WeeklyHolidayId { get; set; }

    // Sun,Mon,Tue,Wed,Thu,Fri,Sat (comma separated; '' = none)
    public string WeeklyOffDays { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
