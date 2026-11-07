//===============================================================
// Namespaces
//===============================================================

using System.Collections.Concurrent;
using System.Diagnostics;
using System.IO.Compression;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using AppCore.Application.InfrastructureControl.CodeManagement;
using AppCore.Domain.Entities.InfrastructureControl.CodeManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InfrastructureControl.CodeManagement;


//===============================================================
// Deployment Runner
//
// Runs a deployment on THIS PC (the one running the API) and
// hands the result to the server's Deploy Agent:
//
//    0-5    check git (committed, pushed, up to date)
//    5-35   dotnet publish  (API, Release, win-x64)
//   35-65   ng build        (UI, production) -> API wwwroot
//   65-70   zip the release
//   70-80   upload to the agent
//   80-100  agent: database backup, install, switch, health
//           check (rolls back on its own if the site fails)
//
// One job at a time. Progress lives in memory (polled every
// second) and is saved to the record at each step.
//===============================================================

public static class DeploymentRunner
{
    private static readonly SemaphoreSlim Gate = new(1, 1);

    private static readonly ConcurrentDictionary<long, LiveJob> Live = new();

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private static int _cleanupDone;


    //===========================================================
    // Live job (in memory)
    //===========================================================

    private sealed class LiveJob
    {
        public readonly object Sync = new();

        public required DeploymentCenter Record;

        public readonly List<string> Lines = new();

        public readonly DateTime StartedUtc = DateTime.UtcNow;

        public bool Finished;

        public DateTime LastSaveUtc = DateTime.MinValue;

        public void Log(string line)
        {
            var text = $"{DateTime.Now:HH:mm:ss}  {line}";

            lock (Sync)
            {
                Lines.Add(text);

                // keep the log bounded (builds are chatty)
                if (Lines.Count > 3000)
                {
                    Lines.RemoveRange(0, Lines.Count - 3000);
                }
            }
        }

        public void Progress(int percent, string step)
        {
            lock (Sync)
            {
                Record.Percent = Math.Max(Record.Percent, Math.Clamp(percent, 0, 100));
                Record.Step = step;
            }

            Log("== " + step);
        }

        public void Creep(int toPercent)
        {
            lock (Sync)
            {
                if (Record.Percent < toPercent)
                {
                    Record.Percent += Math.Max(1, (toPercent - Record.Percent) / 20);
                }
            }
        }

        public DeploymentProgressDto Snapshot(int lastLines)
        {
            lock (Sync)
            {
                return new DeploymentProgressDto
                {
                    PublicId = Record.PublicId,
                    Code = Record.Code,
                    Kind = Record.Kind,
                    DeployStatus = Record.DeployStatus,
                    Step = Record.Step,
                    Percent = Record.Percent,
                    Finished = Finished,
                    ElapsedSeconds = (int)(DateTime.UtcNow - StartedUtc).TotalSeconds,
                    Log = Lines.Skip(Math.Max(0, Lines.Count - lastLines)).ToList()
                };
            }
        }

        public string FullLog()
        {
            lock (Sync)
            {
                return string.Join("\n", Lines);
            }
        }
    }


    //===========================================================
    // State
    //===========================================================

    public static long? RunningId =>
        Live.Values.FirstOrDefault(job => !job.Finished)?.Record.Id;

    public static Guid? RunningPublicId =>
        Live.Values.FirstOrDefault(job => !job.Finished)?.Record.PublicId;

    public static DeploymentProgressDto? GetLive(long id, int lastLines = 200) =>
        Live.TryGetValue(id, out var job) ? job.Snapshot(lastLines) : null;

    // once per API start : records left Running by a restart
    public static async Task CleanUpOnceAsync(IDeploymentCenterRepository repository)
    {
        if (Interlocked.Exchange(ref _cleanupDone, 1) == 0 && RunningId is null)
        {
            await repository.CloseInterruptedAsync();
        }
    }


    //===========================================================
    // Pre-flight (git)
    //===========================================================

