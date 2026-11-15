//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Platform.Tenancy;
using AppCore.Infrastructure.Platform.Tenancy;
using AppCore.Application.FixedAssetsManagement;
using AppCore.Infrastructure.Configurations.AccountsFinance.AccountsReconciliation;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.BackgroundJobs;


//===============================================================
// Fixed Assets : Charge Depreciation on Month End (background job,
// 2026-11-15)
//
// Registered in Program.cs :
//     builder.Services.AddHostedService<FaMonthEndDepreciationJob>();
//
// • 2 minutes after the API starts : catches up the months that
//   ended while the API was down.
// • Then every day at 00:05 Bangladesh time. On the 1st this
//   charges the month just ended; on the other days there is
//   nothing due, unless a branch failed before (it is tried again).
//
// Whether anything is posted is decided by the repository and the
// Asset Configuration switch "Charge Depreciation on Month End"
// (read on every check, so turning it ON / OFF needs no restart).
// The work runs once per client company. A failure is logged and
// never stops the API.
//===============================================================

public class FaMonthEndDepreciationJob : BackgroundService
{
    private static readonly TimeSpan StartDelay =
        TimeSpan.FromMinutes(2);

    private static readonly TimeSpan RunAt =
        new(0, 5, 0);

    private readonly ILogger<FaMonthEndDepreciationJob> _logger;

    // Tenancy : the work runs once per client company
    private readonly TenantScopes _tenants;

    public FaMonthEndDepreciationJob(
        ILogger<FaMonthEndDepreciationJob> logger,
        TenantScopes tenants)
    {
        _logger = logger;
        _tenants = tenants;
    }

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(StartDelay, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            await RunOnceAsync(stoppingToken);

            try
            {
                await Task.Delay(UntilNextRun(), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }
        }
    }

    private async Task RunOnceAsync(
        CancellationToken stoppingToken)
    {
        try
        {
            // A fresh scope (own DbContext) for every check, once per
            // company (Tenancy : TenantScopes)
            await _tenants.ForEachAsync("Fixed Assets month-end depreciation", async sp =>
            {
                IFaDepreciationRepository repository =
                    sp.GetRequiredService<IFaDepreciationRepository>();

                string message =
                    await repository.RunMonthEndAsync(stoppingToken);

                _logger.LogInformation(
                    "Fixed Assets month-end depreciation {Tenant}: {Message}",
                    sp.GetRequiredService<ITenantContext>().Tenant?.TenantCode ?? string.Empty,
                    message);
            }, stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Shutting down
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fixed Assets month-end depreciation failed; it is tried again at the next check.");
        }
    }

    // From now to the next 00:05 Bangladesh time (+ a few seconds)
    private static TimeSpan UntilNextRun()
    {
        DateTime now =
            MfsReconciliationsRepository.BusinessNow();

        DateTime next =
            now.Date + RunAt;

        if (now >= next)
        {
            next = next.AddDays(1);
        }

        return next - now + TimeSpan.FromSeconds(5);
    }
}
