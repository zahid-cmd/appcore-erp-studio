//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.InventoryStatus;


//===============================================================
// Inventory Status : the stock of one product type (MB / SP /
// AC), read from the stock movements (In − Out per batch and
// bucket) at the batches' exact cost.
//
//   In Transit : purchased (posted), not received yet
//   On Hand    : received into a warehouse
//
// Cost figures are 0 when the user lacks "View Cost" on the page
// (CanViewCost = false).
//===============================================================


//===============================================================
// List : one row per product + the filter options
//===============================================================

public class InventoryStockListDto
{
    // "View Cost incl. VAT" : the incl. VAT figures are sent
    public bool CanViewCostVat { get; set; }

    // MB / SP / AC
    public string PageType { get; set; } = string.Empty;

    public bool CanViewCost { get; set; }

    // 0 = all branches / all warehouses
    public long BranchId { get; set; }

    public long WarehouseId { get; set; }

    // yyyy-MM-dd (Bangladesh time)
    public string AsOf { get; set; } = string.Empty;

    public List<InventoryStockRowDto> Rows { get; set; } = new();

    public List<InventoryStockOptionDto> Branches { get; set; } = new();

    public List<InventoryStockWarehouseDto> Warehouses { get; set; } = new();
}


public class InventoryStockRowDto
{
    public long ProductId { get; set; }

    // Product image (Motor Bikes, Spare Parts; '' = none)
    public string ImagePath { get; set; } = string.Empty;

    // Cost incl. VAT : the batch cost plus the input VAT that was
    // claimed (taken out of the cost) at purchase; 0 without
    // "View Cost incl. VAT"
    public decimal AverageCostVat { get; set; }

    public decimal StockValueVat { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    // MB : model name ; SP / AC : "<part no> - <name>"
    public string ProductName { get; set; } = string.Empty;

    public string PartNumber { get; set; } = string.Empty;

    // Name without the part number
    public string ItemName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    // Motor Bikes / Spare Parts / Lubricants / Accessories
    public string ProductKind { get; set; } = string.Empty;

    public string CategoryName { get; set; } = string.Empty;

    public string SubCategoryName { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    // MB only
    public string ColorName { get; set; } = string.Empty;

    public int ReorderLevel { get; set; }

    public int RedLevel { get; set; }

    public int MaxStockLevel { get; set; }

    public bool IsActive { get; set; }

    public decimal InTransit { get; set; }

    public decimal OnHand { get; set; }

    public decimal Total { get; set; }

    public decimal AverageCost { get; set; }

    public decimal StockValue { get; set; }

    // Batches still holding stock
    public int BatchCount { get; set; }

    // yyyy-MM-dd of the latest movement ('' = none)
    public string LastMovementDate { get; set; } = string.Empty;

    // SP / AC : rack / shelf in the warehouse(s) of the filter
    public string Location { get; set; } = string.Empty;

    // In Stock / Low Stock / Critical / In Transit / Out of Stock
    public string StockStatus { get; set; } = string.Empty;
}


public class InventoryStockOptionDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
}


public class InventoryStockWarehouseDto
{
    public long Id { get; set; }

    public long BranchId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
}


//===============================================================
// Stock card : one product in detail
//===============================================================

public class InventoryStockCardDto
{
    public bool CanViewCost { get; set; }

    public InventoryStockRowDto Product { get; set; } = new();

    // Batches still holding stock, oldest first (sold first)
    public List<InventoryStockBatchDto> Batches { get; set; } = new();

    // Stock ledger, oldest first, with the running balance
    public List<InventoryStockMovementDto> Movements { get; set; } = new();

    // Where the stock is : branch / warehouse / bucket
    public List<InventoryStockPlaceDto> Places { get; set; } = new();

    // MB : the bikes of this model
    public List<InventoryBikeUnitDto> Bikes { get; set; } = new();
}


public class InventoryStockBatchDto
{
    public long StockBatchId { get; set; }

    public string BatchNo { get; set; } = string.Empty;

    // Purchase / Opening …
    public string SourceType { get; set; } = string.Empty;

    public string SourceNo { get; set; } = string.Empty;

    public string SourceDate { get; set; } = string.Empty;

