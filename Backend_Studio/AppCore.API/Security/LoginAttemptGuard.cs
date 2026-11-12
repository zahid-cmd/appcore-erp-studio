//===============================================================
// Namespaces
//===============================================================

using Microsoft.Extensions.Caching.Memory;

using AppCore.Application.Platform.Tenancy;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Security;


//===============================================================
// Login Attempt Guard
//---------------------------------------------------------------
// Wrong passwords per Login ID (from any IP) :
//
//     5 failures inside 5 minutes → that Login ID must wait
//     60 seconds (429 + seconds to wait), then gets 5 more tries.
//
//     A successful login clears the count.
//
// Numbers : Security:RateLimits:LoginFailuresPerUser,
// LoginFailureWindowSeconds and LoginLockoutSeconds.
// Kept in memory (one API process).
//===============================================================

public sealed class LoginAttemptGuard
{
    private sealed class Entry
    {
        public int Failures;

        public DateTimeOffset WindowStarted;

        public DateTimeOffset LockedUntil;
    }


    private static readonly object Gate =
        new();

    private readonly IMemoryCache _cache;

    private readonly RateLimitSettings _limits;

    // Tenancy : the same Login ID ("admin") exists in every
    // company, so failures are counted per company
    private readonly IHttpContextAccessor _http;


    public LoginAttemptGuard(
        IMemoryCache cache,
        ApiSecurityOptions options,
        IHttpContextAccessor http)
    {
        _cache = cache;

        _http = http;

        _limits = options.RateLimits;
    }


    private bool IsOn =>
        _limits.Enabled &&
        _limits.LoginFailuresPerUser > 0;


    private TimeSpan Window =>
        TimeSpan.FromSeconds(Math.Max(10, _limits.LoginFailureWindowSeconds));


    private TimeSpan Lockout =>
        TimeSpan.FromSeconds(Math.Max(5, _limits.LoginLockoutSeconds));


    //===========================================================
    // Seconds this Login ID must still wait, or null
    //===========================================================

    public int? SecondsToWait(
        string? userName)
    {
        string key =
            Key(userName);

        if (!IsOn || key.Length == 0)
        {
            return null;
        }

        lock (Gate)
        {
            if (_cache.TryGetValue(key, out Entry? entry) &&
                entry is not null)
            {
                TimeSpan left =
                    entry.LockedUntil - DateTimeOffset.UtcNow;

                if (left > TimeSpan.Zero)
                {
                    return Math.Max(1, (int)Math.Ceiling(left.TotalSeconds));
                }
            }
        }

        return null;
    }


    //===========================================================
    // Wrong password (or any failed login)
    //===========================================================

    public void RecordFailure(
        string? userName)
    {
        string key =
            Key(userName);

        if (!IsOn || key.Length == 0)
        {
            return;
        }

        lock (Gate)
        {
            DateTimeOffset now =
                DateTimeOffset.UtcNow;

            if (!_cache.TryGetValue(key, out Entry? entry) ||
                entry is null)
            {
                entry =
                    new Entry();
            }

            // A new window when the last one is over
            if (entry.Failures == 0 ||
                now - entry.WindowStarted > Window)
            {
                entry.Failures = 0;

                entry.WindowStarted = now;
            }

            entry.Failures++;

            // Limit reached : wait, then a fresh count
            if (entry.Failures >= _limits.LoginFailuresPerUser)
            {
                entry.LockedUntil = now.Add(Lockout);

                entry.Failures = 0;
            }

            DateTimeOffset keepUntil =
                entry.LockedUntil > now.Add(Window)
                    ? entry.LockedUntil
                    : now.Add(Window);

            _cache.Set(key, entry, keepUntil);
        }
    }


    //===========================================================
    // Successful login
    //===========================================================

    public void RecordSuccess(
        string? userName)
    {
        string key =
            Key(userName);

        if (key.Length == 0)
        {
            return;
        }

        lock (Gate)
        {
            _cache.Remove(key);
        }
    }


    private string Key(
        string? userName)
    {
        string clean =
            (userName ?? string.Empty).Trim();

        string company =
            _http.HttpContext?.RequestServices.GetService<ITenantContext>()?.Tenant?.TenantCode ?? string.Empty;

        return clean.Length == 0 || clean.Length > 100
            ? string.Empty
            : "login-failures:" + company + ":" + clean.ToUpperInvariant();
    }
}
