//===============================================================
// Server security from the Console (2026-11-21, review notes 3m)
//
//   GET  /agent/security      who runs each service, are the
//                             folders closed, the "no company"
//                             list of the ERP, the last job
//   POST /agent/security      { step : console | erp | lock | back }
//                             runs secure-services.cmd <step>
//                             (same file an administrator can run
//                             by hand; it checks and undoes itself)
//   POST /agent/no-company    { mode : Refuse | Warn | Auto }
//
// Tenancy:NoCompany of the ERP is set as an environment value of
// its Windows service (Tenancy__NoCompany), never in its settings
// file; the ERP is restarted and asked if it answers. Not healthy :
// the value is put back and the ERP restarted again.
//
// By itself : the ERP keeps no-company.json (what asked for the
// database with no company, and when). After NoCompanyCleanDays
// (7) with nothing in it, the agent sets Refuse at the quiet hour
// (NoCompanyAutoHour, 3 to 5 at night). A failed try, or "Warn"
// asked by a person, stops this until "Auto" is asked again.
//===============================================================

using System.Runtime.Versioning;
using System.Security.AccessControl;
using System.Text.Json;

using Microsoft.Win32;

[assembly: SupportedOSPlatform("windows")]

public sealed record SecurityRequest(string? Step, string? By);

public sealed record NoCompanyRequest(string? Mode, string? By);

public sealed class ServerSecurity
{
    private const string EnvName = "Tenancy__NoCompany";

    private static readonly string[] Steps = { "console", "erp", "lock", "back" };

    private static readonly JsonSerializerOptions Json =
        new() { PropertyNameCaseInsensitive = true, WriteIndented = true };

    private readonly AgentSettings _settings;

    private readonly Deployers _deployers;

    private AgentJob? _lastJob;

    public ServerSecurity(AgentSettings settings, Deployers deployers)
    {
        _settings = settings;
        _deployers = deployers;
    }

    private string Script => Path.Combine(AppContext.BaseDirectory, "secure-services.cmd");

    private string StateFile => Path.Combine(_settings.BaseFolder, "agent-no-company.json");

    //-----------------------------------------------------------
    // Status
    //-----------------------------------------------------------

    public async Task<object> StatusAsync()
    {
        var names = new List<string> { _settings.ServiceName, "AppCoreDeployAgent" };

        if (_settings.Console.Enabled)
        {
            names.Insert(0, _settings.Console.ServiceName);
        }

        var services = new List<object>();

        foreach (var name in names)
        {
            services.Add(new { name, account = await AccountOfAsync(name) });
        }

        bool? locked = null;

        try
        {
            locked = new DirectoryInfo(_settings.BaseFolder).GetAccessControl().AreAccessRulesProtected;
        }
        catch
        {
            // not known
        }

        return new
        {
            scriptFound = File.Exists(Script),
            services,
            folder = _settings.BaseFolder,
            foldersLocked = locked,
            busy = _deployers.Get("erp")?.IsBusy == true || _deployers.Get("console")?.IsBusy == true,
            lastJob = _lastJob?.Snapshot(),
            noCompany = NoCompanyStatus()
        };
    }

    private static async Task<string> AccountOfAsync(string service)
    {
        var qc = await Deployer.RunAsync("sc.exe", new[] { "qc", service }, null, TimeSpan.FromSeconds(15));

        if (qc.ExitCode != 0)
        {
            return "(no such service)";
        }

        foreach (var line in qc.Output.Split('\n'))
        {
            int at = line.IndexOf("SERVICE_START_NAME", StringComparison.OrdinalIgnoreCase);

            if (at >= 0 && line.IndexOf(':', at) is var colon and > 0)
            {
                return line[(colon + 1)..].Trim();
            }
        }

        return "(unknown)";
    }

    //-----------------------------------------------------------
    // One step of secure-services.cmd
    //-----------------------------------------------------------

    public (AgentJob? Job, int Code, string? Error) StartStep(string? step, string? by)
    {
        step = (step ?? string.Empty).Trim().ToLowerInvariant();

        if (!Steps.Contains(step))
        {
            return (null, 400, "Step must be console, erp, lock or back.");
        }

        if (!File.Exists(Script))
        {
            return (null, 409, $"secure-services.cmd is not in the agent folder ({AppContext.BaseDirectory}). Install the agent again.");
        }

        var erp = _deployers.Get("erp")!;
        var console = _deployers.Get("console");

        // the script restarts both services : nothing else may run
        if (console is not null && !console.TryHold())
        {
            return (null, 409, "A deployment or another step is running. Try again when it has finished.");
        }

        var job = erp.TryBeginJob("security", step);

        if (job is null)
        {
            console?.EndJob();

            return (null, 409, "A deployment or another step is running. Try again when it has finished.");
        }

        _lastJob = job;

        _ = Task.Run(async () =>
        {
            try
            {
                job.Log("Asked from the Console by " + Who(by));
                job.Progress(10, "Running secure-services.cmd " + step);

                var result = await Deployer.RunAsync("cmd.exe", new[] { "/c", Script, step }, null, TimeSpan.FromMinutes(20));

                foreach (var line in result.Output.Split('\n', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries))
                {
                    job.Log(line);
                }

                job.Finish(
                    result.ExitCode == 0 ? "succeeded" : "failed",
                    result.ExitCode == 0 ? "Step '" + step + "' is done." : "Step '" + step + "' was not done; read the lines above.");
            }
            catch (Exception ex)
            {
                job.Log("ERROR: " + ex.Message);
                job.Finish("failed", ex.Message);
            }
            finally
            {
                erp.EndJob();
                console?.EndJob();
            }
        });

        return (job, 200, null);
    }

