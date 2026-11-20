//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.InfrastructureControl.NavigationManagement.Sidebar.DTOs;
using AppCore.Application.InfrastructureControl.NavigationManagement.Sidebar.Interfaces;

using AppCore.Infrastructure.Persistence;

using AppCore.Application.Platform.Tenancy;

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

    // On a company's address (Tenancy Mode Host) Infrastructure
    // Control is not shown : it is AppCore's own (2026-11-20).
    private readonly ITenantContext _tenant;

    // Modules switched off in the Console for this client
    // (2026-11-20) are not shown either
    private readonly ITenantLimits _limits;

    private const string AppCoreOnlyModule = "infrastructure-control";

    //===============================================================
    // Constructor
    //===============================================================

    public SidebarRepository(AppDbContext context, ITenantContext tenant, ITenantLimits limits)
    {
        _context = context;

        _tenant = tenant;

        _limits = limits;
    }

    //===============================================================
    // Get Sidebar
    //===============================================================

    public async Task<List<SidebarModuleDto>> GetSidebarAsync()
    {
        bool companyAddress =
            _tenant.Enabled;

        List<string> off =
            ((await _limits.GetAsync())?.OffModules ?? new HashSet<string>())
                .ToList();

        return await _context.NavigationModules

            .AsNoTracking()

            .Where(module =>
                !module.IsDeleted
                &&
                module.IsActive
                &&
                !(companyAddress && module.RouteKey.ToLower() == AppCoreOnlyModule)
                &&
                !off.Contains(module.RouteKey.ToLower()))

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