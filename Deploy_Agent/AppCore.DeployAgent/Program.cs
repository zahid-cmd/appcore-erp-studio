//===============================================================
// AppCore Deploy Agent
//
// A small service on the live server. The Deployment Center
// (AppCore Studio) talks to it over Tailscale:
//
//   GET  /agent/health            agent + live site status
//   GET  /agent/releases          releases on this server
//   POST /agent/deployments       upload a release package
//                                 -> starts a deployment job
//   POST /agent/rollback          switch back to a release
//   GET  /agent/jobs/{id}         live progress of a job
//
// Every call needs the header  X-Agent-Token: <token>
//
// Folders (BaseFolder, default C:\AppCore):
//   releases\R-0007\   one folder per release (never changed)
//   current            junction -> the live release
//   shared\            files copied into every release
//                      (appsettings.Production.json ...)
//   backups\           database backups (pg_dump)
//   incoming\          uploaded packages (deleted after use)
//   logs\              one log file per job
//===============================================================

using System.Collections.Concurrent;
using System.Diagnostics;
using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http.Features;

var builder =
    WebApplication.CreateBuilder(
        new WebApplicationOptions
        {
            Args = args,
            ContentRootPath = AppContext.BaseDirectory
        });

builder.Host.UseWindowsService(
    options => options.ServiceName = "AppCoreDeployAgent");

var settings =
    builder.Configuration
        .GetSection("Agent")
        .Get<AgentSettings>()
    ?? new AgentSettings();

builder.WebHost.UseUrls(
    settings.Urls);

// Release packages can be big (API + UI)
const long MaxPackageBytes = 1024L * 1024 * 1024;

builder.WebHost.ConfigureKestrel(
    kestrel => kestrel.Limits.MaxRequestBodySize = MaxPackageBytes);

builder.Services.Configure<FormOptions>(
    form => form.MultipartBodyLengthLimit = MaxPackageBytes);

builder.Services.AddSingleton(settings);
builder.Services.AddSingleton<Deployer>();

var app =
    builder.Build();


//===============================================================
// Token check (every request)
//===============================================================

app.Use(async (context, next) =>
{
    if
    (
        string.IsNullOrWhiteSpace(settings.Token)
        ||
        settings.Token == "CHANGE-ME"
    )
    {
        context.Response.StatusCode = 503;

        await context.Response.WriteAsJsonAsync(
            new { message = "The agent token is not configured on the server (appsettings.json, Agent:Token)." });

        return;
    }

    var given =
        context.Request.Headers["X-Agent-Token"].ToString();

    if (!TokenMatches(given, settings.Token))
    {
        context.Response.StatusCode = 401;

        await context.Response.WriteAsJsonAsync(
            new { message = "Invalid agent token." });

        return;
    }

    await next();
});


//===============================================================
// Endpoints
//===============================================================

app.MapGet(
    "/agent/health",
    (Deployer deployer) => Results.Ok(deployer.Health()));

app.MapGet(
    "/agent/releases",
    (Deployer deployer) => Results.Ok(deployer.Releases()));

app.MapGet(
    "/agent/jobs/{id}",
    (string id, Deployer deployer) =>
        deployer.GetJob(id) is { } job
            ? Results.Ok(job.Snapshot())
            : Results.NotFound(new { message = "Job not found." }));

app.MapPost(
    "/agent/deployments",
    async (HttpRequest request, Deployer deployer) =>
    {
        if (!request.HasFormContentType)
        {
            return Results.BadRequest(new { message = "Send the package as multipart/form-data." });
        }

        var form =
            await request.ReadFormAsync();

        var package =
            form.Files["package"];

        var release =
            form["release"].ToString().Trim();

        if (package is null || package.Length == 0)
        {
            return Results.BadRequest(new { message = "The release package (field 'package') is missing." });
        }

        if (!Deployer.ValidReleaseName(release))
        {
            return Results.BadRequest(new { message = "Release must look like R-0001." });
        }

        if (deployer.IsBusy)
        {
            return Results.Conflict(new { message = "Another deployment or rollback is running on this server." });
        }

        if (deployer.ReleaseExists(release))
        {
            return Results.Conflict(new { message = $"Release {release} already exists on this server." });
        }

        var zipPath =
            await deployer.SavePackageAsync(package, release);

        var job =
            deployer.StartDeployment(
                zipPath,
                release,
                form["commit"].ToString().Trim(),
                form["by"].ToString().Trim());

        return Results.Ok(new { jobId = job.Id });
    });

