using AppCore.Application.InfrastructureControl.NavigationManagement.Sidebar.DTOs;

namespace AppCore.Application.InfrastructureControl.NavigationManagement.Sidebar.Interfaces;

public interface ISidebarRepository
{
    Task<List<SidebarModuleDto>> GetSidebarAsync();
}