//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.PricingLabels;


//===============================================================
// Product Pricing (Price Change) : read
//===============================================================

public class ProductPricingDto
{
    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; }

    public long ProductPricingId { get; set; }

    public string PageType { get; set; } = string.Empty;

    public string PricingNo { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string PricingDate { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    // New / Reprice
    public string PricingKind { get; set; } = string.Empty;

    public long PurchaseId { get; set; }

    public string PurchaseNo { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;

    public string PricingBasis { get; set; } = string.Empty;

    public decimal BasisPercent { get; set; }

    public int ProductCount { get; set; }

    public int BatchCount { get; set; }

    // Draft / Posted / Cancelled
    public string Status { get; set; } = string.Empty;

    public string PostedDate { get; set; } = string.Empty;

    public string CancelReason { get; set; } = string.Empty;

    public string CancelledDate { get; set; } = string.Empty;

    public string CreatedDate { get; set; } = string.Empty;

    public List<ProductPricingLineDto> Lines { get; set; } = new();
}

public class ProductPricingLineDto
{
    public long ProductPricingLineId { get; set; }

    public int LineNo { get; set; }

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public long StockBatchId { get; set; }

    public string BatchNo { get; set; } = string.Empty;

    public string SourceType { get; set; } = string.Empty;

    public string SourceNo { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    public decimal UnitCost { get; set; }

    public decimal OldMrp { get; set; }

    public decimal NewMrp { get; set; }

    public string Notes { get; set; } = string.Empty;

    public decimal ReceivedQuantity { get; set; }

    public decimal ProfitPercent { get; set; }

    public decimal SuggestedMrp { get; set; }

    public bool IsRaised { get; set; }
}

public class ProductPricingSavedDto
{
    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; }

    public long ProductPricingId { get; set; }

    public string PricingNo { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;
}

public class CancelProductPricingDto
{
    public string Reason { get; set; } = string.Empty;
}


//===============================================================
// The in-stock batches of a product, with the suggested MRP
//===============================================================

public class ProductPricingBatchListDto
{
    public long ProductId { get; set; }

    // Suggested new MRP for the product (whole taka; 0 = none)
    public decimal SuggestedMrp { get; set; }

    // How the suggestion was made
    public string SuggestionNote { get; set; } = string.Empty;

    // The MRP of its latest priced batch (0 = never priced)
    public decimal LastMrp { get; set; }

    public List<ProductPricingBatchDto> Batches { get; set; } = new();
}

public class ProductPricingBatchDto
{
    public long StockBatchId { get; set; }

    public string BatchNo { get; set; } = string.Empty;

    // Purchase / Opening
    public string SourceType { get; set; } = string.Empty;

    public string SourceNo { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string SourceDate { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    // On hand + in transit
    public decimal Quantity { get; set; }

    // Excl. VAT
    public decimal UnitCost { get; set; }

    // Current MRP (0 = unpriced, not saleable)
    public decimal Mrp { get; set; }

    // DP-invoice batch : cost × (1 + supplier Profit % on DP) +
    // sales VAT, rounded up to the whole taka (0 = none)
    public decimal SuggestedMrp { get; set; }

    // Ticked by default : unpriced, or the newest batch
    public bool DefaultTicked { get; set; }
}


//===============================================================
// New Pricing : the purchase invoices with received lines
//===============================================================

public class ProductPricingInvoiceDto
{
    public long PurchaseId { get; set; }

    public string PurchaseNo { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string PurchaseDate { get; set; } = string.Empty;

    public string SupplierCode { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;

    // DP / MRP
    public string InvoicePriceBasis { get; set; } = string.Empty;

    // Received lines / of them unpriced
    public int ReceivedLines { get; set; }

    public int UnpricedLines { get; set; }

    // Lines not received yet (priced when received)
    public int PendingLines { get; set; }
}


//===============================================================
// New Pricing : one invoice, its received lines (batches)
//===============================================================

public class ProductPricingInvoiceLinesDto
{
    public ProductPricingInvoiceDto Invoice { get; set; } = new();

    // The supplier's terms : Cost (profit % on cost) / Margin
    // (margin % on MRP); '' = not set on the Supplier Profile
    public string SupplierBasis { get; set; } = string.Empty;

    public decimal SupplierPercent { get; set; }

    public List<ProductPricingInvoiceLineDto> Lines { get; set; } = new();
}

public class ProductPricingInvoiceLineDto
{
    public long StockBatchId { get; set; }

    public string BatchNo { get; set; } = string.Empty;

    public long PurchaseLineId { get; set; }

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    // Motor Bikes / Spare Parts / Lubricants / Accessories
    public string VatType { get; set; } = string.Empty;

    // Sales VAT % inside the MRP (0 = none)
    public decimal SalesVatRate { get; set; }

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    // Invoiced (incl. free) / received so far
    public decimal Quantity { get; set; }

    public decimal ReceivedQuantity { get; set; }

    // Excl. VAT
    public decimal UnitCost { get; set; }

    // The batch's MRP now (0 = unpriced)
    public decimal Mrp { get; set; }

    // The product : declared MRP (price index) and stock in hand
    public decimal LastMrp { get; set; }

    public string LastMrpDate { get; set; } = string.Empty;

    public decimal ProductStock { get; set; }
}
