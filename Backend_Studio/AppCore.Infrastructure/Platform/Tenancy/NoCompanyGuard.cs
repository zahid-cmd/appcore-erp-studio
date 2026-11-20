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
//===============================================================

using System.Collections.Concurrent;
using System.Diagnostics;

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

        if (tenant is null || !tenant.Enabled || tenant.Tenant is not null)
        {
            return;
        }

        string caller = Caller();

        if (services.GetService<TenancyOptions>()?.RefusesNoCompany == true)
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
