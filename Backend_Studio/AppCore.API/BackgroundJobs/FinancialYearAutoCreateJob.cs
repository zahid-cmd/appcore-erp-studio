//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Settings.GeneralSettings;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.BackgroundJobs;

//===============================================================
// Financial Year Auto Create (background job)
//
// Registered in Program.cs :
//     builder.Services.AddHostedService<FinancialYearAutoCreateJob>();
//
// • 3 minutes after the API starts, then every hour : creates
//   the next financial year when switch CFG-MOD-003-0111 is ON
//   and its day has come (see FinancialYearAutoCreateService).
//   A day missed while the API was off runs at the next start.
// • Running it again does nothing once the year exists.
// • A failure is logged and never stops the API.
//===============================================================

public class FinancialYearAutoCreateJob : BackgroundService
{
    private static readonly TimeSpan StartDelay =
        TimeSpan.FromMinutes(3);

    private static readonly TimeSpan CheckEvery =
        TimeSpan.FromHours(1);

    private readonly IServiceScopeFactory _scopeFactory;

    private readonly ILogger<FinancialYearAutoCreateJob> _logger;

    public FinancialYearAutoCreateJob(
        IServiceScopeFactory scopeFactory,
        ILogger<FinancialYearAutoCreateJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
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
            await CheckOnceAsync(stoppingToken);

            try
            {
                await Task.Delay(CheckEvery, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }
        }
    }

    private async Task CheckOnceAsync(
        CancellationToken stoppingToken)
    {
        try
        {
            // A fresh scope (own DbContext) for every check
            using IServiceScope scope =
                _scopeFactory.CreateScope();

            IFinancialYearAutoCreateService service =
                scope.ServiceProvider.GetRequiredService<IFinancialYearAutoCreateService>();

            await service.RunIfDueAsync(stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Shutting down
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Financial year auto create check failed; it is tried again at the next check.");
        }
    }
}
