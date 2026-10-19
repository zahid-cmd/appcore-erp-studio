//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.ProductSettings;


//===============================================================
// Spare Part Locations
//
// Where a spare part is kept : one row per warehouse
// (Warehouse → Rack → Shelf number). Saved together with the
// spare part; the rows are replaced on every save.
//===============================================================

public class SparePartLocations
{
    public long SparePartLocationId { get; set; }

    public long SparePartId { get; set; }

    public long WarehouseId { get; set; }

    public long RackManagementId { get; set; }

    // 1 … the rack's ShelfCount (shown as S-01 …)
    public int ShelfNumber { get; set; }


    //===========================================================
    // Audit Information
    //===========================================================

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }
}