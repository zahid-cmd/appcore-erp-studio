//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using AppCore.Api.Security;
using AppCore.Application.Platform.DataManagement;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.Platform.Tenancy;
using AppCore.Domain.Entities.InfrastructureControl.NavigationManagement;
using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.ApplicationConfiguration;


//===============================================================
// Menu Order (2026-11-20)
//
// Settings > Application Configuration > Menu Order
//
// The order of the modules, menus and pages in the sidebar, and
// whether each one is shown. Nothing else : names, codes, routes,
// adding and deleting stay on Navigation Management (AppCore's
// development PC only). Owner : clients may ask to reorder; the
// page is given through role permissions (View to open, Update
// to save); AppCore Admin may always use it.
//
//   GET : the tree (+ CanUpdate)
//   PUT : { Items : [ { Kind, Id, DisplayOrder, IsActive } ] }
//         Kind = module | menu | page
//
// Never listed / changed on a company's address : Infrastructure
// Control (AppCore's own). Never hidden : Security & Permission,
// Settings, Application Configuration and this page (so nobody
// locks himself out).
//===============================================================

[ApiController]
[Route("api/settings/application-configuration/menu-order")]
public class MenuOrderController : ControllerBase
{
    private const string PageRoute = "/settings/%/menu-order";

    private const string AppCoreOnlyModule = "infrastructure-control";

    private static readonly HashSet<string> LockedModules =
        new(StringComparer.OrdinalIgnoreCase) { "security-permission", "settings" };

    private const string LockedMenu = "application-configuration";

    private const string LockedPage = "menu-order";

    private readonly AppDbContext _context;
    private readonly IEffectiveAccessRepository _access;
    private readonly IDataManagementService _data;
    private readonly ITenantContext _tenant;

    public MenuOrderController
    (
        AppDbContext context,
        IEffectiveAccessRepository access,
        IDataManagementService data,
        ITenantContext tenant
    )
    {
        _context = context;
        _access = access;
        _data = data;
        _tenant = tenant;
    }


    //===========================================================
    // DTOs
    //===========================================================

    public sealed class MenuOrderItemDto
    {
        public string Kind { get; set; } = string.Empty;
        public long Id { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; }
    }

    public sealed class MenuOrderSaveDto
    {
        public List<MenuOrderItemDto> Items { get; set; } = new();
    }


    //===========================================================
    // Access
    //===========================================================

    private async Task<bool> MayAsync(string activity)
    {
        long userId = this.CurrentUserId();

        return await _data.IsAppCoreAdminAsync(userId)
            || await _access.HasActivityAsync(userId, PageRoute, activity);
    }

    private bool Hidden(string? moduleRouteKey)
        => _tenant.Enabled
           && string.Equals((moduleRouteKey ?? string.Empty).Trim(), AppCoreOnlyModule, StringComparison.OrdinalIgnoreCase);


    //===========================================================
    // Get
    //===========================================================

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        if (!await MayAsync("View"))
        {
            return StatusCode(403, new { message = "You cannot open Menu Order." });
        }

        bool canUpdate = await MayAsync("Update");

        List<NavigationModule> modules =
            await _context.Set<NavigationModule>()
                .AsNoTracking()
                .Where(m => !m.IsDeleted)
                .Include(m => m.Menus.Where(x => !x.IsDeleted))
                    .ThenInclude(x => x.Submenus.Where(s => !s.IsDeleted))
                .ToListAsync();

        var tree = modules
            .Where(m => !Hidden(m.RouteKey))
            .OrderBy(m => m.DisplayOrder).ThenBy(m => m.Name)
            .Select(m => new
            {
                Id = m.Id,
                Name = m.Name,
                Icon = m.Icon,
                DisplayOrder = m.DisplayOrder,
                IsActive = m.IsActive,
                Locked = LockedModules.Contains((m.RouteKey ?? string.Empty).Trim()),
                Menus = m.Menus
                    .OrderBy(x => x.DisplayOrder).ThenBy(x => x.Name)
                    .Select(x => new
                    {
                        Id = x.Id,
                        Name = x.Name,
                        Icon = x.Icon,
                        DisplayOrder = x.DisplayOrder,
                        IsActive = x.IsActive,
                        Locked = string.Equals((x.RouteKey ?? string.Empty).Trim(), LockedMenu, StringComparison.OrdinalIgnoreCase)
                                 && LockedModules.Contains((m.RouteKey ?? string.Empty).Trim()),
                        Pages = x.Submenus
                            .OrderBy(s => s.DisplayOrder).ThenBy(s => s.Name)
                            .Select(s => new
                            {
                                Id = s.Id,
                                Name = s.Name,
                                Icon = s.Icon,
                                DisplayOrder = s.DisplayOrder,
                                IsActive = s.IsActive,
                                Locked = string.Equals((s.RouteKey ?? string.Empty).Trim(), LockedPage, StringComparison.OrdinalIgnoreCase)
                            })
                            .ToList()
                    })
                    .ToList()
            })
            .ToList();

