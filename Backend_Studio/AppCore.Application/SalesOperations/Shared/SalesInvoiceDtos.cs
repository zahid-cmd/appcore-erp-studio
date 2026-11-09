//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.AccountsFinance.VoucherManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SalesOperations.Shared;


//===============================================================
// Create / Update a sales invoice (also the body of POST quote)
//
// The server prices everything again (stock, MRP, discounts, VAT,
// totals) : the page sends only what the user chose.
//===============================================================

public class CreateSalesInvoiceDto
{
    // SP / AC / MB (the controller sets its own)
    public string PageType { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string InvoiceDate { get; set; } = string.Empty;

    // The login branch (the controller sets it from the token)
    public long BranchId { get; set; }

    public long WarehouseId { get; set; }

    // null / 0 = the current user
    public long? SalesPersonId { get; set; }

    public long CustomerId { get; set; }

    public List<CreateSalesInvoiceLineDto> Lines { get; set; } = new();

    // None / Percent / Amount : the special discount on the whole
    // invoice (spread over the lines by value, the last line takes
    // the remainder). Not together with line special discounts.
    public string InvoiceSpecialType { get; set; } = "None";

    // Percent : the %; Amount : Tk
    public decimal InvoiceSpecialValue { get; set; }

    // Payment Desk rows (the Receipt Voucher debit rows)
    public List<ReceiptVoucherDebitDto> Payments { get; set; } = new();

    public string Narration { get; set; } = string.Empty;

    // MB : Regular (one chassis) / Corporate (several; switch
    // 0073 and a Corporate / Institution customer). Others : ''
    public string SaleType { get; set; } = string.Empty;
}


//===============================================================
// A line as entered
//===============================================================

public class CreateSalesInvoiceLineDto
{
    public long ProductId { get; set; }

    public decimal Quantity { get; set; }

    // Price edit (switch Allow Price Edit) : one price for every
    // unit of the line; null / 0 = the batch MRP(s)
    public decimal? UnitPrice { get; set; }

    // Line special discount % (switch Allow Discount + activity
    // "Give Special Discount"); null / 0 = none
    public decimal? SpecialDiscountPercent { get; set; }

    // Sales Invoices - MB : the bike (chassis) sold; quantity 1
    public long? MotorBikeUnitId { get; set; }
}


//===============================================================
// Update a draft
//===============================================================

public class UpdateSalesInvoiceDto
    : CreateSalesInvoiceDto
{
    public long SalesInvoiceId { get; set; }
}


//===============================================================
// Cancel (reason required, 5 characters or more)
//===============================================================

public class CancelSalesInvoiceDto
{
    public string Reason { get; set; } = string.Empty;
}


//===============================================================
// Saved (create / update / post)
//===============================================================

public class SalesInvoiceSavedDto
{
    public long SalesInvoiceId { get; set; }

    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; }

    public string InvoiceNo { get; set; } = string.Empty;

    // Draft / Approved / Posted / Cancelled
    public string Status { get; set; } = string.Empty;

    public bool Posted { get; set; }

    // The Receipt Voucher made from the payments ('' = none)
    public string ReceiptVoucherNo { get; set; } = string.Empty;

    // Allowed but worth a look (below cost, above credit limit ...)
    public List<string> Warnings { get; set; } = new();
}


//===============================================================
// List row
//===============================================================

