//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Procurement.MotorBikePurchase;


//===============================================================
// Create Purchase Order (Draft). The number, product names,
// amounts and totals are worked out by the server.
//===============================================================

public class CreatePurchaseOrdersMbDto
{
    // MB / SP / AC
    public string PageType { get; set; } = string.Empty;

    // yyyy-MM-dd (required)
    public string OrderDate { get; set; } = string.Empty;

    // yyyy-MM-dd ('' = not given)
    public string ExpectedDate { get; set; } = string.Empty;

    // Login branch
    public long BranchId { get; set; }

    public string SupplierCode { get; set; } = string.Empty;

    public bool PriceIncludesVat { get; set; } = true;

    public string Narration { get; set; } = string.Empty;

    public List<CreatePurchaseOrderLineDto> Lines { get; set; } = new();
}


public class CreatePurchaseOrderLineDto
{
    public string ProductCode { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    // As typed (VAT inclusive or exclusive)
    public decimal UnitPrice { get; set; }

    // 0 – 100
    public decimal VatRate { get; set; }

    public string ShortNotes { get; set; } = string.Empty;
}