//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.HumanResourceManangement.EmployeeManagement;


//===============================================================
// Employees (Human Resource > Employee Management, hand-written
// page : NEVER run Code Sync for it; tables made by
// HumanResource_Phase1_Engine.sql)
//
//   HrEmployees             EMP-0001  the staff record
//   HrEmployeeSalaryLines             the employee's salary head
//                                     by head (Tk a month) : the
//                                     gross salary of the profile
//                                     split by its salary
//                                     structure; read by payroll
//===============================================================

public class HrEmployees
{
    public long EmployeeId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    // Personal
    public string FullName { get; set; } = string.Empty;

    public string FatherName { get; set; } = string.Empty;

    public string MotherName { get; set; } = string.Empty;

    // Male / Female / Other
    public string Gender { get; set; } = string.Empty;

    public DateOnly? DateOfBirth { get; set; }

    public string BloodGroup { get; set; } = string.Empty;

    // Single / Married / Other
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

    public long DepartmentId { get; set; }

    public long DesignationId { get; set; }

    public long ShiftId { get; set; }

    // The employee's own weekly holiday : Sun,Mon ... (comma
    // separated). '' = the weekly holiday of everyone
    // (HrWeeklyHolidays).
    public string WeeklyOffDays { get; set; } = string.Empty;

    // Permanent / Probation / Contract / Part Time / Intern
    public string EmploymentType { get; set; } = "Permanent";

    public DateOnly JoiningDate { get; set; }

    public DateOnly? ConfirmationDate { get; set; }

    // The login of this employee (UserProfiles); null = no login
    public long? UserProfileId { get; set; }

    // Salary : the gross salary typed on the profile (Tk a month)
    // and the salary structure that splits it into the salary
    // heads (null = none). The employee's lines
    // (HrEmployeeSalaryLines) are worked out from the two.
    public long? SalaryStructureId { get; set; }

    public decimal GrossSalary { get; set; }

    public bool OvertimeAllowed { get; set; }

    // The overtime structure (Human Resource Setup > Overtime
    // Structures) when overtime is allowed. null with a typed
    // OvertimeRate : a profile from before overtime structures.
    public long? OvertimeStructureId { get; set; }

    // The employee's own bonus structure and leave encashment
    // policy (Human Resource Setup). null = the Default one.
    public long? BonusStructureId { get; set; }

    public long? LeaveEncashPolicyId { get; set; }

    // Tk per hour
    public decimal OvertimeRate { get; set; }

    // Cash / Bank / MFS
    public string PaymentMode { get; set; } = "Cash";

    public string BankName { get; set; } = string.Empty;

    public string BankAccountNo { get; set; } = string.Empty;

    public string MfsName { get; set; } = string.Empty;

    public string MfsNo { get; set; } = string.Empty;

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


public class HrEmployeeSalaryLines
{
    public long EmployeeSalaryLineId { get; set; }

    public long EmployeeId { get; set; }

    public long SalaryHeadId { get; set; }

    // Tk per month
    public decimal Amount { get; set; }
}
