//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Salary Structures (Human Resource Setup, hand-written page) :
// a named split of the gross salary, a percent for each salary
// head. The earning percents add up to 100. One structure is the
// Default. The Employee Profile takes the gross salary and one
// structure.
//===============================================================

public class SalaryStructureLineDto
{
    public long SalaryHeadId { get; set; }

    // Read only
    public string HeadName { get; set; } = string.Empty;

    // Earning / Deduction
    public string HeadType { get; set; } = string.Empty;

    // The basic salary head
    public bool IsBasic { get; set; }

    // Percent of the gross salary (or of the basic salary)
    public decimal Percent { get; set; }

    // A deduction : Gross (percent of the gross salary), Basic
    // (percent of the basic salary) or Fixed (FixedAmount Tk a
    // month). An earning is always Gross.
    public string Basis { get; set; } = "Gross";

    public decimal FixedAmount { get; set; }
}


// Read and save (PublicId, Code and the totals are ignored on
// save)
public class SalaryStructureDto
{
    public long SalaryStructureId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // The earning lines added up (100) / the deduction lines
    public decimal EarningPercent { get; set; }

    public decimal DeductionPercent { get; set; }

    public bool IsDefault { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    // Live employees on the structure
    public int EmployeeCount { get; set; }

    public List<SalaryStructureLineDto> Lines { get; set; } = new();
}


// A head that can go on a structure (normal heads + Basic)
public class SalaryStructureHeadDto
{
    public long SalaryHeadId { get; set; }

    public string Name { get; set; } = string.Empty;

    // Earning / Deduction
    public string HeadType { get; set; } = string.Empty;

    public bool IsBasic { get; set; }
}


public class SalaryStructureDefaultsDto
{
    public string NextCode { get; set; } = string.Empty;

    // The name a new structure gets : Salary Structure - 1 / 2 / 3
    public string NextName { get; set; } = string.Empty;

    public List<SalaryStructureHeadDto> SalaryHeads { get; set; } = new();

    // The Default structure now ('' = none) and its id
    public string DefaultCode { get; set; } = string.Empty;

    public Guid? DefaultPublicId { get; set; }
}
