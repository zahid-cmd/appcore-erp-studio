//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Salary Structures (Human Resource Setup, hand-written page :
// NEVER run Code Sync for it; tables made by
// HumanResource_SalaryStructures_Engine.sql)
//
//   HrSalaryStructures       SST-001  a named split of the gross
//                                     salary : a percent for each
//                                     salary head; one structure
//                                     is the Default
//   HrSalaryStructureLines            its lines (percent of the
//                                     gross)
//
// The Employee Profile takes the gross salary and one structure;
// the employee's own lines (HrEmployeeSalaryLines, used by
// payroll) are worked out from the two.
//===============================================================

public class HrSalaryStructures
{
    public long SalaryStructureId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // The earning lines added up : always 100
    public decimal EarningPercent { get; set; }

    // The deduction lines added up
    public decimal DeductionPercent { get; set; }

    // The structure a new Employee Profile starts with (one only)
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


public class HrSalaryStructureLines
{
    public long SalaryStructureLineId { get; set; }

    public long SalaryStructureId { get; set; }

    public long SalaryHeadId { get; set; }

    // Percent of the gross salary (Basis Gross) or of the basic
    // salary (Basis Basic)
    public decimal Percent { get; set; }

    // How the line is worked out : Gross / Basic / Fixed. An
    // earning is always Gross; a deduction is one of the three.
    public string Basis { get; set; } = "Gross";

    // Tk a month (Basis Fixed)
    public decimal FixedAmount { get; set; }
}
