//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Procurement.MotorBikePurchase;


//===============================================================
// Purchase Order (list : header only ; form : header + lines)
//===============================================================

public class PurchaseOrdersMbDto
{
    public long PurchaseOrderId { get; set; }

    // MB / SP / AC
    public string PageType { get; set; } = string.Empty;

    public string OrderNo { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string OrderDate { get; set; } = string.Empty;

    // yyyy-MM-dd ('' = not given)
    public string ExpectedDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchCode { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public long FinancialYearId { get; set; }

    public string SupplierCode { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;

    public bool PriceIncludesVat { get; set; }

    public decimal TotalQuantity { get; set; }

    public decimal TotalAmount { get; set; }

    public decimal TotalVat { get; set; }

    public decimal TotalPayable { get; set; }

    public string Narration { get; set; } = string.Empty;

    // Draft / Approved / Placed / Completed / Closed Short / Cancelled
    public string Status { get; set; } = string.Empty;

    public string CloseReason { get; set; } = string.Empty;

    public DateTime? ApprovedDate { get; set; }

    public DateTime? PlacedDate { get; set; }

    public DateTime? ClosedDate { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? ModifiedDate { get; set; }

    // Form only
    public List<PurchaseOrderLineDto> Lines { get; set; } = new();
}


public class PurchaseOrderLineDto
{
    public int LineNo { get; set; }

    public string ProductType { get; set; } = string.Empty;

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal VatRate { get; set; }

    public decimal Amount { get; set; }

    public decimal VatAmount { get; set; }

    public decimal LineTotal { get; set; }

    public decimal BilledQuantity { get; set; }

    public string ShortNotes { get; set; } = string.Empty;
}


//===============================================================
// Saved (Create) : id + the number taken
//===============================================================

public class PurchaseOrderSavedDto
{
    public long PurchaseOrderId { get; set; }

    public string OrderNo { get; set; } = string.Empty;
}


//===============================================================
// Close Short / Cancel : reason (required)
//===============================================================

public class ClosePurchaseOrderDto
{
    public string Reason { get; set; } = string.Empty;
}