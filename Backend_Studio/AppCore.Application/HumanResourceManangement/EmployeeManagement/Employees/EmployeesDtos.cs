//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.EmployeeManagement;


//===============================================================
// Employees (Human Resource > Employee Management, hand-written
// page). Dates travel as yyyy-MM-dd ('' = none).
//===============================================================

public class EmployeeListItemDto
{
    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string MobileNo { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public long DepartmentId { get; set; }

    public string DepartmentName { get; set; } = string.Empty;

    public string DesignationName { get; set; } = string.Empty;

    public string ShiftName { get; set; } = string.Empty;

    public string EmploymentType { get; set; } = string.Empty;

    public string JoiningDate { get; set; } = string.Empty;

    public decimal GrossSalary { get; set; }

    public bool HasLogin { get; set; }

    public bool IsActive { get; set; }
}


// One line of the salary structure : Tk a month for a salary head
public class EmployeeSalaryLineDto
{
    public long SalaryHeadId { get; set; }

    // Read only
    public string HeadName { get; set; } = string.Empty;

    public string HeadType { get; set; } = string.Empty;

    public decimal Amount { get; set; }
}


// One employee in full : read and save (PublicId, Code, the names,
// the salary lines and the totals are ignored on save : the salary
// comes from GrossSalary and SalaryStructureId)
public class EmployeeDto
{
    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    // Personal
    public string FullName { get; set; } = string.Empty;

    public string FatherName { get; set; } = string.Empty;

    public string MotherName { get; set; } = string.Empty;

    public string Gender { get; set; } = string.Empty;

    public string DateOfBirth { get; set; } = string.Empty;

    public string BloodGroup { get; set; } = string.Empty;

    public string MaritalStatus { get; set; } = string.Empty;

    public string NationalId { get; set; } = string.Empty;

    // Contact
    public string MobileNo { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PresentAddress { get; set; } = string.Empty;

    public string PermanentAddress { get; set; } = string.Empty;

    public string EmergencyContactName { get; set; } = string.Empty;

    public string EmergencyContactPhone { get; set; } = string.Empty;

    // Job
    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public long DepartmentId { get; set; }

    public string DepartmentName { get; set; } = string.Empty;

    public long DesignationId { get; set; }

    public string DesignationName { get; set; } = string.Empty;

    public long ShiftId { get; set; }

    public string ShiftName { get; set; } = string.Empty;

    // The employee's own weekly holiday : Sun,Mon ... ('' = the
    // weekly holiday of everyone)
    public string WeeklyOffDays { get; set; } = string.Empty;

    public string EmploymentType { get; set; } = "Permanent";

    public string JoiningDate { get; set; } = string.Empty;

    public string ConfirmationDate { get; set; } = string.Empty;

    // 0 = no login
    public long UserProfileId { get; set; }

    public string LoginName { get; set; } = string.Empty;

    // Salary : the gross salary typed (Tk a month) and the
    // structure that splits it (0 = none)
    public decimal GrossSalary { get; set; }

    public long SalaryStructureId { get; set; }

    public string SalaryStructureName { get; set; } = string.Empty;

    // Read only : the salary head by head, as worked out
    public List<EmployeeSalaryLineDto> SalaryLines { get; set; } = new();

    public decimal TotalDeductions { get; set; }

    public bool OvertimeAllowed { get; set; }

    // The overtime structure picked (0 = none) when overtime is
    // allowed
    public long OvertimeStructureId { get; set; }

    public string OvertimeStructureName { get; set; } = string.Empty;

    public decimal OvertimeRate { get; set; }

    // The employee's own bonus structure and leave encashment
    // policy (0 = the Default one)
    public long BonusStructureId { get; set; }

    public long LeaveEncashPolicyId { get; set; }

    // Cash / Bank / MFS
    public string PaymentMode { get; set; } = "Cash";

    public string BankName { get; set; } = string.Empty;

    public string BankAccountNo { get; set; } = string.Empty;

    public string MfsName { get; set; } = string.Empty;

    public string MfsNo { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}


public class EmployeeLookupDto
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    // Users : the employee already linked to the login ('' = free)
    public string Note { get; set; } = string.Empty;

    // Shifts : the working hours a day (hours less the break)
    public decimal Hours { get; set; }
}


// A line of a salary structure : a percent of the gross salary
public class EmployeeSalaryStructureLineDto
{
    public long SalaryHeadId { get; set; }

    public string HeadName { get; set; } = string.Empty;

    // Earning / Deduction
    public string HeadType { get; set; } = string.Empty;

    // The basic salary head (it takes what rounding leaves over)
    public bool IsBasic { get; set; }

    public decimal Percent { get; set; }

    // A deduction : Gross (percent of the gross salary), Basic
    // (percent of the basic salary) or Fixed (FixedAmount Tk a
    // month). An earning is always Gross.
    public string Basis { get; set; } = "Gross";

    public decimal FixedAmount { get; set; }
}


// A salary structure the profile can pick, with its lines (the
// profile shows the gross salary split by them, read only)
public class EmployeeSalaryStructureDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // A new profile starts with it
    public bool IsDefault { get; set; }

    public List<EmployeeSalaryStructureLineDto> Lines { get; set; } = new();
}


// An overtime structure the profile can pick, with what the
// profile needs to show the employee's rates
public class EmployeeOvertimeStructureDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public bool IsDefault { get; set; }

    public string RateBase { get; set; } = string.Empty;

    public decimal FixedHourRate { get; set; }

    public string MonthDaysMode { get; set; } = string.Empty;

    public int MonthDays { get; set; }

    public bool PayExtraHours { get; set; }

    public decimal HourMultiplier { get; set; }

    public decimal HolidayHourMultiplier { get; set; }

    public bool PayExtraDays { get; set; }

    public decimal DayMultiplier { get; set; }
}


public class EmployeeDefaultsDto
{
    public string NextCode { get; set; } = string.Empty;

    // The weekly holiday of everyone (Holidays > Weekly Holidays)
    public string DefaultWeeklyOffDays { get; set; } = string.Empty;

    public List<EmployeeLookupDto> Branches { get; set; } = new();

    public List<EmployeeLookupDto> Departments { get; set; } = new();

    public List<EmployeeLookupDto> Designations { get; set; } = new();

    public List<EmployeeLookupDto> Shifts { get; set; } = new();

    public List<EmployeeLookupDto> Users { get; set; } = new();

    // Active salary structures
    public List<EmployeeSalaryStructureDto> SalaryStructures { get; set; } = new();

    // Active overtime structures
    public List<EmployeeOvertimeStructureDto> OvertimeStructures { get; set; } = new();

    // Active bonus structures / leave encashment policies (Note :
    // "Default" on the one that applies when the profile names none)
    public List<EmployeeLookupDto> BonusStructures { get; set; } = new();

    public List<EmployeeLookupDto> LeaveEncashPolicies { get; set; } = new();
}
