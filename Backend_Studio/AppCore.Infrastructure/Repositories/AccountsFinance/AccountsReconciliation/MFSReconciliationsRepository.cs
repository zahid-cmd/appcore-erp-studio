//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Common.ActivityHistory.DTOs;

using AppCore.Domain.Common;

using AppCore.Infrastructure.Persistence;

using global::AppCore.Application.AccountsFinance.AccountsReconciliation;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.AccountsFinance.AccountsReconciliation;


//===============================================================
// MfsReconciliationsRepository
//===============================================================

public class MfsReconciliationsRepository
    : IMfsReconciliationsRepository
{

    //===========================================================
    // DbContext
    //===========================================================

    private readonly AppDbContext
        _context;



    //===========================================================
    // Constructor
    //===========================================================

    public MfsReconciliationsRepository
    (
        AppDbContext context
    )
    {
        _context =
            context;
    }



    //===========================================================
    // Get All
    //===========================================================

    public async Task<IReadOnlyList<global::AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation.MfsReconciliations>>
        GetAllAsync()
    {
        return await _context
            .Set<global::AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation.MfsReconciliations>()
            .AsNoTracking()
            .Where(
                x =>
                    !x.IsDeleted
            )
            .OrderBy(
                x =>
                    x.Name
            )
            .ToListAsync();
    }



    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<global::AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation.MfsReconciliations?>
        GetByIdAsync
    (
        long id
    )
    {
        return await _context
            .Set<global::AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation.MfsReconciliations>()
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x =>
                    x.Id == id
                    &&
                    !x.IsDeleted
            );
    }



    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
    (
        global::AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation.MfsReconciliations entity
    )
    {
        const long userId =
            1;


        entity.IsActive =
            true;


        entity.IsDeleted =
            false;


        entity.CreatedBy =
            userId;


        entity.CreatedDate =
            DateTime.UtcNow;


        entity.ModifiedBy =
            null;


        entity.ModifiedDate =
            null;


        await _context
            .Set<global::AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation.MfsReconciliations>()
            .AddAsync(
                entity
            );


        await _context.SaveChangesAsync();


        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "AccountsFinance",

                EntityName =
                    "MfsReconciliations",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "MfsReconciliations Created",

                ActivityDescription =
                    $"MfsReconciliations '{entity.Name}' was created.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();


        return entity.Id;
    }



    //===========================================================
    // Update
    //===========================================================

    public async Task
        UpdateAsync
    (
        global::AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation.MfsReconciliations entity
    )
    {
        const long userId =
            1;


        var existing =
            await _context
                .Set<global::AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation.MfsReconciliations>()
                .FirstOrDefaultAsync(
                    x =>
                        x.Id == entity.Id
                        &&
                        !x.IsDeleted
                );


        if
        (
            existing is null
        )
        {
            throw new InvalidOperationException(
                "MfsReconciliations record was not found."
            );
        }


        existing.Code =
            entity.Code;


        existing.Name =
            entity.Name;


        existing.SampleSearchDropdownId =
            entity.SampleSearchDropdownId;


        existing.SampleField =
            entity.SampleField;


        existing.Status =
            entity.Status;


        existing.Remarks =
            entity.Remarks;


        existing.ModifiedBy =
            userId;


        existing.ModifiedDate =
            DateTime.UtcNow;


        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "AccountsFinance",

                EntityName =
                    "MfsReconciliations",

                EntityId =
                    existing.Id,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "MfsReconciliations Updated",

                ActivityDescription =
                    $"MfsReconciliations '{existing.Name}' was updated.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();
    }



    //===========================================================
    // Delete
    //===========================================================

    public async Task
        DeleteAsync
    (
        long id
    )
    {
        const long userId =
            1;


        var entity =
            await _context
                .Set<global::AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation.MfsReconciliations>()
                .FirstOrDefaultAsync(
                    x =>
                        x.Id == id
                        &&
                        !x.IsDeleted
                );


        if
        (
            entity is null
        )
        {
            return;
        }


        entity.IsDeleted =
            true;


        entity.IsActive =
            false;


        entity.ModifiedBy =
            userId;


        entity.ModifiedDate =
            DateTime.UtcNow;


        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "AccountsFinance",

                EntityName =
                    "MfsReconciliations",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "MfsReconciliations Deleted",

                ActivityDescription =
                    $"MfsReconciliations '{entity.Name}' was deleted.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();
    }



    //===========================================================
    // Restore
    //===========================================================

    public async Task
        RestoreAsync
    (
        long id
    )
    {
        const long userId =
            1;


        var entity =
            await _context
                .Set<global::AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation.MfsReconciliations>()
                .FirstOrDefaultAsync(
                    x =>
                        x.Id == id
                        &&
                        x.IsDeleted
                );


        if
        (
            entity is null
        )
        {
            return;
        }


        entity.IsDeleted =
            false;


        entity.IsActive =
            true;


        entity.ModifiedBy =
            userId;


        entity.ModifiedDate =
            DateTime.UtcNow;


        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "AccountsFinance",

                EntityName =
                    "MfsReconciliations",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "MfsReconciliations Restored",

                ActivityDescription =
                    $"MfsReconciliations '{entity.Name}' was restored.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();
    }



    //===========================================================
    // Get History
    //===========================================================

    public async Task<IReadOnlyList<ActivityHistoryDto>>
        GetHistoryAsync()
    {
        return await _context.ActivityHistories

            .AsNoTracking()

            .Where(
                x =>
                    x.Module ==
                    "AccountsFinance"

                    &&

                    x.EntityName ==
                    "MfsReconciliations"
            )

            .OrderByDescending(
                x =>
                    x.PerformedDate
            )

            .Select(
                x =>
                    new ActivityHistoryDto
                    {
                        Id =
                            x.Id,

                        Module =
                            x.Module,

                        EntityName =
                            x.EntityName,

                        EntityId =
                            x.EntityId,

                        ActivityType =
                            x.ActivityType,

                        ActivityTitle =
                            x.ActivityTitle,

                        ActivityDescription =
                            x.ActivityDescription,

                        PerformedBy =
                            x.PerformedBy,

                        PerformedByName =
                            x.PerformedByName,

                        PerformedDate =
                            x.PerformedDate
                    }
            )

            .ToListAsync();
    }



    //===========================================================
    // Get Entity History
    //===========================================================

    public async Task<IReadOnlyList<ActivityHistoryDto>>
        GetEntityHistoryAsync
    (
        long id
    )
    {
        return await _context.ActivityHistories

            .AsNoTracking()

            .Where(
                x =>
                    x.Module ==
                    "AccountsFinance"

                    &&

                    x.EntityName ==
                    "MfsReconciliations"

                    &&

                    x.EntityId ==
                    id
            )

            .OrderByDescending(
                x =>
                    x.PerformedDate
            )

            .Select(
                x =>
                    new ActivityHistoryDto
                    {
                        Id =
                            x.Id,

                        Module =
                            x.Module,

                        EntityName =
                            x.EntityName,

                        EntityId =
                            x.EntityId,

                        ActivityType =
                            x.ActivityType,

                        ActivityTitle =
                            x.ActivityTitle,

                        ActivityDescription =
                            x.ActivityDescription,

                        PerformedBy =
                            x.PerformedBy,

                        PerformedByName =
                            x.PerformedByName,

                        PerformedDate =
                            x.PerformedDate
                    }
            )

            .ToListAsync();
    }

}