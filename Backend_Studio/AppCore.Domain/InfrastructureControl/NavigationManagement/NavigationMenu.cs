//===============================================================
// Namespaces
//===============================================================

using AppCore.Domain.Common;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.InfrastructureControl.NavigationManagement;

//===============================================================
// Navigation Menu
//===============================================================

public class NavigationMenu : CodeMasterEntity
{
    //===============================================================
    // Foreign Key
    //===============================================================

    public long NavigationModuleId
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
    // Navigation Properties
    //===============================================================

    public NavigationModule NavigationModule
    {
        get;
        set;
    } = null!;

    public ICollection<NavigationSubmenu> Submenus
    {
        get;
        set;
    } = new List<NavigationSubmenu>();
}