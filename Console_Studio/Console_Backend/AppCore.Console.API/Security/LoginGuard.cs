//===============================================================
// Staff login guard (2026-11-20)
// --------------------------------------------------------------
// Two limits on api/auth/login :
//
//   1. Per address : 10 tries / 5 minutes (rate limiter policy
//      LoginGuard.Policy, Program.cs), whatever the login ID.
//
//   2. Per login ID AND address : 5 wrong passwords lock that
//      login FROM THAT ADDRESS for 15 minutes.
//
// Before, 5 wrong passwords locked the ACCOUNT for everybody, so
// anyone who knew the login ID "owner" could keep the only Owner
// out for good. Now a stranger only locks himself out : the Owner,
// coming from another address, still gets in.
//
// Kept in memory : a restart of the Console clears the locks.
//===============================================================

using System.Collections.Concurrent;

namespace AppCore.Console.API.Security;


public static class LoginGuard
{
    public const string Policy = "staff-login";

    public const int MaxFailures = 5;

    private static readonly TimeSpan LockFor = TimeSpan.FromMinutes(15);

    // failures older than this no longer count
    private static readonly TimeSpan Forget = TimeSpan.FromMinutes(15);

    private const int MaxEntries = 20000;

    private sealed class Entry
    {
        public int Failures;
        public DateTime LastFailure;
        public DateTime? LockedUntil;
    }

    private static readonly ConcurrentDictionary<string, Entry> Entries = new();

    private static string Key(string loginId, string address) => loginId + "|" + address;

    // locked : until when (UTC); else null
    public static DateTime? LockedUntil(string loginId, string address)
    {
        if (Entries.TryGetValue(Key(loginId, address), out Entry? e))
        {
            lock (e)
            {
                if (e.LockedUntil is DateTime until && until > DateTime.UtcNow)
                {
                    return until;
                }
            }
        }

        return null;
    }

    public static void Failed(string loginId, string address)
    {
        DateTime now = DateTime.UtcNow;

        if (Entries.Count > MaxEntries)
        {
            Prune(now);
        }

        Entry e = Entries.GetOrAdd(Key(loginId, address), _ => new Entry());

        lock (e)
        {
            if (now - e.LastFailure > Forget)
            {
                e.Failures = 0;
            }

            e.Failures++;
            e.LastFailure = now;

            if (e.Failures >= MaxFailures)
            {
                e.LockedUntil = now.Add(LockFor);
                e.Failures = 0;
            }
        }
    }

    public static void Succeeded(string loginId, string address)
        => Entries.TryRemove(Key(loginId, address), out _);

    private static void Prune(DateTime now)
    {
        foreach (KeyValuePair<string, Entry> pair in Entries)
        {
            Entry e = pair.Value;

            bool stale;

            lock (e)
            {
                stale = now - e.LastFailure > Forget && !(e.LockedUntil > now);
            }

            if (stale)
            {
                Entries.TryRemove(pair.Key, out _);
            }
        }
    }
}
