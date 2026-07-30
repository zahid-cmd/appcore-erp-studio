//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.NavigationManagement.Sidebar.DTOs;

//===============================================================
// Sidebar Module DTO
//===============================================================

public class SidebarModuleDto
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

    public int DisplayOrder
    {
        get;
        set;
    }

    public List<SidebarMenuDto> Menus
    {
        get;
        set;
    } = new();
}