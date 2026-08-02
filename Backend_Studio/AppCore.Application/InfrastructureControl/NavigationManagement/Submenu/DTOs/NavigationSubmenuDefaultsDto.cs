//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.NavigationManagement.Submenu.DTOs;

//===============================================================
// Navigation Submenu Defaults DTO
//===============================================================

public class NavigationSubmenuDefaultsDto
{
    //===========================================================
    // Submenu Code
    //===========================================================

    public string Code
    {
        get;
        set;
    } = string.Empty;

    //===========================================================
    // Suggested Display Order
    //===========================================================

    public int DisplayOrder
    {
        get;
        set;
    }
}