    //-----------------------------------------------------------
    // Tenancy:NoCompany of the ERP
    //-----------------------------------------------------------

    public (AgentJob? Job, int Code, string? Error) StartNoCompany(string? mode, string? by, bool byItself = false)
    {
        mode = (mode ?? string.Empty).Trim().ToLowerInvariant() switch
        {
            "refuse" => "Refuse",
            "warn" => "Warn",
            "auto" => "Auto",
            _ => string.Empty
        };

        if (mode.Length == 0)
        {
            return (null, 400, "Mode must be Refuse, Warn or Auto.");
        }

        if (mode == "Auto")
        {
            SaveState(new AutoState { Auto = true, Note = $"The agent may switch by itself again (asked by {Who(by)}, {DateTime.Now:yyyy-MM-dd HH:mm})." });

            return (null, 200, null);
        }

        var erp = _deployers.Get("erp")!;

        var job = erp.TryBeginJob("nocompany", mode);

        if (job is null)
        {
            return (null, 409, "A deployment or another step is running. Try again when it has finished.");
        }

        _lastJob = job;

        _ = Task.Run(async () =>
        {
            string? before = null;

            try
            {
                job.Log(byItself ? "Started by the agent itself : " + Who(by) : "Asked from the Console by " + Who(by));

                before = ReadEnv();

                job.Progress(10, $"Setting {EnvName}={mode} on the service {erp.ServiceName}");

                WriteEnv(mode);

                job.Progress(30, "Restarting the ERP");

                if (await erp.RestartAndCheckAsync(job))
                {
                    SaveState(new AutoState
                    {
                        // "Warn" asked by a person : not switched back behind their back
                        Auto = mode == "Refuse",
                        Note = mode == "Refuse"
                            ? $"Refuse since {DateTime.Now:yyyy-MM-dd HH:mm}, set by {Who(by)}."
                            : $"Set back to Warn by {Who(by)}, {DateTime.Now:yyyy-MM-dd HH:mm}. The agent does not switch by itself until asked."
                    });

                    job.Finish("succeeded", $"The ERP runs with NoCompany = {mode} and answers.");

                    return;
                }

                job.Progress(70, "The ERP does not answer : putting the setting back");

                WriteEnv(before);

                bool alive = await erp.RestartAndCheckAsync(job);

                SaveState(new AutoState
                {
                    Auto = false,
                    Note = $"{DateTime.Now:yyyy-MM-dd HH:mm} : the ERP did not answer with NoCompany = {mode}; the setting was put back. The agent does not try again by itself."
                });

                job.Finish(
                    alive ? "rolledback" : "failed",
                    alive
                        ? $"The ERP did not answer with NoCompany = {mode}. The setting was put back and the ERP answers again."
                        : "The ERP does not answer, also with the setting put back. Look at the service on the server now.");
            }
            catch (Exception ex)
            {
                job.Log("ERROR: " + ex.Message);

                try
                {
                    WriteEnv(before);
                }
                catch
                {
                    // said below
                }

                SaveState(new AutoState { Auto = false, Note = $"{DateTime.Now:yyyy-MM-dd HH:mm} : setting NoCompany = {mode} failed ({ex.Message}). The agent does not try again by itself." });

                job.Finish("failed", ex.Message + " Check that the ERP service is running.");
            }
            finally
            {
                erp.EndJob();
            }
        });

        return (job, 200, null);
    }