app.MapPost(
    "/agent/rollback",
    (RollbackRequest body, Deployer deployer) =>
    {
        if (!Deployer.ValidReleaseName(body.Release) || !deployer.ReleaseExists(body.Release))
        {
            return Results.BadRequest(new { message = "That release does not exist on this server." });
        }

        if (deployer.IsBusy)
        {
            return Results.Conflict(new { message = "Another deployment or rollback is running on this server." });
        }

        var job =
            deployer.StartRollback(
                body.Release,
                body.By ?? string.Empty);

        return Results.Ok(new { jobId = job.Id });
    });

app.Run();


//===============================================================
// Constant-time token compare
//===============================================================

static bool TokenMatches(string given, string expected)
{
    var a = Encoding.UTF8.GetBytes(given ?? string.Empty);
    var b = Encoding.UTF8.GetBytes(expected ?? string.Empty);

    return a.Length == b.Length
        && CryptographicOperations.FixedTimeEquals(a, b);
}


//===============================================================
// Settings (appsettings.json, section "Agent")
//===============================================================

public sealed class AgentSettings
{
    public string Token { get; set; } = "CHANGE-ME";

    // where the agent listens (firewall limits it to Tailscale)
    public string Urls { get; set; } = "http://0.0.0.0:5099";

    public string BaseFolder { get; set; } = @"C:\AppCore";

    // Windows service that runs AppCore ERP (created on the
    // first deployment if it does not exist)
    public string ServiceName { get; set; } = "AppCoreERP";

    // the exe inside a release
    public string AppExe { get; set; } = "AppCore.API.exe";

    // where AppCore ERP listens
    public string AppUrls { get; set; } = "http://0.0.0.0:8080";

    // checked after a switch; any answer below 500 = alive
    public string HealthUrl { get; set; } = "http://localhost:8080/";

    public int HealthWaitSeconds { get; set; } = 60;

    public int KeepReleases { get; set; } = 5;

    public int KeepBackups { get; set; } = 10;

    public bool BackupBeforeDeploy { get; set; } = true;

    public string PgDumpPath { get; set; } = @"C:\Program Files\PostgreSQL\18\bin\pg_dump.exe";

    public DatabaseSettings Database { get; set; } = new();
}

public sealed class DatabaseSettings
{
    public string Host { get; set; } = "localhost";

    public int Port { get; set; } = 5433;

    public string Name { get; set; } = "AppCoreERP_Studio";

    public string Username { get; set; } = "postgres";

    public string Password { get; set; } = string.Empty;
}

public sealed record RollbackRequest(string Release, string? By);


//===============================================================
// Job (deployment or rollback) with live progress
//===============================================================

public sealed class AgentJob
{
    private readonly object _gate = new();

    private readonly List<string> _log = new();

    private readonly string _logFile;

    public AgentJob(string kind, string release, string logFolder)
    {
        Id = Guid.NewGuid().ToString("N");
        Kind = kind;
        Release = release;
        StartedAt = DateTime.Now;

        _logFile =
            Path.Combine(
                logFolder,
                $"{StartedAt:yyyyMMdd_HHmmss}_{kind}_{release}.log");
    }

    public string Id { get; }

    public string Kind { get; }

    public string Release { get; }

    public DateTime StartedAt { get; }

    public DateTime? FinishedAt { get; private set; }

    // running | succeeded | failed | rolledback
    public string Status { get; private set; } = "running";

    public string Step { get; private set; } = "Starting";

    public int Percent { get; private set; }

    public string BackupFile { get; set; } = string.Empty;

    public string PreviousRelease { get; set; } = string.Empty;

    public void Progress(int percent, string step)
    {
        lock (_gate)
        {
            Percent = Math.Max(Percent, percent);
            Step = step;
        }

        Log(step + "...");
    }

