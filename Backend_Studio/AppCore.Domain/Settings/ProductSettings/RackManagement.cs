//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.ProductSettings;


//===============================================================
// Rack Management
//
// One Rack inside one Warehouse (and one Zone of it), with a
// number of shelves; every shelf has a number of bins
// (RackShelves). The BIN is the location : one bin holds ONE
// item (spare part OR accessory). Locations store the shelf and
// bin numbers.
//
// Rack Name : "Rack A", "Rack B" … built by the server; the lowest
//             letter not used by a live rack of the warehouse, so
//             a deleted rack's letter is reused. After Z : AA, AB …
// Shelves   : shown as SLF-<letter>-nn, e.g. SLF-A-01 … SLF-A-05.
// Bins      : shown as <letter>-<shelf>-<bin>, e.g. A-03-05
//             (RackLabels builds every label).
//
// Rack Code : R-nnn, numbered per warehouse (deleted rows count,
//             never reused). Shown in full as
//             "<Warehouse Code>-R-001".
//===============================================================

public class RackManagement
{
    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    //===========================================================
    // Primary Key
    //===========================================================

    public long RackManagementId { get; set; }


    //===========================================================
    // Location (Warehouse locked after saving)
    //===========================================================

    // Copied from the warehouse for filtering
    public long BranchId { get; set; }

    public long WarehouseId { get; set; }


    //===========================================================
    // Rack
    //===========================================================

    public string RackCode { get; set; } = string.Empty;

    public string RackName { get; set; } = string.Empty;

    public int ShelfCount { get; set; }


    //===========================================================
    // Zone (RackZones of the same warehouse). Required on save
    // when the warehouse has at least one active zone.
    //===========================================================

    public long? RackZoneId { get; set; }


    //===========================================================
    // Assignment : the allocation plan (Stage 2) and a hint on
    // screens; it never blocks manual placement.
    //
    // ProductCategoryId NULL = General rack. Sub categories in
    // RackSubCategories (none = the whole category).
    //===========================================================

    public long? ProductCategoryId { get; set; }

    // Prime shelves (nearest to hand) : both or none,
    // 1 <= From <= To <= ShelfCount
    public int? PrimeShelfFrom { get; set; }

    public int? PrimeShelfTo { get; set; }


    //===========================================================
    // Location Details (optional)
    //===========================================================

    // Legacy free text (replaced by the Zone; kept, not shown)
    public string ZoneAisle { get; set; } = string.Empty;

    // Open Shelf / Closed Cabinet / Bin Rack / Pallet Rack
    public string RackType { get; set; } = string.Empty;


    //===========================================================
    // Description / Status
    //===========================================================

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; }


    //===========================================================
    // Soft Delete
    //===========================================================

    public bool IsDeleted { get; set; } = false;

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }


    //===========================================================
    // Audit Information
    //===========================================================

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


//===============================================================
// Rack Shelves : one row per shelf of a rack (1 … ShelfCount),
// created / trimmed when the rack is saved.
//
// BinCount : 1 … 60 bins on the shelf.
//===============================================================

public class RackShelves
{
    public long RackShelfId { get; set; }

    public long RackManagementId { get; set; }

    public int ShelfNumber { get; set; }

    public int BinCount { get; set; } = 1;
}


//===============================================================
// Rack Sub Categories : the sub categories a rack is assigned
// to (all of the rack's category). No rows = the whole category.
//===============================================================

public class RackSubCategories
{
    public long RackSubCategoryId { get; set; }

    public long RackManagementId { get; set; }

    public long ProductSubCategoryId { get; set; }
}
