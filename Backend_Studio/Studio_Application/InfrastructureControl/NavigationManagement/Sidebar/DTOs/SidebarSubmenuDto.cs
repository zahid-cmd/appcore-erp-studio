//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.NavigationManagement.Sidebar.DTOs;

//===============================================================
// Sidebar Submenu DTO
//===============================================================

public class SidebarSubmenuDto
{
    public long Id
    {
        get;
        set;
    }

    public string Code
    {
        get;
        set;
    } = string.Empty;

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
}