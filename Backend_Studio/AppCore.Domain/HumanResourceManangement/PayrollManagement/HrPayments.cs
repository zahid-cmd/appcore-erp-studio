//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.HumanResourceManangement.PayrollManagement;


//===============================================================
// Payments of Human Resource (HumanResource_Payments_Engine.sql;
// hand-written page, no Code Sync).
//
// HrPayments      PPY-0001 : one payment of one source
//                   Salary / Overtime   a posted salary sheet
//                   PfSettlement        a settlement of the fund
//                   PfLoan              a loan of the fund
//                 with its Payment Voucher (posted at once).
//                 Never edited : cancelled (the voucher too).
// HrPaymentLines  who gets how much (the line of the salary sheet
//                 for Salary / Overtime; 0 otherwise)
//===============================================================

public class HrPayments
{
    public long PaymentId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string Code { get; set; } = string.Empty;

    // Salary / Overtime / PfSettlement / PfLoan
    public string PaymentType { get; set; } = string.Empty;

    // SalarySheetId / PfSettlementId / PfLoanId
    public long SourceId { get; set; }

    // SAL-0001 / OTS-0001 / PFS-0001 / PFL-0001
    public string SourceCode { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public DateOnly PaymentDate { get; set; }

    public decimal TotalAmount { get; set; }

    // "Cash, Bank"
    public string PaymentModes { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public long? PaymentVoucherId { get; set; }

    public string PaymentVoucherNo { get; set; } = string.Empty;

    public bool IsCancelled { get; set; }

    public string CancelReason { get; set; } = string.Empty;

    public long? CancelledBy { get; set; }

    public DateTime? CancelledDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }
}

public class HrPaymentLines
{
    public long PaymentLineId { get; set; }

    public long PaymentId { get; set; }

    public long EmployeeId { get; set; }

    // The line of the salary sheet (0 : a settlement / a loan)
    public long SalarySheetLineId { get; set; }

    public decimal Amount { get; set; }
}
