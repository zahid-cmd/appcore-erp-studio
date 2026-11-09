//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Procurement.Shared;


//===============================================================
// Purchase Order DTOs : one set for every Purchase Order page
// (MB / SP / AC). The pages' own DTO classes only inherit from
// these.
//===============================================================

//===============================================================
// Create Purchase Order (Draft). The number, product names,
// amounts and totals are worked out by the server.
//===============================================================

public class CreatePurchaseOrderDto
{
    // MB / SP / AC
    public string PageType { get; set; } = string.Empty;

    // yyyy-MM-dd (required)
    public string OrderDate { get; set; } = string.Empty;

    // yyyy-MM-dd ('' = not given)
    public string ExpectedDate { get; set; } = string.Empty;

    // Login branch
    public long BranchId { get; set; }

    public string SupplierCode { get; set; } = string.Empty;

    public bool PriceIncludesVat { get; set; } = true;

    // MRP / DP (how the supplier's invoice is written)
    public string InvoicePriceBasis { get; set; } = "DP";

    // DP / MRP (what the profit % is taken on)
    public string ProfitBasis { get; set; } = "MRP";

    public decimal DefaultProfitPercent { get; set; }

    // None / Percent / Amount
    public string AdditionalDiscountType { get; set; } = "None";

    public decimal AdditionalDiscountValue { get; set; }

    // "No VAT on this invoice" (ignored while purchase VAT is not
    // applicable : then there is no VAT anyway)
    public bool NoVatInvoice { get; set; }

    public string Narration { get; set; } = string.Empty;

    public List<CreatePurchaseOrderLineDto> Lines { get; set; } = new();
}


public class CreatePurchaseOrderLineDto
{
    public string ProductCode { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    // Switch "Free Goods Allowed"
    public decimal FreeQuantity { get; set; }

    // VAT-inclusive (0 = not known; required on an MRP invoice)
    public decimal Mrp { get; set; }

    public decimal ProfitPercent { get; set; }

    // DP per unit (VAT inclusive or exclusive as the order says)
    public decimal UnitPrice { get; set; }

    // DP typed over the calculated figure
    public bool IsAdjusted { get; set; }

    // true = DpAmount is the typed line total (DP worked back)
    public bool IsTotalTyped { get; set; }

    public decimal DpAmount { get; set; }

    // 0 – 100
    public decimal VatRate { get; set; }

    public string ShortNotes { get; set; } = string.Empty;
}


//===============================================================
// Purchase Order (list : header only ; form : header + lines)
//===============================================================

public class PurchaseOrderDto
{
    public long PurchaseOrderId { get; set; }

    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; }

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

    public string InvoicePriceBasis { get; set; } = "DP";

    public string ProfitBasis { get; set; } = "MRP";

    public decimal DefaultProfitPercent { get; set; }

    public string AdditionalDiscountType { get; set; } = "None";

    public decimal AdditionalDiscountValue { get; set; }

    public decimal AdditionalDiscountAmount { get; set; }

    public string RoundingMethod { get; set; } = "None";

    public bool WholeTakaLines { get; set; }

    public decimal RoundingAdjustment { get; set; }

    public decimal TotalFreeQuantity { get; set; }

    public bool PurchaseVatApplicable { get; set; } = true;

    public bool SalesVatApplicable { get; set; } = true;

    public bool NoVatInvoice { get; set; }

    public bool VatCharged { get; set; } = true;

    public decimal TotalMrp { get; set; }

    public decimal TotalProfit { get; set; }

    public decimal TotalDp { get; set; }

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

    public decimal FreeQuantity { get; set; }

    public decimal Mrp { get; set; }

    public decimal ProfitPercent { get; set; }

    // DP per unit
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

    public decimal BilledQuantity { get; set; }

    public string ShortNotes { get; set; } = string.Empty;
}


//===============================================================
// Saved (Create) : id + the number taken
//===============================================================

public class PurchaseOrderSavedDto
{
    public long PurchaseOrderId { get; set; }

    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; }

    public string OrderNo { get; set; } = string.Empty;
}


//===============================================================
// Close Short / Cancel : reason (required)
//===============================================================

public class ClosePurchaseOrderDto
{
    public string Reason { get; set; } = string.Empty;
}


//===============================================================
// Purchase Order Defaults (Add / Edit form)
//
// Next number (preview only, nothing reserved), the period, today,
// the suppliers allowed on the page and its products.
//===============================================================

public class PurchaseOrderDefaultsDto
{
    // Business Configuration : the branch does not run the page's
    // line today. The page is blocked (read-only, no commands);
    // Message says why.
    public bool BranchBlocked { get; set; }

