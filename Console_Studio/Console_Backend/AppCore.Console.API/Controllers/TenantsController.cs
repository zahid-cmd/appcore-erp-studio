//===============================================================
// Tenants : api/tenants
// --------------------------------------------------------------
// One tenant = one customer using one product, with its own
// database and web address(es). Phase 1 registers EXISTING
// databases (Moto Zone); creating a database from the product
// template (onboarding) comes next.
//===============================================================

using System.Text.RegularExpressions;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using AppCore.Console.API.Data;
using AppCore.Console.API.Security;

namespace AppCore.Console.API.Controllers;


public record TenantSave(
    string TenantCode,
    Guid CustomerPublicId,
    string ProductCode,
    string DisplayName,
    long? DatabaseServerId,
    string? DatabaseName,
    string? Status,
    DateOnly? TrialEndsOn,
    string? Remarks,
    List<string>? HostNames,
    int? MaxCompanies = null,
    int? MaxBranches = null,

    // Register only (2026-11-20, review B4) : the package the client
    // buys and his user limit. Later changes : the tenant page.
    string? PackageCode = null,
    int? MaxUsers = null);

public record TenantStatusChange(string Status, string? Reason);


[ApiController]
[Authorize]
[Route("api/tenants")]
public partial class TenantsController : ControllerBase
{
    public static readonly string[] Statuses =
        ["Provisioning", "Trial", "Active", "Grace", "ReadOnly", "Suspended", "Cancelled"];

    private readonly ControlDbContext _db;
    private readonly Audit _audit;

