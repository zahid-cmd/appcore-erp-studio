//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Procurement.Shared;


//===============================================================
// Create / Update a purchase (draft)
//===============================================================

public class CreatePurchaseDto
{
    public string PageType { get; set; } = string.Empty;
    // yyyy-MM-dd
    public string PurchaseDate { get; set; } = string.Empty;
    public long BranchId { get; set; }
    public string SupplierCode { get; set; } = string.Empty;
    // The Purchase Order billed (PO Required ON); null = direct
    public long? PurchaseOrderId { get; set; }
    public string SupplierInvoiceNo { get; set; } = string.Empty;
    public string SupplierInvoiceDate { get; set; } = string.Empty;
    public string MushakNo { get; set; } = string.Empty;
    public string MushakDate { get; set; } = string.Empty;
    public string DoReference { get; set; } = string.Empty;
    public string GatePassNo { get; set; } = string.Empty;
    // Products Received on Purchase ON : the receiving warehouse
    public long? WarehouseId { get; set; }
    public bool PriceIncludesVat { get; set; } = true;
    public string InvoicePriceBasis { get; set; } = "DP";
    public decimal DefaultProfitPercent { get; set; }
    public string AdditionalDiscountType { get; set; } = "None";
    public decimal AdditionalDiscountValue { get; set; }
    public bool NoVatInvoice { get; set; }
    public string Narration { get; set; } = string.Empty;
    public List<CreatePurchaseLineDto> Lines { get; set; } = new();
}


//===============================================================
// A purchase line
//===============================================================

