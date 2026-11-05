//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.InventoryManagement.PricingLabels;


//===============================================================
// Product Pricing (Price Change) : the MRP of stock batches.
// MRP (VAT inclusive) is the sale price : the only one.
//   One document = one product type (MB / SP / AC), company-wide.
//   Draft → Posted (each ticked batch takes the new MRP; the old
//   one is kept on the line) → Cancelled (the old MRP back, while
//   no later price change touched the batch). No journal : stock
//   stays at cost.
//===============================================================

public class ProductPricing
{
    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public long ProductPricingId { get; set; }

    // MB / SP / AC
    public string PageType { get; set; } = string.Empty;

    // Price Change No : PC-<MB|SP|AC>-0001, given on the first save;
    // one counter per type, never reset, never reused
    public string PricingNo { get; set; } = string.Empty;

    public int SequenceNo { get; set; }

    // Effective date
    public DateOnly PricingDate { get; set; }

    // New (one purchase invoice) / Reprice (by product)
    public string PricingKind { get; set; } = "Reprice";

    // New : the purchase invoice priced
    public long PurchaseId { get; set; }

    public string PurchaseNo { get; set; } = string.Empty;

    public string SupplierCode { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;

    // New : Cost (profit % on cost) / Margin (margin % on MRP) and
    // the % applied to all (each line may differ)
    public string PricingBasis { get; set; } = string.Empty;

    public decimal BasisPercent { get; set; }

    public string Remarks { get; set; } = string.Empty;

    // Products / batches on the document
    public int ProductCount { get; set; }

    public int BatchCount { get; set; }

    // Draft / Posted / Cancelled
    public string Status { get; set; } = "Draft";

    public long? PostedBy { get; set; }

    public DateTime? PostedDate { get; set; }

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


//===============================================================
// One line per ticked batch. The lines of a product share its
// new MRP.
//===============================================================

public class ProductPricingLines
{
    public long ProductPricingLineId { get; set; }

    public long ProductPricingId { get; set; }

    public int LineNo { get; set; }

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public long StockBatchId { get; set; }

    public string BatchNo { get; set; } = string.Empty;

    // Purchase / Opening and its number
    public string SourceType { get; set; } = string.Empty;

    public string SourceNo { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    // In stock when saved / posted
    public decimal Quantity { get; set; }

    // The batch's unit cost (excl. VAT)
    public decimal UnitCost { get; set; }

    // MRP before (taken again on post) and the new one
    public decimal OldMrp { get; set; }

    public decimal NewMrp { get; set; }

    public string Notes { get; set; } = string.Empty;

    // New : the invoice line, what of it is received, the line's %
    // and the MRP the % gave
    public long PurchaseLineId { get; set; }

    public decimal ReceivedQuantity { get; set; }

    public decimal ProfitPercent { get; set; }

    public decimal SuggestedMrp { get; set; }

    // Older stock raised to the new MRP on post (switch 0012)
    public bool IsRaised { get; set; }

    // The batch's supplier (Price Adjustment settles with it; '' =
    // opening stock / a declared-price line)
    public string SupplierCode { get; set; } = string.Empty;
}
