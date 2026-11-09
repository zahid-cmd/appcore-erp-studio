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
    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; }

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

    // MB : free accessories received on it
    public List<ReceivingAccessoryLineDto> Accessories { get; set; } = new();
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

    // 0 = no place
    public int BinNumber { get; set; }

    // SLF-A-03 / A-03-05 ('' = no place)
    public string ShelfLabel { get; set; } = string.Empty;

    public string BinCode { get; set; } = string.Empty;

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

    // CKD documents in hand / on the portal : Yes / No
    public string CkdStatus { get; set; } = "No";

    // Year of manufacture (0 / null = the purchase invoice's year)
    public int? ManufactureYear { get; set; }
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

    public string ZoneCode { get; set; } = string.Empty;

    public string ZoneName { get; set; } = string.Empty;

    // Bins per shelf (free / held : rack-management/bins)
    public List<ReceivingRackShelfDto> Shelves { get; set; } = new();
}


public class ReceivingRackShelfDto
{
    public int ShelfNumber { get; set; }

    public string ShelfLabel { get; set; } = string.Empty;

    public int BinCount { get; set; }
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

    // MB : free accessories still due from the supplier
    public decimal AccessoryPendingQuantity { get; set; }

    public List<ReceivingAccessoryDueDto> Accessories { get; set; } = new();
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

    public int BinNumber { get; set; }

    // A-03-05
    public string BinCode { get; set; } = string.Empty;
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

    // MB : free accessories received now
    public List<CreateReceivingAccessoryDto> Accessories { get; set; } = new();
}


public class CreateReceivingLineDto
{
    public long PurchaseLineId { get; set; }

    public decimal Quantity { get; set; }

    public long? RackManagementId { get; set; }

    public int ShelfNumber { get; set; }

    // Bin on that shelf (0 with a rack and shelf = bin 1)
    public int BinNumber { get; set; }

    // Save Rack · Shelf · Bin as the product's default in the warehouse
    public bool SaveAsDefault { get; set; }

    public string? ShortNotes { get; set; }
}


public class ReceivingSavedDto
{
    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; }

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


//===============================================================
// Product Receiving list : paged list request
//---------------------------------------------------------------
// GET .../paged?page=1&pageSize=10&search=&sort=&dir=&tab=
//
// Tab  : all (default) / posted / cancelled.
// Sort : the list column fields; empty = newest first.
//===============================================================

public class ReceivingPageRequest : AppCore.Application.Common.Paging.PagedRequest
{
    public string? Tab { get; set; }
}
