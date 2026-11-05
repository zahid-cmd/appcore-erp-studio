//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Rack Management DTO
//===============================================================

public class RackManagementDto
{
    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; }

    public long RackManagementId { get; set; }


    //===========================================================
    // Location
    //===========================================================

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public long WarehouseId { get; set; }

    public string WarehouseCode { get; set; } = string.Empty;

    public string WarehouseName { get; set; } = string.Empty;


    //===========================================================
    // Zone
    //===========================================================

    public long? RackZoneId { get; set; }

    public string ZoneCode { get; set; } = string.Empty;

    public string ZoneName { get; set; } = string.Empty;

    public int ZonePriority { get; set; }


    //===========================================================
    // Rack
    //===========================================================

    public string RackCode { get; set; } = string.Empty;

    // "<Warehouse Code>-<Rack Code>", e.g. "WH-001-R-001"
    public string FullRackCode { get; set; } = string.Empty;

    public string RackName { get; set; } = string.Empty;

    // "Rack A" -> "A"
    public string RackLetter { get; set; } = string.Empty;

    public int ShelfCount { get; set; }

    // Legacy text (replaced by the Zone; not shown)
    public string ZoneAisle { get; set; } = string.Empty;

    public string RackType { get; set; } = string.Empty;


    //===========================================================
    // Shelves & Bins
    //===========================================================

    public List<RackShelfDto> Shelves { get; set; } = new();

    public int TotalBins { get; set; }

    // Spare parts + accessories placed on this rack (Items)
    public int PartsPlaced { get; set; }


    //===========================================================
    // Assignment (category null = General rack)
    //===========================================================

    public long? ProductCategoryId { get; set; }

    public string CategoryCode { get; set; } = string.Empty;

    public string CategoryName { get; set; } = string.Empty;

    public string CategoryType { get; set; } = string.Empty;

    public List<long> SubCategoryIds { get; set; } = new();

    public List<RackSubCategoryDto> SubCategories { get; set; } = new();

    public bool IsGeneral { get; set; } = true;

    // "General" / "<Category>" / "<Category> (n sub categories)"
    public string AssignmentText { get; set; } = string.Empty;

    public int? PrimeShelfFrom { get; set; }

    public int? PrimeShelfTo { get; set; }


    //===========================================================
    // Description / Status
    //===========================================================

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; }


    //===========================================================
    // Soft Delete
    //===========================================================

    public bool IsDeleted { get; set; }

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
// One shelf of a rack (read)
//===============================================================

public class RackShelfDto
{
    public int ShelfNumber { get; set; }

    // SLF-A-03
    public string ShelfLabel { get; set; } = string.Empty;

    public int BinCount { get; set; }

    public bool IsPrime { get; set; }
}


//===============================================================
// One sub category a rack is assigned to (read)
//===============================================================

public class RackSubCategoryDto
{
    public long ProductSubCategoryId { get; set; }

    public string SubCategoryCode { get; set; } = string.Empty;

    public string SubCategoryName { get; set; } = string.Empty;
}
