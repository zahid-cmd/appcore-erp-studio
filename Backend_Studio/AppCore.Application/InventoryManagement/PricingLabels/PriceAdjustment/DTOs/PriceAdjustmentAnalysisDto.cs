//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.PricingLabels;


//===============================================================
// Price Adjustment : analyse (read only). The stock on hand on
// the cut-off date of the products' priced batches, and what the
// new MRPs make of it (all excluding VAT).
//===============================================================

public class PriceAdjustmentAnalyseInputDto
{
    // MB / SP / AC
    public string Type { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string CutOffDate { get; set; } = string.Empty;

    public List<PriceAdjustmentProductInputDto> Products { get; set; } = new();

    // Batches whose margin % the user changed (the others use
    // their own margin)
    public List<PriceAdjustmentMarginInputDto> Margins { get; set; } = new();

    // Settlement per supplier group (optional on analyse; groups
    // not given take Reserve / Expense)
    public List<PriceAdjustmentSupplierInputDto> Suppliers { get; set; } = new();
}


public class PriceAdjustmentAnalysisDto
{
    // yyyy-MM-dd
    public string CutOffDate { get; set; } = string.Empty;

    public List<PriceAdjustmentProductDto> Products { get; set; } = new();

    public List<PriceAdjustmentLineDto> Lines { get; set; } = new();

    public List<PriceAdjustmentSupplierDto> Suppliers { get; set; } = new();

    // Totals (positive) and Net = Increase − Reduction
    public decimal IncreaseAmount { get; set; }

    public decimal ReductionAmount { get; set; }

    public decimal NetAmount { get; set; }
}
