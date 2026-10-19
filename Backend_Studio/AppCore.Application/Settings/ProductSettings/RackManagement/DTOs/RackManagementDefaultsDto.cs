//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Rack Management Defaults DTO
//
// Next rack code and name for a warehouse ('' when none is
// chosen yet).
//===============================================================

public class RackManagementDefaultsDto
{
    // "R-001"
    public string Code { get; set; } = string.Empty;

    // "<Warehouse Code>-R-001"
    public string FullCode { get; set; } = string.Empty;


    // "Rack A" : the lowest letter not used by a live rack of the
    // warehouse (a deleted rack's letter is reused)
    public string Name { get; set; } = string.Empty;
}