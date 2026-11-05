//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.ProductSettings;


//===============================================================
// Rack Zones
//
// A zone groups the racks of one warehouse
// (Warehouse -> Zone -> Rack -> Shelf -> Bin). Managed inside
// Rack Management (Zones tab).
//
// Zone Code : Z-nn, numbered per warehouse (deleted rows count,
//             never reused).
// Zone Name : typed, unique per warehouse ignoring case.
// Priority  : 1 = nearest the counter; used by allocation
//             (Stage 2).
//===============================================================

public class RackZones
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long RackZoneId { get; set; }


    //===========================================================
    // Location (Warehouse locked after saving)
    //===========================================================

    // Copied from the warehouse for filtering
    public long BranchId { get; set; }

    public long WarehouseId { get; set; }


    //===========================================================
    // Zone
    //===========================================================

    public string ZoneCode { get; set; } = string.Empty;

    public string ZoneName { get; set; } = string.Empty;

    public int Priority { get; set; } = 1;


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
