//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.HumanResourceManangement.PayrollManagement;


//===============================================================
// Payroll (Human Resource > Payroll Management, hand-written
// pages : NEVER run Code Sync for them; tables made by
// HumanResource_Phase3_Engine.sql)
//
//   HrSalaryAdvances        ADV-0001  advance / loan, recovered by
//                                     an installment each month
//   HrSalarySheets          SAL-0001  a branch's salary of a month
//   HrSalarySheetLines                one employee on a sheet
//   HrSalarySheetLineHeads            the salary structure as it
//                                     was (payslip)
//   HrAdvanceRecoveries               what a sheet takes from an
//                                     advance
//===============================================================

public class HrSalaryAdvances
{
    public long AdvanceId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public long EmployeeId { get; set; }

    // Advance / Loan
    public string AdvanceType { get; set; } = "Advance";

    public DateOnly AdvanceDate { get; set; }

    public decimal Amount { get; set; }

    // Taken from each month's salary
    public decimal InstallmentAmount { get; set; }

    // The first salary month the installment is taken from
    public int StartYear { get; set; }

    public int StartMonth { get; set; }

    public string Reason { get; set; } = string.Empty;

    // The Payment Voucher that paid it out (typed; '' = none)
    public string VoucherNo { get; set; } = string.Empty;

    // Recovery is stopped (the balance is left as it is)
    public bool IsClosed { get; set; }

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


public class HrSalarySheets
{
    public long SalarySheetId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public int Year { get; set; }

    public int Month { get; set; }

    public long BranchId { get; set; }

    // Draft / Approved / Posted
    public string Status { get; set; } = "Draft";

    // This many late days cut one day of Basic (0 = no cut)
    public int LateDaysPerCut { get; set; }

    public int EmployeeCount { get; set; }

    public decimal TotalGross { get; set; }

    public decimal TotalEarned { get; set; }

    public decimal TotalDeductions { get; set; }

    public decimal TotalNet { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public long? ApprovedBy { get; set; }

    public DateTime? ApprovedDate { get; set; }

    public long? PostedBy { get; set; }

    public DateTime? PostedDate { get; set; }

    public long? JournalVoucherId { get; set; }

    public string JournalVoucherNo { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


public class HrSalarySheetLines
{
    public long SalarySheetLineId { get; set; }

    public long SalarySheetId { get; set; }

    public long EmployeeId { get; set; }

    // The employee as on the day the sheet was made
    public string EmployeeCode { get; set; } = string.Empty;

    public string EmployeeName { get; set; } = string.Empty;

    public string DesignationName { get; set; } = string.Empty;

    public string DepartmentName { get; set; } = string.Empty;

    public string PaymentMode { get; set; } = "Cash";

    // Bank / MFS : the name and number
    public string PaymentAccount { get; set; } = string.Empty;

    // Attendance of the month
    public int MonthDays { get; set; }

    public decimal PayableDays { get; set; }

    public decimal UnpaidDays { get; set; }

    public int LateDays { get; set; }

    public decimal OvertimeHours { get; set; }

    // Extra days paid as overtime (worked on a weekly holiday /
    // public holiday)
    public decimal OvertimeDays { get; set; }

    // Salary structure
    public decimal BasicSalary { get; set; }

    public decimal GrossSalary { get; set; }

    // Worked out
    public decimal AbsenceDeduction { get; set; }

    public decimal LateDeduction { get; set; }

    public decimal OvertimeAmount { get; set; }

    // Provident fund : kept back from the employee, added by the
    // company (not part of the pay), and the fund loan instalment
    public decimal PfEmployee { get; set; }

    public decimal PfCompany { get; set; }

    public decimal PfLoan { get; set; }

    // Typed on the sheet
    public decimal OtherEarning { get; set; }

    public decimal OtherDeduction { get; set; }

    // Gross - absence - late + overtime + other earning
    public decimal EarnedSalary { get; set; }

    // Deductions of the structure (provident fund, tax ...)
    public decimal StructureDeduction { get; set; }

    public decimal AdvanceDeduction { get; set; }

    public decimal NetPay { get; set; }

    public string Remarks { get; set; } = string.Empty;

    // The net pay was handed over
    public bool IsPaid { get; set; }

    public DateOnly? PaidDate { get; set; }

    public string PaidNote { get; set; } = string.Empty;
}


public class HrSalarySheetLineHeads
{
    public long SalarySheetLineHeadId { get; set; }

    public long SalarySheetLineId { get; set; }

    public long SalaryHeadId { get; set; }

    public string HeadName { get; set; } = string.Empty;

    // Earning / Deduction
    public string HeadType { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public int DisplayOrder { get; set; }
}


public class HrAdvanceRecoveries
{
    public long AdvanceRecoveryId { get; set; }

    public long AdvanceId { get; set; }

    public long SalarySheetId { get; set; }

    public long SalarySheetLineId { get; set; }

    public long EmployeeId { get; set; }

    public decimal Amount { get; set; }
}
