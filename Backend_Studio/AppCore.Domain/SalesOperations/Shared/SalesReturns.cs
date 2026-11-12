//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.SalesOperations.Shared;


//===============================================================
// Sales Returns - MB / SP / AC (hand-written; tables made by
// SalesReturns_Engine.sql; NO Code Synchronization)
//
// One return = one posted sales invoice of the type. Its lines
// take quantities of the invoice lines (MB : whole chassis), with
// the invoice line's figures pro-rata. Draft -> Approved ->
// Posted, or Cancelled (a posted return is final).
//===============================================================

public class SalesReturns
{
    public long SalesReturnId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    // MB / SP / AC
    public string ProductType { get; set; } = string.Empty;

    // SRMB / SRSP / SRAC-<branch>-<FY>-<MM>-<seq>
    public string ReturnNo { get; set; } = string.Empty;

    public DateOnly ReturnDate { get; set; }

    public long BranchId { get; set; }

    public long WarehouseId { get; set; }

    public long SalesInvoiceId { get; set; }

    public string SalesInvoiceNo { get; set; } = string.Empty;

    public DateOnly SalesInvoiceDate { get; set; }

    public long CustomerId { get; set; }

    public string CustomerCode { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerPhone { get; set; } = string.Empty;

    public string ReceivableLedgerCode { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;

    public string Narration { get; set; } = string.Empty;

    public decimal TotalQuantity { get; set; }

    public decimal GrossAmount { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal ItemsAmount { get; set; }

    public decimal RegistrationRefund { get; set; }

    public decimal ReturnTotal { get; set; }

    public decimal TotalVatInside { get; set; }

    public decimal TotalBaseVat { get; set; }

    public decimal CostAmount { get; set; }

    // Draft / Approved / Posted / Cancelled
    public string Status { get; set; } = "Draft";

    public string VoucherNo { get; set; } = string.Empty;

    public string CancelReason { get; set; } = string.Empty;

    public long? ApprovedBy { get; set; }

    public DateTime? ApprovedDate { get; set; }

    public long? PostedBy { get; set; }

    public DateTime? PostedDate { get; set; }

    public long? CancelledBy { get; set; }

    public DateTime? CancelledDate { get; set; }

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


public class SalesReturnLines
{
    public long SalesReturnLineId { get; set; }

    public long SalesReturnId { get; set; }

    public int LineNo { get; set; }

    public long SalesInvoiceLineId { get; set; }

    public int InvoiceLineNo { get; set; }

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string PartNumber { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public long? MotorBikeUnitId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string ColorName { get; set; } = string.Empty;

    public decimal SoldQuantity { get; set; }

    public decimal Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal GrossAmount { get; set; }

    public string DiscountSource { get; set; } = "None";

    public decimal CampaignMembershipAmount { get; set; }

    public decimal SpecialAmount { get; set; }

    public decimal FractionalShare { get; set; }

    public decimal LineTotal { get; set; }

    public decimal VatRate { get; set; }

    public decimal VatInside { get; set; }

    public decimal BaseVat { get; set; }

    public decimal VatPayable { get; set; }

    public decimal RegistrationRefund { get; set; }

    public decimal RegistrationCommission { get; set; }

    public decimal CostAmount { get; set; }

    // [{"a":allocationId,"b":batchId,"q":qty,"v":value}]
    public string Restocked { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;
}
