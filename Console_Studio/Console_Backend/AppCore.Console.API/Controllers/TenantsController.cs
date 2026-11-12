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
    List<string>? HostNames);

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
            Remarks = Clean(request.Remarks),
            CreatedBy = User.StaffId()
        };

        _db.Tenants.Add(tenant);

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

        _audit.Add("Tenant.Create", "Tenant", tenant.TenantCode, tenant.TenantId);

        await _db.SaveChangesAsync();

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

        tenant.TenantCode = request.TenantCode.Trim().ToUpperInvariant();
        tenant.CustomerId = customer!.CustomerId;
        tenant.ProductId = product!.ProductId;
        tenant.DisplayName = request.DisplayName.Trim();
        tenant.DatabaseServerId = request.DatabaseServerId;
        tenant.DatabaseName = Clean(request.DatabaseName);
        tenant.TrialEndsOn = request.TrialEndsOn;
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

        if (await _db.Tenants.AnyAsync(x => x.TenantCode == code && x.TenantId != tenantId))
        {
            return ($"Tenant code {code} is already used.", null, null, hosts);
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
