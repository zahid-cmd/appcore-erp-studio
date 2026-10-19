//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Update Rack Management DTO
//
// Warehouse is locked after saving; it is sent back only to be
// checked against the saved value.
//===============================================================

public class UpdateRackManagementDto
{
    public long RackManagementId { get; set; }

    public long WarehouseId { get; set; }

    // Ignored : the server names racks "Rack A", "Rack B" …
    public string RackName { get; set; } = string.Empty;

    public int ShelfCount { get; set; }

    public string ZoneAisle { get; set; } = string.Empty;

    public string RackType { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}