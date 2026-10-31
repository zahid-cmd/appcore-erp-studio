//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.ProductLedgers;


//===============================================================
// Product Ledgers : the stock history of one product type
// (MB / SP / AC), read from the stock movements.
//
//   Statement : one product : opening, one row per document
//               (In / Out / running Balance), closing
//   Summary   : one row per product : Opening · In · Out · Closing
//
// Quantity = In Transit + On Hand (the warehouse filter keeps
// In Transit, like the stock pages). Values are the batches'
// own costs : what goes out is valued at the cost of the batch
// it came from, oldest batch first (FIFO).
//
// Values are 0 when the user lacks "View Cost" on the page
// (CanViewCost = false).
//===============================================================


//===============================================================
// Filter lists
//===============================================================

public class ProductLedgerFiltersDto
{
    // MB / SP / AC
    public string PageType { get; set; } = string.Empty;

    public bool CanViewCost { get; set; }

    public List<ProductLedgerOptionDto> Branches { get; set; } = new();

    public List<ProductLedgerWarehouseDto> Warehouses { get; set; } = new();

    public List<ProductLedgerCategoryDto> Categories { get; set; } = new();

    public List<ProductLedgerSubCategoryDto> SubCategories { get; set; } = new();

    public List<ProductLedgerProductDto> Products { get; set; } = new();
}


public class ProductLedgerOptionDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
}


public class ProductLedgerWarehouseDto
{
    public long Id { get; set; }

    public long BranchId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
}


public class ProductLedgerCategoryDto
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    // Motor Bikes / Spare Parts / Lubricants / Accessories
    public string Kind { get; set; } = string.Empty;
}


public class ProductLedgerSubCategoryDto
{
    public long Id { get; set; }

    public long CategoryId { get; set; }

    public string Name { get; set; } = string.Empty;
}


public class ProductLedgerProductDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    // MB : model name ; SP / AC : "<part no> - <name>"
    public string Name { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public string Kind { get; set; } = string.Empty;

    public long CategoryId { get; set; }

    public long SubCategoryId { get; set; }

    public bool IsActive { get; set; }
}


//===============================================================
// Statement : one product
//===============================================================

public class ProductLedgerStatementDto
{
    public string PageType { get; set; } = string.Empty;

    public bool CanViewCost { get; set; }

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public string Kind { get; set; } = string.Empty;

    public string CategoryName { get; set; } = string.Empty;

    public string SubCategoryName { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public string ColorName { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string From { get; set; } = string.Empty;

    public string To { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public long WarehouseId { get; set; }

    public string WarehouseName { get; set; } = string.Empty;

    public bool ShowCancelled { get; set; }

    public decimal OpeningQty { get; set; }

    public decimal OpeningValue { get; set; }

    public decimal InQty { get; set; }

    public decimal InValue { get; set; }

    public decimal OutQty { get; set; }

    public decimal OutValue { get; set; }

    public decimal ClosingQty { get; set; }

    public decimal ClosingValue { get; set; }

    // In Transit (purchased, not yet received into a warehouse) :
    // before and after the period. Opening / Closing / balances =
    // stock (In Transit + On Hand); In / Out = into / out of the
    // warehouses.
    public decimal OpeningTransit { get; set; }

    public decimal ClosingTransit { get; set; }

    // More rows than listed (totals cover the whole period)
    public bool Truncated { get; set; }

    public List<ProductLedgerRowDto> Rows { get; set; } = new();
}


// One document (its movements of this product, netted)
public class ProductLedgerRowDto
{
    // yyyy-MM-dd
    public string Date { get; set; } = string.Empty;

    // Purchase / PurchaseCancel / …
    public string MovementType { get; set; } = string.Empty;

    // PIMB / PISP / PIAC …
    public string DocumentType { get; set; } = string.Empty;

    public string DocumentNo { get; set; } = string.Empty;

    // "Purchase – Runner Automobiles PLC"
    public string Particulars { get; set; } = string.Empty;

    public string PartyName { get; set; } = string.Empty;

    // Batch no(s) of the movements
    public string Batches { get; set; } = string.Empty;

    // "Uttara MB Showroom · Main Store" / "In Transit"
    public string Location { get; set; } = string.Empty;

    public bool IsReversal { get; set; }

    // The purchase was cancelled later (shown on request)
    public bool IsCancelled { get; set; }

    // Stock moved between warehouses of the branch : nothing in
    // or out of the total
    public bool IsTransfer { get; set; }

    // In Transit : this row's change (+ purchased, - received into
    // a warehouse) and the running in-transit balance after it
    public decimal TransitQty { get; set; }

    public decimal TransitBalance { get; set; }

    public decimal InQty { get; set; }

    public decimal OutQty { get; set; }

    public decimal BalanceQty { get; set; }

    public decimal UnitCost { get; set; }

    public decimal InValue { get; set; }

    public decimal OutValue { get; set; }

    public decimal BalanceValue { get; set; }

    public string ShortNote { get; set; } = string.Empty;

    // MB : the bikes of the row (chassis / engine)
    public List<ProductLedgerBikeDto> Bikes { get; set; } = new();
}


public class ProductLedgerBikeDto
{
    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;
}


//===============================================================
// Summary : one row per product
//===============================================================

public class ProductLedgerSummaryDto
{
    public string PageType { get; set; } = string.Empty;

    public bool CanViewCost { get; set; }

    // "Spare Parts › Yadea Spare Parts › Battery" / "All Products"
    public string ScopePath { get; set; } = string.Empty;

    public string Kind { get; set; } = string.Empty;

    public long CategoryId { get; set; }

    public long SubCategoryId { get; set; }

    public string From { get; set; } = string.Empty;

    public string To { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public long WarehouseId { get; set; }

    public string WarehouseName { get; set; } = string.Empty;

    public bool ShowCancelled { get; set; }

    public decimal OpeningQty { get; set; }

    public decimal OpeningValue { get; set; }

    public decimal InQty { get; set; }

    public decimal InValue { get; set; }

    public decimal OutQty { get; set; }

    public decimal OutValue { get; set; }

    public decimal ClosingQty { get; set; }

    public decimal ClosingValue { get; set; }

    // In Transit at the end of the period (part of Closing)
    public decimal ClosingTransit { get; set; }

    public List<ProductLedgerSummaryRowDto> Rows { get; set; } = new();
}


public class ProductLedgerSummaryRowDto
{
    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public string CategoryName { get; set; } = string.Empty;

    public string SubCategoryName { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public decimal OpeningQty { get; set; }

    public decimal OpeningValue { get; set; }

    public decimal InQty { get; set; }

    public decimal InValue { get; set; }

    public decimal OutQty { get; set; }

    public decimal OutValue { get; set; }

    public decimal ClosingQty { get; set; }

    public decimal ClosingValue { get; set; }

    // In Transit at the end of the period
    public decimal ClosingTransit { get; set; }
}