    public static async Task<DeploymentPreflightDto> PreflightAsync(
        string repositoryPath,
        string branch,
        bool fetch,
        Action<string>? log = null)
    {
        var result = new DeploymentPreflightDto
        {
            RepositoryPath = repositoryPath,
            Branch = branch,
            RunningPublicId = RunningPublicId
        };

        if (string.IsNullOrWhiteSpace(repositoryPath) || !Directory.Exists(repositoryPath))
        {
            result.Problems.Add($"Repository folder not found: {repositoryPath}. Check Source Control.");
            return result;
        }

        var current = await GitAsync(repositoryPath, TimeSpan.FromSeconds(30), "rev-parse", "--abbrev-ref", "HEAD");

        if (current.ExitCode == 0 && !string.Equals(current.Output.Trim(), branch, StringComparison.OrdinalIgnoreCase))
        {
            result.Problems.Add($"The repository is on branch '{current.Output.Trim()}', Source Control expects '{branch}'.");
        }

        var status = await GitAsync(
            repositoryPath,
            TimeSpan.FromSeconds(60),
            "--no-optional-locks", "status", "--porcelain", "--ignore-submodules=all", "--", ".", ":(exclude)Master_ERP");

        if (status.ExitCode != 0)
        {
            result.Problems.Add("git status failed: " + status.Output);
            return result;
        }

        result.LocalChanges =
            status.Output.Split('\n', StringSplitOptions.RemoveEmptyEntries).Length;

        if (fetch)
        {
            log?.Invoke($"git fetch origin {branch}");

            var fetched = await GitAsync(
                repositoryPath,
                TimeSpan.FromMinutes(5),
                "-c", "submodule.recurse=false", "fetch", "origin", branch);

            if (fetched.ExitCode != 0)
            {
                result.Problems.Add("git fetch failed (network / GitHub sign-in?): " + fetched.Output);
            }
        }

        var counts = await GitAsync(
            repositoryPath,
            TimeSpan.FromSeconds(30),
            "rev-list", "--left-right", "--count", $"HEAD...origin/{branch}");

        if (counts.ExitCode == 0)
        {
            var parts = counts.Output.Split(new[] { '\t', ' ' }, StringSplitOptions.RemoveEmptyEntries);

            if (parts.Length == 2)
            {
                result.Ahead = int.TryParse(parts[0], out var a) ? a : 0;
                result.Behind = int.TryParse(parts[1], out var b) ? b : 0;
            }
        }

        var head = await GitAsync(repositoryPath, TimeSpan.FromSeconds(30), "log", "-1", "--format=%H%x1f%s");

        if (head.ExitCode == 0)
        {
            var parts = head.Output.Trim().Split('\u001f');

            result.CommitHash = parts[0];
            result.CommitMessage = parts.Length > 1 ? parts[1] : string.Empty;
        }

        if (result.LocalChanges > 0)
        {
            result.Problems.Add($"{result.LocalChanges} file(s) changed but not committed. Commit (and push) first.");
        }

        if (result.Ahead > 0)
        {
            result.Problems.Add($"{result.Ahead} commit(s) not pushed to GitHub. Push first.");
        }

        if (result.Behind > 0)
        {
            result.Problems.Add($"GitHub has {result.Behind} newer commit(s). Pull first.");
        }

        if (result.RunningPublicId is not null)
        {
            result.Problems.Add("A deployment or rollback is running now.");
        }

        result.Ready = result.Problems.Count == 0 && !string.IsNullOrEmpty(result.CommitHash);

        return result;
    }


    //===========================================================
    // Start a deployment
    //===========================================================

    public static async Task<(DeploymentCenter? Record, string? Error)> StartDeploymentAsync(
        IServiceScopeFactory scopes,
        IDeploymentCenterRepository repository,
        ServerManagement server,
        string token,
        string repositoryPath,
        string branch,
        string userName,
        string remarks)
    {
        if (!await Gate.WaitAsync(0))
        {
            return (null, "A deployment or rollback is running now. Wait for it to finish.");
        }

        try
        {
            var record = new DeploymentCenter
            {
                Code = await repository.GetNextReleaseAsync(),
                Kind = "Deploy",
                ServerManagementId = server.Id,
                ServerName = server.Name,
                Branch = branch,
                DeployStatus = "Running",
                Step = "Starting",
                StartedDate = DateTime.UtcNow,
                PerformedByName = userName,
                Remarks = remarks ?? string.Empty
            };

            record.Name = $"Deploy {record.Code} to {server.Name}";

            await repository.CreateAsync(record);

            var job = new LiveJob { Record = record };

            Live[record.Id] = job;

            ForgetOldJobs();

            _ = Task.Run(async () =>
            {
                try
                {
                    await RunDeploymentAsync(scopes, job, server, token, repositoryPath, branch, userName);
                }
                finally
                {
                    Gate.Release();
                }
            });

            return (record, null);
        }
        catch
        {
            Gate.Release();
            throw;
        }
    }


