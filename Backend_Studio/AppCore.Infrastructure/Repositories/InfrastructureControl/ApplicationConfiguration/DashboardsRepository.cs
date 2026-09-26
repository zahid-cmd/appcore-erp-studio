//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Common.ActivityHistory.DTOs;

using AppCore.Domain.Common;

using AppCore.Domain.Entities.SecurityPermission.RoleManagement;

using AppCore.Infrastructure.CodeMaster;

using AppCore.Infrastructure.Persistence;

using global::AppCore.Application.InfrastructureControl.ApplicationConfiguration;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.ApplicationConfiguration;


//===============================================================
// DashboardsRepository
//===============================================================

public class DashboardsRepository
    : IDashboardsRepository
{

    //===========================================================
    // DbContext
    //===========================================================

    private readonly AppDbContext
        _context;



    //===========================================================
    // Constructor
    //===========================================================

    public DashboardsRepository
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

    public async Task<IReadOnlyList<global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.Dashboards>>
        GetAllAsync()
    {
        var dashboards =
            await _context
                .Set<global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.Dashboards>()
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


        //=======================================================
        // Set Default Dashboard Role Profile
        //=======================================================

        foreach
        (
            var dashboard
            in
            dashboards
        )
        {
            if
            (
                dashboard.DashboardType.Equals(
                    "default",
                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                dashboard.RoleProfileName =
                    "Not Applicable";
            }
        }


        //=======================================================
        // Load Role Profile IDs
        //=======================================================

        var roleProfileIds =
            dashboards
                .Where(
                    x =>
                        x.RoleProfileId.HasValue

                        &&

                        !x.DashboardType.Equals(
                            "default",
                            StringComparison.OrdinalIgnoreCase
                        )
                )
                .Select(
                    x =>
                        x.RoleProfileId!.Value
                )
                .Distinct()
                .ToList();


        //=======================================================
        // Load Role Profile Names
        //=======================================================

        if
        (
            roleProfileIds.Count > 0
        )
        {
            var roleProfiles =
                await _context
                    .Set<RoleProfile>()
                    .AsNoTracking()
                    .Where(
                        x =>
                            roleProfileIds.Contains(
                                x.RoleProfileId
                            )

                            &&

                            !x.IsDeleted
                    )
                    .ToDictionaryAsync(
                        x =>
                            x.RoleProfileId,

                        x =>
                            x.ProfileName
                    );


            foreach
            (
                var dashboard
                in
                dashboards
            )
            {
                if
                (
                    dashboard.RoleProfileId.HasValue
                    &&
                    !dashboard.DashboardType.Equals(
                        "default",
                        StringComparison.OrdinalIgnoreCase
                    )
                    &&
                    roleProfiles.TryGetValue(
                        dashboard.RoleProfileId.Value,
                        out var profileName
                    )
                )
                {
                    dashboard.RoleProfileName =
                        profileName;
                }
            }
        }


        return dashboards;
    }



    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.Dashboards?>
        GetByIdAsync
    (
        long id
    )
    {
        var dashboard =
            await _context
                .Set<global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.Dashboards>()
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x =>
                        x.Id == id
                        &&
                        !x.IsDeleted
                );


        if
        (
            dashboard is null
        )
        {
            return null;
        }


        //=======================================================
        // Default Dashboard
        //=======================================================

        if
        (
            dashboard.DashboardType.Equals(
                "default",
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            dashboard.RoleProfileName =
                "Not Applicable";

            return dashboard;
        }


        //=======================================================
        // Load Role Profile Name
        //=======================================================

        if
        (
            dashboard.RoleProfileId.HasValue
        )
        {
            dashboard.RoleProfileName =
                await _context
                    .Set<RoleProfile>()
                    .AsNoTracking()
                    .Where(
                        x =>
                            x.RoleProfileId ==
                            dashboard.RoleProfileId.Value

                            &&

                            !x.IsDeleted
                    )
                    .Select(
                        x =>
                            x.ProfileName
                    )
                    .FirstOrDefaultAsync()
                    ??
                    string.Empty;
        }


        return dashboard;
    }



    //===========================================================
    // Get Active
    //===========================================================

    public async Task<global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.Dashboards?>
        GetActiveAsync()
    {
        var dashboard =
            await _context
                .Set<global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.Dashboards>()
                .AsNoTracking()
                .Where(
                    x =>
                        !x.IsDeleted
                        &&
                        x.Status
                )
                .OrderBy(
                    x =>
                        x.Name
                )
                .FirstOrDefaultAsync();


        if
        (
            dashboard is null
        )
        {
            return null;
        }


        //=======================================================
        // Default Dashboard
        //=======================================================

        if
        (
            dashboard.DashboardType.Equals(
                "default",
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            dashboard.RoleProfileName =
                "Not Applicable";

            return dashboard;
        }


        //=======================================================
        // Load Role Profile Name
        //=======================================================

        if
        (
            dashboard.RoleProfileId.HasValue
        )
        {
            dashboard.RoleProfileName =
                await _context
                    .Set<RoleProfile>()
                    .AsNoTracking()
                    .Where(
                        x =>
                            x.RoleProfileId ==
                            dashboard.RoleProfileId.Value

                            &&

                            !x.IsDeleted
                    )
                    .Select(
                        x =>
                            x.ProfileName
                    )
                    .FirstOrDefaultAsync()
                    ??
                    string.Empty;
        }


        return dashboard;
    }



    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<DashboardsDefaultsDto>
        GetDefaultsAsync()
    {
        var existingCodes =
            await _context
                .Set<global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.Dashboards>()
                .AsNoTracking()
                .Where(
                    x =>
                        x.Code.StartsWith(
                            "DSB-"
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
                code.Length <= 4
            )
            {
                continue;
            }


            var sequenceText =
                code.Substring(
                    4
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


        return new DashboardsDefaultsDto
        {
            Code =
                CodeGenerator.GenerateDashboardsCode(
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
        global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.Dashboards entity
    )
    {
        const long userId =
            1;


        //=======================================================
        // Generate Code
        //=======================================================

        var existingCodes =
            await _context
                .Set<global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.Dashboards>()
                .AsNoTracking()
                .Where(
                    x =>
                        x.Code.StartsWith(
                            "DSB-"
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
                code.Length <= 4
            )
            {
                continue;
            }


            var sequenceText =
                code.Substring(
                    4
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
            CodeGenerator.GenerateDashboardsCode(
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
            .Set<global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.Dashboards>()
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
                    "Dashboards",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Dashboard Created",

                ActivityDescription =
                    $"Dashboard '{entity.Name}' was created.",

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
        global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.Dashboards entity
    )
    {
        const long userId =
            1;


        var existing =
            await _context
                .Set<global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.Dashboards>()
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
                "Dashboard record was not found."
            );
        }


        //=======================================================
        // Transaction
        //=======================================================

        await using var transaction =
            await _context.Database.BeginTransactionAsync();


        try
        {
            //===================================================
            // Update Selected Dashboard
            //===================================================

            existing.Code =
                entity.Code;


            existing.Name =
                entity.Name;


            existing.DashboardKey =
                entity.DashboardKey;


            existing.DashboardType =
                entity.DashboardType;


            existing.RoleProfileId =
                entity.RoleProfileId;


            existing.Status =
                entity.Status;


            existing.Remarks =
                entity.Remarks;


            existing.ModifiedBy =
                userId;


            existing.ModifiedDate =
                DateTime.UtcNow;


            //===================================================
            // Activity History
            //===================================================

            _context.ActivityHistories.Add(
                new ActivityHistory
                {
                    Module =
                        "InfrastructureControl",

                    EntityName =
                        "Dashboards",

                    EntityId =
                        existing.Id,

                    ActivityType =
                        "Update",

                    ActivityTitle =
                        "Dashboard Updated",

                    ActivityDescription =
                        $"Dashboard '{existing.Name}' was updated.",

                    PerformedBy =
                        userId,

                    PerformedByName =
                        "System",

                    PerformedDate =
                        DateTime.UtcNow
                }
            );


            //===================================================
            // Save
            //===================================================

            await _context.SaveChangesAsync();


            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
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
                .Set<global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.Dashboards>()
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


        entity.Status =
            false;


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
                    "Dashboards",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "Dashboard Deleted",

                ActivityDescription =
                    $"Dashboard '{entity.Name}' was deleted.",

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
                .Set<global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.Dashboards>()
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


        await using var transaction =
            await _context.Database.BeginTransactionAsync();


        try
        {
            //===================================================
            // Restore Selected Dashboard
            //===================================================

            entity.IsDeleted =
                false;


            entity.IsActive =
                true;


            //===================================================
            // System Fields
            //===================================================

            entity.ModifiedBy =
                userId;


            entity.ModifiedDate =
                DateTime.UtcNow;


            //===================================================
            // Activity History
            //===================================================

            _context.ActivityHistories.Add(
                new ActivityHistory
                {
                    Module =
                        "InfrastructureControl",

                    EntityName =
                        "Dashboards",

                    EntityId =
                        entity.Id,

                    ActivityType =
                        "Restore",

                    ActivityTitle =
                        "Dashboard Restored",

                    ActivityDescription =
                        $"Dashboard '{entity.Name}' was restored.",

                    PerformedBy =
                        userId,

                    PerformedByName =
                        "System",

                    PerformedDate =
                        DateTime.UtcNow
                }
            );


            await _context.SaveChangesAsync();


            await transaction.CommitAsync();


            return true;
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
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
                    "Dashboards"
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
                    "Dashboards"

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