    public void Log(string line)
    {
        var text = $"{DateTime.Now:HH:mm:ss}  {line}";

        lock (_gate)
        {
            _log.Add(text);
        }

        try
        {
            File.AppendAllText(_logFile, text + Environment.NewLine);
        }
        catch
        {
            // the log file is a convenience only
        }
    }

    public void Finish(string status, string step)
    {
        lock (_gate)
        {
            Status = status;
            Step = step;
            Percent = 100;
            FinishedAt = DateTime.Now;
        }

        Log($"[{status.ToUpperInvariant()}] {step}");
    }

    public object Snapshot()
    {
        lock (_gate)
        {
            return new
            {
                id = Id,
                kind = Kind,
                release = Release,
                status = Status,
                step = Step,
                percent = Percent,
                startedAt = StartedAt,
                finishedAt = FinishedAt,
                backupFile = BackupFile,
                previousRelease = PreviousRelease,
                log = _log.ToArray()
            };
        }
    }
}


//===============================================================
// Deployer
//===============================================================

public sealed class Deployer
{
    private static readonly Regex ReleaseName =
        new(@"^R-\d{4,}$", RegexOptions.Compiled);

    private readonly AgentSettings _settings;

    private readonly ConcurrentDictionary<string, AgentJob> _jobs = new();

    private int _busy;

    public Deployer(AgentSettings settings)
    {
        _settings = settings;

        foreach (var folder in new[] { ReleasesFolder, SharedFolder, BackupsFolder, IncomingFolder, LogsFolder })
        {
            Directory.CreateDirectory(folder);
        }
    }

    //-----------------------------------------------------------
    // Folders
    //-----------------------------------------------------------

    private string ReleasesFolder => Path.Combine(_settings.BaseFolder, "releases");

    private string CurrentLink => Path.Combine(_settings.BaseFolder, "current");

    private string SharedFolder => Path.Combine(_settings.BaseFolder, "shared");

    private string BackupsFolder => Path.Combine(_settings.BaseFolder, "backups");

    private string IncomingFolder => Path.Combine(_settings.BaseFolder, "incoming");

    private string LogsFolder => Path.Combine(_settings.BaseFolder, "logs");

    public bool IsBusy => Volatile.Read(ref _busy) == 1;

    public static bool ValidReleaseName(string? release) =>
        !string.IsNullOrWhiteSpace(release) && ReleaseName.IsMatch(release);

    public bool ReleaseExists(string release) =>
        Directory.Exists(Path.Combine(ReleasesFolder, release));

    public AgentJob? GetJob(string id) =>
        _jobs.TryGetValue(id, out var job) ? job : null;

    //-----------------------------------------------------------
    // Health
    //-----------------------------------------------------------

    public object Health()
    {
        double? freeGb = null;

        try
        {
            var drive = new DriveInfo(Path.GetPathRoot(Path.GetFullPath(_settings.BaseFolder))!);
            freeGb = Math.Round(drive.AvailableFreeSpace / 1024d / 1024 / 1024, 1);
        }
        catch
        {
            // not critical
        }

        return new
        {
            agentVersion = typeof(Deployer).Assembly.GetName().Version?.ToString(3) ?? "1.0.0",
            machine = Environment.MachineName,
            serverTime = DateTime.Now,
            diskFreeGb = freeGb,
            baseFolder = _settings.BaseFolder,
            serviceName = _settings.ServiceName,
            serviceStatus = ServiceStatus(),
            appUrls = _settings.AppUrls,
            currentRelease = CurrentRelease() ?? string.Empty,
            keepReleases = _settings.KeepReleases,
            backupBeforeDeploy = _settings.BackupBeforeDeploy,
            pgDumpFound = File.Exists(_settings.PgDumpPath),
            busy = IsBusy
        };
    }

    //-----------------------------------------------------------
    // Releases
    //-----------------------------------------------------------

    public object Releases()
    {
        var current = CurrentRelease();