    public TenantsController(ControlDbContext db, Audit audit)
    {
        _db = db;
        _audit = audit;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? product, [FromQuery] string? status, [FromQuery] string? search)
    {
        var query =
            from t in _db.Tenants
            join c in _db.Customers on t.CustomerId equals c.CustomerId
            join p in _db.Products on t.ProductId equals p.ProductId
            select new { t, c, p };

        if (!string.IsNullOrWhiteSpace(product))
        {
            query = query.Where(x => x.p.ProductCode == product);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(x => x.t.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            string s = $"%{search.Trim()}%";

            query = query.Where(x =>
                EF.Functions.ILike(x.t.TenantCode, s) ||
                EF.Functions.ILike(x.t.DisplayName, s) ||
                EF.Functions.ILike(x.c.DisplayName, s) ||
                _db.TenantDomains.Any(d => d.TenantId == x.t.TenantId && EF.Functions.ILike(d.HostName, s)));
        }

        var rows =
            await query
                .OrderBy(x => x.t.DisplayName)
                .Select(x => new
                {
                    x.t.PublicId,
                    x.t.TenantCode,
                    x.t.DisplayName,
                    x.t.Status,
                    x.t.TrialEndsOn,
                    x.t.DatabaseName,
                    x.t.MaxCompanies,
                    x.t.MaxBranches,
                    x.t.AppVersion,
                    CustomerPublicId = x.c.PublicId,
                    CustomerName = x.c.DisplayName,
                    x.p.ProductCode,
                    x.p.ProductName,
                    PrimaryHost = _db.TenantDomains
                        .Where(d => d.TenantId == x.t.TenantId)
                        .OrderByDescending(d => d.IsPrimary)
                        .Select(d => d.HostName)
                        .FirstOrDefault(),
                    x.t.CreatedDate
                })
                .ToListAsync();

        return Ok(rows);
    }

    [HttpGet("{publicId:guid}")]
    public async Task<IActionResult> Get(Guid publicId)
    {
        Tenant? t = await _db.Tenants.FirstOrDefaultAsync(x => x.PublicId == publicId);

        if (t is null)
        {
            return NotFound();
        }

        Customer c = await _db.Customers.FirstAsync(x => x.CustomerId == t.CustomerId);
        Product p = await _db.Products.FirstAsync(x => x.ProductId == t.ProductId);

        var domains =
            await _db.TenantDomains
                .Where(x => x.TenantId == t.TenantId)
                .OrderByDescending(x => x.IsPrimary)
                .ThenBy(x => x.HostName)
                .Select(x => new { x.HostName, x.DomainType, x.IsPrimary })
                .ToListAsync();

        var history =
            await _db.TenantStatusHistory
                .Where(x => x.TenantId == t.TenantId)
                .OrderByDescending(x => x.ChangedDate)
                .Select(x => new { x.FromStatus, x.ToStatus, x.Reason, x.ChangedDate, x.ChangedBy })
                .ToListAsync();

        return Ok(new
        {
            t.PublicId,
            t.TenantCode,
            t.DisplayName,
            t.Status,
            t.TrialEndsOn,
            t.DatabaseServerId,
            t.DatabaseName,

            // the Console created this database and its login : code,
            // product, server and database name are fixed from then on
            DatabaseLocked = !string.IsNullOrEmpty(t.DbPasswordSealed),
            t.MaxCompanies,
            t.MaxBranches,
            t.TimeZone,
            t.Currency,
            t.AppVersion,
            t.SchemaVersion,
            t.Remarks,
            t.CreatedDate,
            CustomerPublicId = c.PublicId,
            CustomerName = c.DisplayName,
            p.ProductCode,
            p.ProductName,
            Domains = domains,
            History = history
        });
    }

    [HttpPost]
    [Authorize(Roles = StaffRoles.ManageTenants)]
    public async Task<IActionResult> Create([FromBody] TenantSave request)
    {
        (string? problem, Customer? customer, Product? product, List<string> hosts) =
            await CheckAsync(request, null);

        if (problem is not null)
        {
            return BadRequest(new { message = problem });
        }

        string status = request.Status ?? "Provisioning";

        // The package decides the modules from the first day (review
        // B4) : before, a new tenant had every module on and no user
        // limit until someone opened the tenant page.
        if (request.MaxUsers is < 1 or > 100000)
        {
            return BadRequest(new { message = "Users allowed : 1 or more, or leave it empty for no limit." });
        }

        var packages = await _db.ProductPackages.AsNoTracking()
            .Where(x => x.ProductId == product!.ProductId)
            .ToListAsync();

        string? packageCode = Clean(request.PackageCode)?.ToUpperInvariant();
        string disabled = string.Empty;

        if (packages.Count > 0)
        {
            ProductPackage? package = packages.FirstOrDefault(x => x.PackageCode == packageCode);

            if (package is null)
            {
                return BadRequest(new { message = "Pick the package." });
            }

            List<long> inPackage = await _db.ProductPackageModules.AsNoTracking()
                .Where(x => x.ProductPackageId == package.ProductPackageId)
                .Select(x => x.ProductModuleId)
                .ToListAsync();

            // off : every module of the product that is not core and
            // not in the package (what the ERP reads)
            List<string> off = await _db.ProductModules.AsNoTracking()
                .Where(x => x.ProductId == product!.ProductId && !x.IsCore && !inPackage.Contains(x.ProductModuleId))
                .OrderBy(x => x.DisplayOrder)
                .Select(x => x.ModuleCode.ToLower())
                .ToListAsync();

            disabled = string.Join(",", off);
        }
        else
        {
            // a product without packages : every module, as before
            packageCode = null;
        }

        Tenant tenant = new()
        {
            TenantCode = request.TenantCode.Trim().ToUpperInvariant(),
            CustomerId = customer!.CustomerId,
            ProductId = product!.ProductId,
            DisplayName = request.DisplayName.Trim(),
            DatabaseServerId = request.DatabaseServerId,
            DatabaseName = Clean(request.DatabaseName),
            Status = status,
            TrialEndsOn = request.TrialEndsOn,
            MaxCompanies = request.MaxCompanies ?? 1,
            MaxBranches = request.MaxBranches,
            PackageCode = packageCode,
            MaxUsers = request.MaxUsers,
            DisabledModules = disabled,
            Remarks = Clean(request.Remarks),
            CreatedBy = User.StaffId()
        };

        // The tenant, its web addresses and its first history line
        // are saved together or not at all (2026-11-20, review B2) :
        // before, a failure after the first save left a tenant with
        // no address, and "code already used" on the next try.
        try
        {
            await using var tx = await _db.Database.BeginTransactionAsync();

            _db.Tenants.Add(tenant);

            // gives the tenant its id, inside the transaction
            await _db.SaveChangesAsync();

            for (int i = 0; i < hosts.Count; i++)
            {
                _db.TenantDomains.Add(new TenantDomain
                {
                    TenantId = tenant.TenantId,
                    HostName = hosts[i],
                    DomainType = DomainTypeOf(hosts[i]),
                    IsPrimary = i == 0
                });
            }

            _db.TenantStatusHistory.Add(new TenantStatusHistory
            {
                TenantId = tenant.TenantId,
                ToStatus = status,
                Reason = "Tenant registered",
                ChangedBy = User.StaffId()
            });

            _audit.Add("Tenant.Create", "Tenant", tenant.TenantCode, tenant.TenantId,
                $"package {packageCode ?? "-"}; users {request.MaxUsers?.ToString() ?? "no limit"}; off : {(disabled.Length == 0 ? "none" : disabled)}");

            await _db.SaveChangesAsync();

            await tx.CommitAsync();
        }
        catch (DbUpdateException)
        {
            // nothing was saved (the transaction is undone). The usual
            // cause : the same code or web address was registered a
            // moment ago (a double click, or another staff member).
            return Conflict(new { message = "The tenant was not saved : nothing was registered. The tenant code or a web address may have just been taken (a second click, or another staff member). Refresh the tenant list and try again." });
        }

        return Ok(new { tenant.PublicId, tenant.TenantCode });
    }

    [HttpPut("{publicId:guid}")]
    [Authorize(Roles = StaffRoles.ManageTenants)]
    public async Task<IActionResult> Update(Guid publicId, [FromBody] TenantSave request)
    {
        Tenant? tenant = await _db.Tenants.FirstOrDefaultAsync(x => x.PublicId == publicId);

        if (tenant is null)
        {
            return NotFound();
        }

        (string? problem, Customer? customer, Product? product, List<string> hosts) =
            await CheckAsync(request, tenant.TenantId);

        if (problem is not null)
        {
            return BadRequest(new { message = problem });
        }

        // Once the Console has created the database and its login
        // (2026-11-20) the database name, the login and the sealed
        // password all hang on the tenant code : changing code,
        // product, server or database name here would take the
        // client offline.
        if (!string.IsNullOrEmpty(tenant.DbPasswordSealed)
            && (request.TenantCode.Trim().ToUpperInvariant() != tenant.TenantCode
                || product!.ProductId != tenant.ProductId
                || request.DatabaseServerId != tenant.DatabaseServerId
                || Clean(request.DatabaseName) != tenant.DatabaseName))
        {
            return BadRequest(new { message = "This tenant's database was created by the Console : tenant code, product, database server and database name can no longer be changed." });
        }

        tenant.TenantCode = request.TenantCode.Trim().ToUpperInvariant();
        tenant.CustomerId = customer!.CustomerId;
        tenant.ProductId = product!.ProductId;
        tenant.DisplayName = request.DisplayName.Trim();
        tenant.DatabaseServerId = request.DatabaseServerId;
        tenant.DatabaseName = Clean(request.DatabaseName);
        tenant.TrialEndsOn = request.TrialEndsOn;
        tenant.MaxCompanies = request.MaxCompanies ?? 1;
        tenant.MaxBranches = request.MaxBranches;
        tenant.Remarks = Clean(request.Remarks);
        tenant.ModifiedDate = DateTime.UtcNow;
        tenant.ModifiedBy = User.StaffId();

        // web addresses : replace the list (first = primary)
        List<TenantDomain> old =
            await _db.TenantDomains.Where(x => x.TenantId == tenant.TenantId).ToListAsync();

        _db.TenantDomains.RemoveRange(old.Where(x => !hosts.Contains(x.HostName)));

        for (int i = 0; i < hosts.Count; i++)
        {
            TenantDomain? domain = old.FirstOrDefault(x => x.HostName == hosts[i]);

            if (domain is null)
            {
                _db.TenantDomains.Add(new TenantDomain
                {
                    TenantId = tenant.TenantId,
                    HostName = hosts[i],
                    DomainType = DomainTypeOf(hosts[i]),
                    IsPrimary = i == 0
                });
            }
            else
            {
                domain.IsPrimary = i == 0;
            }
        }

        _audit.Add("Tenant.Update", "Tenant", tenant.TenantCode, tenant.TenantId);

        await _db.SaveChangesAsync();

        return Ok();
    }

    [HttpPut("{publicId:guid}/status")]
    [Authorize(Roles = StaffRoles.ManageTenants)]
    public async Task<IActionResult> ChangeStatus(Guid publicId, [FromBody] TenantStatusChange request)
    {
        Tenant? tenant = await _db.Tenants.FirstOrDefaultAsync(x => x.PublicId == publicId);

        if (tenant is null)
        {
            return NotFound();
        }

        if (!Statuses.Contains(request.Status))
        {
            return BadRequest(new { message = "Unknown status." });
        }

        if (tenant.Status == request.Status)
        {
            return Ok();
        }

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            return BadRequest(new { message = "A reason is required to change the status." });
        }

        _db.TenantStatusHistory.Add(new TenantStatusHistory
        {
            TenantId = tenant.TenantId,
            FromStatus = tenant.Status,
            ToStatus = request.Status,
            Reason = request.Reason.Trim(),
            ChangedBy = User.StaffId()
        });

        _audit.Add("Tenant.Status", "Tenant", tenant.TenantCode, tenant.TenantId, $"{tenant.Status} -> {request.Status} : {request.Reason.Trim()}");

        tenant.Status = request.Status;
        tenant.ModifiedDate = DateTime.UtcNow;
        tenant.ModifiedBy = User.StaffId();

        await _db.SaveChangesAsync();

        return Ok();
    }

