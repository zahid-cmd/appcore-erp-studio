//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Create Rack Management DTO
//
// Rack Code, Rack Name and Branch are always set by the server.
//===============================================================

public class CreateRackManagementDto
{
    public long WarehouseId { get; set; }

    // Ignored : the server names racks "Rack A", "Rack B" …
    public string RackName { get; set; } = string.Empty;

    public int ShelfCount { get; set; }


    //===========================================================
    // Bins : per shelf (1 … 60). A shelf missing from Shelves
    // gets BinsPerShelf.
    //===========================================================

    public int BinsPerShelf { get; set; } = 1;

    public List<RackShelfInputDto> Shelves { get; set; } = new();


    //===========================================================
    // Zone (null / 0 = none; required when the warehouse has an
    // active zone)
    //===========================================================

    public long? RackZoneId { get; set; }


    //===========================================================
    // Assignment : category null / 0 = General rack; no sub
    // categories = the whole category
    //===========================================================

    public long? ProductCategoryId { get; set; }

    public List<long> SubCategoryIds { get; set; } = new();

    // Both or none (null / 0 = none)
    public int? PrimeShelfFrom { get; set; }

    public int? PrimeShelfTo { get; set; }


    //===========================================================
    // Location Details / Status
    //===========================================================

    // Legacy text (replaced by the Zone). null keeps the saved value.
    public string? ZoneAisle { get; set; }

    public string RackType { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}


//===============================================================
// One shelf of a rack (create / update)
//===============================================================

public class RackShelfInputDto
{
    public int ShelfNumber { get; set; }

    public int BinCount { get; set; } = 1;
}