        return Directory
            .GetDirectories(ReleasesFolder)
            .Select(path => new DirectoryInfo(path))
            .Where(dir => ValidReleaseName(dir.Name))
            .OrderByDescending(dir => dir.CreationTimeUtc)
            .Select(dir =>
            {
                var meta = ReadReleaseInfo(dir.FullName);

                return new
                {
                    release = dir.Name,
                    commit = meta?.Commit ?? string.Empty,
                    deployedBy = meta?.By ?? string.Empty,
                    createdAt = meta?.CreatedAt ?? dir.CreationTime,
                    isCurrent = string.Equals(dir.Name, current, StringComparison.OrdinalIgnoreCase)
                };
            })
            .ToList();
    }

    //-----------------------------------------------------------
    // Save uploaded package
    //-----------------------------------------------------------

    public async Task<string> SavePackageAsync(IFormFile package, string release)
    {
        var path =
            Path.Combine(
                IncomingFolder,
                $"{release}_{DateTime.Now:yyyyMMdd_HHmmss}.zip");

        await using var stream = File.Create(path);
        await package.CopyToAsync(stream);

        return path;
    }

    //-----------------------------------------------------------
    // Start jobs (one at a time)
    //-----------------------------------------------------------

    public AgentJob StartDeployment(string zipPath, string release, string commit, string by)
    {
        var job = BeginJob("deploy", release);

        _ = Task.Run(() => RunGuarded(job, () => DeployAsync(job, zipPath, commit, by)));

        return job;
    }

    public AgentJob StartRollback(string release, string by)
    {
        var job = BeginJob("rollback", release);

        _ = Task.Run(() => RunGuarded(job, () => RollbackAsync(job, by)));

        return job;
    }

    private AgentJob BeginJob(string kind, string release)
    {
        if (Interlocked.CompareExchange(ref _busy, 1, 0) != 0)
        {
            throw new InvalidOperationException("Another job is running.");
        }

        var job = new AgentJob(kind, release, LogsFolder);

        _jobs[job.Id] = job;

        // keep the last 50 jobs in memory
        foreach (var old in _jobs.Values.OrderByDescending(j => j.StartedAt).Skip(50))
        {
            _jobs.TryRemove(old.Id, out _);
        }

        return job;
    }

    private async Task RunGuarded(AgentJob job, Func<Task> work)
    {
        try
        {
            await work();
        }
        catch (Exception ex)
        {
            job.Log("ERROR: " + ex.Message);

            if (job.Status == "running")
            {
                job.Finish("failed", ex.Message);
            }
        }
        finally
        {
            Volatile.Write(ref _busy, 0);
        }
    }

    //-----------------------------------------------------------
    // Deployment
    //-----------------------------------------------------------

    private async Task DeployAsync(AgentJob job, string zipPath, string commit, string by)
    {
        var target = Path.Combine(ReleasesFolder, job.Release);
        var temp = target + ".tmp";

        try
        {
            // 1. Database backup : before anything changes
            if (_settings.BackupBeforeDeploy)
            {
                job.Progress(5, "Backing up the database");

                job.BackupFile = await BackupDatabaseAsync(job);

                job.Log("Backup saved: " + job.BackupFile);
            }

            // 2. Unpack into a temporary folder
            job.Progress(35, "Unpacking the release");

            if (Directory.Exists(temp))
            {
                Directory.Delete(temp, true);
            }

            ZipFile.ExtractToDirectory(zipPath, temp);

            if (!File.Exists(Path.Combine(temp, _settings.AppExe)))
            {
                throw new InvalidOperationException(
                    $"The package has no {_settings.AppExe} at its top level.");
            }

            // 3. Server-only files (live settings) into the release
            job.Progress(45, "Adding the server settings");

            CopyFolder(SharedFolder, temp);

            File.WriteAllText(
                Path.Combine(temp, "release.json"),
                JsonSerializer.Serialize(new ReleaseInfo(job.Release, commit, by, DateTime.Now)));

            Directory.Move(temp, target);

            // 4. Switch
            var previous = CurrentRelease();

            job.PreviousRelease = previous ?? string.Empty;

            try
            {
                await SwitchToAsync(job, job.Release, 55);
            }
            catch (Exception switchError) when (previous is not null)
            {
                // never leave the site down: put the old release back
                job.Log("Switch failed: " + switchError.Message);
                job.Log($"Going back to {previous}.");

                try
                {
                    await SwitchToAsync(job, previous, 85);
                }
                catch (Exception backError)
                {
                    throw new InvalidOperationException(
                        $"Switch failed ({switchError.Message}) and going back to {previous} also failed ({backError.Message}). Check the server.");
                }

                job.Finish("rolledback", $"Switch failed: {switchError.Message}. {previous} is live again.");
                return;
            }

            // 5. Health check (roll back on failure)
            job.Progress(80, "Checking the live site");

            if (!await IsHealthyAsync(job))
            {
                if (previous is null)
                {
                    job.Finish("failed", "The new release did not start and there is no earlier release to go back to.");
                    return;
                }

                job.Log($"The new release did not answer; going back to {previous}.");

                await SwitchToAsync(job, previous, 85);

                job.Finish("rolledback", $"The new release did not start; {previous} is live again.");
                return;
            }

            // 6. Tidy up
            job.Progress(92, "Removing old releases and backups");

            CleanUp(previous);

            job.Finish("succeeded", $"{job.Release} is live.");
        }
        finally
        {
            TryDelete(zipPath);

            if (Directory.Exists(temp))
            {
                try { Directory.Delete(temp, true); } catch { }
            }
        }
    }

