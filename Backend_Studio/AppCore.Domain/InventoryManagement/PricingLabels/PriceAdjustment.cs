//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.InventoryManagement.PricingLabels;


//===============================================================
// Price Adjustment : a price circular (increases and reductions
// mixed) applied to the stock on hand on its cut-off date.
//   One document = one product type (MB / SP / AC).
//   Per priced batch with stock on the cut-off date, all figures
//   excluding VAT :
//     margin %      = 1 − cost ÷ old net MRP (editable per batch)
//     new unit cost = new net MRP × (1 − margin %)
//     difference    = (new cost − cost) × quantity at cut-off
//   Settlement per supplier group (the batch's supplier) :
//     increase  → Supplier / Price Increase Reserve / Income
//     reduction → Supplier / Price Reduction Expense
//   Draft → Posted (new MRP on the batches, price index, one
//   journal PA-…; units sold since the cut-off released at once)
//   → Cancelled (journal reversed, old MRPs back) while no sale
//   released any unit and no later price change touched a batch.
//===============================================================

public class PriceAdjustment
{
    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public long PriceAdjustmentId { get; set; }

    // Adjustment No : PA-<MB|SP|AC>-0001, given on the first save;
    // one counter per type, never reset, never reused
    public string AdjustmentNo { get; set; } = string.Empty;

    public int SequenceNo { get; set; }

    // MB / SP / AC
    public string PageType { get; set; } = string.Empty;

    // The branch it was made in (the journal's branch)
    public long BranchId { get; set; }

    // The supplier's / maker's price circular
    public string CircularRef { get; set; } = string.Empty;

    public DateOnly? CircularDate { get; set; }

    // The new prices apply from this date (stock on hand on it)
    public DateOnly CutOffDate { get; set; }

    public string Remarks { get; set; } = string.Empty;

    // Draft / Posted / Cancelled
    public string Status { get; set; } = "Draft";

    public int ProductCount { get; set; }

    public int BatchCount { get; set; }

    // Totals (positive figures) and Net = Increase − Reduction
    public decimal IncreaseAmount { get; set; }

    public decimal ReductionAmount { get; set; }

    public decimal NetAmount { get; set; }

    // The journal posted (PA-<branch>-<FY>-<MM>-00001); '' = none
    // (nothing to post, e.g. price-only lines)
    public string VoucherNo { get; set; } = string.Empty;

    public long? PostedBy { get; set; }

    public DateTime? PostedDate { get; set; }

    public long? CancelledBy { get; set; }

    public DateTime? CancelledDate { get; set; }

    public string CancelReason { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


//===============================================================
// One row per product : its last MRP and the new one, with the
// totals of its batches (BatchCount 0 = price only)
//===============================================================

public class PriceAdjustmentProducts
{
    public long PriceAdjustmentProductId { get; set; }

    public long PriceAdjustmentId { get; set; }

    public int LineNo { get; set; }

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string PartNumber { get; set; } = string.Empty;

    // Last MRP (price index) and the new one (VAT inclusive)
    public decimal OldMrp { get; set; }

    public decimal NewMrp { get; set; }

    // Increase / Reduction
    public string Direction { get; set; } = string.Empty;

    public int BatchCount { get; set; }

    // Quantity at the cut-off date and the net amount (signed)
    public decimal Quantity { get; set; }

    public decimal Amount { get; set; }
}


//===============================================================
// One row per batch with stock on the cut-off date
//===============================================================

public class PriceAdjustmentLines
{
    public long PriceAdjustmentLineId { get; set; }

    public long PriceAdjustmentId { get; set; }

    public long ProductId { get; set; }

    public long StockBatchId { get; set; }

    public string BatchNo { get; set; } = string.Empty;

    // The batch's supplier ('' = opening stock : "No supplier")
    public string SupplierCode { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;

    // The batch's source VAT % (0 = no VAT inside the MRP)
    public decimal VatRate { get; set; }

    // On hand on the cut-off date
    public decimal Quantity { get; set; }

    // Sold between the cut-off date and the analysis / posting
    public decimal SoldSinceCutOff { get; set; }

    // Released so far (posting catch-up + sales); the rest
    // (Quantity − ReleasedQuantity) is released by future sales
    public decimal ReleasedQuantity { get; set; }

    // The batch's unit cost (excl. VAT)
    public decimal UnitCost { get; set; }

    // The batch's MRP before (given back on cancel) and the new one
    public decimal OldMrp { get; set; }

    public decimal NewMrp { get; set; }

    // The margin % used and whether the user changed it
    public decimal MarginPercent { get; set; }

    public bool MarginEdited { get; set; }

    public decimal NewUnitCost { get; set; }

    // New cost − cost (positive = increase, negative = reduction)
    public decimal DifferencePerUnit { get; set; }

    // Difference × quantity at cut-off (signed)
    public decimal Amount { get; set; }

    // Posted : the batch took the new MRP (it still had stock);
    // cancel gives it back its old MRP
    public bool MrpApplied { get; set; }
}


//===============================================================
// One row per supplier group : how its increase / reduction is
// settled
//===============================================================

public class PriceAdjustmentSuppliers
{
    public long PriceAdjustmentSupplierId { get; set; }

    public long PriceAdjustmentId { get; set; }

    // '' = No supplier (opening stock)
    public string SupplierCode { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;

    // Supplier / Reserve / Income
    public string IncreaseTo { get; set; } = "Reserve";

    // Supplier / Expense
    public string ReductionTo { get; set; } = "Expense";

    public decimal IncreaseAmount { get; set; }

    public decimal ReductionAmount { get; set; }
}


//===============================================================
// What was released from Stock Price Adjustment : the units sold
// between the cut-off and posting (Posting), then each sale
// (Sale)
//===============================================================

public class PriceAdjustmentReleases
{
    public long PriceAdjustmentReleaseId { get; set; }

    public long PriceAdjustmentLineId { get; set; }

    public long PriceAdjustmentId { get; set; }

    public long StockBatchId { get; set; }

    public decimal Quantity { get; set; }

    // Signed like the line (positive = increase released)
    public decimal Amount { get; set; }

    // Posting / Sale
    public string SourceType { get; set; } = string.Empty;

    public string SourceNo { get; set; } = string.Empty;

    public DateOnly ReleaseDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }
}