public class SalesInvoiceListItemDto
{
    public long SalesInvoiceId { get; set; }

    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; }

    public string PageType { get; set; } = string.Empty;

    public string InvoiceNo { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string InvoiceDate { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public string WarehouseName { get; set; } = string.Empty;

    public string CustomerCode { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerPhone { get; set; } = string.Empty;

    // Inbound / Outside / Walk-in
    public string CustomerTag { get; set; } = string.Empty;

    // MB : Regular / Corporate; others ''
    public string SaleType { get; set; } = string.Empty;

    public int LineCount { get; set; }

    public decimal InvoiceTotal { get; set; }

    public decimal PaidAmount { get; set; }

    public decimal DueAmount { get; set; }

    public string Status { get; set; } = string.Empty;

    public DateTime CreatedDate { get; set; }
}


//===============================================================
// One batch slice of a line (FIFO). StockBatchId 0 = the
// unallocated part of a sale without stock.
//===============================================================

public class SalesInvoiceAllocationDto
{
    public long StockBatchId { get; set; }

    public string BatchNo { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    // The batch MRP
    public decimal Mrp { get; set; }

    // The selling price of these units (batch MRP, the line's
    // lowest MRP, or the edited price)
    public decimal UnitPrice { get; set; }

    public decimal UnitCost { get; set; }

    // Cost of these units (the batch's last unit takes the rest)
    public decimal Value { get; set; }

    public decimal VatRate { get; set; }

    // VAT paid at source per unit (base VAT)
    public decimal BaseVatPerUnit { get; set; }
}


//===============================================================
// A priced line (quote and saved invoice)
//===============================================================

public class SalesInvoiceLineDto
{
    public long SalesInvoiceLineId { get; set; }

    public int LineNo { get; set; }

    // Spare Parts / Lubricants
    public string ProductType { get; set; } = string.Empty;

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string PartNumber { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    // Lowest MRP of the batches taken
    public decimal Mrp { get; set; }

    // "500.00" or "6 @ 500.00 + 4 @ 550.00"
    public string MrpText { get; set; } = string.Empty;

    // The batches taken have different MRPs ("2 MRPs in stock")
    public bool HasMixedMrp { get; set; }

    public int MrpCount { get; set; }

    // Price edit used (UnitPrice = the price typed)
    public bool PriceEdited { get; set; }

    // Edited price, else Gross / Quantity (4 decimals)
    public decimal UnitPrice { get; set; }

    // Selling value before discounts (VAT inside)
    public decimal GrossAmount { get; set; }

    // None / Campaign / Membership : the better one
    public string DiscountSource { get; set; } = "None";

    // "Membership GOLD 5%" ('' = none)
    public string DiscountLabel { get; set; } = string.Empty;

    public decimal CampaignMembershipPercent { get; set; }

    public decimal CampaignMembershipAmount { get; set; }

    // Line % typed (0 when the invoice special discount is used)
    public decimal SpecialDiscountPercent { get; set; }

    public decimal SpecialAmount { get; set; }

    // Gross - campaign / membership - special
    public decimal NetAmount { get; set; }

    // Share of the fractional (whole taka) discount
    public decimal FractionalShare { get; set; }

    // Net - fractional share
    public decimal LineTotal { get; set; }

    public decimal VatRate { get; set; }

    // VAT inside the gross : gross x r / (100 + r) per batch
    public decimal VatInside { get; set; }

    // VAT paid at source of the units sold (credited to VAT)
    public decimal BaseVat { get; set; }

    // FIFO batch cost of the units
    public decimal CostAmount { get; set; }

    // Open Price Adjustment share released by these units
    // (+ increase / - reduction)
    public decimal PriceAdjustmentShare { get; set; }

    // Net excluding the VAT inside it (compared with the cost)
    public decimal NetExclVat { get; set; }

    public bool BelowCost { get; set; }

    public string BelowCostMessage { get; set; } = string.Empty;

    // Stock short of the quantity (sold without stock or refused)
    public bool StockShort { get; set; }

    public decimal OnHand { get; set; }

    public decimal UnallocatedQuantity { get; set; }

    public decimal ReturnedQuantity { get; set; }

    public List<SalesInvoiceAllocationDto> Allocations { get; set; } = new();

    // Sales Invoices - MB : the bike sold
    public long? MotorBikeUnitId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string ColorName { get; set; } = string.Empty;

    public int? ManufactureYear { get; set; }

    public string CkdStatus { get; set; } = string.Empty;

    // Pending / Delivered / Cancelled ('' = not a bike line)
    public string DeliveryStatus { get; set; } = string.Empty;

    public string DeliveredDate { get; set; } = string.Empty;
}


//===============================================================
// The customer's active membership used for the discount
//===============================================================

public class SalesInvoiceMembershipDto
{
    public long MembershipId { get; set; }

    public string MembershipNo { get; set; } = string.Empty;

    public string CardName { get; set; } = string.Empty;

    // Discount % of the page's product line (SP : Spare Parts %)
    public decimal SpDiscountPercent { get; set; }

    public string DiscountLedgerCode { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string ExpiryDate { get; set; } = string.Empty;
}


//===============================================================
// Customer lookup by phone (and the walk-in answer)
//===============================================================

public class SalesInvoiceCustomerDto
{
    public bool Found { get; set; }

    public long CustomerId { get; set; }

    public string CustomerCode { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Phone { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    // Inbound / Outside
    public string CustomerType { get; set; } = string.Empty;

    public bool IsWalkIn { get; set; }

    // Inbound / Outside / Walk-in
    public string CustomerTag { get; set; } = string.Empty;

    // Corporate / Institution (Inbound) : may buy on a Corporate
    // sale (MB)
    public bool IsCorporate { get; set; }

    public bool IsActive { get; set; }

    public string ReceivableLedgerCode { get; set; } = string.Empty;

    // Receivable balance : + = Dr (the customer owes), - = Cr
    public decimal Balance { get; set; }

    // Dr / Cr / ''
    public string BalanceSide { get; set; } = string.Empty;

    // 0 = cash only
    public decimal CreditLimit { get; set; }

    public SalesInvoiceMembershipDto? Membership { get; set; }

    // Not found and Allow Walk-in Customers ON
    public bool CanAddWalkIn { get; set; }

    public string Message { get; set; } = string.Empty;
}


//===============================================================
// Add Customer (walk-in) : an Outside customer tagged Walk-in
//===============================================================

public class SalesInvoiceWalkInDto
{
    public string Name { get; set; } = string.Empty;

    public string Phone { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;
}


//===============================================================
// Product search (code / part no / name / barcode)
//===============================================================

public class SalesInvoiceProductDto
{
    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string PartNumber { get; set; } = string.Empty;

    public string PartName { get; set; } = string.Empty;

    // "<Part No> - <Part Name>"
    public string ProductName { get; set; } = string.Empty;

    // Spare Parts / Lubricants
    public string ProductType { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    // Saleable (MRP > 0) on hand in the warehouse
    public decimal OnHand { get; set; }

    // Lowest MRP of the saleable batches on hand (none : the
    // product's current MRP; 0 = not priced)
    public decimal Mrp { get; set; }

    // MRP of the newest saleable batch on hand
    public decimal LatestMrp { get; set; }

    public bool HasMixedMrp { get; set; }

    public int MrpCount { get; set; }

    // A barcode was scanned : its batch
    public long? ScannedBatchId { get; set; }

    public bool IsActive { get; set; }
}


//===============================================================
// The page's switches, resolved
//===============================================================

public class SalesInvoiceSwitchesDto
{
    // ON : Draft -> Approve -> Post ; OFF : saving posts at once
    public bool PostOnApproval { get; set; }

    public bool AllowCreditSale { get; set; }

    public bool EnforceCreditLimit { get; set; }

    public bool AllowPriceEdit { get; set; }

    // null = no limit
    public decimal? MaxPriceEditPercent { get; set; }

    public bool AllowDiscount { get; set; }

    // null = no limit
    public decimal? MaxDiscountPercent { get; set; }

    public bool BlockSaleBelowCost { get; set; }

    public bool AllowSaleWithoutStock { get; set; }

    public bool BackDatedSales { get; set; }

    public bool AllowCancelPosted { get; set; }

    // null = any time
    public int? CancelWithinDays { get; set; }

    public bool PrintAfterPosting { get; set; }

    public bool AllowWalkInCustomers { get; set; }

    public bool SellAtBatchMrp { get; set; }

    public bool RoundDownWholeTaka { get; set; }

    // MB : 0073 Allow Corporate Sale, with its window (0074 From /
    // 0075 Until, yyyy-MM-dd; '' = open)
    public bool AllowCorporateSale { get; set; }

    public string CorporateSaleFrom { get; set; } = string.Empty;

    public string CorporateSaleUntil { get; set; } = string.Empty;
}


//===============================================================
// Defaults (Add form)
//===============================================================

public class SalesInvoiceBranchDto
{
    public long BranchId { get; set; }

    public string BranchCode { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;
}


// Add Items filter : a category, or a sub category (ParentId
// = its category)
public class SalesInvoiceCategoryDto
{
    public long Id { get; set; }

    public long ParentId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
}


public class SalesInvoiceWarehouseDto
{
    public long WarehouseId { get; set; }

    public string WarehouseCode { get; set; } = string.Empty;

    public string WarehouseName { get; set; } = string.Empty;

    public bool IsDefault { get; set; }

    // Holds saleable stock of the page's products
    public bool HasStock { get; set; }
}


public class SalesInvoicePersonDto
{
    public long UserProfileId { get; set; }

    public string DisplayName { get; set; } = string.Empty;

    public string UserName { get; set; } = string.Empty;
}


//===============================================================
// Customer live search (counter) : one row per match
//===============================================================

public class SalesInvoiceCustomerSearchItemDto
{
    public long CustomerId { get; set; }

    public string CustomerCode { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public string Phone1 { get; set; } = string.Empty;

    public string Phone2 { get; set; } = string.Empty;

    // Inbound / Outside
    public string CustomerType { get; set; } = string.Empty;

    public bool IsWalkIn { get; set; }

    public bool IsCorporate { get; set; }

    // Phone 1 / Phone 2 / Name / Code : which field matched
    public string MatchedOn { get; set; } = string.Empty;
}

public class SalesInvoiceDefaultsDto
{
    public string PageType { get; set; } = string.Empty;

    // Preview only (nothing reserved; '' with Message when no
    // number can be given for the date)
    public string NextNumberPreview { get; set; } = string.Empty;

    // yyyy-MM-dd (business date)
    public string Today { get; set; } = string.Empty;

    // yyyy-MM-dd : the date the defaults were made for
    public string InvoiceDate { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public SalesInvoiceBranchDto Branch { get; set; } = new();

    public long FinancialYearId { get; set; }

    public string FinancialYearName { get; set; } = string.Empty;

    public string FinancialYearCode { get; set; } = string.Empty;

    public List<SalesInvoiceWarehouseDto> Warehouses { get; set; } = new();

    public long? DefaultWarehouseId { get; set; }

    // Business Configuration : the page's business line and
    // whether the branch runs it today (false : no warehouse,
    // the page blocks entry and shows BranchLineMessage)
    public string BusinessLine { get; set; } = string.Empty;

    // Branch Assignment : false = the user is not allotted to
    // the branch : no branch is loaded and the page is blocked
    public bool UserAllottedToBranch { get; set; }

    public bool BranchRunsLine { get; set; }

    public string BranchLineMessage { get; set; } = string.Empty;

    public List<SalesInvoicePersonDto> SalesPersons { get; set; } = new();

    public long DefaultSalesPersonId { get; set; }

    // Categories / sub categories holding the page's active products
    public List<SalesInvoiceCategoryDto> Categories { get; set; } = new();

    public List<SalesInvoiceCategoryDto> SubCategories { get; set; } = new();

    public SalesInvoiceSwitchesDto Switches { get; set; } = new();

    // Page activities of the user (set by the controller)
    public bool CanGiveSpecialDiscount { get; set; }

    public bool CanApprove { get; set; }

    public bool CanReturn { get; set; }

    public bool CanPost { get; set; }

    public bool CanCancel { get; set; }

    public bool CanPrint { get; set; }

    // Sales VAT Applicable on the date
    public bool VatApplicable { get; set; } = true;

    // yyyy-MM-dd of the change in force ('' = never changed)
    public string VatApplicableSince { get; set; } = string.Empty;

    public decimal? MaxPriceEditPercent { get; set; }

    public decimal? MaxDiscountPercent { get; set; }
}


//===============================================================
// Quote : the priced invoice (nothing saved)
//===============================================================

public class SalesInvoiceQuoteDto
{
    public List<SalesInvoiceLineDto> Lines { get; set; } = new();

    public decimal TotalQuantity { get; set; }

    public decimal GrossAmount { get; set; }

    public decimal CampaignDiscount { get; set; }

    public decimal MembershipDiscount { get; set; }

    // Campaign + membership
    public decimal CampaignMembershipDiscount { get; set; }

    public decimal SpecialDiscount { get; set; }

    public decimal FractionalDiscount { get; set; }

    public decimal InvoiceTotal { get; set; }

    public decimal TotalVatInside { get; set; }

    public decimal TotalBaseVat { get; set; }

    public decimal CostAmount { get; set; }

    public decimal PaidAmount { get; set; }

    public decimal DueAmount { get; set; }

    public bool VatApplicable { get; set; } = true;

    public SalesInvoiceMembershipDto? Membership { get; set; }

    // The customer's receivable before this invoice (+ = Dr)
    public decimal CustomerBalance { get; set; }

    public decimal CreditLimit { get; set; }

    public List<string> Warnings { get; set; } = new();

    // Anything here stops the save
    public List<string> Errors { get; set; } = new();

    public bool CanSave { get; set; }
}


//===============================================================
// A sales invoice (by id : header, lines, payments)
//===============================================================

public class SalesInvoiceDto
{
    public long SalesInvoiceId { get; set; }

    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; }

    public string PageType { get; set; } = string.Empty;

    public string InvoiceNo { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string InvoiceDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchCode { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public long FinancialYearId { get; set; }

    public long WarehouseId { get; set; }

    public string WarehouseName { get; set; } = string.Empty;

    public long? SalesPersonId { get; set; }

    public string SalesPersonName { get; set; } = string.Empty;

    public long CustomerId { get; set; }

    public string CustomerCode { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerPhone { get; set; } = string.Empty;

    public string CustomerAddress { get; set; } = string.Empty;

    public string CustomerType { get; set; } = string.Empty;

    public bool CustomerIsWalkIn { get; set; }

    public string CustomerTag { get; set; } = string.Empty;

    // MB : Regular / Corporate; others ''
    public string SaleType { get; set; } = string.Empty;

    public string ReceivableLedgerCode { get; set; } = string.Empty;

    public long? MembershipId { get; set; }

    public string MembershipNo { get; set; } = string.Empty;

    public string MembershipCardName { get; set; } = string.Empty;

    public decimal MembershipDiscountPercent { get; set; }

    public bool VatApplicable { get; set; }

    public string InvoiceSpecialType { get; set; } = "None";

    public decimal InvoiceSpecialValue { get; set; }

    public decimal TotalQuantity { get; set; }

    public decimal GrossAmount { get; set; }

    public decimal CampaignDiscount { get; set; }

    public decimal MembershipDiscount { get; set; }

    public decimal CampaignMembershipDiscount { get; set; }

    public decimal SpecialDiscount { get; set; }

    public decimal FractionalDiscount { get; set; }

    public decimal InvoiceTotal { get; set; }

    public decimal TotalVatInside { get; set; }

    public decimal TotalBaseVat { get; set; }

    public decimal CostAmount { get; set; }

    public decimal PaidAmount { get; set; }

    public decimal DueAmount { get; set; }

    public string Narration { get; set; } = string.Empty;

    // Draft / Approved / Posted / Cancelled
    public string Status { get; set; } = string.Empty;

    // The journal (posted under the invoice number)
    public string JournalNo { get; set; } = string.Empty;

    public long? ReceiptVoucherId { get; set; }

    public string ReceiptVoucherNo { get; set; } = string.Empty;

    public string CancelReason { get; set; } = string.Empty;

    public long CreatedBy { get; set; }

    public string CreatedByName { get; set; } = string.Empty;

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }

    public long? ApprovedBy { get; set; }

    public string ApprovedByName { get; set; } = string.Empty;

    public DateTime? ApprovedDate { get; set; }

    public long? PostedBy { get; set; }

    public string PostedByName { get; set; } = string.Empty;

    public DateTime? PostedDate { get; set; }

    public long? CancelledBy { get; set; }

    public string CancelledByName { get; set; } = string.Empty;

    public DateTime? CancelledDate { get; set; }

    public List<SalesInvoiceLineDto> Lines { get; set; } = new();

    // The Payment Desk rows saved (CheckStatus / ClearedVoucherNo
    // from the Receipt Voucher once posted)
    public List<ReceiptVoucherDebitDto> Payments { get; set; } = new();
}


//===============================================================
// List page : paged request
//---------------------------------------------------------------
// GET .../paged?page=1&pageSize=10&search=&sort=&dir=&tab=
//
// Tab  : all (default) / Draft / Approved / Posted / Cancelled.
// Sort : the list column fields; empty = newest first.
//===============================================================

public class SalesInvoicePageRequest : AppCore.Application.Common.Paging.PagedRequest
{
    public string? Tab { get; set; }
}


// One page of the list + the due total of the posted invoices
// that match (tab and search applied)
public class SalesInvoicePagedResult : AppCore.Application.Common.Paging.PagedResult<SalesInvoiceListItemDto>
{
    public decimal DueTotal { get; set; }
}


//===============================================================
// Sales Invoices - MB : a bike in stock in the warehouse, to pick
// model -> colour -> chassis
//   GET bike-units?warehouseId=3&invoiceId=12
//===============================================================

public class SalesInvoiceBikeUnitDto
{
    public long MotorBikeUnitId { get; set; }

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    // The model (sub category) and the colour
    public long ProductSubCategoryId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public string ColorName { get; set; } = string.Empty;

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    // From the purchase / receiving ('' = not kept)
    public string KeyNo { get; set; } = string.Empty;

    public string BatteryNo { get; set; } = string.Empty;

    public int? ManufactureYear { get; set; }

    // Yes / No
    public string CkdStatus { get; set; } = "No";

    // yyyy-MM-dd : oldest first (Oldest Chassis First)
    public string StockInDate { get; set; } = string.Empty;

    // Sale price of its batch (MRP)
    public decimal Mrp { get; set; }

    // On another open (draft / approved) invoice : its number
    public string OnInvoiceNo { get; set; } = string.Empty;

    // Picture of the model (/uploads/...) : the Motor Bike Shelf
    public string ImagePath { get; set; } = string.Empty;
}
