//===============================================================
// Is the signed-in staff user still allowed? (2026-11-20, review B10)
// --------------------------------------------------------------
// The token is good for Jwt:Hours (8) and carries the staff id and
// the role. Before this, nothing else was looked at : a staff user
// set to not Active, or moved to another role, kept working until
// the token ran out.
//
// Now every signed-in call asks here (Program.cs, OnTokenValidated) :
// the staff user must still be there, Active, and have the role
// that is in the token. If not : 401, and the Console UI goes to
// the sign-in page. The answer is kept 30 seconds per staff user,
// so it is one small read per staff user per half minute.
//===============================================================

using System.Collections.Concurrent;

using Microsoft.EntityFrameworkCore;

using AppCore.Console.API.Data;

namespace AppCore.Console.API.Security;

public sealed class StaffCheck
{
    private static readonly TimeSpan Keep = TimeSpan.FromSeconds(30);

    // staff id -> (Active, role code, read at)
    private readonly ConcurrentDictionary<long, (bool Active, string? RoleCode, DateTime Until)> _known = new();

    // true = this staff user may go on with this role
    public async Task<bool> IsValidAsync(ControlDbContext db, long staffUserId, string? roleCode, CancellationToken ct)
    {
        if (!_known.TryGetValue(staffUserId, out var hit) || hit.Until <= DateTime.UtcNow)
        {
            var row =
                await (
                    from u in db.StaffUsers.AsNoTracking()
                    join r in db.StaffRoles.AsNoTracking() on u.StaffRoleId equals r.StaffRoleId
                    where u.StaffUserId == staffUserId
                    select new { u.Status, r.RoleCode })
                    .FirstOrDefaultAsync(ct);

            hit = (row is not null && row.Status == "Active", row?.RoleCode, DateTime.UtcNow.Add(Keep));

            _known[staffUserId] = hit;
        }

        return hit.Active && string.Equals(hit.RoleCode, roleCode, StringComparison.Ordinal);
    }

    // after signing in : read again on the next call
    public void Forget(long staffUserId) => _known.TryRemove(staffUserId, out _);
}
