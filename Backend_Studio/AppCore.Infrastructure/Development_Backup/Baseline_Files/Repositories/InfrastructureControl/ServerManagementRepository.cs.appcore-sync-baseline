//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Common.ActivityHistory.DTOs;

using AppCore.Domain.Common;

using AppCore.Infrastructure.Persistence;

using global::AppCore.Application.InfrastructureControl.CodeManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.InfrastructureControl.CodeManagement;


//===============================================================
// ServerManagementRepository
//===============================================================

public class ServerManagementRepository
    : IServerManagementRepository
{

    //===========================================================
    // DbContext
    //===========================================================

    private readonly AppDbContext
        _context;



    //===========================================================
    // Constructor
    //===========================================================

    public ServerManagementRepository
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

    public async Task<IReadOnlyList<global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.ServerManagement>>
        GetAllAsync()
    {
        return await _context
            .Set<global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.ServerManagement>()
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

    public async Task<global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.ServerManagement?>
        GetByIdAsync
    (
        long id
    )
    {
        return await _context
            .Set<global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.ServerManagement>()
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
        global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.ServerManagement entity
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
            .Set<global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.ServerManagement>()
            .AddAsync(
                entity
            );


        await _context.SaveChangesAsync();


        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "InfrastructureControl",

                EntityName =
                    "ServerManagement",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "ServerManagement Created",

                ActivityDescription =
                    $"ServerManagement '{entity.Name}' was created.",

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
        global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.ServerManagement entity
    )
    {
        const long userId =
            1;


        var existing =
            await _context
                .Set<global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.ServerManagement>()
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
                "ServerManagement record was not found."
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
                    "InfrastructureControl",

                EntityName =
                    "ServerManagement",

                EntityId =
                    existing.Id,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "ServerManagement Updated",

                ActivityDescription =
                    $"ServerManagement '{existing.Name}' was updated.",

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
                .Set<global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.ServerManagement>()
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
                    "InfrastructureControl",

                EntityName =
                    "ServerManagement",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "ServerManagement Deleted",

                ActivityDescription =
                    $"ServerManagement '{entity.Name}' was deleted.",

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
                .Set<global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.ServerManagement>()
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
                    "InfrastructureControl",

                EntityName =
                    "ServerManagement",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "ServerManagement Restored",

                ActivityDescription =
                    $"ServerManagement '{entity.Name}' was restored.",

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
                    "InfrastructureControl"

                    &&

                    x.EntityName ==
                    "ServerManagement"
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
                    "InfrastructureControl"

                    &&

                    x.EntityName ==
                    "ServerManagement"

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