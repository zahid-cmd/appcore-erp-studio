//===============================================================
// Limit lock (2026-11-20, review B7)
//
// The user / branch / company limits are "count, then save". Two
// saves at the same moment could both count before either saved,
// and both pass. This lock makes them go one at a time in the
// client's database : the second waits for the first to finish,
// then counts (and gets the normal limit message).
//
//     await using var limitLock =
//         await LimitLock.TakeAsync(_context, LimitLock.Users);
//
// Taken before the count, held until the method ends (after the
// save). A PostgreSQL advisory lock on the context's connection,
// which is kept open meanwhile; the database lets it go by itself
// if the connection is lost.
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Infrastructure.Persistence;

namespace AppCore.Infrastructure.Platform.Tenancy;

public sealed class LimitLock : IAsyncDisposable
{
    // one number per limit (any fixed numbers nothing else uses)
    public const long Users = 742011201;
    public const long Branches = 742011202;
    public const long Companies = 742011203;

    private readonly AppDbContext _context;

    private readonly long _key;

    private LimitLock(AppDbContext context, long key)
    {
        _context = context;
        _key = key;
    }

    public static async Task<LimitLock> TakeAsync(AppDbContext context, long key)
    {
        await context.Database.OpenConnectionAsync();

        try
        {
            await context.Database.ExecuteSqlRawAsync("SELECT pg_advisory_lock({0})", key);
        }
        catch (Exception)
        {
            await context.Database.CloseConnectionAsync();

            throw;
        }

        return new LimitLock(context, key);
    }

    public async ValueTask DisposeAsync()
    {
        try
        {
            await _context.Database.ExecuteSqlRawAsync("SELECT pg_advisory_unlock({0})", _key);
        }
        catch (Exception)
        {
            // let go when the connection goes back
        }

        try
        {
            await _context.Database.CloseConnectionAsync();
        }
        catch (Exception)
        {
        }
    }
}
