//===============================================================
// Tenancy settings (appsettings section "Tenancy")
//===============================================================
//
// "Tenancy": {
//     "Mode": "Off",                    // Off (default) | Host
//     "LocalHostTenant": "MOTOZONE",    // company for http://localhost
//                                       // (Deploy Agent health checks)
//     "CacheSeconds": 60,
//     "Credentials": {
//         "PG-01": {                    // = DatabaseServers.CredentialKey
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
