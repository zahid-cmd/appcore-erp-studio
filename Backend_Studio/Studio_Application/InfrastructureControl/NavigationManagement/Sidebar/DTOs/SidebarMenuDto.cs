//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.NavigationManagement.Sidebar.DTOs;

//===============================================================
// Sidebar Menu DTO
//===============================================================

public class SidebarMenuDto
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

    public List<SidebarSubmenuDto> Submenus
    {
        get;
        set;
    } = new();
}