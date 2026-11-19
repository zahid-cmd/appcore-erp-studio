//===============================================================
// Tenancy settings (appsettings section "Tenancy")
//===============================================================
//
// "Tenancy": {
//     "Mode": "Off",                    // Off (default) | Host
//     "LocalHostTenant": "MOTOZONE",    // company for http://localhost
//                                       // (Deploy Agent health checks)
//     "CacheSeconds": 60,
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
// Passwords live only in the server's appsettings.json, never in
// AppCore_Control.
//
//===============================================================

namespace AppCore.Infrastructure.Platform.Tenancy;


public sealed class TenancyOptions
{
    public const string Section = "Tenancy";

    public string Mode { get; set; } = "Off";

    public string? LocalHostTenant { get; set; }

    public int CacheSeconds { get; set; } = 60;

    // Last known map of addresses -> companies (no passwords), used
    // when AppCore_Control cannot be reached. Empty =
    // %ProgramData%\AppCore\tenant-map.json
    public string? MapFile { get; set; }

    public Dictionary<string, TenancyCredential> Credentials { get; set; } =
        new(StringComparer.OrdinalIgnoreCase);

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
