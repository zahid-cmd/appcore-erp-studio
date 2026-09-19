//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Domain.Common;
using AppCore.Domain.Entities.SecurityPermission.UserManagement;
using AppCore.Domain.Entities.SecurityPermission.RoleManagement;

using AppCore.Application.SecurityPermission.UserManagement;
using AppCore.Application.SecurityPermission.UserManagement.RoleAssignment.DTOs;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.SecurityPermission.UserManagement;


//===============================================================
// Role Assignment Repository
//===============================================================

public class RoleAssignmentRepository
    : IRoleAssignmentRepository
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public RoleAssignmentRepository
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

    public Task<RoleAssignmentDefaultsDto>
        GetDefaultsAsync()
    {
        return Task.FromResult(

            new RoleAssignmentDefaultsDto
            {
                UserProfileId =
                    0
            });
    }


    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<RoleAssignmentDto>>
        GetAllAsync()
    {
        var assignments =

            await
            (
                from assignment
                in _context.Set<RoleAssignment>()

                join userProfile
                in _context.Set<UserProfile>()

                on assignment.UserProfileId
                equals userProfile.UserProfileId

                where

                    !assignment.IsDeleted

                orderby
                    userProfile.ProfileCode

                select new
                {
                    Assignment =
                        assignment,

                    UserProfileCode =
                        userProfile.ProfileCode,

                    UserProfileName =
                        userProfile.UserName
                }
            )

            .AsNoTracking()

            .ToListAsync();


        var result =
            new List<RoleAssignmentDto>();


        foreach
        (
            var item
            in assignments
        )
        {
            //=======================================================
            // Role Profile Count
            //=======================================================

            var roleProfileCount =

                await _context
                    .Set<RoleAssignmentDetail>()

                    .CountAsync
                    (
                        x =>

                            x.RoleAssignmentId ==
                            item.Assignment.RoleAssignmentId

                            &&

                            !x.IsDeleted
                    );


            //=======================================================
            // Primary Role
            //=======================================================

            var primaryRoleName =

                await LoadPrimaryRoleNameAsync
                (
                    item.Assignment.RoleAssignmentId
                );


            //=======================================================
            // Primary Role Fallback
            //=======================================================

            primaryRoleName =
                string.IsNullOrWhiteSpace(
                    primaryRoleName
                )
                    ?
                    "Not Assigned"
                    :
                    primaryRoleName;


            //=======================================================
            // Result
            //=======================================================

            result.Add(

                new RoleAssignmentDto
                {
                    RoleAssignmentId =
                        item.Assignment.RoleAssignmentId,

                    UserProfileId =
                        item.Assignment.UserProfileId,

                    UserProfileCode =
                        item.UserProfileCode,

                    UserProfileName =
                        item.UserProfileName,

                    RoleProfileCount =
                        roleProfileCount,

                    PrimaryRoleName =
                        primaryRoleName,

                    IsActive =
                        item.Assignment.IsActive
                });
        }


        return result;
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<RoleAssignmentDto?>
        GetByIdAsync
        (
            long roleAssignmentId
        )
    {
        var assignment =

            await
            (
                from roleAssignment
                in _context.Set<RoleAssignment>()

                join userProfile
                in _context.Set<UserProfile>()

                on roleAssignment.UserProfileId
                equals userProfile.UserProfileId

                where

                    roleAssignment.RoleAssignmentId ==
                    roleAssignmentId

                    &&

                    !roleAssignment.IsDeleted

                select new RoleAssignmentDto
                {
                    RoleAssignmentId =
                        roleAssignment.RoleAssignmentId,

                    UserProfileId =
                        roleAssignment.UserProfileId,

                    UserProfileCode =
                        userProfile.ProfileCode,

                    UserProfileName =
                        userProfile.UserName,

                    IsActive =
                        roleAssignment.IsActive
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


        //=======================================================
        // Details
        //=======================================================

        assignment.Details =
            await LoadDetailsAsync
            (
                assignment.RoleAssignmentId
            );


        //=======================================================
        // Role Profile Count
        //=======================================================

        assignment.RoleProfileCount =
            assignment.Details.Count;


        //=======================================================
        // Primary Role
        //=======================================================

        assignment.PrimaryRoleName =
            await LoadPrimaryRoleNameAsync
            (
                assignment.RoleAssignmentId
            );


        return assignment;
    }


    //===========================================================
    // Get By User Profile Id
    //===========================================================

    public async Task<RoleAssignmentDto?>
        GetByUserProfileIdAsync
        (
            long userProfileId
        )
    {
        var assignment =

            await
            (
                from roleAssignment
                in _context.Set<RoleAssignment>()

                join userProfile
                in _context.Set<UserProfile>()

                on roleAssignment.UserProfileId
                equals userProfile.UserProfileId

                where

                    roleAssignment.UserProfileId ==
                    userProfileId

                    &&

                    !roleAssignment.IsDeleted

                select new RoleAssignmentDto
                {
                    RoleAssignmentId =
                        roleAssignment.RoleAssignmentId,

                    UserProfileId =
                        roleAssignment.UserProfileId,

                    UserProfileCode =
                        userProfile.ProfileCode,

                    UserProfileName =
                        userProfile.UserName,

                    IsActive =
                        roleAssignment.IsActive
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


        //=======================================================
        // Details
        //=======================================================

        assignment.Details =
            await LoadDetailsAsync
            (
                assignment.RoleAssignmentId
            );


        //=======================================================
        // Role Profile Count
        //=======================================================

        assignment.RoleProfileCount =
            assignment.Details.Count;


        //=======================================================
        // Primary Role
        //=======================================================

        assignment.PrimaryRoleName =
            await LoadPrimaryRoleNameAsync
            (
                assignment.RoleAssignmentId
            );


        return assignment;
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
            .Set<RoleAssignment>()

            .AsNoTracking()

            .AnyAsync
            (
                x =>

                    x.UserProfileId ==
                    userProfileId

                    &&

                    !x.IsDeleted
            );
    }


    //===========================================================
    // Load Primary Role Name
    //===========================================================

    private async Task<string>
        LoadPrimaryRoleNameAsync
        (
            long roleAssignmentId
        )
    {
        var primaryRoleName =

            await
            (
                from detail
                in _context.Set<RoleAssignmentDetail>()

                join roleProfile
                in _context.RoleProfiles

                on detail.RoleProfileId
                equals roleProfile.RoleProfileId

                where

                    detail.RoleAssignmentId ==
                    roleAssignmentId

                    &&

                    !detail.IsDeleted

                orderby
                    detail.RoleAssignmentDetailId

                select
                    roleProfile.ProfileName
            )

            .AsNoTracking()

            .FirstOrDefaultAsync();


        return

            string.IsNullOrWhiteSpace(
                primaryRoleName
            )

                ?

                "Not Assigned"

                :

                primaryRoleName;
    }


    //===========================================================
    // Load Details
    //===========================================================

    private async Task<List<RoleAssignmentDetailDto>>
        LoadDetailsAsync
        (
            long roleAssignmentId
        )
    {
        return await
        (
            from detail
            in _context.Set<RoleAssignmentDetail>()

            join roleProfile
            in _context.RoleProfiles

            on detail.RoleProfileId
            equals roleProfile.RoleProfileId

            where

                detail.RoleAssignmentId ==
                roleAssignmentId

                &&

                !detail.IsDeleted

            orderby
                roleProfile.ProfileName

            select new RoleAssignmentDetailDto
            {
                RoleAssignmentDetailId =
                    detail.RoleAssignmentDetailId,

                RoleAssignmentId =
                    detail.RoleAssignmentId,

                RoleProfileId =
                    detail.RoleProfileId,

                RoleProfileCode =
                    roleProfile.ProfileCode,

                RoleProfileName =
                    roleProfile.ProfileName,

                IsActive =
                    detail.IsActive
            }
        )

        .AsNoTracking()

        .ToListAsync();
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateRoleAssignmentDto dto
        )
    {
        const long systemUserId =
            1;


        //=======================================================
        // Validation
        //=======================================================

        if
        (
            dto.UserProfileId <= 0
        )
        {
            throw new InvalidOperationException(
                "User Profile is required."
            );
        }


        if
        (
            dto.Details == null ||
            dto.Details.Count == 0
        )
        {
            throw new InvalidOperationException(
                "At least one Role Profile assignment is required."
            );
        }


        //=======================================================
        // Duplicate Detail Validation
        //=======================================================

        var duplicateDetails =

            dto.Details
                .GroupBy
                (
                    x =>
                        x.RoleProfileId
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
                "Duplicate Role Profile assignment detected."
            );
        }


        //=======================================================
        // Role Profile Id Validation
        //=======================================================

        if
        (
            dto.Details.Any
            (
                x =>
                    x.RoleProfileId <= 0
            )
        )
        {
            throw new InvalidOperationException(
                "Invalid Role Profile detected."
            );
        }


        //=======================================================
        // User Profile Validation
        //=======================================================

        var userProfileExists =

            await _context
                .Set<UserProfile>()

                .AnyAsync
                (
                    x =>

                        x.UserProfileId ==
                        dto.UserProfileId

                        &&

                        !x.IsDeleted
                );


        if
        (
            !userProfileExists
        )
        {
            throw new InvalidOperationException(
                "Selected User Profile was not found."
            );
        }


        //=======================================================
        // Existing Assignment Validation
        //=======================================================

        var existingAssignment =

            await _context
                .Set<RoleAssignment>()

                .AnyAsync
                (
                    x =>

                        x.UserProfileId ==
                        dto.UserProfileId

                        &&

                        !x.IsDeleted
                );


        if
        (
            existingAssignment
        )
        {
            throw new InvalidOperationException(
                $"A role assignment already exists for User Profile Id '{dto.UserProfileId}'."
            );
        }


        //=======================================================
        // Role Profile Validation
        //=======================================================

        var roleProfileIds =

            dto.Details
                .Select
                (
                    x =>
                        x.RoleProfileId
                )
                .ToList();


        var validRoleProfileCount =

            await _context
                .RoleProfiles

                .CountAsync
                (
                    x =>

                        roleProfileIds.Contains(
                            x.RoleProfileId
                        )

                        &&

                        !x.IsDeleted
                );


        if
        (
            validRoleProfileCount !=
            roleProfileIds.Count
        )
        {
            throw new InvalidOperationException(
                "One or more selected Role Profiles were not found."
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
                new RoleAssignment
                {
                    UserProfileId =
                        dto.UserProfileId,

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
                    new RoleAssignmentDetail
                    {
                        RoleProfileId =
                            detailDto.RoleProfileId,

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


                entity.Details.Add(
                    detail
                );
            }


            //===================================================
            // Add Complete Graph
            //===================================================

            _context
                .Set<RoleAssignment>()
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
                        "Role Assignment",

                    EntityId =
                        entity.RoleAssignmentId,

                    ActivityType =
                        "Create",

                    ActivityTitle =
                        "Role Assignment Created",

                    ActivityDescription =
                        $"Role Assignment created for User Profile Id '{entity.UserProfileId}'.",

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


            return entity.RoleAssignmentId;
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
            UpdateRoleAssignmentDto dto
        )
    {
        const long systemUserId =
            1;


        //=======================================================
        // Validation
        //=======================================================

        if
        (
            dto.RoleAssignmentId <= 0
        )
        {
            throw new InvalidOperationException(
                "Role Assignment Id is required."
            );
        }


        if
        (
            dto.UserProfileId <= 0
        )
        {
            throw new InvalidOperationException(
                "User Profile is required."
            );
        }


        if
        (
            dto.Details == null ||
            dto.Details.Count == 0
        )
        {
            throw new InvalidOperationException(
                "At least one Role Profile assignment is required."
            );
        }


        //=======================================================
        // Duplicate Detail Validation
        //=======================================================

        var duplicateDetails =

            dto.Details
                .GroupBy
                (
                    x =>
                        x.RoleProfileId
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
                "Duplicate Role Profile assignment detected."
            );
        }


        //=======================================================
        // Role Profile Id Validation
        //=======================================================

        if
        (
            dto.Details.Any
            (
                x =>
                    x.RoleProfileId <= 0
            )
        )
        {
            throw new InvalidOperationException(
                "Invalid Role Profile detected."
            );
        }


        //=======================================================
        // User Profile Validation
        //=======================================================

        var userProfileExists =

            await _context
                .Set<UserProfile>()

                .AnyAsync
                (
                    x =>

                        x.UserProfileId ==
                        dto.UserProfileId

                        &&

                        !x.IsDeleted
                );


        if
        (
            !userProfileExists
        )
        {
            throw new InvalidOperationException(
                "Selected User Profile was not found."
            );
        }


        //=======================================================
        // Duplicate User Profile Validation
        //=======================================================

        var duplicateUserProfile =

            await _context
                .Set<RoleAssignment>()

                .AnyAsync
                (
                    x =>

                        x.UserProfileId ==
                        dto.UserProfileId

                        &&

                        x.RoleAssignmentId !=
                        dto.RoleAssignmentId

                        &&

                        !x.IsDeleted
                );


        if
        (
            duplicateUserProfile
        )
        {
            throw new InvalidOperationException(
                $"A role assignment already exists for User Profile Id '{dto.UserProfileId}'."
            );
        }


        //=======================================================
        // Role Profile Validation
        //=======================================================

        var roleProfileIds =

            dto.Details
                .Select
                (
                    x =>
                        x.RoleProfileId
                )
                .ToList();


        var validRoleProfileCount =

            await _context
                .RoleProfiles

                .CountAsync
                (
                    x =>

                        roleProfileIds.Contains(
                            x.RoleProfileId
                        )

                        &&

                        !x.IsDeleted
                );


        if
        (
            validRoleProfileCount !=
            roleProfileIds.Count
        )
        {
            throw new InvalidOperationException(
                "One or more selected Role Profiles were not found."
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
                    .Set<RoleAssignment>()

                    .FirstOrDefaultAsync
                    (
                        x =>

                            x.RoleAssignmentId ==
                            dto.RoleAssignmentId

                            &&

                            !x.IsDeleted
                    );


            if
            (
                entity ==
                null
            )
            {
                await transaction.RollbackAsync();

                return false;
            }


            //===================================================
            // Update Header
            //===================================================

            entity.UserProfileId =
                dto.UserProfileId;

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
                    .Set<RoleAssignmentDetail>()

                    .Where
                    (
                        x =>

                            x.RoleAssignmentId ==
                            entity.RoleAssignmentId
                    )

                    .ToListAsync();


            //===================================================
            // Remove Existing Details
            //===================================================

            if
            (
                existingDetails.Any()
            )
            {
                _context
                    .Set<RoleAssignmentDetail>()
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
                    new RoleAssignmentDetail
                    {
                        RoleAssignmentId =
                            entity.RoleAssignmentId,

                        RoleProfileId =
                            detailDto.RoleProfileId,

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


                _context
                    .Set<RoleAssignmentDetail>()
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
                        "Role Assignment",

                    EntityId =
                        entity.RoleAssignmentId,

                    ActivityType =
                        "Update",

                    ActivityTitle =
                        "Role Assignment Updated",

                    ActivityDescription =
                        $"Role Assignment updated for User Profile Id '{entity.UserProfileId}'.",

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
            long roleAssignmentId
        )
    {
        const long systemUserId =
            1;


        await using var transaction =
            await _context.Database.BeginTransactionAsync();


        try
        {
            var entity =

                await _context
                    .Set<RoleAssignment>()

                    .FirstOrDefaultAsync
                    (
                        x =>

                            x.RoleAssignmentId ==
                            roleAssignmentId

                            &&

                            !x.IsDeleted
                    );


            if
            (
                entity ==
                null
            )
            {
                await transaction.RollbackAsync();

                return false;
            }


            //===================================================
            // Header
            //===================================================

            entity.IsDeleted =
                true;

            entity.DeletedBy =
                systemUserId;

            entity.DeletedDate =
                DateTime.UtcNow;

            entity.ModifiedBy =
                systemUserId;

            entity.ModifiedDate =
                DateTime.UtcNow;


            //===================================================
            // Details
            //===================================================

            var details =

                await _context
                    .Set<RoleAssignmentDetail>()

                    .Where
                    (
                        x =>

                            x.RoleAssignmentId ==
                            roleAssignmentId

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
                    systemUserId;

                detail.DeletedDate =
                    DateTime.UtcNow;

                detail.ModifiedBy =
                    systemUserId;

                detail.ModifiedDate =
                    DateTime.UtcNow;
            }


            //===================================================
            // Activity History
            //===================================================

            _context.ActivityHistories.Add(

                new ActivityHistory
                {
                    Module =
                        "Security & Permission",

                    EntityName =
                        "Role Assignment",

                    EntityId =
                        entity.RoleAssignmentId,

                    ActivityType =
                        "Delete",

                    ActivityTitle =
                        "Role Assignment Deleted",

                    ActivityDescription =
                        $"Role Assignment deleted for User Profile Id '{entity.UserProfileId}'.",

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
    // Restore Last Deleted
    //===========================================================

    public async Task<bool>
        RestoreLastDeletedAsync()
    {
        const long systemUserId =
            1;


        await using var transaction =
            await _context.Database.BeginTransactionAsync();


        try
        {
            var entity =

                await _context
                    .Set<RoleAssignment>()

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
                await transaction.RollbackAsync();

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
                systemUserId;

            entity.ModifiedDate =
                DateTime.UtcNow;


            //===================================================
            // Details
            //===================================================

            var details =

                await _context
                    .Set<RoleAssignmentDetail>()

                    .Where
                    (
                        x =>

                            x.RoleAssignmentId ==
                            entity.RoleAssignmentId

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
                    systemUserId;

                detail.ModifiedDate =
                    DateTime.UtcNow;
            }


            //===================================================
            // Activity History
            //===================================================

            _context.ActivityHistories.Add(

                new ActivityHistory
                {
                    Module =
                        "Security & Permission",

                    EntityName =
                        "Role Assignment",

                    EntityId =
                        entity.RoleAssignmentId,

                    ActivityType =
                        "Restore",

                    ActivityTitle =
                        "Role Assignment Restored",

                    ActivityDescription =
                        $"Role Assignment restored for User Profile Id '{entity.UserProfileId}'.",

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
}