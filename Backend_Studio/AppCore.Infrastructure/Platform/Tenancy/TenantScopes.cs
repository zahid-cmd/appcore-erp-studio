//===============================================================
// Tenant Scopes : run work once per client company
//===============================================================
//
// Background jobs (settlements, nightly backup, next financial
// year) have no web request, so no web address tells them which
// company. They call :
//
//     await _tenants.ForEachAsync("MFS Auto Settlement", async sp =>
//     {
//         var repo = sp.GetRequiredService<...>();   // that company's database
//         ...
//     }, stoppingToken);
//
// Tenancy:Mode = Off : one run, the one database (as before).
// Tenancy:Mode = Host : one run per open company (AppCore_Control),
// each in its own scope with ITenantContext set, so AppDbContext
// opens that company's database. One company failing never stops
// the others.
//
//===============================================================

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

using AppCore.Application.Platform.Tenancy;

namespace AppCore.Infrastructure.Platform.Tenancy;


public sealed class TenantScopes
{
    private readonly IServiceScopeFactory _scopes;
    private readonly TenancyOptions _options;
    private readonly TenantResolver _resolver;
    private readonly ILogger<TenantScopes> _log;

    public TenantScopes(
        IServiceScopeFactory scopes,
        TenancyOptions options,
        TenantResolver resolver,
        ILogger<TenantScopes> log)
    {
        _scopes = scopes;
        _options = options;
        _resolver = resolver;
        _log = log;
    }

    public async Task ForEachAsync(string jobName, Func<IServiceProvider, Task> work, CancellationToken ct)
    {
        if (!_options.IsHostMode)
        {
            using IServiceScope scope = _scopes.CreateScope();

            await work(scope.ServiceProvider);

            return;
        }

        List<TenantInfo> tenants = await _resolver.ListOpenAsync(ct);

        foreach (TenantInfo tenant in tenants)
        {
            ct.ThrowIfCancellationRequested();

            try
            {
                using IServiceScope scope = _scopes.CreateScope();

                scope.ServiceProvider.GetRequiredService<TenantContext>().Set(tenant);

                await work(scope.ServiceProvider);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "{Job} failed for {Tenant}; the other companies continue.", jobName, tenant.TenantCode);
            }
        }
    }
}
