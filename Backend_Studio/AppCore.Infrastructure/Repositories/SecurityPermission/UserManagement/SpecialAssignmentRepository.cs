//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Common.ActivityHistory.DTOs;

using AppCore.Application.SecurityPermission.UserManagement;

using AppCore.Domain.Common;

using AppCore.Domain.Entities.SecurityPermission.UserManagement;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.SecurityPermission.UserManagement;


//===============================================================
// SpecialAssignmentRepository
//===============================================================

public class SpecialAssignmentRepository
    : ISpecialAssignmentRepository
{

    //===========================================================
    // DbContext
    //===========================================================

    private readonly AppDbContext
        _context;



    //===========================================================
    // Constructor
    //===========================================================

    public SpecialAssignmentRepository
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

    public async Task<IReadOnlyList<SpecialAssignment>>
        GetAllAsync()
    {
        var entities =
            await _context
                .Set<SpecialAssignment>()

                .AsNoTracking()

                //================================================
                // Details
                //================================================

                .Include(
                    x =>
                        x.Details
                )

                //================================================
                // Permissions
                //================================================

                .ThenInclude(
                    x =>
                        x.SpecialAssignmentPermissions
                )

                //================================================
                // Master Filter
                //================================================

                .Where(
                    x =>
                        !x.IsDeleted
                )

                //================================================
                // Order
                //================================================

                .OrderBy(
                    x =>
                        x.UserProfileId
                )

                .ToListAsync();


        //=======================================================
        // Clean Deleted Details
        //=======================================================

        foreach
        (
            var entity
            in
            entities
        )
        {
            entity.Details =
                entity.Details

                    .Where(
                        detail =>
                            !detail.IsDeleted
                    )

                    .ToList();


            //===================================================
            // Clean Deleted Permissions
            //===================================================

            foreach
            (
                var detail
                in
                entity.Details
            )
            {
                detail.SpecialAssignmentPermissions =
                    detail
                        .SpecialAssignmentPermissions

                        .Where(
                            permission =>
                                !permission.IsDeleted
                        )

                        .ToList();
            }
        }


        //=======================================================
        // Break Serialization Cycles
        //=======================================================

        foreach
        (
            var entity
            in
            entities
        )
        {
            foreach
            (
                var detail
                in
                entity.Details
            )
            {
                detail.SpecialAssignment =
                    null!;


                foreach
                (
                    var permission
                    in
                    detail.SpecialAssignmentPermissions
                )
                {
                    permission.SpecialAssignmentDetail =
                        null!;
                }
            }
        }


        return entities;
    }



    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<SpecialAssignment?>
        GetByIdAsync
    (
        long id
    )
    {
        var entity =
            await _context
                .Set<SpecialAssignment>()

                .AsNoTracking()

                //================================================
                // Details
                //================================================

                .Include(
                    x =>
                        x.Details
                )

                //================================================
                // Permissions
                //================================================

                .ThenInclude(
                    x =>
                        x.SpecialAssignmentPermissions
                )

                .FirstOrDefaultAsync(
                    x =>
                        x.SpecialAssignmentId ==
                        id

                        &&

                        !x.IsDeleted
                );


        if
        (
            entity is null
        )
        {
            return null;
        }


        //=======================================================
        // Remove Deleted Details
        //=======================================================

        entity.Details =
            entity.Details

                .Where(
                    detail =>
                        !detail.IsDeleted
                )

                .ToList();


        //=======================================================
        // Remove Deleted Permissions
        //=======================================================

        foreach
        (
            var detail
            in
            entity.Details
        )
        {
            detail.SpecialAssignmentPermissions =
                detail
                    .SpecialAssignmentPermissions

                    .Where(
                        permission =>
                            !permission.IsDeleted
                    )

                    .ToList();
        }


        //=======================================================
        // Break Serialization Cycles
        //=======================================================

        foreach
        (
            var detail
            in
            entity.Details
        )
        {
            detail.SpecialAssignment =
                null!;


            foreach
            (
                var permission
                in
                detail.SpecialAssignmentPermissions
            )
            {
                permission.SpecialAssignmentDetail =
                    null!;
            }
        }


        return entity;
    }



    //===========================================================
    // Exists By User Profile Id
    //===========================================================

    public async Task<bool>
        ExistsByUserProfileIdAsync
    (
        long userProfileId
    )
    {
        return await _context
            .Set<SpecialAssignment>()

            .AsNoTracking()

            .AnyAsync(
                x =>
                    x.UserProfileId ==
                    userProfileId

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
        SpecialAssignment entity
    )
    {
        const long userId =
            1;


        //=======================================================
        // Master Audit
        //=======================================================

        entity.IsActive =
            true;


        entity.IsDeleted =
            false;


        entity.DeletedBy =
            null;


        entity.DeletedDate =
            null;


        entity.CreatedBy =
            userId;


        entity.CreatedDate =
            DateTime.UtcNow;


        entity.ModifiedBy =
            null;


        entity.ModifiedDate =
            null;


        //=======================================================
        // Detail Audit
        //=======================================================

        foreach
        (
            var detail
            in
            entity.Details
        )
        {
            detail.IsActive =
                true;


            detail.IsDeleted =
                false;


            detail.DeletedBy =
                null;


            detail.DeletedDate =
                null;


            detail.CreatedBy =
                userId;


            detail.CreatedDate =
                DateTime.UtcNow;


            detail.ModifiedBy =
                null;


            detail.ModifiedDate =
                null;


            //===================================================
            // Permission Audit
            //===================================================

            foreach
            (
                var permission
                in
                detail.SpecialAssignmentPermissions
            )
            {
                permission.IsActive =
                    true;


                permission.IsDeleted =
                    false;


                permission.DeletedBy =
                    null;


                permission.DeletedDate =
                    null;


                permission.CreatedBy =
                    userId;


                permission.CreatedDate =
                    DateTime.UtcNow;


                permission.ModifiedBy =
                    null;


                permission.ModifiedDate =
                    null;
            }
        }


        //=======================================================
        // Add Graph
        //=======================================================

        await _context
            .Set<SpecialAssignment>()
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
                    "SecurityPermission",

                EntityName =
                    "SpecialAssignment",

                EntityId =
                    entity.SpecialAssignmentId,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "SpecialAssignment Created",

                ActivityDescription =
                    $"SpecialAssignment for UserProfile '{entity.UserProfileId}' was created.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();


        return entity.SpecialAssignmentId;
    }



    //===========================================================
    // Update
    //===========================================================

    public async Task
        UpdateAsync
    (
        SpecialAssignment entity
    )
    {
        const long userId =
            1;


        //=======================================================
        // Load Existing Graph
        //=======================================================

        var existing =
            await _context
                .Set<SpecialAssignment>()

                .Include(
                    x =>
                        x.Details
                )

                .ThenInclude(
                    x =>
                        x.SpecialAssignmentPermissions
                )

                .FirstOrDefaultAsync(
                    x =>
                        x.SpecialAssignmentId ==
                        entity.SpecialAssignmentId

                        &&

                        !x.IsDeleted
                );


        if
        (
            existing is null
        )
        {
            throw new InvalidOperationException(
                "SpecialAssignment record was not found."
            );
        }


        //=======================================================
        // Master
        //=======================================================

        existing.UserProfileId =
            entity.UserProfileId;


        existing.IsActive =
            entity.IsActive;


        existing.ModifiedBy =
            userId;


        existing.ModifiedDate =
            DateTime.UtcNow;


        //=======================================================
        // Remove Existing Permissions
        //=======================================================

        foreach
        (
            var detail
            in
            existing.Details
        )
        {
            _context
                .Set<SpecialAssignmentPermission>()
                .RemoveRange(
                    detail.SpecialAssignmentPermissions
                );
        }


        //=======================================================
        // Remove Existing Details
        //=======================================================

        _context
            .Set<SpecialAssignmentDetail>()
            .RemoveRange(
                existing.Details
            );


        //=======================================================
        // Add New Details
        //=======================================================

        existing.Details =
            new List<SpecialAssignmentDetail>();


        foreach
        (
            var sourceDetail
            in
            entity.Details
        )
        {
            var detail =
                new SpecialAssignmentDetail
                {
                    SpecialAssignmentId =
                        existing.SpecialAssignmentId,

                    ModuleId =
                        sourceDetail.ModuleId,

                    MenuId =
                        sourceDetail.MenuId,

                    SubMenuId =
                        sourceDetail.SubMenuId,

                    IsActive =
                        sourceDetail.IsActive,

                    IsDeleted =
                        false,

                    DeletedBy =
                        null,

                    DeletedDate =
                        null,

                    CreatedBy =
                        userId,

                    CreatedDate =
                        DateTime.UtcNow,

                    ModifiedBy =
                        null,

                    ModifiedDate =
                        null,

                    SpecialAssignmentPermissions =
                        new List<SpecialAssignmentPermission>()
                };


            //===================================================
            // Add Permissions
            //===================================================

            foreach
            (
                var sourcePermission
                in
                sourceDetail.SpecialAssignmentPermissions
            )
            {
                var permission =
                    new SpecialAssignmentPermission
                    {
                        MasterActivityId =
                            sourcePermission.MasterActivityId,

                        NavigationActivityId =
                            sourcePermission.NavigationActivityId,

                        IsActive =
                            sourcePermission.IsActive,

                        IsDeleted =
                            false,

                        DeletedBy =
                            null,

                        DeletedDate =
                            null,

                        CreatedBy =
                            userId,

                        CreatedDate =
                            DateTime.UtcNow,

                        ModifiedBy =
                            null,

                        ModifiedDate =
                            null
                    };


                detail
                    .SpecialAssignmentPermissions
                    .Add(
                        permission
                    );
            }


            existing
                .Details
                .Add(
                    detail
                );
        }


        //=======================================================
        // Activity History
        //=======================================================

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "SecurityPermission",

                EntityName =
                    "SpecialAssignment",

                EntityId =
                    existing.SpecialAssignmentId,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "SpecialAssignment Updated",

                ActivityDescription =
                    $"SpecialAssignment for UserProfile '{existing.UserProfileId}' was updated.",

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
                .Set<SpecialAssignment>()

                .FirstOrDefaultAsync(
                    x =>
                        x.SpecialAssignmentId ==
                        id

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


        //=======================================================
        // Soft Delete
        //=======================================================

        entity.IsDeleted =
            true;


        entity.IsActive =
            false;


        entity.DeletedBy =
            userId;


        entity.DeletedDate =
            DateTime.UtcNow;


        entity.ModifiedBy =
            userId;


        entity.ModifiedDate =
            DateTime.UtcNow;


        //=======================================================
        // Activity History
        //=======================================================

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "SecurityPermission",

                EntityName =
                    "SpecialAssignment",

                EntityId =
                    entity.SpecialAssignmentId,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "SpecialAssignment Deleted",

                ActivityDescription =
                    $"SpecialAssignment for UserProfile '{entity.UserProfileId}' was deleted.",

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
    // Restore Last Deleted
    //===========================================================

    public async Task<bool>
        RestoreLastDeletedAsync()
    {
        const long userId =
            1;


        //=======================================================
        // Find Most Recently Deleted Record
        //=======================================================

        var entity =
            await _context
                .Set<SpecialAssignment>()

                .Where(
                    x =>
                        x.IsDeleted
                )

                .OrderByDescending(
                    x =>
                        x.DeletedDate
                )

                .ThenByDescending(
                    x =>
                        x.SpecialAssignmentId
                )

                .FirstOrDefaultAsync();


        //=======================================================
        // Nothing To Restore
        //=======================================================

        if
        (
            entity is null
        )
        {
            return false;
        }


        //=======================================================
        // Restore Master
        //=======================================================

        entity.IsDeleted =
            false;


        entity.IsActive =
            true;


        entity.DeletedBy =
            null;


        entity.DeletedDate =
            null;


        entity.ModifiedBy =
            userId;


        entity.ModifiedDate =
            DateTime.UtcNow;


        //=======================================================
        // Restore Details
        //=======================================================

        var details =
            await _context
                .Set<SpecialAssignmentDetail>()
                .Where(
                    x =>
                        x.SpecialAssignmentId ==
                        entity.SpecialAssignmentId
                )
                .ToListAsync();


        foreach
        (
            var detail
            in
            details
        )
        {
            detail.IsDeleted =
                false;


            detail.IsActive =
                true;


            detail.DeletedBy =
                null;


            detail.DeletedDate =
                null;


            detail.ModifiedBy =
                userId;


            detail.ModifiedDate =
                DateTime.UtcNow;
        }


        //=======================================================
        // Restore Permissions
        //=======================================================

        var detailIds =
            details
                .Select(
                    x =>
                        x.SpecialAssignmentDetailId
                )
                .ToList();


        if
        (
            detailIds.Count > 0
        )
        {
            var permissions =
                await _context
                    .Set<SpecialAssignmentPermission>()
                    .Where(
                        x =>
                            detailIds.Contains(
                                x.SpecialAssignmentDetailId
                            )
                    )
                    .ToListAsync();


            foreach
            (
                var permission
                in
                permissions
            )
            {
                permission.IsDeleted =
                    false;


                permission.IsActive =
                    true;


                permission.DeletedBy =
                    null;


                permission.DeletedDate =
                    null;


                permission.ModifiedBy =
                    userId;


                permission.ModifiedDate =
                    DateTime.UtcNow;
            }
        }


        //=======================================================
        // Activity History
        //=======================================================

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "SecurityPermission",

                EntityName =
                    "SpecialAssignment",

                EntityId =
                    entity.SpecialAssignmentId,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "SpecialAssignment Restored",

                ActivityDescription =
                    $"SpecialAssignment for UserProfile '{entity.UserProfileId}' was restored.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        //=======================================================
        // Save
        //=======================================================

        await _context.SaveChangesAsync();


        return true;
    }



    //===========================================================
    // Get History
    //===========================================================

    public async Task<IReadOnlyList<ActivityHistoryDto>>
        GetHistoryAsync()
    {
        return await _context
            .ActivityHistories

            .AsNoTracking()

            .Where(
                x =>
                    x.Module ==
                    "SecurityPermission"

                    &&

                    x.EntityName ==
                    "SpecialAssignment"
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
        return await _context
            .ActivityHistories

            .AsNoTracking()

            .Where(
                x =>
                    x.Module ==
                    "SecurityPermission"

                    &&

                    x.EntityName ==
                    "SpecialAssignment"

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