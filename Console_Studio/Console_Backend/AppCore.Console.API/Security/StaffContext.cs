//===============================================================
// The signed-in staff user + the audit log writer
//===============================================================

using System.Security.Claims;

using AppCore.Console.API.Data;

namespace AppCore.Console.API.Security;


public static class StaffRoles
{
    public const string Owner = "OWNER";
    public const string Support = "SUPPORT";
    public const string Billing = "BILLING";
    public const string Developer = "DEVELOPER";

    // Who may add / change customers and tenants
    public const string ManageTenants = Owner + "," + Developer;
}

public static class StaffClaims
{
    public static long? StaffId(this ClaimsPrincipal user)
        => long.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out long id) ? id : null;
}

public class Audit
{
    private readonly ControlDbContext _db;
    private readonly IHttpContextAccessor _http;

    public Audit(ControlDbContext db, IHttpContextAccessor http)
    {
        _db = db;
        _http = http;
    }

    // Added to the context; saved with the caller's SaveChanges
    public void Add(string action, string? entityName = null, string? entityId = null, long? tenantId = null, string? details = null, long? staffUserId = null)
    {
        HttpContext? context = _http.HttpContext;

        _db.AuditLog.Add(new AuditLogEntry
        {
            StaffUserId = staffUserId ?? context?.User.StaffId(),
            Action = action,
            EntityName = entityName,
            EntityId = entityId,
            TenantId = tenantId,
            Details = details,
            IpAddress = context is null ? null : VisitorIp.Of(context)
        });
    }
}