    // called now and then by NoCompanyAuto
    public void SwitchByItselfIfClean()
    {
        if (!_settings.NoCompanyAuto || !ReadState().Auto)
        {
            return;
        }

        int hour = DateTime.Now.Hour;
        int from = Math.Clamp(_settings.NoCompanyAutoHour, 0, 23);

        if (hour != from && hour != (from + 1) % 24)
        {
            return;
        }

        var file = ReadErpFile();

        if (file is null
            || string.Equals(file.Mode, "Refuse", StringComparison.OrdinalIgnoreCase)
            || string.Equals(ReadEnv(), "Refuse", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        if (CleanDays(file) is not { } clean || clean < Math.Max(1, _settings.NoCompanyCleanDays))
        {
            return;
        }

        StartNoCompany("Refuse", $"{clean:0} clean days", byItself: true);
    }

    // whole days with the ERP looking and nothing asking; null = the
    // ERP has not been seen looking in the last day
    private static double? CleanDays(ErpFile file)
    {
        DateTime now = DateTime.UtcNow;

        if (file.Since == default || now - file.Seen > TimeSpan.FromDays(1))
        {
            return null;
        }

        DateTime from = file.Since;

        foreach (var caller in file.Callers ?? new())
        {
            if (caller.Last > from)
            {
                from = caller.Last;
            }
        }

        return Math.Floor(Math.Max(0, (now - from).TotalDays));
    }

    private object NoCompanyStatus()
    {
        var file = ReadErpFile();
        var state = ReadState();

        DateTime week = DateTime.UtcNow.AddDays(-7);

        string? env = null;

        try
        {
            env = ReadEnv();
        }
        catch
        {
            // shown as not set
        }

        return new
        {
            file = _settings.NoCompanyFile,
            fileFound = file is not null,
            // what the ERP itself says it runs with
            inUse = file?.Mode ?? string.Empty,
            setByAgent = env ?? string.Empty,
            since = file?.Since,
            seen = file?.Seen,
            cleanDays = file is null ? null : CleanDays(file),
            needDays = Math.Max(1, _settings.NoCompanyCleanDays),
            last7Days = file?.Callers?.Count(x => x.Last >= week) ?? 0,
            callers = (file?.Callers ?? new())
                .OrderByDescending(x => x.Last)
                .Take(50)
                .Select(x => new { caller = x.Caller, count = x.Count, first = x.First, last = x.Last }),
            auto = _settings.NoCompanyAuto && state.Auto,
            autoHour = Math.Clamp(_settings.NoCompanyAutoHour, 0, 23),
            note = state.Note
        };
    }

    //-----------------------------------------------------------
    // Files and the service environment
    //-----------------------------------------------------------

    private sealed class ErpFile
    {
        public DateTime Since { get; set; }

        public DateTime Seen { get; set; }

        public string Mode { get; set; } = "Warn";

        public List<ErpCaller>? Callers { get; set; }
    }

    private sealed class ErpCaller
    {
        public string Caller { get; set; } = string.Empty;

        public long Count { get; set; }

        public DateTime First { get; set; }

        public DateTime Last { get; set; }
    }

    private sealed class AutoState
    {
        public bool Auto { get; set; } = true;

        public string Note { get; set; } = string.Empty;
    }

    private ErpFile? ReadErpFile()
    {
        try
        {
            return File.Exists(_settings.NoCompanyFile)
                ? JsonSerializer.Deserialize<ErpFile>(File.ReadAllText(_settings.NoCompanyFile), Json)
                : null;
        }
        catch
        {
            return null;
        }
    }

    private AutoState ReadState()
    {
        try
        {
            if (File.Exists(StateFile))
            {
                return JsonSerializer.Deserialize<AutoState>(File.ReadAllText(StateFile), Json) ?? new AutoState();
            }
        }
        catch
        {
            // as new
        }

        return new AutoState();
    }

    private void SaveState(AutoState state)
    {
        try
        {
            File.WriteAllText(StateFile, JsonSerializer.Serialize(state, Json));
        }
        catch
        {
            // a convenience only
        }
    }

    private string ServiceKey => @"SYSTEM\CurrentControlSet\Services\" + _settings.ServiceName;

    private string? ReadEnv()
    {
        using var key = Registry.LocalMachine.OpenSubKey(ServiceKey);

        if (key?.GetValue("Environment") is not string[] lines)
        {
            return null;
        }

        foreach (var line in lines)
        {
            if (line.StartsWith(EnvName + "=", StringComparison.OrdinalIgnoreCase))
            {
                return line[(EnvName.Length + 1)..];
            }
        }

        return null;
    }

    // null = take the value away (the settings file decides again)
    private void WriteEnv(string? value)
    {
        using var key =
            Registry.LocalMachine.OpenSubKey(ServiceKey, writable: true)
            ?? throw new InvalidOperationException($"The Windows service {_settings.ServiceName} was not found.");

        var lines =
            (key.GetValue("Environment") as string[] ?? Array.Empty<string>())
                .Where(line => !line.StartsWith(EnvName + "=", StringComparison.OrdinalIgnoreCase))
                .ToList();

        if (!string.IsNullOrWhiteSpace(value))
        {
            lines.Add(EnvName + "=" + value);
        }

        if (lines.Count == 0)
        {
            key.DeleteValue("Environment", throwOnMissingValue: false);
        }
        else
        {
            key.SetValue("Environment", lines.ToArray(), RegistryValueKind.MultiString);
        }
    }

    private static string Who(string? by) =>
        string.IsNullOrWhiteSpace(by) ? "(no name)" : by.Trim();
}


//===============================================================
// Looks every 20 minutes whether Refuse can be set by itself
//===============================================================

public sealed class NoCompanyAuto : BackgroundService
{
    private readonly ServerSecurity _security;

    public NoCompanyAuto(ServerSecurity security)
    {
        _security = security;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromMinutes(20), stoppingToken);

                _security.SwitchByItselfIfClean();
            }
            catch (OperationCanceledException)
            {
                return;
            }
            catch
            {
                // next round
            }
        }
    }
}
