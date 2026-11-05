//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.PricingLabels;


//===============================================================
// Price Adjustment : save a draft. The server analyses again
// (never trusts the page's figures) and stores the result.
//===============================================================

public class CreatePriceAdjustmentDto
    : PriceAdjustmentAnalyseInputDto
{
    public string CircularRef { get; set; } = string.Empty;

    // yyyy-MM-dd ; '' = none
    public string? CircularDate { get; set; }

    public string Remarks { get; set; } = string.Empty;
}


//===============================================================
// A product and its new MRP (VAT inclusive)
//===============================================================

public class PriceAdjustmentProductInputDto
{
    public long ProductId { get; set; }

    public decimal NewMrp { get; set; }
}


//===============================================================
// A batch whose margin % the user changed
//===============================================================

public class PriceAdjustmentMarginInputDto
{
    public long StockBatchId { get; set; }

    public decimal MarginPercent { get; set; }
}


//===============================================================
// How a supplier group is settled
//   IncreaseTo  : Supplier / Reserve / Income   ('' = Reserve)
//   ReductionTo : Supplier / Expense            ('' = Expense)
//===============================================================

public class PriceAdjustmentSupplierInputDto
{
    // '' = No supplier (opening stock)
    public string SupplierCode { get; set; } = string.Empty;

    public string IncreaseTo { get; set; } = string.Empty;

    public string ReductionTo { get; set; } = string.Empty;
}
