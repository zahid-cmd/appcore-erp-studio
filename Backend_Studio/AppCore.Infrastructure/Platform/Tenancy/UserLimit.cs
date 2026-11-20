//===============================================================
// User limit of a client (2026-11-20)
//
// The Console sets Tenants.MaxUsers (empty = no limit). Counted :
// active, not deleted users, without developers (the hidden
// AppCore support login never counts). Used by User Profile
// (add, activate, restore) and Access Requests (approve).
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Platform.Tenancy;
using AppCore.Domain.Entities.SecurityPermission.UserManagement;
using AppCore.Infrastructure.Persistence;

namespace AppCore.Infrastructure.Platform.Tenancy;

public static class UserLimit
{
    // null = one more active user is allowed; otherwise the reason
    public static async Task<string?> RefusalAsync
    (
        AppDbContext context,
        ITenantLimits limits,
        long? exceptUserProfileId = null
    )
    {
        TenantLimits? l = await limits.GetAsync();

        if (l?.MaxUsers is not int max)
        {
            return null;
        }

        IQueryable<long> developers =
            DeveloperAccess.DeveloperUserIds(context);

        int used =
            await context.Set<UserProfile>()
                .AsNoTracking()
                .CountAsync(x =>
                    !x.IsDeleted
                    && x.IsActive
                    && !developers.Contains(x.UserProfileId)
                    && (exceptUserProfileId == null || x.UserProfileId != exceptUserProfileId));

        return used >= max
            ? $"Your package allows {max} active user(s) and {used} are in use. Make a user inactive first, or ask AppCore to raise the limit."
            : null;
    }
}