public class CreatePurchaseLineDto
{
    // PO line billed (PO-driven purchase)
    public long? PurchaseOrderLineId { get; set; }
    public string ProductCode { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal FreeQuantity { get; set; }
    public decimal Mrp { get; set; }
    public decimal ProfitPercent { get; set; }
    public decimal UnitPrice { get; set; }
    public bool IsAdjusted { get; set; }
    public bool IsTotalTyped { get; set; }
    public decimal DpAmount { get; set; }
    public decimal VatRate { get; set; }
    public string ShortNotes { get; set; } = string.Empty;
    // Motor bikes (Products Received on Purchase ON) : one per bike
    public List<PurchaseUnitDto> Units { get; set; } = new();
}


//===============================================================
// One motor bike (Unit Desk)
//===============================================================

public class PurchaseUnitDto
{
    public long MotorBikeUnitId { get; set; }
    public string ChassisNo { get; set; } = string.Empty;
    public string EngineNo { get; set; } = string.Empty;
    public string KeyNo { get; set; } = string.Empty;
    public string BatteryNo { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}


//===============================================================
// Update a draft
//===============================================================

public class UpdatePurchaseDto
    : CreatePurchaseDto
{
    public long PurchaseId { get; set; }
}


//===============================================================
// A purchase (list : header only; by id : with lines)
//===============================================================

public class PurchaseDto
{
    public long PurchaseId { get; set; }

    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; }
    public string PageType { get; set; } = string.Empty;
    public string PurchaseNo { get; set; } = string.Empty;
    public string PurchaseDate { get; set; } = string.Empty;
    public long BranchId { get; set; }
    public string BranchCode { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
    public long FinancialYearId { get; set; }
    public string SupplierCode { get; set; } = string.Empty;
    public string SupplierName { get; set; } = string.Empty;
    public long? PurchaseOrderId { get; set; }
    public string OrderNo { get; set; } = string.Empty;
    public string SupplierInvoiceNo { get; set; } = string.Empty;
    public string SupplierInvoiceDate { get; set; } = string.Empty;
    public string MushakNo { get; set; } = string.Empty;
    public string MushakDate { get; set; } = string.Empty;
    public string DoReference { get; set; } = string.Empty;
    public string GatePassNo { get; set; } = string.Empty;
    public long? WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public bool PriceIncludesVat { get; set; }
    public string InvoicePriceBasis { get; set; } = "DP";
    public string ProfitBasis { get; set; } = "MRP";
    public decimal DefaultProfitPercent { get; set; }
    public string AdditionalDiscountType { get; set; } = "None";
    public decimal AdditionalDiscountValue { get; set; }
    public decimal AdditionalDiscountAmount { get; set; }
    public string RoundingMethod { get; set; } = "None";
    public bool WholeTakaLines { get; set; }
    public decimal RoundingAdjustment { get; set; }
    public bool PurchaseVatApplicable { get; set; } = true;
    public bool SalesVatApplicable { get; set; } = true;
    public bool NoVatInvoice { get; set; }
    public bool VatCharged { get; set; } = true;
    public decimal TotalQuantity { get; set; }
    public decimal TotalFreeQuantity { get; set; }
    public decimal TotalMrp { get; set; }
    public decimal TotalProfit { get; set; }
    public decimal TotalDp { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal TotalVat { get; set; }
    public decimal TotalVatClaimable { get; set; }
    public decimal TotalPayable { get; set; }
    public string Narration { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool StockedIn { get; set; }
    public string VoucherNo { get; set; } = string.Empty;
    public string CancelReason { get; set; } = string.Empty;
    public DateTime? ApprovedDate { get; set; }
    public DateTime? PostedDate { get; set; }
    public DateTime? CancelledDate { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime? ModifiedDate { get; set; }
    public List<PurchaseLineDto> Lines { get; set; } = new();
}


//===============================================================
// A purchase line (read)
//===============================================================

public class PurchaseLineDto
{
    public long PurchaseLineId { get; set; }
    public int LineNo { get; set; }
    public long? PurchaseOrderLineId { get; set; }
    public string ProductType { get; set; } = string.Empty;
    public long ProductId { get; set; }
    public string ProductCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal FreeQuantity { get; set; }
    public decimal Mrp { get; set; }
    public decimal ProfitPercent { get; set; }
    public decimal UnitPrice { get; set; }
    public bool IsAdjusted { get; set; }
    public bool IsTotalTyped { get; set; }
    public decimal GrossMrp { get; set; }
    public decimal DpAmount { get; set; }
    public decimal ProfitAmount { get; set; }
    public decimal DiscountShare { get; set; }
    public decimal NetAmount { get; set; }
    public decimal VatRate { get; set; }
    public bool VatClaimable { get; set; } = true;
    public decimal Amount { get; set; }
    public decimal VatAmount { get; set; }
    public decimal LineTotal { get; set; }
    public decimal RoundingShare { get; set; }
    public decimal NetUnitCost { get; set; }
    public decimal ReturnedQuantity { get; set; }
    public string ShortNotes { get; set; } = string.Empty;
    public List<PurchaseUnitDto> Units { get; set; } = new();
}


//===============================================================
// Saved
//===============================================================

public class PurchaseSavedDto
{
    public long PurchaseId { get; set; }

    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; }
    public string PurchaseNo { get; set; } = string.Empty;
}


//===============================================================
// Cancel (reason required)
//===============================================================

public class CancelPurchaseDto
{
    public string Reason { get; set; } = string.Empty;
}


//===============================================================
// Mushak 6.3 No check (live, while typing) : one number once per
// supplier in a financial year
//===============================================================

public class PurchaseMushakCheckDto
{
    public bool Taken { get; set; }

    // The purchase that holds it ('' = free)
    public string PurchaseNo { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;
}


//===============================================================
// Unit Desk live check : bike numbers already on another
// purchase (Chassis / Engine always, Key / Battery when their
// "unique" switch is ON)
//===============================================================

public class PurchaseUnitCheckDto
{
    // The purchase being edited (its own bikes are not a clash)
    public long? PurchaseId { get; set; }

    public List<PurchaseUnitDto> Units { get; set; } = new();
}


public class PurchaseUnitTakenDto
{
    // ChassisNo / EngineNo / KeyNo / BatteryNo
    public string Field { get; set; } = string.Empty;

    public string Value { get; set; } = string.Empty;

    public string PurchaseNo { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;
}


//===============================================================
// The page's switches, as the form needs them
//===============================================================

public class PurchaseRulesDto
{
    // PO Required : lines come from one Purchase Order
    public bool PoRequired { get; set; }
    // Products Received on Purchase : warehouse + Unit Desk here
    public bool ReceivedOnPurchase { get; set; }
    // Units Required (MB) : chassis / engine / key / battery for every bike
    public bool UnitsRequired { get; set; }
    public bool UniqueKeyNo { get; set; }
    public bool UniqueBatteryNo { get; set; }
    public bool MushakRequired { get; set; }
    public bool SupplierInvoiceRequired { get; set; }
    public bool DoReferenceRequired { get; set; }
    public bool GatePassRequired { get; set; }
    // Price Above PO : null = not allowed; else the tolerance %
    public decimal? PriceAbovePoPercent { get; set; }
    // VAT as per 6.3 : the line VAT can be typed
    public bool VatEditable { get; set; }
    public bool FreeGoodsAllowed { get; set; }
    // 0 = no limit
    public int MaxLines { get; set; }
    public bool PostOnApproval { get; set; }
    public bool EditSupplierTerms { get; set; } = true;
    public bool BackDatedAllowed { get; set; }
    public int BackDatedDays { get; set; }
    public bool PostDatedAllowed { get; set; }
    public int PostDatedDays { get; set; }
}


//===============================================================
// A warehouse of the branch
//===============================================================

public class PurchaseWarehouseOptionDto
{
    public long WarehouseId { get; set; }
    public string WarehouseCode { get; set; } = string.Empty;
    public string WarehouseName { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
}


//===============================================================
// Purchase VAT rule per product type on the purchase date
//===============================================================

public class PurchaseVatRateDto
{
    // Motor Bikes / Spare Parts / Lubricants / Accessories
    public string ProductType { get; set; } = string.Empty;
    // null = no active Purchase VAT rule on the date
    public decimal? VatRate { get; set; }
    public bool InputCreditAllowed { get; set; } = true;
}


//===============================================================
// Defaults : number preview, period, switches, options
//===============================================================

public class PurchaseDefaultsDto
{
    // Business Configuration : the branch does not run the page's
    // line today. The page is blocked (read-only, no commands);
    // Message says why.
    public bool BranchBlocked { get; set; }

    public string PurchaseNo { get; set; } = string.Empty;
    public long BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public long FinancialYearId { get; set; }
    public string FinancialYearName { get; set; } = string.Empty;
    public string FinancialYearCode { get; set; } = string.Empty;
    public int PeriodMonth { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Today { get; set; } = string.Empty;
    public PurchaseRulesDto Rules { get; set; } = new();
    public List<PurchaseOrderSupplierOptionDto> Suppliers { get; set; } = new();
    public List<PurchaseOrderProductOptionDto> Products { get; set; } = new();
    public List<PurchaseWarehouseOptionDto> Warehouses { get; set; } = new();
    public List<PurchaseVatRateDto> VatRates { get; set; } = new();
}


//===============================================================
// An open Purchase Order of a supplier (Approved / Placed with quantity left)
//===============================================================

public class PurchaseOpenOrderDto
{
    public long PurchaseOrderId { get; set; }
    public string OrderNo { get; set; } = string.Empty;
    public string OrderDate { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public long BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public bool PriceIncludesVat { get; set; }
    public string InvoicePriceBasis { get; set; } = "DP";
    public decimal DefaultProfitPercent { get; set; }
    public string AdditionalDiscountType { get; set; } = "None";
    public decimal AdditionalDiscountValue { get; set; }
    public bool NoVatInvoice { get; set; }
    public decimal TotalPayable { get; set; }
    public List<PurchaseOpenOrderLineDto> Lines { get; set; } = new();
}


//===============================================================
// An open PO line
//===============================================================

public class PurchaseOpenOrderLineDto
{
    public long PurchaseOrderLineId { get; set; }
    public int LineNo { get; set; }
    public string ProductType { get; set; } = string.Empty;
    public long ProductId { get; set; }
    public string ProductCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal FreeQuantity { get; set; }
    public decimal BilledQuantity { get; set; }
    // Quantity + free not yet billed (other purchases' drafts not counted)
    public decimal Remaining { get; set; }
    public decimal Mrp { get; set; }
    public decimal ProfitPercent { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal VatRate { get; set; }
}


//===============================================================
// List page : paged request and the supplier filter options
//---------------------------------------------------------------
// GET .../paged?page=1&pageSize=10&search=&sort=&dir=&tab=&supplier=
//
// Tab      : all (default) / Draft / Approved / Posted / Cancelled.
// Supplier : a supplier code ('' = all).
// Sort     : the list column fields; empty = newest first.
//===============================================================

public class PurchasePageRequest : AppCore.Application.Common.Paging.PagedRequest
{
    public string? Tab { get; set; }

    public string? Supplier { get; set; }
}


public class PurchaseListSupplierDto
{
    public string SupplierCode { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;
}
