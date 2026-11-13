//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SalesOperations.Shared;


//===============================================================
// Sales Quotations - MB / SP / AC : DTOs
//
// The page is the Sales Invoice page in quotation mode : the body
// it saves is the invoice body (customer, lines, discounts; no
// payments) plus the prospect and the terms.
//===============================================================

public class SaveSalesQuotationDto
    : CreateSalesInvoiceDto
{
    // A prospect when CustomerId is 0 : name + phone required
    public string ProspectName { get; set; } = string.Empty;

    public string ProspectPhone { get; set; } = string.Empty;

    public string ProspectAddress { get; set; } = string.Empty;

    // Printed under the lines (delivery, validity, notes ...)
    public string Terms { get; set; } = string.Empty;

    // MB : the exact bikes are named (one per quantity of each
    // model line); false = models only
    public bool SpecificUnits { get; set; }

    // MB Specific unit : the bikes picked (ProductId = the model)
    public List<SalesQuotationUnitDto> Units { get; set; } = new();
}


// MB Specific unit : one bike of a quotation line
public class SalesQuotationUnitDto
{
    // The model (MotorBikeId)
    public long ProductId { get; set; }

    public long MotorBikeUnitId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string ColorName { get; set; } = string.Empty;
}


public class SalesQuotationLineDto
{
    public int LineNo { get; set; }

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string PartNumber { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    // As typed
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

    // MB Specific unit : the bikes of the line
    public List<SalesQuotationUnitDto> Units { get; set; } = new();
}


public class SalesQuotationDto
{
    public long SalesQuotationId { get; set; }

    public Guid PublicId { get; set; }

    public string ProductType { get; set; } = string.Empty;

    public string QuotationNo { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string QuotationDate { get; set; } = string.Empty;

    public string ValidUntil { get; set; } = string.Empty;

    public bool IsExpired { get; set; }

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public long WarehouseId { get; set; }

    public long? SalesPersonId { get; set; }

    public string SalesPersonName { get; set; } = string.Empty;

    // null = a prospect
    public long? CustomerId { get; set; }

    public bool IsProspect { get; set; }

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

    // MB : the exact bikes are named on the lines
    public bool SpecificUnits { get; set; }

    // Open / Converted / Cancelled
    public string Status { get; set; } = string.Empty;

    public string SalesInvoiceNo { get; set; } = string.Empty;

    public string ConvertedDate { get; set; } = string.Empty;

    // A draft / approved invoice made from it (not posted yet)
    public string HeldByInvoiceNo { get; set; } = string.Empty;

    public string CancelReason { get; set; } = string.Empty;

    public string CreatedByName { get; set; } = string.Empty;

    public DateTime CreatedDate { get; set; }

    public List<SalesQuotationLineDto> Lines { get; set; } = new();
}


public class SalesQuotationListItemDto
{
    public long SalesQuotationId { get; set; }

    public Guid PublicId { get; set; }

    public string QuotationNo { get; set; } = string.Empty;

    public string QuotationDate { get; set; } = string.Empty;

    public string ValidUntil { get; set; } = string.Empty;

    public bool IsExpired { get; set; }

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public bool IsProspect { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerPhone { get; set; } = string.Empty;

    // "Brake Shoe x 2, Chain Kit x 1 (+3 more)"
    public string ItemsText { get; set; } = string.Empty;

    public decimal TotalQuantity { get; set; }

    public decimal QuotationTotal { get; set; }

    public string SalesPersonName { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string SalesInvoiceNo { get; set; } = string.Empty;

    public string HeldByInvoiceNo { get; set; } = string.Empty;
}


public class SalesQuotationSavedDto
{
    public Guid PublicId { get; set; }

    public string QuotationNo { get; set; } = string.Empty;
}


public class CancelSalesQuotationDto
{
    public string Reason { get; set; } = string.Empty;
}
