//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Create Rack Management DTO
//
// Rack Code and Branch are always set by the server.
//===============================================================

public class CreateRackManagementDto
{
    public long WarehouseId { get; set; }

    // Ignored : the server names racks "Rack A", "Rack B" …
    public string RackName { get; set; } = string.Empty;

    public int ShelfCount { get; set; }

    public string ZoneAisle { get; set; } = string.Empty;

    public string RackType { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}