    //===========================================================
    // Start a rollback
    //===========================================================

    public static async Task<(DeploymentCenter? Record, string? Error)> StartRollbackAsync(
        IServiceScopeFactory scopes,
        IDeploymentCenterRepository repository,
        ServerManagement server,
        string token,
        string release,
        string userName,
        string remarks)
    {
        if (!await Gate.WaitAsync(0))
        {
            return (null, "A deployment or rollback is running now. Wait for it to finish.");
        }

        try
        {
            var record = new DeploymentCenter
            {
                Code = release,
                Name = $"Roll back {server.Name} to {release}",
                Kind = "Rollback",
                ServerManagementId = server.Id,
                ServerName = server.Name,
                DeployStatus = "Running",
                Step = "Starting",
                StartedDate = DateTime.UtcNow,
                PerformedByName = userName,
                Remarks = remarks ?? string.Empty
            };

            await repository.CreateAsync(record);

            var job = new LiveJob { Record = record };

            Live[record.Id] = job;

            ForgetOldJobs();

            _ = Task.Run(async () =>
            {
                try
                {
                    await RunRollbackAsync(scopes, job, server, token, release, userName);
                }
                finally
                {
                    Gate.Release();
                }
            });

            return (record, null);
        }
        catch
        {
            Gate.Release();
            throw;
        }
    }


    //===========================================================
    // Deployment steps
    //===========================================================

    private static async Task RunDeploymentAsync(
        IServiceScopeFactory scopes,
        LiveJob job,
        ServerManagement server,
        string token,
        string repositoryPath,
        string branch,
        string userName)
    {
        var record = job.Record;

        var stage =
            Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "AppCoreDeploy",
                record.Code);