    //-----------------------------------------------------------
    // Rollback
    //-----------------------------------------------------------

    private async Task RollbackAsync(AgentJob job, string by)
    {
        var previous = CurrentRelease();

        job.PreviousRelease = previous ?? string.Empty;

        job.Log($"Rollback to {job.Release} requested by {by}.");

        await SwitchToAsync(job, job.Release, 10);

        job.Progress(70, "Checking the live site");

        if (await IsHealthyAsync(job))
        {
            job.Finish("succeeded", $"{job.Release} is live.");
            return;
        }

        if (previous is not null && !string.Equals(previous, job.Release, StringComparison.OrdinalIgnoreCase))
        {
            job.Log($"{job.Release} did not answer; going back to {previous}.");

            await SwitchToAsync(job, previous, 85);

            job.Finish("rolledback", $"{job.Release} did not start; {previous} is live again.");
            return;
        }

        job.Finish("failed", $"{job.Release} did not start.");
    }

    //-----------------------------------------------------------
    // Stop service -> point "current" to the release -> start
    //-----------------------------------------------------------

    private async Task SwitchToAsync(AgentJob job, string release, int startPercent)
    {
        var target = Path.Combine(ReleasesFolder, release);

        job.Progress(startPercent, "Stopping the live site");

        await StopServiceAsync();

        job.Progress(startPercent + 5, $"Switching the live site to {release}");

        if (Directory.Exists(CurrentLink))
        {
            if (new DirectoryInfo(CurrentLink).LinkTarget is null)
            {
                throw new InvalidOperationException(
                    $"{CurrentLink} is a real folder, not a link. Move it away and try again.");
            }

            // removes the junction only, never the release
            Directory.Delete(CurrentLink);
        }

        var link = await RunAsync("cmd.exe", new[] { "/c", "mklink", "/J", CurrentLink, target }, null, TimeSpan.FromSeconds(30));

        if (link.ExitCode != 0)
        {
            throw new InvalidOperationException("Could not switch the live folder: " + link.Output);
        }

        job.Progress(startPercent + 10, "Starting the live site");

        await EnsureServiceAsync(job);

        await StartServiceAsync();
    }

    //-----------------------------------------------------------
    // Windows service (sc.exe)
    //-----------------------------------------------------------

    private string ServiceStatus()
    {
        var result = RunAsync("sc.exe", new[] { "query", _settings.ServiceName }, null, TimeSpan.FromSeconds(15))
            .GetAwaiter().GetResult();

        if (result.ExitCode != 0)
        {
            return "Not installed";
        }

        foreach (var state in new[] { "RUNNING", "STOPPED", "START_PENDING", "STOP_PENDING", "PAUSED" })
        {
            if (result.Output.Contains(state, StringComparison.OrdinalIgnoreCase))
            {
                return state.Replace('_', ' ').ToLowerInvariant();
            }
        }

        return "Unknown";
    }

