//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Platform.DataManagement;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.BackgroundJobs;

//===============================================================
// Nightly Backup Service (background job)
//
// Registered in Program.cs :
//     builder.Services.AddHostedService<NightlyBackupService>();
//
// • 2 minutes after the API starts, then every 5 minutes : asks
//   the Data Management service to run the App database's
//   scheduled backup when its slot (default 00:30 Bangladesh
//   time) is due and not done yet. So a night missed while the
//   API was off runs at the next start.
// • On / off, time and keep counts : Database Backups › Settings
//   (read on every check, no restart needed).
// • A failure is written to Reset History and raises the alert
//   (dashboard, bell); it never stops the API.
//===============================================================

public class NightlyBackupService : BackgroundService
{
    private static readonly TimeSpan StartDelay =
        TimeSpan.FromMinutes(2);

    private static readonly TimeSpan CheckEvery =
        TimeSpan.FromMinutes(5);

    private readonly IServiceScopeFactory _scopeFactory;

    private readonly ILogger<NightlyBackupService> _logger;

    public NightlyBackupService(
        IServiceScopeFactory scopeFactory,
        ILogger<NightlyBackupService> logger)
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

            IDataManagementService service =
                scope.ServiceProvider.GetRequiredService<IDataManagementService>();

            bool ran =
                await service.RunScheduledIfDueAsync(stoppingToken);

            if (ran)
            {
                _logger.LogInformation("Nightly backup : a scheduled backup ran (see Reset History).");
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Shutting down
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Nightly backup check failed; it is tried again at the next check.");
        }
    }
}
