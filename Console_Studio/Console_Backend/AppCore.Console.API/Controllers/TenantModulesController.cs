//===============================================================
// Tenant modules, package and users : api/tenants/{id}/modules
// (2026-11-20, 10_Modules_Packages_Users.sql)
// --------------------------------------------------------------
// GET : the product's packages and modules, which are on for this
//       tenant, its package and user limit.
// PUT : { PackageCode, EnabledModules, MaxUsers }
//       Core modules are always on. Saves Tenants.PackageCode,
//       MaxUsers and DisabledModules (route keys that are OFF,
//       comma separated : the only thing the ERP reads; it picks
//       the change up within a minute).
//===============================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using AppCore.Console.API.Data;
using AppCore.Console.API.Security;

namespace AppCore.Console.API.Controllers;


public record TenantModulesSave(
    string? PackageCode,
    List<string>? EnabledModules,
    int? MaxUsers);


[ApiController]
[Authorize]
[Route("api/tenants/{publicId:guid}/modules")]
public class TenantModulesController : ControllerBase
{
    private readonly ControlDbContext _db;
    private readonly Audit _audit;

    public TenantModulesController(ControlDbContext db, Audit audit)
    {
        _db = db;
        _audit = audit;
    }

    public static HashSet<string> Split(string? list) =>
        (list ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(x => x.ToLowerInvariant())
            .ToHashSet();

    [HttpGet]
    public async Task<IActionResult> Get(Guid publicId)
    {
        Tenant? t = await _db.Tenants.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == publicId);

        if (t is null)
        {
            return NotFound();
        }

        var modules = await _db.ProductModules.AsNoTracking()
            .Where(x => x.ProductId == t.ProductId)
            .OrderBy(x => x.DisplayOrder).ThenBy(x => x.ModuleName)
            .ToListAsync();

        var packages = await _db.ProductPackages.AsNoTracking()
            .Where(x => x.ProductId == t.ProductId)
            .OrderBy(x => x.DisplayOrder)
            .ToListAsync();

        List<long> packageIds = packages.Select(p => p.ProductPackageId).ToList();

        var links = await _db.ProductPackageModules.AsNoTracking()
            .Where(x => packageIds.Contains(x.ProductPackageId))
            .ToListAsync();

        HashSet<string> off = Split(t.DisabledModules);

        return Ok(new
        {
            t.PackageCode,
            t.MaxUsers,
            Packages = packages.Select(p => new
            {
                p.PackageCode,
                p.PackageName,
                p.Description,
                Modules = links.Where(l => l.ProductPackageId == p.ProductPackageId)
                    .Select(l => modules.FirstOrDefault(m => m.ProductModuleId == l.ProductModuleId)?.ModuleCode)
                    .Where(c => c != null)
                    .ToList()
            }),
            Modules = modules.Select(m => new
            {
                m.ModuleCode,
                m.ModuleName,
                m.IsCore,
                Enabled = m.IsCore || !off.Contains(m.ModuleCode.ToLowerInvariant())
            })
        });
    }

    [HttpPut]
    [Authorize(Roles = StaffRoles.ManageTenants)]
    public async Task<IActionResult> Save(Guid publicId, [FromBody] TenantModulesSave request)
    {
        Tenant? t = await _db.Tenants.FirstOrDefaultAsync(x => x.PublicId == publicId);

        if (t is null)
        {
            return NotFound();
        }

        if (request.MaxUsers is < 1 or > 100000)
        {
            return BadRequest(new { message = "Users allowed : 1 or more, or leave it empty for no limit." });
        }

        string? package = string.IsNullOrWhiteSpace(request.PackageCode) ? null : request.PackageCode.Trim().ToUpperInvariant();

        if (package != null
            && !await _db.ProductPackages.AnyAsync(x => x.ProductId == t.ProductId && x.PackageCode == package))
        {
            return BadRequest(new { message = "Unknown package." });
        }

        var modules = await _db.ProductModules.AsNoTracking()
            .Where(x => x.ProductId == t.ProductId)
            .ToListAsync();

        HashSet<string> on = (request.EnabledModules ?? new())
            .Select(x => x.Trim().ToLowerInvariant())
            .ToHashSet();

        List<string> off = modules
            .Where(m => !m.IsCore && !on.Contains(m.ModuleCode.ToLowerInvariant()))
            .OrderBy(m => m.DisplayOrder)
            .Select(m => m.ModuleCode.ToLowerInvariant())
            .ToList();

        t.PackageCode = package;
        t.MaxUsers = request.MaxUsers;
        t.DisabledModules = string.Join(",", off);
        t.ModifiedDate = DateTime.UtcNow;
        t.ModifiedBy = User.StaffId();

        _audit.Add("Tenant.Modules", "Tenant", t.TenantCode, t.TenantId,
            $"package {package ?? "-"}; users {request.MaxUsers?.ToString() ?? "no limit"}; off : {(off.Count == 0 ? "none" : string.Join(", ", off))}");

        await _db.SaveChangesAsync();

        return Ok(new
        {
            Message = off.Count == 0
                ? "Saved : every module is on. The ERP shows it within a minute."
                : $"Saved : {off.Count} module(s) off. The ERP shows it within a minute."
        });
    }
}
