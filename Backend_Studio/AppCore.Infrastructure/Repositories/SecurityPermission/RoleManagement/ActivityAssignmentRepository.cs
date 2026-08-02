//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Domain.Common;
using AppCore.Domain.Entities.SecurityPermission.RoleManagement;

using AppCore.Application.SecurityPermission.RoleManagement.ActivityAssignment.DTOs;
using AppCore.Application.SecurityPermission.RoleManagement.ActivityAssignment.Interfaces;

using AppCore.Infrastructure.Persistence;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.SecurityPermission.RoleManagement;

//===============================================================
// Repository
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

    public ActivityAssignmentRepository(
        AppDbContext context)
    {
        _context = context;
    }

    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<ActivityAssignmentDto> GetDefaultsAsync()
    {
        return await Task.FromResult(

            new ActivityAssignmentDto
            {
                ActivityAssignmentId = 0,

                RoleProfileId = 0,

                RoleProfileName = string.Empty,

                PageCount = 0,

                MasterActivityCount = 0,

                SpecialActivityCount = 0,

                TotalActivityCount = 0,

                IsActive = true,

                Details = new()
            });
    }

    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<ActivityAssignmentDto>> GetAllAsync()
    {
        var assignments =

            await

            (
                from assignment
                in _context.ActivityAssignments

                join roleProfile
                in _context.RoleProfiles

                on assignment.RoleProfileId
                equals roleProfile.RoleProfileId

                where
                    !assignment.IsDeleted

                orderby roleProfile.ProfileName

                select new
                {
                    Assignment =
                        assignment,

                    RoleProfileName =
                        roleProfile.DisplayName
                }

            )

            .AsNoTracking()

            .ToListAsync();

        var result =
            new List<ActivityAssignmentDto>();

        foreach (var item in assignments)
        {
            var pageCount =

                await _context.ActivityAssignmentDetails

                    .CountAsync(x =>

                        x.ActivityAssignmentId ==
                        item.Assignment.ActivityAssignmentId

                        &&

                        !x.IsDeleted);

            var masterActivityCount =

                await _context.ActivityAssignmentPermissions

                    .CountAsync(x =>

                        !x.IsDeleted

                        &&

                        x.MasterActivityId != null

                        &&

                        _context.ActivityAssignmentDetails.Any
                        (
                            d =>

                                d.ActivityAssignmentDetailId ==
                                x.ActivityAssignmentDetailId

                                &&

                                d.ActivityAssignmentId ==
                                item.Assignment.ActivityAssignmentId

                                &&

                                !d.IsDeleted
                        ));

            var specialActivityCount =

                await _context.ActivityAssignmentPermissions

                    .CountAsync(x =>

                        !x.IsDeleted

                        &&

                        x.NavigationActivityId != null

                        &&

                        _context.ActivityAssignmentDetails.Any
                        (
                            d =>

                                d.ActivityAssignmentDetailId ==
                                x.ActivityAssignmentDetailId

                                &&

                                d.ActivityAssignmentId ==
                                item.Assignment.ActivityAssignmentId

                                &&

                                !d.IsDeleted
                        ));

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

    public async Task<ActivityAssignmentDto?> GetByIdAsync(
        long activityAssignmentId)
    {
        var assignment =

            await
            (
                from activityAssignment
                in _context.ActivityAssignments

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

        if (assignment == null)
        {
            return null;
        }

        assignment.Details =
            await LoadDetailsAsync(
                assignment.ActivityAssignmentId);

        assignment.PageCount =
            assignment.Details.Count;

        assignment.MasterActivityCount =
            assignment.Details.Sum(x =>
                x.ActivityAssignmentPermissions.Count(p =>
                    p.MasterActivityId.HasValue));

        assignment.SpecialActivityCount =
            assignment.Details.Sum(x =>
                x.ActivityAssignmentPermissions.Count(p =>
                    p.NavigationActivityId.HasValue));

        assignment.TotalActivityCount =
            assignment.MasterActivityCount +
            assignment.SpecialActivityCount;

        return assignment;
    }

    //===========================================================
    // Get By Role Profile Id
    //===========================================================

    public async Task<ActivityAssignmentDto?> GetByRoleProfileIdAsync(
        long roleProfileId)
    {
        var assignment =

            await
            (
                from activityAssignment
                in _context.ActivityAssignments

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

        if (assignment == null)
        {
            return null;
        }

        assignment.Details =
            await LoadDetailsAsync(
                assignment.ActivityAssignmentId);

        assignment.PageCount =
            assignment.Details.Count;

        assignment.MasterActivityCount =
            assignment.Details.Sum(x =>
                x.ActivityAssignmentPermissions.Count(p =>
                    p.MasterActivityId.HasValue));

        assignment.SpecialActivityCount =
            assignment.Details.Sum(x =>
                x.ActivityAssignmentPermissions.Count(p =>
                    p.NavigationActivityId.HasValue));

        assignment.TotalActivityCount =
            assignment.MasterActivityCount +
            assignment.SpecialActivityCount;

        return assignment;
    }

    //===========================================================
    // Load Details
    //===========================================================

    private async Task<List<ActivityAssignmentDetailDto>>
        LoadDetailsAsync(
            long activityAssignmentId)
    {
        var details =

            await
            (
                from detail
                in _context.ActivityAssignmentDetails

                join module
                in _context.NavigationModules
                on detail.ModuleId equals module.Id

                join menu
                in _context.NavigationMenus
                on detail.MenuId equals menu.Id

                join subMenu
                in _context.NavigationSubmenus
                on detail.SubMenuId equals subMenu.Id

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

        foreach (var detail in details)
        {
            detail.ActivityAssignmentPermissions =

                await _context.ActivityAssignmentPermissions

                    .Where(x =>

                        x.ActivityAssignmentDetailId ==
                        detail.ActivityAssignmentDetailId

                        &&

                        !x.IsDeleted)

                    .Select(x =>
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
                        })

                    .AsNoTracking()

                    .ToListAsync();
        }

        return details;
    }
    //===========================================================
    // Create
    //===========================================================

    public async Task<long> CreateAsync(
        CreateActivityAssignmentDto dto)
    {
        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            //=======================================================
            // Header
            //=======================================================

            var entity =
                new ActivityAssignment
                {
                    RoleProfileId =
                        dto.RoleProfileId,

                    IsActive =
                        dto.IsActive,

                    CreatedDate =
                        DateTime.UtcNow,

                    IsDeleted =
                        false
                };

            _context.ActivityAssignments.Add(
                entity);

            await _context.SaveChangesAsync();

            //=======================================================
            // Details & Permissions
            //=======================================================

            foreach (var detailDto in dto.Details)
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
                            detailDto.IsActive,

                        CreatedDate =
                            DateTime.UtcNow,

                        IsDeleted =
                            false
                    };

                _context.ActivityAssignmentDetails.Add(
                    detail);

                await _context.SaveChangesAsync();

                //===================================================
                // Permissions
                //===================================================

                if (detailDto.ActivityAssignmentPermissions.Any())
                {
                    var permissions =

                        detailDto
                            .ActivityAssignmentPermissions

                            .Select(permission =>

                                new ActivityAssignmentPermission
                                {
                                    ActivityAssignmentDetailId =
                                        detail.ActivityAssignmentDetailId,

                                    MasterActivityId =
                                        permission.MasterActivityId,

                                    NavigationActivityId =
                                        permission.NavigationActivityId,

                                    CreatedDate =
                                        DateTime.UtcNow,

                                    IsDeleted =
                                        false
                                })

                            .ToList();

                    _context.ActivityAssignmentPermissions.AddRange(
                        permissions);
                }
            }

            //=======================================================
            // Activity History
            //=======================================================

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
                        1,

                    PerformedByName =
                        "System",

                    PerformedDate =
                        DateTime.UtcNow
                });

            await _context.SaveChangesAsync();

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

    public async Task<bool> UpdateAsync(
        UpdateActivityAssignmentDto dto)
    {
        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            var entity =
                await _context.ActivityAssignments

                    .FirstOrDefaultAsync(x =>

                        x.ActivityAssignmentId ==
                        dto.ActivityAssignmentId

                        &&

                        !x.IsDeleted);

            if (entity == null)
            {
                return false;
            }

            //=======================================================
            // Update Header
            //=======================================================

            entity.RoleProfileId =
                dto.RoleProfileId;

            entity.IsActive =
                dto.IsActive;

            entity.ModifiedDate =
                DateTime.UtcNow;

            //=======================================================
            // Remove Existing Permissions
            //=======================================================

            var existingDetailIds =

                await _context.ActivityAssignmentDetails

                    .Where(x =>

                        x.ActivityAssignmentId ==
                        entity.ActivityAssignmentId

                        &&

                        !x.IsDeleted)

                    .Select(x =>
                        x.ActivityAssignmentDetailId)

                    .ToListAsync();

            if (existingDetailIds.Any())
            {
                var existingPermissions =

                    await _context.ActivityAssignmentPermissions

                        .Where(x =>

                            existingDetailIds.Contains(
                                x.ActivityAssignmentDetailId)

                            &&

                            !x.IsDeleted)

                        .ToListAsync();

                if (existingPermissions.Any())
                {
                    _context.ActivityAssignmentPermissions.RemoveRange(
                        existingPermissions);
                }
            }

            //=======================================================
            // Remove Existing Details
            //=======================================================

            var existingDetails =

                await _context.ActivityAssignmentDetails

                    .Where(x =>

                        x.ActivityAssignmentId ==
                        entity.ActivityAssignmentId

                        &&

                        !x.IsDeleted)

                    .ToListAsync();

            if (existingDetails.Any())
            {
                _context.ActivityAssignmentDetails.RemoveRange(
                    existingDetails);
            }

            await _context.SaveChangesAsync();

            //=======================================================
            // Insert New Details
            //=======================================================

            foreach (var detailDto in dto.Details)
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
                            detailDto.IsActive,

                        CreatedDate =
                            DateTime.UtcNow,

                        IsDeleted =
                            false
                    };

                _context.ActivityAssignmentDetails.Add(
                    detail);

                await _context.SaveChangesAsync();

                //===================================================
                // Insert Permissions
                //===================================================

                if (detailDto.ActivityAssignmentPermissions.Any())
                {
                    var permissions =

                        detailDto
                            .ActivityAssignmentPermissions

                            .Select(permission =>

                                new ActivityAssignmentPermission
                                {
                                    ActivityAssignmentDetailId =
                                        detail.ActivityAssignmentDetailId,

                                    MasterActivityId =
                                        permission.MasterActivityId,

                                    NavigationActivityId =
                                        permission.NavigationActivityId,

                                    CreatedDate =
                                        DateTime.UtcNow,

                                    IsDeleted =
                                        false
                                })

                            .ToList();

                    _context.ActivityAssignmentPermissions.AddRange(
                        permissions);
                }
            }

            //=======================================================
            // Activity History
            //=======================================================

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
                        1,

                    PerformedByName =
                        "System",

                    PerformedDate =
                        DateTime.UtcNow
                });

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
    // Delete
    //===========================================================

    public async Task<bool> DeleteAsync(
        long activityAssignmentId)
    {
        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            var entity =
                await _context.ActivityAssignments

                    .FirstOrDefaultAsync(x =>

                        x.ActivityAssignmentId ==
                        activityAssignmentId

                        &&

                        !x.IsDeleted);

            if (entity == null)
            {
                return false;
            }

            entity.IsDeleted =
                true;

            entity.DeletedDate =
                DateTime.UtcNow;

            var details =

                await _context.ActivityAssignmentDetails

                    .Where(x =>

                        x.ActivityAssignmentId ==
                        activityAssignmentId

                        &&

                        !x.IsDeleted)

                    .ToListAsync();

            foreach (var detail in details)
            {
                detail.IsDeleted =
                    true;

                detail.DeletedDate =
                    DateTime.UtcNow;
            }

            var detailIds =
                details
                    .Select(x => x.ActivityAssignmentDetailId)
                    .ToList();

            if (detailIds.Any())
            {
                var permissions =

                    await _context.ActivityAssignmentPermissions

                        .Where(x =>

                            detailIds.Contains(
                                x.ActivityAssignmentDetailId)

                            &&

                            !x.IsDeleted)

                        .ToListAsync();

                foreach (var permission in permissions)
                {
                    permission.IsDeleted =
                        true;

                    permission.DeletedDate =
                        DateTime.UtcNow;
                }
            }

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
                });

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

    public async Task<bool> RestoreLastDeletedAsync()
    {
        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            var entity =

                await _context.ActivityAssignments

                    .Where(x =>

                        x.IsDeleted)

                    .OrderByDescending(x =>

                        x.DeletedDate)

                    .FirstOrDefaultAsync();

            if (entity == null)
            {
                return false;
            }

            entity.IsDeleted =
                false;

            entity.DeletedDate =
                null;

            var details =

                await _context.ActivityAssignmentDetails

                    .Where(x =>

                        x.ActivityAssignmentId ==
                        entity.ActivityAssignmentId

                        &&

                        x.IsDeleted)

                    .ToListAsync();

            foreach (var detail in details)
            {
                detail.IsDeleted =
                    false;

                detail.DeletedDate =
                    null;
            }

            var detailIds =
                details
                    .Select(x => x.ActivityAssignmentDetailId)
                    .ToList();

            if (detailIds.Any())
            {
                var permissions =

                    await _context.ActivityAssignmentPermissions

                        .Where(x =>

                            detailIds.Contains(
                                x.ActivityAssignmentDetailId)

                            &&

                            x.IsDeleted)

                        .ToListAsync();

                foreach (var permission in permissions)
                {
                    permission.IsDeleted =
                        false;

                    permission.DeletedDate =
                        null;
                }
            }

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
                });

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