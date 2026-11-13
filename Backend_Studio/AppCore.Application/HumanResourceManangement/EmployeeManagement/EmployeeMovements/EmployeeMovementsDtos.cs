//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.EmployeeManagement;


//===============================================================
// Employee Movements (Human Resource > Employee Management,
// hand-written page). Dates travel as yyyy-MM-dd ('' = none).
//
// A movement is saved once and changes the employee at once :
//   Increment     a new gross salary and / or another salary
//                 structure
//   Promotion     the designation (and the salary, when a new
//                 gross / structure is given)
//   Transfer      the branch / department / shift
//   Confirmation  Probation -> Permanent
//   Separation    the employee becomes Inactive
// It is not edited afterwards; the employee's latest movement can
// be deleted, which puts the employee back as before.
//===============================================================

// A salary head before and after
public class MovementSalaryLineDto
{
    public long SalaryHeadId { get; set; }

    public string HeadName { get; set; } = string.Empty;

    // Earning / Deduction
    public string HeadType { get; set; } = string.Empty;

    public decimal OldAmount { get; set; }

    public decimal NewAmount { get; set; }

    // On a structure of the form's lists : the head's percent of
    // the gross salary, and whether it is the basic salary
    public decimal Percent { get; set; }

    public bool IsBasic { get; set; }

    // A deduction : Gross (percent of the gross salary), Basic
    // (percent of the basic salary) or Fixed (FixedAmount Tk a
    // month). An earning is always Gross.
    public string Basis { get; set; } = "Gross";

    public decimal FixedAmount { get; set; }
}


// Read and save (the names, the Old values and the code are
// ignored on save : the server takes them from the employee)
public class EmployeeMovementDto
{
    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public long EmployeeId { get; set; }

    public string EmployeeCode { get; set; } = string.Empty;

    public string EmployeeName { get; set; } = string.Empty;

    // Increment / Promotion / Transfer / Confirmation / Separation
    public string MovementType { get; set; } = string.Empty;

    public string EffectiveDate { get; set; } = string.Empty;

    public long OldBranchId { get; set; }

    public string OldBranchName { get; set; } = string.Empty;

    public long NewBranchId { get; set; }

    public string NewBranchName { get; set; } = string.Empty;

    public long OldDepartmentId { get; set; }

    public string OldDepartmentName { get; set; } = string.Empty;

    public long NewDepartmentId { get; set; }

    public string NewDepartmentName { get; set; } = string.Empty;

    public long OldDesignationId { get; set; }

    public string OldDesignationName { get; set; } = string.Empty;

    public long NewDesignationId { get; set; }

    public string NewDesignationName { get; set; } = string.Empty;

    public long OldShiftId { get; set; }

    public string OldShiftName { get; set; } = string.Empty;

    public long NewShiftId { get; set; }

    public string NewShiftName { get; set; } = string.Empty;

    public string OldEmploymentType { get; set; } = string.Empty;

    public string NewEmploymentType { get; set; } = string.Empty;

    // 0 = none
    public long OldSalaryStructureId { get; set; }

    public string OldSalaryStructureName { get; set; } = string.Empty;

    // 0 = the structure stays
    public long NewSalaryStructureId { get; set; }

    public string NewSalaryStructureName { get; set; } = string.Empty;

    public decimal OldGrossSalary { get; set; }

    // Increment : the new gross salary (required); Promotion :
    // 0 = the salary stays
    public decimal NewGrossSalary { get; set; }

    // Read only : the salary head by head before and after (empty =
    // the salary did not change)
    public List<MovementSalaryLineDto> SalaryLines { get; set; } = new();

    // Separation
    public string SeparationType { get; set; } = string.Empty;

    public decimal SettlementAmount { get; set; }

    public string SettlementNote { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    // Read only : what changed, in a line (list)
    public string Summary { get; set; } = string.Empty;

    // Read only : it is the employee's latest movement (it can be
    // deleted)
    public bool IsLatest { get; set; }
}


public class MovementLookupDto
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;
}


public class MovementEmployeeDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
}


public class EmployeeMovementDefaultsDto
{
    public string NextCode { get; set; } = string.Empty;

    // Active employees
    public List<MovementEmployeeDto> Employees { get; set; } = new();

    public List<MovementLookupDto> Branches { get; set; } = new();

    public List<MovementLookupDto> Departments { get; set; } = new();

    public List<MovementLookupDto> Designations { get; set; } = new();

    public List<MovementLookupDto> Shifts { get; set; } = new();

    // Active salary structures with their lines (Percent)
    public List<MovementSalaryStructureDto> SalaryStructures { get; set; } = new();
}


public class MovementSalaryStructureDto
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public bool IsDefault { get; set; }

    // Each head of the structure with its Percent of the gross
    public List<MovementSalaryLineDto> Lines { get; set; } = new();
}


// The employee as now : what a new movement starts from
public class MovementEmployeeStateDto
{
    public long EmployeeId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string JoiningDate { get; set; } = string.Empty;

    public string ConfirmationDate { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public long DepartmentId { get; set; }

    public string DepartmentName { get; set; } = string.Empty;

    public long DesignationId { get; set; }

    public string DesignationName { get; set; } = string.Empty;

    public long ShiftId { get; set; }

    public string ShiftName { get; set; } = string.Empty;

    public string EmploymentType { get; set; } = string.Empty;

    // 0 = none
    public long SalaryStructureId { get; set; }

    public string SalaryStructureName { get; set; } = string.Empty;

    public decimal GrossSalary { get; set; }

    // The employee's salary lines now (OldAmount = NewAmount)
    public List<MovementSalaryLineDto> SalaryLines { get; set; } = new();

    // The date of the latest movement ('' = none) : a new one
    // cannot be before it
    public string LastMovementDate { get; set; } = string.Empty;

    // Separation : what is still open
    public decimal AdvanceBalance { get; set; }

    // The latest salary month on a sheet, e.g. "October 2026"
    public string LastSalaryMonth { get; set; } = string.Empty;

    public bool HasLogin { get; set; }
}
