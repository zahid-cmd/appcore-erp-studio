//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Domain.Common;
using AppCore.Domain.Entities.SecurityPermission.RoleManagement;

using AppCore.Application.SecurityPermission.RoleManagement;
using AppCore.Application.SecurityPermission.RoleManagement.ActivityAssignment.DTOs;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.SecurityPermission.RoleManagement;


//===============================================================
// Activity Assignment Repository
//===============================================================

public class ActivityAssignmentRepository
    : IActivityAssignmentRepository
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public ActivityAssignmentRepository
    (
        AppDbContext context
    )
    {
        _context =
            context;
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<ActivityAssignmentDefaultsDto>
        GetDefaultsAsync()
    {
        return await Task.FromResult(

            new ActivityAssignmentDefaultsDto
            {
                Code =
                    string.Empty
            });
    }


    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<ActivityAssignmentDto>>
        GetAllAsync()
    {
        var assignments =

            await
            (
                from assignment
                in _context.Set<ActivityAssignment>()

                join roleProfile
                in _context.RoleProfiles

                on assignment.RoleProfileId
                equals roleProfile.RoleProfileId

                where
                    !assignment.IsDeleted

                orderby
                    roleProfile.ProfileName

                select new
                {
                    Assignment =
                        assignment,

                    RoleProfileName =
                        roleProfile.ProfileName
                }
            )

            .AsNoTracking()

            .ToListAsync();


        var result =
            new List<ActivityAssignmentDto>();


        foreach
        (
            var item
            in assignments
        )
        {
            var pageCount =

                await _context
                    .Set<ActivityAssignmentDetail>()

                    .CountAsync
                    (
                        x =>

                            x.ActivityAssignmentId ==
                            item.Assignment.ActivityAssignmentId

                            &&

                            !x.IsDeleted
                    );


            var masterActivityCount =

                await _context
                    .Set<ActivityAssignmentPermission>()

                    .CountAsync
                    (
                        x =>

                            !x.IsDeleted

                            &&

                            x.MasterActivityId.HasValue

                            &&

                            _context
                                .Set<ActivityAssignmentDetail>()
                                .Any
                                (
                                    d =>

                                        d.ActivityAssignmentDetailId ==
                                        x.ActivityAssignmentDetailId

                                        &&

                                        d.ActivityAssignmentId ==
                                        item.Assignment.ActivityAssignmentId

                                        &&

                                        !d.IsDeleted
                                )
                    );


            var specialActivityCount =

                await _context
                    .Set<ActivityAssignmentPermission>()

                    .CountAsync
                    (
                        x =>

                            !x.IsDeleted

                            &&

                            x.NavigationActivityId.HasValue

                            &&

                            _context
                                .Set<ActivityAssignmentDetail>()
                                .Any
                                (
                                    d =>

                                        d.ActivityAssignmentDetailId ==
                                        x.ActivityAssignmentDetailId

                                        &&

                                        d.ActivityAssignmentId ==
                                        item.Assignment.ActivityAssignmentId

                                        &&

                                        !d.IsDeleted
                                )
                    );


            result.Add(

                new ActivityAssignmentDto
                {
                    ActivityAssignmentId =
                        item.Assignment.ActivityAssignmentId,

                    RoleProfileId =
                        item.Assignment.RoleProfileId,

                    RoleProfileName =
                        item.RoleProfileName,

                    PageCount =
                        pageCount,

                    MasterActivityCount =
                        masterActivityCount,

                    SpecialActivityCount =
                        specialActivityCount,

                    TotalActivityCount =
                        masterActivityCount +
                        specialActivityCount,

                    IsActive =
                        item.Assignment.IsActive
                });
        }


        return result;
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<ActivityAssignmentDto?>
        GetByIdAsync
        (
            long activityAssignmentId
        )
    {
        var assignment =

            await
            (
                from activityAssignment
                in _context.Set<ActivityAssignment>()

                join roleProfile
                in _context.RoleProfiles

                on activityAssignment.RoleProfileId
                equals roleProfile.RoleProfileId

                where

                    activityAssignment.ActivityAssignmentId ==
                    activityAssignmentId

                    &&

                    !activityAssignment.IsDeleted

                select new ActivityAssignmentDto
                {
                    ActivityAssignmentId =
                        activityAssignment.ActivityAssignmentId,

                    RoleProfileId =
                        activityAssignment.RoleProfileId,

                    RoleProfileName =
                        roleProfile.ProfileName,

                    IsActive =
                        activityAssignment.IsActive
                }
            )

            .AsNoTracking()

            .FirstOrDefaultAsync();


        if
        (
            assignment ==
            null
        )
        {
            return null;
        }


        assignment.Details =
            await LoadDetailsAsync
            (
                assignment.ActivityAssignmentId
            );


        assignment.PageCount =
            assignment.Details.Count;


        assignment.MasterActivityCount =
            assignment.Details.Sum
            (
                x =>

                    x.ActivityAssignmentPermissions.Count
                    (
                        p =>

                            p.MasterActivityId.HasValue
                    )
            );


        assignment.SpecialActivityCount =
            assignment.Details.Sum
            (
                x =>

                    x.ActivityAssignmentPermissions.Count
                    (
                        p =>

                            p.NavigationActivityId.HasValue
                    )
            );


        assignment.TotalActivityCount =
            assignment.MasterActivityCount +
            assignment.SpecialActivityCount;


        return assignment;
    }


    //===========================================================
    // Get By Role Profile Id
    //===========================================================

    public async Task<ActivityAssignmentDto?>
        GetByRoleProfileIdAsync
        (
            long roleProfileId
        )
    {
        var assignment =

            await
            (
                from activityAssignment
                in _context.Set<ActivityAssignment>()

                join roleProfile
                in _context.RoleProfiles

                on activityAssignment.RoleProfileId
                equals roleProfile.RoleProfileId

                where

                    activityAssignment.RoleProfileId ==
                    roleProfileId

                    &&

                    !activityAssignment.IsDeleted

                select new ActivityAssignmentDto
                {
                    ActivityAssignmentId =
                        activityAssignment.ActivityAssignmentId,

                    RoleProfileId =
                        activityAssignment.RoleProfileId,

                    RoleProfileName =
                        roleProfile.ProfileName,

                    IsActive =
                        activityAssignment.IsActive
                }
            )

            .AsNoTracking()

            .FirstOrDefaultAsync();


        if
        (
            assignment ==
            null
        )
        {
            return null;
        }


        assignment.Details =
            await LoadDetailsAsync
            (
                assignment.ActivityAssignmentId
            );


        assignment.PageCount =
            assignment.Details.Count;


        assignment.MasterActivityCount =
            assignment.Details.Sum
            (
                x =>

                    x.ActivityAssignmentPermissions.Count
                    (
                        p =>

                            p.MasterActivityId.HasValue
                    )
            );


        assignment.SpecialActivityCount =
            assignment.Details.Sum
            (
                x =>

                    x.ActivityAssignmentPermissions.Count
                    (
                        p =>

                            p.NavigationActivityId.HasValue
                    )
            );


        assignment.TotalActivityCount =
            assignment.MasterActivityCount +
            assignment.SpecialActivityCount;


        return assignment;
    }


    //===========================================================
    // Load Details
    //===========================================================

    private async Task<List<ActivityAssignmentDetailDto>>
        LoadDetailsAsync
        (
            long activityAssignmentId
        )
    {
        var details =

            await
            (
                from detail
                in _context.Set<ActivityAssignmentDetail>()

                join module
                in _context.NavigationModules

                on detail.ModuleId
                equals module.Id

                join menu
                in _context.NavigationMenus

                on detail.MenuId
                equals menu.Id

                join subMenu
                in _context.NavigationSubmenus

                on detail.SubMenuId
                equals subMenu.Id

                where

                    detail.ActivityAssignmentId ==
                    activityAssignmentId

                    &&

                    !detail.IsDeleted

                select new ActivityAssignmentDetailDto
                {
                    ActivityAssignmentDetailId =
                        detail.ActivityAssignmentDetailId,

                    ActivityAssignmentId =
                        detail.ActivityAssignmentId,

                    ModuleId =
                        detail.ModuleId,

                    ModuleName =
                        module.Name,

                    MenuId =
                        detail.MenuId,

                    MenuName =
                        menu.Name,

                    SubMenuId =
                        detail.SubMenuId,

                    SubMenuName =
                        subMenu.Name,

                    IsActive =
                        detail.IsActive
                }
            )

            .AsNoTracking()

            .ToListAsync();


        foreach
        (
            var detail
            in details
        )
        {
            detail.ActivityAssignmentPermissions =

                await _context
                    .Set<ActivityAssignmentPermission>()

                    .Where
                    (
                        x =>

                            x.ActivityAssignmentDetailId ==
                            detail.ActivityAssignmentDetailId

                            &&

                            !x.IsDeleted
                    )

                    .Select
                    (
                        x =>

                            new ActivityAssignmentPermissionDto
                            {
                                ActivityAssignmentPermissionId =
                                    x.ActivityAssignmentPermissionId,

                                ActivityAssignmentDetailId =
                                    x.ActivityAssignmentDetailId,

                                MasterActivityId =
                                    x.MasterActivityId,

                                NavigationActivityId =
                                    x.NavigationActivityId
                            }
                    )

                    .AsNoTracking()

                    .ToListAsync();
        }


        return details;
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateActivityAssignmentDto dto
        )
    {
        //=======================================================
        // System User
        //=======================================================

        const long systemUserId =
            1;


        //=======================================================
        // Validation
        //=======================================================

        if
        (
            dto.RoleProfileId <= 0
        )
        {
            throw new InvalidOperationException(
                "Role Profile is required."
            );
        }


        if
        (
            dto.Details == null ||
            dto.Details.Count == 0
        )
        {
            throw new InvalidOperationException(
                "At least one activity assignment detail is required."
            );
        }


        //=======================================================
        // Duplicate Detail Validation
        //=======================================================

        var duplicateDetails =

            dto.Details
                .GroupBy
                (
                    x => new
                    {
                        x.ModuleId,
                        x.MenuId,
                        x.SubMenuId
                    }
                )
                .Any
                (
                    x =>
                        x.Count() > 1
                );


        if
        (
            duplicateDetails
        )
        {
            throw new InvalidOperationException(
                "Duplicate submenu assignment detected."
            );
        }


        //=======================================================
        // Existing Assignment Validation
        //=======================================================

        var existingAssignment =

            await _context
                .Set<ActivityAssignment>()
                .AnyAsync
                (
                    x =>

                        x.RoleProfileId ==
                        dto.RoleProfileId

                        &&

                        !x.IsDeleted
                );


        if
        (
            existingAssignment
        )
        {
            throw new InvalidOperationException(
                $"An activity assignment already exists for Role Profile Id '{dto.RoleProfileId}'."
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
            // Header
            //===================================================

            var entity =
                new ActivityAssignment
                {
                    RoleProfileId =
                        dto.RoleProfileId,

                    // IMPORTANT:
                    // Explicitly set database-required value.
                    IsActive =
                        true,

                    IsDeleted =
                        false,

                    CreatedBy =
                        systemUserId,

                    CreatedDate =
                        DateTime.UtcNow,

                    ModifiedBy =
                        null,

                    ModifiedDate =
                        null,

                    DeletedBy =
                        null,

                    DeletedDate =
                        null
                };


            //===================================================
            // Details
            //===================================================

            foreach
            (
                var detailDto
                in dto.Details
            )
            {
                var detail =
                    new ActivityAssignmentDetail
                    {
                        ModuleId =
                            detailDto.ModuleId,

                        MenuId =
                            detailDto.MenuId,

                        SubMenuId =
                            detailDto.SubMenuId,

                        // IMPORTANT:
                        // Explicitly set database-required value.
                        IsActive =
                            true,

                        IsDeleted =
                            false,

                        CreatedBy =
                            systemUserId,

                        CreatedDate =
                            DateTime.UtcNow,

                        ModifiedBy =
                            null,

                        ModifiedDate =
                            null,

                        DeletedBy =
                            null,

                        DeletedDate =
                            null
                    };


                //================================================
                // Permissions
                //================================================

                if
                (
                    detailDto.ActivityAssignmentPermissions !=
                    null
                )
                {
                    foreach
                    (
                        var permissionDto
                        in detailDto.ActivityAssignmentPermissions
                    )
                    {
                        //========================================
                        // Ignore empty permission
                        //========================================

                        if
                        (
                            !permissionDto.MasterActivityId.HasValue
                            &&
                            !permissionDto.NavigationActivityId.HasValue
                        )
                        {
                            continue;
                        }


                        var permission =
                            new ActivityAssignmentPermission
                            {
                                MasterActivityId =
                                    permissionDto.MasterActivityId,

                                NavigationActivityId =
                                    permissionDto.NavigationActivityId,

                                // IMPORTANT
                                IsActive =
                                    true,

                                IsDeleted =
                                    false,

                                CreatedBy =
                                    systemUserId,

                                CreatedDate =
                                    DateTime.UtcNow,

                                ModifiedBy =
                                    null,

                                ModifiedDate =
                                    null,

                                DeletedBy =
                                    null,

                                DeletedDate =
                                    null
                            };


                        detail.ActivityAssignmentPermissions.Add(
                            permission
                        );
                    }
                }


                entity.Details.Add(
                    detail
                );
            }


            //===================================================
            // Add Complete Graph
            //===================================================

            _context
                .Set<ActivityAssignment>()
                .Add(
                    entity
                );


            //===================================================
            // Save Complete Graph
            //===================================================

            await _context.SaveChangesAsync();


            //===================================================
            // Activity History
            //===================================================

            _context.ActivityHistories.Add(

                new ActivityHistory
                {
                    Module =
                        "Security & Permission",

                    EntityName =
                        "Activity Assignment",

                    EntityId =
                        entity.ActivityAssignmentId,

                    ActivityType =
                        "Create",

                    ActivityTitle =
                        "Activity Assignment Created",

                    ActivityDescription =
                        $"Activity Assignment created for Role Profile Id '{entity.RoleProfileId}'.",

                    PerformedBy =
                        systemUserId,

                    PerformedByName =
                        "System",

                    PerformedDate =
                        DateTime.UtcNow
                }
            );


            await _context.SaveChangesAsync();


            //===================================================
            // Commit
            //===================================================

            await transaction.CommitAsync();


            return entity.ActivityAssignmentId;
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
    }


    //===========================================================
    // Update
    //===========================================================

    public async Task<bool>
        UpdateAsync
        (
            UpdateActivityAssignmentDto dto
        )
    {
        const long systemUserId =
            1;


        //=======================================================
        // Validation
        //=======================================================

        if
        (
            dto.ActivityAssignmentId <= 0
        )
        {
            throw new InvalidOperationException(
                "Activity Assignment Id is required."
            );
        }


        if
        (
            dto.RoleProfileId <= 0
        )
        {
            throw new InvalidOperationException(
                "Role Profile is required."
            );
        }


        if
        (
            dto.Details == null ||
            dto.Details.Count == 0
        )
        {
            throw new InvalidOperationException(
                "At least one activity assignment detail is required."
            );
        }


        //=======================================================
        // Duplicate Details
        //=======================================================

        var duplicateDetails =

            dto.Details
                .GroupBy
                (
                    x => new
                    {
                        x.ModuleId,
                        x.MenuId,
                        x.SubMenuId
                    }
                )
                .Any
                (
                    x =>
                        x.Count() > 1
                );


        if
        (
            duplicateDetails
        )
        {
            throw new InvalidOperationException(
                "Duplicate submenu assignment detected."
            );
        }


        //=======================================================
        // Duplicate Role Profile
        //=======================================================

        var duplicateRoleProfile =

            await _context
                .Set<ActivityAssignment>()
                .AnyAsync
                (
                    x =>

                        x.RoleProfileId ==
                        dto.RoleProfileId

                        &&

                        x.ActivityAssignmentId !=
                        dto.ActivityAssignmentId

                        &&

                        !x.IsDeleted
                );


        if
        (
            duplicateRoleProfile
        )
        {
            throw new InvalidOperationException(
                $"An activity assignment already exists for Role Profile Id '{dto.RoleProfileId}'."
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
            // Load Header
            //===================================================

            var entity =

                await _context
                    .Set<ActivityAssignment>()

                    .FirstOrDefaultAsync
                    (
                        x =>

                            x.ActivityAssignmentId ==
                            dto.ActivityAssignmentId

                            &&

                            !x.IsDeleted
                    );


            if
            (
                entity ==
                null
            )
            {
                return false;
            }


            //===================================================
            // Update Header
            //===================================================

            entity.RoleProfileId =
                dto.RoleProfileId;

            entity.IsActive =
                true;

            entity.ModifiedBy =
                systemUserId;

            entity.ModifiedDate =
                DateTime.UtcNow;


            //===================================================
            // Existing Details
            //===================================================

            var existingDetails =

                await _context
                    .Set<ActivityAssignmentDetail>()

                    .Where
                    (
                        x =>

                            x.ActivityAssignmentId ==
                            entity.ActivityAssignmentId
                    )

                    .ToListAsync();


            var existingDetailIds =

                existingDetails
                    .Select
                    (
                        x =>
                            x.ActivityAssignmentDetailId
                    )
                    .ToList();


            //===================================================
            // Existing Permissions
            //===================================================

            if
            (
                existingDetailIds.Any()
            )
            {
                var existingPermissions =

                    await _context
                        .Set<ActivityAssignmentPermission>()

                        .Where
                        (
                            x =>

                                existingDetailIds.Contains(
                                    x.ActivityAssignmentDetailId
                                )
                        )

                        .ToListAsync();


                if
                (
                    existingPermissions.Any()
                )
                {
                    _context
                        .Set<ActivityAssignmentPermission>()
                        .RemoveRange(
                            existingPermissions
                        );
                }
            }


            //===================================================
            // Remove Existing Details
            //===================================================

            if
            (
                existingDetails.Any()
            )
            {
                _context
                    .Set<ActivityAssignmentDetail>()
                    .RemoveRange(
                        existingDetails
                    );
            }


            await _context.SaveChangesAsync();


            //===================================================
            // Insert New Details
            //===================================================

            foreach
            (
                var detailDto
                in dto.Details
            )
            {
                var detail =
                    new ActivityAssignmentDetail
                    {
                        ActivityAssignmentId =
                            entity.ActivityAssignmentId,

                        ModuleId =
                            detailDto.ModuleId,

                        MenuId =
                            detailDto.MenuId,

                        SubMenuId =
                            detailDto.SubMenuId,

                        IsActive =
                            true,

                        IsDeleted =
                            false,

                        CreatedBy =
                            systemUserId,

                        CreatedDate =
                            DateTime.UtcNow,

                        ModifiedBy =
                            null,

                        ModifiedDate =
                            null,

                        DeletedBy =
                            null,

                        DeletedDate =
                            null
                    };


                //================================================
                // Permissions
                //================================================

                if
                (
                    detailDto.ActivityAssignmentPermissions !=
                    null
                )
                {
                    foreach
                    (
                        var permissionDto
                        in detailDto.ActivityAssignmentPermissions
                    )
                    {
                        if
                        (
                            !permissionDto.MasterActivityId.HasValue
                            &&
                            !permissionDto.NavigationActivityId.HasValue
                        )
                        {
                            continue;
                        }


                        var permission =
                            new ActivityAssignmentPermission
                            {
                                MasterActivityId =
                                    permissionDto.MasterActivityId,

                                NavigationActivityId =
                                    permissionDto.NavigationActivityId,

                                IsActive =
                                    true,

                                IsDeleted =
                                    false,

                                CreatedBy =
                                    systemUserId,

                                CreatedDate =
                                    DateTime.UtcNow,

                                ModifiedBy =
                                    null,

                                ModifiedDate =
                                    null,

                                DeletedBy =
                                    null,

                                DeletedDate =
                                    null
                            };


                        detail.ActivityAssignmentPermissions.Add(
                            permission
                        );
                    }
                }


                _context
                    .Set<ActivityAssignmentDetail>()
                    .Add(
                        detail
                    );
            }


            //===================================================
            // Save
            //===================================================

            await _context.SaveChangesAsync();


            //===================================================
            // Activity History
            //===================================================

            _context.ActivityHistories.Add(

                new ActivityHistory
                {
                    Module =
                        "Security & Permission",

                    EntityName =
                        "Activity Assignment",

                    EntityId =
                        entity.ActivityAssignmentId,

                    ActivityType =
                        "Update",

                    ActivityTitle =
                        "Activity Assignment Updated",

                    ActivityDescription =
                        $"Activity Assignment updated for Role Profile Id '{entity.RoleProfileId}'.",

                    PerformedBy =
                        systemUserId,

                    PerformedByName =
                        "System",

                    PerformedDate =
                        DateTime.UtcNow
                }
            );


            await _context.SaveChangesAsync();


            //===================================================
            // Commit
            //===================================================

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
    // Delete
    //===========================================================

    public async Task<bool>
        DeleteAsync
        (
            long activityAssignmentId
        )
    {
        await using var transaction =
            await _context.Database.BeginTransactionAsync();


        try
        {
            var entity =

                await _context
                    .Set<ActivityAssignment>()

                    .FirstOrDefaultAsync
                    (
                        x =>

                            x.ActivityAssignmentId ==
                            activityAssignmentId

                            &&

                            !x.IsDeleted
                    );


            if
            (
                entity ==
                null
            )
            {
                return false;
            }


            //===================================================
            // Header
            //===================================================

            entity.IsDeleted =
                true;

            entity.DeletedBy =
                1;

            entity.DeletedDate =
                DateTime.UtcNow;

            entity.ModifiedBy =
                1;

            entity.ModifiedDate =
                DateTime.UtcNow;


            //===================================================
            // Details
            //===================================================

            var details =

                await _context
                    .Set<ActivityAssignmentDetail>()

                    .Where
                    (
                        x =>

                            x.ActivityAssignmentId ==
                            activityAssignmentId

                            &&

                            !x.IsDeleted
                    )

                    .ToListAsync();


            foreach
            (
                var detail
                in details
            )
            {
                detail.IsDeleted =
                    true;

                detail.DeletedBy =
                    1;

                detail.DeletedDate =
                    DateTime.UtcNow;
            }


            //===================================================
            // Permissions
            //===================================================

            var detailIds =

                details
                    .Select
                    (
                        x =>
                            x.ActivityAssignmentDetailId
                    )
                    .ToList();


            if
            (
                detailIds.Any()
            )
            {
                var permissions =

                    await _context
                        .Set<ActivityAssignmentPermission>()

                        .Where
                        (
                            x =>

                                detailIds.Contains(
                                    x.ActivityAssignmentDetailId
                                )

                                &&

                                !x.IsDeleted
                        )

                        .ToListAsync();


                foreach
                (
                    var permission
                    in permissions
                )
                {
                    permission.IsDeleted =
                        true;

                    permission.DeletedBy =
                        1;

                    permission.DeletedDate =
                        DateTime.UtcNow;
                }
            }


            //===================================================
            // History
            //===================================================

            _context.ActivityHistories.Add(

                new ActivityHistory
                {
                    Module =
                        "Security & Permission",

                    EntityName =
                        "Activity Assignment",

                    EntityId =
                        entity.ActivityAssignmentId,

                    ActivityType =
                        "Delete",

                    ActivityTitle =
                        "Activity Assignment Deleted",

                    ActivityDescription =
                        $"Activity Assignment deleted for Role Profile Id '{entity.RoleProfileId}'.",

                    PerformedBy =
                        1,

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
    // Restore Last Deleted
    //===========================================================

    public async Task<bool>
        RestoreLastDeletedAsync()
    {
        await using var transaction =
            await _context.Database.BeginTransactionAsync();


        try
        {
            var entity =

                await _context
                    .Set<ActivityAssignment>()

                    .Where
                    (
                        x =>
                            x.IsDeleted
                    )

                    .OrderByDescending
                    (
                        x =>
                            x.DeletedDate
                    )

                    .FirstOrDefaultAsync();


            if
            (
                entity ==
                null
            )
            {
                return false;
            }


            //===================================================
            // Header
            //===================================================

            entity.IsDeleted =
                false;

            entity.DeletedBy =
                null;

            entity.DeletedDate =
                null;

            entity.IsActive =
                true;

            entity.ModifiedBy =
                1;

            entity.ModifiedDate =
                DateTime.UtcNow;


            //===================================================
            // Details
            //===================================================

            var details =

                await _context
                    .Set<ActivityAssignmentDetail>()

                    .Where
                    (
                        x =>

                            x.ActivityAssignmentId ==
                            entity.ActivityAssignmentId

                            &&

                            x.IsDeleted
                    )

                    .ToListAsync();


            foreach
            (
                var detail
                in details
            )
            {
                detail.IsDeleted =
                    false;

                detail.DeletedBy =
                    null;

                detail.DeletedDate =
                    null;

                detail.IsActive =
                    true;

                detail.ModifiedBy =
                    1;

                detail.ModifiedDate =
                    DateTime.UtcNow;
            }


            //===================================================
            // Permissions
            //===================================================

            var detailIds =

                details
                    .Select
                    (
                        x =>
                            x.ActivityAssignmentDetailId
                    )
                    .ToList();


            if
            (
                detailIds.Any()
            )
            {
                var permissions =

                    await _context
                        .Set<ActivityAssignmentPermission>()

                        .Where
                        (
                            x =>

                                detailIds.Contains(
                                    x.ActivityAssignmentDetailId
                                )

                                &&

                                x.IsDeleted
                        )

                        .ToListAsync();


                foreach
                (
                    var permission
                    in permissions
                )
                {
                    permission.IsDeleted =
                        false;

                    permission.DeletedBy =
                        null;

                    permission.DeletedDate =
                        null;

                    permission.IsActive =
                        true;

                    permission.ModifiedBy =
                        1;

                    permission.ModifiedDate =
                        DateTime.UtcNow;
                }
            }


            //===================================================
            // History
            //===================================================

            _context.ActivityHistories.Add(

                new ActivityHistory
                {
                    Module =
                        "Security & Permission",

                    EntityName =
                        "Activity Assignment",

                    EntityId =
                        entity.ActivityAssignmentId,

                    ActivityType =
                        "Restore",

                    ActivityTitle =
                        "Activity Assignment Restored",

                    ActivityDescription =
                        $"Activity Assignment restored for Role Profile Id '{entity.RoleProfileId}'.",

                    PerformedBy =
                        1,

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
}