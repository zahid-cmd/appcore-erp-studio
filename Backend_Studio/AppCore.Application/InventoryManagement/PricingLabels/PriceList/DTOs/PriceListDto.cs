//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.PricingLabels;


//===============================================================
// Price List : the current MRP (VAT inclusive : the sale price)
// of every product of one type, in stock or not (read only)
//===============================================================

public class PriceListDto
{
    public string PageType { get; set; } = string.Empty;

    // yyyy-MM-dd (business date : the sales VAT rate of this day)
    public string Today { get; set; } = string.Empty;

    // Profit % On Sale Price (CFG-MOD-012-0010) : OFF = on cost
    // (markup), ON = margin on the net sale
    public bool ProfitOnSale { get; set; }

    // Sales VAT inside the MRP : applicability and the rules
    public bool SalesVatApplicable { get; set; }

    public List<ProductPricingVatRuleDto> SalesVatRules { get; set; } = new();

    public List<PriceListRowDto> Rows { get; set; } = new();
}

public class PriceListRowDto
{
    public long ProductId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // The maker's part number / name (MB : the model name)
    public string PartNumber { get; set; } = string.Empty;

    public string PartName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    // Motor Bikes / Spare Parts / Lubricants / Accessories
    public string VatType { get; set; } = string.Empty;

    // Brand of its category (0 = none; below 0 = taken from the
    // category name)
    public long BrandId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    public long CategoryId { get; set; }

    public string CategoryName { get; set; } = string.Empty;

    public long SubCategoryId { get; set; }

    public string SubCategoryName { get; set; } = string.Empty;

    // On hand + in transit
    public decimal InStock { get; set; }

    // Weighted average net unit cost of the in-stock batches (0 =
    // none in stock)
    public decimal AvgCost { get; set; }

    // Net unit cost of the latest batch (0 = never purchased)
    public decimal LastCost { get; set; }

    // The declared MRP (price index), else the latest priced batch
    // (0 = unpriced)
    public decimal CurrentMrp { get; set; }

    // yyyy-MM-dd ('' = unpriced)
    public string MrpDate { get; set; } = string.Empty;

    public string MrpSourceNo { get; set; } = string.Empty;

    // In-stock batches / those without an MRP
    public int BatchCount { get; set; }

    public int UnpricedBatches { get; set; }
}
