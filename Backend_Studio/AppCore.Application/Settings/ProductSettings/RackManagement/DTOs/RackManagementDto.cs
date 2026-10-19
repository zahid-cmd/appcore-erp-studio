//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Rack Management DTO
//===============================================================

public class RackManagementDto
{
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
    // Rack
    //===========================================================

    public string RackCode { get; set; } = string.Empty;

    // "<Warehouse Code>-<Rack Code>", e.g. "WH-001-R-001"
    public string FullRackCode { get; set; } = string.Empty;

    public string RackName { get; set; } = string.Empty;

    public int ShelfCount { get; set; }

    public string ZoneAisle { get; set; } = string.Empty;

    public string RackType { get; set; } = string.Empty;

    // Spare parts placed on this rack (display only)
    public int PartsPlaced { get; set; }


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