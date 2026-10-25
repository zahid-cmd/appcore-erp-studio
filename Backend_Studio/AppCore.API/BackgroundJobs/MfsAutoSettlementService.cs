//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.AccountsFinance.AccountsReconciliation;
using AppCore.Infrastructure.Configurations.AccountsFinance.AccountsReconciliation;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.BackgroundJobs;


//===============================================================
// MFS Auto Settlement Service (nightly background job)
//
// Lives in the API project (AppCore.Api\BackgroundJobs).
// Registered in Program.cs :
//     builder.Services.AddHostedService<MfsAutoSettlementService>();
//
// • 1 minute after the API starts : catches up the dates it
//   missed while it was down (the repository knows them from
//   MfsAutoSettlementRuns).
// • Then every night at 23:59 Bangladesh time.
//
// What runs, and whether anything is posted, is decided by the
// repository and switch CFG-MOD-004-0051 (read on every run, so
// turning the switch ON / OFF needs no restart). A failed run is
// logged and tried again at the next wake-up; it never stops the
// API.
//===============================================================

public class MfsAutoSettlementService : BackgroundService
{
    //===========================================================
    // Fields
    //===========================================================

    private static readonly TimeSpan StartDelay =
        TimeSpan.FromMinutes(1);

    private static readonly TimeSpan RunAt =
        new(23, 59, 0);

    private readonly IServiceScopeFactory _scopeFactory;

    private readonly ILogger<MfsAutoSettlementService> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public MfsAutoSettlementService(
        IServiceScopeFactory scopeFactory,
        ILogger<MfsAutoSettlementService> logger)
    {
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
            // A fresh scope (own DbContext) for every run
            using IServiceScope scope =
                _scopeFactory.CreateScope();

            IMfsReconciliationsRepository repository =
                scope.ServiceProvider.GetRequiredService<IMfsReconciliationsRepository>();

            MfsAutoSettlementResultDto result =
                await repository.RunAutoSettlementAsync(stoppingToken);

            _logger.LogInformation(
                "MFS Auto Settlement : {Message}",
                result.Message);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Shutting down
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "MFS Auto Settlement failed; it runs again at the next wake-up.");
        }
    }

    // From now to the next 23:59 Bangladesh time (+ a few
    // seconds, so the run sees 23:59 reached)
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