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

    // modules switched off in the Console (2026-11-20) are not listed
    private readonly ITenantLimits _limits;

    private HashSet<string> _off = new();

    public MenuOrderController
    (
        AppDbContext context,
        IEffectiveAccessRepository access,
        IDataManagementService data,
        ITenantContext tenant,
        ITenantLimits limits
    )
    {
        _context = context;
        _access = access;
        _data = data;
        _tenant = tenant;
        _limits = limits;
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
        => (_tenant.Enabled
            && string.Equals((moduleRouteKey ?? string.Empty).Trim(), AppCoreOnlyModule, StringComparison.OrdinalIgnoreCase))
           || _off.Contains((moduleRouteKey ?? string.Empty).Trim().ToLowerInvariant());

    private async Task LoadOffAsync()
    {
        _off = (await _limits.GetAsync())?.OffModules ?? new HashSet<string>();
    }


    //===========================================================
    // Get
    //===========================================================

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        await LoadOffAsync();

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
        await LoadOffAsync();

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

        // Modules : DisplayOrder is unique over the whole table
        // (deleted and hidden modules keep theirs). The modules sent
        // keep the order they were sent in, numbered 1, 2, 3 ...
        // skipping every number held by a module that was not sent.
        List<MenuOrderItemDto> moduleItems = items
            .Where(i => string.Equals((i.Kind ?? string.Empty).Trim(), "module", StringComparison.OrdinalIgnoreCase)
                        && modules.ContainsKey(i.Id) && !Hidden(modules[i.Id].RouteKey))
            .GroupBy(i => i.Id).Select(g => g.First())
            .OrderBy(i => i.DisplayOrder)
            .ToList();

        HashSet<long> sentModuleIds = moduleItems.Select(i => i.Id).ToHashSet();

        HashSet<int> heldByOthers = (await _context.Set<NavigationModule>().AsNoTracking()
                .Where(m => !sentModuleIds.Contains(m.Id))
                .Select(m => m.DisplayOrder)
                .ToListAsync())
            .ToHashSet();

        int nextModuleOrder = 1;
        foreach (MenuOrderItemDto item in moduleItems)
        {
            while (heldByOthers.Contains(nextModuleOrder))
            {
                nextModuleOrder++;
            }

            item.DisplayOrder = nextModuleOrder++;
        }

        Dictionary<long, int> moduleFinal = new();

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
                        // the number is written by SQL below (unique index)
                        moduleFinal[module.Id] = order;
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

        // Modules : "DisplayOrder" is unique over the whole table.
        // Every module that was sent first moves to a free negative
        // number (minus its Id), then gets its final number : no
        // order of the updates can meet the index. Menus and pages
        // have no such index and are saved by EF. One transaction :
        // all or nothing.
        Dictionary<long, int> finals = moduleItems.ToDictionary(i => i.Id, i => i.DisplayOrder);

        List<int> clash = finals.Values.GroupBy(v => v).Where(g => g.Count() > 1).Select(g => g.Key)
            .Concat(finals.Values.Where(heldByOthers.Contains))
            .Distinct().OrderBy(v => v).ToList();

        if (clash.Count > 0)
        {
            return StatusCode(500, new { message = "The menu order could not be saved : module number(s) "
                + string.Join(", ", clash) + " would be used twice. Nothing was changed." });
        }

        try
        {
            await using var tx = await _context.Database.BeginTransactionAsync();

            if (moduleFinal.Count > 0)
            {
                long[] ids = finals.Keys.ToArray();

                await _context.Database.ExecuteSqlInterpolatedAsync(
                    $"UPDATE \"NavigationModules\" SET \"DisplayOrder\" = -\"Id\" WHERE \"Id\" = ANY({ids})");

                foreach (var pair in finals)
                {
                    await _context.Database.ExecuteSqlInterpolatedAsync(
                        $"UPDATE \"NavigationModules\" SET \"DisplayOrder\" = {pair.Value} WHERE \"Id\" = {pair.Key}");
                }

                // EF must not write the module numbers again
                foreach (var pair in finals)
                {
                    if (modules.TryGetValue(pair.Key, out NavigationModule? m))
                    {
                        var entry = _context.Entry(m);
                        entry.Property(x => x.DisplayOrder).CurrentValue = pair.Value;
                        entry.Property(x => x.DisplayOrder).OriginalValue = pair.Value;
                        entry.Property(x => x.DisplayOrder).IsModified = false;
                    }
                }
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
