//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.SalesOperations.Shared;


//===============================================================
// Sales invoice : the header columns shared by Sales Invoices -
// SP / AC / MB. Each page has its own table (SalesInvoicesSp ...).
// Every figure is priced by the server (FIFO batches, MRP,
// campaign / membership, special and fractional discounts, VAT).
//===============================================================

public abstract class SalesInvoiceHeader
{
    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public long SalesInvoiceId { get; set; }
    public string PageType { get; set; } = string.Empty;
    public string InvoiceNo { get; set; } = string.Empty;
    public DateOnly InvoiceDate { get; set; }
    public long BranchId { get; set; }
    public string BranchCode { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
    public long FinancialYearId { get; set; }

    // Warehouse the stock leaves
    public long WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;

    // Sales person (User Profile)
    public long? SalesPersonId { get; set; }
    public string SalesPersonName { get; set; } = string.Empty;

    // Customer (as on the invoice date)
    public long CustomerId { get; set; }
    public string CustomerCode { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public string CustomerAddress { get; set; } = string.Empty;
    // Inbound / Outside
    public string CustomerType { get; set; } = string.Empty;
    public bool CustomerIsWalkIn { get; set; }
    public string ReceivableLedgerCode { get; set; } = string.Empty;

    // Membership used for the discount (null = none)
    public long? MembershipId { get; set; }
    public string MembershipNo { get; set; } = string.Empty;
    public string MembershipCardName { get; set; } = string.Empty;
    public decimal MembershipDiscountPercent { get; set; }
    public string MembershipDiscountLedgerCode { get; set; } = string.Empty;

    // Sales VAT Applicable on the invoice date
    public bool VatApplicable { get; set; } = true;

    // Special discount on the whole invoice : None / Percent / Amount
    public string InvoiceSpecialType { get; set; } = "None";
    public decimal InvoiceSpecialValue { get; set; }

    // Totals
    public decimal TotalQuantity { get; set; }
    public decimal GrossAmount { get; set; }
    public decimal CampaignDiscount { get; set; }
    public decimal MembershipDiscount { get; set; }
    public decimal SpecialDiscount { get; set; }
    public decimal FractionalDiscount { get; set; }
    public decimal InvoiceTotal { get; set; }
    public decimal TotalVatInside { get; set; }
    public decimal TotalBaseVat { get; set; }
    public decimal CostAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal DueAmount { get; set; }

    public string Narration { get; set; } = string.Empty;

    // Draft / Approved / Posted / Cancelled
    public string Status { get; set; } = string.Empty;
    // Journal number (= the invoice number once posted)
    public string VoucherNo { get; set; } = string.Empty;
    // Receipt Voucher made from the payments
    public long? ReceiptVoucherId { get; set; }
    public string ReceiptVoucherNo { get; set; } = string.Empty;
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
