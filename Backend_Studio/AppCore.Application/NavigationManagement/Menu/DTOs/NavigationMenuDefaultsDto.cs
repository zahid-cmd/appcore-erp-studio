//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.NavigationManagement.Menu.DTOs;

//===============================================================
// Navigation Menu Defaults DTO
//===============================================================

public class NavigationMenuDefaultsDto
{
    //===========================================================
    // Menu Code
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