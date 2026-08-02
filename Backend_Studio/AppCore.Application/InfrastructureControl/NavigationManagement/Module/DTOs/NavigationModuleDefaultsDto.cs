//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.NavigationManagement.Module.DTOs;

//===============================================================
// Navigation Module Defaults DTO
//===============================================================

public class NavigationModuleDefaultsDto
{
    //===========================================================
    // Module Code
    //===========================================================

    public string Code { get; set; } =
        string.Empty;

    //===========================================================
    // Suggested Display Order
    //===========================================================

    public int DisplayOrder { get; set; }
}