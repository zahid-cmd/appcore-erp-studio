//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.InfrastructureControl.NavigationManagement.Sidebar.DTOs;
using AppCore.Application.InfrastructureControl.NavigationManagement.Sidebar.Interfaces;

using AppCore.Infrastructure.Persistence;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement;

//===============================================================
// Sidebar Repository
//===============================================================

public class SidebarRepository : ISidebarRepository
{
    //===============================================================
    // Private Fields
    //===============================================================

    private readonly AppDbContext _context;

    //===============================================================
    // Constructor
    //===============================================================

    public SidebarRepository(AppDbContext context)
    {
        _context = context;
    }

    //===============================================================
    // Get Sidebar
    //===============================================================

    public async Task<List<SidebarModuleDto>> GetSidebarAsync()
    {
        return await _context.NavigationModules

            .AsNoTracking()

            .Where(module =>
                !module.IsDeleted
                &&
                module.IsActive)

            .OrderBy(module =>
                module.DisplayOrder)

            .ThenBy(module =>
                module.Name)

            .Select(module => new SidebarModuleDto
            {
                Id = module.Id,

                Code = module.Code,

                Name = module.Name,

                Icon = module.Icon,

                DisplayOrder = module.DisplayOrder,

                Menus = module.Menus

                    .Where(menu =>
                        !menu.IsDeleted
                        &&
                        menu.IsActive)

                    .OrderBy(menu =>
                        menu.DisplayOrder)

                    .ThenBy(menu =>
                        menu.Name)

                    .Select(menu => new SidebarMenuDto
                    {
                        Id = menu.Id,

                        Code = menu.Code,

                        Name = menu.Name,

                        Icon = menu.Icon,

                        Route = menu.Route,

                        DisplayOrder = menu.DisplayOrder,

                        Submenus = menu.Submenus

                            .Where(submenu =>
                                !submenu.IsDeleted
                                &&
                                submenu.IsActive)

                            .OrderBy(submenu =>
                                submenu.DisplayOrder)

                            .ThenBy(submenu =>
                                submenu.Name)

                            .Select(submenu => new SidebarSubmenuDto
                            {
                                Id = submenu.Id,

                                Code = submenu.Code,

                                Name = submenu.Name,

                                Icon = submenu.Icon,

                                Route = submenu.Route,

                                DisplayOrder = submenu.DisplayOrder
                            })

                            .ToList()

                    })

                    .ToList()

            })

            .ToListAsync();
    }
}