    // the packages of a product, for Register tenant
    [HttpGet("packages")]
    public async Task<IActionResult> Packages([FromQuery] string? product)
        => Ok(await (from k in _db.ProductPackages
                     join p in _db.Products on k.ProductId equals p.ProductId
                     where p.ProductCode == product
                     orderby k.DisplayOrder
                     select new { k.PackageCode, k.PackageName, k.Description })
                    .ToListAsync());

    [HttpGet("servers")]
    public async Task<IActionResult> Servers()
        => Ok(await _db.DatabaseServers
                .OrderBy(x => x.ServerCode)
                .Select(x => new { x.DatabaseServerId, x.ServerCode, x.ServerName, x.Host, x.Port, x.Status })
                .ToListAsync());

    //-----------------------------------------------------------
    // Checks
    //-----------------------------------------------------------

    [GeneratedRegex("^[A-Z0-9][A-Z0-9-]{1,28}[A-Z0-9]$")]
    private static partial Regex CodePattern();

    [GeneratedRegex("^(?=.{3,200}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$")]
    private static partial Regex HostPattern();

    private async Task<(string? Problem, Customer? Customer, Product? Product, List<string> Hosts)> CheckAsync(TenantSave r, long? tenantId)
    {
        List<string> hosts =
            (r.HostNames ?? [])
                .Select(x => x.Trim().ToLowerInvariant())
                .Where(x => x.Length > 0)
                .Distinct()
                .ToList();

        string code = (r.TenantCode ?? string.Empty).Trim().ToUpperInvariant();

        if (!CodePattern().IsMatch(code))
        {
            return ("Tenant code : 3-30 letters, digits or '-' (e.g. MOTOZONE).", null, null, hosts);
        }

        if (string.IsNullOrWhiteSpace(r.DisplayName))
        {
            return ("Display name is required.", null, null, hosts);
        }

        if (r.Status is not null && !Statuses.Contains(r.Status))
        {
            return ("Unknown status.", null, null, hosts);
        }

        if (r.MaxCompanies is < 1 or > 100)
        {
            return ("Companies allowed : 1 to 100.", null, null, hosts);
        }

        if (r.MaxBranches is < 1 or > 10000)
        {
            return ("Branches allowed : 1 or more, or leave it empty for no limit.", null, null, hosts);
        }

        if (await _db.Tenants.AnyAsync(x => x.TenantCode == code && x.TenantId != tenantId))
        {
            return ($"Tenant code {code} is already used.", null, null, hosts);
        }

        // A new or changed code (2026-11-20) : Create database makes
        // the database and login name from the code without '-' and
        // needs a letter first, so the same rule applies here. Codes
        // registered before keep working.
        bool codeIsNew =
            tenantId is null
            || !await _db.Tenants.AnyAsync(x => x.TenantId == tenantId && x.TenantCode == code);

        if (codeIsNew)
        {
            if (!char.IsLetter(code[0]))
            {
                return ("Tenant code must start with a letter (e.g. MOTOZONE).", null, null, hosts);
            }

            string bare = code.Replace("-", string.Empty);

            string? clash =
                await _db.Tenants
                    .Where(x => x.TenantId != tenantId && x.TenantCode.Replace("-", "") == bare)
                    .Select(x => x.TenantCode)
                    .FirstOrDefaultAsync();

            if (clash is not null)
            {
                return ($"Tenant code {code} is too close to {clash} : both would use the same database name.", null, null, hosts);
            }
        }

        if (r.DatabaseServerId is not null
            && !await _db.DatabaseServers.AnyAsync(x => x.DatabaseServerId == r.DatabaseServerId))
        {
            return ("Pick the database server from the list.", null, null, hosts);
        }

        Customer? customer = await _db.Customers.FirstOrDefaultAsync(x => x.PublicId == r.CustomerPublicId);

        if (customer is null)
        {
            return ("Pick the customer.", null, null, hosts);
        }

        Product? product = await _db.Products.FirstOrDefaultAsync(x => x.ProductCode == r.ProductCode);

        if (product is null)
        {
            return ("Pick the product.", customer, null, hosts);
        }

        if (hosts.Count == 0)
        {
            return ("Add at least one web address (e.g. motozone.appcoretech.net).", customer, product, hosts);
        }

        foreach (string host in hosts)
        {
            if (!HostPattern().IsMatch(host))
            {
                return ($"'{host}' is not a valid web address.", customer, product, hosts);
            }

            if (await _db.TenantDomains.AnyAsync(x => x.HostName == host && x.TenantId != tenantId))
            {
                return ($"'{host}' already belongs to another tenant.", customer, product, hosts);
            }
        }

        string? database = Clean(r.DatabaseName);

        if (database is not null &&
            await _db.Tenants.AnyAsync(x => x.DatabaseName == database && x.DatabaseServerId == r.DatabaseServerId && x.TenantId != tenantId))
        {
            return ($"Database {database} is already used by another tenant.", customer, product, hosts);
        }

        return (null, customer, product, hosts);
    }

    private static string DomainTypeOf(string host)
        => host.EndsWith(".appcoretech.net") ? "Subdomain" : "Custom";

    private static string? Clean(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
