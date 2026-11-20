//===============================================================
// Tenancy settings (appsettings section "Tenancy")
//===============================================================
//
// "Tenancy": {
//     "Mode": "Off",                    // Off (default) | Host
//     "LocalHostTenant": "MOTOZONE",    // company for http://localhost
//                                       // (Deploy Agent health checks)
//     "CacheSeconds": 15,               // optional (default 15)
//     "NoCompany": "Warn",              // optional : Warn (default) | Refuse
//                                       // Mode Host, work with no company
//     "MapFile": "",                    // optional : last known map
//                                       // (default %ProgramData%\AppCore\tenant-map.json)
//     "Credentials": {
//         "TW-DEMO": {                  // a company's own login :
//             "Username": "appcore_t_tw_demo",   // Tenants.CredentialKey
//             "Password": "..."
//         },
//         "PG-01": {                    // = DatabaseServers.CredentialKey
//                                       // (companies without their own key)
//             "Username": "postgres",
//             "Password": "...",
//             "Host": "localhost",      // optional : how THIS server
//             "Port": 5432              // reaches that PostgreSQL
//         }
//     }
// },
// "ConnectionStrings": {
//     "DefaultConnection": "...",       // Mode Off : the one database.
//                                       // Mode Host : its options
//                                       // (timeouts ...) are copied
//                                       // into every company's string
//     "Control": "Host=...;Database=AppCore_Control;Username=...;Password=..."
// }
//
// Passwords : in the server's appsettings.json (older clients),
// or in AppCore_Control SEALED with this server's public key
// (Tenants.DbPasswordSealed, 2026-11-20) : only this server can
// open them (TenantCredentialSeal). For sealed logins the address
// of the database server comes from "ServerAddresses" :
//
//     "ServerAddresses": {
//         "PG-TW-01": { "Host": "localhost", "Port": 5433 }
//     },
//     "CredentialKeyFile": "..."        // optional; default
//         %ProgramData%\AppCore\keys\tenant-credentials.pem
//
//===============================================================

namespace AppCore.Infrastructure.Platform.Tenancy;


public sealed class TenancyOptions
{
    public const string Section = "Tenancy";

    public string Mode { get; set; } = "Off";

    public string? LocalHostTenant { get; set; }

    // How long the answer for a web address is kept. A change made
    // in the Console (suspend, modules, limits) takes effect within
    // this time. 15 since 2026-11-20 (was 60, review B6) : one small
    // read of AppCore_Control per address every 15 seconds.
    public int CacheSeconds { get; set; } = 15;

    // Last known map of addresses -> companies (no passwords), used
    // when AppCore_Control cannot be reached. Empty =
    // %ProgramData%\AppCore\tenant-map.json
    public string? MapFile { get; set; }

    public Dictionary<string, TenancyCredential> Credentials { get; set; } =
        new(StringComparer.OrdinalIgnoreCase);

    // DatabaseServers.CredentialKey -> how THIS server reaches it
    // (sealed logins only)
    public Dictionary<string, TenancyServerAddress> ServerAddresses { get; set; } =
        new(StringComparer.OrdinalIgnoreCase);

    public string? CredentialKeyFile { get; set; }

    // Mode Host, work that asks for the database with no company
    // (2026-11-20, review B9; see NoCompanyGuard) :
    //   Warn   : (default) the default database as before, and a
    //            warning line in the log saying what asked;
    //   Refuse : an error, the database is not opened.
    // Start with Warn; when the log on live stays clean, set Refuse.
    public string NoCompany { get; set; } = "Warn";

    public bool RefusesNoCompany =>
        string.Equals(NoCompany, "Refuse", StringComparison.OrdinalIgnoreCase);

    public bool IsHostMode =>
        string.Equals(Mode, "Host", StringComparison.OrdinalIgnoreCase);
}


public sealed class TenancyCredential
{
    public string Username { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    // optional : overrides DatabaseServers.Host / Port
    public string? Host { get; set; }

    public int? Port { get; set; }
}


public sealed class TenancyServerAddress
{
    public string? Host { get; set; }

    public int? Port { get; set; }
}
