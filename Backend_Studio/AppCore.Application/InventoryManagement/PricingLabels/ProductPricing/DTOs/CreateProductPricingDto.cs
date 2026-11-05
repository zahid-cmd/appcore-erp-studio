//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.PricingLabels;


//===============================================================
// Product Pricing (Price Change) : save a draft. One line per
// ticked batch; the lines of a product carry the same new MRP.
//===============================================================

public class CreateProductPricingDto
{
    // MB / SP / AC
    public string PageType { get; set; } = string.Empty;

    // yyyy-MM-dd (effective date)
    public string PricingDate { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    // New (one purchase invoice) / Reprice; '' = Reprice
    public string PricingKind { get; set; } = string.Empty;

    // New : the invoice and the basis / % applied to all
    public long PurchaseId { get; set; }

    public string PricingBasis { get; set; } = string.Empty;

    public decimal BasisPercent { get; set; }

    public List<CreateProductPricingLineDto> Lines { get; set; } = new();
}

public class CreateProductPricingLineDto
{
    public long ProductId { get; set; }

    public long StockBatchId { get; set; }

    // VAT inclusive : the sale price
    public decimal NewMrp { get; set; }

    public string Notes { get; set; } = string.Empty;

    // New : the line's % and the MRP it gave
    public decimal ProfitPercent { get; set; }

    public decimal SuggestedMrp { get; set; }
}
