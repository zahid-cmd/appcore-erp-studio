//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.ProductSettings;


//===============================================================
// Accessory Locations
//
// Where an accessory is kept : one row per warehouse
// (Warehouse → Rack → Shelf number). Saved together with the
// accessory; the rows are replaced on every save.
// A shelf holds one item only (spare part OR accessory).
//===============================================================

public class AccessoryLocations
{
    public long AccessoryLocationId { get; set; }

    public long AccessoryId { get; set; }

    public long WarehouseId { get; set; }

    public long RackManagementId { get; set; }

    // 1 … the rack's ShelfCount (shown as SLF-A-01 …)
    public int ShelfNumber { get; set; }


    //===========================================================
    // Audit Information
    //===========================================================

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }
}