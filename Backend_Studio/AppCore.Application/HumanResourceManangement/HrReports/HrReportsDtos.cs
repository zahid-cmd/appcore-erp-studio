//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.HrReports;


//===============================================================
// HR Reports (Human Resource > HR Reports > Staff & Payroll
// Reports, hand-written page; read only). Dates travel as
// yyyy-MM-dd ('' = none).
//===============================================================

public class HrReportLookupDto
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;
}


public class HrReportLookupsDto
{
    public List<HrReportLookupDto> Branches { get; set; } = new();

    public List<HrReportLookupDto> Departments { get; set; } = new();

    // Years that have attendance or salary sheets (and this year)
    public List<int> Years { get; set; } = new();
}


//---------------------------------------------------------------
// Staff List
//---------------------------------------------------------------

public class StaffListRowDto
{
    public string Code { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string DesignationName { get; set; } = string.Empty;

    public string DepartmentName { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public string ShiftName { get; set; } = string.Empty;

    public string EmploymentType { get; set; } = string.Empty;

    public string JoiningDate { get; set; } = string.Empty;

    public string ConfirmationDate { get; set; } = string.Empty;

    public string Gender { get; set; } = string.Empty;

    public string DateOfBirth { get; set; } = string.Empty;

    public string BloodGroup { get; set; } = string.Empty;

    public string MobileNo { get; set; } = string.Empty;

    public string NationalId { get; set; } = string.Empty;

    public string PaymentMode { get; set; } = string.Empty;

    // Bank / MFS : the name and number
    public string PaymentAccount { get; set; } = string.Empty;

    public decimal GrossSalary { get; set; }

    public bool IsActive { get; set; }
}


//---------------------------------------------------------------
// Leave Balance
//---------------------------------------------------------------

public class LeaveBalanceTypeDto
{
    public long LeaveTypeId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string ShortName { get; set; } = string.Empty;

    // 0 = no limit
    public decimal DaysPerYear { get; set; }
}


// One leave type of an employee
public class LeaveBalanceCellDto
{
    // false : the type is not for the employee (gender)
    public bool Applies { get; set; }

    public decimal Used { get; set; }

    // Days per Year less Used (0 when there is no limit)
    public decimal Remaining { get; set; }
}


public class LeaveBalanceRowDto
{
    public string Code { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string DesignationName { get; set; } = string.Empty;

    // One per leave type, in the order of the report's types
    public List<LeaveBalanceCellDto> Cells { get; set; } = new();

    public decimal TotalUsed { get; set; }
}


public class LeaveBalanceReportDto
{
    // The leave year is a financial year : its name and its days
    public string YearName { get; set; } = string.Empty;

    public string FromDate { get; set; } = string.Empty;

    public string ToDate { get; set; } = string.Empty;

    public int Year { get; set; }

    public List<LeaveBalanceTypeDto> LeaveTypes { get; set; } = new();

    public List<LeaveBalanceRowDto> Rows { get; set; } = new();
}


//---------------------------------------------------------------
// Salary Register
//---------------------------------------------------------------

public class SalaryRegisterRowDto
{
    public string Code { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string DesignationName { get; set; } = string.Empty;

    // Net pay of each month, January first (12 values)
    public List<decimal> Net { get; set; } = new();

    public decimal TotalGross { get; set; }

    public decimal TotalEarned { get; set; }

    public decimal TotalDeductions { get; set; }

    public decimal TotalNet { get; set; }
}


public class SalaryRegisterReportDto
{
    public int Year { get; set; }

    // Status of the salary sheets of each month, January first :
    // '' (no sheet), Draft, Approved, Posted, or Mixed
    public List<string> MonthStatus { get; set; } = new();

    public List<SalaryRegisterRowDto> Rows { get; set; } = new();
}
