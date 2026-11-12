//===============================================================
// Tenant Context (scoped : one per request / per job scope)
//===============================================================
//
// Filled by the tenant middleware (API) at the start of a request
// in Tenancy:Mode = Host. Background jobs will set it per company
// (step B). See AppCore.Application\Platform\Tenancy\ITenantContext.
//
//===============================================================

using AppCore.Application.Platform.Tenancy;

namespace AppCore.Infrastructure.Platform.Tenancy;


public sealed class TenantContext : ITenantContext
{
    public TenantContext(TenancyOptions options)
    {
        Enabled = options.IsHostMode;
    }

    public bool Enabled { get; }

    public TenantInfo? Tenant { get; private set; }

    public void Set(TenantInfo tenant)
    {
        if (Tenant is not null && Tenant.TenantCode != tenant.TenantCode)
        {
            // never switch company inside one request / scope
            throw new InvalidOperationException("The company of this request is already set.");
        }

        Tenant = tenant;
    }
}
