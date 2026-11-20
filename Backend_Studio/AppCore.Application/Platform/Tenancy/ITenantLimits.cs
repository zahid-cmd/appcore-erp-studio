//===============================================================
// Tenancy : the limits of this client (set in the Console)
//===============================================================
//
// The client makes his own company and branches inside the ERP;
// the Console (Tenants.MaxCompanies / MaxBranches) says how many.
//
//     Tenancy:Mode = Host : the tenant of the request's web address.
//     Tenancy:Mode = Off  : the tenant in AppCore_Control whose
//                           database is ConnectionStrings:
//                           DefaultConnection (needs ConnectionStrings:
//                           Control on this server).
//
// null = no tenant found : nothing is limited.
//
//===============================================================

namespace AppCore.Application.Platform.Tenancy;


public sealed record TenantLimits(
    int MaxCompanies,

    // null = no limit
    int? MaxBranches,

    // null = no limit (2026-11-20)
    int? MaxUsers = null,

    // module route keys switched OFF in the Console, comma
    // separated ('' = everything on) (2026-11-20)
    string DisabledModules = "")
{
    // the switched-off modules' route keys (lower case)
    public HashSet<string> OffModules =>
        (DisabledModules ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(x => x.ToLowerInvariant())
            .ToHashSet();

    public bool IsModuleOff(string? routeKey) =>
        !string.IsNullOrWhiteSpace(routeKey)
        && OffModules.Contains(routeKey.Trim().ToLowerInvariant());
}


public interface ITenantLimits
{
    Task<TenantLimits?> GetAsync(CancellationToken ct = default);
}
