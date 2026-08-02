//===============================================================
// Namespaces
//===============================================================

using AppCore.Domain.Common;
using AppCore.Domain.Entities.InfrastructureControl.NavigationManagement;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.InfrastructureControl.NavigationManagement;

//===============================================================
// Navigation Module
//===============================================================

public class NavigationModule : CodeMasterEntity
{
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
    // Navigation Properties
    //===============================================================

    public ICollection<NavigationMenu> Menus
    {
        get;
        set;
    } = new List<NavigationMenu>();

    public ICollection<NavigationActivity> Activities
    {
        get;
        set;
    } = new List<NavigationActivity>();
    
}