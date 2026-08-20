using System.Diagnostics;

namespace AppCore.Infrastructure.Platform.BackendRebuildEngine;

public sealed class BackendRebuildEngine : IBackendRebuildEngine
{
    private readonly BackendRebuildOptions _options;

    public BackendRebuildEngine(
        BackendRebuildOptions options)
    {
        _options = options;
    }

    public async Task RebuildAsync(
        CancellationToken cancellationToken = default)
    {
        ValidateOptions();

        await BuildBackendAsync(
            cancellationToken);
    }

    private async Task BuildBackendAsync(
        CancellationToken cancellationToken)
    {
        var startInfo =
            new ProcessStartInfo
            {
                FileName = "dotnet",

                Arguments = "build",

                WorkingDirectory =
                    _options.ProjectPath,

                UseShellExecute = false,

                CreateNoWindow = true
            };

        using var process =
            Process.Start(startInfo);

        if (process is null)
        {
            throw new InvalidOperationException(
                "Unable to start the backend build process.");
        }

        var processTask =
            process.WaitForExitAsync(
                cancellationToken);

        var timeoutTask =
            Task.Delay(
                TimeSpan.FromSeconds(
                    _options.BuildTimeoutSeconds));

        var completedTask =
            await Task.WhenAny(
                processTask,
                timeoutTask);

        cancellationToken.ThrowIfCancellationRequested();

        if
        (
            completedTask == timeoutTask
        )
        {
            try
            {
                if (!process.HasExited)
                {
                    process.Kill(
                        entireProcessTree: true);
                }
            }
            catch
            {
                // Ignore process cleanup errors.
            }

            throw new TimeoutException(
                $"Backend build did not complete within {_options.BuildTimeoutSeconds} seconds.");
        }

        await processTask;

        if (process.ExitCode != 0)
        {
            throw new InvalidOperationException(
                "Backend build failed.");
        }
    }

    private void ValidateOptions()
    {
        if
        (
            string.IsNullOrWhiteSpace(
                _options.ProjectPath)
        )
        {
            throw new InvalidOperationException(
                "Backend project path is not configured.");
        }

        if
        (
            !Directory.Exists(
                _options.ProjectPath)
        )
        {
            throw new DirectoryNotFoundException(
                $"Backend project directory was not found: {_options.ProjectPath}");
        }

        if
        (
            _options.BuildTimeoutSeconds <= 0
        )
        {
            throw new InvalidOperationException(
                "Backend build timeout must be greater than zero.");
        }
    }
}