//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.PricingLabels;


//===============================================================
// Price Adjustment : list row
//===============================================================

public class PriceAdjustmentListRowDto
{
    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; }

    public long Id { get; set; }

    public string AdjustmentNo { get; set; } = string.Empty;

    public string PageType { get; set; } = string.Empty;

    public string CircularRef { get; set; } = string.Empty;

    // yyyy-MM-dd ('' = none)
    public string CircularDate { get; set; } = string.Empty;

    public string CutOffDate { get; set; } = string.Empty;

    // Draft / Posted / Cancelled
    public string Status { get; set; } = string.Empty;

    public int ProductCount { get; set; }

    public int BatchCount { get; set; }

    public decimal IncreaseAmount { get; set; }

    public decimal ReductionAmount { get; set; }

    public decimal NetAmount { get; set; }

    public string Remarks { get; set; } = string.Empty;

    // A deleted draft (shown for Restore)
    public bool IsDeleted { get; set; }

    public string CreatedByName { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string CreatedDate { get; set; } = string.Empty;

    public string PostedDate { get; set; } = string.Empty;
}


//===============================================================
// Price Adjustment : one document (view / edit)
//===============================================================

public class PriceAdjustmentDto
{
    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; }

    public long Id { get; set; }

    public long PriceAdjustmentId { get; set; }

    public string AdjustmentNo { get; set; } = string.Empty;

    public string PageType { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string CircularRef { get; set; } = string.Empty;

    // yyyy-MM-dd ('' = none)
    public string CircularDate { get; set; } = string.Empty;

    public string CutOffDate { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    // Draft / Posted / Cancelled
    public string Status { get; set; } = string.Empty;

    public int ProductCount { get; set; }

    public int BatchCount { get; set; }

    public decimal IncreaseAmount { get; set; }

    public decimal ReductionAmount { get; set; }

    public decimal NetAmount { get; set; }

    // The journal (PA-<branch>-<FY>-<MM>-00001; '' = none)
    public string VoucherNo { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public string CreatedByName { get; set; } = string.Empty;

    // yyyy-MM-dd HH:mm (business time)
    public string CreatedDate { get; set; } = string.Empty;

    public string PostedByName { get; set; } = string.Empty;

    public string PostedDate { get; set; } = string.Empty;

    public string CancelledByName { get; set; } = string.Empty;

    public string CancelledDate { get; set; } = string.Empty;

    public string CancelReason { get; set; } = string.Empty;

    // What the user may do with it now
    public bool CanEdit { get; set; }

    public bool CanPost { get; set; }

    public bool CanCancel { get; set; }

    public List<PriceAdjustmentProductDto> Products { get; set; } = new();

    public List<PriceAdjustmentLineDto> Lines { get; set; } = new();

    public List<PriceAdjustmentSupplierDto> Suppliers { get; set; } = new();

    public List<PriceAdjustmentReleaseDto> Releases { get; set; } = new();
}


//===============================================================
// A product row (analysis / document)
//===============================================================

public class PriceAdjustmentProductDto
{
    public long PriceAdjustmentProductId { get; set; }

    public int LineNo { get; set; }

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string PartNumber { get; set; } = string.Empty;

    // Last MRP (price index) / new MRP (VAT inclusive)
    public decimal OldMrp { get; set; }

    public decimal NewMrp { get; set; }

    // Increase / Reduction
    public string Direction { get; set; } = string.Empty;

    // (New − Old) ÷ Old × 100 (0 when there was no MRP)
    public decimal ChangePercent { get; set; }

    public int BatchCount { get; set; }

    // Quantity at the cut-off date / net amount (signed)
    public decimal Quantity { get; set; }

    public decimal Amount { get; set; }

    // Has batches with stock on the cut-off date
    public bool HasStock { get; set; }
}


//===============================================================
// A batch row (analysis / document)
//===============================================================

public class PriceAdjustmentLineDto
{
    public long PriceAdjustmentLineId { get; set; }

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public long StockBatchId { get; set; }

    public string BatchNo { get; set; } = string.Empty;

    // '' = No supplier (opening stock)
    public string SupplierCode { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;

    // Source VAT % of the batch
    public decimal VatRate { get; set; }

    // On hand on the cut-off date
    public decimal Quantity { get; set; }

    // On hand now (the batch)
    public decimal QuantityOnHandNow { get; set; }

    public decimal SoldSinceCutOff { get; set; }

    public decimal ReleasedQuantity { get; set; }

    // Quantity − ReleasedQuantity : left for future sales
    public decimal RemainingQuantity { get; set; }

    // Excl. VAT
    public decimal UnitCost { get; set; }

    public decimal OldMrp { get; set; }

    public decimal NewMrp { get; set; }

    // The batch's own margin % (1 − cost ÷ old net MRP)
    public decimal BatchMarginPercent { get; set; }

    // The margin % used (the user's when edited)
    public decimal MarginPercent { get; set; }

    public bool MarginEdited { get; set; }

    public decimal NewUnitCost { get; set; }

    // New cost − cost (positive = increase)
    public decimal DifferencePerUnit { get; set; }

    // Difference × quantity at cut-off (signed)
    public decimal Amount { get; set; }

    // Increase / Reduction / '' (no change)
    public string Direction { get; set; } = string.Empty;

    // Posted : the batch took the new MRP
    public bool MrpApplied { get; set; }
}


//===============================================================
// A supplier group and its settlement
//===============================================================

public class PriceAdjustmentSupplierDto
{
    public long PriceAdjustmentSupplierId { get; set; }

    // '' = No supplier (opening stock)
    public string SupplierCode { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;

    // Positive totals of its batches
    public decimal IncreaseAmount { get; set; }

    public decimal ReductionAmount { get; set; }

    // Supplier / Reserve / Income
    public string IncreaseTo { get; set; } = string.Empty;

    // Supplier / Expense
    public string ReductionTo { get; set; } = string.Empty;

    // false for "No supplier" : Reserve / Income / Expense only
    public bool CanUseSupplier { get; set; }
}


//===============================================================
// A release from Stock Price Adjustment
//===============================================================

public class PriceAdjustmentReleaseDto
{
    public long PriceAdjustmentReleaseId { get; set; }

    public long PriceAdjustmentLineId { get; set; }

    public long StockBatchId { get; set; }

    public string BatchNo { get; set; } = string.Empty;

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    // Signed (positive = increase released)
    public decimal Amount { get; set; }

    // Posting / Sale
    public string SourceType { get; set; } = string.Empty;

    public string SourceNo { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string ReleaseDate { get; set; } = string.Empty;
}


//===============================================================
// Cancel a posted adjustment
//===============================================================

public class CancelPriceAdjustmentDto
{
    public string Reason { get; set; } = string.Empty;
}


//===============================================================
// Price Adjustment list : paged list request
//---------------------------------------------------------------
// GET .../paged?page=1&pageSize=10&search=&sort=&dir=&type=&tab=
//
// Type : SP / LB / AC / MB ... ; empty = every type.
// Tab  : all (default) / a status (draft, posted, ...) / deleted.
// Sort : the list column fields; empty = newest first.
//===============================================================

public class PriceAdjustmentPageRequest : AppCore.Application.Common.Paging.PagedRequest
{
    public string? Type { get; set; }

    public string? Tab { get; set; }
}
