namespace AppCore.Infrastructure.Platform.FrontendRebuildEngine;

public interface IFrontendRebuildEngine
{
    Task RebuildAsync(CancellationToken cancellationToken = default);
}