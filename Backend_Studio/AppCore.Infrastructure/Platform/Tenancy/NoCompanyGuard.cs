//===============================================================
// No company, no database (2026-11-20, review B9)
//
// Tenancy:Mode = Host : every piece of work belongs to one client
// company, and AppDbContext opens that company's database. Work
// with no company (a scope made outside a request, without
// TenantScopes) used to open ConnectionStrings:DefaultConnection
// without a word.
//
// Called where AppDbContext picks its database
// (DependencyInjection.cs). Tenancy:NoCompany :
//   Warn   : (default) the default database as before, plus one
//            warning line in the log per caller per hour;
//   Refuse : InvalidOperationException, nothing is opened.
//
// Mode Off : does nothing.
//
// The small file (2026-11-21) : what asked with no company, how
// often and when, is also kept in no-company.json beside the
// tenant map (default %ProgramData%\AppCore). No client data in
// it. The Deploy Agent reads it : the Console shows the list, and
// after 7 clean days the agent sets Refuse by itself. "seen" is
// written about once an hour, so the agent knows the ERP is alive
// and looking.
//===============================================================

using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text.Json;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

using AppCore.Application.Platform.Tenancy;

namespace AppCore.Infrastructure.Platform.Tenancy;

public static class NoCompanyGuard
{
    // caller -> when it was last written to the log
    private static readonly ConcurrentDictionary<string, DateTime> Warned = new();

    public static void Check(IServiceProvider services)
    {
        ITenantContext? tenant = services.GetService<ITenantContext>();

        if (tenant is null || !tenant.Enabled)
        {
            return;
        }

        TenancyOptions? options = services.GetService<TenancyOptions>();

        if (tenant.Tenant is not null)
        {
            StillLooking(options);

            return;
        }

        string caller = Caller();

        Record(options, caller);

        if (options?.RefusesNoCompany == true)
        {
            throw new InvalidOperationException(
                "No client company for this work : the database was not opened. Asked by : " + caller);
        }

        DateTime now = DateTime.UtcNow;

        if (Warned.TryGetValue(caller, out DateTime last) && now - last < TimeSpan.FromHours(1))
        {
            return;
        }

        Warned[caller] = now;

        services.GetService<ILoggerFactory>()
            ?.CreateLogger("AppCore.Tenancy")
            .LogWarning(
                "Tenancy : work with NO client company opened the default database (Tenancy:NoCompany = Warn). Asked by : {Caller}",
                caller);
    }

    //-----------------------------------------------------------
    // The small file : no-company.json
    //-----------------------------------------------------------

    private sealed class SavedFile
    {
        public DateTime Since { get; set; }

        public DateTime Seen { get; set; }

        public string Mode { get; set; } = "Warn";

        public List<SavedCaller> Callers { get; set; } = new();
    }

    private sealed class SavedCaller
    {
        public string Caller { get; set; } = string.Empty;

        public long Count { get; set; }

        public DateTime First { get; set; }

        public DateTime Last { get; set; }
    }

    private static readonly object FileGate = new();

    private static SavedFile? _saved;

    private static long _lastWriteTicks;

    private static string FilePath(TenancyOptions? options)
    {
        string? folder = string.IsNullOrWhiteSpace(options?.MapFile)
            ? null
            : Path.GetDirectoryName(options!.MapFile);

        if (string.IsNullOrWhiteSpace(folder))
        {
            folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "AppCore");
        }

        return Path.Combine(folder, "no-company.json");
    }

    // work WITH a company : about once an hour, say "still looking"
    private static void StillLooking(TenancyOptions? options)
    {
        if (DateTime.UtcNow.Ticks - Interlocked.Read(ref _lastWriteTicks) < TimeSpan.TicksPerHour)
        {
            return;
        }

        lock (FileGate)
        {
            Save(options, TimeSpan.FromHours(1));
        }
    }

    // work with NO company : count it (written at most once a minute)
    private static void Record(TenancyOptions? options, string caller)
    {
        try
        {
            lock (FileGate)
            {
                SavedFile saved = Load(options);

                DateTime now = DateTime.UtcNow;

                SavedCaller? row = saved.Callers.FirstOrDefault(x => x.Caller == caller);

                if (row is null)
                {
                    if (saved.Callers.Count >= 200)
                    {
                        return;
                    }

                    row = new SavedCaller { Caller = caller, First = now };

                    saved.Callers.Add(row);
                }

                row.Count++;
                row.Last = now;

                Save(options, TimeSpan.FromMinutes(1));
            }
        }
        catch (Exception)
        {
            // the file is a convenience : never in the way of the work
        }
    }

    private static SavedFile Load(TenancyOptions? options)
    {
        if (_saved is not null)
        {
            return _saved;
        }

        SavedFile? saved = null;

        try
        {
            string file = FilePath(options);

            if (File.Exists(file))
            {
                saved = JsonSerializer.Deserialize<SavedFile>(File.ReadAllText(file));
            }
        }
        catch (Exception)
        {
            // unreadable : start again
        }

        saved ??= new SavedFile();

        if (saved.Since == default)
        {
            saved.Since = DateTime.UtcNow;
        }

        saved.Callers ??= new List<SavedCaller>();

        return _saved = saved;
    }

    // call inside FileGate
    private static void Save(TenancyOptions? options, TimeSpan notMoreOftenThan)
    {
        try
        {
            DateTime now = DateTime.UtcNow;

            if (now.Ticks - Interlocked.Read(ref _lastWriteTicks) < notMoreOftenThan.Ticks)
            {
                return;
            }

            Interlocked.Exchange(ref _lastWriteTicks, now.Ticks);

            SavedFile saved = Load(options);

            saved.Seen = now;
            saved.Mode = options?.RefusesNoCompany == true ? "Refuse" : "Warn";
            saved.Callers.RemoveAll(x => now - x.Last > TimeSpan.FromDays(60));

            string file = FilePath(options);

            Directory.CreateDirectory(Path.GetDirectoryName(file)!);

            string temp = file + ".tmp";

            File.WriteAllText(temp, JsonSerializer.Serialize(saved, new JsonSerializerOptions { WriteIndented = true }));

            File.Move(temp, file, true);
        }
        catch (Exception)
        {
            // the file is a convenience : never in the way of the work
        }
    }

    // the AppCore code that asked for the database, nearest first
    private static string Caller()
    {
        try
        {
            List<string> names = new();

            foreach (StackFrame frame in new StackTrace(2, false).GetFrames())
            {
                Type? type = frame.GetMethod()?.DeclaringType;

                // an async method runs inside a generated class
                while (type is { IsNested: true } && type.Name.StartsWith('<'))
                {
                    type = type.DeclaringType;
                }

                string? name = type?.FullName;

                if (name is null
                    || !name.StartsWith("AppCore.", StringComparison.Ordinal)
                    || name.Contains("DependencyInjection", StringComparison.Ordinal)
                    || name.Contains(nameof(NoCompanyGuard), StringComparison.Ordinal))
                {
                    continue;
                }

                if (names.Count == 0 || names[^1] != name)
                {
                    names.Add(name);
                }

                if (names.Count == 4)
                {
                    break;
                }
            }

            return names.Count == 0 ? "(not AppCore code : the service start?)" : string.Join(" < ", names);
        }
        catch (Exception)
        {
            return "(unknown)";
        }
    }
}