    private async Task EnsureServiceAsync(AgentJob job)
    {
        if (ServiceStatus() != "Not installed")
        {
            return;
        }

        job.Log($"Creating the Windows service {_settings.ServiceName} (first deployment).");

        var exe = Path.Combine(CurrentLink, _settings.AppExe);

        var binPath =
            $"\"{exe}\" --urls {_settings.AppUrls} --environment Production --contentRoot \"{CurrentLink}\"";

        var create = await RunAsync(
            "sc.exe",
            new[] { "create", _settings.ServiceName, "binPath=", binPath, "start=", "auto", "DisplayName=", "AppCore ERP" },
            null,
            TimeSpan.FromSeconds(30));

        if (create.ExitCode != 0)
        {
            throw new InvalidOperationException("Could not create the Windows service: " + create.Output);
        }

        await RunAsync(
            "sc.exe",
            new[] { "failure", _settings.ServiceName, "reset=", "86400", "actions=", "restart/5000/restart/10000/restart/30000" },
            null,
            TimeSpan.FromSeconds(30));
    }

    private async Task StopServiceAsync()
    {
        if (ServiceStatus() is "Not installed" or "stopped")
        {
            return;
        }

        await RunAsync("sc.exe", new[] { "stop", _settings.ServiceName }, null, TimeSpan.FromSeconds(30));

        await WaitForStateAsync("stopped", TimeSpan.FromSeconds(60));

        // give Windows a moment to release the files
        await Task.Delay(1500);
    }

    private async Task StartServiceAsync()
    {
        var start = await RunAsync("sc.exe", new[] { "start", _settings.ServiceName }, null, TimeSpan.FromSeconds(30));

        if (start.ExitCode != 0 && !start.Output.Contains("1056"))
        {
            // 1056 = already running
            throw new InvalidOperationException("Could not start the live site: " + start.Output);
        }

        await WaitForStateAsync("running", TimeSpan.FromSeconds(60));
    }

    private async Task WaitForStateAsync(string state, TimeSpan timeout)
    {
        var until = DateTime.UtcNow + timeout;

        while (DateTime.UtcNow < until)
        {
            if (ServiceStatus() == state)
            {
                return;
            }

            await Task.Delay(1000);
        }

        throw new InvalidOperationException(
            $"The Windows service {_settings.ServiceName} did not reach '{state}' within {timeout.TotalSeconds:0} seconds.");
    }

    //-----------------------------------------------------------
    // Health check
    //-----------------------------------------------------------

    private async Task<bool> IsHealthyAsync(AgentJob job)
    {
        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };

        var until = DateTime.UtcNow.AddSeconds(_settings.HealthWaitSeconds);

        while (DateTime.UtcNow < until)
        {
            try
            {
                using var response = await http.GetAsync(_settings.HealthUrl);

                if ((int)response.StatusCode < 500)
                {
                    job.Log($"Live site answered {(int)response.StatusCode}.");
                    return true;
                }

                job.Log($"Live site answered {(int)response.StatusCode}; waiting...");
            }
            catch (Exception ex)
            {
                job.Log("Live site not answering yet: " + ex.Message);
            }

            await Task.Delay(3000);
        }

