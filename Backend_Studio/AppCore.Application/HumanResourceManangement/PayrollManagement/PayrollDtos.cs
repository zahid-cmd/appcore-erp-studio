//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.PayrollManagement;


//===============================================================
// Payroll (Human Resource > Payroll Management, hand-written
// pages). Dates travel as yyyy-MM-dd ('' = none).
//===============================================================

public class PayrollLookupDto
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;
}


public class PayrollEmployeeDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string DesignationName { get; set; } = string.Empty;

    public decimal GrossSalary { get; set; }
}


//---------------------------------------------------------------
// Salary Advances
//---------------------------------------------------------------

// Read and save (the names, Recovered, Balance and Status are
// ignored on save)
public class SalaryAdvanceDto
{
    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public long EmployeeId { get; set; }

    public string EmployeeCode { get; set; } = string.Empty;

    public string EmployeeName { get; set; } = string.Empty;

    public string DesignationName { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    // Advance / Loan
    public string AdvanceType { get; set; } = "Advance";

    public string AdvanceDate { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public decimal InstallmentAmount { get; set; }

    public int StartYear { get; set; }

    public int StartMonth { get; set; }

    public string Reason { get; set; } = string.Empty;

    public string VoucherNo { get; set; } = string.Empty;

    public bool IsClosed { get; set; }

    // Taken by salary sheets so far (deleted sheets do not count)
    public decimal Recovered { get; set; }

    public decimal Balance { get; set; }

    // Running / Recovered / Closed
    public string Status { get; set; } = string.Empty;
}


public class SalaryAdvanceDefaultsDto
{
    public string NextCode { get; set; } = string.Empty;

    public List<PayrollEmployeeDto> Employees { get; set; } = new();
}


//---------------------------------------------------------------
// Salary Sheets
//---------------------------------------------------------------

public class SalarySheetListItemDto
{
    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public int Year { get; set; }

    public int Month { get; set; }

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    // Draft / Approved / Posted
    public string Status { get; set; } = string.Empty;

    public int EmployeeCount { get; set; }

    public int PaidCount { get; set; }

    public decimal TotalGross { get; set; }

    public decimal TotalEarned { get; set; }

    public decimal TotalDeductions { get; set; }

    public decimal TotalNet { get; set; }

    public string JournalVoucherNo { get; set; } = string.Empty;
}


// A head of the employee's salary structure as it was (payslip)
public class SalarySheetHeadDto
{
    public string HeadName { get; set; } = string.Empty;

    // Earning / Deduction
    public string HeadType { get; set; } = string.Empty;

    public decimal Amount { get; set; }
}


public class SalarySheetLineDto
{
    public long SalarySheetLineId { get; set; }

    public long EmployeeId { get; set; }

    public string EmployeeCode { get; set; } = string.Empty;

    public string EmployeeName { get; set; } = string.Empty;

    public string DesignationName { get; set; } = string.Empty;

    public string DepartmentName { get; set; } = string.Empty;

    public string PaymentMode { get; set; } = string.Empty;

    public string PaymentAccount { get; set; } = string.Empty;

    public int MonthDays { get; set; }

    public decimal PayableDays { get; set; }

    public decimal UnpaidDays { get; set; }

    public int LateDays { get; set; }

    public decimal OvertimeHours { get; set; }

    // Extra days paid as overtime
    public decimal OvertimeDays { get; set; }

    public decimal BasicSalary { get; set; }

    public decimal GrossSalary { get; set; }

    public decimal AbsenceDeduction { get; set; }

    public decimal LateDeduction { get; set; }

    public decimal OvertimeAmount { get; set; }

    // Provident fund : kept back, added by the company, loan instalment
    public decimal PfEmployee { get; set; }

    public decimal PfCompany { get; set; }

    public decimal PfLoan { get; set; }

    public decimal OtherEarning { get; set; }

    public decimal OtherDeduction { get; set; }

    public decimal EarnedSalary { get; set; }

    public decimal StructureDeduction { get; set; }

    public decimal AdvanceDeduction { get; set; }

    public decimal NetPay { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsPaid { get; set; }

    public string PaidDate { get; set; } = string.Empty;

    public string PaidNote { get; set; } = string.Empty;

    public List<SalarySheetHeadDto> Heads { get; set; } = new();
}


public class SalarySheetDto : SalarySheetListItemDto
{
    public int LateDaysPerCut { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public string ApprovedDate { get; set; } = string.Empty;

    public string PostedDate { get; set; } = string.Empty;

    // Active employees of the branch left off the sheet because
    // they have no salary structure
    public int NoSalaryCount { get; set; }

    public List<SalarySheetLineDto> Lines { get; set; } = new();
}


public class GenerateSalarySheetDto
{
    public int Year { get; set; }

    public int Month { get; set; }

    public long BranchId { get; set; }

    // This many late days cut one day of Basic (0 = no cut)
    public int LateDaysPerCut { get; set; }

    public string Remarks { get; set; } = string.Empty;
}


public class SalarySheetDefaultsDto
{
    public string NextCode { get; set; } = string.Empty;

    // The month offered : the last month that has ended
    public int Year { get; set; }

    public int Month { get; set; }

    public int LateDaysPerCut { get; set; }

    public List<PayrollLookupDto> Branches { get; set; } = new();
}


// The typed amounts of a Draft sheet
public class SaveSalarySheetLineDto
{
    public long SalarySheetLineId { get; set; }

    public decimal OtherEarning { get; set; }

    public decimal OtherDeduction { get; set; }

    public string Remarks { get; set; } = string.Empty;
}


public class SaveSalarySheetDto
{
    public string Remarks { get; set; } = string.Empty;

    public List<SaveSalarySheetLineDto> Lines { get; set; } = new();
}


// Marks lines of a Posted sheet as paid (or not paid again)
public class PaySalaryDto
{
    // Empty = every line that is not paid yet (Paid = true) /
    // every paid line (Paid = false)
    public List<long> LineIds { get; set; } = new();

    public bool Paid { get; set; } = true;

    public string PaidDate { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;
}


public class SalarySheetReasonDto
{
    public string Reason { get; set; } = string.Empty;
}
