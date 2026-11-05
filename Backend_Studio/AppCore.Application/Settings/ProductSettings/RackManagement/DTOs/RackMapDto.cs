//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Rack Map : racks -> shelves -> bins with the item holding each
// bin. Built by BinOccupancy.GetRackMapAsync and used by Rack
// Management (form preview), the Spare Parts / Accessories
// location modal and every page that places products
// (Opening Stock, Receiving, Product Transfer, Mass Storing).
//===============================================================

public class RackMapDto
{
    public long RackManagementId { get; set; }

    public long WarehouseId { get; set; }

    public string WarehouseCode { get; set; } = string.Empty;

    // R-001
    public string RackCode { get; set; } = string.Empty;

    // WH-001-R-001
    public string FullRackCode { get; set; } = string.Empty;

    // Rack A
    public string RackName { get; set; } = string.Empty;

    // A
    public string RackLetter { get; set; } = string.Empty;

    public string RackType { get; set; } = string.Empty;

    public bool IsActive { get; set; }


    //===========================================================
    // Zone ('' / 0 when none)
    //===========================================================

    public long? RackZoneId { get; set; }

    public string ZoneCode { get; set; } = string.Empty;

    public string ZoneName { get; set; } = string.Empty;

    public int ZonePriority { get; set; }


    //===========================================================
    // Assignment (category null = General rack; no sub
    // categories = the whole category)
    //===========================================================

    public long? ProductCategoryId { get; set; }

    public string CategoryName { get; set; } = string.Empty;

    public string CategoryType { get; set; } = string.Empty;

    public List<long> SubCategoryIds { get; set; } = new();

    public bool IsGeneral { get; set; } = true;

    public string AssignmentText { get; set; } = string.Empty;

    public int? PrimeShelfFrom { get; set; }

    public int? PrimeShelfTo { get; set; }


    //===========================================================
    // Shelves & Bins
    //===========================================================

    public int ShelfCount { get; set; }

    public int TotalBins { get; set; }

    public int FreeBins { get; set; }

    public List<RackMapShelfDto> Shelves { get; set; } = new();
}


//===============================================================
// One shelf of the map
//===============================================================

public class RackMapShelfDto
{
    public int ShelfNumber { get; set; }

    // SLF-A-03
    public string ShelfLabel { get; set; } = string.Empty;

    public int BinCount { get; set; }

    // Inside PrimeShelfFrom … PrimeShelfTo
    public bool IsPrime { get; set; }

    public int FreeBins { get; set; }

    public List<RackMapBinDto> Bins { get; set; } = new();
}


//===============================================================
// One bin of the map
//===============================================================

public class RackMapBinDto
{
    public int BinNumber { get; set; }

    // A-03-05
    public string BinCode { get; set; } = string.Empty;

    // BIN-A-03-05
    public string BinLabel { get; set; } = string.Empty;

    // No holder, or the holder is the item being edited (IsOwn)
    public bool IsFree { get; set; }

    // Held by the item being edited (excluded item)
    public bool IsOwn { get; set; }

    // null when the bin is empty
    public BinHolderDto? Holder { get; set; }
}


//===============================================================
// The item holding a bin (live spare part or accessory)
//===============================================================

public class BinHolderDto
{
    public long RackManagementId { get; set; }

    public long WarehouseId { get; set; }

    public int ShelfNumber { get; set; }

    public int BinNumber { get; set; }

    // "Spare Part" / "Accessory"
    public string ItemType { get; set; } = string.Empty;

    // SparePartId / AccessoryId
    public long ItemId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    // Part name / accessory name
    public string ItemName { get; set; } = string.Empty;
}
