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

    public int BinNumber { get; set; }

    // SLF-A-03
    public string ShelfLabel { get; set; } = string.Empty;

    // A-03-05
    public string BinCode { get; set; } = string.Empty;

    // "WH-001: A-03-05"
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

    // 1 … the shelf's bins (0 / missing is read as 1)
    public int BinNumber { get; set; }
}