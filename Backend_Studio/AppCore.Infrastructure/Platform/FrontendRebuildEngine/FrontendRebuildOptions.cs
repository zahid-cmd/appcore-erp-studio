namespace AppCore.Infrastructure.Platform.FrontendRebuildEngine;

public sealed class FrontendRebuildOptions
{
    public string ProjectPath { get; set; } = string.Empty;

    public int Port { get; set; } = 4100;

    public int StartupTimeoutSeconds { get; set; } = 60;
}