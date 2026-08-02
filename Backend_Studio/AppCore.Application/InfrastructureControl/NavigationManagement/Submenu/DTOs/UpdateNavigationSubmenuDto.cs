//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.NavigationManagement.Submenu.DTOs;

//===============================================================
// Update Navigation Submenu DTO
//===============================================================

public class UpdateNavigationSubmenuDto
{
    //===============================================================
    // Primary Key
    //===============================================================

    public long Id
    {
        get;
        set;
    }

    //===============================================================
    // Foreign Key
    //===============================================================

    public long NavigationMenuId
    {
        get;
        set;
    }

    //===============================================================
    // Basic Information
    //===============================================================

    public string Name
    {
        get;
        set;
    } = string.Empty;

    public string Icon
    {
        get;
        set;
    } = string.Empty;

    //===============================================================
    // Route Information
    //===============================================================

    public string RouteKey
    {
        get;
        set;
    } = string.Empty;

    public int DisplayOrder
    {
        get;
        set;
    }

    public string? Remarks
    {
        get;
        set;
    }

    //===============================================================
    // Status
    //===============================================================

    public bool IsActive
    {
        get;
        set;
    }
}