    public string SupplierCode { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    // Received with the batch (quantity + free)
    public decimal Quantity { get; set; }

    public decimal UnitCost { get; set; }

    public decimal InTransit { get; set; }

    public decimal OnHand { get; set; }

    public decimal Value { get; set; }

    public int AgeDays { get; set; }
}


public class InventoryStockMovementDto
{
    public long StockMovementId { get; set; }

    public string DocumentDate { get; set; } = string.Empty;

    // Purchase / PurchaseCancel / Receive / Transfer / Sale …
    public string MovementType { get; set; } = string.Empty;

    // PIMB / PISP …
    public string DocumentType { get; set; } = string.Empty;

    public string DocumentNo { get; set; } = string.Empty;

    public string BatchNo { get; set; } = string.Empty;

    // In Transit / On Hand
    public string Bucket { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public string WarehouseName { get; set; } = string.Empty;

    public decimal QuantityIn { get; set; }

    public decimal QuantityOut { get; set; }

    // Product balance after this movement (both buckets)
    public decimal Balance { get; set; }

    public decimal UnitCost { get; set; }

    public decimal Value { get; set; }

    public bool IsReversal { get; set; }

    public string Narration { get; set; } = string.Empty;
}


public class InventoryStockPlaceDto
{
    public string BranchName { get; set; } = string.Empty;

    // '' for In Transit (not in a warehouse yet)
    public string WarehouseName { get; set; } = string.Empty;

    // In Transit / On Hand
    public string Bucket { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    public decimal Value { get; set; }

    // SP / AC : rack / shelf of the warehouse
    public string Location { get; set; } = string.Empty;
}


//===============================================================
// Motor bike units
//===============================================================

public class InventoryBikeListDto
{
    public bool CanViewCost { get; set; }

    // Edit Bike Numbers (switch CFG-MOD-012-0090 + "Update" on the
    // page) : the pencil on unsold bikes
    public bool CanEditNumbers { get; set; }

    // Edit Bike Numbers After Sale (CFG-MOD-012-0091) : sold bikes
    // too
    public bool CanEditSold { get; set; }

    // Key & Battery Required (CFG-MOD-007-0048) : Key / Battery No
    // asked in the editor
    public bool KeyBatteryOn { get; set; }

    public List<InventoryBikeUnitDto> Rows { get; set; } = new();
}


public class InventoryBikeUnitDto
{
    public long MotorBikeUnitId { get; set; }

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string KeyNo { get; set; } = string.Empty;

    public string BatteryNo { get; set; } = string.Empty;

    public string PurchaseNo { get; set; } = string.Empty;

    public string StockInDate { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    // In Transit / In Stock / Partly Received / <unit status>
    public string Status { get; set; } = string.Empty;

    public decimal UnitCost { get; set; }

    // Unit status Sold
    public bool IsSold { get; set; }

    // The motor bike's colour (Product Settings > Motor Bikes)
    public string ColorName { get; set; } = string.Empty;
}


//===============================================================
// Edit Bike Numbers (Motor Bike Stock > Technical Records)
//===============================================================

// Switches read once per list
public class InventoryBikeEditRulesDto
{
    public bool EditOn { get; set; }

    public bool EditSoldOn { get; set; }

    public bool KeyBatteryOn { get; set; }
}

// The four numbers of one bike (live check and save)
public class InventoryBikeNumbersDto
{
    public long MotorBikeUnitId { get; set; }

    public string? ChassisNo { get; set; }

    public string? EngineNo { get; set; }

    public string? KeyNo { get; set; }

    public string? BatteryNo { get; set; }
}

// A number another bike already carries
public class InventoryBikeNumberTakenDto
{
    // ChassisNo / EngineNo / KeyNo / BatteryNo
    public string Field { get; set; } = string.Empty;

    public string Value { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;
}


// One history line of the bike numbers (Motor Bike Stock History)
public class InventoryBikeHistoryDto
{
    public string ActivityType { get; set; } = string.Empty;

    public string ActivityTitle { get; set; } = string.Empty;

    public string ActivityDescription { get; set; } = string.Empty;

    public string PerformedByName { get; set; } = string.Empty;

    public DateTime PerformedDate { get; set; }
}
