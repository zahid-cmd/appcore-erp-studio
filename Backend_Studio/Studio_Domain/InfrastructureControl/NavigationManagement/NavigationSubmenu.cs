//===============================================================
// Namespaces
//===============================================================

using AppCore.Domain.Common;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.InfrastructureControl.NavigationManagement;

//===============================================================
// Navigation Submenu
//===============================================================

public class NavigationSubmenu : CodeMasterEntity
{
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

    public string Route
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
    // Navigation Property
    //===============================================================

    public NavigationMenu Menu
    {
        get;
        set;
    } = null!;
}