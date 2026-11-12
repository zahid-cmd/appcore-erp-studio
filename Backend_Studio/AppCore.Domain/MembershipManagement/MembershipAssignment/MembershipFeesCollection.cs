//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.MembershipManagement.MembershipAssignment;


//===============================================================
// Membership Fees Collection (hand-written, 2026-11-11; table
// "MembershipFees" made by MembershipFees_Engine.sql; NO Code
// Sync). One row = one collection of a membership fee :
//   Paid      : Receipt Voucher posted, membership Active
//   Cancelled : collection cancelled (unused), membership Pending
//   Refunded  : membership cancelled unused, the fee credited to
//               the customer's ledger by a Journal Voucher
//===============================================================

public class MembershipFeesCollection
{
    public long MembershipFeeId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    // MFC-000001
    public string FeeNo { get; set; } = string.Empty;

    // Enrollment (Renewal / Upgrade later)
    public string FeeType { get; set; } = "Enrollment";

    public long MembershipId { get; set; }

    public string MembershipNo { get; set; } = string.Empty;

    public long MembershipCardId { get; set; }

    public string CardName { get; set; } = string.Empty;

    public string FeeLedgerCode { get; set; } = string.Empty;

    public long CustomerId { get; set; }

    public string CustomerCode { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string ChassisNo { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public DateOnly CollectedDate { get; set; }

    public long BranchId { get; set; }

    public string Narration { get; set; } = string.Empty;

    public long? ReceiptVoucherId { get; set; }

    public string ReceiptVoucherNo { get; set; } = string.Empty;

    // Paid / Cancelled / Refunded
    public string Status { get; set; } = "Paid";

    public string CancelReason { get; set; } = string.Empty;

    public long? CancelledBy { get; set; }

    public DateTime? CancelledDate { get; set; }

    public DateOnly? RefundDate { get; set; }

    public string RefundReason { get; set; } = string.Empty;

    public long? RefundJournalVoucherId { get; set; }

    public string RefundJournalVoucherNo { get; set; } = string.Empty;

    public long? RefundedBy { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
