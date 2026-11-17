//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.ServiceOperations;


//===============================================================
// Service Operations : service billing (ServiceOperations_Billing_
// Engine.sql; hand-written pages, no Code Sync).
//
// ServiceInvoices         SVI-<branch>-<FY>-<MM>-00001 : one per job card, posted at
//                         once. Labour of the job card, the parts
//                         issued to it, outside work
// ServiceInvoicePayments  how it was collected (a Receipt Voucher)
// ServiceReturns          SVR-000001 : the whole invoice reversed
// FreeServiceClaims       FSC-000001 : the brand reimbursements of
//                         free services, collected and settled
//===============================================================

public class ServiceInvoices
{
    public long ServiceInvoiceId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string InvoiceNo { get; set; } = string.Empty;

    public DateOnly InvoiceDate { get; set; }

    public long BranchId { get; set; }

    public long JobCardId { get; set; }

    public string JobType { get; set; } = string.Empty;

    public long? CustomerId { get; set; }

    public string CustomerCode { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string Mobile { get; set; } = string.Empty;

    public string ReceivableLedgerCode { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public decimal LabourTotal { get; set; }

    public decimal PartsTotal { get; set; }

    public decimal OutsideTotal { get; set; }

    public decimal VatTotal { get; set; }

    public decimal Discount { get; set; }

    public decimal GrandTotal { get; set; }

    public decimal PaidAmount { get; set; }

    public decimal PartsCost { get; set; }

    public long? ReceiptVoucherId { get; set; }

    public string ReceiptVoucherNo { get; set; } = string.Empty;

    // Posted / Returned
    public string Status { get; set; } = "Posted";

    public bool IsDelivered { get; set; }

    public DateTime? DeliveredAt { get; set; }

    public long? DeliveredBy { get; set; }

    public string ReturnNo { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


public class ServiceInvoiceLines
{
    public long ServiceInvoiceLineId { get; set; }

    public long ServiceInvoiceId { get; set; }

    public int LineNo { get; set; }

    // Service / Part / Outside
    public string LineType { get; set; } = string.Empty;

    public string ItemKind { get; set; } = "Other";

    public long? ItemId { get; set; }

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public decimal Quantity { get; set; } = 1;

    public decimal Rate { get; set; }

    public decimal Amount { get; set; }

    public bool IsFree { get; set; }

    // A free scheduled service : what the brand pays back
    public decimal ClaimAmount { get; set; }

    public string ClaimLedgerCode { get; set; } = string.Empty;

    public long? BrandManagementId { get; set; }

    public long? FreeServiceClaimId { get; set; }

    public decimal VatRate { get; set; }

    public decimal VatAmount { get; set; }

    // What the customer pays for the line (VAT in it)
    public decimal Total { get; set; }

    // A part : its FIFO cost. Outside work : the vendor's charge
    public decimal Cost { get; set; }

    public string IncomeLedgerCode { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;
}


public class ServiceInvoicePayments
{
    public long ServiceInvoicePaymentId { get; set; }

    public long ServiceInvoiceId { get; set; }

    public int LineNo { get; set; }

    // Cash / Bank / MFS
    public string Mode { get; set; } = string.Empty;

    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public string TransactionRef { get; set; } = string.Empty;
}


public class ServiceReturns
{
    public long ServiceReturnId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string ReturnNo { get; set; } = string.Empty;

    public DateOnly ReturnDate { get; set; }

    public long BranchId { get; set; }

    public long ServiceInvoiceId { get; set; }

    public long JobCardId { get; set; }

    public decimal Amount { get; set; }

    public string Reason { get; set; } = string.Empty;

    public bool ReceiptCancelled { get; set; }

    public bool PartsReturned { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }
}


public class FreeServiceClaims
{
    public long FreeServiceClaimId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string ClaimNo { get; set; } = string.Empty;

    public DateOnly ClaimDate { get; set; }

    public long BrandManagementId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    public decimal TotalAmount { get; set; }

    // Open / Settled / Cancelled
    public string Status { get; set; } = "Open";

    public DateOnly? SettledDate { get; set; }

    public string SettledLedgerCode { get; set; } = string.Empty;

    public string SettledLedgerName { get; set; } = string.Empty;

    public string SettlementNo { get; set; } = string.Empty;

    public string SettlementRef { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
