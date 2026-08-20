namespace AppCore.Infrastructure.Platform.BackendRebuildEngine;

public interface IBackendRebuildEngine
{
    Task RebuildAsync(
        CancellationToken cancellationToken = default);
}