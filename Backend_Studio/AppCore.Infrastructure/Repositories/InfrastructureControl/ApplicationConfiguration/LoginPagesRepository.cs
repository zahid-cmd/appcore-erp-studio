//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Common.ActivityHistory.DTOs;

using AppCore.Domain.Common;

using AppCore.Infrastructure.CodeMaster;

using AppCore.Infrastructure.Persistence;

using global::AppCore.Application.InfrastructureControl.ApplicationConfiguration;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.ApplicationConfiguration;


//===============================================================
// LoginPagesRepository
//===============================================================

public class LoginPagesRepository
    : ILoginPagesRepository
{

    //===========================================================
    // DbContext
    //===========================================================

    private readonly AppDbContext
        _context;



    //===========================================================
    // Constructor
    //===========================================================

    public LoginPagesRepository
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

    public async Task<IReadOnlyList<global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.LoginPages>>
        GetAllAsync()
    {
        return await _context
            .Set<global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.LoginPages>()
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

    public async Task<global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.LoginPages?>
        GetByIdAsync
    (
        long id
    )
    {
        return await _context
            .Set<global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.LoginPages>()
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x =>
                    x.Id == id
                    &&
                    !x.IsDeleted
            );
    }



    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<LoginPagesDefaultsDto>
        GetDefaultsAsync()
    {
        var existingCodes =
            await _context
                .Set<global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.LoginPages>()
                .AsNoTracking()
                .Where(
                    x =>
                        x.Code.StartsWith(
                            "LP-"
                        )
                )
                .Select(
                    x =>
                        x.Code
                )
                .ToListAsync();


        var nextSequenceNo =
            1;


        foreach
        (
            var code
            in
            existingCodes
        )
        {
            if
            (
                code.Length <= 3
            )
            {
                continue;
            }


            var sequenceText =
                code.Substring(
                    3
                );


            if
            (
                int.TryParse(
                    sequenceText,
                    out var sequenceNo
                )
            )
            {
                if
                (
                    sequenceNo >= nextSequenceNo
                )
                {
                    nextSequenceNo =
                        sequenceNo + 1;
                }
            }
        }


        return new LoginPagesDefaultsDto
        {
            Code =
                CodeGenerator.GenerateLoginPagesCode(
                    nextSequenceNo
                )
        };
    }



    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
    (
        global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.LoginPages entity
    )
    {
        const long userId =
            1;


        //=======================================================
        // Generate Code
        //=======================================================

        var existingCodes =
            await _context
                .Set<global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.LoginPages>()
                .AsNoTracking()
                .Where(
                    x =>
                        x.Code.StartsWith(
                            "LP-"
                        )
                )
                .Select(
                    x =>
                        x.Code
                )
                .ToListAsync();


        var nextSequenceNo =
            1;


        foreach
        (
            var code
            in
            existingCodes
        )
        {
            if
            (
                code.Length <= 3
            )
            {
                continue;
            }


            var sequenceText =
                code.Substring(
                    3
                );


            if
            (
                int.TryParse(
                    sequenceText,
                    out var sequenceNo
                )
            )
            {
                if
                (
                    sequenceNo >= nextSequenceNo
                )
                {
                    nextSequenceNo =
                        sequenceNo + 1;
                }
            }
        }


        entity.Code =
            CodeGenerator.GenerateLoginPagesCode(
                nextSequenceNo
            );


        //=======================================================
        // System Fields
        //=======================================================

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
            .Set<global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.LoginPages>()
            .AddAsync(
                entity
            );


        await _context.SaveChangesAsync();


        //=======================================================
        // Activity History
        //=======================================================

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "InfrastructureControl",

                EntityName =
                    "LoginPages",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "LoginPages Created",

                ActivityDescription =
                    $"LoginPages '{entity.Name}' was created.",

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
        global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.LoginPages entity
    )
    {
        const long userId =
            1;


        var existing =
            await _context
                .Set<global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.LoginPages>()
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
                "LoginPages record was not found."
            );
        }


        existing.Code =
            entity.Code;


        existing.Name =
            entity.Name;


        existing.PageKey =
            entity.PageKey;


        existing.Title =
            entity.Title;


        existing.Subtitle =
            entity.Subtitle;


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
                    "LoginPages",

                EntityId =
                    existing.Id,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "LoginPages Updated",

                ActivityDescription =
                    $"LoginPages '{existing.Name}' was updated.",

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
                .Set<global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.LoginPages>()
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
                    "LoginPages",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "LoginPages Deleted",

                ActivityDescription =
                    $"LoginPages '{entity.Name}' was deleted.",

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

    public async Task<bool>
        RestoreAsync()
    {
        const long userId =
            1;


        var entity =
            await _context
                .Set<global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.LoginPages>()
                .Where(
                    x =>
                        x.IsDeleted
                )
                .OrderByDescending(
                    x =>
                        x.ModifiedDate
                )
                .FirstOrDefaultAsync();


        if
        (
            entity is null
        )
        {
            return false;
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
                    "LoginPages",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "LoginPages Restored",

                ActivityDescription =
                    $"LoginPages '{entity.Name}' was restored.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();


        return true;
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
                    "LoginPages"
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
                    "LoginPages"

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