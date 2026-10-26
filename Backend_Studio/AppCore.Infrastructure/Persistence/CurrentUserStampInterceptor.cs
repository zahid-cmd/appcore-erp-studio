//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Metadata;

using AppCore.Application.Platform.CurrentUser;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Persistence;


//===============================================================
// Current User Stamp Interceptor
//===============================================================
//
// Many repositories still write the activity / history rows as
//
//     PerformedBy     = 1
//     PerformedByName = "System"
//
// Instead of changing every repository, this runs once just
// before EF saves, and replaces those two values with the
// logged-in user, on NEW rows only, for ANY table that has the
// columns PerformedBy / PerformedByName :
//
//     ActivityHistories
//     Mfs / Pos / Check Reconciliation History ...
//
// Rules :
//
//   • Only when the request carries a valid login token.
//     Background jobs (nightly Auto Settlement) have no user,
//     so their rows stay "System".
//
//   • Only the exact name "System" is replaced. A name a
//     repository set on purpose (e.g. "System (Auto
//     Settlement)" or a real user name) is never touched.
//
//   • PerformedBy is replaced only when it is 1 (System).
//
//===============================================================

public class CurrentUserStampInterceptor : SaveChangesInterceptor
{
    //===========================================================
    // Constants
    //===========================================================

    private const string PerformedByProperty =
        "PerformedBy";

    private const string PerformedByNameProperty =
        "PerformedByName";

    private const string SystemName =
        "System";

    private const long SystemUserId =
        1;


    //===========================================================
    // Fields
    //===========================================================

    private readonly ICurrentUserService
        _currentUser;


    //===========================================================
    // Constructor
    //===========================================================

    public CurrentUserStampInterceptor(
        ICurrentUserService currentUser)
    {
        _currentUser =
            currentUser;
    }


    //===========================================================
    // Saving Changes (sync)
    //===========================================================

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        Stamp(
            eventData.Context);

        return base.SavingChanges(
            eventData,
            result);
    }


    //===========================================================
    // Saving Changes (async)
    //===========================================================

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        Stamp(
            eventData.Context);

        return base.SavingChangesAsync(
            eventData,
            result,
            cancellationToken);
    }


    //===========================================================
    // Stamp the logged-in user on new rows
    //===========================================================

    private void Stamp(
        DbContext? context)
    {
        if (context == null ||
            !_currentUser.IsAuthenticated)
        {
            return;
        }


        long userId =
            _currentUser.UserId;

        string userName =
            _currentUser.PerformedByName;


        foreach (EntityEntry entry in context.ChangeTracker.Entries())
        {
            if (entry.State != EntityState.Added)
            {
                continue;
            }


            //=======================================================
            // PerformedByName : "System" → user name
            //=======================================================

            IProperty? nameProperty =
                entry.Metadata.FindProperty(
                    PerformedByNameProperty);

            if (nameProperty == null ||
                nameProperty.ClrType != typeof(string))
            {
                continue;
            }

            PropertyEntry nameEntry =
                entry.Property(
                    PerformedByNameProperty);

            if (!string.Equals(
                    (nameEntry.CurrentValue as string)?.Trim(),
                    SystemName,
                    StringComparison.Ordinal))
            {
                continue;
            }

            nameEntry.CurrentValue =
                userName;


            //=======================================================
            // PerformedBy : 1 → user id
            //=======================================================

            IProperty? idProperty =
                entry.Metadata.FindProperty(
                    PerformedByProperty);

            if (idProperty == null)
            {
                continue;
            }

            PropertyEntry idEntry =
                entry.Property(
                    PerformedByProperty);

            if (idEntry.CurrentValue is long currentId &&
                currentId == SystemUserId)
            {
                idEntry.CurrentValue =
                    userId;
            }
        }
    }
}