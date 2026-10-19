//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Spare Part Location (read)
//===============================================================

public class SparePartLocationDto
{
    public long WarehouseId { get; set; }

    public string WarehouseCode { get; set; } = string.Empty;

    public string WarehouseName { get; set; } = string.Empty;

    public long RackManagementId { get; set; }

    public string RackCode { get; set; } = string.Empty;

    public string RackName { get; set; } = string.Empty;

    public int ShelfNumber { get; set; }

    // "WH-001: R-001 / S-03"
    public string LocationText { get; set; } = string.Empty;
}


//===============================================================
// Spare Part Location (create / update)
//===============================================================

public class SparePartLocationInputDto
{
    public long WarehouseId { get; set; }

    public long RackManagementId { get; set; }

    public int ShelfNumber { get; set; }
}