        try
        {
            //---------------------------------------------------
            // 0. git
            //---------------------------------------------------

            job.Progress(1, "Checking the repository (committed, pushed, up to date)");

            await SaveAsync(scopes, job, force: true);

            var check = await PreflightAsync(repositoryPath, branch, fetch: true, log: job.Log);

            // this job itself counts as "running" : ignore that problem
            check.Problems.RemoveAll(p => p.StartsWith("A deployment or rollback is running"));

            record.CommitHash = check.CommitHash;
            record.CommitMessage = Cut(check.CommitMessage, 500);

            if (check.Problems.Count > 0 || string.IsNullOrEmpty(check.CommitHash))
            {
                foreach (var problem in check.Problems)
                {
                    job.Log("PROBLEM: " + problem);
                }

                await FinishAsync(scopes, job, "Failed", "Not deployed: " + string.Join(" ", check.Problems));
                return;
            }

            record.Name = Cut($"{record.Code}: {check.CommitMessage}", 200);

            job.Log($"Commit {check.CommitHash} \"{check.CommitMessage}\" on {branch}");

            //---------------------------------------------------
            // 1. API
            //---------------------------------------------------

            if (Directory.Exists(stage))
            {
                Directory.Delete(stage, true);
            }

            var appFolder = Path.Combine(stage, "app");
            var uiFolder = Path.Combine(stage, "ui");

            job.Progress(5, "Building the API (dotnet publish, Release)");

            await SaveAsync(scopes, job, force: true);

            var apiProject =
                Path.Combine(repositoryPath, "Backend_Studio", "AppCore.API", "AppCore.API.csproj");

            var api = await RunStepAsync(
                job,
                scopes,
                34,
                TimeSpan.FromMinutes(20),
                "dotnet",
                new[] { "publish", apiProject, "-c", "Release", "-r", "win-x64", "--self-contained", "false", "-o", appFolder, "--nologo" },
                Path.GetDirectoryName(apiProject)!,
                null);

            if (api != 0 || !File.Exists(Path.Combine(appFolder, "AppCore.API.exe")))
            {
                await FinishAsync(scopes, job, "Failed", "The API build failed (see the log).");
                return;
            }

            //---------------------------------------------------
            // 2. UI
            //---------------------------------------------------

            job.Progress(35, "Building the UI (ng build, production)");

            await SaveAsync(scopes, job, force: true);

            var uiProject =
                Path.Combine(repositoryPath, "Frontend_Studio", "Studio_UI");

            var ui = await RunStepAsync(
                job,
                scopes,
                64,
                TimeSpan.FromMinutes(25),
                "cmd.exe",
                new[] { "/c", "npx", "ng", "build", "--configuration", "production", "--output-path", uiFolder },
                uiProject,
                new Dictionary<string, string> { ["NG_CLI_ANALYTICS"] = "false", ["CI"] = "true" });

            var uiBrowser =
                Directory.Exists(Path.Combine(uiFolder, "browser"))
                    ? Path.Combine(uiFolder, "browser")
                    : uiFolder;

            if (ui != 0 || !File.Exists(Path.Combine(uiBrowser, "index.html")))
            {
                await FinishAsync(scopes, job, "Failed", "The UI build failed (see the log).");
                return;
            }

            //---------------------------------------------------
            // 3. Package
            //---------------------------------------------------

            job.Progress(65, "Packing the release");

            var wwwroot = Path.Combine(appFolder, "wwwroot");

            // pictures come from StoredFiles on the server; local
            // uploads are not shipped
            var uploads = Path.Combine(wwwroot, "uploads");

            if (Directory.Exists(uploads))
            {
                Directory.Delete(uploads, true);
            }

            CopyFolder(uiBrowser, wwwroot);

            // development settings never go to a server
            foreach (var file in Directory.GetFiles(appFolder, "appsettings.Development*.json"))
            {
                File.Delete(file);
            }

            var zipPath = Path.Combine(stage, $"{record.Code}.zip");

            ZipFile.CreateFromDirectory(appFolder, zipPath, CompressionLevel.Optimal, includeBaseDirectory: false);

            record.PackageMb = Math.Round(new FileInfo(zipPath).Length / 1024m / 1024m, 2);

            job.Log($"Package {record.PackageMb} MB");

            //---------------------------------------------------
            // 4. Upload
            //---------------------------------------------------

            job.Progress(70, $"Sending {record.PackageMb} MB to {server.Name}");

            await SaveAsync(scopes, job, force: true);

            var client = new DeployAgentClient(server.HostAddress, server.AgentPort, token);

            string jobId;

            await using (var file = File.OpenRead(zipPath))
            {
                var total = file.Length;
                var lastShown = -1;

                var progress = new ProgressStream(
                    file,
                    sent =>
                    {
                        var share = (int)(sent * 100 / Math.Max(1, total));

                        if (share / 5 != lastShown / 5)
                        {
                            lastShown = share;

                            lock (job.Sync)
                            {
                                job.Record.Percent = Math.Max(job.Record.Percent, 70 + share / 10);
                                job.Record.Step = $"Sending {record.PackageMb} MB to {server.Name} ({share}%)";
                            }
                        }
                    });

                using var form = new MultipartFormDataContent();

                var content = new StreamContent(progress, 81920);

                content.Headers.ContentType = new MediaTypeHeaderValue("application/zip");

                form.Add(content, "package", $"{record.Code}.zip");
                form.Add(new StringContent(record.Code), "release");
                form.Add(new StringContent(record.CommitHash), "commit");
                form.Add(new StringContent(userName), "by");

                var (ok, statusCode, body) = await client.PostFormAsync("/agent/deployments", form, TimeSpan.FromMinutes(60));

                if (!ok)
                {
                    await FinishAsync(
                        scopes,
                        job,
                        "Failed",
                        $"The server refused the release ({statusCode}): {DeployAgentClient.MessageOf(body) ?? body}");
                    return;
                }

                jobId = ReadString(body, "jobId");
            }

            record.AgentJobId = jobId;

            job.Log($"Agent job {jobId}");

            //---------------------------------------------------
            // 5. Agent work
            //---------------------------------------------------

            await FollowAgentJobAsync(scopes, job, client, jobId, 80, 100);

            await RefreshServerAsync(scopes, server, client);
        }
        catch (Exception ex)
        {
            job.Log("ERROR: " + ex.Message);

            await FinishAsync(scopes, job, "Failed", "Stopped: " + ex.Message);
        }
        finally
        {
            try
            {
                if (Directory.Exists(stage))
                {
                    Directory.Delete(stage, true);
                }
            }
            catch
            {
                // a locked temp folder is not a problem
            }
        }
    }


    //===========================================================
    // Rollback steps
    //===========================================================

    private static async Task RunRollbackAsync(
        IServiceScopeFactory scopes,
        LiveJob job,
        ServerManagement server,
        string token,
        string release,
        string userName)
    {
        try
        {
            job.Progress(5, $"Asking {server.Name} to switch back to {release}");

            await SaveAsync(scopes, job, force: true);

            var client = new DeployAgentClient(server.HostAddress, server.AgentPort, token);

            var (ok, statusCode, body) = await client.PostJsonAsync(
                "/agent/rollback",
                new { release, by = userName },
                TimeSpan.FromMinutes(2));

            if (!ok)
            {
                await FinishAsync(
                    scopes,
                    job,
                    "Failed",
                    $"The server refused the rollback ({statusCode}): {DeployAgentClient.MessageOf(body) ?? body}");
                return;
            }

            var jobId = ReadString(body, "jobId");

            job.Record.AgentJobId = jobId;

            await FollowAgentJobAsync(scopes, job, client, jobId, 10, 100);

            await RefreshServerAsync(scopes, server, client);
        }
        catch (Exception ex)
        {
            job.Log("ERROR: " + ex.Message);

            await FinishAsync(scopes, job, "Failed", "Stopped: " + ex.Message);
        }
    }


    //===========================================================
    // Follow the agent's job until it ends
    //===========================================================

    private static async Task FollowAgentJobAsync(
        IServiceScopeFactory scopes,
        LiveJob job,
        DeployAgentClient client,
        string jobId,
        int from,
        int to)
    {
        var seenLines = 0;
        var lastContact = DateTime.UtcNow;
        var until = DateTime.UtcNow.AddMinutes(90);

        while (DateTime.UtcNow < until)
        {
            await Task.Delay(2000);

            AgentJobView? view = null;

            try
            {
                var (ok, _, body) = await client.GetAsync($"/agent/jobs/{jobId}", TimeSpan.FromSeconds(20));

                if (ok)
                {
                    view = JsonSerializer.Deserialize<AgentJobView>(body, Json);
                    lastContact = DateTime.UtcNow;
                }
            }
            catch
            {
                // network hiccup : try again
            }

            if (view is null)
            {
                if (DateTime.UtcNow - lastContact > TimeSpan.FromMinutes(3))
                {
                    await FinishAsync(
                        scopes,
                        job,
                        "Failed",
                        "Lost contact with the server for 3 minutes. Check the server: Test Connection and the Releases tab show what is live.");
                    return;
                }

                continue;
            }

            foreach (var line in view.Log.Skip(seenLines))
            {
                job.Log("[server] " + line);
            }

            seenLines = view.Log.Length;

            lock (job.Sync)
            {
                job.Record.Percent = Math.Max(job.Record.Percent, from + (to - from) * Math.Clamp(view.Percent, 0, 100) / 100);
                job.Record.Step = view.Step;

                if (!string.IsNullOrEmpty(view.BackupFile))
                {
                    job.Record.BackupFile = view.BackupFile;
                }

                if (!string.IsNullOrEmpty(view.PreviousRelease))
                {
                    job.Record.PreviousRelease = view.PreviousRelease;
                }
            }

            await SaveAsync(scopes, job, force: false);

            if (view.Status != "running")
            {
                var status = view.Status switch
                {
                    "succeeded" => "Succeeded",
                    "rolledback" => "Rolled back",
                    _ => "Failed"
                };

                await FinishAsync(scopes, job, status, view.Step);
                return;
            }
        }

        await FinishAsync(scopes, job, "Failed", "The server did not finish within 90 minutes.");
    }

    private sealed class AgentJobView
    {
        public string Status { get; set; } = "running";
        public string Step { get; set; } = string.Empty;
        public int Percent { get; set; }
        public string BackupFile { get; set; } = string.Empty;
        public string PreviousRelease { get; set; } = string.Empty;
        public string[] Log { get; set; } = Array.Empty<string>();
    }


    //===========================================================
    // Run one build command, streaming its output to the log
    //===========================================================

    private static async Task<int> RunStepAsync(
        LiveJob job,
        IServiceScopeFactory scopes,
        int creepTo,
        TimeSpan timeout,
        string file,
        string[] arguments,
        string workingDirectory,
        Dictionary<string, string>? environment)
    {
        using var process = new Process();

        process.StartInfo = new ProcessStartInfo
        {
            FileName = file,
            WorkingDirectory = workingDirectory,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            RedirectStandardInput = true,
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

        job.Log($"> {Path.GetFileName(file)} {string.Join(" ", arguments)}");

        process.OutputDataReceived += (_, e) =>
        {
            if (!string.IsNullOrWhiteSpace(e.Data))
            {
                job.Log(e.Data);
            }
        };

        process.ErrorDataReceived += (_, e) =>
        {
            if (!string.IsNullOrWhiteSpace(e.Data))
            {
                job.Log(e.Data);
            }
        };

        process.Start();
        process.StandardInput.Close();
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();

        var until = DateTime.UtcNow + timeout;

        while (!process.HasExited)
        {
            await Task.WhenAny(process.WaitForExitAsync(), Task.Delay(2000));

            job.Creep(creepTo);

            await SaveAsync(scopes, job, force: false);

            if (DateTime.UtcNow > until && !process.HasExited)
            {
                try { process.Kill(true); } catch { }

                job.Log($"Stopped after {timeout.TotalMinutes:0} minutes.");

                return -1;
            }
        }

        await process.WaitForExitAsync();

        job.Log($"Exit code {process.ExitCode}");

        return process.ExitCode;
    }


    //===========================================================
    // Save / Finish
    //===========================================================

    private static async Task SaveAsync(IServiceScopeFactory scopes, LiveJob job, bool force)
    {
        if (!force && DateTime.UtcNow - job.LastSaveUtc < TimeSpan.FromSeconds(5))
        {
            return;
        }

        job.LastSaveUtc = DateTime.UtcNow;

        DeploymentCenter copy;

        lock (job.Sync)
        {
            copy = Copy(job.Record);
        }

        copy.Log = job.FullLog();

        try
        {
            using var scope = scopes.CreateScope();

            await scope.ServiceProvider
                .GetRequiredService<IDeploymentCenterRepository>()
                .SaveProgressAsync(copy);
        }
        catch (Exception ex)
        {
            job.Log("(could not save progress: " + ex.Message + ")");
        }
    }

    private static async Task FinishAsync(IServiceScopeFactory scopes, LiveJob job, string status, string step)
    {
        lock (job.Sync)
        {
            job.Record.DeployStatus = status;
            job.Record.Step = Cut(step, 300);
            job.Record.Percent = 100;
            job.Record.FinishedDate = DateTime.UtcNow;
            job.Record.DurationSeconds = (int)(DateTime.UtcNow - job.StartedUtc).TotalSeconds;
        }

        job.Log($"[{status.ToUpperInvariant()}] {step}");

        await SaveAsync(scopes, job, force: true);

        job.Finished = true;
    }

    private static async Task RefreshServerAsync(IServiceScopeFactory scopes, ServerManagement server, DeployAgentClient client)
    {
        try
        {
            var health = await client.TestAsync();

            using var scope = scopes.CreateScope();

            await scope.ServiceProvider
                .GetRequiredService<IServerManagementRepository>()
                .SaveCheckResultAsync(server.Id, health);
        }
        catch
        {
            // the server page can be refreshed by hand
        }
    }


    //===========================================================
    // Helpers
    //===========================================================

    private static void ForgetOldJobs()
    {
        foreach (var old in Live.Values
                     .Where(job => job.Finished)
                     .OrderByDescending(job => job.StartedUtc)
                     .Skip(10)
                     .ToList())
        {
            Live.TryRemove(old.Record.Id, out _);
        }
    }

    private static DeploymentCenter Copy(DeploymentCenter x) => new()
    {
        Id = x.Id,
        PublicId = x.PublicId,
        Code = x.Code,
        Name = x.Name,
        Kind = x.Kind,
        ServerManagementId = x.ServerManagementId,
        ServerName = x.ServerName,
        DeployStatus = x.DeployStatus,
        Step = x.Step,
        Percent = x.Percent,
        AgentJobId = x.AgentJobId,
        BackupFile = x.BackupFile,
        PreviousRelease = x.PreviousRelease,
        PackageMb = x.PackageMb,
        StartedDate = x.StartedDate,
        FinishedDate = x.FinishedDate,
        DurationSeconds = x.DurationSeconds,
        Branch = x.Branch,
        CommitHash = x.CommitHash,
        CommitMessage = x.CommitMessage,
        PerformedByName = x.PerformedByName,
        Remarks = x.Remarks
    };

    private static void CopyFolder(string source, string destination)
    {
        foreach (var file in Directory.GetFiles(source, "*", SearchOption.AllDirectories))
        {
            var to = Path.Combine(destination, Path.GetRelativePath(source, file));

            Directory.CreateDirectory(Path.GetDirectoryName(to)!);
            File.Copy(file, to, true);
        }
    }

    private static string ReadString(string body, string property)
    {
        try
        {
            using var doc = JsonDocument.Parse(body);

            return doc.RootElement.TryGetProperty(property, out var value)
                ? value.GetString() ?? string.Empty
                : string.Empty;
        }
        catch
        {
            return string.Empty;
        }
    }

    private static string Cut(string? text, int max)
    {
        text ??= string.Empty;

        return text.Length <= max ? text : text.Substring(0, max);
    }

    private static async Task<(int ExitCode, string Output)> GitAsync(string repositoryPath, TimeSpan timeout, params string[] arguments)
    {
        using var process = new Process();

        process.StartInfo = new ProcessStartInfo
        {
            FileName = "git",
            WorkingDirectory = repositoryPath,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            RedirectStandardInput = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        process.StartInfo.Environment["GIT_TERMINAL_PROMPT"] = "0";

        foreach (var argument in arguments)
        {
            process.StartInfo.ArgumentList.Add(argument);
        }

        process.Start();
        process.StandardInput.Close();

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

            return (-1, $"git {arguments.FirstOrDefault(a => !a.StartsWith('-'))} did not finish in time.");
        }

        var text = await output;
        var err = await error;

        return (process.ExitCode, process.ExitCode == 0 ? text : (text + "\n" + err).Trim());
    }


    //===========================================================
    // Upload progress
    //===========================================================

    private sealed class ProgressStream : Stream
    {
        private readonly Stream _inner;
        private readonly Action<long> _report;
        private long _sent;

        public ProgressStream(Stream inner, Action<long> report)
        {
            _inner = inner;
            _report = report;
        }

        public override bool CanRead => true;
        public override bool CanSeek => _inner.CanSeek;
        public override bool CanWrite => false;
        public override long Length => _inner.Length;

        public override long Position
        {
            get => _inner.Position;
            set => _inner.Position = value;
        }

        public override int Read(byte[] buffer, int offset, int count)
        {
            var read = _inner.Read(buffer, offset, count);
            Report(read);
            return read;
        }

        public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
        {
            var read = await _inner.ReadAsync(buffer, cancellationToken);
            Report(read);
            return read;
        }

        public override async Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
        {
            var read = await _inner.ReadAsync(buffer.AsMemory(offset, count), cancellationToken);
            Report(read);
            return read;
        }

        private void Report(int read)
        {
            if (read > 0)
            {
                _sent += read;
                _report(_sent);
            }
        }

        public override void Flush() { }
        public override long Seek(long offset, SeekOrigin origin) => _inner.Seek(offset, origin);
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
    }
}
