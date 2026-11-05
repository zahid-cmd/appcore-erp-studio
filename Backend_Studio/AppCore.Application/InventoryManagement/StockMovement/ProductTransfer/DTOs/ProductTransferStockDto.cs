//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.StockMovement;


//===============================================================
// GET stock?type=&warehouseId= : the products with stock on hand
// in a warehouse, their batches (FIFO order : oldest first) and,
// for motor bikes, the bikes there
//===============================================================

public class ProductTransferStockProductDto
{
    public long ProductId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string PartNumber { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public long BrandId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    public long CategoryId { get; set; }

    public string CategoryName { get; set; } = string.Empty;

    // On hand in the warehouse (MB : the bikes listed)
    public decimal Available { get; set; }

    public List<ProductTransferStockBatchDto> Batches { get; set; } = new();

    // MB only
    public List<ProductTransferStockUnitDto> Units { get; set; } = new();
}


public class ProductTransferStockBatchDto
{
    public long StockBatchId { get; set; }

    public string BatchNo { get; set; } = string.Empty;

    // On hand in the warehouse
    public decimal Available { get; set; }

    public decimal UnitCost { get; set; }

    // VAT inclusive; 0 = not priced (may still transfer)
    public decimal Mrp { get; set; }

    // yyyy-MM-dd (purchase / opening date : the FIFO order)
    public string SourceDate { get; set; } = string.Empty;
}


public class ProductTransferStockUnitDto
{
    public long MotorBikeUnitId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    // Not kept on MotorBikeUnits : always ''
    public string Color { get; set; } = string.Empty;

    public long StockBatchId { get; set; }

    public string BatchNo { get; set; } = string.Empty;
}


//===============================================================
// GET places?type=&warehouseId=&productIds=1,2,3 : saved places
// of the products in a warehouse and its racks with free shelves
// (a shelf holds ONE spare part or accessory)
//===============================================================

public class ProductTransferPlacesDto
{
    public List<ProductTransferPlaceDto> Places { get; set; } = new();

    public List<ProductTransferRackDto> Racks { get; set; } = new();
}


public class ProductTransferPlaceDto
{
    public long ProductId { get; set; }

    public long RackId { get; set; }

    public string RackName { get; set; } = string.Empty;

    public int ShelfNo { get; set; }

    // SLF-A-03
    public string ShelfLabel { get; set; } = string.Empty;

    public int BinNo { get; set; }

    // A-03-05
    public string BinCode { get; set; } = string.Empty;
}


public class ProductTransferRackDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // "R-001 - Rack A" or "R-001 - Rack A (Full)" (no free bin)
    public string DisplayName { get; set; } = string.Empty;

    public string ZoneCode { get; set; } = string.Empty;

    public string ZoneName { get; set; } = string.Empty;

    public int ZonePriority { get; set; }

    // "General" / the assigned category (plan hint only)
    public string AssignmentText { get; set; } = string.Empty;

    public int ShelfCount { get; set; }

    public int TotalBins { get; set; }

    public int FreeBinCount { get; set; }

    // Shelf numbers with at least one free bin
    public List<int> FreeShelves { get; set; } = new();

    // No free bin
    public bool IsFull { get; set; }

    // Every shelf with its bins
    public List<ProductTransferShelfDto> Shelves { get; set; } = new();
}


public class ProductTransferShelfDto
{
    public int ShelfNo { get; set; }

    public string Label { get; set; } = string.Empty;

    public int BinCount { get; set; }

    public int FreeBins { get; set; }

    // At least one free bin
    public bool IsFree { get; set; }

    // Inside the rack's prime shelf range
    public bool IsPrime { get; set; }

    // The bins : number, code, holder
    public List<ProductTransferBinDto> Bins { get; set; } = new();

    // The first holder on the shelf (kept for older pages)

    // "Spare Part" / "Accessory" ('' = free)
    public string HeldByType { get; set; } = string.Empty;

    public long HeldById { get; set; }

    public string HeldByCode { get; set; } = string.Empty;

    public string HeldByName { get; set; } = string.Empty;
}


//===============================================================
// One bin of a shelf : free or held (one item per bin)
//===============================================================

public class ProductTransferBinDto
{
    public int BinNo { get; set; }

    // A-03-05 / BIN-A-03-05
    public string BinCode { get; set; } = string.Empty;

    public string BinLabel { get; set; } = string.Empty;

    public bool IsFree { get; set; }

    // "Spare Part" / "Accessory" ('' = free)
    public string HeldByType { get; set; } = string.Empty;

    public long HeldById { get; set; }

    public string HeldByCode { get; set; } = string.Empty;

    public string HeldByName { get; set; } = string.Empty;

    // The holder is a product of this page's type (HeldById = its
    // ProductId)
    public bool IsOwnType { get; set; }
}
