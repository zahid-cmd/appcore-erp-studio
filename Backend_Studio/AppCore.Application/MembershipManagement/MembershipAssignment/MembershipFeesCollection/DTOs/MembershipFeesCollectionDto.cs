//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.AccountsFinance.VoucherManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.MembershipManagement.MembershipAssignment;


//===============================================================
// Membership Fees Collection : DTOs (hand-written page)
//
// The page lists two kinds of rows :
//   Kind "ToCollect" : a Pending membership with a fee (no fee
//                      row yet; Id = MembershipId)
//   Kind "Fee"       : a collection (Paid / Cancelled / Refunded)
//===============================================================

public class MembershipFeeRowDto
{
    // ToCollect / Fee
    public string Kind { get; set; } = string.Empty;

    // Fee rows
    public long MembershipFeeId { get; set; }

    public Guid PublicId { get; set; }

    public string FeeNo { get; set; } = string.Empty;

    public string FeeType { get; set; } = string.Empty;

    public long MembershipId { get; set; }

    public string MembershipNo { get; set; } = string.Empty;

    public string MembershipStatus { get; set; } = string.Empty;

    public string CardName { get; set; } = string.Empty;

    public long CustomerId { get; set; }

    public string CustomerCode { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerPhone { get; set; } = string.Empty;

    public string ChassisNo { get; set; } = string.Empty;

    public string StartDate { get; set; } = string.Empty;

    public string ExpiryDate { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    // ToCollect : the enrollment date; Fee : the collection date
    public string Date { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public string ReceiptVoucherNo { get; set; } = string.Empty;

    public Guid? ReceiptVoucherPublicId { get; set; }

    public string RefundJournalVoucherNo { get; set; } = string.Empty;

    public string RefundDate { get; set; } = string.Empty;

    // To Collect / Paid / Cancelled / Refunded
    public string Status { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;

    // Paid rows : a free service taken or a member discount given
    public bool Used { get; set; }

    public string UsedText { get; set; } = string.Empty;

    public bool CanCancel { get; set; }

    public bool CanRefund { get; set; }

    // Why Cancel / Refund is not offered ('' = offered)
    public string Note { get; set; } = string.Empty;
}


// The page : the rows + the user's branch (Payment Desk cash
// accounts) + the business date
public class MembershipFeesPageDto
{
    public string Today { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public List<MembershipFeeRowDto> Rows { get; set; } = new();
}


public class CollectMembershipFeeDto
{
    public long MembershipId { get; set; }

    // yyyy-MM-dd ('' = today)
    public string Date { get; set; } = string.Empty;

    public string Narration { get; set; } = string.Empty;

    // Payment Desk rows (= the fee exactly)
    public List<ReceiptVoucherDebitDto> Debits { get; set; } = new();
}


public class MembershipFeeReasonDto
{
    public string Reason { get; set; } = string.Empty;
}


public class MembershipFeeResultDto
{
    public Guid PublicId { get; set; }

    public string FeeNo { get; set; } = string.Empty;

    public string MembershipNo { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public string VoucherNo { get; set; } = string.Empty;

    public Guid? VoucherPublicId { get; set; }
}
