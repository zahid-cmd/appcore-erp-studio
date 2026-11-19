//===============================================================
// Tenant Limits (scoped)
//===============================================================
//
// See AppCore.Application\Platform\Tenancy\ITenantLimits.
//
//===============================================================

using AppCore.Application.Platform.Tenancy;

namespace AppCore.Infrastructure.Platform.Tenancy;


public sealed class TenantLimitsService : ITenantLimits
{
    private readonly ITenantContext _tenant;

    private readonly TenantResolver _resolver;


    public TenantLimitsService(ITenantContext tenant, TenantResolver resolver)
    {
        _tenant = tenant;
        _resolver = resolver;
    }


    public async Task<TenantLimits?> GetAsync(CancellationToken ct = default)
    {
        // Mode Host : the tenant of this request
        if (_tenant.Tenant is TenantInfo info)
        {
            return new TenantLimits(info.MaxCompanies, info.MaxBranches);
        }

        // Mode Host outside a request (a job with no company) : nothing
        if (_tenant.Enabled)
        {
            return null;
        }

        // Mode Off : the tenant registered for this database
        return await _resolver.LimitsOfDefaultDatabaseAsync(ct);
    }
}
