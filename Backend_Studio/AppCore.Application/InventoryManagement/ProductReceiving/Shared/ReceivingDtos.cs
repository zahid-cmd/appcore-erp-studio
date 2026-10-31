//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.ProductReceiving;


//===============================================================
// Product Receiving DTOs : shared by Motor Bike / Spare Parts &
// Lubricants / Accessories Receiving. Dates are yyyy-MM-dd.
//===============================================================


//===============================================================
// Read : a receiving (list row; lines and bikes on GET by id)
//===============================================================

public class ReceivingDto
{
    public long ReceivingId { get; set; }

    public string PageType { get; set; } = string.Empty;

    public string ReceivingNo { get; set; } = string.Empty;

    public string ReceivingDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public long WarehouseId { get; set; }

    public string WarehouseName { get; set; } = string.Empty;

    public long PurchaseId { get; set; }

    public string PurchaseNo { get; set; } = string.Empty;

    public string PurchaseDate { get; set; } = string.Empty;

    public string SupplierCode { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;

    public string SupplierInvoiceNo { get; set; } = string.Empty;

    public string MushakNo { get; set; } = string.Empty;

    public string DoReference { get; set; } = string.Empty;

    public string GatePassNo { get; set; } = string.Empty;

    public string ReceivedBy { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public decimal TotalQuantity { get; set; }

    public int LineCount { get; set; }

    // Posted / Cancelled
    public string Status { get; set; } = string.Empty;

    public string CancelReason { get; set; } = string.Empty;

    public string CancelledDate { get; set; } = string.Empty;

    public string CreatedDate { get; set; } = string.Empty;

    public List<ReceivingLineDto> Lines { get; set; } = new();

    public List<ReceivingUnitDto> Units { get; set; } = new();
}


public class ReceivingLineDto
{
    public long ReceivingLineId { get; set; }

    public int LineNo { get; set; }

    public long PurchaseLineId { get; set; }

    public long StockBatchId { get; set; }

    public string BatchNo { get; set; } = string.Empty;

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public decimal PurchasedQuantity { get; set; }

    public decimal ReceivedBefore { get; set; }

    public decimal Quantity { get; set; }

    public long? RackManagementId { get; set; }

    public string RackCode { get; set; } = string.Empty;

    public int ShelfNumber { get; set; }

    public string ShortNotes { get; set; } = string.Empty;
}


// One bike (MB) : entered on the receiving
public class ReceivingUnitDto
{
    public long PurchaseLineId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string KeyNo { get; set; } = string.Empty;

    public string BatteryNo { get; set; } = string.Empty;
}


//===============================================================
// Defaults : number preview, warehouses, racks, switches
//===============================================================

public class ReceivingDefaultsDto
{
    public string PageType { get; set; } = string.Empty;

    public string Today { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string FinancialYearName { get; set; } = string.Empty;

    public string NextNumber { get; set; } = string.Empty;

    // Back Dated Receiving : ON + Value days (0 = any day of the
    // open year); OFF = today only
    public bool BackDatedAllowed { get; set; }

    public int BackDatedDays { get; set; }

    // SP / AC : Rack · Shelf required on every line
    public bool ShelfRequired { get; set; }

    // MB : Key / Battery required; Key / Battery unique
    public bool UnitsRequired { get; set; }

    public bool UniqueKeyNo { get; set; }

    public bool UniqueBatteryNo { get; set; }

    public List<ReceivingWarehouseDto> Warehouses { get; set; } = new();

    public List<ReceivingRackDto> Racks { get; set; } = new();

    // Why the number / period could not be read (closed year …)
    public string Message { get; set; } = string.Empty;
}


public class ReceivingWarehouseDto
{
    public long Id { get; set; }

    public long BranchId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public bool IsDefault { get; set; }
}


public class ReceivingRackDto
{
    public long Id { get; set; }

    public long WarehouseId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public int ShelfCount { get; set; }
}


//===============================================================
// Purchases waiting to be received (posted, stock in transit)
//===============================================================

public class ReceivingPurchaseOptionDto
{
    public long PurchaseId { get; set; }

    public string PurchaseNo { get; set; } = string.Empty;

    public string PurchaseDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string SupplierCode { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;

    public string SupplierInvoiceNo { get; set; } = string.Empty;

    public string MushakNo { get; set; } = string.Empty;

    public string DoReference { get; set; } = string.Empty;

    public string GatePassNo { get; set; } = string.Empty;

    public decimal PurchasedQuantity { get; set; }

    public decimal PendingQuantity { get; set; }

    // Not Received / Partly Received
    public string ReceivingStatus { get; set; } = string.Empty;

    public List<ReceivingPurchaseLineDto> Lines { get; set; } = new();
}


public class ReceivingPurchaseLineDto
{
    public long PurchaseLineId { get; set; }

    public int LineNo { get; set; }

    public long StockBatchId { get; set; }

    public string BatchNo { get; set; } = string.Empty;

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public decimal PurchasedQuantity { get; set; }

    public decimal ReceivedBefore { get; set; }

    public decimal PendingQuantity { get; set; }

    // Default shelf of the product per warehouse (SP / AC)
    public List<ReceivingShelfDto> Shelves { get; set; } = new();
}


public class ReceivingShelfDto
{
    public long WarehouseId { get; set; }

    public long RackManagementId { get; set; }

    public int ShelfNumber { get; set; }
}


//===============================================================
// Create (posted on save)
//===============================================================

public class CreateReceivingDto
{
    public string PageType { get; set; } = string.Empty;

    public string ReceivingDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public long WarehouseId { get; set; }

    public long PurchaseId { get; set; }

    public string? ReceivedBy { get; set; }

    public string? Remarks { get; set; }

    public List<CreateReceivingLineDto> Lines { get; set; } = new();

    public List<ReceivingUnitDto> Units { get; set; } = new();
}


public class CreateReceivingLineDto
{
    public long PurchaseLineId { get; set; }

    public decimal Quantity { get; set; }

    public long? RackManagementId { get; set; }

    public int ShelfNumber { get; set; }

    // Save Rack · Shelf as the product's default in the warehouse
    public bool SaveAsDefault { get; set; }

    public string? ShortNotes { get; set; }
}


public class ReceivingSavedDto
{
    public long ReceivingId { get; set; }

    public string ReceivingNo { get; set; } = string.Empty;
}


public class CancelReceivingDto
{
    public string? Reason { get; set; }
}


//===============================================================
// Bike number check (live, MB)
//===============================================================

public class ReceivingUnitCheckDto
{
    public List<ReceivingUnitDto> Units { get; set; } = new();
}


public class ReceivingUnitTakenDto
{
    // Chassis / Engine / Key / Battery
    public string Field { get; set; } = string.Empty;

    public string Value { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;
}
