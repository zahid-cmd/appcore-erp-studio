//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Platform.Tenancy;
using AppCore.Infrastructure.Platform.Tenancy;
using AppCore.Application.AccountsFinance.AccountsReconciliation;
using AppCore.Infrastructure.Configurations.AccountsFinance.AccountsReconciliation;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.BackgroundJobs;


//===============================================================
// POS Auto Settlement Service (nightly background job)
//
// Lives in the API project (AppCore.Api\BackgroundJobs).
// Registered in Program.cs :
//     builder.Services.AddHostedService<PosAutoSettlementService>();
//
// • 2 minutes after the API starts : catches up the dates it
//   missed while it was down (the repository knows them from
//   PosAutoSettlementRuns).
// • Then every night at 23:59 Bangladesh time.
//
// What runs, and whether anything is posted, is decided by the
// repository and switch CFG-MOD-004-0054 (read on every run, so
// turning the switch ON / OFF needs no restart). A failed run is
// logged and tried again at the next wake-up; it never stops the
// API.
//===============================================================

public class PosAutoSettlementService : BackgroundService
{
    //===========================================================
    // Fields
    //===========================================================

    private static readonly TimeSpan StartDelay =
        TimeSpan.FromMinutes(2);

    private static readonly TimeSpan RunAt =
        new(23, 59, 0);

    private readonly IServiceScopeFactory _scopeFactory;

    private readonly ILogger<PosAutoSettlementService> _logger;

    // Tenancy : the work runs once per client company
    private readonly TenantScopes _tenants;


    //===========================================================
    // Constructor
    //===========================================================

    public PosAutoSettlementService(
        IServiceScopeFactory scopeFactory,
        ILogger<PosAutoSettlementService> logger,
        TenantScopes tenants)
    {
        _tenants = tenants;

        _scopeFactory = scopeFactory;

        _logger = logger;
    }


    //===========================================================
    // Loop
    //===========================================================

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
            // A fresh scope (own DbContext) for every run, once per
            // company (Tenancy : TenantScopes)
            await _tenants.ForEachAsync("POS Auto Settlement", async sp =>
            {
                IPosReconciliationsRepository repository =
                    sp.GetRequiredService<IPosReconciliationsRepository>();

                PosAutoSettlementResultDto result =
                    await repository.RunAutoSettlementAsync(stoppingToken);

                _logger.LogInformation(
                    "POS Auto Settlement {Tenant}: {Message}",
                    sp.GetRequiredService<ITenantContext>().Tenant?.TenantCode ?? string.Empty,
                    result.Message);
            }, stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Shutting down
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "POS Auto Settlement failed; it runs again at the next wake-up.");
        }
    }

    // From now to the next 23:59 Bangladesh time (+ a few
    // seconds, so the run sees 23:59 reached)
    private static TimeSpan UntilNextRun()
    {
        DateTime now =
            PosReconciliationsRepository.BusinessNow();

        DateTime next =
            now.Date + RunAt;

        if (now >= next)
        {
            next = next.AddDays(1);
        }

        return next - now + TimeSpan.FromSeconds(5);
    }
}