        return false;
    }

    //-----------------------------------------------------------
    // Database backup (pg_dump, custom format)
    //-----------------------------------------------------------

    private async Task<string> BackupDatabaseAsync(AgentJob job)
    {
        if (!File.Exists(_settings.PgDumpPath))
        {
            throw new InvalidOperationException(
                $"pg_dump was not found at {_settings.PgDumpPath}. Fix Agent:PgDumpPath in the agent settings.");
        }

        var db = _settings.Database;

        var file =
            Path.Combine(
                BackupsFolder,
                $"{db.Name}_{job.Release}_{DateTime.Now:yyyyMMdd_HHmmss}.dump");

        var result = await RunAsync(
            _settings.PgDumpPath,
            new[] { "-h", db.Host, "-p", db.Port.ToString(), "-U", db.Username, "-F", "c", "-f", file, db.Name },
            new Dictionary<string, string> { ["PGPASSWORD"] = db.Password },
            TimeSpan.FromMinutes(30));

        if (result.ExitCode != 0)
        {
            TryDelete(file);

            throw new InvalidOperationException("Database backup failed, nothing was changed: " + result.Output);
        }

        return file;
    }

    //-----------------------------------------------------------
    // Clean up: keep the newest releases / backups
    //-----------------------------------------------------------

    private void CleanUp(string? previous)
    {
        var current = CurrentRelease();

        var oldReleases = Directory
            .GetDirectories(ReleasesFolder)
            .Select(path => new DirectoryInfo(path))
            .Where(dir => ValidReleaseName(dir.Name))
            .OrderByDescending(dir => dir.CreationTimeUtc)
            .Skip(Math.Max(2, _settings.KeepReleases))
            .Where(dir => !string.Equals(dir.Name, current, StringComparison.OrdinalIgnoreCase)
                       && !string.Equals(dir.Name, previous, StringComparison.OrdinalIgnoreCase));

        foreach (var dir in oldReleases)
        {
            try { dir.Delete(true); } catch { }
        }

        var oldBackups = new DirectoryInfo(BackupsFolder)
            .GetFiles("*.dump")
            .OrderByDescending(file => file.CreationTimeUtc)
            .Skip(Math.Max(1, _settings.KeepBackups));

        foreach (var file in oldBackups)
        {
            try { file.Delete(); } catch { }
        }
    }

    //-----------------------------------------------------------
    // Helpers
    //-----------------------------------------------------------

    private string? CurrentRelease()
    {
        if (!Directory.Exists(CurrentLink))
        {
            return null;
        }

        var target = new DirectoryInfo(CurrentLink).LinkTarget;

        return string.IsNullOrWhiteSpace(target)
            ? null
            : new DirectoryInfo(target.TrimEnd('\\', '/')).Name;
    }

    private static ReleaseInfo? ReadReleaseInfo(string folder)
    {
        try
        {
            var path = Path.Combine(folder, "release.json");

            return File.Exists(path)
                ? JsonSerializer.Deserialize<ReleaseInfo>(File.ReadAllText(path))
                : null;
        }
        catch
        {
            return null;
        }
    }

    private static void CopyFolder(string source, string destination)
    {
        if (!Directory.Exists(source))
        {
            return;
        }

        foreach (var file in Directory.GetFiles(source, "*", SearchOption.AllDirectories))
        {
            var relative = Path.GetRelativePath(source, file);
            var to = Path.Combine(destination, relative);

            Directory.CreateDirectory(Path.GetDirectoryName(to)!);
            File.Copy(file, to, true);
        }
    }

    private static void TryDelete(string path)
    {
        try
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
        catch
        {
            // ignore
        }
    }

    private static async Task<(int ExitCode, string Output)> RunAsync(
        string file,
        string[] arguments,
        Dictionary<string, string>? environment,
        TimeSpan timeout)
    {
        using var process = new Process();

        process.StartInfo = new ProcessStartInfo
        {
            FileName = file,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        foreach (var argument in arguments)
        {
            process.StartInfo.ArgumentList.Add(argument);
        }

        if (environment is not null)
        {
            foreach (var pair in environment)
            {
                process.StartInfo.Environment[pair.Key] = pair.Value;
            }
        }

        process.Start();

        var output = process.StandardOutput.ReadToEndAsync();
        var error = process.StandardError.ReadToEndAsync();

        using var cancel = new CancellationTokenSource(timeout);

        try
        {
            await process.WaitForExitAsync(cancel.Token);
        }
        catch (OperationCanceledException)
        {
            try { process.Kill(true); } catch { }

            return (-1, $"{Path.GetFileName(file)} did not finish within {timeout.TotalMinutes:0.#} minutes.");
        }

        var text = ((await output) + Environment.NewLine + (await error)).Trim();

        return (process.ExitCode, text);
    }
}

public sealed record ReleaseInfo(string Release, string Commit, string By, DateTime CreatedAt);
