//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.StockMovement;


//===============================================================
// GET products?type=&warehouseId=&includeNoStock= : grid rows
// (products with stock on hand in the warehouse, or every live
// product of the type) with their current place there
//===============================================================

public class MassStoringProductDto
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

    // On hand in the warehouse (0 = no stock)
    public decimal Stock { get; set; }

    public long SubCategoryId { get; set; }

    public string SubCategoryName { get; set; } = string.Empty;

    // Stored value : SuperFast / Fast / Regular / Periodic / Slow
    public string MovementClass { get; set; } = string.Empty;

    // 1 fastest .. 5 slow
    public int MovementRank { get; set; }

    // Current place in the warehouse (null = Unplaced)
    public long? RackId { get; set; }

    public string RackCode { get; set; } = string.Empty;

    public string RackName { get; set; } = string.Empty;

    public int? ShelfNo { get; set; }

    public string ShelfLabel { get; set; } = string.Empty;

    public int? BinNo { get; set; }

    // A-03-05
    public string BinCode { get; set; } = string.Empty;

    // "Rack A · A-03-05" ('' = Unplaced)
    public string Location { get; set; } = string.Empty;

    public bool IsPlaced { get; set; }
}


//===============================================================
// GET places?type=&warehouseId= : saved places and the racks
// with their shelves (Product Transfer's shape)
//===============================================================

public class MassStoringPlacesDto
{
    public List<MassStoringPlaceDto> Places { get; set; } = new();

    public List<MassStoringRackDto> Racks { get; set; } = new();
}


public class MassStoringPlaceDto
{
    public long ProductId { get; set; }

    public long RackId { get; set; }

    public string RackName { get; set; } = string.Empty;

    public int ShelfNo { get; set; }

    public string ShelfLabel { get; set; } = string.Empty;

    public int BinNo { get; set; }

    public string BinCode { get; set; } = string.Empty;
}


public class MassStoringRackDto
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

    public List<MassStoringShelfDto> Shelves { get; set; } = new();

    // Assignment (plan hint; null category = General rack)
    public long? ProductCategoryId { get; set; }

    public string CategoryName { get; set; } = string.Empty;

    // Empty = the whole category
    public List<long> SubCategoryIds { get; set; } = new();

    public List<string> SubCategoryNames { get; set; } = new();

    public bool IsGeneral { get; set; }

    public int? PrimeShelfFrom { get; set; }

    public int? PrimeShelfTo { get; set; }

    // "A"
    public string RackLetter { get; set; } = string.Empty;

    public bool IsActive { get; set; }
}


public class MassStoringShelfDto
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
    public List<MassStoringBinDto> Bins { get; set; } = new();

    // The first holder on the shelf (kept for older pages)

    // "Spare Part" / "Accessory" ('' = free)
    public string HeldByType { get; set; } = string.Empty;

    public long HeldById { get; set; }

    public string HeldByCode { get; set; } = string.Empty;

    public string HeldByName { get; set; } = string.Empty;

    // The holder is a product of this page's type (HeldById is
    // then its ProductId : it can be moved / cleared by a Mass
    // Storing of this type). False for the other type's items.
    public bool IsOwnType { get; set; }
}


//===============================================================
// One bin of a shelf : free or held (one item per bin)
//===============================================================

public class MassStoringBinDto
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
    // ProductId : it may be moved / cleared by this document)
    public bool IsOwnType { get; set; }

    // The holder's sub category, movement class (stored value),
    // part number and stock on hand in this warehouse (0 = none)
    public long HeldBySubCategoryId { get; set; }

    public string HeldBySubCategoryName { get; set; } = string.Empty;

    public string HeldByMovementClass { get; set; } = string.Empty;

    public string HeldByPartNumber { get; set; } = string.Empty;

    public decimal HeldByStock { get; set; }
}