    public string OrderNo { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public long FinancialYearId { get; set; }

    public string FinancialYearName { get; set; } = string.Empty;

    public string FinancialYearCode { get; set; } = string.Empty;

    public int PeriodMonth { get; set; }

    // '' = fine ; otherwise why no number (no open year, …)
    public string Message { get; set; } = string.Empty;

    // yyyy-MM-dd (Asia/Dhaka)
    public string Today { get; set; } = string.Empty;

    public List<PurchaseOrderSupplierOptionDto> Suppliers { get; set; } = new();

    public List<PurchaseOrderProductOptionDto> Products { get; set; } = new();
}


public class PurchaseOrderSupplierOptionDto
{
    public string SupplierCode { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public string SupplyType { get; set; } = string.Empty;

    public string Phone { get; set; } = string.Empty;

    public string BinNo { get; set; } = string.Empty;

    public int CreditDays { get; set; }

    // Optional : a supplier with a brand supplies only that
    // brand's products (the Add list follows it)
    public long? BrandManagementId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    // "No VAT on this invoice" of this supplier's last order
    // (prefill)
    public bool LastNoVatInvoice { get; set; }

    // The header Margin % of this supplier's latest MRP-invoice PO /
    // purchase (null = none yet) and that document's number : a new
    // MRP invoice starts with it when the supplier sets no margin
    public decimal? LastMarginPercent { get; set; }

    public string LastMarginNo { get; set; } = string.Empty;

    // Supplier terms (Supplier Profile); '' / null = not set
    //   Prices        : Incl / Excl / None (No VAT on the invoice)
    //   Invoice Price : DP / MRP (not MB)
    //   Profit        : Default Profit % and its base DP / MRP
    public string DefaultPriceEntry { get; set; } = string.Empty;

    public string DefaultInvoicePrice { get; set; } = string.Empty;

    public decimal? DefaultProfitPercent { get; set; }

    public string DefaultProfitOn { get; set; } = string.Empty;

    public bool IsActive { get; set; }
}


public class PurchaseOrderProductOptionDto
{
    // Motor Bikes / Spare Parts / Lubricants / Accessories
    public string ProductType { get; set; } = string.Empty;

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    // Brand category / model (sub category) : the Add filters
    public long CategoryId { get; set; }

    public string CategoryName { get; set; } = string.Empty;

    public long SubCategoryId { get; set; }

    public string SubCategoryName { get; set; } = string.Empty;

    // Brand of the category (null : category saved without one)
    public long? BrandManagementId { get; set; }

    // Saved image path (MB / SP; '' = none). The page makes the
    // full URL (API root + path), like the product pages.
    public string ImagePath { get; set; } = string.Empty;

    // Stock levels (company wide; 0 = not set)
    public int ReorderLevel { get; set; }

    public int RedLevel { get; set; }

    public int MaxStockLevel { get; set; }

    // On this page's approved / placed orders, not yet billed
    public decimal OnOrder { get; set; }

    // Company stock (all branches) = In Transit + On Hand; null =
    // nothing ever received of it
    public decimal? TotalStock { get; set; }

    // The same by branch (the 📍 list); only branches holding it
    public List<PurchaseOrderStockBranchDto> StockByBranch { get; set; } = new();

    public bool IsActive { get; set; }
}


// One branch's stock of a product
public class PurchaseOrderStockBranchDto
{
    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    // Purchased, not yet received into a warehouse
    public decimal InTransit { get; set; }

    // In the branch's warehouses
    public decimal OnHand { get; set; }
}


//===============================================================
// Last terms of an item (prefill on the page)
//   MRP    : latest PO line with an MRP (any supplier)
//   Profit : latest PO line of the selected supplier
//===============================================================

public class PurchaseOrderLastTermsDto
{
    public string ProductCode { get; set; } = string.Empty;

    // 0 = no MRP on any order yet
    public decimal LastMrp { get; set; }

    public string LastMrpOrderNo { get; set; } = string.Empty;

    public bool HasProfit { get; set; }

    public decimal ProfitPercent { get; set; }

    // DP / MRP (the page converts it to the order's basis)
    public string ProfitBasis { get; set; } = string.Empty;

    // The PO / purchase the margin came from, and its date
    // (yyyy-MM-dd) : the latest of both for this supplier and item
    public string ProfitOrderNo { get; set; } = string.Empty;

    public string ProfitDate { get; set; } = string.Empty;

    // This supplier's latest line (any invoice) : its DP, whether
    // that order's prices included VAT, the VAT rate on it
    public decimal LastDp { get; set; }

    public bool LastDpIncludesVat { get; set; } = true;

    public decimal LastVatRate { get; set; }

    public string LastDpOrderNo { get; set; } = string.Empty;
}

//===============================================================
// Update Purchase Order (Draft only ; page type locked)
//===============================================================

public class UpdatePurchaseOrderDto
    : CreatePurchaseOrderDto
{
    public long PurchaseOrderId { get; set; }
}


//===============================================================
// List page : paged request and the supplier filter options
//---------------------------------------------------------------
// GET .../paged?page=1&pageSize=10&search=&sort=&dir=&tab=&supplier=
//
// Tab      : all (default) / Draft / Approved / Placed / Completed / Closed (Closed Short + Cancelled).
// Supplier : a supplier code ('' = all).
// Sort     : the list column fields; empty = newest first.
//===============================================================

public class PurchaseOrderPageRequest : AppCore.Application.Common.Paging.PagedRequest
{
    public string? Tab { get; set; }

    public string? Supplier { get; set; }

    // Order date range, "yyyy-MM-dd", both ends included; empty = open
    public string? From { get; set; }

    public string? To { get; set; }
}


public class PurchaseOrderListSupplierDto
{
    public string SupplierCode { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;
}


//===============================================================
// Item summary (the hover card of the purchase order and
// purchase lists) : one row per product; motor bikes per model
//===============================================================

public class PurchaseItemSummaryDto
{
    public string Name { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    public decimal FreeQuantity { get; set; }

    public decimal Amount { get; set; }

    // How many document lines were folded into this row
    public int Items { get; set; }
}
