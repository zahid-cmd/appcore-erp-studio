//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.ProductSettings;


//===============================================================
// Rack Management
//
// One Rack inside one Warehouse, with a number of shelves.
// Shelves have no record of their own; spare part locations store
// the shelf number.
//
// Rack Name : "Rack A", "Rack B" … built by the server; the lowest
//             letter not used by a live rack of the warehouse, so
//             a deleted rack's letter is reused. After Z : AA, AB …
// Shelves   : shown as SLF-<letter>-nn, e.g. SLF-A-01 … SLF-A-05.
//
// Rack Code : R-nnn, numbered per warehouse (deleted rows count,
//             never reused). Shown in full as
//             "<Warehouse Code>-R-001".
//===============================================================

public class RackManagement
{
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
    // Location Details (optional)
    //===========================================================

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