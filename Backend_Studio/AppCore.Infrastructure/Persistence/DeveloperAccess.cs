//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Platform.CurrentUser;
using AppCore.Domain.Entities.SecurityPermission.RoleManagement;
using AppCore.Domain.Entities.SecurityPermission.UserManagement;
using AppCore.Infrastructure.CodeMaster;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Persistence;


//===============================================================
// Developer Access (2026-11-09)
//
// A developer = a user with a role marked IsDeveloperRole
// (RoleProfiles."IsDeveloperRole"), through Role Assignment.
//
//   * Only developers see the developer role and developer
//     accounts (User Profile, Role Profile, Role / Branch /
//     Special Assignment, Activity Assignment).
//   * Profile codes : developers DUP-001, DUP-002 ...
//                     everybody else CUP-001, CUP-002 ...
//     The code follows the role : given the developer role the
//     user moves to the next DUP code, losing it moves the user
//     to the next CUP code.
//===============================================================

public static class DeveloperAccess
{
    public const string DeveloperPrefix =
        "DUP-";

    public const string ClientPrefix =
        "CUP-";


    //===========================================================
    // Developer roles (not deleted)
    //===========================================================

    public static IQueryable<long>
        DeveloperRoleIds
        (
            AppDbContext context
        )
    {
        return context
            .Set<RoleProfile>()
            .Where(x => x.IsDeveloperRole && !x.IsDeleted)
            .Select(x => x.RoleProfileId);
    }


    //===========================================================
    // Users holding a developer role
    //===========================================================

    public static IQueryable<long>
        DeveloperUserIds
        (
            AppDbContext context
        )
    {
        IQueryable<long> roles =
            DeveloperRoleIds(context);

        return
            from detail in context.Set<RoleAssignmentDetail>()
            join assignment in context.Set<RoleAssignment>()
                on detail.RoleAssignmentId equals assignment.RoleAssignmentId
            where !detail.IsDeleted
                && !assignment.IsDeleted
                && roles.Contains(detail.RoleProfileId)
            select assignment.UserProfileId;
    }


    //===========================================================
    // Is the caller a developer ? (not logged in = no)
    //===========================================================

    public static bool
        ViewerIsDeveloper
        (
            AppDbContext context,
            ICurrentUserService currentUser
        )
    {
        if (currentUser == null || !currentUser.IsAuthenticated)
        {
            return false;
        }

        long id =
            currentUser.UserId;

        return DeveloperUserIds(context).Any(x => x == id);
    }

    public static async Task<bool>
        IsDeveloperAsync
        (
            AppDbContext context,
            long userProfileId
        )
    {
        return await DeveloperUserIds(context)
            .AnyAsync(x => x == userProfileId);
    }

    public static async Task<bool>
        IsDeveloperRoleAsync
        (
            AppDbContext context,
            long roleProfileId
        )
    {
        return await DeveloperRoleIds(context)
            .AnyAsync(x => x == roleProfileId);
    }


    //===========================================================
    // Refuse when a non-developer touches a developer account
    // or hands out a developer role (also through the API)
    //===========================================================

    public static async Task
        GuardAsync
        (
            AppDbContext context,
            ICurrentUserService currentUser,
            long userProfileId,
            IEnumerable<long>? roleProfileIds = null
        )
    {
        if (ViewerIsDeveloper(context, currentUser))
        {
            return;
        }

        if (userProfileId > 0 && await IsDeveloperAsync(context, userProfileId))
        {
            throw new KeyNotFoundException("User Profile not found.");
        }

        List<long> ids =
            (roleProfileIds ?? Enumerable.Empty<long>()).ToList();

        if (ids.Count > 0 && await DeveloperRoleIds(context).AnyAsync(x => ids.Contains(x)))
        {
            throw new KeyNotFoundException("Role Profile not found.");
        }
    }


    //===========================================================
    // Next free code of a series (deleted rows count too, so a
    // code is never given twice)
    //===========================================================

    public static async Task<string>
        NextCodeAsync
        (
            AppDbContext context,
            bool developer
        )
    {
        HashSet<string> used =
            (await context
                .Set<UserProfile>()
                .AsNoTracking()
                .Select(x => x.ProfileCode)
                .ToListAsync())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim().ToUpperInvariant())
            .ToHashSet();

        int no =
            1;

        while (true)
        {
            string code =
                developer
                    ? CodeGenerator.GenerateDeveloperProfileCode(no)
                    : CodeGenerator.GenerateUserProfileCode(no);

            if (!used.Contains(code.ToUpperInvariant()))
            {
                return code;
            }

            no++;
        }
    }


    //===========================================================
    // Keep the code in step with the developer role
    //===========================================================

    public static async Task
        SyncProfileCodeAsync
        (
            AppDbContext context,
            long userProfileId
        )
    {
        UserProfile? profile =
            await context
                .Set<UserProfile>()
                .FirstOrDefaultAsync(x => x.UserProfileId == userProfileId);

        if (profile == null)
        {
            return;
        }

        bool developer =
            await IsDeveloperAsync(context, userProfileId);

        bool hasDeveloperCode =
            (profile.ProfileCode ?? string.Empty)
                .StartsWith(DeveloperPrefix, StringComparison.OrdinalIgnoreCase);

        if (developer == hasDeveloperCode)
        {
            return;
        }

        profile.ProfileCode =
            await NextCodeAsync(context, developer);

        profile.ModifiedDate =
            DateTime.UtcNow;

        await context.SaveChangesAsync();
    }

    public static async Task
        SyncAllProfileCodesAsync
        (
            AppDbContext context
        )
    {
        List<long> ids =
            await context
                .Set<UserProfile>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select(x => x.UserProfileId)
                .ToListAsync();

        foreach (long id in ids)
        {
            await SyncProfileCodeAsync(context, id);
        }
    }
}
