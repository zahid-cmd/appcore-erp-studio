namespace AppCore.Infrastructure.Platform.BackendRebuildEngine;

public sealed class BackendRebuildOptions
{
    public string ProjectPath { get; set; } = string.Empty;

    public int Port { get; set; }

    public int BuildTimeoutSeconds { get; set; } = 120;

    public int StartupTimeoutSeconds { get; set; } = 60;
}