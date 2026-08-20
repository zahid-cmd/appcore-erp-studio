using System.Diagnostics;
using System.Net.Http;

namespace AppCore.Infrastructure.Platform.FrontendRebuildEngine;

public sealed class FrontendRebuildEngine : IFrontendRebuildEngine
{
    private readonly FrontendRebuildOptions _options;

    public FrontendRebuildEngine(FrontendRebuildOptions options)
    {
        _options = options;
    }

    public async Task RebuildAsync(
        CancellationToken cancellationToken = default)
    {
        var projectPath = ResolveProjectPath();

        await StopAngularAsync(
            _options.Port,
            cancellationToken);

        StartAngular(projectPath);

        await WaitForAngularAsync(
            _options.Port,
            cancellationToken);
    }

    private async Task StopAngularAsync(
        int port,
        CancellationToken cancellationToken)
    {
        var processIds = await GetProcessIdsUsingPortAsync(
            port,
            cancellationToken);

        foreach (var processId in processIds)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                using var process = Process.GetProcessById(
                    processId);

                if (!process.HasExited)
                {
                    process.Kill(
                        entireProcessTree: true);

                    await process.WaitForExitAsync(
                        cancellationToken);
                }
            }
            catch (ArgumentException)
            {
                // Process already exited.
            }
            catch (InvalidOperationException)
            {
                // Process is no longer available.
            }
        }
    }

    private async Task<List<int>> GetProcessIdsUsingPortAsync(
        int port,
        CancellationToken cancellationToken)
    {
        var processIds = new List<int>();

        var startInfo = new ProcessStartInfo
        {
            FileName = "netstat.exe",
            Arguments = "-ano -p tcp",
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        };

        using var process = Process.Start(startInfo);

        if (process is null)
        {
            return processIds;
        }

        var output = await process.StandardOutput.ReadToEndAsync(
            cancellationToken);

        await process.WaitForExitAsync(
            cancellationToken);

        var portText = $":{port}";

        foreach (var line in output.Split(
            Environment.NewLine,
            StringSplitOptions.RemoveEmptyEntries))
        {
            cancellationToken.ThrowIfCancellationRequested();

            var parts = line.Split(
                ' ',
                StringSplitOptions.RemoveEmptyEntries);

            if (parts.Length < 5)
            {
                continue;
            }

            var localAddress = parts[1];
            var state = parts[3];
            var processIdText = parts[4];

            if (!localAddress.EndsWith(
                    portText,
                    StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (!state.Equals(
                    "LISTENING",
                    StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (int.TryParse(
                    processIdText,
                    out var processId))
            {
                if (!processIds.Contains(processId))
                {
                    processIds.Add(processId);
                }
            }
        }

        return processIds;
    }

    private void StartAngular(
        string projectPath)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = "/c npm start",
            WorkingDirectory = projectPath,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        Process.Start(startInfo);
    }

    private async Task WaitForAngularAsync(
        int port,
        CancellationToken cancellationToken)
    {
        using var httpClient = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(5)
        };

        var url = $"http://localhost:{port}";

        var timeout = TimeSpan.FromSeconds(
            _options.StartupTimeoutSeconds);

        var startTime = DateTime.UtcNow;

        while (DateTime.UtcNow - startTime < timeout)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                using var response = await httpClient.GetAsync(
                    url,
                    cancellationToken);

                if ((int)response.StatusCode < 500)
                {
                    return;
                }
            }
            catch
            {
                // Angular is still starting.
            }

            await Task.Delay(
                TimeSpan.FromSeconds(1),
                cancellationToken);
        }

        throw new TimeoutException(
            $"Angular development server did not start on port {port} within {_options.StartupTimeoutSeconds} seconds.");
    }

    private string ResolveProjectPath()
    {
        if (string.IsNullOrWhiteSpace(
                _options.ProjectPath))
        {
            throw new InvalidOperationException(
                "Frontend project path is not configured.");
        }

        var directory = new DirectoryInfo(
            Directory.GetCurrentDirectory());

        while (directory is not null)
        {
            var projectPath = Path.Combine(
                directory.FullName,
                _options.ProjectPath);

            if (Directory.Exists(projectPath))
            {
                return projectPath;
            }

            directory = directory.Parent;
        }

        throw new DirectoryNotFoundException(
            $"Frontend project directory was not found: {_options.ProjectPath}");
    }
}