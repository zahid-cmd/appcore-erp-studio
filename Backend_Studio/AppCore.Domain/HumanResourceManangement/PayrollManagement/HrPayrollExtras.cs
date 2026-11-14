//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.HumanResourceManangement.PayrollManagement;


//===============================================================
// Festival Bonus and Leave Encashments
// (HumanResource_Bonus_Encashment_Engine.sql; hand-written pages,
// no Code Sync).
//
// HrLeaveEncashments   LEN-0001 : leave days of an employee paid
//                      as money (days x day rate), taken off the
//                      leave balance of the year. Saving posts a
//                      Journal Voucher; it is paid on Payroll
//                      Payments. Never edited : deleted.
// HrBonusSheets        BON-0001 : the festival bonus of a branch
//                      (a percent of Basic or Gross). Draft ->
//                      Posted (a Journal Voucher); paid on Payroll
//                      Payments.
// HrBonusSheetLines    one employee of the sheet
//===============================================================

public class HrLeaveEncashments
{
    public long LeaveEncashmentId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string Code { get; set; } = string.Empty;

    public long EmployeeId { get; set; }

    // (the branch of the employee on that day)
    public long BranchId { get; set; }

    // 0 : the leave types are its lines (HrLeaveEncashmentLines).
    // An encashment from before lines kept its one leave type here.
    public long LeaveTypeId { get; set; }

    // The leave year the days belong to : a financial year, by the
    // calendar year it starts in
    public int LeaveYear { get; set; }

    public DateOnly EncashDate { get; set; }

    public decimal Days { get; set; }

    // Basic / Gross
    public string RateBase { get; set; } = "Basic";

    public int MonthDays { get; set; } = 30;

    // The leave encashment policy it was worked out with (and its
    // name on that day)
    public long? LeaveEncashPolicyId { get; set; }

    public string PolicyName { get; set; } = string.Empty;

    public decimal DayRate { get; set; }

    public decimal Amount { get; set; }

    public string Remarks { get; set; } = string.Empty;

    // Pending (saved : the days are held, nothing is posted) /
    // Approved (the Journal Voucher is posted) / Rejected (the days
    // go back)
    public string Status { get; set; } = "Pending";

    public long? ApprovedBy { get; set; }

    public DateTime? ApprovedDate { get; set; }

    public string RejectReason { get; set; } = string.Empty;

    public long? JournalVoucherId { get; set; }

    public string JournalVoucherNo { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }
}

// A leave type of an encashment : what the balance said that day
// and the days paid of it
public class HrLeaveEncashmentLines
{
    public long LeaveEncashmentLineId { get; set; }

    public long LeaveEncashmentId { get; set; }

    public long LeaveTypeId { get; set; }

    public string LeaveTypeName { get; set; } = string.Empty;

    public decimal Entitled { get; set; }

    // Taken and applied for
    public decimal Used { get; set; }

    public decimal Days { get; set; }

    public decimal Amount { get; set; }
}

public class HrBonusSheets
{
    public long BonusSheetId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string Code { get; set; } = string.Empty;

    // Eid-ul-Fitr 2027
    public string Title { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public DateOnly BonusDate { get; set; }

    // The bonus structure it was made with, and what that said on
    // the day (Human Resource Setup > Bonus Structures)
    public long? BonusStructureId { get; set; }

    public string StructureName { get; set; } = string.Empty;

    // Basic / Gross
    public string RateBase { get; set; } = "Basic";

    // Joining / Confirmation
    public string ServiceFrom { get; set; } = "Joining";

    // The highest percent / the least service of the structure's
    // slabs (a line keeps its own percent)
    public decimal BonusPercent { get; set; } = 100;

    public int MinServiceMonths { get; set; }

    // Draft / Posted
    public string Status { get; set; } = "Draft";

    public int EmployeeCount { get; set; }

    public decimal TotalAmount { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public long? JournalVoucherId { get; set; }

    public string JournalVoucherNo { get; set; } = string.Empty;

    public long? PostedBy { get; set; }

    public DateTime? PostedDate { get; set; }

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}

public class HrBonusSheetLines
{
    public long BonusSheetLineId { get; set; }

    public long BonusSheetId { get; set; }

    public long EmployeeId { get; set; }

    public string EmployeeCode { get; set; } = string.Empty;

    public string EmployeeName { get; set; } = string.Empty;

    public string DesignationName { get; set; } = string.Empty;

    public decimal BasicSalary { get; set; }

    public decimal GrossSalary { get; set; }

    public int ServiceMonths { get; set; }

    // The percent of the slab the service fell in
    public decimal BonusPercent { get; set; }

    // The bonus structure of the employee on that day (the
    // profile's own, otherwise the Default)
    public string StructureName { get; set; } = string.Empty;

    public decimal Amount { get; set; }
}
