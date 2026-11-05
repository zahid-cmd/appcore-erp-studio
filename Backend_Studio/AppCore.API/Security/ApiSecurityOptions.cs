//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Security;


//===============================================================
// API Security Options
//---------------------------------------------------------------
// Read from the optional "Security" section of the API settings.
// Every value has a safe default, so nothing has to be added to
// the settings file for the development PC.
//
//   "Security": {
//     "Cors": {
//       "AllowedOrigins":         [ "http://localhost:4100" ],
//       "AllowedWildcardOrigins": [ "https://*.appcore.com.bd" ]
//     },
//     "RateLimits": {
//       "Enabled": true,
//       "UserRequestsPerMinute": 300,
//       "UserBurst": 100,
//       "AnonymousRequestsPerMinute": 300,
//       "LoginRequestsPerMinutePerIp": 20,
//       "LoginFailuresPerUser": 5,
//       "LoginFailureWindowSeconds": 300,
//       "LoginLockoutSeconds": 60,
//       "HeavyTasksPerUser": 2
//     },
//     "Proxy": {
//       "KnownProxies": [ "10.0.0.5" ]
//     }
//   }
//===============================================================

public sealed class ApiSecurityOptions
{
    public const string SectionName =
        "Security";

    public CorsSettings Cors { get; set; } = new();

    public RateLimitSettings RateLimits { get; set; } = new();

    public ProxySettings Proxy { get; set; } = new();
}


//===============================================================
// CORS
//---------------------------------------------------------------
// Which other web addresses may call the API from a browser.
//
// Production serves the app and the API from the same address
// (dealer.appcore.com.bd and dealer.appcore.com.bd/api), so CORS
// is not used there at all; these lists are for the cases that
// still need it.
//
// Both lists empty (the default) means http://localhost:4100 only.
//===============================================================

public sealed class CorsSettings
{
    // Exact addresses, e.g. http://localhost:4100
    public string[] AllowedOrigins { get; set; } = [];

    // Any subdomain, e.g. https://*.appcore.com.bd
    public string[] AllowedWildcardOrigins { get; set; } = [];
}


//===============================================================
// Rate Limits
//---------------------------------------------------------------
// Answer 429 "Too many requests" with the seconds to wait.
//===============================================================

public sealed class RateLimitSettings
{
    public bool Enabled { get; set; } = true;

    // Logged-in calls, counted per user (not per IP, so a whole
    // showroom behind one internet line does not block itself)
    public int UserRequestsPerMinute { get; set; } = 300;

    // Short bursts allowed on top (a page opening several lists)
    public int UserBurst { get; set; } = 100;

    // Calls without login (login page, public website), per IP
    public int AnonymousRequestsPerMinute { get; set; } = 300;

    // Login, register, forgot-password : per IP
    public int LoginRequestsPerMinutePerIp { get; set; } = 20;

    // Wrong passwords for one Login ID (inside the window) before
    // it must wait LoginLockoutSeconds
    public int LoginFailuresPerUser { get; set; } = 5;

    public int LoginFailureWindowSeconds { get; set; } = 300;

    public int LoginLockoutSeconds { get; set; } = 60;

    // Backup / Restore / Data Reset / Copy at the same time, per user
    public int HeavyTasksPerUser { get; set; } = 2;
}


//===============================================================
// Proxy
//---------------------------------------------------------------
// Behind nginx / IIS the visitor's real IP comes in the
// X-Forwarded-For header. It is trusted only from these proxy
// addresses (and always from the same machine, 127.0.0.1 / ::1).
//===============================================================

public sealed class ProxySettings
{
    public string[] KnownProxies { get; set; } = [];
}
