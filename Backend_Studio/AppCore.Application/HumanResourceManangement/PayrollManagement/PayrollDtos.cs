//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.AccountsFinance.VoucherManagement;


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

    // Paid in full (worked out from Payroll Payments, never typed)
    public bool IsPaid { get; set; }

    // What Payroll Payments have paid of the net pay so far
    public decimal PaidAmount { get; set; }

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

    // Draft / Approved : advances due this month that were not
    // (fully) paid out by the month end, so they are not recovered
    public List<UnpaidAdvanceDto> UnpaidAdvances { get; set; } = new();

    public List<SalarySheetLineDto> Lines { get; set; } = new();
}


// An advance due for recovery in a salary month that was not
// (fully) paid out on Payroll Payments by the month end : the
// salary sheet does not recover the part that is not paid out
public class UnpaidAdvanceDto
{
    public long AdvanceId { get; set; }

    public string Code { get; set; } = string.Empty;

    public long EmployeeId { get; set; }

    public string EmployeeCode { get; set; } = string.Empty;

    public string EmployeeName { get; set; } = string.Empty;

    public string AdvanceDate { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    // Paid out by the last day of the salary month
    public decimal PaidOut { get; set; }

    // Paid out after the month end (recovered from a later month)
    public decimal PaidLater { get; set; }

    // Amount - PaidOut : not recovered on this month's sheet
    public decimal NotPaidOut { get; set; }
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


//===============================================================
// Overtime Sheets : the overtime of a POSTED salary sheet (no
// table of its own; OTS-0001 for SAL-0001)
//===============================================================

public class OvertimeSheetListItemDto
{
    // (of the salary sheet)
    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string SalarySheetCode { get; set; } = string.Empty;

    public int Year { get; set; }

    public int Month { get; set; }

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    // Employees with overtime
    public int EmployeeCount { get; set; }

    public decimal OvertimeHours { get; set; }

    public decimal OvertimeDays { get; set; }

    public decimal Amount { get; set; }

    // yyyy-MM-dd : the day the salary sheet was posted
    public string PostedDate { get; set; } = string.Empty;

    public string JournalVoucherNo { get; set; } = string.Empty;
}

public class OvertimeSheetLineDto
{
    public string EmployeeCode { get; set; } = string.Empty;

    public string EmployeeName { get; set; } = string.Empty;

    public string DesignationName { get; set; } = string.Empty;

    public string DepartmentName { get; set; } = string.Empty;

    public decimal BasicSalary { get; set; }

    public decimal GrossSalary { get; set; }

    public decimal OvertimeHours { get; set; }

    public decimal OvertimeDays { get; set; }

    public decimal Amount { get; set; }
}

public class OvertimeSheetDto
    : OvertimeSheetListItemDto
{
    public List<OvertimeSheetLineDto> Lines { get; set; } = new();
}


//===============================================================
// Payments of Human Resource (Payroll Payments / PF Payments) :
// one page, four kinds (Salary, Overtime, PfSettlement, PfLoan)
//===============================================================

public class HrPaymentListItemDto
{
    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    // Salary / Overtime / PfSettlement / PfLoan
    public string PaymentType { get; set; } = string.Empty;

    public string PaymentTypeText { get; set; } = string.Empty;

    // SAL-0001 / OTS-0001 / PFS-0001 / PFL-0001
    public string SourceCode { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string PaymentDate { get; set; } = string.Empty;

    public decimal TotalAmount { get; set; }

    public string PaymentModes { get; set; } = string.Empty;

    public int EmployeeCount { get; set; }

    public string PaymentVoucherNo { get; set; } = string.Empty;

    // (to open the voucher / its print)
    public Guid? PaymentVoucherPublicId { get; set; }

    public bool IsCancelled { get; set; }

    public string CancelReason { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;
}

// An employee of a source (what is due) / of a payment (Amount)
public class HrPaymentLineDto
{
    public long EmployeeId { get; set; }

    // The line of the salary sheet (0 : a settlement / a loan)
    public long SalarySheetLineId { get; set; }

    public string EmployeeCode { get; set; } = string.Empty;

    public string EmployeeName { get; set; } = string.Empty;

    public string DesignationName { get; set; } = string.Empty;

    // (for the bank advice)
    public string BankName { get; set; } = string.Empty;

    public string BankAccountNo { get; set; } = string.Empty;

    public string MfsName { get; set; } = string.Empty;

    public string MfsNo { get; set; } = string.Empty;

    public decimal Payable { get; set; }

    public decimal Paid { get; set; }

    public decimal Due { get; set; }

    // Paid by this payment
    public decimal Amount { get; set; }
}

public class HrPaymentDto
    : HrPaymentListItemDto
{
    public List<HrPaymentLineDto> Lines { get; set; } = new();
}

// A salary sheet / settlement / loan with something still due
public class HrPaymentSourceDto
{
    public long SourceId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Text { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public decimal Payable { get; set; }

    public decimal Paid { get; set; }

    public decimal Due { get; set; }
}

public class CreateHrPaymentLineDto
{
    public long EmployeeId { get; set; }

    public long SalarySheetLineId { get; set; }

    public decimal Amount { get; set; }
}

public class CreateHrPaymentDto
{
    public string PaymentType { get; set; } = string.Empty;

    public long SourceId { get; set; }

    // yyyy-MM-dd
    public string PaymentDate { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public List<CreateHrPaymentLineDto> Lines { get; set; } = new();

    // The money : the rows of the Payment Desk (as a Payment Voucher)
    public List<PaymentVoucherCreditDto> Credits { get; set; } = new();
}

public class CancelHrPaymentDto
{
    public string Reason { get; set; } = string.Empty;
}


//===============================================================
// Leave Encashments
//===============================================================

// A leave type of an encashment
public class LeaveEncashmentLineDto
{
    public long LeaveTypeId { get; set; }

    public string LeaveTypeName { get; set; } = string.Empty;

    public decimal Entitled { get; set; }

    // Taken and applied for
    public decimal Used { get; set; }

    public decimal Days { get; set; }

    public decimal Amount { get; set; }
}

public class LeaveEncashmentDto
{
    // The leave types it covers (all that can be encashed)
    public List<LeaveEncashmentLineDto> Lines { get; set; } = new();

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public long EmployeeId { get; set; }

    public string EmployeeCode { get; set; } = string.Empty;

    public string EmployeeName { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public long LeaveTypeId { get; set; }

    public string LeaveTypeName { get; set; } = string.Empty;

    // The leave year the days belong to : a financial year, by the
    // calendar year it starts in, and its name
    public int LeaveYear { get; set; }

    public string LeaveYearName { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string EncashDate { get; set; } = string.Empty;

    public decimal Days { get; set; }

    // Basic / Gross
    public string RateBase { get; set; } = "Basic";

    public int MonthDays { get; set; } = 30;

    public decimal DayRate { get; set; }

    public decimal Amount { get; set; }

    // The leave encashment policy it was worked out with
    public string PolicyName { get; set; } = string.Empty;

    // Pending / Approved / Rejected
    public string Status { get; set; } = string.Empty;

    public string RejectReason { get; set; } = string.Empty;

    // Paid on Payroll Payments so far
    public decimal PaidAmount { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public string JournalVoucherNo { get; set; } = string.Empty;
}

public class EncashEmployeeDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string DesignationName { get; set; } = string.Empty;

    public decimal BasicSalary { get; set; }

    public decimal GrossSalary { get; set; }
}

public class LeaveEncashmentDefaultsDto
{
    public string NextCode { get; set; } = string.Empty;

    public int Year { get; set; }

    // Day rate = salary / this
    public int MonthDays { get; set; }

    public List<EncashEmployeeDto> Employees { get; set; } = new();
}

// An encashable leave of an employee's year
public class EncashBalanceDto
{
    public long LeaveTypeId { get; set; }

    public string Name { get; set; } = string.Empty;

    public decimal Entitled { get; set; }

    public decimal Used { get; set; }

    public decimal Pending { get; set; }

    public decimal Encashed { get; set; }

    public decimal Remaining { get; set; }

    // What the policy lets encash of it now (0 : nothing), and the
    // money of that
    public decimal Encashable { get; set; }

    public decimal Amount { get; set; }

    // Why nothing can be encashed ('' : it can)
    public string Note { get; set; } = string.Empty;
}

// The leave an employee can encash for a leave year, by the
// employee's leave encashment policy (the profile's own, otherwise
// the Default)
public class EncashEligibilityDto
{
    public int Year { get; set; }

    public string YearName { get; set; } = string.Empty;

    // The leave years (financial years) the policy lets encash now,
    // and their names
    public List<int> Years { get; set; } = new();

    public List<string> YearNames { get; set; } = new();

    public long LeaveEncashPolicyId { get; set; }

    public string PolicyName { get; set; } = string.Empty;

    // The profile names it (false : it is the Default)
    public bool IsOwnPolicy { get; set; }

    // Basic / Gross
    public string RateBase { get; set; } = "Basic";

    public int MonthDays { get; set; } = 30;

    public decimal Salary { get; set; }

    public decimal DayRate { get; set; }

    // The policy in words
    public List<string> Rules { get; set; } = new();

    // Why the employee cannot encash at all ('' : the employee can)
    public string Problem { get; set; } = string.Empty;

    public List<EncashBalanceDto> Rows { get; set; } = new();
}


//===============================================================
// Festival Bonus
//===============================================================

public class BonusSheetListItemDto
{
    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string BonusDate { get; set; } = string.Empty;

    public long BonusStructureId { get; set; }

    public string StructureName { get; set; } = string.Empty;

    // Joining / Confirmation
    public string ServiceFrom { get; set; } = "Joining";

    // Basic / Gross
    public string RateBase { get; set; } = "Basic";

    public decimal BonusPercent { get; set; }

    public int MinServiceMonths { get; set; }

    // Draft / Posted
    public string Status { get; set; } = string.Empty;

    public int EmployeeCount { get; set; }

    public decimal TotalAmount { get; set; }

    // Paid on Payroll Payments so far
    public decimal PaidAmount { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public string JournalVoucherNo { get; set; } = string.Empty;
}

public class BonusSheetLineDto
{
    public long BonusSheetLineId { get; set; }

    public long EmployeeId { get; set; }

    public string EmployeeCode { get; set; } = string.Empty;

    public string EmployeeName { get; set; } = string.Empty;

    public string DesignationName { get; set; } = string.Empty;

    public decimal BasicSalary { get; set; }

    public decimal GrossSalary { get; set; }

    public int ServiceMonths { get; set; }

    // The percent of the slab the service fell in
    public decimal BonusPercent { get; set; }

    // The bonus structure of the employee (the profile's own,
    // otherwise the Default)
    public string StructureName { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public decimal PaidAmount { get; set; }
}

public class BonusSheetDto
    : BonusSheetListItemDto
{
    public List<BonusSheetLineDto> Lines { get; set; } = new();
}

// A bonus structure that can be picked, with its rule in words
public class BonusStructureChoiceDto
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public bool IsDefault { get; set; }

    public string RateBase { get; set; } = "Basic";

    public string ServiceFrom { get; set; } = "Joining";

    public bool ConfirmedOnly { get; set; }

    // "6 months : 50 %", "12 months : 100 %"
    public List<string> Slabs { get; set; } = new();
}

public class BonusSheetDefaultsDto
{
    public string NextCode { get; set; } = string.Empty;

    public List<PayrollLookupDto> Branches { get; set; } = new();

    public List<BonusStructureChoiceDto> Structures { get; set; } = new();
}

public class GenerateBonusSheetDto
{
    public string Title { get; set; } = string.Empty;

    public long BranchId { get; set; }

    // yyyy-MM-dd
    public string BonusDate { get; set; } = string.Empty;

    // Not used : every employee is worked out by the bonus
    // structure of the Employee Profile (otherwise the Default)
    public long BonusStructureId { get; set; }

    public string Remarks { get; set; } = string.Empty;
}

public class SaveBonusLineDto
{
    public long BonusSheetLineId { get; set; }

    public decimal Amount { get; set; }
}

public class SaveBonusSheetDto
{
    public List<SaveBonusLineDto> Lines { get; set; } = new();
}
