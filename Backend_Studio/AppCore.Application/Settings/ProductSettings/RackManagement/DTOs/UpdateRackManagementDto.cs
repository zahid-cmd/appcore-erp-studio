//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Update Rack Management DTO
//
// Warehouse is locked after saving; it is sent back only to be
// checked against the saved value. Same fields as Create.
//===============================================================

public class UpdateRackManagementDto
    : CreateRackManagementDto
{
    public long RackManagementId { get; set; }
}
