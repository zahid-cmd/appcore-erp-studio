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
    // The id used in links and API calls (uuid v7)
    public Guid PublicId
    {
        get;
        set;
    } = Guid.CreateVersion7();

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
}