        return Ok(new { CanUpdate = canUpdate, Modules = tree });
    }


    //===========================================================
    // Save : order and shown / hidden only
    //===========================================================

    [HttpPut]
    public async Task<IActionResult> Save([FromBody] MenuOrderSaveDto request)
    {
        if (!await MayAsync("Update"))
        {
            return StatusCode(403, new { message = "Saving the menu order needs Update on Menu Order." });
        }

        List<MenuOrderItemDto> items = request?.Items ?? new();

        long userId = this.CurrentUserId();
        DateTime now = DateTime.UtcNow;

        Dictionary<long, NavigationModule> modules =
            await _context.Set<NavigationModule>().Where(m => !m.IsDeleted).ToDictionaryAsync(m => m.Id);

        Dictionary<long, NavigationMenu> menus =
            await _context.Set<NavigationMenu>().Where(m => !m.IsDeleted).ToDictionaryAsync(m => m.Id);

        Dictionary<long, NavigationSubmenu> pages =
            await _context.Set<NavigationSubmenu>().Where(m => !m.IsDeleted).ToDictionaryAsync(m => m.Id);

        int changed = 0;

        foreach (MenuOrderItemDto item in items)
        {
            int order = Math.Clamp(item.DisplayOrder, 0, 9999);

            switch ((item.Kind ?? string.Empty).Trim().ToLowerInvariant())
            {
                case "module":
                    if (!modules.TryGetValue(item.Id, out NavigationModule? module) || Hidden(module.RouteKey))
                    {
                        continue;
                    }

                    bool moduleLocked = LockedModules.Contains((module.RouteKey ?? string.Empty).Trim());

                    if (module.DisplayOrder != order || (!moduleLocked && module.IsActive != item.IsActive))
                    {
                        module.DisplayOrder = order;
                        module.IsActive = moduleLocked || item.IsActive;
                        module.ModifiedBy = userId;
                        module.ModifiedDate = now;
                        changed++;
                    }

                    break;

                case "menu":
                    if (!menus.TryGetValue(item.Id, out NavigationMenu? menu)
                        || !modules.TryGetValue(menu.NavigationModuleId, out NavigationModule? menuModule)
                        || Hidden(menuModule.RouteKey))
                    {
                        continue;
                    }

                    bool menuLocked =
                        string.Equals((menu.RouteKey ?? string.Empty).Trim(), LockedMenu, StringComparison.OrdinalIgnoreCase)
                        && LockedModules.Contains((menuModule.RouteKey ?? string.Empty).Trim());

                    if (menu.DisplayOrder != order || (!menuLocked && menu.IsActive != item.IsActive))
                    {
                        menu.DisplayOrder = order;
                        menu.IsActive = menuLocked || item.IsActive;
                        menu.ModifiedBy = userId;
                        menu.ModifiedDate = now;
                        changed++;
                    }

                    break;

                case "page":
                    if (!pages.TryGetValue(item.Id, out NavigationSubmenu? page)
                        || !menus.TryGetValue(page.NavigationMenuId, out NavigationMenu? pageMenu)
                        || !modules.TryGetValue(pageMenu.NavigationModuleId, out NavigationModule? pageModule)
                        || Hidden(pageModule.RouteKey))
                    {
                        continue;
                    }

                    bool pageLocked =
                        string.Equals((page.RouteKey ?? string.Empty).Trim(), LockedPage, StringComparison.OrdinalIgnoreCase);

                    if (page.DisplayOrder != order || (!pageLocked && page.IsActive != item.IsActive))
                    {
                        page.DisplayOrder = order;
                        page.IsActive = pageLocked || item.IsActive;
                        page.ModifiedBy = userId;
                        page.ModifiedDate = now;
                        changed++;
                    }

                    break;
            }
        }

        if (changed == 0)
        {
            return Ok(new { Changed = 0, Message = "Nothing changed." });
        }

        // Saved in two steps inside one transaction : first every
        // moved row gets a free number (10000+), then its real one.
        // Swapping two rows can never meet an index that wants each
        // number used once per parent. All or nothing.
        try
        {
            await using var tx = await _context.Database.BeginTransactionAsync();

            var moved = _context.ChangeTracker.Entries()
                .Where(e => e.State == EntityState.Modified
                            && e.Properties.Any(p => p.Metadata.Name == "DisplayOrder" && p.IsModified))
                .ToList();

            var final = moved.ToDictionary(e => e, e => (int)e.Property("DisplayOrder").CurrentValue!);

            int temp = 10000;
            foreach (var e in moved)
            {
                e.Property("DisplayOrder").CurrentValue = temp++;
            }

            await _context.SaveChangesAsync();

            foreach (var pair in final)
            {
                pair.Key.Property("DisplayOrder").CurrentValue = pair.Value;
            }

            await _context.SaveChangesAsync();

            await tx.CommitAsync();
        }
        catch (Exception ex)
        {
            Exception root = ex;
            while (root.InnerException != null)
            {
                root = root.InnerException;
            }

            return StatusCode(500, new { message = "The menu order could not be saved : " + root.Message });
        }

        return Ok(new { Changed = changed, Message = $"{changed} item(s) saved. Sign in again to see the new menu." });
    }
}
