//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.SalesOperations.Shared;


//===============================================================
// Sales Quotations - MB / SP / AC (hand-written; tables made by
// SalesQuotations_Engine.sql; NO Code Synchronization)
//
// The Sales Invoice page in quotation mode : a customer or a
// prospect (CustomerId null : name + phone only), lines priced on
// the quotation day (MB : models with a quantity, no chassis), no
// stock, no payment, no posting. Open -> Converted (its invoice
// posted) / Cancelled. Expired = Open past ValidUntil (shown).
//===============================================================

public class SalesQuotations
{
    public long SalesQuotationId { get; set; }

    public Guid PublicId { get; set; }

    // MB / SP / AC
    public string ProductType { get; set; } = string.Empty;

    // SQMB / SQSP / SQAC-<branch>-<FY>-<MM>-<seq>
    public string QuotationNo { get; set; } = string.Empty;

    public DateOnly QuotationDate { get; set; }

    public DateOnly? ValidUntil { get; set; }

    public long BranchId { get; set; }

    public long WarehouseId { get; set; }

    public long? SalesPersonId { get; set; }

    public string SalesPersonName { get; set; } = string.Empty;

    // null = a prospect
    public long? CustomerId { get; set; }

    public string CustomerCode { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerPhone { get; set; } = string.Empty;

    public string CustomerAddress { get; set; } = string.Empty;

    public string SaleType { get; set; } = string.Empty;

    public string InvoiceSpecialType { get; set; } = "None";

    public decimal InvoiceSpecialValue { get; set; }

    public decimal FractionalDiscount { get; set; }

    public decimal TotalQuantity { get; set; }

    public decimal GrossAmount { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal QuotationTotal { get; set; }

    public decimal TotalVatInside { get; set; }

    public string Narration { get; set; } = string.Empty;

    public string Terms { get; set; } = string.Empty;

    // MB : the exact bikes are named (chassis / engine on each
    // line, SalesQuotations_SpecificUnits.sql); false = models
    public bool SpecificUnits { get; set; }

    // Open / Converted / Cancelled
    public string Status { get; set; } = "Open";

    public long? SalesInvoiceId { get; set; }

    public string SalesInvoiceNo { get; set; } = string.Empty;

    public DateOnly? ConvertedDate { get; set; }

    public string CancelReason { get; set; } = string.Empty;

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


public class SalesQuotationLines
{
    public long SalesQuotationLineId { get; set; }

    public long SalesQuotationId { get; set; }

    public int LineNo { get; set; }

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string PartNumber { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    // As typed (null = the MRP / no special)
    public decimal? TypedPrice { get; set; }

    public decimal? TypedSpecialPercent { get; set; }

    public decimal? TypedSpecialTk { get; set; }

    // As priced on the quotation day
    public decimal Mrp { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal GrossAmount { get; set; }

    public string DiscountLabel { get; set; } = string.Empty;

    public decimal DiscountAmount { get; set; }

    public decimal NetAmount { get; set; }

    public decimal VatInside { get; set; }

    // MB Specific unit : the bikes of the line, JSON
    // [{"u":unitId,"c":chassis,"e":engine,"k":colour}]; '' = none
    public string UnitsJson { get; set; } = string.Empty;
}
